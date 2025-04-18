import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import {
  LeaveRequestStatus,
  LeaveRequestType,
} from '../schemas/leave-request.schema';
import { Transform } from 'class-transformer';

export class QueryLeaveRequestsDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsEnum(LeaveRequestType, { each: true })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  type?: LeaveRequestType[];

  @IsEnum(LeaveRequestStatus, { each: true })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  status?: LeaveRequestStatus[];

  @IsDateString()
  @IsOptional()
  startDateFrom?: Date;

  @IsDateString()
  @IsOptional()
  startDateTo?: Date;

  @IsDateString()
  @IsOptional()
  endDateFrom?: Date;

  @IsDateString()
  @IsOptional()
  endDateTo?: Date;

  @IsDateString()
  @IsOptional()
  reviewedDateFrom?: Date;

  @IsDateString()
  @IsOptional()
  reviewedDateTo?: Date;
}
