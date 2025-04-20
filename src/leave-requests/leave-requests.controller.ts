// src/leave-requests/leave-requests.controller.ts
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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { LeaveRequestsService } from './leave-requests.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { ReviewLeaveRequestDto } from './dto/review-leave-request.dto';
import { QueryLeaveRequestsDto } from './dto/query-leave-requests.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { DepartmentsService } from '../departments/departments.service';
import { FilesService } from '../files/files.service';
import { FileCategory } from '../files/interfaces/file-category.enum';

@Controller('leave-requests')
@UseGuards(JwtAuthGuard)
export class LeaveRequestsController {
  constructor(
    private readonly leaveRequestsService: LeaveRequestsService,
    private readonly departmentsService: DepartmentsService,
    private readonly filesService: FilesService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('attachment', {
      storage: diskStorage({
        destination: './uploads/permission',
        filename: (req, file, cb) => {
          const uniqueSuffix = uuidv4();
          const ext = extname(file.originalname);
          cb(null, `permission-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Add file type validation if needed
        // For example, only accepting PDFs, images, etc.
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async create(
    @Request() req,
    @Body() createLeaveRequestDto: CreateLeaveRequestDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Check if file is provided
    if (!file) {
      throw new BadRequestException('Attachment file is required');
    }

    // Save file metadata to Files service
    const fileMetadata = await this.filesService.saveFileMetadata({
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      category: FileCategory.PERMISSION,
      userId: req.user.guid,
    });

    // Create leave request with attachment reference
    return this.leaveRequestsService.create(
      req.user.guid,
      createLeaveRequestDto,
      fileMetadata.guid,
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

    // Get the attachment file info
    try {
      const attachment = await this.filesService.findOne(
        leaveRequest.attachmentId,
      );

      // Add attachment URL to the response
      return {
        ...leaveRequest.toObject(),
        attachment: {
          guid: attachment.guid,
          fileName: attachment.fileName,
          originalName: attachment.originalName,
          mimeType: attachment.mimeType,
          size: attachment.size,
        },
      };
    } catch (error) {
      // If attachment not found, return leave request without attachment
      return leaveRequest;
    }
  }

  @Patch(':guid')
  @UseInterceptors(
    FileInterceptor('attachment', {
      storage: diskStorage({
        destination: './uploads/permission',
        filename: (req, file, cb) => {
          const uniqueSuffix = uuidv4();
          const ext = extname(file.originalname);
          cb(null, `permission-update-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Add file type validation if needed
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async update(
    @Request() req,
    @Param('guid') guid: string,
    @Body() updateLeaveRequestDto: UpdateLeaveRequestDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const leaveRequest = await this.leaveRequestsService.findOne(guid);
    let attachmentId = leaveRequest.attachmentId;

    // If a new file is uploaded, update the attachment
    if (file) {
      // Upload new file
      const fileMetadata = await this.filesService.saveFileMetadata({
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        category: FileCategory.PERMISSION,
        userId: req.user.guid,
      });

      // Update attachment ID
      attachmentId = fileMetadata.guid;

      // Delete old attachment file if it exists
      try {
        await this.filesService.deleteFile(
          leaveRequest.attachmentId,
          req.user.guid,
        );
      } catch (error) {
        // Ignore error if file not found
      }
    }

    return this.leaveRequestsService.update(
      guid,
      req.user.guid,
      updateLeaveRequestDto,
      attachmentId,
    );
  }

  @Delete(':guid')
  async remove(@Request() req, @Param('guid') guid: string) {
    const leaveRequest = await this.leaveRequestsService.findOne(guid);

    // Delete attachment file first
    try {
      await this.filesService.deleteFile(
        leaveRequest.attachmentId,
        req.user.guid,
      );
    } catch (error) {
      // Ignore error if file not found
    }

    // Then delete the leave request
    return this.leaveRequestsService.remove(guid, req.user.guid);
  }

  @Post(':guid/review')
  @UseGuards(RolesGuard)
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

  @Get(':guid/attachment')
  async getAttachment(@Request() req, @Param('guid') guid: string) {
    const leaveRequest = await this.leaveRequestsService.findOne(guid);

    // Check permissions (similar to findOne)
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
            'You do not have permission to view this attachment',
          );
        }
      } else {
        throw new ForbiddenException(
          'You do not have permission to view this attachment',
        );
      }
    }

    return this.filesService.findOne(leaveRequest.attachmentId);
  }
}
