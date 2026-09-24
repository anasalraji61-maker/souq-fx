import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing, buttons } from '../theme';
import { api, type ChartSeries } from '../api';
import { MatrixChart, type SyncTimeWindow } from '../chart/MatrixChart';
import { liveChangePct, livePriceForChart } from '../chart/liveSeries';
import { useMultiLiveTicks } from '../hooks/useMultiLiveTicks';
import { type Timeframe } from '../timeframes';
import { TimeframeBar } from './TimeframeBar';
import { mockSeries } from '../mock';
import { normalizeProvenance } from '../chart/dataSource';
import { formatPrice } from '../chart/math';
import { formatPct } from '../chart/dailyChange';
import { useI18n } from '../i18n/I18nContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  symbols?: [string, string, string, string];
  timeframe?: Timeframe;
};

// مصفوفة ثابتة لا `[]` بالسطر: الجديدة بكل رسم (كل تيك) تُطلق تأثير `initialIndicators`
// بالشارت فيعيد رسمه مرّة ثانية ويمسح أي مؤشّر أضافه المتداول.
const NO_INDICATORS: never[] = [];

/** حشو الخلية وحدّها ورأسها (الرمز والسعر) فوق الشارت — راجع `phoneCellH`. */
const PHONE_CELL_CHROME = 2 * spacing.xs + 2 + 18 + spacing.xs;

const DEFAULT: [string, string, string, string] = ['EURUSD', 'GBPUSD', 'XAUUSD', 'DXY'];
const BASES: Record<string, number> = {
  EURUSD: 1.0854,
  GBPUSD: 1.2732,
  XAUUSD: 2348.6,
  DXY: 104.25,
  USDJPY: 157.4,
  BTCUSD: 67420,
};

