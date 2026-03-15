"""
BuildPro views -- health, readiness, and SPA catch-all.
"""
import logging
import os

from django.conf import settings
from django.db import connections
from django.http import HttpResponse, JsonResponse

logger = logging.getLogger("buildpro")


def health_check(request):
    """Liveness probe -- returns 200 if the process is running."""
    return JsonResponse({"status": "ok", "service": "buildpro"})


def readiness_check(request):
    """Readiness probe -- checks database and Redis connectivity."""
    checks = {"database": False, "redis": False}
    healthy = True

    try:
        conn = connections["default"]
        conn.ensure_connection()
        checks["database"] = True
    except Exception as e:
        logger.warning("Readiness: database check failed: %s", e)
        healthy = False

    try:
        import redis as redis_lib
        broker_url = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
        r = redis_lib.from_url(broker_url, socket_connect_timeout=2)
        r.ping()
        checks["redis"] = True
    except Exception as e:
        logger.warning("Readiness: redis check failed: %s", e)
        healthy = False

    status_code = 200 if healthy else 503
    return JsonResponse({"status": "ready" if healthy else "degraded", "checks": checks}, status=status_code)


def spa_catchall(request):
    """Serve the React SPA index.html for client-side routing.

    Only active in production (DEBUG=False). In development, Vite serves the SPA.
    WhiteNoise serves static assets (JS/CSS/images) from WHITENOISE_ROOT.
    This view handles SPA routes like /app/projects/123/overview.
    """
    index_path = os.path.join(
        getattr(settings, "WHITENOISE_ROOT", "/app/frontend-dist"),
        "index.html",
    )
    try:
        with open(index_path, "r") as f:
            return HttpResponse(f.read(), content_type="text/html")
    except FileNotFoundError:
        return HttpResponse(
            "<h1>BuildPro</h1><p>Frontend not built. Run <code>npm run build</code> in the frontend directory.</p>",
            content_type="text/html",
            status=404,
        )
