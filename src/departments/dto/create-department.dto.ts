import { IsString, IsNotEmpty, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

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
