// src/auth/dto/change-password.dto.ts
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  confirmPassword: string;
}
