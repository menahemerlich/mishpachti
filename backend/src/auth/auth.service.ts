import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { InvitationsService } from '../invitations/invitations.service';
import { GoogleAuthService } from './google-auth.service';
import {
  LoginDto,
  SignupBootstrapDto,
  SignupWithInviteDto,
  GoogleSignInDto,
} from './dto/auth.dto';

export interface TokenBundle {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly invitations: InvitationsService,
    private readonly google: GoogleAuthService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // -----------------------------------------------------------------
  // Public flows
  // -----------------------------------------------------------------

  async login(dto: LoginDto): Promise<{ user: User; tokens: TokenBundle }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('פרטי הזיהוי שגויים');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('פרטי הזיהוי שגויים');

    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  async signupBootstrap(dto: SignupBootstrapDto): Promise<{ user: User; tokens: TokenBundle }> {
    const adminEmail = this.config.get<string>('ADMIN_BOOTSTRAP_EMAIL', '').toLowerCase().trim();
    const requestedEmail = dto.email.toLowerCase().trim();

    // Bootstrap is allowed only for the configured admin email AND only if no users exist yet
    const existingUserCount = await this.prisma.user.count();
    if (existingUserCount > 0) {
      throw new BadRequestException(
        'הרשמה ראשונית כבר התבצעה. השתמש בלינק הזמנה כדי להצטרף.',
      );
    }
    if (!adminEmail) {
      throw new BadRequestException('ADMIN_BOOTSTRAP_EMAIL לא הוגדר בשרת');
    }
    if (requestedEmail !== adminEmail) {
      throw new BadRequestException(
        'ההרשמה הראשונית מותרת רק לאימייל המנהל המוגדר. בקש הזמנה.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.createUser({
      email: requestedEmail,
      name: dto.name,
      passwordHash,
      profilePicture: dto.profilePicture ?? null,
      role: Role.ADMIN,
    });

    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  async signupWithInvite(dto: SignupWithInviteDto): Promise<{ user: User; tokens: TokenBundle }> {
    const invitation = await this.invitations.consume(dto.inviteToken);

    let passwordHash: string | null = null;
    let googleId: string | null = null;
    let profilePicture: string | null = dto.profilePicture ?? null;
    let name = dto.name;

    if (dto.googleIdToken) {
      const profile = await this.google.verifyIdToken(dto.googleIdToken);
      if (profile.email !== invitation.email.toLowerCase().trim()) {
        throw new BadRequestException(
          'האימייל ב-Google לא תואם את האימייל שאליו נשלחה ההזמנה',
        );
      }
      googleId = profile.googleId;
      profilePicture = profilePicture ?? profile.picture ?? null;
      name = name || profile.name;
    } else {
      if (!dto.password) {
        throw new BadRequestException('יש לספק סיסמה או להירשם דרך Google');
      }
      passwordHash = await bcrypt.hash(dto.password, 12);
    }

    const user = await this.usersService.createUser({
      email: invitation.email,
      name,
      passwordHash,
      googleId,
      profilePicture,
      role: Role.MEMBER,
    });

    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  async googleSignIn(dto: GoogleSignInDto): Promise<{ user: User; tokens: TokenBundle }> {
    const profile = await this.google.verifyIdToken(dto.idToken);

    let user = await this.usersService.findByGoogleId(profile.googleId);
    if (!user) {
      user = await this.usersService.findByEmail(profile.email);
      if (user) {
        // Existing local user — link Google account
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: profile.googleId,
            // Google-hosted avatars often require no-referrer on the client; always sync from Google when available.
            ...(profile.picture ? { profilePicture: profile.picture } : {}),
          },
        });
      } else {
        throw new UnauthorizedException(
          'משתמש זה לא רשום בפורטל. בקש הזמנה מהמנהל.',
        );
      }
    } else if (profile.picture) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { profilePicture: profile.picture },
      });
    }

    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  async refresh(refreshToken: string): Promise<TokenBundle> {
    const tokenHash = this.hash(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token לא תקף');
    }
    // Rotate
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(stored.user);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = this.hash(refreshToken);
      await this.prisma.refreshToken
        .updateMany({
          where: { tokenHash, userId },
          data: { revokedAt: new Date() },
        })
        .catch(() => undefined);
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true };
  }

  async verifySocketToken(accessToken: string): Promise<{
    id: string;
    email: string;
    role: Role;
  }> {
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
        role: Role;
        type: string;
      }>(accessToken, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      if (payload.type !== 'access') throw new Error('not access');
      return { id: payload.sub, email: payload.email, role: payload.role };
    } catch {
      throw new UnauthorizedException('אסימון סוקט לא תקף');
    }
  }

  // -----------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------

  private async issueTokens(user: User): Promise<TokenBundle> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role, type: 'access' },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m'),
      },
    );

    const refreshToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hash(refreshToken);
    const expiresAt = this.calcRefreshExpiry();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  private calcRefreshExpiry(): Date {
    const ttl = this.config.get<string>('JWT_REFRESH_TTL', '30d');
    const days = parseInt(ttl.replace(/\D/g, ''), 10) || 30;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}
