from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from typing import Any
from starlette.middleware.base import BaseHTTPMiddleware
import traceback
from contextvars import ContextVar

from src.settings import Settings

from .discord import ErrorReportClient

# Context variable to store the Discord client
discord_client_var: ContextVar[ErrorReportClient | None] = ContextVar('discord_client', default=None)

def setup_error_reporting(app: FastAPI, settings: Settings) -> None:
    """Setup error reporting middleware and Discord client"""
    # Initialize Discord client if webhook URL is configured
    if settings.DISCORD_WEBHOOK_URL:
        discord_client = ErrorReportClient.new(settings.DISCORD_WEBHOOK_URL)
        app.state.discord_client = discord_client
        
        # Add middleware for error reporting
        app.add_middleware(ErrorReportingMiddleware)
        
        # Add middleware to set discord client in context
        @app.middleware("http")
        async def discord_client_middleware(request: Request, call_next: Any):
            discord_client_var.set(request.app.state.discord_client)
            response = await call_next(request)
            return response

class ErrorReportingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Any):
        try:
            return await call_next(request)
        except Exception as exc:
            # Get error details
            error_details = {
                "path": request.url.path,
                "method": request.method,
                "client_host": request.client.host if request.client else "unknown",
                "headers": {
                    k: v for k, v in request.headers.items() 
                    if k.lower() not in ('authorization', 'cookie')  # Skip sensitive headers
                }
            }

            # Get the actual application exception by traversing the chain
            app_exc = exc
            while app_exc.__cause__ and isinstance(app_exc.__cause__, Exception):
                if not any(x in str(app_exc.__cause__.__class__) for x in ['anyio', 'starlette.middleware', 'fastapi.middleware']):
                    app_exc = app_exc.__cause__
                    break
                app_exc = app_exc.__cause__

            # If we only found framework exceptions, try context
            if any(x in str(app_exc.__class__) for x in ['anyio', 'starlette.middleware', 'fastapi.middleware']):
                app_exc = exc
                while app_exc.__context__ and isinstance(app_exc.__context__, Exception):
                    if not any(x in str(app_exc.__context__.__class__) for x in ['anyio', 'starlette.middleware', 'fastapi.middleware']):
                        app_exc = app_exc.__context__
                        break
                    app_exc = app_exc.__context__

            # Get the most relevant frames from the traceback
            def is_relevant_frame(frame):
                return not any(x in frame.filename for x in [
                    'middleware',
                    'starlette',
                    'fastapi/routing.py',
                    'site-packages/anyio',
                    'site-packages/asyncio'
                ])

            # Extract traceback from the application exception
            if app_exc.__traceback__:
                tb_list = traceback.extract_tb(app_exc.__traceback__)
                relevant_tb = [frame for frame in tb_list if is_relevant_frame(frame)]
                if not relevant_tb and tb_list:  # If no relevant frames found, use the last frame
                    relevant_tb = [tb_list[-1]]
                formatted_tb = ''.join(traceback.format_list(relevant_tb))
            else:
                formatted_tb = "No traceback available"
            
            # Log error with full traceback
            logger = request.app.state.logger
            logger.exception(
                "Unhandled exception in request",
                extra={
                    "path": error_details["path"],
                    "method": error_details["method"],
                    "error": str(app_exc)
                }
            )
            
            # Report to Discord if client is available
            try:
                discord_client = request.app.state.discord_client
                if discord_client:
                    user = getattr(request.state, 'user', None)
                    if user:
                        user = f"[{user.type}] {user.email} - {user.user_id}"
                    error_message = (f"🚨 API Error Report                 \n"
                    f"**Endpoint**: `{error_details['method']} {error_details['path']}`\n"
                    f"**Client**: `{error_details['client_host']}`        \n"
                    f"**User**: `{user}`                                  \n"
                    f"**Error:```                                         \n"
                    f"{app_exc.__class__.__name__}: {str(app_exc)}        \n"
                    f"```                                                 \n"
                    f"**Relevant Traceback**: ```python                   \n"
                    f"{formatted_tb}                                      \n"
                    f"```                                                 \n")
                    await discord_client.log(error_message)
            except Exception as discord_err:
                logger.exception("Failed to send error to Discord")
            
            # Return JSON response for API
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"}
            )

def get_report_client(request: Request) -> ErrorReportClient | None:
    """Dependency to get Discord client from context"""
    return discord_client_var.get()
