"""
FastAPI Application Main Entry Point

Configures CORS middleware, registers document and chat routers, and exposes health check endpoint.
"""

from typing import Dict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import chat_router, document_router, settings_router

app = FastAPI(
    title="RAG PDF Chatbot API",
    description="Production-grade Backend REST & SSE Streaming API for RAG PDF Chatbot System",
    version="1.0.0"
)

# Configure CORS Middleware for Next.js Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://frontend:3000",
    ],
    allow_origin_regex=r"http://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(document_router.router, prefix="/api/documents", tags=["Documents"])
app.include_router(chat_router.router, prefix="/api/chat", tags=["Chat"])
app.include_router(settings_router.router, prefix="/api/settings", tags=["Settings"])



@app.get("/health", tags=["System"])
def health_check() -> Dict[str, str]:
    """Simple health check endpoint returning system status."""
    return {"status": "online"}
