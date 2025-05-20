// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ProfilePhotoController } from './profile-photo.controller';
import { User, UserSchema } from './schemas/user.schema';
import { ConfigModule } from '../config/config.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ConfigModule,
    FilesModule,
  ],
  controllers: [UsersController, ProfilePhotoController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
