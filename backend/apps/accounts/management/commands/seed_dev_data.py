"""
Seed development data for BuildPro.

Creates: 1 organisation, 4 system roles, 5 users, 5 projects, project memberships.

Usage:
    python manage.py seed_dev_data
    python manage.py seed_dev_data --flush   # wipe and re-seed
"""
from django.core.management.base import BaseCommand

from apps.accounts.models import (
    Organisation,
    SystemRole,
    User,
    DEFAULT_ROLES,
    DEFAULT_PROJECT_ROLE_PERMISSIONS,
)
from apps.projects.models import Project, ProjectMembership
from apps.projects.setup import initialize_project
from apps.scheduling.engine import seed_tasks_from_setup, run_cpm
from apps.scheduling.models import ProjectTask, TaskDependency, Milestone
from apps.cost.models import BudgetLine, Expense
from apps.risks.models import Risk
from apps.rfis.models import RFI
from apps.changes.models import ChangeOrder
from apps.field_ops.models import PunchItem, DailyLog, SafetyIncident, QualityCheck
from apps.procurement.models import Supplier, RFQ, RFQItem, Quotation, QuotationItem, PurchaseOrder, POItem, GoodsReceipt, GRNItem, ProcurementInvoice, ProcurementPayment
from apps.resources.models import Resource, ProjectResourceAssignment
from apps.labour.models import TimesheetEntry
from apps.comms.models import Meeting, MeetingAction, ChatMessage
from apps.notifications.models import Notification


