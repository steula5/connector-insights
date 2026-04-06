import * as XLSX from 'xlsx';
import type { ConnectorRef, SaleItem } from '@/types/sales';
import { getFamily } from '@/types/sales';

function parseBrNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // Brazilian format: "1.234,56" → 1234.56
    const cleaned = val.replace(/\./g, '').replace(',', '.');
    const n = Number(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

export function parseTotalDoMes(buffer: ArrayBuffer): Array<{ code: string; unit: string; qty: number }> {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const results: Array<{ code: string; unit: string; qty: number }> = [];

  // Find header row dynamically (look for "Código" or "UN" in columns)
  let startRow = 0;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (!row) continue;
    const col0 = String(row[0] ?? '').trim().toLowerCase();
    if (col0 === 'código' || col0 === 'codigo') {
      startRow = i + 1;
      break;
    }
  }
  // Fallback: start at row 4 if no header found
  if (startRow === 0) startRow = 4;

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const code = String(row[0] ?? '').trim();
    const unit = String(row[5] ?? '').trim().toUpperCase();
    const qty = parseBrNumber(row[7]);
    if (code && qty !== 0 && (unit === 'SC' || unit === 'UN')) {
      results.push({ code, unit, qty });
    }
  }
  return results;
}

export function parseCalculoMensal(buffer: ArrayBuffer): ConnectorRef[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const results: ConnectorRef[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const code = String(row[1] ?? '').trim();
    const qtyPerBag = parseBrNumber(row[2]);
    if (code && qtyPerBag > 0) {
      results.push({ code, qtyPerBag });
    }
  }
  return results;
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
