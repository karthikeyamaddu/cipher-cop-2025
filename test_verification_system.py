#!/usr/bin/env python3
"""
Email & Phone Verification System - Complete Test Script
Tests all components to ensure 100% functionality before user testing
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5001"
FLASK_URL = "http://localhost:5009"

class VerificationTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, message=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        timestamp = datetime.now().strftime("%H:%M:%S")
        result = f"[{timestamp}] {status} - {test_name}"
        if message:
            result += f": {message}"
        print(result)
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'timestamp': timestamp
        })
        
    def test_flask_service_health(self):
        """Test Flask service health endpoint"""
        try:
            response = self.session.get(f"{FLASK_URL}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    services = data.get('services', {})
                    redis_ok = services.get('redis', False)
                    twilio_ok = services.get('twilio', False)
                    email_ok = services.get('email', False)
                    
                    self.log_test("Flask Service Health", True, 
                                f"Redis: {redis_ok}, Twilio: {twilio_ok}, Email: {email_ok}")
                    return True
                else:
                    self.log_test("Flask Service Health", False, "Service not ready")
                    return False
            else:
                self.log_test("Flask Service Health", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Flask Service Health", False, str(e))
            return False
            
    def test_node_backend_health(self):
        """Test Node.js backend health"""
        try:
            response = self.session.get(f"{BASE_URL}/api/health", timeout=10)
            if response.status_code == 200:
                self.log_test("Node.js Backend Health", True, "Backend responding")
                return True
            else:
                self.log_test("Node.js Backend Health", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            # Try alternative endpoint
            try:
                response = self.session.get(f"{BASE_URL}/checkAuth", timeout=10)
                if response.status_code in [200, 401]:  # 401 is expected without auth
                    self.log_test("Node.js Backend Health", True, "Backend responding (via auth check)")
                    return True
                else:
                    self.log_test("Node.js Backend Health", False, f"HTTP {response.status_code}")
                    return False
            except Exception as e2:
                self.log_test("Node.js Backend Health", False, str(e2))
                return False
                
    def test_verification_endpoints_exist(self):
        """Test that verification endpoints exist (without auth)"""
        endpoints = [
            "/api/user/verification-status",
            "/api/user/send-email-otp", 
            "/api/user/verify-email-otp",
            "/api/user/send-phone-otp",
            "/api/user/verify-phone-otp"
        ]
        
        all_exist = True
        for endpoint in endpoints:
            try:
                response = self.session.get(f"{BASE_URL}{endpoint}", timeout=5)
                # 401 is expected for protected routes without auth
                if response.status_code == 401:
                    self.log_test(f"Endpoint {endpoint}", True, "Protected (401 expected)")
                elif response.status_code == 404:
                    self.log_test(f"Endpoint {endpoint}", False, "Not found (404)")
                    all_exist = False
                else:
                    self.log_test(f"Endpoint {endpoint}", True, f"HTTP {response.status_code}")
            except Exception as e:
                self.log_test(f"Endpoint {endpoint}", False, str(e))
                all_exist = False
                
        return all_exist
        
    def test_flask_email_otp_generation(self):
        """Test Flask service OTP generation directly"""
        try:
            test_data = {"email": "test@example.com"}
            response = self.session.post(
                f"{FLASK_URL}/send-email-otp",
                json=test_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test("Flask Email OTP Generation", True, "OTP generated successfully")
                    return True
                else:
                    self.log_test("Flask Email OTP Generation", False, data.get('error', 'Unknown error'))
                    return False
            else:
                self.log_test("Flask Email OTP Generation", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Flask Email OTP Generation", False, str(e))
            return False
            
    def test_flask_phone_otp_generation(self):
        """Test Flask service phone OTP generation directly"""
        try:
            test_data = {"phone": "1234567890"}
            response = self.session.post(
                f"{FLASK_URL}/send-phone-otp",
                json=test_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code in [200, 400]:  # 400 expected for Twilio trial limitations
                data = response.json()
                if response.status_code == 200 and data.get('success'):
                    self.log_test("Flask Phone OTP Generation", True, "OTP sent successfully")
                    return True
                elif response.status_code == 400 and 'unverified' in data.get('error', '').lower():
                    self.log_test("Flask Phone OTP Generation", True, "Twilio trial limitation (expected)")
                    return True
                else:
                    self.log_test("Flask Phone OTP Generation", False, data.get('error', 'Unknown error'))
                    return False
            else:
                self.log_test("Flask Phone OTP Generation", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Flask Phone OTP Generation", False, str(e))
            return False
            
    def test_port_configuration(self):
        """Test that services are running on correct ports"""
        ports_to_test = [
            (5001, "Node.js Backend"),
            (5009, "Flask Verification Service"),
            (5173, "Frontend (if running)")
        ]
        
        all_ports_ok = True
        for port, service_name in ports_to_test:
            try:
                if port == 5173:
                    # Frontend might not be running during backend tests
                    response = self.session.get(f"http://localhost:{port}", timeout=3)
                    if response.status_code in [200, 404]:
                        self.log_test(f"Port {port} ({service_name})", True, "Responding")
                    else:
                        self.log_test(f"Port {port} ({service_name})", False, "Not responding (optional)")
                else:
                    # Backend services should be running
                    if port == 5001:
                        response = self.session.get(f"http://localhost:{port}/checkAuth", timeout=5)
                    else:  # 5009
                        response = self.session.get(f"http://localhost:{port}/health", timeout=5)
                    
                    if response.status_code in [200, 401]:
                        self.log_test(f"Port {port} ({service_name})", True, "Responding")
                    else:
                        self.log_test(f"Port {port} ({service_name})", False, f"HTTP {response.status_code}")
                        all_ports_ok = False
            except Exception as e:
                if port == 5173:
                    self.log_test(f"Port {port} ({service_name})", True, "Not running (optional)")
                else:
                    self.log_test(f"Port {port} ({service_name})", False, str(e))
                    all_ports_ok = False
                    
        return all_ports_ok
        
    def run_all_tests(self):
        """Run all tests and return overall success"""
        print("🧪 Starting Email & Phone Verification System Tests")
        print("=" * 60)
        
        # Test 1: Port Configuration
        print("\n📡 Testing Port Configuration...")
        port_test = self.test_port_configuration()
        
        # Test 2: Flask Service Health
        print("\n🏥 Testing Flask Service Health...")
        flask_health = self.test_flask_service_health()
        
        # Test 3: Node.js Backend Health  
        print("\n🏥 Testing Node.js Backend Health...")
        node_health = self.test_node_backend_health()
        
        # Test 4: Verification Endpoints
        print("\n🔗 Testing Verification Endpoints...")
        endpoints_test = self.test_verification_endpoints_exist()
        
        # Test 5: Flask Email OTP
        print("\n📧 Testing Flask Email OTP Generation...")
        email_otp_test = self.test_flask_email_otp_generation()
        
        # Test 6: Flask Phone OTP
        print("\n📱 Testing Flask Phone OTP Generation...")
        phone_otp_test = self.test_flask_phone_otp_generation()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"✅ Passed: {passed}/{total}")
        print(f"❌ Failed: {total - passed}/{total}")
        
        if passed == total:
            print("\n🎉 ALL TESTS PASSED! System is ready for user testing.")
            return True
        else:
            print("\n⚠️  Some tests failed. Please check the issues above.")
            print("\nFailed tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['message']}")
            return False

def main():
    """Main test execution"""
    print("Email & Phone Verification System - Test Suite")
    print("Testing all components before user testing...")
    print()
    
    tester = VerificationTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🚀 SYSTEM READY FOR USER TESTING!")
        print("\nNext steps:")
        print("1. Start Redis: wsl redis-server")
        print("2. Start services: manage-services.bat (option 1)")
        print("3. Open browser: http://localhost:5173")
        print("4. Go to Profile page and test verification")
        sys.exit(0)
    else:
        print("\n🔧 PLEASE FIX ISSUES BEFORE USER TESTING")
        sys.exit(1)

if __name__ == "__main__":
    main()