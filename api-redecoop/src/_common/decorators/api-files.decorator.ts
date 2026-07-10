import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import multerConfig from '../config/multer.config';

export function ApiFiles(
  fieldName: string = 'files',
  maxCount: number = 10,
  localOptions?: MulterOptions,
) {
  return applyDecorators(
    UseInterceptors(
      FilesInterceptor(fieldName, maxCount, {
        ...multerConfig,
        ...localOptions
      }),
    ),
    ApiConsumes('multipart/form-data'),
  );
}
