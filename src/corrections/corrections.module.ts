// src/corrections/corrections.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CorrectionsController } from './corrections.controller';
import { CorrectionsService } from './corrections.service';
import { Correction, CorrectionSchema } from './schemas/correction.schema';
import { UsersModule } from '../users/users.module';
import { DepartmentsModule } from '../departments/departments.module';
import { AttendanceModule } from '../attendance/attendance.module';
import {
  Attendance,
  AttendanceSchema,
} from '../attendance/schemas/attendance.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Correction.name, schema: CorrectionSchema },
      { name: Attendance.name, schema: AttendanceSchema },
    ]),
    UsersModule,
    DepartmentsModule,
    AttendanceModule,
  ],
  controllers: [CorrectionsController],
  providers: [CorrectionsService],
  exports: [CorrectionsService],
})
export class CorrectionsModule {}