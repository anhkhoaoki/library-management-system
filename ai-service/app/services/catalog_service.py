"""
Catalog AI Service
Implements:
  - UC-CAT-03: Auto-Cataloging by ISBN
  - UC-CAT-04: AI Book Summarization
"""

import httpx
import hashlib
import json
from typing import Optional
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.core.gemini_client import get_llm
from app.schemas.catalog import IsbnLookupResponse, SummarizeResponse
from app.core.config import settings

_summary_cache = {}


# ─── UC-CAT-03: ISBN Auto-Cataloging ────────────────────────────
async def fetch_book_by_isbn(isbn: str) -> IsbnLookupResponse:
    """
    Fetches book metadata from Google Books API (primary)
    with Open Library as fallback.
    """
    # --- Try Google Books API first ---
    google_url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}"
    if settings.GOOGLE_BOOKS_API_KEY:
        google_url += f"&key={settings.GOOGLE_BOOKS_API_KEY}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(google_url)
            response.raise_for_status()
            data = response.json()

            if data.get("totalItems", 0) > 0:
                info = data["items"][0]["volumeInfo"]
                image_links = info.get("imageLinks", {})

                return IsbnLookupResponse(
                    isbn=isbn,
                    title=info.get("title", ""),
                    authorNames=info.get("authors", []),
                    publisher=info.get("publisher"),
                    publishYear=_extract_year(info.get("publishedDate")),
                    language=info.get("language"),
                    description=info.get("description"),
                    coverImageUrl=(
                        image_links.get("thumbnail") or
                        image_links.get("smallThumbnail")
                    ),
                    category=info.get("categories", [None])[0],
                    source="google_books",
                )
        except Exception:
            pass  # Fall through to Open Library

        # --- Fallback: Open Library ---
        try:
            ol_url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data"
            ol_response = await client.get(ol_url)
            ol_response.raise_for_status()
            ol_data = ol_response.json()

            key = f"ISBN:{isbn}"
            if key in ol_data:
                book = ol_data[key]
                authors = [a["name"] for a in book.get("authors", [])]
                covers = book.get("cover", {})
                pub_date = book.get("publish_date", "")

                return IsbnLookupResponse(
                    isbn=isbn,
                    title=book.get("title", ""),
                    authorNames=authors,
                    publisher=book.get("publishers", [{}])[0].get("name"),
                    publishYear=_extract_year(pub_date),
                    language=None,
                    description=book.get("notes", {}).get("value") if isinstance(book.get("notes"), dict) else None,
                    coverImageUrl=covers.get("medium") or covers.get("large"),
                    source="open_library",
                )
        except Exception:
            pass

    raise ValueError(f"Không tìm thấy thông tin cho ISBN: {isbn}")


def _extract_year(date_str: Optional[str]) -> Optional[int]:
    if not date_str:
        return None
    for part in str(date_str).split("-"):
        if len(part) == 4 and part.isdigit():
            return int(part)
    return None


# ─── UC-CAT-04: AI Summarization with LangChain + Gemini ────────
def generate_book_summary(
    title: str,
    author_names: list[str],
    category: Optional[str] = None,
    existing_description: Optional[str] = None,
) -> SummarizeResponse:
    """
    Uses LangChain + Gemini API to generate a 150-300 word Vietnamese
    book summary for the catalog form.
    """
    if len(author_names) == 0:
        raise ValueError("Cần ít nhất một tên tác giả để tạo tóm tắt")

    authors_str = ", ".join(author_names)
    category_str = f"Thể loại: {category}. " if category else ""
    desc_str = (
        f"\nDưới đây là mô tả sơ lược đã có (có thể sử dụng làm tham khảo):\n{existing_description}"
        if existing_description else ""
    )

    prompt_template = PromptTemplate(
        input_variables=["title", "authors", "category_info", "description_hint"],
        template="""Bạn là một thủ thư chuyên nghiệp. Hãy viết một đoạn tóm tắt nội dung sách \
bằng tiếng Việt, khoảng 150 đến 300 từ, hấp dẫn và súc tích cho cuốn sách sau:

Tên sách: "{title}"
Tác giả: {authors}
{category_info}
{description_hint}

Yêu cầu:
- Viết bằng tiếng Việt, văn phong chuyên nghiệp
- Nêu bật chủ đề chính, đối tượng độc giả phù hợp
- Không thêm thông tin không có thật
- Độ dài: 150-300 từ
- KHÔNG thêm câu giới thiệu hay lời kết thúc, chỉ cần đoạn tóm tắt thuần tuý

Tóm tắt:""",
    )

    llm = get_llm(temperature=0.6)
    chain = prompt_template | llm | StrOutputParser()

    result = chain.invoke({
        "title": title,
        "authors": authors_str,
        "category_info": category_str,
        "description_hint": desc_str,
    })

    summary_text = result.strip()
    word_count = len(summary_text.split())

    return SummarizeResponse(
        summary=summary_text,
        isAiGenerated=True,
        wordCount=word_count,
    )


