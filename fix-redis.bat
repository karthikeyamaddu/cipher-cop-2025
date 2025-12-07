@echo off
echo =======================================
echo    Fixing Redis for Windows Access
echo =======================================
echo.
echo This will configure Redis in WSL to accept connections from Windows.
echo.
pause

wsl bash fix-redis-wsl.sh

echo.
echo =======================================
echo.
echo Redis is now configured!
echo You can now run: manage-services.bat
echo.
pause
