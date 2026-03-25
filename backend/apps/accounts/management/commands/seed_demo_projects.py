"""Seed a realistic single-admin demo portfolio.

Creates or updates five editable projects at different execution stages,
plus enough cross-module data to make the workspace and AI features useful
without creating extra user accounts.
"""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.accounts.models import DEFAULT_PROJECT_ROLE_PERMISSIONS, Organisation, User
from apps.changes.models import ChangeOrder
from apps.comms.models import Meeting, MeetingAction
from apps.cost.models import BudgetLine, Expense
from apps.documents.models import Document
from apps.field_ops.models import DailyLog, PunchItem, QualityCheck, SafetyIncident
from apps.labour.models import TimesheetEntry
from apps.procurement.models import (
    GoodsReceipt,
    GRNItem,
    POItem,
    ProcurementInvoice,
    ProcurementPayment,
    PurchaseOrder,
    Quotation,
    QuotationItem,
    RFQ,
    RFQItem,
    Supplier,
)
from apps.projects.models import Project, ProjectMembership
from apps.projects.setup import initialize_project
from apps.resources.models import ProjectResourceAssignment, Resource
from apps.rfis.models import RFI
from apps.risks.models import Risk
from apps.scheduling.engine import run_cpm, seed_tasks_from_setup
from apps.scheduling.models import Milestone, ProjectTask


PROJECT_BLUEPRINTS = [
    {
        "name": "Kampala Heights Residence",
        "project_type": "residential",
        "contract_type": "lump_sum",
        "location": "Kololo, Kampala",
        "status": "active",
        "budget": Decimal("850000000"),
        "start_date": date(2026, 1, 15),
        "end_date": date(2026, 9, 30),
        "client_name": "James Mukasa",
        "client_org": "Mukasa Properties Ltd",
        "consultant": "Florence Birungi & Associates",
        "contractor": "BuildPro Construction Ltd",
        "stage": "finishing",
        "cost_multiplier": Decimal("0.83"),
    },
    {
        "name": "Jinja-Iganga Highway Section B",
        "project_type": "road",
        "contract_type": "admeasure",
        "location": "Jinja District",
        "status": "active",
        "budget": Decimal("12500000000"),
        "start_date": date(2025, 11, 1),
        "end_date": date(2027, 6, 30),
        "client_name": "UNRA",
        "client_org": "Uganda National Roads Authority",
        "consultant": "SMEC International",
        "contractor": "BuildPro Construction Ltd",
        "stage": "mid_execution",
        "cost_multiplier": Decimal("0.46"),
    },
    {
        "name": "UCU Library Extension",
        "project_type": "commercial",
        "contract_type": "design_build",
        "location": "Mukono",
        "status": "active",
        "budget": Decimal("2200000000"),
        "start_date": date(2025, 8, 1),
        "end_date": date(2026, 8, 31),
        "client_name": "Uganda Christian University",
        "client_org": "UCU",
        "consultant": "In-house Design & Build Team",
        "contractor": "BuildPro Construction Ltd",
        "stage": "fit_out",
        "cost_multiplier": Decimal("0.71"),
    },
    {
        "name": "Gulu Health Centre IV",
        "project_type": "hospital",
        "contract_type": "lump_sum",
        "location": "Gulu Municipality",
        "status": "active",
        "budget": Decimal("4800000000"),
        "start_date": date(2026, 2, 1),
        "end_date": date(2027, 12, 31),
        "client_name": "Ministry of Health",
        "client_org": "Government of Uganda",
        "consultant": "Crown Agents Uganda",
        "contractor": "BuildPro Construction Ltd",
        "stage": "early_work",
        "cost_multiplier": Decimal("0.23"),
    },
    {
        "name": "Entebbe Pedestrian Bridge",
        "project_type": "bridge",
        "contract_type": "turnkey",
        "location": "Entebbe",
        "status": "completed",
        "budget": Decimal("1200000000"),
        "start_date": date(2025, 3, 1),
        "end_date": date(2026, 2, 28),
        "client_name": "KCCA",
        "client_org": "Kampala Capital City Authority",
        "consultant": "AECOM Uganda",
        "contractor": "BuildPro Construction Ltd",
        "stage": "completed",
        "cost_multiplier": Decimal("0.97"),
    },
]

