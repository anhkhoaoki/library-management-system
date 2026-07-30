from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import catalog, search, chat, recommend
from app.core.config import settings
from app.services.rag_service import initialize_rag


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Khởi tạo RAG Vector Store lúc startup."""
    print("[Startup] Đang khởi tạo RAG Vector Store...")
    initialize_rag()
    print("[Startup] RAG sẵn sàng!")
    yield
    print("[Shutdown] AI Service đã dừng.")


app = FastAPI(
    title="Library AI Microservice",
    description="AI-powered features: ISBN cataloging, summarization, semantic search, chatbot (RAG + Function Calling), recommendations",
    version="2.0.0",
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
app.include_router(search.router, prefix="/search", tags=["Semantic Search"])
app.include_router(chat.router, prefix="/chat", tags=["Chatbot (RAG + FC)"])
app.include_router(recommend.router, prefix="/recommend", tags=["Recommendations"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "Library AI Microservice v2.0 (RAG + Function Calling)"}
