# 🚀 Quick Start - Using Service Manager

## One-Command Start (Easiest Way!)

```bash
manage-services.bat
```

Then select: **1** (Start ALL Services)

That's it! Everything starts automatically:
- ✅ Redis Server
- ✅ Phishing Worker
- ✅ Backend
- ✅ Frontend
- ✅ All Python services

---

## What You'll See

### 12 Windows Will Open:

1. **Redis Server** - Shows Redis logs
2. **Phishing Worker** - Shows job processing
3. **Frontend (5173)** - React dev server
4. **Backend (5001)** - Node.js API
5. **Clone-AI (5003)** - Gemini service
6. **Clone-ML (5000)** - Phishpedia service
7. **Malware-Virus (5004)** - VirusTotal
8. **Malware-ML (5002)** - ML detection
9. **Malware-Sandbox (5005)** - Sandbox
10. **Phone-Scam (5006)** - Phone detection
11. **ML-Phishing (5007)** - URL ML
12. **Email-ML-Phishing (5008)** - Email ML

---

## Verify Everything Started

```bash
manage-services.bat
```

Select: **4** (Check Service Status)

**Should show**:
```
✅ Redis Server (6379): RUNNING
✅ Phishing Worker: RUNNING
✅ Service on port 5173: RUNNING
✅ Service on port 5001: RUNNING
✅ Service on port 5003: RUNNING
... (all services RUNNING)
```

---

## Test the Queue System

1. **Open Frontend**: http://localhost:5173
2. **Login/Signup**
3. **Go to Phishing Protection**
4. **Enter URL**: `facebook.com`
5. **Click "Analyze URL"**
6. **Watch**: Queued → Analyzing → Complete ✅

---

## Monitor Queue

**Bull Board**: http://localhost:5001/admin/queues

You'll see:
- Active jobs
- Completed jobs
- Failed jobs (should be 0)
- Job details and logs

---

## Stop Everything

```bash
manage-services.bat
```

Select: **3** (Stop ALL Services)

All windows close automatically.

---

## Start Only What You Need

```bash
manage-services.bat
```

Select: **2** (Start SELECTED Services)

**Examples**:

### Minimal (Queue System Only)
```
Enter: REDIS WORKER 5001
```

### Frontend + Backend + Queue
```
Enter: REDIS WORKER 5173 5001
```

### Everything
```
Enter: REDIS WORKER 5173 5001 5003 5000 5004 5002 5005 5006 5007 5008
```

---

## Troubleshooting

### "Redis Server: NOT RUNNING"
```bash
# Install Redis in WSL
wsl
sudo apt update
sudo apt install redis-server
exit
```

### "Phishing Worker: NOT RUNNING"
```bash
# Install dependencies
cd backend
npm install
```

### Port Already in Use
```bash
# Stop all first
manage-services.bat
# Select: 3 (Stop ALL)
# Then start again
```

---

## Pro Tips

### Minimize Windows
- All service windows can be minimized
- They'll keep running in background
- Check taskbar for window titles

### Close Individual Service
- Click X on specific window to stop that service
- Or use "Stop ALL" to stop everything

### Check Logs
- Each window shows real-time logs
- Worker window shows job processing
- Backend window shows API requests

---

## Success Checklist

- [ ] Run `manage-services.bat`
- [ ] Select option 1
- [ ] Wait 10-20 seconds for all services to start
- [ ] Check status (option 4) - all should be RUNNING
- [ ] Open http://localhost:5173
- [ ] Test phishing URL analysis
- [ ] Check Bull Board at http://localhost:5001/admin/queues
- [ ] See completed job in Bull Board

---

**That's it!** 🎉

No more manual terminal juggling. One command starts everything!

**Phase 1**: Complete ✅
**Service Manager**: Updated ✅
**Queue System**: Fully Integrated ✅
