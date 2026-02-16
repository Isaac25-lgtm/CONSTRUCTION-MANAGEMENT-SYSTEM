import io
import math
from pathlib import Path
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.v1.dependencies import (
    OrgContext,
    ensure_project_permission,
    get_org_context,
    get_project_or_404,
)
from app.core.config import settings
from app.db.session import get_db
from app.models.document import Document
from app.schemas.document import (
    DocumentListResponse,
    DocumentResponse,
    DocumentUpdate,
    DocumentUploadResponse,
)
from app.services.storage import (
    FileSizeLimitExceededError,
    StorageService,
    get_storage_service,
)

router = APIRouter()


def _get_allowed_extensions() -> set[str]:
    return {
        ext.lower() if ext.startswith(".") else f".{ext.lower()}"
        for ext in settings.ALLOWED_EXTENSIONS
    }


def _max_upload_size_error() -> str:
    max_mb = settings.MAX_UPLOAD_SIZE / 1024 / 1024
    return f"File size exceeds maximum allowed size of {max_mb}MB"


def _resolve_document_type(
    document_type: Optional[str],
    category: Optional[str],
) -> Optional[str]:
    """Resolve document type from preferred `document_type` and deprecated `category`."""
    if document_type is not None:
        return document_type
    return category


def _build_file_url(
    storage_provider: str,
    storage_key: str,
    storage_service: Optional[StorageService] = None,
) -> str:
    provider = (storage_provider or "").lower()
    if provider in {"r2", "s3"}:
        if settings.R2_PUBLIC_URL:
            return f"{settings.R2_PUBLIC_URL.rstrip('/')}/{storage_key}"
        if storage_service is None:
            storage_service = get_storage_service()
        return storage_service.generate_presigned_url(storage_key)
    return f"/uploads/{storage_key}"


