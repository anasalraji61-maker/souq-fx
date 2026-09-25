import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { useI18n } from '../i18n/I18nContext';

type Props = {
  youLabel?: string;
};

function NumBoxes({
  count,
  tint,
  size = 28,
}: {
  count: number;
  tint: string;
  size?: number;
}) {
  const w = Math.max(size * 1.7, 48);
  const h = Math.max(size * 0.85, 28);
  return (
    <View style={styles.numRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.numBox,
            {
              borderColor: tint,
              width: w,
              height: h,
              backgroundColor: `${tint}22`,
            },
          ]}
        >
          <Text style={[styles.numText, { color: tint, fontSize: 11 }]}>{i + 1}</Text>
        </View>
      ))}
    </View>
  );
}

function SplitLevel({
  label,
  tint,
  perSide,
  boxSize,
}: {
  label: string;
  tint: string;
  perSide: number;
  boxSize: number;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.levelBand}>
      <Text style={[styles.levelTag, { color: tint }]}>{label}</Text>
      <View style={styles.splitRow}>
        <View style={styles.sidePane}>
          <Text style={styles.leftLbl}>{t.left}</Text>
          <NumBoxes count={perSide} tint={tint} size={boxSize} />
        </View>
        <View style={[styles.midLine, { backgroundColor: tint }]} />
        <View style={styles.sidePane}>
          <Text style={styles.rightLbl}>{t.right}</Text>
          <NumBoxes count={perSide} tint={tint} size={boxSize} />
        </View>
      </View>
      <View style={[styles.railThin, { backgroundColor: tint }]} />
    </View>
  );
}

/** مخطط: يسار | يمين — الترقيم يبدأ من 1 في كل جهة */
export function TreeDiagramSketch({ youLabel }: Props) {
  const { t, rtl } = useI18n();
  /** عنوان المستوى: «مستوى {gen} · كل جهة 1–{n}» */
  const levelLabel = (gen: number, n: number) =>
    t.tdsLevel.replace('{gen}', String(gen)).replace('{n}', String(n));
  return (
    <View style={styles.wrap}>
      <Text style={[styles.caption, { textAlign: rtl ? 'right' : 'left' }]}>{t.tdsCaption}</Text>

      <SplitLevel label={levelLabel(4, 8)} tint={colors.treeLevel4Tint} perSide={8} boxSize={36} />
      <SplitLevel label={levelLabel(3, 4)} tint={colors.infoAccent} perSide={4} boxSize={44} />
      <SplitLevel label={levelLabel(2, 2)} tint={colors.accent} perSide={2} boxSize={56} />
      <SplitLevel label={t.tdsLevelOne} tint={colors.dxy} perSide={1} boxSize={72} />

      <View style={styles.mainFork}>
        <View style={styles.forkArm} />
        <View style={styles.forkStem} />
      </View>

      <View style={styles.you}>
        <Text style={styles.youTag}>{t.tdsRootBottom}</Text>
        <Text style={styles.youName}>{youLabel || t.ntpYou}</Text>
      </View>

      <Text style={styles.hint}>{t.tdsFootnote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.treeCanvasBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  caption: {
    color: colors.accent,
    fontWeight: '500',
    fontSize: 12,
    alignSelf: 'stretch',
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  levelBand: { width: '100%', alignItems: 'center', gap: spacing.xs, marginVertical: 4 },
  levelTag: { fontSize: 10, fontWeight: '500', textAlign: 'center' },
  splitRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  sidePane: { flex: 1, alignItems: 'center', gap: 4 },
  leftLbl: { color: colors.dxy, fontSize: 9, fontWeight: '500' },
  rightLbl: { color: colors.treeRightTint, fontSize: 9, fontWeight: '500' },
  midLine: { width: 2, alignSelf: 'stretch', minHeight: 36, opacity: 0.55 },
  railThin: { width: '85%', height: 2, opacity: 0.5, marginTop: spacing.xs },
  numRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
  numBox: {
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontWeight: '500' },
  mainFork: { alignItems: 'center', height: 22, width: '100%', marginTop: 4 },
  forkArm: { width: '70%', height: 2, backgroundColor: colors.treeForkLine },
  forkStem: { width: 2, height: 14, backgroundColor: colors.treeForkLine },
  you: {
    minWidth: 120,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
  },
  youTag: { color: colors.accent, fontSize: 9, fontWeight: '500' },
  youName: { color: colors.accent, fontWeight: '500', fontSize: 15, marginTop: 4 },
  hint: {
    color: colors.textDim,
    fontSize: 10,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 15,
  },
});
