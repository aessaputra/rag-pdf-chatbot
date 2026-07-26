from app.config import settings


def test_should_load_default_settings_with_expected_attributes():
    assert isinstance(settings.SUPABASE_URL, str)
    assert isinstance(settings.SUPABASE_JWT_SECRET, str)
