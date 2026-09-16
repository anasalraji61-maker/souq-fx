import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { api } from '../api';

type Plan = {
  title: string;
  direct_rate: number;
  balance_bonus_rate: number;
  rules: string[];
  roles: { id: string; label: string; levels: number[]; level_count: number }[];
  example: { direct: string; balanced: string; unbalanced: string };
  commission_table?: { type: string; rate_pct: number; condition: string }[];
};

type Report = {
  unit: number;
  commission_table: {
    type: string;
    rate_pct: number;
    condition: string;
    points_per_member: number;
  }[];
  levels_table: { role: string; levels: number[] }[];
  monthly: {
    month: string;
    direct_points: number;
    balance_points: number;
    total_points: number;
  }[];
};

const FALLBACK_COMMISSION = [
  { type: 'جلب مباشر', rate_pct: 10, condition: 'عند إدخال عضو جديد', points_per_member: 10 },
  { type: 'مكافأة توازن', rate_pct: 5, condition: 'يمين = يسار', points_per_member: 5 },
  { type: 'فعّالة متوازن', rate_pct: 15, condition: '10% + 5%', points_per_member: 15 },
  { type: 'فعّالة غير متوازن', rate_pct: 10, condition: 'يمين ≠ يسار', points_per_member: 10 },
];

