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


class ActiveBorrow(BaseModel):
    title: str
    dueDate: str


class UserContext(BaseModel):
    activeBorrows: List[ActiveBorrow] = []


class ChatRequest(BaseModel):
    userId: str
    message: str
    chatHistory: List[ChatMessage] = []
    userContext: Optional[UserContext] = None


class ChatResponse(BaseModel):
    reply: str
    userId: str


# ─── SSE Streaming endpoint (chính) ──────────────────────────────
@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """
    UC-AI-02 (Phương án B): Streaming chatbot endpoint dùng SSE.
    Frontend nhận từng token và hiển thị typing effect thật.

    Response format: text/event-stream
    Mỗi event: "data: <token>\n\n"
    Event cuối: "data: [DONE]\n\n"
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Tin nhắn không được rỗng")

    history = [{"role": m.role, "content": m.content} for m in request.chatHistory]
    context = request.userContext.model_dump() if request.userContext else None

    async def event_generator():
        try:
            async for token in generate_chat_stream(
                user_message=request.message,
                user_id=request.userId,
                chat_history=history,
                user_context=context,
            ):
                # Format SSE: mỗi dòng là "data: <nội_dung>\n\n"
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
    Giữ lại để tương thích ngược với code Node.js hiện tại.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Tin nhắn không được rỗng")

    try:
        history = [{"role": m.role, "content": m.content} for m in request.chatHistory]
        context = request.userContext.model_dump() if request.userContext else None

        reply = generate_chat_response(
            user_message=request.message,
            chat_history=history,
            user_context=context,
        )
        return ChatResponse(reply=reply, userId=request.userId)

    except Exception as e:
        print(f"[Chat Error] {e}")
        return ChatResponse(
            reply="Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng liên hệ thủ thư để được hỗ trợ.",
            userId=request.userId,
        )
