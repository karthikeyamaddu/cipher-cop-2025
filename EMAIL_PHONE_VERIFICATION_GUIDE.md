# Email and Phone Number Verification System - Complete Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [How It Works](#how-it-works)
5. [Implementation Details](#implementation-details)
6. [Setup Guide](#setup-guide)
7. [Integration Guide](#integration-guide)
8. [API Reference](#api-reference)
9. [Frontend Implementation](#frontend-implementation)
10. [Security Considerations](#security-considerations)
11. [Troubleshooting](#troubleshooting)

---

## System Overview

This Django-based application implements a **dual verification system** for user registration:
- **Email Verification**: Uses OTP (One-Time Password) sent via email
- **Phone Verification**: Uses SMS OTP sent via Twilio Verify service

### Key Features
✅ Real-time email/phone validation  
✅ Prevents duplicate registrations  
✅ OTP expiration (5 minutes for email)  
✅ Secure hashed OTP storage in Redis  
✅ Resend OTP functionality  
✅ User-friendly frontend with live feedback  
✅ Support for both SMTP and SendGrid email services  
✅ Twilio integration for SMS delivery  

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER REGISTRATION FLOW                    │
└─────────────────────────────────────────────────────────────────┘

Frontend (register.js)
    │
    ├──→ Email Validation
    │    │
    │    ├──→ 1. User enters email
    │    ├──→ 2. Frontend validates format
    │    ├──→ 3. Send OTP button appears
    │    ├──→ 4. POST /api/common/otp/send/
    │    │        │
    │    │        ├──→ Backend checks if email exists
    │    │        ├──→ Generate 6-digit OTP
    │    │        ├──→ Hash OTP (Django's make_password)
    │    │        ├──→ Store in Redis (5 min expiry)
    │    │        └──→ Send email via SMTP/SendGrid
    │    │
    │    ├──→ 5. User enters OTP
    │    ├──→ 6. POST /api/common/otp/validate/
    │    │        │
    │    │        ├──→ Retrieve hashed OTP from Redis
    │    │        ├──→ Compare using check_password
    │    │        ├──→ Delete OTP from Redis if valid
    │    │        └──→ Mark email as verified
    │    │
    │    └──→ 7. Email field locked (verified)
    │
    └──→ Phone Validation
         │
         ├──→ 1. User enters 10-digit mobile number
         ├──→ 2. Frontend validates format
         ├──→ 3. Send OTP button appears
         ├──→ 4. POST /api/common/mobile/otp/send/
         │        │
         │        ├──→ Backend checks if phone exists
         │        ├──→ Twilio sends SMS OTP
         │        └──→ Returns success status
         │
         ├──→ 5. User enters OTP
         ├──→ 6. POST /api/common/mobile/otp/validate/
         │        │
         │        ├──→ Twilio verifies OTP
         │        └──→ Returns approved/rejected status
         │
         └──→ 7. Phone field locked (verified)

Final Registration
    │
    └──→ Both verifications complete → User can register
```

---

## Technology Stack

### Backend
- **Framework**: Django 5.1.7
- **API**: Django REST Framework 3.16.0
- **Cache**: Redis (via django-redis 5.4.0)
- **SMS Service**: Twilio 9.6.1
- **Email Services**: 
  - SMTP (native Django)
  - SendGrid 6.12.2

### Frontend
- **JavaScript**: Vanilla JS (ES6+)
- **UI Alerts**: SweetAlert2
- **AJAX**: Fetch API

### Infrastructure
- **Cache Backend**: Redis (3 separate databases)
  - DB 0: General caching
  - DB 1: OTP storage
  - DB 2: Session management

---

## How It Works

### Email Verification Process

#### Step 1: OTP Generation
```python
# File: backend/utils/helpers.py

def generate_otp():
    """Generates a random 6-digit OTP"""
    return get_random_string(length=6, allowed_chars='1234567890')
```

#### Step 2: OTP Storage
```python
# File: backend/utils/helpers.py

def send_otp(email):
    # 1. Generate OTP
    otp = generate_otp()  # e.g., "123456"
    
    # 2. Hash the OTP (security measure)
    hashed_otp = make_password(otp)
    
    # 3. Store in Redis with 5-minute expiration
    set_cache('otp_cache', email, hashed_otp, timeout=300)
    
    # 4. Send plain OTP via email
    email_helper = Mailing(
        email_type='otp',
        email_address=email,
        content={"otp": otp}
    )
    email_helper.send_email()
```

**Why hash the OTP?**
- Prevents exposure if Redis is compromised
- Follows security best practices
- Uses Django's built-in password hashing (PBKDF2)

#### Step 3: OTP Validation
```python
# File: backend/common/views.py

class ValidateOTPView(View):
    def post(self, request):
        email = data.get('email')
        otp = data.get('otp')
        
        # 1. Retrieve hashed OTP from Redis
        stored_otp = get_cache('otp_cache', email)
        
        # 2. Verify OTP matches
        if check_password(otp, stored_otp):
            # 3. Delete from cache (one-time use)
            delete_cache('otp_cache', email)
            return JsonResponse({"status": "success"})
        
        return JsonResponse({"status": "error"})
```

### Phone Verification Process

#### Step 1: Send SMS OTP via Twilio
```python
# File: services/twilio/twilio.py

class TwilioVerifyService:
    def send_otp_to_mobile(self, phone):
        """Uses Twilio Verify API"""
        verification = self.client.verify \
            .v2 \
            .services(self.service_sid) \
            .verifications \
            .create(to=phone, channel="sms")
        
        return {"status": verification.status, "success": True}
```

**Twilio handles:**
- OTP generation
- SMS delivery
- OTP storage
- Expiration management

#### Step 2: Verify OTP
```python
# File: services/twilio/twilio.py

def verify_otp(self, phone, code):
    verification_check = self.client.verify \
        .v2 \
        .services(self.service_sid) \
        .verification_checks \
        .create(to=phone, code=code)
    
    return {
        "status": verification_check.status,
        "success": verification_check.status == "approved"
    }
```

---

## Implementation Details

### Database Models

```python
# File: backend/users/models.py

class CustomUser(AbstractUser):
    phone_no = models.CharField(max_length=20)
    is_phone_verified = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    # ... other fields
```

### Redis Cache Configuration

```python
# File: services_aiori_v2/settings.py

CACHES = {
    'otp_cache': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': CONFIG.REDIS_OTP_URL,  # e.g., redis://127.0.0.1:6379/1
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    },
}
```

### Email Templates

```html
<!-- File: frontend/templates/email/otp_template.html -->

<div class="otp-box">
    {{otp}}  <!-- Dynamic OTP value -->
</div>
<p>If you did not request this, please ignore this email.</p>
```

### URL Routing

```python
# File: backend/common/urls.py

urlpatterns = [
    path('otp/send/', SendOTPView.as_view()),
    path('otp/validate/', ValidateOTPView.as_view()),
    path('otp/resend/', ResendOTP.as_view()),
    
    path('mobile/otp/send/', SendMobileOTPView.as_view()),
    path('mobile/otp/validate/', VerifyMobileOTPView.as_view()),
]
```

---

## Setup Guide

### Prerequisites
- Python 3.10+
- Redis Server
- Twilio account (for SMS)
- SMTP server or SendGrid account (for email)

### Installation Steps

#### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

Key packages installed:
```
Django==5.1.7
djangorestframework==3.16.0
django-redis==5.4.0
redis==6.1.0
twilio==9.6.1
sendgrid==6.12.2
python-decouple==3.8
```

#### 2. Redis Setup

**Install Redis:**
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Windows
# Download from https://redis.io/download
```

**Start Redis:**
```bash
redis-server

# Verify
redis-cli ping  # Should return "PONG"
```

#### 3. Environment Configuration

Create `.env` file:
```env
# Email Configuration (SMTP)
EMAIL_SERVER=SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=noreply@yourapp.com

# SendGrid (Alternative)
# EMAIL_SERVER=SENDGRID
# SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
# SMTP_FROM=verified-sender@yourapp.com

# Twilio Configuration
TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxx

# Redis URLs
REDIS_DEFAULT_URL=redis://127.0.0.1:6379/0
REDIS_OTP_URL=redis://127.0.0.1:6379/1
REDIS_SESSION_URL=redis://127.0.0.1:6379/2

# Application
HOST_URL=http://localhost:8000
ALLOWED_HOST=localhost,127.0.0.1
```

**Gmail Setup** (if using SMTP):
1. Enable 2-Factor Authentication
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use App Password in `EMAIL_HOST_PASSWORD`

**Twilio Setup:**
1. Sign up at https://www.twilio.com
2. Create a Verify Service:
   - Console → Verify → Services → Create New
3. Copy `Service SID` to `TWILIO_VERIFY_SERVICE_SID`
4. Get Account SID and Auth Token from dashboard

#### 4. Database Migration
```bash
python manage.py makemigrations
python manage.py migrate
```

#### 5. Run Development Server
```bash
python manage.py runserver
```

---

## Integration Guide

### Adding to Your Django Project

#### Step 1: Copy Required Files

```
your_project/
├── backend/
│   ├── common/
│   │   ├── views.py          # Copy OTP views
│   │   └── urls.py           # Copy URL patterns
│   ├── utils/
│   │   └── helpers.py        # Copy helper functions
│   └── users/
│       └── models.py         # Add verification fields
├── services/
│   ├── twilio/
│   │   └── twilio.py         # Copy Twilio service
│   └── mailing/
│       ├── __init__.py       # Copy mailing service
│       ├── sendgrid.py       # SendGrid implementation
│       └── mailer/
│           └── __init__.py   # SMTP implementation
├── frontend/
│   └── templates/
│       └── email/
│           └── otp_template.html
└── static/
    └── js/
        └── register.js       # Copy verification logic
```

#### Step 2: Update Models

```python
# your_app/models.py

from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    phone_no = models.CharField(max_length=20, blank=True)
    is_phone_verified = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
```

Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

#### Step 3: Update Settings

```python
# settings.py

# Add to INSTALLED_APPS
INSTALLED_APPS = [
    # ...
    'rest_framework',
    'django_redis',
]

# Configure caches
from config_env import CONFIG

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': CONFIG.REDIS_DEFAULT_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    },
    'otp_cache': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': CONFIG.REDIS_OTP_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    },
}

# Email configuration
EMAIL_HOST = CONFIG.EMAIL_HOST
EMAIL_PORT = CONFIG.EMAIL_PORT
EMAIL_HOST_USER = CONFIG.EMAIL_HOST_USER
EMAIL_HOST_PASSWORD = CONFIG.EMAIL_HOST_PASSWORD
EMAIL_USE_TLS = CONFIG.EMAIL_USE_TLS
DEFAULT_FROM_EMAIL = CONFIG.DEFAULT_FROM_EMAIL
```

#### Step 4: Create config_env.py

```python
# config_env.py

from decouple import config

class Settings:
    # Email
    EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
    EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
    EMAIL_HOST_USER = config('EMAIL_HOST_USER')
    EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')
    EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
    DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL')
    EMAIL_SERVER = config('EMAIL_SERVER', default='SMTP')
    
    # Twilio
    TWILIO_ACCOUNT_SID = config('TWILIO_ACCOUNT_SID')
    TWILIO_AUTH_TOKEN = config('TWILIO_AUTH_TOKEN')
    TWILIO_VERIFY_SERVICE_SID = config('TWILIO_VERIFY_SERVICE_SID')
    
    # Redis
    REDIS_DEFAULT_URL = config('REDIS_DEFAULT_URL')
    REDIS_OTP_URL = config('REDIS_OTP_URL')
    REDIS_SESSION_URL = config('REDIS_SESSION_URL')

CONFIG = Settings()
```

#### Step 5: Update URLs

```python
# your_project/urls.py

from django.urls import path, include

urlpatterns = [
    # ...
    path('api/common/', include('backend.common.urls')),
]
```

#### Step 6: Add Frontend HTML

```html
<!-- registration_form.html -->

{% load static %}

<!-- Email Verification Section -->
<div class="form-group">
    <label for="email">Email</label>
    <input type="email" id="email" name="email" required>
    <input type="hidden" id="email-status" value="invalid" data-email="">
    <button type="button" id="send-otp-btn" onclick="sendOTP()" style="display: none;">
        Send OTP
    </button>
    <a id="resend_otp" style="display: none;">Resend OTP</a>
</div>

<!-- OTP Input (Hidden Initially) -->
<div id="otp-section" style="display: none;">
    <label for="otp">Enter OTP</label>
    <input type="text" id="otp" maxlength="6" placeholder="6-digit OTP">
    <button type="button" id="verify-otp-btn" onclick="verifyOTP()">
        Verify OTP
    </button>
</div>

<!-- Phone Verification Section -->
<div class="form-group">
    <label for="mobile">Mobile Number</label>
    <input type="tel" id="mobile" oninput="formatNumber(this)" pattern="\d{10}" required>
    <input type="hidden" id="mobile-status" value="invalid" data-mobile="">
    <button type="button" id="send-mobile-otp-btn" onclick="sendmobileOTP()" style="display: none;">
        Send OTP
    </button>
</div>

<!-- Mobile OTP Input (Hidden Initially) -->
<div id="otp-mobile-section" style="display: none;">
    <label for="mobile_otp">Enter OTP</label>
    <input type="text" id="mobile_otp" maxlength="6" placeholder="6-digit OTP">
    <button type="button" id="verify-mobile-otp-btn" onclick="verifymobileOTP()">
        Verify OTP
    </button>
</div>

<!-- CSRF Token -->
<div id="csrf" style="display: none;">
    {% csrf_token %}
</div>

<!-- Include JavaScript -->
<script src="{% static 'js/register.js' %}"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
```

---

## API Reference

### Email OTP Endpoints

#### 1. Send Email OTP
```http
POST /api/common/otp/send/
Content-Type: application/json

{
    "email": "user@example.com"
}
```

**Response Success:**
```json
{
    "status": "success",
    "message": "OTP sent successfully!"
}
```

**Response Error:**
```json
{
    "status": "error",
    "message": "Email already registered."
}
```

#### 2. Validate Email OTP
```http
POST /api/common/otp/validate/
Content-Type: application/json

{
    "email": "user@example.com",
    "otp": "123456"
}
```

**Response Success:**
```json
{
    "status": "success",
    "message": "OTP validated successfully!"
}
```

**Response Error:**
```json
{
    "status": "error",
    "message": "Invalid or expired OTP."
}
```

#### 3. Resend Email OTP
```http
POST /api/common/otp/resend/
Content-Type: application/x-www-form-urlencoded

email=user@example.com
```

### Phone OTP Endpoints

#### 1. Send Mobile OTP
```http
POST /api/common/mobile/otp/send/
Content-Type: application/json

{
    "mobile": "9876543210"
}
```

**Response Success:**
```json
{
    "status": "success",
    "message": "OTP sent successfully!"
}
```

**Response Error:**
```json
{
    "status": "error",
    "message": "Mobile number already registered."
}
```

#### 2. Validate Mobile OTP
```http
POST /api/common/mobile/otp/validate/
Content-Type: application/json

{
    "mobile": "9876543210",
    "otp": "123456"
}
```

**Response Success:**
```json
{
    "status": "success",
    "message": "OTP verified successfully!"
}
```

**Response Error:**
```json
{
    "status": "error",
    "message": "Invalid or expired OTP."
}
```

---

## Frontend Implementation

### Key JavaScript Functions

#### Email Validation Listener
```javascript
// Auto-show "Send OTP" button when valid email entered
emailInput.addEventListener('input', function () {
    const emailVal = emailInput.value.trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
    
    if (isValidEmail) {
        sendOtpBtn.style.display = 'inline-block';
        sendOtpBtn.disabled = false;
    } else {
        sendOtpBtn.style.display = 'none';
        sendOtpBtn.disabled = true;
    }
});
```

#### Send Email OTP
```javascript
function sendOTP() {
    const emailValue = emailField.value.trim();
    
    // Show loading
    Swal.fire({
        title: 'Processing...',
        onBeforeOpen: () => Swal.showLoading(),
        allowOutsideClick: false
    });
    
    // Send request
    fetch('/api/common/otp/send/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({ email: emailValue })
    })
    .then(response => response.json())
    .then(data => {
        Swal.close();
        if (data.status === 'success') {
            // Show OTP input field
            document.getElementById('otp-section').style.display = 'block';
            Swal.fire({
                icon: 'success',
                title: 'OTP Sent',
                text: data.message
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message
            });
        }
    });
}
```

#### Verify Email OTP
```javascript
function verifyOTP() {
    const emailValue = emailField.value.trim();
    const otpValue = otpField.value.trim();
    
    fetch('/api/common/otp/validate/', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrfToken() },
        body: JSON.stringify({
            email: emailValue,
            otp: otpValue
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            // Lock email field
            emailField.readOnly = true;
            emailField.style.backgroundColor = 'aliceblue';
            
            // Update status
            emailStatusField.value = 'valid';
            emailStatusField.setAttribute('data-email', emailValue);
            
            // Hide OTP section
            document.getElementById('otp-section').style.display = 'none';
            
            Swal.fire({
                icon: 'success',
                title: 'Email Verified!',
                text: 'Your email has been successfully verified.'
            });
        }
    });
}
```

#### Mobile Number Formatting
```javascript
function formatNumber(input) {
    // Remove non-numeric characters
    let value = input.value.replace(/\D/g, '');
    
    // Limit to 10 digits
    if (value.length > 10) {
        value = value.substring(0, 10);
    }
    
    input.value = value;
}
```

### User Experience Flow

1. **Email Input**:
   - User types email
   - Format validated in real-time
   - "Send OTP" button appears when valid

2. **Email OTP Sending**:
   - Loading spinner shown
   - Backend checks for duplicates
   - OTP sent via email
   - OTP input field appears

3. **Email OTP Verification**:
   - User enters 6-digit code
   - Backend validates against Redis
   - Success: Email field locked
   - Failure: Error message displayed

4. **Phone Input**:
   - User types 10-digit number
   - Auto-formatted (removes non-digits)
   - "Send OTP" button appears

5. **Phone OTP Process**:
   - Similar to email flow
   - Uses Twilio Verify
   - Phone field locked on success

---

## Security Considerations

### 1. OTP Hashing
```python
# Never store plain OTPs
hashed_otp = make_password(otp)  # Uses PBKDF2
```

**Why?**
- Prevents exposure if Redis is compromised
- Follows OWASP guidelines
- One-way hashing (cannot reverse)

### 2. OTP Expiration
```python
# 5-minute timeout
set_cache('otp_cache', email, hashed_otp, timeout=300)
```

### 3. One-Time Use
```python
# Delete after successful verification
delete_cache('otp_cache', email)
```

### 4. Rate Limiting
**Recommendation:** Add throttling to prevent abuse

```python
# Example using Django REST Framework
from rest_framework.throttling import AnonRateThrottle

class SendOTPView(View):
    throttle_classes = [AnonRateThrottle]  # 100/hour
```

### 5. CSRF Protection
```javascript
// Always include CSRF token
headers: {
    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
}
```

### 6. Input Validation
```python
# Backend validation
if not email:
    return JsonResponse({"error": "Email is required."}, status=400)

# Check email format (Django validators)
from django.core.validators import validate_email
validate_email(email)  # Raises ValidationError if invalid
```

### 7. Duplicate Prevention
```python
# Check if user already exists
if CustomUser.objects.filter(email=email).exists():
    return JsonResponse({"status": "error", "message": "Email already registered."})
```

---

## Troubleshooting

### Common Issues

#### 1. Redis Connection Error
```
redis.exceptions.ConnectionError: Error connecting to Redis
```

**Solution:**
```bash
# Check if Redis is running
redis-cli ping

# Start Redis
redis-server

# Check connection string
REDIS_OTP_URL=redis://127.0.0.1:6379/1
```

#### 2. Email Not Sending (SMTP)
```
smtplib.SMTPAuthenticationError: (535, b'5.7.8 Username and Password not accepted')
```

**Solution:**
- Use Gmail App Password (not account password)
- Enable "Less secure app access" (not recommended)
- Check EMAIL_HOST_USER and EMAIL_HOST_PASSWORD

#### 3. Twilio Error
```
TwilioRestException: [HTTP 401] Unable to create record: Account not found
```

**Solution:**
- Verify TWILIO_ACCOUNT_SID
- Verify TWILIO_AUTH_TOKEN
- Check Twilio account balance
- Ensure Verify Service is created

#### 4. OTP Always Invalid
```
{"status": "error", "message": "Invalid OTP"}
```

**Solution:**
```python
# Check if OTP is being stored
stored_otp = get_cache('otp_cache', email)
print(f"Stored OTP: {stored_otp}")  # Should not be None

# Check expiration
# Default is 300 seconds (5 minutes)
```

#### 5. CORS Errors (API calls fail)
```
Access to fetch at 'http://localhost:8000/api/common/otp/send/' from origin 'null' has been blocked by CORS policy
```

**Solution:**
```python
# settings.py
INSTALLED_APPS = [
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    # ...
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:8000",
]
```

#### 6. Frontend Button Not Appearing
```javascript
// Check console for errors
console.log(emailInput);  // Should not be null
console.log(sendOtpBtn);  // Should not be null

// Ensure IDs match
<input id="email">  // HTML
const emailInput = document.getElementById('email');  // JS
```

---

## Advanced Features

### 1. Email Verification on Registration

```python
# views.py (registration)

def register(request):
    email = request.POST.get('email')
    email_status = request.POST.get('email-status')
    
    # Ensure email was verified
    if email_status != 'valid':
        return JsonResponse({
            "status": "error",
            "message": "Please verify your email first"
        })
    
    # Create user
    user = CustomUser.objects.create_user(
        email=email,
        is_email_verified=True  # Mark as verified
    )
```

### 2. Resend OTP with Cooldown

```javascript
// Prevent spam clicking
let canResend = true;
let cooldownSeconds = 60;

function resendOTP() {
    if (!canResend) {
        Swal.fire({
            icon: 'warning',
            title: 'Please Wait',
            text: `You can resend OTP in ${cooldownSeconds} seconds`
        });
        return;
    }
    
    // Send OTP
    sendOTP();
    
    // Start cooldown
    canResend = false;
    const countdown = setInterval(() => {
        cooldownSeconds--;
        if (cooldownSeconds <= 0) {
            canResend = true;
            cooldownSeconds = 60;
            clearInterval(countdown);
        }
    }, 1000);
}
```

### 3. International Phone Numbers

```python
# Modify phone validation for international support
def send_otp_to_mobile(self, phone, country_code="+91"):
    full_number = f"{country_code}{phone}"
    verification = self.client.verify \
        .v2 \
        .services(self.service_sid) \
        .verifications \
        .create(to=full_number, channel="sms")
```

```html
<!-- Add country code selector -->
<select id="country-code">
    <option value="+91">+91 (India)</option>
    <option value="+1">+1 (USA)</option>
    <option value="+44">+44 (UK)</option>
</select>
<input type="tel" id="mobile">
```

### 4. Audit Logging

```python
# Log all OTP attempts
class OTPAttempt(models.Model):
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    attempt_type = models.CharField(max_length=10)  # 'send' or 'verify'
    success = models.BooleanField(default=False)
    ip_address = models.GenericIPAddressField()
    timestamp = models.DateTimeField(auto_now_add=True)

# In views
def send_otp(request):
    # ... existing code ...
    OTPAttempt.objects.create(
        email=email,
        attempt_type='send',
        success=True,
        ip_address=request.META.get('REMOTE_ADDR')
    )
```

---

## Testing

### Unit Tests

```python
# tests.py

from django.test import TestCase, Client
from backend.utils.helpers import generate_otp, send_otp
from backend.users.models import CustomUser

class OTPTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        
    def test_generate_otp(self):
        otp = generate_otp()
        self.assertEqual(len(otp), 6)
        self.assertTrue(otp.isdigit())
    
    def test_send_otp_success(self):
        response = self.client.post('/api/common/otp/send/', 
            {'email': 'test@example.com'},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'success')
    
    def test_duplicate_email(self):
        CustomUser.objects.create_user(
            username='test',
            email='existing@example.com'
        )
        response = self.client.post('/api/common/otp/send/',
            {'email': 'existing@example.com'},
            content_type='application/json'
        )
        data = response.json()
        self.assertEqual(data['status'], 'error')
        self.assertIn('already registered', data['message'])
```

### Manual Testing Checklist

- [ ] Valid email shows "Send OTP" button
- [ ] Invalid email hides "Send OTP" button
- [ ] OTP email received within 30 seconds
- [ ] Correct OTP validates successfully
- [ ] Incorrect OTP shows error
- [ ] Expired OTP (>5 min) shows error
- [ ] Email field locks after verification
- [ ] Valid 10-digit mobile shows button
- [ ] SMS received with OTP
- [ ] Mobile OTP validates correctly
- [ ] Both verifications required for registration
- [ ] Duplicate email prevention works
- [ ] Duplicate phone prevention works
- [ ] Resend OTP functionality works

---

## Performance Optimization

### 1. Redis Connection Pooling

```python
# settings.py
CACHES = {
    'otp_cache': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': CONFIG.REDIS_OTP_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True
            }
        }
    }
}
```

### 2. Async Email Sending

```python
# Use Celery for background tasks
from celery import shared_task

@shared_task
def send_otp_async(email):
    otp_response = send_otp(email)
    return otp_response

# In views
def post(self, request):
    email = request.POST.get('email')
    send_otp_async.delay(email)  # Non-blocking
    return JsonResponse({"status": "success"})
```

---

## Deployment Checklist

- [ ] Set DEBUG=False in production
- [ ] Use strong SECRET_KEY
- [ ] Configure ALLOWED_HOSTS
- [ ] Set up SSL/TLS (HTTPS)
- [ ] Use environment variables for secrets
- [ ] Configure production Redis (not localhost)
- [ ] Set up email provider (SendGrid recommended)
- [ ] Fund Twilio account
- [ ] Enable rate limiting
- [ ] Set up monitoring (Sentry)
- [ ] Configure CORS properly
- [ ] Implement logging
- [ ] Set up backups for Redis
- [ ] Test email deliverability
- [ ] Test SMS delivery in target countries

---

## Additional Resources

### Documentation Links
- [Django Redis](https://github.com/jazzband/django-redis)
- [Twilio Verify API](https://www.twilio.com/docs/verify/api)
- [SendGrid Python](https://github.com/sendgrid/sendgrid-python)
- [SweetAlert2](https://sweetalert2.github.io/)

### Related Files in This Project
- [backend/common/views.py](backend/common/views.py) - OTP view handlers
- [backend/utils/helpers.py](backend/utils/helpers.py) - Helper functions
- [services/twilio/twilio.py](services/twilio/twilio.py) - Twilio integration
- [services/mailing/__init__.py](services/mailing/__init__.py) - Email service
- [static/services_app/js/register.js](static/services_app/js/register.js) - Frontend logic
- [config_env.py](config_env.py) - Configuration settings

---

## Summary

This system provides:
- ✅ **Secure OTP verification** for email and phone
- ✅ **Redis-based caching** for performance
- ✅ **Twilio integration** for reliable SMS delivery
- ✅ **Flexible email** options (SMTP/SendGrid)
- ✅ **User-friendly UI** with real-time validation
- ✅ **Production-ready** architecture
- ✅ **Comprehensive error handling**
- ✅ **Easy integration** into existing projects

**Total Implementation Time**: ~2-3 hours  
**Lines of Code**: ~1,200 (backend + frontend)  
**External Services Required**: Redis, Twilio, Email Provider

---

## License
This implementation follows standard Django practices and can be freely used in your projects.

## Support
For issues or questions:
1. Check the Troubleshooting section
2. Review Django/Twilio/Redis documentation
3. Test with the provided examples

**Last Updated**: December 2025  
**Django Version**: 5.1.7  
**Python Version**: 3.10+
