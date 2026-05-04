import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MediaType } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GalleryService } from './gallery.service';

@Controller('gallery')
@UseGuards(JwtAuthGuard)
export class GalleryController {
  constructor(private readonly gallery: GalleryService) {}

  @Get()
  feed(
    @Query('take') take?: string,
    @Query('before') before?: string,
    @Query('types') typesCsv?: string,
  ) {
    const types = typesCsv
      ? (typesCsv.split(',').filter(Boolean) as MediaType[])
      : undefined;
    return this.gallery.feed({
      take: take ? Number(take) : undefined,
      before,
      types,
    });
  }
}
