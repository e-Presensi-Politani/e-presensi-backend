// src/corrections/corrections.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Put,
  ForbiddenException,
} from '@nestjs/common';
import { CorrectionsService } from './corrections.service';
import { CreateCorrectionDto } from './dto/create-correction.dto';
import { CorrectionQueryDto } from './dto/correction-query.dto';
import { UpdateCorrectionDto } from './dto/update-correction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { DepartmentHeadGuard } from '../common/guards/department-head.guard';

@Controller('corrections')
@UseGuards(JwtAuthGuard)
export class CorrectionsController {
  constructor(private readonly correctionsService: CorrectionsService) {}

  @Post()
  async create(
    @Request() req,
    @Body() createCorrectionDto: CreateCorrectionDto,
  ) {
    return this.correctionsService.create(req.user.guid, createCorrectionDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.KAJUR)
  async findAll(@Query() query: CorrectionQueryDto) {
    return this.correctionsService.findAll(query);
  }

  @Get('my-requests')
  async findMyCorrections(@Request() req, @Query() query: CorrectionQueryDto) {
    return this.correctionsService.findUserCorrections(req.user.guid, query);
  }

  @Get('monthly-usage')
  async getMonthlyUsage(@Request() req) {
    return this.correctionsService.getMonthlyUsage(req.user.guid);
  }

  @Get('department/:departmentId/pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.KAJUR)
  async findPendingByDepartment(
    @Param('departmentId') departmentId: string,
    @Request() req,
  ) {
    // If admin, allow access to any department
    if (req.user.role === UserRole.ADMIN) {
      return this.correctionsService.findPendingByDepartment(departmentId);
    }

    // For department heads, check if they are the head of the requested department
    const departmentsHeaded = await this.correctionsService[
      'departmentsService'
    ].getDepartmentByHead(req.user.guid);
    const isHeadOfDepartment = departmentsHeaded.some(
      (dept) => dept.guid === departmentId,
    );

    if (!isHeadOfDepartment) {
      throw new ForbiddenException(
        'You are not authorized to view corrections for this department',
      );
    }

    return this.correctionsService.findPendingByDepartment(departmentId);
  }

  @Get(':guid')
  async findOne(@Param('guid') guid: string) {
    return this.correctionsService.findOne(guid);
  }

  @Put(':guid/review')
  @UseGuards(RolesGuard, DepartmentHeadGuard)
  @Roles(UserRole.ADMIN, UserRole.KAJUR)
  async reviewCorrection(
    @Param('guid') guid: string,
    @Request() req,
    @Body() updateCorrectionDto: UpdateCorrectionDto,
  ) {
    return this.correctionsService.reviewCorrection(
      guid,
      req.user.guid,
      updateCorrectionDto,
    );
  }
}
