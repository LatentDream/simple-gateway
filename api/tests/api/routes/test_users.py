import pytest
from fastapi.testclient import TestClient
from src.main import app
import base64
from datetime import datetime, timedelta

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def valid_auth_header(settings):
    credentials = f"{settings.API_USERNAME}:{settings.API_PASSWORD}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"

@pytest.fixture
def invalid_auth_header():
    credentials = "wrong:wrong"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"

@pytest.fixture
def valid_session_token(settings):
    timestamp = str(datetime.utcnow().timestamp())
    token = base64.b64encode(f"{settings.API_USERNAME}:{timestamp}".encode()).decode()
    return token

@pytest.fixture
def expired_session_token(settings):
    timestamp = str((datetime.utcnow() - timedelta(hours=2)).timestamp())
    token = base64.b64encode(f"{settings.API_USERNAME}:{timestamp}".encode()).decode()
    return token

class TestAuthentication:
    def test_login_success(self, client, settings):
        response = client.post(
            "/users/login",
            headers={"Authorization": f"Basic {base64.b64encode(f'{settings.API_USERNAME}:{settings.API_PASSWORD}'.encode()).decode()}"}
        )
        assert response.status_code == 200
        assert response.json() == {"message": "Successfully logged in"}
        assert "session" in response.cookies
        
    def test_login_invalid_credentials(self, client, invalid_auth_header):
        response = client.post(
            "/users/login",
            headers={"Authorization": invalid_auth_header}
        )
        assert response.status_code == 401
        assert "session" not in response.cookies
        
    def test_logout_success(self, client, valid_session_token):
        # First set the session cookie
        client.cookies.set("session", valid_session_token)
        
        response = client.post("/users/logout")
        assert response.status_code == 200
        assert response.json() == {"message": "Successfully logged out"}
        assert "session" not in response.cookies
        
    def test_logout_no_auth(self, client):
        response = client.post("/users/logout")
        assert response.status_code == 401
        
    def test_me_with_valid_cookie(self, client, valid_session_token):
        client.cookies.set("session", valid_session_token)
        response = client.get("/users/me")
        assert response.status_code == 200
        
    def test_me_with_expired_cookie(self, client, expired_session_token):
        client.cookies.set("session", expired_session_token)
        response = client.get("/users/me")
        assert response.status_code == 401
        
    def test_me_with_basic_auth(self, client, valid_auth_header):
        response = client.get(
            "/users/me",
            headers={"Authorization": valid_auth_header}
        )
        assert response.status_code == 200
        
    def test_me_no_auth(self, client):
        response = client.get("/users/me")
        assert response.status_code == 401
        
    def test_cookie_precedence_over_basic_auth(self, client, valid_session_token, invalid_auth_header):
        # Test that valid cookie works even with invalid basic auth
        client.cookies.set("session", valid_session_token)
        response = client.get(
            "/users/me",
            headers={"Authorization": invalid_auth_header}
        )
        assert response.status_code == 200 
