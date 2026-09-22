import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { api } from '../api';
import { useI18n } from '../i18n/I18nContext';

export function ScreenerMini() {
  const { t } = useI18n();
  /** النص المرئي مختصر (رموز/اختصارات) بلا معنى واضح لقارئ الشاشة،
   * فيُستخدَم الوصف الكامل `a11y` بدلاً منه فقط لـaccessibilityLabel. */
  const quick = useMemo(
    () => [
      { id: 'ma_cross_up', label: 'MA ↑', a11y: t.smnA11yMaCross },
      { id: 'rsi_oversold', label: 'RSI↓', a11y: t.smnA11yRsiOversold },
      { id: 'bullish', label: t.smnFilterMomentum, a11y: t.smnA11yBullish },
    ],
    [t]
  );
  const [hits, setHits] = useState<
    { symbol: string; rsi: number; change_pct: number; filters_matched: string[] }[]
  >([]);
  const [loading, setLoading] = useState(false);
  /** وضوح الحالة: يميّز "لا نتائج مطابقة للفلتر" عن "فشل الاتصال بالفحص" بدل صمت كامل. */
  const [error, setError] = useState(false);
  /** بعد فحص ناجح بلا نتائج: «لا تطابق» أو «لم يُقرأ أي رمز» (حدّ المزوّد) — كان لا يظهر شيء إطلاقاً. */
  const [emptyNote, setEmptyNote] = useState<string | null>(null);

  const run = useCallback(async (filter: string) => {
    setLoading(true);
    setError(false);
    setEmptyNote(null);
    try {
      const res = await api.screenerRun({ timeframe: '15m', filters: [filter] });
      setHits(res.results.slice(0, 5));
      if (res.provider_configured === false) {
        setEmptyNote(t.screenerNeedApiKey);
      } else if (res.scanned === 0 && (res.failed?.length ?? 0) > 0) {
        setEmptyNote(t.screenerScanNone);
      } else if (!res.results.length) {
        setEmptyNote(
          res.scanned != null
            ? t.screenerNoMatchOf.replace('{k}', String(res.scanned)).replace('{tf}', '15m')
            : t.screenerNoResults
        );
      }
    } catch {
      setHits([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [t]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t.smnTitle}</Text>
      <View style={styles.row}>
        {quick.map((q) => (
          <Pressable
            accessibilityRole="button"
            key={q.id}
            style={({ pressed }) => [
              styles.chip,
              loading && styles.chipDisabled,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => run(q.id)}
            disabled={loading}
            accessibilityState={{ disabled: loading }}
            accessibilityLabel={q.a11y}
          >
            <Text style={styles.chipText}>{q.label}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? <ActivityIndicator color={colors.accent} size="small" /> : null}
      {!loading && error ? <Text style={styles.errorNote}>{t.screenerFailed}</Text> : null}
      {!loading && !error && emptyNote ? <Text style={styles.errorNote}>{emptyNote}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row-reverse', gap: spacing.sm }}>
          {hits.map((h) => (
            <View key={h.symbol} style={styles.hit}>
              <Text style={styles.sym}>{h.symbol}</Text>
              <Text style={styles.meta}>
                RSI {h.rsi} ·{' '}
                <Text
                  style={{
                    color: h.change_pct >= 0 ? colors.bull : colors.bear,
                    fontWeight: '800',
                  }}
                >
                  {h.change_pct >= 0 ? '+' : ''}
                  {h.change_pct}%
                </Text>{' '}
                {t.screenerChangeSpan}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
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
  title: { color: colors.textMuted, fontWeight: '800', textAlign: 'right', fontSize: 12 },
  errorNote: { color: colors.warn, textAlign: 'right', fontSize: 11 },
  row: { flexDirection: 'row-reverse', gap: 6 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.accent, fontWeight: '700', fontSize: 11 },
  chipDisabled: { opacity: 0.4 },
  hit: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  sym: { color: colors.text, fontWeight: '800', fontSize: 12 },
  meta: { color: colors.textDim, fontSize: 10 },
});