def _to_document_response(
    document: Document,
    storage_service: Optional[StorageService] = None,
) -> DocumentResponse:
    uploaded_by_name = None
    if document.uploaded_by:
        uploaded_by_name = f"{document.uploaded_by.first_name} {document.uploaded_by.last_name}"

    return DocumentResponse(
        id=document.id,
        organization_id=document.organization_id,
        project_id=document.project_id,
        name=document.name,
        description=document.description,
        document_type=document.document_type,
        file_size=document.file_size,
        mime_type=document.mime_type,
        storage_provider=document.storage_provider,
        storage_key=document.storage_key,
        version=document.version,
        parent_document_id=document.parent_document_id,
        uploaded_by_id=document.uploaded_by_id,
        uploaded_by_name=uploaded_by_name,
        checksum=document.checksum,
        file_url=_build_file_url(
            document.storage_provider,
            document.storage_key,
            storage_service=storage_service,
        ),
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    project_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    document_type: Optional[str] = Query(None),
    category: Optional[str] = Query(None, deprecated=True),
    search: Optional[str] = Query(None),
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    """List documents for a project with pagination and filters."""
    # Verify project exists and belongs to org
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db,
        project,
        ctx.user,
        "can_view_project",
        "You do not have permission to view documents in this project",
    )

    query = db.query(Document).filter(
        Document.project_id == project_id,
        Document.organization_id == ctx.organization.id,
        Document.is_deleted == False,
    )

    effective_document_type = _resolve_document_type(document_type, category)
    if effective_document_type:
        query = query.filter(Document.document_type == effective_document_type)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            Document.name.ilike(search_filter)
            | func.coalesce(Document.description, "").ilike(search_filter)
        )

    total = query.count()
    offset = (page - 1) * page_size
    documents = (
        query.order_by(Document.created_at.desc()).offset(offset).limit(page_size).all()
    )

    # Avoid repeatedly resolving storage service while generating per-document URLs.
    url_storage_service: Optional[StorageService] = None
    requires_presigned_urls = (
        not settings.R2_PUBLIC_URL
        and any((doc.storage_provider or "").lower() in {"r2", "s3"} for doc in documents)
    )
    if requires_presigned_urls:
        url_storage_service = get_storage_service()

    items = [
        _to_document_response(doc, storage_service=url_storage_service)
        for doc in documents
    ]
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return DocumentListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    project_id: UUID,
    file: UploadFile = File(...),
    document_type: Optional[str] = Query(None),
    category: Optional[str] = Query(None, deprecated=True),
    description: Optional[str] = Query(None),
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    """Upload a document to a project."""
    # Verify project exists and belongs to org
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db,
        project,
        ctx.user,
        "can_upload_documents",
        "You do not have permission to upload documents in this project",
    )

    filename = file.filename or "unnamed"
    file_extension = Path(filename).suffix.lower()
    allowed_extensions = _get_allowed_extensions()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File extension '{file_extension or '<none>'}' is not allowed. "
                f"Allowed extensions: {', '.join(sorted(allowed_extensions))}"
            ),
        )

    # Upload as stream without loading full content into memory.
    try:
        storage_service = get_storage_service()
        await file.seek(0)
        storage_key, _, file_size = await storage_service.upload_file(
            file=file.file,
            filename=filename,
            org_id=str(ctx.organization.id),
            content_type=file.content_type,
            max_size=settings.MAX_UPLOAD_SIZE,
        )
        storage_provider = "r2" if settings.USE_CLOUD_STORAGE else "local"
    except FileSizeLimitExceededError:
        raise HTTPException(status_code=400, detail=_max_upload_size_error())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
    finally:
        await file.close()

    effective_document_type = _resolve_document_type(document_type, category)

    document = Document(
        organization_id=ctx.organization.id,
        project_id=project_id,
        name=filename,
        description=description,
        document_type=effective_document_type,
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
        storage_provider=storage_provider,
        storage_key=storage_key,
        version=1,
        parent_document_id=None,
        uploaded_by_id=ctx.user.id,
        checksum=None,
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return DocumentUploadResponse(
        id=document.id,
        name=document.name,
        file_size=document.file_size,
        mime_type=document.mime_type,
        storage_provider=document.storage_provider,
        storage_key=document.storage_key,
        version=document.version,
        parent_document_id=document.parent_document_id,
        uploaded_by_id=document.uploaded_by_id,
        checksum=document.checksum,
        file_url=_build_file_url(
            document.storage_provider,
            document.storage_key,
            storage_service=storage_service,
        ),
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    project_id: UUID,
    document_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    """Get document metadata by ID."""
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db,
        project,
        ctx.user,
        "can_view_project",
        "You do not have permission to view documents in this project",
    )

    document = db.query(Document).filter(
        Document.id == document_id,
        Document.project_id == project_id,
        Document.organization_id == ctx.organization.id,
        Document.is_deleted == False,
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    url_storage_service: Optional[StorageService] = None
    if not settings.R2_PUBLIC_URL and (document.storage_provider or "").lower() in {"r2", "s3"}:
        url_storage_service = get_storage_service()
    return _to_document_response(document, storage_service=url_storage_service)


@router.get("/{document_id}/download")
async def download_document(
    project_id: UUID,
    document_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    """Download document file."""
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db,
        project,
        ctx.user,
        "can_view_project",
        "You do not have permission to download documents in this project",
    )

    document = db.query(Document).filter(
        Document.id == document_id,
        Document.project_id == project_id,
        Document.organization_id == ctx.organization.id,
        Document.is_deleted == False,
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        storage_service = get_storage_service()
        file_content = await storage_service.download_file(document.storage_key)

        return StreamingResponse(
            io.BytesIO(file_content),
            media_type=document.mime_type or "application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{document.name}"'
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    project_id: UUID,
    document_id: UUID,
    document_data: DocumentUpdate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    """Update document metadata."""
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db,
        project,
        ctx.user,
        "can_upload_documents",
        "You do not have permission to update documents in this project",
    )

    document = db.query(Document).filter(
        Document.id == document_id,
        Document.project_id == project_id,
        Document.organization_id == ctx.organization.id,
        Document.is_deleted == False,
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    update_data = document_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(document, field, value)

    db.commit()
    db.refresh(document)

    url_storage_service: Optional[StorageService] = None
    if not settings.R2_PUBLIC_URL and (document.storage_provider or "").lower() in {"r2", "s3"}:
        url_storage_service = get_storage_service()
    return _to_document_response(document, storage_service=url_storage_service)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    project_id: UUID,
    document_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    """Soft delete document."""
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db,
        project,
        ctx.user,
        "can_upload_documents",
        "You do not have permission to delete documents in this project",
    )

    document = db.query(Document).filter(
        Document.id == document_id,
        Document.project_id == project_id,
        Document.organization_id == ctx.organization.id,
        Document.is_deleted == False,
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    from datetime import datetime

    document.is_deleted = True
    document.deleted_at = datetime.utcnow()
    db.commit()

    # Note: We don't delete the actual file from storage for recovery purposes.
    return None
