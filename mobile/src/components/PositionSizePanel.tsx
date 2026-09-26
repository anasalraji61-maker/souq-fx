import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radii, spacing, buttons, numeric } from '../theme';
import { api, type Candle } from '../api';
import { useI18n } from '../i18n/I18nContext';
import {
  ACCOUNT_CCYS,
  type AccountCcy,
  type InstrumentSpec,
  instrumentSpec,
  conversionPair,
  convStaleMinutes,
  convQuoteNotice,
  combinedMarketOpen,
  quoteMarketOpen,
  miniAccountSymbol,
  costsForRisk,
  quoteAsOfMs,
  marginQuoteUsable,
  reversedConversion,
  fetchedConvPriceLooksWrong,
  usdBridge,
  bridgedRate,
  quoteToAccountRate,
  slPipsCarryOver,
  typedExitQuoteToAccount,
  pipValuePerLot,
  positionSize,
  slPipsFromPrices,
  parseSlPips,
  ambiguousSlPips,
  formatPipValue,
  riskForLots,
  formatRiskPct,
  parseRiskInput,
  parseBalance,
  toggleRiskUnit,
  formatMoney,
  profitAtTarget,
  moneyRewardRisk,
  parseLeverage,
  leverageOutOfRange,
  leverageAmbiguousThousands,
  savedRiskMoney,
  restoreGroups,
  type CalcTouchKey,
  balanceOnAccountSwitch,
  savedAccountBalances,
  type AccountBalances,
  riskOverBalance,
  MAX_LEVERAGE,
  requiredMargin,
  marginBaseToAccount,
  exitQuoteToAccount,
  targetQuoteToAccount,
  pipsOnlyExitQuoteToAccount,
  pipsOnlyExitPrice,
  maxLotsForMargin,
  marginPrice,
  smallContractSpec,
  centQuoteToAccount,
  smallLotsStdEquiv,
  smallContractSuffix,
  withSmallSuffix,
  CENTS_PER_USD,
  stopPipsMismatch,
  parseSpreadPips,
  parseCommission,
  moneyInOtherCurrency,
  slPipsInPoints,
  slPipsLooksLikePrice,
  commissionAcrossModes,
  commissionKindOf,
  commissionNoteExample,
  commissionPlaceholder,
  conversionKey,
  SYMBOL_INPUT_MAX_LEN,
  type CommissionMode,
  spreadRisk,
  spreadBeyondLiveEntry,
  costsLotsAdvice,
  profitAfterCosts,
  lowRewardWarning,
  lotsOverOrderMax,
  riskIsHigh,
  breakevenRR,
  lossStreakDrawdownPct,
  lossRiskPct,
  parseLostToday,
  scaleOutHalfAtOneR,
  dailyLossRoom,
  dailyRoomMaxLots,
  lostDayForSave,
  tradingDayKey,
  restoredLostToday,
  lostTodayInCcy,
  lostTodayOtherCcy,
  restoredLostCcy,
  spreadTooWide,
  spreadMaybePrice,
  stopInsideSpread,
  stopInsideTypicalSpread,
  misplacedArabicThousandsSignInRisk,
  planJournalNote,
  LOT_STEP,
  LOT_UNIT,
  formatLots,
  parsePriceFor,
  ambiguousThousandsPrice,
  liveEntryFillAllowed,
  liveEntryQuoteState,
  serverClockOffsetMs,
  restoredSmallSymbol,
  manualConvLooksInverted,
  manualConvDecimalSlip,
  priceDecimalSlip,
  manualConvForPair,
  typicalSlPipsExample,
  typicalSpreadPipsExample,
  fillExampleOrDrop,
} from '../positionSize';
import { misplacedArabicThousandsSign, parseDecimal } from '../parseDecimal';
import { isRealQuote, isSyntheticProvenance, serverNowSec } from '../chart/dataSource';
import { cachedChartSeries, rememberChartSeries } from '../hooks/chartSeriesCache';
import { pipUnit } from '../chart/measureReadout';
import { formatPrice } from '../chart/math';
import { playSoftClick } from '../audio/playSoftClick';
import {
  analyzePlan,
  formatPips,
  formatRR,
  breakevenWinRatePct,
  liveEntryForStop,
  liveEntryQuote,
  liveStopChip,
  QUICK_RR,
  stopsForPips,
  targetAtRR,
  journalSymbol,
  levelLooksLikePips,
  levelLooksLikePipsText,
  entryLooksLikeDecimalSlip,
  entryDecimalSlipText,
  levelLooksLikeDecimalSlip,
  type TradeSide,
  QUICK_SYMBOLS,
  calcMinStopPips,
  stopTooClose,
  atrStopPips,
  atrStopRefreshDelayMs,
  atrSeriesIsCurrent,
  ATR_STOP_TF,
  journalSpec,
  journalUnknownSuffixPair,
  saveOverrideAccepted,
  formatJournalLots,
} from '../tradePlan';
import { NewsRiskBanner } from './NewsRiskBanner';

type Props = {
  defaultSymbol?: string;
  /**
   * الشاشة الحاضنة ظاهرة (`screenFocused` بشاشة الأدوات). الشاشات تبقى مُركَّبة خلف تبويبٍ آخر، فكان تحديث سعر
   * التحويل وسعر السوق كل 60 ث يجري بقيّة الجلسة لحاسبةٍ لا تُرى. `false` يوقفهما؛ العودة تجدّدهما فوراً (صامتاً).
   */
  active?: boolean;
};

const QUICK_RISK = ['0.5', '1', '2'];
/** سلسلة الخسائر بسطر المخاطرة: 5 عادية لنظام نجاحه 50% (والنصّ العربي «{n} خسائر» صحيح لـ3–10 فقط) */
const LOSS_STREAK_N = 5;
const STORE_KEY = 'matrix.tools.riskCalc.v1';
/** فرق ساعتَي الخادم والجهاز لأعمار الأسعار (`as_of` بساعة الخادم) — `quoteAsOfMs`. */
const clockOffsetMs = () => {
  const now = Date.now();
  return serverClockOffsetMs(serverNowSec(now), now);
};

/** حاسبة حجم المركز: رصيد × نسبة مخاطرة ÷ (وقف بالنقاط × قيمة النقطة) — مع قيمة نقطة صحيحة لأزواج
 * الين والتقاطعات والذهب عبر سعر تحويل حيّ لعملة الحساب. الرياضيات كلها بـ`positionSize.ts`. */
