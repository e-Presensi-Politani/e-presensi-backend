// src/statistics/statistics.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Res,
  Header,
  BadRequestException,
  StreamableFile,
  Request,
  Param,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import { StatisticsService } from './statistics.service';
import { ReportsService } from './reports.service';
import { StatisticsQueryDto } from './dto/statistics-query.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly reportsService: ReportsService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.KAJUR)
  async getStatistics(@Query() queryDto: StatisticsQueryDto) {
    return this.statisticsService.getStatistics(queryDto);
  }

  @Get('my-statistics')
  async getMyStatistics(@Request() req, @Query() queryDto: StatisticsQueryDto) {
    queryDto.userId = req.user.guid;
    return this.statisticsService.getStatistics(queryDto);
  }

  @Post('generate-report')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.KAJUR)
  async generateReport(
    @Body() generateReportDto: GenerateReportDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { fileName, filePath } =
        await this.reportsService.generateReport(generateReportDto);

      // Return file path for download
      return {
        success: true,
        message: 'Report generated successfully',
        data: {
          fileName,
          downloadUrl: `/statistics/download/${fileName}`,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to generate report: ${error.message}`,
      );
    }
  }

  @Post('generate-my-report')
  async generateMyReport(
    @Request() req,
    @Body() generateReportDto: GenerateReportDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      // Set the user ID to the current user
      generateReportDto.userId = req.user.guid;

      const { fileName, filePath } =
        await this.reportsService.generateReport(generateReportDto);

      // Return file path for download
      return {
        success: true,
        message: 'Report generated successfully',
        data: {
          fileName,
          downloadUrl: `/statistics/download/${fileName}`,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to generate report: ${error.message}`,
      );
    }
  }

  @Get('download/:fileName')
  async downloadReport(
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    try {
      const filePath = `${process.cwd()}/uploads/reports/${fileName}`;
      
      // Check if file exists first - BEFORE setting headers
      if (!fs.existsSync(filePath)) {
        return res.status(400).json({
          message: 'Report file not found',
          error: 'Bad Request',
          statusCode: 400,
        });
      }

      // Only set headers if file exists
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      });

      const file = fs.createReadStream(filePath);
      return file.pipe(res);
    } catch (error) {
      // If any other error occurs
      return res.status(400).json({
        message: `Failed to download report: ${error.message}`,
        error: 'Bad Request',
        statusCode: 400,
      });
    }
  }
}
