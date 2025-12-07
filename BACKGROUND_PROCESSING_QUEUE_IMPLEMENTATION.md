# 🚀 Background Processing & Queue System - Complete Implementation Guide

## 📋 Table of Contents
1. [What Was Before](#what-was-before)
2. [Why It Wasn't Good](#why-it-wasnt-good)
3. [What We Thought](#what-we-thought)
4. [Architecture Decision](#architecture-decision)
5. [Implementation Phases](#implementation-phases)
6. [Detailed Step-by-Step Guide](#detailed-step-by-step-guide)
7. [Testing & Verification](#testing--verification)
8. [Monitoring & Observability](#monitoring--observability)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)

---

## 🔍 What Was Before

### **Current System (Synchronous Processing)**

**Architecture:**
```
User submits test → Frontend waits → Backend calls Python service → Wait for response → Return to user
```

**How it worked:**
1. User clicks "Analyze URL" on frontend
2. Frontend sends POST request to backend
3. Backend immediately calls Python service (e.g., phishing detection on port 5008)
4. Backend waits for Python service to respond (30s - 2min)
5. Backend returns result to frontend
6. Frontend displays result

**Code Example (Before):**
```javascript
// backend/server.js
app.post('/api/phishing/analyze', protectRoute, async (req, res) => {
  const { url } = req.body;
  
  // Call Python service and WAIT
  const response = await fetch('http://localhost:5008/analyze', {
    method: 'POST',
    body: JSON.stringify({ url })
  });
  
  const result = await response.json();
  
  // Save to database
  const testResult = new TestResult({
    userId: req.user._id,
    testType: 'phishing-url',
    inputData: { url },
    result: result.result,
    details: result.details,
    status: 'completed'
  });
  
  await testResult.save();
  
  // Return to user (after 30-60 seconds)
  res.json({ success: true, data: testResult });
});
```

**Frontend (Before):**
```javascript
// frontend/src/logins/PhishingPage.jsx
const analyzeURL = async () => {
  setLoading(true); // Show spinner
  
  const response = await fetch('/api/phishing/analyze', {
    method: 'POST',
    body: JSON.stringify({ url })
  });
  
  const data = await response.json();
  
  setLoading(false); // Hide spinner
  setResult(data.data); // Show result
};
```

**Database Schema (Before):**
```javascript
// TestResult model
{
  userId: ObjectId,
  testType: String,
  inputData: Object,
  result: Object,
  details: Object,
  status: 'completed' | 'failed' | 'processing',
  viewedByUser: Boolean,
  createdAt: Date
}
```

---

## ❌ Why It Wasn't Good

### **Problem 1: Blocking UI**

**Issue:** User must stare at loading spinner for 30-120 seconds
- ❌ Phishing detection: 30-60 seconds
- ❌ Clone detection: 60-90 seconds  
- ❌ Malware scanning: 60-120 seconds
- ❌ User cannot navigate away or do anything else

**User Experience:**
```
User clicks "Analyze" → Loading... → Loading... → Loading... → Result (after 60s)
                        ↓
                   User is stuck!
```

### **Problem 2: No Concurrent Processing**
**Issue:** User can only run ONE test at a time
- ❌ Want to check phishing URL AND scan malware? Must wait for first to finish
- ❌ Want to analyze multiple URLs? Must do one by one
- ❌ No way to queue multiple jobs

**Example:**
```
User wants to:
1. Check phishing URL (60s)
2. Scan malware file (90s)
3. Detect clone website (75s)

Total time: 225 seconds (3.75 minutes) of waiting!
```

### **Problem 3: No Job Tracking**
**Issue:** If user refreshes page or navigates away, job is lost
- ❌ No way to see "in progress" jobs
- ❌ No way to resume after page refresh
- ❌ No notification when job completes

### **Problem 4: No Failure Handling**
**Issue:** If Python service crashes or times out, user gets generic error
- ❌ No retry mechanism
- ❌ No visibility into what went wrong
- ❌ No way to requeue failed jobs

### **Problem 5: No Admin Visibility**
**Issue:** No way to monitor system health
- ❌ Can't see how many jobs are running
- ❌ Can't see queue sizes
- ❌ Can't see which users are active
- ❌ Can't cancel stuck jobs
- ❌ No metrics or monitoring

### **Problem 6: Resource Management**
**Issue:** All jobs hit Python services simultaneously
- ❌ 10 users submit jobs → 10 simultaneous Python calls
- ❌ Python services get overwhelmed
- ❌ No rate limiting or concurrency control
- ❌ Can crash services under load

### **Problem 7: No Idempotency**
**Issue:** User can accidentally submit same job multiple times
- ❌ Click "Analyze" twice → Two identical jobs
- ❌ Wastes resources
- ❌ Duplicate results in database

---

## 💡 What We Thought

### **Initial Ideas Considered:**

#### **Option 1: Simple Polling (Original Plan)**
```
Create TestResult with status='pending' → Poll every 5s → Update when done
```
**Pros:** Simple, no new dependencies
**Cons:** No queue management, no concurrency control, jobs lost on restart

#### **Option 2: WebSockets for Everything**
```
User submits → WebSocket connection → Real-time updates → Result pushed to client
```
**Pros:** Real-time for users
**Cons:** Complex, doesn't solve queue/concurrency issues, hard to scale

#### **Option 3: In-Memory Queue**
```
JavaScript array as queue → Process jobs one by one
```
**Pros:** Very simple
**Cons:** Lost on server restart, no persistence, no distributed workers

#### **Option 4: Redis + Bull Queue (CHOSEN)**
```
Redis for queue persistence → Bull for job management → Dedicated workers → Socket.io for admin
```
**Pros:** Production-ready, persistent, scalable, great monitoring
**Cons:** Requires Redis (one more dependency)

---

## 🏗️ Architecture Decision

### **Why Redis + Bull Queue?**

**1. Reliability**
- ✅ Jobs persisted in Redis (survive server restarts)
- ✅ Automatic retry with exponential backoff
- ✅ Job state tracking (queued → processing → completed/failed)

**2. Control**
- ✅ Per-service concurrency limits (phishing: 2, clone: 1, malware: 2, scam: 2)
- ✅ Rate limiting (max jobs per second)
- ✅ Priority queues (VIP users jump the line)

**3. Observability**
- ✅ Built-in Bull Board for queue monitoring
- ✅ Real-time events via Redis pub/sub
- ✅ Prometheus metrics integration
- ✅ Admin dashboard with Socket.io

**4. User Experience**
- ✅ Submit job → Get testId immediately → Navigate away
- ✅ Poll for status with backoff (5s → 15s → 60s)
- ✅ Notification when complete
- ✅ Can run multiple jobs concurrently (max 3 per user)

**5. Scalability**
- ✅ Easy to add more worker processes
- ✅ Horizontal scaling (multiple servers)
- ✅ Distributed queue (Redis cluster)

### **Final Architecture Diagram:**

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER FRONTEND                            │
│  (React + Polling Hook with Backoff)                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓ POST /api/phishing/analyze
┌─────────────────────────────────────────────────────────────────┐
│                      NODE.JS WEB SERVER                          │
│  1. Create TestResult (status='queued')                         │
│  2. Add job to Redis queue via Bull                             │
│  3. Return testId immediately                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                      REDIS (Queue Storage)                       │
│  ┌──────────┬──────────┬──────────┬──────────┐                 │
│  │ Phishing │  Clone   │ Malware  │   Scam   │                 │
│  │ Queue    │  Queue   │  Queue   │  Queue   │                 │
│  │  [5]     │   [3]    │   [12]   │   [1]    │                 │
│  └──────────┴──────────┴──────────┴──────────┘                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓ Bull Workers (Dedicated Processes)
┌─────────────────────────────────────────────────────────────────┐
│                    WORKER PROCESSES                              │
│  - phishingWorker.js (2 concurrent)                             │
│  - cloneWorker.js (1 concurrent)                                │
│  - malwareWorker.js (2 concurrent)                              │
│  - scamWorker.js (2 concurrent)                                 │
│                                                                  │
│  Each worker:                                                    │
│  1. Picks job from queue                                        │
│  2. Updates TestResult (status='processing')                    │
│  3. Calls Python service with timeout                           │
│  4. Updates TestResult (status='completed')                     │
│  5. Publishes event to Redis pub/sub                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓ Calls Python services
┌─────────────────────────────────────────────────────────────────┐
│                     PYTHON ML SERVICES                           │
│  - Phishing (5008), Clone (5000/5003)                           │
│  - Malware (5004/5005), Scam (5006)                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓ Results saved
┌─────────────────────────────────────────────────────────────────┐
│                    MONGODB (TestResult)                          │
│  - processingStatus: queued → processing → completed            │
│  - queueJobId, attempts, auditTrail                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓ Events published
┌─────────────────────────────────────────────────────────────────┐
│                  REDIS PUB/SUB + SOCKET.IO                       │
│  - job.created, job.active, job.completed, job.failed           │
│  - Broadcasts to Admin Dashboard                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓ Real-time updates
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN DASHBOARD                              │
│  - Queue monitor (waiting, active, completed, failed)           │
│  - Active users, system stats                                   │
│  - Bull Board integration                                       │
│  - Job control (cancel, retry, pause)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Implementation Phases

### **Phase 0: Quick Wins** ⏱️ 2-3 hours
- [ ] Update TestResult model with queue fields
- [ ] Create polling hook with backoff
- [ ] Create status API endpoint
- [ ] Test basic polling flow

### **Phase 1: Core Infrastructure** ⏱️ 6-8 hours
- [ ] Install Redis + Bull dependencies
- [ ] Create queue system (4 queues)
- [ ] Create worker processes (4 workers)
- [ ] Update job submission endpoints
- [ ] Test queue → worker → completion flow

### **Phase 2: Admin & Real-Time** ⏱️ 6-8 hours
- [ ] Setup Redis pub/sub
- [ ] Create Socket.io admin namespace
- [ ] Integrate Bull Board
- [ ] Create admin API endpoints
- [ ] Build admin dashboard UI

### **Phase 3: Hardening & Metrics** ⏱️ 4-6 hours
- [ ] Add Prometheus metrics
- [ ] Create watchdog cron job
- [ ] Implement idempotency
- [ ] Add admin actions (cancel, retry)
- [ ] Setup structured logging

**Total Estimated Time: 18-25 hours**

---

## 📝 Detailed Step-by-Step Guide



## 🔧 PHASE 0: Quick Wins (2-3 hours)

### **Step 0.1: Update TestResult Model** ✅ / ❌

**What:** Add queue-related fields to TestResult schema

**Why:** Need to track job status, queue position, attempts, etc.

**How:**
1. Open `backend/src/models/TestResult.js`
2. Add new fields to schema
3. Add indexes for performance

**Code Changes:**
```javascript
// backend/src/models/TestResult.js

const testResultSchema = new mongoose.Schema({
  // ... existing fields ...
  
  // NEW: Queue & Processing Status
  processingStatus: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'queued',
    index: true
  },
  
  queueJobId: {
    type: String,
    index: true
  },
  
  queuePosition: Number,
  
  attempts: {
    type: Number,
    default: 0
  },
  
  maxAttempts: {
    type: Number,
    default: 3
  },
  
  processingStartedAt: Date,
  processingCompletedAt: Date,
  processingError: String,
  
  // NEW: Notification & Deduplication
  notificationSent: {
    type: Boolean,
    default: false
  },
  
  notificationSentAt: Date,
  
  // NEW: Idempotency
  payloadHash: {
    type: String,
    index: true
  },
  
  // NEW: Priority
  priority: {
    type: Number,
    default: 0
  },
  
  // NEW: Audit Trail
  auditTrail: [{
    action: String,
    timestamp: Date,
    details: mongoose.Schema.Types.Mixed
  }],
  
  // NEW: Job Metadata
  jobMeta: mongoose.Schema.Types.Mixed
});

// NEW: Compound indexes
testResultSchema.index({ userId: 1, processingStatus: 1, createdAt: -1 });
testResultSchema.index({ userId: 1, payloadHash: 1 });
```

**Testing:**
```bash
# Restart backend
cd backend
npm start

# Check MongoDB - should see new fields
```

**Verification Checklist:**
- [ ] Model file updated
- [ ] Backend restarts without errors
- [ ] Can create new TestResult with new fields
- [ ] Indexes created in MongoDB

---

### **Step 0.2: Create Polling Hook with Backoff** ✅ / ❌

**What:** Create React hook that polls test status with intelligent backoff

**Why:** User needs to check job status without hammering server

**How:**
1. Create `frontend/src/hooks/useTestPolling.js`
2. Implement polling logic with backoff
3. Persist active tests in localStorage

**Code:**
```javascript
// frontend/src/hooks/useTestPolling.js

import { useState, useEffect, useRef } from 'react';

export const useTestPolling = (testId, onComplete) => {
  const [status, setStatus] = useState('queued');
  const [result, setResult] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);
  const [error, setError] = useState(null);
  const [pollInterval, setPollInterval] = useState(5000); // Start at 5s
  
  const startTimeRef = useRef(Date.now());
  const intervalRef = useRef(null);
  
  useEffect(() => {
    if (!testId) return;
    
    // Add to localStorage
    const activeTests = JSON.parse(localStorage.getItem('activeTests') || '[]');
    if (!activeTests.includes(testId)) {
      activeTests.push(testId);
      localStorage.setItem('activeTests', JSON.stringify(activeTests));
    }
    
    const poll = async () => {
      try {
        const response = await fetch(`http://localhost:5001/api/tests/${testId}/status`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch status');
        }
        
        const data = await response.json();
        
        setStatus(data.status);
        setQueuePosition(data.queuePosition);
        
        if (data.status === 'completed') {
          setResult(data.result);
          stopPolling();
          if (onComplete) onComplete(data);
        } else if (data.status === 'failed') {
          setError(data.error);
          stopPolling();
        } else {
          // Still queued or processing - apply backoff
          const elapsed = Date.now() - startTimeRef.current;
          
          if (elapsed > 60000) {
            // After 1 minute, poll every 60s
            setPollInterval(60000);
          } else if (elapsed > 30000) {
            // After 30 seconds, poll every 15s
            setPollInterval(15000);
          }
          // Otherwise keep 5s interval
        }
      } catch (err) {
        console.error('Polling error:', err);
        setError(err.message);
      }
    };
    
    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Remove from localStorage
      const activeTests = JSON.parse(localStorage.getItem('activeTests') || '[]');
      const updated = activeTests.filter(id => id !== testId);
      localStorage.setItem('activeTests', JSON.stringify(updated));
    };
    
    // Start polling
    poll(); // Initial poll
    intervalRef.current = setInterval(poll, pollInterval);
    
    return () => stopPolling();
  }, [testId, pollInterval, onComplete]);
  
  return { status, result, queuePosition, error };
};
```

**Testing:**
```javascript
// Test in any component
const { status, result, queuePosition } = useTestPolling(testId, (data) => {
  console.log('Test completed!', data);
});

console.log('Status:', status); // 'queued', 'processing', 'completed', 'failed'
console.log('Queue position:', queuePosition); // 3 (you're 3rd in line)
```

**Verification Checklist:**
- [ ] Hook file created
- [ ] Polling starts at 5s interval
- [ ] Backoff works (5s → 15s → 60s)
- [ ] localStorage persistence works
- [ ] Stops polling when complete/failed
- [ ] onComplete callback fires

---

### **Step 0.3: Create Status API Endpoint** ✅ / ❌

**What:** API endpoint that returns test status and results

**Why:** Frontend needs to poll this to check job progress

**How:**
1. Add endpoint to `backend/server.js`
2. Return status, queuePosition, result (if completed)

**Code:**
```javascript
// backend/server.js

app.get('/api/tests/:testId/status', protectRoute, async (req, res) => {
  try {
    const test = await TestResult.findOne({
      _id: req.params.testId,
      userId: req.user._id
    });
    
    if (!test) {
      return res.status(404).json({
        success: false,
        error: 'Test not found'
      });
    }
    
    const response = {
      success: true,
      status: test.processingStatus,
      queuePosition: test.queuePosition,
      createdAt: test.createdAt
    };
    
    // Only include result if completed
    if (test.processingStatus === 'completed') {
      response.result = test.result;
      response.details = test.details;
      response.flags = test.flags;
      response.recommendations = test.recommendations;
      response.insights = test.insights;
    }
    
    // Include error if failed
    if (test.processingStatus === 'failed') {
      response.error = test.processingError;
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching test status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch test status'
    });
  }
});
```

**Testing:**
```bash
# Create a test first, then check status
curl -X GET http://localhost:5001/api/tests/YOUR_TEST_ID/status \
  -H "Cookie: YOUR_JWT_COOKIE"

