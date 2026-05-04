import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail } from 'class-validator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { InvitationsService } from './invitations.service';
import { UsersService } from '../users/users.service';

class CreateInvitationDto {
  @IsEmail()
  email!: string;
}

@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly invitations: InvitationsService,
    private readonly users: UsersService,
  ) {}

  // ----- Public (no auth): consumed by /join/[token] page -----
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Get(':token/validate')
  validate(@Param('token') token: string) {
    return this.invitations.validate(token);
  }

  // ----- Admin only -----
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async create(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateInvitationDto,
  ) {
    const inviter = await this.users.findById(admin.id);
    return this.invitations.create({
      email: dto.email,
      invitedById: admin.id,
      inviterName: inviter?.name ?? 'מנהל',
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  list() {
    return this.invitations.listAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  revoke(@Param('id') id: string) {
    return this.invitations.revoke(id);
  }
}
