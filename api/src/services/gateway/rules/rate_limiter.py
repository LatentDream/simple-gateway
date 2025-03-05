from logging import Logger
from typing import final, override
from fastapi import Request, Response, HTTPException
from redis.asyncio import Redis
from src.services.gateway.rules.asbtract import Rule, RulePhase
from src.settings import Settings
import time
from fastapi.responses import JSONResponse


@final
class RateLimiter:
    def __init__(self, redis: Redis, requests_per_minute: int = 60, logger: Logger | None = None):
        self.redis = redis
        self.requests_per_minute = requests_per_minute
        self.window = 60  # 1 minute window
        self.logger = logger

    async def is_rate_limited(self, key: str) -> tuple[bool, int | None]:
        """
        Check if the request should be rate limited
        Returns (is_limited, retry_after)
        """
        current = time.time()
        current_ms = int(current * 1000000)  # Convert to microseconds for uniqueness
        window_start = int(current - self.window)

        if self.logger:
            self.logger.debug(f"Rate limit check for key: {key}")
            self.logger.debug(f"Current time: {current}, Window start: {window_start}")

        async with self.redis.pipeline(transaction=True) as pipe:
            # Remove old requests
            await pipe.zremrangebyscore(key, 0, window_start)
            # Add current request with microsecond precision to ensure uniqueness
            await pipe.zadd(key, {f"{current_ms}": current})
            # Get count of all requests in window AFTER adding current request
            await pipe.zcount(key, window_start, '+inf')  # Use '+inf' to count all requests
            # Set key expiration
            await pipe.expire(key, self.window)
            _, _, count, _ = await pipe.execute()

            if self.logger:
                self.logger.debug(f"Request count in window: {count}/{self.requests_per_minute}")

        # Check if the current count exceeds the limit
        if count > self.requests_per_minute:
            retry_after = self.window - (int(current) - window_start)
            if self.logger:
                self.logger.debug(f"Rate limit exceeded. Retry after: {retry_after}s")
            return True, retry_after

        if self.logger:
            self.logger.debug("Request allowed")
        return False, None

async def check_rate_limit(
    request: Request,
    target_url: str,
    rate_limit: int,
    logger: Logger,
    settings: Settings
) -> None | JSONResponse:
    """Check rate limit for the request. Raises HTTPException if rate limited."""
    logger.debug(f"Starting rate limit check for target_url: {target_url}, rate_limit: {rate_limit}")
    
    redis: Redis = request.app.state.redis
    if not redis:
        # If Redis is not available, allow the request but log a warning
        logger.warning("Redis not available, rate limiting disabled")
        return

    logger.debug("Redis connection available")
    rate_limiter = RateLimiter(redis, rate_limit, logger)
    
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
        
        logger.info(f"Rate limit check result - is_limited: {is_limited}, retry_after: {retry_after}")
    
        if is_limited:
            headers = {
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(rate_limit),
                "X-RateLimit-Reset": str(retry_after)
            }
            logger.debug(f"Request rate limited. Headers: {headers}")
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests"},
                headers=headers
            )
    except HTTPException as exc:
        # Convert HTTP exceptions to JSON responses
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=exc.headers
        )
    except Exception as e:
        logger.error(f"Error during rate limiting check: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Rate limiting error"}
        )


@final
class RateLimitRule(Rule):
    """Rate limiting implementation as a rule"""
    def __init__(self):
        super().__init__("rate_limit", RulePhase.BOTH)
        
    @override
    async def pre_process(self, request: Request, settings: Settings, logger: Logger) -> Response | None:
        request_path = request.url.path
        route_config = settings.get_route_config(request_path)
        if not route_config:
            return None
            
        target_url, rate_limit = route_config
        if not rate_limit:
            return None
            
        response = await check_rate_limit(request, target_url, rate_limit, logger, settings)
        return response
        
    @override
    async def post_process(self, request: Request, response: Response, settings: Settings, logger: Logger) -> Response:
        request_path = request.url.path
        route_config = settings.get_route_config(request_path)
        if not route_config or not hasattr(request.app.state, 'redis'):
            return response
            
        _, rate_limit = route_config
        if not rate_limit:
            return response
            
        redis: Redis = request.app.state.redis
        if not redis:
            return response
            
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

