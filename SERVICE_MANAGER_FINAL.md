# ✅ Service Manager - Final Version

## 🔧 Changes Made

### 1. Redis Handling
- ✅ **Removed from auto-start** (option 1)
- ✅ **Kept in status check** (option 4)
- ✅ **Not stopped** when stopping services (option 3)

**Reason**: Redis should run continuously in WSL, no need to start/stop it.

### 2. Fixed Status Check (Option 4)
- ✅ Fixed Redis status detection
- ✅ Fixed Worker status detection
- ✅ All checks now work correctly

---

## 🚀 How to Use

### Before First Use - Start Redis Once
```bash
wsl redis-server
```
Leave this running in background. You only need to do this once per system restart.

---

### Start All Services
```bash
manage-services.bat
# Select: 1
```

**Starts**:
- ✅ Phishing Worker
- ✅ Frontend (5173)
- ✅ Backend (5001)
- ✅ All Python services

**Note**: Shows message "Redis should already be running in WSL"

---

### Check Status
```bash
manage-services.bat
# Select: 4
```

**Shows**:
```
✅ Redis Server (6379): RUNNING
✅ Phishing Worker: RUNNING
✅ Service on port 5173: RUNNING
✅ Service on port 5001: RUNNING
... (all services)
```

---

### Stop Services
```bash
manage-services.bat
# Select: 3
```

**Stops**:
- ✅ Phishing Worker
- ✅ All port-based services

**Keeps Running**:
- ✅ Redis Server (stays in background)

---

## 📋 Service List

| Service | Auto-Start | Status Check | Auto-Stop |
|---------|------------|--------------|-----------|
| Redis Server | ❌ No | ✅ Yes | ❌ No |
| Phishing Worker | ✅ Yes | ✅ Yes | ✅ Yes |
| Frontend (5173) | ✅ Yes | ✅ Yes | ✅ Yes |
| Backend (5001) | ✅ Yes | ✅ Yes | ✅ Yes |
| All Python Services | ✅ Yes | ✅ Yes | ✅ Yes |

---

## 🎯 Typical Workflow

### First Time Setup
```bash
# 1. Start Redis (once)
wsl redis-server

# 2. Start all services
manage-services.bat
# Select: 1

# 3. Check everything is running
manage-services.bat
# Select: 4
```

### Daily Use
```bash
# Redis already running from before
# Just start services
manage-services.bat
# Select: 1
```

### End of Day
```bash
# Stop services (Redis keeps running)
manage-services.bat
# Select: 3
```

---

## 🔍 Status Check Details

### Redis Check
- Checks port 6379
- Should always show RUNNING (if started once)
- If NOT RUNNING: `wsl redis-server`

### Worker Check
- Checks for "Phishing Worker" window
- Should show RUNNING after option 1
- If NOT RUNNING: Check backend folder exists

### Port Services
- Checks each port (5173, 5001, 5000-5008)
- Shows RUNNING/NOT RUNNING for each
- All should be RUNNING after option 1

---

## 🐛 Troubleshooting

### Redis Shows "NOT RUNNING"
```bash
# Start Redis in WSL
wsl redis-server

# Or if already running, check:
wsl redis-cli ping
# Should return: PONG
```

### Worker Shows "NOT RUNNING"
**Check**:
1. Backend folder exists
2. Dependencies installed: `cd backend && npm install`
3. Redis is running

**Manual start**:
```bash
cd backend
node src/workers/phishingWorker.js
```

### Option 4 Not Working
- Make sure you're running as Administrator
- Check if `netstat` command works: `netstat -an`
- Check if `tasklist` command works: `tasklist`

---

## 📝 Important Notes

### Redis Management
- ✅ Start once: `wsl redis-server`
- ✅ Runs in background continuously
- ✅ Survives service restarts
- ✅ Only stops when WSL stops or system restarts

### Worker Management
- ✅ Starts with option 1
- ✅ Stops with option 3
- ✅ Requires Redis to be running
- ✅ Shows logs in separate window

### Service Dependencies
```
Redis (WSL - always running)
    ↓
Phishing Worker (starts with option 1)
    ↓
Backend (5001)
    ↓
Frontend (5173)
```

---

## ✅ Success Checklist

### Initial Setup
- [ ] Start Redis: `wsl redis-server`
- [ ] Check Redis: `wsl redis-cli ping` returns "PONG"
- [ ] Run manage-services.bat
- [ ] Select option 1 (Start ALL)
- [ ] Wait 10-20 seconds
- [ ] Select option 4 (Check Status)
- [ ] All services show RUNNING

### Daily Use
- [ ] Redis already running (check with option 4)
- [ ] Run manage-services.bat
- [ ] Select option 1
- [ ] All services start successfully
- [ ] Test at http://localhost:5173

### Shutdown
- [ ] Run manage-services.bat
- [ ] Select option 3 (Stop ALL)
- [ ] Redis stays running (check with option 4)
- [ ] All other services stopped

---

## 🎊 Final Status

- ✅ Redis: Manual start, always running
- ✅ Worker: Auto-start with option 1
- ✅ Status check: Fixed and working
- ✅ Stop services: Keeps Redis running
- ✅ All services: Managed correctly

**Service Manager**: Ready for Production ✅
