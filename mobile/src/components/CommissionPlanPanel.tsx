import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { colors, radii, spacing, buttons, numeric } from '../theme';
import { api } from '../api';
import { useI18n } from '../i18n/I18nContext';
import type { Dict } from '../i18n/locales';

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

/**
 * الخادم (`commissions.py`/`db.commission_report`) يرسل أسماء الأنواع والشروط والأدوار **نصّاً عربياً ثابتاً**
 * بلا `lang` ⇒ الجدول كان عربياً بالكردية والإنجليزية. الأرقام تبقى من الخادم، والنصّ المعروف يُترجَم هنا
 * بمفاتيح `fallbackCommission` نفسها؛ نصّ لا نعرفه (خادم أحدث) يُعرض كما وصل بدل إخفائه.
 */
const SERVER_TYPE_KEYS: Record<string, keyof Dict> = {
  'جلب مباشر': 'cppTypeDirect',
  'مكافأة توازن': 'cppTypeBalance',
  'فعّالة متوازن': 'cppTypeActiveBalanced',
  'فعّالة غير متوازن': 'cppTypeActiveUnbalanced',
};
const SERVER_COND_KEYS: Record<string, keyof Dict> = {
  'عند إدخال عضو جديد': 'cppCondNewMember',
  'يمين = يسار': 'cppCondBalanced',
  'يمين ≠ يسار': 'cppCondUnbalanced',
};
/** `ROLE_LABELS_AR` بالخادم ⇒ معرّف الدور، ومنه اسمه بالقاموس (`t.trader`…). */
const SERVER_ROLE_IDS: Record<string, RoleId> = {
  'متداول': 'trader',
  'مدرب': 'trainer',
  'بروكر': 'broker',
  'وكيل': 'agent',
  'شركة': 'company',
};
export type RoleId = 'trader' | 'trainer' | 'broker' | 'agent' | 'company';
export function isRoleId(v: string | null | undefined): v is RoleId {
  return v === 'trader' || v === 'trainer' || v === 'broker' || v === 'agent' || v === 'company';
}

function localized(t: Dict, map: Record<string, keyof Dict>, server: string): string {
  const k = map[server.trim()];
  const v = k ? t[k] : undefined;
  return typeof v === 'string' ? v : server;
}

function localizedRole(t: Dict, server: string): string {
  const id = SERVER_ROLE_IDS[server.trim()];
  return id ? t[id] : server;
}

/** جدول عمولات تقريبي حين يتعذّر الخادم — نصوصه من القاموس لتتبع لغة الواجهة */
function fallbackCommission(t: Dict) {
  return [
    { type: t.cppTypeDirect, rate_pct: 10, condition: t.cppCondNewMember, points_per_member: 10 },
    { type: t.cppTypeBalance, rate_pct: 5, condition: t.cppCondBalanced, points_per_member: 5 },
    { type: t.cppTypeActiveBalanced, rate_pct: 15, condition: '10% + 5%', points_per_member: 15 },
    {
      type: t.cppTypeActiveUnbalanced,
      rate_pct: 10,
      condition: t.cppCondUnbalanced,
      points_per_member: 10,
    },
  ];
}

/** جدول مستويات تقريبي حين يتعذّر الخادم — أسماء الأدوار من القاموس */
function fallbackLevels(t: Dict) {
  return [
    { role: t.trader, levels: [2, 4, 8, 16] },
    {
      role: [t.trainer, t.broker, t.agent, t.company].join('/'),
      levels: [2, 4, 8, 16, 32, 64, 128, 256],
    },
  ];
}