# Response:
{
  "success": true,
  "status": "queued",
  "queuePosition": 2,
  "createdAt": "2025-12-05T10:30:00Z"
}
```

**Verification Checklist:**
- [ ] Endpoint added to server.js
- [ ] Returns correct status
- [ ] Returns queuePosition
- [ ] Returns result only when completed
- [ ] Returns error when failed
- [ ] Requires authentication
- [ ] Only shows user's own tests

---

### **Step 0.4: Test Basic Polling Flow** ✅ / ❌

**What:** Manually test that polling works end-to-end

**Why:** Verify Phase 0 is working before moving to Phase 1

**How:**
1. Create a test with status='queued'
2. Use polling hook in frontend
3. Manually update status in MongoDB
4. Verify frontend detects change

**Testing Steps:**
```javascript
// 1. In PhishingPage.jsx, add polling
const [testId, setTestId] = useState(null);
const { status, result } = useTestPolling(testId, (data) => {
  console.log('✅ Test completed!', data);
  setResult(data.result);
});

// 2. Create test manually in MongoDB
db.testresults.insertOne({
  userId: ObjectId("YOUR_USER_ID"),
  testType: "phishing-url",
  inputData: { url: "test.com" },
  processingStatus: "queued",
  createdAt: new Date()
})

// 3. Set testId in frontend
setTestId("THE_TEST_ID_FROM_MONGODB");

// 4. Watch console - should poll every 5s

// 5. Update status in MongoDB
db.testresults.updateOne(
  { _id: ObjectId("THE_TEST_ID") },
  { 
    $set: { 
      processingStatus: "completed",
      result: { isPhishing: true, riskScore: 85 }
    }
  }
)

// 6. Frontend should detect completion and stop polling
```

**Verification Checklist:**
- [ ] Polling starts when testId is set
- [ ] Console shows polling every 5s
- [ ] Status updates when changed in DB
- [ ] Polling stops when status is 'completed'
- [ ] onComplete callback fires
- [ ] Result is displayed

---

## 🔧 PHASE 1: Core Infrastructure (6-8 hours)

### **Step 1.1: Install Dependencies** ✅ / ❌

**What:** Install Redis, Bull, and related packages

**Why:** Need queue infrastructure

**How:**
```bash
cd backend

# Install Bull and Redis client
npm install bull ioredis

# Install Bull Board for admin UI
npm install @bull-board/express @bull-board/api

# Install Socket.io for real-time admin
npm install socket.io

# Install Prometheus client for metrics
npm install prom-client

# Install node-cron for watchdog
npm install node-cron
```

**Install Redis:**

**Windows:**
```bash
# Option 1: WSL2
wsl --install
wsl
sudo apt update
sudo apt install redis-server
redis-server

# Option 2: Docker
docker run -d -p 6379:6379 redis:latest

# Option 3: Memurai (Windows native)
# Download from https://www.memurai.com/
```

**Mac:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
```

**Verify Redis:**
```bash
redis-cli ping
# Should return: PONG
```

**Verification Checklist:**
- [ ] All npm packages installed
- [ ] Redis installed and running
- [ ] `redis-cli ping` returns PONG
- [ ] No installation errors

---

### **Step 1.2: Create Queue System** ✅ / ❌

**What:** Create Bull queues for each service

**Why:** Need separate queues with different concurrency limits

**How:**
1. Create `backend/src/lib/queues.js`
2. Define 4 queues (phishing, clone, malware, scam)
3. Configure concurrency and rate limits

**Code:**
```javascript
// backend/src/lib/queues.js

import Bull from 'bull';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

// Create queues with specific configurations
export const queues = {
  phishing: new Bull('phishing-queue', {
    redis: redisConfig,
    limiter: {
      max: 2,        // Max 2 jobs
      duration: 1000 // Per second
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100,  // Keep last 100 completed
      removeOnFail: 500       // Keep last 500 failed
    }
  }),
  
  clone: new Bull('clone-queue', {
    redis: redisConfig,
    limiter: {
      max: 1,        // Max 1 job (heavy processing)
      duration: 1000
    },
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 3000
      },
      removeOnComplete: 100,
      removeOnFail: 500
    }
  }),
  
  malware: new Bull('malware-queue', {
    redis: redisConfig,
    limiter: {
      max: 2,
      duration: 1000
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100,
      removeOnFail: 500
    }
  }),
  
  scam: new Bull('scam-queue', {
    redis: redisConfig,
    limiter: {
      max: 2,
      duration: 1000
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100,
      removeOnFail: 500
    }
  })
};

// Abstract queue interface
export const enqueue = async (feature, jobData) => {
  const queue = queues[feature];
  
  if (!queue) {
    throw new Error(`Unknown feature: ${feature}`);
  }
  
  const job = await queue.add(jobData, {
    priority: jobData.priority || 0,
    jobId: jobData.testId // Use testId as jobId for idempotency
  });
  
  console.log(`[Queue] Added job ${job.id} to ${feature} queue`);
  
  return job.id;
};

// Get queue stats
export const getQueueStats = async (feature) => {
  const queue = queues[feature];
  
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount()
  ]);
  
  return { waiting, active, completed, failed, delayed };
};
```

**Testing:**
```javascript
// Test in Node.js REPL
import { enqueue, getQueueStats } from './src/lib/queues.js';

// Add a test job
const jobId = await enqueue('phishing', {
  testId: 'test123',
  userId: 'user123',
  url: 'test.com'
});

console.log('Job ID:', jobId);

// Check stats
const stats = await getQueueStats('phishing');
console.log('Stats:', stats);
```

**Verification Checklist:**
- [ ] queues.js file created
- [ ] All 4 queues created
- [ ] Can add jobs to queues
- [ ] Jobs appear in Redis
- [ ] getQueueStats works
- [ ] No errors in console

---

### **Step 1.3: Create Worker Processes** ✅ / ❌

**What:** Create dedicated worker files that process jobs

**Why:** Workers handle actual job processing (calling Python services)

**How:**
1. Create `backend/src/workers/` directory
2. Create worker file for each service
3. Implement job processing logic

**File Structure:**
```
backend/src/workers/
├── phishingWorker.js
├── cloneWorker.js
├── malwareWorker.js
└── scamWorker.js
```

**Code Example (Phishing Worker):**
```javascript
// backend/src/workers/phishingWorker.js

import { queues } from '../lib/queues.js';
import { TestResult } from '../models/TestResult.js';
import fetch from 'node-fetch';

console.log('[Phishing Worker] Starting...');

// Process phishing jobs (2 concurrent)
queues.phishing.process(2, async (job) => {
  const { testId, userId, url } = job.data;
  
  console.log(`[Phishing Worker] Processing job ${job.id} for test ${testId}`);
  console.log(`[Phishing Worker] URL: ${url}`);
  
  try {
    // Update status to 'processing'
    await TestResult.findByIdAndUpdate(testId, {
      processingStatus: 'processing',
      processingStartedAt: new Date(),
      attempts: job.attemptsMade + 1,
      $push: {
        auditTrail: {
          action: 'processing_started',
          timestamp: new Date(),
          details: {
            jobId: job.id,
            attempt: job.attemptsMade + 1,
            worker: 'phishingWorker'
          }
        }
      }
    });
    
    // Heartbeat - update progress every 10 seconds
    const heartbeatInterval = setInterval(async () => {
      await job.progress(50);
      console.log(`[Phishing Worker] Heartbeat for job ${job.id}`);
    }, 10000);
    
    // Call Python service with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout
    
    const response = await fetch('http://localhost:5008/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    clearInterval(heartbeatInterval);
    
    if (!response.ok) {
      throw new Error(`Python service returned ${response.status}`);
    }
    
    const result = await response.json();
    
    // Update TestResult with results
    await TestResult.findByIdAndUpdate(testId, {
      processingStatus: 'completed',
      processingCompletedAt: new Date(),
      result: result.result,
      details: result.details,
      flags: result.flags,
      recommendations: result.recommendations,
      insights: result.insights,
      $push: {
        auditTrail: {
          action: 'processing_completed',
          timestamp: new Date(),
          details: {
            jobId: job.id,
            riskScore: result.result?.riskScore
          }
        }
      }
    });
    
    console.log(`[Phishing Worker] ✅ Completed job ${job.id}`);
    
    return { success: true, testId, riskScore: result.result?.riskScore };
    
  } catch (error) {
    console.error(`[Phishing Worker] ❌ Error in job ${job.id}:`, error.message);
    
    // Update TestResult with error
    await TestResult.findByIdAndUpdate(testId, {
      processingStatus: 'failed',
      processingCompletedAt: new Date(),
      processingError: error.message,
      $push: {
        auditTrail: {
          action: 'processing_failed',
          timestamp: new Date(),
          details: {
            jobId: job.id,
            error: error.message,
            attempt: job.attemptsMade + 1
          }
        }
      }
    });
    
    throw error; // Bull will retry based on attempts config
  }
});

// Event listeners
queues.phishing.on('completed', (job, result) => {
  console.log(`[Phishing Queue] Job ${job.id} completed:`, result);
});

queues.phishing.on('failed', (job, err) => {
  console.log(`[Phishing Queue] Job ${job.id} failed:`, err.message);
});

queues.phishing.on('active', (job) => {
  console.log(`[Phishing Queue] Job ${job.id} started processing`);
});

queues.phishing.on('stalled', (job) => {
  console.log(`[Phishing Queue] Job ${job.id} stalled`);
});

console.log('[Phishing Worker] Ready to process jobs');
```

