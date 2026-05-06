import * as XLSX from 'xlsx';
import type { ConnectorRef, SaleItem } from '@/types/sales';
import { getFamily } from '@/types/sales';

function parseBrNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    let s = val.trim();
    let isNegative = false;
    if (s.startsWith('(') && s.endsWith(')')) {
      isNegative = true;
      s = s.slice(1, -1).trim();
    } else if (s.startsWith('-')) {
      isNegative = true;
      s = s.slice(1).trim();
    }
    // Brazilian format: "1.234,56" → 1234.56
    const cleaned = s.replace(/\./g, '').replace(',', '.');
    const n = Number(cleaned);
    if (isNaN(n)) return 0;
    return isNegative ? -n : n;
  }
  return 0;
}

export function parseTotalDoMes(buffer: ArrayBuffer): Array<{ code: string; unit: string; qty: number }> {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const results: Array<{ code: string; unit: string; qty: number }> = [];

  console.log('Sheet names:', wb.SheetNames);
  console.log('First 10 rows:', rows.slice(0, 10));

  // Find header row dynamically (look for "Código" or "UN" in columns)
  let startRow = 0;
  let codeCol = 0;
  let unitCol = 5;
  let qtyCol = 7;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (!row) continue;
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] ?? '').trim().toLowerCase();
      if (cell === 'código' || cell === 'codigo') {
        startRow = i + 1;
        codeCol = j;
      } else if (cell === 'un') {
        unitCol = j;
      } else if (cell === 'quantidade' || cell === 'qtd' || cell === 'qty') {
        qtyCol = j;
      }
    }
    if (startRow > 0) break;
  }
  // If no "Código" found, look for "UN" to find unit column
  if (startRow === 0) {
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i];
      if (!row) continue;
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] ?? '').trim().toLowerCase();
        if (cell === 'un') {
          unitCol = j;
          startRow = i + 1;
          break;
        }
      }
      if (startRow > 0) break;
    }
  }
  // Fallback: start at row 4 if no header found
  if (startRow === 0) startRow = 4;

  console.log('Start row:', startRow, 'codeCol:', codeCol, 'unitCol:', unitCol, 'qtyCol:', qtyCol);

  console.log('Start row:', startRow);

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const code = String(row[codeCol] ?? '').trim();
    const unitRaw = String(row[unitCol] ?? '').trim().toUpperCase();
    const unit = unitRaw === 'SC' ? 'SC' : 'UN';
    const qty = parseBrNumber(row[qtyCol]);
    console.log('Row', i, 'code:', code, 'unit:', unit, 'qty:', qty);
    if (code && qty !== 0) {
      results.push({ code, unit, qty });
    }
  }
  return results;
}

export type CalculoMensalParseResult = {
  refs: ConnectorRef[];
  totalRows: number;
  scannedRows: number;
  detectedCodeRows: number;
  loadedRefs: number;
};

export function parseCalculoMensal(buffer: ArrayBuffer): CalculoMensalParseResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const results: ConnectorRef[] = [];

  let startRow = 1;
  let codeCol = 1;
  let qtyCol = 2;
  const codeHeaders = ['código', 'codigo', 'cod', 'referencia', 'referência', 'sku'];
  const qtyHeaders = ['qtd', 'quantidade', 'qty', 'qty/bag', 'qtyp/bag', 'qnt', 'qnt/bag'];

  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    if (!row) continue;
    let foundHeader = false;

    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] ?? '').trim().toLowerCase();
      if (codeHeaders.includes(cell)) {
        codeCol = j;
        foundHeader = true;
      }
      if (qtyHeaders.includes(cell)) {
        qtyCol = j;
        foundHeader = true;
      }
    }

    if (foundHeader) {
      startRow = i + 1;
      break;
    }
  }

  console.log('parseCalculoMensal - sheet names:', wb.SheetNames);
  console.log('parseCalculoMensal - total rows:', rows.length, 'startRow:', startRow, 'codeCol:', codeCol, 'qtyCol:', qtyCol);

  let scannedRows = 0;
  let detectedRows = 0;
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    scannedRows += 1;
    const code = String(row[codeCol] ?? '').trim();
    const qtyPerBag = parseBrNumber(row[qtyCol]);
    if (code) detectedRows += 1;
    if (code && qtyPerBag > 0) {
      results.push({ code, qtyPerBag });
    }
  }

  console.log('parseCalculoMensal - scannedRows:', scannedRows, 'detectedCodeRows:', detectedRows, 'loadedRefs:', results.length);
  return {
    refs: results,
    totalRows: rows.length,
    scannedRows,
    detectedCodeRows: detectedRows,
    loadedRefs: results.length,
  };
}

export function crossReference(
  sales: Array<{ code: string; unit: string; qty: number }>,
  refs: ConnectorRef[],
  overrides: Record<string, number> = {}
): SaleItem[] {
  const refMap = new Map(refs.map(r => [r.code, r.qtyPerBag]));
  const items: SaleItem[] = [];

  for (const sale of sales) {
    // Try exact match first
    let matchCode = sale.code;
    let baseQty = refMap.get(matchCode);

    // If no exact match, try stripping the last suffix (e.g., "HVFF 06-06-5" → "HVFF 06-06")
    if (baseQty === undefined) {
      const lastDash = matchCode.lastIndexOf('-');
      if (lastDash > 0) {
        const stripped = matchCode.substring(0, lastDash);
        const strippedQty = refMap.get(stripped);
        if (strippedQty !== undefined) {
          matchCode = stripped;
          baseQty = strippedQty;
        }
      }
    }

    if (baseQty === undefined) continue;

    const qtyPerBag = overrides[matchCode] ?? baseQty;
    const totalUN = sale.unit === 'SC' ? sale.qty * qtyPerBag : sale.qty;

    items.push({
      code: matchCode,
      unitOrigin: sale.unit,
      quantity: sale.qty,
      qtyPerBag,
      totalUN,
      family: getFamily(matchCode),
    });
  }

  return items.sort((a, b) => b.totalUN - a.totalUN);
}

export function exportToExcel(items: SaleItem[], filename: string) {
  const data = items.map(i => ({
    'Código': i.code,
    'Unidade Origem': i.unitOrigin,
    'Quantidade': i.quantity,
    'QTY/BAG': i.qtyPerBag,
    'Total UN': i.totalUN,
    'Família': i.family,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
  XLSX.writeFile(wb, filename);
}
