// src/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum UserRole {
  ADMIN = 'admin',
  DOSEN = 'dosen',
  KAJUR = 'kajur',
}

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ default: () => uuidv4() })
  guid: string;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, unique: true })
  nip: string;

  @Prop()
  phoneNumber: string;

  @Prop()
  profileImage: string;

  @Prop({ enum: UserRole, default: UserRole.DOSEN })
  role: string;

  @Prop()
  department: string;

  @Prop()
  position: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object })
  additionalInfo: {
    birthDate?: string;
    address?: string;
    emergencyContact?: string;
  };

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add this hook to hide the password from responses
UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});
