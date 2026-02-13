"""
Audit Logging Middleware
Automatically logs API requests that modify data (POST, PUT, PATCH, DELETE)
to the AuditLog table.
"""
import logging
import json
from datetime import datetime, timezone
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from sqlalchemy import select

logger = logging.getLogger(__name__)

# Routes to skip (non-entity routes)
SKIP_PATHS = {
    "/docs", "/redoc", "/openapi.json",
    "/health", "/ready", "/",
    "/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/logout",
}

# Map HTTP methods to audit actions
METHOD_ACTION_MAP = {
    "POST": "CREATE",
    "PUT": "UPDATE",
    "PATCH": "UPDATE",
    "DELETE": "DELETE",
}

# Extract entity type from URL path
def extract_entity_type(path: str) -> str | None:
    """Extract the entity type from the API path."""
    parts = path.strip("/").split("/")
    # Pattern: api/v1/{entity} or api/v1/projects/{id}/{entity}
    if len(parts) >= 3:
        entity = parts[2]  # e.g., "projects", "organizations"
        if len(parts) >= 5:
            entity = parts[4]  # e.g., "tasks", "expenses" under projects
        return entity.replace("-", "_").rstrip("s").capitalize()
    return None


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that automatically creates audit log entries for data-modifying requests."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Only log mutating methods
        if request.method not in METHOD_ACTION_MAP:
            return await call_next(request)

        # Skip non-entity paths
        path = request.url.path
        if path in SKIP_PATHS:
            return await call_next(request)

        # Skip if path doesn't start with /api/
        if not path.startswith("/api/"):
            return await call_next(request)

        # Process the request
        response = await call_next(request)

        # Only log successful operations (2xx status codes)
        if 200 <= response.status_code < 300:
            try:
                await self._create_audit_log(request, response, path)
            except Exception as e:
                # Never let audit logging break the main request
                logger.error(f"Audit logging failed: {e}", exc_info=True)

        return response

    async def _create_audit_log(self, request: Request, response: Response, path: str):
        """Create an audit log entry in the database."""
        from app.db.session import AsyncSessionLocal
        from app.models.audit_log import AuditLog

        action = METHOD_ACTION_MAP.get(request.method, "UNKNOWN")
        entity_type = extract_entity_type(path) or "Unknown"

        # Try to get user info from request state (set by auth dependency)
        user_id = None
        user_email = None
        org_id = None

        # Extract from headers
        auth_header = request.headers.get("authorization", "")
        org_header = request.headers.get("x-organization-id")

        if org_header:
            org_id = org_header

        # Try to decode JWT to get user info (lightweight — no DB lookup)
        if auth_header.startswith("Bearer "):
            try:
                from app.core.security import decode_token
                token = auth_header.split(" ")[1]
                payload = decode_token(token)
                if payload:
                    user_id = payload.get("sub")
                    user_email = payload.get("email")
            except Exception:
                pass

        # Extract entity ID from path
        entity_id = None
        parts = path.strip("/").split("/")
        for i, part in enumerate(parts):
            try:
                # UUID format check
                if len(part) == 36 and part.count("-") == 4:
                    entity_id = part
            except Exception:
                pass

        # Build details
        details = {
            "method": request.method,
            "path": path,
            "status_code": response.status_code,
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent", "")[:200],
        }

        try:
            async with AsyncSessionLocal() as session:
                audit_log = AuditLog(
                    organization_id=org_id,
                    user_id=user_id,
                    action=action,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    details=details,
                )
                session.add(audit_log)
                await session.commit()
                logger.debug(f"Audit log: {action} {entity_type} by {user_email or 'anonymous'}")
        except Exception as e:
            logger.error(f"Failed to write audit log to DB: {e}")
