import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedHeadTail, frameEmbedTitleBlock, frameEmbedTitle } from '../theme';
import { api, type NewsItem } from '../api';
import { mockNews } from '../mock';
import { useI18n } from '../i18n/I18nContext';

export function NewsPanel({ embedded }: { embedded?: boolean }) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [news, setNews] = useState<NewsItem[]>(mockNews);
  /** وضوح الحالة: يعلم المستخدم إذا فشل تحديث الأخبار وأن ما يراه بيانات محفوظة قديمة
   * (لا تُفعَّل قبل أول محاولة فعلية — لا ادّعاء فشل قبل حدوثه). */
  const [stale, setStale] = useState(false);

  useEffect(() => {
    // حارس "alive" يمنع تحديث الحالة بعد إلغاء تركيب اللوحة (مثلاً تبديل قسم hub قبل اكتمال
    // الطلب) — نفس نمط ChartFrame/SymbolSnapshot/FocusChartModal المؤسَّس بالكود.
    let alive = true;
    api
      .news()
      .then((r) => {
        if (alive) {
          setNews(r.news);
          setStale(false);
        }
      })
      .catch(() => {
        if (alive) setStale(true);
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
      {stale ? <Text style={[styles.staleNote, { textAlign: align }]}>{t.newsStale}</Text> : null}
      {!stale && news.length === 0 ? (
        <Text style={styles.empty}>{t.newsEmpty}</Text>
      ) : null}
      <ScrollView contentContainerStyle={{ gap: spacing.sm }}>
        {news.map((n) => (
          <View key={n.id} style={styles.card}>
            <View style={[styles.row, rtl && styles.rowRtl]}>
              <View
                style={[
                  styles.impact,
                  {
                    backgroundColor:
                      n.impact === 'high' ? colors.highImpact : colors.warn,
                  },
                ]}
              >
                <Text style={styles.impactText}>
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
