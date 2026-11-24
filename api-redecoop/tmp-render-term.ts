import { promises as fs } from 'fs';
import { CooperationTermExportService } from './src/cooperationTerm/cooperationTerm-export.service';
import { CooperationTerm } from './src/cooperationTerm/entities/cooperationTerm.entity';

type Coop = [string, number[]];
const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const ODD = [1, 3, 5, 7, 9, 11];
const EVEN = [2, 4, 6, 8, 10, 12];
const ids: Record<string, number> = { CAAF: 1, COOPVIDA: 2, COOMAFITT: 3, 'NOSSA TERRA': 4 };

const rows: [number, string, number, Coop[]][] = [
  [1, 'AIPIM HIGIENIZADO', 11880, [['CAAF', [5, 6, 7, 8]], ['COOPVIDA', [1, 2, 3, 4]], ['COOMAFITT', [9, 10, 11, 12]]]],
  [2, 'ALFACE HIGIENIZADA', 23580, [['CAAF', ODD], ['COOMAFITT', EVEN]]],
  [3, 'ALHO FEMEA HIGIENIZADO', 1296, [['CAAF', ALL]]],
  [4, 'ALHO MACHO HIGIENIZADO', 3060, [['CAAF', ALL]]],
  [5, 'BATATA DOCE HIGIENIZADA', 12960, [['CAAF', EVEN], ['COOMAFITT', ODD]]],
  [6, 'BATATA INGLESA EM CUBOS/PALITO/RODELAS/PALHA', 34560, [['CAAF', ODD], ['NOSSA TERRA', EVEN]]],
  [7, 'BATATA INGLESA HIGIENIZADA', 41400, [['CAAF', EVEN], ['NOSSA TERRA', ODD]]],
  [8, 'BERINJELA HIGIENIZADA', 5000, []],
  [9, 'BETERRABA HIGIENIZADA EM CUBOS/PALITO/PALHA/RODELAS', 19200, [['CAAF', [9, 10, 11, 12]], ['COOMAFITT', [5, 6, 7, 8]], ['NOSSA TERRA', [1, 2, 3, 4]]]],
  [10, 'BRÓCOLIS HIGIENIZADO', 17880, [['CAAF', [1, 2, 7, 8]], ['COOMAFITT', [5, 6, 11, 12]], ['NOSSA TERRA', [3, 4, 9, 10]]]],
  [11, 'CEBOLA HIGIENIZADA', 19440, [['CAAF', [1, 2, 5, 6, 9, 10]], ['NOSSA TERRA', [3, 4, 7, 8, 11, 12]]]],
  [12, 'CEBOLA HIGIENIZADA EM CUBOS/RODELAS', 38400, [['CAAF', [3, 4, 7, 8, 11, 12]], ['NOSSA TERRA', [1, 2, 5, 6, 9, 10]]]],
  [13, 'CENOURA EM CUBOS/PALITO/PALHA/RODELAS', 40800, [['CAAF', [9, 10, 11, 12]], ['COOMAFITT', [5, 6, 7, 8]], ['NOSSA TERRA', [1, 2, 3, 4]]]],
  [14, 'CENOURA HIGIENIZADA', 18840, [['CAAF', [1, 2, 3, 4]], ['COOMAFITT', [5, 6, 7, 8]], ['NOSSA TERRA', [9, 10, 11, 12]]]],
  [15, 'CHICÓRIA HIGIENIZADA', 780, [['CAAF', [5, 6, 7, 8, 9, 10, 11, 12]]]],
  [16, 'CHUCHU EM CUBOS/PALITO/PALHA/ RODELAS', 28440, [['CAAF', [1, 2, 7, 8]], ['COOMAFITT', [5, 6, 11, 12]], ['NOSSA TERRA', [3, 4, 9, 10]]]],
  [17, 'CHUCHU HIGIENIZADO', 3600, [['CAAF', [5, 6, 11, 12]], ['COOMAFITT', [3, 4, 9, 10]], ['NOSSA TERRA', [1, 2, 7, 8]]]],
  [18, 'COUVE CHINESA HIGIENIZADA', 3360, [['CAAF', [3, 4, 9, 10]], ['COOMAFITT', [5, 6]], ['NOSSA TERRA', [1, 2, 7, 8, 11, 12]]]],
  [19, 'COUVE-FLOR HIGIENIZADA', 10980, [['CAAF', [3, 4, 7, 8, 11]], ['COOMAFITT', [5, 6, 9, 10, 12]]]],
  [20, 'COUVE VERDE HIGIENIZADA', 8760, [['CAAF', [5, 6, 11, 12]], ['COOMAFITT', [3, 4, 9, 10]], ['NOSSA TERRA', [1, 2, 7, 8]]]],
  [21, 'ESPINAFRE HIGIENIZADO', 4620, [['CAAF', [1, 2, 5, 6, 9, 10]], ['COOMAFITT', [3, 4, 7, 8, 11, 12]]]],
  [22, 'ITEM SEM COOPERATIVA', 900, []],
  [23, 'MORANGA CABOTIÁ HIGIENIZADA', 15840, [['CAAF', [5, 6, 11, 12]], ['COOMAFITT', [3, 4, 9, 10]], ['NOSSA TERRA', [1, 2, 7, 8]]]],
  [24, 'MORANGA CABOTIÁ PARA CARAMELAR', 11400, [['CAAF', [1, 2, 7, 8]], ['COOMAFITT', [5, 6, 11, 12]], ['NOSSA TERRA', [3, 4, 9, 10]]]],
  [25, 'MORANGA VERMELHA EM CUBOS', 20400, [['CAAF', ALL]]],
  [26, 'MORANGA VERMELHA HIGIENIZADA', 7200, [['CAAF', ALL]]],
  [27, 'RÚCULA HIGIENIZADA', 4080, [['CAAF', [1, 2, 3, 11, 12]]]],
  [28, 'TEMPERO VERDE HIGIENIZADO', 2160, [['CAAF', [5, 6, 11, 12]], ['COOMAFITT', [1, 2, 7, 8]], ['NOSSA TERRA', [3, 4, 9, 10]]]],
  [29, 'VAGEM EM CUBOS', 14040, [['CAAF', [1, 2, 3, 10, 11, 12]]]],
  [30, 'VAGEM HIGIENIZADA', 1200, [['CAAF', [1, 2, 3, 10, 11, 12]]]],
];

