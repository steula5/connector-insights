import * as XLSX from 'xlsx';
import type { SaleItem } from '@/types/sales';

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

export interface EspiralItem {
  code: string;
  description: string;
  type: 'ESPIRAL' | 'TUBO PU' | 'OUTROS';
  unit: string;
  qty: number;         // quantidade vendida
  lengthPerUnit: number; // metragem por unidade
  totalLength: number;   // metragem total vendida
}

export function parseEspiraisCodes(buffer: ArrayBuffer): string[] {
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
  
  console.log(`Parsed ${codes.length} espirais codes from column index ${codeCol}`);
  return codes;
}

export function generateEspiraisCodesTemplate(): void {
  const data = [['', '', 'Código']];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Padrões');
  XLSX.writeFile(wb, 'padroes-espirais-tubos.xlsx');
}

export function parseEspirais(buffer: ArrayBuffer, targetCodes: string[] = []): EspiralItem[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const results: EspiralItem[] = [];

  let startRow = 0;
  let codeCol = 0;
  let descCol = 2;
  let unitCol = 5;
  let qtyCol = 7;

  // Find headers
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (!row) continue;
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] ?? '').trim().toLowerCase();
      if (cell === 'código' || cell === 'codigo') {
        startRow = i + 1;
        codeCol = j;
      } else if (cell === 'descrição' || cell === 'descricao') {
        descCol = j;
      } else if (cell === 'un' || cell === 'un.') {
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
    const desc = String(row[descCol] ?? '').trim().toUpperCase();
    const unitRaw = String(row[unitCol] ?? '').trim().toUpperCase();
    const qty = parseBrNumber(row[qtyCol]);
    
    if (!code || qty === 0) continue;
    
    // Se targetCodes estiver preenchido, filtrar apenas os que estão na lista
    if (targetCodes.length > 0 && !targetCodes.includes(code)) continue;

    let type: 'ESPIRAL' | 'TUBO PU' | 'OUTROS' = 'OUTROS';
    let lengthPerUnit = 0;

    // Função local para tentar extrair via código
    const extractFromCode = (c: string) => {
      const validEspiralLengths = [2.5, 3.5, 5.0, 8.0, 10.0, 15.0, 20.0];
      const isValidEspiral = (l: number) => validEspiralLengths.includes(l);

      // 1. Tubo PU: SPU 10-100 -> 100
      let match = c.match(/^SPU\s+\d+\s*-\s*(\d+)/);
      if (match) return { type: 'TUBO PU', len: parseBrNumber(match[1]) };

      // 2. Espiral MS com 'D': MS 4-25D ou MS 4 -50D -> 25 / 10 = 2.5
      match = c.match(/^MS\s+\d+\s*-\s*(\d+)D/);
      if (match) {
        const len = parseBrNumber(match[1]) / 10;
        if (isValidEspiral(len)) return { type: 'ESPIRAL', len };
      }

      // 3. Espiral com 'B': B80 G-G ou B150 PU -> 80 / 10 = 8.0
      match = c.match(/^B(\d+)\b/);
      if (match) {
        const len = parseBrNumber(match[1]) / 10;
        if (isValidEspiral(len)) return { type: 'ESPIRAL', len };
      }

      // 4. Espiral com número direto: 25 PU, 50 D-D -> 25 / 10 = 2.5
      match = c.match(/^(\d+)\s+(?:PU|D-D|D-E|E-E)\b/);
      if (match) {
        const len = parseBrNumber(match[1]) / 10;
        if (isValidEspiral(len)) return { type: 'ESPIRAL', len };
      }

      // 5. Espiral MS com 'P': MS 4-P35 ou MS 15-P35-A -> 35 / 10 = 3.5
      match = c.match(/^MS\s+\d+\s*-P(\d+)/);
      if (match) {
        const len = parseBrNumber(match[1]) / 10;
        if (isValidEspiral(len)) return { type: 'ESPIRAL', len };
      }

      return null;
    };

    const codeExtracted = extractFromCode(code);

    if (codeExtracted) {
      type = codeExtracted.type as 'ESPIRAL' | 'TUBO PU';
      lengthPerUnit = codeExtracted.len;
    } else {
      // Fallback para a Descrição caso não ache no código, mas tenha a palavra chave
      const validEspiralLengths = [2.5, 3.5, 5.0, 8.0, 10.0, 15.0, 20.0];
      
      if (desc.includes('ESPIRAL')) {
        const match = desc.match(/(\d+(?:,\d+)?)\s*M(?:\s|-|$)/);
        if (match && match[1]) {
          const len = parseBrNumber(match[1]);
          if (validEspiralLengths.includes(len)) {
            type = 'ESPIRAL';
            lengthPerUnit = len;
          }
        }
      } else if (desc.includes('TUBO PU')) {
        const lastDashIndex = code.lastIndexOf('-');
        if (lastDashIndex !== -1) {
          const lastPart = code.substring(lastDashIndex + 1);
          const parsedLen = parseBrNumber(lastPart);
          if (parsedLen > 0) {
            type = 'TUBO PU';
            lengthPerUnit = parsedLen;
          }
        }
      }
    }

    if (type !== 'OUTROS' || targetCodes.includes(code)) {
      results.push({
        code,
        description: desc,
        type,
        unit: unitRaw || 'UN',
        qty,
        lengthPerUnit,
        totalLength: qty * lengthPerUnit
      });
    }
  }

  // Aggregate results by code/desc so we don't have duplicates
  const aggregated = new Map<string, EspiralItem>();
  for (const item of results) {
    const key = item.code;
    if (aggregated.has(key)) {
      const existing = aggregated.get(key)!;
      existing.qty += item.qty;
      existing.totalLength += item.totalLength;
    } else {
      aggregated.set(key, item);
    }
  }

  const resultList = Array.from(aggregated.values()).sort((a, b) => b.totalLength - a.totalLength);
  console.log(`Matched ${resultList.length} items from sales report`);
  return resultList;
}

