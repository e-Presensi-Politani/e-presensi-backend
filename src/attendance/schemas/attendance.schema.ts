// src/attendance/schemas/attendance.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { WorkingStatus } from '../../common/interfaces/working-status.enum';
import { GeoLocation } from '../../common/interfaces/geo-location.interface';

export type AttendanceDocument = Attendance & Document;

class LocationRecord {
  @Prop({ type: Number, required: true })
  latitude: number;

  @Prop({ type: Number, required: true })
  longitude: number;

  @Prop({ type: Number })
  accuracy?: number;

  @Prop({ type: String })
  provider?: string;
}

@Schema({ timestamps: true })
export class Attendance {
  @Prop({ type: String, default: () => uuidv4() })
  guid: string;

  @Prop({ type: String, required: true, ref: 'User' })
  userId: string;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: Date })
  checkInTime: Date;

  @Prop({ type: LocationRecord })
  checkInLocation: LocationRecord;

  @Prop({ type: String, ref: 'File' })
  checkInPhotoId: string;

  @Prop({ type: String })
  checkInNotes: string;

  @Prop({ type: Date })
  checkOutTime: Date;

  @Prop({ type: LocationRecord })
  checkOutLocation: LocationRecord;

  @Prop({ type: String, ref: 'File' })
  checkOutPhotoId: string;

  @Prop({ type: String })
  checkOutNotes: string;

  @Prop({ type: Number })
  workHours: number;

  @Prop({ type: String, enum: WorkingStatus, default: WorkingStatus.ABSENT })
  status: string;

  @Prop({ type: Boolean, default: false })
  verified: boolean;

  @Prop({ type: String })
  verifiedBy: string;

  @Prop({ type: Date })
  verifiedAt: Date;

  @Prop({ type: String })
  departmentId: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ type: Boolean, default: false })
  isManualCheckIn: boolean;

  @Prop({ type: Boolean, default: false })
  isManualCheckOut: boolean;

  @Prop({ type: String })
  correctionId: string; // Reference to the correction that modified this attendance
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);
