"""Procurement views -- Supplier, RFQ, Quotation, PO, GRN, Invoice, Payment + summary."""
from django.db import models as db_models
from django.db.models import Sum, Count, F
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.projects.models import Project
from .models import (
    Supplier, RFQ, Quotation,
    PurchaseOrder, GoodsReceipt, ProcurementInvoice, ProcurementPayment,
)
from .serializers import (
    SupplierSerializer, SupplierCreateSerializer,
    RFQSerializer, RFQCreateSerializer,
    RFQItemSerializer,
    QuotationSerializer, QuotationCreateSerializer,
    QuotationItemSerializer,
    PurchaseOrderSerializer, PurchaseOrderCreateSerializer,
    POItemSerializer,
    GoodsReceiptSerializer, GoodsReceiptCreateSerializer,
    GRNItemSerializer,
    ProcurementInvoiceSerializer, ProcurementInvoiceCreateSerializer,
    ProcurementPaymentSerializer, ProcurementPaymentCreateSerializer,
)
from .models import RFQItem, QuotationItem, POItem, GRNItem


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


def _can_edit_procurement(request, project):
    return request.user.has_project_perm(project, "procurement.edit")


# ---------------------------------------------------------------------------
# Suppliers (org-scoped, not project-scoped)
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def supplier_list(request):
    org = request.user.organisation

    if request.method == "GET":
        suppliers = Supplier.objects.filter(organisation=org)
        return Response(SupplierSerializer(suppliers, many=True).data)

    # Only admin or management can create org-level suppliers
    if not request.user.has_system_perm("admin.full_access") and not request.user.has_system_perm("admin.manage_users"):
        return Response({"detail": "Only admin or management can create suppliers."}, status=status.HTTP_403_FORBIDDEN)

    serializer = SupplierCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    supplier = serializer.save(organisation=org, created_by=request.user)
    return Response(SupplierSerializer(supplier).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# RFQs
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def rfq_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        rfqs = RFQ.objects.filter(project=project)
        return Response(RFQSerializer(rfqs, many=True).data)

    if not _can_edit_procurement(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = RFQCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    rfq = serializer.save(project=project, created_by=request.user)
    return Response(RFQSerializer(rfq).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def rfq_detail(request, project_id, rfq_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        rfq = RFQ.objects.get(pk=rfq_id, project=project)
    except RFQ.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(RFQSerializer(rfq).data)

    if not _can_edit_procurement(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    if request.method == "DELETE":
        rfq.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = RFQSerializer(rfq, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# Quotations
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def quotation_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        quotations = Quotation.objects.filter(project=project).select_related("supplier", "rfq")
        return Response(QuotationSerializer(quotations, many=True).data)

    if not _can_edit_procurement(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = QuotationCreateSerializer(
        data=request.data,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    quotation = serializer.save(project=project, created_by=request.user)
    return Response(QuotationSerializer(quotation).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def quotation_detail(request, project_id, quotation_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        quotation = Quotation.objects.select_related("supplier", "rfq").get(pk=quotation_id, project=project)
    except Quotation.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(QuotationSerializer(quotation).data)

    if not _can_edit_procurement(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    if request.method == "DELETE":
        quotation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = QuotationSerializer(
        quotation,
        data=request.data,
        partial=True,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# Purchase Orders
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def purchase_order_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        pos = PurchaseOrder.objects.filter(project=project).select_related("supplier", "approved_by")
        return Response(PurchaseOrderSerializer(pos, many=True).data)

    if not _can_edit_procurement(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = PurchaseOrderCreateSerializer(
        data=request.data,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    po = serializer.save(project=project, created_by=request.user)
    return Response(PurchaseOrderSerializer(po).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def purchase_order_detail(request, project_id, po_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        po = PurchaseOrder.objects.select_related("supplier", "approved_by").get(pk=po_id, project=project)
    except PurchaseOrder.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(PurchaseOrderSerializer(po).data)

    if not _can_edit_procurement(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = PurchaseOrderSerializer(
        po,
        data=request.data,
        partial=True,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# Goods Receipts
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def goods_receipt_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        grns = GoodsReceipt.objects.filter(project=project).select_related("purchase_order", "received_by")
        return Response(GoodsReceiptSerializer(grns, many=True).data)

    if not _can_edit_procurement(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = GoodsReceiptCreateSerializer(
        data=request.data,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    grn = serializer.save(project=project, created_by=request.user)
    return Response(GoodsReceiptSerializer(grn).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def goods_receipt_detail(request, project_id, grn_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        grn = GoodsReceipt.objects.select_related("purchase_order", "received_by").get(pk=grn_id, project=project)
    except GoodsReceipt.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(GoodsReceiptSerializer(grn).data)

    if not _can_edit_procurement(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = GoodsReceiptSerializer(
        grn,
        data=request.data,
        partial=True,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# Procurement Invoices
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def procurement_invoice_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        invoices = ProcurementInvoice.objects.filter(project=project).select_related("supplier")
        return Response(ProcurementInvoiceSerializer(invoices, many=True).data)

    if not _can_edit_procurement(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = ProcurementInvoiceCreateSerializer(
        data=request.data,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    inv = serializer.save(project=project, created_by=request.user)
    return Response(ProcurementInvoiceSerializer(inv).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Procurement Payments
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def procurement_payment_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        payments = ProcurementPayment.objects.filter(project=project).select_related("supplier")
        return Response(ProcurementPaymentSerializer(payments, many=True).data)

    if not _can_edit_procurement(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = ProcurementPaymentCreateSerializer(
        data=request.data,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    pay = serializer.save(project=project, created_by=request.user)
    return Response(ProcurementPaymentSerializer(pay).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Procurement Summary
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def procurement_summary(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    rfq_count = RFQ.objects.filter(project=project).count()
    quotation_count = Quotation.objects.filter(project=project).count()

    purchase_orders = list(
        PurchaseOrder.objects.filter(project=project)
        .select_related("supplier")
        .prefetch_related("items")
        .order_by("-order_date", "-created_at")
    )
    po_count = len(purchase_orders)

    po_value = 0.0
    pending_deliveries = 0
    supplier_rollup = {}
    recent_pos = []
    open_po_statuses = {"draft", "issued", "partially_delivered"}

    for po in purchase_orders:
        total_amount = float(po.total_amount or 0)
        po_value += total_amount
        if po.status in open_po_statuses:
            pending_deliveries += 1

        supplier_name = po.supplier.name if po.supplier else "Unknown Supplier"
        bucket = supplier_rollup.setdefault(
            supplier_name,
            {"supplier_name": supplier_name, "total_value": 0.0, "po_count": 0},
        )
        bucket["total_value"] += total_amount
        bucket["po_count"] += 1

        if len(recent_pos) < 5:
            recent_pos.append(
                {
                    "id": str(po.id),
                    "code": po.code,
                    "supplier_name": supplier_name,
                    "order_date": po.order_date,
                    "status": po.status,
                    "status_display": po.get_status_display(),
                    "total_amount": total_amount,
                }
            )

    invoices = list(
        ProcurementInvoice.objects.filter(project=project)
        .select_related("supplier")
        .order_by("due_date", "-invoice_date")
    )
    invoiced = float(sum(inv.amount for inv in invoices))
    unpaid_invoices_count = 0
    unpaid_invoices = []
    unpaid_statuses = {"pending", "approved"}

    for invoice in invoices:
        if invoice.status not in unpaid_statuses:
            continue
        unpaid_invoices_count += 1
        if len(unpaid_invoices) < 5:
            unpaid_invoices.append(
                {
                    "id": str(invoice.id),
                    "code": invoice.code,
                    "supplier_name": invoice.supplier.name if invoice.supplier else "Unknown Supplier",
                    "amount": float(invoice.amount or 0),
                    "due_date": invoice.due_date,
                    "status": invoice.status,
                    "status_display": invoice.get_status_display(),
                }
            )

    payments = list(ProcurementPayment.objects.filter(project=project))
    paid = float(sum(payment.amount for payment in payments if payment.status == "completed"))

    top_suppliers = sorted(
        supplier_rollup.values(),
        key=lambda item: (item["total_value"], item["po_count"]),
        reverse=True,
    )[:5]

    return Response({
        "total_rfqs": rfq_count,
        "total_quotations": quotation_count,
        "total_pos": po_count,
        "total_po_value": po_value,
        "total_invoiced": invoiced,
        "total_paid": paid,
        "outstanding": invoiced - paid,
        "pending_deliveries": pending_deliveries,
        "unpaid_invoices_count": unpaid_invoices_count,
        "workflow_counts": {
            "rfqs": rfq_count,
            "quotations": quotation_count,
            "pos": po_count,
            "grns": GoodsReceipt.objects.filter(project=project).count(),
            "invoices": len(invoices),
            "payments": len(payments),
        },
        "recent_pos": recent_pos,
        "unpaid_invoices": unpaid_invoices,
        "top_suppliers": top_suppliers,
    })


# ---------------------------------------------------------------------------
# Item-level CRUD helpers
# ---------------------------------------------------------------------------

def _item_list_create(request, project, parent_model, parent_id_field, parent_id,
                      item_model, item_serializer_cls, parent_fk_field):
    """Generic list/create for nested items."""
    try:
        parent = parent_model.objects.get(pk=parent_id, project=project)
    except parent_model.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        items = item_model.objects.filter(**{parent_fk_field: parent})
        return Response(item_serializer_cls(items, many=True).data)

    if not _can_edit_procurement(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = item_serializer_cls(
        data=request.data,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save(**{parent_fk_field: parent})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


def _item_detail(request, project, parent_model, parent_id, item_model,
                 item_serializer_cls, parent_fk_field, item_id):
    """Generic retrieve/update/delete for nested items."""
    try:
        parent = parent_model.objects.get(pk=parent_id, project=project)
    except parent_model.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        item = item_model.objects.get(pk=item_id, **{parent_fk_field: parent})
    except item_model.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(item_serializer_cls(item).data)

    if not _can_edit_procurement(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    if request.method == "DELETE":
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = item_serializer_cls(
        item,
        data=request.data,
        partial=True,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# RFQ Items
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def rfq_item_list(request, project_id, rfq_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return _item_list_create(request, project, RFQ, "pk", rfq_id,
                             RFQItem, RFQItemSerializer, "rfq")


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def rfq_item_detail(request, project_id, rfq_id, item_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return _item_detail(request, project, RFQ, rfq_id, RFQItem,
                        RFQItemSerializer, "rfq", item_id)


# ---------------------------------------------------------------------------
# Quotation Items
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def quotation_item_list(request, project_id, quotation_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return _item_list_create(request, project, Quotation, "pk", quotation_id,
                             QuotationItem, QuotationItemSerializer, "quotation")


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def quotation_item_detail(request, project_id, quotation_id, item_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return _item_detail(request, project, Quotation, quotation_id, QuotationItem,
                        QuotationItemSerializer, "quotation", item_id)


# ---------------------------------------------------------------------------
# PO Items
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def po_item_list(request, project_id, po_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return _item_list_create(request, project, PurchaseOrder, "pk", po_id,
                             POItem, POItemSerializer, "purchase_order")


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def po_item_detail(request, project_id, po_id, item_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return _item_detail(request, project, PurchaseOrder, po_id, POItem,
                        POItemSerializer, "purchase_order", item_id)


# ---------------------------------------------------------------------------
# GRN Items
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def grn_item_list(request, project_id, grn_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return _item_list_create(request, project, GoodsReceipt, "pk", grn_id,
                             GRNItem, GRNItemSerializer, "goods_receipt")


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def grn_item_detail(request, project_id, grn_id, item_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return _item_detail(request, project, GoodsReceipt, grn_id, GRNItem,
                        GRNItemSerializer, "goods_receipt", item_id)
