from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict

router = APIRouter()


class RatingItem(BaseModel):
    bookId: str
    rating: int


class RecommendRequest(BaseModel):
    userId: str
    borrowedBookIds: List[str]
    ratings: List[RatingItem] = []


class RecommendResponse(BaseModel):
    recommendations: List[Dict]
    reason: str
    message: str


@router.post("/personalized", response_model=RecommendResponse)
def personalized_recommendations(request: RecommendRequest):
    """
    UC-AI-03: Personalized book recommendations.
    
    Algorithm overview:
    1. Content-based: Find books in same categories/authors as borrowed history
    2. Collaborative filtering: Find users with similar borrow patterns
    3. Rank by: similarity score * recency weight * rating weight
    
    In production: Use a trained ML model (Matrix Factorization, Neural CF)
    or integrate with a recommendation engine like RecBole or Surprise.
    
    NOTE: This endpoint receives pre-computed signals from Node.js backend
    and returns ranked recommendations. The actual ML inference should be
    done here or call a separate ML model server.
    """
    if not request.userId:
        raise HTTPException(status_code=400, detail="userId là bắt buộc")

    # Placeholder: In production, run your trained recommendation model here
    # Example model call:
    # model_input = prepare_features(request.borrowedBookIds, request.ratings)
    # recommendations = recommendation_model.predict(request.userId, model_input)
    
    # For now, return empty list — Node.js will handle cold-start fallback
    return RecommendResponse(
        recommendations=[],
        reason="collaborative_filtering",
        message="Dành riêng cho bạn",
    )
