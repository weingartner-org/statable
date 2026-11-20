@echo off
rem Statable ohne Netz starten (Windows). Doppelklick.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start\server.ps1"
if errorlevel 1 pause
