"""
Vector Store Service — pgvector (PostgreSQL)
Lưu trữ và tìm kiếm book embeddings trực tiếp trên PostgreSQL với pgvector extension.

Flow:
  1. Khi AI Service khởi động: kết nối DB, đảm bảo extension pgvector và bảng book_embeddings tồn tại.
  2. Khi có sách mới / refresh: upsert vector vào bảng book_embeddings.
  3. Khi tìm kiếm: gửi query vector xuống PostgreSQL → trả kết quả theo cosine distance.
"""
import os
import asyncio
from typing import List, Optional
import psycopg2
import psycopg2.extras
from pgvector.psycopg2 import register_vector

from app.core.config import settings
from app.core.gemini_client import get_embeddings


# ─── Kích thước vector của model paraphrase-multilingual-MiniLM-L12-v2 ────────
VECTOR_DIM = 384


def _get_conn(register_vec: bool = True):
    """Create psycopg2 connection to PostgreSQL. Optionally register vector type."""
    db_url = settings.DATABASE_URL
    if not db_url:
        raise RuntimeError("[VectorStore] DATABASE_URL not configured in .env")
    conn = psycopg2.connect(db_url)
    if register_vec:
        register_vector(conn)
    return conn


def ensure_schema():
    """
    Ensure pgvector extension and book_embeddings table exist.
    Called once on AI Service startup.
    """
    # Step 1: Create extension WITHOUT registering vector type yet
    conn = _get_conn(register_vec=False)
    try:
        with conn.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            conn.commit()
        print("[VectorStore] pgvector extension enabled.")
    except Exception as e:
        conn.rollback()
        print(f"[VectorStore] Warning enabling extension: {e}")
    finally:
        conn.close()

    # Step 2: Now register vector type and create table/index
    conn = _get_conn(register_vec=True)
    try:
        with conn.cursor() as cur:
            cur.execute(f"""
                CREATE TABLE IF NOT EXISTS book_embeddings (
                    book_id     TEXT PRIMARY KEY,
                    title       TEXT NOT NULL,
                    author_names TEXT,
                    category_name TEXT,
                    summary     TEXT,
                    cover_image_url TEXT,
                    available_copies INTEGER DEFAULT 0,
                    average_rating  FLOAT DEFAULT 0,
                    embedding   vector({VECTOR_DIM}) NOT NULL,
                    updated_at  TIMESTAMP DEFAULT NOW()
                );
            """)
            cur.execute(f"""
                CREATE INDEX IF NOT EXISTS book_embeddings_hnsw_idx
                ON book_embeddings
                USING hnsw (embedding vector_cosine_ops)
                WITH (m = 16, ef_construction = 64);
            """)
            conn.commit()
            print(f"[VectorStore] Schema ready (book_embeddings table + HNSW index).")
    except Exception as e:
        conn.rollback()
        print(f"[VectorStore] Error creating schema: {e}")
        raise
    finally:
        conn.close()


def upsert_books(books: List[dict]) -> int:
    """
    Upsert (INSERT OR UPDATE) danh sách sách vào bảng book_embeddings.
    Mỗi cuốn sách sẽ được:
      1. Ghép nội dung văn bản (tiêu đề + tác giả + danh mục + tóm tắt)
      2. Encode thành vector bằng SentenceTransformer (multilingual)
      3. Lưu vào PostgreSQL qua psycopg2

    Trả về số lượng sách đã được upsert thành công.
    """
    if not books:
        return 0

    embedder = get_embeddings()
    conn = _get_conn()
    success_count = 0

    try:
        with conn.cursor() as cur:
            for book in books:
                book_id = str(book.get("id") or "")
                title = book.get("title") or ""
                if not book_id or not title:
                    continue

                authors = book.get("authorNames") or []
                author_str = ", ".join(authors) if authors else ""
                category = book.get("category", {})
                category_name = (
                    category.get("name", "") if isinstance(category, dict)
                    else (book.get("categoryName") or "")
                )
                summary = book.get("summary") or book.get("description") or ""
                cover_url = book.get("coverImageUrl") or ""
                available = int(book.get("availableCopies") or 0)
                rating = float(book.get("averageRating") or 0)

                # Văn bản nhúng: kết hợp đa trường để tăng độ chính xác ngữ nghĩa
                text_to_embed = (
                    f"Tên sách: {title}. "
                    f"Tác giả: {author_str}. "
                    f"Danh mục: {category_name}. "
                    f"Tóm tắt: {summary}"
                )

                try:
                    embedding = embedder.encode(text_to_embed).tolist()
                except Exception as e:
                    print(f"[VectorStore] Embedding error cho '{title}': {e}")
                    embedding = [0.0] * VECTOR_DIM

                # UPSERT: nếu book_id đã tồn tại → cập nhật; nếu chưa → thêm mới
                cur.execute("""
                    INSERT INTO book_embeddings
                        (book_id, title, author_names, category_name, summary,
                         cover_image_url, available_copies, average_rating,
                         embedding, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (book_id) DO UPDATE SET
                        title           = EXCLUDED.title,
                        author_names    = EXCLUDED.author_names,
                        category_name   = EXCLUDED.category_name,
                        summary         = EXCLUDED.summary,
                        cover_image_url = EXCLUDED.cover_image_url,
                        available_copies = EXCLUDED.available_copies,
                        average_rating  = EXCLUDED.average_rating,
                        embedding       = EXCLUDED.embedding,
                        updated_at      = NOW();
                """, (
                    book_id, title, author_str, category_name, summary,
                    cover_url, available, rating, embedding
                ))
                success_count += 1

        conn.commit()
        print(f"[VectorStore] Upsert {success_count}/{len(books)} cuốn sách thành công.")
    except Exception as e:
        conn.rollback()
        print(f"[VectorStore] Lỗi upsert: {e}")
    finally:
        conn.close()

    return success_count


