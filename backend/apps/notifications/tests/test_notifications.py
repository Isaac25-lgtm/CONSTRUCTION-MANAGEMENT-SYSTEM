"""Tests for notifications: list, mark read, mark all read, unread count."""
from django.test import TestCase
from apps.accounts.models import User, Organisation, SystemRole
from apps.projects.models import Project
from apps.notifications.models import Notification


class NotificationsBaseTestCase(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")
        self.admin_role = SystemRole.objects.create(name="Admin", permissions=["admin.full_access"])
        self.admin = User.objects.create_user(
            username="admin", password="pass123",
            organisation=self.org, system_role=self.admin_role, is_staff=True,
        )
        self.project = Project.objects.create(
            name="Notification Test", project_type="residential",
            contract_type="lump_sum", organisation=self.org,
        )
        self.notif1 = Notification.objects.create(
            user=self.admin, project=self.project,
            title="Task assigned", message="You were assigned a task.",
            level="info",
        )
        self.notif2 = Notification.objects.create(
            user=self.admin, project=self.project,
            title="RFI overdue", message="RFI-001 is overdue.",
            level="warning",
        )


class NotificationListTests(NotificationsBaseTestCase):
    def test_list_notifications_user_scoped(self):
        self.client.force_login(self.admin)
        r = self.client.get("/api/v1/notifications/notifications/")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(len(data["results"]), 2)
        self.assertEqual(data["unread_count"], 2)

    def test_unread_count(self):
        # Mark one as read directly
        self.notif1.is_read = True
        self.notif1.save()
        self.client.force_login(self.admin)
        r = self.client.get("/api/v1/notifications/notifications/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["unread_count"], 1)


class NotificationMarkReadTests(NotificationsBaseTestCase):
    def test_mark_read(self):
        self.client.force_login(self.admin)
        r = self.client.post(f"/api/v1/notifications/notifications/{self.notif1.id}/read/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["is_read"])
        self.assertIsNotNone(r.json()["read_at"])

    def test_mark_all_read(self):
        self.client.force_login(self.admin)
        r = self.client.post("/api/v1/notifications/notifications/read-all/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["marked_read"], 2)
        # Verify all are read
        r2 = self.client.get("/api/v1/notifications/notifications/")
        self.assertEqual(r2.json()["unread_count"], 0)


class UnauthenticatedTests(NotificationsBaseTestCase):
    def test_denied(self):
        r = self.client.get("/api/v1/notifications/notifications/")
        self.assertEqual(r.status_code, 403)