const term = {
  id: 99,
  version: 1,
  name: 'Edital de Chamada Pública GHC - MINIMAMENTE PROCESSADOS/HIGIENZADOS',
  processNumber: '1809/26',
  buyerInstitution: 'Grupo Hospitalar Conceição',
  model: 'GHC',
  status: 'SIGNED',
  signedAt: new Date(),
  hospitalUnits: [],
  items: rows.map(([itemNumber, description, total, coops], index) => ({
    id: index + 1,
    position: index + 1,
    itemNumber,
    description,
    unit: 'KG',
    estimatedQuantity: total,
    unitPrice: null,
    totalPrice: null,
    hospitalQuantities: [],
    allocations: coops.map(([name]) => ({
      cooperativeId: ids[name],
      quantity: total / coops.length,
      cooperative: { fantasyName: name },
    })),
    supplyMonths: coops.map(([name, months]) => ({ cooperativeId: ids[name], months })),
  })),
} as unknown as CooperationTerm;

async function main() {
  const out = process.argv[2];
  const exporter = new CooperationTermExportService();
  for (const kind of ['term', 'division'] as const) {
    const pdf = await exporter.pdf(term, kind);
    await fs.writeFile(`${out}\\${pdf.filename}`, Buffer.from(pdf.contentBase64, 'base64'));
    const excel = await exporter.excel(term, kind);
    await fs.writeFile(`${out}\\${excel.filename}`, Buffer.from(excel.contentBase64, 'base64'));
    console.log(pdf.filename, excel.filename);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
