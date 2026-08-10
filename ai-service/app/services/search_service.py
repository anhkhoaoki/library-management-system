"""
Search Service — Semantic + Hybrid Search Engine
Kết hợp Vector Embedding (Cosine Similarity) + Keyword Matching theo tỷ lệ adaptive.
"""
import math
import re
import unicodedata
from typing import List, Optional


# ─── Text Sanitization Utilities ─────────────────────────────────

def sanitize_text(text: object, max_length: int = 2000) -> str:
    """Sanitize user-controlled text before processing or returning."""
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


# ─── Core Math: Cosine Similarity ────────────────────────────────

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


# ─── Keyword Matching Score ───────────────────────────────────────

def _keyword_score(query: str, text: str) -> float:
    q_tokens = {token for token in normalize_search_text(query).split() if len(token) > 1}
    if not q_tokens:
        return 0.0
    t_tokens = {token for token in normalize_search_text(text).split() if len(token) > 1}
    if not t_tokens:
        return 0.0
    overlap = len(q_tokens & t_tokens)
    return overlap / max(1, len(q_tokens))


# ─── Embedding Model Loader ───────────────────────────────────────

def _get_embedding_model():
    try:
        from app.core.gemini_client import get_embeddings
        return get_embeddings()
    except Exception:
        return None


# ─── Intent Extractor (Gemini với fallback local) ─────────────────

def extract_search_intent_local(query: str) -> str:
    """
    Fallback cục bộ bằng Rule-based/Regex khi Gemini bị cạn Quota (429).
    Không tốn chi phí và không bị lỗi Rate Limit.
    """
    safe_query = normalize_search_text(query)
    subject = "null"
    genre = "null"
    audience = "null"

    if any(token in safe_query for token in ["lap trinh", "python", "java", "web", "ai", "machine learning"]):
        subject = "Công nghệ thông tin / Lập trình"
    elif any(token in safe_query for token in ["kinh te", "marketing", "kinh doanh"]):
        subject = "Kinh tế / Quản trị kinh doanh"
    elif any(token in safe_query for token in ["van hoc", "truyen", "tieu thuyet"]):
        subject = "Văn học / Nghệ thuật"
    elif any(token in safe_query for token in ["lich su", "dia ly", "xa hoi"]):
        subject = "Khoa học xã hội"

    if any(token in safe_query for token in ["nguoi moi bat dau", "co ban", "nhap mon"]):
        audience = "Người mới bắt đầu (Beginner)"
    elif any(token in safe_query for token in ["nang cao", "chuyen sau", "chuyen gia"]):
        audience = "Người có kinh nghiệm (Advanced)"

    stop_words = ["tim", "sach", "ve", "cho", "nhung", "cac", "toi", "muon", "doc", "tai", "lieu", "can", "hoc"]
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


# ─── Adaptive Hybrid Scoring Logic ───────────────────────────────

def _compute_adaptive_weights(query: str) -> tuple[float, float]:
    """
    Tính tỷ lệ trọng số semantic vs keyword tự động theo đặc điểm câu truy vấn.
    - Query dài, nhiều từ ngữ ngữ nghĩa → ưu tiên semantic
    - Query ngắn, chính xác → ưu tiên keyword
    """
    tokens = normalize_search_text(query).split()
    token_count = len(tokens)

    # Query ngắn (< 3 từ): keyword chiếm ưu thế
    if token_count < 3:
        return 0.4, 0.6   # (semantic_weight, keyword_weight)
    # Query vừa (3–5 từ): cân bằng nghiêng semantic
    elif token_count <= 5:
        return 0.65, 0.35
    # Query dài (>5 từ): semantic hoàn toàn chiếm ưu thế
    else:
        return 0.80, 0.20


def _determine_confidence(top_score: float) -> str:
    """Phân loại mức độ tin cậy của kết quả tìm kiếm."""
    if top_score >= 0.50:
        return "high"
    elif top_score >= 0.30:
        return "medium"
    else:
        return "low"


# ─── LLM Explanation Generator ───────────────────────────────────

