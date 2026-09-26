import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { resolveApiHost } from './apiHost';

const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string };

/**
 * يُكتشف تلقائياً (launch210a، `apiHost.ts`): `EXPO_PUBLIC_API_URL` ⇒ مضيف صفحة الويب ⇒ مضيف Metro ⇒ `extra.apiUrl`.
 * كان `extra.apiUrl` المكتوب يدوياً لكل ما عدا الويب المحلي، فكل تغيّر لعنوان اللابتوب = شارتات «لا اتصال».
 */
function resolveApiUrl(): string {
  // على React Native (Expo Go / Hermes) قد يكون window معرّفاً كـ polyfill لكن window.location غير موجود —
  // لهذا نتحقق من location قبل قراءة hostname، وإلا يرمي: "Cannot read property 'hostname' of undefined".
  const webHostname =
    typeof window !== 'undefined' && window.location && window.location.hostname ? window.location.hostname : null;
  return resolveApiHost({
    // يُقرأ حرفياً (لا `process.env[name]`) ليُضمَّن وقت البناء
    envUrl: process.env.EXPO_PUBLIC_API_URL,
    webHostname,
    hostUri: Constants.expoConfig?.hostUri,
    extraApiUrl: extra.apiUrl,
  });
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
  change_pct: number | null;
  last: number | null;
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
  /** ثوانٍ UTC للحظة النشر (backend-r15)؛ null لفكرة قديمة */
  created_at?: number | null;
  /** صوت المستخدم الحالي على الفكرة (null/غائب = لم يصوّت أو غير مسجّل؛ باك-إند أقدم لا يرسله) */
  my_choice?: 'agree' | 'disagree' | null;
  /** فكرة المستخدم الحالي نفسه (backend-r4؛ المجهول دائماً false؛ باك-إند أقدم لا يرسله) */
  mine?: boolean;
};

