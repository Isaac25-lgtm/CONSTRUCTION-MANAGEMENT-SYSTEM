"""Tests for AI: permissions, error handling, provider, job lifecycle."""
import os
from unittest.mock import patch

from django.test import TestCase

from apps.accounts.models import Organisation, SystemRole, User
from apps.ai.models import AIRequestLog, AsyncJob
from apps.ai.services.provider import StubProvider, generate_text, get_provider
from apps.projects.models import Project, ProjectMembership


class AsyncJobModelTests(TestCase):
    def test_create_and_transition(self):
        org = Organisation.objects.create(name="Test Org")
        role = SystemRole.objects.create(name="Admin", permissions=["admin.full_access"])
        user = User.objects.create_user(username="admin", password="pass", organisation=org, system_role=role)
        project = Project.objects.create(name="Test", project_type="residential", contract_type="lump_sum", organisation=org)

        job = AsyncJob.objects.create(job_type="ai_narrative", project=project, initiated_by=user)
        self.assertEqual(job.status, "pending")

        job.mark_running()
        self.assertEqual(job.status, "running")
        self.assertIsNotNone(job.started_at)

        job.mark_completed(output="Test narrative text")
        self.assertEqual(job.status, "completed")
        self.assertEqual(job.output_reference, "Test narrative text")

    def test_mark_failed(self):
        job = AsyncJob.objects.create(job_type="ai_copilot")
        job.mark_failed(error="API timeout")
        self.assertEqual(job.status, "failed")
        self.assertEqual(job.error_message, "API timeout")


class ProviderTests(TestCase):
    def test_stub_provider(self):
        provider = get_provider("stub")
        self.assertIsInstance(provider, StubProvider)
        result = provider.generate("Test prompt")
        self.assertIn("text", result)

    def test_generate_text_with_stub(self):
        result = generate_text("Hello", provider_name="stub")
        self.assertIn("text", result)
        self.assertEqual(result["provider"], "stub")

    def test_unknown_provider_raises(self):
        with self.assertRaises(ValueError):
            get_provider("nonexistent_provider")


