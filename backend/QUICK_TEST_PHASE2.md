# 🚀 Quick Test Guide - Phase 2: All Features Storage

## ⚡ 3-Minute Test

### Step 1: Start Backend
```bash
cd backend
npm start
```

### Step 2: Run Test Script
```bash
test-all-features.bat
```

### Step 3: Check MongoDB Atlas
1. Go to https://cloud.mongodb.com
2. Browse Collections → `ciphercop` → `testresults`
3. Look for 4 new documents with these testTypes:
   - `phishing-email`
   - `clone-combined`
   - `scam-phone`
   - `malware-virustotal`

---

## ✅ What to Verify

### In MongoDB testresults Collection

**Document 1: Email Phishing**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,              // ✅ Should match your user
  testType: "phishing-email",    // ✅ Should be this
  inputData: {
    emailSubject: "Urgent Account Alert",
    senderEmail: "security@suspicious.com",
    hasAttachment: true
  },
  result: {
    isPhishing: true,
    threatLevel: "high",
    riskScore: 95
  },
  details: {
    mlPrediction: {...},
    suspiciousKeywords: 5,
    linkCount: 3
  }
}
```

**Document 2: Clone Detection**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,              // ✅ Should match your user
  testType: "clone-combined",    // ✅ Should be this
  inputData: {
    url: "https://fake-paypal.com"
  },
  result: {
    isClone: true,
    threatLevel: "high",
    riskScore: 85
  },
  details: {
    mlAnalysis: {...},
    geminiAnalysis: {...},
    matchedBrand: "PayPal",
    correctDomain: "paypal.com"
  }
}
```

**Document 3: Scam Phone**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,              // ✅ Should match your user
  testType: "scam-phone",        // ✅ Should be this
  inputData: {
    phoneNumberHash: "abc123..."  // ✅ Should be hashed (long string)
  },
  result: {
    isScam: true,
    threatLevel: "high",
    riskScore: 85
  },
  details: {
    providers: ["ipqs", "twilio"],
    reportsCount: 15
  }
}
```

**Document 4: Malware**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,              // ✅ Should match your user
  testType: "malware-virustotal", // ✅ Should be this
  inputData: {
    fileName: "suspicious.exe",
    fileHash: "abc123",
    fileSize: 1024000
  },
  result: {
    isMalware: true,
    positives: 15,
    total: 67,
    threatLevel: "high"
  }
}
```

---

## ✅ Success Checklist

- [ ] Backend starts without errors
- [ ] Test script runs successfully
- [ ] 4 new documents in testresults collection
- [ ] All documents have `userId` field
- [ ] All documents have correct `testType`
- [ ] Phone number is hashed (not plain text)
- [ ] Email content not stored (only subject)
- [ ] All documents link to same user

---

## 🎯 Quick Verification Commands

**Get Test History**:
```bash
curl -X GET "http://localhost:5001/api/tests/history?limit=20" -b test-cookies.txt
```

**Get Test Statistics**:
```bash
curl -X GET http://localhost:5001/api/tests/stats -b test-cookies.txt
```

**Expected Stats Response**:
```json
{
  "success": true,
  "data": {
    "totalTests": 4,
    "byType": [
      {"_id": "phishing-email", "count": 1},
      {"_id": "clone-combined", "count": 1},
      {"_id": "scam-phone", "count": 1},
      {"_id": "malware-virustotal", "count": 1}
    ]
  }
}
```

---

## 🐛 Quick Fixes

### Problem: "Unauthorized"
**Fix**: Run login command first to get cookies

### Problem: No documents in database
**Fix**: Check backend is running and MongoDB connection is working

### Problem: Phone number not hashed
**Fix**: Backend hashes automatically - this is correct behavior

### Problem: Wrong testType
**Fix**: Check endpoint is sending correct testType parameter

---

## ✅ When Everything Works

You should see:
1. ✅ 4 new test documents in MongoDB
2. ✅ All linked to same userId
3. ✅ All have correct testType
4. ✅ Phone number is hashed
5. ✅ Email content not stored
6. ✅ Test history shows all tests
7. ✅ Statistics show counts by type

**Then say**: "Phase 2 verified" and we'll move to Phase 3!

---

**Estimated Time**: 3 minutes  
**Difficulty**: Easy  
**Status**: Ready for Testing
