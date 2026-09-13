import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { formatPrice } from '../chart/math';
import { SymbolSearchBar } from './SymbolSearchBar';
import {
  addWatchSymbol,
  catalogEntriesNotIn,
  ensureWatchlistLoaded,
  moveWatchSymbol,
  removeWatchSymbol,
  resetWatchlistToDefault,
  subscribeWatchlist,
  subscribeWatchlistSaveError,
} from '../chart/watchlistStore';

type Props = {
  activeSymbol: string;
  ticks: Record<string, number>;
  bases?: Record<string, number>;
  onPick: (symbol: string) => void;
  compact?: boolean;
  fullWidth?: boolean;
};

const FALLBACK: Record<string, number> = {
  DXY: 104.25,
  EURUSD: 1.0854,
  GBPUSD: 1.2732,
  USDJPY: 157.42,
  XAUUSD: 2348.6,
  XAGUSD: 28.4,
  BTCUSD: 67420,
  ETHUSD: 3450,
};

export function WatchlistPanel({
  activeSymbol,
  ticks,
  bases = FALLBACK,
  onPick,
  compact = false,
  fullWidth = false,
}: Props) {
  const [symbols, setSymbols] = useState<string[] | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const loadList = useCallback(async () => {
    setLoadError(false);
    try {
      await ensureWatchlistLoaded();
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeWatchlist(setSymbols);
    const unsubErr = subscribeWatchlistSaveError(setSaveError);
    void loadList();
    return () => {
      unsub();
      unsubErr();
    };
  }, [loadList]);

  const ready = symbols != null;
  const list = symbols ?? [];
  const addable = useMemo(() => catalogEntriesNotIn(list), [list]);

  const onAdd = useCallback(async (sym: string) => {
    await addWatchSymbol(sym);
    setAddOpen(false);
  }, []);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, fullWidth && styles.wrapFull]}>
      <Text style={styles.title}>قائمة متابعة</Text>
      {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.toolBtn,
            addable.length === 0 && styles.toolBtnDisabled,
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          disabled={!ready || addable.length === 0}
          onPress={() => setAddOpen(true)}
        >
          <Text style={styles.toolBtnText}>إضافة</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!ready}
          style={({ pressed }) => [
            styles.toolBtn,
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          onPress={() => void resetWatchlistToDefault()}
        >
          <Text style={styles.toolBtnText}>افتراضي</Text>
        </Pressable>
      </View>
      {!compact && ready ? <SymbolSearchBar onPick={onPick} placeholder="بحث رمز…" /> : null}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {!ready ? (
          loadError ? (
            <View style={styles.emptyBox}>
              <Text style={styles.saveError}>تعذر تحميل قائمة المتابعة</Text>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.toolBtn,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => void loadList()}
              >
                <Text style={styles.toolBtnText}>إعادة المحاولة</Text>
              </Pressable>
            </View>
          ) : <Text style={styles.empty}>جاري التحميل…</Text>
        ) : list.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.empty}>لا رموز في المتابعة</Text>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.addEmptyBtn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => setAddOpen(true)}
            >
              <Text style={styles.addEmptyText}>إضافة رمز</Text>
            </Pressable>
          </View>
        ) : (
          list.map((sym, index) => {
            const on = activeSymbol === sym;
            const live = ticks[sym];
            const price = live ?? bases[sym];
            const isDemoPrice = live == null && price != null;
            const isDxy = sym === 'DXY';
            return (
              <View
                key={sym}
                style={[styles.rowWrap, on && styles.rowWrapOn, isDxy && styles.rowDxy]}
              >
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.rowMain,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() => onPick(sym)}
                >
                  <View style={styles.left}>
                    <Text
                      style={[styles.sym, on && styles.symOn, isDxy && styles.symDxy]}
                      {...(Platform.OS === 'web'
                        ? ({ translate: 'no', className: 'notranslate' } as object)
                        : {})}
                    >
                      {sym}
                    </Text>
                    {isDemoPrice ? <Text style={styles.demoTag}>افتراضي</Text> : null}
                  </View>
                  <Text style={[styles.price, on && styles.priceOn, isDemoPrice && styles.priceDemo]}>
                    {price != null ? formatPrice(price) : '—'}
                  </Text>
                </Pressable>
                <View style={styles.ops}>
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.opBtn,
                      index === 0 && styles.opDisabled,
                      pressed && {
                        opacity: buttons.pressedOpacity,
                        transform: [{ scale: buttons.pressedScale }],
                      },
                    ]}
                    disabled={index === 0}
                    onPress={() => void moveWatchSymbol(sym, -1)}
                    accessibilityLabel="تحريك لأعلى"
                  >
                    <Text style={styles.opText}>↑</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.opBtn,
                      index >= list.length - 1 && styles.opDisabled,
                      pressed && {
                        opacity: buttons.pressedOpacity,
                        transform: [{ scale: buttons.pressedScale }],
                      },
                    ]}
                    disabled={index >= list.length - 1}
                    onPress={() => void moveWatchSymbol(sym, 1)}
                    accessibilityLabel="تحريك لأسفل"
                  >
                    <Text style={styles.opText}>↓</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.opBtn,
                      pressed && {
                        opacity: buttons.pressedOpacity,
                        transform: [{ scale: buttons.pressedScale }],
                      },
                    ]}
                    onPress={() => void removeWatchSymbol(sym)}
                    accessibilityLabel="إزالة من المتابعة"
                  >
                    <Text style={[styles.opText, styles.opRemove]}>حذف</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>إضافة من الكتالوج</Text>
            <ScrollView style={styles.modalList}>
              {addable.length === 0 ? (
                <Text style={styles.empty}>كل رموز الكتالوج مضافة</Text>
              ) : (
                addable.map((w) => (
                  <Pressable
                    accessibilityRole="button"
                    key={w.symbol}
                    style={({ pressed }) => [
                      styles.modalRow,
                      pressed && {
                        opacity: buttons.pressedOpacity,
                        transform: [{ scale: buttons.pressedScale }],
                      },
                    ]}
                    onPress={() => void onAdd(w.symbol)}
                  >
                    <Text style={styles.modalSym}>{w.symbol}</Text>
                    <Text style={styles.modalGroup}>{w.group}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.modalClose,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => setAddOpen(false)}
            >
              <Text style={styles.modalCloseText}>إغلاق</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 198,
    backgroundColor: colors.bgElevated,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingTop: 6,
    paddingHorizontal: 6,
  },
  wrapCompact: { width: 148, paddingHorizontal: 4 },
  wrapFull: { width: '100%', flex: 1, borderLeftWidth: 0 },
  title: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'right',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  saveError: {
    color: colors.bear,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  toolbar: {
    flexDirection: 'row-reverse',
    gap: 4,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  toolBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolBtnDisabled: { opacity: 0.4 },
  toolBtnText: { color: colors.accent, fontSize: 10, fontWeight: '800' },
  list: { gap: 3, paddingBottom: 16 },
  emptyBox: { paddingVertical: 16, alignItems: 'center', gap: 8 },
  empty: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 8,
  },
  addEmptyBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.sm,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  addEmptyText: { color: colors.accent, fontWeight: '800', fontSize: 12 },
  rowWrap: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.bgPanel,
    overflow: 'hidden',
  },
  rowWrapOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  rowDxy: {
    borderColor: '#1E3A5F',
    backgroundColor: '#0E1728',
  },
  rowMain: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  left: { flex: 1, alignItems: 'flex-end', minWidth: 0 },
  sym: { color: colors.textMuted, fontWeight: '800', fontSize: 11 },
  symOn: { color: colors.accent },
  symDxy: { color: colors.dxy },
  demoTag: { color: colors.warn, fontSize: 8, fontWeight: '700', marginTop: 1 },
  price: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginLeft: 6 },
  priceOn: { color: colors.text },
  priceDemo: { color: colors.textDim, fontWeight: '600' },
  ops: {
    flexDirection: 'row-reverse',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingVertical: 2,
    paddingHorizontal: 4,
    gap: 2,
    justifyContent: 'flex-start',
  },
  opBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  opDisabled: { opacity: 0.3 },
  opText: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  opRemove: { color: colors.bear },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    maxHeight: '70%',
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  modalTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  modalList: { maxHeight: 320 },
  modalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  modalSym: { color: colors.text, fontWeight: '800', fontSize: 13 },
  modalGroup: { color: colors.textDim, fontSize: 11 },
  modalClose: {
    marginTop: spacing.sm,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalCloseText: { color: colors.accent, fontWeight: '800' },
});
