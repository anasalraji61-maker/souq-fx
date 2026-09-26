import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import { colors, radii, spacing, buttons, numeric, selectedMarkerWidth } from '../theme';
import { api, type PriceAlert } from '../api';
import { formatPrice } from '../chart/math';
import { confirmDestructive } from '../chart/confirmDestructive';
import { pipsBetween } from '../positionSize';
import { chartPipSpec } from '../chart/pipSpec';
import { pipUnit } from '../chart/measureReadout';
import { formatPips } from '../tradePlan';
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
import { PriceFlash } from './PriceFlash';
import { dailyChange, formatPct, tickDirection, type Direction } from '../chart/dailyChange';

/** مدّة بقاء لون آخر تيك. عشرون ثانية: أطول كثيراً من تردّد تيكات زوجٍ نشط (فلا وميض بالسوق
 * المفتوح)، وأقصر كثيراً من أن يُقرأ لونٌ عمره ساعة على أنه حركةٌ الآن. */
const TICK_DIR_MS = 20_000;

/**
 * إيقاع إعادة قراءة التنبيهات المُسلَّحة. `/api/alerts` قراءةُ قاعدة بيانات محلية بالخادم (لا نداء
 * عند مزوّد الأسعار ولا حدّ يُستهلك)، فالدقيقة إيقاعٌ آمن — وهو إيقاع فحص لوح التنبيهات نفسه، فتنبيهٌ
 * أُطلق يختفي من المتابعة خلال دقيقة بدل أن يبقى معلّقاً «مُسلَّحاً» بعد أن مضى.
 */
const ALERTS_REFRESH_MS = 60_000;

type Props = {
  activeSymbol: string;
  ticks: Record<string, number>;
  bases?: Record<string, number>;
  /** رموز تيكها الحالي من بثّ تجريبي (fallback عشوائي) — تُعامَل كسعر افتراضي: بلا تلوين اتجاه ولا نسبة. */
  demoTicks?: readonly string[];
  onPick: (symbol: string) => void;
  compact?: boolean;
  fullWidth?: boolean;
  /**
   * الشاشة الحاضنة معروضة فعلاً. `false` يوقف **دورة قراءة التنبيهات المُسلَّحة** وحدها ولا يمسّ
   * الأسعار (تصل بالتيكات، بلا مؤقّت هنا) ولا شيئاً معروضاً.
   *
   * شاشة الشارت **تبقى مركَّبة** بعد الانتقال لتبويب آخر، فقائمة المتابعة كانت تقرأ `/api/alerts`
   * كل دقيقة بقيّة الجلسة لصفوفٍ لا يراها أحد. الافتراض `true` فكل موضع لا يمرّرها يبقى كما كان.
   */
  active?: boolean;
};

/** بلا `bases` لا سعر مرجعياً — الصفّ يعرض «—» بدل رقم مختلَق (قرار أنس ٢). */
const NO_BASES: Record<string, number> = {};

