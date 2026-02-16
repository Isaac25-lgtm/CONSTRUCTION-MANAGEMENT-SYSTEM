from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, UUID4


class DocumentUploadResponse(BaseModel):
    id: UUID4
    name: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    storage_provider: str
    storage_key: str
    version: int
    parent_document_id: Optional[UUID4] = None
    uploaded_by_id: Optional[UUID4] = None
    checksum: Optional[str] = None
    file_url: Optional[str] = Field(
        default=None,
        description="Computed at response time; not persisted in the database.",
    )
    message: str = "File uploaded successfully"

    model_config = ConfigDict(populate_by_name=True)


class DocumentResponse(BaseModel):
    id: UUID4
    organization_id: UUID4
    project_id: UUID4
    name: str
    description: Optional[str] = None
    document_type: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    storage_provider: str
    storage_key: str
    version: int
    parent_document_id: Optional[UUID4] = None
    uploaded_by_id: Optional[UUID4] = None
    uploaded_by_name: Optional[str] = None
    checksum: Optional[str] = None
    file_url: Optional[str] = Field(
        default=None,
        description="Computed at response time; not persisted in the database.",
    )
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class DocumentUpdate(BaseModel):
    document_type: Optional[str] = None
    description: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, extra="forbid")
