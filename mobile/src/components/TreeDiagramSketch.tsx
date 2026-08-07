import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii } from '../theme';

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
  return (
    <View style={styles.levelBand}>
      <Text style={[styles.levelTag, { color: tint }]}>{label}</Text>
      <View style={styles.splitRow}>
        <View style={styles.sidePane}>
          <Text style={styles.leftLbl}>يسار</Text>
          <NumBoxes count={perSide} tint={tint} size={boxSize} />
        </View>
        <View style={[styles.midLine, { backgroundColor: tint }]} />
        <View style={styles.sidePane}>
          <Text style={styles.rightLbl}>يمين</Text>
          <NumBoxes count={perSide} tint={tint} size={boxSize} />
        </View>
      </View>
      <View style={[styles.railThin, { backgroundColor: tint }]} />
    </View>
  );
}

/** مخطط: يسار | يمين — الترقيم يبدأ من 1 في كل جهة */
export function TreeDiagramSketch({ youLabel = 'أنت' }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.caption}>كيف تنمو الشجرة · يسار ويمين منفصلان</Text>

      <SplitLevel label="مستوى 4 · كل جهة 1–8" tint="#F472B6" perSide={8} boxSize={36} />
      <SplitLevel label="مستوى 3 · كل جهة 1–4" tint="#A78BFA" perSide={4} boxSize={44} />
      <SplitLevel label="مستوى 2 · كل جهة 1–2" tint="#2DD4BF" perSide={2} boxSize={56} />
      <SplitLevel label="مستوى 1 · كل جهة مربع 1" tint="#38BDF8" perSide={1} boxSize={72} />

      <View style={styles.mainFork}>
        <View style={styles.forkArm} />
        <View style={styles.forkStem} />
      </View>

      <View style={styles.you}>
        <Text style={styles.youTag}>الجذر · أسفل</Text>
        <Text style={styles.youName}>{youLabel}</Text>
      </View>

      <Text style={styles.hint}>
        الأرقام تبدأ من 1 في كل جهة — يسار منفصل عن يمين · اكتب الاسم داخل المربع فقط
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#0A1220',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  caption: {
    color: colors.accent,
    fontWeight: '900',
    fontSize: 12,
    alignSelf: 'stretch',
    textAlign: 'right',
    marginBottom: 4,
  },
  levelBand: { width: '100%', alignItems: 'center', gap: 4, marginVertical: 2 },
  levelTag: { fontSize: 10, fontWeight: '800', textAlign: 'center' },
  splitRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  sidePane: { flex: 1, alignItems: 'center', gap: 3 },
  leftLbl: { color: '#38BDF8', fontSize: 9, fontWeight: '900' },
  rightLbl: { color: '#FBBF24', fontSize: 9, fontWeight: '900' },
  midLine: { width: 2, alignSelf: 'stretch', minHeight: 36, opacity: 0.55 },
  railThin: { width: '85%', height: 2, opacity: 0.5, marginTop: 4 },
  numRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 5,
  },
  numBox: {
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontWeight: '900' },
  mainFork: { alignItems: 'center', height: 22, width: '100%', marginTop: 2 },
  forkArm: { width: '70%', height: 2, backgroundColor: '#475569' },
  forkStem: { width: 2, height: 14, backgroundColor: '#475569' },
  you: {
    minWidth: 120,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
  },
  youTag: { color: colors.accent, fontSize: 9, fontWeight: '900' },
  youName: { color: colors.accent, fontWeight: '900', fontSize: 15, marginTop: 2 },
  hint: {
    color: colors.textDim,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
  },
});
