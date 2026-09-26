import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { colors, radii, spacing, buttons, numeric } from '../theme';
import { api, type Candle } from '../api';
import { playSoftClick } from '../audio/playSoftClick';
import { confirmDestructive, notify } from '../chart/confirmDestructive';
import { useI18n } from '../i18n/I18nContext';
import { misplacedArabicThousandsSign } from '../parseDecimal';
import { formatPrice } from '../chart/math';
import { isRealQuote, isSyntheticProvenance, serverNowSec } from '../chart/dataSource';
import { cachedChartSeries, rememberChartSeries } from '../hooks/chartSeriesCache';
import { pipUnit } from '../chart/measureReadout';
import { ambiguousThousandsPrice, miniAccountSymbol, parsePriceFor, liveEntryQuoteState, sizeLooksLikeUnits } from '../positionSize';
import {
  analyzePlan,
  entryAfterSideSwitch,
  liveEntryOrphaned,
  liveFillStillValid,
  closedElsewhere,
  journalOlderPage,
  journalWinRateLine,
  JOURNAL_PAGE,
  journalRefreshPages,
  journalOpenRiskComplete,
  journalOpenTotal,
  mergeJournalPage,
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
  journalLossStreaks,
  journalMaxDrawdownR,
  formatRR,
  breakevenWinRatePct,
  journalSymbol,
  quoteSymbol,
  levelSideIssue,
  exitLooksLikePips,
  levelLooksLikePips,
  levelLooksLikePipsText,
  entryLooksLikeDecimalSlip,
  entryDecimalSlipText,
  levelLooksLikeDecimalSlip,
  netByInstrument,
  openRiskTotals,
  stackedCurrencyExposure,
  draftStackedExposure,
  draftStackedExposureText,
  formatJournalLots,
  openTradesWithoutStop,
  openTradesUnknownRisk,
  knownLots,
  journalInstrumentKey,
  draftRiskFigures,
  journalSizeLooksLikeUnits,
  journalMoneyLots,
  parseJournalSize,
  journalSizeDottedThousands,
  journalSmallLotsStdEquiv,
  journalSizeFromSmall,
  realizedMove,
  realizedR,
  recentLotSizes,
  quickJournalSymbols,
  journalSpec,
  quickStopPips,
  atrStopPips,
  ATR_STOP_TF,
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
  editSizeValue,
  netLineIsWhole,
  noteWithTypedSize,
  formatSignedPct,
  journalNoteRoom,
  noteWithInitialStop,
  noteCharsLeft,
  JOURNAL_NOTE_MAX,
  trailedStopAllowed,
  initialStop,
  planStop,
  QUICK_SYMBOLS,
  plainStopText,
  openQuotesRefreshDue,
  computedPriceText,
  journalDraftTyped,
} from '../tradePlan';
import { NewsRiskBanner } from './NewsRiskBanner';

/**
 * حدّ خانات السعر (دخول/خروج/وقف/هدف). كان 12: أندرويد يقصّ بـ`maxLength` حتى النصّ الذي يملؤه التطبيق — تعديل صفقة PEPE
 * بدخول 0.0000000123456 (15 حرفاً، `plainStopText`) كان يُملأ «0.0000000123» فيُحفظ سعرٌ آخر بصمت. 20 تكفي كل سعر مسجَّل.
 */
const PRICE_MAX_LEN = 20;

/**
 * سقف عدد الأدوات التي يُجلب لها سعر السوق للنتيجة العائمة. `/api/market/quote` **لا يُخزَّن**
 * بالخادم (خلافاً للشموع والتقويم): كل نداء = طلبٌ عند المزوّد. ومن يفتح عشرين صفقة على عشرين أداة
 * حالةٌ نادرة لا تستحق عشرين طلباً دفعةً واحدة — أدوات الصفقات المفتوحة الأربع الأولى بترتيب الخادم
 * (الأحدث تسجيلاً أولاً، وهي الأولى بالحاجة) تغطّي دفتر متداول التجزئة عملياً، وما بعدها يبقى كما
 * كان بلا سطر عائم.
 */
const MAX_LIVE_QUOTES = 4;

/** 3 / 2.5 — مقدار R بلا إشارة (منزلة واحدة كـformatR) لقوالب «{r}R». */
const formatRAbs = (r: number): string => (Number.isInteger(r) ? String(Math.abs(r)) : Math.abs(r).toFixed(1));

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
  /** backend-r1: `null` = لم يُكتب حجم (كان الخادم يخزّن 1). صفوفٌ أقدم قد تحمل 1 مجهولاً — `knownLots` يفرّق. */
  size: number | null;
  pnl?: number | null;
  /** وقف/هدف اختياريان (غائبان بسجلات قديمة أو باك-إند قديم). */
  sl?: number | null;
  tp?: number | null;
  note: string;
  status: string;
  opened_at: string;
  /** وقت الإغلاق من الخادم — ترتيب سلسلة الخسائر والتراجع بالـR (`closedChronological`)؛ غائب ⇒ `opened_at`. */
  closed_at?: string | null;
};

/** «+2R» بصفّ الصفقة — المصدر نفسه لـ«متوسط R» (`realizedR`: الوقف الأصلي «1R @ …» ثم `sl`)؛ '' بلا R. */
const rowR = (tr: Trade): string =>
  formatR(
    realizedR({
      symbol: tr.symbol,
      side: tr.side === 'sell' ? 'sell' : 'buy',
      entry: tr.entry,
      sl: tr.sl,
      exit: tr.exit,
      note: tr.note,
    })
  ) ?? '';

type Stats = JournalStats;

/** شريحة وقف التقلّب (`atrStopPips`): اسم المؤشر كما هو بالشارت، بلا ترجمة كسائر أسماء المؤشرات. */
const ATR_STOP_LABEL = 'ATR';

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
  /**
   * شريط أخبار الشارت لرمز `defaultSymbol` **ظاهرٌ فعلاً** بجانب اللوحة (الرصيف السفلي المدمج) ⇒ يُحذف من سطر «صفقاتك
   * المفتوحة» ما يعلنه ذلك الشريط (QA38). بلا هذه الخاصية لا يُفترض شريطٌ ظاهر: لوح الجانب (`MatrixSidePanel`) نافذةٌ
   * فوق الشارت بخلفية معتمة، والشريط تحتها مغطّى ولا يبلغه قارئ الشاشة — فكان تحذير NFP لصفقات GBPUSD/XAUUSD المفتوحة
   * يُحذف لأن شارت EURUSD «يعلنه»، ولا يرى المتداول أيّ تحذير. تكرار التحذير أهون من غيابه.
   */
  chartBannerVisible?: boolean;
};

/** لقطة اقتباس أداة صفقة مفتوحة — Bid/Ask قد يغيبان (يُستعمل السعر المفرد حينها). */
type QuoteSnap = { price: number; bid?: number | null; ask?: number | null };

/** خطأ `postJson` لردّ 409 (`trade_already_closed`، backend-r1): الصفقة أُغلقت بجهاز آخر بين الفحص والإغلاق. */
const isAlreadyClosedError = (e: unknown) => e instanceof Error && /\bHTTP 409\b/.test(e.message);

/** 409 على الإغلاق بـ`detail.error === 'trade_changed_concurrently'` (backend-r47): عُدِّلت الصفقة (دخول/اتجاه) بجهاز آخر
 *  أثناء الإغلاق — ليست مغلقة، فلا يُقال «أُغلقت من جهاز آخر» (launch143b). */
const isChangedConcurrentlyError = (e: unknown) =>
  isAlreadyClosedError(e) &&
  (e as { detail?: { error?: unknown } }).detail?.error === 'trade_changed_concurrently';

