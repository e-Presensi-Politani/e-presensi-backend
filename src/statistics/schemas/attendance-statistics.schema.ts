// src/statistics/schemas/attendance-statistics.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum PeriodType {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

export class Period {
  @Prop({ required: true, enum: PeriodType })
  type: PeriodType;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;
}

@Schema({ timestamps: true })
export class AttendanceStatistics extends Document {
  @Prop({ default: uuidv4, index: true })
  guid: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  departmentId: string;

  @Prop({ required: true, type: Period })
  period: Period;

  @Prop({ required: true })
  totalWorkingDays: number;

  @Prop({ required: true, default: 0 })
  presentDays: number;

  @Prop({ required: true, default: 0 })
  lateDays: number;

  @Prop({ required: true, default: 0 })
  earlyCheckoutDays: number;

  @Prop({ required: true, default: 0 })
  leaveDays: number;

  @Prop({ required: true, default: 0 })
  wfhDays: number;

  @Prop({ required: true, default: 0 })
  wfaDays: number;

  @Prop({ required: true, default: 0 })
  dlDays: number;

  @Prop({ required: true, default: 0 })
  correctionDays: number;

  @Prop({ required: true, default: 0 })
  averageWorkingHours: number;
}

export const AttendanceStatisticsSchema = SchemaFactory.createForClass(AttendanceStatistics);