from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.auth import get_current_user
from app.main import app
from app.schemas import UserPayload

client = TestClient(app)

MOCK_USER = UserPayload(
    user_id="11111111-2222-3333-4444-555555555555",
    email="testuser@example.com",
    role="authenticated"
)


def override_get_current_user():
    return MOCK_USER


def test_settings_providers_unauthenticated_returns_401():
    """Verify that GET /api/settings/providers without token returns HTTP 401."""
    response = client.get("/api/settings/providers")
    assert response.status_code == 401


def test_create_openai_compatible_missing_base_url_validation_error():
    """Verify validation failure when creating OpenAI-Compatible provider without base_url."""
    app.dependency_overrides[get_current_user] = override_get_current_user
    try:
        response = client.post(
            "/api/settings/providers",
            json={
                "provider": "openai_compatible",
                "api_key": "sk-test-key",
                "model_name": "llama-3"
            }
        )
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()


@patch("app.routers.settings_router.get_supabase_client")
def test_create_provider_config_success(mock_get_supabase):
    """Verify successful creation of Gemini provider config with masked key response."""
    app.dependency_overrides[get_current_user] = override_get_current_user

    mock_supabase = MagicMock()
    mock_get_supabase.return_value = mock_supabase

    # Mock DB insert response
    mock_insert_response = MagicMock()
    mock_insert_response.data = [{
        "id": "c1111111-2222-3333-4444-555555555555",
        "user_id": MOCK_USER.user_id,
        "provider": "gemini",
        "display_name": "My Gemini Key",
        "api_key_enc": "enc_data_string",
        "base_url": None,
        "model_name": "gemini-2.5-flash",
        "is_default": True,
        "created_at": "2026-07-24T12:00:00Z",
        "updated_at": "2026-07-24T12:00:00Z"
    }]

    mock_supabase.table.return_value.insert.return_value.execute.return_value = mock_insert_response
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

    try:
        with patch("app.routers.settings_router.CryptoService") as mock_crypto_cls:
            mock_crypto = MagicMock()
            mock_crypto.encrypt.return_value = "enc_data_string"
            mock_crypto_cls.return_value = mock_crypto

            response = client.post(
                "/api/settings/providers",
                json={
                    "provider": "gemini",
                    "api_key": "AIzaSy123456789",
                    "display_name": "My Gemini Key",
                    "model_name": "gemini-2.5-flash",
                    "is_default": True
                }
            )

            assert response.status_code == 201
            data = response.json()
            assert data["id"] == "c1111111-2222-3333-4444-555555555555"
            assert data["provider"] == "gemini"
            assert data["is_default"] is True
    finally:
        app.dependency_overrides.clear()


@patch("app.routers.settings_router.get_supabase_client")
def test_list_provider_configs_success(mock_get_supabase):
    """Verify GET /api/settings/providers returns list of configs with masked keys."""
    app.dependency_overrides[get_current_user] = override_get_current_user

    mock_supabase = MagicMock()
    mock_get_supabase.return_value = mock_supabase

    mock_select_response = MagicMock()
    mock_select_response.data = [{
        "id": "c1111111-2222-3333-4444-555555555555",
        "user_id": MOCK_USER.user_id,
        "provider": "openai",
        "display_name": None,
        "api_key_enc": "enc_openai_key",
        "base_url": None,
        "model_name": "gpt-4o-mini",
        "is_default": True,
        "created_at": "2026-07-24T12:00:00Z",
        "updated_at": "2026-07-24T12:00:00Z"
    }]

    mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = mock_select_response

    try:
        response = client.get("/api/settings/providers")
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 1
        assert data[0]["provider"] == "openai"
    finally:
        app.dependency_overrides.clear()


@patch("app.routers.settings_router.get_supabase_client")
def test_save_embedding_config_locked_when_documents_exist_returns_400(mock_get_supabase):
    """Verify POST /api/settings/embedding rejects update when user has uploaded documents (locked)."""
    app.dependency_overrides[get_current_user] = override_get_current_user

    mock_supabase = MagicMock()
    mock_get_supabase.return_value = mock_supabase

    # Mock documents count > 0 (has documents)
    mock_doc_res = MagicMock()
    mock_doc_res.count = 5

    # Mock existing embedding config present
    mock_existing_res = MagicMock()
    mock_existing_res.data = [{"user_id": MOCK_USER.user_id, "provider": "gemini"}]

    def mock_table(table_name):
        mock_t = MagicMock()
        if table_name == "documents":
            mock_t.select.return_value.eq.return_value.execute.return_value = mock_doc_res
        elif table_name == "user_embedding_configs":
            mock_t.select.return_value.eq.return_value.execute.return_value = mock_existing_res
        return mock_t

    mock_supabase.table.side_effect = mock_table

    try:
        response = client.post(
            "/api/settings/embedding",
            json={
                "provider": "openai",
                "model_name": "text-embedding-3-small",
                "embedding_dimensions": 1536
            }
        )
        assert response.status_code == 400
        assert "terkunci" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


@patch("app.routers.settings_router.ModelService.fetch_available_models")
def test_verify_models_success(mock_fetch):
    """Verify POST /api/settings/providers/verify-models returns model list."""
    app.dependency_overrides[get_current_user] = override_get_current_user
    mock_fetch.return_value = {
        "success": True,
        "models": ["gemini-2.5-flash", "gemini-2.5-pro"],
        "default_model": "gemini-2.5-flash",
        "error": None
    }
    try:
        response = client.post(
            "/api/settings/providers/verify-models",
            json={
                "provider": "gemini",
                "api_key": "AIzaSyTest"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "gemini-2.5-flash" in data["models"]
        assert data["default_model"] == "gemini-2.5-flash"
    finally:
        app.dependency_overrides.clear()


@patch("app.routers.settings_router.ModelService.fetch_available_models")
def test_verify_embedding_models_success(mock_fetch):
    """Verify POST /api/settings/providers/verify-models with model_type=embedding and live vector probing."""
    app.dependency_overrides[get_current_user] = override_get_current_user
    mock_fetch.return_value = {
        "success": True,
        "models": ["models/gemini-embedding-001", "models/text-embedding-004"],
        "default_model": "models/gemini-embedding-001",
        "probed_dimension": 768,
        "error": None
    }
    try:
        response = client.post(
            "/api/settings/providers/verify-models",
            json={
                "provider": "gemini",
                "model_type": "embedding",
                "api_key": "AIzaSyTest"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "models/gemini-embedding-001" in data["models"]
        assert data["probed_dimension"] == 768
    finally:
        app.dependency_overrides.clear()