/** خانة التقرير — جداول العمولات والأرباح الشهرية */
export function CommissionPlanPanel() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  /** وضوح الحالة: يعلم المستخدم أن الجداول المعروضة تقريبية (FALLBACK_COMMISSION) لا حيّة، بدل صمت كامل */
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([
        api.commissionPlan(),
        api.commissionReport().catch(() => null),
      ]);
      setPlan(p);
      setReport(r);
      setError(false);
    } catch {
      setPlan(null);
      setReport(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !plan) void load();
  }, [open, plan, load]);

  const commissionRows = report?.commission_table?.length
    ? report.commission_table
    : plan?.commission_table?.map((r) => ({
        ...r,
        points_per_member: r.rate_pct,
      })) ?? FALLBACK_COMMISSION;

  return (
    <View style={[styles.wrap, !open && styles.wrapCollapsed]}>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.head,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={() => setOpen((v) => !v)}
        accessibilityLabel={open ? 'طي تقرير العمولات' : 'فتح تقرير العمولات'}
      >
        <Text style={styles.chev}>{open ? '▾' : '▸'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>تقرير العمولات</Text>
          <Text style={styles.sub}>
            {open ? 'جداول العمولات · الأرباح الشهرية' : 'اضغط السهم لفتح التقرير'}
          </Text>
        </View>
        {open ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void load()}
            hitSlop={8}
            style={({ pressed }) =>
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              }
            }
          >
            <Text style={styles.refresh}>تحديث</Text>
          </Pressable>
        ) : null}
      </Pressable>

      {open ? (
        <View style={styles.body}>
          {loading ? <ActivityIndicator color={colors.accent} /> : null}
          {!loading && error ? (
            <Text style={styles.errorNote}>
              تعذر تحميل بيانات العمولات الحيّة — القيم المعروضة تقريبية
            </Text>
          ) : null}

          <Text style={styles.section}>جدول العمولات</Text>
          <View style={styles.table}>
            <View style={[styles.tr, styles.trHead]}>
              <Text style={[styles.th, styles.colType]}>النوع</Text>
              <Text style={[styles.th, styles.colRate]}>%</Text>
              <Text style={[styles.th, styles.colCond]}>الشرط</Text>
              <Text style={[styles.th, styles.colPts]}>نقاط</Text>
            </View>
            {commissionRows.map((row) => (
              <View key={row.type} style={styles.tr}>
                <Text style={[styles.td, styles.colType]}>{row.type}</Text>
                <Text style={[styles.td, styles.colRate, styles.accent]}>{row.rate_pct}%</Text>
                <Text style={[styles.td, styles.colCond]} numberOfLines={2}>
                  {row.condition}
                </Text>
                <Text style={[styles.td, styles.colPts]}>
                  {row.points_per_member ?? row.rate_pct}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.section}>جدول المستويات</Text>
          <View style={styles.table}>
            <View style={[styles.tr, styles.trHead]}>
              <Text style={[styles.th, styles.colRole]}>الدور</Text>
              <Text style={[styles.th, styles.colLevels]}>المستويات</Text>
            </View>
            {(report?.levels_table ??
              plan?.roles.map((r) => ({ role: r.label, levels: r.levels })) ??
              [
                { role: 'متداول', levels: [2, 4, 8, 16] },
                { role: 'مدرب/بروكر/وكيل/شركة', levels: [2, 4, 8, 16, 32, 64, 128, 256] },
              ]
            ).map((row) => (
              <View key={row.role} style={styles.tr}>
                <Text style={[styles.td, styles.colRole]}>{row.role}</Text>
                <Text style={[styles.td, styles.colLevels, styles.accent]}>
                  {row.levels.join(' · ')}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.section}>الأرباح الشهرية</Text>
          <View style={styles.table}>
            <View style={[styles.tr, styles.trHead]}>
              <Text style={[styles.th, styles.colMonth]}>الشهر</Text>
              <Text style={[styles.th, styles.colM]}>جلب</Text>
              <Text style={[styles.th, styles.colM]}>توازن</Text>
              <Text style={[styles.th, styles.colM]}>الإجمالي</Text>
            </View>
            {(report?.monthly?.length ? report.monthly : null)?.map((row) => (
              <View key={row.month} style={styles.tr}>
                <Text style={[styles.td, styles.colMonth]}>{row.month}</Text>
                <Text style={[styles.td, styles.colM]}>{row.direct_points}</Text>
                <Text style={[styles.td, styles.colM]}>{row.balance_points}</Text>
                <Text style={[styles.td, styles.colM, styles.accent]}>{row.total_points}</Text>
              </View>
            )) ?? (
              <View style={styles.tr}>
                <Text style={[styles.td, styles.emptyHint]}>
                  لا أرباح مسجّلة بعد — أدخل أعضاء من الشجرة لتظهر هنا
                </Text>
              </View>
            )}
          </View>

          {report?.unit ? (
            <Text style={styles.note}>أساس الحساب: {report.unit} نقطة لكل عضو × نسبة العمولة</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  wrapCollapsed: { maxHeight: 56 },
  head: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    minHeight: 52,
  },
  chev: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '900',
    width: 22,
    textAlign: 'center',
  },
  title: { color: colors.text, fontWeight: '900', fontSize: 13, textAlign: 'right' },
  sub: { color: colors.textDim, fontSize: 9, textAlign: 'right', marginTop: 1 },
  refresh: { color: colors.accent, fontWeight: '800', fontSize: 11 },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: 8 },
  section: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.bgPanel,
  },
  tr: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    alignItems: 'center',
    minHeight: 34,
  },
  trHead: { backgroundColor: colors.tableHeadBg },
  th: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  td: {
    color: colors.text,
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  accent: { color: colors.accent, fontWeight: '800' },
  colType: { flex: 1.4, textAlign: 'right' },
  colRate: { width: 42 },
  colCond: { flex: 1.6, textAlign: 'right' },
  colPts: { width: 44 },
  colRole: { flex: 1.2, textAlign: 'right' },
  colLevels: { flex: 2, textAlign: 'right' },
  colMonth: { flex: 1.1, textAlign: 'right' },
  colM: { flex: 1 },
  emptyHint: {
    flex: 1,
    color: colors.textDim,
    textAlign: 'right',
    paddingHorizontal: 10,
    fontSize: 10,
  },
  note: { color: colors.textDim, fontSize: 9, textAlign: 'right' },
  errorNote: {
    color: colors.warn,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
  },
});
