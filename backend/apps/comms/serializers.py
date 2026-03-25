"""Communications serializers."""
from rest_framework import serializers

from apps.core.serializers import ProjectScopedValidationMixin
from .models import Meeting, MeetingAction, ChatMessage, OrgChatMessage


# ---------------------------------------------------------------------------
# Meeting Action (nested)
# ---------------------------------------------------------------------------

class MeetingActionSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True, default=None)

    class Meta:
        model = MeetingAction
        fields = [
            "id", "meeting", "description",
            "assigned_to", "assigned_to_name",
            "due_date",
            "status", "status_display",
            "notes", "created_at",
        ]
        read_only_fields = [
            "id", "meeting", "status_display", "assigned_to_name", "created_at",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_org_user(attrs, "assigned_to", label="assigned user")
        return attrs


class MeetingActionCreateSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = MeetingAction
        fields = [
            "description", "assigned_to", "due_date", "status", "notes",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_org_user(attrs, "assigned_to", label="assigned user")
        return attrs


# ---------------------------------------------------------------------------
# Meeting
# ---------------------------------------------------------------------------

class MeetingSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    meeting_type_display = serializers.CharField(source="get_meeting_type_display", read_only=True)
    chaired_by_name = serializers.CharField(source="chaired_by.get_full_name", read_only=True, default=None)
    actions = MeetingActionSerializer(many=True, read_only=True)

    class Meta:
        model = Meeting
        fields = [
            "id", "project", "title",
            "meeting_type", "meeting_type_display",
            "meeting_date", "location", "attendees", "summary",
            "chaired_by", "chaired_by_name",
            "actions",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "meeting_type_display", "chaired_by_name", "actions",
            "created_at", "updated_at",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_org_user(attrs, "chaired_by", label="chairperson")
        return attrs


class MeetingCreateSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = Meeting
        fields = [
            "title", "meeting_type", "meeting_date", "location",
            "attendees", "summary", "chaired_by",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_org_user(attrs, "chaired_by", label="chairperson")
        return attrs


# ---------------------------------------------------------------------------
# Chat Message
# ---------------------------------------------------------------------------

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role_name = serializers.CharField(source="sender.system_role.name", read_only=True, default=None)
    sender_job_title = serializers.CharField(source="sender.job_title", read_only=True, default="")

    class Meta:
        model = ChatMessage
        fields = [
            "id", "project", "sender", "sender_name", "sender_role_name", "sender_job_title",
            "message", "created_at",
        ]
        read_only_fields = [
            "id", "sender", "sender_name", "sender_role_name", "sender_job_title", "created_at",
        ]

    def get_sender_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.username


class ChatMessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["message"]


class OrgChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role_name = serializers.CharField(source="sender.system_role.name", read_only=True, default=None)
    sender_job_title = serializers.CharField(source="sender.job_title", read_only=True, default="")

    class Meta:
        model = OrgChatMessage
        fields = [
            "id", "organisation", "sender", "sender_name", "sender_role_name", "sender_job_title",
            "message", "created_at",
        ]
        read_only_fields = [
            "id", "organisation", "sender", "sender_name", "sender_role_name", "sender_job_title", "created_at",
        ]

    def get_sender_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.username


class OrgChatMessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrgChatMessage
        fields = ["message"]
