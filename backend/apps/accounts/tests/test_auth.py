"""Tests for auth endpoints: login, logout, me, bootstrap, first-run setup."""
import os
from io import StringIO
from unittest.mock import patch

from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse

from apps.accounts.models import User, Organisation, SystemRole
from apps.accounts.management.commands.seed_demo_projects import PROJECT_BLUEPRINTS
from apps.documents.models import Document
from apps.projects.models import Project
from apps.scheduling.models import ProjectTask
from apps.accounts.throttles import LoginRateThrottle, SetupBootstrapRateThrottle


class AuthEndpointTests(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")
        self.admin_role = SystemRole.objects.create(
            name="Admin",
            permissions=["admin.full_access"],
        )
        self.standard_role = SystemRole.objects.create(
            name="Standard",
            permissions=[],
        )
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass123",
            first_name="Test",
            last_name="User",
            organisation=self.org,
            system_role=self.standard_role,
        )
        self.admin = User.objects.create_user(
            username="admin",
            password="adminpass123",
            first_name="Admin",
            last_name="User",
            organisation=self.org,
            system_role=self.admin_role,
            is_staff=True,
        )

    def test_login_success(self):
        response = self.client.post(
            reverse("auth-login"),
            {"username": "testuser", "password": "testpass123"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["username"], "testuser")
        self.assertIn("system_permissions", data)
        self.assertIn("is_admin", data)
        self.assertFalse(data["is_admin"])

    def test_login_invalid_credentials(self):
        response = self.client.post(
            reverse("auth-login"),
            {"username": "testuser", "password": "wrong"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)

    def test_login_inactive_user(self):
        self.user.is_active = False
        self.user.save()
        response = self.client.post(
            reverse("auth-login"),
            {"username": "testuser", "password": "testpass123"},
            content_type="application/json",
        )
        # Django authenticate() returns None for inactive users
        self.assertIn(response.status_code, [401, 403])

    def test_login_rate_limited_after_repeated_failures(self):
        original_rates = LoginRateThrottle.THROTTLE_RATES.copy()
        LoginRateThrottle.THROTTLE_RATES = {**original_rates, "auth_login": "2/minute"}
        cache.clear()
        try:
            for _ in range(2):
                response = self.client.post(
                    reverse("auth-login"),
                    {"username": "testuser", "password": "wrong"},
                    content_type="application/json",
                )
                self.assertEqual(response.status_code, 401)

            response = self.client.post(
                reverse("auth-login"),
                {"username": "testuser", "password": "wrong"},
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 429)
        finally:
            LoginRateThrottle.THROTTLE_RATES = original_rates
            cache.clear()

    def test_me_authenticated(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse("auth-me"))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["username"], "testuser")
        self.assertEqual(data["organisation_name"], "Test Org")
        self.assertEqual(data["system_role_name"], "Standard")

    def test_me_admin_has_full_access(self):
        self.client.force_login(self.admin)
        response = self.client.get(reverse("auth-me"))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["is_admin"])
        self.assertIn("admin.full_access", data["system_permissions"])

    def test_me_unauthenticated(self):
        response = self.client.get(reverse("auth-me"))
        self.assertEqual(response.status_code, 403)

    def test_logout(self):
        self.client.force_login(self.user)
        response = self.client.post(reverse("auth-logout"))
        self.assertEqual(response.status_code, 200)
        me_response = self.client.get(reverse("auth-me"))
        self.assertEqual(me_response.status_code, 403)


