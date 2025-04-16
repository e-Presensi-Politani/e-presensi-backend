// src/attendance/dto/check-in.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CheckInDto {
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  accuracy?: number;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // Note: photo will be handled via file upload
}