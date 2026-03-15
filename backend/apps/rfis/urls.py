"""RFIs URL configuration."""
from django.urls import path
from . import views

urlpatterns = [
    path("<uuid:project_id>/rfis/", views.rfi_list, name="rfi-list"),
    path("<uuid:project_id>/rfis/<uuid:rfi_id>/", views.rfi_detail, name="rfi-detail"),
    path("<uuid:project_id>/rfis/<uuid:rfi_id>/restore/", views.rfi_restore, name="rfi-restore"),
]
