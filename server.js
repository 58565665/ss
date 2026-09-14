const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// --- CONFIGURAZIONE DATABASE ---
const MONGO_URI = 'INSERISCI_QUI_IL_TUO_LINK_MONGODB_ATLAS'; // <-- MODIFICA QUI
const JWT_SECRET = 'zero_the_legend_secret_key';

mongoose.connect(MONGO_URI)
    .then(() => console.log('Connesso a MongoDB!'))
    .catch(err => console.error('Errore MongoDB. Hai inserito il link corretto?', err.message));

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    bestMass: { type: Number, default: 0 }
});
const User = mongoose.model('User', UserSchema);

// --- API REGISTRAZIONE E LOGIN ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ error: 'Nome già in uso' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'Registrazione completata!' });
    } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: 'Credenziali errate' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Credenziali errate' });

        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, username: user.username, xp: user.xp, level: user.level, bestMass: user.bestMass });
    } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// --- MOTORE DEL GIOCO ---
const GAME_SIZE = 3000;
let players = {};
let foods = [];

// Genera cibo iniziale
for (let i = 0; i < 500; i++) spawnFood();

function spawnFood() {
    foods.push({
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * GAME_SIZE,
        y: Math.random() * GAME_SIZE,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`
    });
}

wss.on('connection', (ws) => {
    let playerId = null;

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.t === 'join' || data.t === 'respawn') {
            playerId = Math.random().toString(36).substr(2, 9);
            players[playerId] = {
                x: Math.random() * GAME_SIZE,
                y: Math.random() * GAME_SIZE,
                r: 20, // Massa iniziale
                name: data.name || 'Guest',
                color: data.color || '#00f3ff',
                targetX: 0,
                targetY: 0
            };
            ws.send(JSON.stringify({ t: 'init', id: playerId }));
        }

        if (data.t === 'mouse' && playerId && players[playerId]) {
            players[playerId].targetX = data.x;
            players[playerId].targetY = data.y;
        }
    });

    ws.on('close', () => {
        if (playerId) delete players[playerId];
    });
});

// Game Loop (30 volte al secondo)
setInterval(() => {
    for (let id in players) {
        let p = players[id];
        
        // Movimento (più sei grande, più sei lento)
        let speed = 200 / p.r; 
        if (speed < 1) speed = 1;
        if (speed > 5) speed = 5;

        let dx = p.targetX - p.x;
        let dy = p.targetY - p.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > speed) {
            p.x += (dx / dist) * speed;
            p.y += (dy / dist) * speed;
        }

        // Limiti mappa
        p.x = Math.max(p.r, Math.min(GAME_SIZE - p.r, p.x));
        p.y = Math.max(p.r, Math.min(GAME_SIZE - p.r, p.y));

        // Mangiare il cibo
        for (let i = foods.length - 1; i >= 0; i--) {
            let f = foods[i];
            let fdx = p.x - f.x;
            let fdy = p.y - f.y;
            if (Math.sqrt(fdx * fdx + fdy * fdy) < p.r) {
                p.r += 0.5; // Aumenta massa
                foods.splice(i, 1);
                spawnFood();
            }
        }
    }

    // Invia stato a tutti
    const gameState = JSON.stringify({ t: 'update', players, foods });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(gameState);
        }
    });
}, 1000 / 30);

server.listen(3000, () => {
    console.log('Server in ascolto sulla porta 3000');
});
