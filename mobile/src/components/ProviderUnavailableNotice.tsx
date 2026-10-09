import { useContext } from 'react';
import { FrameCellContext } from './FrameSizedGrid';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { API_URL, type ChartSeries } from '../api';
import { normalizeProvenance, providerUnavailableReason } from '../chart/dataSource';
import { useI18n } from '../i18n/I18nContext';
import { colors, numeric, spacing } from '../theme';
import { isTimeframe } from '../timeframes';

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

/** سبب تطبيقيّ: الطلب الأول لم يُجب بعد (tools81). */
export const SERIES_LOADING = 'loading';

/**
 * tools81: الإطار قبل أوّل ردّ كان يُبذر بـ`mockSeries` «تجريبي» حول أسعار 2024 حتى يصل الردّ — وبلا شبكة حتى مهلة
 * الطلب. هذه السلسلة فارغة بلا سعر ⇒ `seriesHasNoRealData` ⇒ الإشعار يعرض دوّاراً و`chartFirstLoad` بدل الشارت.
 */
export function loadingSeries(symbol: string, timeframe: string): ChartSeries {
  const s = serverUnreachableSeries(symbol, timeframe);
  return { ...s, data_source: { ...s.data_source, unavailable_reason: SERIES_LOADING } as ChartSeries['data_source'] };
}

export function isSeriesLoading(dataSource: unknown): boolean {
  return providerUnavailableReason(dataSource) === SERIES_LOADING;
}

type Props = {
  symbol: string;
  /** فريم السلسلة — لنصّ التحميل «على فريم {tf}» فقط. */
  timeframe?: string;
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

export function ProviderUnavailableNotice({ symbol, timeframe, height, showSwitchHint, dataSource }: Props) {
  const { t } = useI18n();
  const compact = useContext(FrameCellContext) !== 'normal';
  const reason = providerUnavailableReason(dataSource);
  if (reason === SERIES_LOADING) {
    const tf = timeframe ?? '';
    const known = isTimeframe(tf);
    const text = known ? t.tfLabels[tf] : tf;
    const loadText = t.chartFirstLoad.replace('{symbol}', symbol);
    return (
      <View
        style={[styles.box, height != null && { height }]}
        accessible
        accessibilityRole="progressbar"
        accessibilityState={{ busy: true }}
        accessibilityLabel={loadText.replace('{tf}', known ? t.tfLabelsA11y[tf] : tf)}
      >
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.body, styles.loading, compact && styles.bodySm]} numberOfLines={compact ? 4 : undefined}>{loadText.replace('{tf}', text)}</Text>
      </View>
    );
  }
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
  // بالتطوير فقط: العنوان الذي جُرِّب (launch210a) — يُشخَّص عنوان خاطئ في ثانية بدل «لا اتصال» صامتة.
  const tried = offline && __DEV__ ? t.chartServerUnreachableTried.replace('{url}', API_URL) : null;
  const label = [title, body, tried].filter(Boolean).join('. ');
  return (
    <View style={[styles.box, compact && styles.boxSm, height != null && { height }]} accessible accessibilityRole="text" accessibilityLabel={label}>
      <Text style={[styles.title, compact && styles.titleSm]} numberOfLines={compact ? 3 : undefined}>{title}</Text>
      {body && !compact ? <Text style={styles.body}>{body}</Text> : null}
      {tried ? <Text style={[styles.body, styles.tried]}>{tried}</Text> : null}
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
  boxSm: { padding: 4 },
  title: { color: colors.text, fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 19 },
  body: {
    color: colors.textDim,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.xs,
    maxWidth: 320,
  },
  loading: { marginTop: spacing.sm },
  tried: { ...numeric, marginTop: spacing.sm },
  titleSm: { fontSize: 10, lineHeight: 14 },
  bodySm: { fontSize: 9, lineHeight: 13 },
});
