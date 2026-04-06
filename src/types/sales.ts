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
