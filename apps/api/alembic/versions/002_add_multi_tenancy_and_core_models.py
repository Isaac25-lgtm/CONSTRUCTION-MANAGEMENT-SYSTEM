"""Add organizations multi-tenancy and all core models

Revision ID: 002
Revises: 001
Create Date: 2026-02-13
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Create organizations table
    op.create_table(
        'organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False, unique=True),
        sa.Column('subscription_tier', sa.String(), nullable=False, server_default='free'),
        sa.Column('max_projects', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('max_users', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('settings', postgresql.JSONB(), nullable=True, server_default='{}'),
        sa.Column('logo_url', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_organizations_slug', 'organizations', ['slug'])
    
    # Create organization_members table
    op.create_table(
        'organization_members',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('org_role', sa.String(), nullable=False, server_default='Member'),
        sa.Column('status', sa.String(), nullable=False, server_default='Active'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.UniqueConstraint('organization_id', 'user_id', name='uq_org_user')
    )
    op.create_index('idx_org_members_org', 'organization_members', ['organization_id'])
    op.create_index('idx_org_members_user', 'organization_members', ['user_id'])
    op.create_index('idx_org_member_lookup', 'organization_members', ['organization_id', 'user_id'])
    
    # Add organization_id to projects table
    op.add_column('projects', sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('projects', sa.Column('client_name', sa.String(), nullable=True))
    op.add_column('projects', sa.Column('contract_type', sa.String(), nullable=True))
    
    # Create default organization and assign all projects to it
    op.execute("""
        INSERT INTO organizations (id, name, slug, subscription_tier, max_projects, max_users, is_active, is_deleted, created_at, updated_at)
        VALUES (gen_random_uuid(), 'BuildPro Construction', 'buildpro-construction', 'professional', 100, 50, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    """)
    
    # Assign all existing projects to default org
    op.execute("""
        UPDATE projects 
        SET organization_id = (SELECT id FROM organizations WHERE slug = 'buildpro-construction' LIMIT 1)
    """)
    
    # Assign all existing users to default org
    op.execute("""
        INSERT INTO organization_members (id, organization_id, user_id, org_role, status, created_at, updated_at)
        SELECT gen_random_uuid(), 
               (SELECT id FROM organizations WHERE slug = 'buildpro-construction' LIMIT 1),
               u.id,
               'Org_Admin',
               'Active',
               CURRENT_TIMESTAMP,
               CURRENT_TIMESTAMP
        FROM users u
    """)
    
    # Now make organization_id NOT NULL
    op.alter_column('projects', 'organization_id', nullable=False)
    op.create_foreign_key('fk_projects_organization', 'projects', 'organizations', ['organization_id'], ['id'], ondelete='CASCADE')
    op.create_index('idx_projects_org', 'projects', ['organization_id'])
    op.create_index('idx_projects_status', 'projects', ['status'])
    
    # Create tasks table
    op.create_table(
        'tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='Pending'),
        sa.Column('priority', sa.String(), nullable=False, server_default='Medium'),
        sa.Column('assignee_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reporter_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('estimated_hours', sa.Numeric(10, 2), nullable=True),
        sa.Column('actual_hours', sa.Numeric(10, 2), nullable=True),
        sa.Column('progress', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('dependencies', postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True, server_default='{}'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_tasks_org', 'tasks', ['organization_id'])
    op.create_index('idx_tasks_project', 'tasks', ['project_id'])
    op.create_index('idx_tasks_status', 'tasks', ['status'])
    op.create_index('idx_tasks_assignee', 'tasks', ['assignee_id'])
    op.create_index('idx_tasks_due_date', 'tasks', ['due_date'])
    
    # Create expenses table
    op.create_table(
        'expenses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('vendor', sa.String(), nullable=True),
        sa.Column('expense_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='Pending'),
        sa.Column('logged_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('approved_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('receipt_document_id', postgresql.UUID(as_uuid=True), nullable=True),  # Will add FK after documents table
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_expenses_org', 'expenses', ['organization_id'])
    op.create_index('idx_expenses_project', 'expenses', ['project_id'])
    op.create_index('idx_expenses_status', 'expenses', ['status'])
    op.create_index('idx_expenses_category', 'expenses', ['category'])
    op.create_index('idx_expenses_date', 'expenses', ['expense_date'])
    
    # Create documents table
    op.create_table(
        'documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('document_type', sa.String(), nullable=True),
        sa.Column('file_size', sa.BigInteger(), nullable=True),
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('storage_provider', sa.String(), nullable=False, server_default='local'),
        sa.Column('storage_key', sa.String(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('parent_document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('documents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('uploaded_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('checksum', sa.String(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_documents_org', 'documents', ['organization_id'])
    op.create_index('idx_documents_project', 'documents', ['project_id'])
    op.create_index('idx_documents_type', 'documents', ['document_type'])
    
    # Now add FK for receipt_document_id in expenses
    op.create_foreign_key('fk_expenses_receipt', 'expenses', 'documents', ['receipt_document_id'], ['id'], ondelete='SET NULL')
    
    # Create risks table
    op.create_table(
        'risks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('probability', sa.String(), nullable=False),
        sa.Column('impact', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='Identified'),
        sa.Column('mitigation_plan', sa.Text(), nullable=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('identified_date', sa.Date(), nullable=False),
        sa.Column('review_date', sa.Date(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_risks_org', 'risks', ['organization_id'])
    op.create_index('idx_risks_project', 'risks', ['project_id'])
    op.create_index('idx_risks_status', 'risks', ['status'])
    op.create_index('idx_risks_category', 'risks', ['category'])
    op.create_index('idx_risks_date', 'risks', ['identified_date'])
    
    # Create milestones table
    op.create_table(
        'milestones',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('target_date', sa.Date(), nullable=False),
        sa.Column('actual_date', sa.Date(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='Pending'),
        sa.Column('completion_percentage', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('dependencies', postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True, server_default='{}'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_milestones_org', 'milestones', ['organization_id'])
    op.create_index('idx_milestones_project', 'milestones', ['project_id'])
    op.create_index('idx_milestones_status', 'milestones', ['status'])
    op.create_index('idx_milestones_date', 'milestones', ['target_date'])
    
    # Create messages table
    op.create_table(
        'messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=True),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=True),
        sa.Column('sender_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('message_type', sa.String(), nullable=False, server_default='text'),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('attachments', postgresql.JSONB(), nullable=True, server_default='[]'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_messages_org', 'messages', ['organization_id'])
    op.create_index('idx_messages_project', 'messages', ['project_id'])
    op.create_index('idx_messages_task', 'messages', ['task_id'])
    
    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('entity_type', sa.String(), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('before_state', postgresql.JSONB(), nullable=True),
        sa.Column('after_state', postgresql.JSONB(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_audit_org', 'audit_logs', ['organization_id'])
    op.create_index('idx_audit_user', 'audit_logs', ['user_id'])
    op.create_index('idx_audit_action', 'audit_logs', ['action'])
    op.create_index('idx_audit_entity', 'audit_logs', ['entity_type'])
    op.create_index('idx_audit_entity_id', 'audit_logs', ['entity_id'])
    op.create_index('idx_audit_org_entity', 'audit_logs', ['organization_id', 'entity_type'])
    op.create_index('idx_audit_org_time', 'audit_logs', ['organization_id', 'created_at'])
    op.create_index('idx_audit_user_time', 'audit_logs', ['user_id', 'created_at'])
    
    # Create jobs table
    op.create_table(
        'jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('job_type', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='Pending'),
        sa.Column('progress', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('parameters', postgresql.JSONB(), nullable=True),
        sa.Column('result', postgresql.JSONB(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_jobs_org', 'jobs', ['organization_id'])
    op.create_index('idx_jobs_type', 'jobs', ['job_type'])
    op.create_index('idx_jobs_status', 'jobs', ['status'])


def downgrade():
    op.drop_table('jobs')
    op.drop_table('audit_logs')
    op.drop_table('messages')
    op.drop_table('milestones')
    op.drop_table('risks')
    op.drop_table('documents')
    op.drop_table('expenses')
    op.drop_table('tasks')
    op.drop_column('projects', 'contract_type')
    op.drop_column('projects', 'client_name')
    op.drop_column('projects', 'organization_id')
    op.drop_table('organization_members')
    op.drop_table('organizations')
