# 🔧 Fix Redis Connection Issue

## Problem
Redis is running in WSL but worker can't connect from Windows.

**Error**: `ECONNREFUSED 127.0.0.1:6379`

---

## Solution: Configure Redis to Accept Windows Connections

### Step 1: Stop Current Redis
```bash
# In WSL terminal
redis-cli shutdown
```

### Step 2: Edit Redis Config
```bash
# In WSL terminal
sudo nano /etc/redis/redis.conf
```

**Find and change these lines**:

```conf
# Find this line (around line 69):
bind 127.0.0.1 ::1

# Change to:
bind 0.0.0.0 ::1

# Find this line (around line 88):
protected-mode yes

# Change to:
protected-mode no
```

**Save**: `Ctrl+X`, then `Y`, then `Enter`

### Step 3: Restart Redis
```bash
# In WSL terminal
sudo service redis-server restart

# Or start manually:
redis-server /etc/redis/redis.conf
```

### Step 4: Test Connection
```bash
# From Windows PowerShell
wsl redis-cli ping
# Should return: PONG
```

---

## Alternative: Quick Fix (No Config Change)

If you don't want to edit config, use this simpler approach:

### Stop Redis
```bash
wsl redis-cli shutdown
```

### Start Redis with Bind Flag
```bash
wsl redis-server --bind 0.0.0.0 --protected-mode no
```

Leave this terminal open. Redis will now accept connections from Windows.

---

## Verify It Works

### Test from WSL
```bash
wsl redis-cli ping
# Should return: PONG
```

### Test from Windows
```bash
# Get WSL IP
wsl hostname -I
# Example output: 172.21.96.197

# Test connection (replace with your WSL IP)
wsl redis-cli -h 172.21.96.197 ping
# Should return: PONG
```

### Test Worker
```bash
cd backend
node src/workers/phishingWorker.js
```

Should see:
- ✅ Phishing Worker: Redis connected
- ✅ Phishing Worker: MongoDB connected
- No more ECONNREFUSED errors

---

## Permanent Solution (Recommended)

Create a startup script for Redis:

### Create Script
```bash
# In WSL
nano ~/start-redis.sh
```

**Add this**:
```bash
#!/bin/bash
redis-server --bind 0.0.0.0 --protected-mode no
```

**Save and make executable**:
```bash
chmod +x ~/start-redis.sh
```

### Use Script
```bash
# Start Redis
wsl ~/start-redis.sh
```

---

## Update manage-services.bat (Optional)

If you want to auto-start Redis with correct settings:

**Find this line** in `manage-services.bat`:
```batch
start "Redis Server" cmd /c "wsl redis-server"
```

**Change to**:
```batch
start "Redis Server" cmd /c "wsl redis-server --bind 0.0.0.0 --protected-mode no"
```

---

## Why This Happens

- WSL has its own network interface
- Default Redis binds only to `127.0.0.1` (localhost inside WSL)
- Windows can't reach WSL's localhost
- Solution: Bind to `0.0.0.0` (all interfaces)

---

## Security Note

**Development Only**: `protected-mode no` is fine for local development.

**Production**: Use proper Redis authentication:
```conf
requirepass your_strong_password
```

---

## Quick Commands Reference

```bash
# Stop Redis
wsl redis-cli shutdown

# Start Redis (accepts Windows connections)
wsl redis-server --bind 0.0.0.0 --protected-mode no

# Check if running
wsl redis-cli ping

# Check from Windows with WSL IP
wsl redis-cli -h $(wsl hostname -I | awk '{print $1}') ping

# Start worker
cd backend
node src/workers/phishingWorker.js
```

---

## Expected Output After Fix

```
✅ Queue system initialized
✅ Phishing Worker: Redis connected
✅ Phishing Worker: MongoDB connected
🚀 Phishing Worker started and listening for jobs...
```

No more `ECONNREFUSED` errors!

---

**Status**: Ready to fix Redis connection ✅
