# 🧪 Phase 1 - Phishing URL Queue Testing Guide

## 🎯 What We're Testing

1. ✅ **Normal endpoint** still works (`/api/phishing/analyze`)
2. ✅ **Queued endpoint** works (`/api/phishing/analyze-queued`)
3. ✅ **Worker** processes jobs
4. ✅ **Admin page** shows queue stats
5. ✅ **Frontend polling** detects completion

---

## 📋 Prerequisites

### 1. Start Redis (WSL)
```bash
# In WSL terminal
redis-server

# Or if you have a config file
redis-server /path/to/redis.conf

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### 2. Verify MongoDB is Running
```bash
# Check if MongoDB is running
# Should see it on port 27017
```

### 3. Verify Backend Dependencies
```bash
cd backend
npm list redis bull @bull-board/express ioredis
# Should show all packages installed
```

---

## 🧪 Test 1: Normal Endpoint (Baseline)

**Purpose**: Verify existing phishing endpoint still works

### Steps:
1. **Start backend**:
   ```bash
   cd backend
   npm start
   ```

2. **Test via frontend**:
   - Go to `http://localhost:5173`
   - Login
   - Go to Phishing Protection page
   - Enter URL: `https://google.com`
   - Click "Analyze URL"
   - **Expected**: Results appear after ~10-30 seconds

3. **Verify in database**:
   ```javascript
   // MongoDB
   db.testresults.find().sort({createdAt: -1}).limit(1)
   
   // Should see:
   {
     testType: 'phishing-url',
     processingStatus: 'queued', // Default from Phase 0
     result: { isPhishing: false, riskScore: ... }
   }
   ```

**✅ Pass Criteria**:
- Analysis completes successfully
- Results display in frontend
- Test saved to database

---

## 🧪 Test 2: Queued Endpoint (New)

**Purpose**: Verify new queued endpoint works

### Steps:

#### 2.1: Start Worker
```bash
# Terminal 1 - Worker
cd backend
node src/workers/phishingWorker.js

# Should see:
# ✅ Phishing Worker: MongoDB connected
# 🚀 Phishing Worker started and listening for jobs...
```

#### 2.2: Start Backend
```bash
# Terminal 2 - Backend
cd backend
npm start

# Should see:
# ✅ Queue system initialized
# ✅ Bull Board available at: http://localhost:5001/admin/queues
# ✅ Admin API available at: http://localhost:5001/api/admin/*
# Server running at http://localhost:5001/
```

#### 2.3: Test via cURL
```bash
# Terminal 3 - Test
# First login to get JWT cookie
curl -X POST http://localhost:5001/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  -c cookies.txt

# Then test queued endpoint
curl -X POST http://localhost:5001/api/phishing/analyze-queued \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"url":"https://google.com"}'

# Expected response:
{
  "success": true,
  "message": "Analysis queued successfully",
  "data": {
    "testId": "675456789abcdef123456789",
    "queuePosition": 1,
    "status": "queued",
    "estimatedWaitTime": 30
  }
}
```

#### 2.4: Watch Worker Logs
```bash
# In Terminal 1 (worker), you should see:
🔍 [Phishing Worker] Processing job 1 for test 675456789abcdef123456789
⚙️ [Phishing Worker] Analyzing URL: https://google.com
✅ [Phishing Worker] Analysis complete. Risk: 15
💾 [Phishing Worker] Results saved for test 675456789abcdef123456789
✅ [Phishing] Job 1 completed
```

#### 2.5: Check Status Endpoint
```bash
# Use testId from step 2.3
curl -X GET "http://localhost:5001/api/tests/:testId/status" \
  -b cookies.txt

# While queued:
{
  "success": true,
  "status": "queued",
  "queuePosition": 1,
  "createdAt": "2025-12-07T..."
}

# While processing:
{
  "success": true,
  "status": "processing",
  "createdAt": "2025-12-07T..."
}

# When completed:
{
  "success": true,
  "status": "completed",
  "result": { /* full test result */ },
  "createdAt": "2025-12-07T..."
}
```

**✅ Pass Criteria**:
- Job queues successfully
- Worker picks up job
- Status updates (queued → processing → completed)
- Result saved to database

---

## 🧪 Test 3: Admin Dashboard

**Purpose**: Verify admin monitoring works

### Steps:

#### 3.1: Access Bull Board UI
```bash
# Open in browser:
http://localhost:5001/admin/queues

# Should see:
- 4 queues listed (phishing-analysis, clone-detection, malware-analysis, scam-detection)
- Job counts (waiting, active, completed, failed)
- Recent jobs list
- Can click on jobs to see details
```

#### 3.2: Test Admin API
```bash
# Get queue stats
curl -X GET http://localhost:5001/api/admin/stats \
  -b cookies.txt

# Expected response:
{
  "success": true,
  "data": {
    "queues": [
      {
        "name": "phishing",
        "waiting": 0,
        "active": 0,
        "completed": 1,
        "failed": 0,
        "delayed": 0,
        "total": 1
      },
      // ... other queues
    ],
    "database": {
      "queued": 0,
      "processing": 0,
      "completed": 1,
      "failed": 0
    }
  }
}

# Get recent jobs
curl -X GET "http://localhost:5001/api/admin/recent-jobs?limit=10" \
  -b cookies.txt

# Get active jobs
curl -X GET http://localhost:5001/api/admin/active-jobs \
  -b cookies.txt
```

