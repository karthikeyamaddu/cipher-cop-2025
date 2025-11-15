@echo off
echo ========================================
echo CipherCop User Feature Test Script
echo ========================================
echo.

echo Testing User Registration...
curl -X POST http://localhost:5001/signup -H "Content-Type: application/json" -d "{\"fullName\": \"Test User\", \"email\": \"testuser@ciphercop.com\", \"password\": \"test123456\"}"
echo.
echo.

echo Testing User Login...
curl -X POST http://localhost:5001/login -H "Content-Type: application/json" -c test-cookies.txt -d "{\"email\": \"testuser@ciphercop.com\", \"password\": \"test123456\"}"
echo.
echo.

echo Testing Auth Check...
curl -X GET http://localhost:5001/checkAuth -b test-cookies.txt
echo.
echo.

echo Testing User Profile...
curl -X GET http://localhost:5001/api/user/profile -b test-cookies.txt
echo.
echo.

echo ========================================
echo Test Complete!
echo Check the responses above to verify:
echo 1. User was created with _id
echo 2. Login returned user data
echo 3. Auth check shows authenticated user
echo 4. Profile shows complete user data
echo ========================================
pause
