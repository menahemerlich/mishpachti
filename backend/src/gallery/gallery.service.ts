import { Injectable } from '@nestjs/common';
import { MediaType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GalleryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all media that has been shared in the family chat,
   * chronological (newest first), paginated via cursor.
   */
  async feed(opts: { take?: number; before?: string; types?: MediaType[] }) {
    const take = Math.min(Math.max(opts.take ?? 60, 1), 200);

    const where: Prisma.MediaAssetWhereInput = {
      messages: { some: { deletedAt: null } },
    };
    if (opts.types && opts.types.length > 0) where.type = { in: opts.types };
    if (opts.before) {
      const cursor = await this.prisma.mediaAsset.findUnique({ where: { id: opts.before } });
      if (cursor) where.createdAt = { lt: cursor.createdAt };
    }

    return this.prisma.mediaAsset.findMany({
      where,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, profilePicture: true } },
        messages: {
          take: 1,
          select: { id: true, roomId: true, createdAt: true },
        },
      },
    });
  }
}
