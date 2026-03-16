"""
Production bootstrap: create organisation + admin user in one safe step.

Usage:
    python manage.py bootstrap_org_admin \
        --org-name "Locus Analytics" \
        --username jesse \
        --email jesse@locusanalytics.tech \
        --password "SecurePassword123"

This command is idempotent:
- If the organisation already exists (by name), it is reused.
- If the user already exists (by username), it is updated.
- If the Admin system role exists, it is reused.
- No data is wiped.
"""
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import Organisation, SystemRole, User


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
        org_name = options["org_name"]
        username = options["username"]
        email = options["email"]
        password = options["password"]
        first_name = options.get("first_name", "")
        last_name = options.get("last_name", "")

        if len(password) < 8:
            raise CommandError("Password must be at least 8 characters.")

        # 1. Organisation
        org, org_created = Organisation.objects.get_or_create(
            name=org_name,
            defaults={"address": "", "phone": "", "email": ""},
        )
        action = "Created" if org_created else "Found existing"
        self.stdout.write(f"{action} organisation: {org.name} (id: {org.id})")

        # 2. Admin system role
        admin_role, role_created = SystemRole.objects.get_or_create(
            name="Admin",
            defaults={
                "description": "Full access to all features and settings.",
                "permissions": ["admin.full_access"],
            },
        )
        if role_created:
            self.stdout.write("Created Admin system role.")
        else:
            # Ensure permissions are correct
            if "admin.full_access" not in (admin_role.permissions or []):
                admin_role.permissions = ["admin.full_access"]
                admin_role.save(update_fields=["permissions"])
            self.stdout.write("Found existing Admin system role.")

        # 3. User
        user, user_created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "organisation": org,
                "system_role": admin_role,
                "is_staff": True,
                "is_superuser": True,
            },
        )

        if user_created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Created admin user: {username}"))
        else:
            # Update existing user to ensure org + role + staff
            updated = False
            if user.organisation_id != org.id:
                user.organisation = org
                updated = True
            if user.system_role_id != admin_role.id:
                user.system_role = admin_role
                updated = True
            if not user.is_staff:
                user.is_staff = True
                updated = True
            if not user.is_superuser:
                user.is_superuser = True
                updated = True
            if email and user.email != email:
                user.email = email
                updated = True
            if first_name and user.first_name != first_name:
                user.first_name = first_name
                updated = True
            if last_name and user.last_name != last_name:
                user.last_name = last_name
                updated = True

            # Always update password when explicitly provided
            user.set_password(password)
            user.save()

            if updated:
                self.stdout.write(self.style.SUCCESS(f"Updated admin user: {username} (attached to org: {org.name})"))
            else:
                self.stdout.write(self.style.SUCCESS(f"Admin user already configured: {username}"))

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Bootstrap complete!"))
        self.stdout.write(f"  Organisation: {org.name}")
        self.stdout.write(f"  Admin user:   {username}")
        self.stdout.write(f"  Email:        {user.email}")
        self.stdout.write(f"  Login at:     https://your-render-url.onrender.com")
