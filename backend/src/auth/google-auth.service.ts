import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly client: OAuth2Client;
  private readonly clientId: string;

  constructor(config: ConfigService) {
    this.clientId = config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_ID');
    this.client = new OAuth2Client(this.clientId);
  }

  async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email) {
        throw new UnauthorizedException('Invalid Google token');
      }
      return {
        googleId: payload.sub,
        email: payload.email.toLowerCase(),
        name: payload.name ?? payload.email.split('@')[0],
        picture: payload.picture,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown';
      this.logger.warn(`Google token verification failed: ${message}`);
      throw new UnauthorizedException('הזיהוי עם Google נכשל');
    }
  }
}
