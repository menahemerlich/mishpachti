import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { MediaService } from './media.service';

class SignDto {
  @IsString() @IsIn(['IMAGE', 'VIDEO', 'VOICE'])
  type!: 'IMAGE' | 'VIDEO' | 'VOICE';
}

class RegisterAssetDto {
  @IsString() @IsIn(['IMAGE', 'VIDEO', 'VOICE'])
  type!: 'IMAGE' | 'VIDEO' | 'VOICE';

  @IsString() publicId!: string;
  @IsString() url!: string;

  @IsOptional() @IsNumber() width?: number;
  @IsOptional() @IsNumber() height?: number;
  @IsOptional() @IsNumber() duration?: number;
  @IsOptional() @IsString() format?: string;
  @IsOptional() @IsNumber() bytes?: number;
  @IsOptional() @IsArray() waveform?: number[];
}

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('sign')
  sign(@CurrentUser() user: AuthenticatedUser, @Body() dto: SignDto) {
    return this.media.signUpload({ userId: user.id, type: dto.type });
  }

  @Post('register')
  register(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterAssetDto) {
    return this.media.registerAsset({
      ownerId: user.id,
      publicId: dto.publicId,
      type: dto.type,
      url: dto.url,
      width: dto.width,
      height: dto.height,
      duration: dto.duration,
      format: dto.format,
      bytes: dto.bytes,
      waveform: dto.waveform,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.media.getAsset(id);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.media.deleteAsset(id, user.id, user.role);
  }
}
