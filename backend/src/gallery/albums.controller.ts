import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AlbumsService } from './albums.service';

class CreateAlbumDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  title!: string;

  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;
}

class UpdateAlbumDto {
  @IsOptional() @IsString() @MaxLength(100)
  title?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;

  @IsOptional() @IsString()
  coverAssetId?: string;
}

class AddAssetsDto {
  @IsArray() @ArrayNotEmpty()
  assetIds!: string[];
}

@Controller('albums')
@UseGuards(JwtAuthGuard)
export class AlbumsController {
  constructor(private readonly albums: AlbumsService) {}

  @Get()
  list() {
    return this.albums.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.albums.get(id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAlbumDto) {
    return this.albums.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAlbumDto,
  ) {
    return this.albums.update(id, user.id, user.role, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.albums.remove(id, user.id, user.role);
  }

  @Post(':id/assets')
  addAssets(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddAssetsDto,
  ) {
    return this.albums.addAssets(id, user.id, user.role, dto.assetIds);
  }

  @Delete(':id/assets/:assetId')
  removeAsset(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('assetId') assetId: string,
  ) {
    return this.albums.removeAsset(id, assetId, user.id, user.role);
  }
}
