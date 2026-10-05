import { PriceAlertItem } from '../types/market';
import { apiClient } from './client';

const STORAGE_KEY = 'matrix.alerts';

export async function loadAlerts(): Promise<PriceAlertItem[]> {
  // 1. Try backend endpoint first
  const res = await apiClient.get<PriceAlertItem[]>('/api/alerts-compat');
  if (res.ok && Array.isArray(res.data)) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
    } catch {}
    return res.data;
  }

  // 2. LocalStorage fallback
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Alerts API] Error loading alerts from localStorage:', err);
  }

  // Default initial demo alert for EURUSD
  return [
    {
      id: 'alert-1',
      symbol: 'EURUSD',
      targetPrice: 1.0900,
      condition: 'crosses_up',
      note: 'اختراق المقاومة 1.0900',
      active: true,
      triggered: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'alert-2',
      symbol: 'XAUUSD',
      targetPrice: 2750.0,
      condition: 'greater_than',
      note: 'الذهب فوق 2750$',
      active: true,
      triggered: false,
      createdAt: new Date().toISOString(),
    },
  ];
}

export async function saveAlerts(alerts: PriceAlertItem[]): Promise<void> {
  // 1. Save to localStorage immediately
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch (err) {
    console.warn('[Alerts API] Error saving alerts to localStorage:', err);
  }

  // 2. Attempt backend persistence
  try {
    await apiClient.post('/api/alerts-compat', alerts);
  } catch {}
}
