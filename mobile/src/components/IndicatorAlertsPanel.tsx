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
import { pushPriceAlert } from '../notifications';

type IndAlert = {
  id: string;
  symbol: string;
  timeframe: string;
  alert_type: string;
  condition: string;
  value?: number;
  note: string;
  triggered: boolean;
};

type Props = {
  defaultSymbol?: string;
};

export function IndicatorAlertsPanel({ defaultSymbol = 'EURUSD' }: Props) {
  const [alerts, setAlerts] = useState<IndAlert[]>([]);
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [type, setType] = useState<'rsi' | 'ma_cross' | 'macd_cross'>('rsi');
  const [condition, setCondition] = useState<'above' | 'below' | 'cross_up' | 'cross_down'>('below');
  const [value, setValue] = useState('30');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  /** وضوح الحالة: يميّز فشل تحميل القائمة عن عدم وجود تنبيهات فعلاً */
  const [listError, setListError] = useState(false);
  /** وضوح الحالة: يعلم المستخدم إذا فشلت إضافة تنبيه مؤشر بدل صمت كامل */
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setSymbol(defaultSymbol);
  }, [defaultSymbol]);

  const refresh = useCallback(async () => {
    try {
      const res = await api.indicatorAlerts();
      setAlerts(res.alerts);
      setListError(false);
    } catch {
      setAlerts([]);
      setListError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(async () => {
      try {
        const res = await api.checkIndicatorAlerts();
        setAlerts(res.alerts);
        for (const t of res.triggered) {
          await pushPriceAlert(
            'MATRIX · تنبيه مؤشر',
            `${t.symbol} ${t.alert_type} ${t.condition}`
          );
        }
      } catch {
        /* ignore */
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const add = async () => {
    setBusy(true);
    setFormError(null);
    try {
      const needsVal = type === 'rsi';
      await api.createIndicatorAlert({
        symbol: symbol.trim().toUpperCase(),
        timeframe: '15m',
        alert_type: type,
        condition: type === 'rsi' ? condition : type.includes('cross') ? condition : 'cross_up',
        value: needsVal ? parseFloat(value.replace(',', '.')) : undefined,
      });
      await refresh();
    } catch {
      setFormError('تعذر إضافة تنبيه المؤشر — تحقق من الاتصال وحاول مرة أخرى');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>تنبيهات المؤشرات</Text>
      <Text style={styles.sub}>RSI · تقاطع MA · MACD</Text>
      <TextInput style={styles.input} value={symbol} onChangeText={setSymbol} placeholder="EURUSD" placeholderTextColor={colors.textDim} autoCapitalize="characters" autoCorrect={false} returnKeyType="done" underlineColorAndroid="transparent" clearButtonMode="while-editing" keyboardAppearance="dark" selectionColor={colors.accent} accessibilityLabel="رمز الأداة" />
      <View style={styles.row}>
        {(['rsi', 'ma_cross', 'macd_cross'] as const).map((t) => (
          <Pressable
            accessibilityRole="button"
            key={t}
            style={({ pressed }) => [
              styles.chip,
              type === t && styles.chipOn,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => setType(t)}
          >
            <Text style={[styles.chipText, type === t && styles.chipTextOn]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      {type === 'rsi' ? (
        <>
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.chip,
                condition === 'below' && styles.chipOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => setCondition('below')}
            >
              <Text style={styles.chipText}>RSI تحت</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.chip,
                condition === 'above' && styles.chipOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => setCondition('above')}
            >
              <Text style={styles.chipText}>RSI فوق</Text>
            </Pressable>
          </View>
          <TextInput style={styles.input} value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder="30" placeholderTextColor={colors.textDim} returnKeyType="done" underlineColorAndroid="transparent" clearButtonMode="while-editing" keyboardAppearance="dark" selectionColor={colors.accent} accessibilityLabel="قيمة عتبة المؤشر" />
        </>
      ) : (
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.chip,
              condition === 'cross_up' && styles.chipOn,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => setCondition('cross_up')}
          >
            <Text style={styles.chipText}>Cross Up</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.chip,
              condition === 'cross_down' && styles.chipOn,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => setCondition('cross_down')}
          >
            <Text style={styles.chipText}>Cross Down</Text>
          </Pressable>
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.btn,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={add}
        disabled={busy}
        accessibilityState={{ disabled: busy }}
      >
        <Text style={styles.btnText}>{busy ? '...' : 'إضافة تنبيه'}</Text>
      </Pressable>
      {formError ? <Text style={styles.formError}>{formError}</Text> : null}
      {loading ? <ActivityIndicator color={colors.accent} /> : listError ? (
        <Text style={styles.formError}>تعذر تحميل تنبيهات المؤشرات</Text>
      ) : (
        <ScrollView style={{ maxHeight: 180 }}>
          {alerts.map((a) => (
            <View key={a.id} style={styles.item}>
              <Text style={styles.itemText}>
                {a.symbol} · {a.alert_type} · {a.condition}
                {a.value != null ? ` ${a.value}` : ''}
                {a.triggered ? ' ✓' : ''}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  Alert.alert(
                    'حذف تنبيه المؤشر؟',
                    `${a.symbol} · ${a.alert_type} · ${a.condition}`,
                    [
                      { text: 'إلغاء', style: 'cancel' },
                      {
                        text: 'حذف',
                        style: 'destructive',
                        onPress: () =>
                          api
                            .deleteIndicatorAlert(a.id)
                            .then(refresh)
                            .catch(() =>
                              Alert.alert('تعذر الحذف', 'حدث خطأ أثناء حذف تنبيه المؤشر، حاول مرة أخرى.')
                            ),
                      },
                    ]
                  )
                }
              >
                <Text style={styles.del}>حذف</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
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
    gap: 8,
  },
  title: { color: colors.text, fontWeight: '800', textAlign: 'right' },
  sub: { color: colors.textDim, fontSize: 11, textAlign: 'right' },
  formError: { color: colors.bear, fontSize: 10, fontWeight: '700', textAlign: 'right' },
  input: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 10,
    textAlign: 'right',
  },
  row: { flexDirection: 'row-reverse', gap: 6, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { color: colors.textMuted, fontWeight: '700', fontSize: 11 },
  chipTextOn: { color: colors.accent },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  btnText: { color: '#042F2E', fontWeight: '800' },
  item: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSoft },
  itemText: { color: colors.text, flex: 1, textAlign: 'right', fontSize: 12 },
  del: { color: colors.bear, fontWeight: '700' },
});
