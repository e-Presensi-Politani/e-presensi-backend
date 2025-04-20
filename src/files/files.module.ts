// src/files/files.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { File, FileSchema } from './schemas/file.schema';
import { ConfigModule } from '../config/config.module';
import { existsSync, mkdirSync } from 'fs';
import { FileCleanupService } from './cleanup.service';
import { ScheduleModule } from '@nestjs/schedule';

// Create upload directories if they don't exist
const uploadDirectories = [
  './uploads',
  './uploads/attendance',
  './uploads/permission',
  './uploads/profile',
  './uploads/other',
];

uploadDirectories.forEach((dir) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
});

@Module({
  imports: [
    MongooseModule.forFeature([{ name: File.name, schema: FileSchema }]),
    MulterModule.register({
      dest: './uploads',
    }),
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [FilesController],
  providers: [FilesService, FileCleanupService],
  exports: [FilesService],
})
export class FilesModule {}
