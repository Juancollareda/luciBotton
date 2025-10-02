const WebSocket = require('ws');

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server });
    const clients = new Set();

    wss.on('connection', (ws) => {
        clients.add(ws);

        ws.on('close', () => {
            clients.delete(ws);
        });
    });

    // Broadcast updates to all connected clients
    function broadcast(type, payload) {
        const message = JSON.stringify({
            type,
            payload
        });
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    return { wss, broadcast };
}

module.exports = setupWebSocket;