"""Celery tasks for async AI and export operations."""
import logging

from celery import shared_task

logger = logging.getLogger("buildpro.ai")


@shared_task(bind=True, max_retries=1, soft_time_limit=120)
def run_ai_narrative(self, job_id, project_id, user_id):
    """Async task: generate cost/schedule narrative."""
    from apps.ai.models import AsyncJob
    from apps.ai.services.features import generate_narrative
    from apps.accounts.models import User
    from apps.projects.models import Project

    job = AsyncJob.objects.get(pk=job_id)
    job.mark_running()

    try:
        project = Project.objects.get(pk=project_id)
        user = User.objects.get(pk=user_id)
        result = generate_narrative(project, user, async_job=job)
        job.mark_completed(output=result["text"])
        return {"status": "completed", "log_id": result["log_id"]}
    except Exception as exc:
        job.mark_failed(error=str(exc)[:500])
        logger.error("AI narrative task failed: %s", exc)
        raise


@shared_task(bind=True, max_retries=1, soft_time_limit=120)
def run_ai_report_draft(self, job_id, project_id, user_id, report_key):
    """Async task: generate AI report draft."""
    from apps.ai.models import AsyncJob
    from apps.ai.services.features import generate_report_draft
    from apps.accounts.models import User
    from apps.projects.models import Project

    job = AsyncJob.objects.get(pk=job_id)
    job.mark_running()

    try:
        project = Project.objects.get(pk=project_id)
        user = User.objects.get(pk=user_id)
        result = generate_report_draft(project, user, report_key, async_job=job)
        job.mark_completed(output=result["text"])
        return {"status": "completed", "log_id": result["log_id"]}
    except Exception as exc:
        job.mark_failed(error=str(exc)[:500])
        logger.error("AI report draft task failed: %s", exc)
        raise


@shared_task(bind=True, max_retries=0, soft_time_limit=60)
def run_ai_copilot(self, job_id, project_id, user_id, question):
    """Async task: answer copilot question."""
    from apps.ai.models import AsyncJob
    from apps.ai.services.features import answer_copilot_query
    from apps.accounts.models import User
    from apps.projects.models import Project

    job = AsyncJob.objects.get(pk=job_id)
    job.mark_running()

    try:
        project = Project.objects.get(pk=project_id)
        user = User.objects.get(pk=user_id)
        result = answer_copilot_query(project, user, question, async_job=job)
        job.mark_completed(output=result["text"])
        return {"status": "completed", "log_id": result["log_id"]}
    except Exception as exc:
        job.mark_failed(error=str(exc)[:500])
        logger.error("AI copilot task failed: %s", exc)
        raise
