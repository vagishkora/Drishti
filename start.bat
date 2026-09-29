@echo off
echo =========================================
echo Starting Drishti Application...
echo =========================================

echo.
echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && npm.cmd run dev"

echo.
echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm.cmd run dev"

echo.
echo Both servers have been launched in separate windows!
echo Please check the new command prompt windows for logs.
echo =========================================
