from logging import Logger
from typing import final, override
from fastapi import Request, Response
from src.services.gateway.rules.asbtract import Rule, RulePhase
from src.settings import Settings


@final
class UrlRewriteRule(Rule):
    """Path rewriting implementation as a rule"""
    def __init__(self, rewrite_rules: dict[str, str]):
        """
        Initialize with rewrite rules mapping.
        
        Args:
            rewrite_rules: Dictionary mapping path prefixes to their replacements
                           Example: {"/api/v1/": "/internal/"}
        """
        super().__init__("path_rewrite", RulePhase.PRE)
        self.rewrite_rules = rewrite_rules
        
    @override
    async def pre_process(self, request: Request, settings: Settings, logger: Logger) -> Response | None:
        original_path = request.url.path
        
        # Apply rewrite rules
        rewritten_path = original_path
        for prefix, replacement in self.rewrite_rules.items():
            if original_path.startswith(prefix):
                rewritten_path = original_path.replace(prefix, replacement, 1)
                break
                
        # If path was rewritten, store both versions in request state
        if rewritten_path != original_path:
            logger.debug(f"Rewriting path: {original_path} -> {rewritten_path}")
            # Store in request state for potential use by other rules
            request.state.original_path = original_path
            request.state.rewritten_path = rewritten_path
            
            # Modify the request's scope to use the new path
            # This is a bit of a hack but necessary to modify the path in FastAPI
            request.scope["path"] = rewritten_path
            
        return None

    @override
    async def post_process(self, request: Request, response: Response, settings: Settings, logger: Logger) -> Response:
        return await super().post_process(request, response, settings, logger)
