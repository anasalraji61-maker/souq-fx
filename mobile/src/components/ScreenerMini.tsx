import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { colors, radii, spacing, buttons, numeric } from '../theme';
import { api } from '../api';
import { useI18n } from '../i18n/I18nContext';
import { formatPct, pctDirection } from '../chart/dailyChange';
import { formatLocalStamp } from '../localStamp';

/** فريم الفحص السريع — موضعٌ واحد بدل تكراره بالنداء وبنصّ «لا تطابق». */
const TF = '15m';
/** أقصى ما يُعرض من نتائج بهذه اللوحة المصغّرة (شريط أفقي داخل لوحٍ جانبي/رصيف). */
const MAX_HITS = 5;
/** نتيجة من شموع أقدم من شمعتين بفريم الفحص ⇒ يُطبع وقتها (backend-r17): يوم السبت تقاطع/RSI من إغلاق
 * الجمعة كان يُقرأ «الآن». */
const STALE_SEC = 2 * 15 * 60;

export function ScreenerMini() {
  /**
   * كانت هذه اللوحة **مثبَّتة على العربية بالتخطيط**: `rtl` لم تكن تُقرأ أصلاً من `useI18n`،
   * فـ`row-reverse` على رقاقات الفلاتر وعلى صفّ النتائج، و`textAlign: 'right'` على العنوان
   * وسطر الخطأ — كلها بلا شرط. فالمتداول الإنجليزي يرى الرقاقات مقلوبة، **وأفضل نتيجة بالترتيب
   * تظهر في أقصى اليمين** أي الترتيب معكوس لمن يقرأ من اليسار، والعنوان ملتصق بالحافة المقابلة.
   * أمريكا وأوروبا سوقان مستهدفان صراحةً بـROADMAP، والماسح تبويب بشاشة الأدوات (ثانية بنطاق
   * الـMVP). سلوك العربية يبقى كما هو بالضبط — الشرط يضيف حالة LTR فقط.
   */
  const { t, rtl, lang } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  /** النص المرئي مختصر (رموز/اختصارات) بلا معنى واضح لقارئ الشاشة،
   * فيُستخدَم الوصف الكامل `a11y` بدلاً منه فقط لـaccessibilityLabel. */
  const quick = useMemo(
    () => [
      { id: 'ma_cross_up', label: 'MA ↑', a11y: t.smnA11yMaCross },
      { id: 'rsi_oversold', label: 'RSI↓', a11y: t.smnA11yRsiOversold },
      { id: 'bullish', label: t.smnFilterMomentum, a11y: t.smnA11yBullish },
    ],
    [t]
  );
  const [hits, setHits] = useState<
    {
      symbol: string;
      rsi: number;
      change_pct: number;
      filters_matched: string[];
      data_kind?: string | null;
      price_as_of?: number | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  /** وضوح الحالة: يميّز "لا نتائج مطابقة للفلتر" عن "فشل الاتصال بالفحص" بدل صمت كامل. */
  const [error, setError] = useState(false);
  /** بعد فحص ناجح بلا نتائج: «لا تطابق» أو «لم يُقرأ أي رمز» (حدّ المزوّد) — كان لا يظهر شيء إطلاقاً. */
  const [emptyNote, setEmptyNote] = useState<string | null>(null);
  /**
   * **فحصٌ ناقص ومعه نتائج** — كان يُعرض كأنه كامل. الخادم يُرجع `failed` للرموز التي تعذّرت قراءة
   * شموعها (حدّ طلبات المزوّد غالباً)، واللوحة كانت تقرأها **بحالة واحدة فقط**: أن يفشل الجميع
   * (`scanned === 0`). أمّا أن يُفحص نصف الرموز فتظهر نتيجتان — وهي الحالة الشائعة عند الحدّ — فكان
   * الصمت التامّ: يقرأ المتداول غياب الذهب على أنه «لا إشارة على الذهب» بينما الذهب **لم يُفحص**.
   * نفس نصّ الماسح الكامل بشاشة الأدوات (`screenerScanPartial`) وبنفس بنائه حرفاً بحرف.
   */
  const [partialNote, setPartialNote] = useState<string | null>(null);
  /** عدد النتائج **قبل** القصّ إلى `MAX_HITS` — «عرض أقوى 5 من 12» بدل صمتٍ يوهم أنها كل ما وُجد. */
  const [totalHits, setTotalHits] = useState(0);
  /**
   * **أيّ فلتر أنتج ما هو معروض.** الرقاقات الثلاث كانت أزراراً بلا حالة: يضغط المتداول «MA ↑»
   * فتظهر خمسة رموز، ثم يضغط «RSI↓» فتظهر خمسة رموز — ولا شيء بالشاشة يقول أيّ قائمةٍ هذه. وحين
   * تتقاطع نتيجتا فلترين (وهو الشائع: زوج بتقاطع صاعد كثيراً ما يكون زخمُه صاعداً) تصير القائمتان
   * متشابهتين فلا يُميَّز بينهما أصلاً. الرقاقة المُنتِجة تبقى مُضاءة الآن، وحالتها تصل قارئ الشاشة
   * بـ`selected` كبقية رقاقات التطبيق.
   */
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  /**
   * اللوحة تُركَّب وتُفكَّك بتبديل تبويب اللوح الجانبي/الرصيف، والفحص طلبٌ بطيء (يفحص عدّة رموز
   * بالخادم) — فنتيجته كانت تكتب الحالة بعد إلغاء التركيب. حارس `mounted` هو النمط المؤسَّس
   * بالتطبيق (ChartFrame/AlertsPanel/PositionSizePanel).
   */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async (filter: string) => {
    setLoading(true);
    setError(false);
    setEmptyNote(null);
    setPartialNote(null);
    /**
     * **نتائج الفلتر السابق تُمسح فوراً.** الرقاقة المضيئة تنتقل للفلتر المضغوط في اللحظة نفسها
     * (`setActiveFilter` أدناه)، بينما الصفوف تحتها كانت تبقى صفوف الفحص السابق طوال الطلب —
     * أي «RSI↓» مضيئة فوق نتائج «MA ↑». وإضاءة الرقاقة أُضيفت أصلاً ليُعرف **أيّ فلتر أنتج ما هو
     * معروض**، فكانت تكذب في الحالة الوحيدة التي تُسأل فيها.
     */
    setHits([]);
    setTotalHits(0);
    setActiveFilter(filter);
    try {
      const res = await api.screenerRun({ timeframe: TF, filters: [filter] });
      if (!mountedRef.current) return;
      const all = res.results;
      const failed = res.failed ?? [];
      // tools115a/backend-r69: فلتر واحد ⇒ رمز بـ`insufficient_data` هو في `failed` لقِصَر شموعه لا لحدّ المزوّد —
      // «حدّ الطلبات غالباً» كان سبباً خاطئاً وإعادة الفحص لا تغيّر شيئاً. يُسمّى بسطر `screenerInsufficientData`.
      const shortSet = new Set(
        Object.entries(res.insufficient_data ?? {})
          .filter(([, f]) => Array.isArray(f) && f.length > 0)
          .map(([s]) => s.toUpperCase())
      );
      const rateFailed = failed.filter((s) => !shortSet.has(s.toUpperCase()));
      const shortSyms = failed.filter((s) => shortSet.has(s.toUpperCase()));
      const sep = rtl ? '، ' : ', ';
      setHits(all.slice(0, MAX_HITS));
      setTotalHits(all.length);
      if (res.provider_configured === false) {
        setEmptyNote(t.screenerNeedApiKey);
      } else if (res.scanned === 0 && rateFailed.length > 0 && shortSyms.length === 0) {
        setEmptyNote(t.screenerScanNone);
      } else {
        // ناقصٌ ومعه نتائج: تحذيرٌ **بجانب** النتائج لا بدلاً منها.
        const notes: string[] = [];
        if (rateFailed.length > 0) {
          notes.push(
            t.screenerScanPartial
              .replace('{k}', String(res.scanned ?? 0))
              .replace('{total}', String(res.total ?? failed.length))
              .replace('{list}', rateFailed.join(sep))
          );
        }
        if (shortSyms.length > 0) {
          notes.push(t.screenerInsufficientData.replace('{tf}', TF).replace('{list}', shortSyms.join(sep)));
        }
        if (notes.length) setPartialNote(notes.join('\n'));
        // لا رمز فُحص وكلّها قصيرة التاريخ ⇒ سطر الشموع يقول كل شيء؛ «لا تطابق من 0» فوقه ضجيج.
        if (!all.length && !(res.scanned === 0 && shortSyms.length > 0)) {
          setEmptyNote(
            res.scanned != null
              ? t.screenerNoMatchOf.replace('{k}', String(res.scanned)).replace('{tf}', TF)
              : t.screenerNoResults
          );
        }
      }
    } catch {
      if (!mountedRef.current) return;
      setHits([]);
      setTotalHits(0);
      setError(true);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [t, rtl]);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { textAlign: align }]}>{t.smnTitle}</Text>
      <View style={[styles.row, rtl && styles.rowRtl]}>
        {quick.map((q) => {
          const on = activeFilter === q.id;
          return (
            <Pressable
              accessibilityRole="button"
              key={q.id}
              style={({ pressed }) => [
                styles.chip,
                on && styles.chipOn,
                loading && styles.chipDisabled,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => run(q.id)}
              disabled={loading}
              accessibilityState={{ disabled: loading, selected: on }}
              accessibilityLabel={q.a11y}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{q.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {loading ? <ActivityIndicator color={colors.accent} size="small" /> : null}
      {!loading && error ? (
        <Text style={[styles.errorNote, { textAlign: align }]}>{t.screenerFailed}</Text>
      ) : null}
      {!loading && !error && emptyNote ? (
        <Text style={[styles.errorNote, { textAlign: align }]}>{emptyNote}</Text>
      ) : null}
      {!loading && !error && partialNote ? (
        <Text style={[styles.errorNote, { textAlign: align }]}>{partialNote}</Text>
      ) : null}
      {!loading && !error && totalHits > MAX_HITS ? (
        <Text style={[styles.moreNote, { textAlign: align }]}>
          {t.screenerShowingOf.replace('{n}', String(MAX_HITS)).replace('{total}', String(totalHits))}
        </Text>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.hits, rtl && styles.hitsRtl]}>
          {hits.map((h) => {
            /**
             * **نسبة التغيّر كانت تُطبع خاماً، وصفرُها أخضر.** الشرط `>= 0` يُدخل الصفر بجهة
             * الصعود: فزوجٌ لم يتحرّك (أو تحرّك حركةً تُقرَّب إلى صفر) يقف بالقائمة **«+0%»
             * بالأخضر** كأنه صاعد — والماسح يرتّب نتائجه بمقدار الحركة تنازلياً، فأصغرها حركةً هي
             * بالضبط ما يقع بذيل القائمة حيث يُقرأ هذا. **وسالبُ الصفر أسوأ**: الخادم يقرّب
             * بـ`round(chg, 2)` فيُخرج `-0.0` لحركةٍ هابطة دقيقة، و`-0 >= 0` صحيحٌ بجافاسكربت —
             * أي أن **الهبوط** كان يُكتب «+0%» بالأخضر.
             *
             * والتنسيق كان بلا منازل ثابتة (`{h.change_pct}%` يطبع «0.5%» لا «0.50%»)، فيخالف
             * `formatPct` المعتمد بأربعة مخارج تُقرأ على الشاشة: علامة الناقص الطباعية «−»،
             * ومنزلتان دائماً، وصفرٌ بلا إشارة، وشَرطةٌ لقيمة غير منتهية بدل «NaN%». الآن الدالّة
             * نفسها التي تكتب بها قائمةُ المتابعة وشريطُ الشارت هذا الرقم بالضبط.
             *
             * ولا لون إلا بحركة حقيقية: ما دون العتبة يبقى مكتوماً، فلا وميضَ أخضر على ضجيج كسور.
             */
            const pct =
              typeof h.change_pct === 'number' && Number.isFinite(h.change_pct) ? h.change_pct : null;
            /**
             * الاتجاه من **الرقم المطبوع** لا من الخام: `pctDirection` تقرّب كـ`formatPct` حرفاً بحرف
             * (`round2` نفسها)، فاللون والكلمة متطابقان بالبناء. كان تقريبٌ محلي بـ`Math.round` يعطي
             * ‎−0.005 → 0 (رمادي) بينما `formatPct` تقرّب بعيداً عن الصفر فتطبع «−0.01%» — tools75b.
             */
            const pctDir = pctDirection(pct);
            const asOf =
              typeof h.price_as_of === 'number' &&
              Number.isFinite(h.price_as_of) &&
              Date.now() / 1000 - h.price_as_of > STALE_SEC
                ? t.screenerPriceAsOf.replace('{time}', formatLocalStamp(h.price_as_of, lang))
                : null;
            return (
              <View key={h.symbol} style={styles.hit}>
                <Text style={styles.sym}>
                  {h.symbol}
                  {/* backend-r10 (ج): عند حدّ المزوّد قد تكون السلسلة مخزَّنة حتى 15د — RSI/التقاطع ليسا «الآن». */}
                  {/* backend-r17: شموع أقدم من شمعتين (عطلة الأسبوع) ⇒ وقتها بدل وسم الكاش العام. */}
                  {asOf ? (
                    <Text style={styles.cacheTag}> · {asOf}</Text>
                  ) : h.data_kind === 'cache' ? (
                    <Text style={styles.cacheTag}> · {t.dsKindCache}</Text>
                  ) : null}
                </Text>
                <Text style={styles.meta}>
                  {/* منزلة واحدة دائماً (الخادم يقرّب لمنزلة): «RSI 30» بجانب «RSI 29.5» كان يغيّر عرض البطاقة. */}
                  RSI {typeof h.rsi === 'number' && Number.isFinite(h.rsi) ? h.rsi.toFixed(1) : '—'} ·{' '}
                  <Text
                    style={[
                      styles.metaPct,
                      pctDir === 'up' && styles.metaPctUp,
                      pctDir === 'down' && styles.metaPctDown,
                    ]}
                  >
                    {pct != null ? formatPct(pct) : '—'}
                  </Text>{' '}
                  {t.screenerChangeSpan}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
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
  title: { color: colors.textMuted, fontWeight: '500', fontSize: 12 },
  errorNote: { color: colors.warn, fontSize: 11 },
  moreNote: { ...numeric, color: colors.textDim, fontSize: 11 },
  row: { flexDirection: 'row', gap: 4 },
  rowRtl: { flexDirection: 'row-reverse' },
  hits: { flexDirection: 'row', gap: spacing.sm },
  hitsRtl: { flexDirection: 'row-reverse' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // DESIGN-PRO §1/§4/§5.5: الرقاقات بالسكون `textMuted` (كانت كلها بلون التأكيد ⇒ حتى 5 عناصر تأكيد بمنطقة واحدة)؛
  // المختارة وحدها نصّ بالتأكيد + تعبئة محايدة (`selectedFill`) فلا يُعبَّر عن الاختيار باللون وحده؛ حدٌّ واحد بلا خلفية.
  chipOn: { backgroundColor: colors.selectedFill },
  chipText: { color: colors.textMuted, fontWeight: '500', fontSize: 11 },
  chipTextOn: { color: colors.accent, fontWeight: '500' },
  chipDisabled: { opacity: 0.4 },
  hit: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  sym: { color: colors.text, fontWeight: '500', fontSize: 12 },
  meta: { ...numeric, color: colors.textDim, fontSize: 11 },
  cacheTag: { color: colors.warn, fontWeight: '500', fontSize: 11 },
  /** لون النسبة يأتي من الاتجاه وحده — بلا اتجاه تبقى بلون `meta` المكتوم. */
  metaPct: { ...numeric, fontWeight: '500' },
  metaPctUp: { color: colors.bull },
  metaPctDown: { color: colors.bear },
});
