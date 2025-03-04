from logging import Logger
from fastapi import Request
from fastapi.responses import StreamingResponse
import httpx


async def forward_request(request: Request, target_url: str, logger: Logger) -> StreamingResponse:
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

    logger.debug(f"Forwarding request to: {target_path}")
    
    # Get the request body if it exists
    body = await request.body()
    
    # Forward all headers except host
    headers = dict(request.headers)
    headers.pop("host", None)
    
    try:
        # Make the request to the target service
        logger.debug("Making request to target service")
        response = await client.request(
            method=request.method,
            url=target_path,
            headers=headers,
            content=body,
            timeout=30.0
        )
        logger.debug(f"Received response from target service. Status: {response.status_code}, Content-Length: {response.headers.get('content-length')}")

        # Read the entire response content
        content = await response.aread()
        logger.debug(f"Read response content, size: {len(content)} bytes")
        await client.aclose()

        # Create an async generator to stream the buffered content
        async def response_generator():
            logger.debug("Starting to stream buffered response")
            yield content
            logger.debug("Finished streaming buffered response")

        logger.debug("Creating StreamingResponse")
        return StreamingResponse(
            response_generator(),
            status_code=response.status_code,
            headers=dict(response.headers)
        )
    except httpx.RequestError as e:
        await client.aclose()
        logger.error(f"Error forwarding request to {target_path}: {str(e)}")
        raise httpx.RequestError(f"Error forwarding request: {str(e)}") 
