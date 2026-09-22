import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedHeadTail, frameEmbedTitleBlock, frameEmbedTitle, frameEmbedSub, buttons } from '../theme';
import { api, type PriceAlert } from '../api';
import { ensureAlertNotifications, pushPriceAlert, registerPushToken } from '../notifications';
import { playSoftClick } from '../audio/playSoftClick';
import { hasCelebratedFirstAlert, markFirstAlertCelebrated } from '../achievements';
import { useI18n } from '../i18n/I18nContext';
import { parseDecimal } from '../parseDecimal';
import { isRealQuote } from '../chart/dataSource';

type Props = {
  defaultSymbol?: string;
  embedded?: boolean;
  /** يزيده الأب بعد إنشاء تنبيه من خارج اللوحة (من الشارت) لتحديث القائمة فوراً بدل انتظار الاستطلاع. */
  refreshKey?: number;
};

export function AlertsPanel({ defaultSymbol = 'EURUSD', embedded, refreshKey }: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  /** وضوح الحالة: يميّز "لا تنبيهات بعد" الفعلية عن فشل تحميل القائمة */
  const [listError, setListError] = useState(false);
  /** وضوح الحالة: يعلم المستخدم إذا فشلت إضافة تنبيه بدل صمت كامل */
  const [formError, setFormError] = useState<string | null>(null);
  /** احتفال بصري خفيف لمرة واحدة فقط عند أول تنبيه سعر (matrix-tactile-feel.mdc) */
  const [showFirstBadge, setShowFirstBadge] = useState(false);
  const firstBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // حارس "alive" منفصل عن مؤقت الشارة أعلاه — يمنع تحديث الحالة بعد إلغاء تركيب اللوحة، يشمل
  // نتيجة الاستطلاع الدوري (setInterval) التي قد تصل بعد إلغاء التركيب رغم إيقاف المؤقت نفسه —
  // نفس مبدأ ChartFrame/SymbolSnapshot المؤسَّس بالكود.
  const mountedRef = useRef(true);
  /** السعر الحالي للرمز المكتوب — يُعرض بجانب النموذج ويُستخدم لاختيار الاتجاه تلقائياً (فوق/تحت)
   * وللتحذير من تنبيه سيُطلق فوراً. null = غير معروف (لا اتصال/مزوّد غير مهيأ) فيعمل النموذج كما كان. */
  const [current, setCurrent] = useState<number | null>(null);
  const quoteGen = useRef(0);
  /** تأكيد صريح بعد كل حفظ ناجح ("مُفعَّل: EURUSD ≥ 1.0850") — كان التأكيد الوحيد شارة أول تنبيه. */
  const [armed, setArmed] = useState<string | null>(null);
  const armedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** تعديل تنبيه قائم: الضغط على سطره يحمّل قيمه بالنموذج؛ الحفظ = إنشاء الجديد ثم حذف القديم
   * (لا يوجد مسار تحديث بالباك-إند، وهذا الترتيب لا يُفقد التنبيه القديم إن فشل الإنشاء). */
  const [editingId, setEditingId] = useState<string | null>(null);
  /** نص السعر المكتوب + هل اختار المتداول الاتجاه بنفسه — ليُستنتج الاتجاه أيضاً حين يصل السعر الحالي
   * **بعد** كتابة الرقم (تأخير 600ms + الشبكة): كان يبقى «فوق» الافتراضي فيُطلق تنبيه «1.0800» فوراً. */
  const priceTextRef = useRef('');
  const condManualRef = useRef(false);

  useEffect(() => {
    return () => {
      if (firstBadgeTimerRef.current) clearTimeout(firstBadgeTimerRef.current);
      if (armedTimerRef.current) clearTimeout(armedTimerRef.current);
      mountedRef.current = false;
    };
  }, []);

  /** فتح اللوحة من شارت آخر (FocusChartModal/الشريط الجانبي) يغيّر defaultSymbol — نزامن الرمز
   * ما لم يكن المستخدم في منتصف تعديل تنبيه. */
  useEffect(() => {
    if (!editingId) setSymbol(defaultSymbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSymbol]);

  useEffect(() => {
    const sym = symbol.trim().toUpperCase();
    const gen = ++quoteGen.current;
    setCurrent(null);
    if (sym.length < 3) return;
    const id = setTimeout(() => {
      api
        .marketQuote(sym)
        .then((q) => {
          if (!mountedRef.current || gen !== quoteGen.current) return;
          // سعر بذري تجريبي (المزوّد متعذّر/رمز مجهول) ليس «السعر الحالي»: كان يحدّد اتجاه فوق/تحت ويحذّر
          // «سيُطلق فوراً» بناءً على رقم مختلَق — الباك-إند يفحص التنبيه بأسعار المزوّد الحقيقية فقط.
          const cur = isRealQuote(q) ? q.price : null;
          setCurrent(cur);
          const typed = parseDecimal(priceTextRef.current);
          if (cur != null && !condManualRef.current && typed != null && typed > 0 && typed !== cur) {
            setCondition(typed > cur ? 'above' : 'below');
          }
        })
        .catch(() => {
          /* السعر الحالي تحسين اختياري — فشله لا يمنع إضافة التنبيه */
        });
    }, 600);
    return () => clearTimeout(id);
  }, [symbol]);

  const fmtPrice = (v: number) => String(Number(v.toFixed(v >= 1000 ? 2 : v >= 20 ? 3 : 5)));
  const condMark = (c: 'above' | 'below') => (c === 'above' ? '≥' : '≤');

  /** الاتجاه يُستنتج من موقع السعر المدخل بالنسبة للسعر الحالي — المستخدم يكتب الرقم فقط،
   * ويبقى قادراً على قلب الاتجاه يدوياً بعدها (مع تحذير إن صار التنبيه سيُطلق فوراً). */
  const onPriceChange = (txt: string) => {
    setPrice(txt);
    priceTextRef.current = txt;
    condManualRef.current = false;
    setFormError(null);
    const p = parseDecimal(txt) ?? NaN;
    if (current != null && Number.isFinite(p) && p > 0 && p !== current) {
      setCondition(p > current ? 'above' : 'below');
    }
  };

  const parsedPrice = parseDecimal(price) ?? NaN;
  const firesNow =
    current != null &&
    Number.isFinite(parsedPrice) &&
    parsedPrice > 0 &&
    ((condition === 'above' && current >= parsedPrice) || (condition === 'below' && current <= parsedPrice));

  const showArmed = (msg: string) => {
    setArmed(msg);
    if (armedTimerRef.current) clearTimeout(armedTimerRef.current);
    armedTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setArmed(null);
    }, 4000);
  };

  const startEdit = (a: PriceAlert) => {
    setEditingId(a.id);
    setSymbol(a.symbol);
    setPrice(String(a.price));
    priceTextRef.current = String(a.price);
    setCondition(a.condition);
    condManualRef.current = true;
    setNote(a.note || '');
    setFormError(null);
    setArmed(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setPrice('');
    priceTextRef.current = '';
    condManualRef.current = false;
    setNote('');
    setFormError(null);
  };

  const refresh = useCallback(async () => {
    try {
      const res = await api.alerts();
      if (mountedRef.current) {
        setAlerts(res.alerts);
        setListError(false);
      }
    } catch {
      if (mountedRef.current) {
        setAlerts([]);
        setListError(true);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const check = useCallback(async () => {
    try {
      const res = await api.checkAlerts();
      if (mountedRef.current) setAlerts(res.alerts);
      if (res.triggered.length) {
        /** «EURUSD فوق 1.085 (1.0853)» بلغة الواجهة — كان يعرض above/below الإنجليزية الخام بكل اللغات. */
        const msg = res.triggered
          .map((trig) => {
            const word = trig.condition === 'above' ? t.aboveWord : t.belowWord;
            const cur = typeof trig.current === 'number' && Number.isFinite(trig.current) ? ` (${trig.current})` : '';
            return `${trig.symbol} ${word} ${trig.price}${cur}`;
          })
          .join(' · ');
        if (mountedRef.current) setFlash(msg);
        for (const trig of res.triggered) {
          await pushPriceAlert(
            t.alertsPushTitle,
            `${trig.symbol} ${trig.condition === 'above' ? t.aboveWord : t.belowWord} ${trig.price}`
          );
        }
      }
    } catch {
      /* ignore */
    }
  }, [t.alertsPushTitle, t.aboveWord, t.belowWord]);

  useEffect(() => {
    void ensureAlertNotifications().then(() => registerPushToken());
    refresh();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [refresh, check]);

  useEffect(() => {
    if (refreshKey) void refresh();
  }, [refreshKey, refresh]);

  const add = async () => {
    const p = parseDecimal(price) ?? NaN;
    const sym = symbol.trim().toUpperCase();
    if (!sym || !Number.isFinite(p) || p <= 0) {
      setFormError(t.alertsInvalidInput);
      return;
    }
    setBusy(true);
    setFormError(null);
    const replacing = editingId;
    const body = { symbol: sym, condition, price: p, note };
    try {
      /** تعديل ذرّي أولاً (PATCH — نفس المعرّف، يُعاد تفعيله، لا نافذة يوجد فيها تنبيهان). باك-إند
       * أقدم (405) أو تنبيه لم يعد موجوداً/لا نملكه (404) → الطريق القديم: إنشاء جديد ثم حذف القديم
       * (لا يُفقد القديم إن فشل الإنشاء). أي خطأ آخر (شبكة/500) يظهر كخطأ عادي دون إنشاء مكرر. */
      let fallbackDelete: string | null = null;
      if (replacing) {
        try {
          await api.updateAlert(replacing, body);
        } catch (e) {
          const status = (e as { status?: number }).status;
          if (status !== 404 && status !== 405) throw e;
          await api.createAlert(body);
          fallbackDelete = replacing;
        }
      } else {
        await api.createAlert(body);
      }
      playSoftClick();
      setPrice('');
      priceTextRef.current = '';
      condManualRef.current = false;
      setNote('');
      setEditingId(null);
      if (fallbackDelete) {
        try {
          await api.deleteAlert(fallbackDelete);
        } catch {
          setFormError(t.alertsEditOldRemains);
        }
      }
      showArmed(`${replacing ? t.alertsUpdatedPrefix : t.alertsArmedPrefix}: ${sym} ${condMark(condition)} ${p}`);
      await refresh();
      /** لحظة إنجاز/تشجيع محدَّدة (matrix-tactile-feel.mdc: "ضبط أول تنبيه") — تُحتفَل بها مرة
       * واحدة فقط عبر عمر التطبيق على الجهاز عبر `achievements.ts`، لا في كل مرة تُضاف تنبيهاً،
       * حتى لو حُذفت كل التنبيهات لاحقاً وأُضيف تنبيه جديد. */
      if (!(await hasCelebratedFirstAlert())) {
        await markFirstAlertCelebrated();
        setShowFirstBadge(true);
        if (firstBadgeTimerRef.current) clearTimeout(firstBadgeTimerRef.current);
        firstBadgeTimerRef.current = setTimeout(() => setShowFirstBadge(false), 2600);
      }
    } catch {
      setFormError(t.alertsAddError);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.deleteAlert(id);
      if (editingId === id) cancelEdit();
      await refresh();
    } catch {
      Alert.alert(t.alertsDeleteFailedTitle, t.alertsDeleteFailedBody);
    }
  };

  return (
    <View style={[styles.wrap, embedded && styles.wrapInFrame]}>
      {embedded ? (
        <View style={frameEmbedHead}>
          <View style={frameEmbedHeadTail} />
          <View style={frameEmbedTitleBlock}>
            <Text style={[styles.title, frameEmbedTitle, { textAlign: align }]}>{t.alertsTitle}</Text>
            <Text style={[styles.sub, frameEmbedSub, { textAlign: align }]}>{t.alertsSub}</Text>
          </View>
        </View>
      ) : (
        <>
          <Text style={[styles.title, { textAlign: align }]}>{t.alertsTitle}</Text>
          <Text style={[styles.sub, { textAlign: align }]}>{t.alertsSub}</Text>
        </>
      )}
      {flash ? <Text style={[styles.flash, { textAlign: align }]}>🔔 {flash}</Text> : null}

      <View style={styles.form}>
        <TextInput
          style={[styles.input, { textAlign: align }]}
          value={symbol}
          onChangeText={setSymbol}
          placeholder="EURUSD"
          placeholderTextColor={colors.textDim}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          underlineColorAndroid="transparent"
          clearButtonMode="while-editing"
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          accessibilityLabel={t.alertsSymbolA11y}
        />
        <TextInput
          style={[styles.input, { textAlign: align }]}
          value={price}
          onChangeText={onPriceChange}
          placeholder={t.priceWord}
          placeholderTextColor={colors.textDim}
          keyboardType="decimal-pad"
          maxLength={12}
          returnKeyType="done"
          underlineColorAndroid="transparent"
          clearButtonMode="while-editing"
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          accessibilityLabel={t.alertsPriceA11y}
        />
        {current != null ? (
          <View style={[styles.currentRow, rtl && styles.rowRtl]}>
            <Text style={[styles.currentText, { textAlign: align }]}>
              {t.alertsCurrentPrefix}: <Text style={styles.currentVal}>{fmtPrice(current)}</Text>
            </Text>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.useCurrent,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => onPriceChange(fmtPrice(current))}
              accessibilityLabel={`${t.alertsUseCurrentA11y}: ${fmtPrice(current)}`}
              hitSlop={6}
            >
              <Text style={styles.useCurrentText}>{t.alertsUseCurrent}</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={[styles.row, rtl && styles.rowRtl]}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cond,
              condition === 'above' && styles.condOn,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => {
              condManualRef.current = true;
              setCondition('above');
            }}
            accessibilityLabel={t.alertsAboveConditionA11y}
          >
            <Text style={[styles.condText, condition === 'above' && styles.condTextOn]}>{t.aboveWord}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cond,
              condition === 'below' && styles.condOn,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => {
              condManualRef.current = true;
              setCondition('below');
            }}
            accessibilityLabel={t.alertsBelowConditionA11y}
          >
            <Text style={[styles.condText, condition === 'below' && styles.condTextOn]}>{t.belowWord}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.addBtn,
              busy && styles.addBtnDisabled,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={add}
            disabled={busy}
            accessibilityState={{ disabled: busy }}
            accessibilityLabel={editingId ? t.alertsSaveEdit : t.alertsAddA11y}
          >
            <Text style={styles.addText}>{busy ? '...' : editingId ? t.alertsSaveEdit : t.addBtn}</Text>
          </Pressable>
        </View>
        <TextInput
          style={[styles.input, { textAlign: align }]}
          value={note}
          onChangeText={setNote}
          placeholder={t.alertsNotePlaceholder}
          placeholderTextColor={colors.textDim}
          returnKeyType="done"
          underlineColorAndroid="transparent"
          clearButtonMode="while-editing"
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          accessibilityLabel={t.alertsNoteA11y}
        />
      </View>

      {editingId ? (
        <View style={[styles.currentRow, rtl && styles.rowRtl]}>
          <Text style={[styles.editingText, { textAlign: align }]}>{t.alertsEditingHint}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={cancelEdit}
            accessibilityLabel={t.alertsCancelEdit}
            hitSlop={6}
            style={({ pressed }) => [
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
          >
            <Text style={styles.cancelEditText}>{t.alertsCancelEdit}</Text>
          </Pressable>
        </View>
      ) : null}
      {firesNow ? <Text style={[styles.firesNow, { textAlign: align }]}>{t.alertsFiresNowWarn}</Text> : null}
      {formError ? <Text style={[styles.formError, { textAlign: align }]}>{formError}</Text> : null}
      {armed ? (
        <Text style={[styles.armed, { textAlign: align }]} accessibilityLiveRegion="polite">
          ✓ {armed}
        </Text>
      ) : null}
      {showFirstBadge ? (
        <View style={styles.firstAlertBadge}>
          <Text style={styles.firstAlertBadgeText}>{t.alertsFirstBadge}</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.md }} />
      ) : (
        <ScrollView style={{ maxHeight: 160 }} keyboardShouldPersistTaps="handled">
          {alerts.length > 0 ? (
            <Text style={[styles.listHead, { textAlign: align }]}>
              {t.alertsActiveCount}: {alerts.filter((a) => a.active && !a.triggered).length} · {t.alertsTapToEdit}
            </Text>
          ) : null}
          {alerts.length === 0 ? (
            <Text style={[styles.empty, { textAlign: align }]}>
              {listError ? t.alertsLoadError : t.alertsEmpty}
            </Text>
          ) : (
            [...alerts]
              .sort((x, y) => Number(x.triggered) - Number(y.triggered))
              .map((a) => (
              <View
                key={a.id}
                style={[styles.item, rtl && styles.itemRtl, editingId === a.id && styles.itemEditing]}
              >
                <Pressable
                  style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: buttons.pressedOpacity }]}
                  onPress={() => startEdit(a)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.alertsEditA11yPrefix}: ${a.symbol} ${condMark(a.condition)} ${a.price}`}
                >
                  <Text style={[styles.itemSym, a.triggered && styles.itemSymDone, { textAlign: align }]}>
                    {a.symbol} {condMark(a.condition)} {a.price}
                  </Text>
                  <Text
                    style={[styles.itemStatus, a.triggered ? styles.itemStatusDone : styles.itemStatusLive, { textAlign: align }]}
                  >
                    {a.triggered ? t.alertsStatusTriggered : t.alertsStatusArmed}
                    {a.note ? ` · ${a.note}` : ''}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() =>
                    Alert.alert(
                      t.alertsDeleteConfirmTitle,
                      `${a.symbol} ${condMark(a.condition)} ${a.price}`,
                      [
                        { text: t.cancel, style: 'cancel' },
                        { text: t.deleteWord, style: 'destructive', onPress: () => remove(a.id) },
                      ]
                    )
                  }
                  accessibilityLabel={`${t.alertsDeleteA11yPrefix}: ${a.symbol} ${condMark(a.condition)} ${a.price}`}
                  hitSlop={8}
                >
                  <Text style={styles.del}>{t.deleteWord}</Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    overflow: 'hidden',
  },
  wrapInFrame: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingTop: frameEmbed.padTop,
    paddingLeft: frameEmbed.padLeft,
    paddingRight: frameEmbed.padRight,
    paddingBottom: frameEmbed.padBottom,
  },
  title: { color: colors.text, fontWeight: '800', fontSize: 14 },
  sub: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  flash: {
    color: colors.warn,
    fontSize: 11,
    marginTop: 6,
    fontWeight: '700',
  },
  formError: {
    color: colors.bear,
    fontSize: 10,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  firstAlertBadge: {
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(232,184,109,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,184,109,0.4)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
  },
  firstAlertBadgeText: { color: colors.warmAccent, fontSize: 11, fontWeight: '800' },
  form: { marginTop: spacing.sm, gap: 6 },
  input: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: spacing.sm,
    fontSize: 13,
  },
  row: { flexDirection: 'row', gap: 6 },
  rowRtl: { flexDirection: 'row-reverse' },
  cond: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  condOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  condText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  condTextOn: { color: colors.accent },
  addBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  addText: { color: colors.onAccent, fontWeight: '800', fontSize: 12 },
  addBtnDisabled: { opacity: 0.4 },
  empty: { color: colors.textDim, marginTop: spacing.sm, fontSize: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  itemRtl: { flexDirection: 'row-reverse' },
  itemSym: { color: colors.text, fontWeight: '700', fontSize: 13 },
  itemSymDone: { color: colors.textMuted },
  itemStatus: { fontSize: 11, marginTop: 1 },
  itemStatusLive: { color: colors.accent, fontWeight: '700' },
  itemStatusDone: { color: colors.textDim },
  itemEditing: { backgroundColor: colors.accentSoft, borderRadius: radii.sm },
  listHead: { color: colors.textDim, fontSize: 10, marginTop: spacing.sm, fontWeight: '700' },
  currentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  currentText: { color: colors.textDim, fontSize: 11, flex: 1 },
  currentVal: { color: colors.text, fontWeight: '800' },
  useCurrent: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  useCurrentText: { color: colors.accent, fontSize: 11, fontWeight: '800' },
  editingText: { color: colors.accent, fontSize: 11, fontWeight: '700', flex: 1, marginTop: spacing.xs },
  cancelEditText: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: spacing.xs },
  firesNow: { color: colors.warn, fontSize: 10, fontWeight: '700', marginTop: spacing.xs },
  armed: { color: colors.bull, fontSize: 11, fontWeight: '800', marginTop: spacing.xs },
  del: { color: colors.bear, fontWeight: '700', fontSize: 12 },
});
