@echo off
echo ========================================
echo CipherCop All Features Storage Test
echo ========================================
echo.

echo Step 1: Login to get authentication cookie...
curl -X POST http://localhost:5001/login -H "Content-Type: application/json" -c test-cookies.txt -d "{\"email\": \"testuser@ciphercop.com\", \"password\": \"test123456\"}"
echo.
echo.

echo ========================================
echo Testing Email Phishing Storage...
echo ========================================
curl -X POST http://localhost:5001/api/phishing/analyze-email-store -H "Content-Type: application/json" -b test-cookies.txt -d "{\"emailData\": {\"subject\": \"Urgent Account Alert\", \"senderEmail\": \"security@suspicious.com\", \"senderDomain\": \"suspicious.com\", \"hasAttachment\": true, \"urgentKeywords\": true}, \"mlResult\": {\"prediction\": \"phishing\", \"probability\": 0.95, \"confidence\": 0.92, \"features_used\": {\"urgent_keywords\": 5, \"links_count\": 3}}}"
echo.
echo.

echo ========================================
echo Testing Clone Detection Storage...
echo ========================================
curl -X POST http://localhost:5001/api/clone/store -H "Content-Type: application/json" -b test-cookies.txt -d "{\"url\": \"https://fake-paypal.com\", \"analysisType\": \"combined\", \"mlData\": {\"result\": \"Phishing\", \"matched_brand\": \"PayPal\", \"confidence\": 0.95, \"correct_domain\": \"paypal.com\"}, \"aiData\": {\"decision\": \"clone\", \"score\": 85}}"
echo.
echo.

echo ========================================
echo Testing Scam Phone Storage...
echo ========================================
curl -X POST http://localhost:5001/api/scam/store -H "Content-Type: application/json" -b test-cookies.txt -d "{\"phoneNumber\": \"+1-555-123-4567\", \"score\": 85, \"verdict\": \"likely_scam\", \"providers\": [\"ipqs\", \"twilio\"], \"enhancedAnalysis\": {\"confidence\": 0.88}, \"reportsCount\": 15}"
echo.
echo.

echo ========================================
echo Testing Malware Storage...
echo ========================================
curl -X POST http://localhost:5001/api/malware/store -H "Content-Type: application/json" -b test-cookies.txt -d "{\"fileName\": \"suspicious.exe\", \"testType\": \"malware-virustotal\", \"fileHash\": \"abc123\", \"fileSize\": 1024000, \"result\": {\"positives\": 15, \"total\": 67, \"detections\": [{\"engine\": \"Kaspersky\", \"result\": \"Trojan\"}]}}"
echo.
echo.

echo ========================================
echo Getting Test History...
echo ========================================
curl -X GET "http://localhost:5001/api/tests/history?limit=20" -b test-cookies.txt
echo.
echo.

echo ========================================
echo Getting Test Statistics...
echo ========================================
curl -X GET http://localhost:5001/api/tests/stats -b test-cookies.txt
echo.
echo.

echo ========================================
echo Test Complete!
echo.
echo Check MongoDB Atlas to verify:
echo 1. Email phishing test (testType: phishing-email)
echo 2. Clone detection test (testType: clone-combined)
echo 3. Scam phone test (testType: scam-phone)
echo 4. Malware test (testType: malware-virustotal)
echo.
echo All should be linked to your user via userId
echo ========================================
pause
