from enum import Enum
from typing import Literal
from fastapi import Request
from pydantic_settings import BaseSettings, SettingsConfigDict

class Profile(str, Enum):
    """Application deployment profiles"""
    TEST = "TEST"
    DEV = "DEV"
    PROD = "PROD"

type SupportEngine = Literal['sqlite', 'postgresql']

class Settings(BaseSettings):
    """
    Application configuration settings
    Loads from environment variables with automatic type conversion
    """
    PROFILE: Profile = Profile.DEV
    VERSION: str = f"local"
    
    # Authentication Settings
    API_USERNAME: str = "admin"
    API_PASSWORD: str = "password123"  # In production, use a strong password and store securely
    
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",    # Vite default dev server
        "http://localhost:3000",    # Common React dev server
        "http://localhost:4173",    # Preview
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # Application Settings
    APP_NAME: str = "rate-limiter"
    DEBUG: bool = False
    
    # Logging Configuration
    LOG_LEVEL: str = "DEBUG"

    # Debugger
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    REDIS_URL: str = "redis://127.0.0.1:6382/0"

    # For error reporting
    DISCORD_WEBHOOK_URL: str = ""

    # Database general settings
    DB_ENGINE: SupportEngine = "sqlite"     # Which DB -> SQLite for now
    DB_ECHO: bool = True                    # True to log all SQL queries
    DB_NAME: str = "app"
    # PostgreSQL specific settings ~~~
    # Not in use right now, switch DB_ENGINE to -> "postgresql" to use it
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        if self.PROFILE == Profile.PROD:
            LOG_LEVEL: str = "INFO"
            self.ALLOWED_ORIGINS = [
                "https://example.com",
                "http://localhost:5173",
            ]
            self.DB_ECHO = False

        if self.PROFILE == Profile.TEST:
            pass

    # Allow environment variable overrides
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

async def get_settings(request: Request) -> Settings:
    return request.app.state.settings