export function QuadChartModal({
  visible,
  onClose,
  symbols: symbolsProp = DEFAULT,
  timeframe = '15m',
}: Props) {
  // المستدعي يمرّر مصفوفة حرفية جديدة بكل رسم (`[a, b, c, 'DXY']`): كانت كل إعادة رسم
  // للشاشة الأمّ تعيد جلب الشارتات الأربعة وتُرجع القيادة للخلية الأولى. الهوية الآن بالمحتوى.
  const symKey = symbolsProp.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const symbols = useMemo(() => symbolsProp, [symKey]);
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const { width, height } = useWindowDimensions();
  const phone = width < 700;
  // الهاتف: أربع خلايا بعمود واحد بلا تمرير. كانت كل خلية 28% من الشاشة + رأسها وسطر قراءتها
  // وحشوها (~285pt على 844pt) فالأربع ≈ 1140pt: الخلية الرابعة (DXY) ونصف الثالثة خارج الشاشة
  // ولا سبيل إليهما. الآن الارتفاع من الشبكة المقيسة فعلاً مقسوماً على أربع، والشارت بلا سطر
  // القراءة (`dense`، كإطارات الشاشة الرئيسية المملوءة).
  const [gridH, setGridH] = useState(0);
  const phoneCellH =
    gridH > 0
      ? Math.max(96, (gridH - 5 * spacing.sm) / 4 - PHONE_CELL_CHROME)
      : height * 0.18;
  const cellH = phone ? phoneCellH : height * 0.32;
  const [series, setSeries] = useState<(ChartSeries | null)[]>([null, null, null, null]);
  const ticks = useMultiLiveTicks(symbols, visible);
  // الفريم كان ثابتاً من الشاشة الأمّ: مقارنة الأزواج الأربعة على فريم آخر تعني إغلاق الرباعي،
  // وتغيير فريم الإطار الأول، ثم فتحه من جديد. الآن شريط فريمات داخله يبدّل الأربعة معاً.
  // الاختيار يخصّ هذه الجلسة وحدها: يُنسى عند الإغلاق (وعند تغيّر فريم الأمّ) فلا يُفتح
  // الرباعي لاحقاً على فريم لا يطابق ما يوحي به الإطار الأول.
  const [tfOverride, setTfOverride] = useState<Timeframe | null>(null);
  useEffect(() => {
    if (!visible) setTfOverride(null);
  }, [visible]);
  useEffect(() => {
    setTfOverride(null);
  }, [timeframe]);
  const tf = tfOverride ?? timeframe;

  // أربعة شارتات بنفس الفريم كانت تُرسم مستقلّة تماماً: لا شيء يربط نافذتها الزمنية
  // ولا يقول للمتداول إن ما يراه هو نفس المدى على الأزواج الأربعة. الآن شارت واحد
  // **يقود** الزمن (قابل للسحب) والثلاثة تتبعه زمنياً فقط، والقيادة تُنقل بضغطة على
  // أي شارت — وكلا الحالتين موسومة بالرأس فلا مزامنة خفيّة.
  const [syncTime, setSyncTime] = useState(true);
  const [leader, setLeader] = useState(0);
  const [syncWindow, setSyncWindow] = useState<SyncTimeWindow | null>(null);
  // زمن تقاطع القائد (ثوانٍ): التوابع ترسم خطّاً عمودياً وقراءة OHLC لشمعتها عنده.
  const [crossTime, setCrossTime] = useState<number | null>(null);

  // النافذة المشتركة تخصّ رموزاً وفريماً بعينهما: تُصفَّر مع أي تبديل أو إعادة فتح،
  // وإلا تُطبَّق نافذة فريم سابق على شموع فريم جديد.
  useEffect(() => {
    setSyncWindow(null);
    setCrossTime(null);
    setLeader(0);
  }, [visible, symbols, tf]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    // حتى ينتهي جلب الرموز كانت الخلايا تعرض شموع الفريم/الرموز السابقة
    // (وسعرها بالرأس) بلا أي أثر. الآن مؤشّر تحميل صريح بدل بيانات قديمة تُقرأ كحالية.
    // والجلب كان ينتظر الأربعة **واحداً بعد واحد** ثم يعرضها دفعة واحدة: أبطأ رمز يحجب
    // الثلاثة الجاهزة، والانتظار مجموع أزمنتها. الآن متوازٍ، وكل خلية تُملأ لحظة وصول شموعها.
    setSeries([null, null, null, null]);
    symbols.forEach((sym, i) => {
      api
        .chart(sym, tf)
        .catch(() => mockSeries(sym, BASES[sym] ?? 1, tf, 80))
        .then((s) => {
          if (!alive) return;
          setSeries((prev) => {
            const next = [...prev];
            next[i] = s;
            return next;
          });
        });
    });
    return () => {
      alive = false;
    };
  }, [visible, symbols, tf]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.top, rtl && styles.topRtl]}>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            hitSlop={8}
            accessibilityLabel={t.quadCloseA11y}
          >
            <Text style={styles.close}>{t.closeWord}</Text>
          </Pressable>
          <Text style={[styles.title, { textAlign: align }]}>
            {t.quadTitlePrefix} · {tf}
          </Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: syncTime }}
            accessibilityLabel={t.mcSyncToggleA11y}
            onPress={() => setSyncTime((v) => !v)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.syncToggle,
              syncTime && styles.syncToggleOn,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
          >
            <Text style={[styles.syncToggleText, syncTime && styles.syncToggleTextOn]}>
              {syncTime ? t.mcSyncTimeOn : t.mcSyncTimeOff}
            </Text>
          </Pressable>
        </View>
        <View style={[styles.tfRow, rtl && styles.tfRowRtl]}>
          <TimeframeBar value={tf} onChange={setTfOverride} compact />
        </View>
        {syncTime ? (
          <Text style={[styles.syncHint, { textAlign: align }]}>
            {`${t.mcSyncLeadHint} — ${symbols[leader]}`}
          </Text>
        ) : null}
        <View
          style={[styles.grid, rtl && styles.gridRtl, phone && styles.gridPhone]}
          onLayout={(e) => setGridH(e.nativeEvent.layout.height)}
        >
          {symbols.map((sym, i) => {
            const isLeader = i === leader;
            const following = syncTime && !isLeader;
            // رأس الخلية كان الرمز وحده: أربعة أزواج بلا سعر ولا نسبة، فالمقارنة — سبب فتح
            // الرباعي أصلاً — تتطلّب قراءة محور كل شارت. السعر الحيّ (أو آخر إغلاق) بخانات
            // الزوج، والنسبة بقاعدة رأس الإطار نفسها: اللون من الرقم المطبوع، وصفره مكتوم.
            const s = series[i];
            const tp = ticks[sym]?.price;
            const px = tp != null && Number.isFinite(tp) && tp > 0 ? tp : (s?.last ?? NaN);
            // النسبة تتبع التيك المدموج بالشمعة (لا نسبة الجلب الأخير بجانب سعر أحدث منه).
            const merged = s
              ? livePriceForChart(s, ticks[sym] ?? null, {
                  tickAsOf: ticks[sym]?.source.as_of ?? null,
                  timeframe: s.timeframe,
                })
              : null;
            const livePct = s ? liveChangePct(s, merged) : NaN;
            const pct = s && Number.isFinite(livePct) ? livePct : null;
            const pctR = pct == null ? 0 : Math.round(pct * 100) / 100;
            const pctColor = pctR > 0 ? colors.bull : pctR < 0 ? colors.bear : colors.textDim;
            return (
              <Pressable
                key={`${i}:${sym}`}
                accessibilityRole="button"
                accessibilityLabel={
                  syncTime && !isLeader ? `${t.cfSyncActivateA11yPrefix}${sym}` : undefined
                }
                disabled={!syncTime || isLeader}
                accessibilityState={{ disabled: !syncTime || isLeader }}
                onPress={() => setLeader(i)}
                style={[
                  styles.cell,
                  phone && styles.cellPhone,
                  syncTime && isLeader && styles.cellLeader,
                ]}
              >
                {/* شموع تجريبية (فشل الطلب → mockSeries، أو سلسلة demo من الخادم) كانت تُرسم هنا بلا أي
                    وسم فتُقرأ كسوق حقيقي — بعكس ChartFrame/الشارت الرئيسي اللذين يوسمانها «تجريبي». */}
                <View style={[styles.cellHead, rtl && styles.cellHeadRtl]}>
                  <Text style={[styles.sym, { textAlign: align }]}>{sym}</Text>
                  {syncTime ? (
                    <Text style={[styles.syncBadge, isLeader && styles.syncBadgeLeader]}>
                      {isLeader ? t.cfSyncLeaderBadge : t.cfSyncFollowBadge}
                    </Text>
                  ) : null}
                  {s && Number.isFinite(px) ? (
                    <Text style={styles.cellPrice}>{formatPrice(px, sym)}</Text>
                  ) : null}
                  {s ? (
                    <Text style={[styles.cellPct, { color: pctColor }]}>
                      {pct == null ? '—' : formatPct(pct)}
                    </Text>
                  ) : null}
                  {series[i] && normalizeProvenance(series[i]!.data_source).kind === 'demo' ? (
                    <Text style={styles.demoTag}>{t.dsKindDemo}</Text>
                  ) : null}
                </View>
                {series[i] ? (
                  <MatrixChart
                    series={series[i]!}
                    height={cellH}
                    interactive={false}
                    persistDrawings={false}
                    livePrice={merged}
                    liveTickSource={ticks[sym]?.source ?? null}
                    accent={sym === 'DXY' ? colors.dxy : colors.accent}
                    initialLens="clean"
                    initialIndicators={NO_INDICATORS}
                    dense={phone}
                    panControls={!syncTime || isLeader}
                    syncWindow={following ? syncWindow : null}
                    onSyncWindow={syncTime && isLeader ? setSyncWindow : undefined}
                    syncFollow={following}
                    syncTimeOnly
                    syncCrossTime={following ? crossTime : undefined}
                    onCrossTime={syncTime && isLeader ? setCrossTime : undefined}
                  />
                ) : (
                  <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
                )}
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topRtl: { flexDirection: 'row-reverse' },
  close: { color: colors.accent, fontWeight: '800' },
  tfRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  tfRowRtl: { flexDirection: 'row-reverse' },
  title: { flex: 1, color: colors.text, fontWeight: '800', fontSize: 16 },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  gridRtl: { flexDirection: 'row-reverse' },
  gridPhone: { flexDirection: 'column', flexWrap: 'nowrap' },
  cell: {
    width: '49%',
    flexGrow: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    minHeight: 200,
  },
  cellPhone: { width: '100%', minHeight: 0 },
  cellHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  cellHeadRtl: { flexDirection: 'row-reverse' },
  sym: { color: colors.accent, fontWeight: '800' },
  cellPrice: { color: colors.text, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  cellPct: { fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
  demoTag: { color: colors.warn, fontSize: 10, fontWeight: '800' },
  // القيادة والتبعية موسومتان بالرأس وبحدّ الخلية: المزامنة لا تعمل بصمت.
  syncBadge: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radii.sm,
    backgroundColor: colors.borderSoft,
  },
  syncBadgeLeader: { color: colors.accent, backgroundColor: colors.accentSoft },
  cellLeader: { borderColor: colors.accent },
  syncToggle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  syncToggleOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  syncToggleText: { color: colors.textDim, fontSize: 11, fontWeight: '800' },
  syncToggleTextOn: { color: colors.accent },
  syncHint: {
    color: colors.textMuted,
    fontSize: 10,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
});
