import React, { useCallback, useEffect, useState } from 'react';
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

type Trade = {
  id: string;
  symbol: string;
  side: string;
  entry: number;
  exit?: number | null;
  size: number;
  pnl?: number | null;
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
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState('EURUSD');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [entry, setEntry] = useState('');
  const [exit, setExit] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  /** وضوح الحالة: يميّز "لا صفقات بعد" فعلياً عن فشل تحميل السجل */
  const [listError, setListError] = useState(false);
  /** وضوح الحالة: يعلم المستخدم إذا فشلت إضافة صفقة بدل صمت كامل (لم يكن هناك حتى catch) */
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api.trades();
      setTrades(res.trades as Trade[]);
      setStats(res.stats as Stats);
      setListError(false);
    } catch {
      setTrades([]);
      setStats(null);
      setListError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = async () => {
    const e = parseFloat(entry);
    if (!symbol.trim() || Number.isNaN(e)) return;
    setBusy(true);
    setFormError(null);
    try {
      const x = exit.trim() ? parseFloat(exit) : undefined;
      await api.createTrade({
        symbol: symbol.trim().toUpperCase(),
        side,
        entry: e,
        exit: x != null && !Number.isNaN(x) ? x : undefined,
        note,
      });
      playSoftClick();
      setEntry('');
      setExit('');
      setNote('');
      await refresh();
    } catch {
      setFormError('تعذر إضافة الصفقة — تحقق من الاتصال وحاول مرة أخرى');
    } finally {
      setBusy(false);
    }
  };

  const closeOpen = async (id: string) => {
    const x = exit.trim() ? parseFloat(exit) : NaN;
    if (Number.isNaN(x)) return;
    setBusy(true);
    try {
      await api.closeTrade(id, x);
      playSoftClick();
      await refresh();
    } catch {
      Alert.alert('تعذر الإغلاق', 'حدث خطأ أثناء إغلاق الصفقة، حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>دفتر الصفقات · PnL حقيقي</Text>
      <Text style={styles.sub}>سجّل صفقاتك — التقارير تُبنى من يوميتك</Text>

      {stats ? (
        <View style={styles.stats}>
          <Text style={styles.stat}>صفقات مغلقة: {stats.trade_count}</Text>
          <Text style={styles.stat}>نسبة نجاح: {stats.win_rate}%</Text>
          <Text style={styles.stat}>إجمالي PnL: {stats.total_pnl_pct}%</Text>
          <Text style={styles.stat}>
            أفضل/أسوأ: {stats.best}% / {stats.worst}%
          </Text>
        </View>
      ) : null}

      <View style={styles.row}>
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
          accessibilityLabel="اتجاه الصفقة: شراء"
        >
          <Text style={[styles.chipText, side === 'buy' && styles.chipTextOn]}>Buy</Text>
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
          accessibilityLabel="اتجاه الصفقة: بيع"
        >
          <Text style={[styles.chipText, side === 'sell' && styles.chipTextOn]}>Sell</Text>
        </Pressable>
      </View>
      <TextInput
        style={styles.input}
        value={symbol}
        onChangeText={setSymbol}
        placeholder="الرمز"
        placeholderTextColor={colors.textDim}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
        underlineColorAndroid="transparent"
        clearButtonMode="while-editing"
        keyboardAppearance="dark"
        selectionColor={colors.accent}
        accessibilityLabel="رمز الصفقة"
      />
      <TextInput
        style={styles.input}
        value={entry}
        onChangeText={setEntry}
        placeholder="دخول"
        keyboardType="decimal-pad"
        maxLength={12}
        placeholderTextColor={colors.textDim}
        returnKeyType="done"
        underlineColorAndroid="transparent"
        clearButtonMode="while-editing"
        keyboardAppearance="dark"
        selectionColor={colors.accent}
        accessibilityLabel="سعر الدخول"
      />
      <TextInput
        style={styles.input}
        value={exit}
        onChangeText={setExit}
        placeholder="خروج (اختياري)"
        keyboardType="decimal-pad"
        maxLength={12}
        placeholderTextColor={colors.textDim}
        returnKeyType="done"
        underlineColorAndroid="transparent"
        clearButtonMode="while-editing"
        keyboardAppearance="dark"
        selectionColor={colors.accent}
        accessibilityLabel="سعر الخروج (اختياري)"
      />
      <TextInput
        style={styles.input}
        value={note}
        onChangeText={setNote}
        placeholder="ملاحظة"
        placeholderTextColor={colors.textDim}
        returnKeyType="done"
        underlineColorAndroid="transparent"
        clearButtonMode="while-editing"
        keyboardAppearance="dark"
        selectionColor={colors.accent}
        accessibilityLabel="ملاحظة الصفقة (اختياري)"
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
        accessibilityLabel="إضافة صفقة جديدة"
      >
        <Text style={styles.btnText}>{busy ? '...' : 'إضافة صفقة'}</Text>
      </Pressable>
      {formError ? <Text style={styles.formError}>{formError}</Text> : null}

      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {!loading && trades.length === 0 ? (
        <Text style={styles.empty}>{listError ? 'تعذر تحميل السجل' : 'لا صفقات مسجّلة بعد'}</Text>
      ) : null}
      <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
        {trades.map((t) => (
          <View key={t.id} style={styles.trade}>
            <Text style={styles.tradeMain}>
              {t.side.toUpperCase()} {t.symbol} · {t.entry}
              {t.exit != null ? ` → ${t.exit}` : ' (مفتوحة)'}
            </Text>
            <Text style={styles.tradeMeta}>
              {t.status}
              {t.pnl != null ? ` · PnL ${t.pnl >= 0 ? '+' : ''}${Number(t.pnl).toFixed(2)}%` : ''}
              {t.note ? ` · ${t.note}` : ''}
            </Text>
            {t.status === 'open' ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  busy && styles.closeLinkDisabled,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => void closeOpen(t.id)}
                disabled={busy}
                accessibilityState={{ disabled: busy }}
                accessibilityLabel={`إغلاق صفقة ${t.symbol} بسعر خانة الخروج`}
              >
                <Text style={styles.closeLink}>إغلاق بسعر خانة الخروج</Text>
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
  row: { flexDirection: 'row-reverse', gap: spacing.sm },
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
  closeLink: { color: colors.accent, textAlign: 'right', fontSize: 11, fontWeight: '700' },
  closeLinkDisabled: { opacity: 0.4 },
});
