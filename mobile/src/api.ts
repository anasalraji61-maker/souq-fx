import AsyncStorage from '@react-native-async-storage/async-storage';
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

/**
 * معرّف تثبيت عشوائي لهذا الجهاز (`X-Install-Id`) — يُولَّد مرة ويُحفظ. الخادم يجعله «مالك» صفوف
 * المجهول (تنبيهات السعر/المؤشر، اليومية، توكن الإشعارات): كانت كل صفوف غير المسجّلين دلواً واحداً،
 * فيرى أي متداول بلا حساب تنبيهات ويوميات الآخرين ويحذفها، وفحص التنبيهات من جهازه يُطلق تنبيهاتهم.
 * ليس هوية ولا يُرسل لأي طرف ثالث. فشل التخزين → معرّف لهذه الجلسة فقط (لا يُعطّل الواجهة).
 */
const INSTALL_ID_KEY = 'matrix.install.v1';
const INSTALL_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;
let installId: string | null = null;

function randomInstallId(): string {
  const bytes = new Uint8Array(16);
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** يُحَل دائماً (لا يرفض) — كل طلب ينتظره حتى لا يُنشأ تنبيه قبل معرفة المعرّف فيضيع بعد إعادة التشغيل. */
const installIdReady: Promise<void> = AsyncStorage.getItem(INSTALL_ID_KEY)
  .then((stored) => {
    if (stored && INSTALL_ID_RE.test(stored)) {
      installId = stored;
      return;
    }
    const fresh = randomInstallId();
    installId = fresh;
    return AsyncStorage.setItem(INSTALL_ID_KEY, fresh).catch(() => {
      /* ignore — المعرّف يبقى لهذه الجلسة */
    });
  })
  .catch(() => {
    installId = installId ?? randomInstallId();
  });

export function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (authToken) h.Authorization = `Bearer ${authToken}`;
  if (installId) h['X-Install-Id'] = installId;
  return h;
}

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

/** مزود | تجريبي | مخزن | غير متاح من المزوّد (backend-r2: لا سعر، لا بديل) | غير معروف — لا تفترض مزوداً عند غياب الحقل */
export type DataOriginKind = 'provider' | 'demo' | 'cache' | 'unavailable' | 'unknown';

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
  /** اسم ناشر الفكرة؛ null لفكرة مجهولة (السطر يُخفى بالواجهة) */
  author: string | null;
  ts: string;
  /** صوت المستخدم الحالي على الفكرة (null/غائب = لم يصوّت أو غير مسجّل؛ باك-إند أقدم لا يرسله) */
  my_choice?: 'agree' | 'disagree' | null;
  /** فكرة المستخدم الحالي نفسه (backend-r4؛ المجهول دائماً false؛ باك-إند أقدم لا يرسله) */
  mine?: boolean;
};

export type NewsItem = {
  id: string;
  impact: 'high' | 'medium' | 'low';
  title: string;
  pair_effect: string;
  when: string;
  /** `'headline_keywords'` = شارة التأثير تقدير من كلمات العنوان (backend `9a05735`)، لا تصنيف مصدر. */
  impact_basis?: string;
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
  /** اسم حساب المرسل؛ null لرسالة قديمة بلا مرسل معروف (الواجهة تكتب «متداول») */
  user: string | null;
  text: string;
  ts: string;
  room?: string;
  peer?: string;
  /** رسالة المستخدم الحالي (يحددها الخادم من التوكن؛ باك-إند أقدم لا يرسله) */
  mine?: boolean;
};

export type ReportKind = 'group_message' | 'vote';
export type ReportReason = 'spam' | 'abuse' | 'scam' | 'other';

/**
 * مهلة لطلبات القراءة: بلا مهلة، خادم غير قابل للوصول (عنوان LAN قديم، شبكة ضعيفة) يترك الشاشة
 * بمؤشر تحميل دقيقة كاملة أو أكثر (OkHttp على أندرويد بلا مهلة قراءة افتراضياً). بعد المهلة يُرمى
 * خطأ عادي فتعرض كل لوحة حالة الخطأ/إعادة المحاولة الموجودة لديها أصلاً.
 */
const GET_TIMEOUT_MS = 25000;

