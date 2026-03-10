@echo off
echo ========================================
echo Building ICT AI Trader App
echo ========================================
cd /d "%~dp0"

echo.
echo Checking EAS login status...
call npx eas-cli whoami

echo.
echo Starting build process...
echo This will take 10-15 minutes...
echo.

call npx eas-cli build --platform android --profile preview

echo.
echo ========================================
echo Build process completed!
echo Check the link above to download APK
echo ========================================
pause
