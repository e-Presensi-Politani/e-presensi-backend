import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LeaveRequestStatus } from '../schemas/leave-request.schema';

export class ReviewLeaveRequestDto {
  @IsEnum(LeaveRequestStatus)
  @IsNotEmpty()
  status: LeaveRequestStatus;

  @IsString()
  @IsOptional()
  comments?: string;
}
