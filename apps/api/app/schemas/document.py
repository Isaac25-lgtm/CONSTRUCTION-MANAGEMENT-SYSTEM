from pydantic import BaseModel, UUID4, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# Document Schemas
class DocumentUploadResponse(BaseModel):
    id: UUID4
    filename: str
    file_size: int
    file_url: str
    message: str = "File uploaded successfully"


class DocumentResponse(BaseModel):
    id: UUID4
    organization_id: UUID4
    project_id: Optional[UUID4] = None
    filename: str
    file_type: str
    file_size: int
    file_url: str
    storage_path: str
    uploaded_by_id: UUID4
    uploaded_by_name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    version: int
    is_latest: bool
    parent_document_id: Optional[UUID4] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class DocumentUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
