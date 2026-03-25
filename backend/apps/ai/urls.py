"""AI URL configuration."""
from django.urls import path

from . import views

urlpatterns = [
    path("<uuid:project_id>/intelligence/", views.project_intelligence, name="ai-intelligence"),
    path("<uuid:project_id>/narrative/", views.generate_narrative, name="ai-narrative"),
    path("<uuid:project_id>/report-draft/", views.generate_report_draft, name="ai-report-draft"),
    path("<uuid:project_id>/copilot/", views.copilot_query, name="ai-copilot"),
    path("<uuid:project_id>/history/", views.ai_history, name="ai-history"),
    path("jobs/<uuid:job_id>/", views.job_status, name="ai-job-status"),
]
