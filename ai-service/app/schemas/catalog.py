from pydantic import BaseModel
from typing import Optional, List


class IsbnLookupResponse(BaseModel):
    isbn: str
    title: str
    authorNames: List[str]
    publisher: Optional[str] = None
    publishYear: Optional[int] = None
    language: Optional[str] = None
    description: Optional[str] = None
    coverImageUrl: Optional[str] = None
    category: Optional[str] = None
    source: str  # "google_books" | "open_library"


class SummarizeRequest(BaseModel):
    title: str
    authorNames: List[str]
    category: Optional[str] = None
    existingDescription: Optional[str] = None


class SummarizeResponse(BaseModel):
    summary: str
    isAiGenerated: bool = True
    wordCount: int
