from fastapi.testclient import TestClient
import pytest
import time
from tests.api.mock_proxy_api import configure_proxy_mock
import base64

@pytest.fixture
def valid_auth_header(settings):
    credentials = f"{settings.API_USERNAME}:{settings.API_PASSWORD}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"

@pytest.fixture
def test_route_config():
    """Define test routes with rate limits"""
    return {
        "/api/limited": {
            "target_url": "http://localhost:8081",
            "rate_limit": 2,
            "url_rewrite": {}
        },
        "/api/unlimited": {
            "target_url": "http://localhost:8081",
            "rate_limit": 0,
            "url_rewrite": {}
        },
        "/api/service1": {
            "target_url": "http://localhost:8081",
            "rate_limit": 60,
            "url_rewrite": {}
        },
        "/api/service2": {
            "target_url": "http://localhost:8082",
            "rate_limit": 30,
            "url_rewrite": {}
        }
    }

@pytest.fixture(autouse=True)
def setup_test_routes(test_client, valid_auth_header, test_route_config):
    """Setup test routes and clear Redis before each test"""
    # First clear Redis cache
    response = test_client.post(
        "/admin/clear",
        headers={"Authorization": valid_auth_header}
    )
    assert response.status_code == 200

    # Then update route configuration
    response = test_client.put(
        "/admin/routes",
        headers={"Authorization": valid_auth_header},
        json={"routes": test_route_config}
    )
    assert response.status_code == 200
    
    # Verify routes were properly configured
    response = test_client.get(
        "/admin/routes",
        headers={"Authorization": valid_auth_header}
    )
    assert response.status_code == 200
    routes_data = response.json()
    assert "routes" in routes_data
    
    # Compare configurations ignoring the id field
    for path, config in routes_data["routes"].items():
        assert path in test_route_config
        expected_config = test_route_config[path]
        assert config["target_url"] == expected_config["target_url"]
        assert config["rate_limit"] == expected_config["rate_limit"]
        assert config["url_rewrite"] == expected_config["url_rewrite"]


