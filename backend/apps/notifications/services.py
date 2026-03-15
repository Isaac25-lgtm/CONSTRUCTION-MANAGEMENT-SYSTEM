"""Notification service helpers for creating notifications from other apps."""


def create_notification(user, title, message, level="info", project=None, notification_type="general", link=""):
    """Create a single notification for a user."""
    from .models import Notification
    return Notification.objects.create(
        user=user,
        project=project,
        title=title,
        message=message,
        level=level,
        notification_type=notification_type,
        link=link,
    )


def notify_project_assignment(user, project, role):
    """Notify a user that they have been assigned to a project."""
    return create_notification(
        user=user,
        title=f"Added to project: {project.name}",
        message=f"You have been added to project {project.code} - {project.name} as {role}.",
        level="info",
        project=project,
        notification_type="project_assignment",
        link=f"/app/projects/{project.id}/overview",
    )


def notify_meeting_action(user, project, meeting_title, action_description):
    """Notify a user that they have been assigned a meeting action."""
    return create_notification(
        user=user,
        title=f"New action from meeting: {meeting_title}",
        message=f"You have been assigned an action: {action_description}",
        level="info",
        project=project,
        notification_type="meeting_action",
        link=f"/app/projects/{project.id}/meetings",
    )
