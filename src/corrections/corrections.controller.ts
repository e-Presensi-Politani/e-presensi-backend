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
import { DepartmentsService } from '../departments/departments.service';

@Controller('corrections')
@UseGuards(JwtAuthGuard)
export class CorrectionsController {
  constructor(
    private readonly correctionsService: CorrectionsService,
    private readonly departmentsService: DepartmentsService,
  ) {}

  @Post()
  async create(
    @Request() req,
    @Body() createCorrectionDto: CreateCorrectionDto,
  ) {
    return this.correctionsService.create(req.user.guid, createCorrectionDto);
  }

  @Get()
  async findAll(@Request() req, @Query() query: CorrectionQueryDto) {
    // For ADMIN, return all corrections based on query
    if (req.user.role === UserRole.ADMIN) {
      return this.correctionsService.findAll(query);
    }

    // For KAJUR, return corrections for their department
    if (req.user.role === UserRole.KAJUR) {
      const departments = await this.departmentsService.getDepartmentByHead(
        req.user.guid,
      );
      const departmentIds = departments.map((dept) => dept.guid);

      // If departmentId is specified in query, ensure it's one of the user's departments
      if (query.departmentId && !departmentIds.includes(query.departmentId)) {
        throw new ForbiddenException(
          'You can only view corrections for departments you lead',
        );
      }

      // Restrict to only the departments they lead
      return this.correctionsService.findAll({
        ...query,
        departmentId: query.departmentId || departmentIds[0],
      });
    }

    // For regular users, only return their own corrections
    return this.correctionsService.findUserCorrections(req.user.guid, query);
  }

  @Get('my-requests')
  async findMyCorrections(@Request() req, @Query() query: CorrectionQueryDto) {
    return this.correctionsService.findUserCorrections(req.user.guid, query);
  }

  @Get('monthly-usage')
  async getMonthlyUsage(@Request() req) {
    return this.correctionsService.getMonthlyUsage(req.user.guid);
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.KAJUR)
  async findPending(
    @Request() req,
    @Query('departmentId') departmentId: string,
  ) {
    if (req.user.role === UserRole.ADMIN) {
      if (!departmentId) {
        throw new ForbiddenException('Department ID is required for admin');
      }
      return this.correctionsService.findPendingByDepartment(departmentId);
    }

    // For department heads, verify they lead the requested department
    if (departmentId) {
      const departments = await this.departmentsService.getDepartmentByHead(
        req.user.guid,
      );
      if (!departments.some((dept) => dept.guid === departmentId)) {
        throw new ForbiddenException(
          'You can only view corrections for departments you lead',
        );
      }
      return this.correctionsService.findPendingByDepartment(departmentId);
    } else {
      // Get the first department they lead
      const departments = await this.departmentsService.getDepartmentByHead(
        req.user.guid,
      );
      if (departments.length === 0) {
        return [];
      }
      return this.correctionsService.findPendingByDepartment(
        departments[0].guid,
      );
    }
  }

  // Keep the legacy endpoint for backward compatibility
  @Get('department/:departmentId/pending')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.KAJUR)
  async findPendingByDepartment(
    @Param('departmentId') departmentId: string,
    @Request() req,
  ) {
    // For admin, allow access to any department
    if (req.user.role === UserRole.ADMIN) {
      return this.correctionsService.findPendingByDepartment(departmentId);
    }

    // For department heads, check if they are the head of the requested department
    const departments = await this.departmentsService.getDepartmentByHead(
      req.user.guid,
    );

    const isHeadOfDepartment = departments.some(
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
  async findOne(@Request() req, @Param('guid') guid: string) {
    const correction = await this.correctionsService.findOne(guid);

    // Check permissions
    if (
      req.user.role !== UserRole.ADMIN &&
      correction.userId !== req.user.guid
    ) {
      // For department heads, check if they lead the department
      if (req.user.role === UserRole.KAJUR) {
        const departments = await this.departmentsService.getDepartmentByHead(
          req.user.guid,
        );
        if (
          !departments.some((dept) => dept.guid === correction.departmentId)
        ) {
          throw new ForbiddenException(
            'You do not have permission to view this correction',
          );
        }
      } else {
        throw new ForbiddenException(
          'You do not have permission to view this correction',
        );
      }
    }

    return correction;
  }

  @Put(':guid/review')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.KAJUR)
  async reviewCorrection(
    @Param('guid') guid: string,
    @Request() req,
    @Body() updateCorrectionDto: UpdateCorrectionDto,
  ) {
    const correction = await this.correctionsService.findOne(guid);

    // Additional permission check for KAJUR
    if (req.user.role === UserRole.KAJUR) {
      const departments = await this.departmentsService.getDepartmentByHead(
        req.user.guid,
      );

      if (!departments.some((dept) => dept.guid === correction.departmentId)) {
        throw new ForbiddenException(
          'You do not have permission to review this correction request',
        );
      }
    }

    return this.correctionsService.reviewCorrection(
      guid,
      req.user.guid,
      updateCorrectionDto,
    );
  }
}