def pgvector_search(
    query: str,
    limit: int = 50,
    min_similarity: float = 0.10,
) -> List[dict]:
    """
    Tìm kiếm sách bằng cosine similarity qua pgvector.

    Thay vì tải toàn bộ sách về RAM và tính toán thủ công,
    hàm này đẩy vector truy vấn xuống PostgreSQL để tận dụng HNSW index —
    hiệu quả hơn rất nhiều với corpus lớn.

    Trả về danh sách sách đã sắp xếp theo điểm cosine giảm dần.
    """
    embedder = get_embeddings()

    try:
        query_embedding = embedder.encode(query).tolist()
    except Exception as e:
        print(f"[VectorStore] Lỗi encode query: {e}")
        return []

    conn = _get_conn()
    results = []
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Tìm top-(limit * 3) để có đủ ứng viên sau khi lọc ngưỡng
            cur.execute("""
                SELECT
                    book_id         AS id,
                    title,
                    author_names    AS "authorNames",
                    category_name   AS "categoryName",
                    summary,
                    cover_image_url AS "coverImageUrl",
                    available_copies AS "availableCopies",
                    average_rating  AS "averageRating",
                    1 - (embedding <=> %s::vector) AS similarity
                FROM book_embeddings
                ORDER BY embedding <=> %s::vector
                LIMIT %s;
            """, (query_embedding, query_embedding, limit * 3))

            rows = cur.fetchall()
            for row in rows:
                sim = float(row["similarity"])
                if sim >= min_similarity:
                    results.append({
                        "id": row["id"],
                        "title": row["title"],
                        "authorNames": [a.strip() for a in (row["authorNames"] or "").split(",") if a.strip()],
                        "categoryName": row["categoryName"] or "",
                        "summary": row["summary"] or "",
                        "coverImageUrl": row["coverImageUrl"] or "",
                        "availableCopies": row["availableCopies"] or 0,
                        "averageRating": row["averageRating"] or 0,
                        "embedding": [],  # Không trả vector ra ngoài
                        "score": round(sim, 4),
                    })

    except Exception as e:
        print(f"[VectorStore] Lỗi tìm kiếm: {e}")
    finally:
        conn.close()

    return results[:limit]


def get_all_books_from_pgvector() -> List[dict]:
    """
    Lấy toàn bộ sách từ bảng book_embeddings (không có vector).
    Dùng để hiển thị catalog khi query trống.
    """
    conn = _get_conn()
    results = []
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    book_id         AS id,
                    title,
                    author_names    AS "authorNames",
                    category_name   AS "categoryName",
                    summary,
                    cover_image_url AS "coverImageUrl",
                    available_copies AS "availableCopies",
                    average_rating  AS "averageRating"
                FROM book_embeddings
                ORDER BY title;
            """)
            rows = cur.fetchall()
            for row in rows:
                results.append({
                    "id": row["id"],
                    "title": row["title"],
                    "authorNames": [a.strip() for a in (row["authorNames"] or "").split(",") if a.strip()],
                    "categoryName": row["categoryName"] or "",
                    "summary": row["summary"] or "",
                    "coverImageUrl": row["coverImageUrl"] or "",
                    "availableCopies": row["availableCopies"] or 0,
                    "averageRating": row["averageRating"] or 0,
                    "score": 1.0,
                })
    except Exception as e:
        print(f"[VectorStore] Lỗi get_all_books: {e}")
    finally:
        conn.close()
    return results


def count_indexed_books() -> int:
    """Đếm số sách đang được index trong bảng book_embeddings."""
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM book_embeddings;")
            return cur.fetchone()[0]
    except Exception:
        return 0
    finally:
        conn.close()


def get_all_books_with_embeddings() -> List[dict]:
    """
    Lấy toàn bộ sách KÈM vector embedding từ bảng book_embeddings.
    Dùng cho Recommendation Service (cần tính cosine similarity in-memory).
    """
    conn = _get_conn()
    results = []
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    book_id         AS id,
                    title,
                    author_names    AS "authorNames",
                    category_name   AS "categoryName",
                    summary,
                    cover_image_url AS "coverImageUrl",
                    available_copies AS "availableCopies",
                    average_rating  AS "averageRating",
                    embedding
                FROM book_embeddings
                ORDER BY title;
            """)
            rows = cur.fetchall()
            for row in rows:
                emb = row["embedding"]
                # pgvector trả về numpy array hoặc list tùy driver
                if hasattr(emb, "tolist"):
                    emb = emb.tolist()
                elif emb is None:
                    emb = [0.0] * VECTOR_DIM
                results.append({
                    "id": row["id"],
                    "title": row["title"],
                    "authorNames": [a.strip() for a in (row["authorNames"] or "").split(",") if a.strip()],
                    "categoryName": row["categoryName"] or "",
                    "summary": row["summary"] or "",
                    "coverImageUrl": row["coverImageUrl"] or "",
                    "availableCopies": row["availableCopies"] or 0,
                    "averageRating": row["averageRating"] or 0,
                    "embedding": emb,
                    "score": 1.0,
                })
    except Exception as e:
        print(f"[VectorStore] Lỗi get_all_books_with_embeddings: {e}")
    finally:
        conn.close()
    return results
