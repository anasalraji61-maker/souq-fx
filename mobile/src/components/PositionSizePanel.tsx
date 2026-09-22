import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radii, spacing, buttons } from '../theme';
import { api } from '../api';
import { useI18n } from '../i18n/I18nContext';
import {
  ACCOUNT_CCYS,
  type AccountCcy,
  instrumentSpec,
  conversionPair,
  reversedConversion,
  quoteToAccountRate,
  pipValuePerLot,
  positionSize,
  slPipsFromPrices,
} from '../positionSize';
import { parseDecimal } from '../parseDecimal';
import { isRealQuote } from '../chart/dataSource';
import { formatPrice } from '../chart/math';
import { analyzePlan, formatPips, formatRR, type TradeSide } from '../tradePlan';

type Props = {
  defaultSymbol?: string;
};

const QUICK_SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'GBPJPY', 'EURGBP'];
const QUICK_RISK = ['0.5', '1', '2'];
const STORE_KEY = 'matrix.tools.riskCalc.v1';

/** حاسبة حجم المركز: رصيد × نسبة مخاطرة ÷ (وقف بالنقاط × قيمة النقطة) — مع قيمة نقطة صحيحة لأزواج
 * الين والتقاطعات والذهب عبر سعر تحويل حيّ لعملة الحساب. الرياضيات كلها بـ`positionSize.ts`. */
