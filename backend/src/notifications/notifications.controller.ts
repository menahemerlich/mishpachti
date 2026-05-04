import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

class RegisterPushDto {
  @IsString() oneSignalPlayerId!: string;
  @IsOptional() @IsString() deviceInfo?: string;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('subscribe')
  subscribe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterPushDto,
  ) {
    return this.notifications.registerSubscription({
      userId: user.id,
      oneSignalPlayerId: dto.oneSignalPlayerId,
      deviceInfo: dto.deviceInfo,
    });
  }

  @Delete('subscribe/:playerId')
  unsubscribe(
    @CurrentUser() user: AuthenticatedUser,
    @Param('playerId') playerId: string,
  ) {
    return this.notifications.removeSubscription(user.id, playerId);
  }
}
