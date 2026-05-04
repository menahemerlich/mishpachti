import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CalendarEvent, CallSession } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PresenceService } from '../presence/presence.service';

interface OneSignalPayload {
  app_id: string;
  include_player_ids: string[];
  headings: Record<string, string>;
  contents: Record<string, string>;
  data?: Record<string, unknown>;
  url?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly appId: string;
  private readonly restApiKey: string;
  private readonly enabled: boolean;
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
    private readonly config: ConfigService,
  ) {
    this.appId = this.config.get<string>('ONESIGNAL_APP_ID', '').trim();
    this.restApiKey = this.config.get<string>('ONESIGNAL_REST_API_KEY', '').trim();
    this.appUrl = this.config.get<string>('APP_URL', '');
    this.enabled =
      !!this.appId &&
      this.appId !== 'fill_me_in' &&
      !!this.restApiKey &&
      this.restApiKey !== 'fill_me_in';
    if (!this.enabled) {
      this.logger.warn(
        'OneSignal credentials not configured — push notifications disabled (logging only).',
      );
    }
  }

  // -----------------------------------------------------------------
  // Subscription registration
  // -----------------------------------------------------------------

  async registerSubscription(input: {
    userId: string;
    oneSignalPlayerId: string;
    deviceInfo?: string;
  }) {
    return this.prisma.pushSubscription.upsert({
      where: { oneSignalPlayerId: input.oneSignalPlayerId },
      create: {
        userId: input.userId,
        oneSignalPlayerId: input.oneSignalPlayerId,
        deviceInfo: input.deviceInfo,
      },
      update: { userId: input.userId, lastSeenAt: new Date() },
    });
  }

  async removeSubscription(userId: string, oneSignalPlayerId: string) {
    await this.prisma.pushSubscription
      .deleteMany({ where: { userId, oneSignalPlayerId } })
      .catch(() => undefined);
    return { success: true };
  }

  // -----------------------------------------------------------------
  // High-level notify methods
  // -----------------------------------------------------------------

  async notifyNewMessage(
    roomId: string,
    senderId: string,
    message: { id: string; content: string | null; type: string; author?: { name: string } },
  ) {
    const memberIds = await this.getRoomMemberIds(roomId);
    const recipients = memberIds.filter((id) => id !== senderId);
    const offline = await this.presence.filterOffline(recipients);
    if (offline.length === 0) return;

    const playerIds = await this.getPlayerIds(offline);
    if (playerIds.length === 0) return;

    const senderName = message.author?.name ?? 'משפחתי';
    const body =
      message.type === 'TEXT' && message.content
        ? message.content.slice(0, 140)
        : message.type === 'IMAGE'
          ? '📷 שלח/ה תמונה'
          : message.type === 'VIDEO'
            ? '🎥 שלח/ה וידאו'
            : message.type === 'VOICE'
              ? '🎙️ שלח/ה הודעה קולית'
              : 'הודעה חדשה';

    await this.send({
      app_id: this.appId,
      include_player_ids: playerIds,
      headings: { en: senderName, he: senderName },
      contents: { en: body, he: body },
      data: { type: 'message', roomId, messageId: message.id },
      url: `${this.appUrl}/chat?room=${roomId}`,
    });
  }

  async notifyIncomingCall(
    session: CallSession & { startedBy: { name: string } },
    starterId: string,
  ) {
    const memberIds = await this.getRoomMemberIds(session.roomId);
    const recipients = memberIds.filter((id) => id !== starterId);
    const offline = await this.presence.filterOffline(recipients);
    const playerIds = await this.getPlayerIds(offline);
    if (playerIds.length === 0) return;

    const heading = `📞 ${session.startedBy.name} מתקשר/ת`;
    const body = session.isVideo ? 'שיחת וידאו נכנסת' : 'שיחת אודיו נכנסת';

    await this.send({
      app_id: this.appId,
      include_player_ids: playerIds,
      headings: { en: heading, he: heading },
      contents: { en: body, he: body },
      data: {
        type: 'call',
        callId: session.id,
        roomId: session.roomId,
        livekitRoomName: session.livekitRoomName,
      },
      url: `${this.appUrl}/?call=${session.id}`,
    });
  }

  async notifyCalendarEvent(
    event: CalendarEvent & { owner: { name: string } },
    action: 'created' | 'updated',
  ) {
    if (!event.isFamilyWide) return;
    const allUsers = await this.prisma.user.findMany({ select: { id: true } });
    const recipients = allUsers.map((u) => u.id).filter((id) => id !== event.ownerId);
    const playerIds = await this.getPlayerIds(recipients);
    if (playerIds.length === 0) return;

    const heading = action === 'created' ? '📅 אירוע חדש בלוח השנה' : '📅 אירוע עודכן';
    const body = `${event.owner.name}: ${event.title}`;

    await this.send({
      app_id: this.appId,
      include_player_ids: playerIds,
      headings: { en: heading, he: heading },
      contents: { en: body, he: body },
      data: { type: 'calendar', eventId: event.id },
      url: `${this.appUrl}/calendar`,
    });
  }

  // -----------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------

  private async getRoomMemberIds(roomId: string): Promise<string[]> {
    const rows = await this.prisma.roomMember.findMany({
      where: { roomId },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }

  private async getPlayerIds(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
      select: { oneSignalPlayerId: true },
    });
    return subs.map((s) => s.oneSignalPlayerId);
  }

  private async send(payload: OneSignalPayload) {
    if (!this.enabled) {
      this.logger.log(
        `[PUSH FALLBACK] ${JSON.stringify({
          to: payload.include_player_ids.length,
          heading: payload.headings.he,
          body: payload.contents.he,
        })}`,
      );
      return;
    }
    try {
      const res = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Basic ${this.restApiKey}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`OneSignal returned ${res.status}: ${text}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      this.logger.error(`OneSignal send failed: ${msg}`);
    }
  }
}
