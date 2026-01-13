from enum import Enum
from typing import Set, Dict, List


class Role(str, Enum):
    """User roles in the system"""
    ADMINISTRATOR = "Administrator"
    PROJECT_MANAGER = "Project_Manager"
    SITE_SUPERVISOR = "Site_Supervisor"
    TEAM_MEMBER = "Team_Member"
    STAKEHOLDER = "Stakeholder"


class Permission(str, Enum):
    """System permissions"""
    # Projects
    PROJECTS_CREATE = "projects:create"
    PROJECTS_EDIT = "projects:edit"
    PROJECTS_DELETE = "projects:delete"
    PROJECTS_VIEW_ALL = "projects:view:all"
    PROJECTS_VIEW_ASSIGNED = "projects:view:assigned"
    
    # Tasks
    TASKS_CREATE = "tasks:create"
    TASKS_EDIT_ANY = "tasks:edit:any"
    TASKS_EDIT_OWN = "tasks:edit:own"
    TASKS_DELETE = "tasks:delete"
    
    # Budget
    BUDGET_VIEW_DETAILS = "budget:view:details"
    BUDGET_VIEW_SUMMARY = "budget:view:summary"
    BUDGET_EDIT = "budget:edit"
    EXPENSES_LOG = "expenses:log"
    EXPENSES_APPROVE = "expenses:approve"
    
    # Risks
    RISKS_VIEW = "risks:view"
    RISKS_MANAGE = "risks:manage"
    RISKS_REPORT = "risks:report"
    
    # Documents
    DOCUMENTS_UPLOAD = "documents:upload"
    DOCUMENTS_DELETE = "documents:delete"
    
    # Users
    USERS_MANAGE = "users:manage"
    
    # Reports
    REPORTS_VIEW_ALL = "reports:view:all"
    REPORTS_VIEW_LIMITED = "reports:view:limited"
    
    # Communication
    MESSAGES_SEND = "messages:send"


# Default role permissions
ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.ADMINISTRATOR: {
        # Full access
        Permission.PROJECTS_CREATE,
        Permission.PROJECTS_EDIT,
        Permission.PROJECTS_DELETE,
        Permission.PROJECTS_VIEW_ALL,
        Permission.TASKS_CREATE,
        Permission.TASKS_EDIT_ANY,
        Permission.TASKS_DELETE,
        Permission.BUDGET_VIEW_DETAILS,
        Permission.BUDGET_EDIT,
        Permission.EXPENSES_LOG,
        Permission.EXPENSES_APPROVE,
        Permission.RISKS_VIEW,
        Permission.RISKS_MANAGE,
        Permission.DOCUMENTS_UPLOAD,
        Permission.DOCUMENTS_DELETE,
        Permission.USERS_MANAGE,
        Permission.REPORTS_VIEW_ALL,
        Permission.MESSAGES_SEND,
    },
    
    Role.PROJECT_MANAGER: {
        Permission.PROJECTS_CREATE,
        Permission.PROJECTS_EDIT,
        Permission.PROJECTS_VIEW_ASSIGNED,
        Permission.TASKS_CREATE,
        Permission.TASKS_EDIT_ANY,
        Permission.TASKS_DELETE,
        Permission.BUDGET_VIEW_DETAILS,
        Permission.BUDGET_EDIT,
        Permission.EXPENSES_LOG,
        Permission.EXPENSES_APPROVE,
        Permission.RISKS_VIEW,
        Permission.RISKS_MANAGE,
        Permission.DOCUMENTS_UPLOAD,
        Permission.REPORTS_VIEW_ALL,
        Permission.MESSAGES_SEND,
    },
    
    Role.SITE_SUPERVISOR: {
        Permission.PROJECTS_VIEW_ASSIGNED,
        Permission.TASKS_CREATE,
        Permission.TASKS_EDIT_OWN,
        Permission.EXPENSES_LOG,
        Permission.RISKS_VIEW,
        Permission.RISKS_REPORT,
        Permission.DOCUMENTS_UPLOAD,
        Permission.REPORTS_VIEW_LIMITED,
        Permission.MESSAGES_SEND,
    },
    
    Role.TEAM_MEMBER: {
        Permission.PROJECTS_VIEW_ASSIGNED,
        Permission.TASKS_EDIT_OWN,
        Permission.DOCUMENTS_UPLOAD,
        Permission.REPORTS_VIEW_LIMITED,
        Permission.MESSAGES_SEND,
    },
    
    Role.STAKEHOLDER: {
        Permission.PROJECTS_VIEW_ASSIGNED,
        Permission.BUDGET_VIEW_SUMMARY,
        Permission.RISKS_VIEW,
        Permission.REPORTS_VIEW_ALL,
        Permission.MESSAGES_SEND,
    },
}


def get_role_permissions(role: Role) -> Set[Permission]:
    """Get permissions for a role"""
    return ROLE_PERMISSIONS.get(role, set())


def has_permission(user_permissions: Set[Permission], required_permission: Permission) -> bool:
    """Check if user has a specific permission"""
    return required_permission in user_permissions
