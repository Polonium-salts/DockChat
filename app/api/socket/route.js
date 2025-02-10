import { Server as SocketServer } from 'socket.io';
import { createServer } from 'http';
import { NextResponse } from 'next/server';

let io;
let httpServer;

if (!global.io) {
  httpServer = createServer();
  io = new SocketServer(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('message', (message) => {
      console.log('Received message:', message);
      io.emit('message', {
        ...message,
        timestamp: message.timestamp || new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // 启动HTTP服务器
  const PORT = parseInt(process.env.SOCKET_PORT || '3001', 10);
  httpServer.listen(PORT, () => {
    console.log(`Socket.IO server running on port ${PORT}`);
  });

  global.io = io;
}

export async function GET(req) {
  try {
    if (!global.io) {
      throw new Error('Socket.IO server not initialized');
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
      },
    });
  } catch (error) {
    console.error('Socket initialization error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export const dynamic = 'force-dynamic'; 