import re
from langchain_core.prompts import PromptTemplate
from app.core.gemini_client import get_llm, get_embeddings
from typing import List, Optional
import numpy as np

def cosine_similarity(vec_a: list, vec_b: list) -> float:
    a = np.array(vec_a)
    b = np.array(vec_b)
    if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
        return 0.0
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def extract_search_intent_local(query: str) -> str:
    """
    Fallback cục bộ bằng Rule-based/Regex khi Gemini bị cạn Quota (429).
    Không tốn chi phí và không bị lỗi Rate Limit.
    """
    query_lower = query.lower()
    subject = "null"
    genre = "null"
    audience = "null"
    
    # Nhận diện một số chủ đề phổ biến
    if "lập trình" in query_lower or "python" in query_lower or "java" in query_lower or "web" in query_lower:
        subject = "Công nghệ thông tin / Lập trình"
    elif "kinh tế" in query_lower or "marketing" in query_lower or "kinh doanh" in query_lower:
        subject = "Kinh tế / Quản trị kinh doanh"
        
    # Nhận diện đối tượng độc giả
    if "cho người mới bắt đầu" in query_lower or "cơ bản" in query_lower:
        audience = "Người mới bắt đầu (Beginner)"
    elif "nâng cao" in query_lower or "chuyên sâu" in query_lower:
        audience = "Người có kinh nghiệm (Advanced)"
        
    # Tách từ khóa quan trọng cơ bản (bỏ các từ nối thông thường)
    stop_words = ["tìm", "sách", "về", "cho", "những", "các", "tôi", "muốn", "đọc"]
    keywords = [word for word in query_lower.split() if word not in stop_words and len(word) > 1]
    
    # Trả về chuỗi định dạng JSON giống hệt cấu trúc cấu hình của Gemini
    keywords_str = ", ".join([f'"{k}"' for k in keywords[:5]])
    return f'{{"subject": "{subject}", "genre": {genre}, "audience": "{audience}", "keywords": [{keywords_str}]}}'


def extract_search_intent(query: str) -> str:
    """
    Sử dụng Gemini để phân tích cấu trúc từ khóa ngữ nghĩa từ người dùng.
    """
    prompt = PromptTemplate(
        input_variables=["query"],
        template="""Phân tích câu truy vấn tìm sách sau và trích xuất thông tin ngắn gọn:
Câu truy vấn: "{query}"

Trả lời ở định dạng JSON với các trường:
- subject: chủ đề chính (string hoặc null)
- genre: thể loại sách (string hoặc null)  
- audience: đối tượng độc giả (string hoặc null)
- keywords: danh sách từ khóa quan trọng (list of strings)

Chỉ trả về JSON, không thêm markdown hay giải thích dông dài:""",
    )
    llm = get_llm(temperature=0.1)
    chain = prompt | llm
    result = chain.invoke({"query": query})
    return result.content.strip()


async def semantic_search(
    query: str,
    book_embeddings: List[dict],
    limit: int = 20
) -> List[dict]:
    """
    So khớp Vector câu hỏi của người dùng với Vector của kho sách thực tế.
    """
    embeddings_model = get_embeddings()
    
    if hasattr(embeddings_model, 'encode'):
        query_embedding = embeddings_model.encode(query).tolist()
    elif hasattr(embeddings_model, 'embed_query'):
        query_embedding = embeddings_model.embed_query(query)
    else:
        query_embedding = [0.0] * 384
        
    scored = []
    for book in book_embeddings:
        if "embedding" not in book or not book["embedding"]:
            continue
            
        score = cosine_similarity(query_embedding, book["embedding"])
        
        book_cleaned = {k: v for k, v in book.items() if k != "embedding"}
        book_cleaned["score"] = score
        scored.append(book_cleaned)
        
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]