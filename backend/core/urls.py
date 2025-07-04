from django.urls import path
from . import views

urlpatterns = [
    path('hello/', views.hello_world, name='hello_world'),
    path('login/', views.universal_login, name='universal_login'), 
    path('driver/details/', views.get_driver_details, name='get_driver_details'),
    path('driver/penalties/', views.driver_penalties, name='driver_penalties'),
    path('driver/register/', views.register_driver, name='register_driver'),
    path('officer/details/', views.get_officer_details, name='get_officer_details'),
    path('violation/next-id/', views.get_next_violation_id, name='get_next_violation_id'),
    path('driver/verify/', views.verify_driver, name='verify_driver'),
    path('violation/register/', views.register_violation, name='register_violation'),
    path('violation/types/', views.get_violation_types, name='get_violation_types'),
    path('payment/submit/', views.submit_payment, name='submit_payment'),
    path('driver/payments/', views.get_driver_payments, name='get_driver_payments'),
    path('lto_admin_details/', views.lto_admin_details, name='lto_admin_details'),
    path('lto_admin_audit_logs/', views.lto_admin_audit_logs, name='lto_admin_audit_logs'),
    path('verify_driver_admin/', views.verify_driver_admin, name='verify_driver_admin'),
    path('driver_users/', views.driver_users, name='driver_users'),
    path('payments/', views.payments, name='payments'),
    path('update_license_expiry/', views.update_license_expiry, name='update_license_expiry'),
    path('update_payment_status/', views.update_payment_status, name='update_payment_status'),
]