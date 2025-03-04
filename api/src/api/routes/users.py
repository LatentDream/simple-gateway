from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from src.services.auth.middleware import protected_route, verify_basic_auth, require_auth
from src.services.logging.logging import get_logger
from src.settings import get_settings
import base64
from datetime import datetime

router = APIRouter(prefix="/users", tags=["users"])
security = HTTPBasic()

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
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
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
        
        return {"message": "Successfully logged in"}
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/logout")
@protected_route()
async def logout(
    response: Response,
    _: bool = Depends(require_auth),
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
    _: bool = Depends(require_auth),
    logger = Depends(get_logger)
):
    try:
        return {
            "username": "user"  # Replace with actual user info
        }
    except AttributeError:
        raise HTTPException(status_code=401, detail="Not authenticated")
