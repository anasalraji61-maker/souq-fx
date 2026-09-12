import type { ChartSeries, ChatMsg, Course, NewsItem, Vote } from './api';
import type { Timeframe } from './timeframes';
import { mockAcademySchools } from './academy';

export const mockCourses: Course[] = mockAcademySchools.map((s) => ({
  id: s.id,
  school: s.name_ar,
  title: s.name_ar,
  level: `${s.levels_count} مستويات`,
  lessons: s.lectures_count,
  ai_tutor: true,
  progress: 0,
  desc: s.summary,
}));

const TF_SECONDS: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1H': 3600,
  '4H': 14400,
  D: 86400,
  W: 604800,
};

export function mockSeries(
  symbol: string,
  base: number,
  timeframe: Timeframe | string = '15m',
  n = 60
): ChartSeries {
  const step = TF_SECONDS[timeframe] ?? 900;
  let price = base;
  const candles = [];
  const t0 = Math.floor(Date.now() / 1000) - n * step;
  const volScale = Math.sqrt(step / 900);
  for (let i = 0; i < n; i++) {
    const o = price;
    const c =
      o *
      (1 +
        Math.sin(i / 8) * 0.0012 * volScale +
        ((i * 17) % 7) * 0.00015 * volScale -
        0.0004 * volScale);
    const h = Math.max(o, c) * (1 + 0.0008 * volScale);
    const l = Math.min(o, c) * (1 - 0.0008 * volScale);
    candles.push({
      time: t0 + i * step,
      open: +o.toFixed(5),
      high: +h.toFixed(5),
      low: +l.toFixed(5),
      close: +c.toFixed(5),
      volume: Math.abs(c - o) * 1e6 * (0.5 + (i % 9) / 10) + 1200,
    });
    price = c;
  }
  const first = candles[0].close;
  const last = candles[candles.length - 1].close;
  return {
    symbol,
    timeframe,
    candles,
    change_pct: +(((last - first) / first) * 100).toFixed(2),
    last: +last.toFixed(symbol === 'DXY' || symbol === 'XAUUSD' ? 2 : 5),
    data_source: { kind: 'demo', as_of: Date.now() / 1000, channel: 'mock' },
  };
}

function walk(symbol: string, base: number, n = 60): ChartSeries {
  return mockSeries(symbol, base, '15m', n);
}

export const mockTerminal = {
  dxy: walk('DXY', 104.25),
  frames: [walk('EURUSD', 1.0854), walk('GBPUSD', 1.2732), walk('XAUUSD', 2348.6)],
  frame_sizes: ['small', 'medium', 'large'] as string[],
};

export const mockChat: ChatMsg[] = [
  { id: '1', user: 'أحمد', text: 'DXY يكسر 104.2 — راقبوا EURUSD', ts: '21:02' },
  { id: '2', user: 'سارة', text: 'تصويتي شراء GBPUSD على الريتست', ts: '21:05' },
  { id: '3', user: 'كريم', text: 'خبر CPI بعد ساعة — حجم منخفض', ts: '21:08' },
];

export const mockVotes: Vote[] = [
  {
    id: 'v1',
    symbol: 'EURUSD',
    direction: 'sell',
    entry: 1.0862,
    sl: 1.0895,
    tp: 1.079,
    note: 'رفض عند المقاومة + DXY صاعد',
    agree: 18,
    disagree: 5,
    author: 'أحمد',
    ts: '21:00',
  },
  {
    id: 'v2',
    symbol: 'XAUUSD',
    direction: 'buy',
    entry: 2348.5,
    sl: 2335,
    tp: 2372,
    note: 'دعم أسبوعي',
    agree: 12,
    disagree: 9,
    author: 'سارة',
    ts: '20:50',
  },
];

export const mockNews: NewsItem[] = [
  {
    id: 'n1',
    impact: 'high',
    title: 'قرار الفائدة الفيدرالي — توقع تثبيت',
    pair_effect: 'DXY / EURUSD / XAUUSD',
    when: 'اليوم 21:00',
  },
  {
    id: 'n2',
    impact: 'high',
    title: 'CPI الأمريكي',
    pair_effect: 'USD pairs',
    when: 'غداً 15:30',
  },
  {
    id: 'n3',
    impact: 'medium',
    title: 'خطاب عضو فيدرالي',
    pair_effect: 'DXY',
    when: 'اليوم 18:00',
  },
];

export const mockPeers = [
  { user: 'سارة', last: 'شفت السيولة عند 1.0850؟', ts: '20:40' },
  { user: 'كريم', last: 'أرسلتك سيناريو الذهب', ts: '19:15' },
  { user: 'أحمد', last: 'جاهز للجلسة؟', ts: '18:02' },
];
