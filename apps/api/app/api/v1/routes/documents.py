from fastapi import APIRouter, Depends, Query, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
import math
import io

from app.db.session import get_db
from app.schemas.document import (
    DocumentUploadResponse,
    DocumentResponse,
    DocumentListResponse,
    DocumentUpdate
)
from app.models.document import Document
from app.models.project import Project
from app.api.v1.dependencies import get_org_context, OrgContext
from app.services.storage import storage_service
from app.core.config import settings

router = APIRouter()


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    project_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """List documents for a project with pagination and filters"""
    # Verify project exists and belongs to org
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == ctx.organization.id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    query = db.query(Document).filter(
        Document.project_id == project_id,
        Document.organization_id == ctx.organization.id,
        Document.is_deleted == False
    )
    
    # Apply filters
    if category:
        query = query.filter(Document.category == category)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            Document.filename.ilike(search_filter) |
            Document.description.ilike(search_filter)
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    documents = query.order_by(Document.created_at.desc()).offset(offset).limit(page_size).all()
    
    # Build response
    items = []
    for doc in documents:
        uploaded_by_name = f"{doc.uploaded_by.first_name} {doc.uploaded_by.last_name}" if doc.uploaded_by else None
        
        items.append(DocumentResponse(
            id=doc.id,
            organization_id=doc.organization_id,
            project_id=doc.project_id,
            filename=doc.filename,
            file_type=doc.file_type,
            file_size=doc.file_size,
            file_url=doc.file_url,
            storage_path=doc.storage_path,
            uploaded_by_id=doc.uploaded_by_id,
            uploaded_by_name=uploaded_by_name,
            category=doc.category,
            description=doc.description,
            version=doc.version,
            is_latest=doc.is_latest,
            parent_document_id=doc.parent_document_id,
            created_at=doc.created_at,
            updated_at=doc.updated_at
        ))
    
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    
    return DocumentListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    project_id: UUID,
    file: UploadFile = File(...),
    category: Optional[str] = Query(None),
    description: Optional[str] = Query(None),
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Upload a document to a project"""
    # Verify project exists and belongs to org
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == ctx.organization.id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Validate file size
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # Upload to storage
    try:
        storage_path, file_url = await storage_service.upload_file(
            file=io.BytesIO(file_content),
            filename=file.filename or "unnamed",
            org_id=str(ctx.organization.id),
            content_type=file.content_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
    
    # Create document record
    document = Document(
        organization_id=ctx.organization.id,
        project_id=project_id,
        filename=file.filename or "unnamed",
        file_type=file.content_type or "application/octet-stream",
        file_size=file_size,
        file_url=file_url,
        storage_path=storage_path,
        uploaded_by_id=ctx.user.id,
        category=category,
        description=description,
        version=1,
        is_latest=True
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    return DocumentUploadResponse(
        id=document.id,
        filename=document.filename,
        file_size=document.file_size,
        file_url=document.file_url
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    project_id: UUID,
    document_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Get document metadata by ID"""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.project_id == project_id,
        Document.organization_id == ctx.organization.id,
        Document.is_deleted == False
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    uploaded_by_name = f"{document.uploaded_by.first_name} {document.uploaded_by.last_name}" if document.uploaded_by else None
    
    return DocumentResponse(
        id=document.id,
        organization_id=document.organization_id,
        project_id=document.project_id,
        filename=document.filename,
        file_type=document.file_type,
        file_size=document.file_size,
        file_url=document.file_url,
        storage_path=document.storage_path,
        uploaded_by_id=document.uploaded_by_id,
        uploaded_by_name=uploaded_by_name,
        category=document.category,
        description=document.description,
        version=document.version,
        is_latest=document.is_latest,
        parent_document_id=document.parent_document_id,
        created_at=document.created_at,
        updated_at=document.updated_at
    )


@router.get("/{document_id}/download")
async def download_document(
    project_id: UUID,
    document_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Download document file"""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.project_id == project_id,
        Document.organization_id == ctx.organization.id,
        Document.is_deleted == False
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        file_content = await storage_service.download_file(document.storage_path)
        
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type=document.file_type,
            headers={
                "Content-Disposition": f'attachment; filename="{document.filename}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    project_id: UUID,
    document_id: UUID,
    document_data: DocumentUpdate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Update document metadata"""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.project_id == project_id,
        Document.organization_id == ctx.organization.id,
        Document.is_deleted == False
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Update fields
    update_data = document_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(document, field, value)
    
    db.commit()
    db.refresh(document)
    
    uploaded_by_name = f"{document.uploaded_by.first_name} {document.uploaded_by.last_name}" if document.uploaded_by else None
    
    return DocumentResponse(
        id=document.id,
        organization_id=document.organization_id,
        project_id=document.project_id,
        filename=document.filename,
        file_type=document.file_type,
        file_size=document.file_size,
        file_url=document.file_url,
        storage_path=document.storage_path,
        uploaded_by_id=document.uploaded_by_id,
        uploaded_by_name=uploaded_by_name,
        category=document.category,
        description=document.description,
        version=document.version,
        is_latest=document.is_latest,
        parent_document_id=document.parent_document_id,
        created_at=document.created_at,
        updated_at=document.updated_at
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    project_id: UUID,
    document_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Soft delete document"""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.project_id == project_id,
        Document.organization_id == ctx.organization.id,
        Document.is_deleted == False
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    from datetime import datetime
    document.is_deleted = True
    document.deleted_at = datetime.utcnow()
    
    db.commit()
    
    # Note: We don't delete the actual file from storage for recovery purposes
    # A background job could clean up orphaned files periodically
    
    return None
