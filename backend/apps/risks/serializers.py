"""Risk serializers."""
from rest_framework import serializers
from .models import Risk


class RiskSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    likelihood_display = serializers.CharField(source="get_likelihood_display", read_only=True)
    impact_display = serializers.CharField(source="get_impact_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    risk_score = serializers.IntegerField(read_only=True)
    owner_name = serializers.CharField(source="owner.get_full_name", read_only=True, default=None)

    class Meta:
        model = Risk
        fields = [
            "id", "project", "code", "title", "description",
            "category", "category_display",
            "likelihood", "likelihood_display",
            "impact", "impact_display",
            "risk_score",
            "mitigation", "owner", "owner_name",
            "status", "status_display",
            "review_date",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "category_display", "likelihood_display", "impact_display",
            "status_display", "risk_score", "owner_name",
            "created_at", "updated_at",
        ]


class RiskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Risk
        fields = [
            "code", "title", "description", "category",
            "likelihood", "impact", "mitigation", "owner",
            "status", "review_date",
        ]
