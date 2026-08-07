import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors, radii, spacing } from '../theme';
import { api } from '../api';

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

  const refresh = useCallback(async () => {
    try {
      const res = await api.trades();
      setTrades(res.trades as Trade[]);
      setStats(res.stats as Stats);
    } catch {
      setTrades([]);
      setStats(null);
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
    try {
      const x = exit.trim() ? parseFloat(exit) : undefined;
      await api.createTrade({
        symbol: symbol.trim().toUpperCase(),
        side,
        entry: e,
        exit: x != null && !Number.isNaN(x) ? x : undefined,
        note,
      });
      setEntry('');
      setExit('');
      setNote('');
      await refresh();
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
      await refresh();
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
          style={[styles.chip, side === 'buy' && styles.chipOn]}
          onPress={() => setSide('buy')}
        >
          <Text style={[styles.chipText, side === 'buy' && styles.chipTextOn]}>Buy</Text>
        </Pressable>
        <Pressable
          style={[styles.chip, side === 'sell' && styles.chipOn]}
          onPress={() => setSide('sell')}
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
      />
      <TextInput
        style={styles.input}
        value={entry}
        onChangeText={setEntry}
        placeholder="دخول"
        keyboardType="decimal-pad"
        placeholderTextColor={colors.textDim}
      />
      <TextInput
        style={styles.input}
        value={exit}
        onChangeText={setExit}
        placeholder="خروج (اختياري)"
        keyboardType="decimal-pad"
        placeholderTextColor={colors.textDim}
      />
      <TextInput
        style={styles.input}
        value={note}
        onChangeText={setNote}
        placeholder="ملاحظة"
        placeholderTextColor={colors.textDim}
      />
      <Pressable style={styles.btn} onPress={() => void add()} disabled={busy}>
        <Text style={styles.btnText}>{busy ? '...' : 'إضافة صفقة'}</Text>
      </Pressable>

      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      <ScrollView style={{ maxHeight: 220 }}>
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
              <Pressable onPress={() => void closeOpen(t.id)}>
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
  wrap: { gap: 8 },
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
  row: { flexDirection: 'row-reverse', gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 8,
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
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#042F2E', fontWeight: '800' },
  trade: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    gap: 2,
  },
  tradeMain: { color: colors.text, textAlign: 'right', fontWeight: '700', fontSize: 12 },
  tradeMeta: { color: colors.textDim, textAlign: 'right', fontSize: 11 },
  closeLink: { color: colors.accent, textAlign: 'right', fontSize: 11, fontWeight: '700' },
});
