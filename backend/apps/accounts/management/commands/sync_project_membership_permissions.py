"""
Backfill missing role-default project permissions onto existing memberships.

This keeps long-lived deployments aligned with DEFAULT_PROJECT_ROLE_PERMISSIONS
without stripping any custom extra permissions that may already be present.
"""
from django.core.management.base import BaseCommand

from apps.accounts.models import DEFAULT_PROJECT_ROLE_PERMISSIONS
from apps.projects.models import ProjectMembership


def _merge_permissions(existing: list[str], defaults: list[str]) -> list[str]:
    merged = []
    seen = set()
    for perm in [*(existing or []), *(defaults or [])]:
        if perm in seen:
            continue
        seen.add(perm)
        merged.append(perm)
    return merged


class Command(BaseCommand):
    help = "Ensure all project memberships include the latest default permissions for their role."

    def handle(self, *args, **options):
        updated = 0
        memberships = ProjectMembership.objects.select_related("project", "user").all()
        for membership in memberships:
            defaults = DEFAULT_PROJECT_ROLE_PERMISSIONS.get(
                membership.role,
                DEFAULT_PROJECT_ROLE_PERMISSIONS["viewer"],
            )
            merged = _merge_permissions(membership.permissions or [], defaults)
            if merged != (membership.permissions or []):
                membership.permissions = merged
                membership.save(update_fields=["permissions"])
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Project membership permission sync complete. Updated {updated} memberships."
            )
        )
