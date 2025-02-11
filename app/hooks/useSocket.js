import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export function useSocket(onMessageReceived) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const messageQueueRef = useRef([]);

  const connect = useCallback(() => {
    try {
      if (socketRef.current?.connected) {
        return;
      }

      // 清理现有连接
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }

      console.log('Connecting to Socket.IO server:', SOCKET_URL);
      
      socketRef.current = io(SOCKET_URL, {
        path: '/api/socket',
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['websocket', 'polling'],
        forceNew: true,
        autoConnect: true,
      });

      socketRef.current.on('connect', () => {
        console.log('Socket.IO connected with ID:', socketRef.current.id);
        setConnected(true);
        
        // Send queued messages
        while (messageQueueRef.current.length > 0) {
          const queuedMessage = messageQueueRef.current.shift();
          console.log('Sending queued message:', queuedMessage);
          socketRef.current.emit('message', queuedMessage);
        }
      });

      socketRef.current.on('message', (message) => {
        console.log('Received message:', message);
        if (onMessageReceived && typeof onMessageReceived === 'function') {
          onMessageReceived(message);
        }
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected:', reason);
        setConnected(false);
        
        // 特定情况下的重连逻辑
        if (reason === 'io server disconnect' || reason === 'transport close') {
          console.log('Attempting to reconnect...');
          setTimeout(() => connect(), 1000);
        }
      });

      socketRef.current.on('error', (error) => {
        console.error('Socket.IO error:', error);
        setConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        setConnected(false);
        
        if (!reconnectTimeoutRef.current) {
          console.log('Scheduling reconnection attempt...');
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 3000);
        }
      });

      // 强制连接
      if (!socketRef.current.connected) {
        socketRef.current.connect();
      }

    } catch (error) {
      console.error('Failed to initialize Socket.IO:', error);
      setConnected(false);
      
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 3000);
      }
    }
  }, [onMessageReceived]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (socketRef.current) {
        console.log('Cleaning up socket connection');
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message) => {
    if (!message) {
      console.warn('Attempted to send empty message');
      return;
    }

    const messageWithTimestamp = {
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
    };

    console.log('Attempting to send message:', messageWithTimestamp);

    try {
      if (socketRef.current?.connected) {
        console.log('Socket is connected, sending message directly');
        socketRef.current.emit('message', messageWithTimestamp);
      } else {
        console.log('Socket not connected, queueing message');
        messageQueueRef.current.push(messageWithTimestamp);
        
        // 尝试重新连接
        console.log('Attempting to reconnect...');
        connect();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      messageQueueRef.current.push(messageWithTimestamp);
      
      // 尝试重新连接
      connect();
    }
  }, [connect]);

  return {
    connected,
    sendMessage,
  };
} 