export function PositionSizePanel({ defaultSymbol = 'EURUSD' }: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  // رمز الشارت الحالي قد لا يكون زوجاً قابلاً للحساب (DXY مثلاً) — نبدأ بـEURUSD حينها
  const [symbol, setSymbol] = useState(() => (instrumentSpec(defaultSymbol) ? defaultSymbol : 'EURUSD'));
  const [account, setAccount] = useState<AccountCcy>('USD');
  const [balance, setBalance] = useState('');
  const [riskPct, setRiskPct] = useState('1');
  const [slPips, setSlPips] = useState('');
  /** بديل اختياري: سعرا الدخول والوقف كما يراهما المتداول على الشارت → تُملأ خانة النقاط تلقائياً */
  const [entryPx, setEntryPx] = useState('');
  const [stopPx, setStopPx] = useState('');
  /** هدف اختياري: يحوّل «كم لوت» إلى خطة كاملة (مخاطرة/عائد بالمال) — المتداول يقرّر بالـR:R لا باللوت وحده */
  const [targetPx, setTargetPx] = useState('');
  /** جلب سعر الدخول بنقرة: المتداول يخطّط غالباً حول السعر الذي يراه الآن، وكتابته يدوياً مَظنّة خطأ */
  const [livePxBusy, setLivePxBusy] = useState(false);
  const [livePxMsg, setLivePxMsg] = useState<{ ok: boolean; text: string } | null>(null);
  /** سعر زوج التحويل (عملة التسعير → عملة الحساب)؛ null أثناء التحميل أو عند الفشل. يُخزَّن مع رمزه
   * فلا يُقرن سعر الزوج السابق بالزوج الجديد لإطار عرض واحد بعد تبديل الأداة/عملة الحساب.
   * `key` = زوج التحويل المتوقَّع (مفتاح الطلب)، و`invert` لما جُلب فعلاً — قد يكون الزوج المعكوس. */
  const [convQuote, setConvQuote] = useState<{ key: string; symbol: string; invert: boolean; price: number } | null>(
    null
  );
  const [convLoading, setConvLoading] = useState(false);
  const [convFailed, setConvFailed] = useState(false);
  /** إدخال يدوي لسعر التحويل عند تعذّر جلبه — لا تتوقف الحاسبة بسبب انقطاع مزوّد الأسعار */
  const [manualConv, setManualConv] = useState('');
  const gen = useRef(0);
  /** خانة النقاط مملوءة من سعرَي الدخول/الوقف (لا يدوياً) — فتُمسح إن لم يعد السعران صالحين */
  const slFromPrices = useRef(false);
  const mountedRef = useRef(true);
  const loadedRef = useRef(false);

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
          const p = JSON.parse(raw) as { balance?: string; riskPct?: string; account?: string };
          if (typeof p.balance === 'string') setBalance(p.balance);
          if (typeof p.riskPct === 'string') setRiskPct(p.riskPct);
          if (p.account && (ACCOUNT_CCYS as string[]).includes(p.account)) setAccount(p.account as AccountCcy);
        }
      } catch {
        /* ignore */
      } finally {
        loadedRef.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    AsyncStorage.setItem(STORE_KEY, JSON.stringify({ balance, riskPct, account })).catch(() => {
      /* ignore */
    });
  }, [balance, riskPct, account]);

  /**
   * تبديل الزوج من شريط رموز شاشة الأدوات يصل هنا بـ`defaultSymbol` — وكان يُهمَل بعد أول تركيب،
   * فتبقى الحاسبة على زوج قديم بينما بقية التبويبات تحوّلت (نفس المزامنة القائمة بالدفتر/التنبيهات/
   * الباكتست). **الحارس**: لا نبدّل وسط خطة مكتوبة — تغيير الأداة يغيّر حجم النقطة، فأرقام دخول/وقف/
   * هدف لزوج آخر كانت ستُحسب بقيمة نقطة لا تخصّها. رمز غير قابل للحساب (DXY) يُترك كما هو.
   */
  const planTypedRef = useRef(false);
  planTypedRef.current = [entryPx, stopPx, targetPx].some((v) => v.trim() !== '');
  useEffect(() => {
    if (!defaultSymbol || planTypedRef.current) return;
    if (!instrumentSpec(defaultSymbol)) return;
    setSymbol(defaultSymbol);
  }, [defaultSymbol]);

  const spec = useMemo(() => instrumentSpec(symbol), [symbol]);
  const conv = useMemo(() => (spec ? conversionPair(spec.quote, account) : null), [spec, account]);
  const convSymbol = conv?.symbol ?? null;
  const convInvert = conv?.invert ?? false;

  useEffect(() => {
    const g = ++gen.current;
    setConvQuote(null);
    setConvFailed(false);
    setManualConv('');
    if (!convSymbol) {
      setConvLoading(false);
      return;
    }
    setConvLoading(true);
    // الزوج المتوقَّع أولاً، ثم المعكوس تلقائياً (CHFZAR ↔ ZARCHF…) قبل اللجوء للإدخال اليدوي
    const tries = [
      { symbol: convSymbol, invert: convInvert },
      reversedConversion({ symbol: convSymbol, invert: convInvert }),
    ];
    // سعر تجريبي بذري (المزوّد غير متاح أو لا يعرف الزوج — كان يُعيد ~1.0 لزوج مجهول) يُعامَل كفشل:
    // حساب لوت من سعر تحويل مختلَق أخطر من طلب السعر يدوياً (راجع `isRealQuote`).
    const fetchPrice = (sym: string) =>
      api.marketQuote(sym).then(
        (q) => (isRealQuote(q) ? q.price : null),
        () => null
      );
    const id = setTimeout(() => {
      (async () => {
        for (const c of tries) {
          const price = await fetchPrice(c.symbol);
          if (!mountedRef.current || g !== gen.current) return;
          if (price != null) {
            setConvQuote({ key: convSymbol, symbol: c.symbol, invert: c.invert, price });
            setConvLoading(false);
            return;
          }
        }
        setConvFailed(true);
        setConvLoading(false);
      })();
    }, 400);
    return () => clearTimeout(id);
  }, [convSymbol, convInvert]);

  /** أرقام عربية/فاصل آلاف/فاصلة عشرية — راجع parseDecimal.ts. NaN = فارغ أو غير صالح. */
  const num = (s: string) => parseDecimal(s) ?? NaN;
  /** خانة فيها نص لكنه ليس رقماً مفهوماً («10,000» مبهم، «1.2.3») — نقول ذلك بدل «أدخل الرصيد…» */
  const badNumber = [balance, riskPct, slPips, entryPx, stopPx, targetPx, manualConv].some(
    (v) => v.trim() !== '' && parseDecimal(v) == null
  );
  const derivedSl = spec ? slPipsFromPrices(spec, num(entryPx), num(stopPx)) : null;

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
  const slTyped = num(slPips);
  const slMismatch =
    !slFromPrices.current && derivedSl != null && Number.isFinite(slTyped) && Math.abs(slTyped - derivedSl) > 0.05
      ? { typed: slPips.trim(), derived: derivedSl }
      : null;
  const fetchedConv = convQuote && convQuote.key === convSymbol ? convQuote : null;
  const manual = num(manualConv);
  // السعر المجلوب بترتيب زوجه الفعلي (قد يكون معكوساً)، وإلا الإدخال اليدوي بترتيب الزوج المعروض
  const rate = fetchedConv
    ? quoteToAccountRate({ invert: fetchedConv.invert }, fetchedConv.price)
    : quoteToAccountRate(conv, Number.isFinite(manual) && manual > 0 ? manual : null);
  const pv = spec && rate != null ? pipValuePerLot(spec, rate) : null;
  const result =
    spec && pv != null
      ? positionSize({
          balance: num(balance),
          riskPct: num(riskPct),
          slPips: num(slPips),
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
    const e = num(entryPx);
    const sPx = num(stopPx);
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
    const e = num(entryPx);
    const sPx = num(stopPx);
    const tPx = num(targetPx);
    if (!spec || planSide == null || !Number.isFinite(tPx) || tPx <= 0) return null;
    return analyzePlan({ symbol: spec.symbol, side: planSide, entry: e, sl: sPx, tp: tPx });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, planSide, entryPx, stopPx, targetPx]);
  /** الهدف بالجهة الخطأ (فوق الدخول ببيع/تحته بشراء) — خطأ كتابة شائع، يُقال صراحةً بدل تجاهل الهدف */
  const targetWrongSide = plan?.issue === 'tpWrongSide';
  const lots = result && !result.belowMinLot ? result.lots : null;
  /** تسجيل الخطة بالدفتر جارٍ / نتيجته — نقرة واحدة بدل إعادة كتابة الأرقام الأربعة بلوحة الدفتر */
  const [logBusy, setLogBusy] = useState(false);
  const [logMsg, setLogMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // تغيّر أي رقم بالخطة يمسح رسالة التسجيل ويتيح الزر من جديد — وبقاؤها يمنع نقرة ثانية تُنشئ صفقة مكرّرة
  useEffect(() => {
    setLogMsg(null);
  }, [symbol, account, balance, riskPct, slPips, entryPx, stopPx, targetPx]);
  // السعر المجلوب يخصّ رمزاً واحداً ولحظة واحدة: تبديل الأداة يُسقط الرسالة (وإلا بقي «الدخول = ‎1.0850»
  // معروضاً تحت زوج آخر)
  useEffect(() => {
    setLivePxMsg(null);
  }, [symbol]);
  /** الربح المحتمل ≈ نقاط الهدف × قيمة النقطة للوت × اللوت (تقدير كالمخاطرة تماماً) */
  const potentialProfit =
    plan?.ok && plan.rewardPips != null && pv != null && lots != null ? plan.rewardPips * pv * lots : null;

  /**
   * «سجّل الخطة بالدفتر»: الأرقام هنا (رمز/دخول/وقف/هدف) هي نفسها التي يطلبها الدفتر — إعادة كتابتها
   * يدوياً كانت أكثر خطوة مملّة ومَظنّة خطأ. تُسجَّل صفقة **مفتوحة** (بلا خروج) بحجم اللوت المحسوب
   * وملاحظة مختصرة، والاتجاه من موضع الوقف. لا يظهر الزر إلا بخطة صالحة وحجم لوت محسوب.
   */
  const logPlanToJournal = async () => {
    const e = num(entryPx);
    const sPx = num(stopPx);
    const tPx = num(targetPx);
    if (!spec || !plan?.ok || planSide == null || lots == null || logBusy || logMsg?.ok) return;
    setLogBusy(true);
    setLogMsg(null);
    try {
      await api.createTrade({
        symbol: spec.symbol,
        side: planSide,
        entry: e,
        sl: sPx,
        tp: tPx,
        size: lots,
        // ملاحظة محايدة اللغة: الأرقام هي المقصودة، وتظهر كما هي بسطر الصفقة بالدفتر
        note: `${lots.toFixed(2)} lot · risk ${result ? result.actualRisk.toFixed(2) : ''} ${account} · R:R ${formatRR(plan.rr)}`,
      });
      if (!mountedRef.current) return;
      setLogMsg({ ok: true, text: t.riskCalcLoggedToJournal });
    } catch {
      if (mountedRef.current) setLogMsg({ ok: false, text: t.riskCalcLogFailed });
    } finally {
      if (mountedRef.current) setLogBusy(false);
    }
  };

  /**
   * «الدخول = السعر الحالي»: المتداول يخطّط حول السعر الذي أمامه على الشارت، وكتابته يدوياً من الشارت
   * إلى الحاسبة أكثر خطوة يخطئ فيها (رقم ناقص = حجم لوت خاطئ). الجهة تُستنتج من موضع الوقف إن كُتب
   * (وقف تحت السعر = شراء → Ask، وهو ما يُنفَّذ عليه فعلاً)، وبلا وقف يُستخدم السعر الوسطي.
   * اقتباس بذري تجريبي لا يُستخدم أبداً (`isRealQuote`) — حجم مركز من سعر مختلَق أخطر من لا شيء.
   */
  const fillEntryFromLive = async () => {
    if (!spec || livePxBusy) return;
    const sym = spec.symbol;
    setLivePxBusy(true);
    setLivePxMsg(null);
    try {
      const q = await api.marketQuote(sym);
      if (!mountedRef.current) return;
      if (!isRealQuote(q)) {
        setLivePxMsg({ ok: false, text: t.riskCalcNoLiveQuote });
        return;
      }
      const stop = num(stopPx);
      const side = Number.isFinite(stop) && stop > 0 ? (stop < q.price ? 'buy' : 'sell') : null;
      const sidePx = side === 'buy' ? q.ask : side === 'sell' ? q.bid : null;
      const px = typeof sidePx === 'number' && Number.isFinite(sidePx) && sidePx > 0 ? sidePx : q.price;
      const text = formatPrice(px, sym);
      setEntryPx(text);
      setLivePxMsg({ ok: true, text: `${t.riskCalcLiveFilled} ${text}` });
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
  const money = (v: number) => `${group(v.toFixed(2))} ${account}`;
  const pipLabel = spec ? String(spec.pipSize) : '';
  const riskNum = num(riskPct);
  /**
   * سقف الـ100 كان يُسكِت التحذير **عند الطرف الأخطر بالضبط**: من يكتب «20» فيصير الرقم «200»
   * بضغطة زائدة يرى ⚠ عند 20% ثم يختفي التحذير كلّه عند 200%. الشرط الآن بلا سقف.
   */
  const riskHigh = Number.isFinite(riskNum) && riskNum > 2;
  /**
   * نسبة فوق 100% مستحيلة (لا يُخاطَر بأكثر من الرصيد كلّه) فيرفضها `positionSize` وتعود النتيجة
   * `null` — وكان الصندوق يقول حينها «أدخل الرصيد ونسبة المخاطرة ووقف الخسارة» والثلاثة مكتوبة
   * أمام المتداول، فيظنّ العطل بخانة أخرى ويقلّب فيها. التحذير ظاهر عند خانة النسبة نفسها، فلا
   * يُضاف سطر يناقضه.
   */
  const riskImpossible = Number.isFinite(riskNum) && riskNum > 100;

  const chip = (label: string, on: boolean, onPress: () => void, a11y: string) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [
        styles.chip,
        on && styles.chipOn,
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
      maxLength={decimal ? 12 : 10}
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
        {QUICK_SYMBOLS.map((s) => chip(s, spec?.symbol === s, () => setSymbol(s), `${t.riskCalcSymbol}: ${s}`))}
      </View>
      {input(symbol, setSymbol, 'EURUSD', t.riskCalcSymbol, false)}
      {!spec && symbol.trim().length > 0 ? (
        <Text style={[styles.warn, { textAlign: align }]}>{t.riskCalcBadSymbol}</Text>
      ) : null}

      <Text style={[styles.label, { textAlign: align }]}>{t.riskCalcAccountCcy}</Text>
      <View style={[styles.chips, rtl && styles.chipsRtl]}>
        {ACCOUNT_CCYS.map((c) => chip(c, account === c, () => setAccount(c), `${t.riskCalcAccountCcy}: ${c}`))}
      </View>

      <Text style={[styles.label, { textAlign: align }]}>
        {t.riskCalcBalance} ({account})
      </Text>
      {input(balance, setBalance, '10000', t.riskCalcBalance)}

      <Text style={[styles.label, { textAlign: align }]}>{t.riskCalcRiskPct}</Text>
      <View style={[styles.chips, rtl && styles.chipsRtl]}>
        {QUICK_RISK.map((r) => chip(`${r}%`, riskPct === r, () => setRiskPct(r), `${t.riskCalcRiskPct}: ${r}%`))}
      </View>
      {input(riskPct, setRiskPct, '1', t.riskCalcRiskPct)}
      {riskHigh ? <Text style={[styles.warn, { textAlign: align }]}>{t.riskCalcHighRisk}</Text> : null}

      <Text style={[styles.label, { textAlign: align }]}>
        {t.riskCalcSlPips}
        {spec ? ` · 1 pip = ${pipLabel}` : ''}
      </Text>
      {input(slPips, onSlPipsChange, '20', t.riskCalcSlPips)}
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
            accessibilityLabel={t.riskCalcUseLivePriceA11y}
          >
            <Text style={styles.chipText}>{livePxBusy ? '...' : t.riskCalcUseLivePrice}</Text>
          </Pressable>
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
      {targetWrongSide ? (
        <Text style={[styles.warn, { textAlign: align }]}>
          {num(stopPx) < num(entryPx) ? t.planTpWrongBuy : t.planTpWrongSell}
        </Text>
      ) : null}
      {derivedSl != null ? (
        <Text style={[styles.hint, styles.hintOn, { textAlign: align }]} accessibilityLiveRegion="polite">
          = {derivedSl} pip
        </Text>
      ) : null}
      {slMismatch ? (
        <Text style={[styles.warn, { textAlign: align }]} accessibilityLiveRegion="polite">
          {t.riskCalcSlMismatch.replace('{pips}', slMismatch.typed).replace('{derived}', String(slMismatch.derived))}
        </Text>
      ) : null}

      {conv && convLoading ? <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.sm }} /> : null}
      {conv && convFailed ? (
        <>
          <Text style={[styles.warn, { textAlign: align }]}>
            {t.riskCalcConvFailed} {conv.symbol}
          </Text>
          {input(manualConv, setManualConv, conv.symbol, `${t.riskCalcConvManual} ${conv.symbol}`)}
        </>
      ) : null}

      <View style={styles.resultBox}>
        {result && !result.belowMinLot ? (
          <>
            <Text style={[styles.resultLabel, { textAlign: align }]}>{t.riskCalcLots}</Text>
            <Text style={[styles.resultLots, { textAlign: align }]} accessibilityLiveRegion="polite">
              {result.lots.toFixed(2)}
            </Text>
            <Text style={[styles.resultMeta, { textAlign: align }]}>
              {t.riskCalcRiskAmount}: {money(result.actualRisk)} · {t.riskCalcUnits}:{' '}
              {group(String(result.units))}
            </Text>
          </>
        ) : result && result.belowMinLot ? (
          <Text style={[styles.warn, { textAlign: align }]}>
            {t.riskCalcBelowMin} ({money(result.riskAmount)})
          </Text>
        ) : badNumber ? (
          <Text style={[styles.warn, { textAlign: align }]}>{t.invalidNumberHint}</Text>
        ) : riskImpossible ? null : (
          <Text style={[styles.resultMeta, { textAlign: align }]}>{t.riskCalcFillHint}</Text>
        )}
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
              {t.planRewardWord} {formatPips(plan.rewardPips) ?? '—'} pip · R:R {formatRR(plan.rr)}
              {potentialProfit != null ? ` · ${t.riskCalcPotentialProfit} ≈ ${money(potentialProfit)}` : ''}
            </Text>
            {plan.rr != null && plan.rr < 1 ? (
              <Text style={[styles.warn, { textAlign: align }]}>{t.planLowRR}</Text>
            ) : null}
          </>
        ) : null}
        {pv != null ? (
          <Text style={[styles.resultMeta, { textAlign: align }]}>
            {t.riskCalcPipValue}: {money(pv)}
          </Text>
        ) : null}
      </View>
      {plan?.ok && lots != null ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: logBusy || logMsg?.ok === true, busy: logBusy }}
            // بعد نجاح التسجيل يبقى معطَّلاً حتى يتغيّر رقم بالخطة — نقرة ثانية كانت تُنشئ صفقة مكرّرة
            disabled={logBusy || logMsg?.ok === true}
            style={({ pressed }) => [
              styles.logBtn,
              (logBusy || logMsg?.ok === true) && { opacity: 0.5 },
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => void logPlanToJournal()}
            // الاتجاه بنصّ الزر الصوتي أيضاً: هنا بالضبط يُكتب `side` بالدفتر بلا أن يختاره المتداول.
            accessibilityLabel={`${t.riskCalcLogToJournal} — ${planSide === 'sell' ? t.dirSell : t.dirBuy}`}
            hitSlop={8}
          >
            <Text style={styles.logBtnText}>{logBusy ? '...' : t.riskCalcLogToJournal}</Text>
          </Pressable>
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
  wrap: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
  },
  title: { color: colors.text, fontWeight: '800', fontSize: 14 },
  sub: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chipsRtl: { flexDirection: 'row-reverse' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  chipTextOn: { color: colors.accent },
  input: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: spacing.sm,
    fontSize: 13,
  },
  warn: { color: colors.warn, fontSize: 11, fontWeight: '700' },
  hint: { color: colors.textDim, fontSize: 10, marginTop: 2 },
  hintOn: { color: colors.accent, fontWeight: '700' },
  pxRow: { flexDirection: 'row', gap: 6 },
  pxRowRtl: { flexDirection: 'row-reverse' },
  pxCell: { flex: 1 },
  resultBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentFaint,
    gap: 2,
  },
  resultLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  resultLots: { color: colors.accent, fontSize: 28, fontWeight: '800' },
  resultMeta: { color: colors.textDim, fontSize: 11 },
  sideLine: { fontSize: 13, fontWeight: '800' },
  sideHint: { color: colors.textDim, fontSize: 10, fontWeight: '600' },
  disclaimer: { color: colors.textDim, fontSize: 10, marginTop: spacing.xs },
  logBtn: {
    marginTop: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  logBtnText: { color: colors.accent, fontWeight: '800', fontSize: 12 },
  logOk: { color: colors.bull, fontSize: 11, fontWeight: '700' },
});
