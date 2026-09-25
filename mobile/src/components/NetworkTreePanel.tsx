import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { api } from '../api';
import { playSoftClick } from '../audio/playSoftClick';
import { TreeDiagramSketch } from './TreeDiagramSketch';
import { useI18n } from '../i18n/I18nContext';

export type TreeNode = {
  user_id: number;
  username: string;
  role: string;
  referral_code: string;
  left_count: number;
  right_count: number;
  level: number;
  left: TreeNode[];
  right: TreeNode[];
};

const LEVEL_SIZE = [2, 4, 8, 16] as const;
const LEVEL_TINT = [colors.dxy, colors.accent, colors.infoAccent, colors.treeLevel4Tint] as const;

type Props = {
  enabled: boolean;
  onChanged?: () => void;
  previewName?: string;
};

type SlotInfo = {
  gen: number;
  index: number; // 0-based within full level (for parent mapping)
  label: number; // 1-based within this leg only
  leg: 'left' | 'right'; // جهة الشجرة (يسار/يمين من الجذر)
  node: TreeNode | null;
  parentId: number | null;
  placeSide: 'left' | 'right'; // يسار/يمين تحت الأب
  unlocked: boolean;
};

/** عقد الجيل كقائمة ثنائية مرتبة (يسار ثم يمين تحت كل أب) */
function nodesAtGen(root: TreeNode, gen: number): (TreeNode | null)[] {
  let layer: (TreeNode | null)[] = [root];
  for (let d = 0; d < gen; d++) {
    const next: (TreeNode | null)[] = [];
    for (const n of layer) {
      next.push(n?.left?.[0] ?? null);
      next.push(n?.right?.[0] ?? null);
    }
    layer = next;
  }
  return layer;
}

function buildSlots(root: TreeNode): SlotInfo[] {
  const out: SlotInfo[] = [];
  for (let gen = 1; gen <= 4; gen++) {
    const size = LEVEL_SIZE[gen - 1];
    const half = size / 2;
    const nodes = nodesAtGen(root, gen);
    const parents = gen === 1 ? [root] : nodesAtGen(root, gen - 1);
    for (let i = 0; i < size; i++) {
      const parent = parents[Math.floor(i / 2)] ?? null;
      const leg: 'left' | 'right' = i < half ? 'left' : 'right';
      const label = (i % half) + 1;
      out.push({
        gen,
        index: i,
        label,
        leg,
        node: nodes[i] ?? null,
        parentId: parent?.user_id ?? null,
        placeSide: i % 2 === 0 ? 'left' : 'right',
        unlocked: !!parent,
      });
    }
  }
  return out;
}

