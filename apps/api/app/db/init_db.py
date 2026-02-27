import logging
from sqlalchemy.orm import Session
from datetime import date
import uuid

from app.db.session import SessionLocal
from app.models.user import User, RoleModel
from app.models.organization import Organization, OrganizationMember, OrgRole, MembershipStatus
from app.models.project import Project, ProjectMember, ProjectStatus, ProjectPriority
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.expense import Expense, ExpenseStatus
from app.models.risk import Risk, RiskProbability, RiskImpact, RiskStatus
from app.models.milestone import Milestone, MilestoneStatus
from app.models.document import Document
from app.core.security import hash_password
from app.core.rbac import Role, ROLE_PERMISSIONS

logger = logging.getLogger(__name__)


def init_roles(db: Session):
    """Create default roles"""
    for role in Role:
        existing_role = db.query(RoleModel).filter(RoleModel.role_name == role).first()
        if not existing_role:
            permissions = [perm.value for perm in ROLE_PERMISSIONS[role]]
            db_role = RoleModel(
                role_name=role,
                description=f"{role.value} role",
                permissions=permissions
            )
            db.add(db_role)
            logger.info(f"Created role: {role.value}")
    
    db.commit()


def init_organization(db: Session) -> Organization:
    """Create default organization"""
    existing_org = db.query(Organization).filter(Organization.slug == "internal-projects").first()
    if not existing_org:
        org = Organization(
            name="Internal Projects Organization",
            slug="internal-projects",
            subscription_tier="professional",
            max_projects=100,
            max_users=50,
            is_active=True
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        logger.info("Created default organization: Internal Projects Organization")
        return org
    return existing_org


def init_admin_user(db: Session, org: Organization):
    """Create default admin user"""
    admin_role = db.query(RoleModel).filter(RoleModel.role_name == Role.ADMINISTRATOR).first()
    
    existing_admin = db.query(User).filter(User.email == "admin@example.com").first()
    if not existing_admin:
        admin_user = User(
            email="admin@example.com",
            password_hash=hash_password("Admin@123456"),
            first_name="System",
            last_name="Administrator",
            phone_number="+10000000000",
            role_id=admin_role.id,
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        # Add to organization
        org_member = OrganizationMember(
            organization_id=org.id,
            user_id=admin_user.id,
            org_role=OrgRole.ORG_ADMIN,
            status=MembershipStatus.ACTIVE
        )
        db.add(org_member)
        db.commit()
        
        logger.info("Created admin user: admin@example.com / Admin@123456")
        return admin_user
    else:
        # Ensure admin is in org
        existing_membership = db.query(OrganizationMember).filter(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.user_id == existing_admin.id
        ).first()
        if not existing_membership:
            org_member = OrganizationMember(
                organization_id=org.id,
                user_id=existing_admin.id,
                org_role=OrgRole.ORG_ADMIN,
                status=MembershipStatus.ACTIVE
            )
            db.add(org_member)
            db.commit()
        return existing_admin


def _create_project_with_data(db: Session, org: Organization, admin_user, project_data: dict):
    """Helper to create a single project with all its associated data."""
    existing = db.query(Project).filter(
        Project.project_name == project_data["project_name"],
        Project.organization_id == org.id,
    ).first()
    if existing:
        return

    project = Project(
        organization_id=org.id,
        project_name=project_data["project_name"],
        description=project_data["description"],
        status=project_data["status"],
        priority=project_data["priority"],
        manager_id=admin_user.id,
        start_date=project_data["start_date"],
        end_date=project_data["end_date"],
        total_budget=project_data["total_budget"],
        location=project_data["location"],
        client_name=project_data["client_name"],
        contract_type=project_data["contract_type"],
        created_by=admin_user.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    for t in project_data.get("tasks", []):
        db.add(Task(organization_id=org.id, project_id=project.id, assignee_id=admin_user.id, reporter_id=admin_user.id, **t))
    for e in project_data.get("expenses", []):
        db.add(Expense(organization_id=org.id, project_id=project.id, logged_by_id=admin_user.id, approved_by_id=admin_user.id, **e))
    for r in project_data.get("risks", []):
        db.add(Risk(organization_id=org.id, project_id=project.id, owner_id=admin_user.id, **r))
    for m in project_data.get("milestones", []):
        db.add(Milestone(organization_id=org.id, project_id=project.id, **m))
    for d in project_data.get("documents", []):
        db.add(Document(organization_id=org.id, project_id=project.id, uploaded_by_id=admin_user.id, storage_provider="local", **d))

    db.commit()
    logger.info(f"Created project with full data: {project_data['project_name']}")


def init_sample_data(db: Session, org: Organization):
    """Create 5 realistic synthetic construction projects with full data."""
    admin_user = db.query(User).filter(User.email == "admin@example.com").first()
    if not admin_user:
        logger.warning("Admin user not found, skipping sample data")
        return

    projects = [
        # ── Project 1: Headquarters Renovation (In Progress) ──
        {
            "project_name": "Headquarters Renovation",
            "description": (
                "Full-scale renovation of the 5-storey corporate headquarters including structural "
                "reinforcement, MEP upgrades, open-plan office conversion, new lobby atrium with "
                "glass curtain wall, and rooftop terrace landscaping. Phased delivery to maintain "
                "partial occupancy during works."
            ),
            "status": ProjectStatus.IN_PROGRESS,
            "priority": ProjectPriority.HIGH,
            "start_date": date(2025, 1, 15),
            "end_date": date(2026, 6, 30),
            "total_budget": 2500000000,
            "location": "14 Commerce Avenue, Central Business District",
            "client_name": "Greystone Properties Ltd",
            "contract_type": "Design Build Contract",
            "tasks": [
                dict(name="Foundation Excavation", description="Excavate and pour new pad footings for basement extension including dewatering and soil stabilization", status=TaskStatus.COMPLETED, priority=TaskPriority.HIGH, start_date=date(2025, 1, 20), due_date=date(2025, 2, 28), progress=100),
                dict(name="Steel Framework Installation", description="Erect structural steel columns and beams for floors 1-5 with bolted connections per engineer's detail", status=TaskStatus.COMPLETED, priority=TaskPriority.HIGH, start_date=date(2025, 3, 1), due_date=date(2025, 4, 15), progress=100),
                dict(name="Electrical Rough-In", description="Run main distribution board, sub-panels, conduit runs, and cable trays for all five floors", status=TaskStatus.IN_PROGRESS, priority=TaskPriority.HIGH, start_date=date(2025, 4, 16), due_date=date(2025, 6, 30), progress=68),
                dict(name="HVAC Ductwork Installation", description="Install galvanized sheet-metal ductwork, VAV boxes, and rooftop AHU connections for climate control", status=TaskStatus.IN_PROGRESS, priority=TaskPriority.MEDIUM, start_date=date(2025, 5, 1), due_date=date(2025, 7, 31), progress=42),
                dict(name="Interior Finishes — Floors 1-3", description="Gypsum partition walls, suspended ceilings, ceramic tiling in wet areas, and paint application", status=TaskStatus.PENDING, priority=TaskPriority.MEDIUM, start_date=date(2025, 8, 1), due_date=date(2025, 10, 15), progress=0),
                dict(name="Lobby Atrium Glass Curtain Wall", description="Fabricate and install 12m-high structural glazing system with spider fittings and silicone joints", status=TaskStatus.PENDING, priority=TaskPriority.HIGH, start_date=date(2025, 9, 1), due_date=date(2025, 12, 15), progress=0),
            ],
            "expenses": [
                dict(description="Structural steel beams and columns (Grade S355)", category="Materials", amount=185000000, vendor="Consolidated Steel Works", expense_date=date(2025, 1, 8), status=ExpenseStatus.APPROVED),
                dict(description="Ready-mix concrete C35/45 — 420 cubic metres", category="Materials", amount=63000000, vendor="Metro Concrete Supply", expense_date=date(2025, 1, 22), status=ExpenseStatus.APPROVED),
                dict(description="Tower crane rental — 6-month contract", category="Equipment", amount=72000000, vendor="Craneworks Equipment Hire", expense_date=date(2025, 2, 1), status=ExpenseStatus.APPROVED),
                dict(description="Electrical cables and distribution boards", category="Materials", amount=41000000, vendor="Voltex Electrical Distributors", expense_date=date(2025, 4, 18), status=ExpenseStatus.APPROVED),
                dict(description="Site security and hoarding — Q1-Q2", category="Labour", amount=18500000, vendor="SecureGuard Services", expense_date=date(2025, 3, 15), status=ExpenseStatus.APPROVED),
            ],
            "risks": [
                dict(title="Structural steel delivery delays", description="Lead times from mill currently 14 weeks; any disruption pushes steel erection past deadline", category="Supply Chain", probability=RiskProbability.HIGH, impact=RiskImpact.HIGH, status=RiskStatus.ACTIVE, mitigation_plan="Pre-order 10% buffer stock; qualify secondary supplier Ironridge Metals", identified_date=date(2025, 1, 15)),
                dict(title="Asbestos discovery in existing walls", description="Pre-demolition survey flagged suspect materials in partition cores on floors 2-3", category="Safety", probability=RiskProbability.MEDIUM, impact=RiskImpact.VERY_HIGH, status=RiskStatus.MONITORING, mitigation_plan="Licensed abatement contractor on standby; encapsulation protocol approved", identified_date=date(2025, 1, 20)),
                dict(title="Noise restrictions limiting work hours", description="Municipal by-law restricts piling and demolition to 08:00-17:00 weekdays only", category="Environmental", probability=RiskProbability.HIGH, impact=RiskImpact.MEDIUM, status=RiskStatus.ACTIVE, mitigation_plan="Reschedule noisy activities to first two months; use low-vibration methods thereafter", identified_date=date(2025, 2, 5)),
            ],
            "milestones": [
                dict(name="Foundation Complete", description="All pad footings poured, cured, and engineer-certified", target_date=date(2025, 3, 15), status=MilestoneStatus.COMPLETED, completion_percentage=100, actual_date=date(2025, 3, 14)),
                dict(name="Structure Topping Out", description="Steel frame and concrete deck for all floors completed", target_date=date(2025, 6, 30), status=MilestoneStatus.ON_TRACK, completion_percentage=55),
                dict(name="Building Watertight", description="Roof, facade glazing, and external waterproofing sealed", target_date=date(2025, 12, 15), status=MilestoneStatus.ON_TRACK, completion_percentage=0),
                dict(name="Practical Completion", description="All works complete, defects list issued, client handover", target_date=date(2026, 6, 30), status=MilestoneStatus.ON_TRACK, completion_percentage=0),
            ],
            "documents": [
                dict(name="Architectural Plans Rev C.pdf", description="Full set of architectural floor plans, elevations, and sections — Revision C approved by client", document_type="Drawing", file_size=15_800_000, mime_type="application/pdf", storage_key="docs/hq-reno/arch-plans-rev-c.pdf", version=3),
                dict(name="Structural Engineering Report.pdf", description="Structural assessment of existing frame and design for new steel reinforcement", document_type="Report", file_size=8_400_000, mime_type="application/pdf", storage_key="docs/hq-reno/structural-report.pdf", version=1),
                dict(name="Site Progress Photos — Week 18.zip", description="Drone and ground-level photographs documenting steel erection progress", document_type="Photos", file_size=48_200_000, mime_type="application/zip", storage_key="docs/hq-reno/photos-week-18.zip", version=1),
                dict(name="MEP Coordination Drawing.dwg", description="Combined mechanical, electrical, and plumbing coordination overlay for clash detection", document_type="Drawing", file_size=22_100_000, mime_type="application/octet-stream", storage_key="docs/hq-reno/mep-coordination.dwg", version=2),
                dict(name="Building Permit — City Council.pdf", description="Approved building permit with conditions of approval and inspection schedule", document_type="Permit", file_size=2_300_000, mime_type="application/pdf", storage_key="docs/hq-reno/building-permit.pdf", version=1),
                dict(name="Health and Safety Plan.pdf", description="Construction phase H&S plan including risk assessments and method statements", document_type="Report", file_size=4_600_000, mime_type="application/pdf", storage_key="docs/hq-reno/hs-plan.pdf", version=2),
                dict(name="Steel Fabrication Shop Drawings.pdf", description="Detailed shop drawings for structural steel connections — approved for fabrication", document_type="Drawing", file_size=31_500_000, mime_type="application/pdf", storage_key="docs/hq-reno/steel-shop-drawings.pdf", version=1),
            ],
        },

        # ── Project 2: Lakeside Mixed-Use Complex (Planning) ──
        {
            "project_name": "Lakeside Mixed-Use Complex",
            "description": (
                "Mixed-use development comprising a 3-storey retail podium, two floors of Grade-A "
                "offices, and 24 residential penthouse units. Includes a 150-bay basement car park "
                "with mechanical ventilation, a landscaped courtyard, and pedestrian bridge link "
                "to the existing waterfront promenade."
            ),
            "status": ProjectStatus.PLANNING,
            "priority": ProjectPriority.MEDIUM,
            "start_date": date(2025, 7, 1),
            "end_date": date(2027, 3, 31),
            "total_budget": 3200000000,
            "location": "Lakeside District, Plot 12A, Waterfront Drive",
            "client_name": "Horizon Development Group",
            "contract_type": "Design Build Contract",
            "tasks": [
                dict(name="Geotechnical Investigation", description="Conduct 12 borehole tests to 25m depth with piezometer installation and lab analysis", status=TaskStatus.COMPLETED, priority=TaskPriority.HIGH, start_date=date(2025, 7, 1), due_date=date(2025, 7, 31), progress=100),
                dict(name="Architectural Design Development", description="Finalise floor plans, elevation treatments, material palette, and BIM model to LOD 300", status=TaskStatus.IN_PROGRESS, priority=TaskPriority.HIGH, start_date=date(2025, 7, 15), due_date=date(2025, 9, 30), progress=72),
                dict(name="Environmental Impact Assessment", description="Submit noise, air quality, traffic, and stormwater assessments to municipal authorities", status=TaskStatus.IN_PROGRESS, priority=TaskPriority.MEDIUM, start_date=date(2025, 8, 1), due_date=date(2025, 10, 15), progress=35),
                dict(name="Basement Excavation and Shoring", description="Bulk earthworks for 2-level basement with sheet pile shoring and dewatering", status=TaskStatus.PENDING, priority=TaskPriority.HIGH, start_date=date(2025, 11, 1), due_date=date(2026, 1, 31), progress=0),
                dict(name="Reinforced Concrete Substructure", description="Pour pile caps, ground beams, basement slab, and retaining walls with waterproof membrane", status=TaskStatus.PENDING, priority=TaskPriority.HIGH, start_date=date(2026, 2, 1), due_date=date(2026, 5, 31), progress=0),
            ],
            "expenses": [
                dict(description="Geotechnical drilling and lab testing", category="Professional Fees", amount=8500000, vendor="GeoProbe Consultants", expense_date=date(2025, 7, 5), status=ExpenseStatus.APPROVED),
                dict(description="Architectural and structural design fees — Phase 1", category="Professional Fees", amount=42000000, vendor="Studio Forma Architects", expense_date=date(2025, 7, 20), status=ExpenseStatus.APPROVED),
                dict(description="Environmental impact assessment studies", category="Professional Fees", amount=6200000, vendor="EnviroTech Assessment Services", expense_date=date(2025, 8, 10), status=ExpenseStatus.APPROVED),
                dict(description="BIM modelling and clash detection services", category="Professional Fees", amount=14000000, vendor="Digital Build Solutions", expense_date=date(2025, 8, 25), status=ExpenseStatus.PENDING),
            ],
            "risks": [
                dict(title="High water table affecting basement construction", description="Borehole results show water table at 3.2m below grade; permanent dewatering may be required during construction", category="Environmental", probability=RiskProbability.HIGH, impact=RiskImpact.HIGH, status=RiskStatus.ACTIVE, mitigation_plan="Design tanked basement with Type-C cavity drain membrane; include contingency dewatering wells", identified_date=date(2025, 7, 28)),
                dict(title="Planning permission delays", description="Municipal planning committee backlog currently 8-10 weeks beyond statutory period", category="Financial", probability=RiskProbability.MEDIUM, impact=RiskImpact.HIGH, status=RiskStatus.MONITORING, mitigation_plan="Engage planning consultant early; submit pre-application for key deviations", identified_date=date(2025, 8, 5)),
                dict(title="Facade material price escalation", description="Aluminium composite panel costs rose 18% in last quarter due to global supply constraints", category="Supply Chain", probability=RiskProbability.HIGH, impact=RiskImpact.MEDIUM, status=RiskStatus.ACTIVE, mitigation_plan="Lock pricing with two suppliers by end of design phase; consider terracotta alternative", identified_date=date(2025, 8, 12)),
            ],
            "milestones": [
                dict(name="Design Freeze", description="All architectural and structural drawings approved by client and authorities", target_date=date(2025, 10, 31), status=MilestoneStatus.ON_TRACK, completion_percentage=40),
                dict(name="Planning Approval Granted", description="Full planning permission with all conditions discharged", target_date=date(2025, 12, 15), status=MilestoneStatus.ON_TRACK, completion_percentage=10),
                dict(name="Basement Structure Complete", description="All below-grade concrete works finished and waterproofed", target_date=date(2026, 5, 31), status=MilestoneStatus.ON_TRACK, completion_percentage=0),
            ],
            "documents": [
                dict(name="Geotechnical Investigation Report.pdf", description="Borehole logs, lab results, and foundation design recommendations for Plot 12A", document_type="Report", file_size=6_800_000, mime_type="application/pdf", storage_key="docs/lakeside/geotech-report.pdf", version=1),
                dict(name="Concept Design Presentation.pdf", description="Client-facing design presentation with 3D renders, material palette, and phasing diagrams", document_type="Report", file_size=28_400_000, mime_type="application/pdf", storage_key="docs/lakeside/concept-design.pdf", version=2),
                dict(name="BIM Model — LOD 300.ifc", description="Federated BIM model including architectural, structural, and MEP disciplines", document_type="Drawing", file_size=95_000_000, mime_type="application/octet-stream", storage_key="docs/lakeside/bim-lod300.ifc", version=1),
                dict(name="Environmental Impact Assessment.pdf", description="Noise, air quality, stormwater, and traffic impact studies for municipal submission", document_type="Report", file_size=5_200_000, mime_type="application/pdf", storage_key="docs/lakeside/eia-report.pdf", version=1),
                dict(name="Planning Application Drawings.pdf", description="Full drawing set submitted to municipal planning authority for approval", document_type="Drawing", file_size=18_700_000, mime_type="application/pdf", storage_key="docs/lakeside/planning-drawings.pdf", version=1),
            ],
        },

        # ── Project 3: Northern Logistics Hub Phase 1 (In Progress) ──
        {
            "project_name": "Northern Logistics Hub Phase 1",
            "description": (
                "Construction of a 12,000 sqm warehousing and distribution facility with 8 loading "
                "docks, a 2,500 sqm cold-storage wing, office block, external hardstanding for HGV "
                "manoeuvring, and perimeter security fencing. Phase 1 covers the main warehouse shell "
                "and two loading bays; Phase 2 (future) adds the cold-storage wing."
            ),
            "status": ProjectStatus.IN_PROGRESS,
            "priority": ProjectPriority.HIGH,
            "start_date": date(2025, 4, 15),
            "end_date": date(2026, 8, 20),
            "total_budget": 5400000000,
            "location": "Plot C7, Northern Industrial Corridor, Freight Road",
            "client_name": "TransNova Logistics International",
            "contract_type": "Lumpsum Contract",
            "tasks": [
                dict(name="Site Clearance and Earthworks", description="Strip topsoil, grade platform to ±50mm tolerance, install temporary drainage and site roads", status=TaskStatus.COMPLETED, priority=TaskPriority.HIGH, start_date=date(2025, 4, 15), due_date=date(2025, 5, 31), progress=100),
                dict(name="Piled Foundations", description="Install 186 No. CFA piles to 18m depth with pile caps and ground beams", status=TaskStatus.COMPLETED, priority=TaskPriority.HIGH, start_date=date(2025, 6, 1), due_date=date(2025, 7, 31), progress=100),
                dict(name="Portal Frame Erection", description="Erect 24 steel portal frames at 6m centres with purlins, girts, and cross-bracing", status=TaskStatus.IN_PROGRESS, priority=TaskPriority.HIGH, start_date=date(2025, 8, 1), due_date=date(2025, 10, 15), progress=58),
                dict(name="Roof Cladding and Rainwater System", description="Install composite insulated roof panels, ridge ventilation, box gutters, and downpipes to attenuation tank", status=TaskStatus.PENDING, priority=TaskPriority.MEDIUM, start_date=date(2025, 10, 16), due_date=date(2025, 12, 31), progress=0),
                dict(name="Floor Slab — Power Float Finish", description="Pour 250mm reinforced concrete slab with fibre reinforcement and FM2 flatness specification", status=TaskStatus.PENDING, priority=TaskPriority.HIGH, start_date=date(2026, 1, 5), due_date=date(2026, 2, 28), progress=0),
                dict(name="Loading Dock Installation", description="Install 8 hydraulic dock levellers, dock shelters, bumpers, and LED traffic signals", status=TaskStatus.PENDING, priority=TaskPriority.MEDIUM, start_date=date(2026, 3, 1), due_date=date(2026, 4, 30), progress=0),
            ],
            "expenses": [
                dict(description="CFA piling — 186 piles to 18m", category="Subcontractor", amount=324000000, vendor="DeepDrive Piling Ltd", expense_date=date(2025, 6, 5), status=ExpenseStatus.APPROVED),
                dict(description="Structural steelwork — portal frames and purlins", category="Materials", amount=478000000, vendor="Atlas Steel Fabricators", expense_date=date(2025, 7, 20), status=ExpenseStatus.APPROVED),
                dict(description="Composite roof cladding panels — 12,400 sqm", category="Materials", amount=186000000, vendor="Kingspan Insulated Panels", expense_date=date(2025, 9, 8), status=ExpenseStatus.PENDING),
                dict(description="Temporary site compound and welfare facilities", category="Preliminaries", amount=24000000, vendor="Portakabin Hire Solutions", expense_date=date(2025, 4, 20), status=ExpenseStatus.APPROVED),
                dict(description="Earthworks and platform grading", category="Subcontractor", amount=95000000, vendor="Terraform Earthmovers", expense_date=date(2025, 4, 28), status=ExpenseStatus.APPROVED),
            ],
            "risks": [
                dict(title="Soft ground conditions at pile locations", description="Trial piles showed N-values below 5 in southeast corner; may need extended pile lengths", category="Environmental", probability=RiskProbability.MEDIUM, impact=RiskImpact.HIGH, status=RiskStatus.MITIGATED, mitigation_plan="Extended 14 piles by 3m additional depth; verified by dynamic load testing", identified_date=date(2025, 6, 12)),
                dict(title="Steel price volatility", description="Global hot-rolled steel index fluctuating ±8% month-on-month; contract has fixed-price clause", category="Financial", probability=RiskProbability.MEDIUM, impact=RiskImpact.MEDIUM, status=RiskStatus.MONITORING, mitigation_plan="Fixed-price contract clause covers fabricated steel; monitor raw material indices monthly", identified_date=date(2025, 5, 20)),
                dict(title="Adjacent warehouse operations disruption", description="Active tenant in adjacent unit requires 24/7 HGV access; construction traffic may conflict", category="Safety", probability=RiskProbability.HIGH, impact=RiskImpact.MEDIUM, status=RiskStatus.ACTIVE, mitigation_plan="Dedicated haul route with banksman; coordinate delivery windows with tenant logistics manager", identified_date=date(2025, 4, 22)),
            ],
            "milestones": [
                dict(name="Piling Complete", description="All 186 CFA piles installed, tested, and certified by structural engineer", target_date=date(2025, 7, 31), status=MilestoneStatus.COMPLETED, completion_percentage=100, actual_date=date(2025, 7, 28)),
                dict(name="Steel Frame Erected", description="All portal frames, bracing, and purlins complete and torqued", target_date=date(2025, 10, 15), status=MilestoneStatus.ON_TRACK, completion_percentage=58),
                dict(name="Building Weathertight", description="Roof and wall cladding complete; building sealed from weather", target_date=date(2025, 12, 31), status=MilestoneStatus.ON_TRACK, completion_percentage=0),
                dict(name="Practical Completion", description="All Phase 1 works finished and handed over to client", target_date=date(2026, 8, 20), status=MilestoneStatus.ON_TRACK, completion_percentage=0),
            ],
            "documents": [
                dict(name="Portal Frame GA Drawing.pdf", description="General arrangement drawing showing all 24 portal frame positions and bracing layout", document_type="Drawing", file_size=12_500_000, mime_type="application/pdf", storage_key="docs/logistics/portal-frame-ga.pdf", version=2),
                dict(name="Piling Completion Certificate.pdf", description="Engineer's completion certificate for 186 CFA piles with load test results", document_type="Report", file_size=3_200_000, mime_type="application/pdf", storage_key="docs/logistics/piling-cert.pdf", version=1),
                dict(name="Floor Slab Specification.pdf", description="FM2 flatness specification, fibre dosage rates, and joint layout for warehouse slab", document_type="Report", file_size=1_800_000, mime_type="application/pdf", storage_key="docs/logistics/slab-spec.pdf", version=1),
                dict(name="Site Layout and Traffic Management.dwg", description="CAD drawing showing site compound, haul routes, laydown areas, and HGV turning circles", document_type="Drawing", file_size=8_600_000, mime_type="application/octet-stream", storage_key="docs/logistics/site-layout.dwg", version=3),
                dict(name="Lumpsum Contract — Executed Copy.pdf", description="Fully executed lumpsum contract between TransNova and main contractor", document_type="Contract", file_size=4_100_000, mime_type="application/pdf", storage_key="docs/logistics/contract-executed.pdf", version=1),
                dict(name="Roof Cladding Shop Drawings.pdf", description="Kingspan panel layout, fixing details, and flashing schedules for 12,400 sqm roof", document_type="Drawing", file_size=14_300_000, mime_type="application/pdf", storage_key="docs/logistics/roof-shop-drawings.pdf", version=1),
            ],
        },

        # ── Project 4: Metropolitan Health Center Upgrade (On Hold) ──
        {
            "project_name": "Metropolitan Health Center Upgrade",
            "description": (
                "Comprehensive retrofit of a 180-bed regional hospital including full MEP plant "
                "replacement, medical gas pipeline rerouting, infection-control partition upgrades, "
                "emergency generator synchronization, and a new MRI suite extension. All works "
                "sequenced around clinical operations with night-shift cutovers for critical systems."
            ),
            "status": ProjectStatus.ON_HOLD,
            "priority": ProjectPriority.CRITICAL,
            "start_date": date(2025, 9, 10),
            "end_date": date(2027, 1, 25),
            "total_budget": 4700000000,
            "location": "Metropolitan Zone 3, St. Helena Hospital Annex",
            "client_name": "City Health Authority",
            "contract_type": "Cost Plus Contract",
            "tasks": [
                dict(name="Condition Survey and Hazmat Audit", description="Full building condition report with asbestos register update and lead paint assessment", status=TaskStatus.COMPLETED, priority=TaskPriority.CRITICAL, start_date=date(2025, 9, 10), due_date=date(2025, 10, 15), progress=100),
                dict(name="Temporary Clinical Decant Planning", description="Develop ward-by-ward decant schedule to maintain 80% bed capacity during works", status=TaskStatus.COMPLETED, priority=TaskPriority.HIGH, start_date=date(2025, 10, 1), due_date=date(2025, 11, 15), progress=100),
                dict(name="Emergency Generator Replacement", description="Remove 2 existing 500kVA gensets; install 3 new 800kVA synchronised units with ATS panels", status=TaskStatus.IN_PROGRESS, priority=TaskPriority.CRITICAL, start_date=date(2025, 11, 20), due_date=date(2026, 2, 28), progress=30),
                dict(name="Medical Gas Pipeline Rerouting", description="Reroute oxygen, nitrous oxide, and vacuum lines to new manifold room with NFPA 99 compliance", status=TaskStatus.BLOCKED, priority=TaskPriority.CRITICAL, start_date=date(2026, 1, 5), due_date=date(2026, 4, 30), progress=0),
                dict(name="MRI Suite Extension", description="Construct new RF-shielded room with 5-gauss line containment, helium quench pipe, and dedicated chiller", status=TaskStatus.PENDING, priority=TaskPriority.HIGH, start_date=date(2026, 5, 1), due_date=date(2026, 9, 30), progress=0),
            ],
            "expenses": [
                dict(description="Condition survey and hazardous materials audit", category="Professional Fees", amount=12500000, vendor="SafeBuilt Consulting Engineers", expense_date=date(2025, 9, 15), status=ExpenseStatus.APPROVED),
                dict(description="Emergency generators — 3 × 800kVA Caterpillar units", category="Equipment", amount=285000000, vendor="Caterpillar Power Systems", expense_date=date(2025, 11, 5), status=ExpenseStatus.APPROVED),
                dict(description="Temporary ward partitions and infection-control barriers", category="Materials", amount=18000000, vendor="CleanSpace Medical Interiors", expense_date=date(2025, 10, 20), status=ExpenseStatus.APPROVED),
                dict(description="MRI suite RF shielding copper panels", category="Materials", amount=67000000, vendor="ETS-Lindgren Shielding", expense_date=date(2026, 4, 15), status=ExpenseStatus.PENDING),
            ],
            "risks": [
                dict(title="Clinical operations disruption", description="Any unplanned utility shutdown in occupied wards could endanger patients and trigger regulatory action", category="Safety", probability=RiskProbability.MEDIUM, impact=RiskImpact.VERY_HIGH, status=RiskStatus.ACTIVE, mitigation_plan="All shutdowns require 72-hour written notice to clinical director; emergency bypass for critical wards", identified_date=date(2025, 9, 20)),
                dict(title="Asbestos in ceiling voids", description="Survey identified chrysotile asbestos in ceiling tiles on 3 floors; licensed removal required before MEP work", category="Safety", probability=RiskProbability.VERY_HIGH, impact=RiskImpact.HIGH, status=RiskStatus.ACTIVE, mitigation_plan="Phased enclosure removal by licensed contractor; air monitoring during and after each zone", identified_date=date(2025, 10, 8)),
                dict(title="Generator lead time exceeding programme", description="Caterpillar advised 18-week lead time for synchronised genset package; currently on hold pending approval", category="Supply Chain", probability=RiskProbability.HIGH, impact=RiskImpact.HIGH, status=RiskStatus.MONITORING, mitigation_plan="Deposit paid to secure manufacturing slot; explore Cummins as backup supplier", identified_date=date(2025, 11, 1)),
            ],
            "milestones": [
                dict(name="Hazmat Survey Approved", description="Full asbestos and hazmat register signed off by safety authority", target_date=date(2025, 10, 31), status=MilestoneStatus.COMPLETED, completion_percentage=100, actual_date=date(2025, 10, 28)),
                dict(name="Generator Commissioning", description="All 3 new generators tested under load with automatic transfer switch", target_date=date(2026, 2, 28), status=MilestoneStatus.AT_RISK, completion_percentage=30),
                dict(name="MRI Suite Operational", description="New MRI room shielded, fitted out, and equipment installed with first scan completed", target_date=date(2026, 9, 30), status=MilestoneStatus.ON_TRACK, completion_percentage=0),
            ],
            "documents": [
                dict(name="Condition Survey Report.pdf", description="Full building condition assessment including structural, MEP, and facade condition ratings", document_type="Report", file_size=11_200_000, mime_type="application/pdf", storage_key="docs/health/condition-survey.pdf", version=1),
                dict(name="Asbestos Register and Management Plan.pdf", description="Licensed surveyor's asbestos register with location maps and removal priority matrix", document_type="Report", file_size=7_500_000, mime_type="application/pdf", storage_key="docs/health/asbestos-register.pdf", version=2),
                dict(name="Clinical Decant Schedule.xlsx", description="Ward-by-ward decant programme with bed capacity tracking and service continuity plan", document_type="Report", file_size=1_400_000, mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", storage_key="docs/health/decant-schedule.xlsx", version=3),
                dict(name="MRI Suite RF Shielding Design.pdf", description="RF shielding layout with copper panel specifications and 5-gauss line containment zones", document_type="Drawing", file_size=9_800_000, mime_type="application/pdf", storage_key="docs/health/mri-shielding.pdf", version=1),
                dict(name="Generator Room Layout.dwg", description="Mechanical room layout for 3 × 800kVA generators with ventilation and fuel tank positions", document_type="Drawing", file_size=6_300_000, mime_type="application/octet-stream", storage_key="docs/health/generator-room.dwg", version=2),
                dict(name="Cost Plus Contract Agreement.pdf", description="Executed cost-plus contract with City Health Authority including fee schedule and audit clauses", document_type="Contract", file_size=3_900_000, mime_type="application/pdf", storage_key="docs/health/contract-cost-plus.pdf", version=1),
                dict(name="Infection Control Method Statement.pdf", description="Detailed method statement for construction works in occupied clinical areas", document_type="Report", file_size=2_800_000, mime_type="application/pdf", storage_key="docs/health/infection-control-ms.pdf", version=1),
            ],
        },

        # ── Project 5: Greenfield Residential Estate — Phase A (Completed) ──
        {
            "project_name": "Greenfield Residential Estate Phase A",
            "description": (
                "Development of 48 residential units across 6 blocks — comprising 32 two-bedroom "
                "apartments and 16 three-bedroom townhouses — with communal landscaping, children's "
                "play area, visitor parking, and underground utility infrastructure. Completed on "
                "schedule with final defects liability period in progress."
            ),
            "status": ProjectStatus.COMPLETED,
            "priority": ProjectPriority.MEDIUM,
            "start_date": date(2024, 3, 1),
            "end_date": date(2025, 8, 31),
            "total_budget": 1850000000,
            "location": "Greenfield Park, Plots A1-A6, Willowbrook Lane",
            "client_name": "Oakridge Homes Developments",
            "contract_type": "Lumpsum Contract",
            "tasks": [
                dict(name="Bulk Earthworks and Services Trenching", description="Cut-to-fill platform grading, stormwater trenching, sewer connections, and electrical duct banks", status=TaskStatus.COMPLETED, priority=TaskPriority.HIGH, start_date=date(2024, 3, 1), due_date=date(2024, 4, 30), progress=100),
                dict(name="Foundations — All 6 Blocks", description="Strip footings, reinforcement, and concrete pour for blocks A1 through A6", status=TaskStatus.COMPLETED, priority=TaskPriority.HIGH, start_date=date(2024, 5, 1), due_date=date(2024, 7, 15), progress=100),
                dict(name="Masonry Superstructure", description="Load-bearing clay brick walls, concrete lintels, and precast floor slabs for all units", status=TaskStatus.COMPLETED, priority=TaskPriority.HIGH, start_date=date(2024, 7, 16), due_date=date(2024, 11, 30), progress=100),
                dict(name="Roofing and Waterproofing", description="Concrete roof tiles, torch-on waterproofing to flat sections, fascia boards, and guttering", status=TaskStatus.COMPLETED, priority=TaskPriority.MEDIUM, start_date=date(2024, 12, 1), due_date=date(2025, 2, 28), progress=100),
                dict(name="Internal Finishes and Handover", description="Plastering, tiling, kitchen fitout, sanitary ware, painting, and snag list resolution", status=TaskStatus.COMPLETED, priority=TaskPriority.MEDIUM, start_date=date(2025, 3, 1), due_date=date(2025, 7, 31), progress=100),
                dict(name="External Landscaping and Paving", description="Interlocking paving to driveways, topsoil spreading, turf laying, tree planting, and play area surfacing", status=TaskStatus.COMPLETED, priority=TaskPriority.LOW, start_date=date(2025, 6, 1), due_date=date(2025, 8, 15), progress=100),
            ],
            "expenses": [
                dict(description="Clay face bricks — 680,000 units", category="Materials", amount=122000000, vendor="Corobrik National", expense_date=date(2024, 6, 10), status=ExpenseStatus.APPROVED),
                dict(description="Precast concrete floor slabs — 48 units", category="Materials", amount=96000000, vendor="Berto Precast", expense_date=date(2024, 7, 5), status=ExpenseStatus.APPROVED),
                dict(description="Plumbing and sanitary ware — all units", category="Subcontractor", amount=78000000, vendor="Plumbworx Installations", expense_date=date(2025, 3, 18), status=ExpenseStatus.APPROVED),
                dict(description="Kitchen cabinetry and countertops — 48 units", category="Subcontractor", amount=52000000, vendor="TrueForm Kitchens", expense_date=date(2025, 4, 12), status=ExpenseStatus.APPROVED),
                dict(description="Landscaping, paving, and play area", category="Subcontractor", amount=34000000, vendor="GreenScape Landscapes", expense_date=date(2025, 6, 20), status=ExpenseStatus.APPROVED),
            ],
            "risks": [
                dict(title="Brick supply shortage", description="National kiln shutdown caused 6-week shortage of face bricks; delayed masonry on blocks A4-A6", category="Supply Chain", probability=RiskProbability.HIGH, impact=RiskImpact.MEDIUM, status=RiskStatus.CLOSED, mitigation_plan="Sourced matching stock from alternative kiln; slight colour variance accepted by client", identified_date=date(2024, 8, 15)),
                dict(title="Wet season delays to roofing", description="Unusually heavy December rains prevented waterproofing application for 3 weeks", category="Environmental", probability=RiskProbability.MEDIUM, impact=RiskImpact.MEDIUM, status=RiskStatus.CLOSED, mitigation_plan="Mobilised additional roofing crew to recover lost time; completed 4 days behind original date", identified_date=date(2024, 12, 10)),
            ],
            "milestones": [
                dict(name="All Foundations Complete", description="Strip footings for all 6 blocks poured, cured, and certified", target_date=date(2024, 7, 15), status=MilestoneStatus.COMPLETED, completion_percentage=100, actual_date=date(2024, 7, 14)),
                dict(name="Roof Watertight — All Blocks", description="Roof tiles and waterproofing complete on all 6 blocks", target_date=date(2025, 2, 28), status=MilestoneStatus.COMPLETED, completion_percentage=100, actual_date=date(2025, 3, 4)),
                dict(name="Practical Completion", description="All 48 units handed over to client with occupation certificates", target_date=date(2025, 8, 31), status=MilestoneStatus.COMPLETED, completion_percentage=100, actual_date=date(2025, 8, 29)),
            ],
            "documents": [
                dict(name="Architectural As-Built Drawings.pdf", description="Final as-built architectural drawings for all 6 blocks with actual dimensions recorded", document_type="Drawing", file_size=24_600_000, mime_type="application/pdf", storage_key="docs/greenfield/as-built-arch.pdf", version=1),
                dict(name="Occupation Certificates — All Units.pdf", description="Consolidated occupation certificates issued by municipal building control for 48 units", document_type="Permit", file_size=5_100_000, mime_type="application/pdf", storage_key="docs/greenfield/occupation-certs.pdf", version=1),
                dict(name="Practical Completion Certificate.pdf", description="Engineer's practical completion certificate with defects list and liability period terms", document_type="Report", file_size=1_900_000, mime_type="application/pdf", storage_key="docs/greenfield/pc-certificate.pdf", version=1),
                dict(name="Landscaping Design and Planting Schedule.pdf", description="Landscape architect's planting plan with species list, irrigation layout, and maintenance guide", document_type="Drawing", file_size=7_200_000, mime_type="application/pdf", storage_key="docs/greenfield/landscaping-plan.pdf", version=2),
                dict(name="Final Site Photos — Handover.zip", description="Professional photography of all 48 completed units, communal areas, and external landscaping", document_type="Photos", file_size=112_000_000, mime_type="application/zip", storage_key="docs/greenfield/handover-photos.zip", version=1),
                dict(name="Lumpsum Contract — Final Account.pdf", description="Final account reconciliation with measured quantities, variations, and retention release schedule", document_type="Contract", file_size=3_400_000, mime_type="application/pdf", storage_key="docs/greenfield/final-account.pdf", version=1),
            ],
        },
    ]

    for project_data in projects:
        _create_project_with_data(db, org, admin_user, project_data)


def init_db():
    """Initialize database with seed data"""
    db = SessionLocal()
    try:
        logger.info("Starting database initialization...")
        init_roles(db)
        org = init_organization(db)
        admin = init_admin_user(db, org)
        init_sample_data(db, org)
        logger.info("Database initialization complete!")
        logger.info(f"Default Organization: {org.name} (ID: {org.id})")
        logger.info("Login credentials: admin@example.com / Admin@123456")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_db()

