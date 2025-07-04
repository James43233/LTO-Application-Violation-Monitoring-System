from django.http import JsonResponse
from django.db.models import Max
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.views.decorators.http import require_http_methods
from django.core.files.base import ContentFile
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from datetime import datetime
import json
import base64
from .models import DriverUser, Violation, ViolationDetail, LawOfficer, LtoAdminUser, ViolationType, Payment, AuditLog
from django.contrib.auth.decorators import login_required

def hello_world(request):
    return JsonResponse({'message': 'Hello from Django backend!'})


def api_login(request):
    # assuming you're using DRF or standard Django views
    if request.method == "POST":
        data = json.loads(request.body)
        username = data.get("username")
        password = data.get("password")
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)  # <-- THIS IS CRUCIAL!
            # now the session is authenticated
            return JsonResponse({
                "success": True,
                "user_id": user.id,
                "user_type": ... # your logic
            })
        else:
            return JsonResponse({"success": False, "error": "Invalid credentials"}, status=400)
        
@csrf_exempt
@require_http_methods(["POST"])
def universal_login(request):
    print("universal_login called")
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return JsonResponse({'success': False, 'error': 'Username and password are required.'}, status=400)

        # DRIVER LOGIN (plain text match)
        driver = DriverUser.objects.filter(username=username, password=password).first()
        if driver:
            if getattr(driver, 'account_status', 'Unverified') != "Verified":
                return JsonResponse({
                    'success': False,
                    'error': 'Your account is not verified. Please contact LTO admin.'
                }, status=403)
            return JsonResponse({
                'success': True,
                'user_type': 'driver',
                'user_id': driver.driver_user_id,
                'full_name': driver.full_name,
                'account_status': driver.account_status
            })

        # LAW OFFICER LOGIN (plain text match)
        officer = LawOfficer.objects.filter(username=username, password=password).first()
        if officer:
            return JsonResponse({
                'success': True,
                'user_type': 'officer',
                'user_id': officer.law_of_user_id,
                'full_name': officer.full_name
            })

        # LTO ADMIN LOGIN (plain text match)
        admin = LtoAdminUser.objects.filter(username=username, password=password).first()
        if admin:
            return JsonResponse({
                'success': True,
                'user_type': 'admin',
                'user_id': admin.lto_user,
                'full_name': admin.full_name
            })

        return JsonResponse({'success': False, 'error': 'Invalid credentials'}, status=401)

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON.'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
@csrf_exempt
@require_http_methods(["POST"])
def get_driver_details(request):
    print("Method:", request.method)
    print("Headers:", request.headers)
    print("Body:", request.body)
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON.'}, status=400)

    driver_user_id = data.get('driver_user_id')
    print("Parsed data:", data)
    print("driver_user_id:", driver_user_id)
    if not driver_user_id:
        return JsonResponse({'success': False, 'error': 'driver_user_id is required.'}, status=400)

    try:
        user = DriverUser.objects.get(driver_user_id=driver_user_id)
        return JsonResponse({
            'success': True,
            'full_name': user.full_name,
            'age': user.age,
            'license_status': user.license_status,
            'license_expiry': user.license_expiry.isoformat() if user.license_expiry else None,
            'birthday': user.birthday.isoformat() if user.birthday else None,
            'email': user.email,
            'phone_number': user.phone_number,
            'license_number': user.license_number,
        })
    except DriverUser.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'User not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def driver_penalties(request):
    try:
        data = json.loads(request.body)
        driver_user_id = data.get('driver_user_id')
        if not driver_user_id:
            return JsonResponse({'success': False, 'error': 'Missing driver_user_id'}, status=400)
        
        violations = Violation.objects.filter(driver_user_id=driver_user_id)
        penalty_list = []
        for v in violations:
            officer_name = v.law_officer.full_name if v.law_officer else "N/A"
            details = ViolationDetail.objects.filter(violation_id=v.violation_id)
            for detail in details:
                penalty_list.append({
                    'violation_id': v.violation_id,  # <-- Add this line!
                    'violation_type': detail.violation_type.violation_name if detail.violation_type else "N/A",
                    'officer': officer_name,
                    'fee': float(detail.fee_at_time) if detail.fee_at_time else float(v.total_fee),
                    'status': v.status,
                })
        return JsonResponse({'success': True, 'penalties': penalty_list})
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
@csrf_exempt
@require_http_methods(["POST"])
def register_driver(request):
    try:
        data = json.loads(request.body)
        username = data.get("username")
        password = data.get("password")
        full_name = data.get("full_name")
        email = data.get("email")
        phone_number = data.get("phone_number")
        license_number = data.get("license_number")
        birthday = data.get("birthday")
        license_img_data = data.get("license_img")  # can be None

        required = [username, password, full_name, email, phone_number, license_number, birthday]
        if not all(required):
            print("Missing fields:", required)
            return JsonResponse({"success": False, "error": "All fields are required."})

        if DriverUser.objects.filter(username=username).exists():
            print("Username exists:", username)
            return JsonResponse({"success": False, "error": "Username already exists."})

        try:
            birthday_obj = datetime.strptime(birthday, "%Y-%m-%d").date()
        except Exception as e:
            print("Birthday error:", e)
            return JsonResponse({"success": False, "error": "Invalid birthday format. Use YYYY-MM-DD."})

        driver = DriverUser(
            username=username,
            password=password,
            full_name=full_name,
            email=email,
            phone_number=phone_number,
            license_number=license_number,
            birthday=birthday_obj,
        )

        if license_img_data:
            try:
                format, imgstr = license_img_data.split(';base64,') 
                ext = format.split('/')[-1]
                driver.license_img.save(
                    f'license_{username}.{ext}',
                    ContentFile(base64.b64decode(imgstr)),
                    save=False
                )
            except Exception as e:
                print("Image error:", e)
                return JsonResponse({"success": False, "error": f"Image upload failed: {e}"})

        print(f"Saving driver: {username}")
        driver.save()
        print(f"Driver saved: {driver.id}")
        return JsonResponse({"success": True, "message": "Driver registered successfully."})

    except Exception as e:
        print("REGISTER EXCEPTION:", e)
        return JsonResponse({"success": False, "error": str(e)})
    