export type NewsItem = {
  id: string;
  /** `'unknown'` = عنوان بلا كلمة مفتاحية (backend-r18 `19acbae`) — كان يصل «low» فيُقرأ «منخفض» مؤكَّداً. */
  impact: 'high' | 'medium' | 'low' | 'unknown';
  title: string;
  /** `pair_effect` لم يعد يُرسَل (backend-r104 `53aa55c`) — كان «Forex» ثابتاً. */
  when: string;
  /** وقت النشر ثوانٍ UTC (`news_feed.when_and_ts`)؛ null ⇒ بلا تاريخ أو منطقة مجهولة و`when` نصّه الخام. */
  ts?: number | null;
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
  /** الخادم يرسل `null` — لا تطبعه كنسبة دون فحص. */
  progress: number | null;
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

/** الصفّ كما عُرض (backend-r114b): الخادم يردّ 409 `alert_changed` إن نقل جهاز آخر المستوى أو أُطلق
 * التنبيه بعد القراءة — كان التعديل يُرجِع المستوى القديم بصمت ويعيد تسليح المُطلَق فيُدفع مرّتين. */
export type AlertSeen = {
  seen_symbol?: string;
  seen_condition?: 'above' | 'below';
  seen_price?: number;
  seen_triggered?: boolean;
  seen_ts?: string;
};

export function alertSeen(a: PriceAlert): AlertSeen {
  return {
    seen_symbol: a.symbol,
    seen_condition: a.condition,
    // الخادم يرفض (422) صفراً/لانهائياً — غيابه = بلا فحص للسعر لا فشل التعديل
    ...(Number.isFinite(a.price) && a.price > 0 ? { seen_price: a.price } : {}),
    seen_triggered: !!a.triggered,
    ...(typeof a.ts === 'string' && a.ts && a.ts.length <= 40 ? { seen_ts: a.ts } : {}),
  };
}

/** 409 `alert_changed` ⇒ الصفّ المخزَّن الآن؛ غيره ⇒ null. */
export function alertChangedRow(e: unknown): PriceAlert | null {
  const err = e as { status?: number; detail?: { error?: string; alert?: PriceAlert } } | null;
  if (err?.status !== 409 || err.detail?.error !== 'alert_changed') return null;
  const a = err.detail.alert;
  return a && typeof a.id === 'string' ? a : null;
}

export type ChatMsg = {
  id: string;
  /** اسم حساب المرسل؛ null لرسالة قديمة بلا مرسل معروف (الواجهة تكتب «متداول») */
  user: string | null;
  text: string;
  /** «HH:MM» بساعة الخادم المحلية (برلين) بلا تاريخ ولا منطقة — لا يُعرض (backend-r15) */
  ts: string;
  /** ثوانٍ UTC للحظة النشر (backend-r15)؛ null لرسالة قديمة بلا تاريخ معروف، غائب من باك-إند أقدم */
  created_at?: number | null;
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

/**
 * backend-r70: مسارات البيانات الشخصية (الدفتر، التنبيهات، قائمة المتابعة، التخطيطات) تردّ 401 على توكن
 * منتهٍ/ملغى بدل معاملته مجهولاً. `AuthContext` يسجّل هنا مستمعاً يستدعي `checkSession` فيظهر «انتهت جلستك»
 * بدل خطأ تحميل عامّ. فقط حين أُرسل توكن فعلاً، وخارج `/api/auth/*` (401 الدخول = كلمة مرور خاطئة، و`/me`
 * هو الفحص نفسه). المستمع يتحقّق بـ`/api/auth/me` قبل أيّ خروج ⇒ 401 لسبب آخر لا يُخرج أحداً.
 */
let unauthorizedListener: (() => void) | null = null;

export function setUnauthorizedListener(fn: (() => void) | null) {
  unauthorizedListener = fn;
}

function noteAuthStatus(url: string, init: RequestInit, res: Response) {
  if (res.status !== 401 || !unauthorizedListener) return;
  const h = init.headers as Record<string, string> | undefined;
  if (!h?.Authorization) return;
  if (url.startsWith(`${API_URL}/api/auth/`)) return;
  unauthorizedListener();
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const res = await fetchWithTimeoutRaw(url, init, ms);
  noteAuthStatus(url, init, res);
  return res;
}

async function fetchWithTimeoutRaw(url: string, init: RequestInit, ms: number): Promise<Response> {
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
  let res: Response;
  if (isSlowPostPath(path)) {
    res = await fetch(url, init);
    noteAuthStatus(url, init, res);
  } else {
    res = await fetchWithTimeout(url, init, WRITE_TIMEOUT_MS);
  }
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
    // `detail` كـ`postJson`: 409 `alert_changed` يحمل الصفّ المخزَّن (backend-r114b).
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
  /** خروج هذا الجهاز بالخادم: يُلغي الجلسة ويفكّ رمز Push (بمعرّف التثبيت، وبالرمز إن مُرِّر) من الحساب —
   * بدونه تصل إشعارات تنبيهات الحساب لمن يستعمل الهاتف بعده. يُستدعى والتوكن ما زال مضبوطاً. */
  logout: (pushToken?: string | null) =>
    postJson<{ ok: boolean }>('/api/auth/logout', pushToken ? { push_token: pushToken } : {}),
  /** backend-r52: هل ما زالت الجلسة حيّة؟ الخادم يعامل التوكن المنتهي (30 يوماً) كمجهول بمسارات القراءة
   * بلا خطأ ⇒ الدفتر والتنبيهات «تختفي» بصمت. 401 وحده = `expired`؛ الشبكة/المهلة/5xx = `unknown`
   * (لا نُخرج أحداً لأنّ الخادم لم يُجب). */
  sessionCheck: async (): Promise<'valid' | 'expired' | 'unknown'> => {
    try {
      await installIdReady;
      const res = await fetchWithTimeout(
        `${API_URL}/api/auth/me`,
        { headers: { ...authHeaders() } },
        GET_TIMEOUT_MS
      );
      if (res.ok) return 'valid';
      return res.status === 401 ? 'expired' : 'unknown';
    } catch {
      return 'unknown';
    }
  },
  /** backend-r58: تغيير كلمة المرور؛ الخادم يُلغي جلسات الأجهزة الأخرى ويُبقي هذه. 400 `detail`:
   * `invalid current password` أو `password too short` (يُقرأ من `err.detail` كـ`postJson`)؛ 401 بلا دخول. */
  changePassword: (currentPassword: string, newPassword: string) =>
    postJson<{ ok: boolean }>('/api/auth/password', {
      current_password: currentPassword,
      new_password: newPassword,
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
  /** backend-r33 (`acace1d`): `status` = هل أجاب المصدر (`unavailable` ⇒ `news: []` لأن المصدر معطّل، لا لأن السوق هادئ)؛
   * `as_of` (ثوانٍ UTC) = وقت جلب العناوين؛ `stale` = آخر محاولة فشلت والعناوين من جلب سابق. اختيارية: خادم أقدم لا يرسلها. */
  news: () =>
    getJson<{ news: NewsItem[]; status?: 'ok' | 'unavailable'; as_of?: number | null; stale?: boolean }>('/api/news'),
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
    body: {
      symbol: string;
      condition: 'above' | 'below';
      price: number;
      note?: string;
    } & AlertSeen
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
        /** زوج كريبتو بعدّة منصّات: `exchange` فارغ وهذه قائمتها (المزوّد يختار). */
        exchanges?: string[];
        /** عملة التسعير كما يعلنها المزوّد (`GBp` = بنس) — تغيب للعملات والكريبتو. */
        currency?: string | null;
      }[];
      /** الرمز نفسه بعدّة بورصات: `symbol` المجرّد يرسم إدراجاً آخر ⇒ لا يُعرض للاختيار (backend-r46). */
      ambiguous?: {
        symbol: string;
        td_symbol: string;
        name: string;
        exchange: string;
        type: string;
        currency?: string | null;
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
        /** ثوانٍ UTC: إغلاق آخر شمعة بُنيت عليها النتيجة (backend-r17) — إغلاق الجمعة يوم السبت؛ null بلا سعر. */
        price_as_of?: number | null;
      }[];
      count: number;
      /** عدد الرموز التي قُرئت شموعها فعلاً / التي تعذّرت (حدّ المزوّد غالباً) — خادم أقدم لا يرسلها. */
      scanned?: number;
      failed?: string[];
      total?: number;
      /** backend-r69: رمز ⇒ فلاتر لم تكفِ شموعه لتقييمها. رمز كل فلاتره هنا يقع في `failed` أيضاً — سببه قِصَر
       * التاريخ لا حدّ المزوّد. خادم أقدم لا يرسله. */
      insufficient_data?: Record<string, string[]>;
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
      /** true = `trades` آخر 40 فقط و`stats.trade_count` على كلّها (backend `c670673`) */
      trades_truncated?: boolean;
      /** وقت جلب الشموع (ث يونكس؛ مع `data_kind: cache` قد يكون حتى 15د) — backend `72c8725` */
      as_of?: number | null;
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
      /** ثوانٍ UTC: وقت السعر الذي بُنيت عليه المستويات (backend-r16) — إغلاق شمعة الجمعة يوم السبت، أو كاش
       * حتى 15د عند حدّ المزوّد؛ null بلا سعر حقيقي؛ غيابه = خادم أقدم. */
      price_as_of?: number | null;
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
      /** backend-r27: ثوانٍ UTC لوقت الجلب الذي جاءت منه الأحداث (كان نصّاً بخوادم أقدم). */
      as_of?: string | number;
      /** backend-r27: آخر تحديث من المصدر فشل والأحداث من جلب ناجح سابق (حتى 6 س) — حقيقية لكن قد تنقص. */
      stale?: boolean;
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
      /** وقت السعر بثوانٍ (ساعة الخادم)؛ بفرع الشموع (بلا Bid/Ask) = وقت آخر شمعة. */
      as_of?: number | null;
      /** false = السوق مغلق بساعة الخادم (عطلة)؛ null/غائب = لا نعرف. */
      market_open?: boolean | null;
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
    /** وقتا صفقة سُجّلت بعد حدوثها (ISO، tools150a) — من `createTimesSend`؛ غائبان = «الآن» بالخادم. */
    opened_at?: string;
    closed_at?: string;
  }) => postJson<{ ok: boolean; trade: Record<string, unknown>; stats: Record<string, number> }>(
    '/api/trades',
    body
  ),
  /** `seen` (tools123a، backend-r82): حقول `seen_*` للصفّ الذي بُنيت عليه نافذة التأكيد — الخادم يعيد 409
   * `trade_changed_concurrently` إن اختلف أحدها. غائب = بلا فحص؛ `exit` يُكتب بعدها فلا تغطّيه. */
  closeTrade: (id: string, exit: number, seen?: Record<string, unknown>) =>
    postJson<{ ok: boolean; trade: Record<string, unknown>; stats: Record<string, number> }>(
      `/api/trades/${encodeURIComponent(id)}/close`,
      { ...seen, exit }
    ),
  /** تعديل صفقة بالدفتر — الحقول الغائبة لا تتغيّر، و`null` لـexit/size/sl/tp يمسحها (مسح الخروج يعيدها مفتوحة).
   * باك-إند قديم بلا المسار → خطأ بـ`status` 405. */
  updateTrade: (
    id: string,
    body: {
      symbol?: string;
      side?: 'buy' | 'sell';
      entry?: number;
      exit?: number | null;
      /** حجم اللوت — `null` = حجم غير معروف (يمسح القيمة المحفوظة، backend-r17 b)؛ الغياب لا يغيّره. */
      size?: number | null;
      sl?: number | null;
      tp?: number | null;
      note?: string;
      /** وقت الإغلاق ISO — `null` = «غير معروف»؛ يشترط صفقة مغلقة بعد التعديل ولا يسبق الفتح (وإلا 422 `invalid_closed_at`). */
      closed_at?: string | null;
      /** وقت الفتح ISO (tools150c، backend `46dcc3c`) — `null` يُتجاهل؛ مستقبل/قبل الإغلاق ⇒ 422 `invalid_opened_at`. */
      opened_at?: string | null;
      /** الصفّ كما عُرض (backend-r78b/r80a) — مختلف عن المخزَّن ⇒ 409. `seen_opened_at` حرفياً كما أرسله الخادم. */
      seen_status?: 'open' | 'closed' | null;
      seen_exit?: number | null;
      seen_symbol?: string | null;
      seen_side?: 'buy' | 'sell' | null;
      seen_entry?: number | null;
      seen_size?: number | null;
      seen_sl?: number | null;
      seen_tp?: number | null;
      seen_note?: string | null;
      seen_opened_at?: string | null;
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
      /** لغة التوضيح الفعلية (backend-r78a) — كـ`answer_lang`. */
      clarification_lang?: string;
      /** launch216a: «template» = قالب ثابت (لا نموذج أو فشل)، لا جواب عن السؤال؛ «model» = جواب النموذج. */
      source?: 'model' | 'template';
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
      /* `setup` (اتجاه/دخول/وقف/هدف) أُسقط من النوع عمداً — قرار أنس ٤: الخادم يرسله `null` دائماً
       * (`352ad77`) ولا يُعرض أبداً؛ غيابه من النوع يمنع أيّ شاشة من قراءته. */
      /** false = لا سعر حي (المزوّد متعذّر)؛ غيابه = خادم أقدم. */
      live_price?: boolean;
      /** ثوانٍ UTC: إغلاق آخر شمعة التي بُني عليها الجواب (backend-r12) — قد يسبق «الآن» بـ15د عند حدّ
       * المزوّد أو بأيام بعطلة الأسبوع؛ null بلا سعر حقيقي؛ غيابه = خادم أقدم. */
      price_as_of?: number | null;
      /** لغة الجواب الفعلية (backend-r78a): "ar" لمستخدم كردي بلا قالب كردي أو باعتذار الحارس؛ غيابه = خادم أقدم. */
      answer_lang?: string;
      /** "model" = نموذج مربوط؛ "template" = قالب محلي (قراءة شارت عامة لا جواب عن السؤال، `ef38a46`)؛ غيابه = خادم أقدم. */
      source?: 'model' | 'template';
    }>('/api/ai/ask', { question, symbol, lang }),
};
