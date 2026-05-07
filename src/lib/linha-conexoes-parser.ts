import * as XLSX from 'xlsx';
import type { SaleItem } from '@/types/sales';
import { getFamily } from '@/types/sales';

export const DEFAULT_LINHA_CODES: string[] = [];


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
    const cleaned = s.replace(/\./g, '').replace(',', '.');
    const n = Number(cleaned);
    if (isNaN(n)) return 0;
    return isNegative ? -n : n;
  }
  return 0;
}

export function parseLinhaVendas(buffer: ArrayBuffer): Array<{ code: string; unit: string; qty: number }> {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const results: Array<{ code: string; unit: string; qty: number }> = [];

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
      } else if (cell === 'quantidade' || cell === 'qtd' || cell === 'qty' || cell === 'qtde.') {
        qtyCol = j;
      }
    }
    if (startRow > 0) break;
  }
  
  if (startRow === 0) startRow = 4;

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const code = String(row[codeCol] ?? '').trim();
    const unitRaw = String(row[unitCol] ?? '').trim().toUpperCase();
    const qty = parseBrNumber(row[qtyCol]);
    
    if (code && qty !== 0) {
      results.push({ code, unit: unitRaw || 'UN', qty });
    }
  }
  return results;
}

export function parseLinhaCodes(buffer: ArrayBuffer): string[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const codes: string[] = [];

  let codeCol = 2; // Padrão: Coluna C
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    if (!row) continue;
    const found = row.findIndex(c => {
      const s = String(c ?? '').trim().toLowerCase();
      return s === 'código' || s === 'codigo';
    });
    if (found !== -1) {
      codeCol = found;
      break;
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const cell = String(row[codeCol] ?? '').trim();
    if (!cell || cell.toLowerCase() === 'código' || cell.toLowerCase() === 'codigo') continue;
    codes.push(cell);
  }
  
  console.log(`Parsed ${codes.length} codes from column index ${codeCol}`);
  
  return codes;
}

export function generateLinhaCodesTemplate(): void {
  const data = [['', '', 'Código']];
  // No default codes anymore
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Padrões');
  XLSX.writeFile(wb, 'padroes-linha-conexoes.xlsx');
}

export function processLinhaConexoes(
  sales: Array<{ code: string; unit: string; qty: number }>,
  targetCodes: string[],
  overrides: Record<string, number> = {}
): SaleItem[] {
  const itemsMap = new Map<string, SaleItem>();

  for (const sale of sales) {
    if (targetCodes.includes(sale.code)) {
      // Allow override qty or use parsed qty
      const finalQty = overrides[sale.code] !== undefined ? overrides[sale.code] : sale.qty;
      
      if (itemsMap.has(sale.code)) {
        const existing = itemsMap.get(sale.code)!;
        existing.quantity += finalQty;
        existing.totalUN += finalQty;
      } else {
        itemsMap.set(sale.code, {
          code: sale.code,
          unitOrigin: sale.unit,
          quantity: finalQty,
          qtyPerBag: 1, // Não utilizamos qtyPerBag aqui, cada item é 1 UN
          totalUN: finalQty,
          family: getFamily(sale.code),
        });
      }
    }
  }

  // Converter para array e adicionar os targetCodes que vieram zerados
  const items = Array.from(itemsMap.values());
  
  for (const code of targetCodes) {
    if (!itemsMap.has(code)) {
      items.push({
        code,
        unitOrigin: 'UN',
        quantity: 0,
        qtyPerBag: 1,
        totalUN: 0,
        family: getFamily(code),
      });
    }
  }

  return items.sort((a, b) => b.totalUN - a.totalUN);
}
