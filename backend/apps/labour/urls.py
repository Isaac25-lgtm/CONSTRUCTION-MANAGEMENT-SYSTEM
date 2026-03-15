"""Labour URL configuration."""
from django.urls import path
from . import views

urlpatterns = [
    path("<uuid:project_id>/timesheets/", views.timesheet_entry_list, name="timesheet-entry-list"),
    path("<uuid:project_id>/timesheets/<uuid:entry_id>/", views.timesheet_entry_detail, name="timesheet-entry-detail"),
]
