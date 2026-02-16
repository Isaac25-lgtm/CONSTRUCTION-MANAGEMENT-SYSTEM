from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
import math

from app.db.session import get_db
from app.schemas.analytics import AuditLogResponse, AuditLogListResponse
from app.models.audit_log import AuditLog
from app.models.user import User
from app.api.v1.dependencies import get_org_context, OrgContext

router = APIRouter()


@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    entity_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    user_id: Optional[UUID] = Query(None),
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """List audit logs for the current organization"""
    query = db.query(AuditLog).filter(
        AuditLog.organization_id == ctx.organization.id
    )
    
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if action:
        query = query.filter(AuditLog.action == action)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    
    total = query.count()
    offset = (page - 1) * page_size
    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size).all()
    
    items = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first() if log.user_id else None
        user_name = f"{user.first_name} {user.last_name}" if user else None
        
        items.append(AuditLogResponse(
            id=log.id,
            organization_id=log.organization_id,
            user_id=log.user_id,
            user_name=user_name,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            before_state=log.before_state,
            after_state=log.after_state,
            details=log.details,
            description=log.description,
            created_at=log.created_at
        ))
    
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    
    return AuditLogListResponse(
        items=items, total=total, page=page, page_size=page_size, total_pages=total_pages
    )
