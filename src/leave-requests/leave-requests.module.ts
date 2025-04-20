import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LeaveRequest.name, schema: LeaveRequestSchema },
    ]),
    DepartmentsModule,
    UsersModule,
    CommonModule,
    FilesModule, // Add the FilesModule
  ],
  controllers: [LeaveRequestsController],
  providers: [LeaveRequestsService],
  exports: [LeaveRequestsService],
})
export class LeaveRequestsModule {}
