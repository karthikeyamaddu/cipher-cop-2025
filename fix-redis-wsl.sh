#!/bin/bash

echo "======================================="
echo "   Fixing Redis for Windows Access"
echo "======================================="
echo ""

# Stop Redis service
echo "[1/4] Stopping Redis service..."
sudo service redis-server stop

# Backup original config
echo "[2/4] Backing up Redis config..."
sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Update config to bind to all interfaces
echo "[3/4] Updating Redis configuration..."
sudo sed -i 's/^bind 127.0.0.1 ::1/bind 0.0.0.0 ::1/' /etc/redis/redis.conf
sudo sed -i 's/^protected-mode yes/protected-mode no/' /etc/redis/redis.conf

# Start Redis service
echo "[4/4] Starting Redis service..."
sudo service redis-server start

echo ""
echo "✅ Redis configured successfully!"
echo ""
echo "Testing connection..."
redis-cli ping

echo ""
echo "Redis is now accessible from Windows!"
echo "You can now start the worker."
