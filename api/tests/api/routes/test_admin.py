import pytest
import base64
from datetime import datetime, timedelta
from src.api.routes.admin import RouteForwardingResponse, RouteForwardingConfig
from src.settings import Settings
from src.database.models import GatewayConfig
from src.types.forwarding_rules import UpdateRouteForwardingRequest


@pytest.fixture
def valid_auth_header(settings: Settings):
    credentials = f"{settings.API_USERNAME}:{settings.API_PASSWORD}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"

@pytest.fixture
def invalid_auth_header():
    credentials = "wrong:wrong"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"

@pytest.fixture
def valid_session_token(settings: Settings):
    timestamp = str(datetime.utcnow().timestamp())
    token = base64.b64encode(f"{settings.API_USERNAME}:{timestamp}".encode()).decode()
    return token

@pytest.fixture
def expired_session_token(settings: Settings):
    timestamp = str((datetime.utcnow() - timedelta(hours=2)).timestamp())
    token = base64.b64encode(f"{settings.API_USERNAME}:{timestamp}".encode()).decode()
    return token

class TestAuthentication:
    def test_login_success(self, test_client, settings):
        response = test_client.post(
            "/admin/login",
            headers={"Authorization": f"Basic {base64.b64encode(f'{settings.API_USERNAME}:{settings.API_PASSWORD}'.encode()).decode()}"}
        )
        assert response.status_code == 200
        assert response.json() == {"name": "admin"}
        assert "session" in response.cookies
        
    def test_login_invalid_credentials(self, test_client, invalid_auth_header):
        response = test_client.post(
            "/admin/login",
            headers={"Authorization": invalid_auth_header}
        )
        assert response.status_code == 401
        assert "session" not in response.cookies
        
    def test_logout_success(self, test_client, valid_session_token):
        # First set the session cookie
        test_client.cookies.set("session", valid_session_token)
        
        response = test_client.post("/admin/logout")
        assert response.status_code == 200
        assert response.json() == {"message": "Successfully logged out"}
        assert "session" not in response.cookies
        
    def test_logout_no_auth(self, test_client):
        response = test_client.post("/admin/logout")
        assert response.status_code == 401
        
    def test_me_with_valid_cookie(self, test_client, valid_session_token):
        test_client.cookies.set("session", valid_session_token)
        response = test_client.get("/admin/me")
        assert response.status_code == 200
        
    def test_me_with_expired_cookie(self, test_client, expired_session_token):
        test_client.cookies.set("session", expired_session_token)
        response = test_client.get("/admin/me")
        assert response.status_code == 401
        
    def test_me_with_basic_auth(self, test_client, valid_auth_header):
        response = test_client.get(
            "/admin/me",
            headers={"Authorization": valid_auth_header}
        )
        assert response.status_code == 200
        
    def test_me_no_auth(self, test_client):
        response = test_client.get("/admin/me")
        assert response.status_code == 401
        
    def test_cookie_precedence_over_basic_auth(self, test_client, valid_session_token, invalid_auth_header):
        # Test that valid cookie works even with invalid basic auth
        test_client.cookies.set("session", valid_session_token)
        response = test_client.get(
            "/admin/me",
            headers={"Authorization": invalid_auth_header}
        )
        assert response.status_code == 200 

class TestRouteForwarding:
    def test_get_routes_success(self, test_client, valid_session_token):
        # Set valid session token
        test_client.cookies.set("session", valid_session_token)
        
        # Create test route configurations
        test_routes = {
            "/api/test1": RouteForwardingConfig(
                target_url="http://test1.example.com",
                rate_limit=100,
                url_rewrite={"":""}
            ),
            "/api/test2": RouteForwardingConfig(
                target_url="http://test2.example.com",
                rate_limit=200,
                url_rewrite={"":""}
            )
        }
        
        # Add routes using the API endpoint
        update_request = UpdateRouteForwardingRequest(routes=test_routes)
        response = test_client.put(
            "/admin/routes",
            json=update_request.dict()
        )
        assert response.status_code == 200
        
        # Get routes and verify
        response = test_client.get("/admin/routes")
        assert response.status_code == 200
        
        # Validate response structure
        data = response.json()
        assert "routes" in data
        
        # Check that the routes match our test configuration
        for path, config in data["routes"].items():
            assert path in test_routes
            assert config["target_url"] == test_routes[path].target_url
            assert config["rate_limit"] == test_routes[path].rate_limit
            assert config["url_rewrite"] == test_routes[path].url_rewrite
            
        # Validate response can be parsed into our Pydantic model
        route_config = RouteForwardingResponse(**data)
        assert isinstance(route_config, RouteForwardingResponse)
        for path, config in route_config.routes.items():
            assert isinstance(config, RouteForwardingConfig)
    
    def test_get_routes_no_auth(self, test_client):
        response = test_client.get("/admin/routes")
        assert response.status_code == 401
    
    def test_get_routes_with_basic_auth(self, test_client, valid_auth_header):
        response = test_client.get(
            "/admin/routes",
            headers={"Authorization": valid_auth_header}
        )
        assert response.status_code == 200
        
    def test_get_routes_with_expired_session(self, test_client, expired_session_token):
        test_client.cookies.set("session", expired_session_token)
        response = test_client.get("/admin/routes")
        assert response.status_code == 401 
