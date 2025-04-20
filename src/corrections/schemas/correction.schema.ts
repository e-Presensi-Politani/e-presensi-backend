// src/corrections/schemas/correction.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type CorrectionDocument = Correction & Document;

export enum CorrectionType {
  BREAK_TIME_AS_WORK = 'BREAK_TIME_AS_WORK',
  EARLY_DEPARTURE = 'EARLY_DEPARTURE',
  LATE_ARRIVAL = 'LATE_ARRIVAL',
  MISSED_CHECK_IN = 'MISSED_CHECK_IN',
  MISSED_CHECK_OUT = 'MISSED_CHECK_OUT',
}

export enum CorrectionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true })
export class Correction {
  save(): Correction | PromiseLike<Correction> {
    throw new Error('Method not implemented.');
  }
  @Prop({ type: String, default: () => uuidv4() })
  guid: string;

  @Prop({ type: String, required: true, ref: 'User' })
  userId: string;

  @Prop({ type: String, required: true, ref: 'User' })
  departmentId: string;

  @Prop({ type: String, required: true, enum: CorrectionType })
  type: CorrectionType;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: String, required: true })
  reason: string;

  @Prop({
    type: String,
    enum: CorrectionStatus,
    default: CorrectionStatus.PENDING,
  })
  status: CorrectionStatus;

  @Prop({ type: String, ref: 'User' })
  reviewedBy: string;

  @Prop({ type: Date })
  reviewedAt: Date;

  @Prop({ type: String })
  rejectionReason: string;

  @Prop({ type: String, ref: 'Attendance' })
  attendanceId: string;

  // For MISSED_CHECK_IN and MISSED_CHECK_OUT corrections
  @Prop({ type: Date })
  proposedTime: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const CorrectionSchema = SchemaFactory.createForClass(Correction);
