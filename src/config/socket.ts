import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from './env';
import { logger } from '../utils/logger.utils';
import { SocketService } from '../services/socket.service';
import { PresenceService } from '../services/presence.service';
import { redis } from './redis';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthenticatedSocket extends Socket {
  userId: string;
  role: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Must match client-side heartbeat interval (20 s). */
const HEARTBEAT_INTERVAL_MS = 20_000;

// ─── Module-level singletons ──────────────────────────────────────────────────

let io: SocketIOServer;
const presenceService = new PresenceService(redis);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Emit a presence event to every peer who shares a confirmed/in-progress
 * session with `userId`. Uses personal rooms (`user:{peerId}`) so only
 * relevant sockets receive the event.
 */
async function broadcastPresence(
  userId: string,
  event: 'user:online' | 'user:offline'
): Promise<void> {
  const audienceIds = await presenceService.getPresenceAudience(userId);

  for (const peerId of audienceIds) {
    io.to(`user:${peerId}`).emit(event, {
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  logger.info(`Socket.IO: Broadcast ${event}`, { userId, audienceSize: audienceIds.length });
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createSocketServer(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    path: '/socket.io',
    cors: {
      origin: env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Transport-level ping/pong (distinct from application heartbeat)
    pingTimeout: 10_000,
    pingInterval: 25_000,
  });

  // ── JWT authentication middleware ──────────────────────────────────────────
  io.use((socket: any, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      logger.warn('Socket.IO: No token provided', { socketId: socket.id });
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      socket.userId = decoded.userId;
      socket.role   = decoded.role;
      logger.info('Socket.IO: User authenticated', {
        socketId: socket.id,
        userId:   socket.userId,
        role:     socket.role,
      });
      next();
    } catch (err) {
      logger.warn('Socket.IO: Invalid token', { socketId: socket.id, error: err });
      next(new Error('Authentication error'));
    }
  });

  // ── Connection handler ─────────────────────────────────────────────────────
  io.on('connection', async (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const { userId, role } = socket;

    // Each socket joins a personal room for targeted emissions
    socket.join(`user:${userId}`);

    logger.info('Socket.IO: Client connected', { socketId: socket.id, userId, role });

    // Mark online; broadcast user:online only on a fresh offline→online transition
    const isNewlyOnline = await presenceService.markOnline(userId);
    if (isNewlyOnline) {
      await broadcastPresence(userId, 'user:online');
    }

    // ── Application-level heartbeat ──────────────────────────────────────────
    // Client must emit 'heartbeat' every 20 s. Each ping refreshes the Redis
    // TTL (SET online:{userId} 1 EX 30). If the client stops pinging the key
    // expires and the user is considered offline for subsequent status queries.
    socket.on('heartbeat', async () => {
      await presenceService.markOnline(userId);
    });

    // ── Server-side staleness check ──────────────────────────────────────────
    // Catches clients whose JS was suspended (background tab, device sleep)
    // without a clean WebSocket disconnect.
    const heartbeatTimer = setInterval(async () => {
      const { online } = await presenceService.getStatus(userId);
      if (!online) {
        clearInterval(heartbeatTimer);
        await broadcastPresence(userId, 'user:offline');
        socket.disconnect(true);
      }
    }, HEARTBEAT_INTERVAL_MS + 5_000); // check 5 s after expected ping

    // ── Reconnection — replay missed events ──────────────────────────────────
    socket.on('reconnect', () => {
      logger.info('Socket.IO: Client reconnected, replaying missed events', {
        socketId: socket.id,
        userId,
      });
      SocketService.replayMissedEvents(userId);
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      clearInterval(heartbeatTimer);

      logger.info('Socket.IO: Client disconnected', {
        socketId: socket.id,
        userId,
        role,
        reason,
      });

      // Mark offline; broadcast user:offline only on a fresh online→offline transition
      const isNewlyOffline = await presenceService.markOffline(userId);
      if (isNewlyOffline) {
        await broadcastPresence(userId, 'user:offline');
      }
    });
  });

  return io;
}

/**
 * Access the Socket.IO instance from other modules (e.g. booking service)
 * without creating circular imports.
 */
export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO not initialised — call createSocketServer first');
  return io;
}