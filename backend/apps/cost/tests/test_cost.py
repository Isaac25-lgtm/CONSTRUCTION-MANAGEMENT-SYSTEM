"""Tests for cost module: budget lines, expenses, summaries, EVM."""
from decimal import Decimal
from django.test import TestCase

from apps.accounts.models import User, Organisation, SystemRole
from apps.projects.models import Project
from apps.scheduling.models import ProjectTask
from apps.cost.models import BudgetLine, Expense
from apps.cost.services import get_cost_summary, get_evm_metrics, get_project_overview


class CostModelTests(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")
        self.project = Project.objects.create(
            name="Cost Test", project_type="residential",
            contract_type="lump_sum", organisation=self.org,
            budget=1000000,
        )

    def test_budget_line_variance(self):
        bl = BudgetLine.objects.create(
            project=self.project, code="A", name="Foundation",
            budget_amount=500000, category="substructure",
        )
        Expense.objects.create(
            project=self.project, budget_line=bl,
            description="Cement", amount=200000,
            expense_date="2026-03-01",
        )
        self.assertEqual(bl.actual_amount, 200000)
        self.assertEqual(bl.variance, Decimal("300000"))

    def test_cost_summary(self):
        bl1 = BudgetLine.objects.create(
            project=self.project, code="A", name="Foundation",
            budget_amount=500000, category="substructure",
        )
        bl2 = BudgetLine.objects.create(
            project=self.project, code="B", name="Walls",
            budget_amount=300000, category="superstructure",
        )
        Expense.objects.create(
            project=self.project, budget_line=bl1,
            description="Cement", amount=200000, expense_date="2026-03-01",
        )
        Expense.objects.create(
            project=self.project, budget_line=bl1,
            description="Steel", amount=100000, expense_date="2026-03-05",
        )

        summary = get_cost_summary(self.project)
        self.assertEqual(summary["total_budget"], 800000)
        self.assertEqual(summary["total_actual"], 300000)
        self.assertEqual(summary["variance"], 500000)
        self.assertFalse(summary["is_over_budget"])

    def test_over_budget_detection(self):
        bl = BudgetLine.objects.create(
            project=self.project, code="A", name="Small",
            budget_amount=100000, category="other",
        )
        Expense.objects.create(
            project=self.project, budget_line=bl,
            description="Over", amount=150000, expense_date="2026-03-01",
        )
        summary = get_cost_summary(self.project)
        self.assertTrue(summary["is_over_budget"])
        self.assertLess(summary["variance"], 0)


class EVMTests(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")
        self.project = Project.objects.create(
            name="EVM Test", project_type="road",
            contract_type="lump_sum", organisation=self.org,
            budget=10000000,
        )
        # Create tasks with progress
        ProjectTask.objects.create(
            project=self.project, code="A", name="Task A",
            duration_days=10, progress=100, status="completed",
        )
        ProjectTask.objects.create(
            project=self.project, code="B", name="Task B",
            duration_days=20, progress=50, status="in_progress",
        )
        # Budget
        BudgetLine.objects.create(
            project=self.project, code="BL1", name="Works",
            budget_amount=10000000, category="substructure",
        )
        # Expenses
        Expense.objects.create(
            project=self.project, description="Payment 1",
            amount=4000000, expense_date="2026-03-01",
        )

    def test_evm_calculations(self):
        evm = get_evm_metrics(self.project)
        self.assertEqual(evm["bac"], 10000000)
        # Progress = avg(100, 50) = 75% -> BCWP = 10M * 0.75 = 7.5M
        self.assertEqual(evm["bcwp"], 7500000)
        self.assertEqual(evm["acwp"], 4000000)
        # CPI = 7.5M / 4M = 1.875
        self.assertAlmostEqual(evm["cpi"], 1.88, places=1)
        # CPI > 1 means under budget (good)
        self.assertGreater(evm["cpi"], 1.0)

    def test_evm_no_expenses_zero_cpi(self):
        Expense.objects.all().delete()
        evm = get_evm_metrics(self.project)
        self.assertEqual(evm["acwp"], 0)
        self.assertEqual(evm["cpi"], 0)  # No spend -> CPI undefined, returns 0


class CostAPITests(TestCase):
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

    def test_create_budget_line(self):
        self.client.force_login(self.user)
        response = self.client.post(
            f"/api/v1/cost/{self.project.id}/budget-lines/",
            {"code": "A", "name": "Foundation", "category": "substructure", "budget_amount": 500000},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["code"], "A")

    def test_create_expense(self):
        self.client.force_login(self.user)
        bl = BudgetLine.objects.create(
            project=self.project, code="A", name="Foundation",
            budget_amount=500000, category="substructure",
        )
        response = self.client.post(
            f"/api/v1/cost/{self.project.id}/expenses/",
            {"description": "Cement", "amount": 100000, "expense_date": "2026-03-01",
             "budget_line": str(bl.id)},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)

    def test_cost_summary_endpoint(self):
        self.client.force_login(self.user)
        response = self.client.get(f"/api/v1/cost/{self.project.id}/summary/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("total_budget", response.json())

    def test_evm_endpoint(self):
        self.client.force_login(self.user)
        response = self.client.get(f"/api/v1/cost/{self.project.id}/evm/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("bac", data)
        self.assertIn("cpi", data)

    def test_overview_endpoint(self):
        self.client.force_login(self.user)
        response = self.client.get(f"/api/v1/cost/{self.project.id}/overview/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("project", data)
        self.assertIn("schedule", data)
        self.assertIn("cost", data)
        self.assertIn("evm", data)

    def test_unauthenticated_denied(self):
        response = self.client.get(f"/api/v1/cost/{self.project.id}/summary/")
        self.assertEqual(response.status_code, 403)

    def test_delete_budget_line(self):
        self.client.force_login(self.user)
        bl = BudgetLine.objects.create(
            project=self.project, code="DEL", name="To Delete",
            budget_amount=100000, category="other",
        )
        response = self.client.delete(f"/api/v1/cost/{self.project.id}/budget-lines/{bl.id}/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(BudgetLine.objects.filter(pk=bl.id).exists())

    def test_update_budget_line(self):
        self.client.force_login(self.user)
        bl = BudgetLine.objects.create(
            project=self.project, code="UPD", name="Original",
            budget_amount=100000, category="other",
        )
        response = self.client.patch(
            f"/api/v1/cost/{self.project.id}/budget-lines/{bl.id}/",
            {"name": "Updated", "budget_amount": 200000},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        bl.refresh_from_db()
        self.assertEqual(bl.name, "Updated")
        self.assertEqual(bl.budget_amount, 200000)

    def test_delete_expense(self):
        self.client.force_login(self.user)
        exp = Expense.objects.create(
            project=self.project, description="To Delete",
            amount=50000, expense_date="2026-03-01",
        )
        response = self.client.delete(f"/api/v1/cost/{self.project.id}/expenses/{exp.id}/")
        self.assertEqual(response.status_code, 204)

    def test_viewer_cannot_edit_budget(self):
        """Read-only user cannot create budget lines."""
        viewer_role = SystemRole.objects.create(name="Viewer", permissions=[])
        viewer = User.objects.create_user(
            username="viewer", password="pass123",
            organisation=self.org, system_role=viewer_role,
        )
        from apps.accounts.models import DEFAULT_PROJECT_ROLE_PERMISSIONS
        from apps.projects.models import ProjectMembership
        ProjectMembership.objects.create(
            project=self.project, user=viewer, role="viewer",
            permissions=DEFAULT_PROJECT_ROLE_PERMISSIONS["viewer"],
        )
        self.client.force_login(viewer)
        response = self.client.post(
            f"/api/v1/cost/{self.project.id}/budget-lines/",
            {"code": "X", "name": "Forbidden", "category": "other", "budget_amount": 100},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_evm_uses_leaf_tasks_only(self):
        """EVM progress should use leaf tasks, not parent tasks."""
        # Create parent + leaf tasks
        parent = ProjectTask.objects.create(
            project=self.project, code="P", name="Phase", duration_days=10,
            is_parent=True, progress=0,
        )
        leaf = ProjectTask.objects.create(
            project=self.project, code="Pa", name="Leaf", duration_days=10,
            is_parent=False, progress=80, parent=parent,
        )
        BudgetLine.objects.create(
            project=self.project, code="BL", name="Budget",
            budget_amount=1000000, category="other",
        )
        evm = get_evm_metrics(self.project)
        # Should use leaf progress (80%), not avg of parent(0)+leaf(80)=40%
        self.assertEqual(evm["overall_progress"], 80.0)
