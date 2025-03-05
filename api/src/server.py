from contextlib import asynccontextmanager
from logging import Logger
from fastapi import Depends, FastAPI, Request

from src.services.auth.middleware import setup_auth_middleware
from src.services.logging.middleware import setup_error_reporting
from src.services.request_tracking.middleware import setup_request_tracking
from src.services.storage.Redis import close_redis, init_redis
from src.services.logging.logging import setup_logging
from src.services.cors.middleware import setup_cors_middleware
from src.services.rate_limiter.middleware import setup_gateway
from src.api.routes.admin import router as admin_router
from .settings import Settings, get_settings

from typing import Any
from fastapi import APIRouter, FastAPI
from fastapi.responses import JSONResponse

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for the FastAPI application. Handles startup and shutdown events.
    """
    settings: Settings = app.state.settings
    logger: Logger = app.state.logger
    
    # --- STARTUP ---
    redis = await init_redis(settings, logger)
    app.state.redis = redis
    logger.info("Application startup complete")
    
    yield
    
    # --- SHUTDOWN ---
    logger.info("Shutting down application")
    await close_redis(app.state.redis)
    logger.info("Redis connection closed")


def create_server(settings: Settings) -> FastAPI:
    app = FastAPI(
        title="Rate Limiter Proxy",
        description="A proxy service that provides rate limiting for configured routes",
        version="0.1.0",
        lifespan=lifespan
    )

    logger = setup_logging(settings)
    logger.info(f"Profile: {settings.PROFILE}") 

    app.state.logger = logger
    app.state.settings = settings
    
    # Setup error reporting before including routes
    setup_error_reporting(app, settings)

    # Adming route
    app.include_router(admin_router)

    # Gateway with rate limiting
    setup_gateway(app, settings, logger)
    
    # Setup middleware
    setup_request_tracking(app, settings, logger)
    setup_auth_middleware(app, settings, logger)
    setup_cors_middleware(app, settings)

    return app
