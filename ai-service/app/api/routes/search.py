from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
import asyncio
import httpx
from app.services.search_service import (
    semantic_search,
    extract_search_intent,
    normalize_search_text,
    sanitize_book_result,
    sanitize_text,
    _determine_confidence,
    generate_result_explanation,
    generate_suggested_queries,
)
from app.core.gemini_client import get_embeddings

router = APIRouter()


class SemanticSearchRequest(BaseModel):
    query: str
    userId: Optional[str] = None
    limit: int = 12


class SemanticSearchResponse(BaseModel):
    results: List[dict] = []
    intent: Optional[str] = None
    isFallback: bool = False
    searchMode: str = "semantic"         # "semantic" | "hybrid" | "keyword_fallback"
    confidenceLevel: str = "high"        # "high" | "medium" | "low"
    suggestedQueries: List[str] = []     # Gợi ý câu tìm kiếm tốt hơn khi low confidence


# ─── In-memory cache ─────────────────────────────────────────────
BOOK_EMBEDDINGS_CACHE: List[dict] = []
_CACHE_LOCK = asyncio.Lock()


async def _fetch_and_build_cache() -> List[dict]:
    """Tải sách từ Node.js Backend và sinh vector embedding cho từng cuốn."""
    try:
        embedder = get_embeddings()
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.get("http://localhost:3000/api/v1/books?limit=200")
            if res.status_code != 200:
                return []

            data = res.json()
            books = []
            if isinstance(data, dict):
                if "data" in data:
                    inner_data = data["data"]
                    books = inner_data.get("books", []) if isinstance(inner_data, dict) else inner_data
                else:
                    books = data.get("books", [])
            elif isinstance(data, list):
                books = data

            if not books:
                return []

            temp_cache = []
            for book in books:
                title = book.get("title") or ""
                summary = book.get("summary") or book.get("description") or ""
                authors = book.get("authorNames") or []
                category = book.get("category", {})
                category_name = (
                    category.get("name", "") if isinstance(category, dict) else ""
                )
                if not title:
                    continue

                # Văn bản nhúng: kết hợp tiêu đề + tác giả + danh mục + tóm tắt
                # để tăng độ chính xác ngữ nghĩa
                author_str = ", ".join(authors) if authors else ""
                text_to_embed = (
                    f"Tên sách: {title}. "
                    f"Tác giả: {author_str}. "
                    f"Danh mục: {category_name}. "
                    f"Tóm tắt: {summary}"
                )

                try:
                    if hasattr(embedder, "encode"):
                        embedding = embedder.encode(text_to_embed).tolist()
                    elif hasattr(embedder, "embed_query"):
                        embedding = embedder.embed_query(text_to_embed)
                    else:
                        embedding = [0.0] * 384
                except Exception as e:
                    print(f"[Embedding Error] '{title}': {e}")
                    embedding = [0.0] * 384

                temp_cache.append({
                    "id": book.get("id"),
                    "title": title,
                    "authorNames": authors,
                    "coverImageUrl": book.get("coverImageUrl", ""),
                    "summary": summary,
                    "categoryName": category_name,
                    "availableCopies": book.get("availableCopies", 0),
                    "averageRating": book.get("averageRating", 0),
                    "embedding": embedding,
                })

            print(f"[Search Cache] Đã index {len(temp_cache)} cuốn sách.")
            return temp_cache

    except Exception as e:
        print(f"[Fetch Cache Error] {e}")
        return []


async def get_book_embeddings() -> List[dict]:
    """Lấy cache — tự động build nếu chưa có."""
    global BOOK_EMBEDDINGS_CACHE
    if BOOK_EMBEDDINGS_CACHE:
        return BOOK_EMBEDDINGS_CACHE
    async with _CACHE_LOCK:
        if not BOOK_EMBEDDINGS_CACHE:
            BOOK_EMBEDDINGS_CACHE = await _fetch_and_build_cache()
    return BOOK_EMBEDDINGS_CACHE


