from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import httpx
from app.services.search_service import semantic_search, extract_search_intent
from app.core.gemini_client import get_embeddings

router = APIRouter()

class SemanticSearchRequest(BaseModel):
    query: str
    userId: Optional[str] = None
    limit: int = 20

class SemanticSearchResponse(BaseModel):
    results: List[dict] = []
    intent: Optional[str] = None
    isFallback: bool = False

# Bộ nhớ đệm lưu danh sách sách kèm Vector
BOOK_EMBEDDINGS_CACHE = []

async def get_book_embeddings():
    """
    Lấy danh sách sách từ Node.js backend và sinh vector tương ứng cho từng cuốn.
    """
    global BOOK_EMBEDDINGS_CACHE
    if BOOK_EMBEDDINGS_CACHE:
        return BOOK_EMBEDDINGS_CACHE
        
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Gọi API lấy sách từ Node.js (cổng 3000)
            res = await client.get("http://localhost:3000/api/v1/books?limit=150")
            if res.status_code == 200:
                data = res.json()
                
                # Bóc tách mảng sách tùy thuộc cấu trúc Node.js trả về
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

                embedder = get_embeddings()
                temp_cache = []
                
                for book in books:
                    title = book.get('title') or ""
                    summary = book.get('summary') or ""
                    if not title:
                        continue
                    
                    # Kết hợp Tiêu đề + Tóm tắt để tạo ngữ cảnh tìm kiếm tối ưu cho AI
                    text_to_embed = f"Tên sách: {title}. Tóm tắt: {summary}"
                    
                    # Sinh Vector Embedding đồng bộ an toàn
                    try:
                        if hasattr(embedder, 'encode'):
                            embedding = embedder.encode(text_to_embed).tolist()
                        elif hasattr(embedder, 'embed_query'):
                            embedding = embedder.embed_query(text_to_embed)
                        else:
                            embedding = [0.0] * 384
                    except Exception as e:
                        print(f"Lỗi sinh embedding cho cuốn sách '{title}': {e}")
                        embedding = [0.0] * 384

                    temp_cache.append({
                        "id": book.get("id"),
                        "title": title,
                        "authorNames": book.get("authorNames", []),
                        "coverImageUrl": book.get("coverImageUrl", ""),
                        "summary": summary,
                        "availableCopies": book.get("availableCopies", 0),
                        "averageRating": book.get("averageRating", 0),
                        "embedding": embedding
                    })
                
                if temp_cache:
                    BOOK_EMBEDDINGS_CACHE = temp_cache
    except Exception as e:
        print(f"[Fetch Embeddings Error] Không thể đồng bộ danh sách sách từ Node.js: {str(e)}")
        
    return BOOK_EMBEDDINGS_CACHE


# CHÚ Ý SỬA LẠI THÀNH: SemanticSearchRequest ở dòng này 👇
@router.post("/semantic", response_model=SemanticSearchResponse)
async def natural_language_search(request: SemanticSearchRequest):
    
    # 1. Lấy toàn bộ danh sách sách từ Cache / DB trước
    book_embeddings = await get_book_embeddings()

    # 🎯 TRƯỜNG HỢP 1: Khi vừa bật chế độ AI, chưa nhập chữ nào (hoặc gõ quá ngắn dưới 3 ký tự)
    if not request.query or len(request.query.strip()) < 3:
        # Loại bỏ trường 'embedding' để tránh nặng băng thông khi trả về danh sách lớn
        cleaned_books = [{k: v for k, v in b.items() if k != "embedding"} for b in book_embeddings]
        return SemanticSearchResponse(
            results=cleaned_books, # Hiện toàn bộ sách làm mặc định
            intent=None,
            isFallback=False
        )

    # 🎯 TRƯỜNG HỢP 2: Người dùng gõ câu lệnh ngữ nghĩa thực sự
    intent = None
    try:
        try:
            intent_str = extract_search_intent(request.query)
            intent = intent_str 
        except Exception as gemini_err:
            print(f"[Gemini Fallback] Đang chuyển hướng phân tích sang bộ lọc Local Rule")
            try:
                from app.services.search_service import extract_search_intent_local
                intent = extract_search_intent_local(request.query)
            except Exception:
                intent = None

        # Tiến hành so sánh Vector ngữ nghĩa
        results = await semantic_search(
            query=request.query,
            book_embeddings=book_embeddings,
            limit=100, # Quét diện rộng
        )

        # Trích xuất ĐÚNG 1 CUỐN duy nhất có điểm tương đồng cao nhất
        final_results = []
        if results:
            best_match = results[0] # Phần tử đầu tiên luôn có score cao nhất do đã sort giảm dần
            
            # Đặt ngưỡng điểm số tin cậy (Ví dụ: lớn hơn hoặc bằng 0.25)
            # Tránh việc người dùng nhập lung tung không liên quan mà vẫn ra sách
            if best_match.get("score", 0) >= 0.25: 
                final_results = [best_match] # Chỉ lấy đúng 1 cuốn này

        return SemanticSearchResponse(
            results=final_results,
            intent=intent,
            isFallback=False,
        )

    except Exception as e:
        print(f"[Semantic Search Error] {str(e)}")
        return SemanticSearchResponse(results=[], intent=None, isFallback=True)