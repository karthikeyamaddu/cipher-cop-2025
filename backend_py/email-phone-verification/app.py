import os
import json
import random
import string
import hashlib
import smtplib
import redis
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Redis connection for OTP storage
try:
    redis_client = redis.Redis(
        host=os.getenv('REDIS_HOST', 'localhost'),
        port=int(os.getenv('REDIS_PORT', 6379)),
        db=int(os.getenv('REDIS_OTP_DB', 1)),  # Use separate DB for OTP
        decode_responses=True
    )
    redis_client.ping()
    print("✅ Redis connected successfully")
except Exception as e:
    print(f"❌ Redis connection failed: {e}")
    redis_client = None

# Twilio client
twilio_client = None
if os.getenv('TWILIO_ACCOUNT_SID') and os.getenv('TWILIO_AUTH_TOKEN'):
    try:
        twilio_client = Client(
            os.getenv('TWILIO_ACCOUNT_SID'),
            os.getenv('TWILIO_AUTH_TOKEN')
        )
        print("✅ Twilio client initialized")
    except Exception as e:
        print(f"❌ Twilio initialization failed: {e}")

def generate_otp():
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def hash_otp(otp):
    """Hash OTP using SHA-256 for secure storage"""
    return hashlib.sha256(otp.encode()).hexdigest()

def store_otp(key, otp, expiry_minutes=5):
    """Store hashed OTP in Redis with expiration"""
    if not redis_client:
        return False
    
    try:
        hashed_otp = hash_otp(otp)
        redis_client.setex(key, expiry_minutes * 60, hashed_otp)
        return True
    except Exception as e:
        print(f"Error storing OTP: {e}")
        return False

def verify_otp(key, otp):
    """Verify OTP against stored hash"""
    if not redis_client:
        return False
    
    try:
        stored_hash = redis_client.get(key)
        if not stored_hash:
            return False
        
        input_hash = hash_otp(otp)
        if input_hash == stored_hash:
            # Delete OTP after successful verification (one-time use)
            redis_client.delete(key)
            return True
        return False
    except Exception as e:
        print(f"Error verifying OTP: {e}")
        return False

