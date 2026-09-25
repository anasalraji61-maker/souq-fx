import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { colors, radii, spacing, frameEmbed, buttons } from '../theme';
import { api } from '../api';
import { playSoftClick } from '../audio/playSoftClick';
import { FrameSizedGrid } from './FrameSizedGrid';
import { useI18n } from '../i18n/I18nContext';
import type { Dict } from '../i18n/locales';

type ReportKind = 'weekly_pnl' | 'performance' | 'matrix_advice' | 'risk_brief';

/** حقلا title/hint يُترجمان عبر Dict (معروضان للمستخدم). حقل prompt تعليمة داخلية للذكاء الاصطناعي
 * لا يراها المتداول، فتبقى عربية ثابتة — لكنها **محايدة لغوياً** (لا تطلب "بالعربية"): لغة الرد
 * يحدّدها الخادم من حقل `lang` المُرسَل مع الطلب (لغة الواجهة)، فيحصل مستخدم en-US/en-GB على تقرير
 * إنجليزي. لا تُعِد عبارة "بالعربية" هنا — ستتعارض مع تعليمة لغة الرد بالخادم. راجع HANDOFF.md. */
function buildKinds(
  t: Dict
): { id: ReportKind; title: string; hint: string; prompt: string }[] {
  return [
    {
      id: 'weekly_pnl',
      title: t.reportWeeklyTitle,
      hint: t.reportWeeklyHint,
      prompt:
        'أعطني تقريراً أسبوعياً تعليمياً عن الأرباح والخسائر لمتداول فوركس يراقب EURUSD وGBPUSD وXAUUSD وDXY. اقترح هيكل: ملخص الأسبوع، أفضل/أسوأ يوم، نسبة المخاطرة، ونقاط تحسين. باختصار.',
    },
    {
      id: 'performance',
      title: t.reportPerformanceTitle,
      hint: t.reportPerformanceHint,
      prompt:
        'قيّم أداء متداول MATRIX لهذا الأسبوع من ناحية الانضباط، اختيار التوقيت، إدارة المخاطر، وعلاقة القرارات بـ DXY. أعطِ درجة من 10 ونقاط قوة وضعف.',
    },
    {
      id: 'matrix_advice',
      title: t.reportAdviceTitle,
      hint: t.reportAdviceHint,
      prompt:
        // كانت «5 نصائح… مرتبطة بالدولار والذهب والأزواج» ⇒ النموذج يعطي اتجاه سوق/مستويات تحت عنوان
        // «ملاحظات للأسبوع القادم» (launch93). الآن انضباط ومخاطر فقط، ومنعٌ صريح للاتجاه والمستويات.
        'أنت منصة MATRIX التعليمية. أعطِ 5 ملاحظات عملية للأسبوع القادم عن الانضباط وإدارة المخاطر وتسجيل الصفقات فقط. لا تذكر اتجاهاً متوقّعاً لأي زوج أو للذهب أو للدولار، ولا مستويات دخول أو وقف أو هدف، ولا توصيات شراء أو بيع. بوضوح.',
    },
    {
      id: 'risk_brief',
      title: t.reportRiskTitle,
      hint: t.reportRiskHint,
      prompt:
        'أعطني موجزاً قصيراً عن إدارة المخاطر لمتداول فوركس هذا الأسبوع: حجم الصفقة، وقف الخسارة، تجنب الأخبار، وعلاقة DXY بالذهب. بنقاط واضحة.',
    },
  ];
}

/** تعليمة داخلية للذكاء الاصطناعي (لا يراها المتداول، محايدة لغوياً كـ`prompt`) عند غياب بيانات الدفتر:
 * بدونها يختلق النموذج «أفضل يوم»/«درجة 7/10»/نسبة نجاح لأسبوع لم يُسجَّل فيه شيء. */
