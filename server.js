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
// NUOVO: Imposta il numero desiderato di bot
const TARGET_BOTS = 5; 

let players = {};
let food = [];
let viruses = [];
let ejectedMass = [];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

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

function spawnViruses() {
  while (viruses.length < MAX_VIRUSES) {
    viruses.push({
      id: Math.random().toString(36).substr(2, 9),
      x: rand(100, WORLD_SIZE - 100),
      y: rand(100, WORLD_SIZE - 100),
      mass: 100 // Il virus è grande 100
    });
  }
}

// NUOVO: Funzione per generare i Bot
function spawnBots() {
    let currentBots = Object.values(players).filter(p => p.isBot).length;
    while (currentBots < TARGET_BOTS) {
        let botId = 'bot_' + Math.random().toString(36).substr(2, 9);
        players[botId] = {
            id: botId,
            name: 'Bot ' + rand(1, 999),
            color: `hsl(${rand(0, 360)}, 80%, 40%)`,
            skin: '',
            alive: true,
            isBot: true, // Flag per riconoscere i bot
            targetX: rand(0, WORLD_SIZE), // Obiettivo di movimento
            targetY: rand(0, WORLD_SIZE),
            cells: [{ x: rand(200, WORLD_SIZE - 200), y: rand(200, WORLD_SIZE - 200), mass: INITIAL_MASS }]
        };
        currentBots++;
    }
}

