from fastapi import APIRouter, HTTPException
from app.services.catalog_service import fetch_book_by_isbn, generate_book_summary
from app.schemas.catalog import IsbnLookupResponse, SummarizeRequest, SummarizeResponse

router = APIRouter()


# UC-CAT-03: Auto-Cataloging by ISBN
@router.get("/isbn/{isbn}", response_model=IsbnLookupResponse)
async def get_book_by_isbn(isbn: str):
    """
    Fetches book metadata automatically from external APIs using ISBN.
    Called by Node.js backend when librarian clicks "Lấy thông tin tự động".
    """
    # Basic ISBN format validation
    clean_isbn = isbn.replace("-", "").replace(" ", "")
    if len(clean_isbn) not in (10, 13) or not clean_isbn[:9].isdigit():
        raise HTTPException(status_code=400, detail="Mã ISBN không đúng định dạng")

    try:
        result = await fetch_book_by_isbn(clean_isbn)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Lỗi kết nối API bên thứ 3. Vui lòng thử lại sau."
        )


# UC-CAT-04: AI Book Summarization
@router.post("/summarize", response_model=SummarizeResponse)
def summarize_book(request: SummarizeRequest):
    """
    Generates a 150-300 word Vietnamese summary using LangChain + Gemini.
    Called by Node.js backend when librarian clicks "Tạo tóm tắt AI".
    """
    if not request.title or not request.authorNames:
        raise HTTPException(
            status_code=422,
            detail="Cần ít nhất tên sách và tên tác giả để tạo tóm tắt"
        )

    try:
        result = generate_book_summary(
            title=request.title,
            author_names=request.authorNames,
            category=request.category,
            existing_description=request.existingDescription,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi tạo tóm tắt AI: {str(e)}"
        )


@router.post("/summarize/stream")
def summarize_book_stream(request: SummarizeRequest):
    """
    Generates a book summary and streams the response back token by token.
    Uses SSE (Server-Sent Events) style JSON lines.
    """
    if not request.title or not request.authorNames:
        raise HTTPException(
            status_code=422,
            detail="Cần ít nhất tên sách và tên tác giả để tạo tóm tắt"
        )
        
    from fastapi.responses import StreamingResponse
    from app.services.catalog_service import generate_book_summary_stream
    
    return StreamingResponse(
        generate_book_summary_stream(
            title=request.title,
            author_names=request.authorNames,
            category=request.category,
            existing_description=request.existingDescription,
            tone=request.tone,
        ),
        media_type="text/event-stream"
    )
