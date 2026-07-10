import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import * as uuid from 'uuid';

@Injectable()
export class ReportService {
  constructor(
  ) {}

  async generateExcell(title: string, headers: any[], content: any[], filters?: string[]) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet 1');

    worksheet.addRow([title]);
    worksheet.mergeCells(1, 1, 1, headers.length);
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.addRow([]);
    worksheet.addRow(headers.map((column) => column.name));

    content.forEach((productData) => {
      const row = headers.map((header) => productData[header.key]);
      worksheet.addRow(row);
    });

    worksheet.columns.forEach((column) => {
      const validValues = column.values.filter(
        (cell: any) => typeof cell === 'string' || typeof cell === 'number',
      );

      const maxLength = validValues.reduce((max: number, value: any) => {
        const length = typeof value === 'string' ? value.length : String(value).length;
        return Math.max(max, length);
      }, 0);

      column.width = Math.min(Number(maxLength) + 2, 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return await this.saveReport(buffer);
  }

  async saveReport(excelBuffer: ExcelJS.Buffer) {
    const fileName = `${uuid.v4()}.xlsx`;
    const filePath = path.join(__dirname, '..', '..', 'upload/reports', fileName);

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, new Uint8Array(excelBuffer));

    return fileName;
  }
}
