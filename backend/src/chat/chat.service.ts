import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { MessageType, Prisma, Role, RoomType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const messageInclude = {
  author: {
    select: { id: true, name: true, profilePicture: true },
  },
  mediaAsset: true,
  reactions: true,
  reads: true,
  replyTo: {
    select: {
      id: true,
      content: true,
      type: true,
      author: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.MessageInclude;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notifications: NotificationsService,
  ) {}

  // -----------------------------------------------------------------
  // Rooms
  // -----------------------------------------------------------------

  async listRoomsForUser(userId: string) {
    const memberships = await this.prisma.roomMember.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, profilePicture: true } },
              },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: { author: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    return memberships.map((m) => ({
      ...m.room,
      lastReadAt: m.lastReadAt,
    }));
  }

  async listUserRoomIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.roomMember.findMany({
      where: { userId },
      select: { roomId: true },
    });
    return rows.map((r) => r.roomId);
  }

  async ensureMember(roomId: string, userId: string) {
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('אינך חבר/ה בחדר זה');
    }
    return member;
  }

  async getOrCreateFamilyRoom() {
    let room = await this.prisma.chatRoom.findFirst({ where: { type: RoomType.FAMILY } });
    if (!room) {
      room = await this.prisma.chatRoom.create({
        data: { name: 'קבוצה משפחתית', type: RoomType.FAMILY },
      });
    }
    return room;
  }

  async getOrCreateDmRoom(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new BadRequestException('לא ניתן לפתוח צ׳אט עם עצמך');
    }

    const other = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, name: true },
    });
    if (!other) throw new NotFoundException('המשתמש לא נמצא');

    const existing = await this.prisma.chatRoom.findFirst({
      where: {
        type: RoomType.DM,
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: otherUserId } } },
          { members: { every: { userId: { in: [userId, otherUserId] } } } },
        ],
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, profilePicture: true } } } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, name: true } } },
        },
      },
    });
    if (existing) return existing;

    const room = await this.prisma.chatRoom.create({
      data: {
        name: other.name,
        type: RoomType.DM,
        members: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, profilePicture: true } } } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, name: true } } },
        },
      },
    });

    return room;
  }

  // -----------------------------------------------------------------
  // Messages
  // -----------------------------------------------------------------

  async listMessages(roomId: string, userId: string, opts: { take?: number; before?: string }) {
    await this.ensureMember(roomId, userId);
    const take = Math.min(Math.max(opts.take ?? 50, 1), 100);
    const where: Prisma.MessageWhereInput = {
      roomId,
      deletedAt: null,
    };
    if (opts.before) {
      const cursor = await this.prisma.message.findUnique({ where: { id: opts.before } });
      if (cursor) where.createdAt = { lt: cursor.createdAt };
    }
    const messages = await this.prisma.message.findMany({
      where,
      take,
      orderBy: { createdAt: 'desc' },
      include: messageInclude,
    });
    return messages.reverse();
  }

  async createMessage(input: {
    roomId: string;
    authorId: string;
    type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE';
    content?: string;
    mediaAssetId?: string;
    replyToId?: string;
  }) {
    await this.ensureMember(input.roomId, input.authorId);

    if (input.type === 'TEXT' && !input.content?.trim()) {
      throw new BadRequestException('הודעה ריקה');
    }
    if (input.type !== 'TEXT' && !input.mediaAssetId) {
      throw new BadRequestException('יש לצרף קובץ מדיה');
    }

    const message = await this.prisma.message.create({
      data: {
        roomId: input.roomId,
        authorId: input.authorId,
        type: input.type as MessageType,
        content: input.content?.trim() ?? null,
        mediaAssetId: input.mediaAssetId ?? null,
        replyToId: input.replyToId ?? null,
      },
      include: messageInclude,
    });

    // Update sender's lastReadAt
    await this.prisma.roomMember.update({
      where: { roomId_userId: { roomId: input.roomId, userId: input.authorId } },
      data: { lastReadAt: new Date() },
    });

    // Async push notify offline members (do not await)
    this.notifications
      .notifyNewMessage(message.roomId, message.authorId, message)
      .catch(() => undefined);

    return message;
  }

  async editMessage(messageId: string, userId: string, content: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.deletedAt) throw new NotFoundException('ההודעה לא נמצאה');
    if (message.authorId !== userId) {
      throw new ForbiddenException('ניתן לערוך רק הודעות שלך');
    }
    if (message.type !== MessageType.TEXT) {
      throw new BadRequestException('ניתן לערוך רק הודעות טקסט');
    }
    if (!content.trim()) throw new BadRequestException('הודעה ריקה');

    return this.prisma.message.update({
      where: { id: messageId },
      data: { content: content.trim(), editedAt: new Date() },
      include: messageInclude,
    });
  }

  async softDeleteMessage(messageId: string, userId: string, role: Role) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('ההודעה לא נמצאה');
    if (message.authorId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException('אין לך הרשאה למחוק הודעה זו');
    }
    return this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: null },
    });
  }

  // -----------------------------------------------------------------
  // Reactions
  // -----------------------------------------------------------------

  async addReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.deletedAt) throw new NotFoundException('ההודעה לא נמצאה');
    await this.ensureMember(message.roomId, userId);

    const reaction = await this.prisma.reaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      create: { messageId, userId, emoji },
      update: {},
    });
    return { reaction, roomId: message.roomId };
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('ההודעה לא נמצאה');
    await this.prisma.reaction
      .delete({ where: { messageId_userId_emoji: { messageId, userId, emoji } } })
      .catch(() => undefined);
    return { roomId: message.roomId };
  }

  // -----------------------------------------------------------------
  // Read receipts
  // -----------------------------------------------------------------

  async markRead(roomId: string, messageId: string, userId: string) {
    await this.ensureMember(roomId, userId);
    await this.prisma.messageRead.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId },
      update: { readAt: new Date() },
    });
    await this.prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId } },
      data: { lastReadAt: new Date() },
    });
  }
}
