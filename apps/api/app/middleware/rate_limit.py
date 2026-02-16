"""
Rate Limiting Middleware
Token-bucket based rate limiting using in-memory storage.
In production, replace with Redis-based storage.
"""
import time
import logging
import hashlib
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import settings

logger = logging.getLogger(__name__)


class TokenBucket:
    """Simple token bucket rate limiter."""

    def __init__(self, rate: int, per: float = 60.0):
        """
        Args:
            rate: Number of tokens (requests) allowed per period
            per: Period in seconds (default: 60s = 1 minute)
        """
        self.rate = rate
        self.per = per
        self.buckets: dict[str, dict] = defaultdict(lambda: {
            "tokens": rate,
            "last_refill": time.monotonic()
        })

    def consume(self, key: str) -> tuple[bool, dict]:
        """
        Try to consume a token. Returns (allowed, info).
        info contains remaining tokens and reset time.
        """
        now = time.monotonic()
        bucket = self.buckets[key]

        # Refill tokens based on time elapsed
        elapsed = now - bucket["last_refill"]
        refill = elapsed * (self.rate / self.per)
        bucket["tokens"] = min(self.rate, bucket["tokens"] + refill)
        bucket["last_refill"] = now

        info = {
            "limit": self.rate,
            "remaining": max(0, int(bucket["tokens"]) - 1),
            "reset": int(self.per - elapsed % self.per),
        }

        if bucket["tokens"] >= 1:
            bucket["tokens"] -= 1
            return True, info
        else:
            return False, info

    def cleanup(self, max_age: float = 3600.0):
        """Remove stale buckets to prevent memory leaks."""
        now = time.monotonic()
        stale_keys = [
            k for k, v in self.buckets.items()
            if now - v["last_refill"] > max_age
        ]
        for key in stale_keys:
            del self.buckets[key]


# Global rate limiters
general_limiter = TokenBucket(
    rate=getattr(settings, 'RATE_LIMIT_PER_MINUTE', 100),
    per=60.0
)
auth_limiter = TokenBucket(
    rate=getattr(settings, 'AUTH_RATE_LIMIT_PER_MINUTE', 10),
    per=60.0
)

# Paths that use stricter rate limiting
AUTH_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/refresh",
    "/api/v1/auth/register",
}

# Paths exempt from rate limiting
EXEMPT_PATHS = {
    "/health", "/ready", "/", "/docs", "/redoc", "/openapi.json",
    "/api/docs", "/api/redoc", "/api/openapi.json",
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiting middleware."""

    _cleanup_counter = 0

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Always allow CORS preflight requests.
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip exempt paths
        if path in EXEMPT_PATHS:
            return await call_next(request)

        # Get client identifier
        client_ip = request.client.host if request.client else "unknown"
        # Also consider auth header for per-user limiting
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            token_fingerprint = hashlib.sha256(token.encode("utf-8")).hexdigest()[:16]
            key = f"user:{token_fingerprint}"
        else:
            key = f"ip:{client_ip}"

        # Choose limiter
        if path in AUTH_PATHS:
            limiter = auth_limiter
            key = f"auth:{client_ip}"
        else:
            limiter = general_limiter

        # Try to consume a token
        allowed, info = limiter.consume(key)

        if not allowed:
            logger.warning(f"Rate limit exceeded for {key} on {path}")
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many requests. Please try again later.",
                        "details": {
                            "retry_after": info["reset"],
                        }
                    }
                },
                headers={
                    "Retry-After": str(info["reset"]),
                    "X-RateLimit-Limit": str(info["limit"]),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(info["reset"]),
                }
            )

        # Process request and add rate limit headers
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(info["limit"])
        response.headers["X-RateLimit-Remaining"] = str(info["remaining"])
        response.headers["X-RateLimit-Reset"] = str(info["reset"])

        # Periodic cleanup (every 1000 requests)
        self.__class__._cleanup_counter += 1
        if self.__class__._cleanup_counter >= 1000:
            self.__class__._cleanup_counter = 0
            general_limiter.cleanup()
            auth_limiter.cleanup()

        return response
