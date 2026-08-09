import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { useI18n } from '../i18n/I18nContext';
import type { LangId } from '../i18n/locales';

type Plan = {
  name: string;
  price: string;
  accent: string;
  badge: string;
  features: string[];
};

type Copy = {
  reference: string;
  title: string;
  subtitle: string;
  individual: string;
  highest: string;
  annualPrice: string;
  premiumFeatures: string[];
  ultimateFeatures: string[];
  matrixNote: string;
};

const EN_COPY: Copy = {
  reference: 'Market reference',
  title: 'Top professional analysis plans',
  subtitle: 'A reference comparison for designing upcoming MATRIX plans',
  individual: 'Individual',
  highest: 'Highest',
  annualPrice: '/ month, billed annually',
  premiumFeatures: [
    '8 charts per tab',
    '25 indicators per chart',
    '20,000 historical bars',
    '400 price alerts and 400 technical alerts',
    'Second-based intervals and no ads',
  ],
  ultimateFeatures: [
    '16 charts per tab',
    '50 indicators per chart',
    '40,000 historical bars',
    '1,000 price alerts and 1,000 technical alerts',
    'Up to 200 parallel chart connections',
  ],
  matrixNote:
    'We will bring the best of these capabilities into MATRIX. Prices above are TradingView annual-billing reference prices, not MATRIX subscriptions, and may change at the source.',
};

const COPY: Record<LangId, Copy> = {
  ar: {
    reference: 'مرجع سوقي',
    title: 'أعلى باقات التحليل الاحترافية',
    subtitle: 'مقارنة مرجعية تساعدنا في تصميم باقات MATRIX القادمة',
    individual: 'للأفراد',
    highest: 'الأعلى',
    annualPrice: '/ شهر عند الدفع السنوي',
    premiumFeatures: [
      '8 رسوم بيانية في التبويب',
      '25 مؤشراً لكل رسم',
      '20,000 شمعة تاريخية',
      '400 تنبيه للسعر و400 تنبيه فني',
      'أطر زمنية بالثانية وبدون إعلانات',
    ],
    ultimateFeatures: [
      '16 رسماً بيانياً في التبويب',
      '50 مؤشراً لكل رسم',
      '40,000 شمعة تاريخية',
      '1,000 تنبيه للسعر و1,000 تنبيه فني',
      'حتى 200 اتصال رسم متوازٍ',
    ],
    matrixNote:
      'سنأخذ أفضل هذه الإمكانات ونقدمها بهوية MATRIX. الأسعار أعلاه مرجعية لـ TradingView عند الدفع السنوي وليست أسعار اشتراك داخل التطبيق، وقد تتغير من المصدر.',
  },
  'en-US': EN_COPY,
  'en-GB': EN_COPY,
  ku: {
    reference: 'بەراوردی بازاڕ',
    title: 'بەرزترین پلانی شیکاری پیشەیی',
    subtitle: 'بەراوردێک بۆ داڕشتنی پلانی داهاتووی MATRIX',
    individual: 'بۆ تاکەکان',
    highest: 'بەرزترین',
    annualPrice: '/ مانگانە بە پارەدانی ساڵانە',
    premiumFeatures: [
      '8 چارت لە هەر تابێک',
      '25 نیشاندەر بۆ هەر چارتێک',
      '20,000 باری مێژوویی',
      '400 ئاگادارکردنەوەی نرخ و 400 تەکنیکی',
      'کاتی چرکەیی و بێ ڕیکلام',
    ],
    ultimateFeatures: [
      '16 چارت لە هەر تابێک',
      '50 نیشاندەر بۆ هەر چارتێک',
      '40,000 باری مێژوویی',
      '1,000 ئاگادارکردنەوەی نرخ و 1,000 تەکنیکی',
      'تا 200 پەیوەندی هاوکاتی چارت',
    ],
    matrixNote:
      'باشترین ئەم تایبەتمەندییانە دەهێنینە ناو MATRIX. نرخەکان تەنها بەراوردی TradingView ـن بە پارەدانی ساڵانە، نرخی بەشداری MATRIX نین و لەوانەیە بگۆڕدرێن.',
  },
};

