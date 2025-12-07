# 🔧 Redis Connection Solution - Install Redis on Windows

## Problem
WSL Redis networking is complex and unreliable. Connection timeouts occur even with correct configuration.

## Solution: Install Redis on Windows

### Option 1: Use Memurai (Redis for Windows)

**Download**: https://www.memurai.com/get-memurai

1. Download Memurai (free for development)
2. Install (default settings)
3. Redis will run on `localhost:6379` automatically
4. Update `backend/env.txt`:
   ```
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   ```
5. Restart worker - it will connect instantly!

---

### Option 2: Use Redis Docker (if you have Docker Desktop)

```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

Then update `backend/env.txt`:
```
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

---

### Option 3: Quick Fix - Use WSL with Port Forwarding

Run this in PowerShell (as Administrator):

```powershell
netsh interface portproxy add v4tov4 listenport=6379 listenaddress=127.0.0.1 connectport=6379 connectaddress=172.21.96.197
```

This forwards `localhost:6379` on Windows to WSL Redis.

Then update `backend/env.txt`:
```
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

**To remove later**:
```powershell
netsh interface portproxy delete v4tov4 listenport=6379 listenaddress=127.0.0.1
```

---

## Recommended: Memurai (Easiest)

1. **Download**: https://www.memurai.com/get-memurai
2. **Install**: Run installer, use default settings
3. **Verify**: Open Command Prompt, run `memurai-cli ping` (should return PONG)
4. **Update config**: Change `REDIS_HOST=127.0.0.1` in `backend/env.txt`
5. **Done**: Worker will connect instantly!

---

## Why This is Better

- ✅ No WSL networking issues
- ✅ No IP address changes
- ✅ No firewall problems
- ✅ Faster connection
- ✅ Works reliably
- ✅ Starts automatically with Windows

---

## After Installing Memurai/Redis on Windows

Update `backend/env.txt`:
```properties
# Redis Configuration (Windows)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

Update `backend/.env` (same):
```properties
# Redis Configuration (Windows)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

Restart worker:
```bash
cd backend
node src/workers/phishingWorker.js
```

Expected output:
```
✅ Queue system initialized
✅ Phishing Worker: Redis connected
✅ Phishing Worker: MongoDB connected
🚀 Phishing Worker started and listening for jobs...
```

---

**Recommendation**: Install Memurai - it's the simplest and most reliable solution for Redis on Windows.
