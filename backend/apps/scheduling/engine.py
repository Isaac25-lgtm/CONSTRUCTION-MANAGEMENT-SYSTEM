"""
CPM (Critical Path Method) engine for BuildPro.

Implementation follows Kelley & Walker (1959) and PMI PMBOK methodology:
1. Topological sort (Kahn's algorithm) to detect cycles and order tasks
2. Forward pass: compute Early Start (ES) and Early Finish (EF)
3. Backward pass: compute Late Start (LS) and Late Finish (LF)
4. Float calculation and critical path identification

This engine operates on persisted ProjectTask and TaskDependency records.
It is the server-side authority -- the frontend never computes CPM values.
"""
from collections import defaultdict, deque
from typing import NamedTuple

from .models import ProjectTask, TaskDependency


class CPMResult(NamedTuple):
    duration: int
    critical_path: list  # list of task codes
    cycle_detected: bool
    tasks_updated: int


def would_create_cycle(project_id, predecessor_id, successor_id):
    """
    Check if adding an edge predecessor->successor would create a cycle.

    Simulates the edge in-memory using existing dependencies + the proposed one,
    then runs Kahn's algorithm. If topo sort doesn't visit all nodes, a cycle exists.
    """
    import uuid as uuid_mod
    # Normalize IDs to UUID objects for consistent comparison
    try:
        predecessor_id = uuid_mod.UUID(str(predecessor_id))
        successor_id = uuid_mod.UUID(str(successor_id))
    except (ValueError, TypeError):
        return False

    tasks = list(
        ProjectTask.objects.filter(project_id=project_id).values_list("id", flat=True)
    )
    if not tasks:
        return False

    task_set = set(tasks)
    if predecessor_id not in task_set or successor_id not in task_set:
        return False

    # Build adjacency from existing deps + proposed edge
    succ_map = defaultdict(list)
    in_degree = {tid: 0 for tid in tasks}

    for dep in TaskDependency.objects.filter(project_id=project_id):
        if dep.predecessor_id in task_set and dep.successor_id in task_set:
            succ_map[dep.predecessor_id].append(dep.successor_id)
            in_degree[dep.successor_id] += 1

    # Add proposed edge
    succ_map[predecessor_id].append(successor_id)
    in_degree[successor_id] += 1

    # Kahn's
    queue = deque(tid for tid, deg in in_degree.items() if deg == 0)
    visited = 0
    while queue:
        tid = queue.popleft()
        visited += 1
        for sid in succ_map[tid]:
            in_degree[sid] -= 1
            if in_degree[sid] == 0:
                queue.append(sid)

    return visited < len(tasks)  # True = cycle detected


