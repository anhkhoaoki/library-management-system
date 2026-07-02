import math
import re
import unicodedata
from typing import List


def sanitize_text(text: object, max_length: int = 2000) -> str:
    """Sanitize user-controlled text before it is processed or returned."""
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)

    text = re.sub(r"[\x00-\x1f\x7f]", " ", text)
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = text.replace('"', "&quot;").replace("'", "&#x27;")
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > max_length:
        text = text[:max_length].rstrip()
    return text


def normalize_search_text(text: object) -> str:
    """Normalize input text for keyword matching and semantic preprocessing."""
    cleaned = sanitize_text(text).lower()
    cleaned = unicodedata.normalize("NFKD", cleaned)
    cleaned = "".join(ch for ch in cleaned if not unicodedata.combining(ch))
    cleaned = re.sub(r"[^a-z0-9\s]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def sanitize_book_result(book: dict) -> dict:
    """Remove internal embeddings and sanitize string values before returning results."""
    cleaned = {}
    for key, value in book.items():
        if key == "embedding":
            continue
        if isinstance(value, str):
            cleaned[key] = sanitize_text(value)
        elif isinstance(value, list):
            cleaned[key] = [sanitize_text(item) if isinstance(item, str) else item for item in value]
        elif isinstance(value, dict):
            cleaned[key] = {
                str(sub_key): sanitize_text(sub_value) if isinstance(sub_value, str) else sub_value
                for sub_key, sub_value in value.items()
            }
        else:
            cleaned[key] = value
    return cleaned


def cosine_similarity(vec_a: list, vec_b: list) -> float:
    if not vec_a or not vec_b:
        return 0.0
    if len(vec_a) != len(vec_b):
        size = min(len(vec_a), len(vec_b))
        vec_a = vec_a[:size]
        vec_b = vec_b[:size]

    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot_product / (norm_a * norm_b))


def _get_embedding_model():
    try:
        from app.core.gemini_client import get_embeddings

        return get_embeddings()
    except Exception:
        return None


def _keyword_score(query: str, text: str) -> float:
    q_tokens = {token for token in normalize_search_text(query).split() if len(token) > 1}
    if not q_tokens:
        return 0.0

    t_tokens = {token for token in normalize_search_text(text).split() if len(token) > 1}
    if not t_tokens:
        return 0.0

    overlap = len(q_tokens & t_tokens)
    return overlap / max(1, len(q_tokens))


def extract_search_intent_local(query: str) -> str:
    """
    Fallback cục bộ bằng Rule-based/Regex khi Gemini bị cạn Quota (429).
    Không tốn chi phí và không bị lỗi Rate Limit.
    """
    safe_query = normalize_search_text(query)
    subject = "null"
    genre = "null"
    audience = "null"

    if any(token in safe_query for token in ["lap trinh", "python", "java", "web"]):
        subject = "Công nghệ thông tin / Lập trình"
    elif any(token in safe_query for token in ["kinh te", "marketing", "kinh doanh"]):
        subject = "Kinh tế / Quản trị kinh doanh"

    if any(token in safe_query for token in ["nguoi moi bat dau", "co ban"]):
        audience = "Người mới bắt đầu (Beginner)"
    elif any(token in safe_query for token in ["nang cao", "chuyen sau"]):
        audience = "Người có kinh nghiệm (Advanced)"

    stop_words = ["tim", "sach", "ve", "cho", "nhung", "cac", "toi", "muon", "doc"]
    keywords = [word for word in safe_query.split() if word not in stop_words and len(word) > 1]
    keywords_str = ", ".join([f'"{k}"' for k in keywords[:5]])
    return f'{{"subject": "{subject}", "genre": {genre}, "audience": "{audience}", "keywords": [{keywords_str}]}}'


def extract_search_intent(query: str) -> str:
    """
    Sử dụng Gemini để phân tích cấu trúc từ khóa ngữ nghĩa từ người dùng.
    """
    try:
        from langchain_core.prompts import PromptTemplate
        from app.core.gemini_client import get_llm
    except Exception:
        return extract_search_intent_local(query)

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
    result = chain.invoke({"query": sanitize_text(query or "")})
    return sanitize_text(getattr(result, "content", "") or "").strip()


async def semantic_search(
    query: str,
    book_embeddings: List[dict],
    limit: int = 20,
) -> List[dict]:
    """
    So khớp Vector câu hỏi của người dùng với Vector của kho sách thực tế.
    Sử dụng kết hợp keyword và semantic similarity khi embedding có sẵn.
    """
    safe_query = sanitize_text(query or "")
    normalized_query = normalize_search_text(safe_query)
    embeddings_model = _get_embedding_model()

    query_embedding = None
    if embeddings_model is not None:
        try:
            if hasattr(embeddings_model, "encode"):
                query_embedding = embeddings_model.encode(safe_query).tolist()
            elif hasattr(embeddings_model, "embed_query"):
                query_embedding = embeddings_model.embed_query(safe_query)
        except Exception:
            query_embedding = None

    scored = []
    for book in book_embeddings:
        if not book:
            continue

        title = sanitize_text(book.get("title") or "")
        summary = sanitize_text(book.get("summary") or "")
        author_names = book.get("authorNames") or []
        text_context = " ".join(
            [title, summary, " ".join([sanitize_text(author) for author in author_names if author])]
        )
        keyword_score = _keyword_score(normalized_query, text_context)

        if query_embedding is not None and book.get("embedding"):
            try:
                semantic_score = cosine_similarity(query_embedding, book["embedding"])
                score = max(0.0, min(1.0, 0.7 * semantic_score + 0.3 * keyword_score))
            except Exception:
                score = keyword_score
        else:
            score = keyword_score

        book_cleaned = sanitize_book_result(book)
        book_cleaned["score"] = round(float(score), 4)
        scored.append(book_cleaned)

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]