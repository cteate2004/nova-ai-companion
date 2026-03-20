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
    echo     Example:
    echo       copy backend\.env.example backend\.env
    echo       notepad backend\.env
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

:: Start backend (minimized)
echo [*] Starting backend server on port 8000...
start /min "Nova Backend" cmd /c "cd /d %~dp0backend && node server.js"

:: Start frontend (minimized)
echo [*] Starting frontend on port 5173...
start /min "Nova Frontend" cmd /c "cd /d %~dp0frontend && npx vite"

:: Wait for servers to start
echo [*] Waiting for servers to start...
timeout /t 4 /nobreak > nul

:: Open browser
echo [*] Opening Nova in browser...
start http://localhost:5173

echo.
echo  ==============================
echo   Nova is running!
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo  ==============================
echo.
echo  Press any key to shut down...
pause > nul

:: Kill processes
echo [*] Shutting down...
taskkill /fi "WINDOWTITLE eq Nova Backend" /f > nul 2>&1
taskkill /fi "WINDOWTITLE eq Nova Frontend" /f > nul 2>&1
echo [*] Nova shut down. Goodbye!
timeout /t 2 > nul
