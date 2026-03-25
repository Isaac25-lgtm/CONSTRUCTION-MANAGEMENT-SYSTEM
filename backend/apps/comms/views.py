"""Communications views -- Meetings, Meeting Actions, Chat Messages."""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.projects.models import Project
from .models import Meeting, MeetingAction, ChatMessage, OrgChatMessage
from .serializers import (
    MeetingSerializer, MeetingCreateSerializer,
    MeetingActionSerializer, MeetingActionCreateSerializer,
    ChatMessageSerializer, ChatMessageCreateSerializer,
    OrgChatMessageSerializer, OrgChatMessageCreateSerializer,
)


def _get_project_or_404(request, project_id):
    try:
        project = Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
        return None
    if project.organisation_id != request.user.organisation_id:
        return None
    if not request.user.has_project_perm(project, "project.view"):
        return None
    return project


def _can_edit_comms(request, project):
    return request.user.has_project_perm(project, "comms.edit")


def _can_send_chat(request, project):
    return request.user.has_project_perm(project, "comms.send")


# ---------------------------------------------------------------------------
# Meetings
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def meeting_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        meetings = Meeting.objects.filter(project=project).select_related("chaired_by")
        return Response(MeetingSerializer(meetings, many=True).data)

    if not _can_edit_comms(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = MeetingCreateSerializer(
        data=request.data,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    meeting = serializer.save(project=project, created_by=request.user)
    return Response(MeetingSerializer(meeting).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def meeting_detail(request, project_id, meeting_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        meeting = Meeting.objects.select_related("chaired_by").get(pk=meeting_id, project=project)
    except Meeting.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(MeetingSerializer(meeting).data)

    if not _can_edit_comms(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = MeetingSerializer(
        meeting,
        data=request.data,
        partial=True,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# Meeting Actions (nested under meeting)
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def meeting_action_list(request, project_id, meeting_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        meeting = Meeting.objects.get(pk=meeting_id, project=project)
    except Meeting.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        actions = MeetingAction.objects.filter(meeting=meeting).select_related("assigned_to")
        return Response(MeetingActionSerializer(actions, many=True).data)

    if not _can_edit_comms(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = MeetingActionCreateSerializer(
        data=request.data,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    action = serializer.save(meeting=meeting)
    # Notify the assigned user about the meeting action
    if action.assigned_to:
        from apps.notifications.services import notify_meeting_action
        notify_meeting_action(
            user=action.assigned_to,
            project=meeting.project,
            meeting_title=meeting.title,
            action_description=action.description,
        )
    return Response(MeetingActionSerializer(action).data, status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def meeting_action_update(request, project_id, meeting_id, action_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        action = MeetingAction.objects.select_related("assigned_to").get(
            pk=action_id, meeting_id=meeting_id, meeting__project=project,
        )
    except MeetingAction.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if not _can_edit_comms(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = MeetingActionSerializer(
        action,
        data=request.data,
        partial=True,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# Chat Messages
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def chat_message_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        messages = ChatMessage.objects.filter(project=project).select_related("sender")
        return Response(ChatMessageSerializer(messages, many=True).data)

    if not _can_send_chat(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = ChatMessageCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    msg = serializer.save(project=project, sender=request.user)
    return Response(ChatMessageSerializer(msg).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def org_chat_message_list(request):
    organisation = request.user.organisation
    if organisation is None:
        return Response({"detail": "Organisation not configured for this account."}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == "GET":
        messages = OrgChatMessage.objects.filter(organisation=organisation).select_related("sender", "sender__system_role")
        return Response(OrgChatMessageSerializer(messages, many=True).data)

    serializer = OrgChatMessageCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    msg = serializer.save(organisation=organisation, sender=request.user)
    return Response(OrgChatMessageSerializer(msg).data, status=status.HTTP_201_CREATED)
