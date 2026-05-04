import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlbumsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.album.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, profilePicture: true } },
        coverAsset: true,
        _count: { select: { assets: true } },
      },
    });
  }

  async get(id: string) {
    const album = await this.prisma.album.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, profilePicture: true } },
        coverAsset: true,
        assets: {
          orderBy: { addedAt: 'desc' },
          include: { asset: true },
        },
      },
    });
    if (!album) throw new NotFoundException('האלבום לא נמצא');
    return album;
  }

  async create(ownerId: string, input: { title: string; description?: string }) {
    return this.prisma.album.create({
      data: {
        ownerId,
        title: input.title.trim(),
        description: input.description?.trim() ?? null,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    role: Role,
    input: { title?: string; description?: string; coverAssetId?: string | null },
  ) {
    const album = await this.prisma.album.findUnique({ where: { id } });
    if (!album) throw new NotFoundException('האלבום לא נמצא');
    if (album.ownerId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException('אין לך הרשאה לערוך אלבום זה');
    }
    return this.prisma.album.update({
      where: { id },
      data: {
        title: input.title?.trim(),
        description: input.description?.trim() ?? undefined,
        coverAssetId: input.coverAssetId ?? undefined,
      },
    });
  }

  async remove(id: string, userId: string, role: Role) {
    const album = await this.prisma.album.findUnique({ where: { id } });
    if (!album) throw new NotFoundException('האלבום לא נמצא');
    if (album.ownerId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException('אין לך הרשאה למחוק אלבום זה');
    }
    await this.prisma.album.delete({ where: { id } });
    return { success: true };
  }

  async addAssets(albumId: string, userId: string, role: Role, assetIds: string[]) {
    const album = await this.prisma.album.findUnique({ where: { id: albumId } });
    if (!album) throw new NotFoundException('האלבום לא נמצא');
    if (album.ownerId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException('אין לך הרשאה לערוך אלבום זה');
    }
    const ops = assetIds.map((assetId) =>
      this.prisma.albumAsset.upsert({
        where: { albumId_assetId: { albumId, assetId } },
        create: { albumId, assetId },
        update: {},
      }),
    );
    await this.prisma.$transaction(ops);
    return { added: assetIds.length };
  }

  async removeAsset(albumId: string, assetId: string, userId: string, role: Role) {
    const album = await this.prisma.album.findUnique({ where: { id: albumId } });
    if (!album) throw new NotFoundException('האלבום לא נמצא');
    if (album.ownerId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException('אין לך הרשאה לערוך אלבום זה');
    }
    await this.prisma.albumAsset
      .delete({ where: { albumId_assetId: { albumId, assetId } } })
      .catch(() => undefined);
    return { success: true };
  }
}
