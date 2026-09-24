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
import { misplacedArabicThousandsSign, parseDecimal } from '../parseDecimal';
import { formatPrice } from '../chart/math';
import { isRealQuote } from '../chart/dataSource';
import { ambiguousThousandsPrice, parsePriceFor, sizeLooksLikeUnits } from '../positionSize';
import {
  analyzePlan,
  entryAfterSideSwitch,
  liveEntryOrphaned,
  executionPrice,
  exitShortcuts,
  exitPreview,
  formatJournalMoney,
  planSummaryText,
  journalPnl,
  floatingExitPrice,
  floatingResult,
  formatPips,
  formatR,
  formatRR,
  journalSymbol,
  quoteSymbol,
  levelSideIssue,
  netByInstrument,
  openRiskTotals,
  knownLots,
  journalInstrumentKey,
  draftRiskFigures,
  journalSizeLooksLikeUnits,
  journalSmallLotsStdEquiv,
  journalSizeFromSmall,
  realizedMove,
  realizedR,
  recentLotSizes,
  quickJournalSymbols,
  journalSpec,
  quickStopPips,
  stopAtPips,
  averageR,
  pnlPctContradictsCash,
  stopTooClose,
  journalStats,
  type JournalStats,
  QUICK_RR,
  targetAtRR,
  type PlanIssue,
  type TradePlan,
  editExitValue,
  netLineIsWhole,
  noteWithTypedSize,
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

type Stats = JournalStats;

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

/** لقطة اقتباس أداة صفقة مفتوحة — Bid/Ask قد يغيبان (يُستعمل السعر المفرد حينها). */
type QuoteSnap = { price: number; bid?: number | null; ask?: number | null };

export function TradeJournalPanel({ defaultSymbol, flow = false, ticks }: Props = {}) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState(defaultSymbol || 'EURUSD');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  /** رمز السعر والجهة **الآن** — لسعرٍ حيّ يصل بعد تبديل أحدهما (راجع `fillLivePrice`) */
  const liveKeyRef = useRef('');
  liveKeyRef.current = `${quoteSymbol(symbol)}|${side}`;
  const [entry, setEntry] = useState('');
  const [exit, setExit] = useState('');
  /** حجم الصفقة باللوت — «سجّل الخطة بالدفتر» بالحاسبة يرسل اللوت المحسوب، بينما التسجيل اليدوي كان
   * لا يرسل `size` إطلاقاً فيضع الباك-إند 1 (`db.py:1578`): صفقتان متطابقتان بحجمين مختلفين حسب طريق
   * التسجيل. اختياري — الفارغ يبقى كما كان بالضبط (لا يُرسل الحقل). */
  const [size, setSize] = useState('');
  /** الرمز الذي كُتب له الحجم (كتابة/شريحة/تعديل) — «4» لـ«EURUSDC» لا تعني 4 لوت بعد شريحة «EURUSD» (`journalSizeFromSmall`). */
  const [sizeFor, setSizeFor] = useState('');
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
  const [quotes, setQuotes] = useState<Record<string, QuoteSnap>>({});
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
          // رمز الاقتباس لا الرمز المحفوظ: «XAUUSD.M» لا يعرفها المزوّد، «XAUUSD» يعرفها (`quoteSymbol`)
          .map((tr) => quoteSymbol(tr.symbol || ''))
          .filter((sym): sym is string => sym != null)
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
          // Bid/Ask مع السعر: الصفّ العائم يُحسب على سعر الإغلاق الفعلي (`floatingExitPrice`)
          return isRealQuote(q) ? ([sym, { price: q.price, bid: q.bid, ask: q.ask }] as const) : null;
        } catch {
          return null;
        }
      })
    );
    // تبديل قائمة الصفقات أثناء الطلب (إغلاق صفقة مثلاً) يُلغي هذه النتيجة — لا أسعار لقائمة سابقة
    if (!mountedRef.current || gen !== quoteGenRef.current) return;
    const next: Record<string, QuoteSnap> = {};
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
  /** آخر تعبئة لـ«السعر الحالي» — تبديل الجهة بعدها يأخذ سعر الجهة الأخرى من اللقطة نفسها (`entryAfterSideSwitch`) */
  const liveFillRef = useRef<{ symbol: string; text: string; q: { price: number; bid?: number | null; ask?: number | null } } | null>(null);
  // تبديل الأداة يمسح دخولاً عبّأه «السعر الحالي» لأداة أخرى (لا ما كُتب باليد) — راجع `liveEntryOrphaned`
  useEffect(() => {
    if (liveEntryOrphaned({ entryText: entryRef.current, symbol, filled: liveFillRef.current })) {
      setEntry('');
      liveFillRef.current = null;
    }
  }, [symbol]);

  const pickSide = (next: 'buy' | 'sell') => {
    if (next === side) return;
    const sym = quoteSymbol(symbol);
    const px = entryAfterSideSwitch({ entryText: entry, symbol: sym, side: next, filled: liveFillRef.current });
    if (px != null && sym != null) {
      const text = formatPrice(px, sym);
      setEntry(text);
      liveFillRef.current = liveFillRef.current && { ...liveFillRef.current, text };
    }
    setSide(next);
  };

  const fillLivePrice = async () => {
    const sym = quoteSymbol(symbol);
    const key = `${sym}|${side}`;
    if (sym == null || quoteBusy) return;
    setQuoteBusy(true);
    setFormError(null);
    try {
      const q = await api.marketQuote(sym);
      if (!mountedRef.current) return;
      // الرمز أو الجهة تغيّرا أثناء الطلب: سعر EURUSD تحت GBPUSD، أو Ask الشراء لصفقة صارت بيعاً — يُسقط
      if (liveKeyRef.current !== key) return;
      if (!isRealQuote(q)) {
        setFormError(t.journalNoLiveQuote);
        return;
      }
      const px = executionPrice(q, side, 'open');
      if (px == null) {
        setFormError(t.journalNoLiveQuote);
        return;
      }
      const text = formatPrice(px, sym);
      setEntry(text);
      liveFillRef.current = { symbol: sym, text, q };
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
  /**
   * خانات **الأسعار** (دخول/وقف/هدف/خروج) بأداة النموذج: «3.450» بخانة ذهب مبهمة (ثلاثة آلاف بكتابة أوروبية)
   * فتُرفض بدل 3.45 — راجع `parsePriceFor`. الحجم يبقى على `num`.
   */
  const pnum = (v: string, sym: string = symbol): number | null => {
    const n = parsePriceFor(v, sym);
    return n != null && n > 0 ? n : null;
  };
  const unreadablePx = (v: string, sym: string = symbol) => v.trim() !== '' && pnum(v, sym) == null;
  /**
   * رسالة السعر غير المقروء: «3.450» بخانة ذهب تقول **لماذا** وتعرض القراءتين (3450 أو 3.45) — رسالة «اكتبه بلا
   * فواصل آلاف، مثل 1.0850» كانت تحيّر: المتداول لا يرى فاصلاً، والمثال يشبه ما كتبه. غير ذلك الرسالة العامة.
   */
  const pxErrorText = (v: string, sym: string = symbol): string => {
    const a = ambiguousThousandsPrice(v, sym);
    return a
      ? t.priceAmbiguousThousandsHint.replace('{value}', a.value).replace('{whole}', a.whole).replace('{small}', a.small)
      : misplacedArabicThousandsSign(v)
        ? t.arabicThousandsSignHint
        : t.invalidNumberHint;
  };

  /**
   * حجمٌ يبدو وحداتٍ منسوخة من المنصّة («10000» بدل «0.10») — راجع `sizeLooksLikeUnits`. يُعرض سطر
   * تحذير بنقرة تحويل، ويُمنع الحفظ حتى يُصحَّح: صفقة بعشرة آلاف لوت تلوّث صافي الأداة بالمال كلّه.
   */
  const sizeUnits = (() => {
    const l = num(size);
    // رمز سنت كذلك، بلا اقتراح تحويل (`journalSizeLooksLikeUnits`)
    return l != null ? journalSizeLooksLikeUnits(l, symbol) : null;
  })();
  const sizeUnitsText = (): string => {
    const l = num(size) ?? 0;
    const n = String(l).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return sizeUnits?.lots != null
      ? t.journalSizeUnitsFix.replace('{n}', n).replace('{lots}', sizeUnits.lots.toFixed(2))
      : t.journalSizeUnitsNoFix.replace('{n}', n);
  };

  /** رسالة واضحة لوقف/هدف بالجهة الخطأ — نفس نصوص خطة الصفقة بلوحة الأفكار. */
  const planIssueText = (issue: PlanIssue | null): string | null => {
    if (issue === 'slWrongSide') return side === 'buy' ? t.planSlWrongBuy : t.planSlWrongSell;
    if (issue === 'tpWrongSide') return side === 'buy' ? t.planTpWrongBuy : t.planTpWrongSell;
    return null;
  };

  /**
   * المال المعرَّض بين الدخول والوقف للحجم المكتوب، بعملة التسعير (`riskInQuoteCcy`): «كم خاطرتُ
   * بهذه الصفقة» — الدفتر كان يعرف الأرقام الثلاثة ويسكت عنه. لا يظهر بلا حجم أو بوقف بالجهة الخطأ.
   */
  const draftRisk = useMemo(() => {
    const e = pnum(entry);
    const s = pnum(sl);
    const l = num(size);
    if (e == null || s == null || l == null) return null;
    // حساب السنت بالـUSC (≈ USD) وmicro بعقده (`journalRisk`) — سطر `journalCentMoneyNote` تحت USC
    const r = draftRiskFigures({ symbol, side, entry: e, sl: s, lots: l });
    if (!r) return null;
    return { pips: r.pips, money: r.cash ? formatJournalMoney(r.cash, t.journalMoneyUsc) : null, usc: r.cash?.ccy === 'USC' };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, side, entry, sl, size, t]);

  /** "المخاطرة 25 pip (125.00 USD) · الربح المحتمل 50 pip · R:R 1:2.0" — المال حين يُكتب الحجم. */
  const planSummary = (plan: TradePlan): string => {
    /**
     * الربح المحتمل بالمال بجانب المخاطرة بالمال: كان السطر يقول «المخاطرة 25 pip (125.00 USD) · الربح
     * المحتمل 50 pip» فيُترك المتداول ليضرب نصف المعادلة بنفسه. نتيجة الخروج عند الهدف بالدالّة نفسها
     * التي تحسب نتيجة الصفقة بعد إغلاقها (`journalPnl` — سنت/micro بعقده)، فالرقم هنا هو ما سيراه بالقائمة لو بلغ الهدف.
     */
    const e = pnum(entry);
    const p = pnum(tp);
    const l = num(size);
    const gain =
      draftRisk && plan.ok && e != null && p != null && l != null
        ? journalPnl({ symbol, side, entry: e, exit: p, lots: l })
        : null;
    const gainText = gain && gain.amount > 0 ? formatJournalMoney(gain, t.journalMoneyUsc) : null;
    return planSummaryText(plan, { risk: t.planRiskWord, reward: t.planRewardWord }, draftRisk?.money, gainText);
  };

  // معاينة حيّة أثناء الكتابة: خطأ جهة فوراً (حتى بوقف وحده)، والملخّص حين تكتمل الأرقام الثلاثة.
  const draft = useMemo(() => {
    const e = pnum(entry);
    if (e == null) return null;
    const s = pnum(sl);
    const p = pnum(tp);
    const issue = levelSideIssue({ side, entry: e, sl: s, tp: p });
    if (issue) return { issue, plan: null as TradePlan | null };
    // وقفٌ أقرب من 1 pip بلا هدف بعد: التحذير نفسه بدل «المخاطرة 0.1 pip» كأنها خطة عادية
    if (s != null && p == null && stopTooClose({ symbol: symbol.trim(), side, entry: e, sl: s })) {
      return { issue: 'slTooClose' as PlanIssue, plan: null };
    }
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
    const e = pnum(entry);
    const s = pnum(sl);
    if (e == null || s == null || levelSideIssue({ side, entry: e, sl: s })) return [];
    const sym = symbol.trim().toUpperCase();
    // سنت/micro («EURUSDC») بمواصفات زوجه العادي ومنازله (`journalSpec`)
    const spec = journalSpec(sym);
    if (stopTooClose({ symbol: sym, side, entry: e, sl: s })) return [];
    return QUICK_RR.flatMap((rr) => {
      const v = targetAtRR({ symbol: sym, side, entry: e, sl: s, rr });
      // `tol`: الشريحة «مختارة» حين تطابق الخانةُ سعرَها (نصف pipette، أو مطابقة شبه تامّة بلا مواصفات)
      const tol = spec ? spec.pipSize / 20 : Math.abs(v ?? 0) * 1e-9;
      return v != null ? [{ rr, v, tol, text: spec ? formatPrice(v, spec.symbol) : String(v) }] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, side, entry, sl]);

  /**
   * شرائح الوقف بالمسافة («20 pip») تحت خانة الوقف: سعر الوقف من الدخول بجهة الخسارة (`stopAtPips`) —
   * المتداول يقرّر وقفه بالنقاط، وكان يطرح بيده فيقع الوقف بالجهة الخطأ أو بحجم pip خاطئ. تظهر بدخول صالح
   * لأداة معروفة المواصفات فقط.
   */
  const slTargets = useMemo(() => {
    const e = pnum(entry);
    const sym = symbol.trim().toUpperCase();
    const spec = journalSpec(sym);
    if (e == null || !spec) return [];
    return quickStopPips(sym, e).flatMap((pips) => {
      const v = stopAtPips({ symbol: sym, side, entry: e, pips });
      return v != null ? [{ pips, v, tol: spec.pipSize / 20, text: formatPrice(v, spec.symbol) }] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, side, entry]);

  /** شرائح الرمز: أدوات المتداول نفسه أولاً («XAUUSD.m» كما يكتبها وسيطه)، ثم القائمة الثابتة — `quickJournalSymbols` */
  const symbolChips = useMemo(() => quickJournalSymbols(trades, QUICK_SYMBOLS), [trades]);

  /** آخر أحجام اللوت المختلفة من صفقات المتداول نفسه — شرائح تحت خانة الحجم (`recentLotSizes`) */
  // لوت السنت/micro لا يُقترح لرمزٍ عادي ولا العكس — راجع `recentLotSizes`
  const lotChips = useMemo(() => recentLotSizes(trades, 3, symbol), [trades, symbol]);

  /** شرائح «الخروج = الوقف/الهدف» تحت خانة الخروج — راجع `exitShortcuts` */
  const exitChips = useMemo(
    () =>
      exitShortcuts({ side, entry: pnum(entry), sl: pnum(sl), tp: pnum(tp) }).map((x) => ({
        ...x,
        text: x.kind === 'sl' ? sl.trim() : x.kind === 'be' ? entry.trim() : tp.trim(),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [symbol, side, entry, sl, tp]
  );

  /**
   * نتيجة الصفقة **قبل الحفظ** حين يُكتب الخروج: «−25 pip · −125.00 USD · −0.23% · النتيجة −1R» —
   * بالشكل والدوالّ نفسها التي يعرضها سطر الصفقة بعد الحفظ (`exitPreview`)، فمنزلةٌ منقلبة تُرى ربحاً
   * صغيراً هنا قبل أن تُحفظ. بلا مال من حجمٍ يبدو وحدات (سطر التحذير يقول ما الخطأ).
   */
  const exitResult = useMemo(() => {
    if (unreadablePx(exit)) return null;
    const l = num(size);
    const p = exitPreview({
      symbol: symbol.trim(),
      side,
      entry: pnum(entry),
      sl: pnum(sl),
      exit: pnum(exit),
      lots: l != null && !journalSizeLooksLikeUnits(l, symbol) ? l : null,
    });
    if (!p) return null;
    const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '');
    const pips = formatPips(p.pips == null ? null : Math.abs(p.pips));
    const r = formatR(p.r);
    const text = [
      pips != null ? `${sign(p.pips ?? 0)}${pips} pip` : null,
      p.cash ? formatJournalMoney(p.cash, t.journalMoneyUsc, true) : null,
      `${sign(p.pct)}${Math.abs(p.pct).toFixed(2)}%`,
      r ? t.journalResultR.replace('{r}', r) : null,
    ]
      .filter(Boolean)
      .join(' · ');
    return { text, pct: p.pct };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, side, entry, sl, exit, size, t]);

  /**
   * أدوات الدفتر وعدد صفقات كلٍّ منها، الأكثر تداولاً أولاً. الشرائح لا تظهر إلا بأداتين فأكثر:
   * من يتداول زوجاً واحداً لا يُعرض له فلترٌ بخيار واحد. المفتاح الأداة لا الرمز المكتوب
   * (`journalInstrumentKey`): «XAUUSD.m» و«XAUUSD» شريحة واحدة.
   */
  const symbolCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const tr of trades) {
      const key = journalInstrumentKey(tr.symbol);
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
        : trades.filter((tr) => journalInstrumentKey(tr.symbol) === activeSym),
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
    const ranked = netByInstrument(visibleTrades);
    const avg = averageR(visibleTrades);
    /**
     * ثلاث أدوات بالسطر وما بعدها «+N» كي لا يطول سطر الإحصاءات (الترتيب من `netByInstrument`). المال
     * بعملة تسعير الأداة بجانب نقاطها حين يُعرف حجم كل صفقاتها — «EURUSD +25 (+125.00 USD)».
     */
    const shown = ranked.slice(0, 3);
    const rest = ranked.length - shown.length;
    const cashOf = (c: { amount: number; ccy: string } | null) =>
      c ? formatJournalMoney(c, t.journalMoneyUsc, true) : null;
    const parts = shown.map((v) => {
      const cash = cashOf(v.cash);
      return `${v.symbol} ${formatSignedPips(v.pips)}${cash ? ` (${cash})` : ''}`;
    });
    // بلا اسم أداة فقط حين تدخل كل المغلقة المعروضة فيه — US30 بجانب EURUSD لا تُخفى تحت «الصافي» (`netLineIsWhole`)
    const whole = netLineIsWhole(visibleTrades, ranked);
    return {
      /** أداة واحدة هي كل المغلقة → السطر كما كان بالضبط؛ وإلا مفصَّل بالاسم لكل أداة. */
      pips: whole ? formatSignedPips(ranked[0]!.pips) : null,
      /** صافي المال للأداة الواحدة — يُلحق بسطر النقاط نفسه */
      cash: whole ? cashOf(ranked[0]!.cash) : null,
      pipsBySymbol: ranked.length > 0 && !whole ? parts.join(' · ') + (rest > 0 ? ` +${rest}` : '') : null,
      avgR: avg ? formatR(avg.r) : null,
      rN: avg?.n ?? 0,
      /** مبلغٌ بالسنت الأمريكي بالسطر المعروض — `journalCentMoneyNote` يقول إن USC هي وحدة حساب السنت (100 = 1 USD) */
      usc: (whole ? [ranked[0]!] : shown).some((v) => v.cash?.ccy === 'USC'),
    };
  }, [visibleTrades, t]);

  /**
   * «المخاطرة (مفتوحة): 250.00 USD · 100,000 JPY» — مجموع ما بين الدخول والوقف للمفتوحة المعروضة (`openRiskTotals`):
   * أربع صفقات بـ1% هي 4% معرَّضة معاً. لا سطر إن كانت بينها صفقة بلا وقف أو بحجم مجهول (مجموعٌ جزئي يطمئن كذباً).
   */
  const openRiskLine = useMemo(() => {
    const o = openRiskTotals(visibleTrades);
    if (!o) return null;
    return `${t.planRiskWord} ${t.journalOpenSuffix}: ${o.totals.map((c) => formatJournalMoney(c, t.journalMoneyUsc)).join(' · ')}`;
  }, [visibleTrades, t]);

  /**
   * إحصاءات ما هو معروض. بلا فلتر: أرقام الخادم حرفياً كما كانت (لا تغيّر بتاتاً بالحالة الشائعة).
   * وبفلتر أداة: تُحسب محليّاً **بمعادلة الخادم نفسها** (`db.trade_stats`: المغلقة ذات `pnl` فقط،
   * نسبة النجاح بخانة عشرية والبقيّة بخانتين). وهذا حسابٌ مطابق لا تقريب: `trade_stats` يقرأ
   * **نفس** قائمة `list_trades` التي تصل اللوحة — الحدّ 200 نفسه وشرط الملكية نفسه — فلا صفقات
   * عند الخادم خارج ما بيد اللوحة. هذا بالضبط ما كان يمنع الفلترة قبل اليوم.
   */
  const shownStats = useMemo<Stats | null>(() => {
    if (activeSym == null) return stats;
    return journalStats(visibleTrades);
  }, [activeSym, stats, visibleTrades]);

  const resetForm = () => {
    setEntry('');
    setExit('');
    setSize('');
    setSizeFor('');
    setSl('');
    setTp('');
    setNote('');
  };

  const startEdit = (tr: Trade) => {
    setEditing(tr);
    setSymbol(tr.symbol);
    setSide(tr.side === 'sell' ? 'sell' : 'buy');
    liveFillRef.current = null;
    // String لا formatPrice: لا تقريب يغيّر السعر المسجَّل بمجرد فتح التعديل
    setEntry(String(tr.entry));
    setExit(tr.exit != null ? String(tr.exit) : '');
    // 1 هو افتراضُ الباك-إند لصفقة سُجِّلت بلا حجم — لا يُملأ بالخانة كأنه رقم كتبه المتداول
    // (إلا 1.00 مسجَّلة من الحاسبة — ملاحظتها تشهد بها، راجع `knownLots`)
    const kl = knownLots(tr.size, tr.note);
    setSize(kl != null ? String(kl) : '');
    setSizeFor(tr.symbol);
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
    const e = pnum(entry);
    // «EUR/USD» ⇒ EURUSD، و«EU» يُرفض هنا لا بالخادم برسالة عامة — راجع `journalSymbol`
    const sym = journalSymbol(symbol);
    if (sym == null || e == null) {
      // دخول ذهب «3.450»: «أدخل رمزاً وسعر دخول صحيحين» لا يقول ما الخطأ بالسعر المكتوب
      setFormError(
        sym != null && (ambiguousThousandsPrice(entry, symbol) || misplacedArabicThousandsSign(entry))
          ? pxErrorText(entry)
          : t.journalInvalidEntry
      );
      return;
    }
    const badPx = [sl, tp, exit].find((v) => unreadablePx(v));
    if (badPx != null || unreadable(size)) {
      setFormError(
        badPx != null
          ? pxErrorText(badPx)
          : misplacedArabicThousandsSign(size)
            ? t.arabicThousandsSignHint
            : t.invalidNumberHint
      );
      return;
    }
    if (sizeUnits) {
      setFormError(sizeUnitsText());
      return;
    }
    const s = pnum(sl);
    const p = pnum(tp);
    const issue = levelSideIssue({ side, entry: e, sl: s, tp: p });
    if (issue) {
      setFormError(planIssueText(issue));
      return;
    }
    setBusy(true);
    setFormError(null);
    if (editing) {
      try {
        // تعديل: خانة فارغة = مسح (وقف/هدف بلا قيمة، وخروج فارغ يعيد صفقةً بدأ تعديلها مغلقة مفتوحةً) — لا «بلا تغيير» صامت.
        // بدأ مفتوحاً: الخروج الفارغ لا يُرسل، فإغلاقٌ بالسوق أثناء التعديل لا يُلغى بالحفظ (`editExitValue`)
        await api.updateTrade(editing.id, {
          symbol: sym,
          side,
          entry: e,
          exit: editExitValue(editing.status !== 'open', pnum(exit)),
          sl: s,
          tp: p,
          // خانة الحجم الفارغة = «لا تغيير» لا مسحاً: الحقل إلزامي بالجدول (`main.py:1174` يُسقط null له)
          size: num(size) ?? undefined,
          // 1 مكتوبة باليد تُعلَّم بالملاحظة وإلا عُدّت افتراض الخادم (`noteWithTypedSize`)
          note: noteWithTypedSize(num(size), note),
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
      const x = pnum(exit);
      await api.createTrade({
        symbol: sym,
        side,
        entry: e,
        exit: x ?? undefined,
        sl: s ?? undefined,
        tp: p ?? undefined,
        size: num(size) ?? undefined,
        note: noteWithTypedSize(num(size), note),
      });
      // الإضافة كالتعديل أعلاه: اللوحة قد تُغلق أثناء الطلب (تبديل التبويب) — لا تحديث حالة بعد الفكّ
      if (!mountedRef.current) return;
      playSoftClick();
      resetForm();
      await refresh();
    } catch {
      if (mountedRef.current) setFormError(t.journalAddError);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const closeOpen = async (id: string) => {
    const tr = trades.find((it: Trade) => it.id === id);
    if (!tr) return;
    // الخانة تُقرأ بأداة **الصفقة المنقورة** لا أداة النموذج
    const x = pnum(exit, tr.symbol);
    // خانة الخروج فارغة/غير مفهومة: كان الضغط لا يفعل شيئاً بصمت تام (المبتدئ لا يعرف أن الإغلاق يقرأ خانة
    // «خروج» بأعلى النموذج).
    if (x == null) {
      Alert.alert(t.journalCloseFailedTitle, unreadablePx(exit, tr.symbol) ? pxErrorText(exit, tr.symbol) : t.journalCloseNeedsExit);
      return;
    }
    // تأكيدٌ بالنتيجة كالإغلاق بالسوق: الخانة واحدة للنموذج كلّه، فسعرٌ كُتب لصفقة ذهب (2651.30) ثم نُقر رابط
    // صفقة EURUSD كان يُحفظ فوراً «+26,502,150 pip · +244,259%» ويُفسد نسبة النجاح وأفضل صفقة ومتوسط الربح للأبد
    confirmClose(tr, x, 'field');
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
      const q = await api.marketQuote(quoteSymbol(tr.symbol) ?? tr.symbol);
      if (!mountedRef.current) return;
      if (isRealQuote(q)) {
        px = executionPrice(q, tr.side === 'sell' ? 'sell' : 'buy', 'close');
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
    confirmClose(tr, px, 'market');
  };

  /**
   * تأكيد الإغلاق بسعر الخروج والنتيجة (نقاط · مال · نسبة · R) قبل الحفظ — للإغلاق بالسوق وبسعر خانة الخروج.
   * `field`: العنوان سؤال «إغلاق بسعر خانة الخروج؟» (لا اسم الزرّ) والنصّ بلا سطر «السعر من مزوّد البيانات» (لا يخصّه).
   */
  const confirmClose = (tr: Trade, exitPx: number, source: 'market' | 'field') => {
    const trSide = tr.side === 'sell' ? 'sell' : 'buy';
    const mv = realizedMove({ symbol: tr.symbol, side: trSide, entry: tr.entry, exit: exitPx });
    const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '');
    /**
     * والنتيجة بالـR حين للصفقة وقفٌ مسجَّل — الرقم الذي يقرّر به المتداول «هل أغلق الآن؟» (+0.4R
     * إغلاقٌ مبكر، −0.9R قريبٌ من وقفه)، وسطر الصفقة يعرضه أصلاً فكان التأكيد وحده يُسقطه. المسطرة
     * نفسها (`realizedR` على سعر الخروج نفسه)، فما يؤكّده هو ما يظهر بالسطر بعد الحفظ حرفياً.
     */
    const rText = formatR(realizedR({ symbol: tr.symbol, side: trSide, entry: tr.entry, sl: tr.sl, exit: exitPx }));
    /**
     * **والمال** بعملة التسعير كما يكتبه سطر الصفقة بعد الحفظ («+25 pip · +125.00 USD · +0.23%»): التأكيد
     * كان يُسقطه فيقرّر المتداول «أغلق الآن؟» على نقاطٍ ونسبة حركة سعر، ثم يظهر المبلغ بعد الإغلاق لا
     * قبله. نفس الشرط (حجمٌ معروف — `knownLots`) ونفس الدالّة، فالرقمان حرفياً واحد.
     */
    const cash =
      mv && knownLots(tr.size, tr.note) != null
        ? journalPnl({ symbol: tr.symbol, side: trSide, entry: tr.entry, exit: exitPx, lots: tr.size })
        : null;
    const cashText = cash ? `${formatJournalMoney(cash, t.journalMoneyUsc, true)} · ` : '';
    const result = mv
      ? `${mv.pips != null ? `${formatSignedPips(mv.pips)} pip · ` : ''}${cashText}${sign(mv.pct)}${Math.abs(mv.pct).toFixed(2)}%${rText ? ` · ${rText}` : ''}`
      : '';
    const body = source === 'market' ? t.journalCloseMarketConfirmBody : t.journalCloseMarketConfirmBody.split('\n\n')[0];
    Alert.alert(
      source === 'market' ? t.journalCloseMarketConfirmTitle : t.journalCloseFieldConfirmTitle,
      body
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
                كأنه رقمه. ما عداه حجم سجّله فعلاً (يدوياً أو عبر «سجّل الخطة» من الحاسبة)، و1.00 من «سجّل الخطة»
                تشهد بها ملاحظتها — راجع `knownLots`. */}
            {knownLots(tr.size, tr.note) != null ? ` · ${Number(tr.size.toFixed(2))} lot` : ''}{' '}
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
                  realizedR({
                    symbol: tr.symbol,
                    side: tr.side === 'sell' ? 'sell' : 'buy',
                    entry: tr.entry,
                    sl: tr.sl,
                    exit: tr.exit,
                  })
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
            // مفتاح التيكات واللقطة رمزُ الاقتباس (لاحقة الوسيط ساقطة) — راجع `quoteSymbol`
            const trSym = quoteSymbol(tr.symbol || '') ?? (tr.symbol || '').trim().toUpperCase();
            // التيك الحيّ أولاً (يتحرّك مع السوق)، ثم لقطة التحميل — والغياب التامّ يُبقي الصفّ كما كان
            // على سعر **الإغلاق** (Bid للشراء، Ask للبيع؛ إزاحة اللقطة على التيك) كـ«أغلق بسعر السوق» تماماً —
            // بالسعر الوسطي كان شراء ذهب 1 لوت يعرض +500 USD والإغلاق يسجّل +480
            const live = closed
              ? null
              : floatingExitPrice({ side: trSide, live: ticks?.[trSym], snap: quotes[trSym] ?? null });
            const mv = closed
              ? realizedMove({ symbol: tr.symbol, side: trSide, entry: tr.entry, exit: tr.exit })
              : floatingResult({ symbol: tr.symbol, side: trSide, entry: tr.entry, sl: tr.sl, current: live });
            const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '');
            const pips = mv ? formatPips(mv.pips == null ? null : Math.abs(mv.pips)) : null;
            const rText = !closed && mv && 'r' in mv ? formatR(mv.r as number | null) : null;
            /**
             * **كم ربحتُ/خسرتُ بالمال** بعملة التسعير (`journalPnl`؛ USC لسنت الدولار): النسبة بالسطر نسبة حركة السعر
             * لا الحساب، فـ«+0.23%» على لوتين هي 500$ — والمتداول كان يضرب بنفسه. الحجم 1 بلا معنى
             * (يضعه الخادم حين لا يُرسل حجم — راجع خانة الحجم) فلا يُحسب منه مال، كسطر الحجم أعلاه.
             */
            const lotsKnown = knownLots(tr.size, tr.note) != null;
            const px = closed ? tr.exit : live;
            const cash =
              mv && lotsKnown && px != null
                ? journalPnl({ symbol: tr.symbol, side: trSide, entry: tr.entry, exit: px, lots: tr.size })
                : null;
            const cashText = cash ? `${formatJournalMoney(cash, t.journalMoneyUsc, true)} · ` : '';
            const result = mv
              ? `${pips != null ? `${sign(mv.pips ?? 0)}${pips} pip · ` : ''}${cashText}${sign(mv.pct)}${Math.abs(
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

      {openRiskLine ? <Text style={[styles.stat, { textAlign: align }]}>{openRiskLine}</Text> : null}
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
          {/* «+1.5%» والمال −1,058 USD: النسبة تجمع حركة السعر بلا حجم (`db.trade_stats`) — فتُسمّى بما هي
              («مجموع حركة السعر (بلا حجم الصفقة)») لا «إجمالي PnL» الذي يُقرأ ربح الحساب، وتُخفى حين يناقضها
              مالٌ معروف لكل صفقة */}
          {pnlPctContradictsCash(visibleTrades, shownStats.total_pnl_pct) ? null : (
            <Text style={[styles.stat, { textAlign: align }]}>
              {t.journalStatPriceMoveSum.replace('{pct}', String(shownStats.total_pnl_pct))}
            </Text>
          )}
          {extraStats.pips != null ? (
            <Text style={[styles.stat, { textAlign: align }]}>
              {t.journalStatNetPips.replace('{pips}', extraStats.pips)}
              {extraStats.cash ? ` · ${extraStats.cash}` : ''}
            </Text>
          ) : null}
          {extraStats.pipsBySymbol != null ? (
            <Text style={[styles.stat, { textAlign: align }]}>
              {t.journalStatNetPipsBySymbol.replace('{parts}', extraStats.pipsBySymbol)}
            </Text>
          ) : null}
          {extraStats.usc ? <Text style={[styles.stat, { textAlign: align }]}>{t.journalCentMoneyNote}</Text> : null}
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
          onPress={() => pickSide('buy')}
          accessibilityLabel={`${t.journalSideA11yPrefix}: ${t.dirBuy}`}
          accessibilityState={{ selected: side === 'buy' }}
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
          onPress={() => pickSide('sell')}
          accessibilityLabel={`${t.journalSideA11yPrefix}: ${t.dirSell}`}
          accessibilityState={{ selected: side === 'sell' }}
        >
          <Text style={[styles.chipText, side === 'sell' && styles.chipTextOn]}>{t.dirSell}</Text>
        </Pressable>
      </View>
      <View style={[styles.qChips, rtl && styles.rowRtl]}>
        {symbolChips.map((q: string) => {
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
          accessibilityLabel={quoteBusy ? t.a11yBusy : t.journalUseLivePriceA11y}
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
            setSizeFor(symbol);
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
      {/* حجم سنت/micro بلوت الحساب العادي — كسطر الحاسبة، فلا يبقى «4» بعد العبور لرمزٍ عادي بلا ما يذكّر بمعناه (`journalSmallLotsStdEquiv`) */}
      {(() => {
        const std = journalSmallLotsStdEquiv(num(size), symbol);
        return std != null ? (
          <Text style={[styles.planLine, { textAlign: align }]}>{t.riskCalcSmallLotsStdEquiv.replace('{std}', () => std)}</Text>
        ) : null;
      })()}
      {/*
        حجمٌ كُتب لرمز سنت/micro ثم تبدّل الرمز إلى عادي: «4» صارت 4 لوت عادي (مئة ضعف) — نقرة تحوّلها إلى مكافئها
        (`journalSizeFromSmall`). لا يمنع الحفظ: 4 لوت على EURUSD قد تكون مقصودة، وكتابة الحجم من جديد تُسكت السطر.
      */}
      {(() => {
        const fromSmall = journalSizeFromSmall(num(size), sizeFor, symbol);
        if (!fromSmall) return null;
        const text = t.journalSizeFromSmallFix
          .split('{n}')
          .join(size.trim())
          .replace('{prev}', () => fromSmall.prev)
          .replace('{symbol}', () => symbol.trim().toUpperCase())
          .replace('{std}', () => fromSmall.std);
        return (
          <View style={[styles.qChips, rtl && styles.rowRtl]}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.qChip,
                styles.chipOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => {
                setSize(fromSmall.std);
                setSizeFor(symbol);
                setFormError(null);
              }}
              accessibilityLabel={text}
            >
              <Text style={[styles.qChipText, styles.chipTextOn]}>{text}</Text>
            </Pressable>
          </View>
        );
      })()}
      {/*
        آخر أحجام اللوت المختلفة (الأحدث أولاً): المتداول يكرّر حجماً أو اثنين، وكتابة خانة المال بيدٍ كل
        صفقة هي حيث تُحفظ «5» بدل «0.5». تُخفى حين يظهر تحذير «هذا بالوحدات» كي لا تتزاحم شريحتان للخانة.
      */}
      {lotChips.length > 0 && !sizeUnits ? (
        <View style={[styles.qChips, rtl && styles.rowRtl]}>
          {lotChips.map((l: number) => {
            const text = `${l.toFixed(2)} lot`;
            const on = num(size) === l;
            return (
              <Pressable
                key={text}
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
                  setSize(l.toFixed(2));
                  setSizeFor(symbol);
                  setFormError(null);
                }}
                accessibilityLabel={`${t.journalSizeA11y}: ${text}`}
              >
                <Text style={[styles.qChipText, on && styles.chipTextOn]}>{text}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {sizeUnits ? (
        <View style={[styles.qChips, rtl && styles.rowRtl]}>
          {sizeUnits.lots != null ? (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.qChip,
                styles.chipOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => {
                setSize(sizeUnits.lots!.toFixed(2));
                setSizeFor(symbol);
                setFormError(null);
              }}
              accessibilityLabel={sizeUnitsText()}
            >
              <Text style={[styles.qChipText, styles.chipTextOn]}>{sizeUnitsText()}</Text>
            </Pressable>
          ) : (
            <Text style={[styles.planWarn, { textAlign: align }]}>{sizeUnitsText()}</Text>
          )}
        </View>
      ) : null}
      {/*
        «الخروج = الوقف/الهدف»: أغلب الصفقات تُغلق على وقفها أو هدفها بالضبط، والرقم مكتوبٌ أصلاً تحت —
        إعادة كتابته هي الخطوة التي تنقلب فيها منزلة فتُحفظ خسارةٌ كاملة ربحاً. تنسخ نصّ الخانة نفسه (لا
        تقريب)، فالنتيجة −1R وR:R الخطة حرفياً. مستويات صالحة بجهتها وحدها — راجع `exitShortcuts`.
        «= BE» بينهما (الخروج = الدخول ⇒ 0R) حين يكون للصفقة وقف: وقفٌ نُقل إلى الدخول ثم ضُرب.
      */}
      {exitChips.length > 0 ? (
        <View style={[styles.qChips, rtl && styles.rowRtl]}>
          {exitChips.map((x) => {
            const on = pnum(exit) === x.price;
            const label = `${x.kind === 'sl' ? 'SL' : x.kind === 'be' ? 'BE' : 'TP'} ${x.text}`;
            return (
              <Pressable
                key={x.kind}
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
                  setExit(x.text);
                  setFormError(null);
                }}
                // «= SL 1.0820» يُقرأ حروفاً لقارئ الشاشة («إس إل») — الجملة الكاملة بلغة المستخدم بدلها
                accessibilityLabel={(x.kind === 'sl'
                  ? t.journalExitAtSlA11y
                  : x.kind === 'be'
                    ? t.journalExitAtBeA11y
                    : t.journalExitAtTpA11y
                ).replace('{price}', x.text)}
              >
                <Text style={[styles.qChipText, on ? styles.chipTextOn : { color: x.kind === 'sl' ? colors.bear : x.kind === 'be' ? colors.textDim : colors.bull }]}>
                  {`= ${label}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {exitResult ? (
        <Text
          style={[
            styles.planLine,
            { textAlign: align },
            exitResult.pct < 0 ? { color: colors.bear } : exitResult.pct > 0 ? { color: colors.bull } : null,
          ]}
          accessibilityLiveRegion="polite"
        >
          {exitResult.text}
        </Text>
      ) : null}
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
          accessibilityLabel={t.riskCalcStop}
          accessibilityHint={t.journalSlPlaceholder}
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
          accessibilityLabel={t.riskCalcTargetPlaceholder}
          accessibilityHint={t.journalTpPlaceholder}
        />
      </View>
      {slTargets.length > 0 ? (
        <View style={[styles.qChips, rtl && styles.rowRtl]}>
          {slTargets.map((x: { pips: number; v: number; tol: number; text: string }) => {
            const cur = pnum(sl);
            const on = cur != null && Math.abs(cur - x.v) <= x.tol;
            return (
              <Pressable
                key={x.pips}
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
                  setSl(x.text);
                  setFormError(null);
                }}
                accessibilityLabel={t.journalSlAtPipsA11y.replace('{pips}', String(x.pips)).replace('{price}', x.text)}
              >
                <Text style={[styles.qChipText, on ? styles.chipTextOn : { color: colors.bear }]}>{`−${x.pips} pip`}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {rrTargets.length > 0 ? (
        <View style={[styles.qChips, rtl && styles.rowRtl]}>
          {rrTargets.map((x) => {
            const cur = pnum(tp);
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
      {draft?.issue && draft.issue !== 'slTooClose' ? (
        <Text style={[styles.formError, { textAlign: align }]}>{planIssueText(draft.issue)}</Text>
      ) : draft?.plan?.ok ? (
        <>
          <Text style={[styles.planLine, { textAlign: align }]}>{planSummary(draft.plan)}</Text>
          {draft.plan.rr != null && draft.plan.rr < 1 ? (
            <Text style={[styles.planWarn, { textAlign: align }]}>{t.planLowRR}</Text>
          ) : null}
        </>
      ) : draft?.issue === 'slTooClose' || draft?.plan?.issue === 'slTooClose' ? (
        // تحذير لا يمنع الحفظ: اليومية تسجّل ما حدث فعلاً
        <Text style={[styles.planWarn, { textAlign: align }]}>⚠ {t.planSlTooClose}</Text>
      ) : !draft && draftRisk ? (
        // بلا هدف بعد: المخاطرة وحدها (الوقف والحجم مكتوبان) — لا تنتظر اكتمال الخطة
        <Text style={[styles.planLine, { textAlign: align }]}>
          {t.planRiskWord} {formatPips(draftRisk.pips) ?? '—'} pip{draftRisk.money ? ` (${draftRisk.money})` : ''}
        </Text>
      ) : null}
      {draftRisk?.usc && !(draft?.issue && draft.issue !== 'slTooClose') ? (
        // المخاطرة بالسنت الأمريكي لحساب السنت: السطر يقول ما USC كي لا تُقرأ دولاراتٍ بمئة ضعف
        <Text style={[styles.planWarn, { textAlign: align }]}>{t.journalCentMoneyNote}</Text>
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
        accessibilityState={{ disabled: busy, busy }}
        accessibilityLabel={busy ? t.a11yBusy : editing ? t.journalSaveEditBtn : t.journalAddA11y}
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
