"""Accounts views -- auth, user management, org settings."""
from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsAdmin, HasSystemPermission

from .models import User, SystemRole
from .serializers import (
    UserMeSerializer,
    UserListSerializer,
    UserCreateSerializer,
    SystemRoleSerializer,
    OrganisationSerializer,
)


# ---------------------------------------------------------------------------
# CSRF bootstrap
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def csrf_view(request):
    """
    Seed the CSRF cookie so the frontend can include it in mutating requests.

    The frontend calls this on app init (before login). Django's get_token()
    sets the csrftoken cookie on the response automatically.
    """
    token = get_token(request)
    return Response({"detail": "CSRF cookie set."})


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """Authenticate user and create session."""
    username = request.data.get("username", "")
    password = request.data.get("password", "")
    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response(
            {"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED
        )
    if not user.is_active:
        return Response(
            {"detail": "Account is disabled."}, status=status.HTTP_403_FORBIDDEN
        )
    login(request, user)
    return Response(UserMeSerializer(user).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Destroy session."""
    logout(request)
    return Response({"detail": "Logged out."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Return the currently authenticated user's profile with permissions."""
    return Response(UserMeSerializer(request.user).data)


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

class UserViewSet(viewsets.ModelViewSet):
    """
    CRUD for users within the current organisation.

    List/retrieve: requires admin.manage_users system permission.
    Create/update/delete: requires admin (is_staff or admin.full_access).
    """

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserListSerializer

    def get_queryset(self):
        return User.objects.filter(
            organisation=self.request.user.organisation
        ).select_related("system_role")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsAdmin()]
        # List/retrieve: require manage_users or admin
        return [IsAuthenticated(), HasSystemPermission("admin.manage_users")()]

    def perform_destroy(self, instance):
        # Soft-deactivate instead of hard delete
        instance.is_active = False
        instance.save(update_fields=["is_active"])


# ---------------------------------------------------------------------------
# Roles (read-only for non-admins, full CRUD for admins)
# ---------------------------------------------------------------------------

class SystemRoleViewSet(viewsets.ModelViewSet):
    """System roles. Read for all, write for admins."""

    serializer_class = SystemRoleSerializer
    permission_classes = [IsAuthenticated]
    queryset = SystemRole.objects.all()

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]


# ---------------------------------------------------------------------------
# Organisation settings
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_picker_view(request):
    """
    Lightweight user list for member pickers.

    Returns only id, username, full name for all active org users.
    Any authenticated org member can call this -- it does NOT expose
    email, phone, or sensitive fields. Used by the team management UI
    when a project manager (who may lack admin.manage_users) needs
    to pick users to add to a project.
    """
    users = User.objects.filter(
        organisation=request.user.organisation,
        is_active=True,
    ).values("id", "username", "first_name", "last_name", "job_title")
    result = [
        {
            "id": str(u["id"]),
            "username": u["username"],
            "full_name": f"{u['first_name']} {u['last_name']}".strip() or u["username"],
            "job_title": u["job_title"] or "",
        }
        for u in users
    ]
    return Response(result)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def organisation_view(request):
    """Get or update the current user's organisation."""
    org = request.user.organisation
    if org is None:
        return Response(
            {"detail": "No organisation."}, status=status.HTTP_404_NOT_FOUND
        )
    if request.method == "PATCH":
        if not request.user.is_admin:
            return Response(
                {"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN
            )
        serializer = OrganisationSerializer(org, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    return Response(OrganisationSerializer(org).data)
