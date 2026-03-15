"""
Reusable DRF permission classes for BuildPro.

These enforce server-side authorization. Every API endpoint should use
one or more of these classes -- never rely on the frontend.

Usage in views:
    permission_classes = [IsAuthenticated, IsOrgMember]
    permission_classes = [IsAuthenticated, HasProjectAccess("budget.view")]
"""
from rest_framework.permissions import BasePermission


class IsOrgMember(BasePermission):
    """User must belong to an organisation."""

    message = "You must belong to an organisation."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.organisation_id is not None
        )


class IsAdmin(BasePermission):
    """User must be an admin (system role or is_staff)."""

    message = "Admin access required."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin


class HasSystemPerm(BasePermission):
    """
    User must have a specific system-level permission.

    Usage:
        permission_classes = [HasSystemPerm("projects.create")]

    Since DRF permission_classes expects classes (not instances),
    use the factory function: HasSystemPermission("perm.name")
    """

    def __init__(self, perm: str):
        self.perm = perm

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.has_system_perm(self.perm)
        )


def HasSystemPermission(perm: str):
    """Factory that returns a permission class checking a system permission."""

    class _Perm(BasePermission):
        message = f"System permission required: {perm}"

        def has_permission(self, request, view):
            return (
                request.user.is_authenticated
                and request.user.has_system_perm(perm)
            )

    _Perm.__name__ = f"HasSystemPerm_{perm}"
    return _Perm


class HasProjectAccess(BasePermission):
    """
    Check project-level permission.

    Expects the view to have a `project` attribute or `kwargs["project_id"]`.
    The specific permission to check is set via the factory.
    """

    perm = "project.view"

    def has_permission(self, request, view):
        project = getattr(view, "project", None)
        if project is None:
            project_id = view.kwargs.get("project_id")
            if project_id is None:
                return False
            from apps.projects.models import Project
            try:
                project = Project.objects.get(pk=project_id)
            except Project.DoesNotExist:
                return False
            view.project = project

        # Check org ownership
        if project.organisation_id != request.user.organisation_id:
            return False

        return request.user.has_project_perm(project, self.perm)


def ProjectPermission(perm: str):
    """Factory that returns a permission class checking a project permission."""

    class _Perm(HasProjectAccess):
        message = f"Project permission required: {perm}"

        def __init__(self):
            self.perm = perm

    _Perm.__name__ = f"ProjectPerm_{perm}"
    return _Perm
