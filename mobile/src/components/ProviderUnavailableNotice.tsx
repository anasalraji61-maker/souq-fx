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
};

export function ProviderUnavailableNotice({ symbol, height, showSwitchHint }: Props) {
  const { t } = useI18n();
  const title = t.chartNotOfferedTitle.replace('{symbol}', symbol);
  const label = showSwitchHint ? `${title}. ${t.chartNotOfferedBody}` : title;
  return (
    <View style={[styles.box, height != null && { height }]} accessible accessibilityRole="text" accessibilityLabel={label}>
      <Text style={styles.title}>{title}</Text>
      {showSwitchHint ? <Text style={styles.body}>{t.chartNotOfferedBody}</Text> : null}
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
