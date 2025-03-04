from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from src.services.auth.middleware import protected_route, verify_basic_auth
from src.services.logging.logging import get_logger
from src.settings import Settings, get_settings
import base64
from datetime import datetime

router = APIRouter(prefix="/admin")
security = HTTPBasic()


@router.get("/health_check")
async def health_check(settings: Settings = Depends(get_settings)):
    route_config = {
        path: {"rate_limit": config["rate_limit"]} 
        for path, config in settings.ROUTE_FORWARDING.items()
    }
    return {
        "status": "ok",
        "profile": settings.PROFILE,
        "version": settings.VERSION,
        "routes": route_config
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
        
        if not verify_basic_auth(auth_header, settings):
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
