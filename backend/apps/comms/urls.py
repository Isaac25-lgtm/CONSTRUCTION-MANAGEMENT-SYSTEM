"""Communications URL configuration."""
from django.urls import path
from . import views

urlpatterns = [
    # Meetings
    path("<uuid:project_id>/meetings/", views.meeting_list, name="meeting-list"),
    path("<uuid:project_id>/meetings/<uuid:meeting_id>/", views.meeting_detail, name="meeting-detail"),

    # Meeting Actions (nested under meeting)
    path("<uuid:project_id>/meetings/<uuid:meeting_id>/actions/", views.meeting_action_list, name="meeting-action-list"),
    path("<uuid:project_id>/meetings/<uuid:meeting_id>/actions/<int:action_id>/", views.meeting_action_update, name="meeting-action-update"),

    # Chat Messages
    path("<uuid:project_id>/chat/", views.chat_message_list, name="chat-message-list"),
]
