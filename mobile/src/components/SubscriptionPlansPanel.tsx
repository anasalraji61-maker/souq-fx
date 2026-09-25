import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { useI18n } from '../i18n/I18nContext';

type Plan = {
  name: string;
  price: string;
  addOn?: string;
  accent: string;
  badge: string;
  features: string[];
};

export function SubscriptionPlansPanel() {
  const { width } = useWindowDimensions();
  const { t, rtl } = useI18n();
  const stacked = width < 980;
  // النصوص من القاموس المركزي (`t.subPlans`) بدل قاموس `COPY` الداخلي السابق
  const copy = t.subPlans;
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
      accent: colors.dxy,
      badge: copy.academyBadge,
      features: copy.academyFeatures,
    },
    {
      name: copy.fullName,
      price: '$20',
      addOn: copy.fullAddOn,
      accent: colors.infoAccent,
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
    backgroundColor: colors.planCardBg,
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
  planBadge: { borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 5 },
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
    gap: spacing.sm,
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
