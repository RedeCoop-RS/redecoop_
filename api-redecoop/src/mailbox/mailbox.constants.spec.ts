import { safeFilename, uploadedFilename } from './mailbox.constants';

describe('uploadedFilename', () => {
  it('corrige o nome UTF-8 que o multer leu como latin1', () => {
    const asMulterGives = Buffer.from('relatório-ação.pdf', 'utf8').toString('latin1');
    expect(uploadedFilename(asMulterGives)).toBe('relatório-ação.pdf');
    expect(safeFilename(uploadedFilename(asMulterGives))).toBe('relatório-ação.pdf');
  });

  it('mantém nomes ASCII e nomes já decodificados', () => {
    expect(uploadedFilename('planilha.xlsx')).toBe('planilha.xlsx');
    expect(uploadedFilename('naïve – ação.txt')).toBe('naïve – ação.txt');
    expect(uploadedFilename(undefined)).toBe('');
  });

  it('não estraga um nome latin1 legítimo que não é UTF-8 válido', () => {
    expect(uploadedFilename('caf\u00e9.txt')).toBe('café.txt');
  });
});
