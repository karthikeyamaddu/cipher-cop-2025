# Redis Setup for Queue System - Phase 1

## Problem We Solved

Windows applications (Node.js worker) couldn't connect to WSL Redis due to network isolation between Windows and WSL.

---

## Solution: Redis on Windows

We installed Redis directly on Windows (native build), eliminating WSL networking issues entirely.

---

## One-Time Setup (Already Done)

### 1. Install Redis on Windows

**Download**: https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip

**Steps**:
1. Download and extract to `C:\Redis`
2. Open Command Prompt
3. Navigate to `C:\Redis`
4. Run: `redis-server.exe`

Redis will start on `localhost:6379`.

### 2. Install as Windows Service (Optional but Recommended)

Run in Command Prompt as Administrator:

```cmd
cd C:\Redis
redis-server.exe --service-install
redis-server.exe --service-start
```

Now Redis starts automatically with Windows!

**Service Commands**:
```cmd
redis-server.exe --service-start    # Start service
redis-server.exe --service-stop     # Stop service
redis-server.exe --service-uninstall # Remove service
```

### 3. Verify Redis is Running

```cmd
C:\Redis\redis-cli.exe ping
```

Should return: `PONG`

### 4. Update Configuration Files

**File**: `backend/env.txt` (master copy)
```properties
# Redis Configuration (Windows Native)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

**File**: `backend/.env` (working copy)
```properties
# Redis Configuration (Windows Native)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

**Already configured** - no changes needed!

---

## Daily Usage

### Start Redis

**If installed as service** (recommended):
- Redis starts automatically with Windows
- No action needed!

**If running manually**:
```cmd
C:\Redis\redis-server.exe
```
Leave the window open.

### Start Services

```bash
manage-services.bat
# Select: 1 (Start ALL Services)
```

This starts:
- Phishing Worker (connects to Redis via localhost)
- Backend
- Frontend
- All Python services

---

## Troubleshooting

### Issue: Worker shows "ECONNREFUSED"

**Cause**: Redis not running

**Fix**:

1. **Check if Redis is running**:
   ```cmd
   C:\Redis\redis-cli.exe ping
   ```
   Should return `PONG`

2. **If not running, start Redis**:
   ```cmd
   # If installed as service
   redis-server.exe --service-start
   
   # Or run manually
   C:\Redis\redis-server.exe
   ```

3. **Restart worker**

---

### Issue: Redis service won't start

**Check if port 6379 is in use**:
```powershell
netstat -ano | findstr :6379
```

**If something else is using it**, stop that process or change Redis port.

---

### Issue: Redis window closes immediately

**Cause**: Port already in use or permission issue

**Fix**: Run Command Prompt as Administrator, then start Redis

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Windows (Host)                 │
│                                             │
│  Node.js Worker                             │
│       ↓                                     │
│  localhost:6379 (127.0.0.1:6379)           │
│       ↓ (direct connection)                 │
│  Redis Server (C:\Redis\redis-server.exe)  │
│  Running on 127.0.0.1:6379                 │
│                                             │
└─────────────────────────────────────────────┘
```

**Simple and Direct** - No WSL, no port forwarding, no networking issues!

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/env.txt` | Master config (copied to .env on startup) |
| `backend/.env` | Working config (used by worker) |
| `backend/src/queues/index.js` | Queue system with Redis connection |
| `backend/src/workers/phishingWorker.js` | Background worker |
| `manage-services.bat` | Service manager |

---

## Configuration Details

### Redis Connection Settings

```javascript
// backend/src/queues/index.js
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',  // 127.0.0.1
  port: parseInt(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};
```

### Environment Variables

```properties
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

---

## Success Indicators

When worker starts successfully:

```
✅ Queue system initialized
✅ Phishing Worker: Redis connected
✅ Phishing Worker: MongoDB connected
🚀 Phishing Worker started and listening for jobs...
```

No `ECONNREFUSED` or `ETIMEDOUT` errors!

---

## Why Redis on Windows?

We tried WSL Redis with port forwarding, but it was unstable (connection drops, ECONNRESET errors).

**Redis on Windows** is:
- ✅ Free and open source
- ✅ Stable and reliable
- ✅ No networking issues
- ✅ Can run as Windows service
- ✅ Starts automatically with system

---

## Summary

- **Redis**: Runs natively on Windows at `C:\Redis`
- **Connection**: Direct connection to `127.0.0.1:6379`
- **Worker**: Connects to `127.0.0.1:6379` (localhost)
- **Result**: Fast, stable, reliable connection with zero networking issues

---

**Status**: ✅ Complete and Working

**Last Updated**: Phase 1 - Queue System Implementation
