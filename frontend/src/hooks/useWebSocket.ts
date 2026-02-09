import { useCallback, useEffect, useRef, useState } from 'react';
import type { WebSocketMessage, SubscribeMessage } from '../types/api';

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const connect = useCallback(function connect() {
    try {
      const wsUrl = `ws://localhost:3001/ws`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        optionsRef.current.onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(message);
          optionsRef.current.onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        optionsRef.current.onDisconnect?.();


        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000;
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        optionsRef.current.onError?.(error);
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  }, []);

  const disconnect = () => {

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
  };

  const subscribe = (matchId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: SubscribeMessage = {
        type: 'subscribe',
        matchId,
      };
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const unsubscribe = (matchId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: SubscribeMessage = {
        type: 'unsubscribe',
        matchId,
      };
      wsRef.current.send(JSON.stringify(message));
    }
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect]);

  return {
    isConnected,
    lastMessage,
    subscribe,
    unsubscribe,
    disconnect,
    reconnect: connect,
  };
}