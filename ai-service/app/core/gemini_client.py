import os
from sentence_transformers import SentenceTransformer
from google import genai
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from pydantic import Field
from typing import List, Any, Optional

from app.core.config import settings

# Khởi tạo Client chính chủ từ google-genai
_google_client = genai.Client(api_key=settings.GEMINI_API_KEY)

_embedding_model = SentenceTransformer(
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
)

# Tạo một Class Wrapper tùy chỉnh tương thích hoàn toàn với hệ thống LangChain hiện tại
class CleanGeminiChatModel(BaseChatModel):
    model_name: str = Field(default="gemini-2.5-flash")
    temperature: float = Field(default=0.7)

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        # Chuyển đổi format tin nhắn từ LangChain sang text thuần cho Gemini
        prompt_text = ""
        for m in messages:
            prompt_text += f"{m.content}\n"

        import time
        response = None
        for attempt in range(3):
            try:
                response = _google_client.models.generate_content(
                    model=self.model_name,
                    contents=prompt_text,
                    config={"temperature": self.temperature, "max_output_tokens": 1024}
                )
                break
            except Exception as e:
                if attempt == 2:
                    raise e
                time.sleep(1.5 ** attempt)
        
        # Đóng gói kết quả trả về đúng chuẩn LangChain yêu cầu
        ai_message = AIMessage(content=response.text or "")
        generation = ChatGeneration(message=ai_message)
        return ChatResult(generations=[generation])

    @property
    def _llm_type(self) -> str:
        return "clean_gemini_chat"


def get_llm(temperature: float = 0.7) -> BaseChatModel:
    model_name = settings.GEMINI_MODEL

    if model_name.startswith("models/"):
        model_name = model_name.replace("models/", "")
        
    if "1.0-pro" in model_name:
        model_name = "gemini-2.5-flash"

    # Trả về Model chạy bằng SDK chính chủ đã được bọc chuẩn LangChain
    return CleanGeminiChatModel(model_name=model_name, temperature=temperature)


def get_embeddings():
    return _embedding_model