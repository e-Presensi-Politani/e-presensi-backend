import { IsString, IsNotEmpty } from 'class-validator';

export class AssignHeadDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}