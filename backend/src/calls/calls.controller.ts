import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CallsService } from './calls.service';

class StartCallDto {
  @IsString() roomId!: string;
  @IsOptional() @IsBoolean() isVideo?: boolean;
}

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private readonly calls: CallsService) {}

  @Post('start')
  start(@CurrentUser() user: AuthenticatedUser, @Body() dto: StartCallDto) {
    return this.calls.startCall({
      roomId: dto.roomId,
      starterId: user.id,
      isVideo: dto.isVideo ?? true,
    });
  }

  @Post(':callId/join')
  join(
    @CurrentUser() user: AuthenticatedUser,
    @Param('callId') callId: string,
  ) {
    return this.calls.getJoinToken(callId, user.id);
  }

  @Post(':callId/end')
  end(
    @CurrentUser() user: AuthenticatedUser,
    @Param('callId') callId: string,
  ) {
    return this.calls.endCall(callId, user.id);
  }
}
