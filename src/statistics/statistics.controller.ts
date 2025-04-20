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
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import { StatisticsService } from './statistics.service';
import { StatisticsQueryDto } from './dto/statistics-query.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

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
        await this.statisticsService.generateReport(generateReportDto);

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
        await this.statisticsService.generateReport(generateReportDto);

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
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async downloadReport(
    @Query('fileName') fileName: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const filePath = `${process.cwd()}/uploads/reports/${fileName}`;

      if (!fs.existsSync(filePath)) {
        throw new BadRequestException('Report file not found');
      }

      const file = fs.createReadStream(filePath);

      res.set({
        'Content-Disposition': `attachment; filename="${fileName}"`,
      });

      return new StreamableFile(file);
    } catch (error) {
      throw new BadRequestException(
        `Failed to download report: ${error.message}`,
      );
    }
  }
}
