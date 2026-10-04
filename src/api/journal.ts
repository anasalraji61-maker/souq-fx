import { apiClient } from './client';

export type TradeEmotion =
  | 'disciplined' // منضبط
  | 'confident'   // واثق
  | 'fomo'        // خوف الفوات (FOMO)
  | 'fearful'     // متردد / خائف
  | 'greedy'      // طمع
  | 'revenge';    // انتقام (Revenge)

export const EMOTION_LABELS: Record<TradeEmotion, { label: string; color: string }> = {
  disciplined: { label: 'انضباط والتزام', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800' },
  confident: { label: 'ثقة هادئة', color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800' },
  fomo: { label: 'خوف الفوات (FOMO)', color: 'text-amber-400 bg-amber-950/60 border-amber-800' },
  fearful: { label: 'تردد وخوف', color: 'text-purple-400 bg-purple-950/60 border-purple-800' },
  greedy: { label: 'طمع وإفراط عقد', color: 'text-orange-400 bg-orange-950/60 border-orange-800' },
  revenge: { label: 'تداول انتقامي', color: 'text-rose-400 bg-rose-950/60 border-rose-800' },
};

export interface JournalEntry {
  id: string;
  date: string;
  symbol: string;
  direction: 'buy' | 'sell';
  entry_price: number;
  exit_price: number;
  lots: number;
  pnl: number;
  tags: string[];
  emotion: TradeEmotion;
  notes?: string;
  screenshot_url?: string;
}

export interface TagStats {
  tag: string;
  count: number;
  win_rate: number;
  total_pnl: number;
}

export interface JournalStats {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  profit_factor: number;
  by_tag: TagStats[];
}

const STORAGE_JOURNAL_KEY = 'matrix_journal_entries';

// Fixed IDs and patterns for identifying any previously seeded demo trades
const SEED_TRADE_IDS = new Set([
  'tr-001',
  'tr-002',
  'tr-003',
  'tr-004',
  'tr-005',
  'tr-1',
  'tr-2',
  'tr-3',
  'tr-4',
  'tr-5',
  'tr-01',
  'tr-02',
  'tr-03',
  'tr-04',
  'tr-05',
  'trade-1',
  'trade-2',
  'trade-3',
  'trade-4',
  'trade-5',
  'tr-seed-1',
  'tr-seed-2',
  'tr-seed-3',
  'tr-seed-4',
  'tr-seed-5',
  'seed-1',
  'seed-2',
  'seed-3',
  'seed-4',
  'seed-5',
  'demo-1',
  'demo-2',
  'demo-3',
  'demo-4',
  'demo-5',
]);

export function isSeedTrade(e: any): boolean {
  if (!e || typeof e !== 'object') return false;
  if (e.is_seed || e.isSeed || e.is_demo || e.isDemo || e.seed || e.demo) return true;
  if (typeof e.id === 'string') {
    const id = e.id.toLowerCase().trim();
    if (SEED_TRADE_IDS.has(id)) return true;
    if (id.startsWith('tr-seed') || id.startsWith('seed-') || id.includes('seed-trade')) return true;
    if (id.startsWith('demo-') || id.includes('demo-trade')) return true;
    if (/^tr-00[1-9]$/.test(id) || /^tr-[1-9]$/.test(id) || /^trade-[1-9]$/.test(id)) return true;
  }
  return false;
}

export function purgeSeededTradesFromStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToCheck = [
      STORAGE_JOURNAL_KEY,
      'matrix_journal_entries',
      'matrix_trade_journal',
      'trade_journal',
      'journal_entries',
      'matrix_trades',
    ];

    keysToCheck.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter((e) => !isSeedTrade(e));
          if (clean.length !== parsed.length) {
            localStorage.setItem(key, JSON.stringify(clean));
          }
        }
      } catch {}
    });

    ['matrix_trade_journal', 'trade_journal'].forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
  } catch {}
}

// Immediately purge on module load
purgeSeededTradesFromStorage();

function getStoredEntries(): JournalEntry[] {
  try {
    purgeSeededTradesFromStorage();

    const raw = localStorage.getItem(STORAGE_JOURNAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out any seeded entries by their fixed IDs or seed flag
        const clean = parsed.filter((e) => e && e.id && !isSeedTrade(e));
        // If seeded entries were purged, update localStorage immediately
        if (clean.length !== parsed.length) {
          saveStoredEntries(clean);
        }
        return clean;
      }
    }
  } catch {}
  return [];
}

function saveStoredEntries(entries: JournalEntry[]) {
  try {
    localStorage.setItem(STORAGE_JOURNAL_KEY, JSON.stringify(entries));
  } catch {}
}

