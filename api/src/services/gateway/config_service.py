from src.database.base import get_db
from src.database.models import GatewayConfig

async def get_route_config(path: str) -> tuple[str, int, dict[str, str]] | None:
    """Get the target URL and rate limit for a given path"""
    async for db in get_db():
        config = await GatewayConfig.get_config_by_prefix(db, path)
        if config:
            return config.target_url, config.rate_limit, config.url_rewrite
        
        # Try to find a matching prefix
        configs = await GatewayConfig.get_all_active_configs(db)
        for config in configs:
            if path.startswith(config.route_prefix):
                return config.target_url, config.rate_limit, config.url_rewrite
    return None 
