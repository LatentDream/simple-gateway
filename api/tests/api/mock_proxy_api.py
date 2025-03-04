from typing import Any
import pytest
from fastapi import Request
from pytest import MonkeyPatch
import httpx
from src.services.proxy.service import forward_request
import logging

class MockStreamResponse:
    def __init__(self, status_code: int, content: bytes, headers: dict[Any, Any] | None = None):
        self.status_code = status_code
        self._content = content
        self.headers = headers or {}

    async def aread(self):
        return self._content

class MockAsyncClient:
    def __init__(self, *args, **kwargs):
        self.responses = {}
        self.last_request = None
        
    async def aclose(self):
        pass
        
    async def request(
        self,
        method: str,
        url: str,
        headers: dict[Any, Any] | None = None,
        content: bytes | None = None,
        timeout: float | None = None
    ):
        self.last_request = {
            'method': method,
            'url': url,
            'headers': headers,
            'content': content
        }
        
        if url in self.responses:
            return self.responses[url]
        
        # Default response if no mock configured
        return MockStreamResponse(200, b"Default response", {"content-type": "text/plain"})

def configure_proxy_mock(monkeypatch: MonkeyPatch, responses: dict[Any, Any] | None = None):
    """Configure mock responses for the proxy service
    
    Args:
        monkeypatch: pytest MonkeyPatch fixture
        responses: dict mapping URLs to (status_code, content, headers) tuples
    """
    class ConfiguredMockAsyncClient(MockAsyncClient):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            if responses:
                self.responses = {
                    url: MockStreamResponse(status, content, headers)
                    for url, (status, content, headers) in responses.items()
                }
    
    monkeypatch.setattr(httpx, "AsyncClient", ConfiguredMockAsyncClient)

@pytest.fixture
def mock_logger():
    return logging.getLogger("test")

async def test_forward_request_success(monkeypatch: MonkeyPatch, mock_logger):
    # Configure mock responses
    test_content = b"Hello, World!"
    test_headers = {"content-type": "text/plain", "x-test": "value"}
    responses = {
        "http://target/test": (200, test_content, test_headers)
    }
    
    configure_proxy_mock(monkeypatch, responses)
    
    # Create mock request
    mock_request = Request(
        scope={
            "type": "http",
            "method": "GET",
            "path": "/test",
            "headers": [(b"host", b"example.com")],
            "query_string": b"",
        }
    )
    
    # Test the proxy
    response = await forward_request(mock_request, "http://target", mock_logger)
    
    assert response.status_code == 200
    content = [chunk async for chunk in response.body_iterator]
    assert b"".join(content) == test_content
    assert response.headers["content-type"] == "text/plain"
    assert response.headers["x-test"] == "value"

async def test_forward_request_error(monkeypatch: MonkeyPatch, mock_logger):
    # Configure mock to raise an error
    class ErrorMockAsyncClient(MockAsyncClient):
        async def request(self, *args, **kwargs):
            raise httpx.RequestError("Connection error")
    
    monkeypatch.setattr(httpx, "AsyncClient", ErrorMockAsyncClient)
    
    # Create mock request
    mock_request = Request(
        scope={
            "type": "http",
            "method": "GET",
            "path": "/test",
            "headers": [(b"host", b"example.com")],
            "query_string": b"",
        }
    )
    
    # Test error handling
    with pytest.raises(httpx.RequestError) as exc_info:
        await forward_request(mock_request, "http://target", mock_logger)
    
    assert "Connection error" in str(exc_info.value)

async def test_forward_request_with_query_params(monkeypatch: MonkeyPatch, mock_logger):
    # Configure mock responses
    test_content = b"Query params test"
    responses = {
        "http://target/test?param=value": (200, test_content, {"content-type": "text/plain"})
    }
    
    configure_proxy_mock(monkeypatch, responses)
    
    # Create mock request with query params
    mock_request = Request(
        scope={
            "type": "http",
            "method": "GET",
            "path": "/test",
            "headers": [(b"host", b"example.com")],
            "query_string": b"param=value",
        }
    )
    
    # Test the proxy
    response = await forward_request(mock_request, "http://target", mock_logger)
    
    assert response.status_code == 200
    content = [chunk async for chunk in response.body_iterator]
    assert b"".join(content) == test_content
