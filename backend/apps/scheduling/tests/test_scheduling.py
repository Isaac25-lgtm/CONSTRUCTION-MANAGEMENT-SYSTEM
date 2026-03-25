"""Tests for scheduling: CPM engine, tasks, milestones, baselines."""
import json
from datetime import date
from datetime import timedelta

from django.test import TestCase
from django.urls import reverse

from apps.accounts.models import User, Organisation, SystemRole, DEFAULT_PROJECT_ROLE_PERMISSIONS
from apps.cost.models import BudgetLine
from apps.projects.models import Project, ProjectMembership
from apps.scheduling.models import ProjectTask, TaskDependency, Milestone, ScheduleBaseline
from apps.scheduling.engine import run_cpm, create_baseline, seed_tasks_from_setup
from apps.projects.setup import initialize_project


class CPMEngineTests(TestCase):
    """Test the CPM calculation engine directly."""

    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")
        self.project = Project.objects.create(
            name="CPM Test", project_type="residential",
            contract_type="lump_sum", organisation=self.org,
        )

    def _make_task(self, code, dur, **kwargs):
        return ProjectTask.objects.create(
            project=self.project, code=code, name=f"Task {code}",
            duration_days=dur, **kwargs,
        )

    def test_simple_sequential_cpm(self):
        """A -> B -> C with durations 5, 10, 3."""
        a = self._make_task("A", 5)
        b = self._make_task("B", 10)
        c = self._make_task("C", 3)
        TaskDependency.objects.create(project=self.project, predecessor=a, successor=b)
        TaskDependency.objects.create(project=self.project, predecessor=b, successor=c)

        result = run_cpm(self.project.id)

        self.assertEqual(result.duration, 18)
        self.assertFalse(result.cycle_detected)

        a.refresh_from_db()
        b.refresh_from_db()
        c.refresh_from_db()

        self.assertEqual(a.early_start, 0)
        self.assertEqual(a.early_finish, 5)
        self.assertEqual(b.early_start, 5)
        self.assertEqual(b.early_finish, 15)
        self.assertEqual(c.early_start, 15)
        self.assertEqual(c.early_finish, 18)

    def test_critical_path_detection(self):
        """Tasks on critical path have float=0."""
        a = self._make_task("A", 5)
        b = self._make_task("B", 10)
        c = self._make_task("C", 3)
        TaskDependency.objects.create(project=self.project, predecessor=a, successor=b)
        TaskDependency.objects.create(project=self.project, predecessor=a, successor=c)

        result = run_cpm(self.project.id)

        b.refresh_from_db()
        c.refresh_from_db()

        self.assertTrue(b.is_critical)
        # C has float because it finishes before B
        self.assertGreater(c.total_float, 0)
        self.assertFalse(c.is_critical)

    def test_parallel_paths(self):
        """Two parallel paths: A->B (15d) and A->C (8d). B is critical."""
        a = self._make_task("A", 5)
        b = self._make_task("B", 10)
        c = self._make_task("C", 3)
        TaskDependency.objects.create(project=self.project, predecessor=a, successor=b)
        TaskDependency.objects.create(project=self.project, predecessor=a, successor=c)

        result = run_cpm(self.project.id)
        self.assertEqual(result.duration, 15)
        self.assertIn("B", result.critical_path)

    def test_empty_project(self):
        result = run_cpm(self.project.id)
        self.assertEqual(result.duration, 0)
        self.assertEqual(result.critical_path, [])

    def test_cycle_detection(self):
        """Cycles should be detected gracefully (not crash)."""
        a = self._make_task("A", 5)
        b = self._make_task("B", 5)
        TaskDependency.objects.create(project=self.project, predecessor=a, successor=b)
        TaskDependency.objects.create(project=self.project, predecessor=b, successor=a)

        result = run_cpm(self.project.id)
        self.assertTrue(result.cycle_detected)

    def test_ss_dependency(self):
        """SS: successor starts when predecessor starts + lag."""
        a = self._make_task("A", 10)
        b = self._make_task("B", 5)
        TaskDependency.objects.create(
            project=self.project, predecessor=a, successor=b,
            dependency_type="SS", lag_days=2,
        )
        result = run_cpm(self.project.id)
        b.refresh_from_db()
        # B starts at A.ES + lag = 0 + 2 = 2
        self.assertEqual(b.early_start, 2)
        self.assertEqual(b.early_finish, 7)

    def test_ff_dependency(self):
        """FF: successor finishes when predecessor finishes + lag."""
        a = self._make_task("A", 10)
        b = self._make_task("B", 5)
        TaskDependency.objects.create(
            project=self.project, predecessor=a, successor=b,
            dependency_type="FF", lag_days=0,
        )
        result = run_cpm(self.project.id)
        b.refresh_from_db()
        # B.EF >= A.EF + 0 = 10, so B.ES = 10 - 5 = 5
        self.assertEqual(b.early_start, 5)
        self.assertEqual(b.early_finish, 10)

    def test_sf_dependency(self):
        """SF: successor finish >= predecessor start + lag."""
        a = self._make_task("A", 10)
        b = self._make_task("B", 5)
        TaskDependency.objects.create(
            project=self.project, predecessor=a, successor=b,
            dependency_type="SF", lag_days=3,
        )
        result = run_cpm(self.project.id)
        b.refresh_from_db()
        # B.EF >= A.ES + lag = 0 + 3 = 3, B.ES = max(0, 3 - 5) = 0
        self.assertEqual(b.early_start, 0)
        self.assertEqual(b.early_finish, 5)

    def test_mixed_dependency_network(self):
        """Mixed FS + SS in one network."""
        a = self._make_task("A", 5)
        b = self._make_task("B", 10)
        c = self._make_task("C", 3)
        TaskDependency.objects.create(project=self.project, predecessor=a, successor=b, dependency_type="FS")
        TaskDependency.objects.create(project=self.project, predecessor=a, successor=c, dependency_type="SS", lag_days=1)
        result = run_cpm(self.project.id)
        b.refresh_from_db()
        c.refresh_from_db()
        # B starts after A finishes: ES=5, EF=15
        self.assertEqual(b.early_start, 5)
        # C starts when A starts + 1: ES=1, EF=4
        self.assertEqual(c.early_start, 1)
        self.assertEqual(result.duration, 15)


