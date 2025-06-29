// src/statistics/bulk-reports.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as Excel from 'exceljs';
import * as moment from 'moment';
import * as fs from 'fs';
import * as path from 'path';
import { UsersService } from '../users/users.service';
import { DepartmentsService } from '../departments/departments.service';
import { ReportFormat } from './dto/statistics-query.dto';
import {
  GenerateBulkReportDto,
  BulkReportScope,
} from './dto/generate-bulk-report.dto';
import { StatisticsService } from './statistics.service';
import { UserRole } from '../users/schemas/user.schema';

interface UserWithDepartment {
  guid: string;
  fullName: string;
  nip: string;
  departmentId: string;
  departmentName: string;
  role: UserRole;
  isActive: boolean;
}

interface BulkReportData {
  user: UserWithDepartment;
  statistics: any;
}

@Injectable()
export class BulkReportsService {
  private readonly logger = new Logger(BulkReportsService.name);

  constructor(
    private statisticsService: StatisticsService,
    private usersService: UsersService,
    private departmentsService: DepartmentsService,
  ) {}

  /**
   * Generates bulk reports based on scope (department/all users/specific users)
   */
  async generateBulkReport(
    generateBulkReportDto: GenerateBulkReportDto,
    currentUser: any,
  ): Promise<{ fileName: string; filePath: string }> {
    const {
      format,
      period,
      startDate,
      endDate,
      scope,
      departmentId,
      userIds,
      title,
      includeInactive = false,
      separateSheets = true,
      includeSummary = true,
    } = generateBulkReportDto;

    // Validate permissions and get target users
    const targetUsers = await this.getTargetUsers(
      scope,
      currentUser,
      departmentId,
      userIds,
      includeInactive,
    );

    if (targetUsers.length === 0) {
      throw new BadRequestException(
        'No users found for the specified criteria',
      );
    }

    // Get date range
    const dateRange = this.statisticsService.getDateRange(
      period,
      startDate,
      endDate,
    );

    // Collect statistics for all target users
    const bulkData: BulkReportData[] = [];

    for (const user of targetUsers) {
      try {
        const statistics = await this.statisticsService.getStatistics({
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          userId: user.guid,
          period,
        });

        bulkData.push({
          user,
          statistics,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to get statistics for user ${user.fullName}: ${error.message}`,
        );
        // Continue with other users
      }
    }

    // Generate report based on format
    switch (format) {
      case ReportFormat.EXCEL:
        return this.generateBulkExcelReport(
          bulkData,
          dateRange,
          title,
          scope,
          separateSheets,
          includeSummary,
        );
      case ReportFormat.PDF:
        throw new BadRequestException('PDF format is not implemented yet');
      case ReportFormat.CSV:
        throw new BadRequestException('CSV format is not implemented yet');
      default:
        throw new BadRequestException('Unsupported report format');
    }
  }

  /**
   * Get target users based on scope and permissions
   */
  private async getTargetUsers(
    scope: BulkReportScope,
    currentUser: any,
    departmentId?: string,
    userIds?: string[],
    includeInactive: boolean = false,
  ): Promise<UserWithDepartment[]> {
    this.logger.debug(`getTargetUsers called with:`, {
      scope,
      currentUserRole: currentUser?.role,
      currentUserGuid: currentUser?.guid,
      currentUserDepartment: currentUser?.department,
      departmentId,
      userIds,
      includeInactive,
    });

    let users: any[] = [];

    switch (scope) {
      case BulkReportScope.ALL_USERS:
        this.logger.debug('Processing ALL_USERS scope');
        if (currentUser.role !== UserRole.ADMIN) {
          throw new BadRequestException(
            'Only administrators can generate reports for all users',
          );
        }
        users = await this.usersService.findAll();
        this.logger.debug(`Found ${users.length} users from findAll()`);
        break;

      case BulkReportScope.DEPARTMENT:
        this.logger.debug('Processing DEPARTMENT scope');
        if (currentUser.role === UserRole.KAJUR) {
          const kajurUser = await this.usersService.findOne(currentUser.guid);
          this.logger.debug('KAJUR user details:', {
            guid: kajurUser?.guid,
            department: kajurUser?.department,
            fullName: kajurUser?.fullName,
          });

          if (!kajurUser.department) {
            throw new BadRequestException(
              'User does not have an assigned department',
            );
          }

          const department = await this.departmentsService.getDepartmentByName(
            kajurUser.department,
          );
          this.logger.debug('Department lookup result:', department);

          if (!department) {
            throw new BadRequestException(
              'Department not found for the current user',
            );
          }

          if (!departmentId) {
            departmentId = kajurUser.department;
          } else if (departmentId !== department.guid) {
            throw new BadRequestException(
              'You can only generate reports for your own department',
            );
          }
        } else if (currentUser.role !== UserRole.ADMIN) {
          throw new BadRequestException(
            'Insufficient permissions to generate department reports',
          );
        }

        if (!departmentId) {
          throw new BadRequestException(
            'Department ID is required for department scope',
          );
        }
        const department = await this.departmentsService.findOne(
          departmentId,
        );
        this.logger.debug(`Looking for users in department: ${departmentId}`);
        users = await this.usersService.findByDepartment(department.name);
        this.logger.debug(
          `Found ${users.length} users in department ${departmentId}`,
        );
        break;

      case BulkReportScope.SPECIFIC_USERS:
        this.logger.debug('Processing SPECIFIC_USERS scope');
        if (!userIds || userIds.length === 0) {
          throw new BadRequestException(
            'User IDs are required for specific users scope',
          );
        }

        this.logger.debug(`Looking for specific users: ${userIds.join(', ')}`);

        if (currentUser.role === UserRole.KAJUR) {
          const kajurUser = await this.usersService.findOne(currentUser.guid);
          const requestedUsers = await Promise.all(
            userIds.map((id) => this.usersService.findOne(id)),
          );

          this.logger.debug(
            'Requested users:',
            requestedUsers.map((u) => ({
              guid: u?.guid,
              department: u?.department,
              fullName: u?.fullName,
            })),
          );

          const invalidUsers = requestedUsers.filter(
            (user) => user.department !== kajurUser.department,
          );

          if (invalidUsers.length > 0) {
            this.logger.debug('Invalid users found:', invalidUsers);
            throw new BadRequestException(
              'You can only generate reports for users in your department',
            );
          }
        } else if (currentUser.role !== UserRole.ADMIN) {
          throw new BadRequestException(
            'Insufficient permissions to generate reports for specific users',
          );
        }

        users = await Promise.all(
          userIds.map((id) => this.usersService.findOne(id)),
        );
        this.logger.debug(`Found ${users.length} specific users`);
        break;

      default:
        throw new BadRequestException('Invalid report scope');
    }

    this.logger.debug(`Users before filtering inactive: ${users.length}`);
    this.logger.debug(
      'Sample users:',
      users.slice(0, 3).map((u) => ({
        guid: u?.guid,
        fullName: u?.fullName,
        isActive: u?.isActive,
        department: u?.department,
      })),
    );

    // Filter inactive users if needed
    if (!includeInactive) {
      const beforeFilter = users.length;
      users = users.filter((user) => user.isActive !== false);
      this.logger.debug(
        `Filtered out inactive users: ${beforeFilter} -> ${users.length}`,
      );
    }

    // Get department information for each user
    const usersWithDepartment: UserWithDepartment[] = [];

    for (const user of users) {
      if (!user) {
        this.logger.warn('Null/undefined user found in users array');
        continue;
      }

      try {
        const department = await this.departmentsService.getDepartmentByName(
          user.department,
        );
        usersWithDepartment.push({
          guid: user.guid,
          fullName: user.fullName,
          nip: user.nip,
          departmentId: user.departmentId,
          departmentName: user.department,
          role: user.role,
          isActive: user.isActive,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to get department for user ${user.fullName}: ${error.message}`,
        );
        usersWithDepartment.push({
          guid: user.guid,
          fullName: user.fullName,
          nip: user.nip,
          departmentId: user.departmentId,
          departmentName: 'Unknown',
          role: user.role,
          isActive: user.isActive,
        });
      }
    }

    this.logger.debug(
      `Final result: ${usersWithDepartment.length} users with department info`,
    );
    return usersWithDepartment;
  }

  /**
   * Generates bulk Excel report
   */
  private async generateBulkExcelReport(
    bulkData: BulkReportData[],
    dateRange: { startDate: Date; endDate: Date },
    title?: string,
    scope?: BulkReportScope,
    separateSheets: boolean = true,
    includeSummary: boolean = true,
  ): Promise<{ fileName: string; filePath: string }> {
    try {
      const workbook = new Excel.Workbook();
      const reportTitle = title || 'Bulk Attendance Report';

      // Create summary sheet if requested
      if (includeSummary) {
        await this.createSummarySheet(
          workbook,
          bulkData,
          dateRange,
          reportTitle,
          scope,
        );
      }

      if (separateSheets) {
        // Create separate sheet for each user
        for (const { user, statistics } of bulkData) {
          await this.createUserSheet(workbook, user, statistics, dateRange);
        }
      } else {
        // Create single consolidated sheet
        await this.createConsolidatedSheet(
          workbook,
          bulkData,
          dateRange,
          reportTitle,
        );
      }

      // Create directory if it doesn't exist
      const reportsDir = path.join(process.cwd(), 'uploads', 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = moment().format('YYYYMMDD-HHmmss');
      const scopePrefix = scope ? `${scope}_` : '';
      const fileName = `bulk_${scopePrefix}attendance_report_${timestamp}.xlsx`;
      const filePath = path.join(reportsDir, fileName);

      // Write the file
      await workbook.xlsx.writeFile(filePath);

      return { fileName, filePath };
    } catch (error) {
      this.logger.error(
        `Failed to generate bulk Excel report: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to generate bulk Excel report: ${error.message}`,
      );
    }
  }

  /**
   * Create summary sheet with overview of all users
   */
  private async createSummarySheet(
    workbook: Excel.Workbook,
    bulkData: BulkReportData[],
    dateRange: { startDate: Date; endDate: Date },
    title: string,
    scope?: BulkReportScope,
  ): Promise<void> {
    const worksheet = workbook.addWorksheet('Summary');

    // Add title
    worksheet.mergeCells('A1:L1');
    worksheet.getCell('A1').value = title;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Add date range
    worksheet.mergeCells('A2:L2');
    worksheet.getCell('A2').value =
      `Period: ${moment(dateRange.startDate).format('DD MMM YYYY')} - ${moment(dateRange.endDate).format('DD MMM YYYY')}`;
    worksheet.getCell('A2').font = { size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    // Add scope info
    if (scope) {
      worksheet.mergeCells('A3:L3');
      worksheet.getCell('A3').value =
        `Scope: ${scope.replace('_', ' ').toUpperCase()}`;
      worksheet.getCell('A3').font = { size: 12 };
      worksheet.getCell('A3').alignment = { horizontal: 'center' };
    }

    // Add summary table headers
    const startRow = scope ? 5 : 4;
    const headers = [
      'Employee Name',
      'NIP',
      'Department',
      'Total Days',
      'Present',
      'Absent',
      'Late',
      'Early Departure',
      'Remote Work',
      'On Leave',
      'Official Travel',
      'Attendance Rate',
    ];

    for (let i = 0; i < headers.length; i++) {
      const cell = worksheet.getCell(
        `${String.fromCharCode(65 + i)}${startRow}`,
      );
      cell.value = headers[i];
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    }

    // Add data rows
    let currentRow = startRow + 1;
    for (const { user, statistics } of bulkData) {
      const attendanceRate =
        statistics.totalDays > 0
          ? (
              (statistics.totalAttendances / statistics.totalDays) *
              100
            ).toFixed(2) + '%'
          : '0%';

      const rowData = [
        user.fullName,
        user.nip,
        user.departmentName,
        statistics.totalDays,
        statistics.present,
        statistics.absent,
        statistics.late,
        statistics.earlyDeparture,
        statistics.remoteWorking,
        statistics.onLeave,
        statistics.officialTravel,
        attendanceRate,
      ];

      for (let i = 0; i < rowData.length; i++) {
        worksheet.getCell(`${String.fromCharCode(65 + i)}${currentRow}`).value =
          rowData[i];
      }
      currentRow++;
    }

    // Add totals row
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };

    const totals = bulkData.reduce(
      (acc, { statistics }) => ({
        totalDays: acc.totalDays + statistics.totalDays,
        present: acc.present + statistics.present,
        absent: acc.absent + statistics.absent,
        late: acc.late + statistics.late,
        earlyDeparture: acc.earlyDeparture + statistics.earlyDeparture,
        remoteWorking: acc.remoteWorking + statistics.remoteWorking,
        onLeave: acc.onLeave + statistics.onLeave,
        officialTravel: acc.officialTravel + statistics.officialTravel,
        totalAttendances: acc.totalAttendances + statistics.totalAttendances,
      }),
      {
        totalDays: 0,
        present: 0,
        absent: 0,
        late: 0,
        earlyDeparture: 0,
        remoteWorking: 0,
        onLeave: 0,
        officialTravel: 0,
        totalAttendances: 0,
      },
    );

    const overallAttendanceRate =
      totals.totalDays > 0
        ? ((totals.totalAttendances / totals.totalDays) * 100).toFixed(2) + '%'
        : '0%';

    worksheet.getCell(`D${currentRow}`).value = totals.totalDays;
    worksheet.getCell(`E${currentRow}`).value = totals.present;
    worksheet.getCell(`F${currentRow}`).value = totals.absent;
    worksheet.getCell(`G${currentRow}`).value = totals.late;
    worksheet.getCell(`H${currentRow}`).value = totals.earlyDeparture;
    worksheet.getCell(`I${currentRow}`).value = totals.remoteWorking;
    worksheet.getCell(`J${currentRow}`).value = totals.onLeave;
    worksheet.getCell(`K${currentRow}`).value = totals.officialTravel;
    worksheet.getCell(`L${currentRow}`).value = overallAttendanceRate;

    // Make totals row bold
    for (let i = 0; i < 12; i++) {
      worksheet.getCell(`${String.fromCharCode(65 + i)}${currentRow}`).font = {
        bold: true,
      };
    }

    // Adjust column widths
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });
  }

