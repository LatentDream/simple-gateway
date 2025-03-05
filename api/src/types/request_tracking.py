from pydantic import BaseModel
from datetime import datetime

class RequestMetric(BaseModel):
    timestamp: datetime
    status_code: int
    path: str
    method: str
    client_ip: str
    is_rate_limited: bool = False

type Count = int
type StatusCode = str

class RouteMetrics(BaseModel):
    total_requests: Count
    success_count: Count
    error_count: Count
    rate_limited_count: Count
    status_codes: dict[StatusCode, Count]
    recent_requests: list[RequestMetric]

class RequestTrackingResponse(BaseModel):
    routes: dict[str, RouteMetrics] 
