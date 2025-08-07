@echo off
echo ====================================
echo     PARIS EXPLORER - SERVEUR LOCAL
echo ====================================
echo.
echo Demarrage du serveur sur http://localhost:8000
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.
python -m http.server 8000
pause