  /**
   * Create individual sheet for each user
   */
  private async createUserSheet(
    workbook: Excel.Workbook,
    user: UserWithDepartment,
    statistics: any,
    dateRange: { startDate: Date; endDate: Date },
  ): Promise<void> {
    const sheetName = `${user.fullName.substring(0, 25)}...`.replace(
      /[\\\/\[\]]/g,
      '',
    );
    const worksheet = workbook.addWorksheet(sheetName);

    // Add employee info
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = `${user.fullName} (${user.nip})`;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:H2');
    worksheet.getCell('A2').value = `Department: ${user.departmentName}`;
    worksheet.getCell('A2').font = { size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A3:H3');
    worksheet.getCell('A3').value =
      `Period: ${moment(dateRange.startDate).format('DD MMM YYYY')} - ${moment(dateRange.endDate).format('DD MMM YYYY')}`;
    worksheet.getCell('A3').font = { size: 12 };
    worksheet.getCell('A3').alignment = { horizontal: 'center' };

    // Add statistics (reuse logic from original generateExcelReport)
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
      [
        'Attendance Rate',
        `${((statistics.totalAttendances / statistics.totalDays) * 100).toFixed(2)}%`,
      ],
    ];

    let currentRow = 5;
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'Summary';
    worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true };
    currentRow++;