**✅ Pass Criteria**:
- Bull Board UI accessible
- Shows correct queue stats
- Admin API returns data
- Can see completed jobs

---

## 🧪 Test 4: Concurrent Job Limit

**Purpose**: Verify max 3 concurrent jobs enforced

### Steps:

```bash
# Submit 3 jobs quickly
curl -X POST http://localhost:5001/api/phishing/analyze-queued \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"url":"https://google.com"}' &

curl -X POST http://localhost:5001/api/phishing/analyze-queued \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"url":"https://facebook.com"}' &

curl -X POST http://localhost:5001/api/phishing/analyze-queued \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"url":"https://twitter.com"}' &

# All 3 should succeed

# Try 4th job immediately
curl -X POST http://localhost:5001/api/phishing/analyze-queued \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"url":"https://linkedin.com"}'

# Expected response:
{
  "success": false,
  "error": "Maximum 3 concurrent analyses allowed. Please wait for existing analyses to complete."
}
```

**✅ Pass Criteria**:
- First 3 jobs queue successfully
- 4th job rejected with 429 status
- Error message clear

---

## 🧪 Test 5: Frontend Polling

**Purpose**: Verify frontend can poll and detect completion

### Steps:

#### 5.1: Update Frontend (Temporary Test)
Add to `PhishingPage.jsx`:

```javascript
import { useTestPolling } from '../hooks/useTestPolling';

// Inside component
const [testId, setTestId] = useState(null);
const { status, result, queuePosition, error } = useTestPolling(
  testId,
  (result) => {
    console.log('✅ Test completed!', result);
    alert('Analysis complete!');
  }
);

// After submitting to queued endpoint
const response = await fetch('http://localhost:5001/api/phishing/analyze-queued', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ url })
});
const data = await response.json();
setTestId(data.data.testId); // Start polling

// Display status
{testId && (
  <div className="p-4 bg-blue-50 rounded">
    <p>Status: {status}</p>
    {queuePosition && <p>Queue Position: {queuePosition}</p>}
    {error && <p className="text-red-600">Error: {error}</p>}
  </div>
)}
```

#### 5.2: Test Flow
1. Submit URL via frontend
2. Should see "Status: queued" immediately
3. Should see queue position
4. Status updates to "processing"
5. Status updates to "completed"
6. Alert appears
7. Results display

**✅ Pass Criteria**:
- Polling starts automatically
- Status updates visible
- Alert appears on completion
- Results display correctly

---

## 🧪 Test 6: Error Handling

**Purpose**: Verify errors handled gracefully

### Test 6.1: Invalid URL
```bash
curl -X POST http://localhost:5001/api/phishing/analyze-queued \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"url":"not-a-url"}'

# Expected:
{
  "success": false,
  "error": "Invalid URL or domain format"
}
```

### Test 6.2: Worker Failure
```bash
# Stop worker (Ctrl+C in Terminal 1)
# Submit job
curl -X POST http://localhost:5001/api/phishing/analyze-queued \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"url":"https://google.com"}'

# Job should queue but not process
# Check status - should stay "queued"

# Restart worker
node src/workers/phishingWorker.js

# Worker should pick up pending job
```

**✅ Pass Criteria**:
- Invalid URLs rejected
- Jobs wait for worker
- Worker processes pending jobs on restart

---

## 📊 Complete Test Checklist

### Setup:
- [ ] Redis running in WSL
- [ ] MongoDB running
- [ ] Backend dependencies installed

### Test 1: Normal Endpoint
- [ ] Existing endpoint works
- [ ] Results appear
- [ ] Saved to database

### Test 2: Queued Endpoint
- [ ] Worker starts successfully
- [ ] Job queues
- [ ] Worker processes job
- [ ] Status updates correctly
- [ ] Result saved

### Test 3: Admin Dashboard
- [ ] Bull Board UI accessible
- [ ] Shows queue stats
- [ ] Admin API works
- [ ] Can see jobs

### Test 4: Concurrent Limit
- [ ] 3 jobs allowed
- [ ] 4th job rejected
- [ ] Error message clear

### Test 5: Frontend Polling
- [ ] Polling starts
- [ ] Status updates
- [ ] Completion detected
- [ ] Results display

### Test 6: Error Handling
- [ ] Invalid URLs rejected
- [ ] Worker failures handled
- [ ] Jobs resume after restart

---

## 🐛 Troubleshooting

### Redis Connection Failed
```bash
# Check Redis is running
redis-cli ping

# Check Redis port
netstat -an | grep 6379

# Try connecting manually
redis-cli
> ping
PONG
```

### Worker Not Processing
```bash
# Check worker logs for errors
# Verify MongoDB connection
# Check queue has jobs:
redis-cli
> KEYS bull:phishing-analysis:*
```

### Bull Board Not Loading
```bash
# Verify backend started successfully
# Check http://localhost:5001/admin/queues
# Check browser console for errors
```

---

## ✅ Success Criteria

**Phase 1 Phishing is complete when**:
- ✅ All 6 tests pass
- ✅ Normal endpoint still works
- ✅ Queued endpoint works
- ✅ Worker processes jobs
- ✅ Admin dashboard shows stats
- ✅ Frontend polling works
- ✅ Errors handled gracefully

---

**Ready to test!** 🚀

Start with Test 1, then move through each test in order.