def generate_result_explanation(query: str, book_title: str, book_summary: str) -> Optional[str]:
    """
    Dùng Gemini để sinh 1 câu giải thích ngắn gọn tại sao cuốn sách này
    phù hợp với câu tìm kiếm. Trả về None nếu thất bại.
    """
    try:
        from langchain_core.prompts import PromptTemplate
        from app.core.gemini_client import get_llm

        prompt = PromptTemplate(
            input_variables=["query", "title", "summary"],
            template="""Người dùng tìm kiếm: "{query}"
Sách được tìm thấy: "{title}"
Tóm tắt sách: "{summary}"

Hãy viết 1 câu ngắn gọn (dưới 20 từ) bằng tiếng Việt giải thích tại sao cuốn sách này phù hợp với nhu cầu của người dùng.
Chỉ trả về câu giải thích, không thêm dấu chấm đầu hay ký tự đặc biệt:""",
        )
        llm = get_llm(temperature=0.3)
        chain = prompt | llm
        result = chain.invoke({
            "query": sanitize_text(query[:200]),
            "title": sanitize_text(book_title[:100]),
            "summary": sanitize_text(book_summary[:300]),
        })
        explanation = sanitize_text(getattr(result, "content", "") or "").strip()
        # Giới hạn độ dài hợp lý
        if len(explanation) > 150:
            explanation = explanation[:150].rstrip() + "..."
        return explanation if explanation else None
    except Exception:
        return None


# ─── Suggested Queries Generator ─────────────────────────────────

def generate_suggested_queries(query: str) -> List[str]:
    """
    Khi kết quả tìm kiếm thấp tin cậy, dùng Gemini gợi ý các câu tìm kiếm
    cụ thể hơn để người dùng thử lại.
    """
    try:
        from langchain_core.prompts import PromptTemplate
        from app.core.gemini_client import get_llm

        prompt = PromptTemplate(
            input_variables=["query"],
            template="""Người dùng thư viện đang tìm sách với câu: "{query}"
Kết quả tìm kiếm không đủ tin cậy. Hãy đề xuất 3 câu tìm kiếm cụ thể hơn để cải thiện kết quả.
Trả về đúng 3 câu tìm kiếm, mỗi câu một dòng, không đánh số, không thêm giải thích:""",
        )
        llm = get_llm(temperature=0.5)
        chain = prompt | llm
        result = chain.invoke({"query": sanitize_text(query[:200])})
        raw = getattr(result, "content", "") or ""
        suggestions = [
            sanitize_text(line.strip())
            for line in raw.strip().split("\n")
            if line.strip() and len(line.strip()) > 5
        ]
        return suggestions[:3]
    except Exception:
        return []


# ─── Main Semantic Search Function ───────────────────────────────

async def semantic_search(
    query: str,
    book_embeddings: List[dict],
    limit: int = 12,
) -> List[dict]:
    """
    Hybrid Search: Vector Embedding (Cosine Similarity) + Keyword Matching.
    - Tỷ lệ semantic/keyword được điều chỉnh tự động theo độ phức tạp của query.
    - Trả về danh sách sách đã được sắp xếp theo điểm số tổng hợp giảm dần.
    """
    safe_query = sanitize_text(query or "")
    normalized_query = normalize_search_text(safe_query)
    embeddings_model = _get_embedding_model()

    # Tính trọng số adaptive
    semantic_w, keyword_w = _compute_adaptive_weights(safe_query)

    # Sinh query embedding
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
            [title, summary, " ".join([sanitize_text(a) for a in author_names if a])]
        )
        keyword_score = _keyword_score(normalized_query, text_context)

        if query_embedding is not None and book.get("embedding"):
            try:
                semantic_score = cosine_similarity(query_embedding, book["embedding"])
                score = max(0.0, min(1.0, semantic_w * semantic_score + keyword_w * keyword_score))
            except Exception:
                score = keyword_score
        else:
            score = keyword_score

        book_cleaned = sanitize_book_result(book)
        book_cleaned["score"] = round(float(score), 4)
        scored.append(book_cleaned)

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]