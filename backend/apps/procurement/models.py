"""
Procurement models -- Supplier, RFQ, Quotation, PurchaseOrder, GRN, Invoice, Payment.
Full traceability chain: RFQ -> Quotation -> PO -> GRN with invoicing and payment.
"""
from django.conf import settings
from django.db import models
from apps.core.models import TimestampedModel, AuditMixin


class Supplier(TimestampedModel, AuditMixin):
    STATUS_CHOICES = [("active", "Active"), ("inactive", "Inactive"), ("blacklisted", "Blacklisted")]
    organisation = models.ForeignKey("accounts.Organisation", on_delete=models.CASCADE, related_name="suppliers")
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True, default="")
    phone = models.CharField(max_length=50, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    address = models.TextField(blank=True, default="")
    category = models.CharField(max_length=100, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    notes = models.TextField(blank=True, default="")
    class Meta:
        db_table = "procurement_supplier"
        ordering = ["name"]
        unique_together = [("organisation", "code")]
    def __str__(self): return f"{self.code} - {self.name}"


class RFQ(TimestampedModel, AuditMixin):
    """Request for Quotation."""
    STATUS_CHOICES = [("draft", "Draft"), ("issued", "Issued"), ("closed", "Closed"), ("awarded", "Awarded"), ("cancelled", "Cancelled")]
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="rfqs")
    code = models.CharField(max_length=20)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    issue_date = models.DateField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    class Meta:
        db_table = "procurement_rfq"
        ordering = ["-issue_date"]
        unique_together = [("project", "code")]
    def __str__(self): return f"RFQ {self.code}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self._generate_code()
        super().save(*args, **kwargs)

    def _generate_code(self):
        prefix = "RFQ"
        last = (
            RFQ.objects.filter(project=self.project, code__startswith=f"{prefix}-")
            .order_by("-code")
            .values_list("code", flat=True)
            .first()
        )
        if last:
            try:
                seq = int(last.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        return f"{prefix}-{seq:03d}"


class RFQItem(models.Model):
    id = models.AutoField(primary_key=True)
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name="items")
    sort_order = models.IntegerField(default=0)
    description = models.CharField(max_length=255)
    unit = models.CharField(max_length=30, default="unit")
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=1)
    notes = models.CharField(max_length=255, blank=True, default="")
    class Meta:
        db_table = "procurement_rfq_item"
        ordering = ["sort_order"]


class Quotation(TimestampedModel, AuditMixin):
    """Supplier quotation, optionally linked to an RFQ."""
    STATUS_CHOICES = [("received", "Received"), ("under_review", "Under Review"), ("accepted", "Accepted"), ("rejected", "Rejected")]
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="quotations")
    rfq = models.ForeignKey(RFQ, on_delete=models.SET_NULL, null=True, blank=True, related_name="quotations")
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name="quotations")
    code = models.CharField(max_length=20)
    quote_date = models.DateField()
    validity_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="received")
    notes = models.TextField(blank=True, default="")
    class Meta:
        db_table = "procurement_quotation"
        ordering = ["-quote_date"]
    def __str__(self): return f"QTN {self.code}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self._generate_code()
        super().save(*args, **kwargs)

    def _generate_code(self):
        prefix = "QTN"
        last = (
            Quotation.objects.filter(project=self.project, code__startswith=f"{prefix}-")
            .order_by("-code")
            .values_list("code", flat=True)
            .first()
        )
        if last:
            try:
                seq = int(last.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        return f"{prefix}-{seq:03d}"
    @property
    def total_amount(self):
        return sum(i.line_total for i in self.items.all())


class QuotationItem(models.Model):
    id = models.AutoField(primary_key=True)
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name="items")
    rfq_item = models.ForeignKey(RFQItem, on_delete=models.SET_NULL, null=True, blank=True)
    sort_order = models.IntegerField(default=0)
    description = models.CharField(max_length=255)
    unit = models.CharField(max_length=30, default="unit")
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    class Meta:
        db_table = "procurement_quotation_item"
        ordering = ["sort_order"]
    @property
    def line_total(self): return self.quantity * self.unit_price


