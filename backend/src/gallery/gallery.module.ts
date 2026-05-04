import { Module } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { GalleryController } from './gallery.controller';
import { AlbumsService } from './albums.service';
import { AlbumsController } from './albums.controller';

@Module({
  controllers: [GalleryController, AlbumsController],
  providers: [GalleryService, AlbumsService],
  exports: [GalleryService, AlbumsService],
})
export class GalleryModule {}
