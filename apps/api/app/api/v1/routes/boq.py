from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.dependencies import (
    OrgContext,
    ensure_project_permission,
    get_org_context,
    get_project_or_404,
)
from app.db.session import get_db
from app.models.boq import BOQHeader, BOQItem
from app.schemas.boq import (
    BOQHeaderCreate,
    BOQHeaderResponse,
    BOQItemCreate,
    BOQItemResponse,
    BOQItemUpdate,
    BOQSummaryResponse,
)

router = APIRouter()


def _decimal_value(value: Any, default: Decimal = Decimal("0")) -> Decimal:
    if value is None or value == "":
        return default
    try:
        return Decimal(str(value))
    except Exception:
        return default


def _int_value(value: Any, default: int = 0, min_value: int | None = None, max_value: int | None = None) -> int:
    if value is None or value == "":
        parsed = default
    else:
        try:
            parsed = int(value)
        except Exception:
            parsed = default
    if min_value is not None:
        parsed = max(min_value, parsed)
    if max_value is not None:
        parsed = min(max_value, parsed)
    return parsed


def _compute_budget(quantity: Decimal, rate: Decimal) -> Decimal:
    return (quantity * rate).quantize(Decimal("0.01"))


def _compute_variance(budget_cost: Decimal, actual_cost: Decimal) -> Decimal:
    return (budget_cost - actual_cost).quantize(Decimal("0.01"))


def _leaf_items(items: list[BOQItem]) -> list[BOQItem]:
    parent_ids = {item.parent_item_id for item in items if item.parent_item_id}
    return [item for item in items if item.id not in parent_ids]


def _compute_weighted_completion(items: list[BOQItem]) -> float:
    leaves = _leaf_items(items)
    if not leaves:
        return 0.0

    total_weight = Decimal("0")
    weighted_sum = Decimal("0")
    for item in leaves:
        weight_fraction = Decimal(item.weight_out_of_10 or 0) / Decimal("10")
        completion_fraction = Decimal(item.percent_complete or 0) / Decimal("100")
        total_weight += weight_fraction
        weighted_sum += weight_fraction * completion_fraction

    if total_weight <= 0:
        return float(
            sum((item.percent_complete or 0) for item in leaves) / max(len(leaves), 1)
        )

    return float((weighted_sum / total_weight) * Decimal("100"))


def _serialize_item(item: BOQItem) -> BOQItemResponse:
    return BOQItemResponse(
        id=item.id,
        header_id=item.header_id,
        organization_id=item.organization_id,
        project_id=item.project_id,
        parent_item_id=item.parent_item_id,
        item_code=item.item_code,
        description=item.description,
        unit=item.unit,
        quantity=item.quantity,
        rate=item.rate,
        budget_cost=item.budget_cost,
        weight_out_of_10=item.weight_out_of_10,
        percent_complete=item.percent_complete,
        actual_cost=item.actual_cost,
        variance=_compute_variance(item.budget_cost, item.actual_cost),
        created_at=item.created_at,
        updated_at=item.updated_at,
        children=[],
    )


def _build_item_tree(items: list[BOQItem]) -> list[BOQItemResponse]:
    mapped = {item.id: _serialize_item(item) for item in items}
    roots: list[BOQItemResponse] = []
    for item in items:
        node = mapped[item.id]
        if item.parent_item_id and item.parent_item_id in mapped:
            mapped[item.parent_item_id].children.append(node)
        else:
            roots.append(node)
    return roots


def _get_or_create_header(
    db: Session,
    *,
    org_id: UUID,
    project_id: UUID,
    title: str = "Project BOQ",
    start_date: date | None = None,
    end_date: date | None = None,
    currency: str = "UGX",
) -> BOQHeader:
    header = (
        db.query(BOQHeader)
        .filter(BOQHeader.organization_id == org_id, BOQHeader.project_id == project_id)
        .order_by(BOQHeader.updated_at.desc())
        .first()
    )
    if header:
        return header

    header = BOQHeader(
        organization_id=org_id,
        project_id=project_id,
        title=title,
        start_date=start_date,
        end_date=end_date,
        currency=currency,
    )
    db.add(header)
    db.flush()
    return header


def _get_latest_header_or_404(db: Session, *, org_id: UUID, project_id: UUID) -> BOQHeader:
    header = (
        db.query(BOQHeader)
        .filter(BOQHeader.organization_id == org_id, BOQHeader.project_id == project_id)
        .order_by(BOQHeader.updated_at.desc())
        .first()
    )
    if not header:
        raise HTTPException(status_code=404, detail="No BOQ found for this project")
    return header


# ── Header ──────────────────────────────────────────────────────────────────

@router.post("", response_model=BOQHeaderResponse)
async def create_or_get_header(
    project_id: UUID,
    body: BOQHeaderCreate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    """Return the existing BOQ header for this project, or create one."""
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db, project, ctx.user, "can_edit_tasks",
        "You do not have permission to manage BOQ for this project",
    )

    header = _get_or_create_header(
        db,
        org_id=ctx.organization.id,
        project_id=project_id,
        title=body.title,
        start_date=body.start_date,
        end_date=body.end_date,
        currency=body.currency,
    )
    db.commit()
    items = db.query(BOQItem).filter(BOQItem.header_id == header.id).all()
    return BOQHeaderResponse(
        id=header.id,
        organization_id=header.organization_id,
        project_id=header.project_id,
        title=header.title,
        start_date=header.start_date,
        end_date=header.end_date,
        currency=header.currency,
        created_at=header.created_at,
        updated_at=header.updated_at,
        items=_build_item_tree(items),
    )