class PurchaseOrder(TimestampedModel, AuditMixin):
    STATUS_CHOICES = [("draft", "Draft"), ("issued", "Issued"), ("partially_delivered", "Partially Delivered"), ("delivered", "Delivered"), ("cancelled", "Cancelled")]
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="purchase_orders")
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name="purchase_orders")
    quotation = models.ForeignKey(Quotation, on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_orders")
    code = models.CharField(max_length=20)
    order_date = models.DateField(auto_now_add=True)
    delivery_address = models.TextField(blank=True, default="")
    delivery_date = models.DateField(null=True, blank=True)
    payment_terms = models.CharField(max_length=255, blank=True, default="")
    instructions = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    notes = models.TextField(blank=True, default="")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_pos")
    class Meta:
        db_table = "procurement_purchase_order"
        ordering = ["-order_date"]
        unique_together = [("project", "code")]
    def __str__(self): return f"PO {self.code}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self._generate_code()
        super().save(*args, **kwargs)

    def _generate_code(self):
        prefix = "PO"
        last = (
            PurchaseOrder.objects.filter(project=self.project, code__startswith=f"{prefix}-")
            .order_by("-code")
            .values_list("code", flat=True)
            .first()
        )
        if last:
            try:
                seq = int(last.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        return f"{prefix}-{seq:03d}"
    @property
    def total_amount(self):
        return sum(i.line_total for i in self.items.all())


class POItem(models.Model):
    id = models.AutoField(primary_key=True)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="items")
    sort_order = models.IntegerField(default=0)
    description = models.CharField(max_length=255)
    unit = models.CharField(max_length=30, default="unit")
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    class Meta:
        db_table = "procurement_po_item"
        ordering = ["sort_order"]
    @property
    def line_total(self): return self.quantity * self.unit_price


class GoodsReceipt(TimestampedModel, AuditMixin):
    STATUS_CHOICES = [("draft", "Draft"), ("confirmed", "Confirmed"), ("disputed", "Disputed")]
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="goods_receipts")
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="goods_receipts")
    code = models.CharField(max_length=20)
    receipt_date = models.DateField()
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="received_grns")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    notes = models.TextField(blank=True, default="")
    class Meta:
        db_table = "procurement_grn"
        ordering = ["-receipt_date"]
    def __str__(self): return f"GRN {self.code}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self._generate_code()
        super().save(*args, **kwargs)

    def _generate_code(self):
        prefix = "GRN"
        last = (
            GoodsReceipt.objects.filter(project=self.project, code__startswith=f"{prefix}-")
            .order_by("-code")
            .values_list("code", flat=True)
            .first()
        )
        if last:
            try:
                seq = int(last.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        return f"{prefix}-{seq:03d}"


class GRNItem(models.Model):
    id = models.AutoField(primary_key=True)
    goods_receipt = models.ForeignKey(GoodsReceipt, on_delete=models.CASCADE, related_name="items")
    po_item = models.ForeignKey(POItem, on_delete=models.SET_NULL, null=True, blank=True)
    sort_order = models.IntegerField(default=0)
    description = models.CharField(max_length=255)
    unit = models.CharField(max_length=30, default="unit")
    ordered_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    received_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    remarks = models.CharField(max_length=255, blank=True, default="")
    class Meta:
        db_table = "procurement_grn_item"
        ordering = ["sort_order"]


class ProcurementInvoice(TimestampedModel, AuditMixin):
    STATUS_CHOICES = [("pending", "Pending"), ("approved", "Approved"), ("paid", "Paid"), ("disputed", "Disputed")]
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="procurement_invoices")
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name="invoices")
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    code = models.CharField(max_length=20)
    invoice_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    notes = models.TextField(blank=True, default="")
    class Meta:
        db_table = "procurement_invoice"
        ordering = ["-invoice_date"]
    def __str__(self): return f"INV {self.code}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self._generate_code()
        super().save(*args, **kwargs)

    def _generate_code(self):
        prefix = "INV"
        last = (
            ProcurementInvoice.objects.filter(project=self.project, code__startswith=f"{prefix}-")
            .order_by("-code")
            .values_list("code", flat=True)
            .first()
        )
        if last:
            try:
                seq = int(last.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        return f"{prefix}-{seq:03d}"


class ProcurementPayment(TimestampedModel, AuditMixin):
    STATUS_CHOICES = [("pending", "Pending"), ("completed", "Completed"), ("failed", "Failed")]
    METHOD_CHOICES = [("bank_transfer", "Bank Transfer"), ("cheque", "Cheque"), ("cash", "Cash"), ("mobile_money", "Mobile Money")]
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="procurement_payments")
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name="payments")
    invoice = models.ForeignKey(ProcurementInvoice, on_delete=models.SET_NULL, null=True, blank=True, related_name="payments")
    payment_date = models.DateField()
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    reference = models.CharField(max_length=100, blank=True, default="")
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default="bank_transfer")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    notes = models.TextField(blank=True, default="")
    class Meta:
        db_table = "procurement_payment"
        ordering = ["-payment_date"]
    def __str__(self): return f"PAY {self.reference or self.id}"

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = self._generate_code()
        super().save(*args, **kwargs)

    def _generate_code(self):
        prefix = "PAY"
        last = (
            ProcurementPayment.objects.filter(project=self.project, reference__startswith=f"{prefix}-")
            .order_by("-reference")
            .values_list("reference", flat=True)
            .first()
        )
        if last:
            try:
                seq = int(last.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        return f"{prefix}-{seq:03d}"
