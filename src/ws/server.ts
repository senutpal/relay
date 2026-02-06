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

const alive = new WeakMap<WebSocket, boolean>();

export function attachWebSocketServer(server: Server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on("connection", (socket) => {
    alive.set(socket, true);

    socket.on("pong", () => {
      alive.set(socket, true);
    });

    sendJson(socket, { type: "welcome" });
    socket.on("error", console.error);
  });

  const heartbeatInterval = setInterval(() => {
    for (const socket of wss.clients) {
      if (socket.readyState !== WebSocket.OPEN) continue;

      if (alive.get(socket) === false) {
        socket.terminate();
        continue;
      }

      alive.set(socket, false);
      socket.ping();
    }
  }, 30_000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  function broadcastMatchCreated(match: Match) {
    broadcast(wss, { type: "match_created", match });
  }

  return { broadcastMatchCreated };
}
