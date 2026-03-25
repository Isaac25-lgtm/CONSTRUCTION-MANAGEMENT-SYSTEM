"""Reports serializers."""
from rest_framework import serializers
from .models import ReportExport


class ReportExportSerializer(serializers.ModelSerializer):
    report_key_display = serializers.CharField(source="get_report_key_display", read_only=True)
    format_display = serializers.CharField(source="get_format_display", read_only=True)
    scope_display = serializers.CharField(source="get_scope_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    download_available = serializers.SerializerMethodField()

    class Meta:
        model = ReportExport
        fields = [
            "id", "organisation", "project", "scope", "scope_display",
            "report_key", "report_key_display", "format", "format_display",
            "status", "status_display",
            "row_count", "file_name",
            "created_by_name", "download_available", "created_at",
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return ""
        return obj.created_by.get_full_name() or obj.created_by.username

    def get_download_available(self, obj):
        if not obj.file or not obj.file.name:
            return False
        try:
            return obj.file.storage.exists(obj.file.name)
        except OSError:
            return False
