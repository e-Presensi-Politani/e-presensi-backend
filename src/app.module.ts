// src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DepartmentsModule } from './departments/departments.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.databaseUri;
        return {
          uri,
        };
      },
    }),
    UsersModule,
    AuthModule,
    DepartmentsModule,
    AttendanceModule,
    LeaveRequestsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
