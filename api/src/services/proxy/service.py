from fastapi import Request
from fastapi.responses import StreamingResponse
import httpx
from typing import Any, Dict
import logging

logger = logging.getLogger(__name__)

async def forward_request(request: Request, target_url: str) -> StreamingResponse:
    """
    Forward the incoming request to the target URL while preserving headers and method
    """
    client = httpx.AsyncClient(follow_redirects=True)
    
    # Build the target URL
    path = request.url.path
    query = str(request.url.query)
    target_path = f"{target_url}{path}"
    if query:
        target_path = f"{target_path}?{query}"

    # Get the request body if it exists
    body = await request.body()
    
    # Forward all headers except host
    headers = dict(request.headers)
    headers.pop("host", None)
    
    try:
        # Make the request to the target service
        response = await client.request(
            method=request.method,
            url=target_path,
            headers=headers,
            content=body,
            timeout=30.0
        )

        # Create a streaming response with the same status code and headers
        return StreamingResponse(
            response.aiter_raw(),
            status_code=response.status_code,
            headers=dict(response.headers)
        )
    except httpx.RequestError as e:
        logger.error(f"Error forwarding request to {target_path}: {str(e)}")
        raise httpx.RequestError(f"Error forwarding request: {str(e)}")
    finally:
        await client.aclose() 