class CycleRejectionAPITests(TestCase):
    """Test that cycle-causing dependencies are rejected at write time."""

    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")
        self.role = SystemRole.objects.create(name="Admin", permissions=["admin.full_access"])
        self.user = User.objects.create_user(
            username="admin", password="pass123",
            organisation=self.org, system_role=self.role, is_staff=True,
        )
        self.project = Project.objects.create(
            name="Cycle Test", project_type="residential",
            contract_type="lump_sum", organisation=self.org,
        )
        self.a = ProjectTask.objects.create(project=self.project, code="A", name="A", duration_days=5)
        self.b = ProjectTask.objects.create(project=self.project, code="B", name="B", duration_days=5)
        TaskDependency.objects.create(project=self.project, predecessor=self.a, successor=self.b)

    def test_cycle_creating_dependency_rejected(self):
        """B -> A would create a cycle since A -> B already exists."""
        self.client.force_login(self.user)
        response = self.client.post(
            f"/api/v1/scheduling/{self.project.id}/dependencies/",
            {"predecessor": str(self.b.id), "successor": str(self.a.id)},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("cycle", response.json()["detail"].lower())


class TaskAPITests(TestCase):
    """Test task API behavior for manual overrides and schedule maintenance."""

    def setUp(self):
        self.org = Organisation.objects.create(name="Task API Org")
        self.role = SystemRole.objects.create(name="Admin", permissions=["admin.full_access"])
        self.user = User.objects.create_user(
            username="taskadmin",
            password="pass123",
            organisation=self.org,
            system_role=self.role,
        )
        self.project = Project.objects.create(
            name="Task API Project",
            project_type="residential",
            contract_type="lump_sum",
            organisation=self.org,
            start_date="2026-01-01",
        )
        ProjectMembership.objects.create(
            project=self.project,
            user=self.user,
            role="manager",
            permissions=DEFAULT_PROJECT_ROLE_PERMISSIONS["manager"],
        )
        self.task = ProjectTask.objects.create(
            project=self.project,
            code="A",
            name="Task A",
            duration_days=5,
            early_start=0,
            early_finish=5,
            late_start=0,
            late_finish=5,
            total_float=0,
            is_critical=True,
        )
        self.client.force_login(self.user)

    def test_task_patch_rejects_negative_cpm_values(self):
        response = self.client.patch(
            f"/api/v1/scheduling/{self.project.id}/tasks/{self.task.id}/",
            data=json.dumps({"early_start": -1}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("early_start", response.json())

    def test_task_patch_rejects_finish_before_start(self):
        response = self.client.patch(
            f"/api/v1/scheduling/{self.project.id}/tasks/{self.task.id}/",
            data=json.dumps({"early_start": 4, "early_finish": 2}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("early_finish", response.json())

    def test_task_patch_updates_float_and_critical(self):
        response = self.client.patch(
            f"/api/v1/scheduling/{self.project.id}/tasks/{self.task.id}/",
            data=json.dumps(
                {
                    "early_start": 2,
                    "early_finish": 7,
                    "late_start": 6,
                    "late_finish": 11,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["total_float"], 4)
        self.assertFalse(response.json()["is_critical"])

        self.task.refresh_from_db()
        self.assertEqual(self.task.total_float, 4)
        self.assertFalse(self.task.is_critical)

    def test_task_create_accepts_predecessor_codes(self):
        response = self.client.post(
            f"/api/v1/scheduling/{self.project.id}/tasks/",
            data=json.dumps(
                {
                    "code": "B",
                    "name": "Task B",
                    "duration_days": 3,
                    "predecessors": "A",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        successor = ProjectTask.objects.get(project=self.project, code="B")
        self.assertTrue(
            TaskDependency.objects.filter(
                project=self.project,
                predecessor=self.task,
                successor=successor,
            ).exists()
        )
        self.assertEqual(response.json()["predecessor_codes"], ["A"])

    def test_task_create_rejects_unknown_predecessor_codes(self):
        response = self.client.post(
            f"/api/v1/scheduling/{self.project.id}/tasks/",
            data=json.dumps(
                {
                    "code": "B",
                    "name": "Task B",
                    "duration_days": 3,
                    "predecessors": "ZZ",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("predecessors", response.json())

    def test_task_patch_syncs_linked_milestones_and_budget_lines(self):
        milestone = Milestone.objects.create(
            project=self.project,
            name="Task A Complete",
            linked_task=self.task,
            target_date="2026-01-06",
            created_by=self.user,
        )
        budget_line = BudgetLine.objects.create(
            project=self.project,
            linked_task=self.task,
            code="A",
            name="Task A Budget",
            description="Original line",
            budget_amount="100.00",
            created_by=self.user,
        )

        response = self.client.patch(
            f"/api/v1/scheduling/{self.project.id}/tasks/{self.task.id}/",
            data=json.dumps(
                {
                    "code": "A1",
                    "name": "Task A Updated",
                    "description": "Updated description",
                    "budget": "250.00",
                    "early_finish": 9,
                    "late_finish": 9,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

        milestone.refresh_from_db()
        budget_line.refresh_from_db()
        self.assertEqual(str(milestone.target_date), "2026-01-10")
        self.assertEqual(budget_line.code, "A1")
        self.assertEqual(budget_line.name, "Task A Updated")
        self.assertEqual(budget_line.description, "Updated description")
        self.assertEqual(str(budget_line.budget_amount), "250.00")

    def test_task_create_with_budget_bootstraps_budget_line_when_project_has_none(self):
        response = self.client.post(
            f"/api/v1/scheduling/{self.project.id}/tasks/",
            data=json.dumps(
                {
                    "code": "B",
                    "name": "Task B",
                    "duration_days": 3,
                    "budget": "300.00",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        task = ProjectTask.objects.get(project=self.project, code="B")
        line = BudgetLine.objects.get(project=self.project, linked_task=task)
        self.assertEqual(line.code, "B")
        self.assertEqual(line.name, "Task B")
        self.assertEqual(str(line.budget_amount), "300.00")

    def test_milestone_create_with_linked_task_derives_target_date(self):
        response = self.client.post(
            f"/api/v1/scheduling/{self.project.id}/milestones/",
            data=json.dumps(
                {
                    "name": "Derived milestone",
                    "linked_task": str(self.task.id),
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["target_date"], "2026-01-06")

    def test_recalculate_syncs_linked_milestone_target_dates(self):
        self.task.duration_days = 6
        self.task.save(update_fields=["duration_days"])
        milestone = Milestone.objects.create(
            project=self.project,
            name="Task A Complete",
            linked_task=self.task,
            target_date=None,
            created_by=self.user,
        )

        response = self.client.post(f"/api/v1/scheduling/{self.project.id}/recalculate/")
        self.assertEqual(response.status_code, 200)

        milestone.refresh_from_db()
        self.task.refresh_from_db()
        self.assertEqual(
            str(milestone.target_date),
            str(date.fromisoformat(str(self.project.start_date)) + timedelta(days=self.task.early_finish))
        )

    def test_clear_schedule_resets_manual_fields(self):
        self.task.duration_days = 12
        self.task.planned_start = "2026-01-02"
        self.task.planned_end = "2026-01-14"
        self.task.early_start = 1
        self.task.early_finish = 13
        self.task.late_start = 3
        self.task.late_finish = 15
        self.task.total_float = 2
        self.task.is_critical = False
        self.task.save()

        response = self.client.post(f"/api/v1/scheduling/{self.project.id}/clear/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["tasks_cleared"], 1)

        self.task.refresh_from_db()
        self.assertEqual(self.task.duration_days, 0)
        self.assertIsNone(self.task.planned_start)
        self.assertIsNone(self.task.planned_end)
        self.assertEqual(self.task.early_start, 0)
        self.assertEqual(self.task.early_finish, 0)
        self.assertEqual(self.task.late_start, 0)
        self.assertEqual(self.task.late_finish, 0)
        self.assertEqual(self.task.total_float, 0)
        self.assertFalse(self.task.is_critical)

    def test_clear_schedule_clears_linked_milestone_target_dates(self):
        milestone = Milestone.objects.create(
            project=self.project,
            name="Task A Complete",
            linked_task=self.task,
            target_date="2026-01-06",
            created_by=self.user,
        )

        response = self.client.post(f"/api/v1/scheduling/{self.project.id}/clear/")
        self.assertEqual(response.status_code, 200)

        milestone.refresh_from_db()
        self.assertIsNone(milestone.target_date)


class MilestoneQualityTests(TestCase):
    """Test that seeded milestones have linked tasks and target dates."""

    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")

    def test_seeded_milestones_have_linked_tasks(self):
        proj = Project.objects.create(
            name="MS Test", project_type="residential",
            contract_type="lump_sum", organisation=self.org,
            start_date="2026-01-01", end_date="2026-07-01",
        )
        initialize_project(proj)
        seed_tasks_from_setup(proj)
        milestones = Milestone.objects.filter(project=proj)
        self.assertGreater(milestones.count(), 0)
        # At least some milestones should have linked tasks and dates
        linked = milestones.filter(linked_task__isnull=False)
        self.assertGreater(linked.count(), 0)
        dated = milestones.filter(target_date__isnull=False)
        self.assertGreater(dated.count(), 0)

    def test_seeded_road_milestones_link_to_exact_prototype_task_codes(self):
        proj = Project.objects.create(
            name="Road MS Test",
            project_type="road",
            contract_type="lump_sum",
            organisation=self.org,
            start_date="2026-01-01",
            end_date="2027-01-01",
        )
        initialize_project(proj)
        seed_tasks_from_setup(proj)

        milestones = {
            ms.name: ms.linked_task.code if ms.linked_task else None
            for ms in Milestone.objects.filter(project=proj)
        }
        self.assertEqual(milestones["Right of Way Acquired"], "A3")
        self.assertEqual(milestones["Sub-base Complete"], "D1")
        self.assertEqual(milestones["Base Course Complete"], "D2")
        self.assertEqual(milestones["First Coat of Asphalt"], "D3")
        self.assertEqual(milestones["Surfacing Complete"], "D4")


class AutoSeedOnCreateTests(TestCase):
    """Test that creating a project via API auto-seeds schedule records."""

    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")
        self.role = SystemRole.objects.create(
            name="Management",
            permissions=["projects.create", "projects.view_all"],
        )
        self.user = User.objects.create_user(
            username="mgr", password="pass123",
            organisation=self.org, system_role=self.role,
        )

    def test_project_create_seeds_tasks(self):
        self.client.force_login(self.user)
        response = self.client.post(
            "/api/v1/projects/",
            {
                "name": "Auto Seed Test",
                "project_type": "residential",
                "contract_type": "lump_sum",
                "location": "Kampala",
                "project_manager_name": "Jane Manager",
                "start_date": "2026-01-01",
                "end_date": "2026-12-31",
                "budget": "1000000.00",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        proj = Project.objects.get(name="Auto Seed Test")
        self.assertTrue(ProjectTask.objects.filter(project=proj).exists())
        self.assertTrue(TaskDependency.objects.filter(project=proj).exists())
        self.assertTrue(Milestone.objects.filter(project=proj).exists())


class BaselineTests(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")
        self.project = Project.objects.create(
            name="BL Test", project_type="road",
            contract_type="lump_sum", organisation=self.org,
        )
        ProjectTask.objects.create(
            project=self.project, code="A", name="Task A", duration_days=10,
        )

    def test_create_baseline(self):
        bl = create_baseline(self.project.id, "Initial Baseline")
        self.assertEqual(bl.version, 1)
        self.assertTrue(bl.is_active)
        self.assertEqual(bl.snapshots.count(), 1)

    def test_second_baseline_deactivates_first(self):
        bl1 = create_baseline(self.project.id, "First")
        bl2 = create_baseline(self.project.id, "Second")
        bl1.refresh_from_db()
        self.assertFalse(bl1.is_active)
        self.assertTrue(bl2.is_active)
        self.assertEqual(bl2.version, 2)


class TaskSeedingTests(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")

    def test_seed_residential_project(self):
        proj = Project.objects.create(
            name="House", project_type="residential",
            contract_type="lump_sum", organisation=self.org,
            start_date="2026-01-01", end_date="2026-07-01",
        )
        initialize_project(proj)
        count = seed_tasks_from_setup(proj)
        self.assertGreater(count, 20)
        self.assertTrue(ProjectTask.objects.filter(project=proj).exists())
        self.assertTrue(TaskDependency.objects.filter(project=proj).exists())
        self.assertTrue(Milestone.objects.filter(project=proj).exists())

    def test_seed_road_project_uses_weighted_prototype_distribution(self):
        proj = Project.objects.create(
            name="Road Weights",
            project_type="road",
            contract_type="lump_sum",
            organisation=self.org,
            start_date="2026-01-01",
            end_date="2027-01-01",
            budget=1000000,
        )
        initialize_project(proj)
        seed_tasks_from_setup(proj)

        self.assertEqual(ProjectTask.objects.get(project=proj, code="A").duration_days, 54)
        self.assertEqual(str(ProjectTask.objects.get(project=proj, code="A").budget), "106061.00")
        self.assertEqual(ProjectTask.objects.get(project=proj, code="A3").duration_days, 11)
        self.assertEqual(str(ProjectTask.objects.get(project=proj, code="A3").budget), "22727.00")
        self.assertEqual(ProjectTask.objects.get(project=proj, code="D").duration_days, 97)
        self.assertEqual(str(ProjectTask.objects.get(project=proj, code="D").budget), "393939.00")
        self.assertEqual(ProjectTask.objects.get(project=proj, code="D1").duration_days, 25)
        self.assertEqual(str(ProjectTask.objects.get(project=proj, code="D1").budget), "90909.00")
        self.assertEqual(ProjectTask.objects.get(project=proj, code="D2").duration_days, 25)
        self.assertEqual(str(ProjectTask.objects.get(project=proj, code="D2").budget), "106061.00")
        self.assertEqual(ProjectTask.objects.get(project=proj, code="D3").duration_days, 7)
        self.assertEqual(str(ProjectTask.objects.get(project=proj, code="D3").budget), "15152.00")
        self.assertEqual(ProjectTask.objects.get(project=proj, code="D4").duration_days, 22)
        self.assertEqual(str(ProjectTask.objects.get(project=proj, code="D4").budget), "98485.00")

    def test_seed_design_build_includes_design_phases(self):
        proj = Project.objects.create(
            name="D&B", project_type="commercial",
            contract_type="design_build", organisation=self.org,
            start_date="2026-01-01", end_date="2027-01-01",
        )
        initialize_project(proj)
        seed_tasks_from_setup(proj)
        codes = list(ProjectTask.objects.filter(project=proj).values_list("code", flat=True))
        self.assertIn("D1", codes)  # Design phase
        self.assertIn("D2", codes)

    def test_seeded_design_build_milestones_link_to_design_phase_codes(self):
        proj = Project.objects.create(
            name="Design Build Milestones",
            project_type="commercial",
            contract_type="design_build",
            organisation=self.org,
            start_date="2026-01-01",
            end_date="2027-01-01",
        )
        initialize_project(proj)
        seed_tasks_from_setup(proj)

        milestones = {
            ms.name: ms.linked_task.code if ms.linked_task else None
            for ms in Milestone.objects.filter(project=proj)
        }
        self.assertEqual(milestones["Design Concept Approved"], "D1")
        self.assertEqual(milestones["Detailed Design Complete"], "D2")
        self.assertEqual(milestones["Regulatory Approvals Obtained"], "D3")


class ScheduleAPITests(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")
        self.role = SystemRole.objects.create(name="Admin", permissions=["admin.full_access"])
        self.user = User.objects.create_user(
            username="admin", password="pass123",
            organisation=self.org, system_role=self.role, is_staff=True,
        )
        self.project = Project.objects.create(
            name="API Test", project_type="school",
            contract_type="lump_sum", organisation=self.org,
        )
        self.task = ProjectTask.objects.create(
            project=self.project, code="A", name="Task A", duration_days=10,
        )

    def test_list_tasks(self):
        self.client.force_login(self.user)
        response = self.client.get(f"/api/v1/scheduling/{self.project.id}/tasks/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_recalculate_cpm(self):
        self.client.force_login(self.user)
        response = self.client.post(f"/api/v1/scheduling/{self.project.id}/recalculate/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["duration"], 10)

    def test_schedule_summary(self):
        self.client.force_login(self.user)
        response = self.client.get(f"/api/v1/scheduling/{self.project.id}/summary/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total_tasks"], 1)

    def test_schedule_summary_lists_all_zero_slack_activities_in_critical_path(self):
        critical_parent = ProjectTask.objects.create(
            project=self.project,
            code="P",
            name="Critical Phase",
            duration_days=5,
            is_parent=True,
            early_start=0,
            early_finish=5,
            late_start=0,
            late_finish=5,
            total_float=0,
            is_critical=True,
            sort_order=0,
        )
        critical_child = ProjectTask.objects.create(
            project=self.project,
            code="Pa",
            name="Critical Activity",
            duration_days=5,
            parent=critical_parent,
            early_start=5,
            early_finish=10,
            late_start=5,
            late_finish=10,
            total_float=0,
            is_critical=True,
            sort_order=1,
        )
        ProjectTask.objects.create(
            project=self.project,
            code="Pb",
            name="Non-critical Activity",
            duration_days=3,
            parent=critical_parent,
            early_start=5,
            early_finish=8,
            late_start=7,
            late_finish=10,
            total_float=2,
            is_critical=False,
            sort_order=2,
        )

        self.client.force_login(self.user)
        response = self.client.get(f"/api/v1/scheduling/{self.project.id}/summary/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["critical_path"], ["P", "Pa"])

    def test_gantt_data(self):
        self.client.force_login(self.user)
        response = self.client.get(f"/api/v1/scheduling/{self.project.id}/gantt/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["tasks"]), 1)

    def test_create_baseline_via_api(self):
        self.client.force_login(self.user)
        response = self.client.post(
            f"/api/v1/scheduling/{self.project.id}/baselines/",
            {"name": "Test BL"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["version"], 1)

    def test_milestone_crud(self):
        self.client.force_login(self.user)
        # Create
        response = self.client.post(
            f"/api/v1/scheduling/{self.project.id}/milestones/",
            {"name": "Foundation Complete", "status": "pending"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        ms_id = response.json()["id"]
        # List
        response = self.client.get(f"/api/v1/scheduling/{self.project.id}/milestones/")
        self.assertEqual(len(response.json()), 1)

    def test_unauthenticated_cannot_access(self):
        response = self.client.get(f"/api/v1/scheduling/{self.project.id}/tasks/")
        self.assertEqual(response.status_code, 403)
