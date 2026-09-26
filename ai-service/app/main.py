from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import catalog, search, chat, recommend
from app.core.config import settings
from app.services.rag_service import initialize_rag
from app.services.vector_store import ensure_schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize RAG Vector Store (ChromaDB) and pgvector schema on startup."""
    # 1. ChromaDB in-memory for RAG Chatbot (FAQ)
    print("[Startup] Initializing RAG Vector Store (ChromaDB)...")
    initialize_rag()
    print("[Startup] RAG ready!")

    # 2. Ensure book_embeddings table + HNSW index exist in PostgreSQL
    print("[Startup] Initializing pgvector schema...")
    try:
        ensure_schema()
        print("[Startup] pgvector schema ready!")
    except Exception as e:
        print(f"[Startup] WARNING: Could not init pgvector schema: {e}")
        print("[Startup] Service continues, but Semantic Search may be affected.")

    yield
    print("[Shutdown] AI Service stopped.")


app = FastAPI(
    title="Library AI Microservice",
    description="AI-powered features: ISBN cataloging, summarization, semantic search (pgvector), chatbot (RAG + Function Calling), recommendations",
    version="2.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(catalog.router, prefix="/catalog", tags=["Catalog AI"])
app.include_router(search.router, prefix="/search", tags=["Semantic Search (pgvector)"])
app.include_router(chat.router, prefix="/chat", tags=["Chatbot (RAG + FC)"])
app.include_router(recommend.router, prefix="/recommend", tags=["Recommendations"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "Library AI Microservice v2.1 (pgvector + RAG + Function Calling)"}
