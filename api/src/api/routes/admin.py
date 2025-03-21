from logging import Logger
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from redis.asyncio import Redis
from src.services.auth.middleware import protected_route, verify_basic_auth
from src.services.gateway.rules import url_rewrite
from src.services.logging.logging import get_logger
from src.services.request_tracking.middleware import RequestTracker
from src.services.storage.Redis import get_redis
from src.settings import Settings, get_settings
from src.database.base import get_db
from src.database.models import GatewayConfig
import base64
from datetime import datetime
from src.types.forwarding_rules import RouteForwardingConfig, RouteForwardingResponse, UpdateRouteForwardingRequest
from src.types.request_tracking import RequestTrackingResponse
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/admin")
security = HTTPBasic()


@router.get("/healthcheck")
async def health_check(settings: Settings = Depends(get_settings)):
    return {
        "status": "ok",
        "profile": settings.PROFILE,
        "version": settings.VERSION,
    }

@router.post("/login")
async def login(
    response: Response,
    credentials: HTTPBasicCredentials = Depends(security),
    settings = Depends(get_settings),
    logger = Depends(get_logger)
):
    try:
        # Create auth header for verification
        auth_str = f"{credentials.username}:{credentials.password}"
        auth_bytes = base64.b64encode(auth_str.encode()).decode()
        auth_header = f"Basic {auth_bytes}"
        
        if not verify_basic_auth(auth_header, settings, logger):
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid credentials"}
            )

        
        # Create session token
        timestamp = str(datetime.utcnow().timestamp())
        token = base64.b64encode(f"{credentials.username}:{timestamp}".encode()).decode()
        
        # Set cookie
        response.set_cookie(
            key="session",
            value=token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=3600  # 1 hour
        )
        return {
            "name": "admin"
        }
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/logout")
@protected_route()
async def logout(
    response: Response,
    logger = Depends(get_logger)
):
    try:
        response.delete_cookie(key="session")
        return {"message": "Successfully logged out"}
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/me")
@protected_route()
async def me(
    logger = Depends(get_logger)
):
    try:
        return {
            "name": "admin"
        }
    except AttributeError:
        raise HTTPException(status_code=401, detail="Not authenticated")

@router.get("/routes", response_model=RouteForwardingResponse)
@protected_route()
async def get_routes(
    db: AsyncSession = Depends(get_db),
    logger = Depends(get_logger)
):
    """Get the current route forwarding configuration from database"""
    try:
        configs = await GatewayConfig.get_all_active_configs(db)
        routes = {
            config.route_prefix: RouteForwardingConfig(
                id=config.id,
                target_url=config.target_url,
                rate_limit=config.rate_limit,
                url_rewrite=config.url_rewrite,
            )
            for config in configs
        }
        return RouteForwardingResponse(routes=routes)
    except Exception as e:
        logger.error(f"Error getting route configuration: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/clear")
@protected_route()
async def clear_cache(
    settings: Settings = Depends(get_settings),
    logger = Depends(get_logger),
    redis: Redis | None = Depends(get_redis)
):
    """Clear the Redis database"""
    try:
        if redis:
            await redis.flushdb()
            logger.info("Successfully cleared all keys from Redis database")
            return {"status": "success", "message": "Redis database flushed"}
        else:
            logger.warning("Redis not available, unable to clear cache")
            raise HTTPException(
                status_code=503,
                detail="Service Unavailable: Redis connection not available"
            )
    except Exception as e:
        logger.error(f"Error clearing Redis database: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/metrics", response_model=RequestTrackingResponse)
@protected_route()
async def get_metrics(logger: Logger = Depends(get_logger)):
    logger.debug("Handling GET request to /admin/metrics endpoint")
    try:
        tracker = RequestTracker(logger)
        metrics = await tracker.get_metrics()
        return metrics
    except HTTPException as he:
        logger.error(f"HTTP error retrieving metrics: {str(he)}", exc_info=True)
        raise
    except Exception as e:
        logger.error(f"Unexpected error retrieving metrics: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve metrics: {str(e)}")

@router.put("/routes")
@protected_route()
async def update_routes(
    request: UpdateRouteForwardingRequest,
    db: AsyncSession = Depends(get_db),
    logger: Logger = Depends(get_logger),
    redis: Redis | None = Depends(get_redis)
):
    """Update the route forwarding configuration in database"""
    try:
        # Get existing configs to track what needs to be deleted
        existing_configs = await GatewayConfig.get_all_active_configs(db)
        existing_prefixes = {config.route_prefix for config in existing_configs}
        new_prefixes = set(request.routes.keys())

        # Delete configs that are no longer present
        for prefix in existing_prefixes - new_prefixes:
            await GatewayConfig.delete_config(db, prefix)

        # Update or create new configs
        for prefix, config in request.routes.items():
            # Check if config exists
            existing_config = await GatewayConfig.get_config_by_prefix(db, prefix)
            
            if existing_config:
                # Update existing config
                await GatewayConfig.update_config(
                    db,
                    prefix,
                    target_url=config.target_url,
                    rate_limit=config.rate_limit,
                    url_rewrite=config.url_rewrite
                )
            else:
                # Create new config
                await GatewayConfig.create_config(
                    db,
                    route_prefix=prefix,
                    target_url=config.target_url,
                    rate_limit=config.rate_limit,
                    url_rewrite=config.url_rewrite
                )

        # Clear rate limiting cache if Redis is available
        if redis:
            # Clear only rate limit keys
            async for key in redis.scan_iter(match="rate_limit:*"):
                await redis.delete(key)
            logger.info("Cleared rate limiting cache after route update")

        # Return the updated configuration
        return await get_routes(db, logger)
    except Exception as e:
        logger.error(f"Error updating route configuration: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/routes/{config_id}")
@protected_route()
async def delete_route(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    logger: Logger = Depends(get_logger),
    redis: Redis | None = Depends(get_redis)
):
    """Delete a route configuration from database"""
    try:
        # Get the config first to get the route prefix for cache clearing
        config = await GatewayConfig.get_config_by_id(db, config_id)
        if not config:
            raise HTTPException(status_code=404, detail=f"Route with ID {config_id} not found")

        # Delete the route configuration
        config.is_active = False
        await db.commit()

        # Clear rate limiting cache for this route if Redis is available
        if redis:
            async for key in redis.scan_iter(match=f"rate_limit:{config.route_prefix}*"):
                await redis.delete(key)
            logger.info(f"Cleared rate limiting cache for route {config.route_prefix}")

        return {"status": "success", "message": f"Route {config.route_prefix} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting route configuration: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
