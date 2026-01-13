import logging
from sqlalchemy.orm import Session
from datetime import date

from app.db.session import SessionLocal
from app.models.user import User, RoleModel
from app.models.project import Project, ProjectMember, ProjectStatus, ProjectPriority
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


def init_admin_user(db: Session):
    """Create default admin user"""
    admin_role = db.query(RoleModel).filter(RoleModel.role_name == Role.ADMINISTRATOR).first()
    
    existing_admin = db.query(User).filter(User.email == "admin@buildpro.ug").first()
    if not existing_admin:
        admin_user = User(
            email="admin@buildpro.ug",
            password_hash=hash_password("Admin@123456"),
            first_name="System",
            last_name="Administrator",
            phone_number="+256700000000",
            role_id=admin_role.id,
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        logger.info("Created admin user: admin@buildpro.ug / Admin@123456")


def init_sample_data(db: Session):
    """Create sample projects and users"""
    # Create PM user
    pm_role = db.query(RoleModel).filter(RoleModel.role_name == Role.PROJECT_MANAGER).first()
    
    pm_user = db.query(User).filter(User.email == "john.okello@buildpro.ug").first()
    if not pm_user:
        pm_user = User(
            email="john.okello@buildpro.ug",
            password_hash=hash_password("Password@123"),
            first_name="John",
            last_name="Okello",
            phone_number="+256701234567",
            role_id=pm_role.id,
            is_active=True
        )
        db.add(pm_user)
        db.commit()
        logger.info("Created PM user: john.okello@buildpro.ug / Password@123")
    
    # Create sample project
    existing_project = db.query(Project).filter(Project.project_name == "Kampala Office Complex").first()
    if not existing_project:
        project = Project(
            project_name="Kampala Office Complex",
            description="Modern 10-story office building in Kampala CBD",
            status=ProjectStatus.IN_PROGRESS,
            priority=ProjectPriority.HIGH,
            manager_id=pm_user.id,
            start_date=date(2025, 1, 15),
            end_date=date(2026, 6, 30),
            total_budget=2500000000,
            location="Kampala, Uganda",
            created_by=pm_user.id
        )
        db.add(project)
        db.commit()
        logger.info("Created sample project: Kampala Office Complex")


def init_db():
    """Initialize database with seed data"""
    db = SessionLocal()
    try:
        logger.info("Starting database initialization...")
        init_roles(db)
        init_admin_user(db)
        init_sample_data(db)
        logger.info("Database initialization complete!")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