/**
 * نفس المهلة لطلبات **الكتابة القصيرة** (تسجيل دخول، إنشاء تنبيه، تسجيل صفقة، تصويت، حذف…): هذه
 * أفعال يضغطها المتداول بنفسه وينتظر أمامها زرّاً بـ«...»، فبلا مهلة يبقى الزرّ معطَّلاً دقيقة كاملة
 * على خادم غير قابل للوصول ثم يفشل على أي حال — بينما كل لوحة لديها أصلاً رسالة خطأ وطريق لإعادة
 * المحاولة. المهلة تُرمى كخطأ عادي بلا `status`، فمسار PATCH→(404/405)→إنشاء+حذف لا يُشتغَّل عليها
 * (لا تنبيه مكرَّر عند انقطاع الشبكة).
 */
const WRITE_TIMEOUT_MS = 25000;

/**
 * مسارات POST التي تحسب أو تولّد فعلياً (نموذج لغوي، تركيب صوت، باكتست، ماسح، فحص دوري لكل رمز) —
 * قد تطول شرعياً أكثر من المهلة أعلاه، فتبقى بلا مهلة كما كانت. المطابقة على المسار قبل `?` فقط.
 */
const SLOW_POST_PATHS = [
  '/api/ai/ask',
  '/api/backtest',
  '/api/screener/run',
  '/api/signals/indicators/forecast',
  '/api/signals/social/consensus',
  '/api/academy/interrupt',
  '/api/academy/tts',
  '/api/alerts/check',
  '/api/indicator-alerts/check',
];

function isSlowPostPath(path: string): boolean {
  const base = path.split('?')[0] ?? path;
  return SLOW_POST_PATHS.includes(base);
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  if (typeof AbortController === 'undefined') return fetch(url, init);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (ctrl.signal.aborted) throw new Error('timeout');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function getJson<T>(path: string): Promise<T> {
  await installIdReady;
  const res = await fetchWithTimeout(
    `${API_URL}${path}`,
    { headers: { ...authHeaders() } },
    GET_TIMEOUT_MS
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  await installIdReady;
  const url = `${API_URL}${path}`;
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  };
  const res = isSlowPostPath(path)
    ? await fetch(url, init)
    : await fetchWithTimeout(url, init, WRITE_TIMEOUT_MS);
  if (!res.ok) {
    // `status` كـ`patchJson`، و`detail` من جسم الخطأ إن وُجد (409 `trade_already_closed` يحمل الصفّ
    // بخروجه الأول) — الرسالة نفسها «HTTP n» كي لا يتغيّر شيء عند المستدعين القدامى.
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number; detail?: unknown };
    err.status = res.status;
    try {
      err.detail = ((await res.json()) as { detail?: unknown })?.detail;
    } catch {
      /* جسم ليس JSON */
    }
    throw err;
  }
  return res.json() as Promise<T>;
}

