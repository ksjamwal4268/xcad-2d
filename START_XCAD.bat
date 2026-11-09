@echo off
title Launching XCAD 2D...
cd /d "%~dp0"

set "HTML_PATH=%~dp0index.html"
if not exist "%HTML_PATH%" (
    if exist "%~dp0XCAD_2D_Portable\index.html" (
        set "HTML_PATH=%~dp0XCAD_2D_Portable\index.html"
    )
)
set "HTML_URL=file:///%HTML_PATH:\=/%"

:: 1. Launch in Microsoft Edge App Mode (Frameless Native Desktop Window)
where msedge >nul 2>&1
if %ERRORLEVEL% equ 0 (
    start msedge --app="%HTML_URL%" --window-size=1600,1000
    exit
)

:: 2. Check Standard Edge locations
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%HTML_URL%" --window-size=1600,1000
    exit
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="%HTML_URL%" --window-size=1600,1000
    exit
)

:: 3. Try Google Chrome App Mode
where chrome >nul 2>&1
if %ERRORLEVEL% equ 0 (
    start chrome --app="%HTML_URL%" --window-size=1600,1000
    exit
)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="%HTML_URL%" --window-size=1600,1000
    exit
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app="%HTML_URL%" --window-size=1600,1000
    exit
)

:: 4. Fallback to default web browser
start "" "%HTML_PATH%"
exit
