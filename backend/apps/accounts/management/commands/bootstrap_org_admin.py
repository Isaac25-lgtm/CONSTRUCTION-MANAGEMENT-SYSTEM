"""
Production bootstrap: create organisation + admin user.

Usage:
    python manage.py bootstrap_org_admin \\
        --org-name "Locus Analytics" \\
        --username jesse \\
        --email jesse@locusanalytics.tech \\
        --password "SecurePassword123"

Idempotent: safe to run multiple times.
"""
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.bootstrap import bootstrap_org_admin


class Command(BaseCommand):
    help = "Create or update a BuildPro organisation and admin user for production bootstrap."

    def add_arguments(self, parser):
        parser.add_argument("--org-name", required=True, help="Organisation name")
        parser.add_argument("--username", required=True, help="Admin username")
        parser.add_argument("--email", required=True, help="Admin email")
        parser.add_argument("--password", required=True, help="Admin password (min 8 chars)")
        parser.add_argument("--first-name", default="", help="Admin first name")
        parser.add_argument("--last-name", default="", help="Admin last name")

    def handle(self, *args, **options):
        try:
            result = bootstrap_org_admin(
                org_name=options["org_name"],
                username=options["username"],
                email=options["email"],
                password=options["password"],
                first_name=options.get("first_name", ""),
                last_name=options.get("last_name", ""),
            )
        except ValueError as e:
            raise CommandError(str(e))

        org = result["organisation"]
        user = result["user"]
        org_action = "Created" if org["created"] else "Found existing"
        user_action = "Created" if user["created"] else "Updated"

        self.stdout.write(f"{org_action} organisation: {org['name']}")
        self.stdout.write(f"{user_action} admin user: {user['username']}")
        self.stdout.write(self.style.SUCCESS("Bootstrap complete!"))
