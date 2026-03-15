"""Risk Register model."""
from django.conf import settings
from django.db import models
from apps.core.models import BaseModel


class Risk(BaseModel):
    """A project risk with likelihood/impact assessment."""

    LIKELIHOOD_CHOICES = [
        ("low", "Low"), ("medium", "Medium"), ("high", "High"), ("critical", "Critical"),
    ]
    IMPACT_CHOICES = [
        ("low", "Low"), ("medium", "Medium"), ("high", "High"), ("critical", "Critical"),
    ]
    STATUS_CHOICES = [
        ("open", "Open"), ("mitigated", "Mitigated"), ("closed", "Closed"), ("accepted", "Accepted"),
    ]
    CATEGORY_CHOICES = [
        ("technical", "Technical"), ("financial", "Financial"), ("schedule", "Schedule"),
        ("safety", "Safety"), ("environmental", "Environmental"), ("legal", "Legal/Contractual"),
        ("resource", "Resource"), ("external", "External"), ("other", "Other"),
    ]

    SCORE_MAP = {"low": 1, "medium": 2, "high": 3, "critical": 4}

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="risks")
    code = models.CharField(max_length=20)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="other")
    likelihood = models.CharField(max_length=10, choices=LIKELIHOOD_CHOICES, default="medium")
    impact = models.CharField(max_length=10, choices=IMPACT_CHOICES, default="medium")
    mitigation = models.TextField(blank=True, default="")
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="owned_risks")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    review_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "risks_risk"
        ordering = ["-created_at"]
        unique_together = [("project", "code")]

    def __str__(self):
        return f"{self.code} - {self.title}"

    @property
    def risk_score(self):
        return self.SCORE_MAP.get(self.likelihood, 2) * self.SCORE_MAP.get(self.impact, 2)
