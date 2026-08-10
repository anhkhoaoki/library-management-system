"""
recommend.py — UC-AI-03: Personalized Book Recommendations
Endpoint nhận signals từ Node.js backend và trả về gợi ý cá nhân hóa.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from app.services.recommendation_service import get_personalized_recommendations
from app.api.routes.search import get_book_embeddings

router = APIRouter()


# ── Request / Response Models ──────────────────────────────────────

class SimilarUserData(BaseModel):
    userId: str
    borrowedBookIds: List[str]
    overlap: int  # Số sách chung với user hiện tại


class RatingItem(BaseModel):
    bookId: str
    rating: int  # 1-5


class RecommendRequest(BaseModel):
    userId: str
    borrowedBookIds: List[str]                    # Sách user đã mượn
    ratings: List[RatingItem] = []               # Đánh giá của user
    similarUsersBorrows: List[SimilarUserData] = []  # Collaborative signals từ Node.js
    limit: int = 8                               # Số gợi ý tối đa


class BookRecommendation(BaseModel):
    id: str
    title: str
    authorNames: List[str] = []
    coverImageUrl: Optional[str] = None
    summary: Optional[str] = None
    categoryName: Optional[str] = None
    availableCopies: int = 0
    averageRating: float = 0
    score: float = 0
    reason: str = "content_based"
    reasonLabel: str = "Phù hợp với bạn"


class RecommendResponse(BaseModel):
    recommendations: List[BookRecommendation] = []
    reason: str
    message: str


# ── Endpoint ───────────────────────────────────────────────────────

@router.post("/personalized", response_model=RecommendResponse)
async def personalized_recommendations(request: RecommendRequest):
    """
    UC-AI-03: Trả về danh sách sách được đề xuất cá nhân hóa.

    Pipeline:
      1. Lấy embedding cache (từ search module — tái sử dụng, không build lại)
      2. Chạy Content-Based Filtering (cosine similarity trên user profile vector)
      3. Chạy Collaborative Filtering (user-user overlap scoring)
      4. Hybrid merge → trả về top-K kết quả
    """
    if not request.userId:
        raise HTTPException(status_code=400, detail="userId là bắt buộc")

    # Lấy embedding cache (shared với search endpoint — không cần rebuild)
    try:
        book_embeddings = await get_book_embeddings()
    except Exception as e:
        print(f"[Recommend] Lỗi khi lấy embedding cache: {e}")
        book_embeddings = []

    # Nếu chưa có lịch sử hoặc cache trống → cold start (Node.js xử lý)
    if not request.borrowedBookIds or not book_embeddings:
        return RecommendResponse(
            recommendations=[],
            reason="cold_start",
            message="Sách phổ biến tại thư viện",
        )

    # Chạy pipeline đề xuất
    result = get_personalized_recommendations(
        borrowed_book_ids=request.borrowedBookIds,
        similar_users_borrows=[u.model_dump() for u in request.similarUsersBorrows],
        book_embeddings_cache=book_embeddings,
        limit=request.limit,
    )

    # Validate và trả về response
    validated_recs = []
    for rec in result.get("recommendations", []):
        validated_recs.append(BookRecommendation(
            id=rec.get("id", ""),
            title=rec.get("title", ""),
            authorNames=rec.get("authorNames", []),
            coverImageUrl=rec.get("coverImageUrl"),
            summary=rec.get("summary"),
            categoryName=rec.get("categoryName"),
            availableCopies=rec.get("availableCopies", 0),
            averageRating=rec.get("averageRating", 0),
            score=rec.get("score", 0),
            reason=rec.get("reason", "content_based"),
            reasonLabel=rec.get("reasonLabel", "Phù hợp với bạn"),
        ))

    return RecommendResponse(
        recommendations=validated_recs,
        reason=result.get("reason", "content_based"),
        message=result.get("message", "Dành riêng cho bạn"),
    )
