"""Communications serializers."""
from rest_framework import serializers
from .models import Meeting, MeetingAction, ChatMessage


# ---------------------------------------------------------------------------
# Meeting Action (nested)
# ---------------------------------------------------------------------------

class MeetingActionSerializer(serializers.ModelSerializer):
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


class MeetingActionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingAction
        fields = [
            "description", "assigned_to", "due_date", "status", "notes",
        ]


# ---------------------------------------------------------------------------
# Meeting
# ---------------------------------------------------------------------------

class MeetingSerializer(serializers.ModelSerializer):
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


class MeetingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meeting
        fields = [
            "title", "meeting_type", "meeting_date", "location",
            "attendees", "summary", "chaired_by",
        ]


# ---------------------------------------------------------------------------
# Chat Message
# ---------------------------------------------------------------------------

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.get_full_name", read_only=True, default=None)

    class Meta:
        model = ChatMessage
        fields = [
            "id", "project", "sender", "sender_name",
            "message", "created_at",
        ]
        read_only_fields = [
            "id", "sender", "sender_name", "created_at",
        ]


class ChatMessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["message"]