async def generate_book_summary_stream(
    title: str,
    author_names: list[str],
    category: Optional[str] = None,
    existing_description: Optional[str] = None,
    tone: Optional[str] = "Mặc định",
):
    if len(author_names) == 0:
        yield json.dumps({"error": "Cần ít nhất một tên tác giả để tạo tóm tắt"}, ensure_ascii=False) + "\n"
        return

    # Cache key
    cache_key = hashlib.md5(f"{title}_{','.join(author_names)}_{tone}".encode('utf-8')).hexdigest()
    if cache_key in _summary_cache:
        yield json.dumps({"token": _summary_cache[cache_key]}, ensure_ascii=False) + "\n"
        yield json.dumps({"token": "[DONE]"}, ensure_ascii=False) + "\n"
        return

    # Fetch external context
    external_context = ""
    query = f"intitle:{title}+inauthor:{author_names[0]}"
    google_url = f"https://www.googleapis.com/books/v1/volumes?q={query}"
    if settings.GOOGLE_BOOKS_API_KEY:
        google_url += f"&key={settings.GOOGLE_BOOKS_API_KEY}"
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.get(google_url)
            if response.status_code == 200:
                data = response.json()
                if data.get("totalItems", 0) > 0:
                    info = data["items"][0]["volumeInfo"]
                    desc = info.get("description")
                    if desc:
                        external_context = f"Thông tin tra cứu được: {desc}\n"
        except Exception:
            pass

    authors_str = ", ".join(author_names)
    category_str = f"Thể loại: {category}. " if category else ""
    desc_str = ""
    if existing_description:
        desc_str += f"\nDưới đây là mô tả sơ lược đã có:\n{existing_description}\n"
    if external_context:
        desc_str += f"\n{external_context}\n"

    tone_instruction = "văn phong chuyên nghiệp"
    if tone == "Học thuật":
        tone_instruction = "văn phong học thuật, chuyên sâu, khách quan"
    elif tone == "Thu hút":
        tone_instruction = "văn phong lôi cuốn, hấp dẫn, khơi gợi sự tò mò"
    elif tone == "Thiếu nhi":
        tone_instruction = "văn phong gần gũi, đơn giản, vui nhộn dành cho trẻ em"

    prompt_template = PromptTemplate(
        input_variables=["title", "authors", "category_info", "description_hint", "tone_instruction"],
        template="""Bạn là một thủ thư chuyên nghiệp. Hãy viết một đoạn tóm tắt nội dung sách \
bằng tiếng Việt, khoảng 150 đến 300 từ cho cuốn sách sau:

Tên sách: "{title}"
Tác giả: {authors}
{category_info}
{description_hint}

Yêu cầu:
- Viết bằng tiếng Việt, {tone_instruction}.
- Nêu bật chủ đề chính, đối tượng độc giả phù hợp.
- Dựa vào thông tin tra cứu (nếu có) để tăng độ chính xác, không thêm thông tin không có thật.
- Độ dài: 150-300 từ.
- KHÔNG thêm câu giới thiệu hay lời kết thúc, chỉ cần đoạn tóm tắt thuần tuý.

Tóm tắt:""",
    )

    llm = get_llm(temperature=0.7)
    chain = prompt_template | llm | StrOutputParser()

    input_data = {
        "title": title,
        "authors": authors_str,
        "category_info": category_str,
        "description_hint": desc_str,
        "tone_instruction": tone_instruction,
    }

    full_text = ""
    try:
        async for chunk in chain.astream(input_data):
            full_text += chunk
            yield json.dumps({"token": chunk}, ensure_ascii=False) + "\n"
        
        _summary_cache[cache_key] = full_text
        yield json.dumps({"token": "[DONE]"}, ensure_ascii=False) + "\n"
    except Exception as e:
        yield json.dumps({"error": str(e)}, ensure_ascii=False) + "\n"
