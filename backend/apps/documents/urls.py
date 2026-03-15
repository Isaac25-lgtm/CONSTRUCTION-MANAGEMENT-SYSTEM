"""Documents URL configuration."""
from django.urls import path

from . import views

urlpatterns = [
    path("<uuid:project_id>/summary/", views.document_summary, name="document-summary"),
    path("<uuid:project_id>/documents/", views.document_list, name="document-list"),
    path("<uuid:project_id>/documents/<uuid:document_id>/", views.document_detail, name="document-detail"),
    path(
        "<uuid:project_id>/documents/<uuid:document_id>/versions/",
        views.document_version_list,
        name="document-version-list",
    ),
    path(
        "<uuid:project_id>/documents/<uuid:document_id>/versions/<uuid:version_id>/download/",
        views.document_version_download,
        name="document-version-download",
    ),
]
