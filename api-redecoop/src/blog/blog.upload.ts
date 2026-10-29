import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { memoryStorage } from 'multer';
import { MulterError } from 'multer';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function blogMulterOptions() {
  return {
    storage: memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES },
  };
}

@Catch(MulterError)
export class BlogUploadExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const message =
      exception.code === 'LIMIT_FILE_SIZE'
        ? 'A imagem excede o limite de 8 MB.'
        : 'Falha ao receber a imagem.';
    response.status(400).json({ statusCode: 400, message });
  }
}