**Create Similar Workers:**
- `cloneWorker.js` - Calls clone detection services (ports 5000/5003)
- `malwareWorker.js` - Calls malware services (ports 5004/5005)
- `scamWorker.js` - Calls scam service (port 5006)

**Running Workers:**
```bash
# Terminal 1 - Phishing Worker
cd backend
node src/workers/phishingWorker.js

# Terminal 2 - Clone Worker
node src/workers/cloneWorker.js

# Terminal 3 - Malware Worker
node src/workers/malwareWorker.js

# Terminal 4 - Scam Worker
node src/workers/scamWorker.js
```

**Verification Checklist:**
- [ ] All 4 worker files created
- [ ] Workers start without errors
- [ ] Workers connect to Redis
- [ ] Workers log "Ready to process jobs"
- [ ] Can process test jobs
- [ ] TestResult status updates correctly

---


### **Step 1.4: Update Job Submission Endpoints** ✅ / ❌

**What:** Modify existing endpoints to use queue system

**Why:** Instead of calling Python services directly, add jobs to queue

**How:**
1. Update `backend/server.js`
2. Replace direct Python calls with `enqueue()`
3. Add idempotency check
4. Add concurrent job limit check

**Code Example (Phishing Endpoint):**
```javascript
// backend/server.js

import { enqueue } from './lib/queues.js';
import crypto from 'crypto';

app.post('/api/phishing/analyze', protectRoute, async (req, res) => {
  const { url } = req.body;
  
  try {
    // 1. Create payload hash for idempotency
    const payloadHash = crypto.createHash('sha256')
      .update(JSON.stringify({ url, userId: req.user._id.toString() }))
      .digest('hex');
    
    // 2. Check for duplicate (same payload already queued/processing)
    const existing = await TestResult.findOne({
      userId: req.user._id,
      payloadHash,
      processingStatus: { $in: ['queued', 'processing'] }
    });
    
    if (existing) {
      return res.json({
        success: true,
        testId: existing._id,
        message: 'Test already queued',
        duplicate: true,
        queuePosition: existing.queuePosition
      });
    }
    
    // 3. Check concurrent job limit (max 3 per user)
    const activeCount = await TestResult.countDocuments({
      userId: req.user._id,
      processingStatus: { $in: ['queued', 'processing'] }
    });
    
    if (activeCount >= 3) {
      return res.status(429).json({
        success: false,
        error: 'Maximum 3 concurrent jobs. Please wait for some to complete.',
        activeCount
      });
    }
    
    // 4. Create TestResult with status='queued'
    const testResult = new TestResult({
      userId: req.user._id,
      testType: 'phishing-url',
      inputData: { url },
      processingStatus: 'queued',
      payloadHash,
      priority: req.user.role === 'premium' ? 10 : 0, // VIP users get priority
      maxAttempts: 3,
      auditTrail: [{
        action: 'created',
        timestamp: new Date(),
        details: { url, ipAddress: req.ip, userAgent: req.get('user-agent') }
      }],
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    await testResult.save();
    
    console.log(`✅ Created test ${testResult._id} for user ${req.user._id}`);
    
    // 5. Add to Bull queue
    const jobId = await enqueue('phishing', {
      testId: testResult._id.toString(),
      userId: req.user._id.toString(),
      url,
      priority: testResult.priority
    });
    
    console.log(`✅ Added job ${jobId} to phishing queue`);
    
    // 6. Update TestResult with job ID
    testResult.queueJobId = jobId;
    await testResult.save();
    
    // 7. Get queue position
    const job = await queues.phishing.getJob(jobId);
    const position = await job.getPosition();
    testResult.queuePosition = position >= 0 ? position + 1 : null;
    await testResult.save();
    
    // 8. Return immediately
    res.json({
      success: true,
      testId: testResult._id,
      message: 'Analysis queued successfully',
      queuePosition: testResult.queuePosition,
      estimatedWaitTime: testResult.queuePosition * 30 // Rough estimate: 30s per job
    });
    
  } catch (error) {
    console.error('Error queueing phishing analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to queue analysis'
    });
  }
});
```

**Update All Endpoints:**
- `/api/phishing/analyze` - Phishing URL
- `/api/phishing/analyze-email-store` - Email phishing
- `/api/clone/store` - Clone detection
- `/api/malware/store` - Malware
- `/api/scam/store` - Scam phone

**Verification Checklist:**
- [ ] All endpoints updated
- [ ] Jobs added to queues successfully
- [ ] Idempotency works (duplicate check)
- [ ] Concurrent limit works (max 3)
- [ ] Queue position returned
- [ ] TestResult created with status='queued'
- [ ] Frontend receives testId immediately

---

### **Step 1.5: Test End-to-End Flow** ✅ / ❌

**What:** Test complete flow from submission to completion

**Why:** Verify Phase 1 works before moving to Phase 2

**Testing Steps:**

**1. Start All Services:**
```bash
# Terminal 1 - Redis
redis-server

# Terminal 2 - MongoDB
# (should already be running)

# Terminal 3 - Backend
cd backend
npm start

# Terminal 4 - Phishing Worker
cd backend
node src/workers/phishingWorker.js

# Terminal 5 - Python Phishing Service
cd backend_py/phishing-detection
python app.py

# Terminal 6 - Frontend
cd frontend
npm run dev
```

**2. Submit Test via Frontend:**
- Go to http://localhost:5173
- Login
- Go to Phishing page
- Enter URL: `google.com`
- Click "Analyze URL"
- Should see: "Analysis queued successfully"
- Should get testId immediately

**3. Watch Logs:**
```
[Backend] ✅ Created test 67... for user 65...
[Backend] ✅ Added job 1 to phishing queue
[Phishing Worker] Processing job 1 for test 67...
[Phishing Worker] URL: google.com
[Phishing Worker] Heartbeat for job 1
[Phishing Worker] ✅ Completed job 1
```

**4. Check Frontend:**
- Polling should start automatically
- Status should change: queued → processing → completed
- Result should display after ~30-60 seconds

**5. Verify Database:**
```javascript
// MongoDB
db.testresults.findOne({ _id: ObjectId("YOUR_TEST_ID") })

// Should see:
{
  processingStatus: "completed",
  queueJobId: "1",
  attempts: 1,
  processingStartedAt: ISODate("..."),
  processingCompletedAt: ISODate("..."),
  result: { isPhishing: false, riskScore: 15, ... },
  auditTrail: [
    { action: "created", timestamp: ... },
    { action: "processing_started", timestamp: ... },
    { action: "processing_completed", timestamp: ... }
  ]
}
```

**Verification Checklist:**
- [ ] Job submitted successfully
- [ ] TestResult created with status='queued'
- [ ] Job appears in Redis queue
- [ ] Worker picks up job
- [ ] Status updates to 'processing'
- [ ] Python service called
- [ ] Status updates to 'completed'
- [ ] Result saved to database
- [ ] Frontend polling detects completion
- [ ] Result displayed to user

---

## 🔧 PHASE 2: Admin & Real-Time (6-8 hours)

### **Step 2.1: Setup Redis Pub/Sub** ✅ / ❌

**What:** Create pub/sub system for broadcasting events

**Why:** Admin dashboard needs real-time updates

**How:**
1. Create `backend/src/lib/pubsub.js`
2. Setup publisher and subscriber
3. Publish events from workers

**Code:**
```javascript
// backend/src/lib/pubsub.js

import Redis from 'ioredis';

const publisher = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

const subscriber = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

const CHANNEL = 'ciphercop:events';

// Publish event
export const publishEvent = (event, data) => {
  const message = JSON.stringify({
    event,
    data,
    timestamp: Date.now()
  });
  
  publisher.publish(CHANNEL, message);
  console.log(`[PubSub] Published: ${event}`);
};

// Subscribe to events
export const subscribeToEvents = (callback) => {
  subscriber.subscribe(CHANNEL);
  
  subscriber.on('message', (channel, message) => {
    try {
      const { event, data, timestamp } = JSON.parse(message);
      callback(event, data, timestamp);
    } catch (error) {
      console.error('[PubSub] Error parsing message:', error);
    }
  });
  
  console.log('[PubSub] Subscribed to events');
};

// Unsubscribe
export const unsubscribe = () => {
  subscriber.unsubscribe(CHANNEL);
  console.log('[PubSub] Unsubscribed from events');
};
```

**Update Workers to Publish Events:**
```javascript
// backend/src/workers/phishingWorker.js

import { publishEvent } from '../lib/pubsub.js';

// After job completes
queues.phishing.on('completed', (job, result) => {
  publishEvent('job.completed', {
    service: 'phishing',
    jobId: job.id,
    testId: job.data.testId,
    result
  });
});

queues.phishing.on('failed', (job, err) => {
  publishEvent('job.failed', {
    service: 'phishing',
    jobId: job.id,
    testId: job.data.testId,
    error: err.message
  });
});

queues.phishing.on('active', (job) => {
  publishEvent('job.active', {
    service: 'phishing',
    jobId: job.id,
    testId: job.data.testId
  });
});
```

**Verification Checklist:**
- [ ] pubsub.js file created
- [ ] Publisher and subscriber connect to Redis
- [ ] Events published from workers
- [ ] Can subscribe and receive events
- [ ] Events logged in console

---

### **Step 2.2: Create Socket.io Admin Namespace** ✅ / ❌

**What:** Setup Socket.io for real-time admin updates

**Why:** Admin dashboard needs live queue monitoring

**How:**
1. Add Socket.io to `backend/server.js`
2. Create `/admin` namespace
3. Authenticate admin users
4. Broadcast events to connected admins

**Code:**
```javascript
// backend/server.js

import { Server } from 'socket.io';
import { subscribeToEvents } from './lib/pubsub.js';

// Create Socket.io server
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    credentials: true
  }
});

// Admin namespace
const adminIO = io.of('/admin');

// Authenticate admin connections
adminIO.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('No token provided'));
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || user.role !== 'admin') {
      return next(new Error('Unauthorized - Admin access required'));
    }
    
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

// Handle admin connections
adminIO.on('connection', async (socket) => {
  console.log(`[Admin Socket] ${socket.user.email} connected`);
  
  // Send initial stats
  const stats = await getAdminStats();
  socket.emit('stats', stats);
  
  // Subscribe to Redis pub/sub events
  subscribeToEvents((event, data, timestamp) => {
    // Broadcast to this admin
    socket.emit(event, { ...data, timestamp });
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`[Admin Socket] ${socket.user.email} disconnected`);
  });
  
  // Handle admin actions
  socket.on('pause-queue', async (data) => {
    const { service } = data;
    await queues[service].pause();
    socket.emit('queue-paused', { service });
  });
  
  socket.on('resume-queue', async (data) => {
    const { service } = data;
    await queues[service].resume();
    socket.emit('queue-resumed', { service });
  });
});

// Helper function to get admin stats
async function getAdminStats() {
  const [activeUsers, totalUsers, testsToday] = await Promise.all([
    getActiveUsersCount(),
    User.countDocuments(),
    TestResult.countDocuments({
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    })
  ]);
  
  const queueStats = {};
  for (const [service, queue] of Object.entries(queues)) {
    queueStats[service] = {
      waiting: await queue.getWaitingCount(),
      active: await queue.getActiveCount(),
      completed: await queue.getCompletedCount(),
      failed: await queue.getFailedCount()
    };
  }
  
  return {
    activeUsers,
    totalUsers,
    testsToday,
    queues: queueStats
  };
}

function getActiveUsersCount() {
  // Users with activity in last 5 minutes
  return User.countDocuments({
    lastLogin: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
  });
}
```

**Verification Checklist:**
- [ ] Socket.io server created
- [ ] Admin namespace created
- [ ] Authentication middleware works
- [ ] Admin can connect
- [ ] Initial stats sent
- [ ] Real-time events broadcast
- [ ] Admin actions work (pause/resume)

---