def send_email_otp(email, otp):
    """Send OTP via email using SMTP"""
    try:
        # Email configuration
        smtp_server = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('EMAIL_PORT', 587))
        smtp_user = os.getenv('EMAIL_HOST_USER')
        smtp_password = os.getenv('EMAIL_HOST_PASSWORD')
        from_email = os.getenv('DEFAULT_FROM_EMAIL', smtp_user)
        
        if not smtp_user or not smtp_password:
            print("❌ Email credentials not configured")
            return False
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = email
        msg['Subject'] = "CipherCop - Email Verification Code"
        
        # Email body
        body = f"""
        <html>
        <body>
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Email Verification</h2>
                <p>Your verification code for CipherCop is:</p>
                <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
                    {otp}
                </div>
                <p>This code will expire in 5 minutes.</p>
                <p>If you didn't request this verification, please ignore this email.</p>
                <hr>
                <p style="color: #666; font-size: 12px;">CipherCop Security Platform</p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Email sent to {email}")
        return True
        
    except Exception as e:
        print(f"❌ Email sending failed: {e}")
        return False

# Note: Using Twilio Verify Service directly in endpoints
# No need for separate SMS function

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'message': 'Email/Phone verification service is running',
        'services': {
            'redis': redis_client is not None,
            'twilio': twilio_client is not None,
            'email': bool(os.getenv('EMAIL_HOST_USER'))
        }
    })

@app.route('/send-email-otp', methods=['POST'])
def send_email_otp_endpoint():
    """Send OTP to email"""
    try:
        data = request.get_json()
        if not data or 'email' not in data:
            return jsonify({
                'success': False,
                'error': 'Email is required'
            }), 400
        
        email = data['email'].strip().lower()
        
        # Validate email format
        if '@' not in email or '.' not in email:
            return jsonify({
                'success': False,
                'error': 'Invalid email format'
            }), 400
        
        # Generate and store OTP
        otp = generate_otp()
        otp_key = f"email_otp:{email}"
        
        if not store_otp(otp_key, otp):
            return jsonify({
                'success': False,
                'error': 'Failed to store OTP'
            }), 500
        
        # Send email
        if send_email_otp(email, otp):
            return jsonify({
                'success': True,
                'message': 'OTP sent to your email successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to send email'
            }), 500
            
    except Exception as e:
        print(f"Error in send_email_otp_endpoint: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@app.route('/verify-email-otp', methods=['POST'])
def verify_email_otp_endpoint():
    """Verify email OTP"""
    try:
        data = request.get_json()
        if not data or 'email' not in data or 'otp' not in data:
            return jsonify({
                'success': False,
                'error': 'Email and OTP are required'
            }), 400
        
        email = data['email'].strip().lower()
        otp = data['otp'].strip()
        
        # Validate OTP format
        if not otp.isdigit() or len(otp) != 6:
            return jsonify({
                'success': False,
                'error': 'Invalid OTP format'
            }), 400
        
        # Verify OTP
        otp_key = f"email_otp:{email}"
        if verify_otp(otp_key, otp):
            return jsonify({
                'success': True,
                'message': 'Email verified successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid or expired OTP'
            }), 400
            
    except Exception as e:
        print(f"Error in verify_email_otp_endpoint: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@app.route('/send-phone-otp', methods=['POST'])
def send_phone_otp_endpoint():
    """Send OTP to phone using Twilio Verify Service"""
    try:
        data = request.get_json()
        if not data or 'phone' not in data:
            return jsonify({
                'success': False,
                'error': 'Phone number is required'
            }), 400
        
        phone = data['phone'].strip()
        
        # Validate phone format (basic validation)
        if not phone.isdigit() or len(phone) < 10:
            return jsonify({
                'success': False,
                'error': 'Invalid phone number format'
            }), 400
        
        # Format phone number (ensure it starts with +)
        if not phone.startswith('+'):
            phone = '+91' + phone  # Default to India, can be made configurable
        
        # Use Twilio Verify Service (no need to generate our own OTP)
        if not twilio_client:
            return jsonify({
                'success': False,
                'error': 'SMS service not configured'
            }), 500
        
        verify_service_sid = os.getenv('TWILIO_VERIFY_SERVICE_SID')
        if not verify_service_sid:
            return jsonify({
                'success': False,
                'error': 'SMS service not configured'
            }), 500
        
        try:
            verification = twilio_client.verify \
                .v2 \
                .services(verify_service_sid) \
                .verifications \
                .create(to=phone, channel='sms')
            
            print(f"✅ SMS sent to {phone}, Status: {verification.status}")
            return jsonify({
                'success': True,
                'message': 'OTP sent to your phone successfully'
            })
            
        except TwilioRestException as e:
            print(f"❌ Twilio error: {e}")
            error_message = str(e)
            if 'unverified' in error_message.lower():
                return jsonify({
                    'success': False,
                    'error': 'Trial account limitation: Phone number must be verified in Twilio console first'
                }), 400
            else:
                return jsonify({
                    'success': False,
                    'error': 'Failed to send SMS'
                }), 500
            
    except Exception as e:
        print(f"Error in send_phone_otp_endpoint: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@app.route('/verify-phone-otp', methods=['POST'])
def verify_phone_otp_endpoint():
    """Verify phone OTP"""
    try:
        data = request.get_json()
        if not data or 'phone' not in data or 'otp' not in data:
            return jsonify({
                'success': False,
                'error': 'Phone number and OTP are required'
            }), 400
        
        phone = data['phone'].strip()
        otp = data['otp'].strip()
        
        # Validate OTP format
        if not otp.isdigit() or len(otp) != 6:
            return jsonify({
                'success': False,
                'error': 'Invalid OTP format'
            }), 400
        
        # Format phone number (ensure it starts with +)
        if not phone.startswith('+'):
            phone = '+91' + phone  # Default to India, can be made configurable
        
        # Use Twilio Verify Service to verify OTP
        if not twilio_client:
            return jsonify({
                'success': False,
                'error': 'SMS service not configured'
            }), 500
        
        verify_service_sid = os.getenv('TWILIO_VERIFY_SERVICE_SID')
        if not verify_service_sid:
            return jsonify({
                'success': False,
                'error': 'SMS service not configured'
            }), 500
        
        try:
            verification_check = twilio_client.verify \
                .v2 \
                .services(verify_service_sid) \
                .verification_checks \
                .create(to=phone, code=otp)
            
            if verification_check.status == 'approved':
                print(f"✅ Phone verified: {phone}")
                return jsonify({
                    'success': True,
                    'message': 'Phone number verified successfully'
                })
            else:
                print(f"❌ Phone verification failed: {phone}, Status: {verification_check.status}")
                return jsonify({
                    'success': False,
                    'error': 'Invalid or expired OTP'
                }), 400
                
        except TwilioRestException as e:
            print(f"❌ Twilio verification error: {e}")
            error_message = str(e)
            if 'not found' in error_message.lower() or 'expired' in error_message.lower():
                return jsonify({
                    'success': False,
                    'error': 'Invalid or expired OTP'
                }), 400
            else:
                return jsonify({
                    'success': False,
                    'error': 'Verification failed'
                }), 400
            
    except Exception as e:
        print(f"Error in verify_phone_otp_endpoint: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5009))
    print("=" * 60)
    print("Email & Phone Verification Service")
    print("=" * 60)
    print(f"Server starting on port {port}...")
    print(f"Health check: http://localhost:{port}/health")
    print(f"Send Email OTP: POST http://localhost:{port}/send-email-otp")
    print(f"Verify Email OTP: POST http://localhost:{port}/verify-email-otp")
    print(f"Send Phone OTP: POST http://localhost:{port}/send-phone-otp")
    print(f"Verify Phone OTP: POST http://localhost:{port}/verify-phone-otp")
    print("=" * 60)
    
    app.run(host="0.0.0.0", port=port, debug=(os.getenv("FLASK_ENV") == "development"))