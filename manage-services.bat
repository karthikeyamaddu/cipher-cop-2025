@echo off
setlocal enabledelayedexpansion

echo =======================================
echo         CipherCop Service Manager
echo =======================================
echo.

:menu
echo 1. Start ALL Services
echo 2. Start SELECTED Services
echo 3. Stop ALL Services
echo 4. Check Service Status
echo 5. Exit
echo.
set /p choice="Select an option (1-5): "

if "%choice%"=="1" goto start_all
if "%choice%"=="2" goto start_selected
if "%choice%"=="3" goto stop_all
if "%choice%"=="4" goto check_status
if "%choice%"=="5" goto exit
goto menu


:: =============================
:: Start Selected Services
:: =============================
:start_selected
echo.
echo [*] Available Services:
echo.
echo     REDIS - Redis Server (Windows)
echo     WORKER - Phishing Worker (Background Queue)
echo     5173 - Frontend
echo     5001 - Backend (Node.js)
echo     5003 - Clone-AI (Gemini)
echo     5000 - Clone-ML (Phishpedia)
echo     5004 - Malware-Virus
echo     5002 - Malware-ML
echo     5005 - Malware-Sandbox
echo     5006 - Phone-Scam Detection
echo     5007 - ML-Phishing Detection
echo     5008 - Email-ML-Phishing Detection
echo.
set /p selected_ports="Enter services to start (space-separated, e.g., REDIS WORKER 5173 5001): "

echo.
echo [*] Starting selected services...

echo " %selected_ports% " | findstr " REDIS " >nul
if !errorlevel! == 0 (
    start "Redis Server" cmd /c "C:\Redis\redis-server.exe"
    echo ✅ Starting Redis Server (Windows)
)

echo " %selected_ports% " | findstr " WORKER " >nul
if !errorlevel! == 0 (
    cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend"
    start "Phishing Worker" cmd /c "node src/workers/phishingWorker.js"
    echo ✅ Starting Phishing Worker (Background Queue)
)

echo " %selected_ports% " | findstr " 5173 " >nul
if !errorlevel! == 0 (
    cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\frontend"
    if exist env.txt copy /Y env.txt .env >nul
    start "Frontend (5173)" cmd /c "npm install && npm run dev"
    echo ✅ Starting Frontend (5173)
)

echo " %selected_ports% " | findstr " 5001 " >nul
if !errorlevel! == 0 (
    cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend"
    if exist env.txt copy /Y env.txt .env >nul
    start "Backend (5001)" cmd /c "npm install && node server.js"
    echo ✅ Starting Backend (5001)
)

echo " %selected_ports% " | findstr " 5003 " >nul
if !errorlevel! == 0 (
    cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\clone-detection\gemini"
    if exist env.txt copy /Y env.txt .env >nul
    start "Clone-AI (5003)" cmd /c ".venv\Scripts\python.exe app.py"
    echo ✅ Starting Clone-AI (5003)
)

echo " %selected_ports% " | findstr " 5000 " >nul
if !errorlevel! == 0 (
    cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\clone-detection\phishpedia+detectron2\Phishpedia"
    start "Clone-ML (5000)" cmd /c "phishpedia_env\Scripts\python.exe WEBtool\app.py"
    echo ✅ Starting Clone-ML (5000)
)

echo " %selected_ports% " | findstr " 5004 " >nul
if !errorlevel! == 0 (
    cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\malware-detection\ml-detection\Virus_total_based"
    start "Malware-Virus (5004)" cmd /c ""D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\malware-detection\ml-detection\.venv\Scripts\python.exe" "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\malware-detection\ml-detection\Virus_total_based\app.py""
    echo ✅ Starting Malware-Virus (5004)
)

echo " %selected_ports% " | findstr " 5002 " >nul
if !errorlevel! == 0 (
    cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\malware-detection\ml-detection\ML_based_detectionn"
    start "Malware-ML (5002)" cmd /c "..\.venv\Scripts\python.exe app.py"
    echo ✅ Starting Malware-ML (5002)
)

echo " %selected_ports% " | findstr " 5005 " >nul
if !errorlevel! == 0 (
    cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\malware-detection"
    start "Malware-Sandbox (5005)" cmd /c "python sandbox.py"
    echo ✅ Starting Malware-Sandbox (5005)
)

echo " %selected_ports% " | findstr " 5006 " >nul
if !errorlevel! == 0 (
    cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\phone-number-detection"
    start "Phone-Scam (5006)" cmd /c ".venv\Scripts\activate && .venv\Scripts\python.exe app.py"
    echo ✅ Starting Phone-Scam (5006)
)

echo " %selected_ports% " | findstr " 5007 " >nul
if !errorlevel! == 0 (
    cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\phishing-detection\phishing-url-ml"
    start "ML-Phishing (5007)" cmd /c ".venv\Scripts\python.exe app.py"
    echo ✅ Starting ML-Phishing (5007)
)

echo " %selected_ports% " | findstr " 5008 " >nul
if !errorlevel! == 0 (
    cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend_py\phishing-detection\phishing-email-ml"
    start "Email-ML-Phishing (5008)" cmd /c "venv\Scripts\python.exe app.py"
    echo ✅ Starting Email-ML-Phishing (5008)
)

echo.
echo Selected services are starting. Please wait a few seconds...
pause
goto menu


:: =============================
:: Start All Services
:: =============================
:start_all
echo.
echo [*] Starting all services...

:: ---- REDIS SERVER (Windows) ----
start "Redis Server" cmd /c "C:\Redis\redis-server.exe"

:: ---- PHISHING WORKER (Background Queue) ----
cd /d "D:\volume E\ciphercop-2025\overall\ciphercopdemo\backend"
start "Phishing Worker" cmd /c "node src/workers/phishingWorker.js"

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

:: Kill by window title first (Redis stays running)
taskkill /FI "WINDOWTITLE eq Phishing Worker*" /F >nul 2>&1
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

:: Kill processes by port as backup
for %%p in (5173 5001 5003 5000 5004 5002 5005 5006 5007 5008) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p" ^| findstr "LISTENING"') do (
        if not "%%a"=="" (
            taskkill /PID %%a /F >nul 2>&1
            echo ✅ Stopped service on port %%p
        )
    )
)

echo.
echo Services stopped.
if "%choice%"=="3" (
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

:: Check Redis (port 6379) - faster check
netstat -ano | findstr ":6379.*LISTENING" >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Redis Server ^(6379^): RUNNING
) else (
    echo ❌ Redis Server ^(6379^): NOT RUNNING
)

:: Check Worker (fast check - just verify node.exe is running)
tasklist /FI "IMAGENAME eq node.exe" 2>nul | findstr "node.exe" >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Phishing Worker: RUNNING ^(node.exe detected^)
) else (
    echo ❌ Phishing Worker: NOT RUNNING
)

:: Check all port-based services (faster)
for %%p in (5173 5001 5003 5000 5004 5002 5005 5006 5007 5008) do (
    netstat -ano | findstr ":%%p.*LISTENING" >nul 2>&1
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
call :stop_all
echo Exiting Service Manager...
exit /b 0
