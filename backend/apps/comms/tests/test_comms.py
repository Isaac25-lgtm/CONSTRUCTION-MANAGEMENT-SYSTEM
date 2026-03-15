"""Tests for communications: Meeting, MeetingAction, ChatMessage."""
from django.test import TestCase
from apps.accounts.models import User, Organisation, SystemRole
from apps.projects.models import Project
from apps.comms.models import Meeting


class CommsBaseTestCase(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")
        self.admin_role = SystemRole.objects.create(name="Admin", permissions=["admin.full_access"])
        self.admin = User.objects.create_user(
            username="admin", password="pass123",
            organisation=self.org, system_role=self.admin_role, is_staff=True,
        )
        self.project = Project.objects.create(
            name="Comms Test", project_type="residential",
            contract_type="lump_sum", organisation=self.org,
        )


class MeetingTests(CommsBaseTestCase):
    def test_create_meeting(self):
        self.client.force_login(self.admin)
        r = self.client.post(f"/api/v1/comms/{self.project.id}/meetings/",
            {
                "title": "Weekly Progress",
                "meeting_type": "progress",
                "meeting_date": "2026-03-14",
                "location": "Site Office",
            },
            content_type="application/json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["title"], "Weekly Progress")
        self.assertEqual(r.json()["meeting_type_display"], "Progress Meeting")

    def test_create_meeting_action(self):
        meeting = Meeting.objects.create(
            project=self.project, title="Progress Meeting",
            meeting_type="progress", meeting_date="2026-03-14",
        )
        self.client.force_login(self.admin)
        r = self.client.post(
            f"/api/v1/comms/{self.project.id}/meetings/{meeting.id}/actions/",
            {
                "description": "Submit revised drawings",
                "due_date": "2026-03-21",
            },
            content_type="application/json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["description"], "Submit revised drawings")
        self.assertEqual(r.json()["status"], "open")


class ChatMessageTests(CommsBaseTestCase):
    def test_post_chat_message(self):
        self.client.force_login(self.admin)
        r = self.client.post(f"/api/v1/comms/{self.project.id}/chat/",
            {"message": "Hello team, concrete delivery confirmed."},
            content_type="application/json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["message"], "Hello team, concrete delivery confirmed.")

    def test_list_chat_messages(self):
        self.client.force_login(self.admin)
        # Post two messages
        self.client.post(f"/api/v1/comms/{self.project.id}/chat/",
            {"message": "First message"}, content_type="application/json")
        self.client.post(f"/api/v1/comms/{self.project.id}/chat/",
            {"message": "Second message"}, content_type="application/json")
        # List
        r = self.client.get(f"/api/v1/comms/{self.project.id}/chat/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), 2)


class UnauthenticatedTests(CommsBaseTestCase):
    def test_denied(self):
        for url in [
            f"/api/v1/comms/{self.project.id}/meetings/",
            f"/api/v1/comms/{self.project.id}/chat/",
        ]:
            self.assertEqual(self.client.get(url).status_code, 403)
