// departments/dto/update-department.dto.ts
import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class UpdateDepartmentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  headId?: string;

  @IsArray()
  @IsOptional()
  memberIds?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}