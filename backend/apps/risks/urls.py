"""Risks URL configuration."""
from django.urls import path
from . import views

urlpatterns = [
    path("<uuid:project_id>/risks/", views.risk_list, name="risk-list"),
    path("<uuid:project_id>/risks/<uuid:risk_id>/", views.risk_detail, name="risk-detail"),
    path("<uuid:project_id>/risks/<uuid:risk_id>/restore/", views.risk_restore, name="risk-restore"),
]
