@echo off
rem Startet die Baustellendisposition auf diesem Rechner.
rem Es muss nichts installiert werden - PowerShell bringt Windows mit.
title Baustellendisposition
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve.ps1"
if errorlevel 1 pause
