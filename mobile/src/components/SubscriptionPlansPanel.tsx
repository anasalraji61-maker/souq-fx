import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { useI18n } from '../i18n/I18nContext';
import type { LangId } from '../i18n/locales';

type Plan = {
  name: string;
  price: string;
  addOn?: string;
  accent: string;
  badge: string;
  features: string[];
};

type Copy = {
  title: string;
  subtitle: string;
  perMonth: string;
  coreBadge: string;
  academyBadge: string;
  fullBadge: string;
  coreName: string;
  academyName: string;
  fullName: string;
  academyAddOn: string;
  fullAddOn: string;
  coreFeatures: string[];
  academyFeatures: string[];
  fullFeatures: string[];
  note: string;
};

const EN_COPY: Copy = {
  title: 'MATRIX plans',
  subtitle: 'Start with charts and community, then add academy and the rest when you need them',
  perMonth: '/ month',
  coreBadge: 'Start',
  academyBadge: '+ Academy',
  fullBadge: 'All features',
  coreName: 'Core',
  academyName: 'Academy',
  fullName: 'Full',
  academyAddOn: '+$5 for courses',
  fullAddOn: '+$5 for remaining features',
  coreFeatures: [
    'All candles and chart types',
    'All frames: square, rectangle, and shadow',
    'Group chat and votes',
    'News, watchlist, and drawing tools',
    'Indicators and timeframes',
  ],
  academyFeatures: [
    'Everything in Core',
    'Full academy: schools, levels, and lectures',
    'Interactive classroom with interrupt questions',
  ],
  fullFeatures: [
    'Everything in Academy',
    'Private messages',
    'AI assistant, alerts, screener, and backtest',
    'Forecasts, analysts, and remaining tools',
  ],
  note: 'Core $10 covers charts and community. Add $5 for academy, then $5 more for every remaining feature.',
};

const COPY: Record<LangId, Copy> = {
  ar: {
    title: 'باقات MATRIX',
    subtitle: 'ابدأ بالشارتات والمجتمع، ثم أضف الأكاديمية وبقية الميزات عند الحاجة',
    perMonth: '/ شهر',
    coreBadge: 'البداية',
    academyBadge: '+ الأكاديمية',
    fullBadge: 'كل الميزات',
    coreName: 'أساسي',
    academyName: 'أكاديمية',
    fullName: 'كامل',
    academyAddOn: '+5$ للدورات',
    fullAddOn: '+5$ لبقية الميزات',
    coreFeatures: [
      'جميع الشموع وأنواع الجارت',
      'جميع الفريمات: مربع ومستطيل والظل',
      'المراسلات الجماعية والتصويتات',
      'الأخبار وقائمة المتابعة وأدوات الرسم',
      'المؤشرات والأطر الزمنية',
    ],
    academyFeatures: [
      'كل ما في الباقة الأساسية',
      'الأكاديمية كاملة: مدارس ومستويات ومحاضرات',
      'قاعة تفاعلية مع مقاطعة المدرس بسؤال',
    ],
    fullFeatures: [
      'كل ما في باقة الأكاديمية',
      'الرسائل الخاصة',
      'مساعد AI والتنبيهات والفحص والـ Backtest',
      'التوقعات والمحللون وبقية الأدوات',
    ],
    note: '10$ للشموع والفريمات والمجتمع. يُضاف 5$ لمن أراد الدورات، ثم 5$ أخرى لجميع بقية الميزات.',
  },
  'en-US': EN_COPY,
  'en-GB': EN_COPY,
  ku: {
    title: 'پلانی MATRIX',
    subtitle: 'بە چارت و کۆمەڵگە دەست پێ بکە، پاشان ئەکادیمیا و باقی تایبەتمەندییەکان زیاد بکە',
    perMonth: '/ مانگ',
    coreBadge: 'دەستپێک',
    academyBadge: '+ ئەکادیمیا',
    fullBadge: 'هەموو تایبەتمەندییەکان',
    coreName: 'بنەڕەت',
    academyName: 'ئەکادیمیا',
    fullName: 'تەواو',
    academyAddOn: '+5$ بۆ خولەکان',
    fullAddOn: '+5$ بۆ باقی تایبەتمەندییەکان',
    coreFeatures: [
      'هەموو مۆم و جۆرەکانی چارت',
      'هەموو فریمەکان: چوارگۆشە، لاکێشە، و سێبەر',
      'گفتوگۆی گروپ و دەنگدان',
      'هەواڵ، لیستی چاودێری، و ئامرازی وێنەکێشان',
      'نیشاندەر و کاتەکان',
    ],
    academyFeatures: [
      'هەموو شتی بنەڕەت',
      'ئەکادیمیای تەواو: قوتابخانە، ئاست، و وانە',
      'پۆلی کارلێکەر بە پرسیاری ناوەڕاست',
    ],
    fullFeatures: [
      'هەموو شتی ئەکادیمیا',
      'نامەی تایبەت',
      'یاریدەدەری AI، ئاگاداری، سکریینەر، و باکتێست',
      'پێشبینی، شیکەرەوە، و باقی ئامرازەکان',
    ],
    note: '10$ بۆ چارت و کۆمەڵگە. 5$ زیاد دەکرێت بۆ خولەکان، پاشان 5$ی تر بۆ هەموو باقی تایبەتمەندییەکان.',
  },
};

export function SubscriptionPlansPanel() {
  const { width } = useWindowDimensions();
  const { lang, rtl } = useI18n();
  const stacked = width < 980;
  const copy = COPY[lang];
  const align = rtl ? ('right' as const) : ('left' as const);
  const plans: Plan[] = [
    {
      name: copy.coreName,
      price: '$10',
      accent: colors.accent,
      badge: copy.coreBadge,
      features: copy.coreFeatures,
    },
    {
      name: copy.academyName,
      price: '$15',
      addOn: copy.academyAddOn,
      accent: '#38BDF8',
      badge: copy.academyBadge,
      features: copy.academyFeatures,
    },
    {
      name: copy.fullName,
      price: '$20',
      addOn: copy.fullAddOn,
      accent: '#A78BFA',
      badge: copy.fullBadge,
      features: copy.fullFeatures,
    },
  ];

  return (
    <View style={styles.section}>
      <View style={styles.headingCopy}>
        <Text style={[styles.title, { textAlign: align }]}>{copy.title}</Text>
        <Text style={[styles.subtitle, { textAlign: align }]}>{copy.subtitle}</Text>
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
              <Text style={styles.perMonth}>{copy.perMonth}</Text>
            </View>
            {plan.addOn ? (
              <Text style={[styles.addOn, { textAlign: align, color: plan.accent }]}>
                {plan.addOn}
              </Text>
            ) : null}

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
        <Text style={[styles.matrixNoteText, { textAlign: align }]}>{copy.note}</Text>
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
  rowRtl: { flexDirection: 'row-reverse' },
  headingCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 17, fontWeight: '900', textAlign: 'right' },
  subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 3, textAlign: 'right' },
  cards: { flexDirection: 'row', gap: spacing.sm },
  cardsStacked: { flexDirection: 'column' },
  card: {
    flex: 1,
    minWidth: 200,
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
  addOn: { fontSize: 11, fontWeight: '800' },
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