### **Step 2.3: Integrate Bull Board** ✅ / ❌

**What:** Add Bull Board for quick queue operations

**Why:** Built-in UI for monitoring and managing queues

**How:**
1. Add Bull Board to `backend/server.js`
2. Protect with admin middleware
3. Access at `/admin/bull-board`

**Code:**
```javascript
// backend/server.js

import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

// Create Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/bull-board');

createBullBoard({
  queues: [
    new BullAdapter(queues.phishing),
    new BullAdapter(queues.clone),
    new BullAdapter(queues.malware),
    new BullAdapter(queues.scam)
  ],
  serverAdapter
});

// Middleware to check admin role
const adminOnly = async (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
};

// Mount Bull Board (protected)
app.use('/admin/bull-board', protectRoute, adminOnly, serverAdapter.getRouter());
```

**Access Bull Board:**
- URL: http://localhost:5001/admin/bull-board
- Must be logged in as admin
- Shows all queues, jobs, stats

**Verification Checklist:**
- [ ] Bull Board accessible
- [ ] Shows all 4 queues
- [ ] Can see waiting/active/completed/failed jobs
- [ ] Can retry failed jobs
- [ ] Can clean queues
- [ ] Requires admin authentication

---

### **Step 2.4: Create Admin API Endpoints** ✅ / ❌

**What:** REST API for admin operations

**Why:** Admin dashboard needs data and control

**How:**
1. Add endpoints to `backend/server.js`
2. Protect with admin middleware

**Code:**
```javascript
// backend/server.js

// GET /api/admin/stats - Overall system stats
app.get('/api/admin/stats', protectRoute, adminOnly, async (req, res) => {
  try {
    const stats = await getAdminStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/queue/:service - Specific queue details
app.get('/api/admin/queue/:service', protectRoute, adminOnly, async (req, res) => {
  try {
    const { service } = req.params;
    const queue = queues[service];
    
    if (!queue) {
      return res.status(404).json({ success: false, error: 'Queue not found' });
    }
    
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(0, 10),
      queue.getFailed(0, 10)
    ]);
    
    res.json({
      success: true,
      data: {
        service,
        waiting: waiting.map(j => ({ id: j.id, data: j.data, timestamp: j.timestamp })),
        active: active.map(j => ({ id: j.id, data: j.data, progress: j.progress() })),
        completed: completed.map(j => ({ id: j.id, returnvalue: j.returnvalue })),
        failed: failed.map(j => ({ id: j.id, failedReason: j.failedReason }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/active-users - Currently active users
app.get('/api/admin/active-users', protectRoute, adminOnly, async (req, res) => {
  try {
    const users = await User.find({
      lastLogin: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    }).select('email fullName lastLogin testCount').limit(50);
    
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/job/:jobId/cancel - Cancel a job
app.post('/api/admin/job/:jobId/cancel', protectRoute, adminOnly, async (req, res) => {
  try {
    const test = await TestResult.findById(req.params.jobId);
    
    if (!test) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    
    // Remove from queue
    const feature = test.testType.split('-')[0];
    const job = await queues[feature].getJob(test.queueJobId);
    if (job) await job.remove();
    
    // Update database
    test.processingStatus = 'cancelled';
    test.processingCompletedAt = new Date();
    test.auditTrail.push({
      action: 'admin_cancelled',
      timestamp: new Date(),
      details: {
        adminId: req.user._id,
        adminEmail: req.user.email
      }
    });
    await test.save();
    
    res.json({ success: true, message: 'Job cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/job/:jobId/retry - Retry a failed job
app.post('/api/admin/job/:jobId/retry', protectRoute, adminOnly, async (req, res) => {
  try {
    const test = await TestResult.findById(req.params.jobId);
    
    if (!test) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    
    // Reset status
    test.processingStatus = 'queued';
    test.attempts = 0;
    test.processingError = null;
    test.auditTrail.push({
      action: 'admin_retry',
      timestamp: new Date(),
      details: {
        adminId: req.user._id,
        adminEmail: req.user.email
      }
    });
    await test.save();
    
    // Re-queue
    const feature = test.testType.split('-')[0];
    const jobId = await enqueue(feature, {
      testId: test._id.toString(),
      userId: test.userId.toString(),
      ...test.inputData
    });
    
    test.queueJobId = jobId;
    await test.save();
    
    res.json({ success: true, message: 'Job requeued' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Verification Checklist:**
- [ ] All admin endpoints created
- [ ] Stats endpoint returns data
- [ ] Queue endpoint shows jobs
- [ ] Active users endpoint works
- [ ] Cancel job works
- [ ] Retry job works
- [ ] All require admin authentication

---


### **Step 2.5: Build Admin Dashboard UI** ✅ / ❌

**What:** Create React admin dashboard

**Why:** Visual interface for monitoring and control

**How:**
1. Create `frontend/src/logins/AdminDashboard.jsx`
2. Connect to Socket.io
3. Display real-time stats and queues

**Code:**
```javascript
// frontend/src/logins/AdminDashboard.jsx

