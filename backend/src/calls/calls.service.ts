import { Inject, Injectable, Logger, NotFoundException, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';
import { nanoid } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from '../chat/chat.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly serverUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => ChatService)) private readonly chat: ChatService,
    @Inject(forwardRef(() => RealtimeGateway)) private readonly realtime: RealtimeGateway,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notifications: NotificationsService,
    private readonly users: UsersService,
  ) {
    this.apiKey = this.config.getOrThrow<string>('LIVEKIT_API_KEY');
    this.apiSecret = this.config.getOrThrow<string>('LIVEKIT_API_SECRET');
    this.serverUrl = this.config.getOrThrow<string>('LIVEKIT_URL');
  }

  /** Start a new call session and notify all room members. */
  async startCall(input: {
    roomId: string;
    starterId: string;
    isVideo: boolean;
  }) {
    await this.chat.ensureMember(input.roomId, input.starterId);

    const livekitRoomName = `mishpachti-${input.roomId}-${nanoid(8)}`;

    const session = await this.prisma.callSession.create({
      data: {
        roomId: input.roomId,
        livekitRoomName,
        startedById: input.starterId,
        isVideo: input.isVideo,
      },
      include: {
        startedBy: { select: { id: true, name: true, profilePicture: true } },
        room: true,
      },
    });

    const starterToken = await this.createToken({
      roomName: livekitRoomName,
      identity: input.starterId,
      name: session.startedBy.name,
    });

    // Broadcast incoming call to ALL room members (including starter for confirmation)
    this.realtime.emitToRoom(input.roomId, 'call:incoming', {
      callId: session.id,
      roomId: input.roomId,
      livekitRoomName,
      isVideo: input.isVideo,
      startedBy: session.startedBy,
      startedAt: session.startedAt,
    });

    // Push notify offline members
    this.notifications
      .notifyIncomingCall(session, input.starterId)
      .catch(() => undefined);

    return {
      callId: session.id,
      roomId: input.roomId,
      livekitRoomName,
      livekitUrl: this.serverUrl,
      token: starterToken,
      isVideo: input.isVideo,
    };
  }

  /** Get a token for a member joining an existing call. */
  async getJoinToken(callId: string, userId: string) {
    const session = await this.prisma.callSession.findUnique({ where: { id: callId } });
    if (!session) throw new NotFoundException('השיחה לא נמצאה');
    if (session.endedAt) throw new NotFoundException('השיחה הסתיימה');
    await this.chat.ensureMember(session.roomId, userId);

    const user = await this.users.findById(userId);
    const token = await this.createToken({
      roomName: session.livekitRoomName,
      identity: userId,
      name: user?.name ?? 'משתמש',
    });

    return {
      callId: session.id,
      roomId: session.roomId,
      livekitRoomName: session.livekitRoomName,
      livekitUrl: this.serverUrl,
      token,
      isVideo: session.isVideo,
    };
  }

  async endCall(callId: string, userId: string) {
    const session = await this.prisma.callSession.findUnique({ where: { id: callId } });
    if (!session) throw new NotFoundException('השיחה לא נמצאה');
    if (session.endedAt) return session;

    const updated = await this.prisma.callSession.update({
      where: { id: callId },
      data: { endedAt: new Date() },
    });

    this.realtime.emitToRoom(session.roomId, 'call:ended', {
      callId: session.id,
      roomId: session.roomId,
      endedBy: userId,
    });

    return updated;
  }

  private async createToken(input: { roomName: string; identity: string; name: string }) {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: input.identity,
      name: input.name,
      ttl: 60 * 60, // 1h
    });
    at.addGrant({
      roomJoin: true,
      room: input.roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    return at.toJwt();
  }
}
