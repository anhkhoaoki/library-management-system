"""
RAG Service — Retrieval-Augmented Generation cho FAQ/Nội quy thư viện
Dùng ChromaDB (in-memory) làm vector store + SentenceTransformer để embed.
"""
import os
from pathlib import Path
from typing import List

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.core.gemini_client import get_embeddings

# ─── ChromaDB client (in-memory) ─────────────────────────────────
_chroma_client = chromadb.Client(ChromaSettings(anonymized_telemetry=False))
_collection = None  # Khởi tạo lazy

FAQ_FILE = Path(__file__).parent.parent / "data" / "library_faq.txt"
COLLECTION_NAME = "library_faq"
CHUNK_SIZE = 400       # ký tự mỗi chunk
CHUNK_OVERLAP = 60     # ký tự overlap để tránh mất ngữ cảnh


# ─── Chunking ────────────────────────────────────────────────────
def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """
    Cắt văn bản thành các đoạn nhỏ có overlap để không mất ngữ cảnh
    giữa các đoạn kề nhau.
    """
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += size - overlap
    return chunks


# ─── Initialize RAG (gọi 1 lần lúc startup) ──────────────────────
def initialize_rag() -> None:
    """
    Đọc file FAQ, chunk, embed và lưu vào ChromaDB.
    Chỉ cần chạy 1 lần khi AI Service khởi động.
    """
    global _collection

    # Nếu collection đã tồn tại → bỏ qua
    existing = [c.name for c in _chroma_client.list_collections()]
    if COLLECTION_NAME in existing:
        _collection = _chroma_client.get_collection(COLLECTION_NAME)
        print(f"[RAG] Collection '{COLLECTION_NAME}' ready ({_collection.count()} chunks).")
        return


    # Đọc file FAQ
    if not FAQ_FILE.exists():
        print(f"[RAG] WARNING: FAQ file not found at {FAQ_FILE}")
        _collection = _chroma_client.create_collection(COLLECTION_NAME)
        return

    raw_text = FAQ_FILE.read_text(encoding="utf-8")
    chunks = chunk_text(raw_text)
    print(f"[RAG] Split into {len(chunks)} chunks from FAQ file.")

    # Sinh vector embedding cho từng chunk
    embedder = get_embeddings()
    embeddings = embedder.encode(chunks).tolist()

    # Lưu vào ChromaDB
    _collection = _chroma_client.create_collection(COLLECTION_NAME)
    _collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=[f"chunk_{i}" for i in range(len(chunks))],
    )
    print(f"[RAG] Indexed {len(chunks)} chunks into ChromaDB successfully.")


# ─── Retrieve top-K chunks ───────────────────────────────────────
def retrieve_context(query: str, top_k: int = 3) -> str:
    """
    Tìm top_k đoạn văn bản liên quan nhất đến câu hỏi.
    Trả về chuỗi ghép các chunk để nhồi vào prompt Gemini.
    """
    global _collection

    if _collection is None or _collection.count() == 0:
        return ""

    embedder = get_embeddings()
    query_embedding = embedder.encode([query]).tolist()

    results = _collection.query(
        query_embeddings=query_embedding,
        n_results=min(top_k, _collection.count()),
    )

    docs = results.get("documents", [[]])[0]
    if not docs:
        return ""

    # Ghép chunks lại, đánh số thứ tự để LLM dễ tham chiếu
    context = "\n\n---\n\n".join([f"[Đoạn {i+1}]: {doc}" for i, doc in enumerate(docs)])
    return context


# ─── Intent Classifier: FAQ hay cá nhân? ─────────────────────────
PERSONAL_KEYWORDS = [
    "tôi", "mình", "của tôi", "tài khoản tôi", "tôi đang", "tôi có",
    "sách tôi", "phạt của tôi", "tôi mượn", "tôi nợ", "còn hạn không",
    "tôi đặt", "lịch sử", "đặt chỗ của tôi",
]

def is_personal_query(message: str) -> bool:
    """
    Phân loại câu hỏi: True = hỏi về dữ liệu cá nhân (cần Function Calling),
                        False = hỏi về quy định/FAQ (dùng RAG).
    """
    msg_lower = message.lower()
    return any(kw in msg_lower for kw in PERSONAL_KEYWORDS)