export function computeStatsLocally(entries: JournalEntry[]): JournalStats {
  const total = entries.length;
  const wins = entries.filter((e) => e.pnl > 0);
  const losses = entries.filter((e) => e.pnl < 0);
  const winRate = total > 0 ? (wins.length / total) * 100 : 0;
  const totalPnl = entries.reduce((acc, e) => acc + e.pnl, 0);

  const grossProfit = wins.reduce((acc, e) => acc + e.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((acc, e) => acc + e.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

  // By tag
  const tagMap = new Map<string, { count: number; wins: number; pnl: number }>();
  entries.forEach((e) => {
    e.tags.forEach((tag) => {
      const cur = tagMap.get(tag) || { count: 0, wins: 0, pnl: 0 };
      cur.count++;
      if (e.pnl > 0) cur.wins++;
      cur.pnl += e.pnl;
      tagMap.set(tag, cur);
    });
  });

  const byTag: TagStats[] = Array.from(tagMap.entries()).map(([tag, data]) => ({
    tag,
    count: data.count,
    win_rate: data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0,
    total_pnl: parseFloat(data.pnl.toFixed(2)),
  }));

  // Sort by count descending
  byTag.sort((a, b) => b.count - a.count);

  return {
    total_trades: total,
    winning_trades: wins.length,
    losing_trades: losses.length,
    win_rate: parseFloat(winRate.toFixed(1)),
    total_pnl: parseFloat(totalPnl.toFixed(2)),
    profit_factor: parseFloat(profitFactor.toFixed(2)),
    by_tag: byTag,
  };
}

export async function fetchJournalEntries(): Promise<{
  entries: JournalEntry[];
  isOffline: boolean;
}> {
  purgeSeededTradesFromStorage();
  const res = await apiClient.get<JournalEntry[]>('/api/journal/entries');
  if (res.ok && Array.isArray(res.data)) {
    const clean = res.data.filter((e) => !isSeedTrade(e));
    saveStoredEntries(clean);
    return { entries: clean, isOffline: false };
  }
  return { entries: getStoredEntries(), isOffline: true };
}

export async function createJournalEntry(
  entryData: Omit<JournalEntry, 'id'>
): Promise<{ ok: boolean; entry: JournalEntry; isOffline: boolean }> {
  const res = await apiClient.post<JournalEntry>('/api/journal/entries', entryData);

  if (res.ok && res.data) {
    const stored = getStoredEntries();
    saveStoredEntries([res.data, ...stored.filter((e) => e.id !== res.data?.id)]);
    return { ok: true, entry: res.data, isOffline: false };
  }

  // Local fallback
  const newEntry: JournalEntry = {
    ...entryData,
    id: `local-tr-${Date.now()}`,
  };
  const stored = getStoredEntries();
  saveStoredEntries([newEntry, ...stored]);
  return { ok: true, entry: newEntry, isOffline: true };
}

export async function updateJournalEntry(
  entryId: string,
  entryData: Partial<JournalEntry>
): Promise<{ ok: boolean; entry?: JournalEntry; isOffline: boolean }> {
  const res = await apiClient.patch<JournalEntry>(`/api/journal/entries/${entryId}`, entryData);

  const stored = getStoredEntries();
  const existingIdx = stored.findIndex((e) => e.id === entryId);

  if (res.ok && res.data) {
    if (existingIdx !== -1) {
      stored[existingIdx] = res.data;
      saveStoredEntries(stored);
    }
    return { ok: true, entry: res.data, isOffline: false };
  }

  if (existingIdx !== -1) {
    stored[existingIdx] = { ...stored[existingIdx], ...entryData };
    saveStoredEntries(stored);
    return { ok: true, entry: stored[existingIdx], isOffline: true };
  }

  return { ok: false, isOffline: true };
}

export async function deleteJournalEntry(
  entryId: string
): Promise<{ ok: boolean; isOffline: boolean }> {
  const res = await apiClient.delete(`/api/journal/entries/${entryId}`);

  const stored = getStoredEntries();
  const next = stored.filter((e) => e.id !== entryId);
  saveStoredEntries(next);

  return { ok: true, isOffline: !res.ok };
}

export async function fetchJournalStats(): Promise<{
  stats: JournalStats;
  isOffline: boolean;
}> {
  const localEntries = getStoredEntries();
  if (localEntries.length === 0) {
    return { stats: computeStatsLocally([]), isOffline: false };
  }
  const res = await apiClient.get<JournalStats>('/api/journal/stats');
  if (res.ok && res.data && res.data.by_tag) {
    return { stats: res.data, isOffline: false };
  }
  return { stats: computeStatsLocally(localEntries), isOffline: true };
}
