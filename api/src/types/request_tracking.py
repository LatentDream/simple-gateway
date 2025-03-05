from pydantic import BaseModel
from datetime import datetime
from typing import Dict, List

class RequestMetric(BaseModel):
    timestamp: datetime
    status_code: int
    path: str
    method: str
    client_ip: str
    is_rate_limited: bool = False

class RouteMetrics(BaseModel):
    total_requests: int
    success_count: int
    error_count: int
    rate_limited_count: int
    status_codes: Dict[str, int]  # Maps status code to count
    recent_requests: List[RequestMetric]

class RequestTrackingResponse(BaseModel):
    routes: Dict[str, RouteMetrics] 