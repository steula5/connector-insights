import * as XLSX from 'xlsx';
import type { ConnectorRef, SaleItem } from '@/types/sales';
import { getFamily } from '@/types/sales';

export function parseTotalDoMes(buffer: ArrayBuffer): Array<{ code: string; unit: string; qty: number }> {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const results: Array<{ code: string; unit: string; qty: number }> = [];

  for (let i = 6; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const code = String(row[0] ?? '').trim();
    const unit = String(row[5] ?? '').trim().toUpperCase();
    const qty = Number(row[7]) || 0;
    if (code && qty > 0 && (unit === 'SC' || unit === 'UN')) {
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
    const qtyPerBag = Number(row[2]) || 0;
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
    const baseQty = refMap.get(sale.code);
    if (baseQty === undefined) continue;

    const qtyPerBag = overrides[sale.code] ?? baseQty;
    const totalUN = sale.unit === 'SC' ? sale.qty * qtyPerBag : sale.qty;

    items.push({
      code: sale.code,
      unitOrigin: sale.unit,
      quantity: sale.qty,
      qtyPerBag,
      totalUN,
      family: getFamily(sale.code),
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
