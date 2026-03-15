"""Tests for production settings validators.

Exercises the extracted validator functions directly --
no module reimporting, no global settings pollution.
"""
from unittest import TestCase

from django.core.exceptions import ImproperlyConfigured

from buildpro.settings.validators import validate_database_url, validate_remote_storage


class ValidateDatabaseURLTests(TestCase):

    def test_raises_when_required_and_missing(self):
        with self.assertRaises(ImproperlyConfigured):
            validate_database_url("", required=True, build_mode=False)

    def test_passes_when_required_and_present(self):
        validate_database_url("postgresql://u:p@h/db", required=True, build_mode=False)

    def test_build_mode_bypasses_check(self):
        validate_database_url("", required=True, build_mode=True)

    def test_not_required_allows_empty(self):
        validate_database_url("", required=False, build_mode=False)


class ValidateRemoteStorageTests(TestCase):

    def test_raises_when_required_and_endpoint_missing(self):
        with self.assertRaises(ImproperlyConfigured) as ctx:
            validate_remote_storage("", "key", "secret", "bucket", required=True, build_mode=False)
        self.assertIn("AWS_S3_ENDPOINT_URL", str(ctx.exception))

    def test_raises_when_required_and_all_missing(self):
        with self.assertRaises(ImproperlyConfigured) as ctx:
            validate_remote_storage("", "", "", "", required=True, build_mode=False)
        msg = str(ctx.exception)
        self.assertIn("AWS_S3_ENDPOINT_URL", msg)
        self.assertIn("AWS_ACCESS_KEY_ID", msg)
        self.assertIn("AWS_SECRET_ACCESS_KEY", msg)
        self.assertIn("AWS_STORAGE_BUCKET_NAME", msg)

    def test_returns_true_when_all_present(self):
        result = validate_remote_storage(
            "https://r2.example.com", "key", "secret", "bucket",
            required=True, build_mode=False,
        )
        self.assertTrue(result)

    def test_build_mode_bypasses_check(self):
        result = validate_remote_storage("", "", "", "", required=True, build_mode=True)
        self.assertFalse(result)

    def test_not_required_returns_false_when_missing(self):
        result = validate_remote_storage("", "", "", "", required=False, build_mode=False)
        self.assertFalse(result)

    def test_not_required_returns_true_when_all_present(self):
        result = validate_remote_storage(
            "https://r2.example.com", "key", "secret", "bucket",
            required=False, build_mode=False,
        )
        self.assertTrue(result)


class SettingsIntegrityTests(TestCase):
    """Verify current running settings have correct values."""

    def test_static_url_is_absolute(self):
        from django.conf import settings
        self.assertTrue(settings.STATIC_URL.startswith("/"))

    def test_media_url_is_absolute(self):
        from django.conf import settings
        self.assertTrue(settings.MEDIA_URL.startswith("/"))

    def test_default_auto_field_is_bigauto(self):
        from django.conf import settings
        self.assertEqual(settings.DEFAULT_AUTO_FIELD, "django.db.models.BigAutoField")
