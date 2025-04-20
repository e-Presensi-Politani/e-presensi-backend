// src/files/dto/file-query.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FileCategory } from '../interfaces/file-category.enum';

export class FileQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @IsOptional()
  @IsString()
  relatedId?: string;
}
