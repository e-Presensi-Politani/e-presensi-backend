import { IsArray, IsNotEmpty, ArrayMinSize } from 'class-validator';

export class AddMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty()
  userIds: string[];
}