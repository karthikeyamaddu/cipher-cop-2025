#!/usr/bin/env python3
"""
Quick test script for email/phone verification service
"""
import requests
import json

BASE_URL = "http://localhost:5008"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print("🔍 Health Check:")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_email_otp():
    """Test email OTP sending"""
    try:
        data = {"email": "test@example.com"}
        response = requests.post(f"{BASE_URL}/send-email-otp", json=data)
        print("\n📧 Email OTP Test:")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Email OTP test failed: {e}")
        return False

def test_phone_otp():
    """Test phone OTP sending"""
    try:
        data = {"phone": "9876543210"}
        response = requests.post(f"{BASE_URL}/send-phone-otp", json=data)
        print("\n📱 Phone OTP Test:")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Phone OTP test failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing Email & Phone Verification Service")
    print("=" * 50)
    
    # Test health
    health_ok = test_health()
    
    if health_ok:
        # Test email OTP (will fail gracefully if email not configured)
        test_email_otp()
        
        # Test phone OTP (will fail gracefully if phone not configured)
        test_phone_otp()
    
    print("\n✅ Test completed!")
    print("💡 To test full flow, go to: http://localhost:5173/profile")