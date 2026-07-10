import { UnsupportedMediaTypeException } from '@nestjs/common';
import { Request } from 'express';

export function fileMimetypeFilter(...mimetypes: string[]) {
  return (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (mimetypes.some((m) => file.mimetype.includes(m))) {
      return callback(null, true);
    } else {
      req.unpipe();
      req.resume();
      return callback(
        new UnsupportedMediaTypeException(
            `Tipo de arquivo não aceito. Aceitos: ${mimetypes.join(', ')}`,
        ),
        false,
    );
    }
  };
}
