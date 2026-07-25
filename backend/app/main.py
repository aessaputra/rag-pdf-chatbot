
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
app.include_router(document_router.router)
app.include_router(chat_router.router)
app.include_router(settings_router.router)



@app.get("/health", tags=["System"])
def health_check() -> dict[str, str]:
    return {"status": "online"}
