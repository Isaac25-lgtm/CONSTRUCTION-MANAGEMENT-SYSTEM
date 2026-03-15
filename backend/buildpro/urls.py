"""
BuildPro URL configuration.

In production, WhiteNoise serves the frontend SPA from WHITENOISE_ROOT.
The catch-all at the bottom serves index.html for SPA client-side routes.
"""
from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path

from .views import health_check, readiness_check, spa_catchall

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    path("api/ready/", readiness_check, name="readiness-check"),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/projects/", include("apps.projects.urls")),
    path("api/v1/scheduling/", include("apps.scheduling.urls")),
    path("api/v1/cost/", include("apps.cost.urls")),
    path("api/v1/risks/", include("apps.risks.urls")),
    path("api/v1/rfis/", include("apps.rfis.urls")),
    path("api/v1/changes/", include("apps.changes.urls")),
    path("api/v1/field-ops/", include("apps.field_ops.urls")),
    path("api/v1/procurement/", include("apps.procurement.urls")),
    path("api/v1/labour/", include("apps.labour.urls")),
    path("api/v1/resources/", include("apps.resources.urls")),
    path("api/v1/comms/", include("apps.comms.urls")),
    path("api/v1/documents/", include("apps.documents.urls")),
    path("api/v1/reports/", include("apps.reports.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/ai/", include("apps.ai.urls")),
]

# In development, Vite handles SPA routing via its dev server proxy.
# In production, Django serves index.html for all non-API/admin/static paths.
if not settings.DEBUG:
    urlpatterns += [
        re_path(r"^(?!api/|admin/|static/).*$", spa_catchall, name="spa-catchall"),
    ]
