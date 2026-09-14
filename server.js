const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Endpoint HTTP di base per il controllo dello stato (Health Check)
app.get('/', (req, res) => {
  res.send('Zero The Legend Game Server is running successfully!');
});

// Collezione per tracciare tutti i client attivi
const clients = new Set();

wss.on('connection', (ws, req) => {
  const clientId = Math.random().toString(36).substring(2, 9);
  ws.id = clientId;
  ws.isAlive = true;
  clients.add(ws);

  console.log(`[WebSocket] Nuovo giocatore connesso: ${clientId} (Totale attivi: ${clients.size})`);

  // Gestione del riscontro Ping/Pong per il keep-alive
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Ricezione e smistamento messaggi dal client / mod
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`[Dati ricevuti da ${ws.id}]:`, data);

      // Esempio di gestione basata sul tipo di evento inviato dal client
      if (data.type === 'player_action') {
        // Puoi aggiungere qui la logica di gioco o la sincronizzazione
      }

    } catch (err) {
      console.error(`[Errore JSON] Messaggio non valido da ${ws.id}:`, message.toString());
    }
  });

  // Gestione della disconnessione
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WebSocket] Giocatore disconnesso: ${ws.id} (Totale attivi: ${clients.size})`);
  });

  ws.on('error', (error) => {
    console.error(`[WebSocket Errore] Client ${ws.id}:`, error.message);
  });
});

// Intervallo di controllo periodico per chiudere le connessioni zombie/inattive (ogni 30 secondi)
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log(`[Heartbeat] Chiusura connessione inattiva per il client: ${ws.id}`);
      clients.delete(ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Zero The Legend Server avviato con successo sulla porta ${PORT}`);
});
