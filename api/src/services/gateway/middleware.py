from logging import Logger
from fastapi import FastAPI, Request, HTTPException
from src.services.rate_limiter.middleware import check_rate_limit
from src.settings import Settings
from src.services.proxy.service import forward_request
from src.services.request_tracking.middleware import setup_request_tracking
import time


def setup_gateway(app: FastAPI, settings: Settings, logger: Logger):
    """Setup gateway middleware with rate limiting and request tracking for configured routes"""
    
    @app.middleware("http")
    async def rate_limit_middleware(request: Request, call_next):

        request_path = request.url.path

        if request_path.startswith("/admin"):
            return await call_next(request)

        # Get route configuration
        route_config = settings.get_route_config(request_path)
        if not route_config:
            logger.error(f"No Config found for route {request_path}")
            raise HTTPException(status_code=404, detail="Route not found")

        target_url, rate_limit = route_config

        # Only check rate limit if a limit is set
        if rate_limit:
            response = await check_rate_limit(request, target_url, rate_limit, logger, settings)
            if response:
                return response

        # Forward the request to the target service
        response = await forward_request(request, target_url, logger)
        
        if rate_limit and hasattr(request.app.state, 'redis'):
            if redis := request.app.state.redis:
                try:
                    client_ip = request.client.host if request.client else "unknown"
                    path_prefix = next(prefix for prefix in settings.ROUTE_FORWARDING.keys() 
                                    if request_path.startswith(prefix))
                    key = f"rate_limit:{path_prefix}:{client_ip}"
                    
                    # Get current request count
                    current = int(time.time())
                    window_start = current - 60
                    request_count: int = await redis.zcount(key, window_start, current)
                    remaining = max(0, rate_limit - request_count)
                    # Add headers to response
                    response.headers["X-RateLimit-Limit"] = str(rate_limit)
                    response.headers["X-RateLimit-Remaining"] = str(remaining)
                    response.headers["X-RateLimit-Reset"] = str(60 - (current % 60))
                except Exception as e:
                    logger.error(f"Error adding rate limit headers: {str(e)}")
                    
        return response
