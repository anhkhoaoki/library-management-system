"""
Chatbot Service — UC-AI-02 (RAG Only)
Kiến trúc:
  - Dùng RAG để trả lời câu hỏi về nội quy/FAQ thư viện
  - Fetch system config thực từ Backend mỗi lần chat để inject vào prompt
    → Chatbot luôn trả lời đúng dù Admin thay đổi thông số bất kỳ lúc nào
  - SSE generator: stream token từng chữ về frontend
"""

import asyncio
import httpx
from typing import List, AsyncGenerator
from google import genai

from app.core.config import settings
from app.services.rag_service import retrieve_context

# ─── Backend internal URL ────────────────────────────────────────
BACKEND_URL = getattr(settings, "BACKEND_URL", "http://localhost:3000")
_PUBLIC_CONFIG_URL = f"{BACKEND_URL}/api/v1/admin/public-config"

# ─── Default fallback values (used if backend unreachable) ───────
_DEFAULT_CONFIG = {
    "borrow_duration_days": "14",
    "max_borrow_limit_reader": "5",
    "max_borrow_limit_faculty": "5",
    "fine_rate_per_day": "2000",
    "max_renew_count": "2",
    "renew_duration_days": "7",
    "pickup_deadline_days": "3",
}

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


# ─── Fetch live config from backend ─────────────────────────────
async def _fetch_live_config() -> dict:
    """
    Gọi endpoint public của backend để lấy cấu hình thư viện thực tế.
    Timeout 3s — nếu không kết nối được thì dùng giá trị mặc định.
    """
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(_PUBLIC_CONFIG_URL)
            if resp.status_code == 200:
                data = resp.json().get("data", {})
                if data:
                    # Merge: backend values override defaults
                    merged = {**_DEFAULT_CONFIG, **data}
                    print(f"[ChatService] ✅ Loaded live config: {merged}")
                    return merged
    except Exception as e:
        print(f"[ChatService] ⚠️ Cannot fetch config from backend: {e}. Using defaults.")
    return _DEFAULT_CONFIG


# ─── Build dynamic system prompt ────────────────────────────────
def _build_system_prompt(cfg: dict) -> str:
    """
    Tạo system prompt có nhúng thông số thực tế từ DB.
    Phần [THÔNG SỐ HIỆN HÀNH] override mọi thông tin trong file FAQ nếu xung đột.
    """
    borrow_days     = cfg.get("borrow_duration_days", "14")
    max_reader      = cfg.get("max_borrow_limit_reader", "5")
    fine_rate       = int(cfg.get("fine_rate_per_day", "2000"))
    max_renew       = cfg.get("max_renew_count", "2")
    renew_days      = cfg.get("renew_duration_days", "7")
    pickup_deadline = cfg.get("pickup_deadline_days", "3")

    return f"""Bạn là "Thư Bé" - trợ lý ảo thông minh của Thư viện Đại học BkLib.
Nhiệm vụ của bạn là hỗ trợ bạn đọc về các nội quy, quy định và thủ tục của thư viện.
Luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn và chuyên nghiệp.
Tối đa 200 từ mỗi câu trả lời.
Nếu câu hỏi nằm ngoài phạm vi nội quy thư viện, lịch sự từ chối và hướng dẫn liên hệ thủ thư.

[THÔNG SỐ HIỆN HÀNH — ƯU TIÊN CAO NHẤT, ghi đè mọi thông tin khác nếu mâu thuẫn]:
- Thời hạn mượn tiêu chuẩn: {borrow_days} ngày
- Số sách tối đa bạn đọc được mượn cùng lúc: {max_reader} cuốn
- Phí phạt trả trễ: {fine_rate:,}đ/ngày/cuốn
- Số lần gia hạn tối đa: {max_renew} lần
- Mỗi lần gia hạn được thêm: {renew_days} ngày
- Thời hạn đến nhận sách sau khi có thông báo "sách sẵn sàng": {pickup_deadline} ngày"""


# ─── Format history ──────────────────────────────────────────────
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
    **kwargs,
) -> AsyncGenerator[str, None]:
    """
    1. Fetch config thực từ backend (3s timeout, fallback về default nếu lỗi).
    2. Build system prompt động với thông số thực tế.
    3. Retrieve top-3 chunks liên quan từ ChromaDB (nội quy thư viện).
    4. Stream Gemini response về frontend.
    """
    cfg = await _fetch_live_config()
    system_prompt = _build_system_prompt(cfg)
    context = retrieve_context(user_message, top_k=3)

    if context:
        prompt = f"""{system_prompt}

Lịch sử hội thoại:
{_format_history(chat_history)}

Thông tin bổ sung từ tài liệu nội quy (dùng để bổ sung chi tiết, nhưng THÔNG SỐ HIỆN HÀNH ở trên mới là chính xác nhất nếu có mâu thuẫn):
---
{context}
---

Câu hỏi của bạn đọc: {user_message}

Trả lời:"""
    else:
        prompt = f"""{system_prompt}

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
                fallback_stream = _google_client.models.generate_content_stream(
                    model=MODEL,
                    contents=prompt,
                    config={"temperature": 0.4, "max_output_tokens": 512},
                )
                for chunk in fallback_stream:
                    if chunk.text:
                        yield chunk.text
                return
        raise e


# ─── Fallback: non-streaming ──────────────────────────────────────
def generate_chat_response(
    user_message: str,
    chat_history: List[dict],
    **kwargs,
) -> str:
    """Phiên bản non-streaming (dùng khi SSE không khả dụng)."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # In async context, use nest_asyncio or create new loop
            import nest_asyncio
            nest_asyncio.apply()
        cfg = loop.run_until_complete(_fetch_live_config())
    except Exception:
        cfg = _DEFAULT_CONFIG

    system_prompt = _build_system_prompt(cfg)
    context = retrieve_context(user_message, top_k=3)

    prompt = f"""{system_prompt}

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