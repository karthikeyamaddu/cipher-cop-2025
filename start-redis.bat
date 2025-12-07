@echo off
echo =======================================
echo      Starting Redis Server (WSL)
echo =======================================
echo.
echo [*] Starting Redis with Windows access enabled...
echo [*] Redis will accept connections from Windows
echo.

wsl redis-server --bind 0.0.0.0 --protected-mode no

echo.
echo Redis stopped.
pause
