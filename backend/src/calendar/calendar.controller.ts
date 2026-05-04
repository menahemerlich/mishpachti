import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CalendarService } from './calendar.service';

class CreateEventDto {
  @IsString() @IsNotEmpty() @MaxLength(120)
  title!: string;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @IsOptional() @IsString() @MaxLength(120)
  location?: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional() @IsBoolean()
  allDay?: boolean;

  @IsOptional() @IsBoolean()
  isFamilyWide?: boolean;
}

class UpdateEventDto {
  @IsOptional() @IsString() @MaxLength(120)
  title?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @IsOptional() @IsString() @MaxLength(120)
  location?: string;

  @IsOptional() @IsDateString()
  startsAt?: string;

  @IsOptional() @IsDateString()
  endsAt?: string;

  @IsOptional() @IsBoolean()
  allDay?: boolean;

  @IsOptional() @IsBoolean()
  isFamilyWide?: boolean;
}

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get()
  list(@Query('from') from?: string, @Query('to') to?: string) {
    return this.calendar.list({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.calendar.get(id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEventDto) {
    return this.calendar.create(user.id, {
      title: dto.title,
      description: dto.description,
      location: dto.location,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      allDay: dto.allDay,
      isFamilyWide: dto.isFamilyWide,
    });
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.calendar.update(id, user.id, user.role, {
      title: dto.title,
      description: dto.description,
      location: dto.location,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      allDay: dto.allDay,
      isFamilyWide: dto.isFamilyWide,
    });
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.calendar.remove(id, user.id, user.role);
  }
}
