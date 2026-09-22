import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { formatPrice } from '../chart/math';
import { playSoftClick } from '../audio/playSoftClick';
import { SymbolSearchBar } from './SymbolSearchBar';
import { useI18n } from '../i18n/I18nContext';
import {
  addWatchSymbol,
  catalogEntriesNotIn,
  ensureWatchlistLoaded,
  moveWatchSymbol,
  removeWatchSymbol,
  resetWatchlistToDefault,
  subscribeWatchlist,
  subscribeWatchlistSaveError,
  type WatchlistSaveErrorCode,
} from '../chart/watchlistStore';
import { useDailyRefs } from '../chart/dailyRefStore';
import { dailyChange, formatPct, tickDirection, type Direction } from '../chart/dailyChange';

type Props = {
  activeSymbol: string;
  ticks: Record<string, number>;
  bases?: Record<string, number>;
  /** رموز تيكها الحالي من بثّ تجريبي (fallback عشوائي) — تُعامَل كسعر افتراضي: بلا تلوين اتجاه ولا نسبة. */
  demoTicks?: readonly string[];
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
  demoTicks,
  onPick,
  compact = false,
  fullWidth = false,
}: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [symbols, setSymbols] = useState<string[] | null>(null);
  const [saveError, setSaveError] = useState<WatchlistSaveErrorCode | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // حارس "alive" مبني على ref يمنع تحديث الحالة بعد إلغاء تركيب اللوحة (مغادرة شاشة الشارت
  // قبل اكتمال تحميل قائمة المتابعة) — نفس مبدأ ChartFrame/SymbolSnapshot المؤسَّس بالكود.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadList = useCallback(async () => {
    setLoadError(false);
    try {
      await ensureWatchlistLoaded();
    } catch {
      if (mountedRef.current) setLoadError(true);
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
  // مرجع "إغلاق الأمس" لنسبة تغيّر اليوم (مخزن مشترك، 10 دقائق، يتجاهل البيانات التجريبية).
  const dailyRefs = useDailyRefs(list);
  const demoSet = useMemo(() => new Set(demoTicks ?? []), [demoTicks]);
  // اتجاه آخر تيك لكل رمز (يلوّن السعر أخضر/أحمر كما يعتاد المتداول) — يُحدَّث فقط عند تغيّر السعر فعلاً.
  const prevTicksRef = useRef<Record<string, number>>({});
  const [tickDirs, setTickDirs] = useState<Record<string, Direction>>({});
  useEffect(() => {
    const prev = prevTicksRef.current;
    let changed: Record<string, Direction> | null = null;
    for (const [sym, price] of Object.entries(ticks)) {
      const before = prev[sym];
      if (before != null && before !== price) {
        const d = tickDirection(before, price);
        if (d !== 'flat') {
          changed = changed ?? {};
          changed[sym] = d;
        }
      }
      prev[sym] = price;
    }
    if (changed && mountedRef.current) {
      const upd = changed;
      setTickDirs((cur) => ({ ...cur, ...upd }));
    }
  }, [ticks]);

  const onAdd = useCallback(async (sym: string) => {
    await addWatchSymbol(sym);
    playSoftClick();
    setAddOpen(false);
  }, []);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, fullWidth && styles.wrapFull]}>
      <Text style={[styles.title, { textAlign: align }]}>{t.wlTitle}</Text>
      {saveError ? (
        <Text style={[styles.saveError, { textAlign: align }]}>{t[saveError]}</Text>
      ) : null}
      <View style={[styles.toolbar, rtl && styles.toolbarRtl]}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.toolBtn,
            (!ready || addable.length === 0) && styles.toolBtnDisabled,
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          disabled={!ready || addable.length === 0}
          accessibilityState={{ disabled: !ready || addable.length === 0 }}
          onPress={() => setAddOpen(true)}
          accessibilityLabel={t.wlAddA11y}
        >
          <Text style={styles.toolBtnText}>{t.wlAddBtn}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!ready}
          accessibilityState={{ disabled: !ready }}
          style={({ pressed }) => [
            styles.toolBtn,
            !ready && styles.toolBtnDisabled,
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          onPress={() =>
            Alert.alert(
              t.wlResetConfirmTitle,
              t.wlResetConfirmBody,
              [
                { text: t.cancel, style: 'cancel' },
                {
                  text: t.wlResetConfirmBtn,
                  style: 'destructive',
                  onPress: () => void resetWatchlistToDefault(),
                },
              ]
            )
          }
          accessibilityLabel={t.wlResetA11y}
        >
          <Text style={styles.toolBtnText}>{t.wlResetBtn}</Text>
        </Pressable>
      </View>
      {!compact && ready ? <SymbolSearchBar onPick={onPick} placeholder={t.wlSearchPlaceholder} /> : null}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {!ready ? (
          loadError ? (
            <View style={styles.emptyBox}>
              <Text style={[styles.saveError, { textAlign: align }]}>{t.wlLoadError}</Text>
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
                accessibilityLabel={t.wlRetryA11y}
                hitSlop={8}
              >
                <Text style={styles.toolBtnText}>{t.wlRetryBtn}</Text>
              </Pressable>
            </View>
          ) : <Text style={styles.empty}>{t.wlLoadingWord}</Text>
        ) : list.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.empty}>{t.wlEmpty}</Text>
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
              accessibilityLabel={t.wlAddA11y}
              hitSlop={8}
            >
              <Text style={styles.addEmptyText}>{t.wlAddEmptyBtn}</Text>
            </Pressable>
          </View>
        ) : (
          list.map((sym, index) => {
            const on = activeSymbol === sym;
            const live = ticks[sym];
            const price = live ?? bases[sym];
            const tickIsDemo = live != null && demoSet.has(sym);
            const isDemoPrice = price != null && (live == null || tickIsDemo);
            const isDxy = sym === 'DXY';
            // تغيّر اليوم فقط مع سعر حيّ + مرجع حقيقي — لا نسبة من سعر افتراضي.
            const chg = live != null && !tickIsDemo ? dailyChange(live, dailyRefs[sym]) : null;
            const tickDir = live != null && !tickIsDemo ? tickDirs[sym] : undefined;
            const pctText = chg ? formatPct(chg.pct) : null;
            return (
              <View
                key={sym}
                style={[styles.rowWrap, on && styles.rowWrapOn, isDxy && styles.rowDxy]}
              >
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.rowMain,
                    rtl && styles.rowMainRtl,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() => onPick(sym)}
                  accessibilityLabel={`${sym}${price != null ? ` ${formatPrice(price, sym)}` : ''}${pctText ? ` ${pctText}` : ''}${isDemoPrice ? t.wlDemoPriceA11ySuffix : ''}`}
                  accessibilityState={{ selected: on }}
                >
                  <View style={[styles.left, rtl && styles.leftRtl]}>
                    <Text
                      style={[styles.sym, on && styles.symOn, isDxy && styles.symDxy]}
                      {...(Platform.OS === 'web'
                        ? ({ translate: 'no', className: 'notranslate' } as object)
                        : {})}
                    >
                      {sym}
                    </Text>
                    {isDemoPrice ? <Text style={styles.demoTag}>{t.wlDemoTag}</Text> : null}
                  </View>
                  <View style={[styles.right, rtl && styles.rightRtl]}>
                    <Text
                      style={[
                        styles.price,
                        on && styles.priceOn,
                        isDemoPrice && styles.priceDemo,
                        tickDir === 'up' && styles.priceUp,
                        tickDir === 'down' && styles.priceDown,
                      ]}
                    >
                      {price != null ? formatPrice(price, sym) : '—'}
                    </Text>
                    {chg && pctText ? (
                      <Text
                        style={[
                          styles.chg,
                          chg.dir === 'up' && styles.chgUp,
                          chg.dir === 'down' && styles.chgDown,
                        ]}
                      >
                        {chg.dir === 'up' ? '▲ ' : chg.dir === 'down' ? '▼ ' : ''}
                        {pctText}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
                <View style={[styles.ops, rtl && styles.opsRtl]}>
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
                    accessibilityState={{ disabled: index === 0 }}
                    onPress={() => void moveWatchSymbol(sym, -1)}
                    accessibilityLabel={t.wlMoveUpA11y}
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
                    accessibilityState={{ disabled: index >= list.length - 1 }}
                    onPress={() => void moveWatchSymbol(sym, 1)}
                    accessibilityLabel={t.wlMoveDownA11y}
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
                    onPress={() =>
                      Alert.alert(t.wlRemoveConfirmTitle, sym, [
                        { text: t.cancel, style: 'cancel' },
                        {
                          text: t.wlRemoveConfirmBtn,
                          style: 'destructive',
                          onPress: () => void removeWatchSymbol(sym),
                        },
                      ])
                    }
                    accessibilityLabel={t.wlRemoveA11y}
                  >
                    <Text style={[styles.opText, styles.opRemove]}>{t.deleteWord}</Text>
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
            <Text style={[styles.modalTitle, { textAlign: align }]}>{t.wlCatalogTitle}</Text>
            <ScrollView style={styles.modalList}>
              {addable.length === 0 ? (
                <Text style={styles.empty}>{t.wlCatalogAllAdded}</Text>
              ) : (
                addable.map((w) => (
                  <Pressable
                    accessibilityRole="button"
                    key={w.symbol}
                    style={({ pressed }) => [
                      styles.modalRow,
                      rtl && styles.modalRowRtl,
                      pressed && {
                        opacity: buttons.pressedOpacity,
                        transform: [{ scale: buttons.pressedScale }],
                      },
                    ]}
                    onPress={() => void onAdd(w.symbol)}
                    accessibilityLabel={`${t.wlAddBtn} ${w.symbol} · ${w.group}`}
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
              hitSlop={8}
              accessibilityLabel={t.wlCatalogCloseA11y}
            >
              <Text style={styles.modalCloseText}>{t.closeWord}</Text>
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
  wrapCompact: { width: 148, paddingHorizontal: spacing.xs },
  wrapFull: { width: '100%', flex: 1, borderLeftWidth: 0 },
  title: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  saveError: {
    color: colors.bear,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  toolbar: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  toolbarRtl: { flexDirection: 'row-reverse' },
  toolBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolBtnDisabled: { opacity: 0.4 },
  toolBtnText: { color: colors.accent, fontSize: 10, fontWeight: '800' },
  list: { gap: 3, paddingBottom: spacing.lg },
  emptyBox: { paddingVertical: spacing.lg, alignItems: 'center', gap: spacing.sm },
  empty: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  addEmptyBtn: {
    paddingVertical: spacing.sm,
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
    borderColor: colors.heroBorder,
    backgroundColor: colors.heroBg,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  rowMainRtl: { flexDirection: 'row-reverse' },
  left: { flex: 1, alignItems: 'flex-start', minWidth: 0 },
  leftRtl: { alignItems: 'flex-end' },
  sym: { color: colors.textMuted, fontWeight: '800', fontSize: 11 },
  symOn: { color: colors.accent },
  symDxy: { color: colors.dxy },
  demoTag: { color: colors.warn, fontSize: 8, fontWeight: '700', marginTop: 1 },
  price: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginLeft: 6 },
  priceOn: { color: colors.text },
  priceDemo: { color: colors.textDim, fontWeight: '600' },
  priceUp: { color: colors.bull },
  priceDown: { color: colors.bear },
  right: { alignItems: 'flex-end' },
  rightRtl: { alignItems: 'flex-start' },
  chg: { color: colors.textDim, fontSize: 9, fontWeight: '800', marginTop: 1 },
  chgUp: { color: colors.bull },
  chgDown: { color: colors.bear },
  ops: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    gap: 2,
    justifyContent: 'flex-start',
  },
  opsRtl: { flexDirection: 'row-reverse' },
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
    marginBottom: spacing.sm,
  },
  modalList: { maxHeight: 320 },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  modalRowRtl: { flexDirection: 'row-reverse' },
  modalSym: { color: colors.text, fontWeight: '800', fontSize: 13 },
  modalGroup: { color: colors.textDim, fontSize: 11 },
  modalClose: {
    marginTop: spacing.sm,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  modalCloseText: { color: colors.accent, fontWeight: '800' },
});
