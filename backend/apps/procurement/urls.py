"""Procurement URL configuration."""
from django.urls import path
from . import views

urlpatterns = [
    # Suppliers (org-scoped -- no project_id prefix)
    path("suppliers/", views.supplier_list, name="supplier-list"),

    # RFQs
    path("<uuid:project_id>/rfqs/", views.rfq_list, name="rfq-list"),
    path("<uuid:project_id>/rfqs/<uuid:rfq_id>/", views.rfq_detail, name="rfq-detail"),
    path("<uuid:project_id>/rfqs/<uuid:rfq_id>/items/", views.rfq_item_list, name="rfq-item-list"),
    path("<uuid:project_id>/rfqs/<uuid:rfq_id>/items/<int:item_id>/", views.rfq_item_detail, name="rfq-item-detail"),

    # Quotations
    path("<uuid:project_id>/quotations/", views.quotation_list, name="quotation-list"),
    path("<uuid:project_id>/quotations/<uuid:quotation_id>/", views.quotation_detail, name="quotation-detail"),
    path("<uuid:project_id>/quotations/<uuid:quotation_id>/items/", views.quotation_item_list, name="quotation-item-list"),
    path("<uuid:project_id>/quotations/<uuid:quotation_id>/items/<int:item_id>/", views.quotation_item_detail, name="quotation-item-detail"),

    # Purchase Orders
    path("<uuid:project_id>/purchase-orders/", views.purchase_order_list, name="purchase-order-list"),
    path("<uuid:project_id>/purchase-orders/<uuid:po_id>/", views.purchase_order_detail, name="purchase-order-detail"),
    path("<uuid:project_id>/purchase-orders/<uuid:po_id>/items/", views.po_item_list, name="po-item-list"),
    path("<uuid:project_id>/purchase-orders/<uuid:po_id>/items/<int:item_id>/", views.po_item_detail, name="po-item-detail"),

    # Goods Receipts
    path("<uuid:project_id>/goods-receipts/", views.goods_receipt_list, name="goods-receipt-list"),
    path("<uuid:project_id>/goods-receipts/<uuid:grn_id>/", views.goods_receipt_detail, name="goods-receipt-detail"),
    path("<uuid:project_id>/goods-receipts/<uuid:grn_id>/items/", views.grn_item_list, name="grn-item-list"),
    path("<uuid:project_id>/goods-receipts/<uuid:grn_id>/items/<int:item_id>/", views.grn_item_detail, name="grn-item-detail"),

    # Invoices
    path("<uuid:project_id>/procurement-invoices/", views.procurement_invoice_list, name="procurement-invoice-list"),

    # Payments
    path("<uuid:project_id>/procurement-payments/", views.procurement_payment_list, name="procurement-payment-list"),

    # Summary
    path("<uuid:project_id>/procurement-summary/", views.procurement_summary, name="procurement-summary"),
]
