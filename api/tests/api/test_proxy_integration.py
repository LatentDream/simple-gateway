import pytest
from fastapi.testclient import TestClient
from src.main import app
from tests.api.mock_proxy_api import configure_proxy_mock

@pytest.fixture
def client():
    return TestClient(app)

class TestProxyIntegration:
    def test_proxy_get_request_success(self, client, monkeypatch):
        # Configure mock responses for the proxy
        test_content = b'{"message": "Success from service1"}'
        test_headers = {"content-type": "application/json"}
        responses = {
            "http://localhost:8081/api/service1/users": (200, test_content, test_headers)
        }
        
        configure_proxy_mock(monkeypatch, responses)
        
        # Make request to proxy endpoint
        response = client.get("/api/service1/users")
        
        # Verify response
        assert response.status_code == 200
        assert response.content == test_content
        assert response.headers["content-type"] == "application/json"
    
    def test_proxy_post_request_with_body(self, client, monkeypatch):
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
        response = client.post(
            "/api/service1/users",
            json=request_body
        )
        
        # Verify response
        assert response.status_code == 201
        assert response.content == test_content
        assert response.headers["content-type"] == "application/json"
    
    def test_proxy_with_query_params(self, client, monkeypatch):
        # Configure mock responses
        test_content = b'{"users": [{"id": 1, "name": "test"}]}'
        test_headers = {"content-type": "application/json"}
        responses = {
            "http://localhost:8081/api/service1/users?page=1&limit=10": (200, test_content, test_headers)
        }
        
        configure_proxy_mock(monkeypatch, responses)
        
        # Make request with query parameters
        response = client.get("/api/service1/users?page=1&limit=10")
        
        # Verify response
        assert response.status_code == 200
        assert response.content == test_content
        assert response.headers["content-type"] == "application/json"
    
    def test_proxy_with_custom_headers(self, client, monkeypatch):
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
        response = client.get(
            "/api/service1/protected",
            headers=custom_headers
        )
        
        # Verify response
        assert response.status_code == 200
        assert response.content == test_content
        assert response.headers["content-type"] == "application/json"
    
    def test_proxy_service_error(self, client, monkeypatch):
        # Configure mock responses for error case
        test_content = b'{"error": "Internal Server Error"}'
        test_headers = {"content-type": "application/json"}
        responses = {
            "http://localhost:8081/api/service1/error": (500, test_content, test_headers)
        }
        
        configure_proxy_mock(monkeypatch, responses)
        
        # Make request to endpoint that will return error
        response = client.get("/api/service1/error")
        
        # Verify error response is forwarded correctly
        assert response.status_code == 500
        assert response.content == test_content
        assert response.headers["content-type"] == "application/json"
    
    def test_proxy_service_not_found(self, client, monkeypatch):
        # Configure mock responses for 404 case
        test_content = b'{"error": "Resource not found"}'
        test_headers = {"content-type": "application/json"}
        responses = {
            "http://localhost:8081/api/service1/nonexistent": (404, test_content, test_headers)
        }
        
        configure_proxy_mock(monkeypatch, responses)
        
        # Make request to nonexistent endpoint
        response = client.get("/api/service1/nonexistent")
        
        # Verify 404 response is forwarded correctly
        assert response.status_code == 404
        assert response.content == test_content
        assert response.headers["content-type"] == "application/json" 
