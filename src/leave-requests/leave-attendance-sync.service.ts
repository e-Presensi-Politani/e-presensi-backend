// src/leave-requests/leave-attendance-sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LeaveRequest,
  LeaveRequestStatus,
  LeaveRequestType,
} from './schemas/leave-request.schema';
import { Attendance } from '../attendance/schemas/attendance.schema';
import { WorkingStatus } from '../common/interfaces/working-status.enum';

@Injectable()
export class LeaveAttendanceSyncService {
  private readonly logger = new Logger(LeaveAttendanceSyncService.name);

  constructor(
    @InjectModel(LeaveRequest.name)
    private leaveRequestModel: Model<LeaveRequest>,
    @InjectModel(Attendance.name)
    private attendanceModel: Model<Attendance>,
  ) {}

  /**
   * Maps leave request types to corresponding working statuses
   */
  private mapLeaveTypeToWorkingStatus(
    leaveType: LeaveRequestType,
  ): WorkingStatus {
    switch (leaveType) {
      case LeaveRequestType.LEAVE:
        return WorkingStatus.ON_LEAVE;
      case LeaveRequestType.WFH:
        return WorkingStatus.REMOTE_WORKING; // Assuming WFH is a type of remote working
      case LeaveRequestType.WFA:
        return WorkingStatus.REMOTE_WORKING; // Assuming WFA is also a type of remote working
      case LeaveRequestType.DL:
        return WorkingStatus.OFFICIAL_TRAVEL;
      default:
        return WorkingStatus.PRESENT;
    }
  }

  /**
   * Automatically create attendance records for newly approved leave requests
   * @param leaveRequest The approved leave request
   */
  async createAttendanceRecordsForLeaveRequest(
    leaveRequest: LeaveRequest,
  ): Promise<void> {
    try {
      if (leaveRequest.status !== LeaveRequestStatus.APPROVED) {
        return; // Only process approved leave requests
      }

      const startDate = new Date(leaveRequest.startDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(leaveRequest.endDate);
      endDate.setHours(0, 0, 0, 0);

      const status = this.mapLeaveTypeToWorkingStatus(leaveRequest.type);
      const userId = leaveRequest.userId;
      const departmentId = leaveRequest.departmentId;

      // Create attendance records for each day in the leave period
      for (
        let currentDate = new Date(startDate);
        currentDate <= endDate;
        // Increment by one day
        currentDate.setDate(currentDate.getDate() + 1)
      ) {
        // Check if an attendance record already exists for this day
        const existingAttendance = await this.attendanceModel.findOne({
          userId,
          date: {
            $gte: new Date(currentDate),
            $lt: new Date(
              new Date(currentDate).setDate(currentDate.getDate() + 1),
            ),
          },
        });

        if (existingAttendance) {
          // Update existing attendance record
          existingAttendance.status = status;
          existingAttendance.isManualCheckIn = true;
          existingAttendance.isManualCheckOut = true;
          existingAttendance.checkInTime = new Date(
            currentDate.setHours(8, 0, 0, 0),
          ); // Set default check-in time to 8:00 AM
          existingAttendance.checkOutTime = new Date(
            currentDate.setHours(17, 0, 0, 0),
          ); // Set default check-out time to 5:00 PM
          existingAttendance.workHours = 8; // Standard work day
          existingAttendance.checkInNotes = `Automatically marked from approved ${leaveRequest.type} request`;
          existingAttendance.checkOutNotes = `Automatically marked from approved ${leaveRequest.type} request`;
          await existingAttendance.save();
          this.logger.log(
            `Updated attendance record for ${userId} on ${currentDate.toISOString().split('T')[0]} with status ${status}`,
          );
        } else {
          // Create a new attendance record
          const attendance = new this.attendanceModel({
            userId,
            departmentId,
            date: new Date(currentDate),
            status,
            isManualCheckIn: true,
            isManualCheckOut: true,
            checkInTime: new Date(new Date(currentDate).setHours(8, 0, 0, 0)), // Set default check-in time to 8:00 AM
            checkOutTime: new Date(new Date(currentDate).setHours(17, 0, 0, 0)), // Set default check-out time to 5:00 PM
            workHours: 8, // Standard work day
            checkInNotes: `Automatically marked from approved ${leaveRequest.type} request`,
            checkOutNotes: `Automatically marked from approved ${leaveRequest.type} request`,
            verified: true, // Auto-verify these auto-generated records
            verifiedBy: leaveRequest.reviewedById, // Set verifier to the same person who approved the leave
            verifiedAt: new Date(),
          });

          await attendance.save();
          this.logger.log(
            `Created attendance record for ${userId} on ${currentDate.toISOString().split('T')[0]} with status ${status}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error creating attendance records for leave request: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Run a daily check to ensure all approved leave requests have corresponding attendance records
   * This helps catch any synchronization issues
   */
  @Cron('0 1 * * *') // Run at 1:00 AM every day
  async synchronizeLeaveRequestsWithAttendance(): Promise<void> {
    try {
      this.logger.log(
        'Starting daily leave request synchronization with attendance',
      );

      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find all approved leave requests that include today or future dates
      const activeLeaveRequests = await this.leaveRequestModel.find({
        status: LeaveRequestStatus.APPROVED,
        endDate: { $gte: today },
      });

      this.logger.log(
        `Found ${activeLeaveRequests.length} active approved leave requests to process`,
      );

      // Process each leave request
      for (const leaveRequest of activeLeaveRequests) {
        await this.createAttendanceRecordsForLeaveRequest(leaveRequest);
      }

      this.logger.log('Leave request synchronization completed successfully');
    } catch (error) {
      this.logger.error(
        `Error synchronizing leave requests with attendance: ${error.message}`,
        error.stack,
      );
    }
  }
}
