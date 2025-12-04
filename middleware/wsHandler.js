const databaseService = require('../services/databaseService');

async function broadcastRankings(broadcast) {
    try {
        const rankings = await databaseService.getAllCountryClicks();
        broadcast('rankingUpdate', rankings);
    } catch (err) {
        console.error('Error broadcasting rankings:', err);
    }
}

function setupWSHandlers(wss) {
    wss.on('connection', (ws) => {
        // Send initial rankings on connection
        broadcastRankings(global.broadcast);

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                if (data.type === 'requestRankings') {
                    await broadcastRankings(global.broadcast);
                }
            } catch (err) {
                console.error('Error handling WebSocket message:', err);
            }
        });
    });
}

module.exports = { setupWSHandlers, broadcastRankings };