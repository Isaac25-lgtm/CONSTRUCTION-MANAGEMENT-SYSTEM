"""Tests for field operations: risks, RFIs, change orders, punch, daily logs, safety, quality, recycle bin."""
from datetime import date
from django.test import TestCase
from apps.accounts.models import User, Organisation, SystemRole, DEFAULT_PROJECT_ROLE_PERMISSIONS
from apps.projects.models import Project, ProjectMembership
from apps.risks.models import Risk
from apps.rfis.models import RFI
from apps.changes.models import ChangeOrder
from apps.field_ops.models import PunchItem, DailyLog, SafetyIncident, QualityCheck


class FieldOpsBaseTestCase(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")
        self.admin_role = SystemRole.objects.create(name="Admin", permissions=["admin.full_access"])
        self.viewer_role = SystemRole.objects.create(name="Viewer", permissions=[])
        self.admin = User.objects.create_user(
            username="admin", password="pass123",
            organisation=self.org, system_role=self.admin_role, is_staff=True,
        )
        self.viewer = User.objects.create_user(
            username="viewer", password="pass123",
            organisation=self.org, system_role=self.viewer_role,
        )
        self.project = Project.objects.create(
            name="Field Test", project_type="residential",
            contract_type="lump_sum", organisation=self.org,
        )
        ProjectMembership.objects.create(
            project=self.project, user=self.viewer, role="viewer",
            permissions=DEFAULT_PROJECT_ROLE_PERMISSIONS["viewer"],
        )


class RiskTests(FieldOpsBaseTestCase):
    def test_create_risk(self):
        self.client.force_login(self.admin)
        r = self.client.post(f"/api/v1/risks/{self.project.id}/risks/",
            {"code": "R-001", "title": "Test", "likelihood": "high", "impact": "critical", "category": "technical"},
            content_type="application/json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["risk_score"], 12)

    def test_update_risk(self):
        risk = Risk.objects.create(project=self.project, code="R-001", title="Old", likelihood="low", impact="low")
        self.client.force_login(self.admin)
        r = self.client.patch(f"/api/v1/risks/{self.project.id}/risks/{risk.id}/",
            {"title": "Updated", "status": "mitigated"}, content_type="application/json")
        self.assertEqual(r.status_code, 200)
        risk.refresh_from_db()
        self.assertEqual(risk.title, "Updated")

    def test_soft_delete_and_restore(self):
        risk = Risk.objects.create(project=self.project, code="R-001", title="To Delete")
        self.client.force_login(self.admin)
        self.client.delete(f"/api/v1/risks/{self.project.id}/risks/{risk.id}/")
        risk.refresh_from_db()
        self.assertTrue(risk.is_deleted)
        # Restore
        r = self.client.post(f"/api/v1/risks/{self.project.id}/risks/{risk.id}/restore/")
        self.assertEqual(r.status_code, 200)
        risk.refresh_from_db()
        self.assertFalse(risk.is_deleted)

    def test_viewer_cannot_create(self):
        self.client.force_login(self.viewer)
        r = self.client.post(f"/api/v1/risks/{self.project.id}/risks/",
            {"code": "R-X", "title": "Bad", "likelihood": "low", "impact": "low"},
            content_type="application/json")
        self.assertEqual(r.status_code, 403)

    def test_risk_score(self):
        self.assertEqual(Risk(likelihood="high", impact="critical").risk_score, 12)
        self.assertEqual(Risk(likelihood="low", impact="low").risk_score, 1)


class RFITests(FieldOpsBaseTestCase):
    def test_create(self):
        self.client.force_login(self.admin)
        r = self.client.post(f"/api/v1/rfis/{self.project.id}/rfis/",
            {"code": "RFI-001", "subject": "Q", "question": "?", "date_raised": "2026-03-10", "priority": "high"},
            content_type="application/json")
        self.assertEqual(r.status_code, 201)

    def test_update_with_response(self):
        rfi = RFI.objects.create(project=self.project, code="RFI-001", subject="Q", question="?", date_raised=date(2026, 3, 10), status="open")
        self.client.force_login(self.admin)
        r = self.client.patch(f"/api/v1/rfis/{self.project.id}/rfis/{rfi.id}/",
            {"response": "Answer.", "status": "responded"}, content_type="application/json")
        self.assertEqual(r.status_code, 200)
        rfi.refresh_from_db()
        self.assertEqual(rfi.response, "Answer.")

    def test_overdue(self):
        rfi = RFI.objects.create(project=self.project, code="RFI-001", subject="X", question="?",
            date_raised=date(2025, 1, 1), due_date=date(2025, 1, 15), status="open")
        self.assertTrue(rfi.is_overdue)


class ChangeOrderTests(FieldOpsBaseTestCase):
    def test_create_and_update(self):
        self.client.force_login(self.admin)
        r = self.client.post(f"/api/v1/changes/{self.project.id}/change-orders/",
            {"code": "CO-001", "title": "Extra", "cost_impact": 5000000, "time_impact_days": 3, "category": "scope"},
            content_type="application/json")
        self.assertEqual(r.status_code, 201)
        co_id = r.json()["id"]
        r2 = self.client.patch(f"/api/v1/changes/{self.project.id}/change-orders/{co_id}/",
            {"status": "approved"}, content_type="application/json")
        self.assertEqual(r2.status_code, 200)


class PunchListTests(FieldOpsBaseTestCase):
    def test_create_and_close(self):
        self.client.force_login(self.admin)
        r = self.client.post(f"/api/v1/field-ops/{self.project.id}/punch-items/",
            {"title": "Crack", "location": "Room 3", "priority": "high"}, content_type="application/json")
        self.assertEqual(r.status_code, 201)
        pi_id = r.json()["id"]
        r2 = self.client.patch(f"/api/v1/field-ops/{self.project.id}/punch-items/{pi_id}/",
            {"status": "completed"}, content_type="application/json")
        self.assertEqual(r2.status_code, 200)


class DailyLogTests(FieldOpsBaseTestCase):
    def test_create_and_update(self):
        self.client.force_login(self.admin)
        r = self.client.post(f"/api/v1/field-ops/{self.project.id}/daily-logs/",
            {"log_date": "2026-03-14", "work_performed": "Pour"}, content_type="application/json")
        self.assertEqual(r.status_code, 201)
        log_id = r.json()["id"]
        r2 = self.client.patch(f"/api/v1/field-ops/{self.project.id}/daily-logs/{log_id}/",
            {"weather": "Sunny"}, content_type="application/json")
        self.assertEqual(r2.status_code, 200)


class SafetyTests(FieldOpsBaseTestCase):
    def test_create(self):
        self.client.force_login(self.admin)
        r = self.client.post(f"/api/v1/field-ops/{self.project.id}/safety-incidents/",
            {"incident_date": "2026-03-14", "title": "Fall", "description": "Fell", "incident_type": "injury", "severity": "serious"},
            content_type="application/json")
        self.assertEqual(r.status_code, 201)


class QualityTests(FieldOpsBaseTestCase):
    def test_create(self):
        self.client.force_login(self.admin)
        r = self.client.post(f"/api/v1/field-ops/{self.project.id}/quality-checks/",
            {"check_date": "2026-03-14", "title": "Test", "category": "concrete", "result": "pass"},
            content_type="application/json")
        self.assertEqual(r.status_code, 201)


class RecycleBinTests(FieldOpsBaseTestCase):
    def test_shows_deleted_with_correct_contract(self):
        risk = Risk.objects.create(project=self.project, code="R-001", title="Deleted")
        risk.soft_delete(user=self.admin)
        self.client.force_login(self.admin)
        r = self.client.get(f"/api/v1/field-ops/{self.project.id}/recycle-bin/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), 1)
        item = r.json()[0]
        self.assertEqual(item["type"], "risk")  # machine key
        self.assertEqual(item["type_label"], "Risk")  # human label
        self.assertIn("deleted_by_name", item)  # not deleted_by

    def test_empty_when_nothing_deleted(self):
        self.client.force_login(self.admin)
        r = self.client.get(f"/api/v1/field-ops/{self.project.id}/recycle-bin/")
        self.assertEqual(r.json(), [])

    def test_restore_removes_from_recycle(self):
        risk = Risk.objects.create(project=self.project, code="R-001", title="Restore Me")
        risk.soft_delete(user=self.admin)
        self.client.force_login(self.admin)
        self.client.post(f"/api/v1/risks/{self.project.id}/risks/{risk.id}/restore/")
        r = self.client.get(f"/api/v1/field-ops/{self.project.id}/recycle-bin/")
        self.assertEqual(r.json(), [])


class UnauthenticatedTests(FieldOpsBaseTestCase):
    def test_denied(self):
        for url in [
            f"/api/v1/risks/{self.project.id}/risks/",
            f"/api/v1/rfis/{self.project.id}/rfis/",
            f"/api/v1/changes/{self.project.id}/change-orders/",
            f"/api/v1/field-ops/{self.project.id}/punch-items/",
            f"/api/v1/field-ops/{self.project.id}/recycle-bin/",
        ]:
            self.assertEqual(self.client.get(url).status_code, 403)
