from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.core.config import settings
from app.core.errors import APIError
from app.api.v1.router import api_router
from app.logging import setup_logging
from app.middleware.audit import AuditLoggingMiddleware
from app.middleware.csrf import CSRFMiddleware
from app.middleware.rate_limit import RateLimitMiddleware

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    title="BuildPro API",
    description="Internal project management API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Middleware (order matters; last added is outermost in Starlette/FastAPI)
# 1. Audit Logging (innermost)
app.add_middleware(AuditLoggingMiddleware)

# 2. Rate Limiting (middle)
app.add_middleware(RateLimitMiddleware)

# 3. CSRF (outer to business middleware, inner to CORS)
app.add_middleware(CSRFMiddleware)

# 4. CORS (outermost so headers are present on all responses, including errors)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    """Apply baseline security headers on all responses."""
    response = await call_next(request)
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

    content_type = (response.headers.get("content-type") or "").lower()
    if "text/html" not in content_type:
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
        )
    return response

# Exception Handlers
@app.exception_handler(APIError)
async def api_error_handler(request, exc: APIError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details
            }
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An internal server error occurred",
                "details": None
            }
        }
    )

# Root Route
@app.get("/")
async def root():
    return {
        "service": "BuildPro API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "api": "/api/v1"
        }
    }

# Health Check
@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/ready")
async def readiness_check():
    # TODO: Add database connection check
    return {"status": "ready"}

# Include API Router
app.include_router(api_router, prefix="/api")

# Startup Event
@app.on_event("startup")
async def startup_event():
    logger.info("BuildPro API starting up...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")

    # Seed roles, default org, admin user, and sample data on first run
    try:
        from app.db.init_db import init_db
        init_db()
    except Exception as e:
        logger.error(f"Database initialization error: {e}")

# Shutdown Event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("BuildPro API shutting down...")

