from logging import Logger
from fastapi import FastAPI, Request, HTTPException
from redis.asyncio import Redis
from src.settings import Settings
from src.services.proxy.service import forward_request
import time
from typing import Optional

class RateLimiter:
    def __init__(self, redis: Redis, requests_per_minute: int = 60):
        self.redis = redis
        self.requests_per_minute = requests_per_minute
        self.window = 60  # 1 minute window

    async def is_rate_limited(self, key: str) -> tuple[bool, Optional[int]]:
        """
        Check if the request should be rate limited
        Returns (is_limited, retry_after)
        """
        current = time.time()
        current_ms = int(current * 1000000)  # Convert to microseconds for uniqueness
        window_start = int(current - self.window)

        async with self.redis.pipeline(transaction=True) as pipe:
            # Remove old requests
            await pipe.zremrangebyscore(key, 0, window_start)
            # Add current request with microsecond precision to ensure uniqueness
            await pipe.zadd(key, {f"{current_ms}": current})
            # Get count of requests in window
            await pipe.zcount(key, window_start, int(current))
            # Set key expiration
            await pipe.expire(key, self.window)
            _, _, count, _ = await pipe.execute()

        if count > self.requests_per_minute:
            retry_after = self.window - (int(current) - window_start)
            return True, retry_after

        return False, None

async def check_rate_limit(request: Request, target_url: str, rate_limit: int, logger: Logger, settings: Settings) -> None:
    """Check rate limit for the request. Raises HTTPException if rate limited."""
    logger.debug(f"Starting rate limit check for target_url: {target_url}, rate_limit: {rate_limit}")
    
    redis = request.app.state.redis
    if not redis:
        # If Redis is not available, allow the request but log a warning
        logger.warning("Redis not available, rate limiting disabled")
        return

    logger.debug("Redis connection available")
    rate_limiter = RateLimiter(redis, rate_limit)
    
    # Use IP address and path prefix as the rate limit key
    client_ip = request.client.host if request.client else "unknown"
    logger.debug(f"Client IP: {client_ip}")
    
    try:
        path_prefix = next(prefix for prefix in settings.ROUTE_FORWARDING.keys() 
                        if request.url.path.startswith(prefix))
        logger.debug(f"Found path_prefix: {path_prefix}")
    except StopIteration:
        logger.error(f"No matching path prefix found for path: {request.url.path}")
        raise HTTPException(status_code=500, detail="Invalid route configuration")

    key = f"rate_limit:{path_prefix}:{client_ip}"
    logger.debug(f"Generated rate limit key: {key}")

    try:
        is_limited, retry_after = await rate_limiter.is_rate_limited(key)
        
        # Get current request count from Redis
        current = int(time.time())
        window_start = current - rate_limiter.window
        request_count = await redis.zcount(key, window_start, current)
        
        logger.info(f"Rate limit status for {client_ip}: {request_count}/{rate_limit} requests per minute")
        logger.debug(f"Rate limit check result - is_limited: {is_limited}, retry_after: {retry_after}")
    
        if is_limited:
            headers = {
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(rate_limit),
                "X-RateLimit-Reset": str(retry_after)
            }
            logger.debug(f"Request rate limited. Headers: {headers}")
            raise HTTPException(
                status_code=429,
                detail="Too many requests",
                headers=headers
            )
    except Exception as e:
        logger.error(f"Error during rate limiting check: {str(e)}")
        raise HTTPException(status_code=500, detail="Rate limiting error")

def setup_gateway(app: FastAPI, settings: Settings, logger: Logger):
    """Setup gateway middleware with rate limiting for configured routes"""
    
    @app.middleware("http")
    async def rate_limit_middleware(request: Request, call_next):
        # Skip rate limiting for admin routes
        if request.url.path.startswith("/admin"):
            return await call_next(request)

        # Get route configuration
        route_config = settings.get_route_config(request.url.path)
        if not route_config:
            # No route configuration found, return 404
            logger.error("No Config found")
            raise HTTPException(status_code=404, detail="Route not found")

        logger.debug(f"route_config found: {route_config}")
        target_url, rate_limit = route_config

        # Only check rate limit if a limit is set
        if rate_limit:
            await check_rate_limit(request, target_url, rate_limit, logger, settings)

        # Forward the request to the target service
        return await forward_request(request, target_url, logger)
