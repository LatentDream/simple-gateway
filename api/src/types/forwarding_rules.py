# Pydantic models for route forwarding
from pydantic import BaseModel, validator


class RouteForwardingConfig(BaseModel):
    id: int | None = None
    target_url: str
    rate_limit: int = 60
    url_rewrite: dict[str, str] = {}

    @validator('rate_limit')
    def validate_rate_limit(cls, v):
        if v < 0:
            raise ValueError('rate_limit must be non-negative')
        return v

class RouteForwardingResponse(BaseModel):
    routes: dict[str, RouteForwardingConfig]

class UpdateRouteForwardingRequest(BaseModel):
    routes: dict[str, RouteForwardingConfig]

    @validator('routes')
    def validate_routes(cls, v):
        for path, config in v.items():
            if not path.startswith('/'):
                raise ValueError(f'Route path must start with /: {path}')
        return v