export function SubscriptionPlansPanel() {
  const { width } = useWindowDimensions();
  const { lang, rtl } = useI18n();
  const stacked = width < 760;
  const copy = COPY[lang];
  const align = rtl ? ('right' as const) : ('left' as const);
  const plans: Plan[] = [
    {
      name: 'Premium',
      price: '$59.95',
      accent: '#60A5FA',
      badge: copy.individual,
      features: copy.premiumFeatures,
    },
    {
      name: 'Ultimate',
      price: '$199.95',
      accent: '#A78BFA',
      badge: copy.highest,
      features: copy.ultimateFeatures,
    },
  ];

  return (
    <View style={styles.section}>
      <View style={[styles.headingRow, rtl && styles.rowRtl]}>
        <View style={styles.referenceBadge}>
          <Text style={styles.referenceBadgeText}>{copy.reference}</Text>
        </View>
        <View style={styles.headingCopy}>
          <Text style={[styles.title, { textAlign: align }]}>{copy.title}</Text>
          <Text style={[styles.subtitle, { textAlign: align }]}>{copy.subtitle}</Text>
        </View>
      </View>

      <View style={[styles.cards, rtl && styles.rowRtl, stacked && styles.cardsStacked]}>
        {plans.map((plan) => (
          <View
            key={plan.name}
            style={[
              styles.card,
              stacked && styles.cardStacked,
              { borderColor: `${plan.accent}88` },
            ]}
          >
            <View style={[styles.cardTop, rtl && styles.rowRtl]}>
              <View style={[styles.planBadge, { backgroundColor: `${plan.accent}22` }]}>
                <Text style={[styles.planBadgeText, { color: plan.accent }]}>{plan.badge}</Text>
              </View>
              <Text style={styles.planName}>{plan.name}</Text>
            </View>

            <View style={[styles.priceRow, rtl && styles.rowRtl]}>
              <Text style={[styles.price, { color: plan.accent }]}>{plan.price}</Text>
              <Text style={styles.perMonth}>{copy.annualPrice}</Text>
            </View>

            <View style={styles.divider} />
            {plan.features.map((feature) => (
              <View key={feature} style={[styles.featureRow, rtl && styles.rowRtl]}>
                <Text style={[styles.feature, { textAlign: align }]}>{feature}</Text>
                <Text style={[styles.check, { color: plan.accent }]}>✓</Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={[styles.matrixNote, rtl && styles.rowRtl]}>
        <Text style={styles.matrixNoteTitle}>MATRIX</Text>
        <Text style={[styles.matrixNoteText, { textAlign: align }]}>{copy.matrixNote}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowRtl: { flexDirection: 'row-reverse' },
  headingCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 17, fontWeight: '900', textAlign: 'right' },
  subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 3, textAlign: 'right' },
  referenceBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  referenceBadgeText: { color: colors.accent, fontSize: 9, fontWeight: '900' },
  cards: { flexDirection: 'row', gap: spacing.sm },
  cardsStacked: { flexDirection: 'column' },
  card: {
    flex: 1,
    minWidth: 240,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: '#0D1627',
    padding: spacing.md,
    gap: 10,
  },
  cardStacked: { minWidth: 0, width: '100%' },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: { color: colors.text, fontSize: 20, fontWeight: '900' },
  planBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  planBadgeText: { fontSize: 10, fontWeight: '900' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  price: { fontSize: 27, fontWeight: '900' },
  perMonth: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.borderSoft },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    gap: 8,
  },
  feature: { flex: 1, color: colors.textMuted, fontSize: 12, lineHeight: 19, textAlign: 'right' },
  check: { fontSize: 13, fontWeight: '900' },
  matrixNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgPanel,
    padding: 10,
  },
  matrixNoteTitle: { color: colors.accent, fontWeight: '900', letterSpacing: 1 },
  matrixNoteText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'right',
  },
});
