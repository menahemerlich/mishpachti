import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { nanoid } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async create(input: { email: string; invitedById: string; inviterName: string }) {
    const email = input.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('משתמש עם אימייל זה כבר רשום במערכת');
    }

    // Check for an already pending unused invite
    const pending = await this.prisma.invitation.findFirst({
      where: { email, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (pending) {
      // Just resend
      await this.sendEmail(pending.token, email, input.inviterName);
      return pending;
    }

    const token = nanoid(40);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await this.prisma.invitation.create({
      data: {
        token,
        email,
        invitedById: input.invitedById,
        expiresAt,
      },
    });

    await this.sendEmail(token, email, input.inviterName);
    return invitation;
  }

  async listAll() {
    return this.prisma.invitation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async revoke(id: string) {
    const invite = await this.prisma.invitation.findUnique({ where: { id } });
    if (!invite) throw new NotFoundException('הזמנה לא נמצאה');
    if (invite.usedAt) {
      throw new BadRequestException('לא ניתן לבטל הזמנה שכבר נוצלה');
    }
    return this.prisma.invitation.delete({ where: { id } });
  }

  async validate(token: string) {
    const invite = await this.prisma.invitation.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('קישור הזמנה לא תקף');
    if (invite.usedAt) throw new BadRequestException('קישור זה כבר נוצל');
    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('פג תוקף הקישור. בקש הזמנה חדשה.');
    }
    return { valid: true, email: invite.email };
  }

  async consume(token: string) {
    const invite = await this.prisma.invitation.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('קישור הזמנה לא תקף');
    if (invite.usedAt) throw new BadRequestException('קישור זה כבר נוצל');
    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('פג תוקף הקישור. בקש הזמנה חדשה.');
    }
    return this.prisma.invitation.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });
  }

  private async sendEmail(token: string, email: string, inviterName: string) {
    const base = this.config.get<string>('APP_URL', 'http://localhost:5173');
    const joinUrl = `${base.replace(/\/$/, '')}/join/${token}`;
    await this.email.sendInvitationEmail({ to: email, inviterName, joinUrl });
  }
}
