"""
Chatbot Service — UC-AI-02
RAG-based chatbot using LangChain + Gemini for library FAQ and personal queries.
"""

from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.memory import ConversationBufferWindowMemory
from app.core.gemini_client import get_llm
from typing import List, Optional


LIBRARY_SYSTEM_PROMPT = """Bạn là "Thư Bé" - trợ lý ảo thông minh của Thư viện Đại học.
Nhiệm vụ của bạn là hỗ trợ bạn đọc về:
- Quy định mượn/trả sách, gia hạn, đặt giữ chỗ
- Tra cứu thông tin cá nhân (sách đang mượn, tiền phạt)
- Hướng dẫn sử dụng hệ thống thư viện
- Gợi ý sách theo sở thích

Thông tin bạn đọc hiện tại:
{user_context}

Lịch sử hội thoại:
{chat_history}

Bạn đọc hỏi: {user_message}

Hướng dẫn:
- Trả lời bằng tiếng Việt, thân thiện và chuyên nghiệp
- Nếu câu hỏi nằm ngoài phạm vi thư viện, hãy lịch sự từ chối và hướng dẫn liên hệ thủ thư
- Nếu không biết chắc, hãy nói rõ và đề nghị liên hệ trực tiếp
- Tối đa 200 từ mỗi câu trả lời

Trả lời:"""


def generate_chat_response(
    user_message: str,
    chat_history: List[dict],
    user_context: Optional[dict] = None,
) -> str:
    """
    Generates a contextual response using Gemini with conversation history.
    
    Args:
        user_message: The user's current message
        chat_history: List of {role: "user"|"assistant", content: str}
        user_context: Dict with user's active borrows, fines, etc.
    """
    # Format chat history for the prompt
    history_str = ""
    for msg in chat_history[-8:]:  # Last 8 messages for context window
        role = "Bạn đọc" if msg["role"] == "user" else "Thư Bé"
        history_str += f"{role}: {msg['content']}\n"

    # Format user context
    context_str = "Không có thông tin cá nhân (chưa đăng nhập)"
    if user_context:
        borrows = user_context.get("activeBorrows", [])
        if borrows:
            borrow_list = "\n".join([
                f"  - '{b['title']}' (hạn trả: {b['dueDate']})"
                for b in borrows
            ])
            context_str = f"Đang mượn {len(borrows)} cuốn:\n{borrow_list}"
        else:
            context_str = "Hiện không có sách đang mượn"

    prompt = PromptTemplate(
        input_variables=["user_context", "chat_history", "user_message"],
        template=LIBRARY_SYSTEM_PROMPT,
    )

    llm = get_llm(temperature=0.5)
    chain = LLMChain(llm=llm, prompt=prompt)

    result = chain.invoke({
        "user_context": context_str,
        "chat_history": history_str,
        "user_message": user_message,
    })

    return result["text"].strip()
