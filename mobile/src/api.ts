import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string };

/** على المتصفح المحلي نفضّل 127.0.0.1 حتى لا نعلق بـ IP شبكة قديم في app.json */
function resolveApiUrl(): string {
  const configured = extra.apiUrl || 'http://127.0.0.1:8110';
  // على React Native (Expo Go / Hermes) قد يكون window معرّفاً كـ polyfill
  // لكن window.location غير موجود إطلاقاً — لهذا نتحقق من location أيضاً
  // قبل قراءة hostname، وإلا يرمي التطبيق: "Cannot read property 'hostname' of undefined".
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:8110';
    }
  }
  return configured;
}

export const API_URL = resolveApiUrl();

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function authHeaders(): Record<string, string> {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

/** مزود | تجريبي | مخزن | غير معروف — لا تفترض مزوداً عند غياب الحقل */
export type DataOriginKind = 'provider' | 'demo' | 'cache' | 'unknown';

export type DataProvenance = {
  kind: DataOriginKind;
  /** unix seconds when this payload was produced / cached */
  as_of?: number | null;
  /** e.g. twelvedata | seed | mock | twelvedata_ws — never secrets */
  channel?: string | null;
};

export type ChartSeries = {
  symbol: string;
  timeframe: string;
  candles: Candle[];
  change_pct: number;
  last: number;
  data_source?: DataProvenance;
};

export type LiveTick = {
  price: number;
  source: DataProvenance;
};

export type Vote = {
  id: string;
  symbol: string;
  direction: 'buy' | 'sell';
  entry: number;
  sl: number;
  tp: number;
  note: string;
  agree: number;
  disagree: number;
  author: string;
  ts: string;
};

export type NewsItem = {
  id: string;
  impact: 'high' | 'medium' | 'low';
  title: string;
  pair_effect: string;
  when: string;
};

export type Course = {
  id: string;
  school: string;
  title: string;
  level: string;
  lessons: number;
  ai_tutor: boolean;
  progress: number;
  desc: string;
};

export type PriceAlert = {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  price: number;
  note: string;
  active: boolean;
  triggered: boolean;
  ts: string;
};

export type ChatMsg = {
  id: string;
  user: string;
  text: string;
  ts: string;
  room?: string;
  peer?: string;
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function deleteJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  baseUrl: API_URL,
  login: (usernameOrEmail: string, password: string, email?: string) =>
    postJson<{ token: string; user_id: number; username: string; email?: string | null }>(
      '/api/auth/login',
      {
        username: usernameOrEmail,
        email: email || undefined,
        password,
      }
    ),
  register: (
    username: string,
    password: string,
    opts?: {
      email?: string;
      role?: 'trader' | 'trainer' | 'broker' | 'agent' | 'company';
      sponsor_code?: string;
      side?: 'left' | 'right';
    }
  ) =>
    postJson<{
      token: string;
      user_id: number;
      username: string;
      email?: string | null;
      referral_code?: string;
      role?: string;
    }>('/api/auth/register', {
      username,
      email: opts?.email,
      password,
      role: opts?.role ?? 'trader',
      sponsor_code: opts?.sponsor_code,
      side: opts?.side,
    }),
  /** حذف الحساب — شرط إلزامي لأبل (App Store Review Guideline 5.1.1(v)) */
  deleteAccount: () => deleteJson<{ ok: boolean }>('/api/auth/account'),
  commissionPlan: () =>
    getJson<{
      title: string;
      direct_rate: number;
      balance_bonus_rate: number;
      rules: string[];
      roles: { id: string; label: string; levels: number[]; level_count: number }[];
      example: { direct: string; balanced: string; unbalanced: string };
      commission_table?: { type: string; rate_pct: number; condition: string }[];
    }>('/api/commissions/plan'),
  commissionsMe: () =>
    getJson<{
      network: {
        referral_code: string;
        role: string;
        left_count: number;
        right_count: number;
        directs: { username: string; side: string; role: string; referral_code: string }[];
      };
      rates: {
        direct_rate: number;
        balance_bonus_rate: number;
        effective_rate: number;
        balanced: boolean;
        unlocked_levels: number[];
        next_level: number | null;
        role_label: string;
      };
      plan: unknown;
    }>('/api/commissions/me'),
  commissionReport: () =>
    getJson<{
      unit: number;
      commission_table: {
        type: string;
        rate_pct: number;
        condition: string;
        points_per_member: number;
      }[];
      levels_table: { role: string; levels: number[] }[];
      monthly: {
        month: string;
        direct_points: number;
        balance_points: number;
        total_points: number;
        direct_pct: number;
        balance_pct: number;
      }[];
      recent: { member: string; kind: string; rate_pct: number; points: number; month: string }[];
    }>('/api/commissions/report'),
  commissionTree: (depth = 5) =>
    getJson<{ tree: Record<string, unknown> | null }>(`/api/commissions/tree?depth=${depth}`),
  placeNetworkMember: (body: {
    username: string;
    password?: string;
    side: 'left' | 'right';
    role?: 'trader' | 'trainer' | 'broker' | 'agent' | 'company';
    under_user_id?: number;
  }) =>
    postJson<{
      ok: boolean;
      username: string;
      side: string;
      tree: Record<string, unknown> | null;
      network: unknown;
      temp_password?: string | null;
    }>('/api/commissions/place', body),
  registerPush: (token: string, platform: string) =>
    postJson<{ ok: boolean }>('/api/push/register', { token, platform }),
  layouts: () => getJson<{ layouts: { id: string; name: string; payload: unknown }[] }>('/api/layouts'),
  saveLayout: (body: { id?: string; name: string; payload: unknown }) =>
    postJson<{ ok: boolean; layout: unknown }>('/api/layouts', body),
  customWatchlist: () => getJson<{ symbols: string[] }>('/api/watchlist/custom'),
  addWatchlist: (symbol: string) =>
    postJson<{ ok: boolean; symbols: string[] }>('/api/watchlist/custom', { symbol }),
  saveProgress: (body: {
    school_id: string;
    lecture_id: string;
    segment_index: number;
    completed?: boolean;
  }) => postJson<{ ok: boolean }>('/api/academy/progress', body),
  getProgress: () =>
    getJson<{
      progress: {
        school_id: string;
        lecture_id: string;
        segment_index: number;
        completed: boolean;
      }[];
    }>('/api/academy/progress'),
  terminal: (tf0: string, tf1: string, tf2: string, dxyTf = '15m') =>
    getJson<{
      dxy: ChartSeries;
      frames: ChartSeries[];
      frame_sizes: string[];
      market?: { configured: boolean; cache_mode?: string; stats?: Record<string, unknown> };
    }>(
      `/api/terminal?tf0=${encodeURIComponent(tf0)}&tf1=${encodeURIComponent(tf1)}&tf2=${encodeURIComponent(tf2)}&dxy_tf=${encodeURIComponent(dxyTf)}`
    ),
  chart: (symbol: string, timeframe: string, outputsize = 180) =>
    getJson<ChartSeries>(
      `/api/charts/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(timeframe)}&outputsize=${Math.max(50, Math.min(5000, Math.round(outputsize)))}`
    ),
  groupChat: () => getJson<{ messages: ChatMsg[] }>('/api/chat/group'),
  postGroup: (text: string, user = 'أنت') =>
    postJson('/api/chat/group', {
      id: `g${Date.now()}`,
      user,
      text,
      ts: '',
      room: 'group',
    }),
  votes: () => getJson<{ votes: Vote[] }>('/api/votes'),
  ballot: (vote_id: string, choice: 'agree' | 'disagree') =>
    postJson('/api/votes/ballot', { vote_id, choice }),
  news: () => getJson<{ news: NewsItem[] }>('/api/news'),
  marketStatus: () =>
    getJson<{
      configured: boolean;
      provider: string;
      cache_mode?: string;
      plan_hint?: string;
      stats?: Record<string, unknown>;
    }>('/api/market/status'),
  alerts: () => getJson<{ alerts: PriceAlert[] }>('/api/alerts'),
  createAlert: (body: {
    symbol: string;
    condition: 'above' | 'below';
    price: number;
    note?: string;
  }) => postJson<{ ok: boolean; alert: PriceAlert }>('/api/alerts', body),
  deleteAlert: (id: string) =>
    fetch(`${API_URL}/api/alerts/${encodeURIComponent(id)}`, { method: 'DELETE' }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
  checkAlerts: () =>
    postJson<{ triggered: (PriceAlert & { current?: number })[]; alerts: PriceAlert[] }>(
      '/api/alerts/check',
      {}
    ),
  symbolSearch: (q: string) =>
    getJson<{
      results: {
        symbol: string;
        td_symbol: string;
        name: string;
        exchange: string;
        type: string;
      }[];
    }>(`/api/symbols/search?q=${encodeURIComponent(q)}&limit=20`),
  screenerRun: (body: { timeframe: string; filters: string[]; symbols?: string[] }) =>
    postJson<{
      results: {
        symbol: string;
        last: number;
        change_pct: number;
        rsi: number;
        filters_matched: string[];
      }[];
      count: number;
      provider_configured: boolean;
    }>('/api/screener/run', body),
  backtest: (body: {
    symbol: string;
    timeframe: string;
    strategy: 'ma_cross' | 'rsi_reversal' | 'macd_cross' | 'bb_bounce';
    fast?: number;
    slow?: number;
    rsi_low?: number;
    rsi_high?: number;
  }) =>
    postJson<{
      symbol: string;
      timeframe: string;
      strategy: string;
      trades: { side: string; entry: number; exit: number; pnl_pct: number }[];
      stats: Record<string, number>;
      equity_curve: { i: number; equity: number }[];
      error?: string;
    }>('/api/backtest', body),
  indicatorAlerts: () =>
    getJson<{
      alerts: {
        id: string;
        symbol: string;
        timeframe: string;
        alert_type: string;
        condition: string;
        value?: number;
        note: string;
        triggered: boolean;
      }[];
    }>('/api/indicator-alerts'),
  createIndicatorAlert: (body: {
    symbol: string;
    timeframe?: string;
    alert_type: 'rsi' | 'ma_cross' | 'macd_cross';
    condition: 'above' | 'below' | 'cross_up' | 'cross_down';
    value?: number;
    fast_period?: number;
    slow_period?: number;
    note?: string;
  }) => postJson<{ ok: boolean }>('/api/indicator-alerts', body),
  deleteIndicatorAlert: (id: string) =>
    fetch(`${API_URL}/api/indicator-alerts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
  checkIndicatorAlerts: () =>
    postJson<{
      triggered: {
        id: string;
        symbol: string;
        alert_type: string;
        condition: string;
      }[];
      alerts: {
        id: string;
        symbol: string;
        timeframe: string;
        alert_type: string;
        condition: string;
        value?: number;
        note: string;
        triggered: boolean;
      }[];
    }>('/api/indicator-alerts/check', {}),
  indicatorLibrary: () =>
    getJson<{ pine_presets: { id: string; name: string; formula: string }[] }>(
      '/api/indicators/library'
    ),
  indicatorSnapshot: (symbol: string, timeframe = '15m') =>
    getJson<{
      rsi?: number;
      change_pct?: number;
      ma_cross_up?: boolean;
      ma_cross_down?: boolean;
      macd_cross_up?: boolean;
      macd_cross_down?: boolean;
      last?: number;
    }>(`/api/indicators/snapshot/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(timeframe)}`),
  socialSources: () =>
    getJson<{
      sources: { id: string; name: string; platform: string; weight: number }[];
    }>('/api/signals/social/sources'),
  socialConsensus: (body: { symbol: string; timeframe?: string; source_ids: string[] }) =>
    postJson<{
      symbol: string;
      direction: string;
      confidence: number;
      avg_score: number;
      split: { buy: number; sell: number; neutral: number };
      levels: { entry: number; sl: number; tp: number };
      votes: {
        id: string;
        name: string;
        platform: string;
        direction: string;
        score: number;
        note: string;
      }[];
      disclaimer: string;
    }>('/api/signals/social/consensus', body),
  analystsForecast: (symbol: string, timeframe = '15m') =>
    getJson<{
      symbol: string;
      direction: string;
      confidence: number;
      avg_score: number;
      levels: { entry: number; sl: number; tp: number };
      analysts: {
        id: string;
        name: string;
        house: string;
        direction: string;
        score: number;
        target: number;
        horizon: string;
        summary: string;
      }[];
      disclaimer: string;
    }>(
      `/api/signals/analysts/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(timeframe)}`
    ),
  indicatorForecast: (body: {
    symbol: string;
    timeframe?: string;
    indicators?: string[];
  }) =>
    postJson<{
      symbol: string;
      direction: string;
      confidence: number;
      avg_score: number;
      levels: { entry: number; sl: number; tp: number };
      votes: { id: string; name: string; direction: string; score: number; detail: string }[];
      snapshot?: { rsi?: number; change_pct?: number; last?: number };
      disclaimer: string;
    }>('/api/signals/indicators/forecast', body),
  calendar: (opts?: { currency?: string; impact?: string }) => {
    const q = new URLSearchParams();
    if (opts?.currency) q.set('currency', opts.currency);
    if (opts?.impact) q.set('impact', opts.impact);
    const qs = q.toString();
    return getJson<{
      events: {
        id: string;
        title: string;
        currency: string;
        impact: string;
        when: string;
        forecast: string;
      }[];
    }>(`/api/calendar${qs ? `?${qs}` : ''}`);
  },
  marketQuote: (symbol: string) =>
    getJson<{
      symbol: string;
      price: number;
      bid?: number | null;
      ask?: number | null;
      source?: string;
    }>(`/api/market/quote/${encodeURIComponent(symbol)}`),
  trades: () =>
    getJson<{
      trades: Record<string, unknown>[];
      stats: Record<string, number>;
    }>('/api/trades'),
  createTrade: (body: {
    symbol: string;
    side: 'buy' | 'sell';
    entry: number;
    exit?: number;
    size?: number;
    note?: string;
  }) => postJson<{ ok: boolean; trade: Record<string, unknown>; stats: Record<string, number> }>(
    '/api/trades',
    body
  ),
  closeTrade: (id: string, exit: number) =>
    postJson<{ ok: boolean; trade: Record<string, unknown>; stats: Record<string, number> }>(
      `/api/trades/${encodeURIComponent(id)}/close`,
      { exit }
    ),
  deleteTrade: (id: string) =>
    fetch(`${API_URL}/api/trades/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
  courses: () => getJson<{ courses: Course[] }>('/api/courses'),
  course: (id: string) =>
    getJson<Course & { ai_intro: string; modules: unknown[] }>(`/api/courses/${id}`),
  academySchools: () =>
    getJson<{ schools: import('./academy').AcademySchoolSummary[] }>('/api/academy/schools'),
  academySchool: (id: string) =>
    getJson<import('./academy').AcademySchool>(`/api/academy/schools/${id}`),
  academyLecture: (schoolId: string, lectureId: string) =>
    getJson<import('./academy').AcademyLecture>(
      `/api/academy/schools/${schoolId}/lectures/${lectureId}`
    ),
  academyInterrupt: (payload: {
    school_id: string;
    lecture_id: string;
    segment_id?: string;
    question: string;
  }) =>
    postJson<{
      ok: boolean;
      clarification: string;
      teacher: string;
      resume_segment_index: number;
    }>('/api/academy/interrupt', payload),
  academyVoiceStatus: () =>
    getJson<{
      configured: boolean;
      voice_id: string | null;
      error?: string | null;
      model_id: string;
    }>('/api/academy/voice/status'),
  academyTts: (text: string) =>
    postJson<{ ok: boolean; audio_url: string; voice_id: string }>('/api/academy/tts', {
      text,
    }),
  aiAsk: (question: string, symbol?: string) =>
    postJson<{
      answer: string;
      symbol: string;
      setup: {
        direction: string;
        entry: number;
        sl: number;
        tp: number;
        win_probability: number;
      };
    }>('/api/ai/ask', { question, symbol }),
  dmList: () =>
    getJson<{ peers: { user: string; last: string; ts: string }[] }>('/api/dm'),
  dmThread: (peer: string) =>
    getJson<{ peer: string; messages: ChatMsg[] }>(`/api/dm/${encodeURIComponent(peer)}`),
  sendDm: (to_user: string, text: string) =>
    postJson('/api/dm', { to_user, text, from_user: 'أنت' }),
};
