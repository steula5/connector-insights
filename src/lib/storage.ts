import type { HistoryData, FamilyImage, MonthData } from '@/types/sales';

const HISTORY_KEY = 'connector-sales-history';
const IMAGES_KEY = 'connector-family-images';

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
