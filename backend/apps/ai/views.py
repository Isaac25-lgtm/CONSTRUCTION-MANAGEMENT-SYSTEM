"""AI views -- narrative, report draft, copilot, job status, history.

All endpoints enforce ai.use permission. AI history requires ai.history.
Context assembly is permission-aware. Errors are sanitized.
"""
import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.projects.models import Project

from .models import AIRequestLog, AsyncJob
from .serializers import AsyncJobSerializer, AIRequestLogSerializer

logger = logging.getLogger("buildpro.ai")


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


def _can_use_ai(request, project):
    """Check if user has ai.use permission on this project."""
    return request.user.has_project_perm(project, "ai.use")


def _can_view_ai_history(request, project):
    """Check if user has ai.history permission on this project."""
    return request.user.has_project_perm(project, "ai.history")


def _get_user_module_perms(user, project):
    """Return a set of module-level permissions the user has on this project."""
    perms = set()
    for perm in ["schedule.view", "budget.view", "risks.view", "rfis.view",
                 "changes.view", "field_ops.view", "procurement.view",
                 "reports.view", "documents.view"]:
        if user.has_project_perm(project, perm):
            perms.add(perm)
    return perms


def _safe_error_response(exc, fallback_msg="AI service temporarily unavailable."):
    """Return a sanitized error response -- never expose raw exceptions."""
    logger.error("AI endpoint error: %s", exc, exc_info=True)
    error_type = type(exc).__name__
    if isinstance(exc, ValueError):
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    if "API_KEY" in str(exc) or "api_key" in str(exc):
        return Response({"detail": "AI service not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response({"detail": fallback_msg}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


# ---------------------------------------------------------------------------
# AI Feature endpoints
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_narrative(request, project_id):
    """Generate a cost/schedule narrative for a project."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if not _can_use_ai(request, project):
        return Response({"detail": "AI access requires ai.use permission."}, status=status.HTTP_403_FORBIDDEN)

    user_perms = _get_user_module_perms(request.user, project)
    use_async = request.query_params.get("async", "").lower() == "true"

    if use_async:
        job = AsyncJob.objects.create(
            job_type="ai_narrative", project=project, initiated_by=request.user,
            metadata={"user_perms": list(user_perms)},
        )
        from .tasks import run_ai_narrative
        run_ai_narrative.delay(str(job.id), str(project.id), str(request.user.id))
        return Response(AsyncJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)

    try:
        from .services.features import generate_narrative as _gen
        result = _gen(project, request.user, user_perms=user_perms)
        return Response({"text": result["text"], "log_id": result["log_id"]})
    except Exception as e:
        return _safe_error_response(e)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_report_draft(request, project_id):
    """Generate an AI-drafted report summary."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if not _can_use_ai(request, project):
        return Response({"detail": "AI access requires ai.use permission."}, status=status.HTTP_403_FORBIDDEN)

    report_key = request.data.get("report_key", "").strip()
    if not report_key:
        return Response({"detail": "report_key is required."}, status=status.HTTP_400_BAD_REQUEST)

    # Validate report key before sending to service
    from apps.reports.services import REPORT_ASSEMBLERS
    if report_key not in REPORT_ASSEMBLERS:
        return Response({"detail": f"Unknown report key: {report_key}"}, status=status.HTTP_400_BAD_REQUEST)

    # Check report access
    if not request.user.has_project_perm(project, "reports.view"):
        return Response({"detail": "Reports access required for AI report drafting."}, status=status.HTTP_403_FORBIDDEN)

    use_async = request.query_params.get("async", "").lower() == "true"

    if use_async:
        job = AsyncJob.objects.create(
            job_type="ai_report_draft", project=project, initiated_by=request.user,
            metadata={"report_key": report_key},
        )
        from .tasks import run_ai_report_draft
        run_ai_report_draft.delay(str(job.id), str(project.id), str(request.user.id), report_key)
        return Response(AsyncJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)

    try:
        from .services.features import generate_report_draft as _gen
        result = _gen(project, request.user, report_key)
        return Response({"text": result["text"], "log_id": result["log_id"]})
    except Exception as e:
        return _safe_error_response(e)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def copilot_query(request, project_id):
    """Answer a scoped project question via AI."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if not _can_use_ai(request, project):
        return Response({"detail": "AI access requires ai.use permission."}, status=status.HTTP_403_FORBIDDEN)

    question = request.data.get("question", "").strip()
    if not question:
        return Response({"detail": "question is required."}, status=status.HTTP_400_BAD_REQUEST)
    if len(question) > 500:
        return Response({"detail": "Question too long (max 500 characters)."}, status=status.HTTP_400_BAD_REQUEST)

    user_perms = _get_user_module_perms(request.user, project)
    use_async = request.query_params.get("async", "").lower() == "true"

    if use_async:
        job = AsyncJob.objects.create(
            job_type="ai_copilot", project=project, initiated_by=request.user,
            metadata={"question": question[:200], "user_perms": list(user_perms)},
        )
        from .tasks import run_ai_copilot
        run_ai_copilot.delay(str(job.id), str(project.id), str(request.user.id), question)
        return Response(AsyncJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)

    try:
        from .services.features import answer_copilot_query
        result = answer_copilot_query(project, request.user, question, user_perms=user_perms)
        return Response({"text": result["text"], "log_id": result["log_id"]})
    except Exception as e:
        return _safe_error_response(e)


# ---------------------------------------------------------------------------
# Job status polling
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def job_status(request, job_id):
    """Poll for async job status. Only the initiator or admin can see a job."""
    try:
        job = AsyncJob.objects.get(pk=job_id)
    except AsyncJob.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if job.initiated_by_id != request.user.id and not request.user.is_admin:
        return Response(status=status.HTTP_404_NOT_FOUND)

    return Response(AsyncJobSerializer(job).data)


# ---------------------------------------------------------------------------
# AI request log (restricted to ai.history holders)
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ai_history(request, project_id):
    """List AI request history for a project. Requires ai.history permission."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if not _can_view_ai_history(request, project):
        return Response({"detail": "AI history requires ai.history permission."},
                        status=status.HTTP_403_FORBIDDEN)

    logs = AIRequestLog.objects.filter(project=project).select_related("user")[:50]
    return Response(AIRequestLogSerializer(logs, many=True).data)
