from fastapi import FastAPI, Request, HTTPException, Depends, Security
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.routing import APIRoute
import secrets
import base64
from datetime import datetime
from src.settings import Settings, get_settings
from functools import wraps
import logging
from starlette.routing import Match
from typing import Optional

logger = logging.getLogger(__name__)

security = HTTPBasic()

def protected_route():
    """Decorator to mark routes as protected (requiring authentication)."""
    def decorator(func):
        setattr(func, "_protected", True)
        return func
    return decorator

def is_protected_route(route_handler) -> bool:
    """Check if a route is protected."""
    # Check if the route handler has the _protected attribute
    is_protected = hasattr(route_handler, "_protected") and getattr(route_handler, "_protected") is True
    
    # For route handlers wrapped in dependencies, we need to check the original function
    if hasattr(route_handler, "__wrapped__"):
        is_protected = is_protected or (
            hasattr(route_handler.__wrapped__, "_protected") and 
            getattr(route_handler.__wrapped__, "_protected") is True
        )
    
    return is_protected

def verify_session_token(token: str, settings: Settings) -> bool:
    """Verify the session token."""
    try:
        decoded = base64.b64decode(token).decode("utf-8")
        username, timestamp = decoded.split(":", 1)
        
        # Verify username
        is_correct_username = secrets.compare_digest(
            username.encode("utf8"),
            settings.API_USERNAME.encode("utf8")
        )
        
        # Verify token age (1 hour)
        token_time = float(timestamp)
        current_time = datetime.utcnow().timestamp()
        is_token_valid = (current_time - token_time) < 3600
        
        logger.debug(f"Session token verification - Username valid: {is_correct_username}, Token valid: {is_token_valid}")
        return is_correct_username and is_token_valid
    except Exception as e:
        logger.error(f"Error verifying session token: {str(e)}")
        return False

def verify_basic_auth(auth_header: str, settings: Settings) -> bool:
    """Verify Basic Auth credentials."""
    try:
        auth_type, credentials = auth_header.split(" ", 1)
        if auth_type.lower() != "basic":
            logger.debug("Invalid auth type, expected 'Basic'")
            return False
            
        decoded = base64.b64decode(credentials).decode("utf-8")
        username, password = decoded.split(":", 1)
        
        is_correct_username = secrets.compare_digest(
            username.encode("utf8"),
            settings.API_USERNAME.encode("utf8")
        )
        is_correct_password = secrets.compare_digest(
            password.encode("utf8"),
            settings.API_PASSWORD.encode("utf8")
        )
        
        logger.debug(f"Basic auth verification - Username valid: {is_correct_username}, Password valid: {is_correct_password}")
        return is_correct_username and is_correct_password
    except Exception as e:
        logger.error(f"Error verifying basic auth: {str(e)}")
        return False

async def verify_auth(
    request: Request,
    settings: Settings = Depends(get_settings)
) -> bool:
    """Verify authentication using either cookie or basic auth."""
    # First try cookie authentication
    session_cookie = request.cookies.get("session")
    if session_cookie and verify_session_token(session_cookie, settings):
        return True

    # Then try Basic Auth
    auth_header = request.headers.get("Authorization")
    if auth_header and verify_basic_auth(auth_header, settings):
        return True

    raise HTTPException(
        status_code=401,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Basic"},
    )

def setup_auth_middleware(app: FastAPI, settings: Settings):
    """Setup authentication middleware for the application."""
    @app.middleware("http")
    async def auth_middleware(request: Request, call_next):
        logger.debug(f"Processing request to {request.url.path}")
        
        # Always allow access to docs
        if (request.url.path == "/docs" or 
            request.url.path == "/redoc" or 
            request.url.path == "/openapi.json"):
            logger.debug("Allowing access to documentation endpoint")
            return await call_next(request)
            
        # Find the matching route using FastAPI's router
        check_for_auth = False
        route_handler = None
        for route in app.routes:
            match, scope = route.matches(request.scope)
            if match == Match.FULL:
                route_handler = route.endpoint
                # Check if the route is protected
                if isinstance(route, APIRoute) and is_protected_route(route_handler):
                    check_for_auth = True
                    break

        # Get the original route handler (through FastAPI dependencies)
        if not check_for_auth:
            logger.debug(f"Route {request.url.path} is not protected, allowing access")
            return await call_next(request)
            
        logger.debug(f"Route {request.url.path} is protected, checking authentication")
        try:
            # First try cookie authentication
            session_cookie = request.cookies.get("session")
            if session_cookie:
                logger.debug("Found session cookie, verifying...")
                if verify_session_token(session_cookie, settings):
                    logger.debug("Session cookie verification successful")
                    return await call_next(request)
                logger.debug("Session cookie verification failed")
                
            # Then try Basic Auth
            auth_header = request.headers.get("Authorization")
            if auth_header:
                logger.debug("Found Authorization header, verifying...")
                if verify_basic_auth(auth_header, settings):
                    logger.debug("Basic auth verification successful")
                    return await call_next(request)
                logger.debug("Basic auth verification failed")
                
            # If neither authentication method succeeds
            logger.warning(f"Authentication failed for {request.url.path}")
            raise HTTPException(
                status_code=401,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Basic"},
            )
            
        except HTTPException as exc:
            # Just re-raise HTTPExceptions (like 401 Unauthorized) without changing them
            request.app.state.logger.error(
                f"Authentication error for {request.url.path}: {exc.detail}"
            )
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail}
            )

        except Exception as e:
            # Log and convert other exceptions to 500 Internal Server Error
            logger.error(f"Unexpected error in auth middleware: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=str(e)
            ) 
