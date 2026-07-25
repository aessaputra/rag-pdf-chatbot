import logging
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from app.auth import CurrentUserDep
from app.database import get_supabase_client
from app.schemas import (
    DocumentItemResponse,
    DocumentPreviewResponse,
    DocumentToggleRequest,
    DocumentUploadResponse,
)
from app.services.ingestion_service import PDFIngestionService
from app.services.storage_service import StorageService

router = APIRouter(
    prefix="/api/documents",
    tags=["Documents"],
)

logger = logging.getLogger(__name__)


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_pdf_document(
    user: CurrentUserDep,
    file: Annotated[UploadFile, File(...)],
) -> DocumentUploadResponse:
    """
    Uploads and ingests a PDF document.
    Validates file extension, parses text per page, generates vector embeddings,
    uploads PDF to Supabase Storage, and stores vectors in Supabase PostgreSQL.
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

    # Run Supabase vector storage + file upload in threadpool
    try:
        response = await run_in_threadpool(
            ingestion_service.store_document_and_chunks,
            filename=file.filename,
            file_size=len(pdf_bytes),
            user_id=user.user_id,
            chunks=chunks,
            total_pages=max(chunk.page_number for chunk in chunks),
            pdf_bytes=pdf_bytes,
        )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal menyimpan dokumen ke database: {e!s}"
        )


@router.get("", response_model=list[DocumentItemResponse])
async def list_user_documents(user: CurrentUserDep) -> list[DocumentItemResponse]:
    def fetch_docs():
        supabase = get_supabase_client()
        res = (
            supabase.table("documents")
            .select("id, filename, file_size, total_pages, file_path, is_active, status, created_at")
            .eq("user_id", user.user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data if res.data else []

    data = await run_in_threadpool(fetch_docs)
    return [DocumentItemResponse(**doc) for doc in data]


@router.patch("/{document_id}/toggle", response_model=DocumentItemResponse)
async def toggle_document_active(
    document_id: str,
    body: DocumentToggleRequest,
    user: CurrentUserDep,
) -> DocumentItemResponse:
    def do_toggle():
        supabase = get_supabase_client()
        res = (
            supabase.table("documents")
            .update({"is_active": body.is_active})
            .eq("id", document_id)
            .eq("user_id", user.user_id)
            .execute()
        )
        if not res.data:
            return None
        return res.data[0]

    result = await run_in_threadpool(do_toggle)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )
    return DocumentItemResponse(**result)


@router.get("/{document_id}/preview", response_model=DocumentPreviewResponse)
async def get_document_preview(
    document_id: str,
    user: CurrentUserDep,
) -> DocumentPreviewResponse:
    def fetch_and_sign():
        supabase = get_supabase_client()
        res = (
            supabase.table("documents")
            .select("id, file_path")
            .eq("id", document_id)
            .eq("user_id", user.user_id)
            .execute()
        )
        if not res.data:
            return None, None
        doc = res.data[0]
        file_path = doc.get("file_path")
        if not file_path:
            return doc, None
        signed_url = StorageService.create_signed_url(file_path)
        return doc, signed_url

    doc, signed_url = await run_in_threadpool(fetch_and_sign)
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )
    if signed_url is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF file not available in storage."
        )
    return DocumentPreviewResponse(document_id=document_id, signed_url=signed_url)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    user: CurrentUserDep,
) -> None:
    def remove_doc():
        supabase = get_supabase_client()
        # Fetch file_path before deletion
        res = (
            supabase.table("documents")
            .select("id, file_path")
            .eq("id", document_id)
            .eq("user_id", user.user_id)
            .execute()
        )
        if not res.data:
            return False

        file_path = res.data[0].get("file_path")

        # Delete from storage first
        if file_path:
            try:
                StorageService.delete_file(file_path)
            except Exception:
                logger.warning(
                    "Failed to delete storage file %s during document cleanup",
                    file_path,
                    exc_info=True,
                )

        # Delete from database (cascades to document_chunks)
        supabase.table("documents").delete().eq("id", document_id).eq("user_id", user.user_id).execute()
        return True

    found = await run_in_threadpool(remove_doc)
    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )
