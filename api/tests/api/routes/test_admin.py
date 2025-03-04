import pytest
from fastapi.testclient import TestClient
from src.main import app
import base64
from datetime import datetime, timedelta
from src.api.routes.admin import RouteForwardingResponse, RouteForwardingConfig

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
            "/admin/login",
            headers={"Authorization": f"Basic {base64.b64encode(f'{settings.API_USERNAME}:{settings.API_PASSWORD}'.encode()).decode()}"}
        )
        assert response.status_code == 200
        assert response.json() == {"name": "admin"}
        assert "session" in response.cookies
        
    def test_login_invalid_credentials(self, client, invalid_auth_header):
        response = client.post(
            "/admin/login",
            headers={"Authorization": invalid_auth_header}
        )
        assert response.status_code == 401
        assert "session" not in response.cookies
        
    def test_logout_success(self, client, valid_session_token):
        # First set the session cookie
        client.cookies.set("session", valid_session_token)
        
        response = client.post("/admin/logout")
        assert response.status_code == 200
        assert response.json() == {"message": "Successfully logged out"}
        assert "session" not in response.cookies
        
    def test_logout_no_auth(self, client):
        response = client.post("/admin/logout")
        assert response.status_code == 401
        
    def test_me_with_valid_cookie(self, client, valid_session_token):
        client.cookies.set("session", valid_session_token)
        response = client.get("/admin/me")
        assert response.status_code == 200
        
    def test_me_with_expired_cookie(self, client, expired_session_token):
        client.cookies.set("session", expired_session_token)
        response = client.get("/admin/me")
        assert response.status_code == 401
        
    def test_me_with_basic_auth(self, client, valid_auth_header):
        response = client.get(
            "/admin/me",
            headers={"Authorization": valid_auth_header}
        )
        assert response.status_code == 200
        
    def test_me_no_auth(self, client):
        response = client.get("/admin/me")
        assert response.status_code == 401
        
    def test_cookie_precedence_over_basic_auth(self, client, valid_session_token, invalid_auth_header):
        # Test that valid cookie works even with invalid basic auth
        client.cookies.set("session", valid_session_token)
        response = client.get(
            "/admin/me",
            headers={"Authorization": invalid_auth_header}
        )
        assert response.status_code == 200 

class TestRouteForwarding:
    def test_get_routes_success(self, client, valid_session_token, settings):
        # Set valid session token
        client.cookies.set("session", valid_session_token)
        
        response = client.get("/admin/routes")
        assert response.status_code == 200
        
        # Validate response structure matches our Pydantic model
        data = response.json()
        assert "routes" in data
        
        # Check that the routes match settings configuration
        for path, config in data["routes"].items():
            assert path in settings.ROUTE_FORWARDING
            assert "target_url" in config
            assert "rate_limit" in config
            assert config["target_url"] == settings.ROUTE_FORWARDING[path]["target_url"]
            assert config["rate_limit"] == settings.ROUTE_FORWARDING[path]["rate_limit"]
            
        # Validate response can be parsed into our Pydantic model
        route_config = RouteForwardingResponse(**data)
        assert isinstance(route_config, RouteForwardingResponse)
        for path, config in route_config.routes.items():
            assert isinstance(config, RouteForwardingConfig)
    
    def test_get_routes_no_auth(self, client):
        response = client.get("/admin/routes")
        assert response.status_code == 401
    
    def test_get_routes_with_basic_auth(self, client, valid_auth_header):
        response = client.get(
            "/admin/routes",
            headers={"Authorization": valid_auth_header}
        )
        assert response.status_code == 200
        
    def test_get_routes_with_expired_session(self, client, expired_session_token):
        client.cookies.set("session", expired_session_token)
        response = client.get("/admin/routes")
        assert response.status_code == 401 
