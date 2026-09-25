import { StyleSheet, Text, View } from 'react-native';
import {
  normalizeProvenance,
  providerUnavailableReason,
} from '../chart/dataSource';
import type { Dict } from '../i18n/locales';
import { useI18n } from '../i18n/I18nContext';
import { colors, spacing } from '../theme';

/**
 * backend-r19: DXY (`unavailable_reason: not_offered_by_provider`) يصل بسلسلة بذرة `demo` حول 104.25 دائماً — المزوّد
 * لا يقدّمه أبداً. الوسم كان يقول «غير متاح» والإطار يرسم شموعاً وسعراً ونسبة مولَّدة فوقه. سلسلة بلا بيانات حقيقية
 * أصلاً ⇒ لا شموع ولا سعر ولا نسبة، وهذا الإشعار مكان الشارت. `candles: []` من الخادم يمرّ من هنا كذلك.
 */
export function seriesHasNoRealData(dataSource: unknown): boolean {
  if (providerUnavailableReason(dataSource) != null) return true;
  return (
    normalizeProvenance(dataSource as Parameters<typeof normalizeProvenance>[0])
      .kind === 'unavailable'
  );
}

/**
 * «{symbol} غير متاح من مزوّد البيانات» — الشطر الأوّل من `originUnavailableProvider` (الثاني «الرسم مولَّد للعرض»
 * لم يعد صحيحاً إذ لا رسم). مؤقّت حتى يضيف launch مفتاحاً مستقلاً (طلب ui16 بـCOORDINATION).
 */
export function providerUnavailableText(t: Dict, symbol: string): string {
  return t.originUnavailableProvider
    .replace('{symbol}', symbol)
    .split(' — ')[0]
    .trim();
}

type Props = { symbol: string; height?: number };

export function ProviderUnavailableNotice({ symbol, height }: Props) {
  const { t } = useI18n();
  const text = providerUnavailableText(t, symbol);
  return (
    <View
      style={[styles.box, height != null && { height }]}
      accessibilityRole='text'
      accessibilityLabel={text}
    >
      <Text style={styles.text}>{text}</Text>
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
  text: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 19,
  },
});
