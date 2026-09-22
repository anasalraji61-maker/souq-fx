import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { playSoftClick } from '../audio/playSoftClick';
import { useI18n } from '../i18n/I18nContext';
import type { Dict } from '../i18n/locales';

/** «EURUSD · RSI · تحت 30» / «GBPUSD · تقاطع المتوسطات · تقاطع صاعد ▲» بلغة الواجهة — القائمة وتأكيد
 * الحذف والإشعار كانت تعرض المعرّفات الخام (rsi · below / ma_cross · cross_up) بكل اللغات. */
function describeIndAlert(
  a: { symbol: string; alert_type: string; condition: string; value?: number | null },
  t: Dict
): string {
  const typeLabel: Record<string, string> = {
    rsi: t.indAlertsTypeRsi,
    ma_cross: t.indAlertsTypeMaCross,
    macd_cross: t.indAlertsTypeMacdCross,
  };
  const val = a.value != null ? ` ${a.value}` : '';
  const cond =
    a.condition === 'above'
      ? `${t.aboveWord}${val}`
      : a.condition === 'below'
        ? `${t.belowWord}${val}`
        : a.condition === 'cross_up'
          ? t.indAlertsCrossUpChip
          : a.condition === 'cross_down'
            ? t.indAlertsCrossDownChip
            : `${a.condition}${val}`;
  return `${a.symbol} · ${typeLabel[a.alert_type] ?? a.alert_type} · ${cond}`;
}

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
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
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

  // حارس "alive" مبني على ref يمنع تحديث الحالة بعد إلغاء تركيب اللوحة — يشمل نتيجة الاستطلاع
  // الدوري (setInterval) التي قد تصل بعد إلغاء التركيب رغم إيقاف المؤقت نفسه — نفس مبدأ
  // ChartFrame/SymbolSnapshot المؤسَّس بالكود.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await api.indicatorAlerts();
      if (mountedRef.current) {
        setAlerts(res.alerts);
        setListError(false);
      }
    } catch {
      if (mountedRef.current) {
        setAlerts([]);
        setListError(true);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(async () => {
      try {
        const res = await api.checkIndicatorAlerts();
        if (mountedRef.current) setAlerts(res.alerts);
        for (const trig of res.triggered) {
          await pushPriceAlert(t.indAlertsPushTitle, describeIndAlert(trig, t));
        }
      } catch {
        /* ignore */
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [refresh, t]);

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
      playSoftClick();
      await refresh();
    } catch {
      setFormError(t.indAlertsAddError);
    } finally {
      setBusy(false);
    }
  };

  const TYPE_LABEL: Record<'rsi' | 'ma_cross' | 'macd_cross', string> = {
    rsi: t.indAlertsTypeRsi,
    ma_cross: t.indAlertsTypeMaCross,
    macd_cross: t.indAlertsTypeMacdCross,
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { textAlign: align }]}>{t.indAlertsTitle}</Text>
      <Text style={[styles.sub, { textAlign: align }]}>{t.indAlertsSub}</Text>
      <TextInput style={[styles.input, { textAlign: align }]} value={symbol} onChangeText={setSymbol} placeholder="EURUSD" placeholderTextColor={colors.textDim} autoCapitalize="characters" autoCorrect={false} returnKeyType="done" underlineColorAndroid="transparent" clearButtonMode="while-editing" keyboardAppearance="dark" selectionColor={colors.accent} accessibilityLabel={t.indAlertsSymbolA11y} />
      <View style={[styles.row, rtl && styles.rowRtl]}>
        {(['rsi', 'ma_cross', 'macd_cross'] as const).map((ty) => (
          <Pressable
            accessibilityRole="button"
            key={ty}
            style={({ pressed }) => [
              styles.chip,
              type === ty && styles.chipOn,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => setType(ty)}
            accessibilityLabel={`${t.indAlertsTypeA11yPrefix}: ${TYPE_LABEL[ty]}`}
          >
            <Text style={[styles.chipText, type === ty && styles.chipTextOn]}>{ty}</Text>
          </Pressable>
        ))}
      </View>
      {type === 'rsi' ? (
        <>
          <View style={[styles.row, rtl && styles.rowRtl]}>
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
              accessibilityLabel={t.indAlertsBelowA11y}
            >
              <Text style={styles.chipText}>{t.indAlertsBelowChip}</Text>
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
              accessibilityLabel={t.indAlertsAboveA11y}
            >
              <Text style={styles.chipText}>{t.indAlertsAboveChip}</Text>
            </Pressable>
          </View>
          <TextInput style={[styles.input, { textAlign: align }]} value={value} onChangeText={setValue} keyboardType="decimal-pad" maxLength={12} placeholder="30" placeholderTextColor={colors.textDim} returnKeyType="done" underlineColorAndroid="transparent" clearButtonMode="while-editing" keyboardAppearance="dark" selectionColor={colors.accent} accessibilityLabel={t.indAlertsThresholdA11y} />
        </>
      ) : (
        <View style={[styles.row, rtl && styles.rowRtl]}>
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
            accessibilityLabel={t.indAlertsCrossUpA11y}
          >
            <Text style={styles.chipText}>{t.indAlertsCrossUpChip}</Text>
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
            accessibilityLabel={t.indAlertsCrossDownA11y}
          >
            <Text style={styles.chipText}>{t.indAlertsCrossDownChip}</Text>
          </Pressable>
        </View>
      )}
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
        onPress={add}
        disabled={busy}
        accessibilityState={{ disabled: busy }}
        accessibilityLabel={t.indAlertsAddA11y}
        hitSlop={8}
      >
        <Text style={styles.btnText}>{busy ? '...' : t.indAlertsAddBtn}</Text>
      </Pressable>
      {formError ? <Text style={[styles.formError, { textAlign: align }]}>{formError}</Text> : null}
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
          {alerts.length === 0 ? (
            <Text style={[styles.empty, { textAlign: align }]}>
              {listError ? t.indAlertsLoadError : t.indAlertsEmpty}
            </Text>
          ) : (
            alerts.map((a) => (
              <View key={a.id} style={[styles.item, rtl && styles.itemRtl]}>
                <Text style={[styles.itemText, { textAlign: align }]}>
                  {describeIndAlert(a, t)}
                  {a.triggered ? ' ✓' : ''}
                </Text>
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
                      t.indAlertsDeleteConfirmTitle,
                      describeIndAlert(a, t),
                      [
                        { text: t.cancel, style: 'cancel' },
                        {
                          text: t.deleteWord,
                          style: 'destructive',
                          onPress: () =>
                            api
                              .deleteIndicatorAlert(a.id)
                              .then(refresh)
                              .catch(() =>
                                Alert.alert(t.indAlertsDeleteFailedTitle, t.indAlertsDeleteFailedBody)
                              ),
                        },
                      ]
                    )
                  }
                  accessibilityLabel={`${t.indAlertsDeleteA11yPrefix}: ${describeIndAlert(a, t)}`}
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
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
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
  row: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  rowRtl: { flexDirection: 'row-reverse' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: spacing.sm,
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
  empty: { color: colors.textDim, textAlign: 'right', marginTop: spacing.sm, fontSize: 12 },
  item: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSoft },
  itemRtl: { flexDirection: 'row-reverse' },
  itemText: { color: colors.text, flex: 1, textAlign: 'right', fontSize: 12 },
  del: { color: colors.bear, fontWeight: '700' },
});
