from fastapi import APIRouter
from app.api.v1.routes import (
    auth, users, projects, tasks, expenses,
    documents, risks, milestones,
    organizations, messages, audit_logs, analytics, notifications, boq, ai
)

api_router = APIRouter()

# Include route modules
api_router.include_router(auth.router, prefix="/v1/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/v1/users", tags=["Users"])
api_router.include_router(organizations.router, prefix="/v1/organizations", tags=["Organizations"])
api_router.include_router(projects.router, prefix="/v1/projects", tags=["Projects"])
api_router.include_router(tasks.router, prefix="/v1/projects/{project_id}/tasks", tags=["Tasks"])
api_router.include_router(expenses.router, prefix="/v1/projects/{project_id}/expenses", tags=["Expenses"])
api_router.include_router(documents.router, prefix="/v1/projects/{project_id}/documents", tags=["Documents"])
api_router.include_router(risks.router, prefix="/v1/projects/{project_id}/risks", tags=["Risks"])
api_router.include_router(milestones.router, prefix="/v1/projects/{project_id}/milestones", tags=["Milestones"])
api_router.include_router(messages.router, prefix="/v1/messages", tags=["Messages"])
api_router.include_router(notifications.router, prefix="/v1/notifications", tags=["Notifications"])
api_router.include_router(audit_logs.router, prefix="/v1/audit-logs", tags=["Audit Logs"])
api_router.include_router(analytics.router, prefix="/v1/analytics", tags=["Analytics"])
api_router.include_router(boq.router, prefix="/v1/projects/{project_id}/boq", tags=["BOQ"])
api_router.include_router(ai.router, prefix="/v1/ai", tags=["AI"])

