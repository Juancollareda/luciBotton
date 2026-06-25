const WebSocket = require('ws');
const getCountry = require('./utils/getCountry');

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server });
    const clients = new Set();

    wss.on('connection', (ws, req) => {
        clients.add(ws);
        
        // Associate country with client connection
        ws.country = getCountry(req);

        ws.on('close', () => {
            clients.delete(ws);
        });
    });

    // Broadcast updates to all connected clients
    function broadcast(messageObj, secondaryData) {
        // Handle both object format {type, data} and (type, payload) format
        let message;
        if (typeof messageObj === 'string') {
            // It was called as broadcast('eventType', payload/data)
            // Pack it into a JSON object with both 'payload' and 'data' keys for compatibility
            message = JSON.stringify({
                type: messageObj,
                payload: secondaryData,
                data: secondaryData
            });
        } else if (messageObj && messageObj.type && messageObj.data !== undefined) {
            // New format: {type: 'eventType', data: {...}}
            message = JSON.stringify(messageObj);
        } else if (messageObj && messageObj.type && messageObj.payload !== undefined) {
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