class BootstrapOrgAdminTests(TestCase):
    """Test the bootstrap_org_admin management command and service."""

    def test_creates_org_and_admin(self):
        call_command(
            "bootstrap_org_admin",
            org_name="Test Corp",
            username="testadmin",
            email="admin@test.com",
            password="securepass123",
        )
        org = Organisation.objects.get(name="Test Corp")
        user = User.objects.get(username="testadmin")
        self.assertEqual(user.organisation_id, org.id)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertEqual(user.system_role.name, "Admin")
        self.assertTrue(user.check_password("securepass123"))

    def test_idempotent_rerun(self):
        call_command(
            "bootstrap_org_admin",
            org_name="Idempotent Corp",
            username="idempotent",
            email="i@test.com",
            password="firstpass123",
        )
        call_command(
            "bootstrap_org_admin",
            org_name="Idempotent Corp",
            username="idempotent",
            email="i@test.com",
            password="secondpass123",
        )
        self.assertEqual(Organisation.objects.filter(name="Idempotent Corp").count(), 1)
        self.assertEqual(User.objects.filter(username="idempotent").count(), 1)
        user = User.objects.get(username="idempotent")
        self.assertTrue(user.check_password("secondpass123"))

    def test_attaches_existing_user_to_org(self):
        user = User.objects.create_superuser(username="orphan", password="pass12345678", email="o@test.com")
        self.assertIsNone(user.organisation_id)
        call_command(
            "bootstrap_org_admin",
            org_name="Rescue Corp",
            username="orphan",
            email="o@test.com",
            password="newpass12345",
        )
        user.refresh_from_db()
        self.assertIsNotNone(user.organisation_id)
        self.assertEqual(user.organisation.name, "Rescue Corp")

    def test_orgless_user_gets_403_on_projects(self):
        User.objects.create_user(username="noorg", password="pass12345678")
        self.client.force_login(User.objects.get(username="noorg"))
        r = self.client.get("/api/v1/projects/")
        self.assertEqual(r.status_code, 403)

    @patch.dict(
        os.environ,
        {
            "TEST_ADMIN_EMAIL": "render-admin@example.com",
            "TEST_ADMIN_PASSWORD": "1234",
            "TEST_ADMIN_USERNAME": "render-admin",
            "TEST_ADMIN_ORG_NAME": "Render Test Org",
            "TEST_ADMIN_FIRST_NAME": "Render",
            "TEST_ADMIN_LAST_NAME": "Admin",
        },
        clear=False,
    )
    def test_seed_env_admin_creates_admin_from_env(self):
        out = StringIO()
        call_command("seed_env_admin", stdout=out)

        org = Organisation.objects.get(name="Render Test Org")
        user = User.objects.get(username="render-admin")
        self.assertEqual(user.organisation_id, org.id)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.check_password("1234"))
        self.assertEqual(user.system_role.name, "Admin")

    def test_seed_env_admin_skips_when_not_configured(self):
        out = StringIO()
        call_command("seed_env_admin", stdout=out)
        self.assertIn("Skipping env admin seed", out.getvalue())

    @patch("apps.accounts.management.commands.prepare_render_deploy.call_command")
    def test_prepare_render_deploy_runs_migrate_then_seed(self, mocked_call_command):
        call_command("prepare_render_deploy")
        self.assertEqual(
            mocked_call_command.call_args_list,
            [
                (("migrate",), {"interactive": False}),
                (("seed_env_admin",), {}),
                (("prune_to_env_admin",), {}),
            ],
        )

    @patch.dict(os.environ, {"SEED_DEMO_PROJECTS": "true"}, clear=False)
    @patch("apps.accounts.management.commands.prepare_render_deploy.call_command")
    def test_prepare_render_deploy_can_seed_demo_projects(self, mocked_call_command):
        call_command("prepare_render_deploy")
        self.assertEqual(
            mocked_call_command.call_args_list,
            [
                (("migrate",), {"interactive": False}),
                (("seed_env_admin",), {}),
                (("prune_to_env_admin",), {}),
                (("seed_demo_projects",), {"replace": True}),
            ],
        )

    @patch.dict(
        os.environ,
        {
            "SEED_DEMO_PROJECTS": "true",
            "TEST_ADMIN_EMAIL": "render-admin@example.com",
            "TEST_ADMIN_USERNAME": "render-admin",
        },
        clear=False,
    )
    @patch("apps.accounts.management.commands.prepare_render_deploy.call_command")
    def test_prepare_render_deploy_seeds_demo_projects_for_env_admin(self, mocked_call_command):
        call_command("prepare_render_deploy")
        self.assertEqual(
            mocked_call_command.call_args_list,
            [
                (("migrate",), {"interactive": False}),
                (("seed_env_admin",), {}),
                (("prune_to_env_admin",), {}),
                (("seed_demo_projects",), {"replace": True, "username": "render-admin"}),
            ],
        )

    def test_seed_demo_projects_creates_demo_projects_without_extra_users(self):
        org = Organisation.objects.create(name="Demo Org")
        role = SystemRole.objects.create(name="Demo Admin", permissions=["admin.full_access"])
        admin = User.objects.create_user(
            username="demo-admin",
            password="pass12345678",
            organisation=org,
            system_role=role,
            is_staff=True,
        )
        User.objects.create_user(
            username="baseline-user",
            password="pass12345678",
            organisation=org,
        )
        call_command(
            "seed_demo_projects",
            username=admin.username,
        )
        self.assertEqual(Project.objects.filter(organisation=org).count(), len(PROJECT_BLUEPRINTS))
        self.assertEqual(User.objects.filter(organisation=org).count(), 2)
        completed = Project.objects.filter(organisation=org, status="completed").count()
        self.assertGreaterEqual(completed, 1)
        self.assertGreater(ProjectTask.objects.filter(project__organisation=org).count(), 0)
        self.assertGreater(Document.objects.filter(project__organisation=org).count(), 0)


