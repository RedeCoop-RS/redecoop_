import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  MulterField,
  MulterOptions,
} from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { ApiConsumes } from '@nestjs/swagger';
import multerConfig from '../config/multer.config';

export type UploadFields = MulterField & { required?: boolean };

export function ApiFileFields(uploadFields: UploadFields[], localOptions?: MulterOptions) {
  return applyDecorators(
    UseInterceptors(FileFieldsInterceptor(uploadFields, { ...multerConfig, ...localOptions })),
    ApiConsumes('multipart/form-data'),
  );
}
