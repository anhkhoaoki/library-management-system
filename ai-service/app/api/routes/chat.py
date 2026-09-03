from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import json

from app.services.chat_service import generate_chat_stream, generate_chat_response

router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    chatHistory: List[ChatMessage] = []
    # userId và userContext đã bỏ — chatbot chỉ trả lời nội quy, không cần dữ liệu cá nhân
    userId: Optional[str] = None  # Giữ lại để tương thích ngược với frontend hiện tại


class ChatResponse(BaseModel):
    reply: str


# ─── SSE Streaming endpoint (chính) ──────────────────────────────
@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """
    UC-AI-02: Streaming chatbot endpoint dùng SSE.
    Chatbot "Thư Bé" trả lời câu hỏi về nội quy/FAQ thư viện qua RAG.

    Response format: text/event-stream
    Mỗi event: "data: <token>\\n\\n"
    Event cuối: "data: [DONE]\\n\\n"
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Tin nhắn không được rỗng")

    history = [{"role": m.role, "content": m.content} for m in request.chatHistory]

    async def event_generator():
        try:
            async for token in generate_chat_stream(
                user_message=request.message,
                chat_history=history,
            ):
                yield f"data: {json.dumps({'token': token}, ensure_ascii=False)}\n\n"

            # Signal kết thúc stream
            yield f"data: {json.dumps({'token': '[DONE]'})}\n\n"

        except Exception as e:
            print(f"[SSE Error] {e}")
            error_msg = "Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại."
            yield f"data: {json.dumps({'token': error_msg})}\n\n"
            yield f"data: {json.dumps({'token': '[DONE]'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Tắt nginx buffering
        },
    )


# ─── Non-streaming endpoint (fallback) ───────────────────────────
@router.post("/message", response_model=ChatResponse)
def chat_message(request: ChatRequest):
    """
    Fallback endpoint non-streaming.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Tin nhắn không được rỗng")

    try:
        history = [{"role": m.role, "content": m.content} for m in request.chatHistory]

        reply = generate_chat_response(
            user_message=request.message,
            chat_history=history,
        )
        return ChatResponse(reply=reply)

    except Exception as e:
        print(f"[Chat Error] {e}")
        return ChatResponse(
            reply="Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng liên hệ thủ thư để được hỗ trợ."
        )