export function WatchlistPanel({
  activeSymbol,
  ticks,
  bases = NO_BASES,
  demoTicks,
  onPick,
  compact = false,
  fullWidth = false,
  active = true,
}: Props) {
  const { t, rtl, lang } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [symbols, setSymbols] = useState<string[] | null>(null);
  const [saveError, setSaveError] = useState<WatchlistSaveErrorCode | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  /** DESIGN-PRO §5.2: ترتيب/حذف الصفّ مخفيّان وقت السكون — يظهران بالمرور (ويب) أو بالضغط
   * الطويل (لمس)؛ ولقارئ الشاشة إجراءات الصفّ (`accessibilityActions`) بلا حاجة لإظهارهما. */
  const [hoverSym, setHoverSym] = useState<string | null>(null);
  const [revealSym, setRevealSym] = useState<string | null>(null);
  const askRemove = (sym: string) =>
    confirmDestructive({
      title: t.wlRemoveConfirmTitle,
      body: sym,
      cancelText: t.cancel,
      confirmText: t.wlRemoveConfirmBtn,
      onConfirm: () => {
        setRevealSym(null);
        void removeWatchSymbol(sym);
      },
    });
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

  /**
   * **أين تنبيهاتي؟** المتابعة تعرض السعر والتغيّر والاتجاه، والتنبيهات تعيش بشاشة أخرى —
   * فالمتداول يضع مستوى على الذهب ثم يمرّ على قائمته عشر مرّات بلا ما يذكّره أن هناك مستوىً
   * ينتظر، ولا كم يبعد عنه. وهذه القائمة بالذات هي الشاشة التي يفتحها ليسأل «أين السوق الآن».
   *
   * التنبيهات المُسلَّحة وحدها (المُطلَق مستوىً مضى)، مجمّعةً بالرمز. الطلب واحد لا طلبٌ لكل رمز،
   * وهو قراءة قاعدة بيانات لا نداءُ مزوّد. **والمسافة تُحسب من التيك الحيّ** الواصل للّوحة أصلاً:
   * بلا أي طلب إضافي، وتتحرّك مع السوق بدل أن تكون لقطةً تتجمّد.
   */
  const [armedBySymbol, setArmedBySymbol] = useState<Record<string, number[]>>({});
  /** قُرئت القائمة مرّةً على الأقل — كي لا تُحرَم لوحةٌ رُكِّبت مخفيّةً من القراءة الأولى للأبد. */
  const alertsLoadedRef = useRef(false);
  useEffect(() => {
    let alive = true;
    const load = () => {
      api
        .alerts()
        .then((res) => {
          if (!alive) return;
          const next: Record<string, number[]> = {};
          for (const a of res.alerts as PriceAlert[]) {
            if (a.triggered || !a.active) continue;
            if (!Number.isFinite(a.price) || a.price <= 0) continue;
            const sym = (a.symbol || '').trim().toUpperCase();
            if (!sym) continue;
            const bucket = next[sym];
            if (bucket) bucket.push(a.price);
            else next[sym] = [a.price];
          }
          setArmedBySymbol(next);
        })
        .catch(() => {
          /* التنبيهات إضافةٌ على المتابعة — فشل قراءتها لا يمسّ الأسعار ولا يُفرَّغ ما هو معروض */
        });
    };
    /**
     * `active` يوقف **الدورة** لا القراءة الأولى: لوحةٌ رُكِّبت وهي خلف الشاشة تُقرأ مرّةً فتكون
     * شارة «مُسلَّح» جاهزةً لحظة العودة لا بعد دقيقة منها. وبالعودة تُقرأ القائمة **فوراً**:
     * تنبيهٌ أُطلق أثناء الغياب يختفي من صفّه عند أول نظرة، لا بعد دقيقة من التحديق بحالةٍ مضت.
     */
    if (active || !alertsLoadedRef.current) {
      alertsLoadedRef.current = true;
      load();
    }
    if (!active) {
      return () => {
        alive = false;
      };
    }
    const id = setInterval(load, ALERTS_REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [active]);

  const ready = symbols != null;
  const list = symbols ?? [];
  const addable = useMemo(() => catalogEntriesNotIn(list), [list]);
  // مرجع "إغلاق الأمس" لنسبة تغيّر اليوم (مخزن مشترك، 10 دقائق، يتجاهل البيانات التجريبية).
  const dailyRefs = useDailyRefs(list);
  const demoSet = useMemo(() => new Set(demoTicks ?? []), [demoTicks]);
  /**
   * اتجاه آخر تيك لكل رمز (يلوّن السعر أخضر/أحمر كما يعتاد المتداول) — يُحدَّث فقط عند تغيّر السعر
   * فعلاً، **وينتهي** بعد `TICK_DIR_MS` من آخر حركة.
   *
   * لماذا ينتهي: اللون كان يُخزَّن بلا أي انتهاء، ومعناه «تحرّك للتوّ» — فزوجٌ ساكنٌ منذ ساعة، أو
   * سوقٌ أُغلق ليلة الجمعة، يبقى سعره أخضر إلى ما لا نهاية. وبجانبه مباشرةً سهمُ تغيّر اليوم بلونه
   * هو، فيقرأ المتداول صفّاً واحداً بلونين متناقضين (سعر أخضر · ▼ أحمر) بلا ما يدلّ على أنهما
   * يقيسان مدّتين مختلفتين. وبسوق نشط لا يتغيّر شيء عمليّاً: تيكات EURUSD تصل عبر WebSocket أكثر
   * كثيراً من مرّة كل عشرين ثانية، فاللون يتجدّد قبل أن ينتهي — الانتهاء لا يظهر إلا حيث يكون
   * صادقاً، أي حين تتوقّف الحركة فعلاً.
   */
  const prevTicksRef = useRef<Record<string, number>>({});
  const [tickDirs, setTickDirs] = useState<Record<string, { dir: Direction; at: number }>>({});
  useEffect(() => {
    const prev = prevTicksRef.current;
    let changed: Record<string, { dir: Direction; at: number }> | null = null;
    const at = Date.now();
    for (const [sym, price] of Object.entries(ticks)) {
      const before = prev[sym];
      if (before != null && before !== price) {
        const d = tickDirection(before, price);
        if (d !== 'flat') {
          changed = changed ?? {};
          changed[sym] = { dir: d, at };
        }
      }
      prev[sym] = price;
    }
    if (changed && mountedRef.current) {
      const upd = changed;
      setTickDirs((cur) => ({ ...cur, ...upd }));
    }
  }, [ticks]);

  /**
   * مؤقّت **واحد** للوحة كلها يُضبط على أقرب انتهاء، لا مؤقّت لكل رمز ولا استطلاع كل ثانية. حين لا
   * يُسقط شيئاً يُعيد المرجع نفسه فيتوقّف React عن إعادة التصيير — فلا حلقة.
   */
  useEffect(() => {
    const entries = Object.entries(tickDirs);
    if (entries.length === 0) return;
    const now = Date.now();
    const nextIn = Math.min(...entries.map(([, v]) => v.at + TICK_DIR_MS - now));
    const id = setTimeout(
      () => {
        if (!mountedRef.current) return;
        setTickDirs((cur) => {
          const t = Date.now();
          const out: typeof cur = {};
          let dropped = false;
          for (const [sym, v] of Object.entries(cur)) {
            if (t - v.at < TICK_DIR_MS) out[sym] = v;
            else dropped = true;
          }
          return dropped ? out : cur;
        });
      },
      Math.max(nextIn, 50)
    );
    return () => clearTimeout(id);
  }, [tickDirs]);

  /**
   * رمزٌ حُذف من المتابعة يُنسى: كان سعره السابق واتجاهه يبقيان، فإعادة إضافته لاحقاً تلوّن سعره
   * بمقارنةٍ مع سعرٍ من وقتٍ مضى — ويكبر الكائنان بلا حدّ بجلسة طويلة.
   */
  useEffect(() => {
    if (symbols == null) return;
    const keep = new Set(symbols);
    for (const sym of Object.keys(prevTicksRef.current)) {
      if (!keep.has(sym)) delete prevTicksRef.current[sym];
    }
    setTickDirs((cur) => {
      const out: typeof cur = {};
      let dropped = false;
      for (const [sym, v] of Object.entries(cur)) {
        if (keep.has(sym)) out[sym] = v;
        else dropped = true;
      }
      return dropped ? out : cur;
    });
  }, [symbols]);

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
            confirmDestructive({
              title: t.wlResetConfirmTitle,
              body: t.wlResetConfirmBody,
              cancelText: t.cancel,
              confirmText: t.wlResetConfirmBtn,
              onConfirm: () => void resetWatchlistToDefault(),
            })
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
            const tickDir = live != null && !tickIsDemo ? tickDirs[sym]?.dir : undefined;
            const pctText = chg ? formatPct(chg.pct) : null;
            /**
             * الجرس يقول «لك هنا مستوى ينتظر»، والرقم يقول كم يبعد عنه السوق الآن بنقاط **الأداة**
             * (`pipsBetween` بـpositionSize.ts، الموضع المبرهَن الوحيد لهذا الحساب — الين 0.01 لا
             * 0.0001). بأكثر من مستوى يُعرض عددها والأقرب منها، فصفٌّ واحد يقول كم تنبيهاً على هذه
             * الأداة وأيّها على وشك.
             *
             * المسافة **لا تظهر إلا حيث تكون صادقة**: سعر حيّ حقيقي (لا افتراضي ولا بثّ تجريبي)
             * وأداةٌ معلومة حجم الـpip (DXY والعملات الرقمية لا). بغير ذلك يبقى الجرس وحده — وجودُ
             * التنبيه معلومةٌ مؤكّدة حتى حين تكون المسافة مجهولة.
             */
            const armedLevels = armedBySymbol[sym];
            const armedSpec = armedLevels && armedLevels.length > 0 ? chartPipSpec(sym) : null;
            const armedNearest =
              armedSpec && live != null && !tickIsDemo
                ? armedLevels!.reduce<number | null>((best, lvl) => {
                    const d = pipsBetween(armedSpec, lvl, live);
                    return d == null ? best : best == null || d < best ? d : best;
                  }, null)
                : null;
            const armedDist = armedNearest != null ? formatPips(armedNearest) : null;
            const armedText =
              armedLevels && armedLevels.length > 0
                ? `⚑${armedLevels.length > 1 ? armedLevels.length : ''}${armedDist != null ? ` ${armedDist} ${pipUnit(lang)}` : ''}`
                : null;
            return (
              <Pressable
                key={sym}
                accessible={false}
                onHoverIn={() => setHoverSym(sym)}
                onHoverOut={() => setHoverSym((h) => (h === sym ? null : h))}
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
                  onPress={() => {
                    setRevealSym(null);
                    onPick(sym);
                  }}
                  onLongPress={() => setRevealSym((r) => (r === sym ? null : sym))}
                  accessibilityActions={[
                    ...(index > 0 ? [{ name: 'moveUp', label: t.wlMoveUpA11y }] : []),
                    ...(index < list.length - 1 ? [{ name: 'moveDown', label: t.wlMoveDownA11y }] : []),
                    { name: 'remove', label: t.wlRemoveA11y },
                  ]}
                  onAccessibilityAction={(e) => {
                    const a = e.nativeEvent.actionName;
                    if (a === 'moveUp') void moveWatchSymbol(sym, -1);
                    else if (a === 'moveDown') void moveWatchSymbol(sym, 1);
                    else if (a === 'remove') askRemove(sym);
                  }}
                  accessibilityLabel={`${sym}${price != null ? ` ${formatPrice(price, sym)}` : ''}${pctText ? ` ${pctText}` : ''}${isDemoPrice ? t.wlDemoPriceA11ySuffix : ''}${
                    armedText ? ` · ${t.alertsStatusArmed}${armedLevels!.length > 1 ? ` ${armedLevels!.length}` : ''}${armedDist != null ? ` ${armedDist} ${pipUnit(lang)}` : ''}` : ''
                  }`}
                  accessibilityState={{ selected: on }}
                >
                  {/* DESIGN-PRO §4: الاختيار تعبئة محايدة + علامة 2px على حافة الرمز — لا لون وحده. */}
                  {on ? (
                    <View style={[styles.selMarker, rtl ? styles.selMarkerRtl : null]} />
                  ) : null}
                  <View style={[styles.left, rtl && styles.leftRtl]}>
                    <Text
                      numberOfLines={1}
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
                    <PriceFlash
                      dir={tickDir}
                      flashKey={tickDir ? tickDirs[sym]?.at : undefined}
                      style={styles.priceCell}
                    >
                      <Text
                        numberOfLines={1}
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
                    </PriceFlash>
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
                    {armedText ? <Text style={styles.armedTag}>{armedText}</Text> : null}
                  </View>
                </Pressable>
                {hoverSym === sym || revealSym === sym ? (
                  <View style={[styles.ops, rtl ? styles.opsRtl : null]}>
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
                      hitSlop={spacing.xs}
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
                      hitSlop={spacing.xs}
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
                      hitSlop={spacing.xs}
                      onPress={() => askRemove(sym)}
                      accessibilityLabel={t.wlRemoveA11y}
                    >
                      <Text style={styles.opText}>✕</Text>
                    </Pressable>
                  </View>
                ) : null}
              </Pressable>
            );
          })
        )}
        {/* launch165a: «حذف» (والترتيب) مخفيّ وقت السكون (§5.2) ويظهر بالضغط المطوّل — على اللمس لا شيء يدلّ عليه. الويب يكشفه بالمرور. */}
        {Platform.OS !== 'web' && list.length > 0 ? (
          <Text style={[styles.longPressHint, { textAlign: align }]}>{t.rowDeleteLongPressHint}</Text>
        ) : null}
      </ScrollView>

      <Modal visible={addOpen} transparent animationType="none" onRequestClose={() => setAddOpen(false)}>
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
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  /** 160 لا 148: السعر 15px (DESIGN-PRO §2) يتّسع له العمود بدل تصغير الخطّ (§7). */
  wrapCompact: { width: 160, paddingHorizontal: spacing.xs },
  wrapFull: { width: '100%', flex: 1, borderLeftWidth: 0 },
  title: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  saveError: {
    color: colors.bear,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  toolbar: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  toolbarRtl: { flexDirection: 'row-reverse' },
  toolBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolBtnDisabled: { opacity: 0.4 },
  toolBtnText: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  list: { gap: 4, paddingBottom: spacing.lg },
  emptyBox: { paddingVertical: spacing.lg, alignItems: 'center', gap: spacing.sm },
  longPressHint: { color: colors.textMuted, fontSize: 11, lineHeight: 16, padding: spacing.sm },
  empty: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  addEmptyBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: 16,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addEmptyText: { color: colors.text, fontWeight: '500', fontSize: 12 },
  rowWrap: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.bgPanel,
    overflow: 'hidden',
  },
  rowWrapOn: { backgroundColor: colors.selectedFill },
  selMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: selectedMarkerWidth,
    backgroundColor: colors.accent,
  },
  selMarkerRtl: { left: undefined, right: 0 },
  rowDxy: {
    borderColor: colors.heroBorder,
    backgroundColor: colors.heroBg,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
  },
  rowMainRtl: { flexDirection: 'row-reverse' },
  left: { flex: 1, alignItems: 'flex-start', minWidth: 0 },
  leftRtl: { alignItems: 'flex-end' },
  sym: { color: colors.textMuted, fontWeight: '500', fontSize: 12 },
  symOn: { color: colors.text },
  symDxy: { color: colors.dxy },
  demoTag: { color: colors.warn, fontSize: 11, fontWeight: '500', marginTop: 0 },
  price: { ...numeric, color: colors.textMuted, fontSize: 15, fontWeight: '600', marginLeft: 4 },
  priceOn: { color: colors.text },
  priceDemo: { color: colors.textDim, fontWeight: '600' },
  /** خانة وميض §6 — تلتفّ على نصّ السعر وحده */
  priceCell: { borderRadius: radii.sm, overflow: 'hidden' },
  priceUp: { color: colors.bull },
  priceDown: { color: colors.bear },
  right: { alignItems: 'flex-end' },
  rightRtl: { alignItems: 'flex-start' },
  chg: { ...numeric, color: colors.textDim, fontSize: 11, fontWeight: '500', marginTop: 0 },
  /** الجرس محايد — لا أخضر/أحمر (المسافة كمّية لا ربح ولا خسارة) ولا تأكيد (شارة؛ DESIGN-PRO §1). */
  armedTag: { color: colors.textMuted, fontSize: 11, fontWeight: '500', marginTop: 0 },
  chgUp: { color: colors.bull },
  chgDown: { color: colors.bear },
  ops: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
    backgroundColor: colors.bgElevated,
  },
  opsRtl: { right: undefined, left: 0, flexDirection: 'row-reverse' },
  opBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
  },
  opDisabled: { opacity: 0.3 },
  opText: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
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
    fontWeight: '500',
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  modalList: { maxHeight: 320 },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  modalRowRtl: { flexDirection: 'row-reverse' },
  modalSym: { color: colors.text, fontWeight: '500', fontSize: 13 },
  modalGroup: { color: colors.textDim, fontSize: 11 },
  modalClose: {
    marginTop: spacing.sm,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  modalCloseText: { color: colors.textMuted, fontWeight: '500' },
});
