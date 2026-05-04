import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { MediaType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface SignedUploadResponse {
  apiKey: string;
  cloudName: string;
  timestamp: number;
  signature: string;
  folder: string;
  resourceType: 'image' | 'video' | 'auto';
  uploadUrl: string;
  publicIdPrefix: string;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly folder: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.cloudName = this.config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME');
    this.apiKey = this.config.getOrThrow<string>('CLOUDINARY_API_KEY');
    this.apiSecret = this.config.getOrThrow<string>('CLOUDINARY_API_SECRET');
    this.folder = this.config.get<string>('CLOUDINARY_UPLOAD_FOLDER', 'mishpachti');

    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
      secure: true,
    });
  }

  /**
   * Generate a signed upload payload that the client posts directly to Cloudinary.
   */
  signUpload(input: {
    userId: string;
    type: 'IMAGE' | 'VIDEO' | 'VOICE';
  }): SignedUploadResponse {
    const timestamp = Math.floor(Date.now() / 1000);
    const subFolder = `${this.folder}/${input.type.toLowerCase()}/${input.userId}`;
    const resourceType: 'image' | 'video' = input.type === 'IMAGE' ? 'image' : 'video';

    const params: Record<string, string | number> = {
      folder: subFolder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(params, this.apiSecret);

    return {
      apiKey: this.apiKey,
      cloudName: this.cloudName,
      timestamp,
      signature,
      folder: subFolder,
      resourceType,
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`,
      publicIdPrefix: subFolder,
    };
  }

  /**
   * Persist a MediaAsset record after successful client-side upload.
   */
  async registerAsset(input: {
    ownerId: string;
    publicId: string;
    type: 'IMAGE' | 'VIDEO' | 'VOICE';
    url: string;
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
    bytes?: number;
    waveform?: number[] | null;
  }) {
    if (!input.publicId || !input.url) {
      throw new BadRequestException('Missing publicId or url');
    }

    const thumbnailUrl = this.deriveThumbnailUrl(input.publicId, input.type);

    return this.prisma.mediaAsset.create({
      data: {
        ownerId: input.ownerId,
        cloudinaryPublicId: input.publicId,
        type: input.type as MediaType,
        url: input.url,
        thumbnailUrl,
        width: input.width,
        height: input.height,
        duration: input.duration,
        format: input.format,
        bytes: input.bytes,
        waveform: (input.waveform ?? null) as Prisma.InputJsonValue,
      },
    });
  }

  async getAsset(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('המדיה לא נמצאה');
    return asset;
  }

  async deleteAsset(id: string, userId: string, role: 'ADMIN' | 'MEMBER') {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('המדיה לא נמצאה');
    if (asset.ownerId !== userId && role !== 'ADMIN') {
      throw new BadRequestException('אין לך הרשאה למחוק מדיה זו');
    }
    // Delete from Cloudinary (best-effort)
    try {
      await cloudinary.uploader.destroy(asset.cloudinaryPublicId, {
        resource_type: asset.type === 'IMAGE' ? 'image' : 'video',
      });
    } catch (e) {
      this.logger.warn(`Failed to delete from Cloudinary: ${asset.cloudinaryPublicId}`);
    }
    await this.prisma.mediaAsset.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Build a thumbnail URL using Cloudinary delivery transformations.
   */
  private deriveThumbnailUrl(publicId: string, type: 'IMAGE' | 'VIDEO' | 'VOICE'): string {
    if (type === 'VOICE') return '';
    const resource = type === 'VIDEO' ? 'video' : 'image';
    const transformation =
      type === 'VIDEO'
        ? 'w_400,h_400,c_fill,q_auto,f_auto,so_0'
        : 'w_400,h_400,c_fill,q_auto,f_auto';
    const ext = type === 'VIDEO' ? '.jpg' : '';
    return `https://res.cloudinary.com/${this.cloudName}/${resource}/upload/${transformation}/${publicId}${ext}`;
  }
}
