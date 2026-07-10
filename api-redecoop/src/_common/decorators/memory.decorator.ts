import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

export function MemoryStorageFileDecorator(fieldName: string = 'files', maxCount: number = 5) {
  return FilesInterceptor(fieldName, maxCount, {
    storage: memoryStorage(),
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB por arquivo
      files: maxCount
    },
    fileFilter: (req, file, cb) => {
      cb(null, true);
    }
  });
}