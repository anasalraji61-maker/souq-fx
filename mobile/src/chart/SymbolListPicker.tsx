import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { buttons, colors, radii, selectedMarkerWidth, spacing } from '../theme';
import { WATCHLIST } from './watchlist';
import { loadWatchlistItems } from './watchlistStore';
import { filterSymbols } from './symbolListFilter';
import { playSoftClick, unlockSoftClick } from '../audio/playSoftClick';
import { useI18n } from '../i18n/I18nContext';

/**
 * منتقي الرمز فوق إطار الشارت (W6، أنس): كانت عجلة من ثلاثة أسطر وسط اللوح تحجب الشموع والسعر، ولا
 * يُبلغ الزوج العاشر إلا بعشر نقرات. الآن قائمة قائمة المتابعة كلّها قابلة للتمرير بخانة بحث، ملاصقة
 * لزرّ الرمز أعلى اليسار وبعرض ضيّق — يمين اللوح (الشمعة الحيّة ومحور السعر) يبقى ظاهراً.
 * الويب: الكتابة تبدأ فوراً، Enter يفتح أول نتيجة، Esc يغلق. الهاتف: لا لوحة مفاتيح حتى يلمس الخانة.
 */
type Props = {
  value: string;
  onChange: (symbol: string) => void;
  onClose: () => void;
};

const PANEL_W = 176;

export function SymbolListPicker({ value, onChange, onClose }: Props) {
  const { t, rtl } = useI18n();
  const [pairs, setPairs] = useState<string[]>(() => WATCHLIST.map((w) => w.symbol));
  const [q, setQ] = useState('');

  useEffect(() => {
    unlockSoftClick();
    playSoftClick();
    let alive = true;
    void loadWatchlistItems().then((items) => {
      if (!alive || !items.length) return;
      setPairs(items.map((x) => x.symbol));
    });
    return () => {
      alive = false;
    };
  }, []);

  // Esc يغلق — بالالتقاط، فلا يصل لمستمع الرسم/التقاطع بالشارت تحته.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const shown = useMemo(() => filterSymbols(pairs, q), [pairs, q]);
  const pick = (s: string) => {
    playSoftClick();
    if (s !== value) onChange(s);
    onClose();
  };

  return (
    <View style={styles.panel}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={t.ssbPlaceholder}
        placeholderTextColor={colors.textDim}
        autoFocus={Platform.OS === 'web'}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={() => {
          if (shown[0]) pick(shown[0]);
        }}
        accessibilityLabel={t.ssbPlaceholder}
        style={[styles.search, { textAlign: rtl ? 'right' : 'left' }]}
      />
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {shown.map((s) => {
          const selected = s === value;
          return (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityLabel={s}
              accessibilityState={{ selected }}
              onPress={() => pick(s)}
              style={(st) => [
                styles.row,
                selected && styles.rowSelected,
                (st as { hovered?: boolean }).hovered && !selected && styles.rowHover,
                st.pressed && { opacity: buttons.pressedOpacity },
              ]}
            >
              <Text style={[styles.rowText, selected && styles.rowTextSelected]} numberOfLines={1}>
                {s}
              </Text>
            </Pressable>
          );
        })}
        {!shown.length ? <Text style={styles.empty}>—</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // §5.5: حدّ خافت وحده — بلا ظلّ.
  panel: {
    width: PANEL_W,
    maxHeight: '80%',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: radii.sm,
    padding: spacing.xs,
    overflow: 'hidden',
  },
  search: {
    height: 32,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.controlBg,
    color: colors.text,
    fontSize: 13,
  },
  list: { flexGrow: 0 },
  row: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    borderLeftWidth: selectedMarkerWidth,
    borderLeftColor: 'transparent',
  },
  // §4: الاختيار بخلفية وعلامة داخلية لا بلون وحده.
  rowSelected: { backgroundColor: colors.bgPanel, borderLeftColor: colors.accent },
  rowHover: { backgroundColor: 'rgba(255,255,255,0.04)' },
  rowText: { color: colors.textMuted, fontSize: 13, fontWeight: '400' },
  rowTextSelected: { color: colors.text, fontWeight: '500' },
  empty: { color: colors.textDim, fontSize: 13, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
});
