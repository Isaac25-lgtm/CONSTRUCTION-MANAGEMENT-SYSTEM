"""
Audit Logging Middleware
Automatically logs successful mutating API requests to the AuditLog table.
"""
import logging
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

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


def extract_entity_type(path: str) -> str | None:
    """Extract the entity type from the API path."""
    parts = path.strip("/").split("/")
    # Pattern: api/v1/{entity} or api/v1/projects/{id}/{entity}
    if len(parts) >= 3:
        entity = parts[2]
        if len(parts) >= 5:
            entity = parts[4]
        return entity.replace("-", "_").rstrip("s").capitalize()
    return None


def extract_entity_id(path: str) -> uuid.UUID | None:
    """Extract the first UUID found in the API path."""
    for part in path.strip("/").split("/"):
        try:
            return uuid.UUID(part)
        except (TypeError, ValueError):
            continue
    return None


def parse_uuid(value: str | None) -> uuid.UUID | None:
    if not value:
        return None
    try:
        return uuid.UUID(value)
    except (TypeError, ValueError):
        return None


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    """Creates audit log entries for successful data-modifying requests."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Only log mutating methods
        if request.method not in METHOD_ACTION_MAP:
            return await call_next(request)

        path = request.url.path

        # Skip non-entity paths
        if path in SKIP_PATHS or not path.startswith("/api/"):
            return await call_next(request)

        response = await call_next(request)

        # Only log successful operations (2xx status codes)
        if 200 <= response.status_code < 300:
            try:
                self._create_audit_log(request, response, path)
            except Exception:
                # Never let audit logging break the main request
                logger.error("Audit logging failed", exc_info=True)

        return response

    def _create_audit_log(self, request: Request, response: Response, path: str) -> None:
        from app.db.session import SessionLocal
        from app.models.audit_log import AuditLog

        action = METHOD_ACTION_MAP.get(request.method, "UNKNOWN")
        entity_type = extract_entity_type(path) or "Unknown"

        org_id = parse_uuid(request.headers.get("x-organization-id"))
        if not org_id:
            # Organization is required by the audit_logs schema.
            logger.debug("Skipping audit log: missing or invalid X-Organization-ID for %s %s", request.method, path)
            return

        user_id = None
        user_email = None
        auth_header = request.headers.get("authorization", "")

        if auth_header.startswith("Bearer "):
            try:
                from app.core.security import decode_token

                token = auth_header.split(" ", 1)[1]
                payload = decode_token(token)
                if payload:
                    user_id = parse_uuid(payload.get("sub"))
                    user_email = payload.get("email")
            except Exception:
                logger.debug("Failed to parse JWT for audit log", exc_info=True)

        details = {
            "method": request.method,
            "path": path,
            "status_code": response.status_code,
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent", "")[:200],
        }

        db = SessionLocal()
        try:
            audit_log = AuditLog(
                organization_id=org_id,
                user_id=user_id,
                action=action,
                entity_type=entity_type,
                entity_id=extract_entity_id(path),
                details=details,
            )
            db.add(audit_log)
            db.commit()
            logger.debug("Audit log created: %s %s by %s", action, entity_type, user_email or "anonymous")
        except Exception:
            db.rollback()
            logger.error("Failed to write audit log to DB", exc_info=True)
        finally:
            db.close()
