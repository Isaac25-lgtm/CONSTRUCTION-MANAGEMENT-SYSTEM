"""Scheduling views -- task CRUD, dependencies, milestones, baselines, CPM."""
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import ProjectPermission
from apps.projects.models import Project

from .models import ProjectTask, TaskDependency, Milestone, ScheduleBaseline
from .serializers import (
    TaskSerializer, TaskCreateSerializer,
    DependencySerializer, MilestoneSerializer, BaselineSerializer,
)
from .engine import run_cpm, create_baseline, would_create_cycle


def _get_project_or_404(request, project_id):
    """Get project and verify access."""
    try:
        project = Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
        return None
    if project.organisation_id != request.user.organisation_id:
        return None
    if not request.user.has_project_perm(project, "project.view"):
        return None
    return project


def _can_edit_schedule(request, project):
    return request.user.has_project_perm(project, "schedule.edit")


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def task_list(request, project_id):
    """List or create tasks for a project."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        tasks = ProjectTask.objects.filter(project=project).order_by("sort_order", "code")
        return Response(TaskSerializer(tasks, many=True).data)

    if not _can_edit_schedule(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = TaskCreateSerializer(
        data=request.data,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save(project=project, created_by=request.user)
    return Response(
        TaskSerializer(serializer.instance).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def task_detail(request, project_id, task_id):
    """Retrieve, update, or delete a task."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        task = ProjectTask.objects.get(pk=task_id, project=project)
    except ProjectTask.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(TaskSerializer(task).data)

    if not _can_edit_schedule(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    if request.method == "DELETE":
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = TaskSerializer(
        task,
        data=request.data,
        partial=True,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)

    # Keep row-level CPM-derived fields coherent during manual overrides.
    t = serializer.instance
    update_fields = []
    if any(
        field in request.data
        for field in [
            "duration_days",
            "early_start",
            "early_finish",
            "late_start",
            "late_finish",
            "planned_start",
            "planned_end",
        ]
    ):
        t.total_float = t.late_start - t.early_start
        t.is_critical = t.total_float == 0
        update_fields.extend(["total_float", "is_critical"])

    # Auto-sync progress and status
    if t.progress >= 100 and t.status != "completed":
        t.status = "completed"
        t.progress = 100
        update_fields.extend(["status", "progress"])
    elif t.progress > 0 and t.status == "not_started":
        t.status = "in_progress"
        update_fields.append("status")

    if update_fields:
        t.save(update_fields=list(dict.fromkeys(update_fields)))

    return Response(TaskSerializer(t).data)


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def dependency_list(request, project_id):
    """List or create dependencies."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        deps = TaskDependency.objects.filter(project=project).select_related(
            "predecessor", "successor"
        )
        return Response(DependencySerializer(deps, many=True).data)

    if not _can_edit_schedule(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    # Validation: same project, no self-link, no duplicate
    pred_id = request.data.get("predecessor")
    succ_id = request.data.get("successor")
    if pred_id == succ_id:
        return Response({"detail": "A task cannot depend on itself."}, status=status.HTTP_400_BAD_REQUEST)
    if pred_id and succ_id:
        if not ProjectTask.objects.filter(pk=pred_id, project=project).exists():
            return Response({"detail": "Predecessor not in this project."}, status=status.HTTP_400_BAD_REQUEST)
        if not ProjectTask.objects.filter(pk=succ_id, project=project).exists():
            return Response({"detail": "Successor not in this project."}, status=status.HTTP_400_BAD_REQUEST)
        if TaskDependency.objects.filter(predecessor_id=pred_id, successor_id=succ_id).exists():
            return Response({"detail": "This dependency already exists."}, status=status.HTTP_400_BAD_REQUEST)
        if would_create_cycle(project.id, pred_id, succ_id):
            return Response({"detail": "This dependency would create a cycle."}, status=status.HTTP_400_BAD_REQUEST)

    serializer = DependencySerializer(data={**request.data, "project": str(project.id)})
    serializer.is_valid(raise_exception=True)
    serializer.save(project=project)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def dependency_detail(request, project_id, dep_id):
    """Update or delete a dependency."""
    project = _get_project_or_404(request, project_id)
    if not project or not _can_edit_schedule(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)
    try:
        dep = TaskDependency.objects.get(pk=dep_id, project=project)
    except TaskDependency.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        dep.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH -- update dependency_type and/or lag
    new_type = request.data.get("dependency_type")
    if new_type:
        valid_types = dict(TaskDependency.DEPENDENCY_TYPES)
        if new_type not in valid_types:
            return Response({"detail": f"Invalid type: {new_type}"}, status=status.HTTP_400_BAD_REQUEST)
        dep.dependency_type = new_type
    if "lag_days" in request.data:
        dep.lag_days = int(request.data["lag_days"])
    dep.save()
    return Response(DependencySerializer(dep).data)


# ---------------------------------------------------------------------------
# CPM recalculate
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def recalculate_cpm(request, project_id):
    """Run CPM engine and return results."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if not _can_edit_schedule(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    result = run_cpm(project_id)
    return Response({
        "duration": result.duration,
        "critical_path": result.critical_path,
        "cycle_detected": result.cycle_detected,
        "tasks_updated": result.tasks_updated,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def clear_schedule(request, project_id):
    """Reset manual schedule fields while preserving task identity and dependencies."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if not _can_edit_schedule(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    tasks = list(ProjectTask.objects.filter(project=project))
    for task in tasks:
        task.duration_days = 0
        task.planned_start = None
        task.planned_end = None
        task.early_start = 0
        task.early_finish = 0
        task.late_start = 0
        task.late_finish = 0
        task.total_float = 0
        task.is_critical = False
        task.updated_by = request.user
    if tasks:
        ProjectTask.objects.bulk_update(
            tasks,
            [
                "duration_days",
                "planned_start",
                "planned_end",
                "early_start",
                "early_finish",
                "late_start",
                "late_finish",
                "total_float",
                "is_critical",
                "updated_by",
            ],
        )

    return Response({"tasks_cleared": len(tasks)})


# ---------------------------------------------------------------------------
# Schedule summary
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def schedule_summary(request, project_id):
    """Return schedule summary for project overview."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    # Use leaf tasks only (is_parent=False) for execution KPIs
    leaf_tasks = ProjectTask.objects.filter(project=project, is_parent=False)
    all_tasks = ProjectTask.objects.filter(project=project)
    total = leaf_tasks.count()
    completed = leaf_tasks.filter(status="completed").count()
    in_progress = leaf_tasks.filter(status="in_progress").count()
    delayed = leaf_tasks.filter(status="delayed").count()
    critical = leaf_tasks.filter(is_critical=True).count()
    duration = max((t.early_finish for t in all_tasks), default=0)
    progress = round(sum(t.progress for t in leaf_tasks) / max(total, 1))
    crit_path = list(
        leaf_tasks.filter(is_critical=True).order_by("early_start").values_list("code", flat=True)
    )

    return Response({
        "total_tasks": total,
        "completed": completed,
        "in_progress": in_progress,
        "delayed": delayed,
        "critical_count": critical,
        "project_duration": duration,
        "overall_progress": progress,
        "critical_path": crit_path,
    })


# ---------------------------------------------------------------------------
# Milestones
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def milestone_list(request, project_id):
    """List or create milestones."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        ms = Milestone.objects.filter(project=project)
        return Response(MilestoneSerializer(ms, many=True).data)

    if not _can_edit_schedule(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = MilestoneSerializer(
        data={**request.data, "project": str(project.id)},
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save(project=project, created_by=request.user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def milestone_detail(request, project_id, milestone_id):
    """Update or delete a milestone."""
    project = _get_project_or_404(request, project_id)
    if not project or not _can_edit_schedule(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    try:
        ms = Milestone.objects.get(pk=milestone_id, project=project)
    except Milestone.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        ms.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = MilestoneSerializer(
        ms,
        data=request.data,
        partial=True,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# Baselines
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def baseline_list(request, project_id):
    """List or create baselines."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        baselines = ScheduleBaseline.objects.filter(project=project)
        return Response(BaselineSerializer(baselines, many=True).data)

    if not _can_edit_schedule(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    name = request.data.get("name", "Baseline")
    baseline = create_baseline(project.id, name, created_by=request.user)
    return Response(BaselineSerializer(baseline).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Gantt data
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def gantt_data(request, project_id):
    """Return task data formatted for Gantt chart rendering."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    tasks = ProjectTask.objects.filter(project=project).order_by("sort_order", "code")
    deps = TaskDependency.objects.filter(project=project).select_related(
        "predecessor", "successor"
    )

    task_data = []
    for t in tasks:
        # Compute calendar dates from project start + ES/EF days
        start_date = None
        end_date = None
        if project.start_date:
            from datetime import timedelta
            start_date = str(project.start_date + timedelta(days=t.early_start))
            end_date = str(project.start_date + timedelta(days=t.early_finish))

        assigned_name = ""
        if t.assigned_to:
            assigned_name = t.assigned_to.get_full_name() or t.assigned_to.username
        elif t.resource:
            assigned_name = t.resource

        task_data.append({
            "id": str(t.id),
            "code": t.code,
            "name": t.name,
            "phase": t.phase,
            "start": t.early_start,
            "end": t.early_finish,
            "duration": t.duration_days,
            "progress": t.progress,
            "status": t.status,
            "is_critical": t.is_critical,
            "is_parent": t.is_parent,
            "is_milestone": t.duration_days == 0,
            "start_date": start_date,
            "end_date": end_date,
            "assigned": assigned_name,
            "parent_code": t.parent.code if t.parent else None,
            "late_start": t.late_start,
            "late_finish": t.late_finish,
            "float": t.total_float,
        })

    dep_data = [
        {
            "from": d.predecessor.code,
            "to": d.successor.code,
            "type": d.dependency_type,
        }
        for d in deps
    ]

    milestones = Milestone.objects.filter(project=project).select_related("linked_task")
    ms_data = [
        {
            "name": m.name,
            "task_code": m.linked_task.code if m.linked_task else None,
            "day": m.linked_task.early_finish if m.linked_task else None,
            "status": m.status,
        }
        for m in milestones
    ]

    proj_dur = max((t.early_finish for t in tasks), default=0)
    proj_end = None
    if project.start_date and proj_dur:
        from datetime import timedelta
        proj_end = str(project.start_date + timedelta(days=proj_dur))

    return Response({
        "tasks": task_data,
        "dependencies": dep_data,
        "milestones": ms_data,
        "project_duration": proj_dur,
        "project_start": str(project.start_date) if project.start_date else None,
        "project_end": proj_end,
    })


# ---------------------------------------------------------------------------
# Network data
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def network_data(request, project_id):
    """Return nodes and edges for the network/AON diagram."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    tasks = ProjectTask.objects.filter(project=project, is_parent=False).order_by("sort_order")
    deps = TaskDependency.objects.filter(project=project).select_related("predecessor", "successor")

    nodes = [
        {
            "id": str(t.id),
            "code": t.code,
            "name": t.name,
            "duration": t.duration_days,
            "es": t.early_start,
            "ef": t.early_finish,
            "ls": t.late_start,
            "lf": t.late_finish,
            "slack": t.total_float,
            "is_critical": t.is_critical,
            "progress": t.progress,
        }
        for t in tasks
    ]

    edges = [
        {
            "from": d.predecessor.code,
            "to": d.successor.code,
            "type": d.dependency_type,
            "lag": d.lag_days,
        }
        for d in deps
        if not d.predecessor.is_parent and not d.successor.is_parent
    ]

    return Response({"nodes": nodes, "edges": edges})


# ---------------------------------------------------------------------------
# S-Curve data
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def scurve_data(request, project_id):
    """Return cumulative planned progress data for S-Curve chart."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    tasks = list(ProjectTask.objects.filter(project=project, is_parent=False))
    if not tasks:
        return Response({"planned": [], "actual": [], "project_duration": 0})

    duration = max(t.early_finish for t in tasks)
    total_weight = len(tasks) or 1

    # Planned: cumulative completion at each day
    planned = []
    actual = []
    for day in range(0, duration + 1, max(1, duration // 50)):
        planned_complete = sum(
            1 for t in tasks if t.early_finish <= day
        )
        actual_complete = sum(
            t.progress / 100 for t in tasks if t.early_start <= day
        )
        planned.append({
            "day": day,
            "value": round(planned_complete / total_weight * 100, 1),
        })
        actual.append({
            "day": day,
            "value": round(actual_complete / total_weight * 100, 1),
        })

    return Response({
        "planned": planned,
        "actual": actual,
        "project_duration": duration,
    })
