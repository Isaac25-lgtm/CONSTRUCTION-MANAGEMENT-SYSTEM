"""Tests for project access control: list visibility, detail denial, membership."""
from django.test import TestCase
from django.urls import reverse

from apps.accounts.models import User, Organisation, SystemRole, DEFAULT_PROJECT_ROLE_PERMISSIONS
from apps.projects.models import Project, ProjectMembership


class ProjectAccessTests(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")
        self.admin_role = SystemRole.objects.create(
            name="Admin", permissions=["admin.full_access"]
        )
        self.mgmt_role = SystemRole.objects.create(
            name="Management",
            permissions=["projects.create", "projects.view_all", "reports.view_cross_project"],
        )
        self.standard_role = SystemRole.objects.create(
            name="Standard", permissions=[]
        )
        self.viewer_role = SystemRole.objects.create(
            name="Viewer", permissions=[]
        )

        self.admin = User.objects.create_user(
            username="admin", password="pass123",
            organisation=self.org, system_role=self.admin_role, is_staff=True,
        )
        self.manager = User.objects.create_user(
            username="manager", password="pass123",
            organisation=self.org, system_role=self.mgmt_role,
        )
        self.engineer = User.objects.create_user(
            username="engineer", password="pass123",
            organisation=self.org, system_role=self.standard_role,
        )
        self.viewer = User.objects.create_user(
            username="viewer", password="pass123",
            organisation=self.org, system_role=self.viewer_role,
        )

        self.project1 = Project.objects.create(
            name="Project Alpha", project_type="residential",
            contract_type="lump_sum", organisation=self.org,
        )
        self.project2 = Project.objects.create(
            name="Project Beta", project_type="road",
            contract_type="admeasure", organisation=self.org,
        )

        ProjectMembership.objects.create(
            project=self.project1, user=self.engineer, role="engineer",
            permissions=DEFAULT_PROJECT_ROLE_PERMISSIONS["engineer"],
        )

    def _get_project_names(self, response):
        """Extract project names from paginated response."""
        return [p["name"] for p in response.json()["results"]]

    # -- Project list visibility (paginated) --

    def test_admin_sees_all_projects(self):
        self.client.force_login(self.admin)
        response = self.client.get(reverse("project-list"))
        self.assertEqual(response.status_code, 200)
        names = self._get_project_names(response)
        self.assertIn("Project Alpha", names)
        self.assertIn("Project Beta", names)

    def test_management_sees_all_projects(self):
        self.client.force_login(self.manager)
        response = self.client.get(reverse("project-list"))
        names = self._get_project_names(response)
        self.assertEqual(len(names), 2)

    def test_engineer_sees_only_assigned_projects(self):
        self.client.force_login(self.engineer)
        response = self.client.get(reverse("project-list"))
        names = self._get_project_names(response)
        self.assertEqual(names, ["Project Alpha"])

    def test_viewer_with_no_memberships_sees_nothing(self):
        self.client.force_login(self.viewer)
        response = self.client.get(reverse("project-list"))
        self.assertEqual(response.json()["results"], [])

    # -- Project detail access --

    def test_admin_can_view_any_project(self):
        self.client.force_login(self.admin)
        response = self.client.get(
            reverse("project-detail", kwargs={"pk": self.project2.pk})
        )
        self.assertEqual(response.status_code, 200)

    def test_engineer_can_view_assigned_project(self):
        self.client.force_login(self.engineer)
        response = self.client.get(
            reverse("project-detail", kwargs={"pk": self.project1.pk})
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["user_role"], "engineer")
        self.assertIn("schedule.view", data["user_permissions"])

    def test_engineer_cannot_view_unassigned_project(self):
        self.client.force_login(self.engineer)
        response = self.client.get(
            reverse("project-detail", kwargs={"pk": self.project2.pk})
        )
        self.assertEqual(response.status_code, 404)

    # -- Project creation --

    def test_management_can_create_project(self):
        self.client.force_login(self.manager)
        response = self.client.post(
            reverse("project-list"),
            {
                "name": "New Project",
                "location": "Kampala",
                "project_manager_name": "Eng. Sarah Nakamya",
                "project_type": "commercial",
                "contract_type": "lump_sum",
                "budget": 1000000,
                "start_date": "2026-06-01",
                "end_date": "2027-06-01",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertTrue(data["code"].startswith("BP-COM-"))
        proj = Project.objects.get(name="New Project")
        self.assertTrue(
            ProjectMembership.objects.filter(project=proj, user=self.manager, role="manager").exists()
        )

    def test_standard_user_cannot_create_project(self):
        self.client.force_login(self.engineer)
        response = self.client.post(
            reverse("project-list"),
            {
                "name": "Forbidden",
                "location": "Mukono",
                "project_manager_name": "Eng. Peter Kato",
                "project_type": "road",
                "contract_type": "lump_sum",
                "budget": 1000000,
                "start_date": "2026-06-01",
                "end_date": "2026-12-01",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_list_projects(self):
        response = self.client.get(reverse("project-list"))
        self.assertEqual(response.status_code, 403)

    # -- Membership endpoints --

    def test_admin_can_list_project_members(self):
        self.client.force_login(self.admin)
        response = self.client.get(
            reverse("project-members", kwargs={"pk": self.project1.pk})
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_manager_can_update_membership_role(self):
        """PATCH membership to change role and permissions."""
        # Give manager membership with manage_members perm
        membership = ProjectMembership.objects.create(
            project=self.project1, user=self.manager, role="manager",
            permissions=DEFAULT_PROJECT_ROLE_PERMISSIONS["manager"],
        )
        self.client.force_login(self.manager)
        eng_membership = self.project1.memberships.get(user=self.engineer)
        response = self.client.patch(
            reverse("project-update-member", kwargs={
                "pk": self.project1.pk,
                "membership_id": eng_membership.pk,
            }),
            {"role": "supervisor"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        eng_membership.refresh_from_db()
        self.assertEqual(eng_membership.role, "supervisor")

    def test_viewer_cannot_update_membership(self):
        """User without manage_members perm cannot update."""
        ProjectMembership.objects.create(
            project=self.project1, user=self.viewer, role="viewer",
            permissions=DEFAULT_PROJECT_ROLE_PERMISSIONS["viewer"],
        )
        self.client.force_login(self.viewer)
        eng_membership = self.project1.memberships.get(user=self.engineer)
        response = self.client.patch(
            reverse("project-update-member", kwargs={
                "pk": self.project1.pk,
                "membership_id": eng_membership.pk,
            }),
            {"role": "manager"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    # -- Per-project permission flags in list API --

    def test_admin_gets_can_edit_true_on_all_projects(self):
        """Admin should see can_edit=True on every project in the list."""
        self.client.force_login(self.admin)
        response = self.client.get(reverse("project-list"))
        for proj in response.json()["results"]:
            self.assertTrue(proj["can_edit"], f"{proj['name']} should be editable by admin")

    def test_engineer_gets_can_edit_false(self):
        """Engineer role does not include project.edit, so can_edit should be False."""
        self.client.force_login(self.engineer)
        response = self.client.get(reverse("project-list"))
        results = response.json()["results"]
        for proj in results:
            self.assertFalse(proj["can_edit"])

    def test_manager_with_membership_gets_can_edit_true(self):
        """Manager role on a project should see can_edit=True."""
        ProjectMembership.objects.create(
            project=self.project1, user=self.manager, role="manager",
            permissions=DEFAULT_PROJECT_ROLE_PERMISSIONS["manager"],
        )
        self.client.force_login(self.manager)
        response = self.client.get(reverse("project-list"))
        results = response.json()["results"]
        proj1_data = next(p for p in results if p["name"] == "Project Alpha")
        self.assertTrue(proj1_data["can_edit"])

    def test_can_archive_false_for_cancelled_project(self):
        """Cancelled projects should show can_archive=False even for admin."""
        self.project1.status = "cancelled"
        self.project1.save(update_fields=["status"])
        self.client.force_login(self.admin)
        response = self.client.get(reverse("project-list"))
        results = response.json()["results"]
        proj1_data = next(p for p in results if p["name"] == "Project Alpha")
        self.assertFalse(proj1_data["can_archive"])
