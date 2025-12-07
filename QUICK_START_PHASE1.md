# 🚀 Quick Start - Phase 1 Queue System

## Start Everything (Copy-Paste Commands)

### Terminal 1 - Redis
```bash
wsl redis-server
```
**Wait for**: `Ready to accept connections`

---

### Terminal 2 - Worker
```bash
cd backend
node src/workers/phishingWorker.js
```
**Wait for**: 
- `✅ Queue system initialized`
- `✅ Phishing Worker: Redis connected`
- `✅ Phishing Worker: MongoDB connected`

---

### Terminal 3 - Backend
```bash
cd backend
npm start
```
**Wait for**: 
- `✅ Bull Board available at: http://localhost:5001/admin/queues`
- `Server running at http://localhost:5001`
- `MONGO DB Connected`

---

### Terminal 4 - Frontend (Optional)
```bash
cd frontend
npm run dev
```
**Wait for**: `Local: http://localhost:5173`

---

## Test the Queue System

### Option 1: Frontend (Recommended)
1. Open http://localhost:5173
2. Login or signup
3. Go to Phishing Protection page
4. Enter URL: `facebook.com`
5. Click "Analyze URL"
6. Watch progress: Queued → Analyzing → Complete
7. See results displayed

### Option 2: cURL (For Testing)
```bash
# Login first
curl -X POST http://localhost:5001/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}" \
  -c cookies.txt

# Queue analysis
curl -X POST http://localhost:5001/api/phishing/analyze \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"url\":\"facebook.com\"}"

# Response will include testId - use it to check status
curl http://localhost:5001/api/tests/TEST_ID_HERE/status -b cookies.txt
```

---

## Monitor the Queue

### Bull Board Dashboard
**URL**: http://localhost:5001/admin/queues

**What to check**:
- Active jobs count
- Completed jobs count
- Failed jobs (should be 0)
- Job details and logs

---

## Verify Everything Works

### ✅ Checklist
- [ ] Redis shows "Ready to accept connections"
- [ ] Worker shows "✅ Redis connected"
- [ ] Worker shows "✅ MongoDB connected"
- [ ] Backend shows "Server running at http://localhost:5001"
- [ ] Frontend loads at http://localhost:5173
- [ ] Can login/signup
- [ ] URL analysis queues successfully
- [ ] Worker picks up job (check worker terminal)
- [ ] Results appear in frontend
- [ ] Bull Board shows completed job

---

## Common Issues

### "Maximum 3 concurrent analyses allowed"
**Fix**: Clean stuck jobs in MongoDB
```javascript
// In MongoDB Compass
db.testresults.updateMany(
  { processingStatus: { $in: ["queued", "processing"] } },
  { $set: { processingStatus: "completed" } }
)
```

### Worker not processing
**Check**:
1. Redis running? `wsl redis-cli ping`
2. Worker terminal shows errors?
3. MongoDB connected?

### Frontend stuck on "Queueing..."
**Check**:
1. Backend running on port 5001?
2. Logged in? (check cookies)
3. Browser console errors?

---

## What Changed from Before

### Before (Synchronous)
```
User submits URL → Wait 10-30s → Show results
```

### After (Asynchronous with Queue)
```
User submits URL → Queue (instant) → Poll every 3s → Show results
```

**Benefits**:
- ✅ No blocking - user can continue browsing
- ✅ Multiple users can analyze simultaneously
- ✅ Automatic retries on failure
- ✅ Full monitoring with Bull Board
- ✅ Scalable architecture

---

## Next Steps

Once everything works:
1. Test with multiple URLs
2. Check Bull Board for job history
3. Try concurrent limit (submit 4 URLs quickly)
4. Check test history in frontend
5. Ready for Phase 2 (notifications + admin page)

---

**Status**: Phase 1 Complete ✅
**Queue System**: Active and Working 🚀