@csrf_exempt
@require_http_methods(["POST"])
def get_officer_details(request):
    try:
        data = json.loads(request.body)
        officer_user_id = data.get('officer_user_id')
        if not officer_user_id:
            return JsonResponse({'success': False, 'error': 'officer_user_id is required.'}, status=400)
        user = LawOfficer.objects.get(law_of_user_id=officer_user_id)
        return JsonResponse({
            'success': True,
            'full_name': user.full_name,
            'badge_id': user.badge_id,
            'station': user.station,
            'phone_number': user.phone_number,
        })
    except LawOfficer.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Officer not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
def get_next_violation_id(request):
    max_id = Violation.objects.aggregate(Max('violation_id'))['violation_id__max'] or 0
    next_id = max_id + 1
    return JsonResponse({'next_violation_id': next_id})

@login_required
@csrf_exempt
def register_violation(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body)
        # Get officer username from session
        officer_username = request.session.get('username')
        if not officer_username:
            return JsonResponse({"success": False, "error": "No logged-in officer found."}, status=400)
        try:
            law_officer = LawOfficer.objects.get(username=officer_username)
        except LawOfficer.DoesNotExist:
            return JsonResponse({"success": False, "error": "Law officer not found."}, status=400)

        # Get driver by name/license, etc
        driver_name = data.get("driver_name")
        license_number = data.get("license_number")
        address = data.get("address")
        platenumber = data.get("platenumber")
        vehicle_type = data.get("vehicle_type")
        car_name = data.get("car_name")
        vehicle_color = data.get("vehicle_color")
        notes = data.get("notes")
        violations = data.get("violations", [])

        if not (driver_name and license_number and address and violations):
            return JsonResponse({"success": False, "error": "Missing required fields."}, status=400)

        try:
            driver = DriverUser.objects.get(full_name=driver_name, license_number=license_number)
        except DriverUser.DoesNotExist:
            return JsonResponse({"success": False, "error": "Driver not found."}, status=404)

        total_fee = sum(float(v.get("fee_at_time", 0)) for v in violations)

        violation = Violation.objects.create(
            driver_user=driver,
            law_officer=law_officer,
            location=address,
            status="unpaid",
            total_fee=total_fee,
        )

        for v in violations:
            violation_type_id = v.get("violation_type")
            fee_at_time = v.get("fee_at_time")
            vt = None
            if violation_type_id:
                try:
                    vt = ViolationType.objects.get(pk=violation_type_id)
                except ViolationType.DoesNotExist:
                    pass

            ViolationDetail.objects.create(
                violation=violation,
                violation_type=vt,
                fee_at_time=fee_at_time,
                notes=notes,
                platenumber=platenumber,
                vehicle_type=vehicle_type,
                car_name=car_name,
                vehicle_color=vehicle_color,
            )

        return JsonResponse({"success": True, "violation_id": violation.violation_id})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"success": False, "error": str(e)}, status=500)

