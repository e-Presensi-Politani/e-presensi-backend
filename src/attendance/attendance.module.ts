// src/attendance/attendance.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { Attendance, AttendanceSchema } from './schemas/attendance.schema';
import { CommonModule } from '../common/common.module';
import { ConfigModule } from '../config/config.module';
import { UsersModule } from '../users/users.module';
import { DepartmentsModule } from '../departments/departments.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attendance.name, schema: AttendanceSchema },
    ]),
    MulterModule.register({
      dest: './uploads/attendance',
    }),
    CommonModule,
    ConfigModule,
    UsersModule,
    DepartmentsModule,
    FilesModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
