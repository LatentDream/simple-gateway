from redis import asyncio as aioredis
from redis.asyncio.client import Redis
from logging import Logger
from src.settings import Settings
from fastapi import Request


async def init_redis(settings: Settings, logger: Logger) -> Redis | None:
    """Initialize Redis connection and test connectivity."""
    if not settings.REDIS_URL:
        logger.warning("No Redis URL provided, Redis functionality will be disabled")
        return None
        
    try:
        logger.info(f"Connecting to Redis at {settings.REDIS_URL}")
        redis = await aioredis.from_url(
            settings.REDIS_URL,
            socket_connect_timeout=5.0,
            socket_timeout=5.0,
        )
        
        # INFO: This makes sure the connection is established, else, we crash the app at startup
        import asyncio
        try:
            # Execute ping with timeout
            logger.info("Verifying the Redis Connection...")
            response = await asyncio.wait_for(redis.ping(), timeout=5.0)
            if response:
                logger.info("Successfully connected to Redis")
            else:
                logger.warning("Redis connection established but ping returned unexpected response")
        except asyncio.TimeoutError:
            await redis.close()
            logger.error("Redis ping timed out after 5 seconds")
            raise RuntimeError("Redis ping timed out, server may be overloaded or unreachable")
            
        return redis
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {str(e)}")
        raise RuntimeError(f"Could not establish Redis connection: {str(e)}")


async def close_redis(redis: Redis | None) -> None:
    """Close Redis connection if it exists."""
    if redis:
        await redis.close()


async def get_redis(request: Request) -> Redis | None:
    """
    Dependency that provides Redis connection from app state.
    Ex: redis: Redis | None = Depends(get_redis)
    """
    return request.app.state.redis
