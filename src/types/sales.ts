export interface ConnectorRef {
  code: string;
  qtyPerBag: number;
}

export interface SaleItem {
  code: string;
  unitOrigin: string; // SC, UN, etc
  quantity: number;
  qtyPerBag: number;
  totalUN: number;
  family: string;
}

export interface MonthData {
  year: number;
  month: number;
  items: SaleItem[];
  totalUN: number;
  totalSKUs: number;
  topItem: string;
  avgPerItem: number;
  importedAt: string;
}

export interface HistoryData {
  [year: string]: {
    [month: string]: MonthData;
  };
}

export interface EspiralItem {
  code: string;
  description: string;
  type: 'ESPIRAL' | 'TUBO PU' | 'OUTROS';
  unit: string;
  qty: number;
  lengthPerUnit: number;
  totalLength: number;
}

export interface EspiraisMonthData {
  year: number;
  month: number;
  items: EspiralItem[];
  totalLength: number;
  totalSKUs: number;
  topItem: string;
  importedAt: string;
}

export interface EspiraisHistoryData {
  [year: string]: {
    [month: string]: EspiraisMonthData;
  };
}

export interface FamilyImage {
  [prefix: string]: string; // base64 data URL
}

export function getFamily(code: string): string {
  const parts = code.trim().split(/[\s-]/);
  return parts[0]?.toUpperCase() || 'OTHER';
}

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
