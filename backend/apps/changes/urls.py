"""Changes URL configuration."""
from django.urls import path
from . import views

urlpatterns = [
    path("<uuid:project_id>/change-orders/", views.change_order_list, name="change-order-list"),
    path("<uuid:project_id>/change-orders/<uuid:change_order_id>/", views.change_order_detail, name="change-order-detail"),
    path("<uuid:project_id>/change-orders/<uuid:change_order_id>/restore/", views.change_order_restore, name="change-order-restore"),
]
