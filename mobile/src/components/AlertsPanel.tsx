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
import { useI18n } from '../i18n/I18nContext';

type Props = {
  defaultSymbol?: string;
  embedded?: boolean;
};

export function AlertsPanel({ defaultSymbol = 'EURUSD', embedded }: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
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
        const msg = res.triggered.map((trig) => `${trig.symbol} ${trig.condition} ${trig.price}`).join(' · ');
        setFlash(msg);
        for (const trig of res.triggered) {
          await pushPriceAlert(
            t.alertsPushTitle,
            `${trig.symbol} ${trig.condition === 'above' ? t.aboveWord : t.belowWord} ${trig.price}`
          );
        }
      }
    } catch {
      /* ignore */
    }
  }, [t.alertsPushTitle, t.aboveWord, t.belowWord]);

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
      setFormError(t.alertsAddError);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.deleteAlert(id);
      await refresh();
    } catch {
      Alert.alert(t.alertsDeleteFailedTitle, t.alertsDeleteFailedBody);
    }
  };

  return (
    <View style={[styles.wrap, embedded && styles.wrapInFrame]}>
      {embedded ? (
        <View style={frameEmbedHead}>
          <View style={frameEmbedHeadTail} />
          <View style={frameEmbedTitleBlock}>
            <Text style={[styles.title, frameEmbedTitle, { textAlign: align }]}>{t.alertsTitle}</Text>
            <Text style={[styles.sub, frameEmbedSub, { textAlign: align }]}>{t.alertsSub}</Text>
          </View>
        </View>
      ) : (
        <>
          <Text style={[styles.title, { textAlign: align }]}>{t.alertsTitle}</Text>
          <Text style={[styles.sub, { textAlign: align }]}>{t.alertsSub}</Text>
        </>
      )}
      {flash ? <Text style={[styles.flash, { textAlign: align }]}>🔔 {flash}</Text> : null}

      <View style={styles.form}>
        <TextInput
          style={[styles.input, { textAlign: align }]}
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
          accessibilityLabel={t.alertsSymbolA11y}
        />
        <TextInput
          style={[styles.input, { textAlign: align }]}
          value={price}
          onChangeText={setPrice}
          placeholder={t.priceWord}
          placeholderTextColor={colors.textDim}
          keyboardType="decimal-pad"
          maxLength={12}
          returnKeyType="done"
          underlineColorAndroid="transparent"
          clearButtonMode="while-editing"
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          accessibilityLabel={t.alertsPriceA11y}
        />
        <View style={[styles.row, rtl && styles.rowRtl]}>
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
            accessibilityLabel={t.alertsAboveConditionA11y}
          >
            <Text style={[styles.condText, condition === 'above' && styles.condTextOn]}>{t.aboveWord}</Text>
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
            accessibilityLabel={t.alertsBelowConditionA11y}
          >
            <Text style={[styles.condText, condition === 'below' && styles.condTextOn]}>{t.belowWord}</Text>
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
            accessibilityLabel={t.alertsAddA11y}
          >
            <Text style={styles.addText}>{busy ? '...' : t.addBtn}</Text>
          </Pressable>
        </View>
        <TextInput
          style={[styles.input, { textAlign: align }]}
          value={note}
          onChangeText={setNote}
          placeholder={t.alertsNotePlaceholder}
          placeholderTextColor={colors.textDim}
          returnKeyType="done"
          underlineColorAndroid="transparent"
          clearButtonMode="while-editing"
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          accessibilityLabel={t.alertsNoteA11y}
        />
      </View>

      {formError ? <Text style={[styles.formError, { textAlign: align }]}>{formError}</Text> : null}

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.md }} />
      ) : (
        <ScrollView style={{ maxHeight: 160 }} keyboardShouldPersistTaps="handled">
          {alerts.length === 0 ? (
            <Text style={[styles.empty, { textAlign: align }]}>
              {listError ? t.alertsLoadError : t.alertsEmpty}
            </Text>
          ) : (
            alerts.map((a) => (
              <View key={a.id} style={[styles.item, rtl && styles.itemRtl]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemSym, { textAlign: align }]}>
                    {a.symbol} {a.condition === 'above' ? '≥' : '≤'} {a.price}
                    {a.triggered ? ' ✓' : ''}
                  </Text>
                  {a.note ? <Text style={[styles.itemNote, { textAlign: align }]}>{a.note}</Text> : null}
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
                      t.alertsDeleteConfirmTitle,
                      `${a.symbol} ${a.condition === 'above' ? '≥' : '≤'} ${a.price}`,
                      [
                        { text: t.cancel, style: 'cancel' },
                        { text: t.deleteWord, style: 'destructive', onPress: () => remove(a.id) },
                      ]
                    )
                  }
                  accessibilityLabel={`${t.alertsDeleteA11yPrefix}: ${a.symbol} ${a.condition === 'above' ? '≥' : '≤'} ${a.price}`}
                  hitSlop={8}
                >
                  <Text style={styles.del}>{t.deleteWord}</Text>
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
  title: { color: colors.text, fontWeight: '800', fontSize: 14 },
  sub: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  flash: {
    color: colors.warn,
    fontSize: 11,
    marginTop: 6,
    fontWeight: '700',
  },
  formError: {
    color: colors.bear,
    fontSize: 10,
    fontWeight: '700',
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
    fontSize: 13,
  },
  row: { flexDirection: 'row', gap: 6 },
  rowRtl: { flexDirection: 'row-reverse' },
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
  empty: { color: colors.textDim, marginTop: spacing.sm, fontSize: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  itemRtl: { flexDirection: 'row-reverse' },
  itemSym: { color: colors.text, fontWeight: '700', fontSize: 13 },
  itemNote: { color: colors.textDim, fontSize: 11 },
  del: { color: colors.bear, fontWeight: '700', fontSize: 12 },
});
