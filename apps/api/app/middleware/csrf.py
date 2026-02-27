"""
CSRF Protection Middleware
Implements Double Submit Cookie pattern for CSRF protection.
Works alongside JWT Bearer tokens for enhanced security.
"""
import secrets
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings

logger = logging.getLogger(__name__)

CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "x-csrf-token"
CSRF_TOKEN_LENGTH = 32

# Safe methods that don't need CSRF protection
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

# Paths excluded from CSRF checks
EXCLUDED_PATHS = {
    "/docs", "/redoc", "/openapi.json",
    "/health", "/ready", "/",
    "/api/v1/auth/login",  # Login doesn't have a CSRF token yet
}


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    Implements Double Submit Cookie CSRF protection.
    
    Flow:
    1. On any response, set a CSRF cookie if not present
    2. On mutating requests (POST, PUT, PATCH, DELETE),
       validate that X-CSRF-Token header matches the cookie value
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Skip CSRF for excluded paths
        if path in EXCLUDED_PATHS:
            response = await call_next(request)
            return self._ensure_csrf_cookie(request, response)

        # Skip CSRF for safe methods
        if request.method in SAFE_METHODS:
            response = await call_next(request)
            return self._ensure_csrf_cookie(request, response)

        # Skip CSRF entirely in development mode (cross-origin dev servers
        # cannot share cookies, so the double-submit pattern doesn't work)
        if settings.ENVIRONMENT == "development":
            response = await call_next(request)
            return self._ensure_csrf_cookie(request, response)

        # For mutating requests, validate CSRF token
        csrf_cookie = request.cookies.get(CSRF_COOKIE_NAME)
        csrf_header = request.headers.get(CSRF_HEADER_NAME)

        if not csrf_cookie or not csrf_header:
            logger.warning(f"CSRF validation failed: missing token for {request.method} {path}")
            return JSONResponse(
                status_code=403,
                content={
                    "success": False,
                    "error": {
                        "code": "CSRF_VALIDATION_FAILED",
                        "message": "CSRF token missing. Please include X-CSRF-Token header.",
                        "details": None,
                    }
                }
            )

        if not secrets.compare_digest(csrf_cookie, csrf_header):
            logger.warning(f"CSRF validation failed: token mismatch for {request.method} {path}")
            return JSONResponse(
                status_code=403,
                content={
                    "success": False,
                    "error": {
                        "code": "CSRF_VALIDATION_FAILED",
                        "message": "CSRF token invalid. Please refresh the page.",
                        "details": None,
                    }
                }
            )

        # CSRF validation passed
        response = await call_next(request)
        return self._ensure_csrf_cookie(request, response)

    def _ensure_csrf_cookie(self, request: Request, response: Response) -> Response:
        """Set CSRF cookie if not already present."""
        existing = request.cookies.get(CSRF_COOKIE_NAME)
        if not existing:
            token = secrets.token_hex(CSRF_TOKEN_LENGTH)
            is_production = settings.ENVIRONMENT == "production"
            response.set_cookie(
                key=CSRF_COOKIE_NAME,
                value=token,
                httponly=False,  # JavaScript needs to read this cookie
                secure=is_production,
                samesite="none" if is_production else "lax",
                max_age=86400,  # 24 hours
                path="/",
            )
        return response
