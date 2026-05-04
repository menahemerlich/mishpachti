import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';

interface EventInput {
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
  allDay?: boolean;
  isFamilyWide?: boolean;
}

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => RealtimeGateway))
    private readonly realtime: RealtimeGateway,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notifications: NotificationsService,
  ) {}

  async list(opts: { from?: Date; to?: Date }) {
    return this.prisma.calendarEvent.findMany({
      where: {
        startsAt: {
          ...(opts.from ? { gte: opts.from } : {}),
          ...(opts.to ? { lte: opts.to } : {}),
        },
      },
      orderBy: { startsAt: 'asc' },
      include: {
        owner: { select: { id: true, name: true, profilePicture: true } },
      },
    });
  }

  async get(id: string) {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true, profilePicture: true } } },
    });
    if (!event) throw new NotFoundException('האירוע לא נמצא');
    return event;
  }

  async create(ownerId: string, input: EventInput) {
    const event = await this.prisma.calendarEvent.create({
      data: {
        ownerId,
        title: input.title.trim(),
        description: input.description?.trim() ?? null,
        location: input.location?.trim() ?? null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        allDay: input.allDay ?? false,
        isFamilyWide: input.isFamilyWide ?? true,
      },
      include: { owner: { select: { id: true, name: true, profilePicture: true } } },
    });

    this.realtime.broadcast('calendar:created', event);
    this.notifications
      .notifyCalendarEvent(event, 'created')
      .catch(() => undefined);

    return event;
  }

  async update(id: string, userId: string, role: Role, input: Partial<EventInput>) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('האירוע לא נמצא');
    if (event.ownerId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException('אין לך הרשאה לערוך אירוע זה');
    }
    const updated = await this.prisma.calendarEvent.update({
      where: { id },
      data: {
        title: input.title?.trim(),
        description: input.description?.trim() ?? undefined,
        location: input.location?.trim() ?? undefined,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        allDay: input.allDay,
        isFamilyWide: input.isFamilyWide,
      },
      include: { owner: { select: { id: true, name: true, profilePicture: true } } },
    });
    this.realtime.broadcast('calendar:updated', updated);
    return updated;
  }

  async remove(id: string, userId: string, role: Role) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('האירוע לא נמצא');
    if (event.ownerId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException('אין לך הרשאה למחוק אירוע זה');
    }
    await this.prisma.calendarEvent.delete({ where: { id } });
    this.realtime.broadcast('calendar:deleted', { id });
    return { success: true };
  }
}
