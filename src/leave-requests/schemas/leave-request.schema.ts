import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum LeaveRequestType {
  LEAVE = 'LEAVE',           // Cuti
  WFH = 'WFH',               // Work From Home
  WFA = 'WFA',               // Work From Anywhere
  DL = 'DL',                 // Dinas Luar
}

export enum LeaveRequestStatus {
  PENDING = 'PENDING',       // Menunggu persetujuan
  APPROVED = 'APPROVED',     // Disetujui
  REJECTED = 'REJECTED',     // Ditolak
}

@Schema({ timestamps: true })
export class LeaveRequest extends Document {
  @Prop({ type: String, default: uuidv4 })
  guid: string;

  @Prop({ required: true, type: String })
  userId: string;

  @Prop({ required: true, type: String })
  departmentId: string;

  @Prop({ required: true, enum: LeaveRequestType })
  type: LeaveRequestType;

  @Prop({ required: true, type: Date })
  startDate: Date;

  @Prop({ required: true, type: Date })
  endDate: Date;

  @Prop({ required: true, type: String })
  reason: string;

  @Prop({ type: String })
  attachmentUrl: string;

  @Prop({ required: true, enum: LeaveRequestStatus, default: LeaveRequestStatus.PENDING })
  status: LeaveRequestStatus;

  @Prop({ type: String })
  reviewedById: string;

  @Prop({ type: Date })
  reviewedAt: Date;

  @Prop({ type: String })
  comments: string;
}

export const LeaveRequestSchema = SchemaFactory.createForClass(LeaveRequest);

// Index for faster queries
LeaveRequestSchema.index({ userId: 1, status: 1 });
LeaveRequestSchema.index({ departmentId: 1, status: 1 });
LeaveRequestSchema.index({ startDate: 1, endDate: 1 });
LeaveRequestSchema.index({ guid: 1 }, { unique: true });