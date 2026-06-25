const databaseService = require('../services/databaseService');
const getCountry = require('../utils/getCountry');
const WebSocket = require('ws');
const twitchService = require('../services/twitchService');

// In-memory chat history caches (limit to 30 messages)
const MAX_HISTORY = 30;
const globalChatHistory = [];
const countryChatHistory = new Map(); // countryCode -> array of messages

function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function addGlobalMessage(msg) {
    globalChatHistory.push(msg);
    if (globalChatHistory.length > MAX_HISTORY) {
        globalChatHistory.shift();
    }
}

function addCountryMessage(countryCode, msg) {
    if (!countryChatHistory.has(countryCode)) {
        countryChatHistory.set(countryCode, []);
    }
    const history = countryChatHistory.get(countryCode);
    history.push(msg);
    if (history.length > MAX_HISTORY) {
        history.shift();
    }
}

async function broadcastRankings(broadcast) {
    try {
        const rankings = await databaseService.getAllCountryClicks();
        broadcast('rankingUpdate', rankings);
    } catch (err) {
        console.error('Error broadcasting rankings:', err);
    }
}

function setupWSHandlers(wss) {
    wss.on('connection', (ws, req) => {
        // Safe check for country
        const country = ws.country || (req ? getCountry(req) : 'XX');
        ws.country = country;

        // Send initial rankings on connection
        broadcastRankings(global.broadcast);

        // Send initial stream status
        ws.send(JSON.stringify({
            type: 'streamStatus',
            data: { live: twitchService.getStreamStatus() }
        }));

        // Send initial chat histories on connection
        const myCountryHistory = countryChatHistory.get(country) || [];
        ws.send(JSON.stringify({
            type: 'chatInit',
            data: {
                global: globalChatHistory,
                country: myCountryHistory,
                userCountry: country
            }
        }));

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                if (data.type === 'requestRankings') {
                    await broadcastRankings(global.broadcast);
                } else if (data.type === 'chatMessage') {
                    handleChatMessage(ws, wss, data.data);
                }
            } catch (err) {
                console.error('Error handling WebSocket message:', err);
            }
        });
    });
}

function handleChatMessage(ws, wss, msgData) {
    if (!msgData || typeof msgData.text !== 'string') return;
    
    const text = msgData.text.trim();
    if (text.length === 0 || text.length > 100) return; // limit to 100 chars

    const nickname = (typeof msgData.nickname === 'string' ? msgData.nickname.trim() : '') || 'Anonymous';
    const channel = msgData.channel === 'country' ? 'country' : 'global';
    
    const sanitizedText = sanitizeString(text);
    const sanitizedNickname = sanitizeString(nickname).substring(0, 15) || 'Anonymous';

    const ADMIN_PASSWORD = "supersecret123123ret123123";
    const isAdmin = msgData.password === ADMIN_PASSWORD;

    const messageObj = {
        channel,
        text: sanitizedText,
        nickname: sanitizedNickname,
        country: ws.country,
        timestamp: Date.now(),
        isAdmin: isAdmin
    };

    if (channel === 'global') {
        addGlobalMessage(messageObj);
        const payload = JSON.stringify({ type: 'chatBroadcast', data: messageObj });
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    } else {
        addCountryMessage(ws.country, messageObj);
        const payload = JSON.stringify({ type: 'chatBroadcast', data: messageObj });
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && client.country === ws.country) {
                client.send(payload);
            }
        });
    }
}

module.exports = { setupWSHandlers, broadcastRankings };