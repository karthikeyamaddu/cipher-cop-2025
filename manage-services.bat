@echo off
setlocal enabledelayedexpansion

echo =======================================
echo         CipherCop Service Manager
echo =======================================
echo.

:menu
echo 1. Start ALL Services
echo 2. Stop ALL Services
echo 3. Check Service Status
echo 4. Exit
echo.
set /p choice="Select an option (1-4): "

if "%choice%"=="1" goto start_all
if "%choice%"=="2" goto stop_all
if "%choice%"=="3" goto check_status
if "%choice%"=="4" goto exit
goto menu


:: =============================
:: Start All Services
:: =============================
:start_all
echo.
echo [*] Starting all services...

:: ---- FRONTEND (5173) ----
cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\frontend"
if exist env.txt copy /Y env.txt .env >nul
start "Frontend (5173)" cmd /c "npm install && npm run dev"

:: ---- BACKEND (Node.js, 5001) ----
cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend"
if exist env.txt copy /Y env.txt .env >nul
start "Backend (5001)" cmd /c "npm install && node server.js"

:: ---- CLONE-AI (Gemini, 5003) ----
cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\clone-detection\gemini"
if exist env.txt copy /Y env.txt .env >nul
start "Clone-AI (5003)" cmd /c ".venv\Scripts\python.exe app.py"

:: ---- CLONE-ML (Phishpedia, 5000) ----
cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\clone-detection\phishpedia+detectron2\Phishpedia"
start "Clone-ML (5000)" cmd /c "phishpedia_env\Scripts\python.exe WEBtool\app.py"

:: ---- MALWARE VIRUS (5004) ----
cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\malware-detection\ml-detection\Virus_total_based"
start "Malware-Virus (5004)" cmd /c ""D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\malware-detection\ml-detection\.venv\Scripts\python.exe" "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\malware-detection\ml-detection\Virus_total_based\app.py""


:: ---- MALWARE ML (5002) ----
cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\malware-detection\ml-detection\ML_based_detectionn"
start "Malware-ML (5002)" cmd /c "..\.venv\Scripts\python.exe app.py"

:: ---- MALWARE SANDBOX (5005) ----
cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\malware-detection"
start "Malware-Sandbox (5005)" cmd /c "python sandbox.py"

:: ---- PHONE SCAM DETECTION (5006) ----
cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\phone-number-detection"
start "Phone-Scam (5006)" cmd /c ".venv\Scripts\activate && .venv\Scripts\python.exe app.py"

:: ---- ML PHISHING DETECTION (5007) ---- [COMMENTED OUT]
cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\phishing-detection\phishing-url-ml"
start "ML-Phishing (5007)" cmd /c ".venv\Scripts\python.exe app.py"

:: ---- EMAIL ML PHISHING DETECTION (5008) ----
cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\phishing-detection\phishing-email-ml"
start "Email-ML-Phishing (5008)" cmd /c "venv\Scripts\python.exe app.py"

echo.
echo All services are starting. Please wait a few seconds...
pause
goto menu


:: =============================
:: Stop All Services
:: =============================
:stop_all
echo.
echo [*] Stopping all services...

taskkill /FI "WINDOWTITLE eq Frontend (5173)*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Backend (5001)*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Clone-AI (5003)*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Clone-ML (5000)*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Malware-Virus (5004)*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Malware-ML (5002)*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Malware-Sandbox (5005)*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Phone-Scam (5006)*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq ML-Phishing (5007)*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Email-ML-Phishing (5008)*" /F >nul 2>&1

echo Services stopped.
if "%choice%"=="2" (
    pause
    goto menu
)
goto :eof


:: =============================
:: Check Status
:: =============================
:check_status
echo.
echo [*] Checking service status...
echo.

for %%p in (5173 5001 5003 5000 5004 5002 5005 5006 5007 5008) do (
    netstat -an | findstr ":%%p" | findstr "LISTENING" >nul
    if !errorlevel! == 0 (
        echo ✅ Service on port %%p: RUNNING
    ) else (
        echo ❌ Service on port %%p: NOT RUNNING
    )
)

echo.
pause
goto menu


:exit
echo.
echo Stopping all services before exit...
set choice=4
call :stop_all
echo Exiting Service Manager...
exit /b 0
