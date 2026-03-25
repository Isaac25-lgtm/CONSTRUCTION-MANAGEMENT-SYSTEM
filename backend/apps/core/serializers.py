"""Shared serializer helpers for project/org-scoped validation."""

from rest_framework import serializers


class ProjectScopedValidationMixin:
    """Reusable validation helpers for project and organisation scoping."""

    def _current_project(self, attrs=None):
        attrs = attrs or {}
        project = attrs.get("project") if isinstance(attrs, dict) else None
        if project is not None:
            return project

        project = self.context.get("project")
        if project is not None:
            return project

        instance = getattr(self, "instance", None)
        if instance is not None and hasattr(instance, "project"):
            return instance.project
        return None

    def _current_org_id(self, attrs=None):
        project = self._current_project(attrs)
        if project is not None:
            return project.organisation_id

        request = self.context.get("request")
        user = getattr(request, "user", None)
        return getattr(user, "organisation_id", None)

    def _validate_same_project(self, attrs, field_name, *, relation_name="project", label=None):
        if field_name not in attrs or attrs[field_name] is None:
            return

        project = self._current_project(attrs)
        if project is None:
            return

        related = attrs[field_name]
        related_project_id = getattr(related, f"{relation_name}_id", None)
        if related_project_id != project.id:
            friendly = label or field_name.replace("_", " ")
            raise serializers.ValidationError(
                {field_name: f"Selected {friendly} must belong to this project."}
            )

    def _validate_same_org(self, attrs, field_name, *, relation_name="organisation", label=None):
        if field_name not in attrs or attrs[field_name] is None:
            return

        org_id = self._current_org_id(attrs)
        if org_id is None:
            return

        related = attrs[field_name]
        related_org_id = getattr(related, f"{relation_name}_id", None)
        if related_org_id != org_id:
            friendly = label or field_name.replace("_", " ")
            raise serializers.ValidationError(
                {field_name: f"Selected {friendly} must belong to this organisation."}
            )

    def _validate_same_org_user(self, attrs, field_name, *, label=None):
        if field_name not in attrs or attrs[field_name] is None:
            return

        org_id = self._current_org_id(attrs)
        if org_id is None:
            return

        user = attrs[field_name]
        if getattr(user, "organisation_id", None) != org_id:
            friendly = label or field_name.replace("_", " ")
            raise serializers.ValidationError(
                {field_name: f"Selected {friendly} must belong to this organisation."}
            )
