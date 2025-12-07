# ⚡ Quick Test Commands - Phishing Queue

## 🚀 Start Services

```bash
# 1. Start Redis (WSL)
wsl redis-server

# 2. Start Worker (Terminal 1)
cd backend
node src/workers/phishingWorker.js

# 3. Start Backend (Terminal 2)
cd backend
npm start
```

---

## 🧪 Test Commands

### Login First:
```bash
curl -X POST http://localhost:5001/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt
```

### Test Normal Endpoint (Old):
```bash
curl -X POST http://localhost:5001/api/phishing/analyze \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"url":"https://google.com"}'
```

### Test Queued Endpoint (New):
```bash
curl -X POST http://localhost:5001/api/phishing/analyze-queued \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"url":"https://google.com"}'
```

### Check Status:
```bash
# Replace TEST_ID with actual testId from above
curl -X GET "http://localhost:5001/api/tests/TEST_ID/status" \
  -b cookies.txt
```

### Admin Stats:
```bash
curl -X GET http://localhost:5001/api/admin/stats \
  -b cookies.txt
```

---

## 🌐 URLs

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5001
- **Bull Board**: http://localhost:5001/admin/queues
- **Admin API**: http://localhost:5001/api/admin/stats

---

## ✅ Expected Results

### Queued Endpoint Response:
```json
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

### Status While Queued:
```json
{
  "success": true,
  "status": "queued",
  "queuePosition": 1,
  "createdAt": "2025-12-07T..."
}
```

### Status When Complete:
```json
{
  "success": true,
  "status": "completed",
  "result": { /* full test result */ },
  "createdAt": "2025-12-07T..."
}
```

---

## 🐛 Quick Fixes

### Redis not running:
```bash
wsl redis-server
```

### Check Redis:
```bash
wsl redis-cli ping
# Should return: PONG
```

### Check Worker:
```bash
# Should see these logs:
✅ Phishing Worker: MongoDB connected
🚀 Phishing Worker started and listening for jobs...
```

### Check Backend:
```bash
# Should see:
✅ Queue system initialized
✅ Bull Board available at: http://localhost:5001/admin/queues
Server running at http://localhost:5001/
```

---

**That's it!** Start services and run test commands. 🚀
