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
    function broadcast(messageObj) {
        // Handle both object format {type, data} and (type, payload) format
        let message;
        if (typeof messageObj === 'string') {
            // Legacy format or direct string
            message = messageObj;
        } else if (messageObj.type && messageObj.data !== undefined) {
            // New format: {type: 'eventType', data: {...}}
            message = JSON.stringify(messageObj);
        } else if (messageObj.type && messageObj.payload !== undefined) {
            // Old format: {type: 'eventType', payload: {...}}
            message = JSON.stringify(messageObj);
        } else {
            // Unknown format, try to stringify as-is
            message = JSON.stringify(messageObj);
        }

        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    return { wss, broadcast };
}

module.exports = setupWebSocket;