import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radii, spacing, buttons, numeric } from '../theme';
import { api } from '../api';
import { useI18n } from '../i18n/I18nContext';
import { instrumentSpec } from '../positionSize';
import {
  NEWS_GRACE_MS,
  NEWS_HORIZON_MS,
  UNANNOUNCED_SPAN_MS,
  newsCurrencyMatches,
  newsTimeUnannounced,
} from '../chart/newsRisk';

type Ev = {
  id: string;
  title: string;
  currency: string;
  impact: string;
  when: string;
  forecast: string;
  /** أرقام مسمّاة منفصلة (باك-إند أحدث). `forecast` وحده يخلط «السابق» بالتوقّع عند غيابه — يُستخدم
   * فقط إن لم تصل هذه الحقول (باك-إند أقدم). */
  forecast_value?: string;
  previous?: string;
  actual?: string;
  /** ثوانٍ UTC — إن وُجد يُعرض الحدث بتوقيت جهاز المستخدم مع عدّ تنازلي؛ غيابه (باك-إند أقدم/مصدر XML)
   * يعيد السلوك السابق (نص `when` كما هو). */
  ts?: number | null;
  /** بيانات مثال احتياطية من الباك-إند عند تعذّر جلب التقويم الحي */
  sample?: boolean;
  /** backend-r14: **الساعة غير معلنة** («طوال اليوم»/«Tentative») — `ts` بداية اليوم بنيويورك للتاريخ
   * والترتيب فقط. راجع `newsTimeUnannounced`. */
  time_tbd?: boolean;
};

/** أفق عدّاد الترويسة «القادم خلال 24 ساعة» — يوم التداول القادم كما يخطّط له المتداول مساءً. */
const SOON_MS = 24 * 60 * 60 * 1000;
/**
 * أفق **تلوين الصفّ** وحده. كان التلوين يستعمل `SOON_MS` نفسه (24 ساعة) بقائمة تقويم **أسبوعية**:
 * أي أن خمسة عشر صفاً متتالياً تُضاء معاً، فيفقد التمييز معناه بالضبط حيث يُراد منه — الصفّ الذي
 * يجب ألّا يفتح المتداول مركزاً قبله. ثلاث ساعات: نفس أفق بانر «خبر قوي قريب» فوق الشارت
 * (`NEWS_HORIZON_MS` بـ`chart/newsRisk.ts`)، فـ«قريب» تعني الشيء نفسه بالشاشتين.
 * عدّاد الترويسة لم يُمسّ — نصّه يقول «24 ساعة» ويظلّ صادقاً.
 */
const ROW_SOON_MS = NEWS_HORIZON_MS;
const NOW_WINDOW_MS = NEWS_GRACE_MS;
/** إعادة جلب صامتة للتقويم وهو مفتوح — الخادم يخزّن النتيجة 30 دقيقة (`econ_calendar.TTL`)
 * فالطلب لا يمسّ حدّ المزوّد، لكنه يلتقط «الفعلي» بعد صدور الرقم. */
const RELOAD_MS = 5 * 60 * 1000;
const pad2 = (n: number) => String(n).padStart(2, '0');

/** `as_of` من `/api/calendar`: ثوانٍ UTC رقماً (backend-r27)، أو نصّ تاريخ من نسخة أقدم؛ غير ذلك ⇒ null. */
function asOfSeconds(v: string | number | null | undefined): number | null {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : null;
  if (typeof v === 'string' && v) {
    const ms = Date.parse(v);
    return Number.isFinite(ms) ? ms / 1000 : null;
  }
  return null;
}

