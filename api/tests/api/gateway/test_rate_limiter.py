from fastapi.testclient import TestClient
import pytest
import time
from tests.api.mock_proxy_api import configure_proxy_mock

class TestRateLimiterIntegration:
    def test_rate_limit_exceeded(self, test_client: TestClient, monkeypatch):
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

    def test_unlimited_route(self, test_client: TestClient, monkeypatch):
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

    def test_rate_limit_reset(self, test_client: TestClient, monkeypatch):
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
        retry_after = int(response.headers["Retry-After"])

        # Wait for the rate limit window to reset
        time.sleep(retry_after + 1)

        # Should be able to make requests again
        response = test_client.get("/api/limited/test")
        assert response.status_code == 200
        assert response.content == test_content

    def test_different_paths_separate_limits(self, test_client: TestClient, monkeypatch):
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

    def test_different_clients_separate_limits(self, test_client: TestClient, monkeypatch):
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

    def test_admin_routes_bypass(self, test_client: TestClient, monkeypatch):
        # Configure mock responses for both admin and regular routes
        test_content = b'{"message": "Success"}'
        test_headers = {"content-type": "application/json"}
        responses = {
            "http://localhost:8081/api/limited/test": (200, test_content, test_headers),
            "http://localhost:8081/admin/test": (200, test_content, test_headers)
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
        for _ in range(5):  # More than the limit
            response = test_client.get("/admin/test")
            assert response.status_code == 200
            assert response.content == test_content
