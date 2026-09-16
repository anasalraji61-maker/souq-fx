import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedHeadTail, frameEmbedTitleBlock, frameEmbedTitle } from '../theme';
import { api, type NewsItem } from '../api';
import { mockNews } from '../mock';

export function NewsPanel({ embedded }: { embedded?: boolean }) {
  const [news, setNews] = useState<NewsItem[]>(mockNews);
  /** وضوح الحالة: يعلم المستخدم إذا فشل تحديث الأخبار وأن ما يراه بيانات محفوظة قديمة
   * (لا تُفعَّل قبل أول محاولة فعلية — لا ادّعاء فشل قبل حدوثه). */
  const [stale, setStale] = useState(false);

  useEffect(() => {
    api
      .news()
      .then((r) => {
        setNews(r.news);
        setStale(false);
      })
      .catch(() => setStale(true));
  }, []);

  return (
    <View style={[styles.panel, embedded && styles.panelInFrame]}>
      {embedded ? (
        <View style={frameEmbedHead}>
          <View style={frameEmbedHeadTail} />
          <View style={frameEmbedTitleBlock}>
            <Text style={[styles.title, styles.titleInHead, frameEmbedTitle]}>أخبار مؤثرة على الفوركس</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.title}>أخبار مؤثرة على الفوركس</Text>
      )}
      {stale ? <Text style={styles.staleNote}>تعذر تحديث الأخبار — تُعرض بيانات محفوظة</Text> : null}
      {!stale && news.length === 0 ? (
        <Text style={styles.empty}>لا توجد أخبار حالياً</Text>
      ) : null}
      <ScrollView contentContainerStyle={{ gap: 8 }}>
        {news.map((n) => (
          <View key={n.id} style={styles.card}>
            <View style={styles.row}>
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
                  {n.impact === 'high' ? 'عالي' : n.impact === 'medium' ? 'متوسط' : 'منخفض'}
                </Text>
              </View>
              <Text style={styles.when}>{n.when}</Text>
            </View>
            <Text style={styles.headline}>{n.title}</Text>
            <Text style={styles.pairs}>{n.pair_effect}</Text>
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
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  titleInHead: { marginBottom: 0 },
  staleNote: {
    color: colors.warn,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  empty: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 16,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  impact: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  impactText: { color: colors.onWarnFill, fontWeight: '800', fontSize: 10 },
  when: { color: colors.textDim, fontSize: 11 },
  headline: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'right',
    lineHeight: 20,
  },
  pairs: { color: colors.dxy, fontSize: 11, marginTop: 4, textAlign: 'right' },
});