STAGE_PROGRESS = {
    "early_work": {"completed": 0.12, "in_progress": 0.18, "delayed": 0.06},
    "mid_execution": {"completed": 0.42, "in_progress": 0.28, "delayed": 0.08},
    "fit_out": {"completed": 0.68, "in_progress": 0.18, "delayed": 0.04},
    "finishing": {"completed": 0.82, "in_progress": 0.10, "delayed": 0.02},
    "completed": {"completed": 1.0, "in_progress": 0.0, "delayed": 0.0},
}

BUDGET_WEIGHTS = [
    ("PREL", "Preliminaries & Site Setup", "preliminaries", Decimal("0.06")),
    ("SUB", "Substructure & Civil", "substructure", Decimal("0.18")),
    ("SUP", "Superstructure", "superstructure", Decimal("0.20")),
    ("MEP", "Mechanical & Electrical", "mep", Decimal("0.12")),
    ("FIN", "Finishes", "finishes", Decimal("0.16")),
    ("EXT", "External Works", "external", Decimal("0.08")),
    ("LAB", "Labour", "labour", Decimal("0.10")),
    ("CONT", "Contingency", "contingency", Decimal("0.10")),
]

PROJECT_RISKS = {
    "early_work": [
        ("R-001", "Utility relocation may delay mobilisation", "resource", "high", "high", "open"),
        ("R-002", "Scope definition still evolving", "technical", "medium", "medium", "mitigated"),
    ],
    "mid_execution": [
        ("R-001", "Heavy rainfall may affect earthworks productivity", "schedule", "high", "high", "open"),
        ("R-002", "Material price escalation on aggregates", "financial", "medium", "high", "open"),
    ],
    "fit_out": [
        ("R-001", "Late client approvals for finishes", "external", "medium", "high", "open"),
        ("R-002", "Imported fittings may arrive late", "resource", "medium", "medium", "mitigated"),
    ],
    "finishing": [
        ("R-001", "Close-out defects could delay handover", "technical", "medium", "high", "open"),
        ("R-002", "Final material substitutions need sign-off", "technical", "medium", "medium", "accepted"),
    ],
    "completed": [
        ("R-001", "Retention release documentation may slip", "financial", "low", "medium", "open"),
    ],
}


