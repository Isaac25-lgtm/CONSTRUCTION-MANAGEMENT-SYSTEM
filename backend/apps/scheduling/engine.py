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


def build_critical_path_codes(tasks) -> list[str]:
    """
    Return critical activity codes in display order.

    Prototype rule: critical = (slack === 0).
    Guard: duration_days > 0 prevents cleared/untouched rows from appearing.
    Parents are NOT excluded — they participate in the critical path
    like any other task when their slack is genuinely zero.
    """
    critical_tasks = [
        t for t in tasks
        if t.total_float == 0 and t.duration_days > 0
    ]
    critical_tasks.sort(
        key=lambda t: (t.early_start, t.early_finish, t.sort_order, t.code)
    )
    return [t.code for t in critical_tasks]


def get_critical_path_codes(project_id) -> list[str]:
    """Return persisted critical activity codes for a project in display order.

    Matches prototype: all tasks with slack == 0 and duration > 0.
    Parents included when they are genuinely critical.
    """
    tasks = list(
        ProjectTask.objects.filter(
            project_id=project_id,
            total_float=0,
            duration_days__gt=0,
        )
        .order_by("early_start", "early_finish", "sort_order", "code")
    )
    return [task.code for task in tasks]


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
    for task in tasks:
        task.total_float = task.late_start - task.early_start
        task.is_critical = (task.total_float == 0 and task.duration_days > 0)
    critical_path = build_critical_path_codes(tasks)

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


def _prototype_round(value: float) -> int:
    """
    Mirror the prototype's JavaScript Math.round behavior.

    Python's built-in round() uses banker's rounding, which diverges from
    the prototype for .5 values. The task seeding algorithm should match
    the frontend prototype exactly.
    """
    if value >= 0:
        return int(value + 0.5)
    return int(value - 0.5)


def _unique_task_code(preferred: str, fallback_prefix: str, index: int, used_codes: set[str]) -> str:
    """
    Keep prototype codes where possible, but guarantee per-project uniqueness.

    Design-build projects can legitimately collide because the prototype uses
    D1/D2/D3 for design phases and some construction templates also use D1/D2/D3
    as child task codes. We preserve the preferred code when it's free and fall
    back to the classic letter suffix pattern only when needed.
    """
    if preferred and preferred not in used_codes:
        return preferred

    base = f"{fallback_prefix}{chr(97 + index)}"
    if base not in used_codes:
        return base

    serial = 1
    candidate = f"{base}{serial}"
    while candidate in used_codes:
        serial += 1
        candidate = f"{base}{serial}"
    return candidate


