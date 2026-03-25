"""Tests for project CRUD, setup engine, and project code generation."""
from django.test import TestCase
from django.urls import reverse

from apps.accounts.models import User, Organisation, SystemRole
from apps.projects.models import Project, ProjectMembership
from apps.projects.setup import ProjectSetupConfig, initialize_project


class ProjectCodeGenerationTests(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")

    def test_residential_project_gets_res_prefix(self):
        p = Project.objects.create(
            name="Test House", project_type="residential",
            contract_type="lump_sum", organisation=self.org,
        )
        self.assertTrue(p.code.startswith("BP-RES-"))

    def test_road_project_gets_rd_prefix(self):
        p = Project.objects.create(
            name="Test Road", project_type="road",
            contract_type="admeasure", organisation=self.org,
        )
        self.assertTrue(p.code.startswith("BP-RD-"))

    def test_sequential_numbering(self):
        p1 = Project.objects.create(
            name="Road 1", project_type="road",
            contract_type="lump_sum", organisation=self.org,
        )
        p2 = Project.objects.create(
            name="Road 2", project_type="road",
            contract_type="lump_sum", organisation=self.org,
        )
        self.assertEqual(p1.code, "BP-RD-001")
        self.assertEqual(p2.code, "BP-RD-002")

    def test_code_is_unique(self):
        p1 = Project.objects.create(
            name="P1", project_type="commercial",
            contract_type="lump_sum", organisation=self.org,
        )
        p2 = Project.objects.create(
            name="P2", project_type="commercial",
            contract_type="lump_sum", organisation=self.org,
        )
        self.assertNotEqual(p1.code, p2.code)


class ProjectSetupEngineTests(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")

    def test_residential_project_gets_phases(self):
        p = Project.objects.create(
            name="House", project_type="residential",
            contract_type="lump_sum", organisation=self.org,
        )
        config = initialize_project(p)
        self.assertTrue(p.setup_complete)
        self.assertGreater(len(config.phase_templates), 5)
        self.assertFalse(config.has_design_phase)

    def test_design_build_includes_design_phases(self):
        p = Project.objects.create(
            name="D&B Office", project_type="commercial",
            contract_type="design_build", organisation=self.org,
        )
        config = initialize_project(p)
        self.assertTrue(config.has_design_phase)
        phase_ids = [ph["id"] for ph in config.phase_templates]
        self.assertIn("D1", phase_ids)
        self.assertIn("D2", phase_ids)

    def test_turnkey_includes_design_phases(self):
        p = Project.objects.create(
            name="Turnkey", project_type="bridge",
            contract_type="turnkey", organisation=self.org,
        )
        config = initialize_project(p)
        self.assertTrue(config.has_design_phase)
        milestones = config.milestone_templates
        self.assertIn("Design Concept Approved", [m["name"] for m in milestones])

    def test_milestones_match_project_type(self):
        p = Project.objects.create(
            name="Road", project_type="road",
            contract_type="admeasure", organisation=self.org,
        )
        config = initialize_project(p)
        milestone_names = [m["name"] for m in config.milestone_templates]
        self.assertIn("Earthworks Complete", milestone_names)
        self.assertIn("Surfacing Complete", milestone_names)

        by_name = {m["name"]: m["task_code"] for m in config.milestone_templates}
        self.assertEqual(by_name["Right of Way Acquired"], "A3")
        self.assertEqual(by_name["Sub-base Complete"], "D1")

    def test_water_treatment_project_gets_specific_milestone_mapping(self):
        p = Project.objects.create(
            name="Water Plant", project_type="water_treatment",
            contract_type="lump_sum", organisation=self.org,
        )
        config = initialize_project(p)
        by_name = {m["name"]: m["task_code"] for m in config.milestone_templates}
        self.assertEqual(by_name["Hydraulic Testing Passed"], "G1")
        self.assertEqual(by_name["Operator Training Complete"], "G")

    def test_custom_project_uses_generic_task_code_milestones(self):
        p = Project.objects.create(
            name="Generic Job", project_type="custom",
            contract_type="lump_sum", organisation=self.org,
        )
        config = initialize_project(p)
        by_name = {m["name"]: m["task_code"] for m in config.milestone_templates}
        self.assertEqual(by_name["Main Structure Complete"], "C")
        self.assertEqual(by_name["Practical Completion"], "G")

    def test_workspace_modules_set(self):
        p = Project.objects.create(
            name="Any", project_type="school",
            contract_type="lump_sum", organisation=self.org,
        )
        config = initialize_project(p)
        self.assertIn("schedule", config.workspace_modules)
        self.assertIn("procurement", config.workspace_modules)


class ProjectCRUDTests(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")
        self.mgmt_role = SystemRole.objects.create(
            name="Management",
            permissions=["projects.create", "projects.view_all"],
        )
        self.user = User.objects.create_user(
            username="mgr", password="pass123",
            organisation=self.org, system_role=self.mgmt_role,
        )

    def test_create_project_returns_code(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("project-list"),
            {
                "name": "New Building",
                "project_type": "commercial",
                "contract_type": "lump_sum",
                "location": "Kampala",
                "budget": 1000000,
                "start_date": "2026-06-01",
                "end_date": "2027-06-01",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertTrue(data["code"].startswith("BP-COM-"))
        self.assertTrue(data["setup_complete"])

    def test_create_project_runs_setup_engine(self):
        self.client.force_login(self.user)
        self.client.post(
            reverse("project-list"),
            {
                "name": "Hospital",
                "project_type": "hospital",
                "contract_type": "lump_sum",
                "location": "Gulu",
            },
            content_type="application/json",
        )
        proj = Project.objects.get(name="Hospital")
        self.assertTrue(proj.setup_complete)
        self.assertTrue(
            ProjectSetupConfig.objects.filter(project=proj).exists()
        )

    def test_archive_project(self):
        self.client.force_login(self.user)
        # Create first
        resp = self.client.post(
            reverse("project-list"),
            {"name": "ToArchive", "project_type": "road", "contract_type": "lump_sum"},
            content_type="application/json",
        )
        pid = resp.json()["id"]
        # Archive
        resp2 = self.client.post(
            reverse("project-archive", kwargs={"pk": pid}),
        )
        self.assertEqual(resp2.status_code, 200)
        proj = Project.objects.get(pk=pid)
        self.assertEqual(proj.status, "cancelled")
