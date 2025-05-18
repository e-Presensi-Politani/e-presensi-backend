// src/statistics/statistics.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as moment from 'moment';
import {
  Attendance,
  AttendanceDocument,
} from '../attendance/schemas/attendance.schema';
import { UsersService } from '../users/users.service';
import { DepartmentsService } from '../departments/departments.service';
import { StatisticsQueryDto, ReportPeriod } from './dto/statistics-query.dto';
import { WorkingStatus } from '../common/interfaces/working-status.enum';
import { ConfigService } from '../config/config.service';

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
    private usersService: UsersService,
    private departmentsService: DepartmentsService,
    private configService: ConfigService,
  ) {}

  /**
   * Gets attendance statistics based on query parameters
   */
  async getStatistics(queryDto: StatisticsQueryDto): Promise<any> {
    const { startDate, endDate, userId, departmentId, period } = queryDto;

    // Set date range based on period or custom dates
    const dateRange = this.getDateRange(period, startDate, endDate);

    // Build MongoDB query
    const query: any = {
      date: {
        $gte: dateRange.startDate,
        $lte: dateRange.endDate,
      },
    };

    if (userId) {
      query.userId = userId;
    }

    if (departmentId) {
      query.departmentId = departmentId;
    }

    // Fetch attendance records
    const attendanceRecords = await this.attendanceModel.find(query).exec();

    // Process the records to generate statistics
    return this.processAttendanceStatistics(
      attendanceRecords,
      dateRange.startDate,
      dateRange.endDate,
    );
  }

  /**
   * Process attendance records to generate statistics
   */
  private processAttendanceStatistics(
    records: Attendance[],
    startDate: Date,
    endDate: Date,
  ): any {
    const totalDays = moment(endDate).diff(moment(startDate), 'days') + 1;

    const summary = {
      totalDays,
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
      records: records,
    };

    // Count by status
    records.forEach((record) => {
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
    const daysWithRecords = records.length;
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
   * Calculate date range based on period or custom dates
   * Made public so it can be used by ReportsService
   */
  public getDateRange(
    period?: ReportPeriod,
    startDateStr?: string,
    endDateStr?: string,
  ): { startDate: Date; endDate: Date } {
    const today = moment().startOf('day');
    let startDate: moment.Moment;
    let endDate: moment.Moment = today.clone();

    // If custom dates are provided, use them
    if (startDateStr && endDateStr) {
      startDate = moment(startDateStr).startOf('day');
      endDate = moment(endDateStr).endOf('day');
    } else {
      // Otherwise calculate based on period
      switch (period) {
        case ReportPeriod.DAILY:
          startDate = today.clone();
          break;
        case ReportPeriod.WEEKLY:
          startDate = today.clone().subtract(6, 'days');
          break;
        case ReportPeriod.MONTHLY:
          startDate = today.clone().startOf('month');
          break;
        default:
          // Default to last 30 days
          startDate = today.clone().subtract(29, 'days');
      }
    }

    // Validate date range
    if (endDate.isBefore(startDate)) {
      throw new BadRequestException('End date cannot be before start date');
    }

    return {
      startDate: startDate.toDate(),
      endDate: endDate.toDate(),
    };
  }
}