import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [socket, setSocket] = useState(null);
  
  useEffect(() => {
    // Get JWT token from cookie
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('jwt='))
      ?.split('=')[1];
    
    // Connect to admin namespace
    const newSocket = io('http://localhost:5001/admin', {
      auth: { token }
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to admin socket');
    });
    
    newSocket.on('stats', (data) => {
      setStats(data);
    });
    
    newSocket.on('job.created', (data) => {
      addEvent('Job Created', data);
    });
    
    newSocket.on('job.active', (data) => {
      addEvent('Job Started', data);
    });
    
    newSocket.on('job.completed', (data) => {
      addEvent('Job Completed', data);
    });
    
    newSocket.on('job.failed', (data) => {
      addEvent('Job Failed', data);
    });
    
    setSocket(newSocket);
    
    return () => newSocket.disconnect();
  }, []);
  
  const addEvent = (type, data) => {
    setEvents(prev => [{
      type,
      data,
      timestamp: new Date()
    }, ...prev].slice(0, 50)); // Keep last 50 events
  };
  
  if (!stats) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="admin-dashboard">
      <h1>🎛️ Admin Dashboard</h1>
      
      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Active Users</h3>
          <p className="stat-value">{stats.activeUsers}</p>
        </div>
        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-value">{stats.totalUsers}</p>
        </div>
        <div className="stat-card">
          <h3>Tests Today</h3>
          <p className="stat-value">{stats.testsToday}</p>
        </div>
      </div>
      
      {/* Queue Status */}
      <div className="queues-section">
        <h2>Queue Status</h2>
        <div className="queues-grid">
          {Object.entries(stats.queues).map(([service, queueStats]) => (
            <div key={service} className="queue-card">
              <h3>{service}</h3>
              <div className="queue-stats">
                <div>Waiting: {queueStats.waiting}</div>
                <div>Active: {queueStats.active}</div>
                <div>Completed: {queueStats.completed}</div>
                <div>Failed: {queueStats.failed}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Live Events */}
      <div className="events-section">
        <h2>Live Events</h2>
        <div className="events-list">
          {events.map((event, index) => (
            <div key={index} className="event-item">
              <span className="event-type">{event.type}</span>
              <span className="event-service">{event.data.service}</span>
              <span className="event-time">
                {event.timestamp.toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
```

**Verification Checklist:**
- [ ] Admin dashboard component created
- [ ] Socket.io connection works
- [ ] Real-time stats display
- [ ] Queue status updates
- [ ] Live events stream
- [ ] Only accessible to admins

---

## 🔧 PHASE 3: Hardening & Metrics (4-6 hours)

### **Step 3.1: Add Prometheus Metrics** ✅ / ❌

**What:** Export metrics for monitoring

**Why:** Need visibility into system performance

**How:**
1. Create `backend/src/lib/metrics.js`
2. Define metrics (counters, gauges, histograms)
3. Expose `/metrics` endpoint

**Code:**
```javascript
// backend/src/lib/metrics.js

import client from 'prom-client';

// Create registry
const register = new client.Registry();

// Default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
export const metrics = {
  // Queue sizes
  queueSize: new client.Gauge({
    name: 'ciphercop_queue_size',
    help: 'Number of jobs in queue by status',
    labelNames: ['service', 'status'],
    registers: [register]
  }),
  
  // Job duration
  jobDuration: new client.Histogram({
    name: 'ciphercop_job_duration_seconds',
    help: 'Job processing duration in seconds',
    labelNames: ['service', 'status'],
    buckets: [1, 5, 10, 30, 60, 120, 300],
    registers: [register]
  }),
  
  // Job counter
  jobsTotal: new client.Counter({
    name: 'ciphercop_jobs_total',
    help: 'Total number of jobs processed',
    labelNames: ['service', 'status'],
    registers: [register]
  }),
  
  // Active users
  activeUsers: new client.Gauge({
    name: 'ciphercop_active_users',
    help: 'Number of active users',
    registers: [register]
  }),
  
  // API requests
  httpRequests: new client.Counter({
    name: 'ciphercop_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [register]
  })
};

// Update queue metrics periodically
export const updateQueueMetrics = async (queues) => {
  for (const [service, queue] of Object.entries(queues)) {
    const waiting = await queue.getWaitingCount();
    const active = await queue.getActiveCount();
    const completed = await queue.getCompletedCount();
    const failed = await queue.getFailedCount();
    
    metrics.queueSize.set({ service, status: 'waiting' }, waiting);
    metrics.queueSize.set({ service, status: 'active' }, active);
    metrics.queueSize.set({ service, status: 'completed' }, completed);
    metrics.queueSize.set({ service, status: 'failed' }, failed);
  }
};

// Export registry
export { register };
```

**Add to server.js:**
```javascript
// backend/server.js

import { metrics, updateQueueMetrics, register } from './lib/metrics.js';

// Update metrics every 10 seconds
setInterval(() => {
  updateQueueMetrics(queues);
}, 10000);

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Track HTTP requests
app.use((req, res, next) => {
  res.on('finish', () => {
    metrics.httpRequests.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode
    });
  });
  next();
});
```

**Track job metrics in workers:**
```javascript
// backend/src/workers/phishingWorker.js

import { metrics } from '../lib/metrics.js';

queues.phishing.on('completed', (job, result) => {
  const duration = (Date.now() - job.timestamp) / 1000;
  metrics.jobDuration.observe({ service: 'phishing', status: 'completed' }, duration);
  metrics.jobsTotal.inc({ service: 'phishing', status: 'completed' });
});

queues.phishing.on('failed', (job, err) => {
  metrics.jobsTotal.inc({ service: 'phishing', status: 'failed' });
});
```

**Access Metrics:**
```bash
curl http://localhost:5001/metrics

# Output:
# ciphercop_queue_size{service="phishing",status="waiting"} 5
# ciphercop_queue_size{service="phishing",status="active"} 2
# ciphercop_job_duration_seconds_bucket{service="phishing",status="completed",le="30"} 45
# ciphercop_jobs_total{service="phishing",status="completed"} 123
```

**Verification Checklist:**
- [ ] metrics.js file created
- [ ] Metrics defined
- [ ] /metrics endpoint works
- [ ] Queue metrics update
- [ ] Job metrics tracked
- [ ] Can scrape with Prometheus

---

### **Step 3.2: Create Watchdog Cron Job** ✅ / ❌

**What:** Automatically detect and handle stuck jobs

**Why:** Jobs can get stuck if worker crashes or times out

**How:**
1. Create `backend/src/cron/watchdog.js`
2. Check for jobs stuck in 'processing' state
3. Mark as failed or requeue

**Code:**
```javascript
// backend/src/cron/watchdog.js

import cron from 'node-cron';
import { TestResult } from '../models/TestResult.js';
import { queues } from '../lib/queues.js';

console.log('[Watchdog] Starting...');

// Run every minute
cron.schedule('* * * * *', async () => {
  try {
    console.log('[Watchdog] Checking for stuck jobs...');
    
    // Find jobs stuck in 'processing' for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const stuckJobs = await TestResult.find({
      processingStatus: 'processing',
      processingStartedAt: { $lt: fiveMinutesAgo }
    });
    
    if (stuckJobs.length === 0) {
      console.log('[Watchdog] No stuck jobs found');
      return;
    }
    
    console.log(`[Watchdog] Found ${stuckJobs.length} stuck jobs`);
    
    for (const test of stuckJobs) {
      console.log(`[Watchdog] Handling stuck job: ${test._id}`);
      
      // Check if job still exists in queue
      const feature = test.testType.split('-')[0];
      const job = await queues[feature].getJob(test.queueJobId);
      
      if (job) {
        // Job exists but stuck - remove it
        await job.remove();
        console.log(`[Watchdog] Removed stuck job ${test.queueJobId} from queue`);
      }
      
      // Mark as failed
      test.processingStatus = 'failed';
      test.processingError = 'Job timeout - no heartbeat for 5 minutes';
      test.processingCompletedAt = new Date();
      test.auditTrail.push({
        action: 'watchdog_timeout',
        timestamp: new Date(),
        details: {
          reason: 'No heartbeat for 5 minutes',
          processingStartedAt: test.processingStartedAt
        }
      });
      
      await test.save();
      
      console.log(`[Watchdog] Marked test ${test._id} as failed`);
    }
    
  } catch (error) {
    console.error('[Watchdog] Error:', error);
  }
});

console.log('[Watchdog] Cron job scheduled (runs every minute)');
```

**Start Watchdog:**
```bash
# Terminal - Watchdog
cd backend
node src/cron/watchdog.js
```

**Verification Checklist:**
- [ ] watchdog.js file created
- [ ] Cron job runs every minute
- [ ] Detects stuck jobs
- [ ] Marks jobs as failed
- [ ] Removes from queue
- [ ] Logs actions

---

### **Step 3.3: Implement Idempotency** ✅ / ❌

**What:** Prevent duplicate job submissions

**Why:** User might click "Analyze" multiple times

**How:** Already implemented in Step 1.4 with payloadHash

**Verification:**
```javascript
// Test duplicate submission
// 1. Submit job with URL "test.com"
// 2. Immediately submit again with same URL
// 3. Should return existing testId with duplicate: true

const response1 = await fetch('/api/phishing/analyze', {
  method: 'POST',
  body: JSON.stringify({ url: 'test.com' })
});
// Returns: { testId: "abc123", duplicate: false }

const response2 = await fetch('/api/phishing/analyze', {
  method: 'POST',
  body: JSON.stringify({ url: 'test.com' })
});
// Returns: { testId: "abc123", duplicate: true }
```

**Verification Checklist:**
- [ ] payloadHash generated correctly
- [ ] Duplicate check works
- [ ] Returns existing testId
- [ ] No duplicate jobs in queue
- [ ] Works across all endpoints

---

### **Step 3.4: Add Structured Logging** ✅ / ❌

**What:** Consistent, parseable log format

**Why:** Easier to search and analyze logs

**How:**
1. Install winston logger
2. Create log format
3. Replace console.log

**Code:**
```javascript
// backend/src/lib/logger.js

import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ciphercop-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export default logger;
```

**Usage:**
```javascript
// Replace console.log with logger
import logger from './lib/logger.js';

logger.info('Job completed', { jobId, testId, riskScore });
logger.error('Job failed', { jobId, error: error.message });
logger.warn('Queue size high', { service: 'phishing', size: 50 });
```

**Verification Checklist:**
- [ ] Winston installed
- [ ] logger.js created
- [ ] Logs written to files
- [ ] JSON format
- [ ] Includes timestamps
- [ ] Different log levels work

---

## ✅ Testing & Verification

### **End-to-End Test Scenarios**

#### **Scenario 1: Happy Path** ✅ / ❌
1. User submits phishing URL
2. Job queued successfully
3. Worker picks up job
4. Python service processes
5. Result saved to database
6. Frontend polls and gets result
7. User sees result

**Expected:**
- ✅ Job completes in 30-60 seconds
- ✅ Status transitions: queued → processing → completed
- ✅ Result displayed correctly
- ✅ Audit trail complete

#### **Scenario 2: Concurrent Jobs** ✅ / ❌
1. User submits 3 jobs simultaneously
2. All 3 queued
3. Workers process concurrently
4. All complete successfully

**Expected:**
- ✅ All 3 jobs accepted
- ✅ Queue positions: 1, 2, 3
- ✅ All complete within 2 minutes
- ✅ No errors

#### **Scenario 3: Job Limit** ✅ / ❌
1. User submits 3 jobs (max)
2. Try to submit 4th job
3. Should be rejected

**Expected:**
- ✅ First 3 accepted
- ✅ 4th returns 429 error
- ✅ Error message: "Maximum 3 concurrent jobs"

#### **Scenario 4: Duplicate Prevention** ✅ / ❌
1. Submit job with URL "test.com"
2. Immediately submit again
3. Should return existing testId

**Expected:**
- ✅ First submission creates job
- ✅ Second returns duplicate: true
- ✅ Only 1 job in queue

#### **Scenario 5: Job Failure** ✅ / ❌
1. Submit job
2. Stop Python service
3. Job should fail and retry

**Expected:**
- ✅ Job fails on first attempt
- ✅ Automatically retries (up to 3 times)
- ✅ Eventually marked as failed
- ✅ Error message saved

#### **Scenario 6: Stuck Job** ✅ / ❌
1. Submit job
2. Kill worker process mid-processing
3. Watchdog should detect and fail job

**Expected:**
- ✅ Job stuck in 'processing'
- ✅ Watchdog detects after 5 minutes
- ✅ Job marked as failed
- ✅ Removed from queue

#### **Scenario 7: Page Refresh** ✅ / ❌
1. Submit job
2. Refresh page
3. Polling should resume from localStorage

**Expected:**
- ✅ Active testIds in localStorage
- ✅ Polling resumes automatically
- ✅ Result displayed when complete

#### **Scenario 8: Admin Dashboard** ✅ / ❌
1. Login as admin
2. Open admin dashboard
3. Submit test job
4. Watch real-time updates

**Expected:**
- ✅ Dashboard shows queue stats
- ✅ Live events stream
- ✅ Can see job progress
- ✅ Can cancel/retry jobs

---

## 📊 Monitoring & Observability

### **Prometheus + Grafana Setup**

**1. Install Prometheus:**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'ciphercop'
    static_configs:
      - targets: ['localhost:5001']
```

**2. Run Prometheus:**
```bash
docker run -d -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

**3. Install Grafana:**
```bash
docker run -d -p 3000:3000 grafana/grafana
```

**4. Create Dashboard:**
- Add Prometheus data source
- Import dashboard or create custom
- Visualize queue sizes, job durations, success rates

### **Key Metrics to Monitor:**

1. **Queue Health:**
   - Queue size (waiting, active)
   - Processing rate (jobs/minute)
   - Failure rate

2. **Job Performance:**
   - Average duration by service
   - P95, P99 latencies
   - Success vs failure ratio

3. **System Health:**
   - Active users
   - API response times
   - Error rates

4. **Resource Usage:**
   - CPU, memory
   - Redis memory usage
   - MongoDB connections

---

## 🚀 Production Deployment

### **Pre-Deployment Checklist** ✅ / ❌

#### **Infrastructure:**
- [ ] Redis installed and configured
- [ ] MongoDB Atlas connection string
- [ ] All environment variables set
- [ ] SSL certificates (if needed)

#### **Code:**
- [ ] All tests passing
- [ ] No console.log (use logger)
- [ ] Error handling complete
- [ ] Rate limiting configured

#### **Workers:**
- [ ] All 4 workers tested
- [ ] Worker restart scripts
- [ ] Process manager (PM2) configured

#### **Monitoring:**
- [ ] Prometheus scraping
- [ ] Grafana dashboards
- [ ] Alerts configured
- [ ] Log aggregation setup

#### **Security:**
- [ ] Admin endpoints protected
- [ ] RBAC implemented
- [ ] Audit logs enabled
- [ ] Rate limits per user

### **Deployment Steps:**

**1. Setup Redis:**
```bash
# Production Redis with persistence
redis-server --appendonly yes --requirepass YOUR_PASSWORD
```

**2. Setup Workers with PM2:**
```bash
npm install -g pm2

# Start all workers
pm2 start src/workers/phishingWorker.js --name phishing-worker
pm2 start src/workers/cloneWorker.js --name clone-worker
pm2 start src/workers/malwareWorker.js --name malware-worker
pm2 start src/workers/scamWorker.js --name scam-worker
pm2 start src/cron/watchdog.js --name watchdog

# Save configuration
pm2 save
pm2 startup
```

**3. Environment Variables:**
```bash
# .env
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_here
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
LOG_LEVEL=info
```

**4. Start Backend:**
```bash
pm2 start server.js --name ciphercop-backend
```

**5. Verify:**
```bash
pm2 status
# Should show all processes running

pm2 logs
# Check for errors
```

---

## 🐛 Troubleshooting

### **Issue: Jobs stuck in 'queued' state**

**Symptoms:**
- Jobs added to queue
- Never picked up by workers
- Queue size keeps growing

**Diagnosis:**
```bash
# Check if workers are running
pm2 status

# Check Redis connection
redis-cli ping

# Check worker logs
pm2 logs phishing-worker
```

**Solutions:**
1. Restart workers: `pm2 restart all`
2. Check Redis connection in worker logs
3. Verify queue names match
4. Check worker concurrency settings

---

### **Issue: High failure rate**

**Symptoms:**
- Many jobs failing
- Error: "Python service timeout"

**Diagnosis:**
```bash
# Check Python services
curl http://localhost:5008/health

# Check worker logs
pm2 logs phishing-worker --lines 100
```

**Solutions:**
1. Increase timeout in workers (currently 60s)
2. Check Python service health
3. Reduce concurrency if services overwhelmed
4. Scale Python services horizontally

---

### **Issue: Memory leak in Redis**

**Symptoms:**
- Redis memory usage growing
- Eventually runs out of memory

**Diagnosis:**
```bash
redis-cli info memory
redis-cli dbsize
```

**Solutions:**
1. Check `removeOnComplete` and `removeOnFail` settings
2. Manually clean old jobs: `queue.clean(24 * 3600 * 1000, 'completed')`
3. Set Redis maxmemory policy: `maxmemory-policy allkeys-lru`

---

### **Issue: Duplicate jobs despite idempotency**

**Symptoms:**
- Same job submitted multiple times
- Multiple entries in database

**Diagnosis:**
```javascript
// Check payloadHash
db.testresults.find({ payloadHash: "YOUR_HASH" })
```

**Solutions:**
1. Verify payloadHash generation includes userId
2. Check timing - race condition?
3. Add unique index on payloadHash + userId

---

## 📚 Additional Resources

### **Documentation:**
- Bull Queue: https://github.com/OptimalBits/bull
- Bull Board: https://github.com/felixmosh/bull-board
- Socket.io: https://socket.io/docs/
- Prometheus: https://prometheus.io/docs/

### **Best Practices:**
1. Always use `jobId` for idempotency
2. Set reasonable timeouts
3. Monitor queue sizes
4. Clean old jobs regularly
5. Use structured logging
6. Implement circuit breakers for Python services
7. Set up alerts for high failure rates

---

## 🎯 Success Criteria

### **Phase 0 Complete When:**
- [ ] TestResult model updated
- [ ] Polling hook works
- [ ] Status endpoint returns data
- [ ] Basic polling flow tested

### **Phase 1 Complete When:**
- [ ] All dependencies installed
- [ ] 4 queues created
- [ ] 4 workers running
- [ ] Jobs process end-to-end
- [ ] All endpoints updated

### **Phase 2 Complete When:**
- [ ] Redis pub/sub working
- [ ] Socket.io admin namespace
- [ ] Bull Board accessible
- [ ] Admin API endpoints
- [ ] Admin dashboard UI

### **Phase 3 Complete When:**
- [ ] Prometheus metrics exposed
- [ ] Watchdog cron running
- [ ] Idempotency verified
- [ ] Structured logging
- [ ] All tests passing

### **Production Ready When:**
- [ ] All phases complete
- [ ] Load tested
- [ ] Monitoring setup
- [ ] Documentation complete
- [ ] Team trained

---

## 📝 Implementation Checklist

### **Phase 0: Quick Wins** (2-3 hours)
- [ ] Step 0.1: Update TestResult Model
- [ ] Step 0.2: Create Polling Hook
- [ ] Step 0.3: Create Status API
- [ ] Step 0.4: Test Basic Flow

### **Phase 1: Core Infrastructure** (6-8 hours)
- [ ] Step 1.1: Install Dependencies
- [ ] Step 1.2: Create Queue System
- [ ] Step 1.3: Create Workers
- [ ] Step 1.4: Update Endpoints
- [ ] Step 1.5: Test End-to-End

### **Phase 2: Admin & Real-Time** (6-8 hours)
- [ ] Step 2.1: Setup Redis Pub/Sub
- [ ] Step 2.2: Create Socket.io Namespace
- [ ] Step 2.3: Integrate Bull Board
- [ ] Step 2.4: Create Admin APIs
- [ ] Step 2.5: Build Admin Dashboard

### **Phase 3: Hardening & Metrics** (4-6 hours)
- [ ] Step 3.1: Add Prometheus Metrics
- [ ] Step 3.2: Create Watchdog
- [ ] Step 3.3: Verify Idempotency
- [ ] Step 3.4: Add Structured Logging

### **Testing & Deployment**
- [ ] All test scenarios pass
- [ ] Load testing complete
- [ ] Monitoring configured
- [ ] Production deployment
- [ ] Documentation updated

---

**Total Estimated Time: 18-25 hours**

**Status: Ready for Implementation** 🚀

**Last Updated:** December 5, 2025  
**Version:** 1.0  
**Author:** CipherCop Team



---

## 🔴 CRITICAL ISSUES & FIXES

### **Issue #1: Worker Heartbeat Variable Scope Bug** 🔴 HIGH PRIORITY

**Problem:**
```javascript
// ❌ WRONG - hb declared inside try block
try {
  const heartbeatInterval = setInterval(...);
  // ...
} catch (error) {
  clearInterval(heartbeatInterval); // ❌ ReferenceError!
}
```

**Fix:**
```javascript
// ✅ CORRECT - Declare at top, clear in finally
let heartbeatInterval = null;

try {
  // Update status to 'processing'
  await TestResult.findByIdAndUpdate(testId, { ... });
  
  // Start heartbeat
  heartbeatInterval = setInterval(async () => {
    await job.progress(50);
    console.log(`[Worker] Heartbeat for job ${job.id}`);
  }, 10000);
  
  // Call Python service
  const result = await callPhishingService(url, { timeout: 60000 });
  
  // Update with results
  await TestResult.findByIdAndUpdate(testId, { ... });
  
  return { success: true, testId };
  
} catch (error) {
  console.error(`[Worker] Error:`, error);
  await TestResult.findByIdAndUpdate(testId, {
    processingStatus: 'failed',
    processingError: error.message
  });
  throw error;
  
} finally {
  // Always clear heartbeat
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}
```

**Update All Workers:**
- `phishingWorker.js`
- `cloneWorker.js`
- `malwareWorker.js`
- `scamWorker.js`

---

### **Issue #2: job.getPosition() Performance & Null Handling** 🔴 HIGH PRIORITY

**Problem:**
```javascript
// ❌ WRONG - Can be O(n), can return null, no error handling
const job = await queues.phishing.getJob(jobId);
const position = await job.getPosition(); // ❌ Crashes if job is null!
testResult.queuePosition = position + 1;
```

**Fix:**
```javascript
// ✅ CORRECT - Handle null, make optional
try {
  const job = await queues.phishing.getJob(jobId);
  
  if (job) {
    const position = await job.getPosition();
    testResult.queuePosition = position >= 0 ? position + 1 : null;
  } else {
    testResult.queuePosition = null;
  }
  
  await testResult.save();
} catch (error) {
  console.error('Error getting queue position:', error);
  // Don't fail the whole request for position
  testResult.queuePosition = null;
  await testResult.save();
}

// Return response
res.json({
  success: true,
  testId: testResult._id,
  message: 'Analysis queued successfully',
  queuePosition: testResult.queuePosition, // Can be null
  estimatedWaitTime: testResult.queuePosition 
    ? testResult.queuePosition * 30 
    : null
});
```

**Alternative for Scale:**
```javascript
// For high-scale systems, use approximate position
const queueSize = await queues.phishing.getWaitingCount();
testResult.queuePosition = queueSize; // Approximate
```

---

### **Issue #3: Using testId as jobId - Retry Conflicts** 🟡 MEDIUM PRIORITY

**Problem:**
```javascript
// ❌ Can cause issues on retry
const job = await queue.add(jobData, {
  jobId: jobData.testId // Same ID on retry = duplicate error
});
```

**Fix Option 1: Remove old job before retry**
```javascript
// In admin retry endpoint
app.post('/api/admin/job/:jobId/retry', protectRoute, adminOnly, async (req, res) => {
  const test = await TestResult.findById(req.params.jobId);
  
  // Remove old job if exists
  const feature = test.feature; // Use stored feature
  const oldJob = await queues[feature].getJob(test.queueJobId);
  if (oldJob) {
    await oldJob.remove();
  }
  
  // Reset status
  test.processingStatus = 'queued';
  test.attempts = 0;
  test.processingError = null;
  
  // Re-queue with same testId
  const jobId = await enqueue(feature, {
    testId: test._id.toString(),
    userId: test.userId.toString(),
    ...test.inputData
  });
  
  test.queueJobId = jobId;
  await test.save();
  
  res.json({ success: true, message: 'Job requeued' });
});
```

**Fix Option 2: Use attempt-based jobId**
```javascript
// Generate unique jobId per attempt
const jobId = `${testId}:attempt:${attempts}`;

const job = await queue.add(jobData, {
  jobId: jobId
});
```

---

### **Issue #4: Heartbeat vs Progress Semantics** 🟡 MEDIUM PRIORITY

**Problem:**
```javascript
// ❌ Using progress() for heartbeat - confusing
await job.progress(50); // Not real progress, just heartbeat
```

**Fix: Use dedicated heartbeat field**
```javascript
// Update TestResult model
{
  lastHeartbeat: Date,
  heartbeatInterval: Number // seconds between heartbeats
}

// In worker
let heartbeatInterval = null;

try {
  heartbeatInterval = setInterval(async () => {
    // Update heartbeat timestamp
    await TestResult.findByIdAndUpdate(testId, {
      lastHeartbeat: new Date()
    });
    console.log(`[Worker] Heartbeat for test ${testId}`);
  }, 10000);
  
  // ... process job ...
  
} finally {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
}

// In watchdog - check lastHeartbeat instead of processingStartedAt
const stuckJobs = await TestResult.find({
  processingStatus: 'processing',
  lastHeartbeat: { $lt: new Date(Date.now() - 5 * 60 * 1000) } // No heartbeat for 5 min
});
```

---

### **Issue #5: testType Parsing for Feature** 🟡 MEDIUM PRIORITY

**Problem:**
```javascript
// ❌ Fragile - breaks if testType format changes
const feature = test.testType.split('-')[0]; // 'phishing-url' → 'phishing'
```

**Fix: Store feature explicitly**
```javascript
// Update TestResult model
{
  feature: {
    type: String,
    enum: ['phishing', 'clone', 'malware', 'scam'],
    required: true,
    index: true
  },
  testType: String // Keep for specificity
}

// When creating test
const testResult = new TestResult({
  userId: req.user._id,
  feature: 'phishing', // ✅ Explicit
  testType: 'phishing-url',
  // ...
});

// When accessing queue
const queue = queues[test.feature]; // ✅ Direct access
```

**Helper function:**
```javascript
// backend/src/lib/utils.js
export function getFeatureFromTestType(testType) {
  const mapping = {
    'phishing-url': 'phishing',
    'phishing-email': 'phishing',
    'clone-ai': 'clone',
    'clone-ml': 'clone',
    'clone-combined': 'clone',
    'malware-virustotal': 'malware',
    'malware-sandbox': 'malware',
    'scam-phone': 'scam'
  };
  
  return mapping[testType] || null;
}
```

---

### **Issue #6: Race Condition - Create vs Enqueue** 🟡 MEDIUM PRIORITY

**Problem:**
```javascript
// ❌ If enqueue fails, DB has orphaned record
await testResult.save();
const jobId = await enqueue('phishing', jobData); // ❌ Redis down = orphan
testResult.queueJobId = jobId;
await testResult.save();
```

**Fix: Wrap in try-catch**
```javascript
try {
  // 1. Create TestResult
  const testResult = new TestResult({ ... });
  await testResult.save();
  
  console.log(`✅ Created test ${testResult._id}`);
  
  // 2. Add to queue
  try {
    const jobId = await enqueue('phishing', {
      testId: testResult._id.toString(),
      userId: req.user._id.toString(),
      url
    });
    
    console.log(`✅ Added job ${jobId} to queue`);
    
    // 3. Update with job ID
    testResult.queueJobId = jobId;
    await testResult.save();
    
  } catch (enqueueError) {
    // Enqueue failed - mark test as failed
    console.error('Failed to enqueue:', enqueueError);
    
    testResult.processingStatus = 'failed';
    testResult.processingError = `Failed to queue: ${enqueueError.message}`;
    testResult.auditTrail.push({
      action: 'enqueue_failed',
      timestamp: new Date(),
      details: { error: enqueueError.message }
    });
    await testResult.save();
    
    return res.status(500).json({
      success: false,
      error: 'Failed to queue analysis. Please try again.'
    });
  }
  
  // 4. Get position (optional, can fail)
  try {
    const job = await queues.phishing.getJob(testResult.queueJobId);
    if (job) {
      const position = await job.getPosition();
      testResult.queuePosition = position >= 0 ? position + 1 : null;
      await testResult.save();
    }
  } catch (posError) {
    console.error('Failed to get position:', posError);
    // Don't fail request for this
  }
  
  // 5. Return success
  res.json({
    success: true,
    testId: testResult._id,
    message: 'Analysis queued successfully',
    queuePosition: testResult.queuePosition
  });
  
} catch (error) {
  console.error('Error creating test:', error);
  res.status(500).json({
    success: false,
    error: 'Failed to create test'
  });
}
```

---

### **Issue #7: Admin Socket Subscription Memory Leak** 🔴 HIGH PRIORITY

**Problem:**
```javascript
// ❌ Creates new Redis subscriber per admin connection
adminIO.on('connection', (socket) => {
  subscribeToEvents((event, data) => {
    socket.emit(event, data); // ❌ Leak - never unsubscribed
  });
});
```

**Fix: Single global subscriber**
```javascript
// backend/server.js

// Create ONE global subscriber
let adminSockets = new Set();

// Subscribe once at startup
subscribeToEvents((event, data, timestamp) => {
  // Broadcast to ALL connected admin sockets
  for (const socket of adminSockets) {
    socket.emit(event, { ...data, timestamp });
  }
});

// Admin connections just add/remove from set
adminIO.on('connection', async (socket) => {
  console.log(`[Admin Socket] ${socket.user.email} connected`);
  
  // Add to set
  adminSockets.add(socket);
  
  // Send initial stats
  const stats = await getAdminStats();
  socket.emit('stats', stats);
  
  // Remove on disconnect
  socket.on('disconnect', () => {
    adminSockets.delete(socket);
    console.log(`[Admin Socket] ${socket.user.email} disconnected`);
  });
});
```

**Alternative: Return unsubscribe function**
```javascript
// backend/src/lib/pubsub.js

export const subscribeToEvents = (callback) => {
  const listener = (channel, message) => {
    const { event, data, timestamp } = JSON.parse(message);
    callback(event, data, timestamp);
  };
  
  subscriber.on('message', listener);
  subscriber.subscribe(CHANNEL);
  
  // Return unsubscribe function
  return () => {
    subscriber.off('message', listener);
  };
};

// Usage
adminIO.on('connection', (socket) => {
  const unsubscribe = subscribeToEvents((event, data) => {
    socket.emit(event, data);
  });
  
  socket.on('disconnect', () => {
    unsubscribe(); // ✅ Clean up
  });
});
```

---

### **Issue #8: Security & Rate Limiting** 🔴 HIGH PRIORITY

**Add Rate Limiting:**
```javascript
// Install
npm install express-rate-limit

// backend/server.js
import rateLimit from 'express-rate-limit';

// Rate limiter for job submission
const jobSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Max 50 requests per 15 min per IP
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Apply to job endpoints
app.post('/api/phishing/analyze', protectRoute, jobSubmitLimiter, async (req, res) => {
  // ...
});

// Stricter limit per user
const perUserLimiter = async (req, res, next) => {
  const recentJobs = await TestResult.countDocuments({
    userId: req.user._id,
    createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
  });
  
  if (recentJobs >= 20) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Max 20 jobs per 15 minutes.'
    });
  }
  
  next();
};