class TestRateLimiterIntegration:
    def test_rate_limit_exceeded(self, test_client: TestClient, monkeypatch, settings):
        # Wait for any previous test's window to expire
        time.sleep(settings.RATE_LIMIT_WINDOW_SECONDS)
        
        # Configure mock responses for the proxy
        test_content = b'{"message": "Success"}'
        test_headers = {"content-type": "application/json"}
        responses = {
            "http://localhost:8081/api/limited/test": (200, test_content, test_headers)
        }
        configure_proxy_mock(monkeypatch, responses)

        # Make requests up to the limit
        for _ in range(2):
            response = test_client.get("/api/limited/test")
            assert response.status_code == 200
            assert response.content == test_content

        # This request should be rate limited
        response = test_client.get("/api/limited/test")
        assert response.status_code == 429
        assert "Retry-After" in response.headers
        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Reset" in response.headers

    def test_unlimited_route(self, test_client: TestClient, monkeypatch, settings):
        # Wait for any previous test's window to expire
        time.sleep(settings.RATE_LIMIT_WINDOW_SECONDS)
        
        # Configure mock responses for the proxy
        test_content = b'{"message": "Success"}'
        test_headers = {"content-type": "application/json"}
        responses = {
            "http://localhost:8081/api/unlimited/test": (200, test_content, test_headers)
        }
        configure_proxy_mock(monkeypatch, responses)

        # Make multiple requests to unlimited route
        for _ in range(5):  # More than the limit of other routes
            response = test_client.get("/api/unlimited/test")
            assert response.status_code == 200
            assert response.content == test_content

    def test_rate_limit_reset(self, test_client: TestClient, monkeypatch, settings, valid_auth_header):
        # Wait for any previous test's window to expire
        time.sleep(settings.RATE_LIMIT_WINDOW_SECONDS)
        
        # Configure mock responses for the proxy
        test_content = b'{"message": "Success"}'
        test_headers = {"content-type": "application/json"}
        responses = {
            "http://localhost:8081/api/limited/test": (200, test_content, test_headers)
        }
        configure_proxy_mock(monkeypatch, responses)

        # Make requests up to the limit
        for _ in range(2):
            response = test_client.get("/api/limited/test")
            assert response.status_code == 200

        # This request should be rate limited
        response = test_client.get("/api/limited/test")
        assert response.status_code == 429

        # Wait for the window to reset
        time.sleep(settings.RATE_LIMIT_WINDOW_SECONDS)  # Use configured window duration

        # Clear Redis cache to ensure clean state
        response = test_client.post(
            "/admin/clear",
            headers={"Authorization": valid_auth_header}
        )
        assert response.status_code == 200

        # Should be able to make requests again
        response = test_client.get("/api/limited/test")
        assert response.status_code == 200
        assert response.content == test_content

    def test_different_paths_separate_limits(self, test_client: TestClient, monkeypatch, settings):
        # Wait for any previous test's window to expire
        time.sleep(settings.RATE_LIMIT_WINDOW_SECONDS)
        
        # Configure mock responses for the proxy
        test_content = b'{"message": "Success"}'
        test_headers = {"content-type": "application/json"}
        responses = {
            "http://localhost:8081/api/limited/path1": (200, test_content, test_headers),
            "http://localhost:8081/api/limited/path2": (200, test_content, test_headers)
        }
        configure_proxy_mock(monkeypatch, responses)

        # Make requests up to the limit for first path
        for _ in range(2):
            response = test_client.get("/api/limited/path1")
            assert response.status_code == 200

        # This request to first path should be rate limited
        response = test_client.get("/api/limited/path1")
        assert response.status_code == 429

        # But should still be able to make requests to second path
        for _ in range(2):
            response = test_client.get("/api/limited/path2")
            assert response.status_code == 200

    def test_different_clients_separate_limits(self, test_client: TestClient, monkeypatch, settings):
        # Wait for any previous test's window to expire
        time.sleep(settings.RATE_LIMIT_WINDOW_SECONDS)
        
        # Configure mock responses for the proxy
        test_content = b'{"message": "Success"}'
        test_headers = {"content-type": "application/json"}
        responses = {
            "http://localhost:8081/api/limited/test": (200, test_content, test_headers)
        }
        configure_proxy_mock(monkeypatch, responses)

        # Make requests up to the limit with first client IP
        headers1 = {"X-Forwarded-For": "1.1.1.1"}
        for _ in range(2):
            response = test_client.get("/api/limited/test", headers=headers1)
            assert response.status_code == 200

        # This request from first client should be rate limited
        response = test_client.get("/api/limited/test", headers=headers1)
        assert response.status_code == 429

        # But second client should still be able to make requests
        headers2 = {"X-Forwarded-For": "2.2.2.2"}
        for _ in range(2):
            response = test_client.get("/api/limited/test", headers=headers2)
            assert response.status_code == 200

    def test_admin_routes_bypass(self, test_client: TestClient, monkeypatch, settings):
        # Wait for any previous test's window to expire
        time.sleep(settings.RATE_LIMIT_WINDOW_SECONDS)
        
        # Configure mock responses for both admin and regular routes
        test_content = b'{"message": "Success"}'
        test_headers = {"content-type": "application/json"}
        responses = {
            "http://localhost:8081/api/limited/test": (200, test_content, test_headers),
        }
        configure_proxy_mock(monkeypatch, responses)

        # Make requests up to the limit for regular route
        for _ in range(2):
            response = test_client.get("/api/limited/test")
            assert response.status_code == 200

        # This request should be rate limited
        response = test_client.get("/api/limited/test")
        assert response.status_code == 429

        # But admin routes should never be rate limited
        for _ in range(5):
            response = test_client.get("/admin/metrics")
            assert response.status_code == 401
