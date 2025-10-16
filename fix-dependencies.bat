@echo off
echo Fixing corrupted node_modules...
cd /d "%~dp0server"

echo Removing old node_modules...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f package-lock.json

echo Installing fresh dependencies...
call npm install

echo.
echo Done! Now run: npm run test:db
pause
