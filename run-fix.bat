@echo off
echo ============================================
echo Fixing Corrupted Dependencies
echo ============================================
echo.

cd /d "%~dp0server"

echo [1/4] Removing old node_modules...
if exist node_modules (
    rmdir /s /q node_modules
    echo Done: node_modules removed
) else (
    echo Skipped: node_modules not found
)
echo.

echo [2/4] Removing old package-lock.json...
if exist package-lock.json (
    del /f package-lock.json
    echo Done: package-lock.json removed
) else (
    echo Skipped: package-lock.json not found
)
echo.

echo [3/4] Installing fresh dependencies...
echo This may take 1-2 minutes...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo ERROR: npm install failed!
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)
echo.

echo [4/4] Testing database connection...
call npm run test:db
echo.

echo ============================================
echo Done! Check the output above.
echo ============================================
echo.
echo Next steps:
echo 1. If database test succeeded, run: npm start
echo 2. If database test failed, check MongoDB Atlas
echo.
pause
