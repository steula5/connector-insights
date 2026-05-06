import type { HistoryData, FamilyImage, MonthData, EspiraisHistoryData, EspiraisMonthData } from '@/types/sales';

const HISTORY_KEY = 'connector-sales-history';
const IMAGES_KEY = 'connector-family-images';
const LINHA_HISTORY_KEY = 'connector-linha-history';
const ESPIRAIS_HISTORY_KEY = 'connector-espirais-history';

export function loadHistory(): HistoryData {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
  } catch { return {}; }
}

export function saveHistory(data: HistoryData) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
}

export function saveMonthData(month: MonthData) {
  const history = loadHistory();
  const y = String(month.year);
  const m = String(month.month);
  if (!history[y]) history[y] = {};
  history[y][m] = month;
  saveHistory(history);
}

export function loadFamilyImages(): FamilyImage {
  try {
    return JSON.parse(localStorage.getItem(IMAGES_KEY) || '{}');
  } catch { return {}; }
}

export function saveFamilyImages(images: FamilyImage) {
  localStorage.setItem(IMAGES_KEY, JSON.stringify(images));
}

export function exportHistoryJSON(): string {
  return JSON.stringify(loadHistory(), null, 2);
}

export function importHistoryJSON(json: string): HistoryData {
  const data = JSON.parse(json);
  saveHistory(data);
  return data;
}

export function loadLinhaHistory(): HistoryData {
  try {
    return JSON.parse(localStorage.getItem(LINHA_HISTORY_KEY) || '{}');
  } catch { return {}; }
}

export function saveLinhaHistory(data: HistoryData) {
  localStorage.setItem(LINHA_HISTORY_KEY, JSON.stringify(data));
}

export function saveLinhaMonthData(month: MonthData) {
  const history = loadLinhaHistory();
  const y = String(month.year);
  const m = String(month.month);
  if (!history[y]) history[y] = {};
  history[y][m] = month;
  saveLinhaHistory(history);
}

export function exportLinhaHistoryJSON(): string {
  return JSON.stringify(loadLinhaHistory(), null, 2);
}

export function importLinhaHistoryJSON(json: string): HistoryData {
  const data = JSON.parse(json);
  saveLinhaHistory(data);
  return data;
}

export function loadEspiraisHistory(): EspiraisHistoryData {
  try {
    return JSON.parse(localStorage.getItem(ESPIRAIS_HISTORY_KEY) || '{}');
  } catch { return {}; }
}

export function saveEspiraisHistory(data: EspiraisHistoryData) {
  localStorage.setItem(ESPIRAIS_HISTORY_KEY, JSON.stringify(data));
}

export function saveEspiraisMonthData(month: EspiraisMonthData) {
  const history = loadEspiraisHistory();
  const y = String(month.year);
  const m = String(month.month);
  if (!history[y]) history[y] = {};
  history[y][m] = month;
  saveEspiraisHistory(history);
}

export function exportEspiraisHistoryJSON(): string {
  return JSON.stringify(loadEspiraisHistory(), null, 2);
}

export function importEspiraisHistoryJSON(json: string): EspiraisHistoryData {
  const data = JSON.parse(json);
  saveEspiraisHistory(data);
  return data;
}
