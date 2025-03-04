from contextlib import asynccontextmanager
from logging import Logger
from fastapi import Depends, FastAPI, Request

from src.database.base import close_db, init_db
from src.services.logging.middleware import setup_error_reporting
from src.services.storage.Redis import close_redis, init_redis
from src.services.logging.logging import setup_logging
from src.services.cors.middleware import setup_cors_middleware
from src.services.auth.middleware import setup_auth_middleware, protected_route
from src.services.rate_limiter.middleware import setup_rate_limiter
from src.api.routes.admin import router as admin_router
from .settings import Settings, get_settings

from typing import Any
from fastapi import APIRouter, FastAPI, BackgroundTasks
from fastapi.responses import JSONResponse

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for the FastAPI application. Handles startup and shutdown events.
    """
    settings: Settings = app.state.settings
    logger: Logger = app.state.logger
    
    # --- STARTUP ---
    engine, session, _ = await init_db(settings, logger)
    redis = await init_redis(settings, logger)
    app.state.engine = engine
    app.state.session = session
    app.state.redis = redis
    logger.info("Application startup complete")
    
    yield
    
    # --- SHUTDOWN ---
    logger.info("Shutting down application")
    await close_db()
    logger.info("Database connections closed")
    await close_redis(app.state.redis)
    logger.info("Redis connection closed")


def create_server(settings: Settings) -> FastAPI:
    app = FastAPI(
        title="Your Project Name",
        description="Project description",
        version="0.1.0",
        lifespan=lifespan
    )

    logger = setup_logging(settings)
    logger.info(f"Profile: {settings.PROFILE}") 

    app.state.logger = logger
    app.state.settings = settings
    
    # Setup error reporting before including routes
    setup_error_reporting(app, settings)

    @app.get("/rate/health_check")
    async def health_check(settings: Settings = Depends(get_settings)):
        return {"message": "ok", "profile": settings.PROFILE, "version": settings.VERSION}

    # Include routes
    app.include_router(admin_router)
    
    # Setup middleware
    setup_auth_middleware(app, settings)  # Add authentication middleware
    setup_rate_limiter(app, settings)     # Add rate limiting middleware
    setup_cors_middleware(app, settings)

    return app
