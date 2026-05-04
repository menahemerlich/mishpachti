import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, RoomType, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  }

  async findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async listAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        profilePicture: true,
        role: true,
        createdAt: true,
        lastSeenAt: true,
      },
    });
  }

  async createUser(input: {
    email: string;
    name: string;
    passwordHash?: string | null;
    googleId?: string | null;
    profilePicture?: string | null;
    role?: Role;
  }): Promise<User> {
    const email = input.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('משתמש עם אימייל זה כבר קיים');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name.trim(),
        passwordHash: input.passwordHash ?? null,
        googleId: input.googleId ?? null,
        profilePicture: input.profilePicture ?? null,
        role: input.role ?? Role.MEMBER,
      },
    });

    // Auto-add to (and ensure existence of) the family chat room.
    let familyRoom = await this.prisma.chatRoom.findFirst({
      where: { type: RoomType.FAMILY },
    });
    if (!familyRoom) {
      familyRoom = await this.prisma.chatRoom.create({
        data: { name: 'קבוצה משפחתית', type: RoomType.FAMILY },
      });
    }
    await this.prisma.roomMember.upsert({
      where: { roomId_userId: { roomId: familyRoom.id, userId: user.id } },
      create: { roomId: familyRoom.id, userId: user.id },
      update: {},
    });

    return user;
  }

  async updateProfile(
    userId: string,
    data: { name?: string; profilePicture?: string | null },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async promoteToAdmin(adminId: string, targetUserId: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (admin?.role !== Role.ADMIN) {
      throw new BadRequestException('רק מנהל יכול לקדם משתמשים');
    }
    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: Role.ADMIN },
    });
  }

  async removeMember(adminId: string, targetUserId: string) {
    if (adminId === targetUserId) {
      throw new BadRequestException('לא ניתן להסיר את עצמך');
    }
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('המשתמש לא נמצא');
    await this.prisma.user.delete({ where: { id: targetUserId } });
    return { success: true };
  }

  async touchLastSeen(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
  }

  publicProfile(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profilePicture: user.profilePicture,
      role: user.role,
      createdAt: user.createdAt,
      lastSeenAt: user.lastSeenAt,
    };
  }
}
