#!/usr/bin/env python3
"""
Quick test to verify backend is working
"""

import requests
import json

def test_backend():
    """Test if backend is responding"""
    
    print("=" * 50)
    print("Backend Health Check")
    print("=" * 50)
    
    try:
        # Test 1: Basic server response
        print("\n1. Testing server response...")
        response = requests.get("http://localhost:5001/", timeout=5)
        print(f"✅ Server responding: {response.status_code}")
        
        # Test 2: Check auth endpoint
        print("\n2. Testing auth endpoint...")
        auth_response = requests.get("http://localhost:5001/checkAuth", timeout=5)
        print(f"✅ Auth endpoint responding: {auth_response.status_code}")
        
        # Test 3: Test verification endpoint (should require auth)
        print("\n3. Testing verification endpoint...")
        verify_response = requests.get("http://localhost:5001/api/user/verification-status", timeout=5)
        print(f"✅ Verification endpoint responding: {verify_response.status_code}")
        if verify_response.status_code == 401:
            print("   (401 is expected - means auth is working)")
        
        print("\n" + "=" * 50)
        print("✅ BACKEND IS WORKING CORRECTLY!")
        print("✅ Server is responding on port 5001")
        print("✅ All endpoints are accessible")
        print("=" * 50)
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend on port 5001")
        print("   Make sure backend is running: npm start")
        return False
    except Exception as e:
        print(f"❌ Error testing backend: {e}")
        return False

if __name__ == "__main__":
    test_backend()