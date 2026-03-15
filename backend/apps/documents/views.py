"""Documents views -- project-scoped documents, versions, and downloads."""
from django.db.models import Sum
from django.http import FileResponse
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.projects.models import Project

from .models import Document, DocumentVersion
from .serializers import (
    DocumentCreateSerializer,
    DocumentSerializer,
    DocumentUpdateSerializer,
    DocumentVersionCreateSerializer,
    DocumentVersionSerializer,
)


def _get_project_or_404(request, project_id):
    try:
        project = Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
        return None
    if project.organisation_id != request.user.organisation_id:
        return None
    if not request.user.has_project_perm(project, "project.view"):
        return None
    return project


def _get_document_or_404(project, document_id):
    try:
        return (
            Document.objects
            .filter(project=project)
            .select_related("created_by", "updated_by")
            .prefetch_related("versions__created_by")
            .get(pk=document_id)
        )
    except Document.DoesNotExist:
        return None


def _can_view_documents(request, project):
    return request.user.has_project_perm(project, "documents.view")


def _can_upload_documents(request, project):
    return request.user.has_project_perm(project, "documents.upload")


def _can_delete_documents(request, project):
    return request.user.has_project_perm(project, "documents.delete")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def document_summary(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if not _can_view_documents(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    documents = Document.objects.filter(project=project).prefetch_related("versions")
    total_documents = documents.count()
    total_versions = DocumentVersion.objects.filter(document__project=project).count()
    total_size = documents.aggregate(total=Sum("latest_file_size"))["total"] or 0

    categories = []
    for key, label in Document.CATEGORY_CHOICES:
        categories.append(
            {
                "key": key,
                "label": label,
                "count": documents.filter(category=key).count(),
            }
        )

    recent = documents.order_by("-last_uploaded_at", "-created_at")[:5]

    return Response(
        {
            "total_documents": total_documents,
            "total_versions": total_versions,
            "total_size": total_size,
            "categories": categories,
            "recent": DocumentSerializer(recent, many=True, context={"request": request}).data,
        }
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def document_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        if not _can_view_documents(request, project):
            return Response(status=status.HTTP_403_FORBIDDEN)
        documents = (
            Document.objects.filter(project=project)
            .select_related("created_by", "updated_by")
            .prefetch_related("versions__created_by")
        )
        return Response(DocumentSerializer(documents, many=True, context={"request": request}).data)

    if not _can_upload_documents(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = DocumentCreateSerializer(
        data=request.data,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    document = serializer.save()
    return Response(
        DocumentSerializer(document, context={"request": request}).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def document_detail(request, project_id, document_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    document = _get_document_or_404(project, document_id)
    if not document:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        if not _can_view_documents(request, project):
            return Response(status=status.HTTP_403_FORBIDDEN)
        return Response(DocumentSerializer(document, context={"request": request}).data)

    if request.method == "DELETE":
        if not _can_delete_documents(request, project):
            return Response(status=status.HTTP_403_FORBIDDEN)
        document.soft_delete(user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    if not _can_upload_documents(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = DocumentUpdateSerializer(document, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(DocumentSerializer(document, context={"request": request}).data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def document_version_list(request, project_id, document_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    document = _get_document_or_404(project, document_id)
    if not document:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        if not _can_view_documents(request, project):
            return Response(status=status.HTTP_403_FORBIDDEN)
        versions = document.versions.select_related("created_by")
        return Response(
            DocumentVersionSerializer(versions, many=True, context={"request": request}).data
        )

    if not _can_upload_documents(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = DocumentVersionCreateSerializer(
        data=request.data,
        context={"request": request, "document": document},
    )
    serializer.is_valid(raise_exception=True)
    version = serializer.save()
    document.refresh_from_db()
    return Response(
        DocumentVersionSerializer(version, context={"request": request}).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def document_version_download(request, project_id, document_id, version_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if not _can_view_documents(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    document = _get_document_or_404(project, document_id)
    if not document:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        version = document.versions.get(pk=version_id)
    except DocumentVersion.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    return FileResponse(
        version.file.open("rb"),
        as_attachment=True,
        filename=version.original_filename,
    )
