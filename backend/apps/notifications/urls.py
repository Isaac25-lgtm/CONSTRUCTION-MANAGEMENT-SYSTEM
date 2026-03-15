"""Notifications URL configuration."""
from django.urls import path
from . import views

urlpatterns = [
    path("notifications/", views.notification_list, name="notification-list"),
    path("notifications/<uuid:notification_id>/read/", views.notification_mark_read, name="notification-mark-read"),
    path("notifications/read-all/", views.notification_mark_all_read, name="notification-mark-all-read"),
]
