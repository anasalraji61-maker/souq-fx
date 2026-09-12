import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedHeadTail, frameEmbedTitleBlock, frameEmbedTitle } from '../theme';
import { api, type Vote } from '../api';
import { mockVotes } from '../mock';

export function VotePanel({ embedded }: { embedded?: boolean }) {
  const [votes, setVotes] = useState<Vote[]>(mockVotes);

  const load = () => {
    api
      .votes()
      .then((r) => setVotes(r.votes))
      .catch(() => undefined);
  };

  useEffect(() => {
    load();
  }, []);

  const cast = async (id: string, choice: 'agree' | 'disagree') => {
    setVotes((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              agree: choice === 'agree' ? v.agree + 1 : v.agree,
              disagree: choice === 'disagree' ? v.disagree + 1 : v.disagree,
            }
          : v
      )
    );
    try {
      await api.ballot(id, choice);
      load();
    } catch {
      /* offline */
    }
  };

  return (
    <View style={[styles.panel, embedded && styles.panelInFrame]}>
      {embedded ? (
        <View style={frameEmbedHead}>
          <View style={frameEmbedHeadTail} />
          <View style={frameEmbedTitleBlock}>
            <Text style={[styles.title, styles.titleInHead, frameEmbedTitle]}>تصويت على صفقة</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.title}>تصويت على صفقة</Text>
      )}
      <ScrollView contentContainerStyle={{ gap: 10 }}>
        {votes.map((v) => {
          const total = v.agree + v.disagree || 1;
          const pct = Math.round((v.agree / total) * 100);
          const buy = v.direction === 'buy';
          return (
            <View key={v.id} style={styles.card}>
              <View style={styles.head}>
                <Text style={styles.symbol}>{v.symbol}</Text>
                <View style={[styles.badge, { backgroundColor: buy ? colors.bull : colors.bear }]}>
                  <Text style={styles.badgeText}>{buy ? 'شراء' : 'بيع'}</Text>
                </View>
              </View>
              <Text style={styles.meta}>
                دخول {v.entry} · وقف {v.sl} · هدف {v.tp}
              </Text>
              <Text style={styles.note}>{v.note}</Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.pct}>
                موافقة {pct}% · {v.agree} موافق / {v.disagree} رافض
              </Text>
              <View style={styles.actions}>
                <Pressable style={[styles.btn, styles.yes]} onPress={() => cast(v.id, 'agree')}>
                  <Text style={styles.btnText}>موافق</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.no]} onPress={() => cast(v.id, 'disagree')}>
                  <Text style={styles.btnText}>رافض</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
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
  },
  titleInHead: { marginBottom: 0 },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  head: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  symbol: { color: colors.text, fontWeight: '800', fontSize: 14 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  meta: { color: colors.textMuted, fontSize: 11, marginTop: 6, textAlign: 'right' },
  note: { color: colors.text, fontSize: 12, marginTop: 4, textAlign: 'right', lineHeight: 18 },
  barBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  barFill: { height: 6, backgroundColor: colors.accent },
  pct: { color: colors.textDim, fontSize: 11, marginTop: 4, textAlign: 'right' },
  actions: { flexDirection: 'row-reverse', gap: 8, marginTop: 8 },
  btn: {
    flex: 1,
    borderRadius: radii.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  yes: { backgroundColor: 'rgba(34,197,94,0.2)', borderWidth: 1, borderColor: colors.bull },
  no: { backgroundColor: 'rgba(244,63,94,0.15)', borderWidth: 1, borderColor: colors.bear },
  btnText: { color: colors.text, fontWeight: '700', fontSize: 12 },
});
