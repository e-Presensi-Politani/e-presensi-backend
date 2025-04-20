// src/files/files.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { File, FileDocument } from './schemas/file.schema';
import { FileMetadata } from './interfaces/file-metadata.interface';
import { FileCategory } from './interfaces/file-category.enum';
import { FileQueryDto } from './dto/file-query.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(File.name)
    private fileModel: Model<FileDocument>,
  ) {}

  /**
   * Save file metadata to database
   * @param fileMetadata File metadata
   * @returns Saved file document
   */
  async saveFileMetadata(fileMetadata: FileMetadata): Promise<File> {
    const file = new this.fileModel(fileMetadata);
    return file.save();
  }

  /**
   * Update file relation (associate file with a resource)
   * @param fileGuid File GUID
   * @param relatedId Related resource ID
   * @returns Updated file document
   */
  async updateFileRelation(fileGuid: string, relatedId: string): Promise<File> {
    const file = await this.fileModel.findOne({ guid: fileGuid }).exec();

    if (!file) {
      throw new NotFoundException(`File with GUID ${fileGuid} not found`);
    }

    file.relatedId = relatedId;
    return file.save();
  }

  /**
   * Find all files based on query parameters
   * @param queryDto Query parameters
   * @returns Array of file documents
   */
  async findAll(queryDto: FileQueryDto): Promise<File[]> {
    const query: any = {};

    if (queryDto.userId) {
      query.userId = queryDto.userId;
    }

    if (queryDto.category) {
      query.category = queryDto.category;
    }

    if (queryDto.relatedId) {
      query.relatedId = queryDto.relatedId;
    }

    return this.fileModel.find(query).sort({ createdAt: -1 }).exec();
  }

  /**
   * Find a single file by GUID
   * @param guid File GUID
   * @returns File document
   */
  async findOne(guid: string): Promise<File> {
    const file = await this.fileModel.findOne({ guid }).exec();

    if (!file) {
      throw new NotFoundException(`File with GUID ${guid} not found`);
    }

    return file;
  }

  /**
   * Delete a file by GUID
   * @param guid File GUID
   * @param userId User GUID (for permission checking)
   * @returns Deleted file document
   */
  async deleteFile(guid: string, userId: string): Promise<File> {
    const file = await this.findOne(guid);

    // Check if user owns this file
    if (file.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this file',
      );
    }

    // Delete physical file
    try {
      fs.unlinkSync(file.path);
    } catch (error) {
      // If file doesn't exist on disk, continue with deletion from database
      console.warn(`Physical file not found: ${file.path}`);
    }

    // Delete from database
    await this.fileModel.deleteOne({ guid }).exec();
    return file;
  }

  /**
   * Get file URL for a given file GUID
   * @param fileGuid File GUID
   * @param baseUrl Base URL of the application
   * @returns URL to access the file
   */
  getFileUrl(fileGuid: string, baseUrl: string): string {
    return `${baseUrl}/files/${fileGuid}/view`;
  }

  /**
   * Delete old temporary files (cleanup job)
   * @param olderThan Time threshold in milliseconds
   * @param category Optional category to limit deletion
   * @returns Number of deleted files
   */
  async deleteOldTempFiles(
    olderThan: number,
    category?: FileCategory,
  ): Promise<number> {
    const query: any = {
      createdAt: { $lt: new Date(Date.now() - olderThan) },
      isTemporary: true,
    };

    if (category) {
      query.category = category;
    }

    const filesToDelete = await this.fileModel.find(query).exec();

    // Delete physical files
    filesToDelete.forEach((file) => {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.warn(`Could not delete physical file: ${file.path}`);
      }
    });

    // Delete from database
    const result = await this.fileModel.deleteMany(query).exec();
    return result.deletedCount;
  }
}