class Command(BaseCommand):
    help = "Seed five editable demo projects for the current organisation."

    def add_arguments(self, parser):
        parser.add_argument(
            "--replace",
            action="store_true",
            help="Delete existing demo projects with the same names before reseeding.",
        )
        parser.add_argument(
            "--username",
            help="Use a specific existing username as the seeding owner.",
        )

    def handle(self, *args, **options):
        owner = self._resolve_owner(options.get("username"))
        organisation = owner.organisation
        if not organisation:
            raise CommandError("The chosen user must belong to an organisation.")

        if options["replace"]:
            Project.objects.filter(
                organisation=organisation,
                name__in=[item["name"] for item in PROJECT_BLUEPRINTS],
            ).delete()

        suppliers = self._ensure_suppliers(organisation, owner)
        resources = self._ensure_resources(organisation, owner)

        for blueprint in PROJECT_BLUEPRINTS:
            project = self._create_or_update_project(organisation, owner, blueprint)
            self._ensure_membership(project, owner)
            self._ensure_schedule(project, owner, blueprint["stage"])
            self._ensure_costs(project, owner, blueprint)
            self._ensure_risks(project, owner, blueprint["stage"])
            self._ensure_field_ops(project, owner, blueprint["stage"])
            self._ensure_procurement(project, owner, blueprint["stage"], suppliers)
            self._ensure_resources_and_timesheets(project, owner, blueprint["stage"], resources)
            self._ensure_meetings(project, owner, blueprint["stage"])
            self._ensure_documents(project, owner, organisation, blueprint["stage"])
            self.stdout.write(self.style.SUCCESS(f"Seeded demo project: {project.code} - {project.name}"))

        self.stdout.write(self.style.SUCCESS("Demo portfolio ready."))

    def _resolve_owner(self, username: str | None):
        if username:
            try:
                return User.objects.select_related("organisation").get(username=username)
            except User.DoesNotExist as exc:
                raise CommandError(f"User '{username}' does not exist.") from exc

        owner = (
            User.objects.select_related("organisation", "system_role")
            .order_by("date_joined", "username")
            .filter(organisation__isnull=False)
            .first()
        )
        if not owner:
            raise CommandError("No user with an organisation exists yet. Seed the env admin first.")
        return owner

    def _create_or_update_project(self, organisation: Organisation, owner: User, blueprint: dict):
        project_fields = {
            key: value
            for key, value in blueprint.items()
            if key not in {"stage", "cost_multiplier"}
        }
        defaults = {**project_fields, "created_by": owner}
        project, created = Project.objects.get_or_create(
            organisation=organisation,
            name=blueprint["name"],
            defaults=defaults,
        )
        if not created:
            for field, value in project_fields.items():
                setattr(project, field, value)
            project.save()
        if not project.setup_complete:
            initialize_project(project)
        return project

    def _ensure_membership(self, project: Project, owner: User):
        ProjectMembership.objects.get_or_create(
            project=project,
            user=owner,
            defaults={
                "role": "manager",
                "permissions": DEFAULT_PROJECT_ROLE_PERMISSIONS["manager"],
            },
        )

    def _ensure_schedule(self, project: Project, owner: User, stage: str):
        if not ProjectTask.objects.filter(project=project).exists():
            seed_tasks_from_setup(project)
        profile = STAGE_PROGRESS[stage]
        tasks = list(ProjectTask.objects.filter(project=project, is_parent=False).order_by("sort_order", "code"))
        if not tasks:
            return

        total = len(tasks)
        completed_count = min(total, max(0, round(total * profile["completed"])))
        in_progress_count = min(total - completed_count, round(total * profile["in_progress"]))
        delayed_count = min(total - completed_count - in_progress_count, round(total * profile["delayed"]))

        for index, task in enumerate(tasks):
            if index < completed_count:
                task.progress = 100
                task.status = "completed"
            elif index < completed_count + in_progress_count:
                task.progress = 55 if stage in {"mid_execution", "fit_out"} else 30
                task.status = "in_progress"
            elif index < completed_count + in_progress_count + delayed_count:
                task.progress = 20
                task.status = "delayed"
            else:
                task.progress = 0
                task.status = "not_started"
            task.updated_by = owner
            task.save(update_fields=["progress", "status", "updated_by", "updated_at"])

        milestones = list(Milestone.objects.filter(project=project).order_by("sort_order", "target_date"))
        achieved_count = round(len(milestones) * profile["completed"])
        for index, milestone in enumerate(milestones):
            milestone.status = "achieved" if index < achieved_count else "pending"
            milestone.actual_date = project.end_date if milestone.status == "achieved" and stage == "completed" else None
            milestone.updated_by = owner
            milestone.save(update_fields=["status", "actual_date", "updated_by", "updated_at"])

        run_cpm(project.id)

    def _ensure_costs(self, project: Project, owner: User, blueprint: dict):
        total_budget = blueprint["budget"]
        multiplier = blueprint["cost_multiplier"]

        for index, (code, name, category, weight) in enumerate(BUDGET_WEIGHTS):
            amount = (total_budget * weight).quantize(Decimal("1"))
            line, created = BudgetLine.objects.get_or_create(
                project=project,
                code=code,
                defaults={
                    "name": name,
                    "category": category,
                    "budget_amount": amount,
                    "status": "approved",
                    "sort_order": index,
                    "created_by": owner,
                    "updated_by": owner,
                },
            )
            if not created:
                line.name = name
                line.category = category
                line.budget_amount = amount
                line.status = "approved"
                line.sort_order = index
                line.updated_by = owner
                line.save()

            actual_amount = (amount * multiplier).quantize(Decimal("1")) if index < 4 else (amount * multiplier * Decimal("0.35")).quantize(Decimal("1"))
            Expense.objects.get_or_create(
                project=project,
                budget_line=line,
                description=f"{name} progress spend",
                defaults={
                    "amount": actual_amount,
                    "expense_date": blueprint["start_date"] + timedelta(days=30 + index * 14),
                    "vendor": "BuildPro Approved Supply Chain",
                    "category": category,
                    "status": "verified" if project.status == "completed" else "recorded",
                    "created_by": owner,
                    "updated_by": owner,
                },
            )

    def _ensure_risks(self, project: Project, owner: User, stage: str):
        for code, title, category, likelihood, impact, status in PROJECT_RISKS[stage]:
            Risk.objects.get_or_create(
                project=project,
                code=code,
                defaults={
                    "title": title,
                    "category": category if category in dict(Risk.CATEGORY_CHOICES) else "other",
                    "likelihood": likelihood,
                    "impact": impact,
                    "mitigation": "Review weekly and assign a named owner with due dates.",
                    "status": status,
                    "owner": owner,
                    "created_by": owner,
                    "updated_by": owner,
                },
            )

    def _ensure_field_ops(self, project: Project, owner: User, stage: str):
        RFI.objects.get_or_create(
            project=project,
            code="RFI-001",
            defaults={
                "subject": "Clarify latest site instruction",
                "question": f"Please confirm the current decision affecting the {project.name} work front.",
                "raised_by": owner,
                "assigned_to": owner,
                "date_raised": project.start_date + timedelta(days=45),
                "due_date": project.start_date + timedelta(days=55),
                "status": "closed" if stage == "completed" else "open",
                "priority": "high" if stage in {"mid_execution", "early_work"} else "medium",
                "response": "Incorporate the latest consultant instruction in the updated site plan." if stage == "completed" else "",
                "created_by": owner,
                "updated_by": owner,
            },
        )

        ChangeOrder.objects.get_or_create(
            project=project,
            code="CO-001",
            defaults={
                "title": "Client refinement package",
                "category": "design",
                "reason": "User requirements evolved during execution.",
                "cost_impact": Decimal("8000000") if stage != "completed" else Decimal("0"),
                "time_impact_days": 4 if stage in {"mid_execution", "fit_out"} else 0,
                "status": "approved" if stage in {"finishing", "completed"} else "submitted",
                "requested_by": owner,
                "approved_by": owner if stage in {"finishing", "completed"} else None,
                "created_by": owner,
                "updated_by": owner,
            },
        )

        DailyLog.objects.get_or_create(
            project=project,
            log_date=min(date.today(), project.start_date + timedelta(days=60)),
            author=owner,
            defaults={
                "weather": "Sunny intervals",
                "workforce": "28 operatives and 4 supervisors on site",
                "work_performed": f"Primary work fronts advanced for {project.name}.",
                "delays": "Minor material coordination delay." if stage in {"mid_execution", "early_work"} else "",
                "materials_notes": "Site materials checked and logged.",
                "incidents": "No recordable incidents." if stage != "completed" else "Close-out inspections ongoing.",
                "created_by": owner,
                "updated_by": owner,
            },
        )

        if stage in {"mid_execution", "finishing", "completed"}:
            PunchItem.objects.get_or_create(
                project=project,
                title="Close-out touch-up package",
                defaults={
                    "location": "Main works area",
                    "priority": "medium",
                    "status": "completed" if stage == "completed" else "in_progress",
                    "assigned_to": owner,
                    "created_by": owner,
                    "updated_by": owner,
                },
            )

        if stage in {"mid_execution", "early_work"}:
            SafetyIncident.objects.get_or_create(
                project=project,
                incident_date=min(date.today(), project.start_date + timedelta(days=70)),
                title="Near miss during active work front coordination",
                defaults={
                    "description": "A near miss was logged and toolbox reminders were issued.",
                    "incident_type": "near_miss",
                    "severity": "moderate",
                    "location": "Primary site work front",
                    "immediate_action": "Supervisor briefing completed.",
                    "follow_up": "Close out via next safety review.",
                    "status": "resolved" if stage == "mid_execution" else "open",
                    "reported_by": owner,
                    "created_by": owner,
                    "updated_by": owner,
                },
            )

        QualityCheck.objects.get_or_create(
            project=project,
            check_date=min(date.today(), project.start_date + timedelta(days=75)),
            title="Quality gate inspection",
            defaults={
                "category": "visual",
                "result": "pass" if stage in {"finishing", "completed"} else "conditional",
                "remarks": "Minor close-out comments only." if stage in {"finishing", "completed"} else "Follow-up action required on the next inspection cycle.",
                "inspector": owner,
                "created_by": owner,
                "updated_by": owner,
            },
        )

    def _ensure_procurement(self, project: Project, owner: User, stage: str, suppliers: dict[str, Supplier]):
        if stage == "completed":
            return

        steel_supplier = suppliers["steel"]
        materials_supplier = suppliers["materials"]

        rfq, _ = RFQ.objects.get_or_create(
            project=project,
            code="RFQ-001",
            defaults={
                "title": "Core package supply",
                "description": "Primary material package for current work front.",
                "due_date": project.start_date + timedelta(days=40),
                "status": "awarded" if stage in {"mid_execution", "fit_out", "finishing"} else "issued",
                "created_by": owner,
                "updated_by": owner,
            },
        )
        rfq_item, _ = RFQItem.objects.get_or_create(
            rfq=rfq,
            description="Primary work-front material package",
            defaults={"unit": "lot", "quantity": Decimal("1.00")},
        )

        quotation, _ = Quotation.objects.get_or_create(
            project=project,
            code="QTN-001",
            supplier=steel_supplier,
            defaults={
                "rfq": rfq,
                "quote_date": project.start_date + timedelta(days=36),
                "validity_date": project.start_date + timedelta(days=66),
                "status": "accepted" if stage in {"mid_execution", "fit_out", "finishing"} else "under_review",
                "created_by": owner,
                "updated_by": owner,
            },
        )
        QuotationItem.objects.get_or_create(
            quotation=quotation,
            description="Primary work-front material package",
            defaults={
                "rfq_item": rfq_item,
                "unit": "lot",
                "quantity": Decimal("1.00"),
                "unit_price": Decimal("45000000"),
            },
        )

        po, _ = PurchaseOrder.objects.get_or_create(
            project=project,
            code="PO-001",
            supplier=materials_supplier,
            defaults={
                "quotation": quotation,
                "delivery_date": project.start_date + timedelta(days=80),
                "status": "delivered" if stage in {"finishing"} else "issued",
                "notes": "Demo procurement package",
                "approved_by": owner,
                "created_by": owner,
                "updated_by": owner,
            },
        )
        po_item, _ = POItem.objects.get_or_create(
            purchase_order=po,
            description="Primary work-front material package",
            defaults={"unit": "lot", "quantity": Decimal("1.00"), "unit_price": Decimal("48000000")},
        )

        if stage in {"finishing", "fit_out"}:
            grn, _ = GoodsReceipt.objects.get_or_create(
                project=project,
                code="GRN-001",
                purchase_order=po,
                defaults={
                    "receipt_date": min(date.today(), project.start_date + timedelta(days=90)),
                    "received_by": owner,
                    "status": "confirmed",
                    "created_by": owner,
                    "updated_by": owner,
                },
            )
            GRNItem.objects.get_or_create(
                goods_receipt=grn,
                description="Primary work-front material package",
                defaults={
                    "po_item": po_item,
                    "unit": "lot",
                    "ordered_quantity": Decimal("1.00"),
                    "received_quantity": Decimal("1.00"),
                    "remarks": "Received in good condition.",
                },
            )

        invoice, _ = ProcurementInvoice.objects.get_or_create(
            project=project,
            code="INV-001",
            supplier=materials_supplier,
            defaults={
                "purchase_order": po,
                "invoice_date": project.start_date + timedelta(days=92),
                "due_date": project.start_date + timedelta(days=122),
                "amount": Decimal("48000000"),
                "status": "paid" if stage == "finishing" else "pending",
                "created_by": owner,
                "updated_by": owner,
            },
        )
        if stage == "finishing":
            ProcurementPayment.objects.get_or_create(
                project=project,
                supplier=materials_supplier,
                invoice=invoice,
                payment_date=project.start_date + timedelta(days=110),
                defaults={
                    "amount": Decimal("48000000"),
                    "method": "bank_transfer",
                    "status": "completed",
                    "created_by": owner,
                    "updated_by": owner,
                },
            )

    def _ensure_resources_and_timesheets(self, project: Project, owner: User, stage: str, resources: dict[str, Resource]):
        foreman = resources["foreman"]
        plant = resources["plant"]

        ProjectResourceAssignment.objects.get_or_create(
            project=project,
            resource=foreman,
            defaults={
                "assignment_role": "Site coordination",
                "assigned_from": project.start_date,
                "status": "active" if stage != "completed" else "released",
                "created_by": owner,
                "updated_by": owner,
            },
        )

        if stage in {"early_work", "mid_execution"}:
            ProjectResourceAssignment.objects.get_or_create(
                project=project,
                resource=plant,
                defaults={
                    "assignment_role": "Heavy works",
                    "assigned_from": project.start_date + timedelta(days=14),
                    "status": "active",
                    "created_by": owner,
                    "updated_by": owner,
                },
            )

        TimesheetEntry.objects.get_or_create(
            project=project,
            resource=foreman,
            work_date=min(date.today(), project.start_date + timedelta(days=65)),
            defaults={
                "hours": Decimal("8.00"),
                "overtime_hours": Decimal("1.50") if stage in {"mid_execution", "fit_out"} else Decimal("0.00"),
                "description": "Demo site coordination shift",
                "status": "approved" if stage == "completed" else "submitted",
                "approved_by": owner,
                "created_by": owner,
                "updated_by": owner,
            },
        )

    def _ensure_meetings(self, project: Project, owner: User, stage: str):
        meeting, _ = Meeting.objects.get_or_create(
            project=project,
            title="Weekly Delivery Review",
            meeting_date=min(date.today(), project.start_date + timedelta(days=84)),
            defaults={
                "meeting_type": "progress",
                "location": "Site office",
                "attendees": "Project leadership and site coordination team",
                "summary": f"Reviewed progress, constraints, and next actions for {project.name}.",
                "chaired_by": owner,
                "created_by": owner,
                "updated_by": owner,
            },
        )
        MeetingAction.objects.get_or_create(
            meeting=meeting,
            description="Publish updated two-week lookahead",
            defaults={
                "assigned_to": owner,
                "due_date": min(date.today(), project.start_date + timedelta(days=91)),
                "status": "completed" if stage in {"finishing", "completed"} else "open",
            },
        )

    def _ensure_documents(self, project: Project, owner: User, organisation: Organisation, stage: str):
        docs = [
            ("Architectural Issue Set", "drawings"),
            ("Commercial Snapshot", "reports"),
            ("Site Permit Record", "permits"),
        ]
        for title, category in docs:
            document, created = Document.objects.get_or_create(
                project=project,
                organisation=organisation,
                title=title,
                defaults={
                    "category": category,
                    "status": "approved" if stage in {"finishing", "completed"} else "issued",
                    "description": f"{title} for {project.name}",
                    "current_version_number": 1,
                    "latest_file_name": f"{title.lower().replace(' ', '_')}.pdf",
                    "latest_file_size": 51200,
                    "latest_content_type": "application/pdf",
                    "last_uploaded_at": timezone.now(),
                    "created_by": owner,
                    "updated_by": owner,
                },
            )
            if not created:
                document.updated_by = owner
                document.current_version_number = max(document.current_version_number, 1)
                document.save(update_fields=["updated_by", "updated_at", "current_version_number"])

    def _ensure_suppliers(self, organisation: Organisation, owner: User):
        suppliers = {
            "steel": ("SUP-001", "Steel Suppliers Uganda Ltd", "Steel"),
            "materials": ("SUP-002", "Kampala Building Materials", "Building Materials"),
            "cement": ("SUP-003", "East Africa Cement Co", "Cement"),
        }
        created = {}
        for key, (code, name, category) in suppliers.items():
            created[key], _ = Supplier.objects.get_or_create(
                organisation=organisation,
                code=code,
                defaults={
                    "name": name,
                    "contact_person": "BuildPro Supply Desk",
                    "phone": "+256 700 555000",
                    "category": category,
                    "created_by": owner,
                    "updated_by": owner,
                },
            )
        return created

    def _ensure_resources(self, organisation: Organisation, owner: User):
        resources = {
            "foreman": ("RES-001", "Foreman Mukasa", "personnel", "Site Foreman", Decimal("80000")),
            "plant": ("RES-002", "CAT 320 Excavator", "equipment", "Earthworks Plant", Decimal("500000")),
            "masonry": ("RES-003", "Masonry Team A", "personnel", "Masonry Crew", Decimal("120000")),
        }
        created = {}
        for key, (code, name, resource_type, role, rate) in resources.items():
            created[key], _ = Resource.objects.get_or_create(
                organisation=organisation,
                code=code,
                defaults={
                    "resource_type": resource_type,
                    "name": name,
                    "role": role,
                    "daily_rate": rate,
                    "status": "available",
                    "created_by": owner,
                    "updated_by": owner,
                },
            )
        return created
