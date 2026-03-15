"""Accounts URL configuration -- CSRF, auth, user management, org settings."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("users", views.UserViewSet, basename="user")
router.register("roles", views.SystemRoleViewSet, basename="system-role")

urlpatterns = [
    path("csrf/", views.csrf_view, name="auth-csrf"),
    path("login/", views.login_view, name="auth-login"),
    path("logout/", views.logout_view, name="auth-logout"),
    path("me/", views.me_view, name="auth-me"),
    path("organisation/", views.organisation_view, name="auth-organisation"),
    path("user-picker/", views.user_picker_view, name="auth-user-picker"),
    path("", include(router.urls)),
]
