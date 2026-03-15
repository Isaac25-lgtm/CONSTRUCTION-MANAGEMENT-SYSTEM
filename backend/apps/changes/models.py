"""Change Order / Variation model."""
from django.conf import settings
from django.db import models
from apps.core.models import BaseModel


class ChangeOrder(BaseModel):
    """A change order / variation within a project."""

    STATUS_CHOICES = [
        ("draft", "Draft"), ("submitted", "Submitted"), ("approved", "Approved"),
        ("rejected", "Rejected"), ("implemented", "Implemented"),
    ]
    CATEGORY_CHOICES = [
        ("scope", "Scope Change"), ("design", "Design Change"), ("site", "Site Condition"),
        ("client", "Client Request"), ("regulatory", "Regulatory"), ("other", "Other"),
    ]

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="change_orders")
    code = models.CharField(max_length=20)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="other")
    reason = models.TextField(blank=True, default="")
    cost_impact = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    time_impact_days = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="change_orders_requested")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="change_orders_approved")
    requested_date = models.DateField(auto_now_add=True)
    related_rfi = models.ForeignKey("rfis.RFI", on_delete=models.SET_NULL, null=True, blank=True, related_name="change_orders")
    related_task = models.ForeignKey("scheduling.ProjectTask", on_delete=models.SET_NULL, null=True, blank=True, related_name="change_orders")

    class Meta:
        db_table = "changes_change_order"
        ordering = ["-created_at"]
        unique_together = [("project", "code")]

    def __str__(self):
        return f"{self.code} - {self.title}"
