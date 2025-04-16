// src/attendance/dto/verify-attendance.dto.ts
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class VerifyAttendanceDto {
  @IsNotEmpty()
  @IsBoolean()
  verified: boolean;
}