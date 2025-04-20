// src/files/dto/upload-file.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FileCategory } from '../interfaces/file-category.enum';

export class UploadFileDto {
  @IsOptional()
  @IsEnum(FileCategory, { message: 'Invalid file category' })
  category?: FileCategory;

  @IsOptional()
  @IsString()
  relatedId?: string;
}
