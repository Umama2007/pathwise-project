@echo off
echo ============================================
echo   Starting Pathwise
echo ============================================
echo.
echo REMINDER before first run:
echo  1. Add your free Groq AI key to backend\.env
echo  2. Run database-update.sql in Supabase SQL Editor
echo.

REM check if Node.js is installed, install it if missing
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js not found. Installing it now...
    winget install -e --id OpenJS.NodeJS.LTS
    echo.
    echo Node.js was just installed. Please CLOSE this window,
    echo open a new one, and double-click start.bat again.
    pause
    exit
)

echo Installing frontend packages (only takes a while the first time)...
cd frontend
call npm install
start "Pathwise Frontend" cmd /k "npm run dev"
cd ..

echo Installing backend packages...
cd backend
call npm install
start "Pathwise Backend" cmd /k "npm start"
cd ..

echo.
echo ============================================
echo   Pathwise is starting!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:5000
echo ============================================
pause