app.post('/api/phishing/analyze', protectRoute, perUserLimiter, async (req, res) => {
  // ...
});
```

**Input Validation:**
```javascript
// Install
npm install express-validator

import { body, validationResult } from 'express-validator';

app.post('/api/phishing/analyze',
  protectRoute,
  perUserLimiter,
  [
    body('url')
      .isURL({ require_protocol: true })
      .withMessage('Invalid URL format')
      .isLength({ max: 2048 })
      .withMessage('URL too long')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    // Process...
  }
);
```

---

### **Issue #9: Job Retry Attempts Tracking** 🟡 MEDIUM PRIORITY

**Problem:**
```javascript
// ❌ Only updates attempts at start, not on retry
attempts: job.attemptsMade + 1
```

**Fix: Track in Bull event hooks**
```javascript
// backend/src/workers/phishingWorker.js

queues.phishing.on('active', async (job) => {
  // Update attempts when job becomes active
  await TestResult.findOneAndUpdate(
    { _id: job.data.testId },
    { 
      $set: { attempts: job.attemptsMade + 1 },
      $push: {
        auditTrail: {
          action: 'attempt_started',
          timestamp: new Date(),
          details: { attempt: job.attemptsMade + 1, jobId: job.id }
        }
      }
    }
  );
});

queues.phishing.on('failed', async (job, err) => {
  // Update on failure
  await TestResult.findOneAndUpdate(
    { _id: job.data.testId },
    {
      $push: {
        auditTrail: {
          action: 'attempt_failed',
          timestamp: new Date(),
          details: { 
            attempt: job.attemptsMade + 1,
            error: err.message,
            willRetry: job.attemptsMade < job.opts.attempts
          }
        }
      }
    }
  );
});
```

---

### **Issue #10: Worker Cancellation Check** 🟡 MEDIUM PRIORITY

**Problem:**
```javascript
// ❌ Worker doesn't check if job was cancelled by admin
// Continues processing even after admin cancels
```

**Fix: Check status before saving results**
```javascript
// In worker, before saving results
queues.phishing.process(2, async (job) => {
  const { testId, userId, url } = job.data;
  
  try {
    // ... process job ...
    
    const result = await callPhishingService(url);
    
    // ✅ Check if cancelled before saving
    const test = await TestResult.findById(testId);
    
    if (test.processingStatus === 'cancelled') {
      console.log(`[Worker] Job ${job.id} was cancelled, skipping result save`);
      return { success: false, reason: 'cancelled' };
    }
    
    // Save results
    await TestResult.findByIdAndUpdate(testId, {
      processingStatus: 'completed',
      result: result.result,
      details: result.details
    });
    
    return { success: true, testId };
    
  } catch (error) {
    // ...
  }
});
```

---

### **Issue #11: Structured Logging with Correlation IDs** 🟢 LOW PRIORITY

**Add Correlation IDs:**
```javascript
// backend/src/lib/logger.js

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ciphercop-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add correlation ID middleware
export const correlationMiddleware = (req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
};

