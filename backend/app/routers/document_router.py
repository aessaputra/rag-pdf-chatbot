"""
Document Router Module

Handles PDF document uploads, text extraction & chunk vectorization, listing documents, and deletion.
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

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
    chunks = ingestion_service.parse_pdf_bytes(pdf_bytes, file.filename)

    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract readable text from PDF."
        )

    response = ingestion_service.store_document_and_chunks(
        filename=file.filename,
        file_size=len(pdf_bytes),
        user_id=user.user_id,
        chunks=chunks,
        total_pages=max(chunk.page_number for chunk in chunks)
    )

    return response


@router.get("", response_model=List[Dict[str, Any]])
def list_user_documents(user: UserPayload = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """Retrieves all uploaded PDF document metadata records owned by the authenticated user."""
    supabase = get_supabase_client()
    response = supabase.table("documents").select("id, filename, file_size, created_at").eq("user_id", user.user_id).execute()
    return response.data if response.data else []


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: str,
    user: UserPayload = Depends(get_current_user)
) -> None:
    """Deletes a document and its associated vector chunks owned by the authenticated user."""
    supabase = get_supabase_client()
    supabase.table("documents").delete().eq("id", document_id).eq("user_id", user.user_id).execute()
