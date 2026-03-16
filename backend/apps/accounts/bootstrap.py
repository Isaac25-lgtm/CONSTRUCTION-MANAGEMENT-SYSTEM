"""
Production bootstrap service for BuildPro.

Creates organisation + admin user + Admin role in one idempotent operation.
Used by both the management command and the first-run setup API endpoint.
"""
from apps.accounts.models import Organisation, SystemRole, User


def is_system_initialized() -> bool:
    """Check if at least one organisation-backed admin user exists."""
    return User.objects.filter(
        organisation__isnull=False,
        system_role__permissions__contains=["admin.full_access"],
    ).exists()


def bootstrap_org_admin(
    *, org_name: str, username: str, email: str, password: str,
    first_name: str = "", last_name: str = "",
) -> dict:
    """Create or update organisation + admin user. Idempotent.

    Returns dict with created entities for confirmation.
    Raises ValueError for invalid input.
    """
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if not org_name.strip():
        raise ValueError("Organisation name is required.")
    if not username.strip():
        raise ValueError("Username is required.")
    if not email.strip():
        raise ValueError("Email is required.")

    # 1. Organisation
    org, org_created = Organisation.objects.get_or_create(
        name=org_name.strip(),
        defaults={"address": "", "phone": "", "email": ""},
    )

    # 2. Admin system role
    admin_role, _ = SystemRole.objects.get_or_create(
        name="Admin",
        defaults={
            "description": "Full access to all features and settings.",
            "permissions": ["admin.full_access"],
        },
    )
    if "admin.full_access" not in (admin_role.permissions or []):
        admin_role.permissions = ["admin.full_access"]
        admin_role.save(update_fields=["permissions"])

    # 3. User
    user, user_created = User.objects.get_or_create(
        username=username.strip(),
        defaults={
            "email": email.strip(),
            "first_name": first_name.strip(),
            "last_name": last_name.strip(),
            "organisation": org,
            "system_role": admin_role,
            "is_staff": True,
            "is_superuser": True,
        },
    )

    if user_created:
        user.set_password(password)
        user.save()
    else:
        # Ensure existing user is properly configured
        user.organisation = org
        user.system_role = admin_role
        user.is_staff = True
        user.is_superuser = True
        if email:
            user.email = email.strip()
        if first_name:
            user.first_name = first_name.strip()
        if last_name:
            user.last_name = last_name.strip()
        user.set_password(password)
        user.save()

    return {
        "organisation": {"id": str(org.id), "name": org.name, "created": org_created},
        "user": {"id": str(user.id), "username": user.username, "created": user_created},
    }
