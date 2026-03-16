"""Tests for auth endpoints: login, logout, me, inactive user handling."""
from django.test import TestCase
from django.urls import reverse

from apps.accounts.models import User, Organisation, SystemRole


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
    """Test the bootstrap_org_admin management command."""

    def test_creates_org_and_admin(self):
        from django.core.management import call_command
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
        from django.core.management import call_command
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
        """A user created via createsuperuser (no org) gets attached."""
        from django.core.management import call_command
        # Simulate createsuperuser: user exists but no org
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
        """Authenticated user without org gets denied on project endpoints."""
        role = SystemRole.objects.create(name="TestRole", permissions=[])
        user = User.objects.create_user(username="noorg", password="pass12345678")
        # No organisation set
        self.client.force_login(user)
        r = self.client.get("/api/v1/projects/")
        self.assertEqual(r.status_code, 403)


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
