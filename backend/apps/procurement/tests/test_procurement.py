"""Tests for procurement: Supplier, RFQ, Quotation, PurchaseOrder, summary."""
from datetime import date
from decimal import Decimal
from django.test import TestCase
from apps.accounts.models import User, Organisation, SystemRole
from apps.projects.models import Project
from apps.procurement.models import (
    Supplier, RFQ, Quotation, QuotationItem, PurchaseOrder, POItem,
    ProcurementInvoice, ProcurementPayment,
)


class ProcurementBaseTestCase(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")
        self.admin_role = SystemRole.objects.create(name="Admin", permissions=["admin.full_access"])
        self.admin = User.objects.create_user(
            username="admin", password="pass123",
            organisation=self.org, system_role=self.admin_role, is_staff=True,
        )
        self.project = Project.objects.create(
            name="Procurement Test", project_type="residential",
            contract_type="lump_sum", organisation=self.org,
        )
        self.supplier = Supplier.objects.create(
            organisation=self.org, code="SUP-001", name="Acme Supplies",
            contact_person="John", email="john@acme.com",
        )


class SupplierTests(ProcurementBaseTestCase):
    def test_create_supplier(self):
        self.client.force_login(self.admin)
        r = self.client.post("/api/v1/procurement/suppliers/",
            {"code": "SUP-002", "name": "Beta Corp", "category": "materials"},
            content_type="application/json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["name"], "Beta Corp")
        # Org-scoped: supplier belongs to the admin's org
        self.assertEqual(r.json()["organisation"], str(self.org.id))


class RFQTests(ProcurementBaseTestCase):
    def test_create_rfq(self):
        self.client.force_login(self.admin)
        r = self.client.post(f"/api/v1/procurement/{self.project.id}/rfqs/",
            {"code": "RFQ-001", "title": "Concrete supply", "due_date": "2026-04-01"},
            content_type="application/json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["code"], "RFQ-001")


class QuotationTests(ProcurementBaseTestCase):
    def test_create_quotation_linked_to_rfq(self):
        rfq = RFQ.objects.create(
            project=self.project, code="RFQ-001", title="Concrete",
        )
        self.client.force_login(self.admin)
        r = self.client.post(f"/api/v1/procurement/{self.project.id}/quotations/",
            {
                "rfq": str(rfq.id),
                "supplier": str(self.supplier.id),
                "code": "QTN-001",
                "quote_date": "2026-03-14",
            },
            content_type="application/json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["rfq"], str(rfq.id))
        self.assertEqual(r.json()["supplier_name"], "Acme Supplies")

    def test_reject_cross_project_rfq(self):
        other_project = Project.objects.create(
            name="Other Project",
            project_type="residential",
            contract_type="lump_sum",
            organisation=self.org,
        )
        other_rfq = RFQ.objects.create(
            project=other_project,
            code="RFQ-OTHER",
            title="Other Concrete",
        )
        self.client.force_login(self.admin)
        r = self.client.post(
            f"/api/v1/procurement/{self.project.id}/quotations/",
            {
                "rfq": str(other_rfq.id),
                "supplier": str(self.supplier.id),
                "code": "QTN-X",
                "quote_date": "2026-03-14",
            },
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertIn("rfq", r.json())

    def test_reject_cross_org_supplier(self):
        other_org = Organisation.objects.create(name="Other Org")
        other_supplier = Supplier.objects.create(
            organisation=other_org,
            code="SUP-999",
            name="Foreign Supplies",
        )
        rfq = RFQ.objects.create(
            project=self.project,
            code="RFQ-002",
            title="Steel",
        )
        self.client.force_login(self.admin)
        r = self.client.post(
            f"/api/v1/procurement/{self.project.id}/quotations/",
            {
                "rfq": str(rfq.id),
                "supplier": str(other_supplier.id),
                "code": "QTN-ORG",
                "quote_date": "2026-03-14",
            },
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertIn("supplier", r.json())

    def test_quotation_total_amount_property(self):
        quotation = Quotation.objects.create(
            project=self.project, supplier=self.supplier,
            code="QTN-002", quote_date=date(2026, 3, 14),
        )
        QuotationItem.objects.create(
            quotation=quotation, description="Cement", quantity=10, unit_price=Decimal("500.00"),
        )
        QuotationItem.objects.create(
            quotation=quotation, description="Sand", quantity=5, unit_price=Decimal("200.00"),
        )
        self.assertEqual(quotation.total_amount, Decimal("6000.00"))


class PurchaseOrderTests(ProcurementBaseTestCase):
    def test_create_purchase_order(self):
        self.client.force_login(self.admin)
        r = self.client.post(f"/api/v1/procurement/{self.project.id}/purchase-orders/",
            {
                "supplier": str(self.supplier.id),
                "code": "PO-001",
                "delivery_date": "2026-04-15",
            },
            content_type="application/json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["code"], "PO-001")
        self.assertEqual(r.json()["supplier_name"], "Acme Supplies")


class ProcurementSummaryTests(ProcurementBaseTestCase):
    def test_procurement_summary(self):
        po = PurchaseOrder.objects.create(
            project=self.project,
            supplier=self.supplier,
            code="PO-001",
            status="issued",
        )
        POItem.objects.create(
            purchase_order=po,
            description="Cement",
            unit="bags",
            quantity=Decimal("10"),
            unit_price=Decimal("30000"),
        )
        invoice = ProcurementInvoice.objects.create(
            project=self.project,
            supplier=self.supplier,
            purchase_order=po,
            code="INV-001",
            invoice_date=date(2026, 3, 14),
            due_date=date(2026, 3, 30),
            amount=Decimal("300000"),
            status="pending",
        )
        ProcurementPayment.objects.create(
            project=self.project,
            supplier=self.supplier,
            invoice=invoice,
            payment_date=date(2026, 3, 20),
            amount=Decimal("100000"),
            status="completed",
            method="bank_transfer",
        )

        self.client.force_login(self.admin)
        r = self.client.get(f"/api/v1/procurement/{self.project.id}/procurement-summary/")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["total_pos"], 1)
        self.assertEqual(data["pending_deliveries"], 1)
        self.assertEqual(data["unpaid_invoices_count"], 1)
        self.assertEqual(data["workflow_counts"]["pos"], 1)
        self.assertEqual(data["workflow_counts"]["invoices"], 1)
        self.assertEqual(data["workflow_counts"]["payments"], 1)
        self.assertEqual(len(data["recent_pos"]), 1)
        self.assertEqual(len(data["unpaid_invoices"]), 1)
        self.assertEqual(len(data["top_suppliers"]), 1)
        self.assertIn("total_pos", data)
        self.assertIn("total_po_value", data)
        self.assertIn("total_invoiced", data)
        self.assertIn("total_paid", data)
        self.assertIn("outstanding", data)


class SupplierAuthorizationTests(ProcurementBaseTestCase):
    """Verify that only admin/management can create org-level suppliers."""
    def setUp(self):
        super().setUp()
        std_role = SystemRole.objects.create(name="Standard", permissions=[])
        self.std_user = User.objects.create_user(
            username="standard", password="pass123",
            organisation=self.org, system_role=std_role,
        )

    def test_standard_user_cannot_create_supplier(self):
        self.client.force_login(self.std_user)
        r = self.client.post("/api/v1/procurement/suppliers/",
            {"code": "SUP-X", "name": "Nope"},
            content_type="application/json")
        self.assertEqual(r.status_code, 403)

    def test_admin_can_create_supplier(self):
        self.client.force_login(self.admin)
        r = self.client.post("/api/v1/procurement/suppliers/",
            {"code": "SUP-ADM", "name": "Admin Supplier"},
            content_type="application/json")
        self.assertEqual(r.status_code, 201)


class RFQItemTests(ProcurementBaseTestCase):
    """Test item-level CRUD for RFQs."""
    def setUp(self):
        super().setUp()
        self.rfq = RFQ.objects.create(project=self.project, code="RFQ-T1", title="Test RFQ")

    def test_create_rfq_item(self):
        self.client.force_login(self.admin)
        r = self.client.post(
            f"/api/v1/procurement/{self.project.id}/rfqs/{self.rfq.id}/items/",
            {"description": "Rebar 12mm", "unit": "ton", "quantity": 5},
            content_type="application/json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["description"], "Rebar 12mm")

    def test_list_rfq_items(self):
        from apps.procurement.models import RFQItem
        RFQItem.objects.create(rfq=self.rfq, description="Item A", unit="kg", quantity=10)
        self.client.force_login(self.admin)
        r = self.client.get(f"/api/v1/procurement/{self.project.id}/rfqs/{self.rfq.id}/items/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), 1)

    def test_delete_rfq_item(self):
        from apps.procurement.models import RFQItem
        item = RFQItem.objects.create(rfq=self.rfq, description="Delete me", unit="pc", quantity=1)
        self.client.force_login(self.admin)
        r = self.client.delete(f"/api/v1/procurement/{self.project.id}/rfqs/{self.rfq.id}/items/{item.id}/")
        self.assertEqual(r.status_code, 204)


class AutoCodeTests(ProcurementBaseTestCase):
    """Verify auto-generated codes when code is omitted."""
    def test_rfq_auto_code(self):
        self.client.force_login(self.admin)
        r = self.client.post(f"/api/v1/procurement/{self.project.id}/rfqs/",
            {"title": "Auto-coded RFQ"},
            content_type="application/json")
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.json()["code"].startswith("RFQ-"))


class UnauthenticatedTests(ProcurementBaseTestCase):
    def test_denied(self):
        for url in [
            "/api/v1/procurement/suppliers/",
            f"/api/v1/procurement/{self.project.id}/rfqs/",
            f"/api/v1/procurement/{self.project.id}/quotations/",
            f"/api/v1/procurement/{self.project.id}/purchase-orders/",
            f"/api/v1/procurement/{self.project.id}/procurement-summary/",
        ]:
            self.assertEqual(self.client.get(url).status_code, 403)
