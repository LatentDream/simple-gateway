from fastapi.testclient import TestClient


def test_health_check_dev(dev_client: TestClient):
    response = dev_client.get("/admin/health_check")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "profile": "DEV", "version": "local"}

def test_health_check_prod(prod_client: TestClient):
    response = prod_client.get("/admin/health_check")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "profile": "PROD", "version": "local"}

def test_allowed_origins_dev(dev_client: TestClient):
    """Test that DEV profile has correct CORS origins"""
    app_settings = dev_client.app.state.settings
    assert "http://localhost:5173" in app_settings.ALLOWED_ORIGINS
    assert "http://localhost:3000" in app_settings.ALLOWED_ORIGINS

def test_allowed_origins_prod(prod_client: TestClient):
    """Test that PROD profile has correct CORS origins"""
    app_settings = prod_client.app.state.settings
    assert "http://localhost:5173" in app_settings.ALLOWED_ORIGINS

