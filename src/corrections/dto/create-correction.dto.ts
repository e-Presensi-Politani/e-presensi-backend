// src/corrections/dto/create-correction.dto.ts
import {
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsString,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { CorrectionType } from '../schemas/correction.schema';

export class CreateCorrectionDto {
  @IsNotEmpty()
  @IsEnum(CorrectionType)
  type: CorrectionType;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @ValidateIf(
    (o) =>
      o.type === CorrectionType.MISSED_CHECK_IN ||
      o.type === CorrectionType.MISSED_CHECK_OUT,
  )
  @IsNotEmpty({
    message: 'Proposed time is required for missed check-in/out corrections',
  })
  @IsDateString()
  proposedTime?: string;

  @IsNotEmpty({
    message:
      'Attendance ID is required for all corrections except missed check-in',
  })
  @IsString()
  attendanceId?: string;
}
