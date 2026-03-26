"""Procurement serializers."""
from rest_framework import serializers

from apps.core.serializers import ProjectScopedValidationMixin
from .models import (
    Supplier, RFQ, RFQItem, Quotation, QuotationItem,
    PurchaseOrder, POItem, GoodsReceipt, GRNItem,
    ProcurementInvoice, ProcurementPayment,
)


# ---------------------------------------------------------------------------
# Supplier
# ---------------------------------------------------------------------------

class SupplierSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Supplier
        fields = [
            "id", "organisation", "code", "name", "contact_person",
            "phone", "email", "address", "category",
            "status", "status_display",
            "notes", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "organisation", "status_display",
            "created_at", "updated_at",
        ]


class SupplierCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            "code", "name", "contact_person", "phone", "email",
            "address", "category", "status", "notes",
        ]


# ---------------------------------------------------------------------------
# RFQ
# ---------------------------------------------------------------------------

class RFQItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RFQItem
        fields = [
            "id", "sort_order", "description", "unit",
            "quantity", "notes",
        ]


class RFQSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    items_count = serializers.IntegerField(source="items.count", read_only=True)
    items = RFQItemSerializer(many=True, read_only=True)

    class Meta:
        model = RFQ
        fields = [
            "id", "project", "code", "title", "description",
            "issue_date", "due_date",
            "status", "status_display",
            "items_count", "items",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "project", "status_display", "items_count", "items",
            "created_at", "updated_at",
        ]


class RFQCreateSerializer(serializers.ModelSerializer):
    code = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = RFQ
        fields = [
            "code", "title", "description", "due_date", "status",
        ]


# ---------------------------------------------------------------------------
# Quotation
# ---------------------------------------------------------------------------

class QuotationItemSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)

    class Meta:
        model = QuotationItem
        fields = [
            "id", "rfq_item", "sort_order", "description", "unit",
            "quantity", "unit_price", "line_total",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        rfq_item = attrs.get("rfq_item")
        if rfq_item is not None:
            project = self._current_project(attrs)
            if project is not None and rfq_item.rfq.project_id != project.id:
                raise serializers.ValidationError(
                    {"rfq_item": "Selected RFQ item must belong to this project."}
                )
        return attrs


class QuotationSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True, default=None)
    rfq_code = serializers.CharField(source="rfq.code", read_only=True, default=None)
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    items_count = serializers.IntegerField(source="items.count", read_only=True)
    items = QuotationItemSerializer(many=True, read_only=True)

    class Meta:
        model = Quotation
        fields = [
            "id", "project", "rfq", "rfq_code",
            "supplier", "supplier_name",
            "code", "quote_date", "validity_date",
            "status", "status_display",
            "notes", "total_amount", "items_count", "items",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "project", "status_display", "supplier_name", "rfq_code",
            "total_amount", "items_count", "items",
            "created_at", "updated_at",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_project(attrs, "rfq", label="RFQ")
        self._validate_same_org(attrs, "supplier", label="supplier")
        return attrs


class QuotationCreateSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    code = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Quotation
        fields = [
            "rfq", "supplier", "code", "quote_date",
            "validity_date", "status", "notes",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_project(attrs, "rfq", label="RFQ")
        self._validate_same_org(attrs, "supplier", label="supplier")
        return attrs


# ---------------------------------------------------------------------------
# PO Items (nested)
# ---------------------------------------------------------------------------

class POItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)

    class Meta:
        model = POItem
        fields = [
            "id", "sort_order", "description", "unit",
            "quantity", "unit_price", "line_total",
        ]


# ---------------------------------------------------------------------------
# Purchase Order
# ---------------------------------------------------------------------------

class PurchaseOrderSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True, default=None)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True, default=None)
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    items = POItemSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id", "project", "supplier", "supplier_name",
            "code", "order_date", "delivery_address", "delivery_date",
            "payment_terms", "instructions",
            "status", "status_display",
            "notes", "approved_by", "approved_by_name",
            "total_amount", "items",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status_display", "supplier_name", "approved_by_name",
            "total_amount", "items",
            "created_at", "updated_at",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_org(attrs, "supplier", label="supplier")
        self._validate_same_org_user(attrs, "approved_by", label="approver")
        return attrs


class PurchaseOrderCreateSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    code = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            "supplier", "code", "delivery_address", "delivery_date",
            "payment_terms", "instructions",
            "status", "notes", "approved_by",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_org(attrs, "supplier", label="supplier")
        self._validate_same_org_user(attrs, "approved_by", label="approver")
        return attrs


# ---------------------------------------------------------------------------
# Goods Receipt
# ---------------------------------------------------------------------------

class GRNItemSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = GRNItem
        fields = [
            "id", "sort_order", "description", "unit",
            "ordered_quantity", "received_quantity", "remarks", "po_item",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        po_item = attrs.get("po_item")
        if po_item is not None:
            project = self._current_project(attrs)
            if project is not None and po_item.purchase_order.project_id != project.id:
                raise serializers.ValidationError(
                    {"po_item": "Selected PO item must belong to this project."}
                )
        return attrs


class GoodsReceiptSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    received_by_name = serializers.CharField(source="received_by.get_full_name", read_only=True, default=None)
    items = GRNItemSerializer(many=True, read_only=True)

    class Meta:
        model = GoodsReceipt
        fields = [
            "id", "project", "purchase_order", "code",
            "receipt_date", "received_by", "received_by_name",
            "status", "status_display",
            "notes", "items",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status_display", "received_by_name", "items",
            "created_at", "updated_at",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_project(attrs, "purchase_order", label="purchase order")
        self._validate_same_org_user(attrs, "received_by", label="receiver")
        return attrs


class GoodsReceiptCreateSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    code = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = GoodsReceipt
        fields = [
            "purchase_order", "code", "receipt_date",
            "received_by", "status", "notes",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_project(attrs, "purchase_order", label="purchase order")
        self._validate_same_org_user(attrs, "received_by", label="receiver")
        return attrs


# ---------------------------------------------------------------------------
# Procurement Invoice
# ---------------------------------------------------------------------------

class ProcurementInvoiceSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True, default=None)

    class Meta:
        model = ProcurementInvoice
        fields = [
            "id", "project", "supplier", "supplier_name",
            "purchase_order", "code",
            "invoice_date", "due_date", "amount",
            "status", "status_display",
            "notes", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status_display", "supplier_name",
            "created_at", "updated_at",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_org(attrs, "supplier", label="supplier")
        self._validate_same_project(attrs, "purchase_order", label="purchase order")
        return attrs


class ProcurementInvoiceCreateSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    code = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = ProcurementInvoice
        fields = [
            "supplier", "purchase_order", "code",
            "invoice_date", "due_date", "amount", "status", "notes",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_org(attrs, "supplier", label="supplier")
        self._validate_same_project(attrs, "purchase_order", label="purchase order")
        return attrs


# ---------------------------------------------------------------------------
# Procurement Payment
# ---------------------------------------------------------------------------

class ProcurementPaymentSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    method_display = serializers.CharField(source="get_method_display", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True, default=None)

    class Meta:
        model = ProcurementPayment
        fields = [
            "id", "project", "supplier", "supplier_name",
            "invoice", "payment_date", "amount",
            "reference", "method", "method_display",
            "status", "status_display",
            "notes", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status_display", "method_display", "supplier_name",
            "created_at", "updated_at",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_org(attrs, "supplier", label="supplier")
        self._validate_same_project(attrs, "invoice", label="invoice")
        return attrs


class ProcurementPaymentCreateSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = ProcurementPayment
        fields = [
            "supplier", "invoice", "payment_date", "amount",
            "reference", "method", "status", "notes",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_org(attrs, "supplier", label="supplier")
        self._validate_same_project(attrs, "invoice", label="invoice")
        return attrs
