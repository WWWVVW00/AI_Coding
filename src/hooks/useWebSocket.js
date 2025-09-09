// src/hooks/useWebSocket.js
import { useState, useEffect, useRef } from 'react';

export function useWebSocket(userId) {
  const [lastMessage, setLastMessage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    if (!userId) return;

    // 直接构建一个绝对路径的 WebSocket URL
    const protocol = window.location.protocol === 'https' ? 'wss:' : 'ws:';
    const host = window.location.host; // e.g., "localhost" or "yourdomain.com"
    const wsUrl = `${protocol}//${host}/ws?userId=${userId}`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket Connected via:', wsUrl);
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLastMessage({ ...data, timestamp: new Date() });
    };

    ws.current.onclose = () => {
      console.log('WebSocket Disconnected');
      setIsConnected(false);
    };
    
    ws.current.onerror = (error) => {
        console.error('WebSocket Error:', error);
        setIsConnected(false);
    }

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [userId]);

  return { lastMessage, isConnected };
}