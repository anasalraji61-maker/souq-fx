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
  quoteToAccountRate,
  pipValuePerLot,
  positionSize,
  slPipsFromPrices,
} from '../positionSize';

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
  /** سعر زوج التحويل (عملة التسعير → عملة الحساب)؛ null أثناء التحميل أو عند الفشل */
  const [convPrice, setConvPrice] = useState<number | null>(null);
  const [convLoading, setConvLoading] = useState(false);
  const [convFailed, setConvFailed] = useState(false);
  /** إدخال يدوي لسعر التحويل عند تعذّر جلبه — لا تتوقف الحاسبة بسبب انقطاع مزوّد الأسعار */
  const [manualConv, setManualConv] = useState('');
  const gen = useRef(0);
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

  const spec = useMemo(() => instrumentSpec(symbol), [symbol]);
  const conv = useMemo(() => (spec ? conversionPair(spec.quote, account) : null), [spec, account]);
  const convSymbol = conv?.symbol ?? null;

  useEffect(() => {
    const g = ++gen.current;
    setConvPrice(null);
    setConvFailed(false);
    setManualConv('');
    if (!convSymbol) {
      setConvLoading(false);
      return;
    }
    setConvLoading(true);
    const id = setTimeout(() => {
      api
        .marketQuote(convSymbol)
        .then((q) => {
          if (!mountedRef.current || g !== gen.current) return;
          const ok = typeof q.price === 'number' && Number.isFinite(q.price) && q.price > 0;
          setConvPrice(ok ? q.price : null);
          setConvFailed(!ok);
        })
        .catch(() => {
          if (mountedRef.current && g === gen.current) setConvFailed(true);
        })
        .finally(() => {
          if (mountedRef.current && g === gen.current) setConvLoading(false);
        });
    }, 400);
    return () => clearTimeout(id);
  }, [convSymbol]);

  const num = (s: string) => parseFloat(s.replace(',', '.'));
  const derivedSl = spec ? slPipsFromPrices(spec, num(entryPx), num(stopPx)) : null;

  // الوقف من السعر يكتب قيمته بخانة النقاط (مصدر واحد للحساب)؛ تعديل النقاط يدوياً يبقى ممكناً بعده.
  // تغيير الأداة يعيد الحساب بحجم pip الجديد (الين/الذهب).
  useEffect(() => {
    if (derivedSl != null) setSlPips(String(derivedSl));
  }, [derivedSl]);
  const manual = num(manualConv);
  const pairPrice = convPrice ?? (Number.isFinite(manual) && manual > 0 ? manual : null);
  const rate = quoteToAccountRate(conv, pairPrice);
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

  const money = (v: number) =>
    `${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${account}`;
  const pipLabel = spec ? String(spec.pipSize) : '';
  const riskNum = num(riskPct);
  const riskHigh = Number.isFinite(riskNum) && riskNum > 2 && riskNum <= 100;

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
      {input(slPips, setSlPips, '20', t.riskCalcSlPips)}
      <Text style={[styles.hint, { textAlign: align }]}>{t.riskCalcFromPrice}</Text>
      <View style={[styles.pxRow, rtl && styles.pxRowRtl]}>
        <View style={styles.pxCell}>
          {input(entryPx, setEntryPx, t.riskCalcEntry, t.riskCalcEntry)}
        </View>
        <View style={styles.pxCell}>
          {input(stopPx, setStopPx, t.riskCalcStop, t.riskCalcStop)}
        </View>
      </View>
      {derivedSl != null ? (
        <Text style={[styles.hint, styles.hintOn, { textAlign: align }]} accessibilityLiveRegion="polite">
          = {derivedSl} pip
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
              {result.units.toLocaleString()}
            </Text>
          </>
        ) : result && result.belowMinLot ? (
          <Text style={[styles.warn, { textAlign: align }]}>
            {t.riskCalcBelowMin} ({money(result.riskAmount)})
          </Text>
        ) : (
          <Text style={[styles.resultMeta, { textAlign: align }]}>{t.riskCalcFillHint}</Text>
        )}
        {pv != null ? (
          <Text style={[styles.resultMeta, { textAlign: align }]}>
            {t.riskCalcPipValue}: {money(pv)}
          </Text>
        ) : null}
      </View>
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
  disclaimer: { color: colors.textDim, fontSize: 10, marginTop: spacing.xs },
});
