"""
BuildPro production settings for Render deployment.

Required env vars:
  DJANGO_SECRET_KEY     -- strong random secret
  DATABASE_URL          -- Neon PostgreSQL connection string (when REQUIRE_DATABASE_URL=true)
  ALLOWED_HOSTS         -- comma-separated hostnames
  CSRF_TRUSTED_ORIGINS  -- comma-separated https:// origins
  CELERY_BROKER_URL     -- Render Key Value connection string
  AWS_S3_ENDPOINT_URL   -- R2 endpoint (when REQUIRE_REMOTE_STORAGE=true)
  AWS_ACCESS_KEY_ID     -- R2 access key
  AWS_SECRET_ACCESS_KEY -- R2 secret key
  AWS_STORAGE_BUCKET_NAME -- R2 bucket name
  GEMINI_API_KEY        -- AI provider key

Safety flags:
  REQUIRE_DATABASE_URL=true   -- raises if DATABASE_URL is missing
  REQUIRE_REMOTE_STORAGE=true -- raises if R2 env vars are missing
  BUILD_MODE=true             -- suppresses runtime validation during image build (collectstatic)
"""
import os

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401, F403

DEBUG = False

# ---------------------------------------------------------------------------
# Build-mode flag: set during Docker image build to skip runtime validation
# ---------------------------------------------------------------------------
_BUILD_MODE = os.environ.get("BUILD_MODE", "").lower() == "true"

# ---------------------------------------------------------------------------
# Secrets
# ---------------------------------------------------------------------------
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY and not _BUILD_MODE:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set in production.")

ALLOWED_HOSTS = [h.strip() for h in os.environ.get("ALLOWED_HOSTS", "").split(",") if h.strip()]

# ---------------------------------------------------------------------------
# Database -- Neon PostgreSQL via DATABASE_URL
# ---------------------------------------------------------------------------
_db_url = os.environ.get("DATABASE_URL", "")
_require_db = os.environ.get("REQUIRE_DATABASE_URL", "").lower() == "true"

if _db_url:
    DATABASES["default"] = dj_database_url.parse(  # noqa: F405
        _db_url,
        conn_max_age=600,
        conn_health_checks=True,
        ssl_require=True,
    )
elif _require_db and not _BUILD_MODE:
    raise ImproperlyConfigured(
        "DATABASE_URL is required in production (REQUIRE_DATABASE_URL=true). "
        "Set it to your Neon PostgreSQL connection string."
    )

# ---------------------------------------------------------------------------
# Security -- Render terminates TLS at its proxy
# ---------------------------------------------------------------------------
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# CORS -- same-origin preferred
CORS_ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",") if o.strip()]
CORS_ALLOW_CREDENTIALS = True

# CSRF
CSRF_TRUSTED_ORIGINS = [o.strip() for o in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",") if o.strip()]

# ---------------------------------------------------------------------------
# Static files -- WhiteNoise serves Django static + frontend SPA
# ---------------------------------------------------------------------------
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")  # noqa: F405

MIDDLEWARE.insert(  # noqa: F405
    MIDDLEWARE.index("django.middleware.security.SecurityMiddleware") + 1,  # noqa: F405
    "whitenoise.middleware.WhiteNoiseMiddleware",
)
STORAGES = {  # noqa: F405
    **globals().get("STORAGES", {}),
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Frontend SPA served from WhiteNoise root
WHITENOISE_ROOT = os.environ.get("WHITENOISE_ROOT", "/app/frontend-dist")

# ---------------------------------------------------------------------------
# Media / file storage -- S3-compatible (Cloudflare R2)
# ---------------------------------------------------------------------------
_s3_endpoint = os.environ.get("AWS_S3_ENDPOINT_URL", "")
_s3_key = os.environ.get("AWS_ACCESS_KEY_ID", "")
_s3_secret = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
_s3_bucket = os.environ.get("AWS_STORAGE_BUCKET_NAME", "")
_require_storage = os.environ.get("REQUIRE_REMOTE_STORAGE", "").lower() == "true"

if _s3_endpoint and _s3_key and _s3_secret and _s3_bucket:
    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
    }
    AWS_S3_ENDPOINT_URL = _s3_endpoint
    AWS_ACCESS_KEY_ID = _s3_key
    AWS_SECRET_ACCESS_KEY = _s3_secret
    AWS_STORAGE_BUCKET_NAME = _s3_bucket
    AWS_S3_REGION_NAME = "auto"
    AWS_S3_SIGNATURE_VERSION = "s3v4"
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = True
    AWS_S3_FILE_OVERWRITE = False
elif _require_storage and not _BUILD_MODE:
    missing = [v for v, val in [
        ("AWS_S3_ENDPOINT_URL", _s3_endpoint),
        ("AWS_ACCESS_KEY_ID", _s3_key),
        ("AWS_SECRET_ACCESS_KEY", _s3_secret),
        ("AWS_STORAGE_BUCKET_NAME", _s3_bucket),
    ] if not val]
    raise ImproperlyConfigured(
        f"Remote storage is required in production (REQUIRE_REMOTE_STORAGE=true). "
        f"Missing: {', '.join(missing)}"
    )
else:
    # Local fallback -- only safe for single-service dev-like environments
    MEDIA_ROOT = os.path.join(BASE_DIR, "media")  # noqa: F405

# ---------------------------------------------------------------------------
# Password validation (stricter in prod)
# ---------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
}

# ---------------------------------------------------------------------------
# Sentry
# ---------------------------------------------------------------------------
_sentry_dsn = os.environ.get("SENTRY_DSN", "")
if _sentry_dsn:
    import sentry_sdk
    sentry_sdk.init(dsn=_sentry_dsn, traces_sample_rate=0.1)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOGGING["handlers"]["console"]["formatter"] = "verbose"  # noqa: F405
LOGGING["loggers"]["django"] = {"handlers": ["console"], "level": "WARNING"}  # noqa: F405
