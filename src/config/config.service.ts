// src/config/config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { GeoLocation } from 'src/common/interfaces/geo-location.interface';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  // Server Configuration
  get port(): number {
    return this.configService.get<number>('port')!;
  }

  get nodeEnv(): string {
    return this.configService.get<string>('nodeEnv')!;
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get apiPrefix(): string {
    return this.configService.get<string>('apiPrefix')!;
  }

  // Database Configuration
  get databaseUri(): string {
    const uri = this.configService.get<string>('database.uri');
    if (!uri) {
      console.error('MongoDB URI is not defined in configuration!');
      return 'mongodb://localhost:27017/e-presensi-politani'; // Fallback
    }
    return uri;
  }

  get databaseOptions(): Record<string, any> {
    return this.configService.get<Record<string, any>>('database.options')!;
  }

  // JWT Configuration
  get jwtSecret(): string {
    return this.configService.get<string>('jwt.secret')!;
  }

  get jwtExpiration(): string {
    return this.configService.get<string>('jwt.accessExpiration')!;
  }

  get jwtRefreshSecret(): string {
    return this.configService.get<string>('jwt.refreshSecret')!;
  }

  get jwtRefreshExpiration(): string {
    return this.configService.get<string>('jwt.refreshExpiration')!;
  }

  // File Upload Configuration
  get profileImageDir(): string {
    return this.configService.get<string>('fileUpload.profileImageDir')!;
  }

  get attendancePhotoDir(): string {
    return this.configService.get<string>('fileUpload.attendancePhotoDir')!;
  }

  get leaveAttachmentDir(): string {
    return this.configService.get<string>('fileUpload.leaveAttachmentDir')!;
  }

  get maxFileSize(): number {
    return this.configService.get<number>('fileUpload.maxFileSize')!;
  }

  get allowedMimeTypes(): string[] {
    return this.configService.get<string[]>('fileUpload.allowedMimeTypes')!;
  }

  // Attendance Configuration
  get lateToleranceMinutes(): number {
    return this.configService.get<number>('attendance.lateToleranceMinutes')!;
  }

  get earlyLeaveToleranceMinutes(): number {
    return this.configService.get<number>(
      'attendance.earlyLeaveToleranceMinutes',
    )!;
  }

  get minWorkHoursForFullDay(): number {
    return this.configService.get<number>('attendance.minWorkHoursForFullDay')!;
  }

  // Email Configuration
  get emailConfig(): any {
    return this.configService.get<any>('email');
  }

  // Application Info
  get appName(): string {
    return this.configService.get<string>('app.name')!;
  }

  get appVersion(): string {
    return this.configService.get<string>('app.version')!;
  }

  get frontendUrl(): string {
    return this.configService.get<string>('app.frontendUrl')!;
  }

  get backendUrl(): string {
    return this.configService.get<string>('app.backendUrl')!;
  }

  // Storage Configuration
  get storageType(): string {
    return this.configService.get<string>('storage.type')!;
  }

  get s3Config(): any {
    return this.configService.get<any>('storage.s3');
  }

  // Add these properties to your ConfigService class:

  // Reference point for geofencing (office location)
  get referencePoint(): GeoLocation {
    return {
      latitude: parseFloat(process.env.OFFICE_LATITUDE || '0'),
      longitude: parseFloat(process.env.OFFICE_LONGITUDE || '0'),
    };
  }

  // Radius for geofence in meters
  get geofenceRadius(): number {
    return parseInt(process.env.GEOFENCE_RADIUS || '100', 10);
  }
}
