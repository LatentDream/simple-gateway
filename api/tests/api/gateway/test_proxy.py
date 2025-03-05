from fastapi.testclient import TestClient
from tests.api.mock_proxy_api import configure_proxy_mock
import pytest
import base64
from datetime import datetime
from src.types.forwarding_rules import UpdateRouteForwardingRequest, RouteForwardingConfig


@pytest.fixture
def valid_session_token(settings):
    timestamp = str(datetime.utcnow().timestamp())
    token = base64.b64encode(f"{settings.API_USERNAME}:{timestamp}".encode()).decode()
    return token

@pytest.fixture
def setup_routes(test_client, valid_session_token):
    # Set valid session token
    test_client.cookies.set("session", valid_session_token)
    
    # Create test route configurations
    test_routes = {
        "/api/service1": RouteForwardingConfig(
            target_url="http://localhost:8081",  # Remove /api/service1 from here
            rate_limit=1000,
            url_rewrite={"":""}
        )
    }
    
    # Add routes using the admin API
    update_request = UpdateRouteForwardingRequest(routes=test_routes)
    response = test_client.put(
        "/admin/routes",
        json=update_request.dict()
    )
    assert response.status_code == 200
    
    # Verify routes were set up correctly
    response = test_client.get("/admin/routes")
    assert response.status_code == 200
    assert "routes" in response.json()
    return test_routes


class TestProxyIntegration:
    @pytest.fixture(autouse=True)
    def _setup_routes(self, setup_routes):
        # This fixture will automatically run before each test in this class
        pass

    def test_proxy_get_request_success(self, test_client: TestClient, monkeypatch):
        # Configure mock responses for the proxy
        test_content = b'{"message": "Success from service1"}'
        test_headers = {"content-type": "application/json"}
        responses = {
            "http://localhost:8081/api/service1/users": (200, test_content, test_headers)
        }
        
        configure_proxy_mock(monkeypatch, responses)
        
        # Make request to proxy endpoint
        response = test_client.get("/api/service1/users")
        
        # Verify response
        assert response.status_code == 200
        assert response.content == test_content
        assert response.headers["content-type"] == "application/json"
    
    def test_proxy_post_request_with_body(self, test_client: TestClient, monkeypatch):
        # Configure mock responses
        test_content = b'{"id": 1, "status": "created"}'
        test_headers = {"content-type": "application/json"}
        responses = {
            "http://localhost:8081/api/service1/users": (201, test_content, test_headers)
        }
        
        configure_proxy_mock(monkeypatch, responses)
        
        # Test data
        request_body = {"name": "test user", "email": "test@example.com"}
        
        # Make POST request to proxy endpoint
        response = test_client.post(
            "/api/service1/users",
            json=request_body
        )
        
        # Verify response
        assert response.status_code == 201
        assert response.content == test_content
        assert response.headers["content-type"] == "application/json"
    
    def test_proxy_with_query_params(self, test_client: TestClient, monkeypatch):
        # Configure mock responses
        test_content = b'{"users": [{"id": 1, "name": "test"}]}'
        test_headers = {"content-type": "application/json"}
        responses = {
            "http://localhost:8081/api/service1/users?page=1&limit=10": (200, test_content, test_headers)
        }
        
        configure_proxy_mock(monkeypatch, responses)
        
        # Make request with query parameters
        response = test_client.get("/api/service1/users?page=1&limit=10")
        
        # Verify response
        assert response.status_code == 200
        assert response.content == test_content
        assert response.headers["content-type"] == "application/json"
    
    def test_proxy_with_custom_headers(self, test_client: TestClient, monkeypatch):
        # Configure mock responses
        test_content = b'{"data": "authorized content"}'
        test_headers = {"content-type": "application/json"}
        responses = {
            "http://localhost:8081/api/service1/protected": (200, test_content, test_headers)
        }
        
        configure_proxy_mock(monkeypatch, responses)
        
        # Make request with custom headers
        custom_headers = {
            "Authorization": "Bearer test-token",
            "X-Custom-Header": "test-value"
        }
        response = test_client.get(
            "/api/service1/protected",
            headers=custom_headers
        )
        
        # Verify response
        assert response.status_code == 200
        assert response.content == test_content
        assert response.headers["content-type"] == "application/json"
    
    def test_proxy_service_error(self, test_client: TestClient, monkeypatch):
        # Configure mock responses for error case
        test_content = b'{"error": "Internal Server Error"}'
        test_headers = {"content-type": "application/json"}
        responses = {
            "http://localhost:8081/api/service1/error": (500, test_content, test_headers)
        }
        
        configure_proxy_mock(monkeypatch, responses)
        
        # Make request to endpoint that will return error
        response = test_client.get("/api/service1/error")
        
        # Verify error response is forwarded correctly
        assert response.status_code == 500
        assert response.content == test_content
        assert response.headers["content-type"] == "application/json"
    
    def test_proxy_service_not_found(self, test_client: TestClient, monkeypatch):
        # Configure mock responses for 404 case
        test_content = b'{"error": "Resource not found"}'
        test_headers = {"content-type": "application/json"}
        responses = {
            "http://localhost:8081/api/service1/nonexistent": (404, test_content, test_headers)
        }
        
        configure_proxy_mock(monkeypatch, responses)
        
        # Make request to nonexistent endpoint
        response = test_client.get("/api/service1/nonexistent")
        
        # Verify 404 response is forwarded correctly
        assert response.status_code == 404
        assert response.content == test_content
        assert response.headers["content-type"] == "application/json" 
