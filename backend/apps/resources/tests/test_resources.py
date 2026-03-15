"""Tests for resources: Resource (org-scoped), ProjectResourceAssignment."""
from django.test import TestCase
from apps.accounts.models import User, Organisation, SystemRole
from apps.projects.models import Project
from apps.resources.models import Resource, ProjectResourceAssignment


class ResourcesBaseTestCase(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")
        self.admin_role = SystemRole.objects.create(name="Admin", permissions=["admin.full_access"])
        self.admin = User.objects.create_user(
            username="admin", password="pass123",
            organisation=self.org, system_role=self.admin_role, is_staff=True,
        )
        self.project = Project.objects.create(
            name="Resource Test", project_type="residential",
            contract_type="lump_sum", organisation=self.org,
        )
        self.resource = Resource.objects.create(
            organisation=self.org, code="RES-001", name="Excavator",
            resource_type="equipment", daily_rate=15000,
        )


class ResourceTests(ResourcesBaseTestCase):
    def test_create_resource(self):
        self.client.force_login(self.admin)
        r = self.client.post("/api/v1/resources/resources/",
            {"code": "RES-002", "name": "Crane", "resource_type": "equipment", "daily_rate": 25000},
            content_type="application/json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["name"], "Crane")
        self.assertEqual(r.json()["organisation"], str(self.org.id))

    def test_admin_can_patch_resource(self):
        self.client.force_login(self.admin)
        r = self.client.patch(
            f"/api/v1/resources/resources/{self.resource.id}/",
            {"name": "Updated Excavator"},
            content_type="application/json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["name"], "Updated Excavator")

    def test_standard_user_cannot_patch_resource(self):
        standard_role = SystemRole.objects.create(name="Standard", permissions=[])
        standard = User.objects.create_user(
            username="standard", password="pass123",
            organisation=self.org, system_role=standard_role)
        self.client.force_login(standard)
        r = self.client.patch(
            f"/api/v1/resources/resources/{self.resource.id}/",
            {"name": "Hacked Name"},
            content_type="application/json")
        self.assertEqual(r.status_code, 403)

    def test_cross_org_blocked(self):
        other_org = Organisation.objects.create(name="Other Org")
        other_role = SystemRole.objects.create(name="OtherAdmin", permissions=["admin.full_access"])
        other_user = User.objects.create_user(
            username="other", password="pass123",
            organisation=other_org, system_role=other_role)
        self.client.force_login(other_user)
        r = self.client.get(f"/api/v1/resources/resources/{self.resource.id}/")
        self.assertEqual(r.status_code, 404)


class AssignmentTests(ResourcesBaseTestCase):
    def test_create_project_assignment(self):
        self.client.force_login(self.admin)
        r = self.client.post(f"/api/v1/resources/{self.project.id}/resource-assignments/",
            {
                "resource": str(self.resource.id),
                "assignment_role": "primary",
                "assigned_from": "2026-03-14",
            },
            content_type="application/json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["resource_name"], "Excavator")

    def test_assignment_unique_constraint(self):
        """Same resource cannot be assigned to the same project twice."""
        ProjectResourceAssignment.objects.create(
            project=self.project, resource=self.resource,
        )
        self.client.force_login(self.admin)
        r = self.client.post(f"/api/v1/resources/{self.project.id}/resource-assignments/",
            {
                "resource": str(self.resource.id),
                "assignment_role": "backup",
            },
            content_type="application/json")
        self.assertIn(r.status_code, [400, 409])


class UnauthenticatedTests(ResourcesBaseTestCase):
    def test_denied(self):
        for url in [
            "/api/v1/resources/resources/",
            f"/api/v1/resources/{self.project.id}/resource-assignments/",
        ]:
            self.assertEqual(self.client.get(url).status_code, 403)
