import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  GoogleSignInDto,
  LoginDto,
  RefreshDto,
  SignupBootstrapDto,
  SignupWithInviteDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const { user, tokens } = await this.auth.login(dto);
    return { ...tokens, user: this.users.publicProfile(user) };
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('signup-bootstrap')
  async signupBootstrap(@Body() dto: SignupBootstrapDto) {
    const { user, tokens } = await this.auth.signupBootstrap(dto);
    return { ...tokens, user: this.users.publicProfile(user) };
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('signup-with-invite')
  async signupWithInvite(@Body() dto: SignupWithInviteDto) {
    const { user, tokens } = await this.auth.signupWithInvite(dto);
    return { ...tokens, user: this.users.publicProfile(user) };
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('google')
  async google(@Body() dto: GoogleSignInDto) {
    const { user, tokens } = await this.auth.googleSignIn(dto);
    return { ...tokens, user: this.users.publicProfile(user) };
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: { refreshToken?: string },
  ) {
    return this.auth.logout(user.id, dto?.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  status(@CurrentUser() user: AuthenticatedUser) {
    return { authenticated: true, user };
  }
}
