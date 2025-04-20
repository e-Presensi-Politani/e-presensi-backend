// src/corrections/dto/update-correction.dto.ts
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CorrectionStatus } from '../schemas/correction.schema';

export class UpdateCorrectionDto {
  @IsNotEmpty()
  @IsEnum(CorrectionStatus)
  status: CorrectionStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
