"""
Chatbot Service — UC-AI-02 (Phương án B: RAG + Function Calling)
Kiến trúc:
  - Intent Classifier: phân loại câu hỏi FAQ hay cá nhân
  - Luồng FAQ: RAG → retrieve top-3 chunks → Gemini RAG prompt
  - Luồng cá nhân: Gemini Function Calling → execute tool → generate reply
  - SSE generator: stream token từng chữ về frontend
"""

from typing import List, Optional, AsyncGenerator
from google import genai
from google.genai import types as genai_types

from app.core.config import settings
from app.services.rag_service import retrieve_context, is_personal_query
from app.services.function_tools import TOOL_DECLARATIONS, execute_tool

# ─── Khởi tạo Gemini client ──────────────────────────────────────
_google_client = genai.Client(api_key=settings.GEMINI_API_KEY)
MODEL = settings.GEMINI_MODEL if not settings.GEMINI_MODEL.startswith("models/") else settings.GEMINI_MODEL.replace("models/", "")


# ─── System Prompt gốc ───────────────────────────────────────────
BASE_SYSTEM_PROMPT = """Bạn là "Thư Bé" - trợ lý ảo thông minh của Thư viện Đại học BkLib.
Nhiệm vụ của bạn là hỗ trợ bạn đọc về các vấn đề của thư viện.
Luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn và chuyên nghiệp.
Tối đa 200 từ mỗi câu trả lời.
Nếu câu hỏi nằm ngoài phạm vi thư viện, lịch sự từ chối và hướng dẫn liên hệ thủ thư."""


def _format_history(chat_history: List[dict]) -> str:
    """Định dạng lịch sử hội thoại cho prompt."""
    if not chat_history:
        return "(Chưa có lịch sử hội thoại)"
    lines = []
    for msg in chat_history[-8:]:  # Giới hạn 8 tin gần nhất
        role = "Bạn đọc" if msg["role"] == "user" else "Thư Bé"
        lines.append(f"{role}: {msg['content']}")
    return "\n".join(lines)


# ─── Luồng 1: RAG — Hỏi về quy định/FAQ ─────────────────────────
async def _rag_stream(
    user_message: str,
    chat_history: List[dict],
) -> AsyncGenerator[str, None]:
    """
    Truy xuất top-3 chunks từ ChromaDB, nhồi vào prompt rồi stream Gemini response.
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
        # Không có context → trả lời chung
        prompt = f"""{BASE_SYSTEM_PROMPT}

Lịch sử hội thoại:
{_format_history(chat_history)}

Câu hỏi của bạn đọc: {user_message}

Trả lời:"""

    # Stream từng token
    for chunk in _google_client.models.generate_content_stream(
        model=MODEL,
        contents=prompt,
        config={"temperature": 0.4, "max_output_tokens": 512},
    ):
        if chunk.text:
            yield chunk.text


# ─── Luồng 2: Function Calling — Hỏi về dữ liệu cá nhân ─────────
async def _function_calling_stream(
    user_message: str,
    user_id: str,
    chat_history: List[dict],
    user_context: Optional[dict] = None,
) -> AsyncGenerator[str, None]:
    """
    Dùng Gemini Function Calling để gọi tool lấy dữ liệu thực tế từ DB,
    sau đó stream câu trả lời được cá nhân hóa.
    """
    # Chuẩn bị thông tin context sẵn có (từ Node.js gửi kèm)
    context_str = ""
    if user_context:
        borrows = user_context.get("activeBorrows", [])
        if borrows:
            borrow_lines = "\n".join([
                f"  - '{b['title']}' (hạn trả: {b['dueDate']})"
                for b in borrows
            ])
            context_str = f"\nDữ liệu mượn sách hiện tại của người dùng:\n{borrow_lines}"

    # Tạo tools từ TOOL_DECLARATIONS
    tools = [
        genai_types.Tool(
            function_declarations=[
                genai_types.FunctionDeclaration(
                    name=td["name"],
                    description=td["description"],
                    parameters=genai_types.Schema(**td["parameters"]) if isinstance(td["parameters"], dict) else td["parameters"],
                )
                for td in TOOL_DECLARATIONS
            ]
        )
    ]

    initial_prompt = f"""{BASE_SYSTEM_PROMPT}
{context_str}

Lịch sử hội thoại:
{_format_history(chat_history)}

ID người dùng hiện tại (dùng để gọi tool): {user_id}

Câu hỏi: {user_message}"""

    try:
        # Lần gọi 1: Gemini quyết định có cần dùng tool không
        response = _google_client.models.generate_content(
            model=MODEL,
            contents=initial_prompt,
            config=genai_types.GenerateContentConfig(
                tools=tools,
                temperature=0.3,
                max_output_tokens=512,
            ),
        )

        # Kiểm tra Gemini có yêu cầu gọi tool không
        part = response.candidates[0].content.parts[0] if response.candidates else None
        tool_result_str = None

        if part and hasattr(part, "function_call") and part.function_call:
            fc = part.function_call
            print(f"[Function Calling] Gemini yêu cầu: {fc.name}({dict(fc.args)})")

            # Thực thi tool
            tool_result_str = await execute_tool(fc.name, dict(fc.args))
            print(f"[Function Calling] Kết quả: {tool_result_str[:100]}...")

            # Lần gọi 2: Gemini tổng hợp câu trả lời từ kết quả tool
            followup_prompt = f"""{initial_prompt}

[Kết quả truy vấn từ hệ thống]:
{tool_result_str}

Dựa vào kết quả trên, hãy trả lời thân thiện và tự nhiên cho người dùng:"""

            # Stream kết quả cuối
            for chunk in _google_client.models.generate_content_stream(
                model=MODEL,
                contents=followup_prompt,
                config={"temperature": 0.5, "max_output_tokens": 512},
            ):
                if chunk.text:
                    yield chunk.text
        else:
            # Gemini không cần tool, stream trực tiếp câu trả lời
            for chunk in _google_client.models.generate_content_stream(
                model=MODEL,
                contents=initial_prompt,
                config={"temperature": 0.5, "max_output_tokens": 512},
            ):
                if chunk.text:
                    yield chunk.text

    except Exception as e:
        print(f"[Function Calling Error] {e}")
        yield "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại hoặc liên hệ thủ thư để được hỗ trợ."


# ─── Entry point chính ────────────────────────────────────────────
async def generate_chat_stream(
    user_message: str,
    user_id: str,
    chat_history: List[dict],
    user_context: Optional[dict] = None,
) -> AsyncGenerator[str, None]:
    """
    Điểm vào chính: phân loại intent rồi route sang đúng luồng.

    Args:
        user_message: Câu hỏi của người dùng
        user_id: ID người dùng (để Function Calling lấy dữ liệu cá nhân)
        chat_history: Lịch sử hội thoại [{role, content}]
        user_context: Dữ liệu mượn sách được Node.js gửi kèm (pre-fetched)
    """
    if is_personal_query(user_message):
        print(f"[Chat] Intent: PERSONAL → Function Calling (userId={user_id})")
        async for token in _function_calling_stream(user_message, user_id, chat_history, user_context):
            yield token
    else:
        print(f"[Chat] Intent: FAQ → RAG Pipeline")
        async for token in _rag_stream(user_message, chat_history):
            yield token


# ─── Fallback: non-streaming (giữ lại để tương thích) ────────────
def generate_chat_response(
    user_message: str,
    chat_history: List[dict],
    user_context: Optional[dict] = None,
) -> str:
    """
    Phiên bản non-streaming (dùng khi SSE không khả dụng).
    Deprecated: ưu tiên dùng generate_chat_stream().
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