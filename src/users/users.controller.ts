// src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from './schemas/user.schema';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.KAJUR)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':guid')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('guid') guid: string) {
    return this.usersService.findOne(guid);
  }

  @Patch(':guid')
  @UseGuards(JwtAuthGuard)
  update(@Param('guid') guid: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(guid, updateUserDto);
  }

  @Delete(':guid')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('guid') guid: string) {
    return this.usersService.remove(guid);
  }

  // Add this endpoint temporarily to create the first admin user
  @Post('first-admin')
  async createFirstAdmin(@Body() createUserDto: CreateUserDto) {
    // Force role to be admin
    createUserDto.role = UserRole.ADMIN;
    // Create the user
    return this.usersService.create(createUserDto);
  }
}