def run_cpm(project_id) -> CPMResult:
    """
    Run the full CPM calculation for a project and persist results.

    Supports all 4 dependency types:
      FS (Finish-to-Start): succ.ES >= pred.EF + lag
      SS (Start-to-Start):  succ.ES >= pred.ES + lag
      FF (Finish-to-Finish): succ.EF >= pred.EF + lag => succ.ES >= pred.EF + lag - succ.dur
      SF (Start-to-Finish):  succ.EF >= pred.ES + lag => succ.ES >= pred.ES + lag - succ.dur
    """
    tasks = list(
        ProjectTask.objects.filter(project_id=project_id)
        .order_by("sort_order", "code")
    )

    if not tasks:
        return CPMResult(duration=0, critical_path=[], cycle_detected=False, tasks_updated=0)

    task_map = {t.id: t for t in tasks}

    # Load dependencies with type
    deps = list(
        TaskDependency.objects.filter(project_id=project_id)
        .select_related("predecessor", "successor")
    )

    # Build adjacency: store (pred_id, lag, dep_type) per successor
    pred_map = defaultdict(list)   # succ_id -> [(pred_id, lag, type)]
    succ_map = defaultdict(list)   # pred_id -> [(succ_id, lag, type)]
    in_degree = {t.id: 0 for t in tasks}

    for dep in deps:
        if dep.predecessor_id in task_map and dep.successor_id in task_map:
            dtype = dep.dependency_type or "FS"
            pred_map[dep.successor_id].append((dep.predecessor_id, dep.lag_days, dtype))
            succ_map[dep.predecessor_id].append((dep.successor_id, dep.lag_days, dtype))
            in_degree[dep.successor_id] += 1

    # --- Phase 1: Topological sort (Kahn's algorithm) ---
    queue = deque(tid for tid, deg in in_degree.items() if deg == 0)
    topo_order = []

    while queue:
        tid = queue.popleft()
        topo_order.append(tid)
        for succ_id, _, _ in succ_map[tid]:
            in_degree[succ_id] -= 1
            if in_degree[succ_id] == 0:
                queue.append(succ_id)

    cycle_detected = len(topo_order) < len(tasks)
    if cycle_detected:
        remaining = [t.id for t in tasks if t.id not in set(topo_order)]
        topo_order.extend(remaining)

    # --- Phase 2: Forward pass (ES/EF per dependency type) ---
    for tid in topo_order:
        task = task_map[tid]
        constraints = pred_map[tid]
        if constraints:
            es_values = []
            for pid, lag, dtype in constraints:
                pred = task_map.get(pid)
                if not pred:
                    continue
                if dtype == "FS":
                    es_values.append(pred.early_finish + lag)
                elif dtype == "SS":
                    es_values.append(pred.early_start + lag)
                elif dtype == "FF":
                    # succ.EF >= pred.EF + lag => succ.ES >= pred.EF + lag - succ.dur
                    es_values.append(pred.early_finish + lag - task.duration_days)
                elif dtype == "SF":
                    # succ.EF >= pred.ES + lag => succ.ES >= pred.ES + lag - succ.dur
                    es_values.append(pred.early_start + lag - task.duration_days)
            task.early_start = max(max(es_values), 0) if es_values else 0
        else:
            task.early_start = 0
        task.early_finish = task.early_start + task.duration_days

    # --- Phase 3: Project duration ---
    project_duration = max((t.early_finish for t in tasks), default=0)
    if project_duration == 0:
        project_duration = 1

    # --- Phase 4: Backward pass (LF/LS per dependency type) ---
    for tid in reversed(topo_order):
        task = task_map[tid]
        constraints = succ_map[tid]
        if constraints:
            lf_values = []
            for sid, lag, dtype in constraints:
                succ = task_map.get(sid)
                if not succ:
                    continue
                if dtype == "FS":
                    # pred.LF <= succ.LS - lag => we want pred.EF before succ.ES
                    lf_values.append(succ.late_start - lag)
                elif dtype == "SS":
                    # pred.LS <= succ.LS - lag => pred.LF = succ.LS - lag + pred.dur
                    lf_values.append(succ.late_start - lag + task.duration_days)
                elif dtype == "FF":
                    lf_values.append(succ.late_finish - lag)
                elif dtype == "SF":
                    # pred.ES + lag <= succ.EF => pred.LF = succ.late_finish - lag + pred.dur
                    lf_values.append(succ.late_finish - lag + task.duration_days)
            task.late_finish = min(lf_values) if lf_values else project_duration
        else:
            task.late_finish = project_duration
        task.late_start = task.late_finish - task.duration_days

    # --- Phase 5: Float and critical path ---
    critical_path = []
    for task in tasks:
        task.total_float = task.late_start - task.early_start
        task.is_critical = (task.total_float == 0 and task.duration_days > 0)
        if task.is_critical:
            critical_path.append(task.code)

    # --- Phase 6: Persist ---
    bulk_fields = [
        "early_start", "early_finish", "late_start", "late_finish",
        "total_float", "is_critical",
    ]
    ProjectTask.objects.bulk_update(tasks, bulk_fields)

    return CPMResult(
        duration=project_duration,
        critical_path=critical_path,
        cycle_detected=cycle_detected,
        tasks_updated=len(tasks),
    )


def create_baseline(project_id, name: str, created_by=None) -> "ScheduleBaseline":
    """Create a baseline snapshot of the current schedule state."""
    from .models import ScheduleBaseline, BaselineTaskSnapshot

    # Deactivate existing active baselines
    ScheduleBaseline.objects.filter(project_id=project_id, is_active=True).update(
        is_active=False
    )

    # Determine version number
    last_version = (
        ScheduleBaseline.objects.filter(project_id=project_id)
        .order_by("-version")
        .values_list("version", flat=True)
        .first()
    ) or 0

    baseline = ScheduleBaseline.objects.create(
        project_id=project_id,
        name=name,
        version=last_version + 1,
        is_active=True,
        created_by=created_by,
    )

    tasks = ProjectTask.objects.filter(project_id=project_id)
    snapshots = [
        BaselineTaskSnapshot(
            baseline=baseline,
            task=task,
            code=task.code,
            name=task.name,
            duration_days=task.duration_days,
            early_start=task.early_start,
            early_finish=task.early_finish,
            progress=task.progress,
            budget=task.budget,
        )
        for task in tasks
    ]
    BaselineTaskSnapshot.objects.bulk_create(snapshots)

    return baseline