@router.get("", response_model=BOQHeaderResponse)
async def get_boq(
    project_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db, project, ctx.user, "can_view_project",
        "You do not have permission to view BOQ data in this project",
    )

    header = _get_latest_header_or_404(db, org_id=ctx.organization.id, project_id=project_id)
    items = db.query(BOQItem).filter(BOQItem.header_id == header.id).all()
    return BOQHeaderResponse(
        id=header.id,
        organization_id=header.organization_id,
        project_id=header.project_id,
        title=header.title,
        start_date=header.start_date,
        end_date=header.end_date,
        currency=header.currency,
        created_at=header.created_at,
        updated_at=header.updated_at,
        items=_build_item_tree(items),
    )


# ── Items ───────────────────────────────────────────────────────────────────

@router.post("/items", response_model=BOQItemResponse)
async def create_boq_item(
    project_id: UUID,
    body: BOQItemCreate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    """Create a single BOQ item. Auto-creates a header if none exists."""
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db, project, ctx.user, "can_edit_tasks",
        "You do not have permission to add BOQ items to this project",
    )

    header = _get_or_create_header(db, org_id=ctx.organization.id, project_id=project_id)

    if body.parent_item_id:
        parent = db.query(BOQItem).filter(
            BOQItem.id == body.parent_item_id,
            BOQItem.header_id == header.id,
        ).first()
        if not parent:
            raise HTTPException(status_code=400, detail="Parent item not found in this BOQ")

    quantity = _decimal_value(body.quantity)
    rate = _decimal_value(body.rate)

    item = BOQItem(
        header_id=header.id,
        organization_id=ctx.organization.id,
        project_id=project_id,
        item_code=body.item_code,
        description=body.description,
        unit=body.unit,
        quantity=quantity,
        rate=rate,
        budget_cost=_compute_budget(quantity, rate),
        weight_out_of_10=_int_value(body.weight_out_of_10, default=1, min_value=0, max_value=10),
        percent_complete=_int_value(body.percent_complete, default=0, min_value=0, max_value=100),
        actual_cost=_decimal_value(body.actual_cost),
        parent_item_id=body.parent_item_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _serialize_item(item)


@router.patch("/items/{item_id}", response_model=BOQItemResponse)
async def patch_boq_item(
    project_id: UUID,
    item_id: UUID,
    item_data: BOQItemUpdate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db, project, ctx.user, "can_edit_tasks",
        "You do not have permission to update BOQ items in this project",
    )

    item = (
        db.query(BOQItem)
        .filter(
            BOQItem.id == item_id,
            BOQItem.organization_id == ctx.organization.id,
            BOQItem.project_id == project_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="BOQ item not found")

    update_data = item_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    item.weight_out_of_10 = _int_value(item.weight_out_of_10, default=1, min_value=0, max_value=10)
    item.percent_complete = _int_value(item.percent_complete, default=0, min_value=0, max_value=100)
    item.quantity = _decimal_value(item.quantity, Decimal("0"))
    item.rate = _decimal_value(item.rate, Decimal("0"))
    item.actual_cost = _decimal_value(item.actual_cost, Decimal("0"))
    item.budget_cost = _compute_budget(item.quantity, item.rate)

    db.commit()
    db.refresh(item)
    return _serialize_item(item)


@router.delete("/items/{item_id}", status_code=204)
async def delete_boq_item(
    project_id: UUID,
    item_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    """Delete a BOQ item and its children."""
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db, project, ctx.user, "can_edit_tasks",
        "You do not have permission to delete BOQ items in this project",
    )

    item = (
        db.query(BOQItem)
        .filter(
            BOQItem.id == item_id,
            BOQItem.organization_id == ctx.organization.id,
            BOQItem.project_id == project_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="BOQ item not found")

    # Delete children first, then the item itself
    db.query(BOQItem).filter(BOQItem.parent_item_id == item_id).delete(synchronize_session=False)
    db.delete(item)
    db.commit()
    return None


# ── Summary & Sync ──────────────────────────────────────────────────────────

@router.get("/summary", response_model=BOQSummaryResponse)
async def get_boq_summary(
    project_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db, project, ctx.user, "can_view_project",
        "You do not have permission to view BOQ summary in this project",
    )

    header = _get_latest_header_or_404(db, org_id=ctx.organization.id, project_id=project_id)
    items = db.query(BOQItem).filter(BOQItem.header_id == header.id).all()
    if not items:
        return BOQSummaryResponse(
            header_id=header.id,
            project_id=project_id,
            total_items=0,
            total_budget_cost=Decimal("0.00"),
            total_actual_cost=Decimal("0.00"),
            total_variance=Decimal("0.00"),
            project_weighted_completion_percent=0.0,
        )

    total_budget = sum((item.budget_cost for item in items), Decimal("0"))
    total_actual = sum((item.actual_cost for item in items), Decimal("0"))
    total_variance = _compute_variance(total_budget, total_actual)
    weighted_completion = _compute_weighted_completion(items)

    return BOQSummaryResponse(
        header_id=header.id,
        project_id=project_id,
        total_items=len(items),
        total_budget_cost=total_budget.quantize(Decimal("0.01")),
        total_actual_cost=total_actual.quantize(Decimal("0.01")),
        total_variance=total_variance,
        project_weighted_completion_percent=round(weighted_completion, 2),
    )


