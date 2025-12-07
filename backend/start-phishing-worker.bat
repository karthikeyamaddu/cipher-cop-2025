@echo off
echo ========================================
echo Starting Phishing Worker
echo ========================================
echo.
echo Make sure Redis is running in WSL!
echo Run: wsl redis-server
echo.
pause
echo.
echo Starting worker...
node src/workers/phishingWorker.js
