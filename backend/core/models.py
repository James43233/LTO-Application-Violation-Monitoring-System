from django.db import models
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver


class DriverUser(models.Model):
    driver_user_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=128)
    full_name = models.CharField(max_length=255)
    email = models.EmailField()
    phone_number = models.CharField(max_length=20)
    license_img = models.BinaryField(null=True, blank=True)
    license_number = models.CharField(max_length=50)
    license_status = models.CharField(max_length=50, null=True, blank=True)
    license_expiry = models.DateField(null=True, blank=True)
    birthday = models.DateField(null=True, blank=True)
    account_status = models.CharField(max_length=20, default="Unverified")
    
    class Meta:
        db_table = 'driver_user'
        managed = False

    @property
    def age(self):
        if self.birthday:
            today = timezone.now().date()
            return (
                today.year
                - self.birthday.year
                - ((today.month, today.day) < (self.birthday.month, self.birthday.day))
            )
        return None

class LawOfficer(models.Model):
    law_of_user_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=128)
    badge_id = models.CharField(max_length=50, unique=True)
    station = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    full_name = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.full_name} ({self.badge_id})"
    
    class Meta:
        managed = False
        db_table = 'law_officer'

class LtoAdminUser(models.Model):
    lto_user = models.AutoField(primary_key=True)
    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=128)
    full_name = models.CharField(max_length=255)
    position = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"{self.full_name} ({self.username})"
    
    class Meta:
        managed = False
        db_table = 'lto_admin_user'

class ViolationType(models.Model):
    violation_type = models.AutoField(primary_key=True)  # Integer PK, no 'id' field
    violation_name = models.CharField(max_length=255)
    violation_fee = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        managed = False
        db_table = 'violation_type'
        
class Violation(models.Model):
    violation_id = models.AutoField(primary_key=True)
    driver_user = models.ForeignKey('DriverUser', on_delete=models.CASCADE, db_column='driver_user_id')
    law_officer = models.ForeignKey('LawOfficer', on_delete=models.SET_NULL, null=True, db_column='law_of_user_id')
    location = models.CharField(max_length=255)
    status = models.CharField(max_length=50 ,default='unpaid')  # No choices, since your DB stores 'paid' and 'unpaid'
    total_fee = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        managed = False
        db_table = 'violations'

class ViolationDetail(models.Model):
    violation_details = models.AutoField(primary_key=True)
    violation = models.ForeignKey(
        Violation,
        on_delete=models.CASCADE,
        db_column='violation_id',
        related_name='details'
    )
    violation_type = models.ForeignKey(
        'ViolationType',
        on_delete=models.SET_NULL,
        null=True,
        db_column='violation_type',
    )
    fee_at_time = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True, null=True)
    platenumber = models.CharField(max_length=50)
    vehicle_type = models.CharField(max_length=50)
    car_name = models.CharField(max_length=100)
    vehicle_color = models.CharField(max_length=50)

    class Meta:
        managed = False
        db_table = 'violations_details'

class Payment(models.Model):
    payment_id = models.AutoField(primary_key=True)  # Explicit PK

    PAYMENT_TYPES = [
        ("Online", "Online"),
        ("Cash", "Cash"),
        ("GCash", "GCash"),
        ("BankTransfer", "Bank Transfer"),
    ]

    PAYMENT_STATUS = [
        ("Pending", "Pending"),
        ("Completed", "Completed"),
        ("Failed", "Failed"),
    ]

    violation = models.ForeignKey(Violation, on_delete=models.CASCADE, db_column='violation_id')
    driver_user = models.ForeignKey(DriverUser, on_delete=models.CASCADE, db_column='driver_user_id')
    payment_type = models.CharField(max_length=50, choices=PAYMENT_TYPES)
    payment_date = models.DateTimeField(auto_now_add=True)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_ref = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default="Pending")

    def __str__(self):
        return f"Payment #{self.payment_id} - {self.status} - {self.amount_paid}"
    
    class Meta:
        managed = False
        db_table = 'payment'

class AuditLog(models.Model):
    log_id = models.AutoField(primary_key=True)
    driver_user = models.ForeignKey('DriverUser', on_delete=models.SET_NULL, null=True, db_column='driver_user_id', blank=True)
    law_officer = models.ForeignKey('LawOfficer', on_delete=models.SET_NULL, null=True, db_column='law_of_user_id', blank=True)
    lto_user = models.ForeignKey('LtoAdminUser', on_delete=models.SET_NULL, null=True, db_column='lto_user', blank=True)
    action_type = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField()

    def __str__(self):
        return f"{self.action_type} by {self.driver_user or self.law_officer or self.lto_user} at {self.timestamp}"

    class Meta:
        managed = False
        db_table = 'audit_log'
        
        
@receiver(post_save, sender=Payment)
def mark_violation_paid_on_payment_completed(sender, instance, **kwargs):
    if instance.status.lower() == "completed":
        violation = instance.violation
        if violation.status.lower() != "paid":
            violation.status = "paid"
            violation.save()