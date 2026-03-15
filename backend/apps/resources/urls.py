"""Resources URL configuration."""
from django.urls import path
from . import views

urlpatterns = [
    # Resources (org-scoped -- no project_id prefix)
    path("resources/", views.resource_list, name="resource-list"),
    path("resources/<uuid:resource_id>/", views.resource_detail, name="resource-detail"),

    # Project Resource Assignments
    path("<uuid:project_id>/resource-assignments/", views.assignment_list, name="assignment-list"),
    path("<uuid:project_id>/resource-assignments/<uuid:assignment_id>/", views.assignment_detail, name="assignment-detail"),
]
