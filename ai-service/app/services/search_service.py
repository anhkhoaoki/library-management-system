"""
Semantic Search Service — UC-AI-01
Uses Google Generative AI embeddings + cosine similarity for natural language search.
In production, replace with pgvector or a dedicated vector DB (Pinecone, Weaviate).
"""

from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from app.core.gemini_client import get_llm, get_embeddings
from typing import List, Optional
import numpy as np


def cosine_similarity(vec_a: list, vec_b: list) -> float:
    a = np.array(vec_a)
    b = np.array(vec_b)
    if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
        return 0.0
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def extract_search_intent(query: str) -> dict:
    """
    Uses Gemini to extract structured intent from natural language query.
    Returns a dict with keys: subject, genre, audience, keywords
    """
    prompt = PromptTemplate(
        input_variables=["query"],
        template="""Phân tích câu truy vấn tìm sách sau và trích xuất thông tin:
Câu truy vấn: "{query}"

Trả lời ở định dạng JSON với các trường:
- subject: chủ đề chính (string hoặc null)
- genre: thể loại sách (string hoặc null)  
- audience: đối tượng độc giả (string hoặc null)
- keywords: danh sách từ khóa quan trọng (list of strings)

Chỉ trả về JSON, không thêm markdown hay giải thích:""",
    )
    llm = get_llm(temperature=0.1)
    chain = LLMChain(llm=llm, prompt=prompt)
    result = chain.invoke({"query": query})
    return result["text"].strip()


async def semantic_search(
    query: str,
    book_embeddings: List[dict],
    limit: int = 20
) -> List[dict]:
    """
    Performs semantic similarity search against pre-computed book embeddings.
    
    In production:
    - Store embeddings in pgvector: SELECT * FROM book_vectors ORDER BY embedding <=> $1 LIMIT 20
    - Or use Weaviate/Pinecone for large-scale retrieval
    
    Args:
        query: Natural language search query
        book_embeddings: List of {bookId, title, embedding, metadata}
        limit: Max results to return
    """
    embeddings_model = get_embeddings()
    
    # Embed the user query
    query_embedding = embeddings_model.embed_query(query)
    
    # Calculate similarity scores
    scored = []
    for book in book_embeddings:
        score = cosine_similarity(query_embedding, book["embedding"])
        scored.append({**book, "score": score})
    
    # Sort by score descending
    scored.sort(key=lambda x: x["score"], reverse=True)
    
    # Filter low-relevance results
    relevant = [r for r in scored if r["score"] > 0.3]
    
    return relevant[:limit]
