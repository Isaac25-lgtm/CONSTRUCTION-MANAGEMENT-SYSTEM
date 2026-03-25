"""
Cost models -- BudgetLine, Expense, ExpenseAttachment.

BudgetLine represents a budget allocation within a project (flat with categories).
Expense represents an actual cost entry against a budget line or task.
ExpenseAttachment stores receipt/supporting files linked to an expense.
Variance and EVM metrics are derived in the service layer, not stored.
"""
from django.db import models

from apps.core.models import TimestampedModel, AuditMixin


def expense_attachment_upload_path(instance, filename):
    return f"cost/expenses/{instance.expense_id}/{filename}"


class BudgetLine(TimestampedModel, AuditMixin):
    """A budget allocation item within a project."""

    CATEGORY_CHOICES = [
        ("preliminaries", "Preliminaries & General"),
        ("substructure", "Substructure / Foundation"),
        ("superstructure", "Superstructure"),
        ("roofing", "Roofing"),
        ("mep", "Mechanical & Electrical"),
        ("finishes", "Finishes"),
        ("fittings", "Doors, Windows & Fittings"),
        ("external", "External Works"),
        ("earthworks", "Earthworks & Grading"),
        ("drainage", "Drainage & Structures"),
        ("pavement", "Pavement / Surfacing"),
        ("specialist", "Specialist Systems"),
        ("equipment", "Equipment & Plant"),
        ("labour", "Labour"),
        ("professional", "Professional Fees"),
        ("contingency", "Contingency"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("approved", "Approved"),
        ("revised", "Revised"),
    ]

    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="budget_lines"
    )
    linked_task = models.ForeignKey(
        "scheduling.ProjectTask", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="budget_lines",
    )

    code = models.CharField(max_length=20)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default="other")
    budget_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = "cost_budget_line"
        ordering = ["sort_order", "code"]
        unique_together = [("project", "code")]

    def __str__(self):
        return f"{self.code} - {self.name}"

    @property
    def actual_amount(self):
        """Sum of all expenses against this budget line."""
        return self.expenses.aggregate(total=models.Sum("amount"))["total"] or 0

    @property
    def variance(self):
        return self.budget_amount - self.actual_amount


class Expense(TimestampedModel, AuditMixin):
    """An actual cost entry against a project and optionally a budget line."""

    STATUS_CHOICES = [
        ("recorded", "Recorded"),
        ("verified", "Verified"),
        ("disputed", "Disputed"),
    ]

    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="expenses"
    )
    budget_line = models.ForeignKey(
        BudgetLine, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="expenses",
    )
    linked_task = models.ForeignKey(
        "scheduling.ProjectTask", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="expenses",
    )

    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    expense_date = models.DateField()
    vendor = models.CharField(max_length=255, blank=True, default="")
    reference = models.CharField(max_length=100, blank=True, default="")
    category = models.CharField(max_length=30, choices=BudgetLine.CATEGORY_CHOICES, default="other")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="recorded")
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "cost_expense"
        ordering = ["-expense_date", "-created_at"]

    def __str__(self):
        return f"{self.description} - UGX {self.amount}"


class ExpenseAttachment(TimestampedModel, AuditMixin):
    """A receipt/supporting file attached to an expense."""

    expense = models.ForeignKey(
        Expense,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(upload_to=expense_attachment_upload_path, max_length=255)
    original_filename = models.CharField(max_length=255, blank=True, default="")
    file_size = models.PositiveBigIntegerField(default=0)
    content_type = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        db_table = "cost_expense_attachment"
        ordering = ["created_at"]

    def __str__(self):
        return self.original_filename or self.file.name
