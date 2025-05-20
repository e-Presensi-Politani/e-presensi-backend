import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  Get,
  Param,
  Delete,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { FilesService } from '../files/files.service';
import { FileCategory } from '../files/interfaces/file-category.enum';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Controller('users/profile-photo')
@UseGuards(JwtAuthGuard)
export class ProfilePhotoController {
  constructor(
    private readonly usersService: UsersService,
    private readonly filesService: FilesService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/profile',
        filename: (req, file, cb) => {
          const uniqueId = uuidv4();
          const fileExt = extname(file.originalname);
          cb(null, `profile-${uniqueId}${fileExt}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Check if file is an image
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(
            new BadRequestException(
              'Only JPG, JPEG, and PNG files are allowed',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
      },
    }),
  )
  async uploadProfilePhoto(@Request() req, @UploadedFile() file) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Store file metadata in the database
    const savedFile = await this.filesService.saveFileMetadata({
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      category: FileCategory.PROFILE,
      userId: req.user.guid,
    });

    // Update user's profile image reference
    await this.usersService.updateProfilePhoto(req.user.guid, savedFile.guid);

    return {
      message: 'Profile photo uploaded successfully',
      file: savedFile,
    };
  }

  @Get(':userGuid')
  async getProfilePhoto(@Param('userGuid') userGuid: string) {
    try {
      const user = await this.usersService.findOne(userGuid);

      if (!user.profileImage) {
        throw new NotFoundException('Profile photo not found');
      }

      const file = await this.filesService.findOne(user.profileImage);
      return file;
    } catch (error) {
      throw new NotFoundException('Profile photo not found');
    }
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  async removeProfilePhoto(@Request() req) {
    const user = await this.usersService.findOne(req.user.guid);

    if (!user.profileImage) {
      throw new NotFoundException('No profile photo to delete');
    }

    // Delete the file
    await this.filesService.deleteFile(user.profileImage, req.user.guid);

    // Remove the profile image reference from user
    await this.usersService.updateProfilePhoto(req.user.guid, null);

    return {
      message: 'Profile photo removed successfully',
    };
  }
}
