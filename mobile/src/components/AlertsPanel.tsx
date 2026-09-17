import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedHeadTail, frameEmbedTitleBlock, frameEmbedTitle, frameEmbedSub, buttons } from '../theme';
import { api, type PriceAlert } from '../api';
import { ensureAlertNotifications, pushPriceAlert, registerPushToken } from '../notifications';
import { playSoftClick } from '../audio/playSoftClick';

type Props = {
  defaultSymbol?: string;
  embedded?: boolean;
};

export function AlertsPanel({ defaultSymbol = 'EURUSD', embedded }: Props) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  /** وضوح الحالة: يميّز "لا تنبيهات بعد" الفعلية عن فشل تحميل القائمة */
  const [listError, setListError] = useState(false);
  /** وضوح الحالة: يعلم المستخدم إذا فشلت إضافة تنبيه بدل صمت كامل */
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api.alerts();
      setAlerts(res.alerts);
      setListError(false);
    } catch {
      setAlerts([]);
      setListError(true);
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
    setFormError(null);
    try {
      await api.createAlert({ symbol: symbol.trim().toUpperCase(), condition, price: p, note });
      playSoftClick();
      setPrice('');
      setNote('');
      await refresh();
    } catch {
      setFormError('تعذر إضافة التنبيه — تحقق من الاتصال وحاول مرة أخرى');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.deleteAlert(id);
      await refresh();
    } catch {
      Alert.alert('تعذر الحذف', 'حدث خطأ أثناء حذف التنبيه، حاول مرة أخرى.');
    }
  };

  return (
    <View style={[styles.wrap, embedded && styles.wrapInFrame]}>
      {embedded ? (
        <View style={frameEmbedHead}>
          <View style={frameEmbedHeadTail} />
          <View style={frameEmbedTitleBlock}>
            <Text style={[styles.title, frameEmbedTitle]}>تنبيهات السعر</Text>
            <Text style={[styles.sub, frameEmbedSub]}>فوق / تحت · Twelve Data · إشعار عند التفعيل</Text>
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.title}>تنبيهات السعر</Text>
          <Text style={styles.sub}>فوق / تحت · Twelve Data · إشعار عند التفعيل</Text>
        </>
      )}
      {flash ? <Text style={styles.flash}>🔔 {flash}</Text> : null}

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={symbol}
          onChangeText={setSymbol}
          placeholder="EURUSD"
          placeholderTextColor={colors.textDim}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          underlineColorAndroid="transparent"
          clearButtonMode="while-editing"
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          accessibilityLabel="رمز الأداة للتنبيه"
        />
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="السعر"
          placeholderTextColor={colors.textDim}
          keyboardType="decimal-pad"
          maxLength={12}
          returnKeyType="done"
          underlineColorAndroid="transparent"
          clearButtonMode="while-editing"
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          accessibilityLabel="سعر التنبيه"
        />
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cond,
              condition === 'above' && styles.condOn,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => setCondition('above')}
            accessibilityLabel="شرط التنبيه: فوق السعر"
          >
            <Text style={[styles.condText, condition === 'above' && styles.condTextOn]}>فوق</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cond,
              condition === 'below' && styles.condOn,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => setCondition('below')}
            accessibilityLabel="شرط التنبيه: تحت السعر"
          >
            <Text style={[styles.condText, condition === 'below' && styles.condTextOn]}>تحت</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.addBtn,
              busy && styles.addBtnDisabled,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={add}
            disabled={busy}
            accessibilityState={{ disabled: busy }}
            accessibilityLabel="إضافة تنبيه سعر"
          >
            <Text style={styles.addText}>{busy ? '...' : 'إضافة'}</Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="ملاحظة (اختياري)"
          placeholderTextColor={colors.textDim}
          returnKeyType="done"
          underlineColorAndroid="transparent"
          clearButtonMode="while-editing"
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          accessibilityLabel="ملاحظة التنبيه (اختياري)"
        />
      </View>

      {formError ? <Text style={styles.formError}>{formError}</Text> : null}

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.md }} />
      ) : (
        <ScrollView style={{ maxHeight: 160 }} keyboardShouldPersistTaps="handled">
          {alerts.length === 0 ? (
            <Text style={styles.empty}>{listError ? 'تعذر تحميل التنبيهات' : 'لا تنبيهات بعد'}</Text>
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
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() =>
                    Alert.alert(
                      'حذف التنبيه؟',
                      `${a.symbol} ${a.condition === 'above' ? '≥' : '≤'} ${a.price}`,
                      [
                        { text: 'إلغاء', style: 'cancel' },
                        { text: 'حذف', style: 'destructive', onPress: () => remove(a.id) },
                      ]
                    )
                  }
                  accessibilityLabel={`حذف تنبيه: ${a.symbol} ${a.condition === 'above' ? '≥' : '≤'} ${a.price}`}
                  hitSlop={8}
                >
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
  wrapInFrame: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingTop: frameEmbed.padTop,
    paddingLeft: frameEmbed.padLeft,
    paddingRight: frameEmbed.padRight,
    paddingBottom: frameEmbed.padBottom,
  },
  title: { color: colors.text, fontWeight: '800', fontSize: 14, textAlign: 'right' },
  sub: { color: colors.textDim, fontSize: 11, textAlign: 'right', marginTop: 2 },
  flash: {
    color: colors.warn,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 6,
    fontWeight: '700',
  },
  formError: {
    color: colors.bear,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  form: { marginTop: spacing.sm, gap: 6 },
  input: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: spacing.sm,
    textAlign: 'right',
    fontSize: 13,
  },
  row: { flexDirection: 'row-reverse', gap: 6 },
  cond: {
    flex: 1,
    paddingVertical: spacing.sm,
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
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  addText: { color: colors.onAccent, fontWeight: '800', fontSize: 12 },
  addBtnDisabled: { opacity: 0.4 },
  empty: { color: colors.textDim, textAlign: 'right', marginTop: spacing.sm, fontSize: 12 },
  item: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  itemSym: { color: colors.text, fontWeight: '700', textAlign: 'right', fontSize: 13 },
  itemNote: { color: colors.textDim, fontSize: 11, textAlign: 'right' },
  del: { color: colors.bear, fontWeight: '700', fontSize: 12 },
});
