// src/attendance/attendance.controller.ts
import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Request,
    Query,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    Put,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { diskStorage } from 'multer';
  import { extname } from 'path';
  import { AttendanceService } from './attendance.service';
  import { CheckInDto } from './dto/check-in.dto';
  import { CheckOutDto } from './dto/check-out.dto';
  import { VerifyAttendanceDto } from './dto/verify-attendance.dto';
  import { AttendanceQueryDto } from './dto/attendance-query.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '../auth/decorators/roles.decorator';
  import { UserRole } from '../users/schemas/user.schema';
  import { DepartmentHeadGuard } from '../common/guards/department-head.guard';
  import { ConfigService } from '../config/config.service';
  
  @Controller('attendance')
  @UseGuards(JwtAuthGuard)
  export class AttendanceController {
    constructor(
      private readonly attendanceService: AttendanceService,
      private readonly configService: ConfigService,
    ) {}
  
    @Post('check-in')
    @UseInterceptors(
      FileInterceptor('photo', {
        storage: diskStorage({
          destination: './uploads/attendance',
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            cb(null, `checkin-${uniqueSuffix}${ext}`);
          },
        }),
        fileFilter: (req, file, cb) => {
          if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
            return cb(new BadRequestException('Only JPG, JPEG, and PNG files are allowed'), false);
          }
          cb(null, true);
        },
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB
        },
      }),
    )
    async checkIn(
      @Request() req,
      @Body() checkInDto: CheckInDto,
      @UploadedFile() photo,
    ) {
      const photoPath = photo ? photo.path : undefined;
      return this.attendanceService.checkIn(req.user.guid, checkInDto, photoPath);
    }
  
    @Post('check-out')
    @UseInterceptors(
      FileInterceptor('photo', {
        storage: diskStorage({
          destination: './uploads/attendance',
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            cb(null, `checkout-${uniqueSuffix}${ext}`);
          },
        }),
        fileFilter: (req, file, cb) => {
          if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
            return cb(new BadRequestException('Only JPG, JPEG, and PNG files are allowed'), false);
          }
          cb(null, true);
        },
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB
        },
      }),
    )
    async checkOut(
      @Request() req,
      @Body() checkOutDto: CheckOutDto,
      @UploadedFile() photo,
    ) {
      const photoPath = photo ? photo.path : undefined;
      return this.attendanceService.checkOut(req.user.guid, checkOutDto, photoPath);
    }
  
    @Get('today')
    async getTodayAttendance(@Request() req) {
      return this.attendanceService.findTodayAttendance(req.user.guid);
    }
  
    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.KAJUR)
    async findAll(@Query() query: AttendanceQueryDto) {
      return this.attendanceService.findAll(query);
    }
  
    @Get('my-records')
    async getMyAttendance(@Request() req, @Query() query: AttendanceQueryDto) {
      query.userId = req.user.guid;
      return this.attendanceService.findAll(query);
    }
  
    @Get('summary')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.KAJUR)
    async getAttendanceSummary(
      @Query('startDate') startDate: string,
      @Query('endDate') endDate: string,
      @Query('userId') userId?: string,
      @Query('departmentId') departmentId?: string,
    ) {
      if (!startDate || !endDate) {
        throw new BadRequestException('Start date and end date are required');
      }
      
      return this.attendanceService.getAttendanceSummary(
        new Date(startDate),
        new Date(endDate),
        userId,
        departmentId,
      );
    }
  
    @Get('my-summary')
    async getMyAttendanceSummary(
      @Request() req,
      @Query('startDate') startDate: string,
      @Query('endDate') endDate: string,
    ) {
      if (!startDate || !endDate) {
        throw new BadRequestException('Start date and end date are required');
      }
      
      return this.attendanceService.getAttendanceSummary(
        new Date(startDate),
        new Date(endDate),
        req.user.guid,
      );
    }
  
    @Get(':guid')
    async findOne(@Param('guid') guid: string) {
      return this.attendanceService.findOne(guid);
    }
  
    @Put(':guid/verify')
    @UseGuards(RolesGuard, DepartmentHeadGuard)
    @Roles(UserRole.ADMIN, UserRole.KAJUR)
    async verifyAttendance(
      @Param('guid') guid: string,
      @Request() req,
      @Body() verifyDto: VerifyAttendanceDto,
    ) {
      return this.attendanceService.verifyAttendance(guid, req.user.guid, verifyDto);
    }
  }