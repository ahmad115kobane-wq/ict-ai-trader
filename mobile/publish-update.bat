@echo off
echo Publishing EAS Update...
cd /d "%~dp0"

echo Step 1: Exporting app bundle...
call npx expo export

echo.
echo Step 2: Publishing to EAS...
call npx eas-cli update --branch preview --message "Update: subscription expiry notifications and improvements"

echo.
echo Update published successfully!
echo Users will receive the update automatically.
pause
