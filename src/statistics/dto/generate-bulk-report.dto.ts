// src/statistics/dto/generate-bulk-report.dto.ts
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ReportFormat, ReportPeriod } from './statistics-query.dto';

export enum BulkReportScope {
  DEPARTMENT = 'department',
  ALL_USERS = 'all_users',
  SPECIFIC_USERS = 'specific_users',
}

export class GenerateBulkReportDto {
  @IsNotEmpty()
  @IsEnum(ReportFormat)
  format: ReportFormat;

  @IsNotEmpty()
  @IsEnum(ReportPeriod)
  period: ReportPeriod;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNotEmpty()
  @IsEnum(BulkReportScope)
  scope: BulkReportScope;

  @IsOptional()
  @IsString()
  departmentName?: string; // Changed from departmentId to departmentName

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;

  @IsOptional()
  @IsBoolean()
  separateSheets?: boolean; // Whether to create separate sheets for each user/department

  @IsOptional()
  @IsBoolean()
  includeSummary?: boolean; // Whether to include summary sheet
}
