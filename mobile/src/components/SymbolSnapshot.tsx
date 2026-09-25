import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, numeric } from '../theme';
import { api } from '../api';
import { useI18n } from '../i18n/I18nContext';
import { formatPct } from '../chart/dailyChange';

/**
 * عتبة «ثابت» بالنسبة المئوية — **منقولة حرفياً** من `dailyChange` بـ`chart/dailyChange.ts`، وهي
 * الحكم المعتمد بهذا التطبيق على «هل تحرّك السعر أصلاً» (قائمة المتابعة وشاشة الطرفية تلوّنان به).
 * لا تُنادى الدالّة نفسها هنا لأنها تحتاج سعراً ومرجعاً، ولا يصل هذه اللوحة إلا النسبة جاهزةً من
 * `indicatorSnapshot` — ومحاولة تمرير `(100 + pct, 100)` إليها **لا تكافئ القاعدة**: الفاصلة
 * العائمة تُخرج 0.005 بالضبط كـ«ثابت» بينما القاعدة تعدّه حركة. فالعتبة رقمٌ واحد هنا بلا وساطة.
 */
const FLAT_PCT = 0.005;

type Props = {
  symbol: string;
  timeframe?: string;
};

export function SymbolSnapshot({ symbol, timeframe = '15m' }: Props) {
  const { t, rtl } = useI18n();
  const [snap, setSnap] = useState<{
    rsi?: number;
    change_pct?: number | null;
    change_bars?: number;
    ma_cross_up?: boolean;
    ma_cross_down?: boolean;
    macd_cross_up?: boolean;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .indicatorSnapshot(symbol, timeframe)
      .then((s) => {
        // demo = RSI/تقاطعات على شموع مختلَقة (المزوّد متعذّر) — لا شارات بدل أرقام مضلِّلة.
        if (alive) setSnap(s.data_kind === 'demo' ? null : s);
      })
      .catch(() => {
        if (alive) setSnap(null);
      });
    return () => {
      alive = false;
    };
  }, [symbol, timeframe]);

  // `!snap.rsi` كان يُخفي الشريط كلّه عند RSI = 0 — وهي قيمة حقيقية ممكنة (كل إغلاقات الفترة هابطة،
  // يحدث بفريم صغير وسط حركة أحادية الاتجاه)، أي يختفي التلميح باللحظة التي يعني فيها أكثر ما يعني.
  if (snap?.rsi == null) return null;
  const rsi = snap.rsi;

  /**
   * **نسبة التغيّر كانت رمادية بلا اتجاه، وتُنسَّق بيدها.** الشريط يقف فوق الشارت الموسَّع
   * (`FocusChartModal`)، وفيه شرائح MA/MACD ملوّنة بالصعود والهبوط — ورقمُ التغيّر وحده، وهو
   * أوّل ما تقع عليه العين، بلون النصّ المكتوم نفسه سواء صعد الزوج نصف بالمئة أو هبط. وبقيّة
   * التطبيق تلوّن هذا الرقم بالضبط (قائمة المتابعة وشاشة الطرفية: `bull`/`bear` مع ▲/▼).
   *
   * والتنسيق كان محليّاً (`pct >= 0 ? '+' : ''` ثم `toFixed(2)`) فيخالف `formatPct` المعتمد بأمرين
   * يظهران على الشاشة: صفرٌ يُكتب «+0.00%» كأنه صعودٌ قُرِّب، وحركةٌ هابطة دقيقة تُكتب «-0.00%» —
   * سالبُ صفر — وبشَرطة ASCII لا علامة الناقص الطباعية «−» التي يكتب بها التطبيق أرقامه. الآن
   * الدالّة المعتمدة نفسها، فالرقم واحد بكل شاشة يظهر فيها.
   *
   * ولا لون إلا بحركة حقيقية: ما دون العتبة يبقى مكتوماً كما كان، فلا وميضَ أخضر على ضجيج كسور.
   */
  const pct =
    typeof snap.change_pct === 'number' && Number.isFinite(snap.change_pct) ? snap.change_pct : null;
  const pctDir = pct == null || Math.abs(pct) < FLAT_PCT ? 'flat' : pct > 0 ? 'up' : 'down';
  // النسبة على كامل السلسلة (~45 ساعة على 15m، ~6 أشهر على D — backend `5324d55`) لا «تغيّر اليوم» كما
  // توحي شريحة ± بلا اسم ⇒ تُسمّى بعدد شموعها. خادم أقدم بلا `change_bars` ⇒ النسبة وحدها.
  const bars = snap.change_bars;
  const pctText =
    pct == null
      ? '—'
      : typeof bars === 'number' && Number.isFinite(bars) && bars > 0
        ? t.snapChangeOverBars.replace('{pct}', formatPct(pct)).replace('{bars}', String(bars))
        : formatPct(pct);

  return (
    <View style={[styles.wrap, rtl && styles.wrapRtl]}>
      <Text style={styles.chip}>RSI {rsi.toFixed(0)}</Text>
      <Text
        style={[styles.chip, pctDir === 'up' && styles.bull, pctDir === 'down' && styles.bear]}
      >
        {pctText}
      </Text>
      {snap.ma_cross_up ? <Text style={[styles.chip, styles.bull]}>MA ↑</Text> : null}
      {snap.ma_cross_down ? <Text style={[styles.chip, styles.bear]}>MA ↓</Text> : null}
      {snap.macd_cross_up ? <Text style={[styles.chip, styles.bull]}>MACD ↑</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // كان `row-reverse` ثابتاً — أي أن الشرائح تُقرأ معكوسة بالإنجليزية (وأمريكا/أوروبا سوقان
  // مستهدفان)؛ بقية ألواح التطبيق تقلب الاتجاه بشرط `rtl` لا دائماً.
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  wrapRtl: { flexDirection: 'row-reverse' },
  chip: {
    ...numeric,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  bull: { color: colors.bull, borderColor: colors.bull },
  bear: { color: colors.bear, borderColor: colors.bear },
});
