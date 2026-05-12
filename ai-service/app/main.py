from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import catalog, search, chat, recommend
from app.core.config import settings

app = FastAPI(
    title="Library AI Microservice",
    description="AI-powered features: ISBN cataloging, summarization, semantic search, chatbot, recommendations",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(catalog.router, prefix="/catalog", tags=["Catalog AI"])
app.include_router(search.router, prefix="/search", tags=["Semantic Search"])
app.include_router(chat.router, prefix="/chat", tags=["Chatbot"])
app.include_router(recommend.router, prefix="/recommend", tags=["Recommendations"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "Library AI Microservice"}
