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
import {
  analyzePlan,
  formatPips,
  formatR,
  formatRR,
  levelSideIssue,
  realizedR,
  type PlanIssue,
  type TradePlan,
} from '../tradePlan';

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

export function TradeJournalPanel() {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState('EURUSD');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [entry, setEntry] = useState('');
  const [exit, setExit] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  /** وضوح الحالة: يميّز "لا صفقات بعد" فعلياً عن فشل تحميل السجل */
  const [listError, setListError] = useState(false);
  /** وضوح الحالة: يعلم المستخدم إذا فشلت إضافة صفقة بدل صمت كامل (لم يكن هناك حتى catch) */
  const [formError, setFormError] = useState<string | null>(null);

  // حارس "alive" مبني على ref يمنع تحديث الحالة بعد إلغاء تركيب اللوحة (تبديل تبويب
  // ToolsScreen قبل اكتمال الطلب) — نفس مبدأ ChartFrame/SymbolSnapshot المؤسَّس بالكود.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await api.trades();
      if (!mountedRef.current) return;
      setTrades(res.trades as Trade[]);
      setStats(res.stats as Stats);
      setListError(false);
    } catch {
      if (mountedRef.current) {
        setTrades([]);
        setStats(null);
        setListError(true);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  const add = async () => {
    const e = num(entry);
    if (!symbol.trim() || e == null) {
      setFormError(t.journalInvalidEntry);
      return;
    }
    if ([sl, tp, exit].some(unreadable)) {
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
    try {
      const x = num(exit);
      await api.createTrade({
        symbol: symbol.trim().toUpperCase(),
        side,
        entry: e,
        exit: x ?? undefined,
        sl: s ?? undefined,
        tp: p ?? undefined,
        note,
      });
      playSoftClick();
      setEntry('');
      setExit('');
      setSl('');
      setTp('');
      setNote('');
      await refresh();
    } catch {
      setFormError(t.journalAddError);
    } finally {
      setBusy(false);
    }
  };

  const closeOpen = async (id: string) => {
    const x = num(exit);
    if (x == null) return;
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

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { textAlign: align }]}>{t.journalTitle}</Text>
      <Text style={[styles.sub, { textAlign: align }]}>{t.journalSub}</Text>

      {stats ? (
        <View style={styles.stats}>
          <Text style={[styles.stat, { textAlign: align }]}>
            {t.journalStatClosed.replace('{n}', String(stats.trade_count))}
          </Text>
          <Text style={[styles.stat, { textAlign: align }]}>
            {t.journalStatWinRate.replace('{pct}', String(stats.win_rate))}
          </Text>
          <Text style={[styles.stat, { textAlign: align }]}>
            {t.journalStatTotalPnl.replace('{pct}', String(stats.total_pnl_pct))}
          </Text>
          <Text style={[styles.stat, { textAlign: align }]}>
            {t.journalStatBestWorst
              .replace('{best}', String(stats.best))
              .replace('{worst}', String(stats.worst))}
          </Text>
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
      <TextInput
        style={[styles.input, { textAlign: align }]}
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
        accessibilityLabel={t.journalAddA11y}
        hitSlop={8}
      >
        <Text style={styles.btnText}>{busy ? '...' : t.journalAddBtn}</Text>
      </Pressable>
      {formError ? <Text style={[styles.formError, { textAlign: align }]}>{formError}</Text> : null}

      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {!loading && trades.length === 0 ? (
        <Text style={[styles.empty, { textAlign: align }]}>
          {listError ? t.journalLoadError : t.journalEmpty}
        </Text>
      ) : null}
      <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
        {trades.map((tr) => (
          <View key={tr.id} style={styles.trade}>
            <Text style={[styles.tradeMain, { textAlign: align }]}>
              {/* الاتجاه بلا لبس: سهم ولون وكلمة مترجمة بدل "BUY"/"SELL" اللاتينية */}
              <Text style={{ color: tr.side === 'sell' ? colors.bear : colors.bull }}>
                {tr.side === 'sell' ? `▼ ${t.dirSell}` : `▲ ${t.dirBuy}`}
              </Text>{' '}
              {tr.symbol} · {formatPrice(tr.entry, tr.symbol)}
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
            <Text style={[styles.tradeMeta, { textAlign: align }]}>
              {tr.status}
              {tr.pnl != null ? ` · PnL ${tr.pnl >= 0 ? '+' : ''}${Number(tr.pnl).toFixed(2)}%` : ''}
              {tr.note ? ` · ${tr.note}` : ''}
            </Text>
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
                onPress={() => void closeOpen(tr.id)}
                disabled={busy}
                accessibilityState={{ disabled: busy }}
                accessibilityLabel={t.journalCloseLinkA11y.replace('{symbol}', tr.symbol)}
                hitSlop={8}
              >
                <Text style={[styles.closeLink, { textAlign: align }]}>{t.journalCloseLinkBtn}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </ScrollView>
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
});
