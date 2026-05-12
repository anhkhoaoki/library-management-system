from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.chat_service import generate_chat_response

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


@router.post("/message", response_model=ChatResponse)
def chat_message(request: ChatRequest):
    """
    UC-AI-02: Library chatbot endpoint.
    Processes user message with conversation history and personal context.
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
        # Graceful degradation for chatbot
        return ChatResponse(
            reply="Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng liên hệ thủ thư để được hỗ trợ.",
            userId=request.userId,
        )
