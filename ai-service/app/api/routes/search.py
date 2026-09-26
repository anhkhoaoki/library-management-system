"""
Search Router — Semantic Search với pgvector (PostgreSQL)

Luồng hoạt động:
  - Startup: Gọi ensure_schema() để đảm bảo bảng book_embeddings và HNSW index tồn tại.
  - POST /search/refresh-cache: Kéo sách từ Backend → upsert vector vào PostgreSQL.
  - POST /search/semantic: Encode query → pgvector_search() → trả kết quả.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
import httpx

from app.services.search_service import (
    extract_search_intent,
    normalize_search_text,
    sanitize_book_result,
    sanitize_text,
    _determine_confidence,
    generate_result_explanation,
    generate_suggested_queries,
)
from app.services.vector_store import (
    upsert_books,
    pgvector_search,
    get_all_books_from_pgvector,
    count_indexed_books,
)
from app.core.config import settings

router = APIRouter()


class SemanticSearchRequest(BaseModel):
    query: str
    userId: Optional[str] = None
    limit: int = 12


class SemanticSearchResponse(BaseModel):
    results: List[dict] = []
    intent: Optional[str] = None
    isFallback: bool = False
    searchMode: str = "semantic"       # "semantic" | "hybrid" | "keyword_fallback"
    confidenceLevel: str = "high"      # "high" | "medium" | "low"
    suggestedQueries: List[str] = []


# ─── Helper: Kéo sách từ Backend và upsert vào pgvector ─────────────────────
async def _fetch_and_upsert_books() -> int:
    """Tải sách từ Node.js Backend và upsert vector vào PostgreSQL pgvector."""
    try:
        backend_url = settings.BACKEND_URL.rstrip("/")
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.get(f"{backend_url}/api/v1/books?limit=500")
            if res.status_code != 200:
                print(f"[Search] Backend trả về status {res.status_code}")
                return 0

            data = res.json()
            books = []
            if isinstance(data, dict):
                if "data" in data:
                    inner = data["data"]
                    books = inner.get("books", []) if isinstance(inner, dict) else inner
                else:
                    books = data.get("books", [])
            elif isinstance(data, list):
                books = data

            if not books:
                print("[Search] Không có sách nào từ Backend.")
                return 0

            count = upsert_books(books)
            return count

    except Exception as e:
        print(f"[Search] Lỗi khi fetch và upsert sách: {e}")
        return 0


# ─── Endpoint: Làm mới index sách trong pgvector ─────────────────────────────
@router.post("/refresh-cache")
async def refresh_book_cache():
    """
    Kéo toàn bộ sách từ Backend và upsert vector vào PostgreSQL (pgvector).
    Gọi endpoint này sau khi thêm/sửa/xóa sách để giữ index đồng bộ.
    """
    count = await _fetch_and_upsert_books()
    total = count_indexed_books()
    return {
        "message": f"Đã upsert {count} sách vào pgvector.",
        "total_indexed": total,
    }


# ─── Endpoint: Tìm kiếm ngữ nghĩa chính ─────────────────────────────────────
@router.post("/semantic", response_model=SemanticSearchResponse)
async def natural_language_search(request: SemanticSearchRequest):
    safe_query = sanitize_text(request.query or "")
    normalized_query = normalize_search_text(safe_query)

    # Trường hợp 1: Query trống → trả toàn bộ catalog từ pgvector
    if not safe_query or len(normalized_query) < 3:
        all_books = get_all_books_from_pgvector()
        cleaned = [sanitize_book_result(b) for b in all_books]
        return SemanticSearchResponse(
            results=cleaned,
            intent=None,
            isFallback=False,
            searchMode="semantic",
            confidenceLevel="high",
            suggestedQueries=[],
        )

    # Trường hợp 2: Tìm kiếm thực sự
    intent = None
    try:
        intent = extract_search_intent(safe_query)
    except Exception:
        try:
            from app.services.search_service import extract_search_intent_local
            intent = extract_search_intent_local(safe_query)
        except Exception:
            intent = None

    try:
        # pgvector_search: encode query → tìm top-50 gần nhất trong PostgreSQL
        results = pgvector_search(
            query=safe_query,
            limit=50,
            min_similarity=0.10,
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

        # Xác định ngưỡng và số lượng kết quả trả về
        if confidence == "high":
            threshold = max(0.40, top_score * 0.45)
            search_mode = "semantic"
            max_results = request.limit
        elif confidence == "medium":
            threshold = 0.40
            search_mode = "hybrid"
            max_results = min(8, request.limit)
        else:
            threshold = 0.40
            search_mode = "keyword_fallback"
            max_results = min(5, request.limit)

        final_results = [r for r in results if r.get("score", 0) >= threshold][:max_results]

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

        # Thêm explanation cho top 3
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

        # Sanitize trước khi trả về
        final_results = [sanitize_book_result(b) for b in final_results]

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