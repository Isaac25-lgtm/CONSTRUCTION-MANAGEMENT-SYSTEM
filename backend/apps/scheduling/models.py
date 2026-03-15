"""
Scheduling models -- ProjectTask, TaskDependency, Milestone, ScheduleBaseline.

These are the core scheduling entities. The CPM engine operates on these
models to calculate early/late start/finish, float, and critical path.
"""
import uuid

from django.conf import settings
from django.db import models

from apps.core.models import TimestampedModel, AuditMixin


class ProjectTask(TimestampedModel, AuditMixin):
    """A schedulable task/activity within a project."""

    STATUS_CHOICES = [
        ("not_started", "Not Started"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("delayed", "Delayed"),
        ("on_hold", "On Hold"),
    ]

    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="tasks"
    )
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True,
        related_name="children",
    )

    # Identity
    code = models.CharField(max_length=20, help_text="Short code e.g. A, B1, C2a")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    phase = models.CharField(max_length=100, blank=True, default="", help_text="Phase/group label")

    # Schedule (input)
    duration_days = models.IntegerField(default=0)
    planned_start = models.DateField(null=True, blank=True)
    planned_end = models.DateField(null=True, blank=True)

    # CPM (computed by engine, persisted)
    early_start = models.IntegerField(default=0, help_text="Day offset from project start")
    early_finish = models.IntegerField(default=0)
    late_start = models.IntegerField(default=0)
    late_finish = models.IntegerField(default=0)
    total_float = models.IntegerField(default=0, help_text="Slack / total float")
    is_critical = models.BooleanField(default=False)

    # Progress
    progress = models.IntegerField(default=0, help_text="0-100 percent complete")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="not_started")

    # Assignment
    resource = models.CharField(max_length=255, blank=True, default="", help_text="Assigned resource/team")
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="assigned_tasks",
    )

    # Budget placeholder for cost module integration
    budget = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    # Ordering
    sort_order = models.IntegerField(default=0)
    is_parent = models.BooleanField(default=False, help_text="True for summary/phase tasks")

    class Meta:
        db_table = "scheduling_task"
        ordering = ["sort_order", "code"]
        unique_together = [("project", "code")]

    def __str__(self):
        return f"{self.code} - {self.name}"


class TaskDependency(models.Model):
    """Predecessor-successor relationship between tasks."""

    DEPENDENCY_TYPES = [
        ("FS", "Finish-to-Start"),
        ("SS", "Start-to-Start"),
        ("FF", "Finish-to-Finish"),
        ("SF", "Start-to-Finish"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="dependencies"
    )
    predecessor = models.ForeignKey(
        ProjectTask, on_delete=models.CASCADE, related_name="successor_links"
    )
    successor = models.ForeignKey(
        ProjectTask, on_delete=models.CASCADE, related_name="predecessor_links"
    )
    dependency_type = models.CharField(max_length=2, choices=DEPENDENCY_TYPES, default="FS")
    lag_days = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "scheduling_dependency"
        unique_together = [("predecessor", "successor")]

    def __str__(self):
        return f"{self.predecessor.code} -> {self.successor.code} ({self.dependency_type})"


class Milestone(TimestampedModel, AuditMixin):
    """A project milestone -- a key checkpoint linked to a task."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("achieved", "Achieved"),
        ("missed", "Missed"),
    ]

    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="milestones"
    )
    linked_task = models.ForeignKey(
        ProjectTask, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="milestones",
    )

    code = models.CharField(max_length=20, blank=True, default="")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    target_date = models.DateField(null=True, blank=True)
    actual_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = "scheduling_milestone"
        ordering = ["sort_order", "target_date"]

    def __str__(self):
        return f"MS: {self.name}"


class ScheduleBaseline(TimestampedModel, AuditMixin):
    """A frozen snapshot of the project schedule for variance tracking."""

    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="baselines"
    )
    name = models.CharField(max_length=100)
    version = models.IntegerField(default=1)
    is_active = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "scheduling_baseline"
        ordering = ["-version"]

    def __str__(self):
        return f"Baseline v{self.version}: {self.name}"


class BaselineTaskSnapshot(models.Model):
    """Frozen task data within a baseline."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    baseline = models.ForeignKey(
        ScheduleBaseline, on_delete=models.CASCADE, related_name="snapshots"
    )
    task = models.ForeignKey(
        ProjectTask, on_delete=models.CASCADE, related_name="baseline_snapshots"
    )
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=255)
    duration_days = models.IntegerField(default=0)
    early_start = models.IntegerField(default=0)
    early_finish = models.IntegerField(default=0)
    progress = models.IntegerField(default=0)
    budget = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    class Meta:
        db_table = "scheduling_baseline_snapshot"

    def __str__(self):
        return f"Snap: {self.code} in {self.baseline}"
