"""
Keep only the env-seeded admin account.

This is intended for hosted demo/test environments where the team wants a
single shared login defined by TEST_ADMIN_* environment variables.
"""
import os

from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import User


class Command(BaseCommand):
    help = "Delete every user account except the env-seeded admin user."

    def handle(self, *args, **options):
        username = os.environ.get("TEST_ADMIN_USERNAME", "").strip()
        email = os.environ.get("TEST_ADMIN_EMAIL", "").strip()
        keep_username = username or email

        if not keep_username:
            self.stdout.write(
                "Skipping env admin prune: TEST_ADMIN_USERNAME/TEST_ADMIN_EMAIL not configured."
            )
            return

        try:
            keep_user = User.objects.get(username=keep_username)
        except User.DoesNotExist as exc:
            raise CommandError(
                f"Env admin user '{keep_username}' does not exist. Run seed_env_admin first."
            ) from exc

        if not keep_user.is_superuser:
            raise CommandError(
                f"Env admin user '{keep_user.username}' must be a superuser before pruning."
            )

        other_users = User.objects.exclude(pk=keep_user.pk).order_by("username")
        usernames = list(other_users.values_list("username", flat=True))
        if not usernames:
            self.stdout.write(
                f"No extra user accounts found. Keeping env admin '{keep_user.username}'."
            )
            return

        deleted_count = len(usernames)
        other_users.delete()

        self.stdout.write(f"Kept env admin user: {keep_user.username}")
        self.stdout.write(
            self.style.SUCCESS(
                f"Deleted {deleted_count} other user account(s): {', '.join(usernames)}"
            )
        )
