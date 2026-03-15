"""Documents services -- version creation and metadata synchronization."""
from django.db import transaction

from .models import Document, DocumentVersion
from .validators import validate_upload


@transaction.atomic
def create_document(*, project, user, title="", category, description="", notes="",
                    discipline="general", uploaded_file, version_notes="",
                    issue_purpose="", name=""):
    """Create a document and its initial uploaded version."""
    photos_only = (category == "photos")
    validate_upload(uploaded_file, photos_only=photos_only)
    resolved_title = title or name
    document = Document.objects.create(
        project=project,
        organisation=project.organisation,
        title=resolved_title,
        name=name or resolved_title,
        category=category,
        discipline=discipline,
        description=description,
        notes=notes,
        created_by=user,
        updated_by=user,
    )
    add_document_version(
        document=document,
        user=user,
        uploaded_file=uploaded_file,
        notes=version_notes or notes,
        issue_purpose=issue_purpose,
    )
    document.refresh_from_db()
    return document


@transaction.atomic
def add_document_version(*, document, user, uploaded_file, notes="",
                         issue_purpose="", approval_status="pending",
                         effective_date=None):
    """Attach a new version to an existing document."""
    photos_only = (document.category == "photos")
    validate_upload(uploaded_file, photos_only=photos_only)

    previous_version = document.current_version
    next_version = document.current_version_number + 1

    version = DocumentVersion.objects.create(
        document=document,
        version_number=next_version,
        file=uploaded_file,
        original_filename=getattr(uploaded_file, "name", ""),
        file_size=getattr(uploaded_file, "size", 0) or 0,
        content_type=getattr(uploaded_file, "content_type", "") or "",
        notes=notes,
        approval_status=approval_status,
        issue_purpose=issue_purpose,
        effective_date=effective_date,
        supersedes=previous_version,
        created_by=user,
        updated_by=user,
    )
    document.apply_version(version, updated_by=user)
    return version
