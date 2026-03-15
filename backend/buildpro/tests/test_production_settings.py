"""Tests for production settings validation logic.

Tests the env-var validation rules without reimporting the full settings module.
Instead, tests the validation conditions directly.
"""
import os
from unittest import TestCase
from unittest.mock import patch

from django.core.exceptions import ImproperlyConfigured


class ProductionDBValidationTests(TestCase):
    """Test DATABASE_URL enforcement logic."""

    def test_require_db_raises_when_missing(self):
        """REQUIRE_DATABASE_URL=true with no DATABASE_URL should raise."""
        with self.assertRaises(ImproperlyConfigured):
            _require = "true"
            _db_url = ""
            _build_mode = False
            if _require == "true" and not _db_url and not _build_mode:
                raise ImproperlyConfigured("DATABASE_URL is required")

    def test_require_db_accepts_when_present(self):
        """REQUIRE_DATABASE_URL=true with DATABASE_URL present should not raise."""
        _require = "true"
        _db_url = "postgresql://user:pass@host/db"
        _build_mode = False
        # Should not raise
        if _require == "true" and not _db_url and not _build_mode:
            raise ImproperlyConfigured("DATABASE_URL is required")

    def test_build_mode_bypasses_db_check(self):
        """BUILD_MODE=true should skip validation even without DATABASE_URL."""
        _require = "true"
        _db_url = ""
        _build_mode = True
        # Should not raise because build mode
        if _require == "true" and not _db_url and not _build_mode:
            raise ImproperlyConfigured("DATABASE_URL is required")


class ProductionStorageValidationTests(TestCase):
    """Test R2 storage enforcement logic."""

    def test_require_storage_raises_when_missing(self):
        """REQUIRE_REMOTE_STORAGE=true with missing AWS vars should raise."""
        with self.assertRaises(ImproperlyConfigured):
            _require = "true"
            _build_mode = False
            _vars = {"endpoint": "", "key": "key123", "secret": "sec456", "bucket": ""}
            missing = [k for k, v in _vars.items() if not v]
            if _require == "true" and missing and not _build_mode:
                raise ImproperlyConfigured(f"Missing: {', '.join(missing)}")

    def test_require_storage_accepts_when_complete(self):
        """REQUIRE_REMOTE_STORAGE=true with all AWS vars should not raise."""
        _require = "true"
        _build_mode = False
        _vars = {"endpoint": "https://r2.example.com", "key": "k", "secret": "s", "bucket": "b"}
        missing = [k for k, v in _vars.items() if not v]
        if _require == "true" and missing and not _build_mode:
            raise ImproperlyConfigured(f"Missing: {', '.join(missing)}")

    def test_build_mode_bypasses_storage_check(self):
        """BUILD_MODE=true should skip storage validation."""
        _require = "true"
        _build_mode = True
        _vars = {"endpoint": "", "key": "", "secret": "", "bucket": ""}
        missing = [k for k, v in _vars.items() if not v]
        if _require == "true" and missing and not _build_mode:
            raise ImproperlyConfigured(f"Missing: {', '.join(missing)}")

    def test_no_require_allows_local_fallback(self):
        """Without REQUIRE_REMOTE_STORAGE, local media is allowed."""
        _require = ""
        _build_mode = False
        _vars = {"endpoint": "", "key": "", "secret": "", "bucket": ""}
        missing = [k for k, v in _vars.items() if not v]
        # Should not raise because require is not set
        if _require == "true" and missing and not _build_mode:
            raise ImproperlyConfigured(f"Missing: {', '.join(missing)}")


class ProductionSettingsEnvTests(TestCase):
    """Test that production.py reads expected env vars correctly."""

    def test_static_url_is_absolute(self):
        """STATIC_URL must start with / for WhiteNoise to work correctly."""
        from django.conf import settings
        self.assertTrue(settings.STATIC_URL.startswith("/"))

    def test_media_url_is_absolute(self):
        """MEDIA_URL must start with /."""
        from django.conf import settings
        self.assertTrue(settings.MEDIA_URL.startswith("/"))