/** خانة التقرير — جداول العمولات والأرباح الشهرية */
export function CommissionPlanPanel() {
  const { t, rtl } = useI18n();
  /** محاذاة النص حسب اتجاه اللغة — كما بقية اللوحات */
  const al = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const rowDir = !rtl && styles.rowLtr;
  const [plan, setPlan] = useState<Plan | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  /** وضوح الحالة: يعلم المستخدم أن الجداول المعروضة تقريبية (fallbackCommission) لا حيّة، بدل صمت كامل */
  const [error, setError] = useState(false);
  /** تقرير الأرباح فشل لسبب غير «غير مسجَّل» (401) — لا يُقال «لا أرباح مسجّلة» لمن له أرباح لم تُحمَّل. */
  const [reportFailed, setReportFailed] = useState(false);

  // حارس "alive" مبني على ref يمنع تحديث الحالة بعد إلغاء تركيب اللوحة (طي/فتح قبل اكتمال
  // الطلب) — نفس مبدأ ChartFrame/SymbolSnapshot المؤسَّس بالكود.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let rFailed = false;
      const [p, r] = await Promise.all([
        api.commissionPlan(),
        api.commissionReport().catch((e: unknown) => {
          // الزائر يأخذ 401 (`main.py` `commissions_report`) — حالة طبيعية لا فشل.
          rFailed = !(e instanceof Error && e.message === 'HTTP 401');
          return null;
        }),
      ]);
      if (!mountedRef.current) return;
      setPlan(p);
      setReport(r);
      setReportFailed(rFailed);
      setError(false);
    } catch {
      if (mountedRef.current) {
        setPlan(null);
        setReport(null);
        setReportFailed(false);
        setError(true);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !plan) void load();
  }, [open, plan, load]);

  // الأمثلة التقريبية (`fallback*`) فقط تحت ملاحظة `cppLiveError` التي تقول إنها أمثلة: كانت تظهر أثناء
  // التحميل وحين يُسقط الخادم `commission_table` (اختياري) بلا أي وسم فتُقرأ نسبك الفعلية. وعمود النقاط
  // من الخطة كان نسخة من النسبة (5% ⇒ «5 نقاط») — الخطة لا ترسل نقاطاً، فـ«—».
  const commissionRows: { type: string; rate_pct: number; condition: string; points_per_member: number | null }[] =
    report?.commission_table?.length
      ? report.commission_table
      : plan?.commission_table?.map((r) => ({ ...r, points_per_member: null })) ??
        (error ? fallbackCommission(t) : []);
  const levelRows =
    report?.levels_table.map((r) => ({ role: localizedRole(t, r.role), levels: r.levels })) ??
    plan?.roles.map((r) => ({
      role: isRoleId(r.id) ? t[r.id] : localizedRole(t, r.label),
      levels: r.levels,
    })) ??
    (error ? fallbackLevels(t) : []);

  return (
    <View style={[styles.wrap, !open && styles.wrapCollapsed]}>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.head,
          rowDir,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={() => setOpen((v) => !v)}
        accessibilityLabel={open ? t.cppCloseA11y : t.cppOpenA11y}
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.chev}>{open ? '▾' : '▸'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, al]}>{t.cppTitle}</Text>
          <Text style={[styles.sub, al]}>{open ? t.cppSubOpen : t.cppSubClosed}</Text>
        </View>
        {open ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.refreshBtn}
            onPress={() => void load()}
            accessibilityState={{ busy: loading }}
            hitSlop={8}
            style={({ pressed }) =>
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              }
            }
          >
            <Text style={styles.refresh}>{t.refreshBtn}</Text>
          </Pressable>
        ) : null}
      </Pressable>

      {open ? (
        <View style={styles.body}>
          {loading ? <ActivityIndicator color={colors.accent} /> : null}
          {!loading && error ? (
            <Text style={[styles.errorNote, al]}>{t.cppLiveError}</Text>
          ) : null}

          <Text style={[styles.section, al]}>{t.cppTableCommissions}</Text>
          <View style={styles.table}>
            <View style={[styles.tr, rowDir, styles.trHead]}>
              <Text style={[styles.th, styles.colType, al]}>{t.cppColType}</Text>
              <Text style={[styles.th, styles.colRate]}>%</Text>
              <Text style={[styles.th, styles.colCond, al]}>{t.cppColCondition}</Text>
              <Text style={[styles.th, styles.colPts]}>{t.cppColPoints}</Text>
            </View>
            {commissionRows.map((row) => (
              <View key={row.type} style={[styles.tr, rowDir]}>
                <Text style={[styles.td, styles.colType, al]}>{localized(t, SERVER_TYPE_KEYS, row.type)}</Text>
                <Text style={[styles.td, styles.colRate, styles.accent]}>{row.rate_pct}%</Text>
                <Text style={[styles.td, styles.colCond, al]} numberOfLines={2}>
                  {localized(t, SERVER_COND_KEYS, row.condition)}
                </Text>
                <Text style={[styles.td, styles.colPts]}>
                  {row.points_per_member ?? '—'}
                </Text>
              </View>
            ))}
          </View>

          <Text style={[styles.section, al]}>{t.cppTableLevels}</Text>
          <View style={styles.table}>
            <View style={[styles.tr, rowDir, styles.trHead]}>
              <Text style={[styles.th, styles.colRole, al]}>{t.cppColRole}</Text>
              <Text style={[styles.th, styles.colLevels, al]}>{t.cppColLevels}</Text>
            </View>
            {levelRows.map((row) => (
              <View key={row.role} style={[styles.tr, rowDir]}>
                <Text style={[styles.td, styles.colRole, al]}>{row.role}</Text>
                <Text style={[styles.td, styles.colLevels, styles.accent, al]}>
                  {row.levels.join(' · ')}
                </Text>
              </View>
            ))}
          </View>

          <Text style={[styles.section, al]}>{t.cppTableMonthly}</Text>
          <View style={styles.table}>
            <View style={[styles.tr, rowDir, styles.trHead]}>
              <Text style={[styles.th, styles.colMonth, al]}>{t.cppColMonth}</Text>
              <Text style={[styles.th, styles.colM]}>{t.cppColDirect}</Text>
              <Text style={[styles.th, styles.colM]}>{t.cppColBalance}</Text>
              <Text style={[styles.th, styles.colM]}>{t.cppColTotal}</Text>
            </View>
            {(report?.monthly?.length ? report.monthly : null)?.map((row) => (
              <View key={row.month} style={[styles.tr, rowDir]}>
                <Text style={[styles.td, styles.colMonth, al]}>{row.month}</Text>
                <Text style={[styles.td, styles.colM]}>{row.direct_points}</Text>
                <Text style={[styles.td, styles.colM]}>{row.balance_points}</Text>
                <Text style={[styles.td, styles.colM, styles.accent]}>{row.total_points}</Text>
              </View>
            )) ?? (
              <View style={[styles.tr, rowDir]}>
                <Text style={[styles.td, styles.emptyHint, al]}>{reportFailed && !loading && !error ? t.cppEarningsLoadError : loading || error ? '—' : t.cppNoEarnings}</Text>
              </View>
            )}
          </View>

          {report?.unit ? (
            <Text style={[styles.note, al]}>
              {t.cppBasisNote.replace('{unit}', String(report.unit))}
            </Text>
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
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    minHeight: 52,
  },
  /** اتجاه الصفوف للغات LTR — الأصل `row-reverse` للعربية والكردية */
  rowLtr: { flexDirection: 'row' },
  chev: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '500',
    width: 22,
    textAlign: 'center',
  },
  title: { color: colors.text, fontWeight: '500', fontSize: 13, textAlign: 'right' },
  sub: { color: colors.textDim, fontSize: 11, textAlign: 'right', marginTop: 0 },
  refresh: { color: colors.accent, fontWeight: '500', fontSize: 11 },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  section: {
    color: colors.text,
    fontWeight: '500',
    fontSize: 12,
    textAlign: 'right',
    marginTop: spacing.xs,
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
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  td: {
    ...numeric,
    color: colors.text,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.xs,
  },
  accent: { color: colors.accent, fontWeight: '500' },
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
    paddingHorizontal: 12,
    fontSize: 11,
  },
  note: { color: colors.textDim, fontSize: 11, textAlign: 'right' },
  errorNote: {
    color: colors.warn,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'right',
  },
});
