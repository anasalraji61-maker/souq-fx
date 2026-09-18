import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Alert } from 'react-native';
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
import { playSoftClick } from '../audio/playSoftClick';
import { useI18n } from '../i18n/I18nContext';

type Props = {
  frameTfs: [string, string, string] | string[];
  frameSymbols: [string, string, string];
  onApply: (layout: TerminalLayout) => void;
};

export function LayoutPanel({ frameTfs, frameSymbols, onApply }: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [layouts, setLayouts] = useState<TerminalLayout[]>([DEFAULT_LAYOUT]);
  const [name, setName] = useState(t.layoutDefaultName);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    // حارس "alive" يمنع تحديث الحالة بعد إلغاء تركيب اللوحة قبل اكتمال الطلب — نفس نمط
    // ChartFrame/SymbolSnapshot/FocusChartModal المؤسَّس بالكود.
    let alive = true;
    loadLayouts().then((l) => {
      if (alive) setLayouts(l.length ? [DEFAULT_LAYOUT, ...l] : [DEFAULT_LAYOUT]);
    });
    const unsubErr = subscribeLayoutsSaveError(setSaveError);
    return () => {
      alive = false;
      unsubErr();
    };
  }, []);

  const save = async () => {
    const layout: TerminalLayout = {
      id: `l${Date.now()}`,
      name: name.trim() || t.layoutFallbackName,
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
    playSoftClick();
    setLayouts((prev) => [DEFAULT_LAYOUT, layout, ...prev.filter((x) => x.id !== layout.id)]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { textAlign: align }]}>{t.layoutsTitle}</Text>
      {saveError ? <Text style={[styles.saveError, { textAlign: align }]}>{saveError}</Text> : null}
      <TextInput
        style={[styles.input, { textAlign: align }]}
        value={name}
        onChangeText={setName}
        placeholder={t.layoutNamePlaceholder}
        placeholderTextColor={colors.textDim}
        returnKeyType="done"
        underlineColorAndroid="transparent"
        clearButtonMode="while-editing"
        keyboardAppearance="dark"
        selectionColor={colors.accent}
        accessibilityLabel={t.layoutNameA11y}
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
        accessibilityLabel={t.layoutSaveA11y}
        hitSlop={8}
      >
        <Text style={styles.btnText}>{t.layoutSaveBtn}</Text>
      </Pressable>
      {layouts.map((l) => (
        <View key={l.id} style={[styles.row, rtl && styles.rowRtl]}>
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
            accessibilityLabel={`${t.layoutApplyA11yPrefix}: ${l.name}`}
          >
            <Text style={[styles.rowName, { textAlign: align }]}>{l.name}</Text>
            <Text style={[styles.rowSub, { textAlign: align }]}>
              {l.frameSymbols.join(' · ')}
            </Text>
          </Pressable>
          {l.id !== 'default' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                Alert.alert(t.layoutDeleteConfirmTitle, l.name, [
                  { text: t.cancel, style: 'cancel' },
                  {
                    text: t.deleteWord,
                    style: 'destructive',
                    onPress: async () => {
                      await deleteLayout(l.id);
                      setLayouts((prev) => prev.filter((x) => x.id !== l.id));
                    },
                  },
                ])
              }
              style={({ pressed }) =>
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                }
              }
              accessibilityLabel={`${t.layoutDeleteA11yPrefix}: ${l.name}`}
            >
              <Text style={styles.del}>{t.deleteWord}</Text>
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
    gap: spacing.sm,
  },
  title: { color: colors.text, fontWeight: '800', textAlign: 'right' },
  input: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: spacing.sm,
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
  btnText: { color: colors.onAccent, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
    paddingTop: spacing.sm,
  },
  rowRtl: { flexDirection: 'row-reverse' },
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
