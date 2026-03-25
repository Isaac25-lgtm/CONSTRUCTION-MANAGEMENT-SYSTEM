"""Tests for labour: TimesheetEntry create and update."""
from django.test import TestCase
from apps.accounts.models import User, Organisation, SystemRole
from apps.projects.models import Project
from apps.resources.models import Resource, ProjectResourceAssignment
from apps.scheduling.models import ProjectTask


class LabourBaseTestCase(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")
        self.admin_role = SystemRole.objects.create(name="Admin", permissions=["admin.full_access"])
        self.admin = User.objects.create_user(
            username="admin", password="pass123",
            organisation=self.org, system_role=self.admin_role, is_staff=True,
        )
        self.project = Project.objects.create(
            name="Labour Test", project_type="residential",
            contract_type="lump_sum", organisation=self.org,
        )
        self.resource = Resource.objects.create(
            organisation=self.org, code="RES-001", name="John Worker",
            resource_type="personnel", daily_rate=800,
        )
        self.assignment = ProjectResourceAssignment.objects.create(
            project=self.project, resource=self.resource,
        )


class TimesheetTests(LabourBaseTestCase):
    def test_create_timesheet_entry(self):
        self.client.force_login(self.admin)
        r = self.client.post(f"/api/v1/labour/{self.project.id}/timesheets/",
            {
                "resource": str(self.resource.id),
                "work_date": "2026-03-14",
                "hours": 8,
                "overtime_hours": 2,
                "description": "Foundation work",
            },
            content_type="application/json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["resource_name"], "John Worker")
        self.assertEqual(r.json()["total_hours"], 10)

    def test_update_timesheet_entry(self):
        self.client.force_login(self.admin)
        # Create first
        r = self.client.post(f"/api/v1/labour/{self.project.id}/timesheets/",
            {
                "resource": str(self.resource.id),
                "work_date": "2026-03-14",
                "hours": 8,
            },
            content_type="application/json")
        self.assertEqual(r.status_code, 201)
        entry_id = r.json()["id"]
        # Update
        r2 = self.client.patch(f"/api/v1/labour/{self.project.id}/timesheets/{entry_id}/",
            {"status": "submitted", "description": "Updated description"},
            content_type="application/json")
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.json()["status"], "submitted")

    def test_reject_timesheet_with_task_from_other_project(self):
        other_project = Project.objects.create(
            name="Other Project",
            project_type="residential",
            contract_type="lump_sum",
            organisation=self.org,
        )
        foreign_task = ProjectTask.objects.create(
            project=other_project,
            code="TASK-X",
            name="Foreign Task",
        )
        self.client.force_login(self.admin)
        r = self.client.post(
            f"/api/v1/labour/{self.project.id}/timesheets/",
            {
                "resource": str(self.resource.id),
                "task": str(foreign_task.id),
                "work_date": "2026-03-14",
                "hours": 8,
            },
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertIn("task", r.json())

    def test_reject_timesheet_with_approver_from_other_org(self):
        other_org = Organisation.objects.create(name="Other Org")
        other_role = SystemRole.objects.create(name="Other Admin", permissions=["admin.full_access"])
        foreign_approver = User.objects.create_user(
            username="foreign",
            password="pass123",
            organisation=other_org,
            system_role=other_role,
        )
        self.client.force_login(self.admin)
        r = self.client.post(
            f"/api/v1/labour/{self.project.id}/timesheets/",
            {
                "resource": str(self.resource.id),
                "work_date": "2026-03-14",
                "hours": 8,
                "approved_by": str(foreign_approver.id),
            },
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertIn("approved_by", r.json())


class UnauthenticatedTests(LabourBaseTestCase):
    def test_denied(self):
        url = f"/api/v1/labour/{self.project.id}/timesheets/"
        self.assertEqual(self.client.get(url).status_code, 403)
