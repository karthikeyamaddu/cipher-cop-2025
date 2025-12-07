# ⚡ Fix Redis Connection - One Time Setup

## Problem
Redis is running as a service in WSL but only listening on `127.0.0.1` (WSL localhost).
Windows can't connect to it.

---

## One-Time Fix (Choose Method)

### Method 1: Automated (Easiest)

Run this command:
```bash
fix-redis.bat
```

This will automatically configure Redis. **Done!**

---

### Method 2: Manual (If automated fails)

Copy and paste these commands **one by one** in PowerShell:

```bash
# Stop Redis
wsl sudo service redis-server stop

# Backup config
wsl sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Change bind address
wsl sudo sed -i 's/^bind 127.0.0.1 ::1/bind 0.0.0.0 ::1/' /etc/redis/redis.conf

# Disable protected mode
wsl sudo sed -i 's/^protected-mode yes/protected-mode no/' /etc/redis/redis.conf

# Start Redis
wsl sudo service redis-server start

# Test
wsl redis-cli ping
```

**Expected**: `PONG` ✅

---

## Verify It Works

```bash
# Test connection
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

---

## What This Does

1. **Stops Redis service**
2. **Backs up config** (saved as `/etc/redis/redis.conf.backup`)
3. **Changes bind address** from `127.0.0.1` to `0.0.0.0` (all interfaces)
4. **Disables protected mode** (safe for local development)
5. **Restarts Redis service**

---

## After Fix

Redis will now:
- ✅ Start automatically when WSL starts
- ✅ Accept connections from Windows
- ✅ Work with the queue system

You only need to do this **once**!

---

## Daily Use (After Fix)

Redis runs automatically in WSL. Just use:

```bash
manage-services.bat
# Select: 1 (Start ALL)
```

Everything will work! 🚀

---

## Troubleshooting

### If automated fix fails

**Error**: "Permission denied"
**Fix**: Run PowerShell as Administrator

### If manual commands fail

**Error**: "sudo: no password"
**Fix**: WSL will prompt for your Linux password (the one you set when installing WSL)

### Check if fix worked

```bash
wsl sudo cat /etc/redis/redis.conf | grep "^bind"
```

**Should show**: `bind 0.0.0.0 ::1`

---

## Rollback (If Needed)

```bash
# Restore original config
wsl sudo cp /etc/redis/redis.conf.backup /etc/redis/redis.conf

# Restart Redis
wsl sudo service redis-server restart
```

---

**Run `fix-redis.bat` now to fix it!** ⚡