@csrf_exempt
def verify_driver(request):
    # Only accept POST requests
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'POST only'}, status=405)

    import json
    try:
        data = json.loads(request.body)
        full_name = data.get('full_name')
        license_number = data.get('license_number')
        if not full_name or not license_number:
            return JsonResponse({'success': False, 'error': 'Missing data'}, status=400)
        exists = DriverUser.objects.filter(full_name=full_name, license_number=license_number).exists()
        return JsonResponse({'success': exists})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
def get_violation_types(request):
    types = ViolationType.objects.all().values('violation_type', 'violation_name', 'violation_fee')
    # For the frontend Picker, use "id" as the value (can also use violation_type)
    data = [
        {
            "id": vt['violation_type'],
            "violation_name": vt['violation_name'],
            "violation_fee": str(vt['violation_fee']),
        }
        for vt in types
    ]
    return JsonResponse({'violation_types': data})


@csrf_exempt
def submit_payment(request):
    print("submit_payment called")
    if request.method == "POST":
        data = json.loads(request.body)
        violation_id = data.get("violation_id")
        driver_user_id = data.get("driver_user_id")
        payment_type = data.get("payment_type")
        amount_paid = data.get("amount_paid")
        transaction_ref = data.get("transaction_ref")

        # Force status to "For Checking" on creation
        status = "For Checking"

        try:
            violation = Violation.objects.get(pk=violation_id)
            driver = DriverUser.objects.get(pk=driver_user_id)
            # Create Payment record with "For Checking" status
            payment = Payment.objects.create(
                violation=violation,
                driver_user=driver,
                payment_type=payment_type,
                amount_paid=amount_paid,
                transaction_ref=transaction_ref,
                status=status,
            )
            # Do NOT update Violation status yet
            return JsonResponse({"success": True, "payment_id": payment.payment_id})
        except Violation.DoesNotExist:
            return JsonResponse({"success": False, "error": "Violation not found."})
        except DriverUser.DoesNotExist:
            return JsonResponse({"success": False, "error": "Driver not found."})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})
    return JsonResponse({"success": False, "error": "Invalid method"}, status=405)