# ─── Endpoint: Làm mới cache thủ công ───────────────────────────
@router.post("/refresh-cache")
async def refresh_book_cache():
    """Buộc làm mới toàn bộ cache embedding khi có sách mới được thêm vào."""
    global BOOK_EMBEDDINGS_CACHE
    async with _CACHE_LOCK:
        BOOK_EMBEDDINGS_CACHE = await _fetch_and_build_cache()
    return {"message": f"Đã làm mới cache thành công. Tổng số sách: {len(BOOK_EMBEDDINGS_CACHE)}"}


# ─── Endpoint: Tìm kiếm ngữ nghĩa chính ─────────────────────────
@router.post("/semantic", response_model=SemanticSearchResponse)
async def natural_language_search(request: SemanticSearchRequest):
    safe_query = sanitize_text(request.query or "")
    normalized_query = normalize_search_text(safe_query)

    book_embeddings = await get_book_embeddings()

    # Trường hợp 1: Chưa nhập hoặc query quá ngắn → hiển thị toàn bộ catalog
    if not safe_query or len(normalized_query) < 3:
        cleaned_books = [sanitize_book_result(book) for book in book_embeddings]
        return SemanticSearchResponse(
            results=cleaned_books,
            intent=None,
            isFallback=False,
            searchMode="semantic",
            confidenceLevel="high",
            suggestedQueries=[],
        )

    # Trường hợp 2: Tìm kiếm thực sự
    intent = None
    try:
        intent_str = extract_search_intent(safe_query)
        intent = intent_str
    except Exception:
        try:
            from app.services.search_service import extract_search_intent_local
            intent = extract_search_intent_local(safe_query)
        except Exception:
            intent = None

    try:
        # Chạy semantic search
        results = await semantic_search(
            query=safe_query,
            book_embeddings=book_embeddings,
            limit=50,
        )

        if not results:
            return SemanticSearchResponse(
                results=[],
                intent=intent,
                isFallback=True,
                searchMode="keyword_fallback",
                confidenceLevel="low",
                suggestedQueries=generate_suggested_queries(safe_query),
            )

        top_score = results[0].get("score", 0)
        confidence = _determine_confidence(top_score)

        # Xác định ngưỡng và số lượng kết quả trả về theo confidence
        if confidence == "high":
            # Trả về tất cả kết quả có score >= 35% của top score
            threshold = max(0.30, top_score * 0.35)
            search_mode = "semantic"
            max_results = request.limit  # 12
        elif confidence == "medium":
            # Kết hợp semantic và keyword
            threshold = 0.20
            search_mode = "hybrid"
            max_results = min(8, request.limit)
        else:
            # Low confidence → fallback keyword
            threshold = 0.10
            search_mode = "keyword_fallback"
            max_results = min(5, request.limit)

        # Lọc theo ngưỡng
        final_results = [r for r in results if r.get("score", 0) >= threshold][:max_results]

        # Nếu sau lọc vẫn không có → trả gợi ý câu hỏi
        if not final_results:
            suggested = generate_suggested_queries(safe_query)
            return SemanticSearchResponse(
                results=[],
                intent=intent,
                isFallback=True,
                searchMode="keyword_fallback",
                confidenceLevel="low",
                suggestedQueries=suggested,
            )

        # Thêm explanation cho top 3 kết quả (nếu confidence >= medium)
        if confidence in ("high", "medium"):
            for i, book in enumerate(final_results[:3]):
                try:
                    explanation = generate_result_explanation(
                        query=safe_query,
                        book_title=book.get("title", ""),
                        book_summary=book.get("summary", ""),
                    )
                    final_results[i]["explanation"] = explanation
                except Exception:
                    final_results[i]["explanation"] = None
        else:
            for book in final_results:
                book["explanation"] = None

        # Gợi ý câu hỏi tốt hơn nếu confidence thấp
        suggested_queries = []
        if confidence == "low":
            suggested_queries = generate_suggested_queries(safe_query)

        return SemanticSearchResponse(
            results=final_results,
            intent=sanitize_text(intent) if intent else None,
            isFallback=(search_mode == "keyword_fallback"),
            searchMode=search_mode,
            confidenceLevel=confidence,
            suggestedQueries=suggested_queries,
        )

    except Exception as e:
        print(f"[Semantic Search Error] {e}")
        return SemanticSearchResponse(
            results=[],
            intent=None,
            isFallback=True,
            searchMode="keyword_fallback",
            confidenceLevel="low",
            suggestedQueries=[],
        )