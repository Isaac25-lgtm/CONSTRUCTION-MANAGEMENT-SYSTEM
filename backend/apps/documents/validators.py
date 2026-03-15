"""File upload validation for documents and site photos.

Centralized validation for:
- allowed file extensions
- allowed MIME/content types
- file size limits
- image-only validation for photos
"""
from rest_framework.exceptions import ValidationError

# 20 MB default limit
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

# Allowed extensions grouped by purpose
ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv",
    ".ppt", ".pptx", ".txt", ".rtf",
    ".dwg", ".dxf", ".ifc",  # CAD/BIM
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif", ".webp", ".svg",
    ".zip", ".rar", ".7z",
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif", ".webp"}

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain", "text/csv", "application/rtf",
    "application/zip", "application/x-rar-compressed", "application/x-7z-compressed",
    "application/octet-stream",  # CAD files often report this
    "image/jpeg", "image/png", "image/gif", "image/bmp", "image/tiff",
    "image/webp", "image/svg+xml",
}

IMAGE_CONTENT_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/bmp",
    "image/tiff", "image/webp",
}


def validate_upload(uploaded_file, photos_only=False):
    """Validate an uploaded file. Raises ValidationError on failure."""
    import os

    if not uploaded_file:
        raise ValidationError({"file": "No file provided."})

    # Size check
    file_size = getattr(uploaded_file, "size", 0) or 0
    if file_size > MAX_FILE_SIZE_BYTES:
        max_mb = MAX_FILE_SIZE_BYTES // (1024 * 1024)
        raise ValidationError({"file": f"File too large. Maximum size is {max_mb} MB."})

    # Extension check
    filename = getattr(uploaded_file, "name", "") or ""
    _, ext = os.path.splitext(filename.lower())
    if photos_only:
        if ext not in IMAGE_EXTENSIONS:
            raise ValidationError({"file": f"Only image files are allowed. Got: {ext or 'unknown'}"})
    else:
        if ext and ext not in ALLOWED_EXTENSIONS:
            raise ValidationError({"file": f"File type not allowed: {ext}"})

    # Content-type check
    content_type = getattr(uploaded_file, "content_type", "") or ""
    if photos_only:
        if content_type and content_type not in IMAGE_CONTENT_TYPES:
            raise ValidationError({"file": f"Only image content types are allowed. Got: {content_type}"})
    else:
        if content_type and content_type not in ALLOWED_CONTENT_TYPES:
            raise ValidationError({"file": f"Content type not allowed: {content_type}"})

    return uploaded_file