// Usage
logger.info('Job started', {
  correlationId: req.correlationId,
  testId,
  userId,
  jobId
});
```

---

## 📋 UPDATED IMPLEMENTATION CHECKLIST

### **Critical Fixes (Do First):**
- [ ] Fix #1: Worker heartbeat variable scope
- [ ] Fix #2: job.getPosition() null handling
- [ ] Fix #7: Admin socket memory leak
- [ ] Fix #8: Add rate limiting & input validation

### **Important Fixes (Do Second):**
- [ ] Fix #3: Handle retry conflicts
- [ ] Fix #4: Separate heartbeat from progress
- [ ] Fix #5: Store feature explicitly
- [ ] Fix #6: Handle enqueue failures
- [ ] Fix #9: Track retry attempts correctly
- [ ] Fix #10: Check cancellation in workers

### **Nice to Have (Do Later):**
- [ ] Fix #11: Add correlation IDs
- [ ] Add dead-letter queue
- [ ] Add worker health metrics
- [ ] Add email notifications

---

## 🔄 CORRECTED CODE EXAMPLES

### **Corrected Worker Template:**
```javascript
// backend/src/workers/phishingWorker.js (CORRECTED)

import { queues } from '../lib/queues.js';
import { TestResult } from '../models/TestResult.js';
import { publishEvent } from '../lib/pubsub.js';
import fetch from 'node-fetch';
import logger from '../lib/logger.js';

console.log('[Phishing Worker] Starting...');

// Process phishing jobs (2 concurrent)
queues.phishing.process(2, async (job) => {
  const { testId, userId, url } = job.data;
  let heartbeatInterval = null; // ✅ Declare at top
  
  logger.info('Processing job', { jobId: job.id, testId, url });
  
  try {
    // Update status to 'processing'
    await TestResult.findByIdAndUpdate(testId, {
      processingStatus: 'processing',
      processingStartedAt: new Date(),
      lastHeartbeat: new Date(), // ✅ Initial heartbeat
      $push: {
        auditTrail: {
          action: 'processing_started',
          timestamp: new Date(),
          details: { jobId: job.id, attempt: job.attemptsMade + 1 }
        }
      }
    });
    
    // Start heartbeat - updates lastHeartbeat
    heartbeatInterval = setInterval(async () => {
      try {
        await TestResult.findByIdAndUpdate(testId, {
          lastHeartbeat: new Date()
        });
        logger.debug('Heartbeat', { jobId: job.id, testId });
      } catch (err) {
        logger.error('Heartbeat failed', { jobId: job.id, error: err.message });
      }
    }, 10000);
    
    // Call Python service with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    
    const response = await fetch('http://localhost:5008/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`Python service returned ${response.status}`);
    }
    
    const result = await response.json();
    
    // ✅ Check if cancelled before saving
    const test = await TestResult.findById(testId);
    if (test.processingStatus === 'cancelled') {
      logger.info('Job cancelled, skipping result save', { jobId: job.id, testId });
      return { success: false, reason: 'cancelled' };
    }
    
    // Update TestResult with results
    await TestResult.findByIdAndUpdate(testId, {
      processingStatus: 'completed',
      processingCompletedAt: new Date(),
      result: result.result,
      details: result.details,
      flags: result.flags,
      recommendations: result.recommendations,
      insights: result.insights,
      $push: {
        auditTrail: {
          action: 'processing_completed',
          timestamp: new Date(),
          details: { jobId: job.id, riskScore: result.result?.riskScore }
        }
      }
    });
    
    logger.info('Job completed', { jobId: job.id, testId, riskScore: result.result?.riskScore });
    
    return { success: true, testId, riskScore: result.result?.riskScore };
    
  } catch (error) {
    logger.error('Job failed', { jobId: job.id, testId, error: error.message, stack: error.stack });
    
    // Update TestResult with error
    await TestResult.findByIdAndUpdate(testId, {
      processingStatus: 'failed',
      processingCompletedAt: new Date(),
      processingError: error.message,
      $push: {
        auditTrail: {
          action: 'processing_failed',
          timestamp: new Date(),
          details: {
            jobId: job.id,
            error: error.message,
            attempt: job.attemptsMade + 1
          }
        }
      }
    });
    
    throw error; // Bull will retry
    
  } finally {
    // ✅ Always clear heartbeat
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  }
});

// Event listeners
queues.phishing.on('completed', (job, result) => {
  logger.info('Queue job completed', { jobId: job.id, result });
  publishEvent('job.completed', {
    service: 'phishing',
    jobId: job.id,
    testId: job.data.testId,
    result
  });
});

queues.phishing.on('failed', (job, err) => {
  logger.error('Queue job failed', { jobId: job.id, error: err.message });
  publishEvent('job.failed', {
    service: 'phishing',
    jobId: job.id,
    testId: job.data.testId,
    error: err.message
  });
});

queues.phishing.on('active', async (job) => {
  logger.info('Queue job active', { jobId: job.id, testId: job.data.testId });
  
  // ✅ Update attempts
  await TestResult.findOneAndUpdate(
    { _id: job.data.testId },
    { 
      $set: { attempts: job.attemptsMade + 1 }
    }
  );
  
  publishEvent('job.active', {
    service: 'phishing',
    jobId: job.id,
    testId: job.data.testId
  });
});

logger.info('Phishing worker ready');
```

---

## ✅ ALL ISSUES ADDRESSED

**Status:** README updated with all fixes and corrections! 🎯



---

## 🔒 PRODUCTION HARDENING (CRITICAL)

### **Issue #12: Redis Production Configuration** 🔴 HIGH PRIORITY

**Problem:** Default Redis settings are not production-ready (no persistence, no memory limits, no auth)

**Fix: Production redis.conf**
```conf
# redis.conf - Production Configuration

# Persistence (AOF + RDB)
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec

# RDB Snapshots
save 900 1      # After 900 sec if at least 1 key changed
save 300 10     # After 300 sec if at least 10 keys changed
save 60 10000   # After 60 sec if at least 10000 keys changed

# Memory Management
maxmemory 4gb
maxmemory-policy allkeys-


---

## 🔒 PRODUCTION HARDENING (CRITICAL)

### **Issue #12: Redis Production Configuration** 🔴 HIGH PRIORITY

**Problem:** Default Redis settings are not production-ready (no persistence, no memory limits, no auth)

**Fix: Production redis.conf**
```conf
# redis.conf - Production Configuration

# Persistence (AOF + RDB)
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec

# RDB Snapshots
save 900 1      # Save after 900 sec if 1 key changed
save 300 10     # Save after 300 sec if 10 keys changed
save 60 10000   # Save after 60 sec if 10000 keys changed

# Memory Management
maxmemory 4gb
maxmemory-policy allkeys-lru

# Security
requirepass YOUR_STRONG_PASSWORD_HERE
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""

# Network
bind 127.0.0.1
protected-mode yes
port 6379

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Performance
tcp-backlog 511
timeout 0
tcp-keepalive 300
```

**Docker Compose Example:**
```yaml
# docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: ciphercop-redis
    command: redis-server /usr/local/etc/redis/redis.conf
    ports:
      - "6379:6379"
    volumes:
      - ./redis.conf:/usr/local/etc/redis/redis.conf
      - redis-data:/data
      - redis-logs:/var/log/redis
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  redis-sentinel:
    image: redis:7-alpine
    container_name: ciphercop-redis-sentinel
    command: redis-sentinel /usr/local/etc/redis/sentinel.conf
    ports:
      - "26379:26379"
    volumes:
      - ./sentinel.conf:/usr/local/etc/redis/sentinel.conf
    depends_on:
      - redis
    restart: unless-stopped

volumes:
  redis-data:
  redis-logs:
```

**Redis Sentinel Configuration (High Availability):**
```conf
# sentinel.conf
port 26379
sentinel monitor ciphercop-master 127.0.0.1 6379 2
sentinel auth-pass ciphercop-master YOUR_STRONG_PASSWORD
sentinel down-after-milliseconds ciphercop-master 5000
sentinel parallel-syncs ciphercop-master 1
sentinel failover-timeout ciphercop-master 10000
```

**Monitoring Redis:**
```bash
# Check memory usage
redis-cli INFO memory

# Check connected clients
redis-cli CLIENT LIST

# Monitor commands in real-time
redis-cli MONITOR

# Check persistence status
redis-cli INFO persistence
```

---

### **Issue #13: Atomic Duplicate Prevention** 🔴 HIGH PRIORITY

**Problem:** Race condition - two identical requests can both pass duplicate check

**Fix: Add Unique Compound Index**

**Update TestResult Model:**
```javascript
// backend/src/models/TestResult.js

// Add unique compound index with partial filter
testResultSchema.index(
  { userId: 1, payloadHash: 1 },
  { 
    unique: true,
    partialFilterExpression: { 
      processingStatus: { $in: ['queued', 'processing'] }
    },
    name: 'unique_active_payload'
  }
);
```

**Create Migration Script:**
```javascript
// backend/src/migrations/001_add_unique_payload_index.js

import mongoose from 'mongoose';
import { TestResult } from '../models/TestResult.js';

export async function up() {
  console.log('Creating unique payload index...');
  
  try {
    await TestResult.collection.createIndex(
      { userId: 1, payloadHash: 1 },
      { 
        unique: true,
        partialFilterExpression: { 
          processingStatus: { $in: ['queued', 'processing'] }
        },
        name: 'unique_active_payload'
      }
    );
    
    console.log('✅ Index created successfully');
  } catch (error) {
    if (error.code === 85) {
      console.log('Index already exists, skipping');
    } else {
      throw error;
    }
  }
}

export async function down() {
  console.log('Dropping unique payload index...');
  await TestResult.collection.dropIndex('unique_active_payload');
  console.log('✅ Index dropped');
}
```

**Run Migration on Startup:**
```javascript
// backend/server.js

import { up as migratePayloadIndex } from './src/migrations/001_add_unique_payload_index.js';

// Run migrations on startup
async function runMigrations() {
  try {
    console.log('Running database migrations...');
    await migratePayloadIndex();
    console.log('✅ Migrations complete');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// After DB connection
connectDB().then(async () => {
  await runMigrations();
  // Start server...
});
```

**Handle Duplicate Key Error:**
```javascript
// backend/server.js

app.post('/api/phishing/analyze', protectRoute, async (req, res) => {
  try {
    const testResult = new TestResult({ ... });
    await testResult.save();
    
  } catch (error) {
    // Handle duplicate key error (E11000)
    if (error.code === 11000 && error.keyPattern?.payloadHash) {
      console.log('Duplicate detected via index');
      
      // Find existing test
      const existing = await TestResult.findOne({
        userId: req.user._id,
        payloadHash: testResult.payloadHash,
        processingStatus: { $in: ['queued', 'processing'] }
      });
      
      if (existing) {
        return res.json({
          success: true,
          testId: existing._id,
          message: 'Test already queued',
          duplicate: true,
          queuePosition: existing.queuePosition
        });
      }
    }
    
    throw error;
  }
});
```

