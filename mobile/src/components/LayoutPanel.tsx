import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import {
  loadLayouts,
  saveLayout,
  deleteLayout,
  subscribeLayoutsSaveError,
  DEFAULT_LAYOUT,
  type TerminalLayout,
} from '../chart/layoutStore';
import { api } from '../api';

type Props = {
  frameTfs: [string, string, string] | string[];
  frameSymbols: [string, string, string];
  onApply: (layout: TerminalLayout) => void;
};

export function LayoutPanel({ frameTfs, frameSymbols, onApply }: Props) {
  const [layouts, setLayouts] = useState<TerminalLayout[]>([DEFAULT_LAYOUT]);
  const [name, setName] = useState('تخطيطي');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    loadLayouts().then((l) => setLayouts(l.length ? [DEFAULT_LAYOUT, ...l] : [DEFAULT_LAYOUT]));
    const unsubErr = subscribeLayoutsSaveError(setSaveError);
    return () => {
      unsubErr();
    };
  }, []);

  const save = async () => {
    const layout: TerminalLayout = {
      id: `l${Date.now()}`,
      name: name.trim() || 'تخطيط',
      dxyTf: '15m',
      frameSymbols,
      frameTfs: [frameTfs[0], frameTfs[1], frameTfs[2]],
      frameSizes: ['small', 'medium', 'large'],
    };
    await saveLayout(layout);
    try {
      await api.saveLayout({ name: layout.name, payload: layout });
    } catch {
      /* local ok */
    }
    setLayouts((prev) => [DEFAULT_LAYOUT, layout, ...prev.filter((x) => x.id !== layout.id)]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>تخطيطات محفوظة</Text>
      {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="اسم التخطيط"
        placeholderTextColor={colors.textDim}
        accessibilityLabel="اسم التخطيط"
      />
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.btn,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={save}
      >
        <Text style={styles.btnText}>حفظ التخطيط الحالي</Text>
      </Pressable>
      {layouts.map((l) => (
        <View key={l.id} style={styles.row}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.apply,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => onApply(l)}
          >
            <Text style={styles.rowName}>{l.name}</Text>
            <Text style={styles.rowSub}>
              {l.frameSymbols.join(' · ')}
            </Text>
          </Pressable>
          {l.id !== 'default' ? (
            <Pressable
              accessibilityRole="button"
              onPress={async () => {
                await deleteLayout(l.id);
                setLayouts((prev) => prev.filter((x) => x.id !== l.id));
              }}
              style={({ pressed }) =>
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                }
              }
            >
              <Text style={styles.del}>حذف</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 8,
  },
  title: { color: colors.text, fontWeight: '800', textAlign: 'right' },
  input: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 8,
    textAlign: 'right',
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  btnText: { color: '#042F2E', fontWeight: '800' },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
    paddingTop: 8,
  },
  apply: { flex: 1 },
  rowName: { color: colors.text, fontWeight: '700', textAlign: 'right' },
  rowSub: { color: colors.textDim, fontSize: 10, textAlign: 'right' },
  del: { color: colors.bear, fontWeight: '700' },
  saveError: {
    color: colors.bear,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
  },
});
