"""Cost URL configuration."""
from django.urls import path
from . import views

urlpatterns = [
    # Budget lines
    path("<uuid:project_id>/budget-lines/", views.budget_line_list, name="budget-line-list"),
    path("<uuid:project_id>/budget-lines/<uuid:line_id>/", views.budget_line_detail, name="budget-line-detail"),

    # Expenses
    path("<uuid:project_id>/expenses/", views.expense_list, name="expense-list"),
    path("<uuid:project_id>/expenses/<uuid:expense_id>/", views.expense_detail, name="expense-detail"),
    path(
        "<uuid:project_id>/expenses/<uuid:expense_id>/attachments/",
        views.expense_attachment_upload,
        name="expense-attachment-upload",
    ),
    path(
        "<uuid:project_id>/expenses/<uuid:expense_id>/attachments/<uuid:attachment_id>/",
        views.expense_attachment_delete,
        name="expense-attachment-delete",
    ),
    path(
        "<uuid:project_id>/expenses/<uuid:expense_id>/attachments/<uuid:attachment_id>/download/",
        views.expense_attachment_download,
        name="expense-attachment-download",
    ),

    # Summaries
    path("<uuid:project_id>/summary/", views.cost_summary, name="cost-summary"),
    path("<uuid:project_id>/evm/", views.evm_summary, name="evm-summary"),
    path("<uuid:project_id>/overview/", views.project_overview, name="project-overview"),

    # Task-centric cost table (prototype parity)
    path("<uuid:project_id>/task-cost-table/", views.task_cost_table, name="task-cost-table"),
    path("<uuid:project_id>/tasks/<uuid:task_id>/expenses/", views.task_expenses, name="task-expenses"),
    path("<uuid:project_id>/clear-budgets/", views.clear_budgets, name="clear-budgets"),
]
