"""Field Operations URL configuration."""
from django.urls import path
from . import views

urlpatterns = [
    # Punch Items
    path("<uuid:project_id>/punch-items/", views.punch_item_list, name="punch-item-list"),
    path("<uuid:project_id>/punch-items/<uuid:item_id>/", views.punch_item_detail, name="punch-item-detail"),
    path("<uuid:project_id>/punch-items/<uuid:item_id>/restore/", views.punch_item_restore, name="punch-item-restore"),

    # Daily Logs
    path("<uuid:project_id>/daily-logs/", views.daily_log_list, name="daily-log-list"),
    path("<uuid:project_id>/daily-logs/<uuid:log_id>/", views.daily_log_detail, name="daily-log-detail"),
    path("<uuid:project_id>/daily-logs/<uuid:log_id>/restore/", views.daily_log_restore, name="daily-log-restore"),

    # Safety Incidents
    path("<uuid:project_id>/safety-incidents/", views.safety_incident_list, name="safety-incident-list"),
    path("<uuid:project_id>/safety-incidents/<uuid:incident_id>/", views.safety_incident_detail, name="safety-incident-detail"),
    path("<uuid:project_id>/safety-incidents/<uuid:incident_id>/restore/", views.safety_incident_restore, name="safety-incident-restore"),

    # Quality Checks
    path("<uuid:project_id>/quality-checks/", views.quality_check_list, name="quality-check-list"),
    path("<uuid:project_id>/quality-checks/<uuid:check_id>/", views.quality_check_detail, name="quality-check-detail"),
    path("<uuid:project_id>/quality-checks/<uuid:check_id>/restore/", views.quality_check_restore, name="quality-check-restore"),

    # Recycle bin
    path("<uuid:project_id>/recycle-bin/", views.recycle_bin, name="recycle-bin"),
]