    summary.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label;
      worksheet.getCell(`B${currentRow}`).value = value;
      currentRow++;
    });

    // Add detailed records if available
    if (statistics.records && statistics.records.length > 0) {
      currentRow += 2;
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = 'Detailed Records';
      worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true };
      currentRow++;

      // Add table headers
      const headers = [
        'Date',
        'Check-In',
        'Check-Out',
        'Work Hours',
        'Status',
        'Location',
        'Notes',
        'Verified',
      ];
      for (let i = 0; i < headers.length; i++) {
        const cell = worksheet.getCell(
          `${String.fromCharCode(65 + i)}${currentRow}`,
        );
        cell.value = headers[i];
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
      }
      currentRow++;

      // Add record data
      statistics.records.forEach((record) => {
        worksheet.getCell(`A${currentRow}`).value = moment(record.date).format(
          'DD/MM/YYYY',
        );
        worksheet.getCell(`B${currentRow}`).value = record.checkInTime
          ? moment(record.checkInTime).format('HH:mm:ss')
          : '-';
        worksheet.getCell(`C${currentRow}`).value = record.checkOutTime
          ? moment(record.checkOutTime).format('HH:mm:ss')
          : '-';
        worksheet.getCell(`D${currentRow}`).value = record.workHours || '-';
        worksheet.getCell(`E${currentRow}`).value = record.status;
        worksheet.getCell(`F${currentRow}`).value = record.checkInLocation
          ? 'Office'
          : 'Remote';
        worksheet.getCell(`G${currentRow}`).value = record.checkInNotes || '';
        worksheet.getCell(`H${currentRow}`).value = record.verified
          ? 'Yes'
          : 'No';
        currentRow++;
      });
    }

    // Adjust column widths
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });
  }

  /**
   * Create consolidated sheet with all users in one sheet
   */
  private async createConsolidatedSheet(
    workbook: Excel.Workbook,
    bulkData: BulkReportData[],
    dateRange: { startDate: Date; endDate: Date },
    title: string,
  ): Promise<void> {
    const worksheet = workbook.addWorksheet('Consolidated Report');

    // Add title
    worksheet.mergeCells('A1:K1');
    worksheet.getCell('A1').value = title;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Add date range
    worksheet.mergeCells('A2:K2');
    worksheet.getCell('A2').value =
      `Period: ${moment(dateRange.startDate).format('DD MMM YYYY')} - ${moment(dateRange.endDate).format('DD MMM YYYY')}`;
    worksheet.getCell('A2').font = { size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    let currentRow = 4;

    // Process each user
    for (const { user, statistics } of bulkData) {
      // Add user header
      worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value =
        `${user.fullName} (${user.nip}) - ${user.departmentName}`;
      worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true };
      worksheet.getCell(`A${currentRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCCCCC' },
      };
      currentRow++;

      // Add summary
      const summary = [
        ['Total Days', statistics.totalDays],
        ['Present', statistics.present],
        ['Absent', statistics.absent],
        ['Late', statistics.late],
        ['Early Departure', statistics.earlyDeparture],
        ['Remote Work', statistics.remoteWorking],
        ['On Leave', statistics.onLeave],
        ['Official Travel', statistics.officialTravel],
        [
          'Attendance Rate',
          `${((statistics.totalAttendances / statistics.totalDays) * 100).toFixed(2)}%`,
        ],
      ];

      summary.forEach(([label, value]) => {
        worksheet.getCell(`A${currentRow}`).value = label;
        worksheet.getCell(`B${currentRow}`).value = value;
        currentRow++;
      });

      currentRow += 2; // Add space between users
    }

    // Adjust column widths
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });
  }
}
