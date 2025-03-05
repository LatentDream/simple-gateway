from logging import Logger
from typing import final
from fastapi import FastAPI, Request,  HTTPException
from src.services.gateway.rules.asbtract import Rule, RulePhase
from src.services.gateway.rules.rate_limiter import RateLimitRule
from src.settings import Settings
from src.services.proxy.service import forward_request


@final
class GatewayMiddleware:
    """Gateway middleware manager that applies rules in sequence"""
    def __init__(self, app: FastAPI, settings: Settings, logger: Logger):
        self.app = app
        self.settings = settings
        self.logger = logger
        self.rules: list[Rule] = []

    def add_rule(self, rule: Rule):
        """Add a rule to the middleware chain"""
        self.rules.append(rule)
        return self

    async def process_request(self, request: Request, call_next):
        """Process the request through all rules and forward it"""
        request_path = request.url.path
        
        # Skip processing for certain paths
        if request_path.startswith("/admin"):
            return await call_next(request)
            
        # Get route configuration
        route_config = self.settings.get_route_config(request_path)
        if not route_config:
            self.logger.error(f"No Config found for route {request_path}")
            raise HTTPException(status_code=404, detail="Route not found")
            
        target_url, _ = route_config
        
        # Apply pre-processing rules
        for rule in self.rules:
            if rule.phase in [RulePhase.PRE, RulePhase.BOTH]:
                try:
                    result = await rule.pre_process(request, self.settings, self.logger)
                    if result is not None:
                        # Rule returned a response, short-circuit
                        return result
                except Exception as e:
                    self.logger.error(f"Error in rule {rule.name} pre-process: {str(e)}")
                    
        # Forward the request
        response = await forward_request(request, target_url, self.logger)
        
        # Apply post-processing rules
        for rule in self.rules:
            if rule.phase in [RulePhase.POST, RulePhase.BOTH]:
                try:
                    response = await rule.post_process(request, response, self.settings, self.logger)
                except Exception as e:
                    self.logger.error(f"Error in rule {rule.name} post-process: {str(e)}")
                    
        return response

def setup_gateway(app: FastAPI, settings: Settings, logger: Logger) -> GatewayMiddleware:
    """Setup gateway middleware with configurable rules"""
    
    # Create the gateway middleware
    gateway = GatewayMiddleware(app, settings, logger)
    
    # Add default rules
    gateway = gateway.add_rule(RateLimitRule())
    
    # Register middleware with FastAPI
    @app.middleware("http")
    async def gateway_middleware(request: Request, call_next):
        return await gateway.process_request(request, call_next)
    
    return gateway
