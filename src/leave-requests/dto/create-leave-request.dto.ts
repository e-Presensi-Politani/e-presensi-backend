import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { LeaveRequestType } from '../schemas/leave-request.schema';
import { Transform } from 'class-transformer';

export class CreateLeaveRequestDto {
  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsEnum(LeaveRequestType)
  @IsNotEmpty()
  type: LeaveRequestType;

  @IsNotEmpty()
  @Transform(({ value }) => new Date(value))
  startDate: Date;

  @IsNotEmpty()
  @Transform(({ value }) => new Date(value))
  endDate: Date;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  reason: string;
}