class Command(BaseCommand):
    help = "Seed development data for BuildPro"

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete existing seed data before creating new data.",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self.stdout.write("Flushing existing data...")
            Notification.objects.all().delete()
            ChatMessage.objects.all().delete()
            MeetingAction.objects.all().delete()
            Meeting.objects.all().delete()
            TimesheetEntry.objects.all().delete()
            ProjectResourceAssignment.objects.all().delete()
            Resource.objects.all().delete()
            ProcurementPayment.objects.all().delete()
            ProcurementInvoice.objects.all().delete()
            GRNItem.objects.all().delete()
            GoodsReceipt.objects.all().delete()
            POItem.objects.all().delete()
            PurchaseOrder.objects.all().delete()
            QuotationItem.objects.all().delete()
            Quotation.objects.all().delete()
            RFQItem.objects.all().delete()
            RFQ.objects.all().delete()
            Supplier.objects.all().delete()
            QualityCheck.objects.all().delete()
            SafetyIncident.objects.all().delete()
            DailyLog.objects.all().delete()
            PunchItem.objects.all().delete()
            ChangeOrder.all_objects.all().delete()
            RFI.all_objects.all().delete()
            Risk.all_objects.all().delete()
            Expense.objects.all().delete()
            BudgetLine.objects.all().delete()
            Milestone.objects.all().delete()
            TaskDependency.objects.all().delete()
            ProjectTask.objects.all().delete()
            ProjectMembership.objects.all().delete()
            Project.all_objects.all().delete()
            User.objects.filter(is_superuser=False).delete()
            SystemRole.objects.all().delete()
            Organisation.objects.all().delete()

        # --- Organisation ---
        org, _ = Organisation.objects.get_or_create(
            name="BuildPro Construction Ltd",
            defaults={
                "address": "Plot 24, Kampala Road, Kampala, Uganda",
                "phone": "+256 312 000 000",
                "email": "info@buildpro.ug",
            },
        )
        self.stdout.write(f"  Organisation: {org.name}")

        # --- System Roles ---
        roles = {}
        for name, config in DEFAULT_ROLES.items():
            role, _ = SystemRole.objects.get_or_create(
                name=name,
                defaults={
                    "description": config["description"],
                    "permissions": config["permissions"],
                    "is_default": config.get("is_default", False),
                },
            )
            roles[name] = role
            self.stdout.write(f"  Role: {role.name}")

        # --- Users ---
        users_data = [
            {
                "username": "jesse",
                "password": "buildpro123",
                "first_name": "Jesse",
                "last_name": "Limo",
                "email": "mwanga.limo@studwc.kiu.ac.ug",
                "phone": "+256 700 000000",
                "job_title": "System Administrator",
                "system_role": roles["Admin"],
                "is_staff": True,
            },
            {
                "username": "sarah",
                "password": "buildpro123",
                "first_name": "Sarah",
                "last_name": "Nakamya",
                "email": "sarah.n@buildpro.ug",
                "phone": "+256 701 111111",
                "job_title": "Project Manager",
                "system_role": roles["Management"],
            },
            {
                "username": "patrick",
                "password": "buildpro123",
                "first_name": "Patrick",
                "last_name": "Ouma",
                "email": "patrick.o@buildpro.ug",
                "phone": "+256 702 222222",
                "job_title": "Project Manager",
                "system_role": roles["Standard"],
            },
            {
                "username": "grace",
                "password": "buildpro123",
                "first_name": "Grace",
                "last_name": "Apio",
                "email": "grace.a@buildpro.ug",
                "phone": "+256 703 333333",
                "job_title": "Quantity Surveyor",
                "system_role": roles["Standard"],
            },
            {
                "username": "david",
                "password": "buildpro123",
                "first_name": "David",
                "last_name": "Ssempijja",
                "email": "david.s@buildpro.ug",
                "phone": "+256 704 444444",
                "job_title": "Site Engineer",
                "system_role": roles["Viewer"],
            },
        ]

        users = {}
        for data in users_data:
            pwd = data.pop("password")
            role = data.pop("system_role")
            is_staff = data.pop("is_staff", False)
            user, created = User.objects.get_or_create(
                username=data["username"],
                defaults={**data, "organisation": org, "system_role": role, "is_staff": is_staff},
            )
            if created:
                user.set_password(pwd)
                user.save()
            users[data["username"]] = user
            self.stdout.write(f"  User: {user.get_full_name()} ({role.name})")

        # --- Projects ---
        projects_data = [
            {
                "name": "Kampala Heights Residence",
                "project_type": "residential",
                "contract_type": "lump_sum",
                "location": "Kololo, Kampala",
                "status": "active",
                "budget": 850000000,
                "start_date": "2026-01-15",
                "end_date": "2026-09-30",
                "client_name": "Mr. James Mukasa",
                "client_org": "Mukasa Properties Ltd",
                "consultant": "Arch. Florence Birungi & Associates",
                "contractor": "BuildPro Construction Ltd",
            },
            {
                "name": "Jinja-Iganga Highway Section B",
                "project_type": "road",
                "contract_type": "admeasure",
                "location": "Jinja District",
                "status": "active",
                "budget": 12500000000,
                "start_date": "2025-11-01",
                "end_date": "2027-06-30",
                "client_name": "UNRA",
                "client_org": "Uganda National Roads Authority",
                "consultant": "SMEC International",
                "contractor": "BuildPro Construction Ltd",
            },
            {
                "name": "UCU Library Extension",
                "project_type": "commercial",
                "contract_type": "design_build",
                "location": "Mukono",
                "status": "active",
                "budget": 2200000000,
                "start_date": "2025-08-01",
                "end_date": "2026-08-31",
                "client_name": "Uganda Christian University",
                "client_org": "UCU",
                "consultant": "In-house (Design & Build)",
                "contractor": "BuildPro Construction Ltd",
            },
            {
                "name": "Gulu Health Centre IV",
                "project_type": "hospital",
                "contract_type": "lump_sum",
                "location": "Gulu Municipality",
                "status": "active",
                "budget": 4800000000,
                "start_date": "2026-02-01",
                "end_date": "2027-12-31",
                "client_name": "Ministry of Health",
                "client_org": "Government of Uganda",
                "consultant": "Crown Agents Uganda",
                "contractor": "BuildPro Construction Ltd",
            },
            {
                "name": "Entebbe Pedestrian Bridge",
                "project_type": "bridge",
                "contract_type": "turnkey",
                "location": "Entebbe",
                "status": "completed",
                "budget": 1200000000,
                "start_date": "2025-03-01",
                "end_date": "2026-02-28",
                "client_name": "KCCA",
                "client_org": "Kampala Capital City Authority",
                "consultant": "AECOM Uganda",
                "contractor": "BuildPro Construction Ltd",
            },
        ]

        projects = {}
        for data in projects_data:
            proj, created = Project.objects.get_or_create(
                name=data["name"],
                organisation=org,
                defaults={**data, "created_by": users["jesse"]},
            )
            if created:
                initialize_project(proj)
            projects[proj.name] = proj
            self.stdout.write(f"  Project: {proj.code} - {proj.name}")

        # --- Memberships ---
        # jesse (Admin) sees everything via system role -- no explicit membership needed
        # but adding as manager on all for completeness
        membership_map = [
            ("jesse", "Kampala Heights Residence", "manager"),
            ("jesse", "Jinja-Iganga Highway Section B", "manager"),
            ("jesse", "UCU Library Extension", "manager"),
            ("jesse", "Gulu Health Centre IV", "manager"),
            ("jesse", "Entebbe Pedestrian Bridge", "manager"),
            ("sarah", "Kampala Heights Residence", "manager"),
            ("sarah", "Gulu Health Centre IV", "manager"),
            ("patrick", "Jinja-Iganga Highway Section B", "manager"),
            ("patrick", "Entebbe Pedestrian Bridge", "manager"),
            ("grace", "Kampala Heights Residence", "qs"),
            ("grace", "UCU Library Extension", "qs"),
            ("grace", "Gulu Health Centre IV", "qs"),
            ("david", "UCU Library Extension", "engineer"),
            ("david", "Jinja-Iganga Highway Section B", "viewer"),
        ]

        for username, proj_name, role in membership_map:
            user = users[username]
            proj = projects[proj_name]
            ProjectMembership.objects.get_or_create(
                project=proj,
                user=user,
                defaults={
                    "role": role,
                    "permissions": DEFAULT_PROJECT_ROLE_PERMISSIONS.get(
                        role, DEFAULT_PROJECT_ROLE_PERMISSIONS["viewer"]
                    ),
                },
            )

        # --- Seed schedule data from setup engine templates ---
        total_tasks = 0
        for proj in projects.values():
            if not ProjectTask.objects.filter(project=proj).exists():
                count = seed_tasks_from_setup(proj)
                if count:
                    total_tasks += count
                    self.stdout.write(f"  Schedule: {proj.code} -- {count} tasks seeded")

        # Set progress on Kampala Heights leaf tasks to demo CPM/EVM visuals
        kh = projects.get("Kampala Heights Residence")
        if kh:
            # Phase A leaf tasks (Aa, Ab, Ac, Ad) = 100%, Phase B leafs (Ba, Bb) = 60%
            complete_codes = ["Aa", "Ab", "Ac", "Ad"]
            partial_codes = ["Ba", "Bb"]
            for task in ProjectTask.objects.filter(
                project=kh, is_parent=False,
                code__in=complete_codes + partial_codes
            ):
                task.progress = 100 if task.code in complete_codes else 60
                task.status = "completed" if task.progress >= 100 else "in_progress"
                task.save(update_fields=["progress", "status"])
            run_cpm(kh.id)

        # --- Seed budget and expense data ---
        from datetime import date, timedelta
        budget_count = 0
        expense_count = 0

        budget_templates = {
            "residential": [
                ("PREL", "Preliminaries & Site Setup", "preliminaries", 0.03),
                ("FOUND", "Foundation Works", "substructure", 0.14),
                ("WALL", "Superstructure / Walling", "superstructure", 0.17),
                ("ROOF", "Roofing", "roofing", 0.13),
                ("MEP", "Mechanical & Electrical", "mep", 0.11),
                ("FIN", "Finishes", "finishes", 0.14),
                ("FIT", "Doors, Windows & Fittings", "fittings", 0.12),
                ("EXT", "External Works", "external", 0.06),
                ("PROF", "Professional Fees", "professional", 0.05),
                ("CONT", "Contingency", "contingency", 0.05),
            ],
            "road": [
                ("PREL", "Pre-Construction & Mobilisation", "preliminaries", 0.07),
                ("EARTH", "Earthworks & Grading", "earthworks", 0.13),
                ("DRAIN", "Drainage & Structures", "drainage", 0.08),
                ("PAVE", "Pavement Layers", "pavement", 0.26),
                ("FURN", "Road Furniture & Finishes", "external", 0.06),
                ("ANC", "Ancillary Works", "external", 0.05),
                ("EQUIP", "Equipment & Plant", "equipment", 0.15),
                ("LAB", "Labour", "labour", 0.10),
                ("PROF", "Professional Fees", "professional", 0.05),
                ("CONT", "Contingency", "contingency", 0.05),
            ],
        }

        for proj_name, proj in projects.items():
            if BudgetLine.objects.filter(project=proj).exists():
                continue

            budget = float(proj.budget)
            if budget <= 0:
                continue

            template = budget_templates.get(proj.project_type, budget_templates.get("residential", []))
            for idx, (code, name, cat, weight) in enumerate(template):
                bl = BudgetLine.objects.create(
                    project=proj, code=code, name=name,
                    category=cat, budget_amount=round(budget * weight),
                    status="approved", sort_order=idx,
                    created_by=users["jesse"],
                )
                budget_count += 1

                # Create sample expenses for the first few budget lines
                if idx < 4 and proj.status == "active":
                    spend_pct = 0.6 if idx == 0 else 0.4 if idx == 1 else 0.2
                    line_budget = round(budget * weight)
                    exp_amount = round(line_budget * spend_pct)
                    if exp_amount > 0:
                        Expense.objects.create(
                            project=proj, budget_line=bl,
                            description=f"{name} - Progress payment",
                            amount=exp_amount * 0.6,
                            expense_date=date(2026, 2, 15),
                            vendor="Various Subcontractors",
                            category=cat, status="verified",
                            created_by=users["jesse"],
                        )
                        Expense.objects.create(
                            project=proj, budget_line=bl,
                            description=f"{name} - Materials",
                            amount=exp_amount * 0.4,
                            expense_date=date(2026, 3, 1),
                            vendor="Building Materials Ltd",
                            category=cat, status="recorded",
                            created_by=users["grace"],
                        )
                        expense_count += 2

            self.stdout.write(f"  Budget: {proj.code} -- {len(template)} lines seeded")

        # --- Seed field operations data ---
        kh = projects.get("Kampala Heights Residence")
        jh = projects.get("Jinja-Iganga Highway Section B")

        if kh and not Risk.objects.filter(project=kh).exists():
            Risk.objects.create(project=kh, code="R-001", title="Foundation soil bearing capacity uncertainty", category="technical", likelihood="high", impact="high", mitigation="Conduct additional geotechnical tests", status="open", created_by=users["jesse"])
            Risk.objects.create(project=kh, code="R-002", title="Material price escalation", category="financial", likelihood="medium", impact="high", mitigation="Secure fixed-price supply contracts", status="mitigated", created_by=users["jesse"])
            Risk.objects.create(project=kh, code="R-003", title="Wet season delays", category="schedule", likelihood="high", impact="medium", mitigation="Adjust programme for rain contingency", status="open", created_by=users["jesse"])

            RFI.objects.create(project=kh, code="RFI-001", subject="Foundation reinforcement specs", question="Please clarify rebar spacing for strip foundation.", raised_by=users["sarah"], date_raised=date(2026, 3, 5), due_date=date(2026, 3, 12), status="open", priority="high", created_by=users["sarah"])
            RFI.objects.create(project=kh, code="RFI-002", subject="Window frame material", question="Aluminium or steel frames for ground floor?", raised_by=users["grace"], date_raised=date(2026, 2, 20), due_date=date(2026, 2, 28), response="Use aluminium frames as per BOQ.", response_date=date(2026, 2, 27), status="closed", created_by=users["grace"])
            RFI.objects.create(project=kh, code="RFI-003", subject="Roof tile colour", question="Client wants to change from maroon to charcoal.", raised_by=users["sarah"], date_raised=date(2026, 3, 10), due_date=date(2026, 3, 8), status="open", priority="medium", created_by=users["sarah"])

            ChangeOrder.objects.create(project=kh, code="CO-001", title="Additional guest bathroom", category="client", reason="Client requested extra bathroom on ground floor.", cost_impact=15000000, time_impact_days=7, status="approved", requested_by=users["sarah"], approved_by=users["jesse"], created_by=users["sarah"])
            ChangeOrder.objects.create(project=kh, code="CO-002", title="Upgraded floor tiles", category="design", reason="Architect recommended porcelain instead of ceramic.", cost_impact=8000000, time_impact_days=0, status="submitted", requested_by=users["grace"], created_by=users["grace"])

            PunchItem.objects.create(project=kh, title="Ceiling crack in master bedroom", location="Level 1, Master Bedroom", priority="high", status="pending", created_by=users["sarah"])
            PunchItem.objects.create(project=kh, title="Tile alignment issue kitchen", location="Ground Floor, Kitchen", priority="medium", status="in_progress", assigned_to=users["grace"], created_by=users["sarah"])
            PunchItem.objects.create(project=kh, title="External paint touch-up", location="North elevation", priority="low", status="completed", created_by=users["sarah"])

            DailyLog.objects.create(project=kh, log_date=date(2026, 3, 13), weather="Sunny, 28C", workforce="32 workers on site", work_performed="Continued blockwork on Level 1. Ring beam formwork started.", delays="", author=users["sarah"], created_by=users["sarah"])
            DailyLog.objects.create(project=kh, log_date=date(2026, 3, 12), weather="Partly cloudy, 26C", workforce="28 workers on site", work_performed="Foundation backfill completed. Blockwork to DPC level.", delays="Late delivery of blocks - 2hr delay", materials_notes="500 blocks delivered", author=users["sarah"], created_by=users["sarah"])
            DailyLog.objects.create(project=kh, log_date=date(2026, 3, 11), weather="Rain in morning, cleared by noon", workforce="15 workers (reduced due to rain)", work_performed="Internal plumbing rough-in. Site cleanup after rain.", delays="3hr rain delay", incidents="Near miss - scaffolding board dislodged", author=users["sarah"], created_by=users["sarah"])

            SafetyIncident.objects.create(project=kh, incident_date=date(2026, 3, 11), title="Scaffolding board dislodged", description="A scaffolding board on Level 2 became loose and fell. No injuries.", incident_type="near_miss", severity="moderate", location="Level 2 scaffolding", immediate_action="Area cordoned off, scaffolding re-secured", follow_up="All scaffolding to be re-inspected", status="resolved", reported_by=users["sarah"], created_by=users["sarah"])

            QualityCheck.objects.create(project=kh, check_date=date(2026, 3, 10), title="Concrete cube test - Foundation", category="concrete", result="pass", remarks="28-day strength 25 N/mm2, target 20 N/mm2", inspector=users["jesse"], created_by=users["jesse"])
            QualityCheck.objects.create(project=kh, check_date=date(2026, 3, 12), title="Blockwork alignment check", category="visual", result="conditional", remarks="Minor alignment deviation on north wall", corrective_action="Re-align top 3 courses before ring beam", inspector=users["sarah"], created_by=users["sarah"])

            self.stdout.write(f"  Field ops: {kh.code} -- risks, RFIs, COs, punch, logs, safety, quality seeded")

        if jh and not Risk.objects.filter(project=jh).exists():
            Risk.objects.create(project=jh, code="R-001", title="Land acquisition dispute Km 12-15", category="legal", likelihood="high", impact="critical", mitigation="Engage local government mediation", status="open", created_by=users["jesse"])
            RFI.objects.create(project=jh, code="RFI-001", subject="Culvert design at Km 8", question="Confirm box culvert dimensions for revised drainage study.", raised_by=users["patrick"], date_raised=date(2026, 3, 1), due_date=date(2026, 3, 15), status="open", priority="high", created_by=users["patrick"])
            DailyLog.objects.create(project=jh, log_date=date(2026, 3, 13), weather="Overcast", workforce="45 workers, 8 machines", work_performed="Earthworks Km 5-7. Grading operations.", author=users["patrick"], created_by=users["patrick"])
            self.stdout.write(f"  Field ops: {jh.code} -- risks, RFIs, logs seeded")

        # --- Phase 5: Procurement, Resources, Labour, Meetings, Chat, Notifications ---
        if kh and not Supplier.objects.filter(organisation=org).exists():
            # Suppliers (org-scoped)
            s1 = Supplier.objects.create(organisation=org, code="SUP-001", name="Steel Suppliers Uganda Ltd", contact_person="John Kato", phone="+256 701 555001", category="Steel", created_by=users["jesse"])
            s2 = Supplier.objects.create(organisation=org, code="SUP-002", name="Kampala Building Materials", contact_person="Mary Namutebi", phone="+256 702 555002", category="Building Materials", created_by=users["jesse"])
            s3 = Supplier.objects.create(organisation=org, code="SUP-003", name="East Africa Cement Co", contact_person="Peter Ochieng", phone="+256 703 555003", category="Cement", created_by=users["jesse"])

            # RFQs
            rfq1 = RFQ.objects.create(project=kh, code="RFQ-001", title="Foundation Steel Supply", description="Reinforcement steel for foundation works", due_date=date(2026, 2, 10), status="awarded", created_by=users["jesse"])
            rfqi1 = RFQItem.objects.create(rfq=rfq1, description="Y16 Rebar", unit="tonnes", quantity=12)
            rfqi2 = RFQItem.objects.create(rfq=rfq1, description="Y12 Rebar", unit="tonnes", quantity=8, sort_order=1)

            # Quotations
            qtn1 = Quotation.objects.create(project=kh, rfq=rfq1, supplier=s1, code="QTN-001", quote_date=date(2026, 2, 5), validity_date=date(2026, 3, 5), status="accepted", created_by=users["grace"])
            QuotationItem.objects.create(quotation=qtn1, rfq_item=rfqi1, description="Y16 Rebar", unit="tonnes", quantity=12, unit_price=3500000)
            QuotationItem.objects.create(quotation=qtn1, rfq_item=rfqi2, description="Y12 Rebar", unit="tonnes", quantity=8, unit_price=3200000, sort_order=1)

            # POs linked to quotation
            po1 = PurchaseOrder.objects.create(project=kh, supplier=s1, quotation=qtn1, code="PO-001", status="issued", notes="Foundation reinforcement steel", created_by=users["jesse"])
            POItem.objects.create(purchase_order=po1, description="Y16 Rebar", unit="tonnes", quantity=12, unit_price=3500000)
            POItem.objects.create(purchase_order=po1, description="Y12 Rebar", unit="tonnes", quantity=8, unit_price=3200000)

            po2 = PurchaseOrder.objects.create(project=kh, supplier=s3, code="PO-002", status="delivered", notes="Foundation cement", created_by=users["jesse"])
            POItem.objects.create(purchase_order=po2, description="OPC Cement 50kg", unit="bags", quantity=200, unit_price=38000)

            # GRN for delivered PO
            grn1 = GoodsReceipt.objects.create(project=kh, purchase_order=po2, code="GRN-001", receipt_date=date(2026, 2, 18), received_by=users["sarah"], status="confirmed", created_by=users["sarah"])
            GRNItem.objects.create(goods_receipt=grn1, description="OPC Cement 50kg", unit="bags", ordered_quantity=200, received_quantity=195, remarks="5 bags damaged in transit")

            inv1 = ProcurementInvoice.objects.create(project=kh, supplier=s1, purchase_order=po1, code="INV-001", invoice_date=date(2026, 2, 20), due_date=date(2026, 3, 20), amount=67600000, status="pending", created_by=users["grace"])
            ProcurementPayment.objects.create(project=kh, supplier=s1, invoice=inv1, payment_date=date(2026, 3, 1), amount=30000000, reference="CHQ-4521", method="cheque", status="completed", created_by=users["jesse"])

            self.stdout.write(f"  Procurement: 3 suppliers, 1 RFQ, 1 quotation, 2 POs, 1 GRN, 1 invoice, 1 payment seeded")

            # Resources (org-scoped)
            r1 = Resource.objects.create(organisation=org, code="RES-001", resource_type="personnel", name="Foreman Mukasa", role="Site Foreman", daily_rate=80000, status="assigned", created_by=users["jesse"])
            r2 = Resource.objects.create(organisation=org, code="RES-002", resource_type="equipment", name="CAT 320 Excavator", role="Earthworks", daily_rate=500000, status="assigned", created_by=users["jesse"])
            r3 = Resource.objects.create(organisation=org, code="RES-003", resource_type="personnel", name="Mason Team A", role="Masonry", daily_rate=120000, status="available", created_by=users["jesse"])

            ProjectResourceAssignment.objects.create(project=kh, resource=r1, assignment_role="Site Foreman", assigned_from=date(2026, 1, 15), status="active", created_by=users["jesse"])
            ProjectResourceAssignment.objects.create(project=kh, resource=r2, assignment_role="Foundation excavation", assigned_from=date(2026, 1, 20), assigned_to=date(2026, 2, 15), status="released", created_by=users["jesse"])
            self.stdout.write(f"  Resources: 3 resources, 2 assignments seeded")

            # Timesheets
            TimesheetEntry.objects.create(project=kh, resource=r1, work_date=date(2026, 3, 13), hours=8, description="Supervised blockwork Level 1", status="submitted", created_by=users["sarah"])
            TimesheetEntry.objects.create(project=kh, resource=r1, work_date=date(2026, 3, 12), hours=8, overtime_hours=2, description="Foundation backfill supervision", status="approved", approved_by=users["jesse"], created_by=users["sarah"])
            self.stdout.write(f"  Timesheets: 2 entries seeded")

            # Meetings
            m1 = Meeting.objects.create(project=kh, title="Weekly Progress Meeting #12", meeting_type="progress", meeting_date=date(2026, 3, 13), location="Site Office", attendees="Jesse Limo, Sarah Nakamya, Grace Apio, Foreman Mukasa", summary="Blockwork progressing well. Foundation backfill completed. Ring beam formwork to start next week.", chaired_by=users["sarah"], created_by=users["sarah"])
            MeetingAction.objects.create(meeting=m1, description="Submit ring beam reinforcement schedule", assigned_to=users["sarah"], due_date=date(2026, 3, 17), status="open")
            MeetingAction.objects.create(meeting=m1, description="Order additional blocks for Level 1", assigned_to=users["grace"], due_date=date(2026, 3, 15), status="completed")
            self.stdout.write(f"  Meetings: 1 meeting + 2 actions seeded")

            # Chat
            ChatMessage.objects.create(project=kh, sender=users["sarah"], message="Good morning team. Foundation backfill completed yesterday.")
            ChatMessage.objects.create(project=kh, sender=users["grace"], message="Great progress! I will update the cost report today.")
            ChatMessage.objects.create(project=kh, sender=users["jesse"], message="Well done. Let us push to get ring beam done by Friday.")
            self.stdout.write(f"  Chat: 3 messages seeded")

            # Notifications
            Notification.objects.create(user=users["jesse"], project=kh, notification_type="rfi", title="Overdue RFI", message="RFI-003 (Roof tile colour) is past due date.", level="warning", link=f"/app/projects/{kh.id}/rfis")
            Notification.objects.create(user=users["jesse"], project=kh, notification_type="risk", title="High Risk Alert", message="R-001 Foundation soil bearing uncertainty - High likelihood, High impact.", level="danger", link=f"/app/projects/{kh.id}/risks")
            Notification.objects.create(user=users["sarah"], project=kh, notification_type="meeting", title="Action Due", message="Submit ring beam reinforcement schedule by Mar 17.", level="info", link=f"/app/projects/{kh.id}/meetings")
            Notification.objects.create(user=users["jesse"], notification_type="general", title="System Ready", message="BuildPro Phase 5 modules are now available.", level="success", is_read=True)
            self.stdout.write(f"  Notifications: 4 seeded")

        # ── Documents ──
        from apps.documents.models import Document
        from django.utils import timezone
        now = timezone.now()
        ucu = projects.get("UCU Library Extension")
        gulu_proj = projects.get("Gulu Health Centre IV")
        doc_data = [
            {"project": kh, "name": "Architectural Drawings - Kampala Heights", "category": "drawings", "notes": "Full set of architectural drawings Rev C"},
            {"project": kh, "name": "Building Permit", "category": "permits", "notes": "KCCA approved building permit"},
            {"project": kh, "name": "Contract Agreement", "category": "contracts", "notes": "Signed lump sum contract"},
            {"project": kh, "name": "Foundation Inspection Photo", "category": "photos", "notes": "Foundation inspection before concrete pour"},
            {"project": kh, "name": "Site Progress Photo - Week 12", "category": "photos", "notes": "Superstructure progress Level 2"},
            {"project": jh, "name": "Road Survey Report", "category": "reports", "notes": "Topographic survey along alignment"},
            {"project": jh, "name": "Environmental Permit", "category": "permits", "notes": "NEMA environmental clearance"},
            {"project": ucu, "name": "Structural Drawings Rev B", "category": "drawings", "notes": "Updated structural package"},
            {"project": gulu_proj, "name": "Health Centre Design Brief", "category": "other", "notes": "Ministry of Health design requirements"},
            {"project": gulu_proj, "name": "Site Clearance Photo", "category": "photos", "notes": "Before construction started"},
        ]
        for dd in doc_data:
            doc = Document.objects.create(
                project=dd["project"],
                organisation=org,
                name=dd["name"],
                category=dd["category"],
                notes=dd["notes"],
                current_version_number=1,
                latest_file_name=f"{dd['name'].lower().replace(' ', '_')}.pdf",
                latest_file_size=1024 * 50,  # 50KB placeholder
                latest_content_type="application/pdf" if dd["category"] != "photos" else "image/jpeg",
                last_uploaded_at=now,
                created_by=users["jesse"],
                updated_by=users["jesse"],
            )
        # Give one document a second version
        multi_ver_doc = Document.objects.filter(name__contains="Architectural").first()
        if multi_ver_doc:
            multi_ver_doc.current_version_number = 3
            multi_ver_doc.latest_file_name = "architectural_drawings_rev_c.pdf"
            multi_ver_doc.save(update_fields=["current_version_number", "latest_file_name"])
        self.stdout.write(f"  Documents: {len(doc_data)} seeded")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nSeed complete: {len(users)} users, {len(projects)} projects, "
                f"{len(membership_map)} memberships, {total_tasks} tasks, "
                f"{budget_count} budget lines, {expense_count} expenses"
            )
        )
        self.stdout.write(
            self.style.WARNING(
                "\nLogin credentials (all passwords: buildpro123):\n"
                "  jesse  (Admin)      -- sees all projects\n"
                "  sarah  (Management) -- sees all, manages Kampala Heights + Gulu HC\n"
                "  patrick (Standard)  -- manages Jinja Highway + Entebbe Bridge only\n"
                "  grace  (Standard)   -- QS on 3 projects\n"
                "  david  (Viewer)     -- engineer on UCU Library, viewer on Jinja"
            )
        )
