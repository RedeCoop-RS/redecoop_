import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { ApiConsumes } from '@nestjs/swagger';
import multerConfig from '../config/multer.config';

export function ApiFile(fieldName: string = 'file', localOptions?: MulterOptions) {
  return applyDecorators(
    UseInterceptors(FileInterceptor(fieldName, { ...multerConfig, ...localOptions })),
    ApiConsumes('multipart/form-data'),
  );
}
