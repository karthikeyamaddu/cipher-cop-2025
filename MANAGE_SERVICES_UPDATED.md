# 🔧 Updated manage-services.bat - Now Includes Queue System

## ✅ What's New

Added **Redis Server** and **Phishing Worker** to the service manager!

### New Services
- **REDIS** - Redis Server (WSL) on port 6379
- **WORKER** - Phishing Worker (Background Queue Processing)

---

## 🚀 How to Use

### Option 1: Start ALL Services (Recommended)
```bash
manage-services.bat
# Select: 1 (Start ALL Services)
```

**This will start**:
1. ✅ Redis Server (WSL)
2. ✅ Phishing Worker (Background Queue)
3. ✅ Frontend (5173)
4. ✅ Backend (5001)
5. ✅ All Python services (5000-5008)

---

### Option 2: Start SELECTED Services
```bash
manage-services.bat
# Select: 2 (Start SELECTED Services)
# Enter: REDIS WORKER 5173 5001
```

**Examples**:
- Start only queue system: `REDIS WORKER 5001`
- Start frontend + backend + queue: `REDIS WORKER 5173 5001`
- Start everything: `REDIS WORKER 5173 5001 5003 5000 5004 5002 5005 5006 5007 5008`

---

### Option 3: Check Status
```bash
manage-services.bat
# Select: 4 (Check Service Status)
```

**Shows**:
- ✅ Redis Server (6379): RUNNING/NOT RUNNING
- ✅ Phishing Worker: RUNNING/NOT RUNNING
- ✅ All port services: RUNNING/NOT RUNNING

---

### Option 4: Stop ALL Services
```bash
manage-services.bat
# Select: 3 (Stop ALL Services)
```

**Stops**:
- Redis Server
- Phishing Worker
- All other services

---

## 📋 Service List

| Service | Port/Type | Description |
|---------|-----------|-------------|
| **REDIS** | 6379 | Redis Server (WSL) - Queue backend |
| **WORKER** | Process | Phishing Worker - Background processing |
| Frontend | 5173 | React frontend |
| Backend | 5001 | Node.js API |
| Clone-AI | 5003 | Gemini clone detection |
| Clone-ML | 5000 | Phishpedia clone detection |
| Malware-Virus | 5004 | VirusTotal analysis |
| Malware-ML | 5002 | ML malware detection |
| Malware-Sandbox | 5005 | Sandbox analysis |
| Phone-Scam | 5006 | Phone scam detection |
| ML-Phishing | 5007 | ML phishing detection |
| Email-ML-Phishing | 5008 | Email phishing ML |

---

## 🎯 Quick Start for Queue System

### Minimal Setup (Queue System Only)
```bash
manage-services.bat
# Select: 2
# Enter: REDIS WORKER 5001
```

This starts:
- Redis (for queue)
- Worker (processes jobs)
- Backend (API)

Then open frontend separately if needed.

---

## 🔍 Verify Queue System

After starting services:

1. **Check Status**:
   ```bash
   manage-services.bat
   # Select: 4
   ```
   Should show:
   - ✅ Redis Server (6379): RUNNING
   - ✅ Phishing Worker: RUNNING
   - ✅ Service on port 5001: RUNNING

2. **Check Bull Board**:
   - Open: http://localhost:5001/admin/queues
   - Should see phishing-analysis queue

3. **Test Analysis**:
   - Open: http://localhost:5173
   - Go to Phishing Protection
   - Submit URL
   - Watch it queue and process

---

## 🐛 Troubleshooting

### Redis Not Starting
**Issue**: Redis Server shows "NOT RUNNING"

**Fix**:
```bash
# Check if WSL is installed
wsl --version

# If not, install WSL first
wsl --install

# Then install Redis in WSL
wsl
sudo apt update
sudo apt install redis-server
```

### Worker Not Starting
**Issue**: Phishing Worker shows "NOT RUNNING"

**Check**:
1. Backend folder exists
2. Node.js installed
3. Dependencies installed (`npm install` in backend folder)

**Manual Start**:
```bash
cd backend
node src/workers/phishingWorker.js
```

### Port Already in Use
**Issue**: Service fails to start

**Fix**:
```bash
manage-services.bat
# Select: 3 (Stop ALL)
# Then start again
```

---

## 📝 Notes

### Important
- ✅ **Redis must be running** for queue system to work
- ✅ **Worker must be running** for jobs to process
- ✅ **Backend must be running** for API to work
- ✅ Start in order: Redis → Worker → Backend → Frontend

### Service Dependencies
```
Redis (6379)
    ↓
Phishing Worker
    ↓
Backend (5001)
    ↓
Frontend (5173)
```

### Window Titles
Each service opens in a separate CMD window with a title:
- "Redis Server"
- "Phishing Worker"
- "Frontend (5173)"
- "Backend (5001)"
- etc.

You can minimize them or close to stop individual services.

---

## ✅ Success Checklist

After running "Start ALL Services":

- [ ] Redis Server window opens
- [ ] Phishing Worker window opens (shows "✅ Redis connected")
- [ ] Backend window opens (shows "Server running")
- [ ] Frontend window opens (shows "Local: http://localhost:5173")
- [ ] All Python services start
- [ ] Check Status shows all RUNNING
- [ ] Bull Board accessible at http://localhost:5001/admin/queues
- [ ] Frontend loads at http://localhost:5173

---

**Updated**: Phase 1 Complete
**Queue System**: Integrated into manage-services.bat ✅