export function PositionSizePanel({ defaultSymbol = 'EURUSD', active = true }: Props) {
  const { t, rtl, lang } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  // رمز الشارت الحالي قد لا يكون زوجاً قابلاً للحساب (DXY مثلاً) — نبدأ بـEURUSD حينها
  const [symbol, setSymbol] = useState(() => (instrumentSpec(defaultSymbol) ? defaultSymbol : 'EURUSD'));
  /** الرمز لحظة البناء — الوضع المحفوظ يُطبَّق عليه وحده (`restoredSmallSymbol`) */
  const initialSymbolRef = useRef(symbol);
  /** الرمز الآن — لقراءة التخزين غير المتزامنة (`commissionKindOf` للرمز المستعاد) */
  const symbolRef = useRef(symbol);
  symbolRef.current = symbol;
  const [account, setAccount] = useState<AccountCcy>('USD');
  const [balance, setBalance] = useState('');
  /**
   * رصيد **حساب السنت** بالـUSC — خانة منفصلة ومحفوظة وحدها: رصيدٌ واحد للنوعين كان سيقرأ «100000» (سنت = 1,000 USD)
   * رصيداً بالدولار عند العودة إلى «EURUSD» ⇒ لوتٌ بمئة ضعف. راجع `smallContractSpec`.
   */
  const [centBalance, setCentBalance] = useState('');
  /**
   * رصيد كل عملة حساب **غير ظاهرة** — تبديل الشريحة يحفظ الرصيد باسم عملته ويُظهر رصيد الجديدة (`balanceOnAccountSwitch`).
   * كانت الخانة تُبقي «1500000» (ين) فتُقرأ دولاراً ⇒ لوتٌ بـ150 ضعفاً.
   */
  const [otherBalances, setOtherBalances] = useState<AccountBalances>({});
  /**
   * آخر لاحقة سنت/micro استعملها («c»، «.c»، «micro») — محفوظة: شريحةٌ واحدة «EURUSDc» بجانب الأزواج بدل كتابة الرمز كل
   * جلسة، وشرائح الأزواج وشريط رموز الأدوات تبقى بوضعه ما دام فيه. راجع `smallContractSuffix`.
   */
  const [smallSuffix, setSmallSuffix] = useState('');
  const [riskPct, setRiskPct] = useState('1');
  /** رافعة الحساب — ثابتة للمتداول كرصيده، فتُحفظ معه. فارغة = لا سطر هامش */
  const [leverage, setLeverage] = useState('');
  /** حدّ الخسارة اليومي % وخسارة اليوم (مطويّتان حتى تُفتحا أو يُحفظ حدّ) — راجع `dailyLossRoom` */
  const [dailyLimit, setDailyLimit] = useState('');
  const [lostToday, setLostToday] = useState('');
  /** عملة المال التي كُتبت بها خسارة اليوم — راجع `lostTodayInCcy` (null = حفظٌ أقدم بلا عملة) */
  const [lostCcy, setLostCcy] = useState<string | null>(null);
  /** يوم التداول الذي كُتبت فيه خسارة اليوم (`tradingDayKey`) — يُحفظ معها بدل يوم الحفظ، وتغيّره يفرغها (`lostDayForSave`) */
  const lostEnteredDayRef = useRef<string | null>(null);
  /** يتغيّر كل دقيقة ما دامت خسارة اليوم مكتوبة ⇒ إغلاق نيويورك 17:00 يفرغها واللوحة مفتوحة */
  const [dayTick, setDayTick] = useState(0);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [slPips, setSlPips] = useState('');
  /** سبريد الأداة بالنقاط (اختياري) — يخصّ الأداة لا الحساب، فلا يُحفظ ويُمسح بتبديلها */
  const [spread, setSpread] = useState('');
  /**
   * عمولة الحساب لكل لوت فتحاً وإغلاقاً، **بعملة الحساب** (اختيارية — Raw/ECN). تخصّ الحساب لا الأداة
   * كالرافعة، فتُحفظ معه؛ وتُمسح حين يبدّل المتداول عملة الحساب بيده (7 USD ليست 7 JPY).
   */
  const [commission, setCommission] = useState('');
  /**
   * الوضع الذي كُتبت له العمولة (آخر رمزٍ معروف): «لكل لوت» تعني لوتاً عادياً أو سنتاً أو micro — تُحوَّل بتبدّله
   * (`commissionAcrossModes`) وتُحفظ معه. الرمز الأوّل دائماً عادي (`useState` أعلاه).
   */
  const commissionModeRef = useRef<CommissionMode>({ kind: 'std', account: 'USD' });
  /** بديل اختياري: سعرا الدخول والوقف كما يراهما المتداول على الشارت → تُملأ خانة النقاط تلقائياً */
  const [entryPx, setEntryPx] = useState('');
  const [stopPx, setStopPx] = useState('');
  /** آخر تعبئة لـ«السعر الحالي» ولقطتها (Bid/Ask) — راجع `liveEntryForStop`/`liveStopChip` */
  const liveFillRef = useRef<{ symbol: string; text: string; q: { price: number; bid?: number | null; ask?: number | null } } | null>(
    null
  );
  /** هدف اختياري: يحوّل «كم لوت» إلى خطة كاملة (مخاطرة/عائد بالمال) — المتداول يقرّر بالـR:R لا باللوت وحده */
  const [targetPx, setTargetPx] = useState('');
  /** جلب سعر الدخول بنقرة: المتداول يخطّط غالباً حول السعر الذي يراه الآن، وكتابته يدوياً مَظنّة خطأ */
  const [livePxBusy, setLivePxBusy] = useState(false);
  const [livePxMsg, setLivePxMsg] = useState<{ ok: boolean; text: string } | null>(null);
  /**
   * سعر التحويل **محسوباً** (كم وحدة من عملة الحساب لكل وحدة من عملة التسعير)؛ null أثناء التحميل
   * أو عند الفشل. يُخزَّن مع `key` = زوج التحويل المتوقَّع، فلا يُقرن سعر الأداة السابقة بالأداة
   * الجديدة لإطار عرض واحد بعد تبديل الأداة/عملة الحساب.
   *
   * يُخزَّن **السعر المحسوب** لا (الزوج + `invert` + سعره الخام) لأن المصدر صار ثلاثة لا واحداً:
   * الزوج المتوقَّع، أو معكوسه، أو **ساقا جسر الدولار** معاً — وللأخير لا «زوج واحد وسعره» أصلاً.
   */
  const [convQuote, setConvQuote] = useState<{ key: string; rate: number; at: number; marketOpen: boolean | null } | null>(null);
  const [convLoading, setConvLoading] = useState(false);
  const [convFailed, setConvFailed] = useState(false);
  /** إدخال يدوي لسعر التحويل عند تعذّر جلبه — لا تتوقف الحاسبة بسبب انقطاع مزوّد الأسعار */
  // مع زوجه (`conversionKey`) — راجع `manualConvForPair`؛ `manualConv`/`setManualConv` بعد `convKey` أدناه
  const [manualConvTyped, setManualConvTyped] = useState<{ key: string | null; text: string }>({ key: null, text: '' });
  const gen = useRef(0);
  /** خانة النقاط مملوءة من سعرَي الدخول/الوقف (لا يدوياً) — فتُمسح إن لم يعد السعران صالحين */
  const slFromPrices = useRef(false);
  const mountedRef = useRef(true);
  const loadedRef = useRef(false);
  /** ما كتبه المتداول بيده — قراءة التخزين المتأخّرة لا تكتب فوقه (`restoreGroups`) */
  const touchedRef = useRef(new Set<CalcTouchKey>());
  const touch = (k: CalcTouchKey) => touchedRef.current.add(k);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // تذكّر الرصيد/المخاطرة/عملة الحساب بين الجلسات — نفس نمط AsyncStorage + try/catch بالتطبيق
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORE_KEY);
        if (raw && mountedRef.current) {
          const p = JSON.parse(raw) as {
            balance?: string;
            centBalance?: string;
            balances?: unknown;
            smallSuffix?: string;
            smallActive?: boolean;
            riskPct?: string;
            riskCcy?: string;
            account?: string;
            leverage?: string;
            commission?: string;
            commissionMode?: CommissionMode;
            dailyLimit?: string;
            lostToday?: string;
            lostDay?: string;
            lostCcy?: string;
          };
          // بدء بارد بطيء: ما كتبه المتداول قبل وصول القراءة يبقى — راجع `restoreGroups`
          const g = restoreGroups(touchedRef.current, p.riskPct);
          if (g.dailyLimit && typeof p.dailyLimit === 'string' && p.dailyLimit.trim() !== '') {
            setDailyLimit(p.dailyLimit);
            setDailyOpen(true);
          }
          // خسارة الأمس لا تُقرأ اليوم — راجع `restoredLostToday`
          if (g.lostToday) {
            const restoredLost = restoredLostToday(p, new Date());
            setLostToday(restoredLost);
            setLostCcy(restoredLostCcy(p, new Date()));
            lostEnteredDayRef.current = restoredLost.trim() !== '' ? tradingDayKey(new Date()) : null;
          }
          if (g.account && typeof p.balance === 'string') setBalance(p.balance);
          if (g.account && typeof p.centBalance === 'string') setCentBalance(p.centBalance);
          // لاحقة لا تصلح (نسخة قديمة أو محرَّرة) لا تُعرض شريحةً تقود لرمز مرفوض
          if (typeof p.smallSuffix === 'string' && withSmallSuffix('EURUSD', p.smallSuffix)) setSmallSuffix(p.smallSuffix);
          // كانت آخر مرّة بوضع السنت/micro: تبويبٌ آخر ثم العودة كان يفتحها على الزوج العادي برصيدٍ آخر (`restoredSmallSymbol`).
          // رمزٌ بدّله المتداول قبل وصول القراءة لا يُمسّ، ولا رصيدٌ كتبه (الخانة كانت ستصير رصيد السنت)
          const restoring = g.account && !planTypedRef.current && symbolRef.current === initialSymbolRef.current;
          if (restoring) {
            setSymbol((cur: string) => (cur === initialSymbolRef.current ? restoredSmallSymbol(cur, p) : cur));
          }
          /** الرمز الذي ستفتح عليه اللوحة — العمولة تُحوَّل إلى وضعه (`commissionKindOf`)، لا إلى «EURUSD» الذي تبدأ به */
          const openSymbol = restoring ? restoredSmallSymbol(symbolRef.current, p) : symbolRef.current;
          if (g.leverage && typeof p.leverage === 'string') setLeverage(p.leverage);
          const loadedAccount =
            p.account && (ACCOUNT_CCYS as string[]).includes(p.account) ? (p.account as AccountCcy) : null;
          if (g.account && typeof p.commission === 'string') {
            // «0.07» محفوظة من «EURUSDmicro» واللوحة تفتح على زوجٍ عادي ⇒ 7 (نسخة بلا وضع محفوظ تُقرأ كما هي)
            const m = p.commissionMode;
            const now: CommissionMode = {
              kind: commissionKindOf(openSymbol) ?? commissionModeRef.current.kind,
              account: loadedAccount ?? commissionModeRef.current.account,
            };
            const saved =
              m && (m.kind === 'std' || m.kind === 'cent' || m.kind === 'micro') && typeof m.account === 'string' ? m : now;
            // مؤثّر تبدّل الوضع يرى الوضع نفسه بعد استعادة الرمز فلا يحوّلها ثانيةً
            commissionModeRef.current = now;
            setCommission(commissionAcrossModes(p.commission, saved, now));
          }
          if (g.risk && typeof p.riskPct === 'string') setRiskPct(p.riskPct);
          // «USC 1000» محفوظة من «EURUSDc» واللوحة تفتح على زوجٍ عادي (الرمز لا يُحفظ): مؤثّر تبدّل العملة يقلبها نسبةً
          // من عملتها ورصيدها المحفوظين — لا «رقم غير مفهوم» على ما كتبته الحاسبة (`savedRiskMoney`)
          const riskMoney = g.risk ? savedRiskMoney(p) : null;
          if (riskMoney) prevMoneyRef.current = riskMoney;
          if (g.account) {
            if (loadedAccount) setAccount(loadedAccount);
            setOtherBalances(savedAccountBalances(p.balances, loadedAccount ?? 'USD'));
          }
        }
      } catch {
        /* ignore */
      } finally {
        loadedRef.current = true;
      }
    })();
  }, []);

  /**
   * تبديل الزوج من شريط رموز شاشة الأدوات يصل هنا بـ`defaultSymbol` — وكان يُهمَل بعد أول تركيب،
   * فتبقى الحاسبة على زوج قديم بينما بقية التبويبات تحوّلت (نفس المزامنة القائمة بالدفتر/التنبيهات/
   * الباكتست). **الحارس**: لا نبدّل وسط خطة مكتوبة — تغيير الأداة يغيّر حجم النقطة، فأرقام دخول/وقف/
   * هدف لزوج آخر كانت ستُحسب بقيمة نقطة لا تخصّها. رمز غير قابل للحساب (DXY) يُترك كما هو.
   */
  const planTypedRef = useRef(false);
  planTypedRef.current = [entryPx, stopPx, targetPx].some((v) => v.trim() !== '');
  /** لاحقة الرمز **الآن** إن كان سنتاً/micro — شريط الرموز ينقل الزوج ويُبقي الوضع («GBPUSD» ⇒ «GBPUSDc») */
  const symSuffixRef = useRef<string | null>(null);
  symSuffixRef.current = smallContractSuffix(symbol);
  useEffect(() => {
    if (!defaultSymbol || planTypedRef.current) return;
    if (!instrumentSpec(defaultSymbol)) return;
    const suf = symSuffixRef.current;
    setSymbol((suf && withSmallSuffix(defaultSymbol, suf)) || defaultSymbol);
  }, [defaultSymbol]);

  const stdSpec = useMemo(() => instrumentSpec(symbol), [symbol]);
  /**
   * «EURUSDc»/«EURUSDmicro»: كانا مرفوضين برسالة «استخدم الزوج العادي» — الآن يُحسبان بعقد الزوج ÷ 100 (`smallContractSpec`)،
   * فاللوت بلوت السنت/micro كما يُكتب بالمنصّة. السنت بعملة USC (رصيد وعمولة ومال)، والـmicro بعملة الحساب.
   */
  const small = useMemo(() => (stdSpec ? null : smallContractSpec(symbol)), [stdSpec, symbol]);
  const spec = stdSpec ?? small?.spec ?? null;
  /** «EURUSD.mini» ⇒ «EURUSD»: رمز حساب mini (مرفوض عمداً) يُشرح بدل «رمز غير مدعوم» — راجع `miniAccountSymbol` */
  const miniPair = spec ? null : miniAccountSymbol(symbol);
  // «EURUSDi»: لاحقة ملاصقة لا تُعرف ⇒ شريحة الزوج وحده بجانب «رمز غير مدعوم» (كسطر الدفتر `journalSymbolSuffixUnknown`).
  // لا لما قد يكون عقداً أصغر («EURUSDC1»، «EURUSDcents») — الزوج العادي يحسب لوتها بمئة ضعف (`journalUnknownSuffixPair`)
  const suffixPair = useMemo(
    () => (spec || small || miniPair ? null : journalUnknownSuffixPair(journalSymbol(symbol))),
    [spec, small, miniPair, symbol],
  );
  const cent = small?.kind === 'cent';
  /** عملة كل مبلغ باللوحة: USC لحساب السنت (سعر التحويل لحساب دولار × 100)، وإلا عملة الحساب */
  const moneyCcy: string = cent ? 'USC' : account;
  const convAccount: AccountCcy = cent ? 'USD' : account;
  /**
   * «7» للوت العادي كانت تبقى 7 USD **لكل لوت micro** بعد «EURUSDmicro» (مئة ضعف: تكاليف مضخّمة ولوت «شامل التكاليف» أصغر
   * وسطر دفتر خاطئ). تُحوَّل بمكافئ اللوت العادي — راجع `commissionAcrossModes`. رمزٌ مجهول وسط الكتابة («EURUSDmi») لا يغيّر
   * الوضع؛ وتبديل العملة وحده تمسحه الشريحة نفسها.
   */
  const commissionKind: CommissionMode['kind'] | null = stdSpec ? 'std' : small?.kind ?? null;
  useEffect(() => {
    if (commissionKind == null) return;
    const prev = commissionModeRef.current;
    const next: CommissionMode = { kind: commissionKind, account };
    commissionModeRef.current = next;
    if (prev.kind !== next.kind) setCommission((c: string) => commissionAcrossModes(c, prev, next));
  }, [commissionKind, account]);

  /** آخر وضعٍ معروف (سنت/micro أم عادي) — رمزٌ مجهول وسط الكتابة («EURUSDmi») لا يغيّره. يُحفظ لـ`restoredSmallSymbol` */
  const smallActiveRef = useRef(false);
  if (commissionKind != null) smallActiveRef.current = commissionKind !== 'std';
  // بعد تحويل العمولة (الترتيب مقصود): تُحفظ مع وضعها الجديد لا القديم
  useEffect(() => {
    if (!loadedRef.current) return;
    AsyncStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        balance,
        centBalance,
        balances: otherBalances,
        smallSuffix,
        smallActive: smallActiveRef.current,
        riskPct,
        // عملة المبلغ إن كُتبت المخاطرة مالاً — `savedRiskMoney` عند الفتح
        riskCcy: moneyCcy,
        account,
        leverage,
        commission,
        commissionMode: commissionModeRef.current,
        dailyLimit,
        lostToday,
        lostCcy,
        // يوم كتابتها لا يوم الحفظ: لوحة بقيت مفتوحة عبر إغلاق نيويورك كانت تختم خسارة الأمس بمفتاح اليوم (`lostDayForSave`)
        lostTradingDay: lostDayForSave(lostToday, lostEnteredDayRef.current, new Date()),
      })
    ).catch(() => {
      /* ignore */
    });
  }, [balance, centBalance, otherBalances, smallSuffix, riskPct, account, leverage, commission, commissionKind, moneyCcy, dailyLimit, lostToday, lostCcy]);
  const balanceText = cent ? centBalance : balance;
  const setBalanceText = cent ? setCentBalance : setBalance;
  /** لاحقة الوضع الحالي (null = حساب عادي) */
  const curSuffix = small ? smallContractSuffix(symbol) : null;
  useEffect(() => {
    if (curSuffix) setSmallSuffix(curSuffix);
  }, [curSuffix]);
  /**
   * شرائح الأزواج الجاهزة: بوضع السنت/micro بلاحقته («GBPUSDc») — كانت «GBPUSD» تُخرجه إلى الحساب العادي برصيده الآخر؛
   * وشريحة أخيرة تعبر بين الوضعين للزوج الحالي: «EURUSDc» (آخر لاحقة محفوظة) من الحساب العادي، و«EURUSD» منه.
   */
  const quickSyms = QUICK_SYMBOLS.map((pair) => ({ pair, s: (curSuffix && withSmallSuffix(pair, curSuffix)) || pair }));
  const crossSym = curSuffix
    ? spec!.symbol
    : stdSpec && smallSuffix
      ? withSmallSuffix(stdSpec.symbol, smallSuffix)
      : null;
  /** الأداة **الآن** — لسعرٍ حيّ يصل بعد تبديلها (راجع `fillEntryFromLive`) */
  const liveSymRef = useRef<string | null>(null);
  liveSymRef.current = spec?.symbol ?? null;
  /** الوقف **عند وصول** السعر لا عند النقرة: وقفٌ كُتب أثناء الطلب كان يُهمَل فيُعبّأ الوسطي بدل Ask/Bid (ومؤثّر الوقف
   *  أدناه جرى قبل التعبئة فلا يعود) ⇒ وقفٌ أضيق بنصف السبريد ولوتٌ أكبر — ~10% على ذهبٍ بوقف 15 pip */
  const stopPxRef = useRef('');
  stopPxRef.current = stopPx;
  /** الدخول **عند وصول** السعر: رقمٌ كُتب باليد أثناء الطلب لا يُكتب فوقه (راجع `liveEntryFillAllowed`) */
  const entryPxRef = useRef('');
  entryPxRef.current = entryPx;
  /** يزيد مع كل تغيير بالخطة (مؤثّر مسح رسالة التسجيل) — ردُّ تسجيلٍ لخطةٍ تغيّرت أثناء الطلب لا يقول «سُجِّلت» تحت الجديدة */
  const planGenRef = useRef(0);
  const conv = useMemo(() => (spec ? conversionPair(spec.quote, convAccount) : null), [spec, convAccount]);
  const convSymbol = conv?.symbol ?? null;
  const convInvert = conv?.invert ?? false;
  /** السعر المحفوظ يخصّ الزوج **واتجاهه** — راجع `conversionKey` */
  const convKey = conversionKey(conv);
  /** سعر التحويل المكتوب يُقرأ لزوجه وحده: كان يبقى إطاراً مع الزوج الجديد حتى يمسحه التأثير — `manualConvForPair` */
  const manualConv = manualConvForPair(manualConvTyped, convKey);
  const setManualConv = (text: string) => setManualConvTyped({ key: convKey, text });
  /** جسر الدولار: بديل الزوج المباشر حين لا يعرفه المزوّد (`usdBridge` بـpositionSize.ts). */
  // على العملة لا على كائن `spec`: لاحقة الوسيط («EURJPY» ← «EURJPY.m») تنشئ `spec` جديداً للأداة نفسها، فكان جسرٌ
  // جديد يعيد تأثير التحويل غير صامت ⇒ اللوت يفرغ أثناء إعادة الجلب ويُمسح سعر التحويل المكتوب يدوياً
  const specQuote = spec?.quote ?? null;
  const bridge = useMemo(() => (specQuote ? usdBridge(specQuote, convAccount) : null), [specQuote, convAccount]);

  /**
   * **تحديث سعر التحويل كل 60 ث** ما دام مجلوباً تلقائياً: كان يُجلب مرّة عند اختيار الأداة ثم يبقى — واللوحة
   * تُترك مفتوحة جلسةً كاملة، فقيمة النقطة لـUSDJPY بحساب دولار (÷ السعر) تنحرف مع السعر. التحديث صامت: لا
   * «جارٍ التحميل»، ولا يُمسح الإدخال اليدوي، وفشله يُبقي آخر سعر ناجح. الإدخال اليدوي (بعد فشلٍ) لا يُحدَّث.
   */
  const [convRefresh, setConvRefresh] = useState(0);
  const convRunKey = useRef<{ key: string; refresh: number } | null>(null);
  useEffect(() => {
    if (!convQuote || !active) return;
    // يُعاد التسليح مع كل تحديث (`convRefresh`) لا مع النجاح وحده: تحديثٌ فاشل لا يوقف التالي
    const id = setTimeout(() => setConvRefresh((n: number) => n + 1), 60_000);
    return () => clearTimeout(id);
  }, [convQuote, convRefresh, active]);
  /** العودة إلى الشاشة بعد توقّفٍ (`active`): السعران قد يكونان بعمر الغياب كلّه ⇒ تحديثٌ صامت فوري لكليهما */
  const wasActiveRef = useRef(active);
  useEffect(() => {
    const resumed = active && !wasActiveRef.current;
    wasActiveRef.current = active;
    if (!resumed) return;
    // سعر تحويل كُتب يدوياً (`convQuote` فارغ) لا يُجدَّد — تحديثٌ ناجح كان سيحلّ محلّه بصمت
    if (convQuote) setConvRefresh((n: number) => n + 1);
    setMktRefresh((n: number) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- لحظة العودة وحدها؛ `convQuote` يُقرأ كما هو عندها
  }, [active]);

  useEffect(() => {
    const runKey = `${convSymbol}|${convInvert}|${bridge?.first.symbol ?? ''}|${bridge?.second.symbol ?? ''}`;
    // الزوج نفسه والعدّاد تقدّم ⇒ تحديث المؤقّت: بلا مسح ولا مؤشّر تحميل، والفشل يُبقي السعر الحالي.
    // (العدّاد شرطٌ لا الزوج وحده: تشغيل التأثير مرّتين بالتطوير لا يُعدّ تحديثاً صامتاً)
    const prev = convRunKey.current;
    const silent = prev != null && prev.key === runKey && prev.refresh !== convRefresh;
    convRunKey.current = { key: runKey, refresh: convRefresh };
    const g = ++gen.current;
    if (!silent) {
      setConvQuote(null);
      setConvFailed(false);
      setManualConvTyped({ key: null, text: '' });
    }
    if (!convSymbol) {
      setConvLoading(false);
      return;
    }
    if (!silent) setConvLoading(true);
    // الزوج المتوقَّع أولاً، ثم المعكوس تلقائياً (CHFZAR ↔ ZARCHF…) قبل اللجوء للإدخال اليدوي
    const tries = [
      { symbol: convSymbol, invert: convInvert },
      reversedConversion({ symbol: convSymbol, invert: convInvert }),
    ];
    // سعر تجريبي بذري (المزوّد غير متاح أو لا يعرف الزوج — كان يُعيد ~1.0 لزوج مجهول) يُعامَل كفشل:
    // حساب لوت من سعر تحويل مختلَق أخطر من طلب السعر يدوياً (راجع `isRealQuote`).
    // `as_of` (إن أرسله الخادم مع سعرٍ مخزّن) يصير وقت السعر، لا لحظة الجلب — راجع `quoteAsOfMs`.
    // سعرٌ بعيد عن مرجع زوجه (معكوسٌ أعاد المزوّد له سعر الزوج المعتاد) = فشل أيضاً — `fetchedConvPriceLooksWrong`
    const fetchPrice = (sym: string) =>
      api.marketQuote(sym).then(
        (q) =>
          isRealQuote(q) && !fetchedConvPriceLooksWrong(sym, q.price)
            ? { price: q.price, at: quoteAsOfMs((q as { as_of?: unknown }).as_of, Date.now(), clockOffsetMs()), marketOpen: quoteMarketOpen(q) }
            : null,
        () => null
      );
    const id = setTimeout(() => {
      (async () => {
        for (const c of tries) {
          const q = await fetchPrice(c.symbol);
          if (!mountedRef.current || g !== gen.current) return;
          if (q != null) {
            const r = quoteToAccountRate(c, q.price);
            if (r != null) {
              setConvQuote({ key: conversionKey({ symbol: convSymbol, invert: convInvert })!, rate: r, at: q.at, marketOpen: q.marketOpen });
              setConvLoading(false);
              return;
            }
          }
        }
        /**
         * **جسر الدولار** قبل اللجوء للإدخال اليدوي: مزوّد الأسعار يعرف أزواج الدولار كلها بينما
         * كثير من التقاطعات ليست بقائمته، فتركيبات عادية تماماً (حساب بالفرنك على USDJPY ← `CHFJPY`،
         * حساب أسترالي على USDCAD ← `AUDCAD`، حساب باليورو على USDCAD ← `EURCAD`) كانت تقف عند
         * «أدخل سعر التحويل يدوياً» بلا سبب يفهمه المتداول. الساقان تُجلبان معاً (`Promise.all`)
         * ولا تُطلبان إلا بعد فشل المحاولتين المباشرتين، فلا طلب زائد بالحالة الشائعة.
         */
        if (bridge) {
          const [p1, p2] = await Promise.all([
            fetchPrice(bridge.first.symbol),
            fetchPrice(bridge.second.symbol),
          ]);
          if (!mountedRef.current || g !== gen.current) return;
          const viaUsd = bridgedRate(bridge, p1?.price ?? null, p2?.price ?? null);
          if (viaUsd != null && p1 && p2) {
            // عمر الجسر = عمر أقدم ساقيه
            const at = Math.min(p1.at, p2.at);
            const marketOpen = combinedMarketOpen(p1.marketOpen, p2.marketOpen);
            setConvQuote({ key: conversionKey({ symbol: convSymbol, invert: convInvert })!, rate: viaUsd, at, marketOpen });
            setConvLoading(false);
            return;
          }
        }
        if (silent) return;
        setConvFailed(true);
        setConvLoading(false);
      })();
    }, silent ? 0 : 400);
    return () => clearTimeout(id);
  }, [convSymbol, convInvert, bridge, convRefresh]);

  /** أرقام عربية/فاصل آلاف/فاصلة عشرية — راجع parseDecimal.ts. NaN = فارغ أو غير صالح. */
  const num = (s: string) => parseDecimal(s) ?? NaN;
  /**
   * خانات **الأسعار** (دخول/وقف/هدف) بأداة الحاسبة: «3.450» بخانة ذهب مبهمة (3450 بكتابة أوروبية) فتُرفض —
   * كانت تُقرأ 3.45: دخول 3.450 ووقف 3.350 = «1 pip» ⇒ **10 لوت** بدل 0.01، وهامشٌ أصغر بألف مرّة. راجع
   * `parsePriceFor` (الدفتر يقرأ به منذ `53f1e03`). السبريد والتحويل يبقيان على `num`.
   */
  const priceNum = (s: string) => parsePriceFor(s, spec?.symbol) ?? NaN;
  /** نقاط الوقف: «1.500» مبهمة (1,500) فتُرفض — كانت تُقرأ 1.5 pip ⇒ لوت أكبر بألف مرّة. راجع `parseSlPips`. */
  const slNum = parseSlPips(slPips, spec) ?? NaN;
  /**
   * الرصيد مبلغ: «10.000» أوروبية = عشرة آلاف فتُرفض كـ«10,000» بدل حساب لوت من 10 — راجع parseDecimal.ts. وبعلامة عملة
   * الحساب («$10,000.00» منسوخاً من المنصّة) مقبول كخانة المخاطرة — `parseBalance`.
   */
  const balanceNum = parseBalance(balanceText, moneyCcy) ?? NaN;
  /**
   * خانة فيها نص لكنه ليس رقماً مفهوماً («10,000» مبهم، «1.2.3») — نقول ذلك بدل «أدخل الرصيد…».
   * السبريد خارجها: خطؤه يُقال تحت خانته (راجع `spreadErr`) لأن اللوت يُحسب بدونه.
   */
  const badOtherThanLeverage =
    (balanceText.trim() !== '' && parseBalance(balanceText, moneyCcy) == null) ||
    (riskPct.trim() !== '' && parseRiskInput(riskPct, balanceNum, moneyCcy) == null) ||
    (slPips.trim() !== '' && parseSlPips(slPips, spec) == null) ||
    (manualConv.trim() !== '' && parseDecimal(manualConv) == null) ||
    [entryPx, stopPx, targetPx].some((v) => v.trim() !== '' && Number.isNaN(priceNum(v)));
  const badNumber = badOtherThanLeverage || (leverage.trim() !== '' && parseLeverage(leverage) == null);
  /**
   * **أيّ خانة** مرفوضة، باسمها القصير (ما قبل « (» — «Stop loss (pips)» ⇒ «Stop loss») والنصّ كما كُتب. الرسالة
   * العامة تحت لوتٍ ظاهر لم تكن تسمّي الخانة، فيبحث المتداول بين عشر خانات عن «1.2.3» — وقد تكون بأسفل
   * اللوحة (الهدف) أو بأعلاها (الرصيد). سعر التحويل اليدوي باسم زوجه. عرضٌ فقط، بلا تغيير حساب.
   */
  const shortLabel = (label: string) => label.split(' (')[0].trim();
  const badFields = [
    [t.riskCalcBalance, balanceText, parseBalance(balanceText, moneyCcy) == null],
    [t.riskCalcRiskPct, riskPct, parseRiskInput(riskPct, balanceNum, moneyCcy) == null],
    [t.riskCalcLeverage, leverage, parseLeverage(leverage) == null],
    [t.riskCalcSlPips, slPips, parseSlPips(slPips, spec) == null],
    [t.riskCalcEntry, entryPx, Number.isNaN(priceNum(entryPx))],
    [t.riskCalcStop, stopPx, Number.isNaN(priceNum(stopPx))],
    [t.riskCalcTarget, targetPx, Number.isNaN(priceNum(targetPx))],
    [conv?.symbol ?? '', manualConv, parseDecimal(manualConv) == null],
  ] as const;
  const badFieldsText = badFields
    .filter(([, v, bad]) => v.trim() !== '' && bad)
    // دالّة لا نصّ بديل: «$$50» بخانة المخاطرة كانت ستُعرض «$50» (`$$` نمطٌ بـ`replace`)
    .map(([label, v]) =>
      t.riskCalcBadFieldValue.replace('{field}', () => shortLabel(label)).replace('{value}', () => v.trim())
    )
    .join(' · ');
  /**
   * خطأ خانة السبريد، تحتها مباشرةً. كان يُضمّ لـ`badNumber` الذي لا يظهر إلا **بلا نتيجة** — واللوت
   * يُحسب من الوقف وحده، فسبريدٌ مرفوض كان يُسقط سطر «شاملة السبريد» بصمت واللوت معروض كأن لا خطأ.
   * وفوق `MAX_SPREAD_PIPS` الرقم مفهوم: يُقال إنه غالباً سعر مكتوب بدل نقاط لا «رقم غير مفهوم».
   */
  /** «3.450» بخانة ذهب: الرسالة تقول لماذا وتعرض القراءتين بدل «اكتبه بلا فواصل آلاف، مثل 1.0850» */
  const ambiguousPx = [entryPx, stopPx, targetPx]
    .map((v) => ambiguousThousandsPrice(v, spec?.symbol))
    .find((a) => a != null);
  const leverageAmbig = leverageAmbiguousThousands(leverage);
  /** «1.500» بخانة النقاط وحدها مرفوضة: 1500 أم 1.5؟ — القراءتان بدل «مثل 1.0850» (`ambiguousSlPips`) */
  const slAmbig = ambiguousSlPips(slPips);
  const onlySlBad = badFields.every(([label, v, bad]) => label === t.riskCalcSlPips || v.trim() === '' || !bad);
  /**
   * «250 points» بخانة الوقف: النقطة بـMT4/MT5 عُشر pip ⇒ «اكتب 25 pip» بدل «رقم غير مفهوم» (`slPipsInPoints`، مفتاح launch).
   * «25 نقطة» عربية/كردية (`native`) لا: أغلب المتداولين العرب يقصدون بها pip، و«اكتب 2.5 pip» = لوت ×10
   */
  const slPoints = slPipsInPoints(slPips);
  /**
   * «€40» بحساب دولار وحدها مرفوضة: المبلغ مفهوم والعملة ليست عملة الحساب (`moneyInOtherCurrency`) ⇒ «…: عملة الحساب USD» بدل
   * «رقم غير مفهوم» (launch84). `riskCalcOtherCcyHint` (launch) يقول ماذا يفعل: يكتبه بعملة الحساب أو يغيّر الشريحة.
   */
  const onlyOtherCcy = ([
    [t.riskCalcRiskPct, riskPct],
    [t.riskCalcBalance, balanceText],
  ] as const).find(
    ([field, raw]) =>
      moneyInOtherCurrency(raw, moneyCcy) && badFields.every(([label, v, bad]) => label === field || v.trim() === '' || !bad)
  );
  const badNumberText = ambiguousPx
    ? t.priceAmbiguousThousandsHint
        .replace('{value}', ambiguousPx.value)
        .replace('{whole}', ambiguousPx.whole)
        .replace('{small}', ambiguousPx.small)
    : slAmbig && onlySlBad
      ? t.riskCalcSlPipsAmbiguous
          .replace('{value}', () => slAmbig.value)
          .replace('{whole}', slAmbig.whole)
          .replace('{small}', slAmbig.small)
      : slPipsLooksLikePrice(slPips, spec) && onlySlBad
      ? // «1.0820» بخانة النقاط سعرٌ لا مسافة (كانت 1.08 pip ⇒ لوت أكبر بعشرين مرّة) — تُسمّى خانة سعر الوقف التي يقصدها (launch88)
        t.riskCalcSlLooksLikePrice.replace('{value}', () => slPips.trim())
      : slPoints && !slPoints.native && onlySlBad
      ? t.riskCalcSlPointsHint.replace('{value}', () => slPoints.value).split('{pips}').join(slPoints.pips)
      : onlyOtherCcy
      ? t.riskCalcOtherCcyHint
          .replace('{field}', () => shortLabel(onlyOtherCcy[0]))
          .replace('{value}', () => onlyOtherCcy[1].trim())
          .split('{ccy}')
          .join(moneyCcy)
      : misplacedArabicThousandsSign(balanceText, { amount: true }) ||
        misplacedArabicThousandsSignInRisk(riskPct, balanceNum, moneyCcy) ||
        misplacedArabicThousandsSign(slPips, { unit: 'pip' }) ||
        [manualConv, entryPx, stopPx, targetPx].some((v) => misplacedArabicThousandsSign(v))
      ? // «0٬5» بخانة المخاطرة: «٬» بجانب «٫» على اللوحة العربية — يُقال أيّهما يُكتب للكسر
        `${badFieldsText}: ${t.arabicThousandsSignHint}`
      : !badOtherThanLeverage && leverageAmbig
        ? // «1.000» = 1:1000 بكتابة أوروبية أم 1:1؟ — «مثل 1.0850» كانت تدعوه لكتابة ما كتبه بالضبط. وحدها فقط، كالتالية
          t.riskCalcLeverageAmbiguous
            .replace('{value}', () => leverageAmbig.value)
            .split('{big}')
            .join(String(leverageAmbig.big))
        : !badOtherThanLeverage && leverageOutOfRange(leverage)
          ? // «1:5000» مفهومة وبلا فواصل — «رقم غير مفهوم، بلا فواصل آلاف» كانت تجعله يعيد كتابتها كما هي.
            // وحدها فقط: مع خانة أخرى مرفوضة تبقى الرسالة العامة كي لا تُسمّى الرافعة وحدها
            t.riskCalcLeverageOutOfRange.replace('{value}', leverage.trim()).replace('{max}', String(MAX_LEVERAGE))
          : `${badFieldsText}: ${t.invalidNumberHint}`;
  const spreadWide = spreadTooWide(spread, spec);
  const spreadPoints = slPipsInPoints(spread);
  const spreadErr =
    parseSpreadPips(spread, spec) != null
      ? null
      : spreadWide != null
        ? // `{example}` بحسب الأداة: «مثل 1.5» على USDZAR كلفةٌ أصغر ×60 (tools85)
          // بلا مثال صادق (XAUJPY) يُحذف «(مثل …)» كلّه — «1.5» العام كان يُقترح على ذهبٍ بالين (launch129)
          fillExampleOrDrop(t.riskCalcSpreadTooWide.replace('{n}', String(spreadWide)), typicalSpreadPipsExample(spec))
        : misplacedArabicThousandsSign(spread, { unit: 'pip' })
          ? t.arabicThousandsSignHint
          : spreadPoints && !spreadPoints.native
            ? // «12 points» كما تعرضها MT4/MT5 ⇒ «اكتبه هنا 1.2» بدل «رقم غير مفهوم» (tools63، مفتاح launch)
              t.riskCalcSpreadPointsHint.replace('{value}', () => spreadPoints.value).split('{pips}').join(spreadPoints.pips)
            : t.invalidNumberHint;
  /** خطأ خانة العمولة تحتها — للسبب نفسه: اللوت يُحسب بدونها فلا يصل `badNumber` إليها */
  /** الملاحظة بلوت الوضع: micro ⇒ «{std} للعادي = {micro} للوت micro» بأرقام الخانة، السنت ⇒ «بالـUSC، الرقم نفسه». */
  const commissionEx = commissionNoteExample(commission, commissionKind, moneyCcy);
  const commissionNoteText = !commissionEx
    ? t.riskCalcCommissionNote
    : commissionKind === 'micro'
      ? t.riskCalcCommissionNoteMicro.replace('{std}', commissionEx.std).replace('{micro}', commissionEx.micro)
      : t.riskCalcCommissionNoteCent.split('{usc}').join(commissionEx.usc);
  const commissionErr =
    parseCommission(commission, moneyCcy) != null
      ? null
      : moneyInOtherCurrency(commission, moneyCcy)
        ? // «€7» بحساب دولار: مبلغ مفهوم بعملة أخرى — تُقال عملة الحساب لا «رقم غير مفهوم» (كالمخاطرة، launch84)
          t.riskCalcOtherCcyHint
            // «Commission “€7”» لا «Optional commission per lot, open + close “€7”» — الوسم الكامل وصفٌ لا اسم (launch86)
            .replace('{field}', () => t.planNoteCommission)
            .replace('{value}', () => commission.trim())
            .split('{ccy}')
            .join(moneyCcy)
        : misplacedArabicThousandsSign(commission, { amount: true })
        ? t.arabicThousandsSignHint
        : t.invalidNumberHint;
  /**
   * «1%» / «0.5٪» كما يقولها المتداول، أو **مبلغ** بعلامة عملة الحساب («$50»، «50 USD») تُحسب نسبته من
   * الرصيد — راجع `parseRiskInput`. الرقم وحده يبقى نسبة.
   */
  const riskIn = parseRiskInput(riskPct, balanceNum, moneyCcy);
  /**
   * عملة المال تتغيّر **بتبديل الرمز** لا بشريحة العملة وحدها: «EURUSD» ⇄ «EURUSDc» = USD ⇄ USC (ورصيدان مختلفان). المخاطرة
   * المكتوبة مالاً («USD 50») كانت تصير «رقم غير مفهوم» تحت السنت، و«USC 5000» كذلك بالعودة. تعود نسبةً بعملة ورصيد
   * الوضع السابق — النسبة وحدها معناها واحد بالحسابين — كما تفعل شريحة عملة الحساب. راجع `toggleRiskUnit`.
   */
  const prevMoneyRef = useRef({ ccy: moneyCcy, balance: balanceNum });
  useEffect(() => {
    const prev = prevMoneyRef.current;
    prevMoneyRef.current = { ccy: moneyCcy, balance: balanceNum };
    if (prev.ccy === moneyCcy) return;
    if (parseRiskInput(riskPct, prev.balance, prev.ccy)?.amount == null) return;
    setRiskPct(toggleRiskUnit(riskPct, prev.balance, prev.ccy) ?? '');
    // riskPct خارج التبعيات عمداً: يُقرأ لحظة تبدّل العملة فقط، لا مع كل حرف يُكتب
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moneyCcy, balanceNum]);
  const riskNum = riskIn?.pct ?? NaN;
  /** النسبة كما تُكتب بالنصوص («يتجاوز {pct}%»): المكتوبة كما هي، والمحسوبة من مبلغ لمنزلتين («0.5» لا «0.4999…») */
  const riskPctText = riskIn?.amount != null ? String(Math.round(riskNum * 100) / 100) : String(riskNum);
  const derivedSl = spec ? slPipsFromPrices(spec, priceNum(entryPx), priceNum(stopPx)) : null;

  // الوقف من السعر يكتب قيمته بخانة النقاط (مصدر واحد للحساب)؛ تعديل النقاط يدوياً يبقى ممكناً بعده.
  // تغيير الأداة يعيد الحساب بحجم pip الجديد (الين/الذهب).
  useEffect(() => {
    if (derivedSl != null) {
      slFromPrices.current = true;
      setSlPips(String(derivedSl));
    } else if (slFromPrices.current) {
      // السعران مُسحا/تساويا/صارا غير صالحين: لا نحسب اللوت من وقف قديم لم يعد يطابق ما على الشاشة
      slFromPrices.current = false;
      setSlPips('');
    }
  }, [derivedSl]);
  /**
   * شريحة وقف التقلّب تحت خانة النقاط (`atrStopPips`: 1.5 × ATR14 على شموع الساعة المغلقة) — كشريحة الدفتر. الشموع من ذاكرة
   * الشارت المشتركة أو طلبٌ واحد بعد توقّف الكتابة، للزوج العادي (رموز السنت/micro بزوجها)؛ التجريبية لا تُستعمل، وردٌّ لرمزٍ
   * سابق يُرمى. لا جلب واللوحة غير ظاهرة (`active`).
   */
  const atrKey = spec ? journalSpec(symbol)?.symbol ?? null : null;
  const [atrSeries, setAtrSeries] = useState<{ key: string; candles: Candle[] } | null>(null);
  /** يزيد عند كل إغلاق ساعة (+ مهلة) واللوحة مفتوحة ⇒ جلبٌ جديد وإعادة حساب (`atrStopRefreshDelayMs`) */
  const [atrTick, setAtrTick] = useState(0);
  useEffect(() => {
    if (!atrKey || !active) return;
    const id = setTimeout(() => setAtrTick((n) => n + 1), atrStopRefreshDelayMs(serverNowSec()));
    return () => clearTimeout(id);
  }, [atrKey, active, atrTick]);
  useEffect(() => {
    if (!atrKey || !active) return;
    const cached = cachedChartSeries(atrKey, ATR_STOP_TF);
    if (cached && !isSyntheticProvenance(cached.data_source) && atrSeriesIsCurrent(cached.candles, serverNowSec())) {
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
  }, [atrKey, active, atrTick]);
  const atrPips = useMemo(
    () =>
      atrKey && atrSeries?.key === atrKey
        ? atrStopPips({ symbol: atrKey, candles: atrSeries.candles, nowSec: serverNowSec() })
        : null,
    // `atrTick`: يعيد فحص عمر الشموع (`serverNowSec`) حتى إن فشل الجلب
    [atrKey, atrSeries, atrTick]
  );
  const onSlPipsChange = (v: string) => {
    slFromPrices.current = false;
    setSlPips(v);
  };
  /**
   * تناقض صامت كان يمرّ بصندوق واحد: يكتب المتداول الدخول والوقف فتُملأ خانة النقاط تلقائياً، ثم يعدّل
   * **خانة النقاط يدوياً** — فيصير حجم اللوت و«المخاطرة الفعلية» محسوبَين من النقاط المعدَّلة، بينما R:R
   * و«الربح المحتمل» محسوبان من السعرين (`analyzePlan` لا يقرأ النقاط أصلاً). أي **وقفان مختلفان
   * بنتيجة واحدة**، بلا أي إشارة. الحارس `slFromPrices` لا يمنع ذلك: `derivedSl` لم يتغيّر فلا يُعاد
   * تشغيل الـeffect الذي يُرجع الخانة. التحذير لا يمنع الحساب — قد يقصد المتداول وقفاً أوسع عمداً —
   * لكنه يقول أيّ رقم يحكم أيّ سطر. والشرط على الراية نفسها (`!slFromPrices.current`) يمنع ومضة
   * إطارٍ واحد أثناء كتابة سعر الوقف: `derivedSl` يتغيّر بالإطار الذي لم يكتب فيه الـeffect الخانة بعد.
   */
  const slTyped = slNum;
  /** غير متماثل: نقاط أضيق من السعرين بأي فرق = لوت أكبر من وقفه المحفوظ — راجع `stopPipsMismatch` */
  const slMm = slFromPrices.current ? null : stopPipsMismatch(slTyped, derivedSl);
  const slMismatch = slMm ? { typed: slPips.trim(), derived: slMm.derived, narrower: slMm.narrower } : null;
  /** الأضيق هو الخطر (لوت أكبر من وقفه المحفوظ) فيقول خطره؛ الأوسع يصف الحساب فقط */
  const slMismatchText = slMismatch
    ? (slMismatch.narrower ? t.riskCalcSlMismatchNarrower : t.riskCalcSlMismatch)
        .replace('{pips}', slMismatch.typed)
        .replace('{derived}', String(slMismatch.derived))
    : null;
  /**
   * **وقف أضيق من 1 pip.** مستحيلٌ بأي أداة تجزئة — أضيق من السبريد نفسه — وهو خطأ كتابة شبه
   * مؤكّد: «2» بدل «20» بخانة النقاط، أو منزلة عشرية زائدة بسعر الوقف. وكلفته **هنا** أفدح منها
   * بأي موضع آخر: حجم اللوت يتناسب عكسياً مع الوقف، فوقفٌ عُشر الصحيح = **مركزٌ عشرة أضعاف**
   * يخرج برقمٍ أنيق يبدو محسوباً تماماً، ويُسجَّل بالدفتر بنقرة. `analyzePlan` يرفض هذا المدخل منذ
   * مدّة بلوح الأفكار وبالدفتر (`planSlTooClose`)، والحاسبة — وهي الموضع الذي يتحوّل فيه الرقم
   * إلى مال — كانت وحدها تقبله وتحسب عليه.
   *
   * يُعامَل كنسبة فوق 100% (`riskOverBalance`) بالضبط: تحذيرٌ ظاهر عند خانته، وبلا حجم مركز — لا رقم من مدخل
   * مستحيل. والخانة واحدة سواء كُتبت النقاط يدوياً أو اشتُقّت من السعرين، فالفحص واحد يغطّيهما.
   * القيمة مقرَّبة لعُشر pip أصلاً (`slPipsFromPrices`) فلا حاجة لهامش عائم.
   * والحدّ الأكبر من 1 pip و0.002% من السعر (`minStopPips`): XAUJPY بوقف 0.5 ين كان 300 لوت فوق «1 pip» = 0.1 ين.
   */
  // بلا سعر مكتوب (النقاط وحدها) ⇒ سعر الأداة التقريبي لا «1 pip» — `calcMinStopPips`
  const slFloor = calcMinStopPips(spec, priceNum(entryPx), priceNum(stopPx));
  // النقاط من السعرين مقرَّبة لعُشر pip **للأعلى** ⇒ 3.61 pip حقيقية على USDZAR تُقرأ 3.7 فتمرّ فوق الحدّ 3.698، والدفتر يرفضها
  // بالسعرين أنفسهما (`stopTooClose`). حين تأتي النقاط من السعرين يُفحص السعران بحدّ الدفتر نفسه.
  const priceStopTooClose =
    spec != null &&
    slFromPrices.current &&
    stopTooClose({
      symbol: spec.symbol,
      side: priceNum(entryPx) > priceNum(stopPx) ? 'buy' : 'sell',
      entry: priceNum(entryPx),
      sl: priceNum(stopPx),
    });
  const slTooClose = spec != null && Number.isFinite(slTyped) && slTyped > 0 && (slTyped < slFloor || priceStopTooClose);
  const fetchedConv = convQuote && convQuote.key === convKey ? convQuote : null;
  // التجديد الفاشل يُبقي آخر سعر بصمت — بعد 5 د يُقال للمتداول (مؤقّت التجديد يعيد الرسم كل دقيقة فيتقدّم العدد)
  const convStaleMin = fetchedConv ? convStaleMinutes(fetchedConv.at, Date.now()) : null;
  // بعطلة نهاية الأسبوع الخادم يقول `market_open: false` ⇒ «السوق مغلق» بدل «لم يتجدّد منذ ~2900 د» الذي يوحي بعطل (launch106)
  const convNotice = convQuoteNotice(convStaleMin, fetchedConv ? fetchedConv.marketOpen : null);
  const manual = num(manualConv);
  // «0.0067» لـUSDJPY: مقلوبٌ قطعاً ⇒ لا لوت منه (كالوقف < 1 pip) — بحساب ين على EURUSD كان لوتاً أكبر ×22,000
  const manualInverted = fetchedConv ? null : manualConvLooksInverted(conv?.symbol, Number.isFinite(manual) ? manual : null);
  // «1500» لـUSDJPY (بدل 150.0): بلا فاصلة ⇒ لا لوت منه (لوت ×10 على الأزواج المعكوسة) — `manualConvDecimalSlip`
  const manualSlip =
    fetchedConv || manualInverted != null ? null : manualConvDecimalSlip(conv?.symbol, Number.isFinite(manual) ? manual : null);
  // السعر المجلوب (زوجاً مباشراً كان أم معكوساً أم جسراً)، وإلا الإدخال اليدوي بترتيب الزوج المعروض
  const convRate = fetchedConv
    ? fetchedConv.rate
    : quoteToAccountRate(conv, manualInverted == null && manualSlip == null && Number.isFinite(manual) && manual > 0 ? manual : null);
  // الأساس = عملة الحساب ⇒ الخسارة تُحوَّل بسعر الوقف لا الحيّ (أمرٌ معلّق بعيد كان يتجاوز المخاطرة) — `exitQuoteToAccount`
  const stopRate = exitQuoteToAccount(spec, convAccount, priceNum(stopPx), convRate, true);
  // بلا سعر وقف (النقاط وحدها): الاتجاه مجهول ⇒ أسوأ خروج (تحت الدخول/الحيّ) كي لا تتجاوز الخسارة المخاطرة — `pipsOnlyExitQuoteToAccount`
  const pipsOnlyRate = Number.isFinite(priceNum(stopPx))
    ? null
    : pipsOnlyExitQuoteToAccount(spec, convAccount, slNum, priceNum(entryPx), convRate);
  // تعذّر التحويل والأساس = عملة الحساب ⇒ 1 ÷ الوقف المكتوب (أو الدخول − النقاط) لا يحتاج المزوّد — `typedExitQuoteToAccount`
  const typedExit =
    convRate == null ? typedExitQuoteToAccount(spec, convAccount, priceNum(stopPx), priceNum(entryPx), slNum) : null;
  const riskRate = stopRate ?? pipsOnlyRate ?? convRate ?? typedExit?.rate ?? null;
  /** الخروج بسعر الوقف المكتوب — حيّاً كان التحويل أم لا (نصّ «عند وقفك» مقابل «عند خروج النقاط») */
  const exitAtStop = stopRate != null || typedExit?.fromStop === true;
  /** قيمة النقطة المعروضة محسوبة بسعر الوقف لا الحيّ ⇒ لا تطابق رقم المنصّة؛ السطر يسمّي السعر ويشرح (launch72) */
  const pipAtStop =
    typedExit != null || ((stopRate ?? pipsOnlyRate) != null && (stopRate ?? pipsOnlyRate) !== convRate);
  /** السعر الذي حُسبت به قيمة الـpip المعروضة: الوقف المكتوب، أو خروج النقاط وحدها (`pipsOnlyExitPrice`) */
  const pipRatePx =
    typedExit != null
      ? typedExit.price
      : stopRate != null
        ? priceNum(stopPx)
        : pipsOnlyExitPrice(spec, slNum, priceNum(entryPx), convRate);
  // السنت: عملة التسعير ⇒ USD ثم × 100 ⇒ USC، فيخرج كل مبلغ (pip، مخاطرة، هامش، ربح) بالسنت كرصيده
  const rate = cent ? centQuoteToAccount(riskRate) : riskRate;
  const pv = spec && rate != null ? pipValuePerLot(spec, rate) : null;
  const result =
    spec && pv != null && !slTooClose
      ? positionSize({
          balance: balanceNum,
          riskPct: riskNum,
          slPips: slNum,
          pipValuePerLot: pv,
          contractSize: spec.contractSize,
        })
      : null;

  /**
   * اتجاه الصفقة كما تستنتجه الحاسبة من موضع الوقف (وقف تحت الدخول = شراء) — **مصدر واحد** بدل
   * استنتاجه ثلاث مرّات بثلاثة مواضع (الخطة، وتسجيل الصفقة بالدفتر، والسطر المعروض). يكفيه الدخول
   * والوقف: الهدف لا يغيّر الاتجاه، فيظهر الاتجاه بمجرّد كتابة الرقمين لا بعد اكتمال الخطة.
   */
  const planSide = useMemo<TradeSide | null>(() => {
    const e = priceNum(entryPx);
    const sPx = priceNum(stopPx);
    if (!spec || ![e, sPx].every((v) => Number.isFinite(v) && v > 0) || e === sPx) return null;
    return sPx < e ? 'buy' : 'sell';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, entryPx, stopPx]);

  /**
   * خطة كاملة حين يُكتب الهدف أيضاً: الاتجاه من `planSide` أعلاه (موضع الوقف)، فلا يُسأل المتداول عن
   * شيء يعرفه رقمه أصلاً — لكنه يراه الآن مكتوباً. النتيجة: المخاطرة/العائد بالنقاط، R:R، والربح
   * المحتمل بعملة الحساب لحجم اللوت المحسوب نفسه.
   */
  const plan = useMemo(() => {
    const e = priceNum(entryPx);
    const sPx = priceNum(stopPx);
    const tPx = priceNum(targetPx);
    if (!spec || planSide == null || !Number.isFinite(tPx) || tPx <= 0) return null;
    return analyzePlan({ symbol: spec.symbol, side: planSide, entry: e, sl: sPx, tp: tPx });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, planSide, entryPx, stopPx, targetPx]);
  /**
   * أهداف جاهزة بالنسبة: المتداول يقرّر هدفه غالباً «1:2» لا بالسعر، فكان يحسب الرقم بيده من مسافة
   * الوقف ثم يكتبه. تظهر حين يكون الدخول والوقف صالحَين (اتجاه معروف، وقف ليس أضيق من pip) —
   * `targetAtRR` تقرّب بعيداً عن الدخول فالنسبة المكتوبة لا تقلّ عن المختارة أبداً.
   */
  const rrTargets = useMemo(() => {
    const e = priceNum(entryPx);
    const sPx = priceNum(stopPx);
    if (!spec || planSide == null || derivedSl == null || derivedSl < 1) return [];
    // الأساس = عملة الحساب ⇒ «1:2» بالمال كما يقرؤها سطر R:R (`moneyRewardRisk`): الخسارة بسعر تحويل الوقف والربح بـ1 ÷ الهدف.
    // الربح بـ1 ÷ الهدف أيّاً كان بُعده عن الحيّ (`targetQuoteToAccount`)؛ null فقط لمدخل غير صالح أو أساسٍ ليس عملة الحساب ⇒ المسافة وحدها
    const moneyStop = riskRate != null && spec.base === convAccount ? riskRate : null;
    return QUICK_RR.flatMap((rr) => {
      const plain = targetAtRR({ symbol: spec.symbol, side: planSide, entry: e, sl: sPx, rr });
      const money =
        moneyStop != null
          ? targetAtRR({ symbol: spec.symbol, side: planSide, entry: e, sl: sPx, rr, stopQuoteToAccount: moneyStop })
          : null;
      const tp =
        money != null && (typedExit != null || targetQuoteToAccount(spec, convAccount, money, convRate) != null)
          ? money
          : plain;
      return tp != null ? [{ rr, tp, text: formatPrice(tp, spec.symbol) }] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, planSide, derivedSl, entryPx, stopPx, riskRate, convAccount, convRate, typedExit?.rate]);
  /**
   * نقاطٌ مكتوبة ودخولٌ بلا سعر وقف: شريحتا «▲ شراء / ▼ بيع» بسعر الوقف لكلّ اتجاه (`stopsForPips`) —
   * المنصّة تطلب سعر الوقف لا النقاط، والاتجاه لا يُعرف هنا إلا من السعر. النقرة تكتب خانة سعر الوقف،
   * فيُشتقّ منها الاتجاه وشرائح الهدف وزرّ التسجيل؛ والنقاط المقروءة بعدها لا تقلّ عن المكتوبة (لوت لا يكبر).
   */
  const stopChoices =
    spec && stopPx.trim() === '' && !slFromPrices.current && !slTooClose && Number.isFinite(slTyped) && slTyped > 0
      ? stopsForPips({ symbol: spec.symbol, entry: priceNum(entryPx), pips: slTyped }).map((x) => {
          // الدخول ما زال السعر الحيّ الوسطي كما عُبّئ: الشريحة تقيس من سعر جهتها وتنقل الدخول إليه عند النقر
          // (`liveStopChip`) — فالسعر المكتوب عليها هو ما يُكتب بالخانة، و«20 pip» تبقى 20
          const f = liveFillRef.current;
          const live =
            f && f.symbol === spec.symbol && entryPx.trim() === f.text
              ? liveStopChip({ symbol: f.symbol, side: x.side, pips: slTyped, q: f.q })
              : null;
          const price = live ? live.stop : x.price;
          return {
            side: x.side,
            price,
            text: formatPrice(price, spec.symbol),
            entryText: live ? formatPrice(live.entry, spec.symbol) : null,
          };
        })
      : [];
  const targetNum = priceNum(targetPx);
  /** الهدف بالجهة الخطأ (فوق الدخول ببيع/تحته بشراء) — خطأ كتابة شائع، يُقال صراحةً بدل تجاهل الهدف */
  const targetWrongSide = plan?.issue === 'tpWrongSide';
  const lots = result && !result.belowMinLot ? result.lots : null;
  // لوت السنت/micro بحدّه (200): 125 لوت سنت = 1.25 لوت عادي ليست «أكبر من أقصى أمر»
  const overOrderMax = lotsOverOrderMax(result, small != null);
  /**
   * المخاطرة الفعلية بنسبةٍ من الرصيد: للّوت المحسوب (التقريب للأسفل يجعلها أقل من المطلوبة)، ولأصغر
   * لوت حين يخرج الحجم تحته — «0.01 lot = 3.00 USD · 6.00%» هو ما يحتاج أن يراه قبل أن يفتح أصغر لوت
   * ظنّاً أنه الأقرب لنسبته. راجع `riskForLots`.
   */
  const actualRiskOf = (l: number) =>
    pv != null ? riskForLots({ lots: l, slPips: slNum, pipValuePerLot: pv, balance: balanceNum }) : null;
  const actualNow = lots != null ? actualRiskOf(lots) : null;
  const minLotRisk = result?.belowMinLot ? actualRiskOf(LOT_STEP) : null;
  /** تسجيل الخطة بالدفتر جارٍ / نتيجته — نقرة واحدة بدل إعادة كتابة الأرقام الأربعة بلوحة الدفتر */
  const [logBusy, setLogBusy] = useState(false);
  /** `earlier`: سُجِّلت خطةٌ **سابقة** (تغيّرت أثناء الطلب) — الرسالة تقول ما حُفظ والزرّ يبقى متاحاً للخطة الجديدة */
  const [logMsg, setLogMsg] = useState<{ ok: boolean; text: string; earlier?: boolean } | null>(null);
  const logDone = logMsg?.ok === true && !logMsg.earlier;
  // تغيّر أي رقم بالخطة يمسح رسالة التسجيل ويتيح الزر من جديد — وبقاؤها يمنع نقرة ثانية تُنشئ صفقة مكرّرة
  // والسبريد والعمولة كذلك: كلاهما يُكتب بملاحظة الصفقة (`planJournalNote`)، فتعديلهما بعد التسجيل كان
  // يترك «سُجِّلت» والزرّ معطّلاً — لا تُسجَّل الخطة بتكاليفها المصحَّحة إلا بتغيير رقم آخر ثم إرجاعه.
  // وسعر التحويل اليدوي كذلك: هو قيمة النقطة نفسها (`rate` ⇒ `pv` ⇒ اللوت)، فتصحيح «1.05» إلى «1.50» بعد
  // التسجيل كان يغيّر اللوت على الشاشة بينما الزرّ معطّل والدفتر يحفظ اللوت الخاطئ.
  // **واللوت نفسه** (`lots`): سعر التحويل المجلوب يتجدّد بصمت كل دقيقة — USDJPY بحساب دولار، 1% من 10,000 بوقف
  // 20 pip: 150.00 ⇒ 0.75، والتجديد 149.99 ⇒ 0.74 — فكانت الشاشة تقول 0.74 تحت «سُجِّلت» والدفتر يحفظ 0.75. اللوت
  // لا السعر: تجديدٌ لا يغيّر اللوت لا يُعيد الزرّ (نقرة ثانية = صفقة مكرّرة).
  useEffect(() => {
    planGenRef.current += 1;
    setLogMsg(null);
  }, [symbol, account, balance, centBalance, riskPct, slPips, entryPx, stopPx, targetPx, spread, commission, manualConv, lots]);
  // السعر المجلوب يخصّ رمزاً واحداً ولحظة واحدة: تبديل الأداة يُسقط الرسالة (وإلا بقي «الدخول = ‎1.0850»
  // معروضاً تحت زوج آخر)
  useEffect(() => {
    setLivePxMsg(null);
  }, [symbol]);
  // وكذلك دخولٌ كُتب باليد بعد التعبئة: «✓ الدخول من السعر الحالي 1.0850» كان يبقى تحت دخولٍ آخر كتبه المتداول
  useEffect(() => {
    const f = liveFillRef.current;
    if (f && entryPx.trim() === f.text) return;
    setLivePxMsg(null);
  }, [entryPx]);
  // وأسعار الدخول/الوقف/الهدف كذلك: شريحة USDJPY تحت دخول EURUSD ‎1.0850 ووقفه ‎1.0830 كانت تُبقيهما فيُقرآن
  // 0.2 pip بحجم نقطة الين (لوت هائل)، وGBPUSD تحسب «20 pip» من سعرين لا يخصّانها وتسجّلهما بالدفتر. تُمسح
  // عند الانتقال من أداة **معروفة** إلى أخرى فقط — مرور الخانة برمز ناقص أثناء الكتابة («EURUS») لا يمسح شيئاً،
  // ولاحقة الوسيط («EURUSD.m») الأداة نفسها. النقاط المكتوبة يدوياً تبقى (مسافة لا سعر)؛ المشتقّة من السعرين
  // تُمسح معهما (`derivedSl` ⇒ null) — والمكتوبة يدوياً تُمسح بين صنفين (فوركس ⇄ ذهب ⇄ فضة، `slPipsCarryOver`).
  const lastSpecRef = useRef<InstrumentSpec | null>(spec ?? null);
  useEffect(() => {
    if (spec == null) return;
    const prev = lastSpecRef.current;
    lastSpecRef.current = spec;
    if (prev == null || prev.symbol === spec.symbol) return;
    if (!slFromPrices.current && !slPipsCarryOver(prev, spec)) setSlPips('');
    // والسبريد: سبريد EURUSD (0.8) على GBPJPY أو الذهب رقمٌ لا يخصّها. هنا لا بمؤثّر مستقلّ — ذاك كان يمسحه
    // حين تمرّ الخانة برمز ناقص («EURUS» ثم «EURUSD») فيختفي سطر التكاليف والأسعار باقية.
    setSpread('');
    setEntryPx('');
    setStopPx('');
    setTargetPx('');
    // `spec` يُقرأ لحظة تبدّل الرمز فقط: لاحقة الوسيط تنشئ كائناً جديداً للأداة نفسها
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec?.symbol]);
  /**
   * المخاطرة شاملة السبريد للّوت المحسوب، وأكبر لوت يُبقيها ضمن النسبة — راجع `spreadRisk`. اللوت
   * الرئيسي يبقى من الوقف وحده (ما يكتبه كل مرجع وكل منصّة)، والسطر يقول الفرق وما العمل.
   */
  const typedSpreadPips = parseSpreadPips(spread, spec);
  /** وقفٌ ليس أبعد من السبريد المكتوب: يُضرب لحظة الفتح — راجع `stopInsideSpread` */
  const slInsideSpread = stopInsideSpread(slNum, typedSpreadPips);
  /**
   * ولخانة السبريد الفارغة: وقفٌ داخل السبريد **المعتاد** للأداة («50» على USDZAR) — راجع `stopInsideTypicalSpread`. النصّ
   * `riskCalcStopInsideTypicalSpread` (launch، `3a1b36d`).
   */
  const slInsideTypical = stopInsideTypicalSpread(slNum, spec, spread);
  // الدخول ما زال Ask/Bid اللقطة الحيّة (نصّ التعبئة حرفياً وللأداة نفسها): السبريد داخل مسافة الوقف والهدف أصلاً،
  // فلا يُضاف إلا ما يزيد به سبريد الوسيط المكتوب على سبريد اللقطة — راجع `spreadBeyondLiveEntry`
  const liveFill = liveFillRef.current;
  const liveQ = liveFill && spec && liveFill.symbol === spec.symbol && entryPx.trim() === liveFill.text ? liveFill.q : null;
  const spreadPips =
    typedSpreadPips != null && spec
      ? spreadBeyondLiveEntry({ spreadPips: typedSpreadPips, spec, entry: priceNum(entryPx), stop: priceNum(stopPx), q: liveQ })
      : typedSpreadPips;
  /** بعملة الحساب لكل لوت — تُضاف × اللوت داخل `spreadRisk`؛ سطرٌ واحد «شاملة التكاليف» حين تكون موجبة */
  const commissionPerLot = parseCommission(commission, moneyCcy);
  // خانةٌ مرفوضة = صفر هنا (رسالتها تحتها) ولا تُسقط الأخرى من السطر — راجع `costsForRisk`
  const costs = costsForRisk(spreadPips, commissionPerLot);
  const withSpread =
    lots != null && pv != null && spec
      ? spreadRisk({
          lots,
          slPips: slNum,
          spreadPips: costs.spreadPips,
          pipValuePerLot: pv,
          balance: balanceNum,
          riskPct: riskNum,
          contractSize: spec.contractSize,
          commissionPerLot: costs.commissionPerLot,
        })
      : null;
  /**
   * تحت سطر التكاليف: اللوت الأصغر الذي يُبقي النسبة المكتوبة («شاملة السبريد» أو «شاملة التكاليف» حين
   * تدخل العمولة — الأولى كانت تُقال عن عمولة)، أو تحذير «أصغر لوت يتجاوز ما حدّدتَه» حين تبتلع التكاليف
   * المخاطرة كلّها — كان السطر يسكت حينها و«0.01 lot» فوقه تُقرأ ضمن النسبة. راجع `costsLotsAdvice`.
   */
  const costsAdvice = costsLotsAdvice(lots, withSpread);
  /**
   * حدّ الخسارة اليومي: المتّسع من رصيد بداية اليوم، بمخاطرة هذه الصفقة **شاملة التكاليف** حين تُكتب (ما يخسره الوقف فعلاً).
   * خانة خسارة اليوم الفارغة = 0؛ رقم مرفوض فيها أو بالحدّ ⇒ لا سطر، وخطؤه تحت خانته (`dailyFieldErr`). راجع `dailyLossRoom`.
   */
  /** بدأ يوم تداول جديد منذ كُتبت (17:00 نيويورك، قرار ٨) ⇒ 0 من هذه اللحظة، قبل أن يُفرغها المؤثّر أدناه */
  const lostExpired = lostEnteredDayRef.current != null && lostEnteredDayRef.current !== tradingDayKey(new Date());
  /** وبعملةٍ غير عملة المال الآن ⇒ فارغة (0) كذلك حتى من قبل أن يُفرغها المؤثّر أدناه */
  const lostTodayNow = lostExpired ? '' : lostTodayInCcy(lostToday, lostCcy, moneyCcy);
  useEffect(() => {
    if (lostToday.trim() === '') return;
    const id = setInterval(() => setDayTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, [lostToday]);
  useEffect(() => {
    if (!lostExpired) return;
    lostEnteredDayRef.current = null;
    setLostToday('');
    setLostCcy(null);
  }, [lostExpired, dayTick]);
  useEffect(() => {
    if (lostToday === '') return;
    // حفظٌ أقدم بلا عملة: تُنسب لعملة المال التي فتحت عليها اللوحة
    if (lostCcy == null) setLostCcy(moneyCcy);
    else if (lostTodayNow !== lostToday) setLostToday(lostTodayNow);
  }, [lostToday, lostCcy, moneyCcy, lostTodayNow]);
  /** أُفرغت لأنها بعملةٍ أخرى ⇒ سطر «أعد كتابتها» بدل خانة فارغة بلا سبب (launch169a) */
  const lostOtherCcy = lostTodayOtherCcy(lostCcy, moneyCcy);
  // «-300» كما في سجلّ المنصّة و«$300» بعلامة عملة الحساب مقبولتان — راجع `parseLostToday`
  const lostTodayNum = parseLostToday(lostTodayNow, moneyCcy);
  const dailyLimitNum = parseDecimal(dailyLimit, { percent: true });
  /**
   * رقمٌ مرفوض بخانتَي الحدّ اليومي كان يُخفي السطر كلّه **بصمت** — ومعه «هذه الصفقة وحدها تتخطّى حدّك» — وكل خانة أخرى
   * تقول خطأها تحتها. الآن كذلك: عملةٌ أخرى ⇒ عملة الحساب، «٬» ⇒ أيّهما للكسر، وإلا «رقم غير مفهوم» باسم الخانة.
   */
  const dailyFieldErr = (label: string, raw: string, bad: boolean, money: boolean) =>
    !bad || raw.trim() === ''
      ? null
      : money && moneyInOtherCurrency(raw, moneyCcy)
        ? t.riskCalcOtherCcyHint
            .replace('{field}', () => shortLabel(label))
            .replace('{value}', () => raw.trim())
            .split('{ccy}')
            .join(moneyCcy)
        : misplacedArabicThousandsSign(raw, money ? { amount: true } : { percent: true })
          ? `${t.riskCalcBadFieldValue.replace('{field}', () => shortLabel(label)).replace('{value}', () => raw.trim())}: ${t.arabicThousandsSignHint}`
          : `${t.riskCalcBadFieldValue.replace('{field}', () => shortLabel(label)).replace('{value}', () => raw.trim())}: ${t.invalidNumberHint}`;
  const dailyLimitErr = dailyFieldErr(t.riskCalcDailyLimit, dailyLimit, dailyLimitNum == null, false);
  const lostTodayErr = dailyFieldErr(t.riskCalcLostToday, lostTodayNow, lostTodayNum == null, true);
  const dailyRoom =
    result && lots != null && dailyLimitNum != null && lostTodayNum != null
      ? dailyLossRoom({
          balance: balanceNum,
          limitPct: dailyLimitNum,
          lostToday: lostTodayNum,
          riskAmount: withSpread?.risk ?? result.actualRisk,
          riskNoCosts: result.actualRisk,
        })
      : null;
  /** عند التخطّي: أكبر لوت يتّسع لما بقي، بتكاليفه — راجع `dailyRoomMaxLots` */
  const dailyFitLots =
    dailyRoom?.breach && pv != null
      ? dailyRoomMaxLots({
          room: dailyRoom.room,
          slPips: slNum,
          pipValuePerLot: pv,
          spreadPips: costs.spreadPips,
          commissionPerLot: costs.commissionPerLot,
        })
      : null;
  /** «(+1.5 pip + 7.00 USD/lot)» — ما دخل السطر فعلاً، كي لا تُقرأ المخاطرة الأعلى بلا سبب ظاهر */
  const costParts = [
    spreadPips ? `${spreadPips} ${pipUnit(lang)}` : null,
    commissionPerLot ? `${formatMoney(commissionPerLot, moneyCcy)}/${LOT_UNIT}` : null,
  ].filter(Boolean);
  /**
   * الهامش المحجوز للّوت المحسوب — من سعر الدخول المكتوب (القيمة الاسمية تحتاج سعراً، ولا يُختلق من
   * سعر التحويل). بنسبةٍ من الرصيد: «542.50 USD (54%)» يقول قبل النقر إن الصفقة تأكل نصف الحساب
   * هامشاً، وفوق 100% لا تُفتح أصلاً. راجع `requiredMargin`.
   */
  const leverageNum = parseLeverage(leverage);
  /**
   * بلا دخول مكتوب يُجلب سعر السوق للأداة مرّة (لكل رمز) كي يظهر سطر الهامش لمن يحسب من النقاط وحدها —
   * وهو أغلب الاستعمال، وهو بالضبط من يُفاجأ بهامش لا يتّسع له حسابه. لا طلب إلا حين يلزم السطر فعلاً
   * (رافعة مكتوبة وحجم محسوب)، واقتباس بذري تجريبي لا يُستعمل (`isRealQuote`). السعر يُكتب بالسطر
   * «@ 1.08510» كي لا يُظنّ دخولاً مكتوباً — راجع `marginPrice`.
   */
  const [mktQuote, setMktQuote] = useState<{
    sym: string;
    price: number;
    bid?: number | null;
    ask?: number | null;
    /** قيمة `mktRefresh` حين جُلب — أقدم منها ⇒ يُعاد الجلب بصمت */
    refresh: number;
    /** وقت الجلب (ms) — راجع `marginQuoteUsable` */
    at: number;
    /** عمر السعر نفسه (`as_of`، ms) — آخر إغلاق 15m عند تعثّر المزوّد أقدم من الجلب */
    asOfMs: number;
    /** `market_open: false` — يُوسَم «مغلق» بسطر الهامش */
    closed: boolean;
  } | null>(null);
  const entryTyped = Number.isFinite(priceNum(entryPx)) && priceNum(entryPx) > 0;
  const needMarketPx = spec != null && !entryTyped && leverageNum != null && lots != null;
  const mktSym = needMarketPx ? spec!.symbol : null;
  /**
   * **يتجدّد كل 60 ث** كسعر التحويل: كان يُجلب مرّة لكل رمز، واللوحة تُترك مفتوحة جلسةً — والهامش ونسبته
   * و«أكبر لوت يتّسع له الرصيد» كلّها من هذا السعر. التحديث صامت: السعر القديم يبقى معروضاً حتى يصل
   * الجديد، والفشل يُبقيه ولا يوقف التالي (المؤقّت يُعاد تسليحه مع العدّاد لا مع النجاح).
   */
  const [mktRefresh, setMktRefresh] = useState(0);
  useEffect(() => {
    if (!mktSym || !active) return;
    const id = setTimeout(() => setMktRefresh((n: number) => n + 1), 60_000);
    return () => clearTimeout(id);
  }, [mktSym, mktRefresh, active]);
  /**
   * المؤقّت يقف ما دام الدخول مكتوباً (لا حاجة لسعر السوق)، فالعدّاد يقف معه: مسحُ الدخول بعد ساعة كان يعيد
   * الهامش ونسبته و«أكبر لوت» فوراً من سعرٍ عمره ساعة موسوماً «@» كأنه حيّ، حتى التحديث التالي بعد 60 ث.
   * الآن كل فترة بلا حاجة تُقدِّم العدّاد ⇒ عودة الحاجة تعيد الجلب فوراً.
   */
  useEffect(() => {
    if (!mktSym) setMktRefresh((n: number) => n + 1);
  }, [mktSym]);
  const haveMktSym = mktQuote != null && mktQuote.sym === mktSym;
  const haveMkt = haveMktSym && mktQuote!.refresh === mktRefresh;
  useEffect(() => {
    if (!mktSym || haveMkt) return;
    let alive = true;
    const refresh = mktRefresh;
    const id = setTimeout(() => {
      api.marketQuote(mktSym).then(
        (q) => {
          if (!alive || !mountedRef.current || !isRealQuote(q)) return;
          const now = Date.now();
          setMktQuote({
            sym: mktSym,
            price: q.price,
            bid: q.bid,
            ask: q.ask,
            refresh,
            at: now,
            asOfMs: quoteAsOfMs((q as { as_of?: unknown }).as_of, now, clockOffsetMs()),
            closed: quoteMarketOpen(q) === false,
          });
        },
        () => {
          /* بلا سعر لا سطر هامش — كما قبل؛ وبالتحديث يبقى آخر سعر ناجح */
        }
      );
    }, haveMktSym ? 0 : 600);
    return () => {
      alive = false;
      clearTimeout(id);
    };
    // haveMktSym خارج التبعيات عمداً: يتغيّر مع وصول السعر نفسه، ولا يغيّر إلا مهلة الطلب الأول
  }, [mktSym, haveMkt, mktRefresh]);
  /**
   * سبريد مقبول يطابق سعر الزوج («8.45» على ZARJPY) — سؤال لا رفض، والحساب كما هو (launch146). المرجع: الدخول/الوقف/الهدف
   * المكتوب، وإلا سعر السوق المجلوب للهامش (أغلب الاستعمال بالنقاط وحدها) — تقادمه لا يهمّ بسماحية 5%.
   */
  const spreadPriceWarn =
    !spreadErr &&
    spec &&
    spreadMaybePrice(spread, spec, [
      priceNum(entryPx),
      priceNum(stopPx),
      priceNum(targetPx),
      mktQuote && mktQuote.sym === spec.symbol ? mktQuote.price : NaN,
    ])
      ? t.riskCalcSpreadMaybePrice.replace('{n}', () => spread.trim()).split('{symbol}').join(spec.symbol)
      : null;
  const marginPx = marginPrice({
    entry: priceNum(entryPx),
    // وأثناء إعادة الجلب لا يُستعمل سعرٌ أقدم من دقيقتين (فشلٌ متكرّر، أو عودة بعد فترة بلا حاجة)
    quote:
      spec &&
      mktQuote &&
      mktQuote.sym === spec.symbol &&
      marginQuoteUsable({ fetchedAt: mktQuote.at, asOfMs: mktQuote.asOfMs, closed: mktQuote.closed }, Date.now())
        ? mktQuote
        : null,
    side: planSide,
  });
  /** الأساس = عملة الحساب ⇒ الهامش بلا سعر (أمرٌ معلّق بعيد عن السوق كان ينحرف بنسبة الدخول/الحيّ) — `marginBaseToAccount` */
  const marginBase = marginBaseToAccount(spec, convAccount, cent);
  const margin =
    spec && rate != null && lots != null && leverageNum != null && marginPx
      ? requiredMargin({ spec, lots, price: marginPx.price, quoteToAccount: rate, leverage: leverageNum, baseToAccount: marginBase })
      : null;
  const marginPct = margin != null && Number.isFinite(balanceNum) && balanceNum > 0 ? (margin / balanceNum) * 100 : null;
  /** الهامش يتجاوز الرصيد: لا تتّسع له الصفقة (أو تُغلق بأول تذبذب) — يُكتب بلون التحذير */
  const marginOver = marginPct != null && marginPct >= 100;
  /** وحين يتجاوز: أكبر لوت يتّسع له الرصيد كلّه هامشاً — حدٌّ أعلى لا توصية (الهامش الحرّ صفر عنده) */
  const marginMaxLots =
    marginOver && spec && rate != null && leverageNum != null
      ? maxLotsForMargin({
          spec,
          available: balanceNum,
          price: marginPx!.price,
          quoteToAccount: rate,
          leverage: leverageNum,
          baseToAccount: marginBase,
        })
      : null;
  /** الربح المحتمل من المسافة الخام للهدف لا من نقاطه المقرَّبة للعرض — راجع `profitAtTarget` */
  // بلا حيّ (`typedExit`): الربح بسعر الهدف نفسه، 1 ÷ الهدف — لا يُقرأ بسعر الوقف
  const targetUsdRate =
    typedExit != null
      ? typedExitQuoteToAccount(spec, convAccount, priceNum(targetPx), NaN, NaN)?.rate ?? null
      : targetQuoteToAccount(spec, convAccount, priceNum(targetPx), convRate);
  /** الأساس = عملة الحساب ⇒ الربح يُحوَّل بسعر الهدف كما الخسارة بسعر الوقف */
  const targetRate = targetUsdRate != null && cent ? centQuoteToAccount(targetUsdRate) : targetUsdRate;
  const potentialProfit =
    plan?.ok && spec && rate != null && lots != null
      ? profitAtTarget({ spec, entry: priceNum(entryPx), target: priceNum(targetPx), lots, quoteToAccount: targetRate ?? rate })
      : null;
  /**
   * الربح وR:R بعد السبريد والعمولة — الإجمالي فوقه يعد بـ1:2 والصفقة بتكاليفها 1:1.7، وسكالبينغ 5/5
   * بعمولة 7 نصف ما يبدو. null = لا سبريد ولا عمولة (السطر الإجمالي يكفي). راجع `profitAfterCosts`.
   */
  const netAfterCosts =
    potentialProfit != null && withSpread && lots != null && pv != null
      ? profitAfterCosts({
          grossProfit: potentialProfit,
          lots,
          spreadPips: costs.spreadPips,
          // السبريد على صفقةٍ تُغلق عند الهدف يُسوّى بسعر **الهدف** كالربح الإجمالي بجانبه (`pv` بسعر الوقف — صحيح لـ`spreadRisk`
          // وحدها): USDJPY 150/149/153 بحساب دولار، سبريد 2، 0.14 لوت ⇒ 1.83 لا 1.88؛ USDTRY سبريد 1000 ⇒ 13.95 لا 17.91
          pipValuePerLot: spec ? pipValuePerLot(spec, targetRate ?? rate!) : pv,
          commissionPerLot: costs.commissionPerLot,
          riskWithCosts: withSpread.risk,
        })
      : null;

  /** R:R بالمال: الأساس = عملة الحساب ⇒ الخسارة بسعر الوقف والربح بسعر الهدف (USDJPY 1:2.0 مسافةً = 1:1.96 مالاً) — `moneyRewardRisk` */
  const planRR = plan?.ok ? moneyRewardRisk(plan.rr, rate, targetRate ?? rate) : null;
  const lowWarn = plan?.ok ? lowRewardWarning(planRR, netAfterCosts) : null;
  // الصافية حين تُكتب التكاليف: التعادل الحقيقي بعد السبريد والعمولة — راجع `breakevenRR`
  const breakevenPct = breakevenWinRatePct(breakevenRR(planRR, netAfterCosts));
  /** نصف المركز عند 1R والباقي للهدف — على خطوة اللوت الفعلية (0.05 ⇒ 0.03/0.02). راجع `scaleOutHalfAtOneR` */
  const scaleOut = potentialProfit != null ? scaleOutHalfAtOneR(lots, planRR) : null;

  /**
   * **لا تسجيل بوقفين مختلفين.** مع `slMismatch` يُحسب اللوت من النقاط المكتوبة يدوياً بينما يُحفظ
   * بالدفتر سعر الوقف — فإن كانت النقاط أضيق من مسافة السعرين (15 مكتوبة، 25 بين السعرين) سُجِّلت صفقةٌ
   * **بلوتٍ أكبر مما يحتمله وقفها المحفوظ**: 1% مكتوبة تصير 1.67% فعلاً، والدفتر يعرض بعدها «المخاطرة
   * 25 pip (…)» بمال أكبر مما قالته الحاسبة. التحذير أعلاه كان يقول ذلك ثم يترك الزرّ يسجّل. الآن الزرّ
   * معطَّل وسببه تحته، ويعود بمجرّد أن يتطابق الرقمان (تعديل النقاط أو أحد السعرين).
   */
  /**
   * «25» بخانة سعر الوقف أو «50» بخانة الهدف: نقاطٌ لا سعر (`levelLooksLikePips`). الوقف كان يملأ خانة النقاط بـ239,150 pip
   * (لوت 0.00 بلا سبب مفهوم)؛ والهدف يعطي «R:R 1:1960» و«سجّل الخطة» تحفظ هدفاً عند 50.00. نقرة السطر: رقم الوقف ينتقل
   * لخانة النقاط (رقمُ نقاطٍ لا يقول الاتجاه)، والهدف يُكتب سعراً على تلك المسافة بجهة الربح. التسجيل يُمنع حتى يُصحَّح.
   */
  const pipsInPx = ((): { msg: string; apply: () => void; field: string; value: string; hard?: boolean } | null => {
    if (!spec) return null;
    const e = priceNum(entryPx);
    /**
     * **الدخول بلا فاصلة** يسبق (tools102a، `entryLooksLikeDecimalSlip`): دخول «10850» لـEURUSD ووقف 1.0820 كان يُقرأ «الوقف 1.082 pip؟»
     * ونقرته تنقل 1.082 لخانة النقاط ⇒ وقف 1.08 pip ولوت أكبر ×20 من المقصود (1,000$ بـ1% ووقف 25 ⇒ 9.24 لوت بدل 0.40). النقرة هنا
     * تكتب الدخول المقصود، والتسجيل يُمنع بلا ضغطة ثانية (`hard`).
     */
    const slip = entryLooksLikeDecimalSlip({ symbol: spec.symbol, entry: e, levels: [priceNum(stopPx), priceNum(targetPx)] });
    if (slip) {
      const text = formatPrice(slip.price, spec.symbol);
      return {
        msg: entryDecimalSlipText(t.journalEntryDecimalSlip, entryPx, text),
        field: shortLabel(t.riskCalcEntry),
        value: entryPx.trim(),
        hard: true,
        apply: () => {
          playSoftClick();
          setEntryPx(text);
        },
      };
    }
    /**
     * **وقف/هدف بلا فاصلة** (tools104a، `levelLooksLikeDecimalSlip`): شراء EURUSD على 1.0850 بهدف «10900» كان «R:R 1:9800» و«سجّل
     * الخطة» تحفظه، ووقف «10880» لوتاً 0.00 بلا سبب ويُحفظ وقفاً عند 10880. النقرة تكتب السعر المقصود، والتسجيل ممنوع (`hard`).
     * قراءة النقاط للوقف تسبق («11» على EURUSD: 11 pip أرجح من 1.1، ونقرتها تنقله لخانة النقاط)، لكنها لا تُتجاوز إن كان الهدف بلا فاصلة.
     */
    const slipAt = (raw: string, label: string, set: (v: string) => void) => {
      // بلا دخول (النقاط وحدها): المرجع سعر الأداة التقريبي — وقف «1500» على USDJPY بلا سعر تحويل كان بلا لوت ولا سبب (`priceDecimalSlip`)
      const noEntryPx = Number.isFinite(e) && e > 0 ? null : priceDecimalSlip(spec, priceNum(raw));
      const hit =
        levelLooksLikeDecimalSlip({ symbol: spec.symbol, entry: e, level: priceNum(raw) }) ??
        (noEntryPx != null ? { price: noEntryPx } : null);
      if (!hit) return null;
      const text = formatPrice(hit.price, spec.symbol);
      return {
        msg: levelLooksLikePipsText(t.journalLevelDecimalSlip, label, raw, '', text),
        field: label,
        value: raw.trim(),
        hard: true,
        apply: () => {
          playSoftClick();
          set(text);
        },
      };
    };
    const stopSlip = slipAt(stopPx, shortLabel(t.riskCalcStop), setStopPx);
    const targetSlip = slipAt(targetPx, shortLabel(t.riskCalcTarget), setTargetPx);
    const stopAt = (side: TradeSide) =>
      levelLooksLikePips({ symbol: spec.symbol, side, entry: e, level: priceNum(stopPx), kind: 'sl' });
    const asStop = stopAt('buy') ?? stopAt('sell');
    if (asStop) {
      return {
        hard: targetSlip != null,
        // نصّ launch88: يقول ما الخطأ وأن السطر يُلمس — بدل «سعر الوقف «25» → وقف الخسارة 25?»
        msg: t.riskCalcStopPxLooksLikePips.replace('{value}', () => stopPx.trim()),
        field: shortLabel(t.riskCalcStop),
        value: stopPx.trim(),
        apply: () => {
          playSoftClick();
          setStopPx('');
          onSlPipsChange(String(asStop.pips));
        },
      };
    }
    if (stopSlip) return stopSlip;
    if (targetSlip) return targetSlip;
    if (planSide == null) return null;
    const asTarget = levelLooksLikePips({ symbol: spec.symbol, side: planSide, entry: e, level: priceNum(targetPx), kind: 'tp' });
    if (!asTarget) return null;
    const text = formatPrice(asTarget.price, spec.symbol);
    return {
      msg: levelLooksLikePipsText(t.levelLooksLikePipsHint, shortLabel(t.riskCalcTarget), targetPx, asTarget.pips, text),
      field: shortLabel(t.riskCalcTarget),
      value: targetPx.trim(),
      apply: () => {
        playSoftClick();
        setTargetPx(text);
      },
    };
  })();
  /**
   * «نقاطٌ بخانة سعر» لا تُعطّل الزرّ: الضغطة الأولى تمنع التسجيل وتقول لماذا، والثانية **على القيم نفسها** تسجّل السعر كما كُتب —
   * كالدفتر (`TradeJournalPanel` `pipsOverrideRef`). كان المنع بلا مخرج: بيع فضة من 110 بهدف «85» (سعرٌ حقيقي بعد هبوط يناير
   * 2026) أو شراء ذهب من 4000 بوقف «3000» لا يُسجَّل إلا بالسعر الخاطئ المقترح — ونقرة سطر الوقف تنقل «85» لخانة النقاط
   * (وقف 0.85$ بدل 25$ ⇒ لوت أكبر ×29).
   */
  const pipsOverrideRef = useRef<{ key: string; at: number } | null>(null);
  /**
   * التسجيل جارٍ — **متزامن**: `logBusy` حالةٌ لا تصل للضغطة الثانية قبل إعادة الرسم، فنقرٌ مزدوج سريع على الزرّ كان يرسل
   * `createTrade` مرّتين ⇒ صفقتان مفتوحتان بالدفتر (مخاطرة مفتوحة مضاعفة وإحصاءات مكرّرة).
   */
  const logInFlightRef = useRef(false);
  const pipsKey = pipsInPx ? `${symbol}\u0001${entryPx}\u0001${stopPx}\u0001${targetPx}` : null;
  const logBlocked = slMismatch != null;

  /**
   * «سجّل الخطة بالدفتر»: الأرقام هنا (رمز/دخول/وقف/هدف) هي نفسها التي يطلبها الدفتر — إعادة كتابتها
   * يدوياً كانت أكثر خطوة مملّة ومَظنّة خطأ. تُسجَّل صفقة **مفتوحة** (بلا خروج) بحجم اللوت المحسوب
   * وملاحظة مختصرة، والاتجاه من موضع الوقف. لا يظهر الزر إلا بخطة صالحة وحجم لوت محسوب.
   */
  const logPlanToJournal = async () => {
    const e = priceNum(entryPx);
    const sPx = priceNum(stopPx);
    const tPx = priceNum(targetPx);
    if (!spec || !plan?.ok || planSide == null || lots == null || logInFlightRef.current || logBusy || logDone || logBlocked) return;
    if (pipsInPx?.hard) {
      setLogMsg({ ok: false, text: pipsInPx.msg });
      return;
    }
    // كالدفتر (`saveOverrideAccepted`): الضغطة الثانية تُقبل تأكيداً بعد ≥600ms فقط — نقرٌ مزدوج كان يسجّل «85» سعراً قبل أن يُقرأ التحذير
    const armed = pipsOverrideRef.current;
    const now = Date.now();
    if (pipsInPx && pipsKey != null && !saveOverrideAccepted(armed, pipsKey, now)) {
      if (armed?.key !== pipsKey || now < armed.at) pipsOverrideRef.current = { key: pipsKey, at: now };
      setLogMsg({
        ok: false,
        text: t.levelLooksLikePipsSaveBlocked.replace(/\{(field|value|button)\}/g, (_, k: string) =>
          k === 'button' ? t.riskCalcLogToJournal : k === 'field' ? pipsInPx.field : pipsInPx.value
        ),
      });
      return;
    }
    // لوت السنت/micro يُسجَّل **برمزه** («EURUSDC»): تحت «EURUSD» كان الدفتر سيحسب مالها بعقد الحساب العادي (×100)
    const logSymbol = small ? journalSymbol(symbol) : spec.symbol;
    if (!logSymbol) return;
    logInFlightRef.current = true;
    setLogBusy(true);
    setLogMsg(null);
    const gen = planGenRef.current;
    try {
      await api.createTrade({
        symbol: logSymbol,
        side: planSide,
        entry: e,
        sl: sPx,
        tp: tPx,
        size: lots,
        // الأرقام هي المقصودة، والكلمات بلغة الواجهة (المخاطرة/السبريد/العمولة/R:R الصافي) — «lot» علامةٌ يقرؤها الدفتر.
        // والسبريد إن كُتب — ليجده المتداول حين يراجع لماذا خسر أكثر من نقاط وقفه
        note: planJournalNote({
          words: { risk: t.planRiskWord, spread: t.termSpreadWord, commission: t.planNoteCommission, netRR: t.planNoteNetRR },
          lots,
          risk: result ? result.actualRisk : null,
          ccy: moneyCcy,
          rr: formatRR(planRR),
          spreadPips: parseSpreadPips(spread, spec),
          commissionPerLot: parseCommission(commission, moneyCcy),
          netRR: netAfterCosts ? formatRR(netAfterCosts.rr) : null,
        }),
      });
      if (!mountedRef.current) return;
      // الخطة تغيّرت أثناء الطلب (هدفٌ عُدِّل قبل الردّ، أو تجديد سعر التحويل الصامت غيّر اللوت): المسجَّل هو الخطة
      // القديمة — «سُجِّلت» والزرّ المعطَّل تحت الجديدة كانا يقولان إن هذه حُفظت، فالزرّ يبقى متاحاً للجديدة. لكن **الصمت**
      // كان أسوأ: صفقةٌ حُفظت بلا أيّ خبر والزرّ متاح ⇒ نقرة ثانية = صفقة مكرّرة. الرسالة تقول ما حُفظ فعلاً (لوته).
      if (planGenRef.current !== gen) {
        setLogMsg({ ok: true, earlier: true, text: `${t.riskCalcLoggedToJournal} · ${formatJournalLots(lots)} lot` });
        return;
      }
      setLogMsg({ ok: true, text: t.riskCalcLoggedToJournal });
    } catch {
      if (mountedRef.current) setLogMsg({ ok: false, text: t.riskCalcLogFailed });
    } finally {
      logInFlightRef.current = false;
      if (mountedRef.current) setLogBusy(false);
    }
  };

  /**
   * «الدخول = السعر الحالي»: المتداول يخطّط حول السعر الذي أمامه على الشارت، وكتابته يدوياً من الشارت
   * إلى الحاسبة أكثر خطوة يخطئ فيها (رقم ناقص = حجم لوت خاطئ). الجهة تُستنتج من موضع الوقف إن كُتب
   * (وقف تحت السعر = شراء → Ask، وهو ما يُنفَّذ عليه فعلاً)، وبلا وقف يُستخدم السعر الوسطي.
   * اقتباس بذري تجريبي لا يُستخدم أبداً (`isRealQuote`) — حجم مركز من سعر مختلَق أخطر من لا شيء.
   */
  // الدخول عُبّئ بالسعر الوسطي قبل كتابة الوقف (لا جهة بعد)، أو انتقل الوقف لجهة السعر الأخرى: ما دامت الخانة
  // بنصّ التعبئة حرفياً وللأداة نفسها، يُنقل الدخول لـAsk الشراء/Bid البيع **من اللقطة نفسها** — وإلا حُسب اللوت
  // على وقفٍ أضيق من الحقيقي بنصف السبريد (أكثر على الذهب والتقاطعات). ما كتبه المتداول بيده لا يُمسّ.
  useEffect(() => {
    const f = liveFillRef.current;
    if (!f || f.symbol !== spec?.symbol || entryPx.trim() !== f.text) return;
    const lq = liveEntryQuote(f.q, priceNum(stopPx));
    if (lq == null) return;
    const text = formatPrice(lq.price, f.symbol);
    if (text === f.text) return;
    liveFillRef.current = { ...f, text };
    setEntryPx(text);
    setLivePxMsg({ ok: true, text: `${liveFillMsg(text, lq)}${quoteMarketOpen(f.q) === false ? ` · ${t.dsMarketClosed}` : ''}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopPx]);

  // الرقم انتقل وحده بعد التعبئة (الوقف كشف الجهة): السطر يسمّي Ask/Bid والجهة بدل «من السعر الحالي» المكرّر
  const liveFillMsg = (text: string, lq: { quote: 'ask' | 'bid' | null; side: 'buy' | 'sell' | null }) =>
    lq.quote && lq.side
      ? t.riskCalcLiveSideMoved
          .replace('{quote}', lq.quote === 'ask' ? 'Ask' : 'Bid')
          .replace('{side}', lq.side === 'buy' ? t.dirBuy : t.dirSell)
          .replace('{price}', text)
      : `${t.riskCalcLiveFilled} ${text}`;

  const fillEntryFromLive = async () => {
    if (!spec || livePxBusy) return;
    const sym = spec.symbol;
    const entryAtTap = entryPx;
    setLivePxBusy(true);
    setLivePxMsg(null);
    try {
      const q = await api.marketQuote(sym);
      if (!mountedRef.current) return;
      // دخولٌ كُتب باليد أثناء الطلب: كان Ask الحيّ يُكتب فوقه فيتغيّر الوقف واللوت بلا انتباه. يُسقط بصمت.
      if (!liveEntryFillAllowed(entryAtTap, entryPxRef.current)) return;
      // بُدّلت الأداة أثناء الطلب (نقرة GBPUSD قبل وصول سعر EURUSD): سعر EURUSD كان يُكتب دخولاً تحت
      // GBPUSD ومعه «عُبّئ» — فيُحسب الوقف واللوت ويُسجَّل بالدفتر من سعر أداة أخرى. يُسقط بصمت.
      if (liveSymRef.current !== sym) return;
      // سعرٌ مخزّن أقدم من 3 دقائق (المزوّد يردّ 429) ليس «السعر الحالي» — راجع `liveEntryQuoteState`
      const qState = isRealQuote(q) ? liveEntryQuoteState(q, Date.now(), clockOffsetMs()) : 'stale';
      if (qState === 'stale') {
        setLivePxMsg({ ok: false, text: t.riskCalcNoLiveQuote });
        return;
      }
      const px = liveEntryForStop(q, priceNum(stopPxRef.current));
      if (px == null) {
        setLivePxMsg({ ok: false, text: t.riskCalcNoLiveQuote });
        return;
      }
      const text = formatPrice(px, sym);
      setEntryPx(text);
      liveFillRef.current = { symbol: sym, text, q };
      // السوق مغلق: آخر سعر قبل الإغلاق يُعبّأ للتخطيط، موسوماً — لا «السعر الحالي» وحده
      setLivePxMsg({ ok: true, text: `${t.riskCalcLiveFilled} ${text}${qState === 'closed' ? ` · ${t.dsMarketClosed}` : ''}` });
    } catch {
      if (mountedRef.current) setLivePxMsg({ ok: false, text: t.riskCalcNoLiveQuote });
    } finally {
      if (mountedRef.current) setLivePxBusy(false);
    }
  };

  /**
   * `toLocaleString(undefined, …)` كان يتبع لغة **الجهاز** لا لغة الواجهة — وهو الموضع الوحيد
   * بالتطبيق كلّه الذي يفعل ذلك (بقيته `toFixed`/`formatPrice`، أرقام لاتينية وفاصل «.»). فعلى
   * جهاز بلغة عربية يخرج صندوق النتيجة بنظامَي أرقام معاً: «0.35» لوت (toFixed) فوق «١٬٠٠٠٫٠٠ USD»
   * مخاطرة، وعلى جهاز ألماني «1.000,00» بجانب «0.35» — فاصلان عشريان متناقضان بصندوق واحد يقرأ
   * منه المتداول كم سيخسر. والأسوأ أنه يتبدّل بتبديل لغة الجهاز لا لغة التطبيق.
   * التجميع بفاصلة والكسر بنقطة، ثابتاً: هذا ما كان يراه مستخدم الإنجليزية أصلاً، فلا تغيير له.
   */
  const group = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  /** الين بلا كسور، والبقية منزلتان — راجع `formatMoney` */
  const money = (v: number) => formatMoney(v, moneyCcy);
  const pipLabel = spec ? String(spec.pipSize) : '';
  /**
   * سقف الـ100 كان يُسكِت التحذير **عند الطرف الأخطر بالضبط**: من يكتب «20» فيصير الرقم «200»
   * بضغطة زائدة يرى ⚠ عند 20% ثم يختفي التحذير كلّه عند 200%. الشرط الآن بلا سقف.
   */
  // شاملةً السبريد والعمولة حين تُكتب — كسطر «شاملة التكاليف» وحدّ الخسارة اليومي. راجع `lossRiskPct`
  const lossPct = lossRiskPct(riskNum, withSpread);
  const riskHigh = riskIsHigh(lossPct);
  const lossStreakPct = lossPct != null ? lossStreakDrawdownPct(lossPct, LOSS_STREAK_N, riskIn?.amount == null) : null;
  /**
   * نسبة فوق 100% مستحيلة (لا يُخاطَر بأكثر من الرصيد كلّه) فيرفضها `positionSize` وتعود النتيجة
   * `null` — وكان الصندوق يقول حينها «أدخل الرصيد ونسبة المخاطرة ووقف الخسارة» والثلاثة مكتوبة
   * أمام المتداول، فيظنّ العطل بخانة أخرى ويقلّب فيها. التحذير ظاهر عند خانة النسبة نفسها، فلا
   * يُضاف سطر يناقضه.
   *
   * **لكن بلا رصيد لا تحذير «أكبر من الرصيد»** (`riskOverBalance` يحتاج رصيداً) — فكان «150» وخانة
   * الرصيد فارغة يُظهر «أكثر من 2% عالية» وحدها وصندوقاً فارغاً تماماً. الإخفاء إذن حين يظهر ذلك
   * التحذير فقط؛ وإلا يبقى «أدخل الرصيد…» وهو صحيح حرفياً (الرصيد ناقص)، ومع الرصيد يحلّ التحذير محلّه.
   */
  const riskOver = riskOverBalance(riskPct, balanceNum, moneyCcy);

  const chip = (label: string, on: boolean, onPress: () => void, a11y: string, disabled = false) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        on && styles.chipOn,
        disabled && { opacity: 0.4 },
        pressed && {
          opacity: buttons.pressedOpacity,
          transform: [{ scale: buttons.pressedScale }],
        },
      ]}
      onPress={onPress}
      accessibilityLabel={a11y}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );

  const input = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    a11y: string,
    decimal = true
  ) => (
    <TextInput
      style={[styles.input, { textAlign: align }]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textDim}
      keyboardType={decimal ? 'decimal-pad' : 'default'}
      autoCapitalize={decimal ? 'none' : 'characters'}
      autoCorrect={false}
      maxLength={decimal ? 12 : SYMBOL_INPUT_MAX_LEN}
      returnKeyType="done"
      underlineColorAndroid="transparent"
      clearButtonMode="while-editing"
      keyboardAppearance="dark"
      selectionColor={colors.accent}
      accessibilityLabel={a11y}
    />
  );

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { textAlign: align }]}>{t.riskCalcTitle}</Text>
      <Text style={[styles.sub, { textAlign: align }]}>{t.riskCalcSub}</Text>

      <Text style={[styles.label, { textAlign: align }]}>{t.riskCalcSymbol}</Text>
      <View style={[styles.chips, rtl && styles.chipsRtl]}>
        {quickSyms.map(({ pair, s }) => chip(s, spec?.symbol === pair, () => setSymbol(s), `${t.riskCalcSymbol}: ${s}`))}
        {crossSym ? chip(crossSym, false, () => setSymbol(crossSym), `${t.riskCalcSymbol}: ${crossSym}`) : null}
      </View>
      {input(symbol, setSymbol, 'EURUSD', t.riskCalcSymbol, false)}
      {!spec && symbol.trim().length > 0 ? (
        <Text style={[styles.warn, { textAlign: align }]}>
          {/* رمز حساب mini مرفوضٌ عمداً لا خطأ مطبعي — السبب والزوج العادي بدل «رمز غير مدعوم» (QA44) */}
          {/* لاحقة مجهولة («EURUSDi»): السبب وأنّ شريحة الزوج تفترض العقد العادي — لا «رمز غير مدعوم» (launch186a) */}
          {miniPair
            ? t.riskCalcMiniSymbol.replace('{symbol}', () => symbol.trim()).replace('{pair}', () => miniPair)
            : suffixPair
              ? t.riskCalcSuffixSymbol.replace('{symbol}', () => symbol.trim()).replace('{pair}', () => suffixPair)
              : t.riskCalcBadSymbol}
        </Text>
      ) : null}
      {suffixPair ? (
        <View style={[styles.chips, rtl && styles.chipsRtl]}>
          {chip(suffixPair, false, () => setSymbol(suffixPair), `${t.riskCalcSymbol}: ${suffixPair}`)}
        </View>
      ) : null}
      {small ? (
        <Text style={[styles.hint, styles.hintOn, { textAlign: align }]} accessibilityLiveRegion="polite">
          {(cent ? t.riskCalcCentModeNote : t.riskCalcMicroModeNote).replace('{symbol}', () => symbol.trim())}
        </Text>
      ) : null}

      {/* حساب السنت بالـUSC دائماً (سعر التحويل لحساب دولار) — شرائح العملة لا تغيّر فيه شيئاً فتُخفى */}
      {cent ? null : (
        <>
          <Text style={[styles.label, { textAlign: align }]}>{t.riskCalcAccountCcy}</Text>
          <View style={[styles.chips, rtl && styles.chipsRtl]}>
            {ACCOUNT_CCYS.map((c) =>
              chip(
                c,
                account === c,
                () => {
                  touch('account');
                  if (c !== account) {
                    setCommission('');
                    // «USD 50» لا تعني 50 يورو: المخاطرة بالمال تعود نسبةً (بالرصيد نفسه) قبل تبديل العملة،
                    // وبلا رصيد تُمسح بدل أن تبقى علامةً لعملة لم تعد عملة الحساب
                    if (riskIn?.amount != null) setRiskPct(toggleRiskUnit(riskPct, balanceNum, account) ?? '');
                    // الرصيد نفسه لا يصلح بعملةٍ أخرى (1500000 ين ≠ 1500000 دولار): يُحفظ باسم عملته ويظهر رصيد الجديدة
                    const sw = balanceOnAccountSwitch(otherBalances, account, c, balance);
                    setOtherBalances(sw.balances);
                    setBalance(sw.balance);
                  }
                  setAccount(c);
                },
                `${t.riskCalcAccountCcy}: ${c}`
              )
            )}
          </View>
        </>
      )}

      <Text style={[styles.label, { textAlign: align }]}>
        {cent ? t.riskCalcCentBalance : `${t.riskCalcBalance} (${account})`}
      </Text>
      {input(
        balanceText,
        (v: string) => {
          touch('account');
          setBalanceText(v);
        },
        cent ? '100000' : '10000', cent ? t.riskCalcCentBalance : t.riskCalcBalance)}
      {cent && Number.isFinite(balanceNum) && balanceNum > 0 ? (
        <Text style={[styles.hint, { textAlign: align }]}>
          {t.riskCalcCentUsdEquiv.replace('{usd}', () => formatMoney(balanceNum / CENTS_PER_USD, 'USD').replace(/ USD$/, ''))}
        </Text>
      ) : null}

      <Text style={[styles.label, { textAlign: align }]}>{t.riskCalcRiskPct}</Text>
      <View style={[styles.chips, rtl && styles.chipsRtl]}>
        {QUICK_RISK.map((r) =>
          chip(
            `${r}%`,
            riskPct === r,
            () => {
              touch('risk');
              setRiskPct(r);
            },
            `${t.riskCalcRiskPct}: ${r}%`
          )
        )}
        {/* المخاطرة بالمال: يقلب الخانة «1» ⇄ «USD 100» بالمخاطرة نفسها — لوحة الأرقام بلا «$» (راجع
            `toggleRiskUnit`). معطَّل بلا رصيد: لا نسبة من مبلغ ولا مبلغ من نسبة */}
        {(() => {
          const flipped = toggleRiskUnit(riskPct, balanceNum, moneyCcy);
          return chip(
            moneyCcy,
            riskIn?.amount != null,
            () => {
              touch('risk');
              if (flipped != null) setRiskPct(flipped);
            },
            `${t.riskCalcRiskPct}: ${moneyCcy}`,
            flipped == null
          );
        })()}
      </View>
      {input(
        riskPct,
        (v: string) => {
          touch('risk');
          setRiskPct(v);
        },
        '1',
        t.riskCalcRiskPct
      )}
      {/* زرّ عملة الحساب وحده لا يقول ما يفعل — التلميح ما دامت الخانة نسبةً والقلب ممكناً */}
      {riskIn?.amount == null && toggleRiskUnit(riskPct, balanceNum, moneyCcy) != null ? (
        <Text style={[styles.hint, { textAlign: align }]}>{t.riskCalcRiskMoneyHint.replace('{ccy}', moneyCcy)}</Text>
      ) : null}
      {/* أكبر من الرصيد: لا لوت أصلاً، و«أكثر من 2% عالية» وحدها لا تقول لماذا — راجع `riskOverBalance` */}
      {riskOver ? (
        <Text style={[styles.warn, { textAlign: align }]} accessibilityLiveRegion="polite">
          {t.riskCalcRiskOverBalance.replace('{risk}', money(riskOver.risk)).replace('{balance}', money(riskOver.balance))}
        </Text>
      ) : riskHigh ? (
        <Text style={[styles.warn, { textAlign: align }]}>{t.riskCalcHighRisk}</Text>
      ) : null}
      {/* ما تأخذه 5 خسائر متتالية بهذه المخاطرة — مركّبة للنسبة (تُحسب من الرصيد الباقي)، خطّية للمبلغ الثابت. راجع `lossStreakDrawdownPct` */}
      {!riskOver && lossStreakPct != null ? (
        <Text style={[styles.hint, { textAlign: align }]}>
          {t.riskCalcLossStreak.replace('{n}', String(LOSS_STREAK_N)).replace('{pct}', String(lossStreakPct))}
        </Text>
      ) : null}

      {/* حدّ الخسارة اليومي: مطويّ حتى يُطلب (لا يُثقل الشاشة لمن لا يستعمله)، ويُفتح وحده حين يُحفظ حدّ */}
      <View style={[styles.chips, rtl && styles.chipsRtl]}>
        {chip(t.riskCalcDailyLimit, dailyOpen, () => setDailyOpen((o: boolean) => !o), t.riskCalcDailyLimit)}
      </View>
      {dailyOpen ? (
        <>
          {input(
            dailyLimit,
            (v: string) => {
              touch('dailyLimit');
              setDailyLimit(v);
            },
            '5',
            t.riskCalcDailyLimit
          )}
          {dailyLimitErr ? (
            <Text style={[styles.warn, { textAlign: align }]} accessibilityLiveRegion="polite">
              {dailyLimitErr}
            </Text>
          ) : null}
          <Text style={[styles.label, { textAlign: align }]}>{`${t.riskCalcLostToday} (${moneyCcy})`}</Text>
          {input(
            lostTodayNow,
            (v: string) => {
              touch('lostToday');
              setLostToday(v);
              lostEnteredDayRef.current = v.trim() === '' ? null : tradingDayKey(new Date());
              // أفرغها بيده ⇒ لا عملة (لا «أعد كتابتها» عن خانة تركها فارغة ثم بدّل العملة)
              setLostCcy(v.trim() === '' ? null : moneyCcy);
            },
            '0',
            t.riskCalcLostToday
          )}
          {lostTodayErr ? (
            <Text style={[styles.warn, { textAlign: align }]} accessibilityLiveRegion="polite">
              {lostTodayErr}
            </Text>
          ) : null}
          {/* تُفرغ عند 17:00 نيويورك (`lostDayForSave`/`tradingDayKey`) — يقوله للمتداول كي لا يظنّ الخانة فرغت خطأً */}
          <Text style={[styles.hint, { textAlign: align }]}>{t.riskCalcLostTodayResetHint}</Text>
          {lostOtherCcy ? (
            <Text style={[styles.warn, { textAlign: align }]}>
              {t.riskCalcLostTodayOtherCcy.replace('{from}', lostOtherCcy).replace('{to}', moneyCcy)}
            </Text>
          ) : null}
        </>
      ) : null}

      <Text style={[styles.label, { textAlign: align }]}>{t.riskCalcLeverage}</Text>
      {input(
        leverage,
        (v: string) => {
          touch('leverage');
          setLeverage(v);
        },
        '100',
        t.riskCalcLeverage
      )}

      <Text style={[styles.label, { textAlign: align }]}>
        {t.riskCalcSlPips}
        {spec ? <Text style={numeric}>{` · 1 pip = ${pipLabel}`}</Text> : ''}
      </Text>
      {input(slPips, onSlPipsChange, typicalSlPipsExample(spec), t.riskCalcSlPips)}
      {atrPips != null ? (
        <View style={[styles.chips, rtl && styles.chipsRtl]}>
          {chip(
            `ATR ${atrPips} ${pipUnit(lang)}`,
            parseSlPips(slPips, spec) === atrPips,
            () => onSlPipsChange(String(atrPips)),
            `${t.riskCalcSlPips}: ${atrPips} ${pipUnit(lang)} (ATR)`
          )}
        </View>
      ) : null}
      <Text style={[styles.hint, { textAlign: align }]}>{t.riskCalcFromPrice}</Text>
      <View style={[styles.pxRow, rtl && styles.pxRowRtl]}>
        <View style={styles.pxCell}>
          {input(entryPx, setEntryPx, t.riskCalcEntry, t.riskCalcEntry)}
        </View>
        <View style={styles.pxCell}>
          {input(stopPx, setStopPx, t.riskCalcStop, t.riskCalcStop)}
        </View>
      </View>
      {spec ? (
        <View style={[styles.chips, rtl && styles.chipsRtl]}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: livePxBusy, busy: livePxBusy }}
            disabled={livePxBusy}
            style={({ pressed }) => [
              styles.chip,
              livePxBusy && { opacity: 0.5 },
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => void fillEntryFromLive()}
            accessibilityLabel={livePxBusy ? t.a11yBusy : t.riskCalcUseLivePriceA11y}
          >
            <Text style={styles.chipText}>{livePxBusy ? '...' : t.riskCalcUseLivePrice}</Text>
          </Pressable>
        </View>
      ) : null}
      {stopChoices.length > 0 ? (
        <View style={[styles.chips, rtl && styles.chipsRtl]}>
          {stopChoices.map((x) =>
            chip(
              `${x.side === 'buy' ? '▲' : '▼'} ${t.riskCalcStopChip
                .replace('{side}', x.side === 'buy' ? t.dirBuy : t.dirSell)
                .replace('{price}', x.text)}`,
              false,
              () => {
                const f = liveFillRef.current;
                if (x.entryText != null && f) {
                  const moved = x.entryText !== f.text;
                  liveFillRef.current = { ...f, text: x.entryText };
                  setEntryPx(x.entryText);
                  const lq = moved ? liveEntryQuote(f.q, num(x.text)) : null;
                  setLivePxMsg({
                    ok: true,
                    text: lq && formatPrice(lq.price, f.symbol) === x.entryText
                      ? liveFillMsg(x.entryText, lq)
                      : `${t.riskCalcLiveFilled} ${x.entryText}`,
                  });
                }
                setStopPx(x.text);
              },
              `${x.side === 'buy' ? t.dirBuy : t.dirSell} — ${t.journalSlAtPipsA11y
                .replace('{pips}', slPips.trim())
                .replace('{price}', x.text)}`
            )
          )}
        </View>
      ) : null}
      {livePxMsg ? (
        <Text
          style={[livePxMsg.ok ? styles.hintOn : styles.warn, { textAlign: align }]}
          accessibilityLiveRegion="polite"
        >
          {livePxMsg.text}
        </Text>
      ) : null}
      <Text style={[styles.label, { textAlign: align }]}>{t.riskCalcTarget}</Text>
      {input(targetPx, setTargetPx, t.riskCalcTargetPlaceholder, t.riskCalcTarget)}
      {rrTargets.length > 0 ? (
        <View style={[styles.chips, rtl && styles.chipsRtl]}>
          {rrTargets.map((x) =>
            chip(
              `1:${x.rr}`,
              Number.isFinite(targetNum) && Math.abs(targetNum - x.tp) < spec!.pipSize / 20,
              () => setTargetPx(x.text),
              `${t.riskCalcTargetPlaceholder} R:R 1:${x.rr} = ${x.text}`
            )
          )}
        </View>
      ) : null}
      {targetWrongSide ? (
        <Text style={[styles.warn, { textAlign: align }]}>
          {priceNum(stopPx) < priceNum(entryPx) ? t.planTpWrongBuy : t.planTpWrongSell}
        </Text>
      ) : null}
      {pipsInPx ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pipsInPx.msg}
          onPress={pipsInPx.apply}
          style={({ pressed }) => pressed && { opacity: buttons.pressedOpacity }}
        >
          <Text style={[styles.warn, { textAlign: align }]} accessibilityLiveRegion="polite">
            {pipsInPx.msg}
          </Text>
        </Pressable>
      ) : null}
      {derivedSl != null ? (
        <Text style={[styles.hint, styles.hintOn, { textAlign: align }]} accessibilityLiveRegion="polite">
          = {derivedSl} {pipUnit(lang)}
        </Text>
      ) : null}
      {slMismatch ? (
        <Text style={[styles.warn, { textAlign: align }]} accessibilityLiveRegion="polite">
          {slMismatchText}
        </Text>
      ) : null}
      {slTooClose ? (
        <Text style={[styles.warn, { textAlign: align }]} accessibilityLiveRegion="polite">
          {t.planSlTooClose}
        </Text>
      ) : null}

      <Text style={[styles.label, { textAlign: align }]}>{t.riskCalcSpread}</Text>
      {input(spread, setSpread, typicalSpreadPipsExample(spec), t.riskCalcSpread)}
      {spreadErr ? (
        <Text style={[styles.warn, { textAlign: align }]} accessibilityLiveRegion="polite">
          {spreadErr}
        </Text>
      ) : null}
      {spreadPriceWarn ? (
        <Text style={[styles.warn, { textAlign: align }]} accessibilityLiveRegion="polite">
          {spreadPriceWarn}
        </Text>
      ) : null}
      {/* المنصّة تعرض السبريد بالـpoints (عُشر pip) غالباً — «12» منها هنا 1.2، وإلا تُضخَّم التكاليف ×10 */}
      <Text style={[styles.hint, { textAlign: align }]}>{t.riskCalcSpreadPipsHint}</Text>
      <Text style={[styles.hint, { textAlign: align }]}>{t.riskCalcSpreadNote}</Text>

      <Text style={[styles.label, { textAlign: align }]}>
        {t.riskCalcCommission} ({moneyCcy})
      </Text>
      {input(
        commission,
        (v: string) => {
          touch('account');
          setCommission(v);
        },
        commissionPlaceholder(commissionKind, account), t.riskCalcCommission)}
      {commissionErr ? (
        <Text style={[styles.warn, { textAlign: align }]} accessibilityLiveRegion="polite">
          {commissionErr}
        </Text>
      ) : null}
      <Text style={[styles.hint, { textAlign: align }]}>{commissionNoteText}</Text>

      {conv && convLoading ? <ActivityIndicator color={colors.textMuted} style={{ marginTop: spacing.sm }} /> : null}
      {conv && convNotice ? (
        <Text style={[styles.warn, { textAlign: align }]} accessibilityLiveRegion="polite">
          {convNotice === 'closed'
            ? t.riskCalcConvMarketClosed.replace('{pair}', conv.symbol)
            : t.riskCalcConvStale.replace('{pair}', conv.symbol).replace('{min}', String(convStaleMin))}
        </Text>
      ) : null}
      {conv && convFailed ? (
        <>
          {/* اللوت ظاهر من الوقف المكتوب (`typedExit`) ⇒ «اكتبه ليظهر حجم اللوت» كان يناقض الرقم تحته؛ الخانة تبقى للهامش */}
          {typedExit == null ? (
            <Text style={[styles.warn, { textAlign: align }]}>
              {t.riskCalcConvFailed} {conv.symbol}
            </Text>
          ) : null}
          {input(manualConv, setManualConv, conv.symbol, `${t.riskCalcConvManual} ${conv.symbol}`)}
          {manualInverted != null ? (
            <Text style={[styles.warn, { textAlign: align }]} accessibilityLiveRegion="polite">
              {/* `split/join` لا `.replace`: النسخة المحلية القديمة كان فيها {pair} مرّتين فظهر الثاني حرفياً */}
              {t.riskCalcConvInverted
                .split('{pair}').join(conv.symbol)
                .split('{typed}').join(manualConv.trim())
                .split('{likely}').join(formatPrice(manualInverted, conv.symbol))}
            </Text>
          ) : null}
          {manualSlip != null ? (
            <Text style={[styles.warn, { textAlign: align }]} accessibilityLiveRegion="polite">
              {/* نصّ الحاسبة (launch187a) لا نصّ الدفتر: ذاك `{field}` فيه اسم خانة فلم يذكر أنه سعر التحويل */}
              {t.riskCalcConvDecimalSlip
                .split('{pair}').join(conv.symbol)
                .split('{typed}').join(manualConv.trim())
                .split('{likely}').join(formatPrice(manualSlip, conv.symbol))}
            </Text>
          ) : null}
        </>
      ) : null}

      {/* «خبر قوي قريب» لعملتَي الأداة: كان فوق الشارت وبلوح التركيز فقط — بينما **هنا** يُحسم حجم
          المركز ويُسجَّل بالدفتر، وهي اللحظة التي يعني فيها التحذير شيئاً (وقف ينزلق بقفزة NFP =
          خسارة أكبر من «1% مخاطرة» المكتوبة بالخانة أعلاه بالضبط). بلا أي طلب شبكة إضافي: البانر
          يقرأ من مخزن الوحدة المشترك (طلب واحد كل 10 دقائق لكل التطبيق)، ولا يعرض شيئاً بلا حدث
          حقيقي قريب (بيانات الأمثلة الاحتياطية مستثناة بالبناء). `spec` وحدها تضمن أداة معروفة. */}
      {spec ? <NewsRiskBanner symbol={spec.symbol} /> : null}
      <View style={styles.resultBox}>
        {result && !result.belowMinLot ? (
          <>
            <Text style={[styles.resultLabel, { textAlign: align }]}>{t.riskCalcLots}</Text>
            <Text style={[styles.resultLots, { textAlign: align }]} accessibilityLiveRegion="polite">
              {result.lots.toFixed(2)}
            </Text>
            <Text style={[styles.resultMeta, { textAlign: align }]}>
              {t.riskCalcRiskAmount}: {money(result.actualRisk)}
              {actualNow ? ` (${formatRiskPct(actualNow.pct)})` : ''} · {t.riskCalcUnits}:{' '}
              {group(String(result.units))}
            </Text>
            {dailyRoom ? (
              <Text
                style={[dailyRoom.breach ? styles.warn : styles.resultMeta, { textAlign: align }]}
                accessibilityLiveRegion="polite"
              >
                {dailyRoom.breach
                  ? t.riskCalcDailyBreach.replace('{room}', money(dailyRoom.room)) +
                    (dailyFitLots != null ? ` · ≤ ${formatLots(dailyFitLots)}` : '')
                  : t.riskCalcDailyRoom
                      .replace('{room}', money(dailyRoom.room))
                      .replace('{n}', String(dailyRoom.losses))
                      .replace('{pct}', String(dailyRoom.maxRiskPct))}
              </Text>
            ) : null}
            {/* لوت السنت/micro بلوت الحساب العادي — ليطابقه المتداول مع ما يعرفه («4.00» = 0.04) */}
            {small ? (
              <Text style={[styles.resultMeta, { textAlign: align }]}>
                {t.riskCalcSmallLotsStdEquiv.replace('{std}', () => smallLotsStdEquiv(result.lots))}
              </Text>
            ) : null}
            {/* فوق أكبر أمر يقبله الوسيط (50 lot عادي `ORDER_WARN_LOTS`، 200 lot سنت/micro — نصّ كلٍّ بحدّه): الرقم صحيح حسابياً لكن الأمر يُرفض — أو الوقف خطأ كتابة. راجع `lotsOverOrderMax` */}
            {overOrderMax != null ? (
              <Text style={[styles.warn, { textAlign: align }]} accessibilityLiveRegion="polite">
                {(small != null ? t.riskCalcOverOrderMaxSmall : t.riskCalcOverOrderMax).replace('{lots}', overOrderMax.toFixed(2))}
              </Text>
            ) : null}
          </>
        ) : result && result.belowMinLot ? (
          <>
            <Text style={[styles.warn, { textAlign: align }]}>
              {t.riskCalcBelowMin} ({money(result.riskAmount)})
            </Text>
            {minLotRisk ? (
              <Text style={[styles.resultMeta, { textAlign: align }]}>
                {formatLots(LOT_STEP)} = {money(minLotRisk.risk)} · {formatRiskPct(minLotRisk.pct)}
              </Text>
            ) : null}
          </>
        ) : badNumber ? (
          <Text style={[styles.warn, { textAlign: align }]}>{badNumberText}</Text>
        ) : riskOver || slTooClose ? null : (
          <Text style={[styles.resultMeta, { textAlign: align }]}>{t.riskCalcFillHint}</Text>
        )}
        {/* خانةٌ مرفوضة **واللوت محسوب** (من خانات أخرى): الرسالة كانت تظهر بلا نتيجة فقط، فرافعة «1:5000» تُسقط
            سطر الهامش وهدف ذهب «3.500» يُسقط R:R والربح وزرّ التسجيل — بصمت تحت لوتٍ يبدو كاملاً */}
        {result && badNumber ? <Text style={[styles.warn, { textAlign: align }]}>{badNumberText}</Text> : null}
        {/* الاتجاه كان **مستنتَجاً بصمت**: وقف تحت الدخول = شراء، ثم يُرسَل كما هو بـ`side` لصفقة
            الدفتر — فمن قلب الرقمين (أو خطّط بيعاً وكتب وقفه تحت الدخول سهواً) يسجّل صفقة بالاتجاه
            المعاكس ولا شيء بالشاشة يقول له ذلك، وهو الرقم الوحيد بالخطة الذي لا يكتبه بنفسه. */}
        {planSide ? (
          <Text
            style={[
              styles.sideLine,
              { textAlign: align, color: planSide === 'buy' ? colors.bull : colors.bear },
            ]}
            accessibilityLabel={`${t.riskCalcSideLabel}: ${planSide === 'buy' ? t.dirBuy : t.dirSell}`}
          >
            {planSide === 'buy' ? `▲ ${t.dirBuy}` : `▼ ${t.dirSell}`}
            <Text style={styles.sideHint}> · {t.riskCalcSideFromStop}</Text>
          </Text>
        ) : null}
        {plan?.ok ? (
          <>
            <Text style={[styles.resultMeta, { textAlign: align }]}>
              {t.planRewardWord} {formatPips(plan.rewardPips) ?? '—'} {pipUnit(lang)} · R:R {formatRR(planRR)}
              {potentialProfit != null ? ` · ${t.riskCalcPotentialProfit} ≈ ${money(potentialProfit)}` : ''}
            </Text>
            {/* من R:R بالمال (الصافية حين تُكتب التكاليف) — راجع `breakevenRR` */}
            {breakevenPct != null ? (
              <Text style={[styles.resultMeta, { textAlign: align }]}>
                {t.planBreakevenWinRate.replace('{pct}', String(breakevenPct))}
              </Text>
            ) : null}
            {scaleOut ? (
              <Text style={[styles.resultMeta, { textAlign: align }]}>
                {t.riskCalcScaleOut
                  .replace('{close}', scaleOut.close)
                  .replace('{pct}', scaleOut.pct)
                  .replace('{keep}', scaleOut.keep)
                  .replace('{worst}', scaleOut.worst)
                  .replace('{best}', scaleOut.best)}
              </Text>
            ) : null}
            {netAfterCosts ? (
              <Text
                style={[netAfterCosts.net > 0 ? styles.resultMeta : styles.warn, { textAlign: align }]}
                accessibilityLiveRegion="polite"
              >
                {netAfterCosts.net > 0
                  ? t.riskCalcNetAfterCosts
                      .replace('{profit}', money(netAfterCosts.net))
                      .replace('{rr}', formatRR(netAfterCosts.rr))
                  : t.riskCalcNetNegative.replace('{profit}', money(netAfterCosts.net))}
              </Text>
            ) : null}
            {/* الإجمالية ≥ 1:1 والتكاليف وحدها تُنزلها: الجملة تسمّي التكاليف، لا «الربح أقل» تحت «1:1.1» — راجع `lowRewardWarning` */}
            {lowWarn ? (
              <Text style={[styles.warn, { textAlign: align }]}>{lowWarn === 'net' ? t.riskCalcLowNetRR : t.planLowRR}</Text>
            ) : null}
          </>
        ) : null}
        {/* قيمة النقطة **للمركز المحسوب** بجانب قيمتها للوت القياسي: «كل نقطة عليّ 3.50» هو ما يراقبه
            المتداول وهو بالصفقة، وكان يُترك ليضربه بنفسه. من اللوت المقرَّب نفسه (`result.pipValue`). */}
        {pv != null ? (
          <>
            <Text style={[styles.resultMeta, { textAlign: align }]}>
              {pipAtStop && spec && pipRatePx != null && Number.isFinite(pipRatePx)
                ? exitAtStop
                  ? t.riskCalcPipValueAtStop.replace('{price}', formatPrice(pipRatePx, spec.symbol))
                  : // بالنقاط وحدها الخروج مفترَضٌ تحت السعر (`pipsOnlyExitPrice`) لا «وقفك»: بائعٌ وقفه فوق السعر كان يُقال له «عند وقفك 148.50»
                    t.riskCalcPipValueAtPipsExit
                      .replace('{price}', formatPrice(pipRatePx, spec.symbol))
                      .replace('{pips}', String(slNum))
                : t.riskCalcPipValue}
              : {formatPipValue(pv, moneyCcy)}
              {result && lots != null ? ` · ${formatLots(lots)} = ${formatPipValue(result.pipValue, moneyCcy)}` : ''}
            </Text>
            {pipAtStop ? (
              <Text style={[styles.hint, { textAlign: align }]}>
                {exitAtStop ? t.riskCalcPipValueAtStopHint : t.riskCalcPipValueAtPipsExitHint}
              </Text>
            ) : null}
          </>
        ) : null}
        {slInsideSpread ? (
          <Text style={[styles.warn, { textAlign: align }]} accessibilityLiveRegion="polite">
            {t.riskCalcStopInsideSpread.replace('{sl}', String(slNum)).replace('{spread}', String(typedSpreadPips))}
          </Text>
        ) : null}
        {!slInsideSpread && slInsideTypical != null && spec ? (
          <Text style={[styles.warn, { textAlign: align }]} accessibilityLiveRegion="polite">
            {t.riskCalcStopInsideTypicalSpread
              .replace('{sl}', String(slNum))
              .replace('{spread}', String(slInsideTypical))
              .replace('{symbol}', () => spec.symbol)}
          </Text>
        ) : null}
        {/* المخاطرة شاملة السبريد (والعمولة إن كُتبت)، وتحتها جملة اللوت الذي يحفظ النسبة المكتوبة حين يكون أصغر */}
        {withSpread ? (
          <>
            <Text style={[styles.resultMeta, { textAlign: align }]} accessibilityLiveRegion="polite">
              {commissionPerLot ? t.riskCalcRiskWithCosts : t.riskCalcRiskWithSpread} (+{costParts.join(' + ')}):{' '}
              {money(withSpread.risk)} ({formatRiskPct(withSpread.pct)})
            </Text>
            {costsAdvice?.kind === 'smaller' ? (
              <Text style={[styles.resultMeta, { textAlign: align }]}>
                {(commissionPerLot ? t.riskCalcCostsLotsWithin : t.riskCalcSpreadLotsWithin)
                  .replace('{pct}', riskPctText)
                  .replace('{lots}', costsAdvice.lots.toFixed(2))}
              </Text>
            ) : costsAdvice?.kind === 'none' ? (
              <Text style={[styles.warn, { textAlign: align }]}>
                {t.riskCalcCostsBelowMin.replace('{pct}', riskPctText)}
              </Text>
            ) : null}
          </>
        ) : null}
        {margin != null ? (
          <>
            <Text
              style={[marginOver ? styles.warn : styles.resultMeta, { textAlign: align }]}
              accessibilityLiveRegion="polite"
            >
              {marginOver ? '⚠ ' : ''}
              {t.riskCalcMargin} ({formatLots(lots!)} · 1:{leverageNum}
              {marginPx?.live && spec
                ? ` @ ${formatPrice(marginPx.price, spec.symbol)}${mktQuote?.closed ? ` · ${t.dsMarketClosed}` : ''}`
                : ''}): {money(margin)}
              {marginPct != null ? ` (${formatRiskPct(marginPct)})` : ''}
            </Text>
            {marginMaxLots != null ? (
              <Text style={[styles.warn, { textAlign: align }]}>
                {t.riskCalcMarginMaxLots.replace('{lots}', marginMaxLots.toFixed(2))}
              </Text>
            ) : null}
            <Text style={[styles.hint, { textAlign: align }]}>{t.riskCalcMarginNote}</Text>
          </>
        ) : null}
      </View>
      {plan?.ok && lots != null ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: logBusy || logDone || logBlocked, busy: logBusy }}
            // بعد نجاح التسجيل يبقى معطَّلاً حتى يتغيّر رقم بالخطة — نقرة ثانية كانت تُنشئ صفقة مكرّرة
            disabled={logBusy || logDone || logBlocked}
            style={({ pressed }) => [
              styles.logBtn,
              (logBusy || logDone || logBlocked) && { opacity: 0.5 },
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => void logPlanToJournal()}
            // الاتجاه بنصّ الزر الصوتي أيضاً: هنا بالضبط يُكتب `side` بالدفتر بلا أن يختاره المتداول.
            accessibilityLabel={
              logBusy ? t.a11yBusy : `${t.riskCalcLogToJournal} — ${planSide === 'sell' ? t.dirSell : t.dirBuy}`
            }
            hitSlop={8}
          >
            <Text style={styles.logBtnText}>{logBusy ? '...' : t.riskCalcLogToJournal}</Text>
          </Pressable>
          {slMismatch ? (
            <Text style={[styles.warn, { textAlign: align }]}>
              {t.riskCalcLogBlockedMismatch.replace('{derived}', String(slMismatch.derived))}
            </Text>
          ) : null}
          {logMsg ? (
            <Text
              style={[logMsg.ok ? styles.logOk : styles.warn, { textAlign: align }]}
              accessibilityLiveRegion="polite"
            >
              {logMsg.text}
            </Text>
          ) : null}
        </>
      ) : null}
      <Text style={[styles.disclaimer, { textAlign: align }]}>{t.riskCalcDisclaimer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // DESIGN-PRO 5.5: فاصل واحد — حدّ بلا تعبئة `bgElevated` (لون القوائم المنبثقة)، كلوح الدفتر
  wrap: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  title: { color: colors.text, fontWeight: '500', fontSize: 14 },
  sub: { color: colors.textDim, fontSize: 11, marginTop: 4 },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '500', marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chipsRtl: { flexDirection: 'row-reverse' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // DESIGN-PRO §1/§4: الاختيار تعبئة محايدة ونصّ أساسي — التأكيد الوحيد باللوحة هو اللوت الناتج.
  chipOn: { backgroundColor: colors.selectedFill },
  chipText: { ...numeric, color: colors.textMuted, fontWeight: '500', fontSize: 12 },
  chipTextOn: { color: colors.text },
  input: {
    ...numeric,
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: spacing.sm,
    fontSize: 13,
  },
  warn: { ...numeric, color: colors.warn, fontSize: 11, fontWeight: '500' },
  hint: { ...numeric, color: colors.textDim, fontSize: 11, marginTop: 4 },
  hintOn: { color: colors.text, fontWeight: '500' },
  pxRow: { flexDirection: 'row', gap: 4 },
  pxRowRtl: { flexDirection: 'row-reverse' },
  pxCell: { flex: 1 },
  resultBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  resultLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  resultLots: { ...numeric, color: colors.accent, fontSize: 28, fontWeight: '600' },
  resultMeta: { ...numeric, color: colors.textDim, fontSize: 11 },
  sideLine: { ...numeric, fontSize: 13, fontWeight: '500' },
  sideHint: { ...numeric, color: colors.textDim, fontSize: 11, fontWeight: '500' },
  disclaimer: { color: colors.textDim, fontSize: 11, marginTop: spacing.xs },
  logBtn: {
    marginTop: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  logBtnText: { color: colors.text, fontWeight: '500', fontSize: 12 },
  // §1: «سُجِّل بالدفتر» تأكيد لا اتجاه سعر — نصّ أساسي
  logOk: { ...numeric, color: colors.text, fontSize: 11, fontWeight: '500' },
});
