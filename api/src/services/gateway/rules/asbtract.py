import abc
from typing import final
from logging import Logger
from fastapi import Request, Response
from src.settings import Settings



@final
class RulePhase:
    PRE = "pre"      # Rules applied before forwarding the request
    POST = "post"    # Rules applied after receiving the response
    BOTH = "both"    # Rules applied both before and after

class Rule(abc.ABC):
    """Base class for middleware rules"""
    def __init__(self, name: str, phase: str = RulePhase.PRE):
        self.name: str = name
        self.phase: str = phase
        
    @abc.abstractmethod
    async def pre_process(self, request: Request, settings: Settings, logger: Logger) -> Response | None:
        """Process before forwarding. Return Response to short-circuit or None to continue."""
        return None
        
    @abc.abstractmethod
    async def post_process(self, request: Request, response: Response, settings: Settings, logger: Logger) -> Response:
        """Process after receiving response. Must return the (possibly modified) response."""
        return response
