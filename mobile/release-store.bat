@echo off
REM MATRIX phone app - build the store versions (Google Play .aab and/or App Store .ipa) on Expo's servers.
REM Needs: Node.js 20+, a free account at https://expo.dev, and your HTTPS domain already working (set_domain.sh).
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from https://nodejs.org then run this file again.
  start https://nodejs.org/en/download
  pause
  exit /b 1
)
set "DOMAIN="
set /p DOMAIN=Your MATRIX website address (must start with https://, example https://matrix-fx.com): 
echo %DOMAIN% | findstr /b /c:"https://" >nul
if errorlevel 1 (
  echo The address must start with https:// - the stores reject apps that use plain http. Nothing done.
  pause
  exit /b 1
)
echo.
echo == 1/4 installing packages
call npm install --no-audit --no-fund || goto :fail
echo.
echo == 2/4 sign in to Expo (a browser or a prompt asks for your expo.dev account)
call npx --yes eas-cli@latest login || goto :fail
call npx --yes eas-cli@latest init --non-interactive --force >nul 2>nul
echo.
echo == 3/4 saving the server address for store builds
call npx --yes eas-cli@latest env:create --environment production --name EXPO_PUBLIC_API_URL --value %DOMAIN% --visibility plaintext --force --non-interactive || goto :fail
echo.
set "P=android"
set /p P=Which store? type android, ios or all [android]: 
echo == 4/4 building (takes 15-30 minutes on Expo's servers; the link to download appears at the end)
call npx --yes eas-cli@latest build --platform %P% --profile production || goto :fail
echo.
echo DONE. Upload the file to Google Play Console / App Store Connect, or run:  npx eas-cli submit --platform %P%
pause
exit /b 0
:fail
echo Something failed - send a screenshot of this window.
pause
exit /b 1
