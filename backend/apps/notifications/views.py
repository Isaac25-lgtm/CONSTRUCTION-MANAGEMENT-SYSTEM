"""Notifications views -- user-scoped notification list, mark-read, mark-all-read."""
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


# ---------------------------------------------------------------------------
# Notification List (user-scoped)
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notification_list(request):
    notifications = Notification.objects.filter(user=request.user)
    unread_count = notifications.filter(is_read=False).count()
    return Response({
        "unread_count": unread_count,
        "results": NotificationSerializer(notifications, many=True).data,
    })


# ---------------------------------------------------------------------------
# Mark single notification as read
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def notification_mark_read(request, notification_id):
    try:
        notification = Notification.objects.get(pk=notification_id, user=request.user)
    except Notification.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    notification.is_read = True
    notification.read_at = timezone.now()
    notification.save(update_fields=["is_read", "read_at"])
    return Response(NotificationSerializer(notification).data)


# ---------------------------------------------------------------------------
# Mark all notifications as read
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def notification_mark_all_read(request):
    now = timezone.now()
    updated = Notification.objects.filter(
        user=request.user, is_read=False,
    ).update(is_read=True, read_at=now)
    return Response({"marked_read": updated})
