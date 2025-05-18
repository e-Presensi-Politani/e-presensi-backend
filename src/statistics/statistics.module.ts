// src/statistics/statistics.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { ReportsService } from './reports.service';
import {
  Attendance,
  AttendanceSchema,
} from '../attendance/schemas/attendance.schema';
import { UsersModule } from '../users/users.module';
import { DepartmentsModule } from '../departments/departments.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attendance.name, schema: AttendanceSchema },
    ]),
    UsersModule,
    DepartmentsModule,
    ConfigModule,
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService, ReportsService],
  exports: [StatisticsService, ReportsService],
})
export class StatisticsModule {}
