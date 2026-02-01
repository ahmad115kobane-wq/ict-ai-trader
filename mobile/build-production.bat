@echo off
echo ========================================
echo   ICT AI Trader - Production Build
echo ========================================
echo.

echo Step 1: Checking EAS CLI...
call npx eas --version
if errorlevel 1 (
    echo ERROR: EAS CLI not found
    pause
    exit /b 1
)

echo.
echo Step 2: Building Android APK for Production...
echo This will take 10-15 minutes...
echo.

call npx eas build --platform android --profile production

echo.
echo ========================================
echo   Build Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Download APK from the link above
echo 2. Install on your device
echo 3. Test all features
echo.
pause
