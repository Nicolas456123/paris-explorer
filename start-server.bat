@echo off
echo ====================================
echo   PARIS EXPLORER - Serveur Local
echo ====================================
echo.
echo Demarrage du serveur sur http://localhost:8080
echo.
echo Pour arreter le serveur, appuyez sur Ctrl+C
echo.
python -m http.server 8080
pause
