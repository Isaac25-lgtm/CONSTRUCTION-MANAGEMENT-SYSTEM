"""Accounts serializers -- auth, user profile, user management."""
from rest_framework import serializers

from .models import User, Organisation, SystemRole


class SystemRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemRole
        fields = ["id", "name", "description", "permissions"]
        read_only_fields = ["id"]


class UserMeSerializer(serializers.ModelSerializer):
    """Full profile for the /auth/me/ endpoint. Includes permissions."""

    organisation_name = serializers.CharField(
        source="organisation.name", read_only=True, default=None
    )
    organisation_id = serializers.UUIDField(
        source="organisation.id", read_only=True, default=None
    )
    system_role_name = serializers.CharField(
        source="system_role.name", read_only=True, default=None
    )
    system_permissions = serializers.SerializerMethodField()
    is_admin = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "job_title",
            "is_staff",
            "is_active",
            "is_admin",
            "organisation_id",
            "organisation_name",
            "system_role_name",
            "system_permissions",
        ]
        read_only_fields = fields

    def get_system_permissions(self, user):
        if user.is_admin:
            return ["admin.full_access"]
        if user.system_role:
            return user.system_role.permissions
        return []


class UserListSerializer(serializers.ModelSerializer):
    """Serializer for user list in Settings."""

    system_role_name = serializers.CharField(
        source="system_role.name", read_only=True, default=None
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "job_title",
            "is_active",
            "system_role_name",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined"]


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users (admin only)."""

    password = serializers.CharField(write_only=True, min_length=8)
    system_role_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "job_title",
            "password",
            "system_role_id",
        ]

    def create(self, validated_data):
        role_id = validated_data.pop("system_role_id", None)
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        if role_id:
            user.system_role_id = role_id
        user.organisation = self.context["request"].user.organisation
        user.save()
        return user


class OrganisationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organisation
        fields = ["id", "name", "address", "phone", "email"]
        read_only_fields = ["id"]
