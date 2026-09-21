"""
Chatbot Service — UC-AI-02 (RAG Only)
Kiến trúc đơn giản hóa:
  - Chỉ dùng RAG để trả lời câu hỏi về nội quy/FAQ thư viện
  - Không dùng Function Calling hay xử lý dữ liệu cá nhân người dùng
  - SSE generator: stream token từng chữ về frontend
"""

from typing import List, AsyncGenerator
from google import genai

from app.core.config import settings
from app.services.rag_service import retrieve_context

# ─── Khởi tạo Gemini client ──────────────────────────────────────
class GoogleClientWrapper:
    def __init__(self):
        self._primary = genai.Client(api_key=settings.GEMINI_API_KEY)
        self._fallback = None
        if getattr(settings, "GEMINI_FALLBACK_API_KEY", ""):
            self._fallback = genai.Client(api_key=settings.GEMINI_FALLBACK_API_KEY)
        self._use_fallback = False

    @property
    def models(self):
        return self._fallback.models if (self._use_fallback and self._fallback) else self._primary.models
    
    def switch_to_fallback(self):
        if self._fallback and not self._use_fallback:
            self._use_fallback = True
            print("[GoogleClientWrapper] ⚠️ Primary API Key exhausted. Switched to FALLBACK API KEY.")
            return True
        return False

_google_client = GoogleClientWrapper()
MODEL = settings.GEMINI_MODEL if not settings.GEMINI_MODEL.startswith("models/") else settings.GEMINI_MODEL.replace("models/", "")


# ─── System Prompt ───────────────────────────────────────────────
BASE_SYSTEM_PROMPT = """Bạn là "Thư Bé" - trợ lý ảo thông minh của Thư viện Đại học BkLib.
Nhiệm vụ của bạn là hỗ trợ bạn đọc về các nội quy, quy định và thủ tục của thư viện.
Luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn và chuyên nghiệp.
Tối đa 200 từ mỗi câu trả lời.
Nếu câu hỏi nằm ngoài phạm vi nội quy thư viện, lịch sự từ chối và hướng dẫn liên hệ thủ thư."""


def _format_history(chat_history: List[dict]) -> str:
    """Định dạng lịch sử hội thoại cho prompt."""
    if not chat_history:
        return "(Chưa có lịch sử hội thoại)"
    lines = []
    for msg in chat_history[-8:]:  # Giới hạn 8 tin gần nhất
        role = "Bạn đọc" if msg["role"] == "user" else "Thư Bé"
        lines.append(f"{role}: {msg['content']}")
    return "\n".join(lines)


# ─── RAG Stream — trả lời câu hỏi nội quy thư viện ─────────────
async def generate_chat_stream(
    user_message: str,
    chat_history: List[dict],
    **kwargs,  # Bỏ qua các tham số không dùng (user_id, user_context)
) -> AsyncGenerator[str, None]:
    """
    Truy xuất top-3 chunks liên quan từ ChromaDB (nội quy thư viện),
    nhồi vào prompt rồi stream Gemini response.
    """
    context = retrieve_context(user_message, top_k=3)

    if context:
        prompt = f"""{BASE_SYSTEM_PROMPT}

Lịch sử hội thoại:
{_format_history(chat_history)}

Thông tin ngữ cảnh từ nội quy thư viện (chỉ dùng thông tin này để trả lời, không bịa đặt):
---
{context}
---

Câu hỏi của bạn đọc: {user_message}

Trả lời:"""
    else:
        # Không có context liên quan trong nội quy
        prompt = f"""{BASE_SYSTEM_PROMPT}

Lịch sử hội thoại:
{_format_history(chat_history)}

Câu hỏi của bạn đọc: {user_message}

Lưu ý: Không tìm thấy thông tin liên quan trong nội quy thư viện. Hãy thông báo lịch sự và hướng dẫn liên hệ thủ thư.

Trả lời:"""

    # Stream từng token
    try:
        response_stream = _google_client.models.generate_content_stream(
            model=MODEL,
            contents=prompt,
            config={"temperature": 0.4, "max_output_tokens": 512},
        )
        for chunk in response_stream:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        err_str = str(e)
        if ("429" in err_str or "RESOURCE_EXHAUSTED" in err_str) and ("Quota" in err_str or "quota" in err_str):
            if hasattr(_google_client, "switch_to_fallback") and _google_client.switch_to_fallback():
                # Thử lại với fallback key
                fallback_stream = _google_client.models.generate_content_stream(
                    model=MODEL,
                    contents=prompt,
                    config={"temperature": 0.4, "max_output_tokens": 512},
                )
                for chunk in fallback_stream:
                    if chunk.text:
                        yield chunk.text
                return
        # Bắn lỗi ra ngoài nếu không xử lý được
        raise e


# ─── Fallback: non-streaming ──────────────────────────────────────
def generate_chat_response(
    user_message: str,
    chat_history: List[dict],
    **kwargs,  # Bỏ qua các tham số không dùng
) -> str:
    """
    Phiên bản non-streaming (dùng khi SSE không khả dụng).
    """
    context = retrieve_context(user_message, top_k=3)
    prompt = f"""{BASE_SYSTEM_PROMPT}

{f"Ngữ cảnh nội quy:{chr(10)}{context}{chr(10)}" if context else ""}
Lịch sử: {_format_history(chat_history)}

Câu hỏi: {user_message}
Trả lời:"""

    response = _google_client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config={"temperature": 0.4, "max_output_tokens": 512},
    )
    return response.text.strip() if response.text else "Xin lỗi, tôi không thể trả lời lúc này."