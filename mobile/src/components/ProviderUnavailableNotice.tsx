import { StyleSheet, Text, View } from 'react-native';
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

type Props = {
  symbol: string;
  height?: number;
  /** الإطار يعرض زرّ الرمز ▾ — نصّ `chartNotOfferedBody` يدلّ عليه، فبلا زرّ يُعرض العنوان وحده. */
  showSwitchHint?: boolean;
  /**
   * launch120: `data_source` للسلسلة — `unavailable_reason: provider_unavailable` (429/انقطاع، backend-r22) ⇒ «تعذّر الجلب الآن»
   * لا «غير متاح من المزوّد» (كاذب لـEURUSD). غائب ⇒ النصّ القديم (DXY، `not_offered_by_provider`).
   */
  dataSource?: unknown;
};

export function ProviderUnavailableNotice({ symbol, height, showSwitchHint, dataSource }: Props) {
  const { t } = useI18n();
  const down = providerUnavailableReason(dataSource) === 'provider_unavailable';
  const title = (down ? t.chartProviderDownTitle : t.chartNotOfferedTitle).replace('{symbol}', symbol);
  // جسم «تعذّر الجلب» لا يذكر زرّ الرمز ▾ ⇒ يُعرض دائماً؛ جسم «غير متاح» يدلّ على الزرّ فيحتاجه.
  const body = down ? t.chartProviderDownBody : showSwitchHint ? t.chartNotOfferedBody : null;
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