def seed_tasks_from_setup(project):
    """
    Generate real ProjectTask and TaskDependency records from the
    project's setup_config phase_templates using weighted distribution.

    Mirrors the prototype's genTasks() algorithm exactly:
    - Phase durP/budP weights control proportional duration and budget allocation
    - Child durP/budP weights distribute within each phase
    - Predecessor chain: phases sequential, children sequential within phase
    - CPM runs after seeding to populate ES/EF/LS/LF/Slack/Critical
    - Milestones linked to phase tasks with derived target dates
    """
    from apps.projects.setup import ProjectSetupConfig

    try:
        config = project.setup_config
    except ProjectSetupConfig.DoesNotExist:
        return 0

    phases = config.phase_templates
    if not phases:
        return 0

    # Calculate total project days from start/end dates
    from datetime import date, timedelta
    total_days = 180  # default
    start = project.start_date
    end = project.end_date
    if isinstance(start, str):
        start = date.fromisoformat(start)
    if isinstance(end, str):
        end = date.fromisoformat(end)
    if start and end:
        delta = (end - start).days
        if delta > 0:
            total_days = delta

    total_budget = float(project.budget) if project.budget else 0

    # Normalize phase weights (prototype: totalDurP, totalBudP)
    total_dur_p = sum(p.get("durP", 0.1) for p in phases) or 1.0
    total_bud_p = sum(p.get("budP", 0.1) for p in phases) or 1.0

    # Look up the predecessor template for this project type
    from apps.projects.setup import PREDECESSOR_TEMPLATES, DEFAULT_PREDECESSOR_TEMPLATE
    ptype = project.project_type or "custom"
    pred_template = PREDECESSOR_TEMPLATES.get(ptype, DEFAULT_PREDECESSOR_TEMPLATE)

    # Handle Design & Build prefix: D1→D2→D3→first_construction_phase
    has_design = config.has_design_phase
    if has_design:
        # Design phases are always sequential and critical
        design_pred = {"D1": [], "D2": ["D1"], "D3": ["D2"]}
        # First construction phase depends on D3 instead of being a start node
        first_construction_id = phases[3]["id"] if len(phases) > 3 else phases[0]["id"]
        pred_template = {**design_pred, **{k: v for k, v in pred_template.items()}}
        if first_construction_id in pred_template and not pred_template[first_construction_id]:
            pred_template[first_construction_id] = ["D3"]

    sort_idx = 0
    all_tasks = []
    used_codes = set()
    phase_task_by_id = {}  # Maps phase template ID → created ProjectTask

    for phase in phases:
        phase_id = _unique_task_code(phase["id"], phase["id"], 0, used_codes)
        phase_name = phase["name"]
        children = phase.get("children", [])
        phase_dur_p = phase.get("durP", 0.1)
        phase_bud_p = phase.get("budP", 0.1)
        phase_res = phase.get("res", "")

        # Weighted phase duration and budget (prototype: phaseDur, phaseBud)
        phase_dur = max(_prototype_round(total_days * (phase_dur_p / total_dur_p)), 1)
        phase_bud = _prototype_round(total_budget * (phase_bud_p / total_bud_p))

        # Create parent phase task
        phase_task = ProjectTask.objects.create(
            project=project,
            code=phase_id,
            name=phase_name,
            phase=phase_name,
            duration_days=phase_dur,
            sort_order=sort_idx,
            is_parent=True,
            budget=phase_bud,
            resource=phase_res,
        )
        sort_idx += 1
        all_tasks.append(phase_task)
        used_codes.add(phase_task.code)
        phase_task_by_id[phase["id"]] = phase_task

        # Create child tasks with weighted distribution
        if children:
            child_total_dur_p = sum(c.get("durP", 0.01) for c in children) or 1.0
            child_total_bud_p = sum(c.get("budP", 0.01) for c in children) or 1.0

            prev_child = None
            for ci, child in enumerate(children):
                # Support both old format (string name) and new format (dict with weights)
                if isinstance(child, str):
                    child_name = child
                    child_dur_p = 1.0 / len(children)
                    child_bud_p = 1.0 / len(children)
                    child_res = ""
                    child_code_id = ""
                else:
                    child_name = child["name"]
                    child_dur_p = child.get("durP", 0.01)
                    child_bud_p = child.get("budP", 0.01)
                    child_res = child.get("res", "")
                    child_code_id = child.get("id", "")

                # Weighted child duration and budget (prototype: cDur, cBud)
                c_dur = max(_prototype_round(phase_dur * (child_dur_p / child_total_dur_p)), 1)
                c_bud = _prototype_round(phase_bud * (child_bud_p / child_total_bud_p))

                # Child code: prefer prototype id, but keep project codes unique.
                child_code = _unique_task_code(child_code_id, phase_id, ci, used_codes)

                child_task = ProjectTask.objects.create(
                    project=project,
                    parent=phase_task,
                    code=child_code,
                    name=child_name,
                    phase=phase_name,
                    duration_days=c_dur,
                    sort_order=sort_idx,
                    is_parent=False,
                    budget=c_bud,
                    resource=child_res,
                )
                sort_idx += 1
                all_tasks.append(child_task)
                used_codes.add(child_task.code)

                # Child dependency chain (prototype: first child → parent SS, rest → prev child FS)
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

    # Assign phase-to-phase predecessors from the template (NOT sequential)
    # This creates forks and joins for meaningful critical path classification
    for phase in phases:
        phase_task = phase_task_by_id.get(phase["id"])
        if not phase_task:
            continue
        pred_ids = pred_template.get(phase["id"], [])
        for pred_id in pred_ids:
            pred_task = phase_task_by_id.get(pred_id)
            if pred_task:
                TaskDependency.objects.create(
                    project=project,
                    predecessor=pred_task,
                    successor=phase_task,
                    dependency_type="FS",
                )

    # Run CPM to populate ES/EF/LS/LF/Slack/Critical (prototype: runCPM)
    run_cpm(project.id)

    # Seed milestones from config using the prototype's explicit task-code linkage.
    from .models import Milestone as MilestoneModel

    milestone_templates = config.milestone_templates or []
    task_by_code = {task.code: task for task in all_tasks}
    phase_tasks = [task for task in all_tasks if task.is_parent]
    project_start = project.start_date
    if isinstance(project_start, str):
        project_start = date.fromisoformat(project_start)

    for mi, milestone in enumerate(milestone_templates):
        if isinstance(milestone, dict):
            ms_name = milestone.get("name", "")
            task_code = milestone.get("task_code", "")
        else:
            # Backward compatibility for older configs created before the
            # prototype task-code mapping was stored in setup_config.
            ms_name = milestone
            linked = phase_tasks[min(mi, len(phase_tasks) - 1)] if phase_tasks else None
            task_code = linked.code if linked else ""

        linked = task_by_code.get(task_code)
        if not ms_name or not linked:
            continue

        target = None
        if linked and project_start:
            linked.refresh_from_db()
            target = project_start + timedelta(days=linked.early_finish)

        MilestoneModel.objects.create(
            project=project,
            code=task_code,
            name=ms_name,
            linked_task=linked,
            target_date=target,
            sort_order=mi,
            status="pending",
        )

    return len(all_tasks)
