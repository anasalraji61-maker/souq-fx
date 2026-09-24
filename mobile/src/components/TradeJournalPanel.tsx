import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { api } from '../api';
import { playSoftClick } from '../audio/playSoftClick';
import { useI18n } from '../i18n/I18nContext';
import { parseDecimal } from '../parseDecimal';
import { formatPrice } from '../chart/math';
import { isRealQuote } from '../chart/dataSource';
import { instrumentSpec } from '../positionSize';
import {
  analyzePlan,
  floatingResult,
  formatPips,
  formatR,
  formatRR,
  levelSideIssue,
  realizedMove,
  realizedR,
  roundR,
  QUICK_RR,
  targetAtRR,
  type PlanIssue,
  type TradePlan,
} from '../tradePlan';
import { NewsRiskBanner } from './NewsRiskBanner';

/** نفس أزواج الاختيار السريع بحاسبة المخاطرة — تسجيل صفقة بنقرة بدل كتابة الرمز بلوحة مفاتيح بيد واحدة. */
const QUICK_SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'GBPJPY', 'EURGBP'];

/**
 * سقف عدد الأدوات التي يُجلب لها سعر السوق للنتيجة العائمة. `/api/market/quote` **لا يُخزَّن**
 * بالخادم (خلافاً للشموع والتقويم): كل نداء = طلبٌ عند المزوّد. ومن يفتح عشرين صفقة على عشرين أداة
 * حالةٌ نادرة لا تستحق عشرين طلباً دفعةً واحدة — أدوات الصفقات المفتوحة الأربع الأولى بترتيب الخادم
 * (الأحدث تسجيلاً أولاً، وهي الأولى بالحاجة) تغطّي دفتر متداول التجزئة عملياً، وما بعدها يبقى كما
 * كان بلا سطر عائم.
 */
const MAX_LIVE_QUOTES = 4;

/**
 * تقريبٌ مطابق لتقريب بايثون (`round`) الذي يحسب به الخادم إحصاءات الدفتر: **النصف إلى الزوجي**،
 * لا `Math.round` الذي يرفع النصف دائماً. ليس تدقيقاً نظرياً: نسبة النجاح بست عشرة صفقة مغلقة
 * وفوزٍ واحد هي 6.25 بالضبط (قيمة ثنائية تامّة، لا تقريب عائم) — الخادم يكتبها 6.2 و`Math.round`
 * يكتبها 6.3. ومجموع النتائج يقع على 0.125 و0.375 وأمثالها كثيراً. فالفارق يظهر بالشاشة رقماً
 * يخالف ما يعرضه الخادم لنفس الصفقات.
 */
const roundHalfEven = (v: number, d: 1 | 2): number => {
  if (!Number.isFinite(v)) return v;
  /**
   * النصف التامّ لا يقع إلا على مضاعفٍ فرديّ لـ0.25 (خانة) أو 0.125 (خانتان) — وحدها الأنصافُ
   * الممثَّلة ثنائياً تماماً. و«19.925» المكتوبة ليست نصفاً: قيمتها الثنائية 19.92500000000000071
   * أي **فوق** النصف، فالخادم يرفعها لـ19.93. وضربها في 100 يُنتج 1992.5 بالضبط فيُخفي ذلك —
   * ولهذا لا يُستعمل الضرب إلا حيث ثبت أنه مضبوط.
   */
  const y = v * (d === 1 ? 4 : 8);
  if (Number.isInteger(y) && Math.abs(y % 2) === 1) {
    const p = d === 1 ? 10 : 100;
    const fl = Math.floor(v * p); // مضبوط هنا: القيمة ثنائية تامّة
    return (fl % 2 === 0 ? fl : fl + 1) / p; // النصف إلى الزوجي، بالإشارتين
  }
  // ما عدا ذلك: toFixed يُقرِّب من القيمة الثنائية **الدقيقة** لا من حاصل ضربٍ مُقرَّب، كبايثون.
  return Number(v.toFixed(d));
};

/** +80 / −12.5 pip — نفس علامة الناقص المطبعية لـformatR. */
const formatSignedPips = (p: number): string => {
  const abs = formatPips(Math.abs(p)) ?? '0';
  return `${p > 0 ? '+' : p < 0 ? '−' : ''}${abs}`;
};

type Trade = {
  id: string;
  symbol: string;
  side: string;
  entry: number;
  exit?: number | null;
  size: number;
  pnl?: number | null;
  /** وقف/هدف اختياريان (غائبان بسجلات قديمة أو باك-إند قديم). */
  sl?: number | null;
  tp?: number | null;
  note: string;
  status: string;
  opened_at: string;
};

type Stats = {
  trade_count: number;
  win_rate: number;
  total_pnl_pct: number;
  avg_win: number;
  avg_loss: number;
  best: number;
  worst: number;
};

type Props = {
  /** رمز الشارت/الإشارة المفتوح — التسجيل يبدأ به بدل EURUSD ثابت (كالحاسبة والباك-تست). */
  defaultSymbol?: string;
  /**
   * اللوحة تملك الصفحة وحدها (تبويب «الدفتر» بشاشة الأدوات): الصفقات تُسرَد متدفّقة بلا نافذة تمرير
   * داخلية، فالصفحة هي التي تُمرَّر. بغيره تبقى النافذة المحدودة كما هي بمواضع المشاركة.
   */
  flow?: boolean;
  /**
   * أسعار حيّة جاهزة من مقبس التيكات بالشاشة الحاضنة — **مفتاحها رمزُ الأداة بحروف كبيرة**.
   * تُقدَّم على لقطة `/api/market/quote` بالسطر العائم للصفقة المفتوحة لأنها تتحرّك مع السوق
   * بدل أن تتجمّد عند لحظة التحميل، وهي **بلا أي طلب إضافي** (بثٌّ واحد للشاشة كلها).
   *
   * الحاضنة هي التي تضمن أن ما يصل هنا سعرٌ يصحّ البناء عليه (لا بثّ تجريبي عشوائي، ولا سعر
   * مجمَّد فات عمره). فالغياب هنا يعني «لا سعر حيّ موثوق» لا «لا سعر»: يعود الصفّ للّقطة.
   */
  ticks?: Record<string, number>;
};