def seed_tasks_from_setup(project):
    """
    Generate real ProjectTask and TaskDependency records from the
    project's setup_config phase_templates.

    Called by the seed data command to populate schedules.
    """
    from apps.projects.setup import ProjectSetupConfig

    try:
        config = project.setup_config
    except ProjectSetupConfig.DoesNotExist:
        return

    phases = config.phase_templates
    if not phases:
        return

    # Calculate duration distribution based on project dates
    from datetime import date, timedelta
    total_days = 180  # default
    start = project.start_date
    end = project.end_date
    # Handle string dates from seed data
    if isinstance(start, str):
        start = date.fromisoformat(start)
    if isinstance(end, str):
        end = date.fromisoformat(end)
    if start and end:
        delta = (end - start).days
        if delta > 0:
            total_days = delta

    sort_idx = 0
    prev_phase_task = None
    all_tasks = []

    for phase in phases:
        phase_id = phase["id"]
        phase_name = phase["name"]
        children = phase.get("children", [])
        num_children = len(children) if children else 1

        # Phase duration proportional to children count
        phase_dur = max(round(total_days * num_children / max(sum(len(p.get("children", [])) for p in phases), 1)), 1)

        # Create parent phase task
        phase_task = ProjectTask.objects.create(
            project=project,
            code=phase_id,
            name=phase_name,
            phase=phase_name,
            duration_days=phase_dur,
            sort_order=sort_idx,
            is_parent=True,
            budget=0,
        )
        sort_idx += 1
        all_tasks.append(phase_task)

        # Create FS dependency from previous phase
        if prev_phase_task:
            TaskDependency.objects.create(
                project=project,
                predecessor=prev_phase_task,
                successor=phase_task,
                dependency_type="FS",
            )

        # Create child tasks (use lowercase letter suffix to avoid code collisions)
        prev_child = None
        for ci, child_name in enumerate(children):
            suffix = chr(97 + ci)  # a, b, c, d...
            child_code = f"{phase_id}{suffix}"
            child_dur = max(round(phase_dur / num_children), 1)
            child_task = ProjectTask.objects.create(
                project=project,
                parent=phase_task,
                code=child_code,
                name=child_name,
                phase=phase_name,
                duration_days=child_dur,
                sort_order=sort_idx,
                is_parent=False,
                budget=0,
            )
            sort_idx += 1
            all_tasks.append(child_task)

            # Child depends on parent (start) or previous child
            if ci == 0:
                TaskDependency.objects.create(
                    project=project,
                    predecessor=phase_task,
                    successor=child_task,
                    dependency_type="SS",
                )
            elif prev_child:
                TaskDependency.objects.create(
                    project=project,
                    predecessor=prev_child,
                    successor=child_task,
                    dependency_type="FS",
                )
            prev_child = child_task

        prev_phase_task = phase_task

    # Run CPM to populate schedule values
    run_cpm(project.id)

    # Distribute project budget across leaf tasks proportionally by duration
    # This gives baseline snapshots meaningful task budgets for EVM
    project_budget = float(project.budget) if project.budget else 0
    leaf_tasks = [t for t in all_tasks if not t.is_parent]
    total_leaf_dur = sum(t.duration_days for t in leaf_tasks) or 1
    if project_budget > 0 and leaf_tasks:
        for t in leaf_tasks:
            t.budget = round(project_budget * t.duration_days / total_leaf_dur)
        ProjectTask.objects.bulk_update(leaf_tasks, ["budget"])

    # Seed milestones from config -- link to phase tasks and derive target dates
    from .models import Milestone as MilestoneModel
    from datetime import date as date_type, timedelta

    milestone_names = config.milestone_templates or []
    phase_tasks = [t for t in all_tasks if t.is_parent]
    project_start = project.start_date
    if isinstance(project_start, str):
        project_start = date_type.fromisoformat(project_start)

    for mi, ms_name in enumerate(milestone_names):
        # Link milestone to the phase task at the corresponding index (or last)
        linked = phase_tasks[min(mi, len(phase_tasks) - 1)] if phase_tasks else None

        # Derive target date from linked task's early_finish
        target = None
        if linked and project_start:
            linked.refresh_from_db()
            target = project_start + timedelta(days=linked.early_finish)

        MilestoneModel.objects.create(
            project=project,
            name=ms_name,
            linked_task=linked,
            target_date=target,
            sort_order=mi,
            status="pending",
        )

    return len(all_tasks)
