#!/usr/bin/env python3
"""
Test Node.js verification endpoints
"""
import requests
import json

# You'll need to get a valid JWT token from browser cookies
# This is just to test if the endpoints are reachable

def test_node_endpoints():
    """Test Node.js verification endpoints"""
    base_url = "http://localhost:5001"
    
    # Test without authentication (should get 401)
    print("🔍 Testing Node.js verification endpoints...")
    
    try:
        # Test send email OTP endpoint
        response = requests.post(f"{base_url}/api/user/send-email-otp", 
                               json={"email": "test@example.com"})
        print(f"Send Email OTP - Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Test verify email OTP endpoint  
        response = requests.post(f"{base_url}/api/user/verify-email-otp",
                               json={"email": "test@example.com", "otp": "123456"})
        print(f"Verify Email OTP - Status: {response.status_code}")
        print(f"Response: {response.text}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_node_endpoints()