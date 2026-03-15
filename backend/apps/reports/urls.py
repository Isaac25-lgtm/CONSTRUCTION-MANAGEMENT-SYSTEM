"""Reports URL configuration."""
from django.urls import path
from . import views

urlpatterns = [
    path("<uuid:project_id>/available/", views.available_reports, name="available-reports"),
    path("<uuid:project_id>/generate/", views.generate_export, name="generate-export"),
    path("<uuid:project_id>/history/", views.export_history, name="export-history"),
    path("<uuid:project_id>/history/<uuid:export_id>/download/", views.export_download, name="export-download"),
]