/** PATCH with the HTTP status on the thrown error (`err.status`) so callers can fall back on 404/405. */
async function patchJson<T>(path: string, body: unknown): Promise<T> {
  await installIdReady;
  const res = await fetchWithTimeout(
    `${API_URL}${path}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    },
    WRITE_TIMEOUT_MS
  );
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

async function deleteJson<T>(path: string): Promise<T> {
  await installIdReady;
  const res = await fetchWithTimeout(
    `${API_URL}${path}`,
    { method: 'DELETE', headers: { ...authHeaders() } },
    WRITE_TIMEOUT_MS
  );
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
  registerPush: (token: string, platform: string, lang?: string) =>
    postJson<{ ok: boolean }>('/api/push/register', { token, platform, lang }),
  layouts: () => getJson<{ layouts: { id: string; name: string; payload: unknown }[] }>('/api/layouts'),
  saveLayout: (body: { id?: string; name: string; payload: unknown }) =>
    postJson<{ ok: boolean; layout: unknown }>('/api/layouts', body),
  /** يحذف التخطيط بمعرّفه المحلي (والنسخ القديمة المكرّرة بنفس `payload.id`). باك-إند قديم → خطأ 405. */
  deleteLayout: (id: string) =>
    installIdReady
      .then(() =>
        fetchWithTimeout(
          `${API_URL}/api/layouts/${encodeURIComponent(id)}`,
          { method: 'DELETE', headers: authHeaders() },
          WRITE_TIMEOUT_MS
        )
      )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ ok: boolean; deleted: number }>;
      }),
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
  /** الخادم يحدد المرسل من التوكن (المشاركة للمسجّل فقط → `login_required` للمجهول) */
  postGroup: (text: string) =>
    postJson<{ ok: boolean; message?: ChatMsg; error?: string }>('/api/chat/group', { text }),
  votes: () => getJson<{ votes: Vote[] }>('/api/votes'),
  /** النشر للمسجّل فقط (`login_required`)، والروابط مرفوضة (`links_not_allowed`) */
  createVote: (v: { symbol: string; direction: 'buy' | 'sell'; entry: number; sl: number; tp: number; note?: string }) =>
    postJson<{ ok: boolean; vote?: Vote; error?: string }>('/api/votes', v),
  ballot: (vote_id: string, choice: 'agree' | 'disagree') =>
    postJson<{ ok: boolean; vote?: Vote; error?: string }>('/api/votes/ballot', { vote_id, choice }),
  /** بلاغ عن رسالة مجموعة أو فكرة صفقة (شرط أبل 1.2). العنصر يختفي فوراً عند المُبلِّغ، وعن الجميع
   * بعد بلاغات عدة حسابات. للمسجّل فقط (`login_required`). */
  report: (kind: ReportKind, target_id: string, reason: ReportReason) =>
    postJson<{ ok: boolean; new?: boolean; error?: string }>('/api/reports', { kind, target_id, reason }),
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
  /** Atomic edit + re-arm (`PATCH /api/alerts/{id}`). Older backends answer 405, a missing/foreign
   * alert 404 — AlertsPanel then falls back to create-then-delete. */
  updateAlert: (
    id: string,
    body: { symbol: string; condition: 'above' | 'below'; price: number; note?: string }
  ) => patchJson<{ ok: boolean; alert: PriceAlert }>(`/api/alerts/${encodeURIComponent(id)}`, body),
  /** Sends the auth token: the backend only deletes the caller's own (or legacy anonymous) alerts. */
  deleteAlert: (id: string) =>
    installIdReady
      .then(() =>
        fetchWithTimeout(
          `${API_URL}/api/alerts/${encodeURIComponent(id)}`,
          { method: 'DELETE', headers: authHeaders() },
          WRITE_TIMEOUT_MS
        )
      )
      .then((r) => {
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
        /** `cache` = سلسلة مخزَّنة (حدّ المزوّد، حتى 15د) لا جلب الآن — backend-r10 (ج)؛ غائب = خادم أقدم */
        data_kind?: string | null;
        as_of?: string | number | null;
      }[];
      count: number;
      /** عدد الرموز التي قُرئت شموعها فعلاً / التي تعذّرت (حدّ المزوّد غالباً) — خادم أقدم لا يرسلها. */
      scanned?: number;
      failed?: string[];
      total?: number;
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
      /** أرقام الإحصاء + `spread_pips` (null) و`costs_included` (boolean، backend-r3) */
      stats: Record<string, number | boolean | null>;
      equity_curve: { i: number; equity: number }[];
      error?: string;
      /** 'demo' = مسار بذري مختلَق (المزوّد متعذّر) — لا تُعرض النتيجة؛ غيابه = خادم أقدم. */
      data_kind?: string;
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
    installIdReady
      .then(() =>
        fetchWithTimeout(
          `${API_URL}/api/indicator-alerts/${encodeURIComponent(id)}`,
          { method: 'DELETE', headers: authHeaders() },
          WRITE_TIMEOUT_MS
        )
      )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
  /** تنبيه مؤشر أُطلق → «يراقب» من جديد. باك-إند قديم بلا المسار → خطأ. */
  rearmIndicatorAlert: (id: string) =>
    postJson<{ ok: boolean }>(`/api/indicator-alerts/${encodeURIComponent(id)}/rearm`, {}),
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
      /** تغيّر على كامل السلسلة المحمَّلة (`change_bars` شمعة على `timeframe`) لا «اليوم»؛ null إن أول إغلاق 0. */
      change_pct?: number | null;
      change_bars?: number;
      timeframe?: string;
      ma_cross_up?: boolean;
      ma_cross_down?: boolean;
      macd_cross_up?: boolean;
      macd_cross_down?: boolean;
      last?: number;
      /** 'demo' = مؤشرات على شموع مختلَقة — لا تُعرض. */
      data_kind?: string;
    }>(`/api/indicators/snapshot/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(timeframe)}`),
  socialSources: () =>
    getJson<{
      sources: { id: string; name: string; platform: string; weight: number }[];
    }>('/api/signals/social/sources'),
  socialConsensus: (body: { symbol: string; timeframe?: string; source_ids: string[] }) =>
    postJson<{
      symbol: string;
      /** backend-r2: null حين `status: 'unavailable'` (لا مصدر مرخَّص / لا بيانات) — لا يُقرأ «محايد». «الثقة» أُزيلت. */
      direction: string | null;
      avg_score: number | null;
      status?: 'ok' | 'unavailable';
      unavailable_reason?: string | null;
      split: { buy: number; sell: number; neutral: number };
      /** backend-r1: null حين لا سعر حيّ/شموع قليلة/محايد — السبب بـ`levels_basis.unavailable`. */
      levels: { entry: number; sl: number; tp: number } | null;
      levels_basis?: { unavailable?: string | null } | null;
      votes: {
        id: string;
        name: string;
        platform: string;
        direction: string;
        score: number;
        note: string;
      }[];
      disclaimer: string;
      data_kind?: string;
      timeframe?: string;
    }>('/api/signals/social/consensus', body),
  analystsForecast: (symbol: string, timeframe = '15m') =>
    getJson<{
      symbol: string;
      /** backend-r2: null حين `status: 'unavailable'` (لا مصدر مرخَّص / لا بيانات) — لا يُقرأ «محايد». «الثقة» أُزيلت. */
      direction: string | null;
      avg_score: number | null;
      status?: 'ok' | 'unavailable';
      unavailable_reason?: string | null;
      /** backend-r1: null حين لا سعر حيّ/شموع قليلة/محايد — السبب بـ`levels_basis.unavailable`. */
      levels: { entry: number; sl: number; tp: number } | null;
      levels_basis?: { unavailable?: string | null } | null;
      analysts: {
        id: string;
        name: string;
        house: string;
        direction: string;
        score: number;
        target: number | null;
        horizon: string;
        summary: string;
      }[];
      disclaimer: string;
      data_kind?: string;
      timeframe?: string;
    }>(
      `/api/signals/analysts/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(timeframe)}`
    ),
  indicatorForecast: (body: {
    symbol: string;
    timeframe?: string;
    indicators?: string[];
    /** backend-r3: `en*` ⇒ أسماء/تفاصيل/تنبيه بالإنجليزية، غيره عربي (الكردي يبني الجملة من `detail_code`). */
    lang?: string;
  }) =>
    postJson<{
      symbol: string;
      /** backend-r2: null حين `status: 'unavailable'` (لا مصدر مرخَّص / لا بيانات) — لا يُقرأ «محايد». «الثقة» أُزيلت. */
      direction: string | null;
      avg_score: number | null;
      status?: 'ok' | 'unavailable';
      unavailable_reason?: string | null;
      /** backend-r1: null حين لا سعر حيّ/شموع قليلة/محايد — السبب بـ`levels_basis.unavailable`. */
      levels: { entry: number; sl: number; tp: number } | null;
      levels_basis?: { unavailable?: string | null } | null;
      votes: {
        id: string;
        name: string;
        direction: string;
        score: number;
        detail: string;
        /** backend-r3: مفتاح الجملة (`rsi_overbought`، `ma_above`… — `signal_hub._DETAIL_TEXT`) وأرقامها مقرَّبة بمنازل الرمز. */
        detail_code?: string;
        detail_values?: Record<string, number>;
      }[];
      snapshot?: { rsi?: number; change_pct?: number; last?: number };
      disclaimer: string;
      /** backend-r3: `indicator_consensus` | `not_enough_data` — نصّ i18n بدل `disclaimer` العربي. */
      disclaimer_code?: string;
      /** backend-r3: منازل سعر الرمز (USDJPY 3). */
      price_decimals?: number;
      /** 'demo' = اتجاه ومستويات من شموع مختلَقة — لا تُعرض. */
      data_kind?: string;
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
        forecast_value?: string;
        previous?: string;
        actual?: string;
        ts?: number | null;
        sample?: boolean;
      }[];
      /** backend-r1: 'unavailable' مع `events: []` = المصدر لم يستجب — ليس «لا أحداث». */
      status?: 'ok' | 'unavailable';
      as_of?: string;
    }>(`/api/calendar${qs ? `?${qs}` : ''}`);
  },
  marketQuote: (symbol: string) =>
    getJson<{
      symbol: string;
      price: number;
      bid?: number | null;
      ask?: number | null;
      source?: string;
      /** provider/cache = سعر حقيقي؛ demo = سلسلة بذرية تجريبية (لا تصلح لحساب رقمي). */
      data_kind?: DataOriginKind;
    }>(`/api/market/quote/${encodeURIComponent(symbol)}`),
  /** صفحة من الدفتر، الأحدث أولاً (backend-r1). `total` لكل الصفقات و`stats` على كل المغلقة لا الصفحة؛
   *  خادم أقدم يتجاهل المعاملين ولا يرسل `total`/`limit`/`offset`. */
  trades: (opts?: { limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (opts?.limit != null) q.set('limit', String(opts.limit));
    if (opts?.offset != null) q.set('offset', String(opts.offset));
    const qs = q.toString();
    return getJson<{
      trades: Record<string, unknown>[];
      stats: Record<string, number>;
      total?: number;
      limit?: number;
      offset?: number;
    }>(`/api/trades${qs ? `?${qs}` : ''}`);
  },
  createTrade: (body: {
    symbol: string;
    side: 'buy' | 'sell';
    entry: number;
    exit?: number;
    size?: number;
    note?: string;
    /** وقف/هدف اختياريان — باك-إند قديم يتجاهلهما (Pydantic يسقط الحقول غير المعروفة). */
    sl?: number;
    tp?: number;
  }) => postJson<{ ok: boolean; trade: Record<string, unknown>; stats: Record<string, number> }>(
    '/api/trades',
    body
  ),
  closeTrade: (id: string, exit: number) =>
    postJson<{ ok: boolean; trade: Record<string, unknown>; stats: Record<string, number> }>(
      `/api/trades/${encodeURIComponent(id)}/close`,
      { exit }
    ),
  /** تعديل صفقة بالدفتر — الحقول الغائبة لا تتغيّر، و`null` لـexit/sl/tp يمسحها (مسح الخروج يعيدها مفتوحة).
   * باك-إند قديم بلا المسار → خطأ بـ`status` 405. */
  updateTrade: (
    id: string,
    body: {
      symbol?: string;
      side?: 'buy' | 'sell';
      entry?: number;
      exit?: number | null;
      /** حجم اللوت — الحقل إلزامي بالجدول، وnull له يُسقَط بالباك-إند (`main.py:1174`) فلا يُرسَل إلا برقم. */
      size?: number;
      sl?: number | null;
      tp?: number | null;
      note?: string;
    }
  ) =>
    patchJson<{ ok: boolean; trade: Record<string, unknown>; stats: Record<string, number> }>(
      `/api/trades/${encodeURIComponent(id)}`,
      body
    ),
  deleteTrade: (id: string) =>
    installIdReady
      .then(() =>
        fetchWithTimeout(
          `${API_URL}/api/trades/${encodeURIComponent(id)}`,
          { method: 'DELETE', headers: authHeaders() },
          WRITE_TIMEOUT_MS
        )
      )
      .then((r) => {
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
    lang?: string;
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
  /** `lang` = لغة واجهة المتداول (LangId) — الخادم يردّ بها بدل العربية الثابتة؛ غيابه = عربي. */
  aiAsk: (question: string, symbol?: string, lang?: string) =>
    postJson<{
      answer: string;
      symbol: string;
      /** null عند سلسلة demo (المزوّد متعذّر): لا اتجاه ولا مستويات مشتقة من شموع مختلَقة. */
      setup: {
        direction: string | null;
        entry: number | null;
        sl: number | null;
        tp: number | null;
        /** دائماً null الآن — كان رقماً مختلَقاً؛ يبقى الحقل توافقاً فقط ولا يُعرض. */
        win_probability: number | null;
      };
      /** false = لا سعر حي (المزوّد متعذّر)؛ غيابه = خادم أقدم. */
      live_price?: boolean;
    }>('/api/ai/ask', { question, symbol, lang }),
  dmList: () =>
    getJson<{ peers: { user: string; last: string; ts: string }[] }>('/api/dm'),
  dmThread: (peer: string) =>
    getJson<{ peer: string; messages: ChatMsg[] }>(`/api/dm/${encodeURIComponent(peer)}`),
  sendDm: (to_user: string, text: string) =>
    postJson('/api/dm', { to_user, text, from_user: 'أنت' }),
};
