// src/corrections/corrections.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Correction,
  CorrectionDocument,
  CorrectionStatus,
  CorrectionType,
} from './schemas/correction.schema';
import { CreateCorrectionDto } from './dto/create-correction.dto';
import { CorrectionQueryDto } from './dto/correction-query.dto';
import { UpdateCorrectionDto } from './dto/update-correction.dto';
import { UsersService } from '../users/users.service';
import { DepartmentsService } from '../departments/departments.service';
import { AttendanceService } from '../attendance/attendance.service';
import * as moment from 'moment';

@Injectable()
export class CorrectionsService {
  constructor(
    @InjectModel(Correction.name)
    private correctionModel: Model<CorrectionDocument>,
    private usersService: UsersService,
    private departmentsService: DepartmentsService,
    private attendanceService: AttendanceService,
  ) {}

  /**
   * Create a new correction request
   * @param userId User GUID
   * @param createCorrectionDto Correction request data
   */
  async create(
    userId: string,
    createCorrectionDto: CreateCorrectionDto,
  ): Promise<Correction> {
    const user = await this.usersService.findOne(userId);

    // Get user's department
    const departments =
      await this.departmentsService.getDepartmentsByMember(userId);
    if (departments.length === 0) {
      throw new BadRequestException(
        'User is not associated with any department',
      );
    }
    const departmentId = departments[0].guid;

    // Check monthly correction limit (max 2 per month)
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    const monthlyCorrections = await this.correctionModel.countDocuments({
      userId,
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    });

    if (monthlyCorrections >= 2) {
      throw new ForbiddenException(
        'You have reached the maximum limit of 2 corrections per month',
      );
    }

    // Validate correction date is not in the future
    const correctionDate = new Date(createCorrectionDto.date);
    if (correctionDate > new Date()) {
      throw new BadRequestException('Correction date cannot be in the future');
    }

    // Validate correction date is not too old (e.g., not more than 30 days)
    const thirtyDaysAgo = moment().subtract(30, 'days').toDate();
    if (correctionDate < thirtyDaysAgo) {
      throw new BadRequestException(
        'Correction date cannot be more than 30 days old',
      );
    }

    // For missed check-in/check-out, validate proposed time
    if (
      (createCorrectionDto.type === CorrectionType.MISSED_CHECK_IN ||
        createCorrectionDto.type === CorrectionType.MISSED_CHECK_OUT) &&
      !createCorrectionDto.proposedTime
    ) {
      throw new BadRequestException(
        'Proposed time is required for missed check-in/out corrections',
      );
    }

    // Create correction request
    const correction = new this.correctionModel({
      userId,
      departmentId,
      type: createCorrectionDto.type,
      date: correctionDate,
      reason: createCorrectionDto.reason,
      status: CorrectionStatus.PENDING,
      attendanceId: createCorrectionDto.attendanceId,
      proposedTime: createCorrectionDto.proposedTime
        ? new Date(createCorrectionDto.proposedTime)
        : undefined,
    });

    return correction.save();
  }

