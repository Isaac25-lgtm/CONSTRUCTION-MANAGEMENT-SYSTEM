"""File upload validation for documents and site photos.

Centralized validation for:
- allowed file extensions
- allowed MIME/content types
- server-side signature sniffing
- file size limits
- image-only validation for photos
"""
import zipfile

from rest_framework.exceptions import ValidationError

# 20 MB default limit
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024
SNIFF_READ_BYTES = 8192

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

SNIFFED_IMAGE_KINDS = {"jpeg", "png", "gif", "bmp", "tiff", "webp"}
ALLOWED_SNIFFED_KINDS = SNIFFED_IMAGE_KINDS | {
    "pdf",
    "text",
    "rtf",
    "svg",
    "zip",
    "rar",
    "7z",
    "ole",
    "ooxml_word",
    "ooxml_sheet",
    "ooxml_presentation",
    "dwg",
    "dxf",
    "ifc",
}

EXPECTED_KINDS_BY_EXTENSION = {
    ".pdf": {"pdf"},
    ".doc": {"ole"},
    ".docx": {"ooxml_word"},
    ".xls": {"ole"},
    ".xlsx": {"ooxml_sheet"},
    ".csv": {"text"},
    ".ppt": {"ole"},
    ".pptx": {"ooxml_presentation"},
    ".txt": {"text"},
    ".rtf": {"rtf"},
    ".dwg": {"dwg"},
    ".dxf": {"dxf"},
    ".ifc": {"ifc"},
    ".jpg": {"jpeg"},
    ".jpeg": {"jpeg"},
    ".png": {"png"},
    ".gif": {"gif"},
    ".bmp": {"bmp"},
    ".tiff": {"tiff"},
    ".tif": {"tiff"},
    ".webp": {"webp"},
    ".svg": {"svg"},
    ".zip": {"zip"},
    ".rar": {"rar"},
    ".7z": {"7z"},
}

COMPATIBLE_CONTENT_TYPES = {
    "pdf": {"application/pdf"},
    "jpeg": {"image/jpeg"},
    "png": {"image/png"},
    "gif": {"image/gif"},
    "bmp": {"image/bmp"},
    "tiff": {"image/tiff"},
    "webp": {"image/webp"},
    "svg": {"image/svg+xml", "text/plain"},
    "text": {"text/plain", "text/csv"},
    "rtf": {"application/rtf", "text/plain"},
    "zip": {"application/zip", "application/octet-stream"},
    "rar": {"application/x-rar-compressed", "application/octet-stream"},
    "7z": {"application/x-7z-compressed", "application/octet-stream"},
    "ole": {
        "application/msword",
        "application/vnd.ms-excel",
        "application/vnd.ms-powerpoint",
        "application/octet-stream",
    },
    "ooxml_word": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
        "application/octet-stream",
    },
    "ooxml_sheet": {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/zip",
        "application/octet-stream",
    },
    "ooxml_presentation": {
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/zip",
        "application/octet-stream",
    },
    "dwg": {"application/octet-stream"},
    "dxf": {"text/plain", "application/octet-stream"},
    "ifc": {"text/plain", "application/octet-stream"},
}


def _read_head(uploaded_file, size=SNIFF_READ_BYTES):
    """Read a small prefix without disturbing the caller's file pointer."""
    current = uploaded_file.tell()
    try:
        uploaded_file.seek(0)
        return uploaded_file.read(size) or b""
    finally:
        uploaded_file.seek(current)


def _looks_textual(data):
    if not data:
        return False
    if b"\x00" in data:
        return False
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return False
    control_chars = sum(1 for ch in text if ord(ch) < 32 and ch not in "\r\n\t\f\b")
    return control_chars == 0


def _zip_members(uploaded_file):
    current = uploaded_file.tell()
    try:
        uploaded_file.seek(0)
        with zipfile.ZipFile(uploaded_file) as archive:
            return set(archive.namelist())
    except zipfile.BadZipFile:
        return set()
    finally:
        uploaded_file.seek(current)


def _sniff_kind(uploaded_file):
    head = _read_head(uploaded_file)
    if not head:
        return None

    if head.startswith(b"%PDF-"):
        return "pdf"
    if head.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if head.startswith((b"GIF87a", b"GIF89a")):
        return "gif"
    if head.startswith(b"BM"):
        return "bmp"
    if head.startswith((b"II*\x00", b"MM\x00*")):
        return "tiff"
    if head.startswith(b"RIFF") and head[8:12] == b"WEBP":
        return "webp"
    if head.startswith((b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08")):
        members = _zip_members(uploaded_file)
        if any(name.startswith("word/") for name in members):
            return "ooxml_word"
        if any(name.startswith("xl/") for name in members):
            return "ooxml_sheet"
        if any(name.startswith("ppt/") for name in members):
            return "ooxml_presentation"
        return "zip"
    if head.startswith(b"Rar!\x1a\x07\x00") or head.startswith(b"Rar!\x1a\x07\x01\x00"):
        return "rar"
    if head.startswith(b"7z\xbc\xaf\x27\x1c"):
        return "7z"
    if head.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):
        return "ole"
    if head.startswith(b"AC10"):
        return "dwg"
    if head.startswith(b"ISO-10303-21;"):
        return "ifc"
    if head.lstrip().startswith(b"{\\rtf"):
        return "rtf"

    if _looks_textual(head):
        text = head.decode("utf-8", errors="ignore").lstrip("\ufeff\r\n\t ")
        upper_text = text.upper()
        if text.startswith("<svg") or "<svg" in text[:512]:
            return "svg"
        if upper_text.startswith("0\nSECTION") or upper_text.startswith("0\r\nSECTION"):
            return "dxf"
        return "text"

    return None


def _validate_signature(uploaded_file, ext, content_type, *, photos_only=False):
    sniffed_kind = _sniff_kind(uploaded_file)
    if sniffed_kind is None:
        raise ValidationError({"file": "Could not verify the uploaded file format."})

    allowed_kinds = SNIFFED_IMAGE_KINDS if photos_only else ALLOWED_SNIFFED_KINDS
    if sniffed_kind not in allowed_kinds:
        raise ValidationError({"file": "Uploaded file contents do not match an allowed format."})

    expected_kinds = EXPECTED_KINDS_BY_EXTENSION.get(ext)
    if ext and expected_kinds and sniffed_kind not in expected_kinds:
        raise ValidationError({"file": "File extension does not match the uploaded file contents."})

    if content_type:
        compatible_types = COMPATIBLE_CONTENT_TYPES.get(sniffed_kind, set())
        if compatible_types and content_type not in compatible_types:
            raise ValidationError({"file": "Claimed content type does not match the uploaded file contents."})


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

    _validate_signature(uploaded_file, ext, content_type, photos_only=photos_only)

    return uploaded_file
