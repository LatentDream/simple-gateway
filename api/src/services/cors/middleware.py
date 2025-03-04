from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.settings import Settings

def setup_cors_middleware(app: FastAPI, settings: Settings):
    """
    Configure CORS middleware for the FastAPI application.
    
    Args:
        app: FastAPI application instance
        settings: Application settings (optional)
    """
    # Default origins if settings are not provided
    allowed_origins = [
        "http://localhost:5173",    # Vite default dev server
        "http://localhost:3000",    # Common React dev server
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    
    # If settings are provided, use configured origins
    if settings and hasattr(settings, 'ALLOWED_ORIGINS'):
        allowed_origins = settings.ALLOWED_ORIGINS
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],        # Allows all methods
        allow_headers=["*"],        # Allows all headers
        expose_headers=["*"],       # Exposes all headers
        max_age=600,                # Cache preflight requests for 10 minutes
    )
