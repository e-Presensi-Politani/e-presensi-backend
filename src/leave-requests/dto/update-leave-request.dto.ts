import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { LeaveRequestType } from '../schemas/leave-request.schema';
import { Transform } from 'class-transformer';

export class UpdateLeaveRequestDto {
  @IsEnum(LeaveRequestType)
  @IsOptional()
  type?: LeaveRequestType;

  @IsOptional()
  @Transform(({ value }) => new Date(value))
  startDate?: Date;

  @IsOptional()
  @Transform(({ value }) => new Date(value))
  endDate?: Date;

  @IsString()
  @IsOptional()
  @MinLength(5)
  reason?: string;
}