export function TradeJournalPanel({ defaultSymbol, flow = false, ticks }: Props = {}) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState(defaultSymbol || 'EURUSD');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [entry, setEntry] = useState('');
  const [exit, setExit] = useState('');
  /** حجم الصفقة باللوت — «سجّل الخطة بالدفتر» بالحاسبة يرسل اللوت المحسوب، بينما التسجيل اليدوي كان
   * لا يرسل `size` إطلاقاً فيضع الباك-إند 1 (`db.py:1578`): صفقتان متطابقتان بحجمين مختلفين حسب طريق
   * التسجيل. اختياري — الفارغ يبقى كما كان بالضبط (لا يُرسل الحقل). */
  const [size, setSize] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  /** جلب «السعر الحالي» لخانة الدخول جارٍ */
  const [quoteBusy, setQuoteBusy] = useState(false);
  /** وضوح الحالة: يميّز "لا صفقات بعد" فعلياً عن فشل تحميل السجل */
  const [listError, setListError] = useState(false);
  /** وضوح الحالة: يعلم المستخدم إذا فشلت إضافة صفقة بدل صمت كامل (لم يكن هناك حتى catch) */
  const [formError, setFormError] = useState<string | null>(null);
  /** صفقة قيد التعديل — النموذج نفسه يُملأ بها و«إضافة» يصبح «حفظ التعديل» (خطأ كتابة بالدخول كان يُفسد
   * الإحصاءات، والحلّ الوحيد كان الحذف وإعادة الكتابة). */
  const [editing, setEditing] = useState<Trade | null>(null);
  /** عدسة المراجعة: الأداة المختارة بشرائح الفلتر — `null` = الكل. */
  const [filterSym, setFilterSym] = useState<string | null>(null);

  // حارس "alive" مبني على ref يمنع تحديث الحالة بعد إلغاء تركيب اللوحة (تبديل تبويب
  // ToolsScreen قبل اكتمال الطلب) — نفس مبدأ ChartFrame/SymbolSnapshot المؤسَّس بالكود.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * سعر السوق الآن لأدوات الصفقات **المفتوحة** وحدها — مصدر السطر العائم بصفوفها. الرموز بحروف
   * كبيرة كما تُكتب بالمفتاح. رمزٌ غاب عن الكائن = لا سعر موثوق له (اقتباس بذري تجريبي، أو فشل
   * شبكة، أو تجاوَز السقف) فيبقى صفّه كما كان تماماً — لا رقم عائم من سعر لا نملكه.
   */
  const [quotes, setQuotes] = useState<Record<string, number>>({});
  const quoteGenRef = useRef(0);

  /**
   * **لماذا بلا مؤقّت**: `/api/market/quote` غير مخزَّن بالخادم، فاستطلاعٌ كل دقيقة لأربع أدوات =
   * أربعة طلبات بالدقيقة ما بقي التبويب مفتوحاً — كلفةٌ تُقاس مقابل حدّ المزوّد قبل أن تُفتعَل. فالسعر
   * هنا **لقطةٌ** تُؤخذ مع كل تحميل للدفتر (فتح التبويب، وبعد كل إضافة/تعديل/إغلاق/حذف)، والسطر
   * العائم أداةُ توجيهٍ لا سعرُ تنفيذ: زرّ «إغلاق بسعر السوق» يجلب اقتباسه الطازج بنفسه لحظة الضغط
   * ويعرضه بالتأكيد قبل الحفظ، فالرقم الذي يُحسم عليه القرار ليس هذه اللقطة أبداً.
   *
   * **وتبقى اللقطة رغم وصول التيكات الحيّة** (`ticks`): البثّ يحمل ما اشترك به الخادم لا كل
   * أداة قد تكون بصفقة مفتوحة، ويسقط بالعطلة وبانقطاع المزوّد. فهما طبقتان لا بديلتان —
   * الحيّ يتقدّم حيث وُجد، واللقطة تغطّي الباقي.
   */
  const loadOpenQuotes = useCallback(async (list: Trade[]) => {
    const syms = [
      ...new Set(
        list
          .filter((tr) => tr.status === 'open')
          .map((tr) => (tr.symbol || '').trim().toUpperCase())
          .filter((sym) => sym.length >= 3)
      ),
    ].slice(0, MAX_LIVE_QUOTES);
    const gen = ++quoteGenRef.current;
    if (syms.length === 0) {
      // لا صفقات مفتوحة ⇒ لا طلب أصلاً، ويُفرَّغ الكائن (بالمرجع نفسه إن كان فارغاً: لا تصيير زائد)
      if (mountedRef.current) setQuotes((cur) => (Object.keys(cur).length === 0 ? cur : {}));
      return;
    }
    const got = await Promise.all(
      syms.map(async (sym) => {
        try {
          const q = await api.marketQuote(sym);
          // اقتباس بذري تجريبي (مزوّد غير مهيّأ/رمز مجهول) ليس سعر سوق — نتيجة عائمة منه رقمٌ مختلَق
          return isRealQuote(q) ? ([sym, q.price] as const) : null;
        } catch {
          return null;
        }
      })
    );
    // تبديل قائمة الصفقات أثناء الطلب (إغلاق صفقة مثلاً) يُلغي هذه النتيجة — لا أسعار لقائمة سابقة
    if (!mountedRef.current || gen !== quoteGenRef.current) return;
    const next: Record<string, number> = {};
    for (const pair of got) if (pair) next[pair[0]] = pair[1];
    setQuotes(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await api.trades();
      if (!mountedRef.current) return;
      const list = res.trades as Trade[];
      setTrades(list);
      setStats(res.stats as Stats);
      setListError(false);
      void loadOpenQuotes(list);
    } catch {
      if (mountedRef.current) {
        setTrades([]);
        setStats(null);
        setListError(true);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [loadOpenQuotes]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // تبديل زوج الشارت يُبدّل رمز التسجيل — لكن ليس وسط تسجيل صفقة مكتوبة (سعر دخول مكتوب لرمز آخر
  // كان سيُسجَّل تحت الرمز الجديد).
  const entryRef = useRef(entry);
  entryRef.current = entry;
  useEffect(() => {
    if (defaultSymbol && entryRef.current.trim() === '') setSymbol(defaultSymbol);
  }, [defaultSymbol]);

  /** سعر الدخول بنقرة: المتداول يسجّل الصفقة لحظة فتحها غالباً. Ask للشراء وBid للبيع إن توفّرا (ما ينفَّذ
   * عليه فعلاً)، وإلا السعر. اقتباس بذري تجريبي لا يُستخدم أبداً (isRealQuote) — لا دخول مختلَق. */
  const fillLivePrice = async () => {
    const sym = symbol.trim().toUpperCase();
    if (sym.length < 3 || quoteBusy) return;
    setQuoteBusy(true);
    setFormError(null);
    try {
      const q = await api.marketQuote(sym);
      if (!mountedRef.current) return;
      if (!isRealQuote(q)) {
        setFormError(t.journalNoLiveQuote);
        return;
      }
      const sidePx = side === 'buy' ? q.ask : q.bid;
      const px = typeof sidePx === 'number' && Number.isFinite(sidePx) && sidePx > 0 ? sidePx : q.price;
      setEntry(formatPrice(px, sym));
      playSoftClick();
    } catch {
      if (mountedRef.current) setFormError(t.journalNoLiveQuote);
    } finally {
      if (mountedRef.current) setQuoteBusy(false);
    }
  };

  /** "1,0850" / «١٫٠٨٥٠» / «2,350.50» → رقم (راجع parseDecimal.ts)؛ خانة فارغة أو غير رقمية → null. */
  const num = (v: string): number | null => {
    const n = parseDecimal(v);
    return n != null && n > 0 ? n : null;
  };
  /** نص مكتوب لكنه غير مفهوم — كان الوقف/الهدف/الخروج يُحفظ فارغاً بصمت (صفقة مغلقة تُسجَّل مفتوحة). */
  const unreadable = (v: string) => v.trim() !== '' && num(v) == null;

  /** رسالة واضحة لوقف/هدف بالجهة الخطأ — نفس نصوص خطة الصفقة بلوحة الأفكار. */
  const planIssueText = (issue: PlanIssue | null): string | null => {
    if (issue === 'slWrongSide') return side === 'buy' ? t.planSlWrongBuy : t.planSlWrongSell;
    if (issue === 'tpWrongSide') return side === 'buy' ? t.planTpWrongBuy : t.planTpWrongSell;
    return null;
  };

  /** "المخاطرة 25 pip · الربح المحتمل 50 pip · R:R 1:2.0" */
  const planSummary = (plan: TradePlan): string => {
    const dist = (pips: number | null, d: number) => {
      const p = formatPips(pips);
      return p != null ? `${p} pip` : String(Math.round(d * 1e5) / 1e5);
    };
    return `${t.planRiskWord} ${dist(plan.riskPips, plan.riskDist)} · ${t.planRewardWord} ${dist(plan.rewardPips, plan.rewardDist)} · R:R ${formatRR(plan.rr)}`;
  };

  // معاينة حيّة أثناء الكتابة: خطأ جهة فوراً (حتى بوقف وحده)، والملخّص حين تكتمل الأرقام الثلاثة.
  const draft = useMemo(() => {
    const e = num(entry);
    if (e == null) return null;
    const s = num(sl);
    const p = num(tp);
    const issue = levelSideIssue({ side, entry: e, sl: s, tp: p });
    if (issue) return { issue, plan: null as TradePlan | null };
    if (s == null || p == null) return null;
    return { issue: null, plan: analyzePlan({ symbol: symbol.trim(), side, entry: e, sl: s, tp: p }) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, side, entry, sl, tp]);

  /**
   * أهداف جاهزة بالنسبة (1:1 · 1:1.5 · 1:2 · 1:3) من الدخول والوقف المكتوبين — نفس شرائح الحاسبة:
   * الهدف يُقرَّر بالنسبة غالباً، وكتابته بيدٍ بعد حسابه ذهنياً هي الخطوة التي تنقلب فيها منزلة.
   * لا تظهر بوقف بالجهة الخطأ (التحذير يقول ذلك أصلاً) ولا بوقف أضيق من pip (`slTooClose`).
   */
  const rrTargets = useMemo(() => {
    const e = num(entry);
    const s = num(sl);
    if (e == null || s == null || levelSideIssue({ side, entry: e, sl: s })) return [];
    const sym = symbol.trim().toUpperCase();
    const spec = instrumentSpec(sym);
    if (spec && Math.abs(e - s) < spec.pipSize * (1 - 1e-6)) return [];
    return QUICK_RR.flatMap((rr) => {
      const v = targetAtRR({ symbol: sym, side, entry: e, sl: s, rr });
      // `tol`: الشريحة «مختارة» حين تطابق الخانةُ سعرَها (نصف pipette، أو مطابقة شبه تامّة بلا مواصفات)
      const tol = spec ? spec.pipSize / 20 : Math.abs(v ?? 0) * 1e-9;
      return v != null ? [{ rr, v, tol, text: spec ? formatPrice(v, sym) : String(v) }] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, side, entry, sl]);

  /**
   * أدوات الدفتر وعدد صفقات كلٍّ منها، الأكثر تداولاً أولاً. الشرائح لا تظهر إلا بأداتين فأكثر:
   * من يتداول زوجاً واحداً لا يُعرض له فلترٌ بخيار واحد.
   */
  const symbolCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const tr of trades) {
      const key = (tr.symbol || '').trim().toUpperCase();
      if (!key) continue;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [trades]);

  /**
   * الفلتر الفعّال **مشتقّ** لا مخزَّن: لو حُذفت آخر صفقة للأداة المختارة اختفت شريحتها، فيعود
   * العرض «للكل» من تلقائه — بلا `useEffect` يُعيد الضبط بعد إطارٍ يُعرض فيه دفترٌ فارغ بلا سبب.
   */
  const activeSym = useMemo(
    () => (filterSym && symbolCounts.some(([sym]) => sym === filterSym) ? filterSym : null),
    [filterSym, symbolCounts]
  );

  /** ما تراه القائمة وتُحسب عليه الإحصاءات معاً — فلا نصف سطرٍ يتبع الفلتر ونصفه لا. */
  const visibleTrades = useMemo(
    () =>
      activeSym == null
        ? trades
        : trades.filter((tr) => (tr.symbol || '').trim().toUpperCase() === activeSym),
    [trades, activeSym]
  );

  /**
   * ما يقيس به متداول التجزئة أداءه فعلاً: صافي النقاط (pip) ومتوسط النتيجة بالـR (التوقّع لكل صفقة) —
   * من الصفقات المغلقة المعروضة، لا من `pnl` المخزَّن. الـR فقط للصفقات التي سُجِّل لها وقف.
   */
  const extraStats = useMemo(() => {
    /**
     * النقاط تُجمع **لكل أداة على حدة**: الـpip وحدةُ قياسٍ تخصّ الأداة لا رقماً عاماً —
     * pip الذهب 0.1 من الدولار، وpip EURUSD 0.0001، وpip الين 0.01 (`instrumentSpec`). فجمعها
     * بمجموع واحد كان يطرح نقاط الذهب من نقاط اليورو كأنها الشيء نفسه: صفقة ذهب +50 وصفقة
     * EURUSD −50 كانتا تُقرآن «صفر» بينما هما بالمال شيئان مختلفان تماماً — وهذا سطرٌ يقيس به
     * متداول التجزئة أداءه. متوسط الـR بجانبه سليم كما هو: نسبة بلا وحدة تقارن الأدوات بحق.
     */
    const byPips = new Map<string, { pips: number; n: number }>();
    let rSum = 0;
    let rN = 0;
    for (const tr of visibleTrades) {
      if (tr.status !== 'closed') continue;
      const side = tr.side === 'sell' ? 'sell' : 'buy';
      const mv = realizedMove({ symbol: tr.symbol, side, entry: tr.entry, exit: tr.exit });
      if (mv?.pips != null) {
        const key = (tr.symbol || '').trim().toUpperCase() || '—';
        const cur = byPips.get(key) ?? { pips: 0, n: 0 };
        cur.pips += mv.pips;
        cur.n += 1;
        byPips.set(key, cur);
      }
      const r = realizedR({ side, entry: tr.entry, sl: tr.sl, exit: tr.exit });
      if (r != null) {
        rSum += r;
        rN += 1;
      }
    }
    /** الأكثر تداولاً أولاً — ثلاث أدوات بالسطر وما بعدها «+N» كي لا يطول سطر الإحصاءات. */
    const ranked = [...byPips.entries()].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]));
    const shown = ranked.slice(0, 3);
    const rest = ranked.length - shown.length;
    const parts = shown.map(
      ([sym, v]) => `${sym} ${formatSignedPips(Math.round(v.pips * 10) / 10)}`
    );
    return {
      /** أداة واحدة → السطر كما كان بالضبط؛ أكثر من أداة → مفصَّل لكل أداة. */
      pips: ranked.length === 1 ? formatSignedPips(Math.round(ranked[0]![1].pips * 10) / 10) : null,
      pipsBySymbol: ranked.length > 1 ? parts.join(' · ') + (rest > 0 ? ` +${rest}` : '') : null,
      avgR: rN ? formatR(roundR(rSum / rN)) : null,
      rN,
    };
  }, [visibleTrades]);

  /**
   * إحصاءات ما هو معروض. بلا فلتر: أرقام الخادم حرفياً كما كانت (لا تغيّر بتاتاً بالحالة الشائعة).
   * وبفلتر أداة: تُحسب محليّاً **بمعادلة الخادم نفسها** (`db.trade_stats`: المغلقة ذات `pnl` فقط،
   * نسبة النجاح بخانة عشرية والبقيّة بخانتين). وهذا حسابٌ مطابق لا تقريب: `trade_stats` يقرأ
   * **نفس** قائمة `list_trades` التي تصل اللوحة — الحدّ 200 نفسه وشرط الملكية نفسه — فلا صفقات
   * عند الخادم خارج ما بيد اللوحة. هذا بالضبط ما كان يمنع الفلترة قبل اليوم.
   */
  const shownStats = useMemo<Stats | null>(() => {
    if (activeSym == null) return stats;
    const pnls = visibleTrades
      .filter((tr) => tr.status === 'closed' && tr.pnl != null && Number.isFinite(Number(tr.pnl)))
      .map((tr) => Number(tr.pnl));
    if (pnls.length === 0) {
      return {
        trade_count: 0,
        win_rate: 0,
        total_pnl_pct: 0,
        avg_win: 0,
        avg_loss: 0,
        best: 0,
        worst: 0,
      };
    }
    const wins = pnls.filter((v) => v > 0);
    const losses = pnls.filter((v) => v <= 0);
    const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
    const r1 = (v: number) => roundHalfEven(v, 1);
    const r2 = (v: number) => roundHalfEven(v, 2);
    return {
      trade_count: pnls.length,
      win_rate: r1((wins.length / pnls.length) * 100),
      total_pnl_pct: r2(sum(pnls)),
      avg_win: wins.length ? r2(sum(wins) / wins.length) : 0,
      avg_loss: losses.length ? r2(sum(losses) / losses.length) : 0,
      best: r2(Math.max(...pnls)),
      worst: r2(Math.min(...pnls)),
    };
  }, [activeSym, stats, visibleTrades]);

  const resetForm = () => {
    setEntry('');
    setExit('');
    setSize('');
    setSl('');
    setTp('');
    setNote('');
  };

  const startEdit = (tr: Trade) => {
    setEditing(tr);
    setSymbol(tr.symbol);
    setSide(tr.side === 'sell' ? 'sell' : 'buy');
    // String لا formatPrice: لا تقريب يغيّر السعر المسجَّل بمجرد فتح التعديل
    setEntry(String(tr.entry));
    setExit(tr.exit != null ? String(tr.exit) : '');
    // 1 هو افتراضُ الباك-إند لصفقة سُجِّلت بلا حجم — لا يُملأ بالخانة كأنه رقم كتبه المتداول
    setSize(tr.size != null && Number.isFinite(tr.size) && tr.size > 0 && tr.size !== 1 ? String(tr.size) : '');
    setSl(tr.sl != null ? String(tr.sl) : '');
    setTp(tr.tp != null ? String(tr.tp) : '');
    setNote(tr.note || '');
    setFormError(null);
    playSoftClick();
  };

  const cancelEdit = () => {
    setEditing(null);
    resetForm();
    setFormError(null);
  };

  const add = async () => {
    const e = num(entry);
    if (!symbol.trim() || e == null) {
      setFormError(t.journalInvalidEntry);
      return;
    }
    if ([sl, tp, exit, size].some(unreadable)) {
      setFormError(t.invalidNumberHint);
      return;
    }
    const s = num(sl);
    const p = num(tp);
    const issue = levelSideIssue({ side, entry: e, sl: s, tp: p });
    if (issue) {
      setFormError(planIssueText(issue));
      return;
    }
    setBusy(true);
    setFormError(null);
    if (editing) {
      try {
        // تعديل: خانة فارغة = مسح (وقف/هدف بلا قيمة، وخروج فارغ يعيد الصفقة مفتوحة) — لا «بلا تغيير» صامت
        await api.updateTrade(editing.id, {
          symbol: symbol.trim().toUpperCase(),
          side,
          entry: e,
          exit: num(exit),
          sl: s,
          tp: p,
          // خانة الحجم الفارغة = «لا تغيير» لا مسحاً: الحقل إلزامي بالجدول (`main.py:1174` يُسقط null له)
          size: num(size) ?? undefined,
          note,
        });
        if (!mountedRef.current) return;
        playSoftClick();
        setEditing(null);
        resetForm();
        await refresh();
      } catch {
        if (mountedRef.current) setFormError(t.journalEditError);
      } finally {
        if (mountedRef.current) setBusy(false);
      }
      return;
    }
    try {
      const x = num(exit);
      await api.createTrade({
        symbol: symbol.trim().toUpperCase(),
        side,
        entry: e,
        exit: x ?? undefined,
        sl: s ?? undefined,
        tp: p ?? undefined,
        size: num(size) ?? undefined,
        note,
      });
      playSoftClick();
      resetForm();
      await refresh();
    } catch {
      setFormError(t.journalAddError);
    } finally {
      setBusy(false);
    }
  };

  const closeOpen = async (id: string) => {
    const x = num(exit);
    // خانة الخروج فارغة/غير مفهومة: كان الضغط لا يفعل شيئاً بصمت تام (المبتدئ لا يعرف أن الإغلاق يقرأ خانة
    // «خروج» بأعلى النموذج).
    if (x == null) {
      Alert.alert(t.journalCloseFailedTitle, unreadable(exit) ? t.invalidNumberHint : t.journalCloseNeedsExit);
      return;
    }
    setBusy(true);
    try {
      await api.closeTrade(id, x);
      playSoftClick();
      await refresh();
    } catch {
      Alert.alert(t.journalCloseFailedTitle, t.journalCloseFailedBody);
    } finally {
      setBusy(false);
    }
  };

  /**
   * إغلاق صفقة مفتوحة بالسعر الحالي بنقرة — كان الإغلاق يقرأ خانة «خروج» العامة بأعلى النموذج فقط (المتداول
   * يغلق من الوسيط ثم يريد تسجيل ذلك فوراً بلا كتابة سعر). يُغلق عند السعر الذي يُنفَّذ عليه الإغلاق فعلاً: Bid
   * للشراء وAsk للبيع إن توفّرا، وإلا السعر. اقتباس بذري تجريبي لا يُستخدم أبداً (isRealQuote) — لا خروج مختلَق.
   * تأكيد يعرض سعر الخروج والنتيجة قبل الحفظ (سعر المزوّد قد يختلف قليلاً عن وسيطك — يمكن تعديله بعدها).
   */
  const closeAtMarket = async (tr: Trade) => {
    if (busy) return;
    setBusy(true);
    let px: number | null = null;
    try {
      const q = await api.marketQuote(tr.symbol);
      if (!mountedRef.current) return;
      if (isRealQuote(q)) {
        const sidePx = tr.side === 'sell' ? q.ask : q.bid;
        px = typeof sidePx === 'number' && Number.isFinite(sidePx) && sidePx > 0 ? sidePx : q.price;
      }
    } catch {
      px = null;
    } finally {
      if (mountedRef.current) setBusy(false);
    }
    if (!mountedRef.current) return;
    if (px == null) {
      Alert.alert(t.journalCloseFailedTitle, t.journalCloseMarketNoQuote);
      return;
    }
    const exitPx = px;
    const trSide = tr.side === 'sell' ? 'sell' : 'buy';
    const mv = realizedMove({ symbol: tr.symbol, side: trSide, entry: tr.entry, exit: exitPx });
    const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '');
    /**
     * والنتيجة بالـR حين للصفقة وقفٌ مسجَّل — الرقم الذي يقرّر به المتداول «هل أغلق الآن؟» (+0.4R
     * إغلاقٌ مبكر، −0.9R قريبٌ من وقفه)، وسطر الصفقة يعرضه أصلاً فكان التأكيد وحده يُسقطه. المسطرة
     * نفسها (`realizedR` على سعر الخروج نفسه)، فما يؤكّده هو ما يظهر بالسطر بعد الحفظ حرفياً.
     */
    const rText = formatR(realizedR({ side: trSide, entry: tr.entry, sl: tr.sl, exit: exitPx }));
    const result = mv
      ? `${mv.pips != null ? `${formatSignedPips(mv.pips)} pip · ` : ''}${sign(mv.pct)}${Math.abs(mv.pct).toFixed(2)}%${rText ? ` · ${rText}` : ''}`
      : '';
    Alert.alert(
      t.journalCloseMarketConfirmTitle,
      t.journalCloseMarketConfirmBody
        .replace('{side}', trSide === 'sell' ? t.dirSell : t.dirBuy)
        .replace('{symbol}', tr.symbol)
        .replace('{entry}', formatPrice(tr.entry, tr.symbol))
        .replace('{exit}', formatPrice(exitPx, tr.symbol))
        .replace('{result}', result),
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.journalCloseMarketConfirmBtn,
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                await api.closeTrade(tr.id, exitPx);
                if (!mountedRef.current) return;
                playSoftClick();
                await refresh();
              } catch {
                if (mountedRef.current) Alert.alert(t.journalCloseFailedTitle, t.journalCloseFailedBody);
              } finally {
                if (mountedRef.current) setBusy(false);
              }
            })();
          },
        },
      ]
    );
  };

  /** حذف صفقة سُجِّلت خطأً — بلا حذف كانت صفقة خاطئة واحدة تُفسد الإحصاءات للأبد (api.deleteTrade كان غير مستخدم). */
  const removeTrade = async (id: string) => {
    setBusy(true);
    try {
      await api.deleteTrade(id);
      playSoftClick();
      if (editing?.id === id) cancelEdit();
      await refresh();
    } catch {
      Alert.alert(t.alertsDeleteFailedTitle, t.journalDeleteFailedBody);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const confirmRemove = (tr: Trade) =>
    Alert.alert(
      t.journalDeleteConfirmTitle,
      `${tr.side === 'sell' ? t.dirSell : t.dirBuy} ${tr.symbol} · ${formatPrice(tr.entry, tr.symbol)}`,
      [
        { text: t.cancel, style: 'cancel' },
        { text: t.deleteWord, style: 'destructive', onPress: () => void removeTrade(tr.id) },
      ]
    );

  /** صفوف الصفقات — تُركَّب مرة وتُعرض بصندوقين بحسب من يستضيف اللوحة (انظر `flow`). */
  const rows = (
    <>
      {[...visibleTrades]
        .sort((x, y) => Number(x.status === 'closed') - Number(y.status === 'closed'))
        .map((tr) => (
        <View key={tr.id} style={styles.trade}>
          <Text style={[styles.tradeMain, { textAlign: align }]}>
            {/* الاتجاه بلا لبس: سهم ولون وكلمة مترجمة بدل "BUY"/"SELL" اللاتينية */}
            <Text style={{ color: tr.side === 'sell' ? colors.bear : colors.bull }}>
              {tr.side === 'sell' ? `▼ ${t.dirSell}` : `▲ ${t.dirBuy}`}
            </Text>{' '}
            {tr.symbol}
            {/* 1 هو افتراض الباك-إند لصفقة بلا حجم مسجَّل — لا يُميَّز عن حجم كتبه المتداول، فلا يُعرض
                كأنه رقمه. ما عداه حجم سجّله فعلاً (يدوياً أو عبر «سجّل الخطة» من الحاسبة). */}
            {typeof tr.size === 'number' && Number.isFinite(tr.size) && tr.size > 0 && tr.size !== 1
              ? ` · ${Number(tr.size.toFixed(2))} lot`
              : ''}{' '}
            · {formatPrice(tr.entry, tr.symbol)}
            {tr.exit != null ? ` → ${formatPrice(tr.exit, tr.symbol)}` : ` ${t.journalOpenSuffix}`}
          </Text>
          {tr.sl != null || tr.tp != null ? (
            <Text style={[styles.tradeMeta, { textAlign: align }]}>
              {tr.sl != null ? <Text style={{ color: colors.bear }}>SL {formatPrice(tr.sl, tr.symbol)}</Text> : null}
              {tr.sl != null && tr.tp != null ? ' · ' : ''}
              {tr.tp != null ? <Text style={{ color: colors.bull }}>TP {formatPrice(tr.tp, tr.symbol)}</Text> : null}
              {(() => {
                if (tr.sl == null || tr.tp == null) return '';
                const plan = analyzePlan({
                  symbol: tr.symbol,
                  side: tr.side === 'sell' ? 'sell' : 'buy',
                  entry: tr.entry,
                  sl: tr.sl,
                  tp: tr.tp,
                });
                return plan.ok ? ` · R:R ${formatRR(plan.rr)}` : '';
              })()}
              {(() => {
                const r = formatR(
                  realizedR({ side: tr.side === 'sell' ? 'sell' : 'buy', entry: tr.entry, sl: tr.sl, exit: tr.exit })
                );
                return r ? ` · ${t.journalResultR.replace('{r}', r)}` : '';
              })()}
            </Text>
          ) : null}
          {/* الحالة كانت كلمة إنجليزية خام («closed»/«open») والنتيجة «PnL x%» بلا لون — وكانت «% × الحجم»
              من الباك-إند. الآن: «مغلقة · +25 pip · +0.23%» بلون الربح/الخسارة من الدخول/الخروج مباشرة؛
              المفتوحة لا تكرّر الحالة (السطر الأول يقول «(مفتوحة)»). */}
          {(() => {
            const trSide = tr.side === 'sell' ? 'sell' : 'buy';
            const closed = tr.status === 'closed';
            /**
             * **الصفقة المفتوحة تقول أين هي الآن.** كان صفّها ينتهي عند «(مفتوحة)»: فالصفقات التي
             * عليها مالٌ هذه اللحظة هي وحدها التي لا يخبر الدفتر عنها بشيء، بينما المغلقة — وقد
             * انتهى أمرها — يعرض لكلٍّ منها نقاطها ونسبتها. ومن سجّل خطته من الحاسبة يجدها مفتوحة
             * بلا أيّ خبر. الرقم بنفس دالّة المغلقة تماماً (`floatingResult` تبني على `realizedMove`/
             * `realizedR`) فلا يقفز شيء لحظة الإغلاق على السعر نفسه، وبنفس الشكل والألوان.
             *
             * والـR تُعرض هنا للمفتوحة وحدها: سطر الوقف/الهدف أعلاه يحسبها من سعر الخروج، وهو معدوم
             * ما دامت مفتوحة — فـ«−0.4R» يقول للمتداول أين هو من وقفه، وهو سؤال الصفقة المفتوحة
             * بالضبط. بلا سعر موثوق للأداة لا يُعرض شيء ويبقى الصفّ كما كان حرفياً.
             */
            const trSym = (tr.symbol || '').trim().toUpperCase();
            // التيك الحيّ أولاً (يتحرّك مع السوق)، ثم لقطة التحميل — والغياب التامّ يُبقي الصفّ كما كان
            const live = closed ? null : ticks?.[trSym] ?? quotes[trSym] ?? null;
            const mv = closed
              ? realizedMove({ symbol: tr.symbol, side: trSide, entry: tr.entry, exit: tr.exit })
              : floatingResult({ symbol: tr.symbol, side: trSide, entry: tr.entry, sl: tr.sl, current: live });
            const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '');
            const pips = mv ? formatPips(mv.pips == null ? null : Math.abs(mv.pips)) : null;
            const rText = !closed && mv && 'r' in mv ? formatR(mv.r) : null;
            const result = mv
              ? `${pips != null ? `${sign(mv.pips ?? 0)}${pips} pip · ` : ''}${sign(mv.pct)}${Math.abs(
                  mv.pct
                ).toFixed(2)}%${rText ? ` · ${rText}` : ''}`
              : '';
            if (!closed && !result && !tr.note) return null;
            // الكلمة تسبق النتيجة بالمغلقة؛ بالمفتوحة لا كلمة (السطر الأول يقول «(مفتوحة)») فلا يبدأ
            // السطر بفاصل معلّق.
            const head = closed ? t.journalClosedWord : '';
            return (
              <Text style={[styles.tradeMeta, { textAlign: align }]}>
                {head}
                {result ? (
                  <Text style={{ color: mv && mv.pct < 0 ? colors.bear : mv && mv.pct > 0 ? colors.bull : colors.textDim, fontWeight: '700' }}>
                    {`${head ? ' · ' : ''}${result}`}
                  </Text>
                ) : null}
                {tr.note ? `${head || result ? ' · ' : ''}${tr.note}` : ''}
              </Text>
            );
          })()}
          <View style={[styles.tradeActions, rtl && styles.rowRtl]}>
            {tr.status === 'open' ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  busy && styles.closeLinkDisabled,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => void closeAtMarket(tr)}
                disabled={busy}
                accessibilityState={{ disabled: busy }}
                accessibilityLabel={t.journalCloseMarketA11y.replace('{symbol}', tr.symbol)}
                hitSlop={8}
              >
                <Text style={[styles.closeLink, { textAlign: align }]}>{t.journalCloseMarketBtn}</Text>
              </Pressable>
            ) : null}
            {tr.status === 'open' ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  (busy || editing != null) && styles.closeLinkDisabled,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => void closeOpen(tr.id)}
                // أثناء التعديل خانة الخروج تخصّ الصفقة المعدَّلة — الإغلاق منها كان سيغلق صفقة أخرى بسعرها
                disabled={busy || editing != null}
                accessibilityState={{ disabled: busy || editing != null }}
                accessibilityLabel={t.journalCloseLinkA11y.replace('{symbol}', tr.symbol)}
                hitSlop={8}
              >
                <Text style={[styles.closeLink, { textAlign: align }]}>{t.journalCloseLinkBtn}</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, selected: editing?.id === tr.id }}
              style={({ pressed }) => [
                busy && styles.closeLinkDisabled,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => startEdit(tr)}
              disabled={busy}
              accessibilityLabel={t.journalEditA11y.replace('{symbol}', tr.symbol)}
              hitSlop={8}
            >
              <Text style={styles.closeLink}>{t.journalEditBtn}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                busy && styles.closeLinkDisabled,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => confirmRemove(tr)}
              disabled={busy}
              accessibilityState={{ disabled: busy }}
              accessibilityLabel={t.journalDeleteA11y.replace('{symbol}', tr.symbol)}
              hitSlop={8}
            >
              <Text style={styles.delLink}>{t.deleteWord}</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </>
  );

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { textAlign: align }]}>{t.journalTitle}</Text>
      <Text style={[styles.sub, { textAlign: align }]}>{t.journalSub}</Text>

      {/* صفر صفقات مغلقة: «نسبة نجاح 0% · PnL 0% · أفضل/أسوأ 0%/0%» تُقرأ لمبتدئ كأداء سيئ وهي غياب
          بيانات — تُعرض الإحصاءات من أول صفقة مغلقة، وقبلها سطر يشرح متى تظهر. */}
      {/**
        * عدسة المراجعة: شرائح أدوات الدفتر فوق الإحصاءات مباشرة، لأنها تحكم **الصفوف والإحصاءات
        * معاً**. «أيّ أداة أربح فيها فعلاً» سؤالٌ لا يُجاب من سطرٍ واحد يخلط الذهب باليورو.
        */}
      {symbolCounts.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.row, rtl && styles.rowRtl]}>
            {[null, ...symbolCounts.map(([sym]) => sym)].map((sym) => (
              <Pressable
                accessibilityRole="button"
                key={sym ?? 'ALL'}
                style={({ pressed }) => [
                  styles.chip,
                  activeSym === sym && styles.chipOn,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => setFilterSym(sym)}
                accessibilityLabel={`${t.journalSymbolA11y}: ${sym ?? t.calendarAllWord}`}
                accessibilityState={{ selected: activeSym === sym }}
              >
                <Text style={[styles.chipText, activeSym === sym && styles.chipTextOn]}>
                  {sym ?? t.calendarAllWord}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {shownStats && shownStats.trade_count === 0 && visibleTrades.length > 0 ? (
        <Text style={[styles.sub, { textAlign: align }]}>{t.journalStatsPending}</Text>
      ) : null}
      {shownStats && shownStats.trade_count > 0 ? (
        <View style={styles.stats}>
          <Text style={[styles.stat, { textAlign: align }]}>
            {t.journalStatClosed.replace('{n}', String(shownStats.trade_count))}
          </Text>
          <Text style={[styles.stat, { textAlign: align }]}>
            {t.journalStatWinRate.replace('{pct}', String(shownStats.win_rate))}
          </Text>
          <Text style={[styles.stat, { textAlign: align }]}>
            {t.journalStatTotalPnl.replace('{pct}', String(shownStats.total_pnl_pct))}
          </Text>
          {extraStats.pips != null ? (
            <Text style={[styles.stat, { textAlign: align }]}>
              {t.journalStatNetPips.replace('{pips}', extraStats.pips)}
            </Text>
          ) : null}
          {extraStats.pipsBySymbol != null ? (
            <Text style={[styles.stat, { textAlign: align }]}>
              {t.journalStatNetPipsBySymbol.replace('{parts}', extraStats.pipsBySymbol)}
            </Text>
          ) : null}
          {extraStats.avgR != null ? (
            <Text style={[styles.stat, { textAlign: align }]}>
              {t.journalStatAvgR.replace('{r}', extraStats.avgR).replace('{n}', String(extraStats.rN))}
            </Text>
          ) : null}
          <Text style={[styles.stat, { textAlign: align }]}>
            {t.journalStatBestWorst
              .replace('{best}', String(shownStats.best))
              .replace('{worst}', String(shownStats.worst))}
          </Text>
        </View>
      ) : null}

      {editing ? (
        <View style={styles.editBanner}>
          <Text style={[styles.editBannerText, { textAlign: align }]}>
            {t.journalEditingBanner.replace('{symbol}', editing.symbol)}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={cancelEdit}
            accessibilityLabel={t.journalCancelEdit}
            hitSlop={8}
          >
            <Text style={[styles.closeLink, { textAlign: align }]}>{t.journalCancelEdit}</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={[styles.row, rtl && styles.rowRtl]}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.chip,
            side === 'buy' && styles.chipOn,
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          onPress={() => setSide('buy')}
          accessibilityLabel={`${t.journalSideA11yPrefix}: ${t.dirBuy}`}
        >
          <Text style={[styles.chipText, side === 'buy' && styles.chipTextOn]}>{t.dirBuy}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.chip,
            side === 'sell' && styles.chipOn,
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          onPress={() => setSide('sell')}
          accessibilityLabel={`${t.journalSideA11yPrefix}: ${t.dirSell}`}
        >
          <Text style={[styles.chipText, side === 'sell' && styles.chipTextOn]}>{t.dirSell}</Text>
        </Pressable>
      </View>
      <View style={[styles.qChips, rtl && styles.rowRtl]}>
        {QUICK_SYMBOLS.map((q) => {
          const on = symbol.trim().toUpperCase() === q;
          return (
            <Pressable
              key={q}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [
                styles.qChip,
                on && styles.chipOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => {
                setSymbol(q);
                setFormError(null);
              }}
              accessibilityLabel={`${t.journalSymbolA11y}: ${q}`}
            >
              <Text style={[styles.qChipText, on && styles.chipTextOn]}>{q}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        style={[styles.input, { textAlign: align }]}
        value={symbol}
        onChangeText={setSymbol}
        placeholder={t.journalSymbolPlaceholder}
        placeholderTextColor={colors.textDim}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
        underlineColorAndroid="transparent"
        clearButtonMode="while-editing"
        keyboardAppearance="dark"
        selectionColor={colors.accent}
        accessibilityLabel={t.journalSymbolA11y}
      />
      {/*
        تسجيل صفقة جديدة يقع غالباً **لحظة الدخول** — وهي اللحظة التي يعني فيها خبرٌ قوي قريب أكثر ما
        يعني: الحاسبة والشارت ينبّهان إليه، والدفتر (حيث يُكتب الدخول فعلاً) كان وحده صامتاً. لا يظهر عند
        تعديل صفقة قديمة (خبر اليوم لا يخصّها)، ولا يظهر شيء لرمز غير معروف أو بلا خبر ضمن ثلاث ساعات.
        وبـ`flow` وحده (تبويب الدفتر بشاشة الأدوات): بمواضع المشاركة (اللوح الجانبي والرصيف) تقع اللوحة
        بجانب الشارت الذي يعرض الشريط نفسه أصلاً، فلا يُكرَّر تحذيران متطابقان بشاشة واحدة.
      */}
      {flow && !editing ? <NewsRiskBanner symbol={symbol.trim()} /> : null}
      <TextInput
        style={[styles.input, { textAlign: align }]}
        value={entry}
        onChangeText={setEntry}
        placeholder={t.journalEntryPlaceholder}
        keyboardType="decimal-pad"
        maxLength={12}
        placeholderTextColor={colors.textDim}
        returnKeyType="done"
        underlineColorAndroid="transparent"
        clearButtonMode="while-editing"
        keyboardAppearance="dark"
        selectionColor={colors.accent}
        accessibilityLabel={t.journalEntryA11y}
      />
      <View style={[styles.qChips, rtl && styles.rowRtl]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: quoteBusy, busy: quoteBusy }}
          disabled={quoteBusy}
          style={({ pressed }) => [
            styles.qChip,
            quoteBusy && { opacity: 0.5 },
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          onPress={() => void fillLivePrice()}
          accessibilityLabel={t.journalUseLivePriceA11y}
        >
          <Text style={styles.qChipText}>{quoteBusy ? '...' : t.journalUseLivePrice}</Text>
        </Pressable>
      </View>
      <View style={[styles.row, rtl && styles.rowRtl]}>
        <TextInput
          style={[styles.input, styles.inputHalf, { textAlign: align }]}
          value={exit}
          onChangeText={setExit}
          placeholder={t.journalExitPlaceholder}
          keyboardType="decimal-pad"
          maxLength={12}
          placeholderTextColor={colors.textDim}
          returnKeyType="done"
          underlineColorAndroid="transparent"
          clearButtonMode="while-editing"
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          accessibilityLabel={t.journalExitA11y}
        />
        <TextInput
          style={[styles.input, styles.inputHalf, { textAlign: align }]}
          value={size}
          onChangeText={(v) => {
            setSize(v);
            setFormError(null);
          }}
          placeholder={t.journalSizePlaceholder}
          keyboardType="decimal-pad"
          maxLength={8}
          placeholderTextColor={colors.textDim}
          returnKeyType="done"
          underlineColorAndroid="transparent"
          clearButtonMode="while-editing"
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          accessibilityLabel={t.journalSizeA11y}
        />
      </View>
      <View style={[styles.row, rtl && styles.rowRtl]}>
        <TextInput
          style={[styles.input, styles.inputHalf, { textAlign: align }]}
          value={sl}
          onChangeText={(v) => {
            setSl(v);
            setFormError(null);
          }}
          placeholder={t.journalSlPlaceholder}
          keyboardType="decimal-pad"
          maxLength={12}
          placeholderTextColor={colors.textDim}
          returnKeyType="done"
          underlineColorAndroid="transparent"
          keyboardAppearance="dark"
          selectionColor={colors.bear}
          accessibilityLabel={t.journalSlPlaceholder}
        />
        <TextInput
          style={[styles.input, styles.inputHalf, { textAlign: align }]}
          value={tp}
          onChangeText={(v) => {
            setTp(v);
            setFormError(null);
          }}
          placeholder={t.journalTpPlaceholder}
          keyboardType="decimal-pad"
          maxLength={12}
          placeholderTextColor={colors.textDim}
          returnKeyType="done"
          underlineColorAndroid="transparent"
          keyboardAppearance="dark"
          selectionColor={colors.bull}
          accessibilityLabel={t.journalTpPlaceholder}
        />
      </View>
      {rrTargets.length > 0 ? (
        <View style={[styles.qChips, rtl && styles.rowRtl]}>
          {rrTargets.map((x) => {
            const cur = num(tp);
            const on = cur != null && Math.abs(cur - x.v) <= x.tol;
            return (
              <Pressable
                key={x.rr}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => [
                  styles.qChip,
                  on && styles.chipOn,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => {
                  setTp(x.text);
                  setFormError(null);
                }}
                accessibilityLabel={`${t.journalTpPlaceholder} R:R 1:${x.rr} = ${x.text}`}
              >
                <Text style={[styles.qChipText, on && styles.chipTextOn]}>{`1:${x.rr}`}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {draft?.issue ? (
        <Text style={[styles.formError, { textAlign: align }]}>{planIssueText(draft.issue)}</Text>
      ) : draft?.plan?.ok ? (
        <>
          <Text style={[styles.planLine, { textAlign: align }]}>{planSummary(draft.plan)}</Text>
          {draft.plan.rr != null && draft.plan.rr < 1 ? (
            <Text style={[styles.planWarn, { textAlign: align }]}>{t.planLowRR}</Text>
          ) : null}
        </>
      ) : draft?.plan?.issue === 'slTooClose' ? (
        // تحذير لا يمنع الحفظ: اليومية تسجّل ما حدث فعلاً
        <Text style={[styles.planWarn, { textAlign: align }]}>⚠ {t.planSlTooClose}</Text>
      ) : null}
      <TextInput
        style={[styles.input, { textAlign: align }]}
        value={note}
        onChangeText={setNote}
        placeholder={t.journalNotePlaceholder}
        placeholderTextColor={colors.textDim}
        returnKeyType="done"
        underlineColorAndroid="transparent"
        clearButtonMode="while-editing"
        keyboardAppearance="dark"
        selectionColor={colors.accent}
        accessibilityLabel={t.journalNoteA11y}
      />
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.btn,
          busy && styles.btnDisabled,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={() => void add()}
        disabled={busy}
        accessibilityState={{ disabled: busy }}
        accessibilityLabel={editing ? t.journalSaveEditBtn : t.journalAddA11y}
        hitSlop={8}
      >
        <Text style={styles.btnText}>{busy ? '...' : editing ? t.journalSaveEditBtn : t.journalAddBtn}</Text>
      </Pressable>
      {formError ? <Text style={[styles.formError, { textAlign: align }]}>{formError}</Text> : null}

      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {!loading && trades.length === 0 ? (
        <Text style={[styles.empty, { textAlign: align }]}>
          {listError ? t.journalLoadError : t.journalEmpty}
        </Text>
      ) : null}
      {/**
        * الصفقات المفتوحة أولاً. الباك-إند يُرجع الأحدث فالأقدم (`db.list_trades`: ORDER BY opened_at
        * DESC) والنافذة هنا ~220px — أربعة صفوف — فصفقة مفتوحة من أمس تنزل تحت كل ما سُجِّل اليوم
        * وتختفي عن الشاشة تماماً. والمفتوحة وحدها هي التي تحتاج فعلاً (إغلاق بالسوق / تسجيل الخروج)،
        * بينما المغلقة سجلّ للمراجعة. نفس تجميع لوح التنبيهات بالضبط (المُطلَقة للأسفل). الفرز
        * **مستقرّ** بمواصفة ES2019 فترتيب الأحدث-فالأقدم محفوظ داخل كل مجموعة، ولا يمسّ الإحصاءات
        * (تُحسب من `trades` نفسها لا من هذا العرض).
        */}
      {/**
        * صندوق الصفوف: نافذة تُمرَّر داخلياً حيث تشارك اللوحةُ صفحةً مع غيرها (اللوح الجانبي/الرصيف)،
        * وسردٌ متدفّق حين تملك اللوحة الصفحة وحدها (`flow`) — فالصفحة نفسها هي التي تُمرَّر.
        */}
      {flow ? (
        <View>{rows}</View>
      ) : (
        <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
          {rows}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { color: colors.text, fontWeight: '900', fontSize: 16, textAlign: 'right' },
  sub: { color: colors.textDim, fontSize: 11, textAlign: 'right' },
  stats: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 3,
  },
  stat: { color: colors.text, textAlign: 'right', fontWeight: '600', fontSize: 12 },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowRtl: { flexDirection: 'row-reverse' },
  chip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { color: colors.textMuted, fontWeight: '700' },
  chipTextOn: { color: colors.accent },
  qChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  qChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qChipText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  input: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 10,
    textAlign: 'right',
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  btnText: { color: colors.onAccent, fontWeight: '800' },
  btnDisabled: { opacity: 0.4 },
  formError: {
    color: colors.bear,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  empty: { color: colors.textDim, textAlign: 'right', marginTop: spacing.sm, fontSize: 12 },
  trade: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    gap: 2,
  },
  tradeMain: { color: colors.text, textAlign: 'right', fontWeight: '700', fontSize: 12 },
  tradeMeta: { color: colors.textDim, textAlign: 'right', fontSize: 11 },
  inputHalf: { flex: 1 },
  planLine: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  planWarn: { color: colors.warn, fontSize: 11, fontWeight: '700' },
  closeLink: { color: colors.accent, textAlign: 'right', fontSize: 11, fontWeight: '700' },
  closeLinkDisabled: { opacity: 0.4 },
  tradeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  delLink: { color: colors.bear, fontSize: 11, fontWeight: '700' },
  editBanner: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: 8,
    gap: 4,
  },
  editBannerText: { color: colors.text, fontSize: 11, fontWeight: '700' },
});
