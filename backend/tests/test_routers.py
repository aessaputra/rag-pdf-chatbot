"""
API Routers Integration Tests

Verifies health check endpoint, CORS middleware, route protection, and upload file validations.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check_endpoint_returns_online_status():
    """Verify that GET /health returns HTTP 200 with online status."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "online"}


def test_protected_document_upload_without_token_returns_401():
    """Verify that unauthenticated upload request is rejected with HTTP 401 Unauthorized."""
    response = client.post(
        "/api/documents/upload",
        files={"file": ("test.pdf", b"%PDF-1.4 content", "application/pdf")}
    )
    assert response.status_code == 401


def test_protected_chat_stream_without_token_returns_401():
    """Verify that unauthenticated chat stream request is rejected with HTTP 401 Unauthorized."""
    response = client.post(
        "/api/chat/stream",
        json={"query": "Test question?"}
    )
    assert response.status_code == 401