  /**
   * Get all correction requests based on query parameters
   * @param queryDto Query parameters
   */
  async findAll(queryDto: CorrectionQueryDto): Promise<Correction[]> {
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

    if (queryDto.type) {
      query.type = queryDto.type;
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

    return this.correctionModel.find(query).sort({ createdAt: -1 }).exec();
  }

  /**
   * Get correction requests for a specific user
   * @param userId User GUID
   * @param queryDto Query parameters
   */
  async findUserCorrections(
    userId: string,
    queryDto: CorrectionQueryDto,
  ): Promise<Correction[]> {
    queryDto.userId = userId;
    return this.findAll(queryDto);
  }

  /**
   * Get pending correction requests for a department head to review
   * @param departmentId Department GUID
   */
  async findPendingByDepartment(departmentId: string): Promise<Correction[]> {
    return this.correctionModel
      .find({
        departmentId,
        status: CorrectionStatus.PENDING,
      })
      .sort({ createdAt: 1 })
      .exec();
  }

  /**
   * Get a single correction by GUID
   * @param guid Correction GUID
   */
  async findOne(guid: string): Promise<Correction> {
    const correction = await this.correctionModel.findOne({ guid }).exec();

    if (!correction) {
      throw new NotFoundException(`Correction with GUID ${guid} not found`);
    }

    return correction;
  }

  /**
   * Review (approve/reject) a correction request
   * @param guid Correction GUID
   * @param reviewerId User GUID of the reviewer
   * @param updateCorrectionDto Update data
   */
  async reviewCorrection(
    guid: string,
    reviewerId: string,
    updateCorrectionDto: UpdateCorrectionDto,
  ): Promise<Correction> {
    const correction = await this.findOne(guid);

    // Check if correction is already reviewed
    if (correction.status !== CorrectionStatus.PENDING) {
      throw new BadRequestException(
        'This correction has already been reviewed',
      );
    }

    // If rejected, ensure a reason is provided
    if (
      updateCorrectionDto.status === CorrectionStatus.REJECTED &&
      !updateCorrectionDto.rejectionReason
    ) {
      throw new BadRequestException('Rejection reason is required');
    }

    // Update correction status
    correction.status = updateCorrectionDto.status;
    correction.reviewedBy = reviewerId;
    correction.reviewedAt = new Date();

    if (updateCorrectionDto.status === CorrectionStatus.REJECTED) {
      correction.rejectionReason = updateCorrectionDto.rejectionReason || '';
    }

    // If approved, apply correction to attendance if applicable
    if (updateCorrectionDto.status === CorrectionStatus.APPROVED) {
      await this.applyCorrection(correction);
    }

    return correction.save();
  }

  /**
   * Apply approved correction to attendance record
   * @param correction Approved correction
   */
  private async applyCorrection(correction: Correction): Promise<void> {
    // Find the attendance record for the day of the correction
    const correctionDate = new Date(correction.date);
    correctionDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(correctionDate);
    nextDay.setDate(nextDay.getDate() + 1);

    let attendance;

    try {
      // If attendanceId is provided, use it
      if (correction.attendanceId) {
        attendance = await this.attendanceService.findOne(
          correction.attendanceId,
        );
      } else {
        // Otherwise find by date and userId
        const attendances = await this.attendanceService.findAll({
          userId: correction.userId,
          startDate: correctionDate.toISOString(),
          endDate: correctionDate.toISOString(),
        });
        attendance = attendances.length > 0 ? attendances[0] : null;
      }
    } catch (error) {
      // If no attendance is found, it's okay for some correction types
      if (
        correction.type !== CorrectionType.MISSED_CHECK_IN &&
        correction.type !== CorrectionType.MISSED_CHECK_OUT
      ) {
        throw new BadRequestException(
          'No attendance record found for this date',
        );
      }
    }

    // Apply correction based on type
    switch (correction.type) {
      case CorrectionType.BREAK_TIME_AS_WORK:
        // Typically this would increase work hours or adjust status
        if (attendance) {
          // Implementation depends on specific business logic
          // This is a placeholder for the actual implementation
          // Example: increase work hours by 1 (for lunch break)
          // attendance.workHours += 1;
          // await attendance.save();
        }
        break;

      case CorrectionType.EARLY_DEPARTURE:
        // Mark early departure as approved
        if (attendance) {
          // Implementation depends on specific business logic
          // Example: update status to PRESENT if it was EARLY_DEPARTURE
          // if (attendance.status === 'EARLY_DEPARTURE') {
          //   attendance.status = 'PRESENT';
          //   await attendance.save();
          // }
        }
        break;

      case CorrectionType.LATE_ARRIVAL:
        // Mark late arrival as approved
        if (attendance) {
          // Implementation depends on specific business logic
          // Example: update status to PRESENT if it was LATE
          // if (attendance.status === 'LATE') {
          //   attendance.status = 'PRESENT';
          //   await attendance.save();
          // }
        }
        break;

      case CorrectionType.MISSED_CHECK_IN:
        // Create or update attendance with a manual check-in
        // Implementation depends on how attendance service handles this
        // This is a placeholder for the actual implementation
        // Example:
        // if (!attendance) {
        //   // Create new attendance with manual check-in
        //   await this.attendanceService.createManualAttendance({
        //     userId: correction.userId,
        //     date: correctionDate,
        //     checkInTime: correction.proposedTime,
        //     isManualCheckIn: true,
        //   });
        // } else {
        //   // Update existing attendance with manual check-in
        //   attendance.checkInTime = correction.proposedTime;
        //   attendance.isManualCheckIn = true;
        //   await attendance.save();
        // }
        break;

      case CorrectionType.MISSED_CHECK_OUT:
        // Update attendance with a manual check-out
        // Implementation depends on how attendance service handles this
        // This is a placeholder for the actual implementation
        // Example:
        // if (attendance) {
        //   attendance.checkOutTime = correction.proposedTime;
        //   attendance.isManualCheckOut = true;
        //   attendance.workHours = (
        //     correction.proposedTime.getTime() - attendance.checkInTime.getTime()
        //   ) / (1000 * 60 * 60);
        //   await attendance.save();
        // }
        break;

      default:
        break;
    }
  }

  /**
   * Get monthly correction usage statistic for a user
   * @param userId User GUID
   */
  async getMonthlyUsage(
    userId: string,
  ): Promise<{ used: number; limit: number }> {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    const monthlyCorrections = await this.correctionModel.countDocuments({
      userId,
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    });

    return {
      used: monthlyCorrections,
      limit: 2, // Hard-coded limit of 2 corrections per month
    };
  }
}
