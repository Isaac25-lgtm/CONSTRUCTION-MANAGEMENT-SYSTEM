from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User, Organisation, SystemRole


@admin.register(User)
class BuildProUserAdmin(UserAdmin):
    list_display = ("username", "email", "first_name", "last_name", "system_role", "is_active")
    list_filter = ("system_role", "is_active", "is_staff")
    fieldsets = UserAdmin.fieldsets + (
        ("BuildPro", {"fields": ("phone", "job_title", "organisation", "system_role")}),
    )


@admin.register(Organisation)
class OrganisationAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "phone")


@admin.register(SystemRole)
class SystemRoleAdmin(admin.ModelAdmin):
    list_display = ("name", "description", "is_default")
