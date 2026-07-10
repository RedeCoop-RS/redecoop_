import { Injectable, OnModuleInit } from '@nestjs/common';
import { FileSystemStoredFile } from 'nestjs-form-data';
import { promises as fs } from 'fs';
import { extname, join } from 'path';


@Injectable()
export class UploadService {

    private readonly dir = join('.', 'upload');

    async moveFile(file?: FileSystemStoredFile): Promise<{ fileName: string, patch: string } | null> {
        if (!file) {
            return null;
        }
        const extension = extname(file.originalName);
        const newFilename = `${Date.now() + '-' + Math.round(Math.random() * 1E9)}${extension}`;
        const targetPath = join(this.dir, newFilename);
        try {
            await fs.rename(file.path, targetPath);
        } catch (error) {
            throw new Error('Erro ao mover o arquivo: ' + error.message);
        }

        return { fileName: newFilename, patch: targetPath };
    }

}