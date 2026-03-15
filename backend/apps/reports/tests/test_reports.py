"""Tests for reports: available reports, export generation, authorization, export history."""
from django.test import TestCase
from apps.accounts.models import User, Organisation, SystemRole
from apps.projects.models import Project, ProjectMembership


class ReportBaseTestCase(TestCase):
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
            name="Report Test", project_type="residential",
            contract_type="lump_sum", organisation=self.org,
        )
        # Viewer can view reports but not export
        ProjectMembership.objects.create(
            project=self.project, user=self.viewer, role="viewer",
            permissions=["project.view", "reports.view"],
        )


class AvailableReportsTests(ReportBaseTestCase):
    def test_list_available_reports(self):
        self.client.force_login(self.admin)
        r = self.client.get(f"/api/v1/reports/{self.project.id}/available/")
        self.assertEqual(r.status_code, 200)
        keys = [rpt["key"] for rpt in r.json()]
        self.assertIn("progress", keys)
        self.assertIn("schedule", keys)
        self.assertIn("financial", keys)
        self.assertEqual(len(r.json()[0]["formats"]), 4)

    def test_viewer_with_reports_view_can_list(self):
        self.client.force_login(self.viewer)
        r = self.client.get(f"/api/v1/reports/{self.project.id}/available/")
        self.assertEqual(r.status_code, 200)

    def test_viewer_without_reports_view_denied(self):
        """User with only project.view (no reports.view) should be denied."""
        no_report_role = SystemRole.objects.create(name="NoReport", permissions=[])
        no_report_user = User.objects.create_user(
            username="noreport", password="pass123",
            organisation=self.org, system_role=no_report_role,
        )
        ProjectMembership.objects.create(
            project=self.project, user=no_report_user, role="viewer",
            permissions=["project.view"],  # No reports.view
        )
        self.client.force_login(no_report_user)
        r = self.client.get(f"/api/v1/reports/{self.project.id}/available/")
        self.assertEqual(r.status_code, 403)


class ExportGenerationTests(ReportBaseTestCase):
    def test_generate_csv_export(self):
        self.client.force_login(self.admin)
        r = self.client.post(
            f"/api/v1/reports/{self.project.id}/generate/",
            {"report_key": "progress", "format": "csv"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"], "text/csv")
        self.assertIn("attachment", r["Content-Disposition"])

    def test_generate_xlsx_export(self):
        self.client.force_login(self.admin)
        r = self.client.post(
            f"/api/v1/reports/{self.project.id}/generate/",
            {"report_key": "schedule", "format": "xlsx"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn("spreadsheetml", r["Content-Type"])

    def test_generate_pdf_export(self):
        self.client.force_login(self.admin)
        r = self.client.post(
            f"/api/v1/reports/{self.project.id}/generate/",
            {"report_key": "risk", "format": "pdf"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"], "application/pdf")

    def test_generate_docx_export(self):
        self.client.force_login(self.admin)
        r = self.client.post(
            f"/api/v1/reports/{self.project.id}/generate/",
            {"report_key": "meetings", "format": "docx"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn("wordprocessingml", r["Content-Type"])

    def test_invalid_report_key_rejected(self):
        self.client.force_login(self.admin)
        r = self.client.post(
            f"/api/v1/reports/{self.project.id}/generate/",
            {"report_key": "nonexistent", "format": "csv"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)

    def test_viewer_cannot_export(self):
        """Viewer has reports.view but not reports.export."""
        self.client.force_login(self.viewer)
        r = self.client.post(
            f"/api/v1/reports/{self.project.id}/generate/",
            {"report_key": "progress", "format": "csv"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 403)


class ExportHistoryTests(ReportBaseTestCase):
    def test_export_history_empty(self):
        self.client.force_login(self.admin)
        r = self.client.get(f"/api/v1/reports/{self.project.id}/history/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), 0)

    def test_export_creates_history_entry(self):
        self.client.force_login(self.admin)
        self.client.post(
            f"/api/v1/reports/{self.project.id}/generate/",
            {"report_key": "progress", "format": "csv"},
            content_type="application/json",
        )
        r = self.client.get(f"/api/v1/reports/{self.project.id}/history/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), 1)
        self.assertEqual(r.json()[0]["report_key"], "progress")
        self.assertEqual(r.json()[0]["format"], "csv")
        self.assertEqual(r.json()[0]["status"], "completed")

    def test_redownload_export(self):
        """Generated exports can be re-downloaded from history."""
        self.client.force_login(self.admin)
        self.client.post(
            f"/api/v1/reports/{self.project.id}/generate/",
            {"report_key": "progress", "format": "csv"},
            content_type="application/json",
        )
        history = self.client.get(f"/api/v1/reports/{self.project.id}/history/").json()
        export_id = history[0]["id"]
        r = self.client.get(f"/api/v1/reports/{self.project.id}/history/{export_id}/download/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("attachment", r["Content-Disposition"])

    def test_redownload_denied_without_reports_view(self):
        """User without reports.view cannot re-download."""
        self.client.force_login(self.admin)
        self.client.post(
            f"/api/v1/reports/{self.project.id}/generate/",
            {"report_key": "progress", "format": "csv"},
            content_type="application/json",
        )
        history = self.client.get(f"/api/v1/reports/{self.project.id}/history/").json()
        export_id = history[0]["id"]
        no_report_role = SystemRole.objects.create(name="NoReport3", permissions=[])
        no_report_user = User.objects.create_user(
            username="noreport3", password="pass123",
            organisation=self.org, system_role=no_report_role,
        )
        ProjectMembership.objects.create(
            project=self.project, user=no_report_user, role="viewer",
            permissions=["project.view"],
        )
        self.client.force_login(no_report_user)
        r = self.client.get(f"/api/v1/reports/{self.project.id}/history/{export_id}/download/")
        self.assertEqual(r.status_code, 403)

    def test_viewer_can_see_history(self):
        """Viewer with reports.view can see export history."""
        self.client.force_login(self.viewer)
        r = self.client.get(f"/api/v1/reports/{self.project.id}/history/")
        self.assertEqual(r.status_code, 200)

    def test_viewer_without_reports_view_denied_history(self):
        no_report_role = SystemRole.objects.create(name="NoReport2", permissions=[])
        no_report_user = User.objects.create_user(
            username="noreport2", password="pass123",
            organisation=self.org, system_role=no_report_role,
        )
        ProjectMembership.objects.create(
            project=self.project, user=no_report_user, role="viewer",
            permissions=["project.view"],
        )
        self.client.force_login(no_report_user)
        r = self.client.get(f"/api/v1/reports/{self.project.id}/history/")
        self.assertEqual(r.status_code, 403)