@csrf_exempt
def get_driver_payments(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "POST only."}, status=405)
    try:
        data = json.loads(request.body)
        driver_user_id = data.get("driver_user_id")
        if not driver_user_id:
            return JsonResponse({"success": False, "error": "driver_user_id is required."}, status=400)

        # Fetch all payment history for this driver
        payments = Payment.objects.filter(driver_user_id=driver_user_id).order_by("-payment_date")
        payments_list = [
            {
                "payment_id": p.payment_id,
                "violation_id": p.violation_id,
                "payment_type": p.payment_type,
                "payment_date": p.payment_date,
                "amount_paid": float(p.amount_paid),
                "transaction_ref": p.transaction_ref,
                "status": p.status,
            }
            for p in payments
        ]
        return JsonResponse({"success": True, "payments": payments_list}, status=200)
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)
    
    
@csrf_exempt
@require_http_methods(["POST"])
def lto_admin_details(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON.'}, status=400)

    user_id = data.get('user_id')
    if not user_id:
        return JsonResponse({'success': False, 'error': 'user_id is required.'}, status=400)

    try:
        admin = LtoAdminUser.objects.get(lto_user=user_id)
        return JsonResponse({
            'success': True,
            'full_name': admin.full_name,
            'position': admin.position,
            'phone_number': admin.phone_number,
        })
    except LtoAdminUser.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Admin not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def lto_admin_audit_logs(request):
    data = json.loads(request.body)
    user_id = data.get('user_id')
    logs = AuditLog.objects.filter(lto_user=user_id).order_by('-timestamp')
    return JsonResponse({'logs': [
        {
            'id': log.log_id,
            'action': log.action_type,
            'description': log.description,
            'timestamp': log.timestamp.strftime('%Y-%m-%d %H:%M')
        }
        for log in logs
    ]})

@csrf_exempt
def driver_users(request):
    if request.method == 'GET':
        drivers = DriverUser.objects.all()
        driver_list = []
        for d in drivers:
            driver_list.append({
                'id': d.driver_user_id,
                'name': d.full_name,
                'license': d.license_number,
                'status': d.account_status,
                'license_expiry': str(d.license_expiry) if d.license_expiry else None,
            })
        print("Driver Response:", driver_list)  # Debug print
        return JsonResponse({'drivers': driver_list})

def payments(request):
    payments = Payment.objects.all()
    data = []
    for p in payments:
        data.append({
            "id": p.payment_id,
            "driver": p.driver_user.full_name if hasattr(p, 'driver_user') else "",
            "amount": float(p.amount_paid),  # Fixed here
            "transaction_ref": p.transaction_ref,
            "status": p.status.lower(),  # Ensure lower case for frontend
        })
    return JsonResponse({"payments": data})

@csrf_exempt
@require_POST
def verify_driver_admin(request):
    try:
        print("Request received")
        data = json.loads(request.body)
        print("Request body:", data)
        driver_user_id = data.get('driver_user_id')
        print("driver_user_id:", driver_user_id)
        if not driver_user_id:
            return JsonResponse({'success': False, 'error': 'driver_user_id is required'}, status=400)

        from .models import DriverUser
        print("Import success")
        driver = DriverUser.objects.get(pk=driver_user_id)
        print("Driver found:", driver)
        driver.account_status = 'Verified'
        driver.save()
        print("Driver verified and saved")
        return JsonResponse({'success': True, 'message': f'Driver {driver_user_id} verified.'})
    except DriverUser.DoesNotExist:
        print("Driver not found")
        return JsonResponse({'success': False, 'error': 'Driver not found.'}, status=404)
    except Exception as e:
        print("Exception occurred:", str(e))
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
    

@csrf_exempt
@require_POST
def update_license_expiry(request):
    try:
        data = json.loads(request.body)
        driver_user_id = data.get('driver_user_id')
        license_expiry = data.get('license_expiry')
        if not driver_user_id or not license_expiry:
            return JsonResponse({'success': False, 'error': 'driver_user_id and license_expiry are required'}, status=400)
        # Validate date format
        try:
            datetime.strptime(license_expiry, '%Y-%m-%d')
        except ValueError:
            return JsonResponse({'success': False, 'error': 'Invalid date format'}, status=400)

        from .models import DriverUser
        driver = DriverUser.objects.get(pk=driver_user_id)
        driver.license_expiry = license_expiry
        driver.save()
        return JsonResponse({'success': True, 'message': f'Driver {driver_user_id} license expiry updated.'})
    except DriverUser.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Driver not found.'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
    

@csrf_exempt
@require_POST
def update_payment_status(request):
    try:
        data = json.loads(request.body)
        payment_id = data.get('payment_id')
        status = data.get('status', '').lower()  # ensure lowercase
        user_id = data.get('user_id')
        if not payment_id or not status:
            return JsonResponse({'success': False, 'error': 'payment_id and status are required'}, status=400)
        if status != "completed":
            return JsonResponse({'success': False, 'error': 'Only status "completed" is allowed.'}, status=400)

        from .models import Payment  # adjust to your payment model location
        payment = Payment.objects.get(pk=payment_id)
        payment.status = status
        payment.save()
        return JsonResponse({'success': True, 'message': f'Payment {payment_id} marked as completed.'})
    except Payment.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Payment not found.'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)