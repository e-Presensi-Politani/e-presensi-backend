// src/attendance/attendance.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { VerifyAttendanceDto } from './dto/verify-attendance.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { GeoService } from '../common/services/geo.service';
import { ConfigService } from '../config/config.service';
import { UsersService } from '../users/users.service';
import { DepartmentsService } from '../departments/departments.service';
import { FilesService } from '../files/files.service';
import { WorkingStatus } from '../common/interfaces/working-status.enum';
import * as moment from 'moment';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
    private geoService: GeoService,
    private configService: ConfigService,
    private usersService: UsersService,
    private departmentsService: DepartmentsService,
    private filesService: FilesService,
  ) {}

  /**
   * Record a check-in for a user
   * @param userId User GUID
   * @param checkInDto Check-in data
   * @param photoFileGuid GUID of the uploaded photo file (if any)
   */
  async checkIn(
    userId: string,
    checkInDto: CheckInDto,
    photoFileGuid?: string,
  ): Promise<Attendance> {
    const user = await this.usersService.findOne(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if user already checked in today
    const existingAttendance = await this.attendanceModel.findOne({
      userId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Next day
      },
    });

    if (existingAttendance && existingAttendance.checkInTime) {
      throw new BadRequestException('You have already checked in today');
    }

    // Get user's departments
    const departments =
      await this.departmentsService.getDepartmentsByMember(userId);
    let departmentId: string | null = null;
    if (departments.length > 0) {
      departmentId = departments[0].guid;
    }

    // Verify location
    const location = {
      latitude: checkInDto.latitude,
      longitude: checkInDto.longitude,
      accuracy: checkInDto.accuracy,
      provider: checkInDto.provider as 'gps' | 'network' | 'manual' | undefined,
    };

    const isWithinGeofence = this.geoService.isWithinGeofence(location);

    // Determine status based on check-in time and location
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    // Assuming work starts at 8:00 AM
    const lateToleranceMinutes = this.configService.lateToleranceMinutes;
    const isLate =
      currentHour > 10 ||
      (currentHour === 10 && currentMinutes > lateToleranceMinutes);

    let status = WorkingStatus.PRESENT;
    if (!isWithinGeofence) {
      status = WorkingStatus.REMOTE_WORKING;
    } else if (isLate) {
      status = WorkingStatus.LATE;
    }

    // Create or update attendance record
    if (existingAttendance) {
      existingAttendance.checkInTime = now;
      existingAttendance.checkInLocation = location;
      existingAttendance.checkInPhotoId = photoFileGuid || '';
      existingAttendance.checkInNotes = checkInDto.notes ?? '';
      existingAttendance.status = status;

      // If there's a photo, link it to this attendance record
      if (photoFileGuid) {
        await this.filesService.updateFileRelation(
          photoFileGuid,
          existingAttendance.guid,
        );
      }

      return existingAttendance.save();
    } else {
      const attendance = new this.attendanceModel({
        userId,
        date: today,
        checkInTime: now,
        checkInLocation: location,
        checkInPhotoId: photoFileGuid,
        checkInNotes: checkInDto.notes,
        status,
        departmentId,
      });

      const savedAttendance = await attendance.save();

      // If there's a photo, link it to this attendance record
      if (photoFileGuid) {
        await this.filesService.updateFileRelation(
          photoFileGuid,
          savedAttendance.guid,
        );
      }

      return savedAttendance;
    }
  }

  /**
   * Record a check-out for a user
   * @param userId User GUID
   * @param checkOutDto Check-out data
   * @param photoFileGuid GUID of the uploaded photo file (if any)
   */
  async checkOut(
    userId: string,
    checkOutDto: CheckOutDto,
    photoFileGuid?: string,
  ): Promise<Attendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance record
    const attendance = await this.attendanceModel.findOne({
      userId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Next day
      },
    });

    if (!attendance) {
      throw new BadRequestException('You have not checked in today');
    }

    if (attendance.checkOutTime) {
      throw new BadRequestException('You have already checked out today');
    }

    // Verify location
    const location = {
      latitude: checkOutDto.latitude,
      longitude: checkOutDto.longitude,
      accuracy: checkOutDto.accuracy,
      provider: checkOutDto.provider,
    };

    const now = new Date();
    const checkInTime = attendance.checkInTime;

    // Calculate work hours
    const workHours =
      (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

    // Check if checking out early
    // Assuming work ends at 5:00 PM
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const earlyLeaveToleranceMinutes =
      this.configService.earlyLeaveToleranceMinutes;

    const isEarlyDeparture =
      currentHour < 17 ||
      (currentHour === 17 && currentMinutes < 0 - earlyLeaveToleranceMinutes);

    let status = attendance.status;
    if (isEarlyDeparture && status === WorkingStatus.PRESENT) {
      status = WorkingStatus.EARLY_DEPARTURE;
    }

    // Update attendance record
    attendance.checkOutTime = now;
    attendance.checkOutLocation = location;
    attendance.checkOutPhotoId = photoFileGuid || '';
    attendance.checkOutNotes = checkOutDto.notes ?? '';
    attendance.workHours = parseFloat(workHours.toFixed(2));
    attendance.status = status;

    const updatedAttendance = await attendance.save();

    // If there's a photo, link it to this attendance record
    if (photoFileGuid) {
      await this.filesService.updateFileRelation(
        photoFileGuid,
        updatedAttendance.guid,
      );
    }

    return updatedAttendance;
  }

  /**
   * Verify an attendance record (for administrators and department heads)
   * @param attendanceId Attendance GUID
   * @param verifierUserId User GUID of the verifier
   * @param verifyDto Verification data
   */
  async verifyAttendance(
    attendanceId: string,
    verifierUserId: string,
    verifyDto: VerifyAttendanceDto,
  ): Promise<Attendance> {
    const attendance = await this.attendanceModel.findOne({
      guid: attendanceId,
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    attendance.verified = verifyDto.verified;
    attendance.verifiedBy = verifierUserId;
    attendance.verifiedAt = new Date();

    return attendance.save();
  }

  /**
   * Get attendance records based on query parameters
   * @param queryDto Query parameters
   */
  async findAll(queryDto: AttendanceQueryDto): Promise<Attendance[]> {
    const query: any = {};

    if (queryDto.userId) {
      query.userId = queryDto.userId;
    }

    if (queryDto.departmentId) {
      query.departmentId = queryDto.departmentId;
    }

    if (queryDto.status) {
      query.status = queryDto.status;
    }

    if (queryDto.startDate || queryDto.endDate) {
      query.date = {};

      if (queryDto.startDate) {
        query.date.$gte = new Date(queryDto.startDate);
      }

      if (queryDto.endDate) {
        const endDate = new Date(queryDto.endDate);
        endDate.setHours(23, 59, 59, 999);
        query.date.$lte = endDate;
      }
    }

    return this.attendanceModel.find(query).sort({ date: -1 }).exec();
  }

  /**
   * Get a single attendance record by GUID
   * @param guid Attendance GUID
   */
  async findOne(guid: string): Promise<Attendance> {
    const attendance = await this.attendanceModel.findOne({ guid }).exec();

    if (!attendance) {
      throw new NotFoundException(
        `Attendance record with GUID ${guid} not found`,
      );
    }

    return attendance;
  }

  /**
   * Get today's attendance for a user
   * @param userId User GUID
   */
  async findTodayAttendance(userId: string): Promise<Attendance | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.attendanceModel
      .findOne({
        userId,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Next day
        },
      })
      .exec();
  }

  /**
   * Get attendance summary for a specific period
   * @param startDate Start date
   * @param endDate End date
   * @param userId Optional user GUID for filtering
   * @param departmentId Optional department GUID for filtering
   */
  async getAttendanceSummary(
    startDate: Date,
    endDate: Date,
    userId?: string,
    departmentId?: string,
  ): Promise<any> {
    const query: any = {
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (userId) {
      query.userId = userId;
    }

    if (departmentId) {
      query.departmentId = departmentId;
    }

    const attendanceRecords = await this.attendanceModel.find(query).exec();

    const summary = {
      totalDays: moment(endDate).diff(moment(startDate), 'days') + 1,
      present: 0,
      absent: 0,
      late: 0,
      earlyDeparture: 0,
      remoteWorking: 0,
      onLeave: 0,
      officialTravel: 0,
      totalWorkHours: 0,
      averageWorkHours: 0,
      totalAttendances: 0,
    };

    // Count by status
    attendanceRecords.forEach((record) => {
      switch (record.status) {
        case WorkingStatus.PRESENT:
          summary.present++;
          break;
        case WorkingStatus.ABSENT:
          summary.absent++;
          break;
        case WorkingStatus.LATE:
          summary.late++;
          break;
        case WorkingStatus.EARLY_DEPARTURE:
          summary.earlyDeparture++;
          break;
        case WorkingStatus.REMOTE_WORKING:
          summary.remoteWorking++;
          break;
        case WorkingStatus.ON_LEAVE:
          summary.onLeave++;
          break;
        case WorkingStatus.OFFICIAL_TRAVEL:
          summary.officialTravel++;
          break;
      }

      // Add work hours if available
      if (record.workHours) {
        summary.totalWorkHours += record.workHours;
      }
    });

    // Calculate average work hours for days with records
    const daysWithRecords = attendanceRecords.length;
    if (daysWithRecords > 0) {
      summary.averageWorkHours = summary.totalWorkHours / daysWithRecords;
      summary.averageWorkHours = parseFloat(
        summary.averageWorkHours.toFixed(2),
      );
    }

    // Add total attendances (excluding absences)
    summary.totalAttendances =
      summary.present +
      summary.late +
      summary.earlyDeparture +
      summary.remoteWorking +
      summary.officialTravel;

    return summary;
  }

  /**
   * Create a manual attendance record (for corrections)
   * @param manualAttendanceData The data for the manual attendance
   */
  async createManualAttendance(manualAttendanceData: {
    userId: string;
    date: Date;
    checkInTime?: Date;
    checkOutTime?: Date;
    correctionId: string;
    departmentId?: string;
  }): Promise<Attendance> {
    const {
      userId,
      date,
      checkInTime,
      checkOutTime,
      correctionId,
      departmentId,
    } = manualAttendanceData;

    // Get user's departments if not provided
    let deptId = departmentId;
    if (!deptId) {
      const departments =
        await this.departmentsService.getDepartmentsByMember(userId);
      if (departments.length > 0) {
        deptId = departments[0].guid;
      }
    }

    // Set appropriate status
    let status = WorkingStatus.PRESENT;

    // Calculate work hours if both check-in and check-out are provided
    let workHours;
    if (checkInTime && checkOutTime) {
      workHours =
        (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      workHours = parseFloat(workHours.toFixed(2));
    }

    const attendance = new this.attendanceModel({
      userId,
      date,
      checkInTime,
      checkOutTime,
      isManualCheckIn: !!checkInTime,
      isManualCheckOut: !!checkOutTime,
      workHours,
      status,
      departmentId: deptId,
      correctionId,
    });

    return attendance.save();
  }

  /**
   * Update attendance record with manual check-in or check-out
   * @param attendanceId The ID of the attendance record to update
   * @param updateData The data to update
   * @param correctionId The ID of the correction that triggered this update
   */
  async updateAttendanceForCorrection(
    attendanceId: string,
    updateData: {
      checkInTime?: Date;
      checkOutTime?: Date;
      status?: string;
      workHours?: number;
    },
    correctionId: string,
  ): Promise<Attendance> {
    const attendance = await this.attendanceModel.findOne({
      guid: attendanceId,
    });

    if (!attendance) {
      throw new NotFoundException(
        `Attendance record with ID ${attendanceId} not found`,
      );
    }

    // Update fields if provided
    if (updateData.checkInTime) {
      attendance.checkInTime = updateData.checkInTime;
      attendance.isManualCheckIn = true;
    }

    if (updateData.checkOutTime) {
      attendance.checkOutTime = updateData.checkOutTime;
      attendance.isManualCheckOut = true;
    }

    if (updateData.status) {
      attendance.status = updateData.status;
    }

    if (updateData.workHours !== undefined) {
      attendance.workHours = updateData.workHours;
    } else if (attendance.checkInTime && attendance.checkOutTime) {
      // Recalculate work hours if both check-in and check-out times exist
      attendance.workHours =
        (attendance.checkOutTime.getTime() - attendance.checkInTime.getTime()) /
        (1000 * 60 * 60);
      attendance.workHours = parseFloat(attendance.workHours.toFixed(2));
    }

    // Link to the correction
    attendance.correctionId = correctionId;

    return attendance.save();
  }
}
