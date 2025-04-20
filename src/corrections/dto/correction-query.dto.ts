// src/corrections/dto/correction-query.dto.ts
import { IsDateString, IsOptional, IsString, IsEnum } from 'class-validator';
import { CorrectionStatus, CorrectionType } from '../schemas/correction.schema';

export class CorrectionQueryDto {
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
  @IsEnum(CorrectionStatus)
  status?: CorrectionStatus;

  @IsOptional()
  @IsEnum(CorrectionType)
  type?: CorrectionType;
}
