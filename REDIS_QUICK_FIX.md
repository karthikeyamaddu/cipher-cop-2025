# ⚡ Redis Quick Fix - 2 Steps

## Problem
Worker shows: `❌ ECONNREFUSED 127.0.0.1:6379`

Redis is running in WSL but Windows can't connect to it.

---

## Solution (Choose One)

### Option 1: Use Batch File (Easiest)

1. **Stop current Redis**:
   ```bash
   wsl redis-cli shutdown
   ```

2. **Run the batch file**:
   ```bash
   start-redis.bat
   ```

3. **Done!** Leave the window open.

---

### Option 2: Manual Command

1. **Stop current Redis**:
   ```bash
   wsl redis-cli shutdown
   ```

2. **Start with correct settings**:
   ```bash
   wsl redis-server --bind 0.0.0.0 --protected-mode no
   ```

3. **Done!** Leave the terminal open.

---

## Test It Works

```bash
# Test from Windows
wsl redis-cli ping
# Should return: PONG

# Start worker
cd backend
node src/workers/phishingWorker.js
```

**Expected output**:
```
✅ Queue system initialized
✅ Phishing Worker: Redis connected
✅ Phishing Worker: MongoDB connected
🚀 Phishing Worker started and listening for jobs...
```

No more errors! ✅

---

## Why This Works

- Default: Redis only listens inside WSL
- Fix: Redis listens on all interfaces (`0.0.0.0`)
- Result: Windows can connect to WSL Redis

---

## Daily Workflow

### Morning (Start Redis)
```bash
start-redis.bat
```
Leave it running.

### Start Services
```bash
manage-services.bat
# Select: 1
```

### Evening (Stop Services)
```bash
manage-services.bat
# Select: 3
```

Redis keeps running (or close the Redis window to stop it).

---

**That's it!** Just use `start-redis.bat` instead of `wsl redis-server` ✅