class SetupAPITests(TestCase):
    """Test the first-run setup API endpoints."""

    def test_status_uninitialized(self):
        """When no org-backed admin exists, status returns initialized=false."""
        r = self.client.get("/api/v1/auth/setup/status/")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()["initialized"])

    def test_status_initialized(self):
        """After bootstrap, status returns initialized=true."""
        org = Organisation.objects.create(name="Init Corp")
        role = SystemRole.objects.create(name="Admin", permissions=["admin.full_access"])
        User.objects.create_user(
            username="admin", password="pass12345678",
            organisation=org, system_role=role, is_staff=True,
        )
        r = self.client.get("/api/v1/auth/setup/status/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["initialized"])

    @patch.dict(os.environ, {"BOOTSTRAP_SETUP_SECRET": "test-secret-123"})
    def test_bootstrap_success(self):
        """Correct secret + valid data creates org and admin."""
        r = self.client.post(
            "/api/v1/auth/setup/bootstrap/",
            {
                "bootstrap_secret": "test-secret-123",
                "org_name": "New Corp",
                "username": "newadmin",
                "email": "new@test.com",
                "password": "securepass123",
            },
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["organisation"], "New Corp")
        self.assertEqual(r.json()["username"], "newadmin")
        user = User.objects.get(username="newadmin")
        self.assertIsNotNone(user.organisation_id)
        self.assertTrue(user.check_password("securepass123"))

    @patch.dict(os.environ, {"BOOTSTRAP_SETUP_SECRET": "test-secret-123"})
    def test_bootstrap_wrong_secret(self):
        """Wrong secret is rejected."""
        r = self.client.post(
            "/api/v1/auth/setup/bootstrap/",
            {
                "bootstrap_secret": "wrong-secret",
                "org_name": "Corp",
                "username": "admin",
                "email": "a@t.com",
                "password": "securepass123",
            },
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 403)

    @patch.dict(os.environ, {"BOOTSTRAP_SETUP_SECRET": "test-secret-123"})
    def test_bootstrap_disabled_after_init(self):
        """Once initialized, bootstrap endpoint returns 404."""
        # First bootstrap
        self.client.post(
            "/api/v1/auth/setup/bootstrap/",
            {
                "bootstrap_secret": "test-secret-123",
                "org_name": "First Corp",
                "username": "firstadmin",
                "email": "f@t.com",
                "password": "securepass123",
            },
            content_type="application/json",
        )
        # Second attempt
        r = self.client.post(
            "/api/v1/auth/setup/bootstrap/",
            {
                "bootstrap_secret": "test-secret-123",
                "org_name": "Second Corp",
                "username": "secondadmin",
                "email": "s@t.com",
                "password": "securepass123",
            },
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 404)

    def test_bootstrap_no_secret_configured(self):
        """If BOOTSTRAP_SETUP_SECRET is not set, returns 503."""
        r = self.client.post(
            "/api/v1/auth/setup/bootstrap/",
            {
                "bootstrap_secret": "anything",
                "org_name": "Corp",
                "username": "admin",
                "email": "a@t.com",
                "password": "securepass123",
            },
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 503)

    @patch.dict(os.environ, {"BOOTSTRAP_SETUP_SECRET": "test-secret-123"})
    def test_bootstrap_missing_fields(self):
        """Missing required fields returns 400."""
        r = self.client.post(
            "/api/v1/auth/setup/bootstrap/",
            {"bootstrap_secret": "test-secret-123", "org_name": "Corp"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)

    @patch.dict(os.environ, {"BOOTSTRAP_SETUP_SECRET": "test-secret-123"})
    def test_bootstrap_rejects_weak_password(self):
        r = self.client.post(
            "/api/v1/auth/setup/bootstrap/",
            {
                "bootstrap_secret": "test-secret-123",
                "org_name": "Weak Corp",
                "username": "weakadmin",
                "email": "weak@test.com",
                "password": "12345678",
            },
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertIn("password", r.json()["detail"].lower())

    @patch.dict(os.environ, {"BOOTSTRAP_SETUP_SECRET": "test-secret-123"})
    def test_bootstrap_rate_limited_after_repeated_attempts(self):
        original_rates = SetupBootstrapRateThrottle.THROTTLE_RATES.copy()
        SetupBootstrapRateThrottle.THROTTLE_RATES = {
            **original_rates,
            "auth_setup_bootstrap": "2/minute",
        }
        cache.clear()
        try:
            for _ in range(2):
                r = self.client.post(
                    "/api/v1/auth/setup/bootstrap/",
                    {
                        "bootstrap_secret": "wrong-secret",
                        "org_name": "Corp",
                        "username": "admin",
                        "email": "a@t.com",
                        "password": "securepass123",
                    },
                    content_type="application/json",
                )
                self.assertEqual(r.status_code, 403)

            r = self.client.post(
                "/api/v1/auth/setup/bootstrap/",
                {
                    "bootstrap_secret": "wrong-secret",
                    "org_name": "Corp",
                    "username": "admin",
                    "email": "a@t.com",
                    "password": "securepass123",
                },
                content_type="application/json",
            )
            self.assertEqual(r.status_code, 429)
        finally:
            SetupBootstrapRateThrottle.THROTTLE_RATES = original_rates
            cache.clear()


class PruneEnvAdminTests(TestCase):
    @patch.dict(
        os.environ,
        {
            "TEST_ADMIN_EMAIL": "render-admin@example.com",
            "TEST_ADMIN_USERNAME": "render-admin",
        },
        clear=False,
    )
    def test_prune_to_env_admin_deletes_all_other_users(self):
        org = Organisation.objects.create(name="Render Org")
        role = SystemRole.objects.create(name="Admin", permissions=["admin.full_access"])
        keep_user = User.objects.create_user(
            username="render-admin",
            password="pass12345678",
            email="render-admin@example.com",
            organisation=org,
            system_role=role,
            is_staff=True,
            is_superuser=True,
        )
        User.objects.create_user(
            username="demo-user",
            password="pass12345678",
            organisation=org,
        )
        User.objects.create_user(
            username="another-user",
            password="pass12345678",
        )

        call_command("prune_to_env_admin")

        self.assertTrue(User.objects.filter(pk=keep_user.pk).exists())
        self.assertEqual(list(User.objects.values_list("username", flat=True)), ["render-admin"])


class OrganisationTests(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org", address="Kampala")
        self.admin_role = SystemRole.objects.create(name="Admin", permissions=["admin.full_access"])
        self.standard_role = SystemRole.objects.create(name="Standard", permissions=[])
        self.admin = User.objects.create_user(
            username="admin", password="pass123",
            organisation=self.org, system_role=self.admin_role, is_staff=True,
        )
        self.standard = User.objects.create_user(
            username="standard", password="pass123",
            organisation=self.org, system_role=self.standard_role,
        )

    def test_admin_can_patch_org(self):
        self.client.force_login(self.admin)
        r = self.client.patch(
            "/api/v1/auth/organisation/",
            {"name": "Updated Org", "phone": "+256700000000"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["name"], "Updated Org")
        self.assertEqual(r.json()["phone"], "+256700000000")

    def test_standard_user_cannot_patch_org(self):
        self.client.force_login(self.standard)
        r = self.client.patch(
            "/api/v1/auth/organisation/",
            {"name": "Hacked"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 403)

    def test_admin_can_create_user(self):
        self.client.force_login(self.admin)
        r = self.client.post(
            "/api/v1/auth/users/",
            {
                "username": "newuser",
                "email": "new@example.com",
                "first_name": "New",
                "last_name": "User",
                "password": "securepass123",
            },
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["username"], "newuser")

    def test_admin_user_creation_rejects_weak_password(self):
        self.client.force_login(self.admin)
        r = self.client.post(
            "/api/v1/auth/users/",
            {
                "username": "weakuser",
                "email": "weak@example.com",
                "first_name": "Weak",
                "last_name": "User",
                "password": "12345678",
            },
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertIn("password", r.json())

    def test_standard_user_cannot_create_user(self):
        self.client.force_login(self.standard)
        r = self.client.post(
            "/api/v1/auth/users/",
            {"username": "hacker", "email": "h@x.com", "password": "hackpass123"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 403)

    def test_get_org(self):
        self.client.force_login(self.standard)
        r = self.client.get("/api/v1/auth/organisation/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["name"], "Test Org")
