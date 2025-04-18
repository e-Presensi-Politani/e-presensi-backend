import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { LeaveRequestsService } from './leave-requests.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { ReviewLeaveRequestDto } from './dto/review-leave-request.dto';
import { QueryLeaveRequestsDto } from './dto/query-leave-requests.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { DepartmentHeadGuard } from '../common/guards/department-head.guard';
import { DepartmentsService } from '../departments/departments.service';

@Controller('leave-requests')
@UseGuards(JwtAuthGuard)
export class LeaveRequestsController {
  constructor(
    private readonly leaveRequestsService: LeaveRequestsService,
    private readonly departmentsService: DepartmentsService,
  ) {}

  @Post()
  async create(
    @Request() req,
    @Body() createLeaveRequestDto: CreateLeaveRequestDto,
  ) {
    return this.leaveRequestsService.create(
      req.user.guid,
      createLeaveRequestDto,
    );
  }

  @Get()
  async findAll(@Request() req, @Query() queryDto: QueryLeaveRequestsDto) {
    // For ADMIN, return all requests based on query
    if (req.user.role === UserRole.ADMIN) {
      return this.leaveRequestsService.findAll(queryDto);
    }

    // For DEPARTMENT_HEAD, return all requests for their department
    if (req.user.role === UserRole.KAJUR) {
      const departments = await this.departmentsService.getDepartmentByHead(
        req.user.guid,
      );
      const departmentIds = departments.map((dept) => dept.guid);

      // If departmentId is specified in query, ensure it's one of the user's departments
      if (
        queryDto.departmentId &&
        !departmentIds.includes(queryDto.departmentId)
      ) {
        throw new ForbiddenException(
          'You can only view leave requests for departments you lead',
        );
      }

      // Restrict to only the departments they lead
      return this.leaveRequestsService.findAll({
        ...queryDto,
        departmentId: queryDto.departmentId || departmentIds[0],
      });
    }

    // For regular users, only return their own requests
    return this.leaveRequestsService.findAll({
      ...queryDto,
      userId: req.user.guid,
    });
  }

  @Get('my-requests')
  async findMyRequests(@Request() req) {
    return this.leaveRequestsService.findByUserId(req.user.guid);
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
      return this.leaveRequestsService.findPendingByDepartment(departmentId);
    }

    // For department heads, verify they lead the requested department
    if (departmentId) {
      const departments = await this.departmentsService.getDepartmentByHead(
        req.user.guid,
      );
      if (!departments.some((dept) => dept.guid === departmentId)) {
        throw new ForbiddenException(
          'You can only view leave requests for departments you lead',
        );
      }
      return this.leaveRequestsService.findPendingByDepartment(departmentId);
    } else {
      // Get the first department they lead
      const departments = await this.departmentsService.getDepartmentByHead(
        req.user.guid,
      );
      if (departments.length === 0) {
        return [];
      }
      return this.leaveRequestsService.findPendingByDepartment(
        departments[0].guid,
      );
    }
  }

  @Get(':guid')
  async findOne(@Request() req, @Param('guid') guid: string) {
    const leaveRequest = await this.leaveRequestsService.findOne(guid);

    // Check permissions
    if (
      req.user.role !== UserRole.ADMIN &&
      leaveRequest.userId !== req.user.guid
    ) {
      // For department heads, check if they lead the department
      if (req.user.role === UserRole.KAJUR) {
        const departments = await this.departmentsService.getDepartmentByHead(
          req.user.guid,
        );
        if (
          !departments.some((dept) => dept.guid === leaveRequest.departmentId)
        ) {
          throw new ForbiddenException(
            'You do not have permission to view this leave request',
          );
        }
      } else {
        throw new ForbiddenException(
          'You do not have permission to view this leave request',
        );
      }
    }

    return leaveRequest;
  }

  @Patch(':guid')
  async update(
    @Request() req,
    @Param('guid') guid: string,
    @Body() updateLeaveRequestDto: UpdateLeaveRequestDto,
  ) {
    return this.leaveRequestsService.update(
      guid,
      req.user.guid,
      updateLeaveRequestDto,
    );
  }

  @Delete(':guid')
  async remove(@Request() req, @Param('guid') guid: string) {
    return this.leaveRequestsService.remove(guid, req.user.guid);
  }

  @Post(':guid/review')
  @Post(':guid/review')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.KAJUR) // Explicitly allowing KAJUR role
  async reviewRequest(
    @Request() req,
    @Param('guid') guid: string,
    @Body() reviewDto: ReviewLeaveRequestDto,
  ) {
    const leaveRequest = await this.leaveRequestsService.findOne(guid);

    // Additional permission check for KAJUR
    if (req.user.role === UserRole.KAJUR) {
      const departments = await this.departmentsService.getDepartmentByHead(
        req.user.guid,
      );

      if (
        !departments.some((dept) => dept.guid === leaveRequest.departmentId)
      ) {
        throw new ForbiddenException(
          'You do not have permission to review this leave request',
        );
      }
    }

    return this.leaveRequestsService.reviewRequest(
      guid,
      req.user.guid,
      reviewDto,
    );
  }
}
