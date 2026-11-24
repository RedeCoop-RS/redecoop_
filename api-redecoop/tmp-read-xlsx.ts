import * as ExcelJS from 'exceljs';

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(process.argv[2]);
  for (const sheet of workbook.worksheets) {
    console.log(`# ${sheet.name} rows=${sheet.rowCount} cols=${sheet.columnCount}`);
    const merges = (sheet.model as { merges?: string[] }).merges ?? [];
    console.log('merges', merges.length, merges.slice(0, 14).join(' '));
    console.log('images', sheet.getImages().length);
    for (let row = 1; row <= Math.min(sheet.rowCount, 12); row++) {
      const values = (sheet.getRow(row).values as unknown[]).slice(1).map((value) => (value === null || value === undefined ? '' : String(value)));
      console.log(row, values.join(' | '));
    }
    const qty = sheet.getCell('D7');
    console.log('D7 numFmt', qty.numFmt, 'value', qty.value);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