spawnFood();
spawnViruses();
spawnBots(); // Inizializza i bot all'avvio

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

      if (msg.t === 'join' || msg.t === 'respawn') {
        const color = msg.color || `hsl(${rand(0, 360)}, 80%, 60%)`;
        players[playerId] = {
          id: playerId,
          name: msg.name || 'Player',
          color: color,
          skin: msg.skin || '',
          alive: true,
          isBot: false,
          cells: [
            {
              x: rand(200, WORLD_SIZE - 200),
              y: rand(200, WORLD_SIZE - 200),
              mass: INITIAL_MASS
            }
          ]
        };

        ws.send(JSON.stringify({ t: 'welcome', id: playerId, worldSize: WORLD_SIZE }));
        broadcast({ t: 'chat', name: 'System', msg: `${players[playerId].name} joined the game!` });
      }

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

      if (msg.t === 'input' && players[playerId] && players[playerId].alive) {
        const p = players[playerId];
        p.dx = msg.dx; // Salviamo l'input per processarlo nel loop principale
        p.dy = msg.dy; 
      }

      if (msg.t === 'eject' && players[playerId] && players[playerId].alive) {
        const p = players[playerId];
        p.cells.forEach((c) => {
          if (c.mass > 35) {
            c.mass -= 12;
            const angle = Math.atan2(p.dy || 0, p.dx || 0); // Modificato per usare p.dx e p.dy
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

      if (msg.t === 'split' && players[playerId] && players[playerId].alive) {
        const p = players[playerId];
        if (p.cells.length < 16) {
          let newCells = [];
          p.cells.forEach((c) => {
            if (c.mass >= 36) {
              const halfMass = Math.floor(c.mass / 2);
              c.mass = halfMass;
              const angle = Math.atan2(p.dy || 0, p.dx || 0); // Modificato
              newCells.push({
                x: c.x + Math.cos(angle) * 20,
                y: c.y + Math.sin(angle) * 20,
                mass: halfMass
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

// LOOP PRINCIPALE DEL GIOCO (30 FPS)
setInterval(() => {
  
  // 1. Aggiorna Massa Espulsa
  ejectedMass.forEach((e) => {
    e.x += e.vx;
    e.y += e.vy;
    e.vx *= 0.9;
    e.vy *= 0.9;
    e.x = Math.max(10, Math.min(WORLD_SIZE - 10, e.x));
    e.y = Math.max(10, Math.min(WORLD_SIZE - 10, e.y));
  });

  // 2. Movimento dei giocatori e dei Bot
  Object.values(players).forEach((p) => {
    if (!p.alive) return;

    // Logica base per i Bot: cambiano direzione a caso se sono vicini al target
    if (p.isBot) {
        let cell = p.cells[0];
        let distToTarget = Math.hypot(p.targetX - cell.x, p.targetY - cell.y);
        if (distToTarget < 50 || Math.random() < 0.02) {
            p.targetX = rand(0, WORLD_SIZE);
            p.targetY = rand(0, WORLD_SIZE);
        }
        p.dx = p.targetX - cell.x;
        p.dy = p.targetY - cell.y;
    }

    const dx = p.dx || 0;
    const dy = p.dy || 0;
    const len = Math.hypot(dx, dy);

    if (len > 0) {
      const speedFactor = 3;
      p.cells.forEach((c) => {
        const speed = Math.max(1.2, speedFactor - Math.sqrt(c.mass) * 0.08);
        c.x += (dx / len) * speed;
        c.y += (dy / len) * speed;
        c.x = Math.max(10, Math.min(WORLD_SIZE - 10, c.x));
        c.y = Math.max(10, Math.min(WORLD_SIZE - 10, c.y));
      });
    }
  });

  // 3. Collisioni: Cibo, Virus e PvP
  Object.values(players).forEach((p) => {
    if (!p.alive) return;

    p.cells.forEach((c, cellIndex) => {
      const r = Math.sqrt(c.mass) * 4; // Raggio della cellula

      // Cibo
      food = food.filter((f) => {
        if (Math.hypot(c.x - f.x, c.y - f.y) < r) {
          c.mass += 1;
          return false;
        }
        return true;
      });

      // Massa Espulsa
      ejectedMass = ejectedMass.filter((e) => {
        if (Math.hypot(c.x - e.x, c.y - e.y) < r && c.mass > e.mass * 1.1) {
          c.mass += e.mass;
          return false;
        }
        return true;
      });

      // NUOVO: Collisione con i Virus
      viruses = viruses.filter((v) => {
        // Se la cellula è più grande del virus (di un po') e lo tocca
        if (c.mass > v.mass * 1.2 && Math.hypot(c.x - v.x, c.y - v.y) < r) {
            // "Scoppia" la cellula (fino a 16 frammenti)
            let fragments = Math.min(8, 16 - p.cells.length); // Quanti nuovi pezzi generare
            if (fragments > 0) {
                let fragmentMass = c.mass / (fragments + 1);
                c.mass = fragmentMass;
                for(let i = 0; i < fragments; i++) {
                     p.cells.push({
                        x: c.x + rand(-50, 50),
                        y: c.y + rand(-50, 50),
                        mass: fragmentMass
                     });
                }
            }
            return false; // Il virus scompare
        }
        return true;
      });

      // NUOVO: Collisioni PvP (Giocatori si mangiano)
      Object.values(players).forEach((otherPlayer) => {
          if (otherPlayer.id === p.id || !otherPlayer.alive) return;
          
          otherPlayer.cells.forEach((otherCell, otherIndex) => {
              // Devi essere il 25% più grande per mangiare un altro
              if (c.mass > otherCell.mass * 1.25) {
                  const dist = Math.hypot(c.x - otherCell.x, c.y - otherCell.y);
                  // Se la cellula più grande copre il centro di quella più piccola
                  if (dist < r) {
                      c.mass += otherCell.mass;
                      otherCell.mass = 0; // Segnala per la rimozione
                  }
              }
          });
          // Rimuovi le cellule mangiate dell'altro giocatore
          otherPlayer.cells = otherPlayer.cells.filter(cell => cell.mass > 0);
          if (otherPlayer.cells.length === 0) {
              otherPlayer.alive = false;
              if(otherPlayer.isBot) spawnBots(); // Fai respawnare il bot se muore
          }
      });
    });
  });

  spawnFood();
  spawnViruses(); // Mantiene il numero di virus costante

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