function SlotBox({
  slot,
  tint,
  busy,
  onPlace,
}: {
  slot: SlotInfo;
  tint: string;
  busy: boolean;
  onPlace: (slot: SlotInfo, name: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  const [localBusy, setLocalBusy] = useState(false);

  if (slot.node) {
    return (
      <View style={[styles.slot, styles.slotFilled, { borderColor: tint }]}>
        <Text style={[styles.slotNum, { color: tint }]}>{slot.label}</Text>
        <Text style={styles.slotName} numberOfLines={2}>
          {slot.node.username}
        </Text>
      </View>
    );
  }

  if (!slot.unlocked) {
    return (
      <View style={[styles.slot, styles.slotLocked]}>
        <Text style={styles.slotNumDim}>{slot.label}</Text>
      </View>
    );
  }

  const submit = async () => {
    const name = draft.trim();
    if (name.length < 3 || localBusy || busy) return;
    setLocalBusy(true);
    try {
      await onPlace(slot, name);
      setDraft('');
    } finally {
      setLocalBusy(false);
    }
  };

  return (
    <View style={[styles.slot, styles.slotEmpty, { borderColor: tint }]}>
      <Text style={[styles.slotNum, { color: tint }]}>{slot.label}</Text>
      <TextInput
        style={styles.slotInput}
        value={draft}
        onChangeText={setDraft}
        placeholder={t.ntpNamePlaceholder}
        placeholderTextColor={colors.textDim}
        autoCapitalize="none"
        editable={!busy && !localBusy}
        onSubmitEditing={() => void submit()}
        returnKeyType="done"
        underlineColorAndroid="transparent"
        clearButtonMode="while-editing"
        keyboardAppearance="dark"
        selectionColor={colors.accent}
        accessibilityLabel={t.ntpNameA11y}
      />
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.slotGo,
          (draft.trim().length < 3 || localBusy) && styles.slotGoOff,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={() => void submit()}
        disabled={draft.trim().length < 3 || localBusy || busy}
        accessibilityState={{
          disabled: draft.trim().length < 3 || localBusy || busy,
          busy: localBusy,
        }}
        accessibilityLabel={t.ntpConfirmA11y}
        hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.slotGoText}>{localBusy ? '…' : '✓'}</Text>
      </Pressable>
    </View>
  );
}

function LevelConnector({ tint, label }: { tint: string; label?: string }) {
  return (
    <View style={styles.levelConnect}>
      <View style={styles.connectSides}>
        <View style={[styles.connectStem, { backgroundColor: tint }]} />
        <View style={[styles.connectStem, { backgroundColor: tint }]} />
      </View>
      <View style={[styles.connectRail, { backgroundColor: tint }]} />
      {label ? <Text style={[styles.connectLabel, { color: tint }]}>{label}</Text> : null}
    </View>
  );
}

function LevelRow({
  gen,
  slots,
  busy,
  onPlace,
}: {
  gen: number;
  slots: SlotInfo[];
  busy: boolean;
  onPlace: (slot: SlotInfo, name: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const tint = LEVEL_TINT[gen - 1];
  const perSide = LEVEL_SIZE[gen - 1] / 2;
  const leftSlots = slots.filter((s) => s.leg === 'left');
  const rightSlots = slots.filter((s) => s.leg === 'right');
  const filledL = leftSlots.filter((s) => s.node).length;
  const filledR = rightSlots.filter((s) => s.node).length;

  return (
    <View style={styles.levelBlock}>
      <Text style={[styles.levelTitle, { color: tint }]}>
        {t.ntpLevelTitle.replace('{gen}', String(gen)).replace('{n}', String(perSide))}
        {gen > 1 ? t.ntpNewBranches : ''}
      </Text>
      <View style={styles.sidesRow}>
        <View style={[styles.sideCol, styles.sideLeft]}>
          <Text style={[styles.sideTag, styles.leftTag]}>{t.left}</Text>
          <View style={styles.slotGrid}>
            {leftSlots.map((s) => (
              <SlotBox
                key={`${gen}-L-${s.label}`}
                slot={s}
                tint={tint}
                busy={busy}
                onPlace={onPlace}
              />
            ))}
          </View>
          <Text style={styles.sideCount}>
            {filledL}/{perSide}
          </Text>
        </View>

        <View style={styles.sideGap}>
          <View style={[styles.sideGapLine, { backgroundColor: tint }]} />
        </View>

        <View style={[styles.sideCol, styles.sideRight]}>
          <Text style={[styles.sideTag, styles.rightTag]}>{t.right}</Text>
          <View style={styles.slotGrid}>
            {rightSlots.map((s) => (
              <SlotBox
                key={`${gen}-R-${s.label}`}
                slot={s}
                tint={tint}
                busy={busy}
                onPlace={onPlace}
              />
            ))}
          </View>
          <Text style={styles.sideCount}>
            {filledR}/{perSide}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function NetworkTreePanel({ enabled, onChanged, previewName }: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  /** نوع الخطأ لا نصّه — النص يُترجم عند العرض فيتبع تبديل اللغة */
  const [err, setErr] = useState<'load' | 'place' | null>(null);
  const [open, setOpen] = useState(true);

  // حارس "alive" مبني على ref يمنع تحديث الحالة بعد إلغاء تركيب اللوحة (طي/فتح لوحة الشبكة
  // قبل اكتمال الطلب) — نفس مبدأ ChartFrame/SymbolSnapshot المؤسَّس بالكود.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!enabled) {
      setTree(null);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await api.commissionTree(5);
      if (mountedRef.current) setTree(res.tree as TreeNode | null);
    } catch {
      if (mountedRef.current) {
        setTree(null);
        setErr('load');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (open && enabled) void load();
  }, [load, open, enabled]);

  const slots = useMemo(() => (tree ? buildSlots(tree) : []), [tree]);
  const byGen = useMemo(() => {
    const map: Record<number, SlotInfo[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const s of slots) map[s.gen].push(s);
    return map;
  }, [slots]);

  const placeInSlot = async (slot: SlotInfo, name: string) => {
    if (!slot.parentId) return;
    setPlacing(true);
    setErr(null);
    try {
      const res = await api.placeNetworkMember({
        username: name,
        side: slot.placeSide,
        under_user_id: slot.parentId,
      });
      setTree(res.tree as TreeNode | null);
      playSoftClick();
      onChanged?.();
    } catch {
      setErr('place');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <View style={[styles.wrap, !open && styles.wrapCollapsed]}>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.headBar,
          !rtl && styles.headBarLtr,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={() => setOpen((v) => !v)}
        accessibilityLabel={open ? t.ntpCloseA11y : t.ntpOpenA11y}
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.chev}>{open ? '▾' : '▸'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { textAlign: align }]}>{t.ntpTitle}</Text>
          <Text style={[styles.sub, { textAlign: align }]}>
            {open ? (enabled ? t.ntpSubLive : t.ntpSubPreview) : t.ntpSubClosed}
          </Text>
        </View>
        {open && enabled ? (
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
          {!enabled ? (
            <>
              <TreeDiagramSketch youLabel={previewName || t.ntpYou} />
              <Text style={[styles.guestHint, { textAlign: align }]}>{t.ntpGuestHint}</Text>
            </>
          ) : (
            <>
              {loading ? (
                <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.md }} />
              ) : null}
              {err ? (
                <Text style={[styles.err, { textAlign: align }]}>
                  {err === 'load' ? t.ntpLoadError : t.ntpPlaceError}
                </Text>
              ) : null}

              {tree ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator
                  contentContainerStyle={styles.scrollPad}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.treeCanvas}>
                    <LevelRow gen={4} slots={byGen[4]} busy={placing} onPlace={placeInSlot} />
                    <LevelConnector tint={LEVEL_TINT[3]} label={t.ntpLevelBranches.replace('{gen}', '4')} />
                    <LevelRow gen={3} slots={byGen[3]} busy={placing} onPlace={placeInSlot} />
                    <LevelConnector tint={LEVEL_TINT[2]} label={t.ntpLevelBranches.replace('{gen}', '3')} />
                    <LevelRow gen={2} slots={byGen[2]} busy={placing} onPlace={placeInSlot} />
                    <LevelConnector tint={LEVEL_TINT[1]} label={t.ntpLevelBranches.replace('{gen}', '2')} />
                    <LevelRow gen={1} slots={byGen[1]} busy={placing} onPlace={placeInSlot} />

                    <View style={styles.trunk}>
                      <View style={styles.trunkH} />
                      <View style={styles.trunkV} />
                      <Text style={styles.trunkHint}>{t.ntpTrunkHint}</Text>
                    </View>

                    <View style={styles.youBox}>
                      <Text style={styles.youTag}>{t.ntpYouRoot}</Text>
                      <Text style={styles.youName}>{tree.username}</Text>
                    </View>
                  </View>
                </ScrollView>
              ) : null}
            </>
          )}
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
  headBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    minHeight: 52,
  },
  headBarLtr: { flexDirection: 'row' },
  chev: { color: colors.accent, fontSize: 18, fontWeight: '500', width: 22, textAlign: 'center' },
  title: { color: colors.text, fontWeight: '500', fontSize: 13, textAlign: 'right' },
  sub: { color: colors.textDim, fontSize: 11, textAlign: 'right', marginTop: 0 },
  refresh: { color: colors.accent, fontWeight: '500', fontSize: 11 },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  guestHint: { color: colors.textMuted, fontSize: 11, textAlign: 'right' },
  err: { color: colors.bear, fontSize: 11, textAlign: 'right' },
  scrollPad: { paddingVertical: 8 },
  treeCanvas: {
    minWidth: 780,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.treeCanvasBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: spacing.md,
  },
  levelBlock: { width: '100%', alignItems: 'center', gap: 4 },
  levelTitle: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  sidesRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sideCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    minWidth: 320,
  },
  sideLeft: {},
  sideRight: {},
  sideTag: { fontSize: 11, fontWeight: '500' },
  leftTag: { color: colors.dxy },
  rightTag: { color: colors.treeRightTint },
  sideCount: { color: colors.textDim, fontSize: 11 },
  sideGap: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingTop: 20,
  },
  sideGapLine: { width: 2, flex: 1, minHeight: 40, opacity: 0.55 },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    maxWidth: 340,
  },
  levelConnect: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  connectSides: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingHorizontal: '12%',
  },
  connectStem: { width: 2, height: 14, opacity: 0.7 },
  connectRail: { width: '78%', height: 2, opacity: 0.55 },
  connectLabel: { fontSize: 11, fontWeight: '500', marginTop: 0 },
  slot: {
    width: 148,
    minHeight: 64,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgPanel,
  },
  slotFilled: { backgroundColor: colors.accentFaint },
  slotEmpty: { borderStyle: 'dashed' },
  slotLocked: {
    borderColor: colors.lockedBorder,
    opacity: 0.45,
    borderStyle: 'dashed',
  },
  slotNum: { fontSize: 12, fontWeight: '500', marginBottom: 4, alignSelf: 'flex-end' },
  slotNumDim: { color: colors.textDim, fontSize: 12, fontWeight: '500' },
  slotName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
    lineHeight: 18,
  },
  slotInput: {
    width: '100%',
    color: colors.text,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.xs,
    minHeight: 28,
  },
  slotGo: {
    marginTop: spacing.xs,
    minWidth: 36,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  slotGoOff: { opacity: 0.35 },
  slotGoText: { color: colors.onAccent, fontWeight: '500', fontSize: 13 },
  trunk: { alignItems: 'center', height: 42, width: '100%', justifyContent: 'flex-start' },
  trunkH: { width: '70%', height: 2, backgroundColor: colors.networkTrunkLine },
  trunkV: { width: 2, height: 18, backgroundColor: colors.networkTrunkLine },
  trunkHint: { color: colors.textDim, fontSize: 11, marginTop: 4 },
  youBox: {
    minWidth: 160,
    paddingVertical: spacing.md,
    paddingHorizontal: 20,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
  },
  youTag: { color: colors.accent, fontSize: 11, fontWeight: '500' },
  youName: { color: colors.accent, fontWeight: '500', fontSize: 15, marginTop: 4 },
});
