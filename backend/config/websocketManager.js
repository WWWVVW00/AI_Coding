// backend/config/websocketManager.js
const { WebSocketServer } = require('ws');

let wss;
const clients = new Map(); // 使用 Map 存储 userId -> ws 连接

function setupWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    // 从连接URL中获取用户ID（实际生产中应通过token验证）
    // 例如: ws://localhost:3001?userId=123
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');

    if (userId) {
      clients.set(userId, ws);
      console.log(`✅ WebSocket client connected for user: ${userId}`);
    }

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        console.log(`❌ WebSocket client disconnected for user: ${userId}`);
      }
    });

    ws.on('error', console.error);
  });

  console.log('🚀 WebSocket server is set up.');
}

function sendMessageToUser(userId, data) {
  const client = clients.get(String(userId));
  if (client && client.readyState === client.OPEN) {
    client.send(JSON.stringify(data));
    return true;
  }
  return false;
}

module.exports = {
  setupWebSocket,
  sendMessageToUser,
};