# 🚀 ZeroLegend Game Server - Setup Guida Completa

## 📋 Prerequisiti
- ✅ Ubuntu Server
- ✅ Node.js ≥18
- ✅ PM2 installato globalmente
- ✅ Nginx installato
- ✅ Dominio: `zerothelegend.gamer.gd`

---

## 🔧 Step-by-Step Setup

### 1. **Preparazione Directory e Log**
```bash
cd /home/zero/ss
mkdir -p logs
chmod 755 logs
```

### 2. **Copia il file PM2 Ecosystem**
```bash
cp setup/ecosystem.config.js ./
pm2 delete all  # Pulisci processi vecchi
pm2 start ecosystem.config.js
pm2 save        # Salva configurazione PM2
```

Verifica che i 4 processi siano avviati:
```bash
pm2 list
pm2 logs
```

### 3. **Configura Nginx**
```bash
# Copia la configurazione
sudo cp setup/zerolegend-nginx.conf /etc/nginx/sites-available/zerolegend

# Attiva il sito
sudo ln -s /etc/nginx/sites-available/zerolegend /etc/nginx/sites-enabled/zerolegend

# Rimuovi default se esiste
sudo rm /etc/nginx/sites-enabled/default

# Testa la configurazione
sudo nginx -t

# Riavvia Nginx
sudo systemctl restart nginx
```

### 4. **Configura Systemd Service (Auto-start)**
```bash
# Copia il service
sudo cp setup/zerolegend-gameserver.service /etc/systemd/system/

# Ricarica systemd
sudo systemctl daemon-reload

# Abilita auto-start
sudo systemctl enable zerolegend-gameserver.service

# Avvia il service
sudo systemctl start zerolegend-gameserver.service

# Verifica status
sudo systemctl status zerolegend-gameserver.service
```

---

## 🧪 Test di Connessione

### Test Locale (dalla VM)
```bash
# WebSocket
wscat -c ws://localhost:3001

# HTTP API
curl http://localhost:3001/api/health
```

### Test Remoto (dal browser)
1. Vai a: `http://zerothelegend.gamer.gd/games/zerolegend/`
2. Apri DevTools (F12)
3. Console → Verifica che il WebSocket si connetta a `ws://...`
4. Gioca! 🎮

---

## 📊 Comandi Utili

### PM2 Management
```bash
# Vedi log in tempo reale
pm2 logs zerolegend-game-backend

# Riavvia
pm2 restart zerolegend-game-backend

# Arresta
pm2 stop zerolegend-game-backend

# Rimuovi
pm2 delete zerolegend-game-backend
```

### Systemd Management
```bash
# Start
sudo systemctl start zerolegend-gameserver.service

# Stop
sudo systemctl stop zerolegend-gameserver.service

# Restart
sudo systemctl restart zerolegend-gameserver.service

# Log
sudo journalctl -u zerolegend-gameserver.service -f
```

### Nginx Management
```bash
# Ricarica (senza downtime)
sudo nginx -s reload

# Riavvia
sudo systemctl restart nginx

# Log
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## 🔍 Troubleshooting

### Porta 3001 già in uso
```bash
lsof -i :3001
kill -9 <PID>
```

### Nginx: 502 Bad Gateway
```bash
# Verifica che Node.js sia in ascolto
netstat -tuln | grep 3001

# Testa Nginx config
sudo nginx -t

# Controlla log Nginx
sudo tail -50 /var/log/nginx/error.log
```

### WebSocket non si connette
1. Verifica in DevTools se il WebSocket URL è corretto
2. Controlla che Nginx faccia il proxy correttamente:
   ```bash
   curl -v http://zerothelegend.gamer.gd/games/zerolegend/
   ```
3. Leggi i log di Nginx: `sudo tail -f /var/log/nginx/access.log`

### Memoria piena
```bash
# Vedi uso memoria
pm2 monit

# Aumenta max_memory_restart in ecosystem.config.js
# Poi: pm2 restart ecosystem.config.js
```

---

## 🚀 Deploy Futuri (Aggiornamenti)

Quando devi aggiornare il codice:
```bash
cd /home/zero/ss
git pull origin main
npm install  # Se servono nuove dipendenze
pm2 restart ecosystem.config.js
```

---

## ✅ Checklist Finale

- [ ] Directory `logs/` creata
- [ ] PM2 sta eseguendo 4 processi
- [ ] Nginx configurato e riavviato
- [ ] Systemd service abilitato
- [ ] Test locale OK (ws://localhost:3001)
- [ ] Test remoto OK (http://zerothelegend.gamer.gd/games/zerolegend/)
- [ ] Riesci a entrare in game dal browser ✅

---

**Domande? Leggi i log!**
```bash
pm2 logs                    # Log Node.js
sudo systemctl status zerolegend-gameserver.service  # Log Systemd
sudo tail -f /var/log/nginx/error.log               # Log Nginx
```
