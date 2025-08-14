#\!/bin/bash
echo "===================================="
echo "  PARIS EXPLORER - Serveur Local"
echo "===================================="
echo ""
echo "Demarrage du serveur sur http://localhost:8080"
echo ""
echo "Pour arreter le serveur, appuyez sur Ctrl+C"
echo ""
python3 -m http.server 8080 || python -m http.server 8080
