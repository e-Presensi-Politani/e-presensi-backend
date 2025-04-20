// src/files/interfaces/file-metadata.interface.ts
import { FileCategory } from './file-category.enum';

export interface FileMetadata {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  category: FileCategory;
  userId: string;
  relatedId?: string;
  isTemporary?: boolean;
}
