"""Middleware for authentication, logging, and rate limiting."""
import time
import logging
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from .config import settings

logger = logging.getLogger(__name__)


class AuthMiddleware(BaseHTTPMiddleware):
    """API key authentication middleware."""

    # Paths that don't require authentication
    PUBLIC_PATHS = {"/", "/health", "/docs", "/openapi.json", "/redoc"}

    async def dispatch(self, request: Request, call_next):
        # Skip auth if not enabled
        if not settings.auth_enabled:
            return await call_next(request)

        # Skip auth for public paths
        if request.url.path in self.PUBLIC_PATHS:
            return await call_next(request)

        # Skip auth for WebSocket upgrades (they'll auth via query param)
        if request.headers.get("upgrade", "").lower() == "websocket":
            api_key = request.query_params.get("api_key", "")
            if api_key != settings.API_KEY:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Invalid or missing API key"},
                )
            return await call_next(request)

        # Check API key header
        api_key = request.headers.get("X-API-Key", "")
        if api_key != settings.API_KEY:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or missing API key"},
            )

        return await call_next(request)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all requests with timing."""

    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        duration = time.time() - start

        logger.info(
            f"{request.method} {request.url.path} "
            f"{response.status_code} {duration:.3f}s"
        )

        return response
