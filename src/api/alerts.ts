import { PriceAlertItem } from '../types/market';

const STORAGE_KEY = 'matrix.alerts';

export async function loadAlerts(): Promise<PriceAlertItem[]> {
  // 1. Try backend endpoint first
  try {
    const res = await fetch('/api/alerts');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {}
        return data;
      }
    }
  } catch {
    // Silent fallback to localStorage
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
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alerts),
    });
  } catch {
    // Silent fail
  }
}
