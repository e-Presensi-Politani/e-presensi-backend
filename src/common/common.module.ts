// src/common/common.module.ts
import { Module } from '@nestjs/common';
import { GeoService } from './services/geo.service';
import { DepartmentHeadGuard } from './guards/department-head.guard';
import { ConfigModule } from '../config/config.module';
import { DepartmentsModule } from '../departments/departments.module';

@Module({
  imports: [ConfigModule, DepartmentsModule],
  providers: [GeoService, DepartmentHeadGuard],
  exports: [GeoService, DepartmentHeadGuard],
})
export class CommonModule {}
