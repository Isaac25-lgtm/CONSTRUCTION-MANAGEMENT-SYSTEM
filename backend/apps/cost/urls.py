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

    # Summaries
    path("<uuid:project_id>/summary/", views.cost_summary, name="cost-summary"),
    path("<uuid:project_id>/evm/", views.evm_summary, name="evm-summary"),
    path("<uuid:project_id>/overview/", views.project_overview, name="project-overview"),
]
