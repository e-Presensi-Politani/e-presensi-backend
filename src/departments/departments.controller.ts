// departments/departments.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AssignHeadDto } from './dto/assign-head.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.KAJUR, UserRole.DOSEN)
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get('with-inactive')
  @Roles(UserRole.ADMIN)
  findAllWithInactive() {
    return this.departmentsService.findAllWithInactive();
  }

  @Get(':guid')
  @Roles(UserRole.ADMIN, UserRole.KAJUR, UserRole.DOSEN)
  findOne(@Param('guid') guid: string) {
    return this.departmentsService.findOne(guid);
  }

  @Get('code/:code')
  @Roles(UserRole.ADMIN, UserRole.KAJUR, UserRole.DOSEN)
  findByCode(@Param('code') code: string) {
    return this.departmentsService.findByCode(code);
  }

  @Put(':guid')
  @Roles(UserRole.ADMIN)
  update(
    @Param('guid') guid: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(guid, updateDepartmentDto);
  }

  @Delete(':guid')
  @Roles(UserRole.ADMIN)
  remove(@Param('guid') guid: string) {
    return this.departmentsService.remove(guid);
  }

  @Delete(':guid/hard')
  @Roles(UserRole.ADMIN)
  hardRemove(@Param('guid') guid: string) {
    return this.departmentsService.hardRemove(guid);
  }

  @Put(':guid/head')
  @Roles(UserRole.ADMIN)
  assignHead(
    @Param('guid') guid: string,
    @Body() assignHeadDto: AssignHeadDto,
  ) {
    return this.departmentsService.assignHead(guid, assignHeadDto);
  }

  @Put(':guid/members')
  @Roles(UserRole.ADMIN, UserRole.KAJUR)
  addMembers(
    @Param('guid') guid: string,
    @Body() addMembersDto: AddMembersDto,
  ) {
    return this.departmentsService.addMembers(guid, addMembersDto);
  }

  @Delete(':guid/members')
  @Roles(UserRole.ADMIN, UserRole.KAJUR)
  removeMembers(
    @Param('guid') guid: string,
    @Body() addMembersDto: AddMembersDto,
  ) {
    return this.departmentsService.removeMembers(guid, addMembersDto);
  }

  @Get('by-member/:userId')
  @Roles(UserRole.ADMIN, UserRole.KAJUR)
  getDepartmentsByMember(@Param('userId') userId: string) {
    return this.departmentsService.getDepartmentsByMember(userId);
  }

  @Get('by-head/:userId')
  @Roles(UserRole.ADMIN)
  getDepartmentByHead(@Param('userId') userId: string) {
    return this.departmentsService.getDepartmentByHead(userId);
  }
}
