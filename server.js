const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const WORLD_SIZE = 4000;
const INITIAL_MASS = 20;
const MAX_FOOD = 600;
const MAX_VIRUSES = 20;

let players = {};
let food = [];
let viruses = [];
let ejectedMass = [];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

// Inizializza il cibo
function spawnFood() {
  while (food.length < MAX_FOOD) {
    food.push({
      id: Math.random().toString(36).substr(2, 9),
      x: rand(20, WORLD_SIZE - 20),
      y: rand(20, WORLD_SIZE - 20),
      color: `hsl(${rand(0, 360)}, 100%, 50%)`
    });
  }
}

// Inizializza i virus (spine)
function spawnViruses() {
  while (viruses.length < MAX_VIRUSES) {
    viruses.push({
      id: Math.random().toString(36).substr(2, 9),
      x: rand(100, WORLD_SIZE - 100),
      y: rand(100, WORLD_SIZE - 100),
      mass: 100
    });
  }
}

spawnFood();
spawnViruses();

function broadcast(data) {
  const json = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

wss.on('connection', (ws) => {
  let playerId = Math.random().toString(36).substr(2, 9);

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);

      // 1. JOIN / RESPAWN
      if (msg.t === 'join' || msg.t === 'respawn') {
        const color = msg.color || `hsl(${rand(0, 360)}, 80%, 60%)`;
        const skinUrl = msg.skin || '';
        players[playerId] = {
          id: playerId,
          name: msg.name || 'Player',
          color: color,
          skin: skinUrl,
          alive: true,
          cells: [
            {
              x: rand(200, WORLD_SIZE - 200),
              y: rand(200, WORLD_SIZE - 200),
              mass: INITIAL_MASS,
              vx: 0,
              vy: 0
            }
          ]
        };

        ws.send(JSON.stringify({ t: 'welcome', id: playerId, worldSize: WORLD_SIZE }));
        broadcast({ t: 'chat', name: 'System', msg: `${players[playerId].name} joined the game!` });
      }

      // 2. CHAT MULTIPLAYER (Broadcast a tutti i client)
      if (msg.t === 'chat') {
        const p = players[playerId];
        if (p && msg.msg) {
          broadcast({
            t: 'chat',
            name: p.name,
            msg: msg.msg.substring(0, 100)
          });
        }
      }

      // 3. INPUT DIREZIONE
      if (msg.t === 'input' && players[playerId] && players[playerId].alive) {
        const p = players[playerId];
        const dx = msg.dx;
        const dy = msg.dy;
        const len = Math.hypot(dx, dy);

        if (len > 0) {
          const speedFactor = 3;
          p.cells.forEach((c) => {
            const speed = Math.max(1.2, speedFactor - Math.sqrt(c.mass) * 0.08);
            c.x += (dx / len) * speed;
            c.y += (dy / len) * speed;

            // Limiti mappa
            c.x = Math.max(10, Math.min(WORLD_SIZE - 10, c.x));
            c.y = Math.max(10, Math.min(WORLD_SIZE - 10, c.y));
          });
        }
      }

      // 4. EIEZIONE MASSA (Tasto W)
      if (msg.t === 'eject' && players[playerId] && players[playerId].alive) {
        const p = players[playerId];
        p.cells.forEach((c) => {
          if (c.mass > 35) {
            c.mass -= 12;
            const angle = Math.atan2(msg.dy || 0, msg.dx || 0);
            ejectedMass.push({
              x: c.x + Math.cos(angle) * (Math.sqrt(c.mass) * 4 + 10),
              y: c.y + Math.sin(angle) * (Math.sqrt(c.mass) * 4 + 10),
              vx: Math.cos(angle) * 12,
              vy: Math.sin(angle) * 12,
              mass: 10,
              color: p.color
            });
          }
        });
      }

      // 5. SDOPPIAMENTO (Spazio)
      if (msg.t === 'split' && players[playerId] && players[playerId].alive) {
        const p = players[playerId];
        if (p.cells.length < 16) {
          let newCells = [];
          p.cells.forEach((c) => {
            if (c.mass >= 36) {
              const halfMass = Math.floor(c.mass / 2);
              c.mass = halfMass;
              const angle = Math.atan2(msg.dy || 0, msg.dx || 0);
              newCells.push({
                x: c.x + Math.cos(angle) * 20,
                y: c.y + Math.sin(angle) * 20,
                mass: halfMass,
                vx: Math.cos(angle) * 15,
                vy: Math.sin(angle) * 15
              });
            }
          });
          p.cells.push(...newCells);
        }
      }
    } catch (e) {
      console.error(e);
    }
  });

  ws.on('close', () => {
    if (players[playerId]) {
      broadcast({ t: 'chat', name: 'System', msg: `${players[playerId].name} left the game.` });
      delete players[playerId];
    }
  });
});

// Game Loop Server (30 Tick/Sec)
setInterval(() => {
  // Fisiche per la massa espulsa
  ejectedMass.forEach((e) => {
    e.x += e.vx;
    e.y += e.vy;
    e.vx *= 0.9;
    e.vy *= 0.9;
    e.x = Math.max(10, Math.min(WORLD_SIZE - 10, e.x));
    e.y = Math.max(10, Math.min(WORLD_SIZE - 10, e.y));
  });

  // Collisioni con il cibo
  Object.values(players).forEach((p) => {
    if (!p.alive) return;
    p.cells.forEach((c) => {
      const r = Math.sqrt(c.mass) * 4;
      food = food.filter((f) => {
        const dist = Math.hypot(c.x - f.x, c.y - f.y);
        if (dist < r) {
          c.mass += 1;
          return false;
        }
        return true;
      });

      // Mangia massa espulsa
      ejectedMass = ejectedMass.filter((e) => {
        const dist = Math.hypot(c.x - e.x, c.y - e.y);
        if (dist < r && c.mass > e.mass * 1.1) {
          c.mass += e.mass;
          return false;
        }
        return true;
      });
    });
  });

  spawnFood();

  // Invia stato aggiornato
  broadcast({
    t: 'state',
    players: Object.values(players),
    food,
    viruses,
    ejectedMass
  });
}, 1000 / 30);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server attivo sulla porta ${PORT}`));
