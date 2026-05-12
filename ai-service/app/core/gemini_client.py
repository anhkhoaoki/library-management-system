import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from app.core.config import settings

# Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)

def get_llm(temperature: float = 0.7) -> ChatGoogleGenerativeAI:
    """
    Returns a LangChain-wrapped Gemini LLM instance.
    Used for text generation tasks (summarization, chat).
    """
    return ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=temperature,
        max_output_tokens=1024,
    )

def get_embeddings() -> GoogleGenerativeAIEmbeddings:
    """
    Returns a Google Generative AI embeddings instance.
    Used for semantic search vector generation.
    """
    return GoogleGenerativeAIEmbeddings(
        model=settings.EMBEDDING_MODEL,
        google_api_key=settings.GEMINI_API_KEY,
    )
