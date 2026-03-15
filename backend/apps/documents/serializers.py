"""Documents serializers."""
from django.urls import reverse
from rest_framework import serializers

from .models import Document, DocumentVersion
from .services import add_document_version, create_document


class DocumentVersionSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()
    approval_status_display = serializers.CharField(source="get_approval_status_display", read_only=True)
    issue_purpose_display = serializers.CharField(source="get_issue_purpose_display", read_only=True)

    class Meta:
        model = DocumentVersion
        fields = [
            "id",
            "document",
            "version_number",
            "version_label",
            "original_filename",
            "file_size",
            "content_type",
            "notes",
            "approval_status",
            "approval_status_display",
            "issue_purpose",
            "issue_purpose_display",
            "effective_date",
            "supersedes",
            "uploaded_by_name",
            "download_url",
            "created_at",
        ]
        read_only_fields = fields

    def get_uploaded_by_name(self, obj):
        if not obj.created_by:
            return ""
        return obj.created_by.get_full_name() or obj.created_by.username

    def get_download_url(self, obj):
        request = self.context.get("request")
        project_id = obj.document.project_id
        url = reverse(
            "document-version-download",
            kwargs={
                "project_id": project_id,
                "document_id": obj.document_id,
                "version_id": obj.id,
            },
        )
        return request.build_absolute_uri(url) if request else url


class DocumentSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    discipline_display = serializers.CharField(source="get_discipline_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    versions_count = serializers.SerializerMethodField()
    latest_version = serializers.SerializerMethodField()
    latest_download_url = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "project",
            "organisation",
            "code",
            "title",
            "name",
            "category",
            "category_display",
            "discipline",
            "discipline_display",
            "description",
            "status",
            "status_display",
            "notes",
            "current_version_number",
            "latest_file_name",
            "latest_file_size",
            "latest_content_type",
            "last_uploaded_at",
            "versions_count",
            "latest_version",
            "latest_download_url",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "project",
            "organisation",
            "code",
            "category_display",
            "discipline_display",
            "status_display",
            "current_version_number",
            "latest_file_name",
            "latest_file_size",
            "latest_content_type",
            "last_uploaded_at",
            "versions_count",
            "latest_version",
            "latest_download_url",
            "created_by_name",
            "created_at",
            "updated_at",
        ]

    def get_versions_count(self, obj):
        prefetched = getattr(obj, "_prefetched_objects_cache", {})
        versions = prefetched.get("versions")
        if versions is not None:
            return len(versions)
        return obj.versions.count()

    def get_latest_version(self, obj):
        version = obj.latest_version
        if version is None:
            return None
        return DocumentVersionSerializer(version, context=self.context).data

    def get_latest_download_url(self, obj):
        version = obj.latest_version
        if version is None:
            return ""
        return DocumentVersionSerializer(version, context=self.context).data["download_url"]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return ""
        return obj.created_by.get_full_name() or obj.created_by.username


class DocumentCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    name = serializers.CharField(max_length=255, required=False)
    category = serializers.ChoiceField(choices=Document.CATEGORY_CHOICES)
    discipline = serializers.ChoiceField(choices=Document.DISCIPLINE_CHOICES, required=False, default="general")
    description = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    file = serializers.FileField()
    version_notes = serializers.CharField(required=False, allow_blank=True)
    issue_purpose = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if not data.get("title") and not data.get("name"):
            raise serializers.ValidationError({"title": "Either title or name is required."})
        return data

    def create(self, validated_data):
        project = self.context["project"]
        user = self.context["request"].user
        uploaded_file = validated_data.pop("file")
        return create_document(
            project=project,
            user=user,
            uploaded_file=uploaded_file,
            **validated_data,
        )


class DocumentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ["title", "name", "category", "discipline", "description", "status", "notes"]


class DocumentVersionCreateSerializer(serializers.Serializer):
    file = serializers.FileField()
    notes = serializers.CharField(required=False, allow_blank=True)
    issue_purpose = serializers.CharField(required=False, allow_blank=True)
    approval_status = serializers.CharField(required=False, default="pending")

    def create(self, validated_data):
        document = self.context["document"]
        user = self.context["request"].user
        uploaded_file = validated_data["file"]
        return add_document_version(
            document=document,
            user=user,
            uploaded_file=uploaded_file,
            notes=validated_data.get("notes", ""),
            issue_purpose=validated_data.get("issue_purpose", ""),
            approval_status=validated_data.get("approval_status", "pending"),
        )
