import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseTotalDoMes } from '@/lib/excel-parser';

function buildWorkbook(rows: unknown[][]): ArrayBuffer {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Planilha1');
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

describe('parseTotalDoMes', () => {
  it('mantem quantidades negativas como devolucao e ignora zero', () => {
    const buffer = buildWorkbook([
      ['Código', '', '', '', '', 'UN', '', 'Quantidade'],
      ['ABC-01', '', '', '', '', 'SC', '', 3],
      ['ABC-02', '', '', '', '', 'UN', '', -4],
      ['ABC-03', '', '', '', '', 'UN', '', 0],
      ['ABC-04', '', '', '', '', 'KG', '', -2],
    ]);

    expect(parseTotalDoMes(buffer)).toEqual([
      { code: 'ABC-01', unit: 'SC', qty: 3 },
      { code: 'ABC-02', unit: 'UN', qty: -4 },
    ]);
  });
});