---

### **Issue #14: Graceful Worker Shutdown** 🔴 HIGH PRIORITY

**Problem:** Workers don't gracefully shutdown - jobs can be interrupted

**Fix: Add Shutdown Handlers**

**Update Worker Template:**
```javascript
// backend/src/workers/phishingWorker.js

import { queues } from '../lib/queues.js';
import logger from '../lib/logger.js';

let isShuttingDown = false;

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Stop accepting new jobs
    await queues.phishing.pause();
    logger.info('Queue paused, no new jobs will be processed');
    
    // Wait for active jobs to complete (max 2 minutes)
    const timeout = setTimeout(() => {
      logger.warn('Shutdown timeout reached, forcing exit');
      process.exit(1);
    }, 120000);
    
    // Close queue gracefully
    await queues.phishing.close();
    clearTimeout(timeout);
    
    logger.info('All jobs completed, shutting down');
    process.exit(0);
    
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Register signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection:', { reason, promise });
  gracefulShutdown('unhandledRejection');
});

logger.info('Phishing worker started with graceful shutdown support');
```

**PM2 Ecosystem File:**
```javascript
// ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'phishing-worker',
      script: './src/workers/phishingWorker.js',
      instances: 2,
      exec_mode: 'cluster',
      kill_timeout: 120000, // 2 minutes for graceful shutdown
      wait_ready: true,
      listen_timeout: 10000,
      shutdown_with_message: true,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'clone-worker',
      script: './src/workers/cloneWorker.js',
      instances: 1,
      kill_timeout: 120000,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'malware-worker',
      script: './src/workers/malwareWorker.js',
      instances: 2,
      kill_timeout: 120000,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'scam-worker',
      script: './src/workers/scamWorker.js',
      instances: 2,
      kill_timeout: 120000,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'watchdog',
      script: './src/cron/watchdog.js',
      instances: 1,
      kill_timeout: 30000,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

**Kubernetes PreStop Hook:**
```yaml
# k8s/worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: phishing-worker
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: worker
        image: ciphercop-worker:latest
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"] # Allow time for graceful shutdown
        env:
        - name: NODE_ENV
          value: "production"
      terminationGracePeriodSeconds: 120
```

---

### **Issue #15: Circuit Breaker for Python Services** 🟡 MEDIUM PRIORITY

**Problem:** If Python service is down, workers keep retrying and queue backs up

**Fix: Add Circuit Breaker**

**Install:**
```bash
npm install opossum
```

**Create Circuit Breaker Wrapper:**
```javascript
// backend/src/lib/circuitBreaker.js

import CircuitBreaker from 'opossum';
import logger from './logger.js';

const options = {
  timeout: 60000,                    // 60s timeout
  errorThresholdPercentage: 50,      // Open circuit if 50% fail
  resetTimeout: 30000,               // Try again after 30s
  rollingCountTimeout: 10000,        // 10s window
  rollingCountBuckets: 10,
  name: 'python-service'
};

// Create circuit breaker for Python service calls
export function createPythonServiceBreaker(serviceName, serviceUrl) {
  const breaker = new CircuitBreaker(
    async (endpoint, body) => {
      const response = await fetch(`${serviceUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000)
      });
      
      if (!response.ok) {
        throw new Error(`Service returned ${response.status}`);
      }
      
      return await response.json();
    },
    options
  );
  
  // Event listeners
  breaker.on('open', () => {
    logger.error(`Circuit breaker OPEN for ${serviceName}`, {
      service: serviceName,
      url: serviceUrl
    });
    // TODO: Send alert to admin
  });
  
  breaker.on('halfOpen', () => {
    logger.warn(`Circuit breaker HALF-OPEN for ${serviceName}`, {
      service: serviceName
    });
  });
  
  breaker.on('close', () => {
    logger.info(`Circuit breaker CLOSED for ${serviceName}`, {
      service: serviceName
    });
  });
  
  breaker.on('reject', () => {
    logger.warn(`Request rejected by circuit breaker for ${serviceName}`);
  });
  
  return breaker;
}

// Export breakers for each service
export const breakers = {
  phishing: createPythonServiceBreaker('phishing', 'http://localhost:5008'),
  cloneAI: createPythonServiceBreaker('clone-ai', 'http://localhost:5003'),
  cloneML: createPythonServiceBreaker('clone-ml', 'http://localhost:5000'),
  malware: createPythonServiceBreaker('malware', 'http://localhost:5004'),
  scam: createPythonServiceBreaker('scam', 'http://localhost:5006')
};
```

**Use in Worker:**
```javascript
// backend/src/workers/phishingWorker.js

import { breakers } from '../lib/circuitBreaker.js';

queues.phishing.process(2, async (job) => {
  const { testId, userId, url } = job.data;
  
  try {
    // Use circuit breaker
    const result = await breakers.phishing.fire('/analyze', { url });
    
    // Save results...
    
  } catch (error) {
    if (error.message === 'Breaker is open') {
      // Circuit is open - service is down
      logger.error('Python service unavailable', { service: 'phishing' });
      
      // Pause queue temporarily
      await queues.phishing.pause();
      
      // Resume after 1 minute
      setTimeout(() => {
        queues.phishing.resume();
        logger.info('Queue resumed after circuit breaker cooldown');
      }, 60000);
      
      throw new Error('Service temporarily unavailable');
    }
    
    throw error;
  }
});
```

---

### **Issue #16: Bull Board Security Hardening** 🟡 MEDIUM PRIORITY

**Problem:** Bull Board admin UI needs additional security

**Fix: Add IP Allowlist & CSRF Protection**

**Install:**
```bash
npm install express-ipfilter csurf
```

**Secure Bull Board:**
```javascript
// backend/server.js

import { IpFilter } from 'express-ipfilter';
import csrf from 'csurf';

// IP allowlist for admin endpoints
const adminIpAllowlist = process.env.ADMIN_IP_ALLOWLIST?.split(',') || ['127.0.0.1'];

const ipFilter = IpFilter(adminIpAllowlist, {
  mode: 'allow',
  logLevel: 'deny',
  log: (clientIp, access) => {
    if (access === 'deny') {
      logger.warn('Admin access denied', { ip: clientIp });
    }
  }
});

// CSRF protection
const csrfProtection = csrf({ cookie: true });

// Secure Bull Board
app.use('/admin/bull-board',
  ipFilter,                    // IP allowlist
  protectRoute,                // JWT authentication
  adminOnly,                   // Admin role check
  csrfProtection,              // CSRF protection
  serverAdapter.getRouter()
);

// CSRF token endpoint
app.get('/admin/csrf-token', protectRoute, adminOnly, csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

**Environment Variables:**
```bash
# .env
ADMIN_IP_ALLOWLIST=127.0.0.1,192.168.1.100,10.0.0.5
```

---

### **Issue #17: Prometheus Alert Rules** 🟢 LOW-MEDIUM PRIORITY

**Add Alert Rules:**

**Create alerts.yml:**
```yaml
# prometheus/alerts.yml

groups:
  - name: ciphercop_queue_alerts
    interval: 30s
    rules:
      # High queue size
      - alert: HighQueueSize
        expr: ciphercop_queue_size{status="waiting"} > 50
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High queue size for {{ $labels.service }}"
          description: "Queue {{ $labels.service }} has {{ $value }} waiting jobs"
      
      # Very high queue size
      - alert: CriticalQueueSize
        expr: ciphercop_queue_size{status="waiting"} > 100
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Critical queue size for {{ $labels.service }}"
          description: "Queue {{ $labels.service }} has {{ $value }} waiting jobs"
      
      # High failure rate
      - alert: HighJobFailureRate
        expr: rate(ciphercop_jobs_total{status="failed"}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High job failure rate for {{ $labels.service }}"
          description: "{{ $labels.service }} has high failure rate"
      
      # Job duration P95 high
      - alert: SlowJobProcessing
        expr: histogram_quantile(0.95, rate(ciphercop_job_duration_seconds_bucket[5m])) > 120
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow job processing for {{ $labels.service }}"
          description: "P95 job duration is {{ $value }}s"
      
      # No jobs processed (worker down?)
      - alert: NoJobsProcessed
        expr: rate(ciphercop_jobs_total[5m]) == 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "No jobs processed for {{ $labels.service }}"
          description: "Worker may be down"
      
      # Redis connection issues
      - alert: RedisConnectionFailed
        expr: up{job="redis"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis is down"
          description: "Cannot connect to Redis"
```

**Grafana Dashboard JSON:**
```json
{
  "dashboard": {
    "title": "CipherCop Queue Monitoring",
    "panels": [
      {
        "title": "Queue Sizes",
        "targets": [
          {
            "expr": "ciphercop_queue_size",
            "legendFormat": "{{service}} - {{status}}"
          }
        ]
      },
      {
        "title": "Job Duration P95",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(ciphercop_job_duration_seconds_bucket[5m]))",
            "legendFormat": "{{service}}"
          }
        ]
      },
      {
        "title": "Job Success/Failure Rate",
        "targets": [
          {
            "expr": "rate(ciphercop_jobs_total[5m])",
            "legendFormat": "{{service}} - {{status}}"
          }
        ]
      }
    ]
  }
}
```

---

### **Issue #18: Database Migration System** 🟢 LOW-MEDIUM PRIORITY

**Create Migration Runner:**
```javascript
// backend/src/lib/migrationRunner.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '../migrations');

export async function runMigrations() {
  logger.info('Starting database migrations...');
  
  try {
    // Get all migration files
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.js'))
      .sort();
    
    for (const file of files) {
      logger.info(`Running migration: ${file}`);
      
      const migration = await import(path.join(migrationsDir, file));
      
      try {
        await migration.up();
        logger.info(`✅ Migration ${file} completed`);
      } catch (error) {
        logger.error(`❌ Migration ${file} failed:`, error);
        throw error;
      }
    }
    
    logger.info('✅ All migrations completed successfully');
    
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}
```

**Add to Server Startup:**
```javascript
// backend/server.js

import { runMigrations } from './src/lib/migrationRunner.js';

// After DB connection
connectDB().then(async () => {
  // Run migrations
  await runMigrations();
  
  // Start server
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
```

---

## ✅ FINAL PRODUCTION CHECKLIST

### **Critical (Must Do Before Production):**
- [ ] ✅ Redis production config (persistence, memory, auth)
- [ ] ✅ Atomic duplicate prevention (unique index)
- [ ] ✅ Graceful worker shutdown (SIGTERM/SIGINT)
- [ ] ✅ Circuit breaker for Python services
- [ ] ✅ Bull Board security (IP allowlist, CSRF)
- [ ] ✅ Worker heartbeat scope fix (finally block)
- [ ] ✅ job.getPosition() null handling
- [ ] ✅ Admin socket memory leak fix (global subscriber)
- [ ] ✅ Rate limiting on job submission
- [ ] ✅ Input validation (express-validator)

### **Important (Should Do):**
- [ ] ✅ Prometheus alert rules
- [ ] ✅ Database migration system
- [ ] ✅ Structured logging with correlation IDs
- [ ] ✅ Worker cancellation check
- [ ] ✅ Retry attempts tracking
- [ ] ✅ PM2 ecosystem file
- [ ] ✅ Docker Compose for Redis
- [ ] ✅ Kubernetes deployment configs

### **Nice to Have (Can Do Later):**
- [ ] Unit tests for queue flows
- [ ] E2E tests for worker processing
- [ ] CI/CD pipeline
- [ ] Dead-letter queue
- [ ] Worker health metrics
- [ ] Email notifications
- [ ] Redis Sentinel/Cluster setup

---

## 📊 WHAT'S ALREADY FIXED (Mark as Done)

✅ **Worker heartbeat variable scope** - Fixed with finally block  
✅ **job.getPosition() null handling** - Added null checks and fallback  
✅ **testId as jobId retry conflicts** - Documented removal before retry  
✅ **Heartbeat vs progress semantics** - Added lastHeartbeat field  
✅ **testType parsing fragility** - Added feature field  
✅ **Race condition (create vs enqueue)** - Added try-catch wrapper  
✅ **Admin socket memory leak** - Global subscriber pattern  
✅ **Enqueue failure handling** - Mark DB failed if enqueue fails  
✅ **Watchdog for stuck jobs** - Cron job implemented  
✅ **Worker cancellation check** - Check status before saving  

---

**Status:** All production hardening items documented and ready for implementation! 🎯

**Last Updated:** December 5, 2025  
**Version:** 2.0 (Production Hardening Complete)

