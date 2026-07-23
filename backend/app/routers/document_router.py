"""
Document Router Module

Handles PDF document uploads, text extraction & chunk vectorization, listing documents, and deletion.
Uses fastapi.concurrency.run_in_threadpool for non-blocking CPU & synchronous I/O operations.
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from app.auth import get_current_user
from app.database import get_supabase_client
from app.schemas import DocumentUploadResponse, UserPayload
from app.services.ingestion_service import PDFIngestionService

router = APIRouter()


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_pdf_document(
    file: UploadFile = File(...),
    user: UserPayload = Depends(get_current_user)
) -> DocumentUploadResponse:
    """
    Uploads and ingests a PDF document.
    Validates file extension, parses text per page, generates vector embeddings, and stores in Supabase.
    Runs CPU/IO heavy tasks in threadpool to prevent blocking the event loop.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files (.pdf) are supported."
        )

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded PDF file is empty."
        )

    ingestion_service = PDFIngestionService()

    # Run heavy PDF parsing in threadpool
    chunks = await run_in_threadpool(ingestion_service.parse_pdf_bytes, pdf_bytes, file.filename)

    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract readable text from PDF."
        )

    # Run Supabase vector storage in threadpool
    response = await run_in_threadpool(
        ingestion_service.store_document_and_chunks,
        filename=file.filename,
        file_size=len(pdf_bytes),
        user_id=user.user_id,
        chunks=chunks,
        total_pages=max(chunk.page_number for chunk in chunks)
    )

    return response


@router.get("", response_model=List[Dict[str, Any]])
async def list_user_documents(user: UserPayload = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """Retrieves all uploaded PDF document metadata records owned by the authenticated user."""
    def fetch_docs():
        supabase = get_supabase_client()
        res = supabase.table("documents").select("id, filename, file_size, created_at").eq("user_id", user.user_id).execute()
        return res.data if res.data else []

    return await run_in_threadpool(fetch_docs)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    user: UserPayload = Depends(get_current_user)
) -> None:
    """Deletes a document and its associated vector chunks owned by the authenticated user."""
    def remove_doc():
        supabase = get_supabase_client()
        supabase.table("documents").delete().eq("id", document_id).eq("user_id", user.user_id).execute()

    await run_in_threadpool(remove_doc)
