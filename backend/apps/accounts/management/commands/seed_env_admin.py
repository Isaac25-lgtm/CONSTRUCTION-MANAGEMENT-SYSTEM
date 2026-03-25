"""
Seed a single full-access admin user from environment variables.

This is intended for hosted test deployments where the team wants one known
shared account without going through the setup screen manually.
"""
import os

from django.core.management.base import BaseCommand

from apps.accounts.bootstrap import bootstrap_org_admin


class Command(BaseCommand):
    help = "Create or update the env-seeded admin account when TEST_ADMIN_* env vars are set."

    def handle(self, *args, **options):
        email = os.environ.get("TEST_ADMIN_EMAIL", "").strip()
        password = os.environ.get("TEST_ADMIN_PASSWORD", "")

        if not email or not password:
            self.stdout.write("Skipping env admin seed: TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD not configured.")
            return

        username = os.environ.get("TEST_ADMIN_USERNAME", "").strip() or email
        org_name = os.environ.get("TEST_ADMIN_ORG_NAME", "").strip() or "BuildPro Test Organisation"
        first_name = os.environ.get("TEST_ADMIN_FIRST_NAME", "").strip() or "Test"
        last_name = os.environ.get("TEST_ADMIN_LAST_NAME", "").strip() or "Admin"

        result = bootstrap_org_admin(
            org_name=org_name,
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            validate_user_password=False,
        )

        org = result["organisation"]
        user = result["user"]
        org_action = "Created" if org["created"] else "Found existing"
        user_action = "Created" if user["created"] else "Updated"

        self.stdout.write(f"{org_action} organisation: {org['name']}")
        self.stdout.write(f"{user_action} env admin user: {user['username']}")
        self.stdout.write(self.style.SUCCESS("Env admin seed complete!"))