class AIPermissionTests(TestCase):
    """Test that AI endpoints enforce ai.use and ai.history permissions."""

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
        self.ai_user = User.objects.create_user(
            username="engineer", password="pass123",
            organisation=self.org, system_role=self.viewer_role,
        )
        self.project = Project.objects.create(
            name="AI Test", project_type="residential",
            contract_type="lump_sum", organisation=self.org,
        )
        # Viewer: project.view only -- NO ai.use
        ProjectMembership.objects.create(
            project=self.project, user=self.viewer, role="viewer",
            permissions=["project.view"],
        )
        # Engineer: project.view + ai.use but NOT ai.history
        ProjectMembership.objects.create(
            project=self.project, user=self.ai_user, role="engineer",
            permissions=["project.view", "schedule.view", "budget.view", "ai.use"],
        )

    @patch.dict(os.environ, {"AI_PROVIDER": "stub"})
    def test_viewer_without_ai_use_denied_narrative(self):
        self.client.force_login(self.viewer)
        r = self.client.post(f"/api/v1/ai/{self.project.id}/narrative/")
        self.assertEqual(r.status_code, 403)

    @patch.dict(os.environ, {"AI_PROVIDER": "stub"})
    def test_viewer_without_ai_use_denied_copilot(self):
        self.client.force_login(self.viewer)
        r = self.client.post(
            f"/api/v1/ai/{self.project.id}/copilot/",
            {"question": "What is CPI?"}, content_type="application/json",
        )
        self.assertEqual(r.status_code, 403)

    @patch.dict(os.environ, {"AI_PROVIDER": "stub"})
    def test_user_with_ai_use_can_generate(self):
        self.client.force_login(self.ai_user)
        r = self.client.post(f"/api/v1/ai/{self.project.id}/narrative/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("text", r.json())
        # Audit log created
        self.assertEqual(AIRequestLog.objects.filter(project=self.project).count(), 1)

    def test_user_with_ai_use_can_load_project_intelligence(self):
        self.client.force_login(self.ai_user)
        r = self.client.get(f"/api/v1/ai/{self.project.id}/intelligence/")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn("health", data)
        self.assertIn("recommended_actions", data)
        self.assertIn("charts", data)
        self.assertIn("suggested_questions", data)

    @patch.dict(os.environ, {"AI_PROVIDER": "stub"})
    def test_user_with_ai_use_can_copilot(self):
        self.client.force_login(self.ai_user)
        r = self.client.post(
            f"/api/v1/ai/{self.project.id}/copilot/",
            {"question": "What is the project status?"}, content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)

    def test_viewer_denied_ai_history(self):
        self.client.force_login(self.viewer)
        r = self.client.get(f"/api/v1/ai/{self.project.id}/history/")
        self.assertEqual(r.status_code, 403)

    def test_user_without_ai_history_denied(self):
        """Engineer has ai.use but NOT ai.history."""
        self.client.force_login(self.ai_user)
        r = self.client.get(f"/api/v1/ai/{self.project.id}/history/")
        self.assertEqual(r.status_code, 403)

    def test_admin_can_see_ai_history(self):
        self.client.force_login(self.admin)
        r = self.client.get(f"/api/v1/ai/{self.project.id}/history/")
        self.assertEqual(r.status_code, 200)


class AIErrorHandlingTests(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")
        self.role = SystemRole.objects.create(name="Admin", permissions=["admin.full_access"])
        self.admin = User.objects.create_user(
            username="admin", password="pass123",
            organisation=self.org, system_role=self.role, is_staff=True,
        )
        self.project = Project.objects.create(
            name="Error Test", project_type="residential",
            contract_type="lump_sum", organisation=self.org,
        )

    def test_copilot_empty_question_returns_400(self):
        self.client.force_login(self.admin)
        r = self.client.post(
            f"/api/v1/ai/{self.project.id}/copilot/",
            {"question": ""}, content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)

    def test_copilot_too_long_question_returns_400(self):
        self.client.force_login(self.admin)
        r = self.client.post(
            f"/api/v1/ai/{self.project.id}/copilot/",
            {"question": "x" * 501}, content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)

    def test_report_draft_bad_key_returns_400(self):
        self.client.force_login(self.admin)
        r = self.client.post(
            f"/api/v1/ai/{self.project.id}/report-draft/",
            {"report_key": "nonexistent_key"}, content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)

    def test_report_draft_empty_key_returns_400(self):
        self.client.force_login(self.admin)
        r = self.client.post(
            f"/api/v1/ai/{self.project.id}/report-draft/",
            {"report_key": ""}, content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)

    def test_unauthenticated_denied(self):
        r = self.client.post(f"/api/v1/ai/{self.project.id}/narrative/")
        self.assertEqual(r.status_code, 403)

    def test_job_status_scoped_to_initiator(self):
        self.client.force_login(self.admin)
        job = AsyncJob.objects.create(
            job_type="ai_narrative", project=self.project, initiated_by=self.admin,
        )
        r = self.client.get(f"/api/v1/ai/jobs/{job.id}/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "pending")

    @patch("apps.ai.services.provider.GeminiProvider.generate", side_effect=ValueError("GEMINI_API_KEY not set"))
    def test_missing_gemini_key_returns_503(self, _mock_generate):
        self.client.force_login(self.admin)
        with patch.dict(os.environ, {"AI_PROVIDER": "gemini"}, clear=False):
            r = self.client.post(f"/api/v1/ai/{self.project.id}/narrative/")
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.json()["detail"], "AI service not configured.")


class ReadinessTests(TestCase):
    def test_health_endpoint(self):
        r = self.client.get("/api/health/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "ok")

    def test_readiness_endpoint_checks_database(self):
        """Readiness returns checks dict. Database should be true in test env.
        Redis may or may not be available -- accept 200 or 503."""
        r = self.client.get("/api/ready/")
        self.assertIn(r.status_code, [200, 503])
        data = r.json()
        self.assertIn("checks", data)
        self.assertTrue(data["checks"]["database"])
        # Status reflects overall health
        self.assertIn(data["status"], ["ready", "degraded"])
