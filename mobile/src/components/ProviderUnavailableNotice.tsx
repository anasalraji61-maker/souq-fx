import { StyleSheet, Text, View } from 'react-native';
import type { ChartSeries } from '../api';
import { normalizeProvenance, providerUnavailableReason } from '../chart/dataSource';
import { useI18n } from '../i18n/I18nContext';
import { colors, spacing } from '../theme';

/**
 * backend-r19: DXY (`unavailable_reason: not_offered_by_provider`) يصل بسلسلة بذرة `demo` حول 104.25 دائماً — المزوّد
 * لا يقدّمه أبداً. الوسم كان يقول «غير متاح» والإطار يرسم شموعاً وسعراً ونسبة مولَّدة فوقه. سلسلة بلا بيانات حقيقية
 * أصلاً ⇒ لا شموع ولا سعر ولا نسبة، وهذا الإشعار مكان الشارت. `candles: []` من الخادم يمرّ من هنا كذلك.
 */
export function seriesHasNoRealData(dataSource: unknown): boolean {
  if (providerUnavailableReason(dataSource) != null) return true;
  return normalizeProvenance(dataSource as Parameters<typeof normalizeProvenance>[0]).kind === 'unavailable';
}

/** سبب تطبيقيّ (لا من الخادم): الطلب نفسه فشل — بلا إنترنت أو الخادم متوقّف (launch121). */
export const SERVER_UNREACHABLE = 'server_unreachable';

/**
 * launch121: فشل الطلب كان يرسم `mockSeries` حول أسعار 2024 (EURUSD 1.0854) موسومة «تجريبي» — أوّل ما يراه
 * مستخدم جديد بلا شبكة. الآن سلسلة فارغة بلا سعر ⇒ `seriesHasNoRealData` ⇒ هذا الإشعار بنصّ «لا اتصال بالخادم».
 */
export function serverUnreachableSeries(symbol: string, timeframe: string): ChartSeries {
  return {
    symbol,
    timeframe,
    candles: [],
    change_pct: null,
    last: null,
    data_source: {
      kind: 'unavailable',
      as_of: Date.now() / 1000,
      channel: null,
      unavailable_reason: SERVER_UNREACHABLE,
    } as ChartSeries['data_source'],
  };
}

type Props = {
  symbol: string;
  height?: number;
  /** الإطار يعرض زرّ الرمز ▾ — نصّ `chartNotOfferedBody` يدلّ عليه، فبلا زرّ يُعرض العنوان وحده. */
  showSwitchHint?: boolean;
  /**
   * launch120: `data_source` للسلسلة — `unavailable_reason: provider_unavailable` (429/انقطاع، backend-r22) ⇒ «تعذّر الجلب الآن»
   * لا «غير متاح من المزوّد» (كاذب لـEURUSD). `server_unreachable` (فشل الطلب، launch121) ⇒ «لا اتصال بخادم MATRIX».
   * غائب ⇒ النصّ القديم (DXY، `not_offered_by_provider`).
   */
  dataSource?: unknown;
};

export function ProviderUnavailableNotice({ symbol, height, showSwitchHint, dataSource }: Props) {
  const { t } = useI18n();
  const reason = providerUnavailableReason(dataSource);
  const offline = reason === SERVER_UNREACHABLE;
  const down = reason === 'provider_unavailable';
  const title = (
    offline ? t.chartServerUnreachableTitle : down ? t.chartProviderDownTitle : t.chartNotOfferedTitle
  ).replace('{symbol}', symbol);
  // جسما «تعذّر الجلب»/«لا اتصال» لا يذكران زرّ الرمز ▾ ⇒ يُعرضان دائماً؛ جسم «غير متاح» يدلّ على الزرّ فيحتاجه.
  const body = offline
    ? t.chartServerUnreachableBody
    : down
      ? t.chartProviderDownBody
      : showSwitchHint
        ? t.chartNotOfferedBody
        : null;
  const label = body ? `${title}. ${body}` : title;
  return (
    <View style={[styles.box, height != null && { height }]} accessible accessibilityRole="text" accessibilityLabel={label}>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 19 },
  body: {
    color: colors.textDim,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.xs,
    maxWidth: 320,
  },
});
