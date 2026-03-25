"""Scheduling URL configuration."""
from django.urls import path
from . import views

urlpatterns = [
    # Tasks
    path("<uuid:project_id>/tasks/", views.task_list, name="task-list"),
    path("<uuid:project_id>/tasks/<uuid:task_id>/", views.task_detail, name="task-detail"),

    # Dependencies
    path("<uuid:project_id>/dependencies/", views.dependency_list, name="dependency-list"),
    path("<uuid:project_id>/dependencies/<uuid:dep_id>/", views.dependency_detail, name="dependency-detail"),

    # CPM
    path("<uuid:project_id>/recalculate/", views.recalculate_cpm, name="schedule-recalculate"),
    path("<uuid:project_id>/clear/", views.clear_schedule, name="schedule-clear"),
    path("<uuid:project_id>/summary/", views.schedule_summary, name="schedule-summary"),

    # Milestones
    path("<uuid:project_id>/milestones/", views.milestone_list, name="milestone-list"),
    path("<uuid:project_id>/milestones/<uuid:milestone_id>/", views.milestone_detail, name="milestone-detail"),

    # Baselines
    path("<uuid:project_id>/baselines/", views.baseline_list, name="baseline-list"),

    # View data
    path("<uuid:project_id>/gantt/", views.gantt_data, name="gantt-data"),
    path("<uuid:project_id>/network/", views.network_data, name="network-data"),
    path("<uuid:project_id>/scurve/", views.scurve_data, name="scurve-data"),
]
