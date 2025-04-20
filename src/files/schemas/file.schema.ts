// src/files/schemas/file.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { FileCategory } from '../interfaces/file-category.enum';

export type FileDocument = File & Document;

@Schema({ timestamps: true })
export class File {
  @Prop({ type: String, default: () => uuidv4() })
  guid: string;

  @Prop({ type: String, required: true })
  fileName: string;

  @Prop({ type: String, required: true })
  originalName: string;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: Number, required: true })
  size: number;

  @Prop({ type: String, required: true })
  path: string;

  @Prop({ type: String, enum: FileCategory, default: FileCategory.OTHER })
  category: FileCategory;

  @Prop({ type: String, required: true, ref: 'User' })
  userId: string;

  @Prop({ type: String })
  relatedId: string;

  @Prop({ type: Boolean, default: false })
  isTemporary: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const FileSchema = SchemaFactory.createForClass(File);
