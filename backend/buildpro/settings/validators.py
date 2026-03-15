"""Production settings validators.

Extracted from production.py so they can be unit-tested independently.
"""
from django.core.exceptions import ImproperlyConfigured


def validate_database_url(db_url: str, required: bool, build_mode: bool) -> None:
    """Raise ImproperlyConfigured if DATABASE_URL is required but missing."""
    if required and not db_url and not build_mode:
        raise ImproperlyConfigured(
            "DATABASE_URL is required in production (REQUIRE_DATABASE_URL=true). "
            "Set it to your Neon PostgreSQL connection string."
        )


def validate_remote_storage(
    endpoint: str, key: str, secret: str, bucket: str,
    required: bool, build_mode: bool,
) -> bool:
    """Validate R2 storage config. Returns True if S3 should be configured.

    Raises ImproperlyConfigured if required but incomplete.
    """
    has_all = all([endpoint, key, secret, bucket])
    if has_all:
        return True

    if required and not build_mode:
        missing = []
        if not endpoint:
            missing.append("AWS_S3_ENDPOINT_URL")
        if not key:
            missing.append("AWS_ACCESS_KEY_ID")
        if not secret:
            missing.append("AWS_SECRET_ACCESS_KEY")
        if not bucket:
            missing.append("AWS_STORAGE_BUCKET_NAME")
        raise ImproperlyConfigured(
            f"Remote storage is required in production (REQUIRE_REMOTE_STORAGE=true). "
            f"Missing: {', '.join(missing)}"
        )

    return False
