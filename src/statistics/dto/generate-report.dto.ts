// src/statistics/dto/generate-report.dto.ts
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ReportFormat, ReportPeriod } from './statistics-query.dto';

export class GenerateReportDto {
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

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  title?: string;
}