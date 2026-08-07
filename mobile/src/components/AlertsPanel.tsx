import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors, radii, spacing } from '../theme';
import { api, type PriceAlert } from '../api';
import { ensureAlertNotifications, pushPriceAlert, registerPushToken } from '../notifications';

type Props = {
  defaultSymbol?: string;
};

export function AlertsPanel({ defaultSymbol = 'EURUSD' }: Props) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api.alerts();
      setAlerts(res.alerts);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const check = useCallback(async () => {
    try {
      const res = await api.checkAlerts();
      setAlerts(res.alerts);
      if (res.triggered.length) {
        const msg = res.triggered.map((t) => `${t.symbol} ${t.condition} ${t.price}`).join(' · ');
        setFlash(msg);
        for (const t of res.triggered) {
          await pushPriceAlert(
            'MATRIX · تنبيه سعر',
            `${t.symbol} ${t.condition === 'above' ? 'فوق' : 'تحت'} ${t.price}`
          );
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void ensureAlertNotifications().then(() => registerPushToken());
    refresh();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [refresh, check]);

  const add = async () => {
    const p = parseFloat(price.replace(',', '.'));
    if (!symbol.trim() || Number.isNaN(p)) return;
    setBusy(true);
    try {
      await api.createAlert({ symbol: symbol.trim().toUpperCase(), condition, price: p, note });
      setPrice('');
      setNote('');
      await refresh();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.deleteAlert(id);
      await refresh();
    } catch {
      /* ignore */
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>تنبيهات السعر</Text>
      <Text style={styles.sub}>فوق / تحت · Twelve Data · إشعار عند التفعيل</Text>
      {flash ? <Text style={styles.flash}>🔔 {flash}</Text> : null}

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={symbol}
          onChangeText={setSymbol}
          placeholder="EURUSD"
          placeholderTextColor={colors.textDim}
        />
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="السعر"
          placeholderTextColor={colors.textDim}
          keyboardType="decimal-pad"
        />
        <View style={styles.row}>
          <Pressable
            style={[styles.cond, condition === 'above' && styles.condOn]}
            onPress={() => setCondition('above')}
          >
            <Text style={[styles.condText, condition === 'above' && styles.condTextOn]}>فوق</Text>
          </Pressable>
          <Pressable
            style={[styles.cond, condition === 'below' && styles.condOn]}
            onPress={() => setCondition('below')}
          >
            <Text style={[styles.condText, condition === 'below' && styles.condTextOn]}>تحت</Text>
          </Pressable>
          <Pressable style={styles.addBtn} onPress={add} disabled={busy}>
            <Text style={styles.addText}>{busy ? '...' : 'إضافة'}</Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="ملاحظة (اختياري)"
          placeholderTextColor={colors.textDim}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} />
      ) : (
        <ScrollView style={{ maxHeight: 160 }}>
          {alerts.length === 0 ? (
            <Text style={styles.empty}>لا تنبيهات بعد</Text>
          ) : (
            alerts.map((a) => (
              <View key={a.id} style={styles.item}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemSym}>
                    {a.symbol} {a.condition === 'above' ? '≥' : '≤'} {a.price}
                    {a.triggered ? ' ✓' : ''}
                  </Text>
                  {a.note ? <Text style={styles.itemNote}>{a.note}</Text> : null}
                </View>
                <Pressable onPress={() => remove(a.id)}>
                  <Text style={styles.del}>حذف</Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    overflow: 'hidden',
  },
  title: { color: colors.text, fontWeight: '800', fontSize: 15, textAlign: 'right' },
  sub: { color: colors.textDim, fontSize: 11, textAlign: 'right', marginTop: 2 },
  flash: {
    color: colors.warn,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 6,
    fontWeight: '700',
  },
  form: { marginTop: spacing.sm, gap: 6 },
  input: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: 'right',
    fontSize: 13,
  },
  row: { flexDirection: 'row-reverse', gap: 6 },
  cond: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  condOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  condText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  condTextOn: { color: colors.accent },
  addBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { color: '#042F2E', fontWeight: '800', fontSize: 12 },
  empty: { color: colors.textDim, textAlign: 'right', marginTop: 8, fontSize: 12 },
  item: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  itemSym: { color: colors.text, fontWeight: '700', textAlign: 'right', fontSize: 13 },
  itemNote: { color: colors.textDim, fontSize: 11, textAlign: 'right' },
  del: { color: colors.bear, fontWeight: '700', fontSize: 12 },
});
