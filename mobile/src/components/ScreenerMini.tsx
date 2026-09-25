import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { api } from '../api';
import { useI18n } from '../i18n/I18nContext';
import { formatPct } from '../chart/dailyChange';

/** فريم الفحص السريع — موضعٌ واحد بدل تكراره بالنداء وبنصّ «لا تطابق». */
const TF = '15m';
/** أقصى ما يُعرض من نتائج بهذه اللوحة المصغّرة (شريط أفقي داخل لوحٍ جانبي/رصيف). */
const MAX_HITS = 5;

export function ScreenerMini() {
  /**
   * كانت هذه اللوحة **مثبَّتة على العربية بالتخطيط**: `rtl` لم تكن تُقرأ أصلاً من `useI18n`،
   * فـ`row-reverse` على رقاقات الفلاتر وعلى صفّ النتائج، و`textAlign: 'right'` على العنوان
   * وسطر الخطأ — كلها بلا شرط. فالمتداول الإنجليزي يرى الرقاقات مقلوبة، **وأفضل نتيجة بالترتيب
   * تظهر في أقصى اليمين** أي الترتيب معكوس لمن يقرأ من اليسار، والعنوان ملتصق بالحافة المقابلة.
   * أمريكا وأوروبا سوقان مستهدفان صراحةً بـROADMAP، والماسح تبويب بشاشة الأدوات (ثانية بنطاق
   * الـMVP). سلوك العربية يبقى كما هو بالضبط — الشرط يضيف حالة LTR فقط.
   */
  const { t, rtl } = useI18n();
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
    { symbol: string; rsi: number; change_pct: number; filters_matched: string[]; data_kind?: string | null }[]
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
      setHits(all.slice(0, MAX_HITS));
      setTotalHits(all.length);
      if (res.provider_configured === false) {
        setEmptyNote(t.screenerNeedApiKey);
      } else if (res.scanned === 0 && failed.length > 0) {
        setEmptyNote(t.screenerScanNone);
      } else {
        // ناقصٌ ومعه نتائج: تحذيرٌ **بجانب** النتائج لا بدلاً منها.
        if (failed.length > 0) {
          setPartialNote(
            t.screenerScanPartial
              .replace('{k}', String(res.scanned ?? 0))
              .replace('{total}', String(res.total ?? failed.length))
              .replace('{list}', failed.join(rtl ? '، ' : ', '))
          );
        }
        if (!all.length) {
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
             * الاتجاه مشتقٌّ من **الرقم المطبوع** لا من الخام. `formatPct` تقرّب لمنزلتين ثم تكتب
             * «0.00%» بلا إشارة لكل ما يقرّب إلى صفر، فاشتقاق اللون من حاصل التقريب **نفسه** يجعل
             * اللون والكلمة متطابقين بالبناء لا بالمصادفة — وهي قاعدة هذا التطبيق (شارة الأخبار
             * عولجت بها). والعتبة الناتجة 0.005 بالضبط، أي **قاعدة «ثابت» بـ`dailyChange` نفسها**،
             * عدا القيمة الواحدة ‎−0.005‎ التي تطبعها `formatPct` «0.00%»: بغير هذا الاشتقاق كانت
             * ستُكتب صفراً **بالأحمر**.
             */
            const pctRounded = pct == null ? null : Math.round(pct * 100) / 100;
            const pctDir =
              pctRounded == null || pctRounded === 0 ? 'flat' : pctRounded > 0 ? 'up' : 'down';
            return (
              <View key={h.symbol} style={styles.hit}>
                <Text style={styles.sym}>
                  {h.symbol}
                  {/* backend-r10 (ج): عند حدّ المزوّد قد تكون السلسلة مخزَّنة حتى 15د — RSI/التقاطع ليسا «الآن». */}
                  {h.data_kind === 'cache' ? <Text style={styles.cacheTag}> · {t.dsKindCache}</Text> : null}
                </Text>
                <Text style={styles.meta}>
                  RSI {h.rsi} ·{' '}
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
  title: { color: colors.textMuted, fontWeight: '800', fontSize: 12 },
  errorNote: { color: colors.warn, fontSize: 11 },
  moreNote: { color: colors.textDim, fontSize: 10 },
  row: { flexDirection: 'row', gap: 6 },
  rowRtl: { flexDirection: 'row-reverse' },
  hits: { flexDirection: 'row', gap: spacing.sm },
  hitsRtl: { flexDirection: 'row-reverse' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // نفس رقاقة «مختارة» المؤسَّسة بالتطبيق (PositionSizePanel/CalendarPanel): حدٌّ ملوّن وخلفية
  // شفيفة، لا قلبٌ كامل للألوان — matrix-tactile-feel.mdc.
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.accent, fontWeight: '700', fontSize: 11 },
  chipTextOn: { color: colors.accent, fontWeight: '800' },
  chipDisabled: { opacity: 0.4 },
  hit: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  sym: { color: colors.text, fontWeight: '800', fontSize: 12 },
  meta: { color: colors.textDim, fontSize: 10 },
  cacheTag: { color: colors.warn, fontWeight: '700', fontSize: 10 },
  /** لون النسبة يأتي من الاتجاه وحده — بلا اتجاه تبقى بلون `meta` المكتوم. */
  metaPct: { fontWeight: '800' },
  metaPctUp: { color: colors.bull },
  metaPctDown: { color: colors.bear },
});
