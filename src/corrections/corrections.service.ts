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
import { WorkingStatus } from 'src/common/interfaces/working-status.enum';
import {
  Attendance,
  AttendanceDocument,
} from '../attendance/schemas/attendance.schema';

@Injectable()
export class CorrectionsService {
  constructor(
    @InjectModel(Correction.name)
    private correctionModel: Model<CorrectionDocument>,
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
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

    // Validate attendance record exists and belongs to the user (except for MISSED_CHECK_IN)
    if (createCorrectionDto.type !== CorrectionType.MISSED_CHECK_IN) {
      if (!createCorrectionDto.attendanceId) {
        throw new BadRequestException(
          'Attendance ID is required for this correction type',
        );
      }

      try {
        const attendance = await this.attendanceService.findOne(
          createCorrectionDto.attendanceId,
        );

        // Verify the attendance belongs to the requesting user
        if (attendance.userId !== userId) {
          throw new ForbiddenException(
            'You can only correct your own attendance records',
          );
        }

        // Validate correction date matches attendance date
        const attendanceDate = new Date(attendance.date);
        attendanceDate.setHours(0, 0, 0, 0);
        correctionDate.setHours(0, 0, 0, 0);

        if (attendanceDate.getTime() !== correctionDate.getTime()) {
          throw new BadRequestException(
            'Correction date must match the attendance record date',
          );
        }
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw new BadRequestException(
            'The specified attendance record does not exist',
          );
        }
        throw error;
      }
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
    let attendance;

    try {
      // For MISSED_CHECK_IN, we might not have an attendanceId yet
      if (
        correction.type === CorrectionType.MISSED_CHECK_IN &&
        !correction.attendanceId
      ) {
        // Find existing attendance for that date if any
        const correctionDate = new Date(correction.date);
        correctionDate.setHours(0, 0, 0, 0);

        const attendances = await this.attendanceService.findAll({
          userId: correction.userId,
          startDate: correctionDate.toISOString(),
          endDate: correctionDate.toISOString(),
        });

        if (attendances.length > 0) {
          // Use existing attendance if found
          attendance = attendances[0];
        } else {
          // No attendance record found for MISSED_CHECK_IN
          // A new attendance record should be created using custom method in AttendanceService
          // This would be implemented in AttendanceService
          await this.createMissedCheckIn(correction);
          return;
        }
      } else {
        // For all other correction types, attendanceId is required
        if (!correction.attendanceId) {
          throw new BadRequestException(
            'No attendance ID specified for correction',
          );
        }

        attendance = await this.attendanceService.findOne(
          correction.attendanceId,
        );

        // Verify the attendance belongs to the user requesting the correction
        if (attendance.userId !== correction.userId) {
          throw new ForbiddenException(
            "Cannot apply correction to another user's attendance",
          );
        }
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException(
          `Attendance record ${correction.attendanceId} not found`,
        );
      }
      throw error;
    }

    // Apply correction based on type
    switch (correction.type) {
      case CorrectionType.BREAK_TIME_AS_WORK:
        // Add 1 hour to work hours (typical lunch break)
        if (!attendance.workHours) {
          attendance.workHours = 0;
        }
        attendance.workHours += 1;
        await this.attendanceModel.updateOne(
          { guid: attendance.guid },
          { workHours: attendance.workHours },
        );
        break;

      case CorrectionType.EARLY_DEPARTURE:
        // Mark early departure as approved/present
        if (attendance.status === WorkingStatus.EARLY_DEPARTURE) {
          await this.attendanceModel.updateOne(
            { guid: attendance.guid },
            { status: WorkingStatus.PRESENT },
          );
        }
        break;

      case CorrectionType.LATE_ARRIVAL:
        // Mark late arrival as approved/present
        if (attendance.status === WorkingStatus.LATE) {
          await this.attendanceModel.updateOne(
            { guid: attendance.guid },
            { status: WorkingStatus.PRESENT },
          );
        }
        break;

      case CorrectionType.MISSED_CHECK_IN:
        if (attendance) {
          // Update existing attendance with manual check-in time
          await this.attendanceModel.updateOne(
            { guid: attendance.guid },
            {
              checkInTime: correction.proposedTime,
              isManualCheckIn: true,
            },
          );

          // If both check-in and check-out times exist, recalculate work hours
          if (attendance.checkOutTime) {
            const workHours =
              (attendance.checkOutTime.getTime() -
                correction.proposedTime.getTime()) /
              (1000 * 60 * 60);
            await this.attendanceModel.updateOne(
              { guid: attendance.guid },
              { workHours: parseFloat(workHours.toFixed(2)) },
            );
          }
        }
        break;

      case CorrectionType.MISSED_CHECK_OUT:
        if (attendance) {
          if (!attendance.checkInTime) {
            throw new BadRequestException(
              'Cannot add check-out time when check-in time is missing',
            );
          }

          // Calculate work hours
          const workHours =
            (correction.proposedTime.getTime() -
              attendance.checkInTime.getTime()) /
            (1000 * 60 * 60);

          // Update attendance with manual check-out
          await this.attendanceModel.updateOne(
            { guid: attendance.guid },
            {
              checkOutTime: correction.proposedTime,
              isManualCheckOut: true,
              workHours: parseFloat(workHours.toFixed(2)),
            },
          );
        }
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

  /**
   * Create a new attendance record for missed check-in
   * @param correction The approved correction for missed check-in
   */
  private async createMissedCheckIn(correction: Correction): Promise<void> {
    const user = await this.usersService.findOne(correction.userId);

    // Get user's department
    const departments = await this.departmentsService.getDepartmentsByMember(
      correction.userId,
    );
    let departmentId: string | null = null;
    if (departments.length > 0) {
      departmentId = departments[0].guid;
    }

    // Create a new attendance record with manual check-in
    const correctionDate = new Date(correction.date);
    correctionDate.setHours(0, 0, 0, 0);

    const newAttendance = new this.attendanceModel({
      userId: correction.userId,
      date: correctionDate,
      checkInTime: correction.proposedTime,
      isManualCheckIn: true,
      status: WorkingStatus.PRESENT,
      departmentId,
    });

    const savedAttendance = await newAttendance.save();

    // Update the correction with the new attendance ID
    await this.correctionModel.updateOne(
      { guid: correction.guid },
      { attendanceId: savedAttendance.guid },
    );
  }
}
