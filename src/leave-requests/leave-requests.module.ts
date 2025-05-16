// src/leave-requests/leave-requests.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsService } from './leave-requests.service';
import {
  LeaveRequest,
  LeaveRequestSchema,
} from './schemas/leave-request.schema';
import { DepartmentsModule } from '../departments/departments.module';
import { UsersModule } from '../users/users.module';
import { CommonModule } from '../common/common.module';
import { FilesModule } from '../files/files.module';
import { LeaveAttendanceSyncService } from './leave-attendance-sync.service'; 
import { Attendance, AttendanceSchema } from 'src/attendance/schemas/attendance.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LeaveRequest.name, schema: LeaveRequestSchema },
      { name: Attendance.name, schema: AttendanceSchema },
    ]),
    MulterModule.register({
      dest: './uploads/permission',
    }),
    DepartmentsModule,
    UsersModule,
    CommonModule,
    FilesModule,
  ],
  controllers: [LeaveRequestsController],
  providers: [LeaveRequestsService, LeaveAttendanceSyncService],
  exports: [LeaveRequestsService, LeaveAttendanceSyncService],
})
export class LeaveRequestsModule {}
