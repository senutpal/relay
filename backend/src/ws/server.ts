import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import * as schema from '../db/schema.js';

type Match = typeof schema.matches.$inferSelect;

const matchSubscribers = new Map<string, Set<WebSocket>>();
const subscriptions = new WeakMap<WebSocket, Set<string>>();

function subscribe(matchId: string, socket: WebSocket) {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }
  const subscribers = matchSubscribers.get(matchId);
  if (subscribers) {
    subscribers.add(socket);
  }
}

function unsubscribe(matchId: string, socket: WebSocket) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers) return;
  subscribers.delete(socket);
  if (subscribers.size === 0) {
    matchSubscribers.delete(matchId);
  }
}

function cleanupSubscriptions(socket: WebSocket) {
  const subs = subscriptions.get(socket);
  if (!subs) return;
  for (const matchId of subs) {
    unsubscribe(matchId, socket);
  }
}

function broadcastToMatch(matchId: string, payload: object) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);
  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function sendJson(socket: WebSocket, payload: object) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function broadcastToAll(wss: WebSocketServer, payload: object) {
  const data = JSON.stringify(payload);

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function handleMessage(socket: WebSocket, data: any){
  let message;

  try {
    message = JSON.parse(data.toString());

  } catch (error) {
    sendJson(socket, { type: 'error', message: 'Invalid JSON' });
    return;
  }

  if (message?.type === 'subscribe' && typeof message.matchId === 'string') {
    subscribe(message.matchId, socket);
    let subs = subscriptions.get(socket);
    if (!subs) {
        subs = new Set();
        subscriptions.set(socket, subs);
    }
    subs.add(message.matchId);
    sendJson(socket, { type: 'subscribe', matchId: message.matchId});
    return;
  }

  if (message?.type === 'unsubscribe' && typeof message.matchId === 'string') {
    unsubscribe(message.matchId, socket);
    const subs = subscriptions.get(socket);
    if (subs) {
        subs.delete(message.matchId);
    }
    sendJson(socket, { type: 'unsubscribed', matchId: message.matchId});
    return;
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
    subscriptions.set(socket, new Set());

    socket.on("pong", () => {
      alive.set(socket, true);
    });

    sendJson(socket, { type: "welcome" });

    socket.on('message', (data) => {
      handleMessage(socket,data);
    })

    socket.on('error', () => {
      socket.terminate();
    })

    socket.on('close', () => {
      cleanupSubscriptions(socket);
    })

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
    broadcastToAll(wss, { type: "match_created", match });
  }

  function broadcastCommentary(matchId: string, comment: object){
    broadcastToMatch(matchId, { type: 'commentary', data: comment });
  }

  return { broadcastMatchCreated,broadcastCommentary};
}
