// src/attendance/dto/attendance-query.dto.ts
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class AttendanceQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}