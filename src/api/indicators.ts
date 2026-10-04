import { IndicatorInstance } from '../types/market';

export function getDefaultIndicators(): IndicatorInstance[] {
  return [
    {
      id: 'default-ema-20',
      type: 'ema',
      name: 'EMA 20',
      nameAr: 'المتوسط الأسي 20',
      params: { period: 20 },
      color: '#2DD4BF',
      visible: true,
      pane: 'main',
    },
    {
      id: 'default-ema-50',
      type: 'ema',
      name: 'EMA 50',
      nameAr: 'المتوسط الأسي 50',
      params: { period: 50 },
      color: '#F59E0B',
      visible: true,
      pane: 'main',
    },
    {
      id: 'default-rsi-14',
      type: 'rsi',
      name: 'RSI 14',
      nameAr: 'مؤشر القوة النسبية 14',
      params: { period: 14 },
      color: '#A78BFA',
      visible: true,
      pane: 'sub',
    },
  ];
}

export function loadCellIndicators(cellId: string): IndicatorInstance[] {
  const key = `matrix.indicators.${cellId}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`[Indicators API] Error loading indicators for ${cellId}:`, err);
  }
  return getDefaultIndicators();
}

export function saveCellIndicators(cellId: string, instances: IndicatorInstance[]): void {
  const key = `matrix.indicators.${cellId}`;
  try {
    localStorage.setItem(key, JSON.stringify(instances));
  } catch (err) {
    console.warn(`[Indicators API] Error saving indicators for ${cellId}:`, err);
  }
}
