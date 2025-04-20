// src/statistics/statistics.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as Excel from 'exceljs';
import * as moment from 'moment';
import * as fs from 'fs';
import * as path from 'path';
import { Attendance, AttendanceDocument } from '../attendance/schemas/attendance.schema';
import { UsersService } from '../users/users.service';
import { DepartmentsService } from '../departments/departments.service';
import { StatisticsQueryDto, ReportPeriod, ReportFormat } from './dto/statistics-query.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
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
      dateRange.endDate
    );
  }

  /**
   * Generates reports in the specified format (Excel, PDF, CSV)
   */
  async generateReport(generateReportDto: GenerateReportDto): Promise<{fileName: string, filePath: string}> {
    const { format, period, startDate, endDate, userId, departmentId, title } = generateReportDto;
    
    // Get date range
    const dateRange = this.getDateRange(period, startDate, endDate);
    
    // Get statistics data
    const queryDto: StatisticsQueryDto = {
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
      userId,
      departmentId,
      period,
    };
    
    const statisticsData = await this.getStatistics(queryDto);

    // Generate report based on format
    switch (format) {
      case ReportFormat.EXCEL:
        return this.generateExcelReport(statisticsData, dateRange, title, userId, departmentId);
      case ReportFormat.PDF:
        throw new BadRequestException('PDF format is not implemented yet');
      case ReportFormat.CSV:
        throw new BadRequestException('CSV format is not implemented yet');
      default:
        throw new BadRequestException('Unsupported report format');
    }
  }

  /**
   * Generates an Excel report from attendance statistics
   */
  private async generateExcelReport(
    statistics: any,
    dateRange: { startDate: Date; endDate: Date },
    title?: string,
    userId?: string,
    departmentId?: string,
  ): Promise<{fileName: string, filePath: string}> {
    try {
      // Create a new workbook and worksheet
      const workbook = new Excel.Workbook();
      const worksheet = workbook.addWorksheet('Attendance Report');
      
      // Add title and header
      const reportTitle = title || 'Attendance Report';
      worksheet.mergeCells('A1:H1');
      worksheet.getCell('A1').value = reportTitle;
      worksheet.getCell('A1').font = { size: 16, bold: true };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };
      
      // Add date range
      worksheet.mergeCells('A2:H2');
      worksheet.getCell('A2').value = `Period: ${moment(dateRange.startDate).format('DD MMM YYYY')} - ${moment(dateRange.endDate).format('DD MMM YYYY')}`;
      worksheet.getCell('A2').font = { size: 12 };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };
      
      // Add user or department info if specified
      if (userId) {
        try {
          const user = await this.usersService.findOne(userId);
          worksheet.mergeCells('A3:H3');
          worksheet.getCell('A3').value = `Employee: ${user.fullName} (${user.nip})`;
          worksheet.getCell('A3').font = { size: 12 };
          worksheet.getCell('A3').alignment = { horizontal: 'center' };
        } catch (error) {
          this.logger.error(`Failed to fetch user information: ${error.message}`);
        }
      }

      if (departmentId) {
        try {
          const department = await this.departmentsService.findOne(departmentId);
          const rowIndex = userId ? 4 : 3;
          worksheet.mergeCells(`A${rowIndex}:H${rowIndex}`);
          worksheet.getCell(`A${rowIndex}`).value = `Department: ${department.name}`;
          worksheet.getCell(`A${rowIndex}`).font = { size: 12 };
          worksheet.getCell(`A${rowIndex}`).alignment = { horizontal: 'center' };
        } catch (error) {
          this.logger.error(`Failed to fetch department information: ${error.message}`);
        }
      }
      
      // Add summary section
      const summaryStartRow = userId && departmentId ? 6 : (userId || departmentId ? 5 : 4);
      worksheet.mergeCells(`A${summaryStartRow}:H${summaryStartRow}`);
      worksheet.getCell(`A${summaryStartRow}`).value = 'Summary';
      worksheet.getCell(`A${summaryStartRow}`).font = { size: 14, bold: true };
      
      // Add summary data
      const summary = [
        ['Total Days', statistics.totalDays],
        ['Present Days', statistics.present],
        ['Absent Days', statistics.absent],
        ['Late Arrivals', statistics.late],
        ['Early Departures', statistics.earlyDeparture],
        ['Remote Working', statistics.remoteWorking],
        ['On Leave', statistics.onLeave],
        ['Official Travel', statistics.officialTravel],
        ['Total Work Hours', statistics.totalWorkHours],
        ['Average Work Hours/Day', statistics.averageWorkHours],
        ['Attendance Rate', `${((statistics.totalAttendances / statistics.totalDays) * 100).toFixed(2)}%`],
      ];
      
      let currentRow = summaryStartRow + 1;
      summary.forEach(([label, value]) => {
        worksheet.getCell(`A${currentRow}`).value = label;
        worksheet.getCell(`B${currentRow}`).value = value;
        currentRow++;
      });
      
      // Add detailed records section if there are individual records
      if (statistics.records && statistics.records.length > 0) {
        currentRow += 2;
        worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = 'Detailed Records';
        worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true };
        currentRow++;
        
        // Add table headers
        const headers = ['Date', 'Check-In', 'Check-Out', 'Work Hours', 'Status', 'Location', 'Notes', 'Verified'];
        for (let i = 0; i < headers.length; i++) {
          worksheet.getCell(`${String.fromCharCode(65 + i)}${currentRow}`).value = headers[i];
          worksheet.getCell(`${String.fromCharCode(65 + i)}${currentRow}`).font = { bold: true };
          worksheet.getCell(`${String.fromCharCode(65 + i)}${currentRow}`).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' },
          };
        }
        currentRow++;
        
        // Add record data
        statistics.records.forEach(record => {
          worksheet.getCell(`A${currentRow}`).value = moment(record.date).format('DD/MM/YYYY');
          worksheet.getCell(`B${currentRow}`).value = record.checkInTime ? moment(record.checkInTime).format('HH:mm:ss') : '-';
          worksheet.getCell(`C${currentRow}`).value = record.checkOutTime ? moment(record.checkOutTime).format('HH:mm:ss') : '-';
          worksheet.getCell(`D${currentRow}`).value = record.workHours || '-';
          worksheet.getCell(`E${currentRow}`).value = record.status;
          worksheet.getCell(`F${currentRow}`).value = record.checkInLocation ? 'Office' : 'Remote';
          worksheet.getCell(`G${currentRow}`).value = record.checkInNotes || '';
          worksheet.getCell(`H${currentRow}`).value = record.verified ? 'Yes' : 'No';
          currentRow++;
        });
      }
      
      // Adjust column widths
      worksheet.columns.forEach(column => {
        column.width = 15;
      });
      
      // Create directory if it doesn't exist
      const reportsDir = path.join(process.cwd(), 'uploads', 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      // Generate unique filename
      const timestamp = moment().format('YYYYMMDD-HHmmss');
      const fileName = `attendance_report_${timestamp}.xlsx`;
      const filePath = path.join(reportsDir, fileName);
      
      // Write the file
      await workbook.xlsx.writeFile(filePath);
      
      return { fileName, filePath };
    } catch (error) {
      this.logger.error(`Failed to generate Excel report: ${error.message}`);
      throw new BadRequestException(`Failed to generate Excel report: ${error.message}`);
    }
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
      summary.averageWorkHours = parseFloat(summary.averageWorkHours.toFixed(2));
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
   */
  private getDateRange(
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