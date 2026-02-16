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


def init_sample_data(db: Session, org: Organization):
    """Create sample projects, tasks, and users"""
    # Create PM user
    pm_role = db.query(RoleModel).filter(RoleModel.role_name == Role.PROJECT_MANAGER).first()
    
    pm_user = db.query(User).filter(User.email == "pm@example.com").first()
    if not pm_user:
        pm_user = User(
            email="pm@example.com",
            password_hash=hash_password("Password@123"),
            first_name="Project",
            last_name="Manager",
            phone_number="+10000000001",
            role_id=pm_role.id,
            is_active=True
        )
        db.add(pm_user)
        db.commit()
        db.refresh(pm_user)
        
        # Add to organization
        org_member = OrganizationMember(
            organization_id=org.id,
            user_id=pm_user.id,
            org_role=OrgRole.MEMBER,
            status=MembershipStatus.ACTIVE
        )
        db.add(org_member)
        db.commit()
        
        logger.info("Created PM user: pm@example.com / Password@123")
    else:
        existing_membership = db.query(OrganizationMember).filter(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.user_id == pm_user.id
        ).first()
        if not existing_membership:
            org_member = OrganizationMember(
                organization_id=org.id,
                user_id=pm_user.id,
                org_role=OrgRole.MEMBER,
                status=MembershipStatus.ACTIVE
            )
            db.add(org_member)
            db.commit()
    
    # Create sample project
    existing_project = db.query(Project).filter(
        Project.project_name == "Headquarters Renovation",
        Project.organization_id == org.id
    ).first()
    
    if not existing_project:
        project = Project(
            organization_id=org.id,
            project_name="Headquarters Renovation",
            description="Internal office renovation with phased delivery and budget controls",
            status=ProjectStatus.IN_PROGRESS,
            priority=ProjectPriority.HIGH,
            manager_id=pm_user.id,
            start_date=date(2025, 1, 15),
            end_date=date(2026, 6, 30),
            total_budget=2500000000,
            location="Main Office Campus",
            client_name="Internal Operations",
            contract_type="Design Build Contract",
            created_by=pm_user.id
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        logger.info("Created sample project: Headquarters Renovation")
        
        # Add sample tasks
        task1 = Task(
            organization_id=org.id,
            project_id=project.id,
            name="Foundation Excavation",
            description="Complete foundation excavation for basement levels",
            status=TaskStatus.COMPLETED,
            priority=TaskPriority.HIGH,
            assignee_id=pm_user.id,
            reporter_id=pm_user.id,
            start_date=date(2025, 1, 20),
            due_date=date(2025, 2, 28),
            progress=100
        )
        
        task2 = Task(
            organization_id=org.id,
            project_id=project.id,
            name="Steel Framework Installation",
            description="Install steel framework for floors 1-5",
            status=TaskStatus.IN_PROGRESS,
            priority=TaskPriority.HIGH,
            assignee_id=pm_user.id,
            reporter_id=pm_user.id,
            start_date=date(2025, 3, 1),
            due_date=date(2025, 4, 15),
            progress=68
        )
        
        db.add_all([task1, task2])
        
        # Add sample expenses
        expense1 = Expense(
            organization_id=org.id,
            project_id=project.id,
            description="Steel reinforcement bars",
            category="Materials",
            amount=45000000,
            vendor="Prime Materials Ltd",
            expense_date=date(2025, 1, 8),
            status=ExpenseStatus.APPROVED,
            logged_by_id=pm_user.id,
            approved_by_id=pm_user.id
        )
        
        expense2 = Expense(
            organization_id=org.id,
            project_id=project.id,
            description="Concrete mix delivery",
            category="Materials",
            amount=28000000,
            vendor="City Concrete Supply",
            expense_date=date(2025, 1, 10),
            status=ExpenseStatus.APPROVED,
            logged_by_id=pm_user.id,
            approved_by_id=pm_user.id
        )
        
        db.add_all([expense1, expense2])
        
        # Add sample risks
        risk1 = Risk(
            organization_id=org.id,
            project_id=project.id,
            title="Potential delivery delays for structural steel",
            description="Delayed steel delivery from supplier",
            category="Supply Chain",
            probability=RiskProbability.HIGH,
            impact=RiskImpact.HIGH,
            status=RiskStatus.ACTIVE,
            mitigation_plan="Source alternative suppliers, maintain buffer stock",
            owner_id=pm_user.id,
            identified_date=date(2025, 1, 15)
        )
        
        db.add(risk1)
        
        # Add sample milestones
        milestone1 = Milestone(
            organization_id=org.id,
            project_id=project.id,
            name="Foundation Complete",
            description="All foundation work completed and inspected",
            target_date=date(2025, 3, 15),
            status=MilestoneStatus.COMPLETED,
            completion_percentage=100,
            actual_date=date(2025, 3, 14)
        )
        
        milestone2 = Milestone(
            organization_id=org.id,
            project_id=project.id,
            name="Structure Complete",
            description="Main building structure completed",
            target_date=date(2025, 6, 30),
            status=MilestoneStatus.ON_TRACK,
            completion_percentage=45
        )
        
        db.add_all([milestone1, milestone2])
        
        db.commit()
        logger.info("Created sample tasks, expenses, risks, and milestones")


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

