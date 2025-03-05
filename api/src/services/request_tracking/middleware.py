from fastapi import Request, HTTPException
from datetime import datetime
from typing import Dict, final
from src.settings import Settings
from src.types.request_tracking import RequestMetric, RouteMetrics, RequestTrackingResponse
from collections import defaultdict
import asyncio
from logging import Logger
from fastapi.responses import JSONResponse

@final
class RequestTracker:
    _instance = None
    _lock = asyncio.Lock()
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(RequestTracker, cls).__new__(cls)
        return cls._instance

    def initialize(self, logger: Logger | None = None):
        """Synchronous initialization for setup"""
        if not self._initialized:
            if logger:
                logger.debug("Initializing RequestTracker instance")
            self.routes: dict[str, RouteMetrics] = {}
            self.lock = asyncio.Lock()
            self.logger = logger
            self._initialized = True
            if logger:
                logger.debug("RequestTracker instance initialized")

    async def ensure_initialized(self):
        """Async initialization check for middleware operations"""
        if not self._initialized:
            async with self._lock:
                if not self._initialized:
                    self.initialize(self.logger)

    def __init__(self, logger: Logger | None = None):
        # Initialize will be called separately
        pass

    async def track_request(self, request: Request, status_code: int, is_rate_limited: bool = False):
        await self.ensure_initialized()

        if self.logger:
            self.logger.debug(f"Tracking request for path: {request.url.path}, status: {status_code}, rate_limited: {is_rate_limited}")
        
        path = request.url.path
        async with self.lock:
            if path not in self.routes:
                if self.logger:
                    self.logger.debug(f"Creating new metrics entry for path: {path}")
                self.routes[path] = RouteMetrics(
                    total_requests=0,
                    success_count=0,
                    error_count=0,
                    rate_limited_count=0,
                    status_codes={},
                    recent_requests=[]
                )

            metrics = self.routes[path]
            
            # Create new request metric
            try:
                request_metric = RequestMetric(
                    timestamp=datetime.utcnow(),
                    status_code=status_code,
                    path=path,
                    method=request.method,
                    client_ip=request.client.host if request.client else "unknown",
                    is_rate_limited=is_rate_limited
                )
                if self.logger:
                    self.logger.debug(f"Created request metric: {request_metric}")
            except Exception as e:
                if self.logger:
                    self.logger.error(f"Error creating request metric: {str(e)}")
                raise

            # Update counters
            try:
                metrics.total_requests += 1
                if is_rate_limited:
                    metrics.rate_limited_count += 1
                elif 200 <= status_code < 400:
                    metrics.success_count += 1
                else:
                    metrics.error_count += 1

                # Update status code counts
                status_str = str(status_code)
                metrics.status_codes[status_str] = metrics.status_codes.get(status_str, 0) + 1

                # Add to recent requests, keeping only last 100
                metrics.recent_requests.append(request_metric)
                metrics.recent_requests = metrics.recent_requests[-100:]

                if self.logger:
                    self.logger.debug(f"Updated metrics for path {path}: total={metrics.total_requests}, success={metrics.success_count}, error={metrics.error_count}, rate_limited={metrics.rate_limited_count}")
            except Exception as e:
                if self.logger:
                    self.logger.error(f"Error updating metrics: {str(e)}")
                raise

    async def get_metrics(self) -> RequestTrackingResponse:
        await self.ensure_initialized()

        if self.logger:
            self.logger.debug(f"Retrieving metrics for {len(self.routes)} routes")
            self.logger.debug(f"Current routes: {list(self.routes.keys())}")
        try:
            async with self.lock:
                response = RequestTrackingResponse(routes=self.routes.copy())
                if self.logger:
                    self.logger.debug("Successfully created metrics response")
                return response
        except Exception as e:
            if self.logger:
                self.logger.error(f"Error creating metrics response: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to retrieve metrics: {str(e)}")

def setup_request_tracking(app, settings: Settings, logger: Logger):
    if logger:
        logger.debug("Setting up request tracking middleware")
    
    tracker = RequestTracker(logger)
    tracker.initialize(logger)  # Synchronous initialization
    app.state.request_tracker = tracker

    @app.middleware("http")
    async def request_tracking_middleware(request: Request, call_next):
        if logger:
            logger.debug(f"Request tracking middleware processing request to: {request.url.path}")
        
        # Skip tracking for admin routes, but NOT the metrics endpoint
        if request.url.path.startswith("/admin") and request.url.path != "/admin/metrics":
            if logger:
                logger.debug(f"Skipping request tracking for admin path: {request.url.path}")
            return await call_next(request)

        try:
            response = await call_next(request)
            
            # Track the request
            is_rate_limited = response.status_code == 429
            if logger:
                logger.debug(f"Tracking request with status code: {response.status_code}, rate limited: {is_rate_limited}")
            await tracker.track_request(request, response.status_code, is_rate_limited)
            
            return response
        except Exception as e:
            if logger:
                logger.error(f"Error in request tracking middleware: {str(e)}", exc_info=True)
            return JSONResponse(
                status_code=500,
                content={"detail": f"Internal server error: {str(e)}"}
            )
