@echo off
echo Starting EAS Update...
cd /d "%~dp0"
call npx expo export --platform android
call npx eas-cli update --branch preview --message "Update: subscription expiry notifications"
echo Update complete!
pause
