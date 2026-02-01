import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import * as schema from '../db/schema.js';

type Match = typeof schema.matches.$inferSelect;

function sendJson(socket: WebSocket, payload: object) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function broadcast(wss: WebSocketServer, payload: object) {
  const data = JSON.stringify(payload);

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

export function attachWebSocketServer(server: Server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on("connection", (socket: WebSocket) => {
    sendJson(socket, { type: "welcome" });
    socket.on("error", console.error);
  });

  function broadcastMatchCreated(match: Match) {
    broadcast(wss, { type: "match_created", match });
  }

  return { broadcastMatchCreated };
}
