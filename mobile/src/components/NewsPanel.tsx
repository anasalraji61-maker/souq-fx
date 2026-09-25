import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedHeadTail, frameEmbedTitleBlock, frameEmbedTitle } from '../theme';
import { api, type NewsItem } from '../api';
import { useI18n } from '../i18n/I18nContext';

/**
 * لون شارة التأثير — **ثلاث درجات لا اثنتان**. كان السطر `impact === 'high' ? highImpact : warn`،
 * أي أن «منخفض» يلبس **لون «متوسط» نفسه بالضبط** (العنبري): خبرٌ ضجيجٌ لا يُقرأ يقف بالقائمة
 * بنفس إلحاح خبرٍ يحرّك الزوج، والكلمة وحدها هي ما يفرّق بينهما — واللون هو ما يُقرأ أولاً بشريطٍ
 * يُمسح بالنظر. ولوح التقويم بهذا التطبيق يميّز الدرجات الثلاث منذ مدّة (`IMPACT_COLOR`:
 * `bear`/`warn`/`textDim`)، فكانت شاشتان تقولان عن الدرجة نفسها شيئين مختلفين.
 *
 * الدرجات هنا بألوان اللوح نفسه (`highImpact` الوردي بقي كما كان حرفياً لـ«عالي»، و`warn` العنبري
 * لـ«متوسط» كما كان)، و«منخفض» ينزل إلى `textDim` المكتوم — أي **لا يخسر أحدٌ إشارةً**، إنما يكفّ
 * المنخفض عن ادّعاء إلحاحٍ ليس له. ونصّ الشارة يبقى `onWarnFill` الداكن بالدرجات الثلاث: تباينه
 * فوق `textDim` (‎#7B8DA8‎) يفوق 5:1، أعلى من الحدّ المطلوب لنصٍّ عريض صغير.
 *
 * المفتاح غير المعروف (باك-إند أحدث بدرجة رابعة) يسقط على «منخفض» — نفس ما يفعله نصّ الشارة
 * أسفله بالضبط، فلا يختلف اللون عن الكلمة أبداً.
 */
const IMPACT_FILL: Record<NewsItem['impact'], string> = {
  high: colors.highImpact,
  medium: colors.warn,
  low: colors.textDim,
};

export function NewsPanel({ embedded }: { embedded?: boolean }) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  // تبدأ فارغة: كانت تبدأ بأخبار وهمية («قرار الفائدة الفيدرالي — اليوم 21:00»، «CPI غداً») تبقى
  // ظاهرة إن فشل الطلب تحت «بيانات محفوظة» — حدث مختلَق قد يبني عليه متداول قراره.
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  /** فشل الطلب (لا بيانات محفوظة تُعرض) — لا تُفعَّل قبل أول محاولة فعلية. */
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // حارس "alive" يمنع تحديث الحالة بعد إلغاء تركيب اللوحة (مثلاً تبديل قسم hub قبل اكتمال
    // الطلب) — نفس نمط ChartFrame/SymbolSnapshot/FocusChartModal المؤسَّس بالكود.
    let alive = true;
    api
      .news()
      .then((r) => {
        if (alive) {
          setNews(r.news);
          setFailed(false);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (alive) {
          setFailed(true);
          setLoaded(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <View style={[styles.panel, embedded && styles.panelInFrame]}>
      {embedded ? (
        <View style={frameEmbedHead}>
          <View style={frameEmbedHeadTail} />
          <View style={frameEmbedTitleBlock}>
            <Text style={[styles.title, styles.titleInHead, frameEmbedTitle, { textAlign: align }]}>
              {t.newsTitle}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={[styles.title, { textAlign: align }]}>{t.newsTitle}</Text>
      )}
      {failed ? <Text style={[styles.staleNote, { textAlign: align }]}>{t.newsLoadError}</Text> : null}
      {!loaded ? <ActivityIndicator color={colors.accent} style={{ paddingVertical: spacing.lg }} /> : null}
      {loaded && !failed && news.length === 0 ? (
        <Text style={styles.empty}>{t.newsEmpty}</Text>
      ) : null}
      {/* التأثير مخمَّن من كلمات العنوان (fed/cpi…) بألوان تأثير التقويم نفسها — يُقرأ تصنيفاً مؤكَّداً.
          سطرٌ واحد فوق القائمة لا تحت كل خبر، و«≈» على الشارة نفسها. */}
      {news.some((n) => n.impact_basis === 'headline_keywords') ? (
        <Text style={[styles.basisNote, { textAlign: align }]}>{t.newsImpactFromHeadline}</Text>
      ) : null}
      <ScrollView contentContainerStyle={{ gap: spacing.sm }}>
        {news.map((n) => (
          <View key={n.id} style={styles.card}>
            <View style={[styles.row, rtl && styles.rowRtl]}>
              <View
                style={[
                  styles.impact,
                  { backgroundColor: IMPACT_FILL[n.impact] ?? IMPACT_FILL.low },
                ]}
              >
                <Text style={styles.impactText}>
                  {n.impact_basis === 'headline_keywords' ? '≈ ' : ''}
                  {n.impact === 'high' ? t.impactHigh : n.impact === 'medium' ? t.impactMedium : t.impactLow}
                </Text>
              </View>
              <Text style={styles.when}>{n.when}</Text>
            </View>
            <Text style={[styles.headline, { textAlign: align }]}>{n.title}</Text>
            <Text style={[styles.pairs, { textAlign: align }]}>{n.pair_effect}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.bgPanel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    overflow: 'hidden',
  },
  panelInFrame: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingTop: frameEmbed.padTop,
    paddingLeft: frameEmbed.padLeft,
    paddingRight: frameEmbed.padRight,
    paddingBottom: frameEmbed.padBottom,
  },
  title: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  titleInHead: { marginBottom: 0 },
  staleNote: {
    color: colors.warn,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  basisNote: { color: colors.textDim, fontSize: 10, marginBottom: spacing.xs },
  empty: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowRtl: { flexDirection: 'row-reverse' },
  impact: { borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  impactText: { color: colors.onWarnFill, fontWeight: '800', fontSize: 10 },
  when: { color: colors.textDim, fontSize: 11 },
  headline: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 20,
  },
  pairs: { color: colors.dxy, fontSize: 11, marginTop: spacing.xs },
});
