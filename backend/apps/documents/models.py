"""Documents models -- document records, file versions, and downloads."""
from pathlib import Path

from django.db import models
from django.utils.text import slugify

from apps.core.models import AuditMixin, BaseModel, TimestampedModel


def document_version_upload_path(instance, filename):
    """Store document versions under a stable project/document path."""
    project_code = (instance.document.project.code or "project").lower().replace(" ", "-")
    doc_slug = slugify(instance.document.title)[:50] or "document"
    suffix = Path(filename).suffix or ""
    return f"documents/{project_code}/{instance.document_id}/{doc_slug}_v{instance.version_number}{suffix}"


class Document(BaseModel):
    """A logical document with one or more uploaded versions."""

    CATEGORY_CHOICES = [
        ("drawings", "Drawings & Plans"),
        ("contracts", "Contract Documents"),
        ("permits", "Permits & Approvals"),
        ("specifications", "Specifications"),
        ("reports", "Reports"),
        ("correspondence", "Correspondence"),
        ("photos", "Photos"),
        ("other", "Other"),
    ]

    DISCIPLINE_CHOICES = [
        ("architectural", "Architectural"),
        ("structural", "Structural"),
        ("mechanical", "Mechanical"),
        ("electrical", "Electrical"),
        ("plumbing", "Plumbing"),
        ("civil", "Civil"),
        ("geotechnical", "Geotechnical"),
        ("environmental", "Environmental"),
        ("general", "General"),
    ]

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("for_review", "For Review"),
        ("approved", "Approved"),
        ("issued", "Issued"),
        ("superseded", "Superseded"),
        ("archived", "Archived"),
    ]

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="documents",
    )
    organisation = models.ForeignKey(
        "accounts.Organisation",
        on_delete=models.CASCADE,
        related_name="documents",
    )
    code = models.CharField(max_length=30, blank=True, default="")
    title = models.CharField(max_length=255, blank=True, default="")
    # Keep 'name' as alias for backward compat during transition
    name = models.CharField(max_length=255, blank=True, default="")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="other")
    discipline = models.CharField(max_length=20, choices=DISCIPLINE_CHOICES, default="general", blank=True)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    notes = models.TextField(blank=True, default="")

    # Denormalized latest-version fields for efficient list queries
    current_version = models.ForeignKey(
        "DocumentVersion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    current_version_number = models.PositiveIntegerField(default=0)
    latest_file_name = models.CharField(max_length=255, blank=True, default="")
    latest_file_size = models.PositiveBigIntegerField(default=0)
    latest_content_type = models.CharField(max_length=255, blank=True, default="")
    last_uploaded_at = models.DateTimeField(null=True, blank=True)

    class Meta(BaseModel.Meta):
        db_table = "documents_document"
        ordering = ["-last_uploaded_at", "-created_at"]

    def __str__(self):
        return self.title or self.name

    def save(self, *args, **kwargs):
        # Auto-generate code if blank
        if not self.code:
            self.code = self._generate_code()
        # Sync title/name
        if self.title and not self.name:
            self.name = self.title
        elif self.name and not self.title:
            self.title = self.name
        super().save(*args, **kwargs)

    def _generate_code(self):
        prefix = "DOC"
        last = (
            Document.objects.filter(project=self.project, code__startswith=f"{prefix}-")
            .order_by("-code")
            .values_list("code", flat=True)
            .first()
        )
        if last:
            try:
                seq = int(last.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        return f"{prefix}-{seq:03d}"

    @property
    def latest_version(self):
        prefetched = getattr(self, "_prefetched_objects_cache", {})
        versions = prefetched.get("versions")
        if versions is not None:
            if not versions:
                return None
            return max(versions, key=lambda item: item.version_number)
        return self.versions.order_by("-version_number").first()

    def apply_version(self, version, updated_by=None):
        """Sync denormalized latest-version fields after a version upload."""
        self.current_version = version
        self.current_version_number = version.version_number
        self.latest_file_name = version.original_filename
        self.latest_file_size = version.file_size
        self.latest_content_type = version.content_type
        self.last_uploaded_at = version.created_at
        if updated_by is not None:
            self.updated_by = updated_by
        self.save(
            update_fields=[
                "current_version",
                "current_version_number",
                "latest_file_name",
                "latest_file_size",
                "latest_content_type",
                "last_uploaded_at",
                "updated_by",
                "updated_at",
            ]
        )


class DocumentVersion(TimestampedModel, AuditMixin):
    """An immutable uploaded revision of a document."""

    APPROVAL_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("superseded", "Superseded"),
    ]

    PURPOSE_CHOICES = [
        ("for_information", "For Information"),
        ("for_review", "For Review"),
        ("for_approval", "For Approval"),
        ("for_construction", "For Construction"),
        ("as_built", "As Built"),
        ("record", "Record"),
    ]

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="versions",
    )
    version_number = models.PositiveIntegerField()
    version_label = models.CharField(max_length=20, blank=True, default="")
    file = models.FileField(upload_to=document_version_upload_path)
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveBigIntegerField(default=0)
    content_type = models.CharField(max_length=255, blank=True, default="")

    # Revision metadata
    notes = models.TextField(blank=True, default="")
    approval_status = models.CharField(max_length=20, choices=APPROVAL_CHOICES, default="pending")
    issue_purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, blank=True, default="")
    effective_date = models.DateField(null=True, blank=True)
    supersedes = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="superseded_by",
    )

    class Meta:
        db_table = "documents_document_version"
        ordering = ["-version_number", "-created_at"]
        unique_together = [("document", "version_number")]

    def __str__(self):
        return f"{self.document.title} v{self.version_number}"

    def save(self, *args, **kwargs):
        if self.file and not self.original_filename:
            self.original_filename = Path(self.file.name).name
        if self.file and not self.file_size:
            self.file_size = getattr(self.file, "size", 0) or 0
        if not self.version_label:
            self.version_label = f"v{self.version_number}"
        super().save(*args, **kwargs)
