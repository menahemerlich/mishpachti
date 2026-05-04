import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, IsIn, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';

class CreateMessageDto {
  @IsString() @IsIn(['TEXT', 'IMAGE', 'VIDEO', 'VOICE'])
  type!: 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE';

  @IsOptional() @IsString()
  content?: string;

  @IsOptional() @IsString()
  mediaAssetId?: string;

  @IsOptional() @IsString()
  replyToId?: string;
}

class EditMessageDto {
  @IsString() @IsNotEmpty()
  content!: string;
}

class CreateDmDto {
  @IsString() @IsNotEmpty()
  userId!: string;
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('rooms')
  rooms(@CurrentUser() user: AuthenticatedUser) {
    return this.chat.listRoomsForUser(user.id);
  }

  @Post('dm')
  dm(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDmDto) {
    return this.chat.getOrCreateDmRoom(user.id, dto.userId);
  }

  @Get('rooms/:roomId/messages')
  messages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roomId') roomId: string,
    @Query('take') take?: string,
    @Query('before') before?: string,
  ) {
    return this.chat.listMessages(roomId, user.id, {
      take: take ? Number(take) : undefined,
      before,
    });
  }

  @Post('rooms/:roomId/messages')
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roomId') roomId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.chat.createMessage({
      roomId,
      authorId: user.id,
      type: dto.type,
      content: dto.content,
      mediaAssetId: dto.mediaAssetId,
      replyToId: dto.replyToId,
    });
  }

  @Patch('messages/:messageId')
  edit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId') messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.chat.editMessage(messageId, user.id, dto.content);
  }

  @Delete('messages/:messageId')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId') messageId: string,
  ) {
    return this.chat.softDeleteMessage(messageId, user.id, user.role);
  }
}