const NO_JOURNAL_AI_NOTE =
  '\nلا توجد بيانات صفقات لهذا المتداول: لا تختلق أرقام أداء أو أياماً أو درجات أو نسب نجاح، وقدّم إطاراً عاماً وقائمة ما يجب تسجيله فقط.';

type Props = { grid?: boolean };

export function WeeklyReportPanel({ grid = false }: Props) {
  const { t, rtl, lang } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const KINDS = buildKinds(t);
  const [loading, setLoading] = useState<ReportKind | null>(null);
  const [active, setActive] = useState<ReportKind | null>(null);
  const [text, setText] = useState('');
  /** وضوح الحالة: يعلم المستخدم إذا فشل استدعاء الذكاء الاصطناعي وأن التقرير المعروض قالب عام
   * ثابت بدل تحليل فعلي مخصَّص (لا ادّعاء فشل قبل حدوثه). */
  const [aiFallback, setAiFallback] = useState(false);

  /**
   * **اللوحة الوحيدة بالتطبيق بلا حارس تركيب** — وهي صاحبة أطول طلب فيه. `run` ينتظر نداءين
   * متتاليين (`api.trades` ثم `api.aiAsk`، والثاني توليدُ نصٍّ بنموذج: ثوانٍ لا أجزاء ثانية)،
   * وتبويبات شاشة الأدوات **تُفكَّك عند التبديل** (`tab === 'reports' ? … : null`) — فمن ضغط
   * «تقرير الأسبوع» ثم عاد للشارت وهو ينتظر كان يترك خلفه نداءً يكتب أربع حالات على لوحة مُفكَّكة،
   * **ويُطلق نقرة صوتية** (`playSoftClick`) من شاشةٍ أخرى بلا أيّ سبب ظاهر للمتداول.
   * الحارس هو نمط `ChartFrame`/`SymbolSnapshot` المؤسَّس بالكود حرفاً بحرف.
   */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = async (kind: ReportKind) => {
    const item = KINDS.find((k) => k.id === kind);
    if (!item) return;
    setLoading(kind);
    setActive(kind);
    setText('');
    setAiFallback(false);
    let journalLine = '';
    let hasJournalData = false;
    try {
      const tr = await api.trades();
      if (!mountedRef.current) return;
      const s = (tr.stats ?? {}) as Record<string, number>;
      const count = Number(s.trade_count);
      if (Number.isFinite(count) && count > 0) {
        hasJournalData = true;
        journalLine = `\n${t.reportJournalDataLine
          .replace('{trades}', String(count))
          .replace('{winRate}', String(s.win_rate))
          .replace('{pnl}', String(s.total_pnl_pct))
          .replace('{best}', String(s.best))
          .replace('{worst}', String(s.worst))}`;
      } else {
        // صفر صفقات مغلقة: «صفقات=0 نجاح=0% PnL=0%» ليست بيانات — تُقرأ كأسبوع خاسر/جامد.
        journalLine = `\n${t.reportJournalEmptyLine}`;
      }
    } catch {
      // فشل القراءة ≠ دفتر فارغ: لا نقول «لا صفقات» وربما لديه صفقات.
      journalLine = `\n${t.reportJournalUnavailableLine}`;
    }
    try {
      const res = await api.aiAsk(
        item.prompt + journalLine + (hasJournalData ? '' : NO_JOURNAL_AI_NOTE),
        'EURUSD',
        lang
      );
      if (!mountedRef.current) return;
      setText(res.answer.replace(/\*\*/g, ''));
      playSoftClick();
    } catch {
      if (!mountedRef.current) return;
      setText(
        kind === 'weekly_pnl'
          ? t.reportFallbackWeekly.replace('{journalLine}', journalLine)
          : kind === 'performance'
            ? t.reportFallbackPerformance.replace('{journalLine}', journalLine)
            : kind === 'risk_brief'
              ? t.reportFallbackRisk.replace('{journalLine}', journalLine)
              : t.reportFallbackAdvice.replace('{journalLine}', journalLine)
      );
      setAiFallback(true);
    } finally {
      if (mountedRef.current) setLoading(null);
    }
  };

  const tiles = KINDS.map((k) => ({
    id: k.id,
    node: (
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.tile,
          active === k.id && styles.tileOn,
          loading != null && loading !== k.id && styles.tileDisabled,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={() => void run(k.id)}
        disabled={loading != null}
        accessibilityState={{ disabled: loading != null }}
        accessibilityLabel={k.title}
      >
        <Text style={[styles.tileTitle, { textAlign: align }]}>{k.title}</Text>
        <Text style={[styles.tileHint, { textAlign: align }]}>{k.hint}</Text>
        {loading === k.id ? <ActivityIndicator color={colors.accent} /> : null}
        {active === k.id && !loading ? (
          <Text style={[styles.tileOpen, { textAlign: align }]}>{t.reportOpenWord}</Text>
        ) : null}
      </Pressable>
    ),
  }));

  if (grid) {
    return (
      <View style={styles.wrap}>
        <Text style={[styles.title, { textAlign: align }]}>{t.reportsTitle}</Text>
        <Text style={[styles.sub, { textAlign: align }]}>{t.reportsSubGrid}</Text>
        <FrameSizedGrid storageKey="matrix.tools.reports.order.v1" showAll items={tiles} />
        {text ? (
          <ScrollView style={styles.out} contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}>
            {aiFallback ? (
              <Text style={[styles.aiFallbackNote, { textAlign: align }]}>{t.reportAiFallbackNote}</Text>
            ) : null}
            <Text style={[styles.outText, { textAlign: align }]}>{text}</Text>
          </ScrollView>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { textAlign: align }]}>{t.reportsTitle}</Text>
      <Text style={[styles.sub, { textAlign: align }]}>{t.reportsSub}</Text>
      {KINDS.map((k) => (
        <Pressable
          accessibilityRole="button"
          key={k.id}
          style={({ pressed }) => [
            styles.card,
            active === k.id && styles.cardOn,
            loading != null && loading !== k.id && styles.cardDisabled,
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          onPress={() => void run(k.id)}
          disabled={loading != null}
          accessibilityState={{ disabled: loading != null }}
          accessibilityLabel={k.title}
        >
          <Text style={[styles.cardTitle, { textAlign: align }]}>{k.title}</Text>
          <Text style={[styles.cardHint, { textAlign: align }]}>{k.hint}</Text>
          {loading === k.id ? <ActivityIndicator color={colors.accent} /> : null}
        </Pressable>
      ))}
      {text ? (
        <ScrollView style={styles.out} contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}>
          {aiFallback ? (
            <Text style={[styles.aiFallbackNote, { textAlign: align }]}>{t.reportAiFallbackNote}</Text>
          ) : null}
          <Text style={[styles.outText, { textAlign: align }]}>{text}</Text>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  title: { color: colors.text, fontWeight: '900', fontSize: 18, textAlign: 'right' },
  sub: { color: colors.textDim, textAlign: 'right', fontSize: 12, marginBottom: spacing.xs },
  tile: {
    flex: 1,
    height: '100%',
    backgroundColor: 'transparent',
    borderRadius: radii.md,
    borderWidth: 0,
    paddingTop: frameEmbed.padTop,
    paddingLeft: frameEmbed.padLeft,
    paddingRight: frameEmbed.padRight,
    paddingBottom: frameEmbed.padBottom,
    gap: 6,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tileOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  tileDisabled: { opacity: 0.4 },
  tileTitle: { color: colors.text, fontWeight: '900', textAlign: 'right', fontSize: 15 },
  tileHint: { color: colors.textDim, textAlign: 'right', fontSize: 12 },
  tileOpen: { color: colors.accent, fontWeight: '800', textAlign: 'right', fontSize: 11 },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardDisabled: { opacity: 0.4 },
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
  aiFallbackNote: { color: colors.warn, fontWeight: '700', textAlign: 'right', fontSize: 12 },
});
