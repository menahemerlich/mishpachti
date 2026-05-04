import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { PresenceService } from '../presence/presence.service';
import { ChatService } from '../chat/chat.service';

interface AuthedSocket extends Socket {
  data: {
    userId: string;
    email: string;
    role: 'ADMIN' | 'MEMBER';
  };
}

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly auth: AuthService,
    private readonly presence: PresenceService,
    private readonly chat: ChatService,
  ) {}

  // -----------------------------------------------------------------
  // Connection lifecycle
  // -----------------------------------------------------------------

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '') as string | undefined);
      if (!token) throw new Error('No token');
      const user = await this.auth.verifySocketToken(token);

      const sock = client as AuthedSocket;
      sock.data = { userId: user.id, email: user.email, role: user.role };

      // Auto-join user's personal room (for direct messaging) + all chat rooms they belong to
      sock.join(`user:${user.id}`);
      const roomIds = await this.chat.listUserRoomIds(user.id);
      for (const id of roomIds) sock.join(`room:${id}`);

      const { wasFirst } = await this.presence.addSocket(user.id, sock.id);

      if (wasFirst) {
        const online = await this.presence.listOnline();
        this.server.emit('presence:update', { userId: user.id, online: true });
        sock.emit('presence:list', online);
      }

      this.logger.log(`socket connected: user=${user.id} sock=${sock.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      this.logger.warn(`socket auth failed: ${msg}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const sock = client as AuthedSocket;
    const userId = sock.data?.userId;
    if (!userId) return;
    const { wasLast } = await this.presence.removeSocket(userId, sock.id);
    if (wasLast) {
      this.server.emit('presence:update', { userId, online: false });
    }
  }

  // -----------------------------------------------------------------
  // Helpers exposed to other services
  // -----------------------------------------------------------------

  emitToRoom(roomId: string, event: string, payload: unknown) {
    this.server.to(`room:${roomId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  broadcast(event: string, payload: unknown) {
    this.server.emit(event, payload);
  }

  // -----------------------------------------------------------------
  // Chat events
  // -----------------------------------------------------------------

  @SubscribeMessage('message:send')
  async onMessageSend(
    @ConnectedSocket() sock: AuthedSocket,
    @MessageBody()
    body: {
      tempId?: string;
      roomId: string;
      type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE';
      content?: string;
      mediaAssetId?: string;
      replyToId?: string;
    },
  ) {
    if (!body?.roomId) throw new WsException('Missing roomId');

    const message = await this.chat.createMessage({
      roomId: body.roomId,
      authorId: sock.data.userId,
      type: body.type ?? 'TEXT',
      content: body.content,
      mediaAssetId: body.mediaAssetId,
      replyToId: body.replyToId,
    });

    // Emit to all room members (sender included — they'll reconcile with tempId)
    this.server.to(`room:${body.roomId}`).emit('message:new', { ...message, tempId: body.tempId });
    return { ok: true, message };
  }

  @SubscribeMessage('message:edit')
  async onMessageEdit(
    @ConnectedSocket() sock: AuthedSocket,
    @MessageBody() body: { messageId: string; content: string },
  ) {
    const updated = await this.chat.editMessage(body.messageId, sock.data.userId, body.content);
    this.server.to(`room:${updated.roomId}`).emit('message:edited', updated);
    return { ok: true };
  }

  @SubscribeMessage('message:delete')
  async onMessageDelete(
    @ConnectedSocket() sock: AuthedSocket,
    @MessageBody() body: { messageId: string },
  ) {
    const deleted = await this.chat.softDeleteMessage(
      body.messageId,
      sock.data.userId,
      sock.data.role,
    );
    this.server.to(`room:${deleted.roomId}`).emit('message:deleted', { id: deleted.id, roomId: deleted.roomId });
    return { ok: true };
  }

  // -----------------------------------------------------------------
  // Reactions
  // -----------------------------------------------------------------

  @SubscribeMessage('reaction:add')
  async onReactionAdd(
    @ConnectedSocket() sock: AuthedSocket,
    @MessageBody() body: { messageId: string; emoji: string },
  ) {
    const { reaction, roomId } = await this.chat.addReaction(
      body.messageId,
      sock.data.userId,
      body.emoji,
    );
    this.server.to(`room:${roomId}`).emit('reaction:added', reaction);
    return { ok: true };
  }

  @SubscribeMessage('reaction:remove')
  async onReactionRemove(
    @ConnectedSocket() sock: AuthedSocket,
    @MessageBody() body: { messageId: string; emoji: string },
  ) {
    const { roomId } = await this.chat.removeReaction(
      body.messageId,
      sock.data.userId,
      body.emoji,
    );
    this.server.to(`room:${roomId}`).emit('reaction:removed', {
      messageId: body.messageId,
      userId: sock.data.userId,
      emoji: body.emoji,
    });
    return { ok: true };
  }

  // -----------------------------------------------------------------
  // Typing
  // -----------------------------------------------------------------

  @SubscribeMessage('typing:start')
  onTypingStart(
    @ConnectedSocket() sock: AuthedSocket,
    @MessageBody() body: { roomId: string },
  ) {
    sock.to(`room:${body.roomId}`).emit('typing:start', {
      roomId: body.roomId,
      userId: sock.data.userId,
    });
  }

  @SubscribeMessage('typing:stop')
  onTypingStop(
    @ConnectedSocket() sock: AuthedSocket,
    @MessageBody() body: { roomId: string },
  ) {
    sock.to(`room:${body.roomId}`).emit('typing:stop', {
      roomId: body.roomId,
      userId: sock.data.userId,
    });
  }

  // -----------------------------------------------------------------
  // Read receipts
  // -----------------------------------------------------------------

  @SubscribeMessage('read:receipt')
  async onReadReceipt(
    @ConnectedSocket() sock: AuthedSocket,
    @MessageBody() body: { roomId: string; messageId: string },
  ) {
    await this.chat.markRead(body.roomId, body.messageId, sock.data.userId);
    this.server.to(`room:${body.roomId}`).emit('read:receipt', {
      roomId: body.roomId,
      messageId: body.messageId,
      userId: sock.data.userId,
      readAt: new Date().toISOString(),
    });
  }

  // -----------------------------------------------------------------
  // Calls signaling
  // -----------------------------------------------------------------

  @SubscribeMessage('call:reject')
  onCallReject(
    @ConnectedSocket() sock: AuthedSocket,
    @MessageBody() body: { callId: string; roomId: string },
  ) {
    this.server.to(`room:${body.roomId}`).emit('call:rejected', {
      callId: body.callId,
      roomId: body.roomId,
      userId: sock.data.userId,
    });
  }

  @SubscribeMessage('call:accept')
  onCallAccept(
    @ConnectedSocket() sock: AuthedSocket,
    @MessageBody() body: { callId: string; roomId: string },
  ) {
    this.server.to(`room:${body.roomId}`).emit('call:accepted', {
      callId: body.callId,
      roomId: body.roomId,
      userId: sock.data.userId,
    });
  }
}
