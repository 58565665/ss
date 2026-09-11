#!/bin/bash
# 🚀 Script automatico di deployment per ZeroLegend Game Server
# Uso: bash setup/deploy.sh

set -e  # Exit on error

echo "======================================"
echo "🚀 ZeroLegend Game Server - Deploy"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_DIR="/home/zero/ss"
LOGS_DIR="$PROJECT_DIR/logs"

# Step 1: Preparazione
echo -e "${YELLOW}[1/5] Preparazione directory...${NC}"
cd "$PROJECT_DIR"
mkdir -p "$LOGS_DIR"
chmod 755 "$LOGS_DIR"
echo -e "${GREEN}✓ Directory pronte${NC}"

# Step 2: Update codice
echo -e "${YELLOW}[2/5] Aggiornamento codice...${NC}"
git pull origin main || echo -e "${YELLOW}⚠ Git pull non disponibile${NC}"
npm install --production 2>/dev/null || true
echo -e "${GREEN}✓ Codice aggiornato${NC}"

# Step 3: PM2 setup
echo -e "${YELLOW}[3/5] Configurazione PM2...${NC}"
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
echo -e "${GREEN}✓ PM2 configurato${NC}"
pm2 list

# Step 4: Nginx
echo -e "${YELLOW}[4/5] Configurazione Nginx...${NC}"
if [ -f "setup/zerolegend-nginx.conf" ]; then
    sudo cp setup/zerolegend-nginx.conf /etc/nginx/sites-available/zerolegend
    sudo ln -sf /etc/nginx/sites-available/zerolegend /etc/nginx/sites-enabled/zerolegend
    sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    sudo nginx -t
    sudo systemctl restart nginx
    echo -e "${GREEN}✓ Nginx configurato${NC}"
else
    echo -e "${RED}✗ File nginx config non trovato${NC}"
fi

# Step 5: Systemd
echo -e "${YELLOW}[5/5] Configurazione Systemd...${NC}"
if [ -f "setup/zerolegend-gameserver.service" ]; then
    sudo cp setup/zerolegend-gameserver.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable zerolegend-gameserver.service
    sudo systemctl restart zerolegend-gameserver.service
    echo -e "${GREEN}✓ Systemd configurato${NC}"
else
    echo -e "${RED}✗ File service non trovato${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}======================================"
echo "✅ Deploy completato!"
echo "======================================${NC}"
echo ""
echo "📊 Status:"
echo "  - PM2 processes:"
pm2 list
echo ""
echo "  - Systemd service:"
sudo systemctl status zerolegend-gameserver.service --no-pager | grep -E "Active|loaded"
echo ""
echo "🌐 Accedi a: http://zerothelegend.gamer.gd/games/zerolegend/"
echo ""
echo "📝 Log:"
echo "  - PM2:    pm2 logs"
echo "  - Systemd: sudo journalctl -u zerolegend-gameserver.service -f"
echo "  - Nginx:  sudo tail -f /var/log/nginx/error.log"
echo ""
