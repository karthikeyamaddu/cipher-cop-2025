#!/usr/bin/env python3
"""
Test complete email verification flow
"""
import requests
import json

def test_complete_flow():
    """Test the complete verification flow"""
    
    print("🔍 Testing Complete Email Verification Flow")
    print("=" * 50)
    
    # Step 1: Test Flask service directly
    print("\n1. Testing Flask service (port 5009)...")
    try:
        response = requests.get("http://localhost:5009/health")
        print(f"   ✅ Flask Health: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   ❌ Flask Error: {e}")
        return
    
    # Step 2: Test Node.js backend health
    print("\n2. Testing Node.js backend (port 5001)...")
    try:
        response = requests.get("http://localhost:5001/")
        print(f"   ✅ Node.js Health: {response.status_code}")
        print(f"   Response: {response.text[:50]}...")
    except Exception as e:
        print(f"   ❌ Node.js Error: {e}")
        return
    
    # Step 3: Test verification endpoint (will fail without auth)
    print("\n3. Testing verification endpoint (should get 401)...")
    try:
        response = requests.post("http://localhost:5001/api/user/send-email-otp",
                               json={"email": "test@example.com"})
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text}")
        
        if response.status_code == 401:
            print("   ✅ Endpoint exists and requires authentication (expected)")
        else:
            print("   ❌ Unexpected response")
            
    except Exception as e:
        print(f"   ❌ Endpoint Error: {e}")
    
    print("\n💡 Next Steps:")
    print("   1. Go to http://localhost:5173/profile")
    print("   2. Login if not already logged in")
    print("   3. Go to Security tab")
    print("   4. Click 'Verify Email' button")
    print("   5. Check browser console (F12) for any errors")
    print("   6. Check Node.js backend console for debug logs")

if __name__ == "__main__":
    test_complete_flow()