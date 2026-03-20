@echo off
title Nova AI Companion
color 0A
echo.
echo  ==============================
echo   Nova AI Companion - Starting
echo  ==============================
echo.

:: Check for .env
if not exist "%~dp0backend\.env" (
    echo [!] backend\.env not found!
    echo     Copy backend\.env.example to backend\.env and add your ANTHROPIC_API_KEY
    echo.
    pause
    exit /b 1
)

:: Install backend dependencies if needed
if not exist "%~dp0backend\node_modules" (
    echo [*] Installing backend dependencies...
    cd /d "%~dp0backend" && npm install
    if errorlevel 1 (
        echo [!] Backend install failed.
        pause
        exit /b 1
    )
)

:: Install frontend dependencies if needed
if not exist "%~dp0frontend\node_modules" (
    echo [*] Installing frontend dependencies...
    cd /d "%~dp0frontend" && npm install
    if errorlevel 1 (
        echo [!] Frontend install failed.
        pause
        exit /b 1
    )
)

:: Get local IP for mobile access
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4" ^| findstr /C:"192.168"') do set LOCAL_IP=%%a
set LOCAL_IP=%LOCAL_IP: =%

:: Start TTS service if Python venv exists
if exist "%~dp0liveportrait\venv\Scripts\activate.bat" (
    echo [*] Starting TTS service on port 8002...
    start /min "Nova TTS" cmd /c "cd /d %~dp0tts && ..\liveportrait\venv\Scripts\activate.bat && python app.py"
) else (
    echo [*] TTS service not available — using browser TTS fallback
)

:: Start backend (minimized)
echo [*] Starting backend server on port 8000...
start /min "Nova Backend" cmd /c "cd /d %~dp0backend && node server.js"

:: Start frontend (minimized)
echo [*] Starting frontend on port 5173...
start /min "Nova Frontend" cmd /c "cd /d %~dp0frontend && npx vite --host"

:: Wait for servers to start
echo [*] Waiting for servers to start...
timeout /t 5 /nobreak > nul

:: Open browser
echo [*] Opening Nova in browser...
start http://localhost:5173

echo.
echo  ======================================
echo   Nova is running!
echo.
echo   PC:     http://localhost:5173
echo   Mobile: https://%LOCAL_IP%:8000
echo  ======================================
echo.
echo   To install on iPhone:
echo   1. Open https://%LOCAL_IP%:8000 in Safari
echo   2. Tap "Show Details" ^> "visit this website"
echo   3. Tap Share ^> Add to Home Screen
echo.
echo  Press any key to shut down...
pause > nul

:: Kill processes
echo [*] Shutting down...
taskkill /fi "WINDOWTITLE eq Nova TTS" /f > nul 2>&1
taskkill /fi "WINDOWTITLE eq Nova Backend" /f > nul 2>&1
taskkill /fi "WINDOWTITLE eq Nova Frontend" /f > nul 2>&1
echo [*] Nova shut down. Goodbye!
timeout /t 2 > nul
