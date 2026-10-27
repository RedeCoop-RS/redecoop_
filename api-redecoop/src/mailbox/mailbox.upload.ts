import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { MulterError } from 'multer';
import { mailboxUploadDir, maxAttachmentBytes } from './mailbox.constants';

export function mailboxMulterOptions() {
  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = mailboxUploadDir();
        mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const extension = extname(file.originalname || '').slice(0, 12);
        cb(null, `${randomUUID()}${extension}`);
      },
    }),
    limits: { fileSize: maxAttachmentBytes() },
  };
}

@Catch(MulterError)
export class MailboxUploadExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const message =
      exception.code === 'LIMIT_FILE_SIZE'
        ? 'O anexo excede o tamanho máximo permitido.'
        : 'Falha ao receber o anexo.';
    response.status(400).json({ statusCode: 400, message });
  }
}
