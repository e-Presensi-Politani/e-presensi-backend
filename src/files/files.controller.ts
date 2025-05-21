// src/files/files.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  BadRequestException,
  Get,
  Param,
  Res,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileCategory } from './interfaces/file-category.enum';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          // Dynamically set destination based on file category
          const category = req.body.category || 'other';
          const dest = `./uploads/${category.toLowerCase()}`;
          cb(null, dest);
        },
        filename: (req, file, cb) => {
          const uniqueId = uuidv4();
          const fileExt = extname(file.originalname);
          const sanitizedOriginalName = file.originalname
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9.-]/g, '')
            .toLowerCase();
          cb(null, `${uniqueId}-${sanitizedOriginalName}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Check file type
        if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
          return cb(
            new BadRequestException(
              'Only JPG, JPEG, PNG, and PDF files are allowed',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadFile(
    @Request() req,
    @UploadedFile() file,
    @Query() uploadFileDto: UploadFileDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Validate category
    try {
      const category = uploadFileDto.category || FileCategory.OTHER;

      // Store file metadata in the database
      return this.filesService.saveFileMetadata({
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        category,
        userId: req.user.guid,
        relatedId: uploadFileDto.relatedId,
      });
    } catch (error) {
      throw new BadRequestException(
        `Invalid file category: ${uploadFileDto.category}`,
      );
    }
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('category') category?: FileCategory,
    @Query('relatedId') relatedId?: string,
  ) {
    return this.filesService.findAll({
      userId: req.user.guid,
      category,
      relatedId,
    });
  }

  @Get(':guid')
  async findOne(@Param('guid') guid: string) {
    return this.filesService.findOne(guid);
  }

  @Get(':guid/download')
  async download(@Param('guid') guid: string, @Res() res: Response) {
    const file = await this.filesService.findOne(guid);
    return res.sendFile(file.path, { root: './' });
  }

  @Public()
  @Get(':guid/view')
  async view(@Param('guid') guid: string, @Res() res: Response) {
    const file = await this.filesService.findOne(guid);
    res.setHeader('Content-Type', file.mimeType);
    return res.sendFile(file.path, { root: './' });
  }
}