function tzLabel(): string {
  const off = -new Date().getTimezoneOffset();
  const a = Math.abs(off);
  return `UTC${off >= 0 ? '+' : '-'}${Math.floor(a / 60)}${a % 60 ? `:${pad2(a % 60)}` : ''}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const IMPACT_COLOR: Record<string, string> = {
  high: colors.bear,
  medium: colors.warn,
  low: colors.textDim,
  /** عطلة بنوك (backend-r3) — سيولة رقيقة: تنبيه لا خطر؛ `none`/`unknown` بلا لون ولا كلمة */
  holiday: colors.warn,
};

const CURRENCIES = ['ALL', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'NZD', 'CHF'];
/** «متوسط+» (عالي ومتوسط معاً) هو الفلتر الأكثر استخداماً لدى متداول التجزئة: المنخفض ضجيج، والعالي وحده
 * يُخفي بيانات متوسطة تحرّك الزوج فعلاً. يُصفّى محلياً (الخادم يقبل أهمية واحدة). */
const IMPACTS = ['ALL', 'medplus', 'high', 'medium', 'low'] as const;
type ImpactFilter = (typeof IMPACTS)[number];
/** قيمة فلتر العملة لـ«عملتا زوج الشارت» (EURUSD → EUR + USD) — تُصفّى محلياً. */
const PAIR = 'PAIR';
/** يتذكّر فلتر العملة/التأثير بين الجلسات — المتداول يتابع عملاته نفسها كل يوم. */
const FILTER_KEY = 'matrix.calendar.filters.v1';

type Props = {
  compact?: boolean;
  /**
   * اللوحة تملك الصفحة وحدها (تبويب «التقويم» بشاشة الأدوات): الصفوف تُسرَد متدفّقةً بلا نافذة
   * تمرير داخلية، فالصفحة هي التي تُمرَّر. بغيره تبقى نافذةً محدودة كما هي بمواضع المشاركة.
   */
  flow?: boolean;
  /** زوج الشارت/الإشارة المفتوح — يضيف رقاقة بعملتَي الزوج معاً (أخبار ما يتداوله الآن فعلاً). */
  symbol?: string;
  onPickCurrency?: (currency: string) => void;
  /**
   * اللوحة معروضة فعلاً للمتداول. `false` يوقف **مؤقّتَيها** (ساعة العدّ التنازلي كل دقيقة،
   * وإعادة الجلب الصامتة كل خمس دقائق) ولا يمسّ شيئاً معروضاً.
   *
   * شاشات التبويبات السفلية **تبقى مركَّبة بعد الانتقال عنها**: فمن فتح تبويب «التقويم» ثم عاد
   * للشارت كان يترك خلفه ساعةً **تُعيد تصيير قائمة التقويم كلّها كل دقيقة** بقيّة الجلسة — صفوفاً
   * لا يراها أحد، وهي القائمة الأطول بالتطبيق (تقويم أسبوع كامل بصندوق تمرير لا نافذة). وإعادة
   * الجلب أخفّ كلفةً (الخادم يخزّن النتيجة ثلاثين دقيقة) لكنها طلبٌ بلا قارئ كذلك.
   *
   * **وبالعودة تُضبط الساعة ويُعاد الجلب فوراً** لا بانتظار دورة، فأول ما يراه المتداول أحدث ممّا
   * كان يراه لا أقدم. الافتراض `true` فكل موضع لا يمرّرها (الشريط الجانبي، الرصيف) يبقى كما كان.
   */
  active?: boolean;
};

export function CalendarPanel({ compact = false, flow = false, symbol, onPickCurrency, active = true }: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [events, setEvents] = useState<Ev[]>([]);
  const [currency, setCurrency] = useState('ALL');
  const [impact, setImpact] = useState<ImpactFilter>('ALL');
  /** لا نجلب قبل قراءة الفلتر المحفوظ — وإلا طلبان متتاليان (الكل ثم المحفوظ) ووميض قائمة خاطئة. */
  const [filtersReady, setFiltersReady] = useState(false);
  /** وضوح الحالة: تمييز "جاري التحميل" و"فشل الاتصال" عن "لا أحداث فعلاً بهذا الفلتر" */
  const [status, setStatus] = useState<'loading' | 'ok' | 'error' | 'unavailable'>('loading');
  /** الخادم أجاب من تقويمه المحفوظ لأن آخر تحديث من المصدر فشل (backend-r27) */
  const [serverStale, setServerStale] = useState(false);
  /** `as_of` للجلب الناجح السابق (ثوانٍ UTC) حين `stale` — null إن غاب أو لم يُقرأ ⇒ السطر العام بلا وقت. */
  const [serverAsOf, setServerAsOf] = useState<number | null>(null);
  /** ساعة داخلية للعدّ التنازلي ("بعد 2س 15د") — تُحدَّث كل دقيقة */
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    // ضبطٌ فوري عند العودة: بلا ذلك يبقى العدّ التنازلي **دقيقةً كاملة** على رقمٍ عمره غيابُ
    // الشاشة كلّه («بعد 3س» لحدثٍ صدر منذ ساعة). ومناداتها لحظة التركيب لا تغيّر معروضاً —
    // القيمة الابتدائية هي `Date.now()` نفسها والعدّ بدقّة الدقيقة.
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(FILTER_KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        const v = JSON.parse(raw) as { currency?: unknown; impact?: unknown };
        if (typeof v.currency === 'string' && (CURRENCIES.includes(v.currency) || v.currency === PAIR)) {
          setCurrency(v.currency);
        }
        if (typeof v.impact === 'string' && (IMPACTS as readonly string[]).includes(v.impact)) {
          setImpact(v.impact as ImpactFilter);
        }
      })
      .catch(() => {
        /* تخزين تالف/غير متاح — نبدأ بـ«الكل» كما كان */
      })
      .finally(() => {
        if (alive) setFiltersReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!filtersReady) return;
    AsyncStorage.setItem(FILTER_KEY, JSON.stringify({ currency, impact })).catch(() => {
      /* فشل الحفظ لا يمنع استخدام الفلتر */
    });
  }, [filtersReady, currency, impact]);

  /**
   * جلب التقويم. **كانت اللوحة تجلب مرة واحدة فقط ثم لا تُعيد أبداً وهي مفتوحة**: العدّ التنازلي
   * وحده كان يتحرّك (ساعة داخلية)، فيصل حدث «الرواتب غير الزراعية» إلى «الآن» ثم لا يظهر الرقم
   * **الفعلي** إطلاقاً حتى يبدّل المتداول التبويب ويعود — والرقم الفعلي هو كل الغرض لحظة الصدور.
   * الآن تُعاد كل `RELOAD_MS` صامتةً: `silent` لا يُظهر «جاري التحميل» ولا يمسح القائمة عند فشل
   * الشبكة (اللوحة تبقى على آخر أحداث معروفة بدل أن تُفرَّغ تحت المتداول بسبب انقطاع لحظي).
   */
  const load = useCallback(
    (silent: boolean, alive: { on: boolean }) => {
      if (!silent) setStatus('loading');
      api
        .calendar({
          // فلترا «الزوج» و«متوسط+» محليان: نجلب الكل ثم نصفّي
          currency: currency === 'ALL' || currency === PAIR ? undefined : currency,
          impact: impact === 'ALL' || impact === 'medplus' ? undefined : impact,
        })
        .then((r) => {
          if (!alive.on) return;
          // الخادم يعيد `{events: [], status: 'unavailable'}` حين يفشل المصدر (backend-r1). كانت
          // المصفوفة الفارغة تُقرأ نجاحاً ⇒ «لا أحداث بهذا الفلتر» يوم خبر قوي. بالتحديث الصامت
          // نُبقي آخر أحداث معروفة (كفشل الشبكة) لكن السطر يقول إن التقويم غير متاح الآن.
          if (r.status === 'unavailable') {
            if (!silent) setEvents([]);
            setStatus('unavailable');
            return;
          }
          setEvents(r.events);
          setServerStale(r.stale === true);
          setServerAsOf(r.stale === true ? asOfSeconds(r.as_of) : null);
          setStatus('ok');
        })
        .catch(() => {
          if (!alive.on || silent) return;
          setEvents([]);
          setStatus('error');
        });
    },
    [currency, impact]
  );

  /**
   * الجلب **الظاهر**: أول تحميل، وكل تغيّر فلتر. حارس "alive" يمنع تحديث الحالة بعد إلغاء تركيب
   * اللوحة أو تغيّر الفلتر قبل وصول طلب سابق (نفس نمط ChartFrame/SymbolSnapshot/FocusChartModal
   * المؤسَّس بالكود).
   *
   * **لا يحجبه `active`** عمداً: لوحةٌ رُكِّبت وهي مخفيّة كانت ستبقى على «جارٍ التحميل» إلى الأبد لو
   * مُنع عنها أول جلب. والفلتر لا يتغيّر إلا بيد من يرى اللوحة، فلا طلب هنا بلا قارئ.
   */
  useEffect(() => {
    if (!filtersReady) return;
    const alive = { on: true };
    load(false, alive);
    return () => {
      alive.on = false;
    };
  }, [filtersReady, load]);

  /**
   * الدورة الصامتة — **موقوفة خلف الشاشة**، وتُستأنف بجلبٍ فوري عند العودة.
   *
   * `returning` يميّز «عادت الشاشة» عن «تغيّر الفلتر»: الأول يستحقّ جلباً صامتاً فورياً (القائمة
   * معروضة، فـ«جارٍ التحميل» كان سيمسحها وفشلُ الشبكة كان سيُفرّغها)، والثاني يتكفّل به الأثر أعلاه
   * ظاهراً كما كان. وعند التركيب `returning` كاذب دائماً فلا طلب مكرَّر مع أول تحميل.
   */
  const wasActiveRef = useRef(active);
  useEffect(() => {
    const returning = active && !wasActiveRef.current;
    wasActiveRef.current = active;
    if (!filtersReady || !active) return;
    const alive = { on: true };
    if (returning) load(true, alive);
    const id = setInterval(() => load(true, alive), RELOAD_MS);
    return () => {
      alive.on = false;
      clearInterval(id);
    };
  }, [filtersReady, load, active]);

  const IMPACT_LABEL: Record<'high' | 'medium' | 'low', string> = {
    high: t.impactHigh,
    medium: t.impactMedium,
    low: t.impactLow,
  };

  /** عملتا زوج الشارت المعروفتان بالتقويم (XAUUSD → USD فقط)؛ فارغة لرمز ليس فوركس/معدن → لا رقاقة. */
  const pairCcys = useMemo(() => {
    const spec = symbol ? instrumentSpec(symbol) : null;
    if (!spec) return [] as string[];
    return [spec.base, spec.quote].filter((c) => CURRENCIES.includes(c));
  }, [symbol]);
  const pairLabel = symbol && pairCcys.length > 0 ? instrumentSpec(symbol)?.symbol ?? null : null;
  /** فلتر «الزوج» محفوظ لكن الرمز الحالي ليس زوجاً معروفاً → يُعامل كـ«الكل» بدل قائمة فارغة غامضة */
  const pairActive = currency === PAIR && pairCcys.length > 0;

  // `newsCurrencyMatches` نفسها التي يحذّر بها الشريط: حدث `ALL` (G20) يمسّ كل زوج — كان `includes` يُخفيه
  // بفلتر «الزوج» بينما الشريط فوقه يحذّر منه للزوج نفسه (launch128).
  const pairSet = useMemo(() => new Set(pairCcys), [pairCcys]);
  const visible = events.filter(
    (e) =>
      (!pairActive || newsCurrencyMatches(e.currency, pairSet)) &&
      (impact !== 'medplus' || e.impact === 'high' || e.impact === 'medium')
  );

  const impactWord = (imp: string): string | null =>
    imp === 'high' || imp === 'medium' || imp === 'low'
      ? IMPACT_LABEL[imp]
      : imp === 'holiday'
        ? t.impactHoliday
        : null;

  const hasTs = (e: Ev): e is Ev & { ts: number } => typeof e.ts === 'number' && Number.isFinite(e.ts);
  /**
   * backend-r14: حدث **بلا ساعة معلنة** كان يُعرض بـ`fmtLocal(ts)` ⇒ «07:00» ساعة مخترَعة (منتصف ليل نيويورك
   * بتوقيت الجهاز) مع عدّ تنازلي إليها، ويُحسب ضمن «القادم خلال 24 ساعة». الآن: التاريخ وحده + «الساعة غير
   * معلنة»، بلا عدّ ولا تلوين «قريب»، خارج العدّاد؛ ويبقى «قادماً» حتى نهاية يومه (نفس قاعدة شريط الأخبار).
   */
  const tbd = (e: Ev): boolean => hasTs(e) && newsTimeUnannounced(e);
  /** لحظة انتهاء الحدث: الموقوت بعد نافذة «الآن»، وما بلا ساعة بنهاية يومه */
  const endMs = (e: Ev & { ts: number }) => e.ts * 1000 + (tbd(e) ? UNANNOUNCED_SPAN_MS : NOW_WINDOW_MS);
  const timed = visible.filter(hasTs);
  const upcoming = timed.filter((e) => endMs(e) >= now).sort((a, b) => a.ts - b.ts);
  const past = timed.filter((e) => endMs(e) < now).sort((a, b) => b.ts - a.ts);
  const untimed = visible.filter((e) => !hasTs(e));
  /** الأحداث القادمة أولاً (الأقرب فالأبعد)، ثم ما بلا وقت دقيق، ثم المنتهية (باهتة) */
  const ordered: Ev[] = [...upcoming, ...untimed, ...past];
  const soonCount = upcoming.filter((e) => !tbd(e) && e.ts * 1000 <= now + SOON_MS).length;
  const timeTbdWord = t.calTimeTbd;
  const isSample = events.some((e) => e.sample);

  const dayWord = (d: Date) => {
    // «غداً» بالتقويم المحلي لا «بعد 24 ساعة»: يوم تغيير التوقيت الصيفي 25 ساعة فكان now+24h يقع باليوم نفسه
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return sameDay(d, new Date(now))
      ? t.calToday
      : sameDay(d, tomorrow)
        ? t.calTomorrow
        : `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
  };
  const fmtLocal = (ts: number) => {
    const d = new Date(ts * 1000);
    return `${dayWord(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };
  /**
   * تاريخ حدثٍ بلا ساعة = **يومه بنيويورك** (المصدر)، لا يوم منتصف ليله بتوقيت الجهاز (غرب نيويورك كان
   * سيقع باليوم السابق). ظهر نيويورك (+12س) يقع بالتاريخ نفسه UTC على مدار السنة.
   */
  const fmtTbd = (ts: number) => {
    const noon = new Date(ts * 1000 + 12 * 3_600_000);
    const d = new Date(noon.getUTCFullYear(), noon.getUTCMonth(), noon.getUTCDate());
    return `${dayWord(d)} · ${timeTbdWord}`;
  };

  /** «فعلي 0.4% · توقّع 0.3% · سابق 0.2%» — الفارغ يُحذف؛ باك-إند أقدم → نص `forecast` كما كان. */
  const figuresLine = (e: Ev): string => {
    if (e.forecast_value === undefined && e.previous === undefined && e.actual === undefined) {
      return e.forecast && e.forecast !== '—' ? e.forecast : '';
    }
    const parts: string[] = [];
    if (e.actual) parts.push(`${t.calActual} ${e.actual}`);
    if (e.forecast_value) parts.push(`${t.calForecast} ${e.forecast_value}`);
    if (e.previous) parts.push(`${t.calPrevious} ${e.previous}`);
    return parts.join(' · ');
  };

  const relLabel = (ts: number) => {
    const diff = ts * 1000 - now;
    if (Math.abs(diff) <= NOW_WINDOW_MS) return t.calNow;
    if (diff < 0) return t.calPast;
    const mins = Math.round(diff / 60_000);
    // التقويم أسبوعي (حدث الجمعة يبعد ~96س يوم الاثنين): «بعد 4ي 2س» أوضح من «بعد 96س 15د»
    if (mins >= 1440) {
      const days = Math.floor(mins / 1440);
      const h = Math.floor((mins % 1440) / 60);
      return `${t.calInPrefix} ${days}${t.calDayShort}${h ? ` ${h}${t.calHourShort}` : ''}`;
    }
    const h = Math.floor(mins / 60);
    return `${t.calInPrefix} ${h ? `${h}${t.calHourShort} ` : ''}${mins % 60}${t.calMinShort}`;
  };

  /**
   * صفوف التقويم — تُركَّب مرة وتُعرض بصندوقين مختلفين بحسب من يستضيف اللوحة (انظر `flow` أدناه).
   */
  const rows = (
    <>
      {status === 'loading' ? (
        <Text style={[styles.empty, { textAlign: align }]}>{t.calendarLoading}</Text>
      ) : visible.length === 0 ? (
        status === 'error' ? (
          <Text style={[styles.empty, { textAlign: align }]}>{t.calendarLoadError}</Text>
        ) : status === 'unavailable' ? (
          <Text style={[styles.empty, { textAlign: align }]}>{t.calendarUnavailable}</Text>
        ) : (
          <Text style={[styles.empty, { textAlign: align }]}>{t.calendarEmpty}</Text>
        )
      ) : (
        ordered.map((e) => {
          const ts = hasTs(e) ? e.ts : null;
          const noHour = tbd(e);
          const soon = ts != null && !noHour && ts * 1000 >= now - NOW_WINDOW_MS && ts * 1000 <= now + ROW_SOON_MS;
          const done = ts != null && endMs(e as Ev & { ts: number }) < now;
          const figures = figuresLine(e);
          return (
            <View key={e.id} style={[styles.row, rtl && styles.rowRtl, soon && styles.rowSoon, done && styles.rowDone]}>
              <View
                style={[styles.dot, { backgroundColor: IMPACT_COLOR[e.impact] ?? colors.textDim }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.evTitle, { textAlign: align }]}>{e.title}</Text>
                {/* الأهمية كلمة ملوّنة لا نقطة لون فقط — نقطة حمراء/برتقالية وحدها لا تُقرأ لمن لديه عمى
                    ألوان ولا لقارئ الشاشة */}
                <Text style={[styles.meta, { textAlign: align }]}>
                  {e.currency.trim().toUpperCase() === 'ALL' ? t.newsAllCurrencies : e.currency}
                  {impactWord(e.impact) ? (
                    <Text style={{ color: IMPACT_COLOR[e.impact] ?? colors.textDim, fontWeight: '500' }}>
                      {` · ${impactWord(e.impact)}`}
                    </Text>
                  ) : null}
                  {` · ${ts == null ? e.when : noHour ? fmtTbd(ts) : fmtLocal(ts)}`}
                </Text>
                {figures ? (
                  <Text style={[styles.figures, { textAlign: align }]}>{figures}</Text>
                ) : null}
              </View>
              {ts != null && !done && !noHour ? (
                <Text style={[styles.rel, soon && styles.relSoon]}>{relLabel(ts)}</Text>
              ) : null}
            </View>
          );
        })
      )}
    </>
  );

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { textAlign: align }]}>{t.calendarTitle}</Text>
      {timed.length > 0 ? (
        <Text style={[styles.tzNote, { textAlign: align }]}>
          {t.calTimesLocal} ({tzLabel()}) · {t.calUpcomingHead}: {soonCount}
        </Text>
      ) : null}
      {isSample ? <Text style={[styles.sampleNote, { textAlign: align }]}>{t.calSampleBanner}</Text> : null}
      {/* أحداث محفوظة من جلب سابق والمصدر لا يستجيب الآن — القائمة قد تكون ناقصة */}
      {status === 'unavailable' && visible.length > 0 ? (
        <Text style={[styles.sampleNote, { textAlign: align }]}>{t.calendarUnavailable}</Text>
      ) : null}
      {/* الخادم نفسه لم يحدّث من المصدر (backend-r27): الأحداث حقيقية لكن قد يفوتها تعديل أو حدث جديد */}
      {status === 'ok' && serverStale && visible.length > 0 ? (
        <Text style={[styles.sampleNote, { textAlign: align }]}>
          {serverAsOf != null ? t.calStaleAsOf.replace('{time}', fmtLocal(serverAsOf)) : t.newsStale}
        </Text>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.filters, rtl && styles.filtersRtl]}>
          {pairLabel ? (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.chip,
                pairActive && styles.chipOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => setCurrency(PAIR)}
              accessibilityLabel={`${t.calendarCurrencyA11yPrefix}: ${pairCcys.join(' + ')}`}
              accessibilityState={{ selected: pairActive }}
            >
              <Text style={[styles.chipText, pairActive && styles.chipTextOn]}>{pairLabel}</Text>
            </Pressable>
          ) : null}
          {CURRENCIES.map((c) => (
            <Pressable
              accessibilityRole="button"
              key={c}
              style={({ pressed }) => [
                styles.chip,
                (currency === c || (c === 'ALL' && currency === PAIR && !pairActive)) && styles.chipOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => {
                setCurrency(c);
                if (c !== 'ALL') onPickCurrency?.(c);
              }}
              accessibilityLabel={`${t.calendarCurrencyA11yPrefix}: ${c === 'ALL' ? t.calendarAllWord : c}`}
              accessibilityState={{ selected: currency === c || (c === 'ALL' && currency === PAIR && !pairActive) }}
            >
              <Text
                style={[
                  styles.chipText,
                  (currency === c || (c === 'ALL' && currency === PAIR && !pairActive)) && styles.chipTextOn,
                ]}
              >
                {c}
              </Text>
            </Pressable>
          ))}
          {IMPACTS.map((imp) => (
            <Pressable
              accessibilityRole="button"
              key={imp}
              style={({ pressed }) => [
                styles.chip,
                impact === imp && styles.chipOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => setImpact(imp)}
              accessibilityLabel={`${t.calendarImpactA11yPrefix}: ${
                imp === 'ALL' ? t.calendarAllWord : imp === 'medplus' ? t.calImpactMedPlusA11y : IMPACT_LABEL[imp]
              }`}
              accessibilityState={{ selected: impact === imp }}
            >
              <Text style={[styles.chipText, impact === imp && styles.chipTextOn]}>
                {imp === 'ALL' ? t.calendarAllShort : imp === 'medplus' ? t.calImpactMedPlus : IMPACT_LABEL[imp]}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {/**
        * صندوق الصفوف: نافذة تُمرَّر داخلياً بالمواضع التي تشارك فيها اللوحةُ صفحةً مع غيرها (اللوح
        * الجانبي/الرصيف)، وسردٌ متدفّق حين تملك اللوحة الصفحةَ وحدها (`flow`) — فالصفحة نفسها هي
        * التي تُمرَّر. تعشيش تمرير داخل تمرير بصفحة لا شيء فيها غير التقويم كان يحبس القائمة بنافذة
        * خمسة صفوف والشاشةُ فارغة تحتها، ويشتّت إيماءة السحب بين صندوقين متداخلين.
        */}
      {flow ? <View>{rows}</View> : <ScrollView style={{ maxHeight: compact ? 140 : 280 }}>{rows}</ScrollView>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  title: { color: colors.text, fontWeight: '500', textAlign: 'right', fontSize: 13 },
  filters: { flexDirection: 'row', gap: 4, paddingVertical: spacing.xs },
  filtersRtl: { flexDirection: 'row-reverse' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
  },
  chipOn: { borderColor: 'transparent', backgroundColor: colors.accentSoft },
  chipText: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  chipTextOn: { color: colors.text },
  empty: { color: colors.textDim, textAlign: 'right', fontSize: 11, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: 8 },
  rowRtl: { flexDirection: 'row-reverse' },
  rowSoon: { backgroundColor: colors.accentFaint, borderRadius: radii.sm, paddingHorizontal: spacing.xs },
  rowDone: { opacity: 0.45 },
  rel: { color: colors.textDim, fontSize: 11, fontWeight: '500', marginTop: 4 },
  relSoon: { color: colors.accent },
  tzNote: { ...numeric, color: colors.textDim, fontSize: 11 },
  sampleNote: { ...numeric, color: colors.warn, fontSize: 11, fontWeight: '500' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: spacing.xs },
  evTitle: { color: colors.text, textAlign: 'right', fontSize: 12, fontWeight: '600' },
  meta: { ...numeric, color: colors.textDim, textAlign: 'right', fontSize: 11, marginTop: 4 },
  figures: { color: colors.textMuted, textAlign: 'right', fontSize: 11, marginTop: 0 },
});
