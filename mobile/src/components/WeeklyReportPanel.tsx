import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { colors, radii, spacing } from '../theme';
import { api } from '../api';
import { FrameSizedGrid } from './FrameSizedGrid';

type ReportKind = 'weekly_pnl' | 'performance' | 'matrix_advice' | 'risk_brief';

const KINDS: { id: ReportKind; title: string; hint: string; prompt: string }[] = [
  {
    id: 'weekly_pnl',
    title: 'تقرير أسبوعي',
    hint: 'أرباح وخسائر',
    prompt:
      'أعطني تقريراً أسبوعياً تعليمياً عن الأرباح والخسائر لمتداول فوركس يراقب EURUSD وGBPUSD وXAUUSD وDXY. اقترح هيكل: ملخص الأسبوع، أفضل/أسوأ يوم، نسبة المخاطرة، ونقاط تحسين. بالعربية باختصار.',
  },
  {
    id: 'performance',
    title: 'تقرير أداء',
    hint: 'انضباط وتنفيذ',
    prompt:
      'قيّم أداء متداول MATRIX لهذا الأسبوع من ناحية الانضباط، اختيار التوقيت، إدارة المخاطر، وعلاقة القرارات بـ DXY. أعطِ درجة من 10 ونقاط قوة وضعف. بالعربية.',
  },
  {
    id: 'matrix_advice',
    title: 'رأي MATRIX',
    hint: 'نصائح الأسبوع',
    prompt:
      'أنت منصة MATRIX للتحليل الفني. ما رأيك في أداء المتداول هذا الأسبوع؟ أعطِ 5 نصائح عملية للأسبوع القادم مرتبطة بالدولار والذهب والأزواج الرئيسية. بالعربية وواضح.',
  },
  {
    id: 'risk_brief',
    title: 'موجز مخاطر',
    hint: 'إدارة رأس المال',
    prompt:
      'أعطني موجزاً قصيراً عن إدارة المخاطر لمتداول فوركس هذا الأسبوع: حجم الصفقة، وقف الخسارة، تجنب الأخبار، وعلاقة DXY بالذهب. بالعربية ونقاط واضحة.',
  },
];

type Props = { grid?: boolean };

export function WeeklyReportPanel({ grid = false }: Props) {
  const [loading, setLoading] = useState<ReportKind | null>(null);
  const [active, setActive] = useState<ReportKind | null>(null);
  const [text, setText] = useState('');
  const [win, setWin] = useState<number | null>(null);

  const run = async (kind: ReportKind) => {
    const item = KINDS.find((k) => k.id === kind);
    if (!item) return;
    setLoading(kind);
    setActive(kind);
    setText('');
    setWin(null);
    let journalLine = '';
    try {
      const t = await api.trades();
      const s = t.stats as Record<string, number>;
      journalLine = `\nبيانات دفتر الصفقات الفعلية: صفقات=${s.trade_count} نجاح=${s.win_rate}% PnL=${s.total_pnl_pct}% أفضل=${s.best}% أسوأ=${s.worst}%. اعتمد عليها في التقرير.`;
    } catch {
      journalLine = '\n(لا توجد صفقات مسجّلة بعد في الدفتر).';
    }
    try {
      const res = await api.aiAsk(item.prompt + journalLine, 'EURUSD');
      setText(res.answer.replace(/\*\*/g, ''));
      setWin(res.setup?.win_probability ?? null);
    } catch {
      setText(
        kind === 'weekly_pnl'
          ? `تقرير من دفتر الصفقات${journalLine}\nسجّل صفقاتك في تبويب PnL لبناء تقرير أدق.`
          : kind === 'performance'
            ? `تقييم مبني على الدفتر${journalLine}`
            : kind === 'risk_brief'
              ? `موجز مخاطر${journalLine}\n1) مخاطرة ≤1%.\n2) وقف واضح.\n3) تجنّب الأخبار الثقيلة.`
              : `نصائح MATRIX${journalLine}\n1) راجع صفقاتك المفتوحة.\n2) اربط الدخول بـ DXY.\n3) مخاطرة ≤1%.\n4) تجنّب الأخبار عالية التأثير.\n5) ركّز على 2–3 أزواج.`
      );
    } finally {
      setLoading(null);
    }
  };

  const tiles = KINDS.map((k) => ({
    id: k.id,
    node: (
      <Pressable
        style={[styles.tile, active === k.id && styles.tileOn]}
        onPress={() => void run(k.id)}
        disabled={loading != null}
      >
        <Text style={styles.tileTitle}>{k.title}</Text>
        <Text style={styles.tileHint}>{k.hint}</Text>
        {loading === k.id ? <ActivityIndicator color={colors.accent} /> : null}
        {active === k.id && !loading ? <Text style={styles.tileOpen}>مفتوح ↓</Text> : null}
      </Pressable>
    ),
  }));

  if (grid) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>تقارير MATRIX</Text>
        <Text style={styles.sub}>نفس حجم الفريمات · قدّم/أخّر · اضغط للقراءة</Text>
        <FrameSizedGrid storageKey="matrix.tools.reports.order.v1" items={tiles} />
        {text ? (
          <ScrollView style={styles.out} contentContainerStyle={{ padding: 12, gap: 8 }}>
            <Text style={styles.outText}>{text}</Text>
            {win != null ? (
              <Text style={styles.win}>ثقة تقديرية للسيناريو: {win}%</Text>
            ) : null}
          </ScrollView>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>تقارير MATRIX</Text>
      <Text style={styles.sub}>أسبوعي · أداء · رأي المنصة ونصائح</Text>
      {KINDS.map((k) => (
        <Pressable
          key={k.id}
          style={[styles.card, active === k.id && styles.cardOn]}
          onPress={() => void run(k.id)}
          disabled={loading != null}
        >
          <Text style={styles.cardTitle}>{k.title}</Text>
          <Text style={styles.cardHint}>{k.hint}</Text>
          {loading === k.id ? <ActivityIndicator color={colors.accent} /> : null}
        </Pressable>
      ))}
      {text ? (
        <ScrollView style={styles.out} contentContainerStyle={{ padding: 12, gap: 8 }}>
          <Text style={styles.outText}>{text}</Text>
          {win != null ? (
            <Text style={styles.win}>ثقة تقديرية للسيناريو: {win}%</Text>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  title: { color: colors.text, fontWeight: '900', fontSize: 18, textAlign: 'right' },
  sub: { color: colors.textDim, textAlign: 'right', fontSize: 12, marginBottom: 4 },
  tile: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tileOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  tileTitle: { color: colors.text, fontWeight: '900', textAlign: 'right', fontSize: 15 },
  tileHint: { color: colors.textDim, textAlign: 'right', fontSize: 12 },
  tileOpen: { color: colors.accent, fontWeight: '800', textAlign: 'right', fontSize: 11 },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  cardOn: { borderColor: colors.accent },
  cardTitle: { color: colors.text, fontWeight: '800', textAlign: 'right', fontSize: 14 },
  cardHint: { color: colors.textDim, textAlign: 'right', fontSize: 11 },
  out: {
    maxHeight: 320,
    backgroundColor: colors.bgPanel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  outText: { color: colors.text, textAlign: 'right', lineHeight: 22, fontSize: 13 },
  win: { color: colors.accent, fontWeight: '700', textAlign: 'right', fontSize: 12 },
});
