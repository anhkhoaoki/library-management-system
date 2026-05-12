from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.services.search_service import semantic_search, extract_search_intent

router = APIRouter()


class SemanticSearchRequest(BaseModel):
    query: str
    userId: Optional[str] = None
    limit: int = 20


class SemanticSearchResponse(BaseModel):
    results: List[dict]
    intent: Optional[str] = None
    isFallback: bool = False


@router.post("/semantic", response_model=SemanticSearchResponse)
async def natural_language_search(request: SemanticSearchRequest):
    """
    UC-AI-01: Natural language book search.
    Extracts intent from query then performs semantic similarity search.
    
    NOTE: In this demo, book_embeddings should be fetched from a vector store.
    Replace the empty list below with actual embeddings from your vector DB.
    """
    if not request.query or len(request.query.strip()) < 2:
        raise HTTPException(status_code=400, detail="Câu truy vấn quá ngắn")

    try:
        # Extract intent for better UX (optional, can run in parallel)
        intent = extract_search_intent(request.query)

        # TODO: Replace with actual embeddings fetched from pgvector or Pinecone
        # Example: book_embeddings = await fetch_all_book_embeddings_from_db()
        book_embeddings: List[dict] = []

        results = await semantic_search(
            query=request.query,
            book_embeddings=book_embeddings,
            limit=request.limit,
        )

        return SemanticSearchResponse(
            results=results,
            intent=intent,
            isFallback=False,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