export function TradeJournalPanel({ defaultSymbol, flow = false, ticks, chartBannerVisible = false }: Props = {}) {
  const { t, rtl, lang } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  /** `/api/trades` `total` (backend-r1) — كل صفقات المتداول لا الصفحة. `null` بخادمٍ أقدم لا يرسله. */
  const [total, setTotal] = useState<number | null>(null);
  /** `open_total` مع `open_first` (tools103b) — كل المفتوحة بالصفحة الأولى ⇒ مجموع خطرها كامل ولو لم يُحمَّل الدفتر كلّه */
  const [openTotal, setOpenTotal] = useState<number | null>(null);
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
  /** النموذج **الآن** — صفقةٌ بدأت كتابتها أثناء طلب الإضافة لا يمسحها `resetForm` حين يصل الردّ */
  const formKeyRef = useRef('');
  formKeyRef.current = [symbol, side, entry, exit, size, sl, tp, note].join('\u0001');
  /** مفتاح النموذج الذي عُرض عليه «نقاطٌ بخانة سعر» عند الحفظ — ضغطة ثانية بلا تعديل تحفظ السعر كما كُتب. */
  const pipsOverrideRef = useRef<string | null>(null);
  /** جلب «السعر الحالي» لخانة الدخول جارٍ */
  const [quoteBusy, setQuoteBusy] = useState(false);
  /** وضوح الحالة: يميّز "لا صفقات بعد" فعلياً عن فشل تحميل السجل */
  const [listError, setListError] = useState(false);
  /** وضوح الحالة: يعلم المستخدم إذا فشلت إضافة صفقة بدل صمت كامل (لم يكن هناك حتى catch) */
  const [formError, setFormError] = useState<string | null>(null);
  /** صفقة قيد التعديل — النموذج نفسه يُملأ بها و«إضافة» يصبح «حفظ التعديل» (خطأ كتابة بالدخول كان يُفسد
   * الإحصاءات، والحلّ الوحيد كان الحذف وإعادة الكتابة). */
  const [editing, setEditing] = useState<Trade | null>(null);
  /** «تصحيح خطأ كتابة لا تحريك» للوقف بهذا التعديل: لا علامة «1R @ …» من وقفٍ قديم كان خطأً (`noteWithInitialStop` `typoFix`) */
  const [stopTypoFix, setStopTypoFix] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setStopTypoFix(false), [editing?.id]);
  const editingRef = useRef(editing);
  editingRef.current = editing;
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
  /** وقت آخر لقطة ناجحة وقائمتها — للتجديد عند العودة من الخلفية (`openQuotesRefreshDue`) */
  const quotesAtRef = useRef<number | null>(null);
  const tradesRef = useRef<Trade[]>([]);

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
      quotesAtRef.current = null;
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
          // وسعرٌ أقدم من 3 دقائق والسوق مفتوح (المزوّد يردّ 429 ⇒ إغلاق شمعة 15د مخزّنة، حتى ساعات) لا يُحسب عليه العائم: «+50 pip»
          // أخضر من سعر قبل ساعتين، و«أغلق بالسعر الحالي» يرفضه نفسه. يُعامَل كغياب السعر؛ والسوق المغلق (العطلة) يبقى بسعر الإغلاق
          return isRealQuote(q) && liveEntryQuoteState(q, Date.now()) !== 'stale'
            ? ([sym, { price: q.price, bid: q.bid, ask: q.ask }] as const)
            : null;
        } catch {
          return null;
        }
      })
    );
    // تبديل قائمة الصفقات أثناء الطلب (إغلاق صفقة مثلاً) يُلغي هذه النتيجة — لا أسعار لقائمة سابقة
    if (!mountedRef.current || gen !== quoteGenRef.current) return;
    const next: Record<string, QuoteSnap> = {};
    for (const pair of got) if (pair) next[pair[0]] = pair[1];
    quotesAtRef.current = Date.now();
    setQuotes(next);
  }, []);

  /**
   * **العودة من الخلفية** تجدّد اللقطة إن مضت دقيقة: بلا مؤقّت (أعلاه) كانت أرقام الصفوف العائمة تبقى من
   * لحظة فتح الدفتر ساعاتٍ والسوق تحرّك. طلبٌ واحد لكل عودة، لا استطلاع.
   */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active' || !openQuotesRefreshDue(quotesAtRef.current, Date.now())) return;
      void loadOpenQuotes(tradesRef.current);
    });
    return () => sub.remove();
  }, [loadOpenQuotes]);

  /**
   * رقم آخر طلب للقائمة: أول تحميل بطيء والنموذج يعمل تحته — تُضاف صفقة فيصل تحديثُ ما بعد الإضافة أولاً، ثم يصل
   * الطلب الأول **بقائمة أقدم بلا الصفقة** فيستبدلها. المتداول يظنّ الحفظ فشل فيضيفها ثانيةً (نسبة الفوز والصافي
   * يُحسبان مرتين). الردّ الأقدم من آخر طلب يُسقط، كأسعار الصفقات المفتوحة (`quoteGenRef`).
   */
  const listGenRef = useRef(0);
  /** آخر `total` من الخادم للتحديث (`journalRefreshPages`): الدفتر المحمَّل كلّه يبقى كلّه بعد الإضافة. */
  const totalRef = useRef<number | null>(null);
  totalRef.current = total;
  /** «تحميل الأقدم» جارٍ / فشل آخرُه — التحديث الناجح يمسح الفشل (القائمة كلّها وصلت من جديد). */
  const [olderBusy, setOlderBusy] = useState(false);
  const [olderError, setOlderError] = useState(false);
  const refresh = useCallback(async () => {
    const gen = ++listGenRef.current;
    try {
      // ما حُمّل بـ«تحميل الأقدم» يبقى بعد إضافة/إغلاق/حذف (`journalRefreshPages`) — صفحاتٌ متتالية، الأولى تحمل الإجمالي والإحصاءات
      const pages = journalRefreshPages(tradesRef.current.length, totalRef.current);
      const res = await api.trades(pages[0]);
      let list = res.trades as Trade[];
      for (let i = 1; i < pages.length && list.length >= pages[i].offset; i++) {
        if (!mountedRef.current || gen !== listGenRef.current) return;
        list = mergeJournalPage(list, (await api.trades(pages[i])).trades as Trade[]);
      }
      if (!mountedRef.current || gen !== listGenRef.current) return;
      tradesRef.current = list;
      setTrades(list);
      setStats(res.stats as Stats);
      const tot = (res as { total?: unknown }).total;
      setTotal(typeof tot === 'number' && Number.isFinite(tot) && tot >= 0 ? tot : null);
      setOpenTotal(journalOpenTotal(res));
      setListError(false);
      setOlderError(false);
      void loadOpenQuotes(list);
    } catch {
      if (mountedRef.current && gen === listGenRef.current) {
        tradesRef.current = [];
        setTrades([]);
        setStats(null);
        setTotal(null);
        setOpenTotal(null);
        setListError(true);
      }
    } finally {
      if (mountedRef.current && gen === listGenRef.current) setLoading(false);
    }
  }, [loadOpenQuotes]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** «تحميل الأقدم» (backend-r1 `limit`/`offset`): صفحةٌ بعد المحمَّل بتداخلٍ يحمي من حذفٍ بجهاز آخر (`journalOlderPage`). */
  const loadOlder = useCallback(async () => {
    // يقرأ الرقم ولا يزيده: تحديثٌ بعد الحفظ جارٍ لا يُسقطه «الأقدم» — كان يُسقَط فتُدمج الصفحة الأقدم على قائمة ما قبل الحفظ
    // فتختفي الصفقة المضافة (فيضيفها المتداول ثانيةً). تحديثٌ يبدأ بعده يُسقط الأقدم كما كان (القائمة الأحدث تغلب).
    const gen = listGenRef.current;
    setOlderBusy(true);
    setOlderError(false);
    try {
      const res = await api.trades(journalOlderPage(tradesRef.current.length));
      if (!mountedRef.current || gen !== listGenRef.current) return;
      const list = mergeJournalPage(tradesRef.current, res.trades as Trade[]);
      tradesRef.current = list;
      setTrades(list);
      setStats(res.stats as Stats);
      const tot = (res as { total?: unknown }).total;
      setTotal(typeof tot === 'number' && Number.isFinite(tot) && tot >= 0 ? tot : null);
      setOpenTotal(journalOpenTotal(res));
      void loadOpenQuotes(list);
    } catch {
      if (mountedRef.current && gen === listGenRef.current) setOlderError(true);
    } finally {
      if (mountedRef.current) setOlderBusy(false);
    }
  }, [loadOpenQuotes]);

  // تبديل زوج الشارت يُبدّل رمز التسجيل — لكن ليس وسط تسجيل صفقة مكتوبة (دخول/خروج/حجم/وقف/هدف مكتوب لرمز آخر
  // كان سيُسجَّل تحت الرمز الجديد) — `journalDraftTyped`.
  const entryRef = useRef(entry);
  entryRef.current = entry;
  const draftRef = useRef<string[]>([]);
  draftRef.current = [entry, exit, size, sl, tp];
  useEffect(() => {
    if (defaultSymbol && !journalDraftTyped(draftRef.current)) setSymbol(defaultSymbol);
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
    const liveNow = () => ({ key: liveKeyRef.current, entryText: entryRef.current, editId: editingRef.current?.id ?? null });
    const atTap = { ...liveNow(), key: `${sym}|${side}` };
    if (sym == null || quoteBusy) return;
    setQuoteBusy(true);
    setFormError(null);
    try {
      const q = await api.marketQuote(sym);
      if (!mountedRef.current) return;
      // الرمز أو الجهة أو الدخول المكتوب أو الصفقة قيد التعديل تغيّرت أثناء الطلب — يُسقط (`liveFillStillValid`)
      if (!liveFillStillValid(atTap, liveNow())) return;
      // سعرٌ مخزّن أقدم من 3 دقائق (المزوّد يردّ 429) ليس «السعر الحالي» — راجع `liveEntryQuoteState`
      if (!isRealQuote(q) || liveEntryQuoteState(q, Date.now()) === 'stale') {
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

  /** خانة الحجم: «0,10» / «١٫٥» / «0.10 lots» → لوت (راجع `parseJournalSize`)؛ خانة فارغة أو غير رقمية → null. */
  const num = (v: string): number | null => parseJournalSize(v);
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
  // «10.000» آلافٌ بنقطة أم 10 لوتات؟ — التحذير نفسه بقراءة الوحدات (`journalSizeDottedThousands`)
  const sizeDotted = journalSizeDottedThousands(size, symbol);
  const sizeUnits = (() => {
    if (sizeDotted) return { lots: sizeDotted.lots };
    const l = num(size);
    // رمز سنت كذلك، بلا اقتراح تحويل (`journalSizeLooksLikeUnits`)
    return l != null ? journalSizeLooksLikeUnits(l, symbol) : null;
  })();
  const sizeUnitsText = (): string => {
    const l = num(size) ?? 0;
    // المبهم يُقتبس كما كُتب («10.000») — «10» لا تبدو وحدات
    const n = sizeDotted ? size.trim() : String(l).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    // «10.000» يُسأل عنه بقراءتيه (10,000 وحدة أم 10 lot؟) — «تبدو وحدات» وحدها تُقرأ خطأً على من قصد 10 لوتات
    if (sizeDotted) {
      return t.journalSizeDottedFix
        .split('{n}').join(n)
        .split('{units}').join(String(sizeDotted.units).replace(/\B(?=(\d{3})+(?!\d))/g, ','))
        .split('{whole}').join(String(sizeDotted.units / 1000))
        .split('{lots}').join(sizeDotted.lots.toFixed(2));
    }
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
  /** الأحرف الباقية تحت خانة الملاحظة قرب حدّ الخادم (`noteCharsLeft`) — `null` = لا سطر. */
  // الحدّ ناقص علامتَي الحفظ («1.00 lot»، «1R @ …») كي لا تسقطا بصمت من ملاحظة ممتلئة (`journalNoteRoom`)
  const noteRoom = (() => {
    const e = pnum(entry);
    return journalNoteRoom({
      symbol: symbol.trim(),
      note,
      size: num(size),
      edit: editing && e != null ? { before: editing, after: { side, entry: e, sl: pnum(sl) } } : null,
      typoFix: stopTypoFix,
    });
  })();
  const noteLeft = noteCharsLeft(note, noteRoom);
  /** الملاحظة كما ستُحفظ: بعلامة «1R @ …» تُلحق حين يُحرَّك وقف صفقة مفتوحة (شدّ، توسيع، مسح) بهذا التعديل (`noteWithInitialStop`). */
  const noteToSave = (e: number | null, s: number | null, typoFix = stopTypoFix): string =>
    editing && e != null
      ? noteWithInitialStop({ symbol: symbol.trim(), note, before: editing, after: { side, entry: e, sl: s }, typoFix })
      : note;
  /**
   * خيار «تصحيح لا تحريك» يظهر حين يُلحق هذا التعديل علامة «1R @ …» (أو حين اختير): 1.0380 مكتوبة خطأً ثم تصحيحها إلى
   * 1.0830 كانت تُحفظ «1R @ 1.038» فيُقاس الربح بمسافةٍ لم يخاطر بها المتداول (+0.1R بدل +2R). النصّ من launch
   * (`journalStopTypoFix`، ar/en/ku).
   */
  const stopTypoFixText = t.journalStopTypoFix;
  const stopTypoFixShown = (() => {
    if (!stopTypoFixText || editing?.status !== 'open') return false;
    if (stopTypoFix) return true;
    return noteToSave(pnum(entry), pnum(sl), false) !== note;
  })();

  const riskAt = (s: number | null) => {
    const e = pnum(entry);
    // لا مال من حجمٍ مبهم («10.000») أو يبدو وحدات — سطر التحذير يسأل عنه (`journalMoneyLots`)
    const l = journalMoneyLots(size, symbol);
    if (e == null || s == null || l == null) return null;
    // حساب السنت بالـUSC (≈ USD) وmicro بعقده (`journalRisk`) — سطر `journalCentMoneyNote` تحت USC
    const r = draftRiskFigures({ symbol, side, entry: e, sl: s, lots: l });
    if (!r) return null;
    return { pips: r.pips, money: r.cash ? formatJournalMoney(r.cash, t.journalMoneyUsc) : null, usc: r.cash?.ccy === 'USC' };
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const draftRisk = useMemo(() => riskAt(pnum(sl)), [symbol, side, entry, sl, size, t]);

  /** "المخاطرة 25 pip (125.00 USD) · الربح المحتمل 50 pip · R:R 1:2.0" — المال حين يُكتب الحجم. */
  const planSummary = (plan: TradePlan): string => {
    /**
     * الربح المحتمل بالمال بجانب المخاطرة بالمال: كان السطر يقول «المخاطرة 25 pip (125.00 USD) · الربح
     * المحتمل 50 pip» فيُترك المتداول ليضرب نصف المعادلة بنفسه. نتيجة الخروج عند الهدف بالدالّة نفسها
     * التي تحسب نتيجة الصفقة بعد إغلاقها (`journalPnl` — سنت/micro بعقده)، فالرقم هنا هو ما سيراه بالقائمة لو بلغ الهدف.
     */
    const e = pnum(entry);
    const p = pnum(tp);
    const l = journalMoneyLots(size, symbol);
    // المال بين قوسين من وقف الخطة نفسه (الأصلي «1R @ …» بعد الشدّ) لا من الوقف الحالي — السطر يصف خطة واحدة
    const risk = noteStop != null ? riskAt(noteStop) : draftRisk;
    const gain =
      risk && plan.ok && e != null && p != null && l != null
        ? journalPnl({ symbol, side, entry: e, exit: p, lots: l })
        : null;
    const gainText = gain && gain.amount > 0 ? formatJournalMoney(gain, t.journalMoneyUsc) : null;
    return planSummaryText(plan, { risk: t.planRiskWord, reward: t.planRewardWord, unit: pipUnit(lang) }, risk?.money, gainText);
  };

  /**
   * خطأ جهة الوقف/الهدف، إلا وقفاً على الدخول أو خلفه لصفقة وقفُها الأصلي معروف بالملاحظة (`trailedStopAllowed`):
   * نقلٌ للتعادل أو حجزُ ربح، والهدف ما زال يُفحص.
   */
  const trailedIssue = (sym: string, e: number, s: number | null, p: number | null, n: string): PlanIssue | null => {
    const issue = levelSideIssue({ side, entry: e, sl: s, tp: p });
    if (issue !== 'slWrongSide' || !trailedStopAllowed({ symbol: sym, side, entry: e, note: n })) return issue;
    return levelSideIssue({ side, entry: e, tp: p });
  };

  /**
   * الوقف الأصلي «1R @ …» الذي سيُحفظ مع الملاحظة (موجوداً أو يُلحق الآن بشدّ الوقف) — لسطر `journalInitialStopNote`
   * تحت خانة الملاحظة: العلامة بلا شرح تُقرأ نصّاً غريباً فتُحذف ويعود الـR المتضخّم.
   */
  const noteStop = useMemo(() => {
    const e = pnum(entry);
    if (e == null) return null;
    return initialStop({ symbol: symbol.trim(), side, entry: e, note: noteToSave(e, pnum(sl)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, side, entry, sl, note, editing, stopTypoFix]);

  // معاينة حيّة أثناء الكتابة: خطأ جهة فوراً (حتى بوقف وحده)، والملخّص حين تكتمل الأرقام الثلاثة.
  const draft = useMemo(() => {
    const e = pnum(entry);
    if (e == null) return null;
    const s = pnum(sl);
    const p = pnum(tp);
    const trailNote = noteToSave(e, s);
    const issue = trailedIssue(symbol.trim(), e, s, p, trailNote);
    if (issue) return { issue, plan: null as TradePlan | null };
    // وقفٌ حُرِّك بعد الدخول (شدٌّ، تعادل، حجز ربح): الخطة تُلخَّص من الوقف الأصلي «1R @ …» (`noteStop`) — كـ`planStop`
    // بسطر الصفقة. كان الشدّ من 20 pip إلى 5 يكتب «R:R 1:8.0» أثناء التعديل ثم «1:2.0» بالقائمة بعد الحفظ.
    if (noteStop != null) {
      if (p == null) return null;
      return { issue: null, plan: analyzePlan({ symbol: symbol.trim(), side, entry: e, sl: noteStop, tp: p }) };
    }
    // وقفٌ على الدخول أو خلفه بلا وقف أصلي صالح: لا «مخاطرة» تُلخَّص
    if (s != null && levelSideIssue({ side, entry: e, sl: s })) return null;
    // وقفٌ أقرب من 1 pip بلا هدف بعد: التحذير نفسه بدل «المخاطرة 0.1 pip» كأنها خطة عادية
    if (s != null && p == null && stopTooClose({ symbol: symbol.trim(), side, entry: e, sl: s })) {
      return { issue: 'slTooClose' as PlanIssue, plan: null };
    }
    if (s == null || p == null) return null;
    return { issue: null, plan: analyzePlan({ symbol: symbol.trim(), side, entry: e, sl: s, tp: p }) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, side, entry, sl, tp, note, editing, stopTypoFix, noteStop]);

  /**
   * أهداف جاهزة بالنسبة (1:1 · 1:1.5 · 1:2 · 1:3) من الدخول والوقف المكتوبين — نفس شرائح الحاسبة:
   * الهدف يُقرَّر بالنسبة غالباً، وكتابته بيدٍ بعد حسابه ذهنياً هي الخطوة التي تنقلب فيها منزلة.
   * لا تظهر بوقف بالجهة الخطأ (التحذير يقول ذلك أصلاً) ولا بوقف أضيق من pip (`slTooClose`).
   * بعد تحريك الوقف تُحسب من **الوقف الأصلي** «1R @ …» (`noteStop`، كـ`planStop` بسطر الصفقة): وقفٌ مشدود من 20 pip
   * إلى 5 كان يجعل «1:2» هدفاً على بُعد 10 pip بدل 40 المخطَّطة، والنقل للتعادل كان يُخفي الشرائح كلّها.
   */
  const rrTargets = useMemo(() => {
    const e = pnum(entry);
    const s = noteStop ?? pnum(sl);
    if (e == null || s == null || levelSideIssue({ side, entry: e, sl: s })) return [];
    const sym = symbol.trim().toUpperCase();
    // سنت/micro («EURUSDC») بمواصفات زوجه العادي ومنازله (`journalSpec`)
    const spec = journalSpec(sym);
    if (stopTooClose({ symbol: sym, side, entry: e, sl: s })) return [];
    return QUICK_RR.flatMap((rr) => {
      const v = targetAtRR({ symbol: sym, side, entry: e, sl: s, rr });
      // `tol`: الشريحة «مختارة» حين تطابق الخانةُ سعرَها (نصف pipette، أو مطابقة شبه تامّة بلا مواصفات)
      const tol = spec ? spec.pipSize / 20 : Math.abs(v ?? 0) * 1e-9;
      return v != null ? [{ rr, v, tol, text: spec ? formatPrice(v, spec.symbol) : computedPriceText(v) }] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, side, entry, sl, noteStop]);

  /**
   * شرائح الوقف بالمسافة («20 pip») تحت خانة الوقف: سعر الوقف من الدخول بجهة الخسارة (`stopAtPips`) —
   * المتداول يقرّر وقفه بالنقاط، وكان يطرح بيده فيقع الوقف بالجهة الخطأ أو بحجم pip خاطئ. تظهر بدخول صالح
   * لأداة معروفة المواصفات فقط.
   */
  /**
   * شموع الساعة للرمز (الزوج العادي لرموز السنت/الأسماء — `journalSpec`) لشريحة وقف التقلّب (`atrStopPips`): من ذاكرة الشارت
   * المشتركة إن جلبها، وإلا طلبٌ واحد بعد توقّف الكتابة. التجريبية/غير المتاحة لا تُستعمل (ATR سعرٍ عشوائي ليس تقلّب السوق)،
   * وردٌّ لرمزٍ سابق يُرمى.
   */
  const atrKey = journalSpec(symbol.trim().toUpperCase())?.symbol ?? null;
  const [atrSeries, setAtrSeries] = useState<{ key: string; candles: Candle[] } | null>(null);
  const atrWanted = atrKey != null && pnum(entry) != null;
  useEffect(() => {
    if (!atrKey || !atrWanted) return;
    const cached = cachedChartSeries(atrKey, ATR_STOP_TF);
    if (cached && !isSyntheticProvenance(cached.data_source)) {
      setAtrSeries({ key: atrKey, candles: cached.candles });
      return;
    }
    let alive = true;
    const id = setTimeout(() => {
      api
        .chart(atrKey, ATR_STOP_TF, 60)
        .then((s) => {
          const r = rememberChartSeries(atrKey, ATR_STOP_TF, s);
          if (alive && !isSyntheticProvenance(r.data_source)) setAtrSeries({ key: atrKey, candles: r.candles });
        })
        .catch(() => {});
    }, 600);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [atrKey, atrWanted]);
  const atrPips = useMemo(
    () =>
      atrKey && atrSeries?.key === atrKey
        ? atrStopPips({ symbol: atrKey, candles: atrSeries.candles, nowSec: serverNowSec() })
        : null,
    [atrKey, atrSeries]
  );

  const slTargets = useMemo(() => {
    const e = pnum(entry);
    const sym = symbol.trim().toUpperCase();
    const spec = journalSpec(sym);
    if (e == null || !spec) return [];
    // شريحة التقلّب أولاً (إن لم تطابق شريحة ثابتة)، ثم المسافات الثابتة
    const fixed = quickStopPips(sym, e);
    const list: { pips: number; atr: boolean }[] = [
      ...(atrPips != null && !fixed.includes(atrPips) ? [{ pips: atrPips, atr: true }] : []),
      ...fixed.map((pips) => ({ pips, atr: pips === atrPips })),
    ];
    return list.flatMap(({ pips, atr }) => {
      const v = stopAtPips({ symbol: sym, side, entry: e, pips });
      return v != null ? [{ pips, atr, v, tol: spec.pipSize / 20, text: formatPrice(v, spec.symbol) }] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, side, entry, atrPips]);

  /**
   * «50» بخانة الهدف (من «TP 50 pips») أو «25» بخانة الوقف: نقاطٌ لا سعر (`levelLooksLikePips`) — كانت تُحفظ هدفاً عند 50.00
   * و«R:R 1:1960». الوقف أولاً؛ السطر يقترح السعر على تلك المسافة وتكتبه نقرته، والحفظ يُمنع حتى يُصحَّح.
   */
  /**
   * «10850» دخولاً لـEURUSD ووقف 1.0820: الدخول بلا فاصلة لا الوقف نقاطاً (`entryLooksLikeDecimalSlip`، tools102a) — كان حارس
   * النقاط يلوم الوقف الصحيح ويقترح 10849.99989، والضغطة الثانية تحفظ −99.99%. السطر يقترح الدخول المقصود وتكتبه نقرته؛
   * يسبق حارس النقاط ويمنع الحفظ بلا ضغطة ثانية (لا صفقة حقيقية دخولها ≥8× كل مستوياتها).
   */
  const entrySlip = useMemo(() => {
    const sym = symbol.trim().toUpperCase();
    const hit = entryLooksLikeDecimalSlip({ symbol: sym, entry: pnum(entry), levels: [pnum(sl), pnum(tp), pnum(exit)] });
    if (!hit) return null;
    const text = formatPrice(hit.price, journalSpec(sym)?.symbol ?? sym);
    return { text, msg: entryDecimalSlipText(t.journalEntryDecimalSlip, entry, text) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, entry, sl, tp, exit, t]);

  const pipsLevel = useMemo(() => {
    if (entrySlip) return null;
    const e = pnum(entry);
    const sym = symbol.trim().toUpperCase();
    // launch140b: مؤشر/رقمية بلا `journalSpec` تُقاس بالنقاط لا pip («50 pip تعني 41,950» على US30 خطأ لغةً)
    const points = !journalSpec(sym);
    const hint = points ? t.levelLooksLikePointsHint : t.levelLooksLikePipsHint;
    const spec = journalSpec(sym)?.symbol ?? sym;
    /**
     * tools104a: «10880» وقفاً لبيع EURUSD على 1.0850 — بلا فاصلة لا نقاطاً (`levelLooksLikeDecimalSlip`) ⇒ «هل تقصد 1.08800؟» أولاً،
     * وقراءة النقاط بعده إن وُجدت (USDJPY «1590» ⇒ 159.000 أو 173.300). `slip` يمنع الحفظ بلا ضغطة ثانية: الرقم ليس سعراً بأيّ قراءة.
     */
    const slipFix = (label: string, raw: string) => {
      const hit = levelLooksLikeDecimalSlip({ symbol: sym, entry: e, level: pnum(raw) });
      if (!hit) return [];
      const text = formatPrice(hit.price, spec);
      return [{ text, msg: levelLooksLikePipsText(t.journalLevelDecimalSlip, label, raw, '', text) }];
    };
    const found = (['sl', 'tp'] as const).map((kind) => {
      const raw = kind === 'sl' ? sl : tp;
      const label = (kind === 'sl' ? t.journalSlPlaceholder : t.journalTpPlaceholder).split(' (')[0].trim();
      const slip = slipFix(label, raw);
      const hit = levelLooksLikePips({ symbol: sym, side, entry: e, level: pnum(raw), kind });
      if (!hit && slip.length === 0) return null;
      const pipFix = hit ? formatPrice(hit.price, spec) : null;
      return {
        kind,
        label,
        points,
        slip: slip.length > 0,
        raw: raw.trim(),
        fixes: [
          ...slip,
          ...(hit && pipFix != null && pipFix !== slip[0]?.text
            ? [{ text: pipFix, msg: levelLooksLikePipsText(hint, label, raw, hit.pips, pipFix) }]
            : []),
        ],
      };
    });
    // والخروج («25» من «أغلقتُ +25» كانت تُحفظ خروجاً عند 25.00 ⇒ +2,204%): بأيّ جهة، فسطرٌ لكلٍّ منهما بإشارته — `exitLooksLikePips`
    const exLabel = t.journalExitPlaceholder.split(' (')[0].trim();
    const exSlip = slipFix(exLabel, exit);
    const ex = exitLooksLikePips({ symbol: sym, side, entry: e, exit: pnum(exit) });
    const exFixes = (
      ex
        ? ([
            [ex.win, `+${ex.pips}`],
            [ex.loss, `\u2212${ex.pips}`],
          ] as const)
        : []
    ).flatMap(([px, signed]) => {
      if (px == null) return [];
      const text = formatPrice(px, spec);
      return text === exSlip[0]?.text ? [] : [{ text, msg: levelLooksLikePipsText(hint, exLabel, exit, signed, text) }];
    });
    const all = [
      ...found,
      ex || exSlip.length > 0
        ? { kind: 'exit' as const, label: exLabel, points, slip: exSlip.length > 0, raw: exit.trim(), fixes: [...exSlip, ...exFixes] }
        : null,
    ];
    // بلا فاصلة (لا يُتجاوز) يسبق نقاطاً بخانة أخرى (يُتجاوز بضغطة ثانية) — وإلا حفظت الضغطة الثانية هدفاً عند 10880
    return all.find((r) => r?.slip) ?? all.find((r) => r != null) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, side, entry, sl, tp, exit, t, entrySlip]);

  /** شرائح الرمز: أدوات المتداول نفسه أولاً («XAUUSD.m» كما يكتبها وسيطه)، ثم القائمة الثابتة — `quickJournalSymbols` */
  const symbolChips = useMemo(() => quickJournalSymbols(trades, QUICK_SYMBOLS), [trades]);

  /** آخر أحجام اللوت المختلفة من صفقات المتداول نفسه — شرائح تحت خانة الحجم (`recentLotSizes`) */
  // لوت السنت/micro لا يُقترح لرمزٍ عادي ولا العكس — راجع `recentLotSizes`
  const lotChips = useMemo(() => recentLotSizes(trades, 3, symbol), [trades, symbol]);

  /** شرائح «الخروج = الوقف/الهدف» تحت خانة الخروج — راجع `exitShortcuts` */
  const exitChips = useMemo(
    () =>
      exitShortcuts({
        side,
        entry: pnum(entry),
        sl: pnum(sl),
        tp: pnum(tp),
        // وقفٌ نُقل للتعادل/الربح: الملاحظة كما ستُحفظ (بعلامة «1R @ …» إن شُدّ الوقف بهذا التعديل)
        trailed: (() => {
          const e = pnum(entry);
          return e != null && trailedStopAllowed({ symbol: symbol.trim(), side, entry: e, note: noteToSave(e, pnum(sl)) });
        })(),
      }).map((x) => ({
        ...x,
        text: x.kind === 'sl' ? sl.trim() : x.kind === 'be' ? entry.trim() : tp.trim(),
        // وقفٌ في الربح لونه ربح لا خسارة
        gain: x.kind === 'sl' && levelSideIssue({ side, entry: pnum(entry) ?? 0, sl: x.price }) != null,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [symbol, side, entry, sl, tp, note, editing, stopTypoFix]
  );

  /**
   * نتيجة الصفقة **قبل الحفظ** حين يُكتب الخروج: «−25 pip · −125.00 USD · −0.23% · النتيجة −1R» —
   * بالشكل والدوالّ نفسها التي يعرضها سطر الصفقة بعد الحفظ (`exitPreview`)، فمنزلةٌ منقلبة تُرى ربحاً
   * صغيراً هنا قبل أن تُحفظ. بلا مال من حجمٍ يبدو وحدات (سطر التحذير يقول ما الخطأ).
   */
  const exitResult = useMemo(() => {
    if (unreadablePx(exit)) return null;
    const p = exitPreview({
      symbol: symbol.trim(),
      side,
      entry: pnum(entry),
      sl: pnum(sl),
      exit: pnum(exit),
      lots: journalMoneyLots(size, symbol),
      // الملاحظة التي ستُحفظ (بعلامة «1R @ …» إن شُدّ الوقف الآن) — الـR نفسه الذي يعرضه السطر بعد الحفظ
      note: noteToSave(pnum(entry), pnum(sl)),
    });
    if (!p) return null;
    const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '');
    const pips = formatPips(p.pips == null ? null : Math.abs(p.pips));
    const r = formatR(p.r);
    const text = [
      pips != null ? `${sign(p.pips ?? 0)}${pips} ${pipUnit(lang)}` : null,
      p.cash ? formatJournalMoney(p.cash, t.journalMoneyUsc, true) : null,
      `${sign(p.pct)}${Math.abs(p.pct).toFixed(2)}%`,
      r ? t.journalResultR.replace('{r}', r) : null,
    ]
      .filter(Boolean)
      .join(' · ');
    // اللون من جهة الحركة لا من النسبة المقرَّبة: «−50.00 USD · 0.00%» خسارة حمراء لا رمادية (`realizedMove` `dir`)
    return { text, dir: p.dir };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, side, entry, sl, exit, size, note, editing, stopTypoFix, t]);

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
    const streak = journalLossStreaks(visibleTrades);
    const dd = journalMaxDrawdownR(visibleTrades);
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
      /** بلا خسارة قطّ لا سطر (0 · 0 ضجيج) */
      streak: streak && streak.longest > 0 ? streak : null,
      /** بلا تراجع قطّ لا سطر؛ الرقم بلا إشارة كنصّ «{r}R» */
      dd: dd && dd.max > 0 ? { max: formatRAbs(dd.max), now: formatRAbs(dd.current), n: dd.n } : null,
      /** مبلغٌ بالسنت الأمريكي بالسطر المعروض — `journalCentMoneyNote` يقول إن USC هي وحدة حساب السنت (100 = 1 USD) */
      usc: (whole ? [ranked[0]!] : shown).some((v) => v.cash?.ccy === 'USC'),
    };
  }, [visibleTrades, t]);

  /**
   * «المخاطرة (مفتوحة): 250.00 USD · 100,000 JPY» — مجموع ما بين الدخول والوقف للمفتوحة المعروضة (`openRiskTotals`):
   * أربع صفقات بـ1% هي 4% معرَّضة معاً. لا سطر إن كانت بينها صفقة بلا وقف أو بحجم مجهول (مجموعٌ جزئي يطمئن كذباً).
   */
  const openRiskLine = useMemo(() => {
    // مفتوحةٌ أقدم قد تقع خارج الصفحات المحمَّلة ⇒ لا مجموع (أسطر «بلا وقف»/«مجهول» تبقى: صادقةٌ عمّا حُمّل) — `journalOpenRiskComplete`
    // والخادم يرتّب المفتوحة أولاً (tools103b) ⇒ كاملٌ متى حُمّلت كل المفتوحة ولو لم يُحمَّل الدفتر كلّه
    const openLoaded = trades.reduce((n, tr) => n + (tr.status === 'open' ? 1 : 0), 0);
    const complete = journalOpenRiskComplete(trades.length, total, openLoaded, openTotal);
    const o = complete ? openRiskTotals(visibleTrades) : null;
    if (!o) {
      // السبب الأشيع لغياب المجموع: مفتوحة بلا وقف — يُقال بدل الصمت (حجمٌ مجهول وحده يبقى بلا سطر)
      const noStop = openTradesWithoutStop(visibleTrades);
      if (noStop > 0) return t.journalOpenRiskNoStop.replace('{n}', String(noStop));
      // launch151: مفتوحةٌ أقدم لم تُحمَّل ⇒ السطر يقول ذلك ويدلّ على «تحميل الأقدم» بدل الاختفاء. بعد «بلا وقف»: ذاك لا يُصلحه التحميل
      if (!complete && openLoaded > 0) return t.journalOpenRiskPartial;
      // حجمٌ مجهول أو أداةٌ بلا عقد (BTCUSD، US30) — كان السطر يختفي بلا سبب فيبدو أن لا مخاطرة مفتوحة
      const unknown = openTradesUnknownRisk(visibleTrades);
      if (unknown === 0) return null;
      return t.journalOpenRiskUnknown.replace('{n}', String(unknown));
    }
    return `${t.planRiskWord} ${t.journalOpenSuffix}: ${o.totals.map((c) => formatJournalMoney(c, t.journalMoneyUsc)).join(' · ')}`;
  }, [visibleTrades, trades, total, openTotal, t]);

  /**
   * «صفقات مفتوحة تراهن على USD بالاتجاه نفسه: 3 — خبرٌ واحد يضربها معاً» (`stackedCurrencyExposure`): EURUSD وGBPUSD
   * شراءً وUSDJPY بيعاً تبدو ثلاث صفقات مستقلّة وهي رهانٌ واحد ضد الدولار. على **كل** المفتوحة لا المفلترة: فلتر أداة
   * واحدة يُخفي بقية الرهان ولا يُلغيه.
   */
  const stackedLines = useMemo(
    () =>
      stackedCurrencyExposure(trades).map((x) =>
        t.journalExposureStacked.replace('{ccy}', x.ccy).replace('{n}', String(x.n))
      ),
    [trades, t]
  );

  /**
   * قبل الحفظ: الصفقة التي تُكتب تُضيف رهاناً بالاتجاه نفسه على عملةٍ تحملها مفتوحة (`draftStackedExposure`) — «بهذه الصفقة
   * يصير العدد 3 (المفتوحة الآن: 2)» (`journalExposureStackedDraft`)؛ لا تُسمّى المسودّة «مفتوحة». لا يظهر عند التعديل.
   */
  const draftStackedLines = useMemo(
    () =>
      editing
        ? []
        : draftStackedExposure(trades, { symbol, side }).map((x) => draftStackedExposureText(t.journalExposureStackedDraft, x)),
    [trades, symbol, side, editing, t]
  );

  /**
   * رموز الصفقات المفتوحة (كلها لا المفلترة، كسطر التراكم) لشريط «خبر قوي» فوق القائمة — الشريط كان لرمز النموذج وحده،
   * فمن يحمل EURUSD مفتوحة ولا يكتب صفقة لا يرى الرواتب الأمريكية بعد 20 دقيقة (`openPositionsNewsRisk`).
   */
  const openSymbols = useMemo(() => trades.filter((tr) => tr.status === 'open').map((tr) => tr.symbol), [trades]);

  /**
   * إحصاءات ما هو معروض. بلا فلتر: أرقام الخادم حرفياً كما كانت (لا تغيّر بتاتاً بالحالة الشائعة).
   * وبفلتر أداة: تُحسب محليّاً **بمعادلة الخادم نفسها** (`db.trade_stats`: المغلقة ذات `pnl` فقط،
   * نسبة النجاح بخانة عشرية والبقيّة بخانتين، والتعادل عدّاد مستقلّ). مطابقٌ للخادم ما دامت كل الصفقات بالصفحة؛
   * بعد backend-r1 الخادم يحسب على الكل والقائمة صفحة، فبفلترٍ ودفترٍ أكبر من الصفحة الرقم للصفحة (سطر «أحدث N» يقول ذلك).
   */
  const shownStats = useMemo<Stats | null>(() => {
    if (activeSym == null) return stats;
    return journalStats(visibleTrades);
  }, [activeSym, stats, visibleTrades]);
  /**
   * backend-r1: `stats` صارت على **كل** الصفقات والقائمة صفحةٌ (أحدث 200). بلا فلتر وعند الخادم أكثر ممّا وصل ⇒ أرقام
   * الخادم (العدد، النجاح، الأفضل/الأسوأ) على الكل، والأسطر المحسوبة من القائمة (الصافي بالـpip، متوسط R) على الصفحة —
   * نطاقان مختلفان تحت سطر «الإحصاءات على الكل» ⇒ تُخفى هذه حتى تُحمَّل الصفحات الأقدم. بفلتر أداة كل شيء من الصفحة
   * كما قبل، وسطر «أحدث 200 فقط» القديم يبقى صادقاً له.
   */
  const pageOnly = total != null && total > trades.length;
  const statsMixScopes = pageOnly && activeSym == null;
  const cappedNote =
    loading || (total == null ? trades.length < JOURNAL_PAGE : !pageOnly)
      ? null
      : statsMixScopes
        ? t.journalShownOfTotal.replace('{shown}', String(trades.length)).replace('{total}', String(total))
        : t.journalCappedNote.replace('{n}', String(trades.length));

  const resetForm = () => {
    setEntry('');
    setExit('');
    setSize('');
    setSizeFor('');
    setSl('');
    setTp('');
    setNote('');
  };

  // «التالي» بلوحة المفاتيح ينقل بين الخانات بترتيبها (رمز ⇒ دخول ⇒ خروج ⇒ حجم ⇒ وقف ⇒ هدف ⇒ ملاحظة) بدل إغلاقها
  // ثم لمس الخانة التالية — تسجيل صفقة لحظة الدخول أسرع. لوحة `decimal-pad` بـiOS بلا زرّ إدخال أصلاً (لا ضرر)
  const entryInRef = useRef<TextInput>(null);
  const exitInRef = useRef<TextInput>(null);
  const sizeInRef = useRef<TextInput>(null);
  const slInRef = useRef<TextInput>(null);
  const tpInRef = useRef<TextInput>(null);
  const noteInRef = useRef<TextInput>(null);
  /**
   * رمز النموذج وجهته قبل فتح التعديل — تُعادان بعد الحفظ أو الإلغاء. كانا يبقيان من الصفقة المعدَّلة: تعديل بيع
   * GBPJPY قديم والشارت على EURUSD ⇒ الصفقة التالية تبدأ «GBPJPY بيع»، ودخول EURUSD بلا وقف يُحفظ تحتها بإشارة
   * ربح معكوسة. زوج الشارت إن تبدّل أثناء التعديل (المؤثّر أعلاه لا يبدّل والخانة مملوءة) يغلب الرمز المحفوظ.
   */
  // والمسوّدة (دخول/خروج/حجم/وقف/هدف/ملاحظة) كذلك: صفقةٌ جديدة نصف مكتوبة ثم «تعديل» صفٍّ قديم لتصحيح خطأ ⇒ الحفظ أو
  // الإلغاء كان يُفرغ كل الخانات بلا تحذير فيعيد المتداول كتابتها لحظة الدخول. تُعاد فقط إن عاد رمزها — أسعار EURUSD لا
  // تُلصق تحت زوج شارتٍ تبدّل أثناء التعديل.
  type Draft = {
    entry: string;
    exit: string;
    size: string;
    sizeFor: string;
    sl: string;
    tp: string;
    note: string;
    liveFill: typeof liveFillRef.current;
  };
  const preEditRef = useRef<{ symbol: string; side: 'buy' | 'sell'; chart: string | undefined; draft: Draft } | null>(null);
  const restorePreEdit = () => {
    const pre = preEditRef.current;
    preEditRef.current = null;
    if (!pre) return;
    const chartMoved = !!defaultSymbol && defaultSymbol !== pre.chart;
    setSymbol(chartMoved ? defaultSymbol : pre.symbol);
    setSide(pre.side);
    if (chartMoved && defaultSymbol !== pre.symbol) return;
    const d = pre.draft;
    setEntry(d.entry);
    setExit(d.exit);
    setSize(d.size);
    setSizeFor(d.sizeFor);
    setSl(d.sl);
    setTp(d.tp);
    setNote(d.note);
    liveFillRef.current = d.liveFill;
  };

  const startEdit = (tr: Trade) => {
    // تعديلٌ فوق تعديل: يبقى ما قبل الأوّل
    if (!editing) {
      preEditRef.current = {
        symbol,
        side,
        chart: defaultSymbol,
        draft: { entry, exit, size, sizeFor, sl, tp, note, liveFill: liveFillRef.current },
      };
    }
    setEditing(tr);
    setSymbol(tr.symbol);
    setSide(tr.side === 'sell' ? 'sell' : 'buy');
    liveFillRef.current = null;
    // String لا formatPrice: لا تقريب يغيّر السعر المسجَّل بمجرد فتح التعديل — وبلا صيغة أُسّية (`plainStopText`):
    // `String(1.2e-9)` = «1.2e-9» لا يقرؤه `parseDecimal` ⇒ صفقة PEPE/BABYDOGE لا يُحفظ تعديلها أبداً («دخول غير صالح»)
    setEntry(plainStopText(tr.entry));
    setExit(tr.exit != null ? plainStopText(tr.exit) : '');
    // 1 هو افتراضُ الباك-إند لصفقة سُجِّلت بلا حجم — لا يُملأ بالخانة كأنه رقم كتبه المتداول
    // (إلا 1.00 مسجَّلة من الحاسبة — ملاحظتها تشهد بها، راجع `knownLots`)
    const kl = knownLots(tr.size, tr.note);
    setSize(kl != null ? String(kl) : '');
    setSizeFor(tr.symbol);
    setSl(tr.sl != null ? plainStopText(tr.sl) : '');
    setTp(tr.tp != null ? plainStopText(tr.tp) : '');
    setNote(tr.note || '');
    setFormError(null);
    playSoftClick();
  };

  const cancelEdit = () => {
    setEditing(null);
    resetForm();
    restorePreEdit();
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
          : misplacedArabicThousandsSign(size, { unit: 'lot' })
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
    // 1 مكتوبة باليد تُعلَّم بالملاحظة وإلا عُدّت افتراض الخادم (`noteWithTypedSize`)؛ ووقفٌ مفتوحٌ يُشدّ يحفظ
    // وقفه الأصلي «1R @ …» فلا يتضخّم الـR بعد تحريكه (`noteWithInitialStop`)
    const typedNote = noteWithTypedSize(num(size), note);
    const savedNote = editing
      ? noteWithInitialStop({ symbol: sym, note: typedNote, before: editing, after: { side, entry: e, sl: s }, typoFix: stopTypoFix })
      : typedNote;
    // ضغطة حفظ ثانية على القيم نفسها = «السعر كما كتبته»: الفضة هبطت ~30% بيوم (يناير 2026) فهدف بيعٍ من 110 عند «85»
    // سعرٌ حقيقي لا 85 pip، ولا تمييز بالأرقام وحدها — المنع بلا مخرج كان يُجبر على كسرٍ وهمي أو السعر الخاطئ المقترح.
    if (entrySlip) {
      setFormError(entrySlip.msg);
      return;
    }
    if (pipsLevel?.slip) {
      setFormError(pipsLevel.fixes[0].msg);
      return;
    }
    const pipsKey = pipsLevel ? `${pipsLevel.kind}\u0001${formKeyRef.current}` : null;
    if (pipsLevel && pipsOverrideRef.current !== pipsKey) {
      pipsOverrideRef.current = pipsKey;
      // launch123: السطر القابل للنقر أعلاه يحمل الاقتراح، فهنا «لم تُحفظ» + المخرج فقط (كانت الجملة نفسها تتكرّر تحت الزرّ
      // بلا نقرة). الزرّ باسمه الظاهر.
      const button = editing ? t.journalSaveEditBtn : t.journalAddBtn;
      setFormError(
        (pipsLevel.points ? t.levelLooksLikePointsSaveBlocked : t.levelLooksLikePipsSaveBlocked).replace(/\{(field|value|button)\}/g, (_, k: string) =>
          k === 'button' ? button : k === 'field' ? pipsLevel.label : pipsLevel.raw
        )
      );
      return;
    }
    const issue = trailedIssue(sym, e, s, p, savedNote);
    if (issue) {
      setFormError(planIssueText(issue));
      return;
    }
    setBusy(true);
    setFormError(null);
    const submittedKey = formKeyRef.current;
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
          // خانة حجم معروف مُسحت = null «غير معروف» (backend-r17 (b)) كما يُمسح الوقف والهدف؛ فُتحت فارغة ⇒ بلا تغيير (`editSizeValue`)
          size: editSizeValue(editing, num(size)),
          note: savedNote,
        });
        if (!mountedRef.current) return;
        playSoftClick();
        setEditing(null);
        resetForm();
        restorePreEdit();
        await refresh();
      } catch (err) {
        if (!mountedRef.current) return;
        // 409 من PATCH = `trade_changed_concurrently` وحده (backend run 13، `main.py` `trades_update`): أُغلقت/فُتحت الصفقة بجهاز
        // آخر أثناء التعديل. كان «تعذّر الحفظ» العامّ فيعيد المتداول المحاولة على صفٍّ لا يراه — الآن القائمة تُحدَّث والسبب يُقال
        // (QA57). النموذج يبقى مفتوحاً: يراجع الحالة الجديدة ثم يحفظ إن لزم
        if (isAlreadyClosedError(err)) {
          setFormError(t.journalEditConflict);
          await refresh();
        } else {
          setFormError(t.journalEditError);
        }
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
        note: savedNote,
      });
      // الإضافة كالتعديل أعلاه: اللوحة قد تُغلق أثناء الطلب (تبديل التبويب) — لا تحديث حالة بعد الفكّ
      if (!mountedRef.current) return;
      playSoftClick();
      // تغيّر النموذج أثناء الطلب = المتداول بدأ الصفقة التالية — تُحفظ كتابته لا تُمسح
      if (formKeyRef.current === submittedKey) resetForm();
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
      notify(t.journalCloseFailedTitle, unreadablePx(exit, tr.symbol) ? pxErrorText(exit, tr.symbol) : t.journalCloseNeedsExit);
      return;
    }
    // تأكيدٌ بالنتيجة كالإغلاق بالسوق: الخانة واحدة للنموذج كلّه، فسعرٌ كُتب لصفقة ذهب (2651.30) ثم نُقر رابط
    // صفقة EURUSD كان يُحفظ فوراً «+26,502,150 pip · +244,259%» ويُفسد نسبة النجاح وأفضل صفقة ومتوسط الربح للأبد
    confirmClose(tr, x, 'field', exit);
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
      // سعرٌ مخزّن قديم كان يُغلق الصفقة بنتيجةٍ من ربع ساعة مضت؛ السوق المغلق = آخر سعر قبل الإغلاق، يصلح
      if (isRealQuote(q) && liveEntryQuoteState(q, Date.now()) !== 'stale') {
        px = executionPrice(q, tr.side === 'sell' ? 'sell' : 'buy', 'close');
      }
    } catch {
      px = null;
    } finally {
      if (mountedRef.current) setBusy(false);
    }
    if (!mountedRef.current) return;
    if (px == null) {
      notify(t.journalCloseFailedTitle, t.journalCloseMarketNoQuote);
      return;
    }
    confirmClose(tr, px, 'market');
  };

  /**
   * تأكيد الإغلاق بسعر الخروج والنتيجة (نقاط · مال · نسبة · R) قبل الحفظ — للإغلاق بالسوق وبسعر خانة الخروج.
   * `field`: العنوان سؤال «إغلاق بسعر خانة الخروج؟» (لا اسم الزرّ) والنصّ بلا سطر «السعر من مزوّد البيانات» (لا يخصّه).
   */
  const confirmClose = (tr: Trade, exitPx: number, source: 'market' | 'field', fieldText?: string) => {
    const trSide = tr.side === 'sell' ? 'sell' : 'buy';
    const mv = realizedMove({ symbol: tr.symbol, side: trSide, entry: tr.entry, exit: exitPx });
    const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '');
    /**
     * والنتيجة بالـR حين للصفقة وقفٌ مسجَّل — الرقم الذي يقرّر به المتداول «هل أغلق الآن؟» (+0.4R
     * إغلاقٌ مبكر، −0.9R قريبٌ من وقفه)، وسطر الصفقة يعرضه أصلاً فكان التأكيد وحده يُسقطه. المسطرة
     * نفسها (`realizedR` على سعر الخروج نفسه)، فما يؤكّده هو ما يظهر بالسطر بعد الحفظ حرفياً.
     */
    const rText = formatR(realizedR({ symbol: tr.symbol, side: trSide, entry: tr.entry, sl: tr.sl, exit: exitPx, note: tr.note }));
    /**
     * **والمال** بعملة التسعير كما يكتبه سطر الصفقة بعد الحفظ («+25 pip · +125.00 USD · +0.23%»): التأكيد
     * كان يُسقطه فيقرّر المتداول «أغلق الآن؟» على نقاطٍ ونسبة حركة سعر، ثم يظهر المبلغ بعد الإغلاق لا
     * قبله. نفس الشرط (حجمٌ معروف — `knownLots`) ونفس الدالّة، فالرقمان حرفياً واحد.
     */
    const closeLots = knownLots(tr.size, tr.note);
    const cash =
      mv && closeLots != null
        ? journalPnl({ symbol: tr.symbol, side: trSide, entry: tr.entry, exit: exitPx, lots: closeLots })
        : null;
    const cashText = cash ? `${formatJournalMoney(cash, t.journalMoneyUsc, true)} · ` : '';
    const result = mv
      ? `${mv.pips != null ? `${formatSignedPips(mv.pips)} ${pipUnit(lang)} · ` : ''}${cashText}${sign(mv.pct)}${Math.abs(mv.pct).toFixed(2)}%${rText ? ` · ${rText}` : ''}`
      : '';
    const body = source === 'market' ? t.journalCloseMarketConfirmBody : t.journalCloseMarketConfirmBody.split('\n\n')[0];
    // `confirmDestructive` لا `Alert.alert`: الأخيرة دالّة فارغة بـreact-native-web ⇒ «أغلق بالسوق»/«أغلق» كانا
    // لا يفعلان شيئاً على الويب (لا تأكيد ولا إغلاق)
    confirmDestructive({
      title: source === 'market' ? t.journalCloseMarketConfirmTitle : t.journalCloseFieldConfirmTitle,
      body: body
        .replace('{side}', trSide === 'sell' ? t.dirSell : t.dirBuy)
        .replace('{symbol}', tr.symbol)
        .replace('{entry}', formatPrice(tr.entry, tr.symbol))
        .replace('{exit}', formatPrice(exitPx, tr.symbol))
        .replace('{result}', result),
      cancelText: t.cancel,
      confirmText: t.journalCloseMarketConfirmBtn,
      onConfirm: () => {
        void (async () => {
          setBusy(true);
          try {
            // أُغلقت بجهاز آخر بعد تحميل القائمة: لا يُكتب خروجٌ فوق خروجها — القائمة المحدَّثة تُظهرها مغلقة بسعرها
            const fresh = await api.trades().then((r) => r.trades as Trade[], () => null);
            if (!mountedRef.current) return;
            if (closedElsewhere(fresh, tr.id)) {
              await refresh();
              // بلا رسالة كان «إغلاق» يبدو كأنه لم يفعل شيئاً — يُقال للمتداول لماذا لم يُسجَّل خروجه (launch67)
              if (mountedRef.current) notify(t.journalClosedElsewhereTitle, t.journalClosedElsewhereBody);
              return;
            }
            try {
              await api.closeTrade(tr.id, exitPx);
            } catch (e) {
              // الفحص أعلاه يقرأ صفحة الدفتر الأولى وحدها، وجهازان قد يُغلقان بالثانية نفسها: الخادم يرفض الخروج الثاني
              // (409) ويُبقي الأول ⇒ نفس معاملة «أُغلقت من قبل» لا «فشل الإغلاق، حاول ثانية» (إعادة المحاولة 409 دائماً)
              if (!isAlreadyClosedError(e)) throw e;
              if (!mountedRef.current) return;
              await refresh();
              if (!mountedRef.current) return;
              if (isChangedConcurrentlyError(e)) notify(t.journalCloseConflictTitle, t.journalCloseConflictBody);
              else notify(t.journalClosedElsewhereTitle, t.journalClosedElsewhereBody);
              return;
            }
            if (!mountedRef.current) return;
            // خانة الخروج تُفرَغ بعد إغلاقٍ منها (إن لم تُكتب بعد النقرة): كانت تبقى «1.0900» فتُحفظ الصفقة الجديدة
            // التالية **مغلقة** فوراً بذلك السعر — ربحٌ لم يقع بنسبة الفوز ومتوسط R. الإضافة والتعديل يُفرغانها أصلاً.
            if (source === 'field') setExit((cur) => (cur === fieldText ? '' : cur));
            playSoftClick();
            await refresh();
          } catch {
            if (mountedRef.current) notify(t.journalCloseFailedTitle, t.journalCloseFailedBody);
          } finally {
            if (mountedRef.current) setBusy(false);
          }
        })();
      },
    });
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
      notify(t.alertsDeleteFailedTitle, t.journalDeleteFailedBody);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const confirmRemove = (tr: Trade) =>
    confirmDestructive({
      title: t.journalDeleteConfirmTitle,
      body: `${tr.side === 'sell' ? t.dirSell : t.dirBuy} ${tr.symbol} · ${formatPrice(tr.entry, tr.symbol)}`,
      cancelText: t.cancel,
      confirmText: t.deleteWord,
      onConfirm: () => void removeTrade(tr.id),
    });

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
            {/* 1 بصفوفٍ قديمة هو افتراض الباك-إند لصفقة بلا حجم مسجَّل — لا يُميَّز عن حجم كتبه المتداول، فلا يُعرض
                كأنه رقمه. ما عداه حجم سجّله فعلاً (يدوياً أو عبر «سجّل الخطة» من الحاسبة)، و1.00 من «سجّل الخطة»
                تشهد بها ملاحظتها — راجع `knownLots`. و`null` (backend-r1) يقول صراحةً إنه لم يُكتب: لماذا لا مال بالسطر. */}
            {(() => {
              const kl = knownLots(tr.size, tr.note);
              if (kl != null) return ` · ${formatJournalLots(kl)} lot`;
              return tr.size === null ? ` · ${t.journalSizeUnknown}` : '';
            })()}{' '}
            · {formatPrice(tr.entry, tr.symbol)}
            {tr.exit != null ? ` → ${formatPrice(tr.exit, tr.symbol)}` : ` ${t.journalOpenSuffix}`}
          </Text>
          {/* الـR يُعرض ولو بلا SL/TP (مُسحا بعد شدّ الوقف، والعلامة «1R @ …» باقية): «متوسط R» كان يعدّ الصفقة
              ونافذة الإغلاق تقول «+2R» بينما صفّها بلا R — الرقم بالإحصاء بلا مصدر ظاهر */}
          {tr.sl != null || tr.tp != null || rowR(tr) ? (
            <Text style={[styles.tradeMeta, { textAlign: align }]}>
              {/* DESIGN-PRO §1: SL/TP وسمان لا اتجاه سعر — بلون السطر نفسه على كل صفّ، الأحمر/الأخضر للنتيجة وحدها */}
              {tr.sl != null ? `SL ${formatPrice(tr.sl, tr.symbol)}` : null}
              {tr.sl != null && tr.tp != null ? ' · ' : ''}
              {tr.tp != null ? `TP ${formatPrice(tr.tp, tr.symbol)}` : null}
              {(() => {
                if (tr.sl == null || tr.tp == null) return '';
                const trSide = tr.side === 'sell' ? 'sell' : 'buy';
                const plan = analyzePlan({
                  symbol: tr.symbol,
                  side: trSide,
                  entry: tr.entry,
                  // الوقف الأصلي «1R @ …» حين حُرِّك الوقف بعد الدخول — النسبة التي خُطِّطت (`planStop`)
                  sl: planStop({ symbol: tr.symbol, side: trSide, entry: tr.entry, sl: tr.sl, note: tr.note }) ?? tr.sl,
                  tp: tr.tp,
                });
                return plan.ok ? ` · R:R ${formatRR(plan.rr)}` : '';
              })()}
              {(() => {
                const r = rowR(tr);
                if (!r) return '';
                const lead = tr.sl != null || tr.tp != null ? ' · ' : '';
                return `${lead}${t.journalResultR.replace('{r}', r)}`;
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
              : floatingResult({ symbol: tr.symbol, side: trSide, entry: tr.entry, sl: tr.sl, current: live, note: tr.note });
            const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '');
            const pips = mv ? formatPips(mv.pips == null ? null : Math.abs(mv.pips)) : null;
            const rText = !closed && mv && 'r' in mv ? formatR(mv.r as number | null) : null;
            /**
             * **كم ربحتُ/خسرتُ بالمال** بعملة التسعير (`journalPnl`؛ USC لسنت الدولار): النسبة بالسطر نسبة حركة السعر
             * لا الحساب، فـ«+0.23%» على لوتين هي 500$ — والمتداول كان يضرب بنفسه. الحجم 1 بلا معنى
             * (يضعه الخادم حين لا يُرسل حجم — راجع خانة الحجم) فلا يُحسب منه مال، كسطر الحجم أعلاه.
             */
            const rowLots = knownLots(tr.size, tr.note);
            const px = closed ? tr.exit : live;
            const cash =
              mv && rowLots != null && px != null
                ? journalPnl({ symbol: tr.symbol, side: trSide, entry: tr.entry, exit: px, lots: rowLots })
                : null;
            const cashText = cash ? `${formatJournalMoney(cash, t.journalMoneyUsc, true)} · ` : '';
            const result = mv
              ? `${pips != null ? `${sign(mv.pips ?? 0)}${pips} ${pipUnit(lang)} · ` : ''}${cashText}${sign(mv.pct)}${Math.abs(
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
                  <Text style={{ color: mv && mv.dir < 0 ? colors.bear : mv && mv.dir > 0 ? colors.bull : colors.textDim, fontWeight: '500' }}>
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
            {/* DESIGN-PRO §5.2: الحذف يختفي حتى النيّة — يظهر فقط للصفّ المفتوح بـ«تعديل» (والتأكيد باقٍ). */}
            {editing?.id === tr.id ? (
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
            ) : null}
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

      {/* الرمز الذي يعلن شريطه خبره بالشاشة نفسها: بـ`flow` شريط النموذج (إلا عند التعديل — راجع أسفل)، وبالرصيف/اللوح
          شريط الشارت لرمزه (`defaultSymbol`) حين يكون ظاهراً (`chartBannerVisible`) — فلا تحذيران متطابقان ولا إعلانان
          لقارئ الشاشة (QA38) */}
      {openSymbols.length > 0 ? (
        <NewsRiskBanner
          openSymbols={openSymbols}
          shownSymbol={flow ? (editing ? undefined : symbol.trim()) : chartBannerVisible ? defaultSymbol : undefined}
        />
      ) : null}
      {openRiskLine ? <Text style={[styles.stat, { textAlign: align }]}>{openRiskLine}</Text> : null}
      {stackedLines.map((line) => (
        <Text key={line} style={[styles.planWarn, { textAlign: align }]}>
          {line}
        </Text>
      ))}
      {/* «لا صفقات مغلقة بعد» كذبٌ بجانب صفقة مغلقة ظاهرة: صفوف قديمة بدخول ≤0 (قبل رفض الخادم له) مغلقة بـ`pnl` null
          فلا تُعدّ بـ`journalStats` ⇒ `trade_count` 0 */}
      {shownStats &&
      shownStats.trade_count === 0 &&
      visibleTrades.length > 0 &&
      !visibleTrades.some((tr) => tr.status === 'closed') ? (
        <Text style={[styles.sub, { textAlign: align }]}>{t.journalStatsPending}</Text>
      ) : null}
      {shownStats && shownStats.trade_count > 0 ? (
        <View style={styles.stats}>
          <Text style={[styles.stat, { textAlign: align }]}>
            {t.journalStatClosed.replace('{n}', String(shownStats.trade_count))}
          </Text>
          <Text style={[styles.stat, { textAlign: align }]}>
            {journalWinRateLine(t.journalStatWinRate, shownStats)}
          </Text>
          {/* «+1.5%» والمال −1,058 USD: النسبة تجمع حركة السعر بلا حجم (`db.trade_stats`) — فتُسمّى بما هي
              («مجموع حركة السعر (بلا حجم الصفقة)») لا «إجمالي PnL» الذي يُقرأ ربح الحساب، وتُخفى حين يناقضها
              مالٌ معروف لكل صفقة */}
          {shownStats.breakeven_count > 0 ? (
            <Text style={[styles.stat, { textAlign: align }]}>
              {t.journalStatBreakeven.replace('{n}', String(shownStats.breakeven_count))}
            </Text>
          ) : null}
          {!statsMixScopes && pnlPctContradictsCash(visibleTrades, shownStats.total_pnl_pct) ? null : (
            <Text style={[styles.stat, { textAlign: align }]}>
              {t.journalStatPriceMoveSum.replace('{pct}', formatSignedPct(shownStats.total_pnl_pct))}
            </Text>
          )}
          {!statsMixScopes && extraStats.pips != null ? (
            <Text style={[styles.stat, { textAlign: align }]}>
              {t.journalStatNetPips.replace('{pips}', extraStats.pips)}
              {extraStats.cash ? ` · ${extraStats.cash}` : ''}
            </Text>
          ) : null}
          {!statsMixScopes && extraStats.pipsBySymbol != null ? (
            <Text style={[styles.stat, { textAlign: align }]}>
              {t.journalStatNetPipsBySymbol.replace('{parts}', extraStats.pipsBySymbol)}
            </Text>
          ) : null}
          {!statsMixScopes && extraStats.usc ? <Text style={[styles.stat, { textAlign: align }]}>{t.journalCentMoneyNote}</Text> : null}
          {!statsMixScopes && extraStats.avgR != null ? (
            <Text style={[styles.stat, { textAlign: align }]}>
              {t.journalStatAvgR.replace('{r}', extraStats.avgR).replace('{n}', String(extraStats.rN))}
            </Text>
          ) : null}
          {!statsMixScopes && extraStats.streak ? (
            <Text style={[styles.stat, { textAlign: align }]}>
              {t.journalStatLossStreak
                .replace('{max}', String(extraStats.streak.longest))
                .replace('{now}', String(extraStats.streak.current))}
            </Text>
          ) : null}
          {!statsMixScopes && extraStats.dd ? (
            <Text style={[styles.stat, { textAlign: align }]}>
              {t.journalStatMaxDrawdownR
                .replace('{r}', extraStats.dd.max)
                .replace('{now}', extraStats.dd.now)
                .replace('{n}', String(extraStats.dd.n))}
            </Text>
          ) : null}
          <Text style={[styles.stat, { textAlign: align }]}>
            {t.journalStatBestWorst
              .replace('{best}', formatSignedPct(shownStats.best))
              .replace('{worst}', formatSignedPct(shownStats.worst))}
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
            // «إلغاء» أثناء حفظ التعديل: الطلب يمضي، ثم يصل ردّه فيمسح (`resetForm`) صفقةً جديدة كُتبت بعد الإلغاء
            onPress={cancelEdit}
            disabled={busy}
            accessibilityState={{ disabled: busy }}
            accessibilityLabel={t.journalCancelEdit}
            hitSlop={8}
          >
            <Text style={[styles.closeLink, busy && styles.closeLinkDisabled, { textAlign: align }]}>
              {t.journalCancelEdit}
            </Text>
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
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => entryInRef.current?.focus()}
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
      {draftStackedLines.map((line) => (
        <Text key={line} style={[styles.planWarn, { textAlign: align }]} accessibilityLiveRegion="polite">
          {line}
        </Text>
      ))}
      <TextInput
        ref={entryInRef}
        style={[styles.input, { textAlign: align }]}
        value={entry}
        onChangeText={setEntry}
        placeholder={t.journalEntryPlaceholder}
        keyboardType="decimal-pad"
        maxLength={PRICE_MAX_LEN}
        placeholderTextColor={colors.textDim}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => exitInRef.current?.focus()}
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
          ref={exitInRef}
          style={[styles.input, styles.inputHalf, { textAlign: align }]}
          value={exit}
          onChangeText={setExit}
          placeholder={t.journalExitPlaceholder}
          keyboardType="decimal-pad"
          maxLength={PRICE_MAX_LEN}
          placeholderTextColor={colors.textDim}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => sizeInRef.current?.focus()}
          underlineColorAndroid="transparent"
          clearButtonMode="while-editing"
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          accessibilityLabel={t.journalExitA11y}
        />
        <TextInput
          ref={sizeInRef}
          style={[styles.input, styles.inputHalf, { textAlign: align }]}
          value={size}
          onChangeText={(v) => {
            setSize(v);
            setSizeFor(symbol);
            setFormError(null);
          }}
          placeholder={t.journalSizePlaceholder}
          keyboardType="decimal-pad"
          maxLength={10} // «0.10 lots» منسوخة (`parseJournalSize`)
          placeholderTextColor={colors.textDim}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => slInRef.current?.focus()}
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
                // وقفٌ نُقل للربح: «وقف الخسارة» خطأ للأذن كما الأحمر خطأ للعين — الجملة تقول «الوقف المنقول إلى الربح»
                accessibilityLabel={(x.kind === 'sl'
                  ? x.gain
                    ? t.journalExitAtProfitStopA11y
                    : t.journalExitAtSlA11y
                  : x.kind === 'be'
                    ? t.journalExitAtBeA11y
                    : t.journalExitAtTpA11y
                ).replace('{price}', x.text)}
              >
                <Text style={[styles.qChipText, on ? styles.chipTextOn : { color: x.kind === 'sl' ? (x.gain ? colors.bull : colors.bear) : x.kind === 'be' ? colors.textDim : colors.bull }]}>
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
            exitResult.dir < 0 ? { color: colors.bear } : exitResult.dir > 0 ? { color: colors.bull } : null,
          ]}
          accessibilityLiveRegion="polite"
        >
          {exitResult.text}
        </Text>
      ) : null}
      <View style={[styles.row, rtl && styles.rowRtl]}>
        <TextInput
          ref={slInRef}
          style={[styles.input, styles.inputHalf, { textAlign: align }]}
          value={sl}
          onChangeText={(v) => {
            setSl(v);
            setFormError(null);
          }}
          placeholder={t.journalSlPlaceholder}
          keyboardType="decimal-pad"
          maxLength={PRICE_MAX_LEN}
          placeholderTextColor={colors.textDim}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => tpInRef.current?.focus()}
          underlineColorAndroid="transparent"
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          accessibilityLabel={t.riskCalcStop}
          accessibilityHint={t.journalSlPlaceholder}
        />
        <TextInput
          ref={tpInRef}
          style={[styles.input, styles.inputHalf, { textAlign: align }]}
          value={tp}
          onChangeText={(v) => {
            setTp(v);
            setFormError(null);
          }}
          placeholder={t.journalTpPlaceholder}
          keyboardType="decimal-pad"
          maxLength={PRICE_MAX_LEN}
          placeholderTextColor={colors.textDim}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => noteInRef.current?.focus()}
          underlineColorAndroid="transparent"
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          accessibilityLabel={t.riskCalcTargetPlaceholder}
          accessibilityHint={t.journalTpPlaceholder}
        />
      </View>
      {slTargets.length > 0 ? (
        <View style={[styles.qChips, rtl && styles.rowRtl]}>
          {slTargets.map((x: { pips: number; atr: boolean; v: number; tol: number; text: string }) => {
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
                accessibilityLabel={`${t.journalSlAtPipsA11y.replace('{pips}', String(x.pips)).replace('{price}', x.text)}${
                  x.atr ? ` (${ATR_STOP_LABEL})` : ''
                }`}
              >
                {/* DESIGN-PRO §1: مسافة الوقف ليست اتجاه سعر — صفّ الشرائح محايد وقت السكون (كان كلّه أحمر) */}
                <Text style={[styles.qChipText, on && styles.chipTextOn]}>
                  {`${x.atr ? `${ATR_STOP_LABEL} ` : ''}−${x.pips} ${pipUnit(lang)}`}
                </Text>
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
      {entrySlip ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={entrySlip.msg}
          onPress={() => {
            playSoftClick();
            setEntry(entrySlip.text);
            setFormError(null);
          }}
          style={({ pressed }) => pressed && { opacity: buttons.pressedOpacity }}
        >
          <Text style={[styles.formError, { textAlign: align }]}>{entrySlip.msg}</Text>
        </Pressable>
      ) : pipsLevel ? (
        pipsLevel.fixes.map((f) => (
          <Pressable
            key={f.text}
            accessibilityRole="button"
            accessibilityLabel={f.msg}
            onPress={() => {
              playSoftClick();
              (pipsLevel.kind === 'sl' ? setSl : pipsLevel.kind === 'tp' ? setTp : setExit)(f.text);
              setFormError(null);
            }}
            style={({ pressed }) => pressed && { opacity: buttons.pressedOpacity }}
          >
            <Text style={[styles.formError, { textAlign: align }]}>{f.msg}</Text>
          </Pressable>
        ))
      ) : draft?.issue && draft.issue !== 'slTooClose' ? (
        <Text style={[styles.formError, { textAlign: align }]}>{planIssueText(draft.issue)}</Text>
      ) : draft?.plan?.ok ? (
        <>
          <Text style={[styles.planLine, { textAlign: align }]}>{planSummary(draft.plan)}</Text>
          {/* بـR:R بالمسافة نفسها التي يعرضها سطر الخطة أعلاه — راجع `breakevenWinRatePct` */}
          {breakevenWinRatePct(draft.plan.rr) != null ? (
            <Text style={[styles.planLine, { textAlign: align }]}>
              {t.planBreakevenWinRate.replace('{pct}', String(breakevenWinRatePct(draft.plan.rr)))}
            </Text>
          ) : null}
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
          {t.planRiskWord} {formatPips(draftRisk.pips) ?? '—'} {pipUnit(lang)}{draftRisk.money ? ` (${draftRisk.money})` : ''}
        </Text>
      ) : null}
      {draftRisk?.usc && !(draft?.issue && draft.issue !== 'slTooClose') ? (
        // المخاطرة بالسنت الأمريكي لحساب السنت: السطر يقول ما USC كي لا تُقرأ دولاراتٍ بمئة ضعف
        <Text style={[styles.planWarn, { textAlign: align }]}>{t.journalCentMoneyNote}</Text>
      ) : draftRisk && !draftRisk.money && miniAccountSymbol(symbol) && !(draft?.issue && draft.issue !== 'slTooClose') ? (
        // «EURUSD.mini»: المخاطرة بالنقاط بلا مبلغ — السطر يقول لماذا (لوت mini يختلف بين الوسطاء) بدل مبلغٍ غائب بلا تفسير (tools63)
        <Text style={[styles.planWarn, { textAlign: align }]}>{t.journalMiniNoMoney}</Text>
      ) : null}
      <TextInput
        ref={noteInRef}
        style={[styles.input, { textAlign: align }]}
        value={note}
        onChangeText={setNote}
        // الخادم يرفض >500 (422) فيقول «تحقق من الاتصال» — الحدّ بالخانة، والعدّاد تحتها يقول لماذا توقّفت الكتابة
        // لا أقصر من النصّ الموجود: حجمٌ 1 بعد ملاحظة ممتلئة لا يقصّ ما كُتب (Android يطبّق الحدّ على القيمة) — العدّاد أحمر عند 0
        maxLength={Math.max(noteRoom, note.length)}
        placeholder={t.journalNotePlaceholder}
        placeholderTextColor={colors.textDim}
        returnKeyType="done"
        underlineColorAndroid="transparent"
        clearButtonMode="while-editing"
        keyboardAppearance="dark"
        selectionColor={colors.accent}
        accessibilityLabel={t.journalNoteA11y}
      />
      {noteLeft != null ? (
        <Text
          style={[noteLeft === 0 ? styles.planWarn : styles.planLine, { textAlign: align }]}
          accessibilityLiveRegion="polite"
        >
          {/* «0 من 489» بلا سبب ظاهر يُربك — حين تُحجز أحرف لعلامتَي الحفظ يقول السطر كم ولماذا */}
          {(noteRoom < JOURNAL_NOTE_MAX ? t.noteCharsLeftReserved : t.noteCharsLeft)
            .replace('{n}', String(noteLeft))
            .replace('{max}', String(noteRoom))
            .replace('{reserved}', String(JOURNAL_NOTE_MAX - noteRoom))}
        </Text>
      ) : null}
      {stopTypoFixShown ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: stopTypoFix }}
          accessibilityLabel={stopTypoFixText}
          hitSlop={8}
          style={({ pressed }) => [
            styles.chip,
            stopTypoFix && styles.chipOn,
            { alignSelf: 'flex-start' },
            pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
          ]}
          onPress={() => {
            playSoftClick();
            setStopTypoFix((v: boolean) => !v);
          }}
        >
          <Text style={[styles.chipText, stopTypoFix && styles.chipTextOn]}>
            {stopTypoFix ? '✓ ' : ''}
            {stopTypoFixText}
          </Text>
        </Pressable>
      ) : null}
      {noteStop != null ? (
        <Text style={[styles.planLine, { textAlign: align }]}>
          {t.journalInitialStopNote.replace('{stop}', plainStopText(noteStop))}
        </Text>
      ) : null}
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

      {loading ? <ActivityIndicator color={colors.textMuted} /> : null}
      {!loading && trades.length === 0 ? (
        <Text style={[styles.empty, { textAlign: align }]}>
          {listError ? t.journalLoadErrorRetry : t.journalEmpty}
        </Text>
      ) : null}
      {!loading && listError ? (
        // launch140: فشل التحميل الأول كان يقول «غادر الدفتر وارجع» — `refresh()` يُستدعى عند التركيب فقط
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.chip,
            { alignSelf: rtl ? 'flex-end' : 'flex-start' },
            pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
          ]}
          onPress={() => {
            playSoftClick();
            setLoading(true);
            void refresh();
          }}
          accessibilityLabel={t.journalRetryBtn}
          hitSlop={8}
        >
          <Text style={styles.chipText}>{t.journalRetryBtn}</Text>
        </Pressable>
      ) : null}
      {cappedNote ? (
        // الخادم يُرجع صفحة (أحدث 200، `db.list_trades`) — الأقدم، ولو مفتوحة، لا تصل حتى «تحميل الأقدم»
        <Text style={[styles.planWarn, { textAlign: align }]}>{cappedNote}</Text>
      ) : null}
      {!loading && pageOnly ? (
        // خادمٌ أقدم بلا `total` لا يُعرض له الزرّ: يتجاهل `offset` فيعيد الصفحة الأولى نفسها
        <Pressable
          accessibilityRole="button"
          disabled={olderBusy}
          style={({ pressed }) => [
            styles.chip,
            { alignSelf: rtl ? 'flex-end' : 'flex-start' },
            pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
          ]}
          onPress={() => {
            playSoftClick();
            void loadOlder();
          }}
          accessibilityLabel={olderBusy ? t.a11yBusy : t.journalLoadOlder}
          accessibilityState={{ busy: olderBusy }}
          hitSlop={8}
        >
          <Text style={styles.chipText}>{olderBusy ? '...' : t.journalLoadOlder}</Text>
        </Pressable>
      ) : null}
      {olderError ? (
        <Text style={[styles.formError, { textAlign: align }]}>{t.journalLoadOlderError}</Text>
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
  title: { color: colors.text, fontWeight: '500', fontSize: 16, textAlign: 'right' },
  sub: { color: colors.textDim, fontSize: 11, textAlign: 'right' },
  // DESIGN-PRO §5.5 فاصل واحد (حدّ بلا تعبئة مرتفعة) و§2 الوزن 600 للأسعار وحدها — الإحصاءات 500
  stats: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 4,
  },
  stat: { ...numeric, color: colors.text, textAlign: 'right', fontWeight: '500', fontSize: 12 },
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
  // DESIGN-PRO §1/§4: الاختيار تعبئة محايدة ونصّ أساسي — التأكيد الوحيد بالنموذج زرّ الحفظ.
  chipOn: { backgroundColor: colors.selectedFill },
  chipText: { ...numeric, color: colors.textMuted, fontWeight: '500' },
  chipTextOn: { color: colors.text },
  qChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  qChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qChipText: { ...numeric, color: colors.textMuted, fontWeight: '500', fontSize: 12 },
  input: {
    ...numeric,
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 12,
    textAlign: 'right',
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  btnText: { color: colors.onAccent, fontWeight: '500' },
  btnDisabled: { opacity: 0.4 },
  formError: {
    ...numeric,
    // DESIGN-PRO §1: أحمر/أخضر لاتجاه السعر وحده — خطأ الخانة و«هل تقصد …؟» بلون التحذير، كسطر الحاسبة نفسه (`PositionSizePanel` `warn`)
    color: colors.warn,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  empty: { color: colors.textDim, textAlign: 'right', marginTop: spacing.sm, fontSize: 12 },
  trade: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    gap: 4,
  },
  tradeMain: { ...numeric, color: colors.text, textAlign: 'right', fontWeight: '500', fontSize: 12 },
  tradeMeta: { ...numeric, color: colors.textDim, textAlign: 'right', fontSize: 11 },
  inputHalf: { flex: 1 },
  planLine: { ...numeric, color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  planWarn: { ...numeric, color: colors.warn, fontSize: 11, fontWeight: '500' },
  closeLink: { color: colors.text, textAlign: 'right', fontSize: 11, fontWeight: '500' },
  closeLinkDisabled: { opacity: 0.4 },
  tradeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  // الأحمر للاتجاه وحده (§1) — الحذف محايد ويحميه ظهوره بعد «تعديل» ثم التأكيد.
  delLink: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  editBanner: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    gap: 4,
  },
  editBannerText: { ...numeric, color: colors.text, fontSize: 11, fontWeight: '500' },
});
