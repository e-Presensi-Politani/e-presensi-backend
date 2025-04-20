// src/files/cleanup.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FilesService } from './files.service';
import { FileCategory } from './interfaces/file-category.enum';

@Injectable()
export class FileCleanupService {
  private readonly logger = new Logger(FileCleanupService.name);

  constructor(private readonly filesService: FilesService) {}

  // Run every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupTemporaryFiles() {
    this.logger.log('Running temporary files cleanup job');

    // Delete temporary files older than 24 hours
    const olderThan = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    try {
      const deletedCount = await this.filesService.deleteOldTempFiles(
        olderThan,
        FileCategory.PERMISSION,
      );

      this.logger.log(`Cleaned up ${deletedCount} temporary permission files`);
    } catch (error) {
      this.logger.error('Error cleaning up temporary files', error);
    }
  }
}
