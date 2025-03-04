from dataclasses import dataclass
import httpx
from pydantic import BaseModel
import logging
from typing import Any, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar('T')

class DiscordMessage(BaseModel):
    content: str
    username: str | None = None

@dataclass
class ErrorReportClient:
    """ Currently configure for Discord """
    webhook_url: str
    skip: bool = False
    _http_client: httpx.AsyncClient | None = None

    def __post_init__(self):
        """Initialize the HTTP client with timeout settings"""
        if not self.webhook_url:
            self.skip = True
        if not self._http_client:
            self._http_client = httpx.AsyncClient(timeout=5.0)

    @classmethod
    def new(cls, webhook_url: str) -> "ErrorReportClient":
        """Factory method to create a new Discord client instance"""
        return cls(webhook_url=webhook_url)

    def __del__(self):
        """Cleanup method to ensure the HTTP client is closed"""
        if self._http_client:
            import asyncio
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(self._http_client.aclose())
                else:
                    loop.run_until_complete(self._http_client.aclose())
            except Exception:
                logger.warning("Failed to close HTTP client properly", exc_info=True)

    def _get_error_chain(self, exc: BaseException) -> list[str]:
        """Get the full chain of exception causes as strings"""
        chain = [str(exc)]
        cause = exc.__cause__ or exc.__context__
        while cause:
            chain.append(str(cause))
            cause = cause.__cause__ or cause.__context__
        return chain

    async def log_error(self, error: BaseException, message: str = "An unexpected error occurred") -> None:
        """
        Log an error with full context to Discord
        
        Args:
            error: The exception to log
            message: Optional message to provide context for the error
        """
        if self.skip:
            return

        error_chain = self._get_error_chain(error)
        formatted_message = (
            f"⚠️ {message}\n"
            f"```\n"
            f"Error: {error_chain[0]}\n"
            f"\nError Chain:\n" + "\n".join(f"  → {err}" for err in error_chain[1:]) + "\n"
            f"```"
        )

        await self.log(formatted_message)

    async def log(self, message: Any) -> None:
        """
        Send a message to Discord webhook
        
        Args:
            message: The message to send. Will be converted to string.
        """
        if self.skip:
            return

        discord_message = DiscordMessage(
            content=str(message),
            username="API Notification"
        )

        try:
            assert self._http_client is not None, "client should exist at this point" 
            response = await self._http_client.post(
                self.webhook_url,
                json=discord_message.model_dump(exclude_none=True)
            )
            response.raise_for_status()
        except Exception as e:
            logger.error(
                "Failed to send Discord notification",
                extra={
                    "error_message": str(e),
                    "error_cause_chain": self._get_error_chain(e)
                },
                exc_info=True
            )
