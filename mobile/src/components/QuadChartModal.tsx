import React, { useEffect, useState } from 'react';
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
import { livePriceForChart } from '../chart/liveSeries';
import { useMultiLiveTicks } from '../hooks/useMultiLiveTicks';
import { type Timeframe } from '../timeframes';
import { mockSeries } from '../mock';
import { normalizeProvenance } from '../chart/dataSource';
import { chartExtraLabels } from '../chart/typeLabels';
import { useI18n } from '../i18n/I18nContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  symbols?: [string, string, string, string];
  timeframe?: Timeframe;
};

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
  symbols = DEFAULT,
  timeframe = '15m',
}: Props) {
  const { t, rtl, lang } = useI18n();
  const trx = chartExtraLabels(lang);
  const align = rtl ? ('right' as const) : ('left' as const);
  const { width, height } = useWindowDimensions();
  const phone = width < 700;
  const cellH = phone ? height * 0.28 : height * 0.32;
  const [series, setSeries] = useState<(ChartSeries | null)[]>([null, null, null, null]);
  const ticks = useMultiLiveTicks(symbols, visible);

  // أربعة شارتات بنفس الفريم كانت تُرسم مستقلّة تماماً: لا شيء يربط نافذتها الزمنية
  // ولا يقول للمتداول إن ما يراه هو نفس المدى على الأزواج الأربعة. الآن شارت واحد
  // **يقود** الزمن (قابل للسحب) والثلاثة تتبعه زمنياً فقط، والقيادة تُنقل بضغطة على
  // أي شارت — وكلا الحالتين موسومة بالرأس فلا مزامنة خفيّة.
  const [syncTime, setSyncTime] = useState(true);
  const [leader, setLeader] = useState(0);
  const [syncWindow, setSyncWindow] = useState<SyncTimeWindow | null>(null);

  // النافذة المشتركة تخصّ رموزاً وفريماً بعينهما: تُصفَّر مع أي تبديل أو إعادة فتح،
  // وإلا تُطبَّق نافذة فريم سابق على شموع فريم جديد.
  useEffect(() => {
    setSyncWindow(null);
    setLeader(0);
  }, [visible, symbols, timeframe]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    (async () => {
      const out: ChartSeries[] = [];
      for (const sym of symbols) {
        try {
          out.push(await api.chart(sym, timeframe));
        } catch {
          out.push(mockSeries(sym, BASES[sym] ?? 1, timeframe, 80));
        }
      }
      if (alive) setSeries(out);
    })();
    return () => {
      alive = false;
    };
  }, [visible, symbols, timeframe]);

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
            {t.quadTitlePrefix} · {timeframe}
          </Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: syncTime }}
            accessibilityLabel={trx.syncToggleA11y}
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
              {syncTime ? trx.syncTimeOn : trx.syncTimeOff}
            </Text>
          </Pressable>
        </View>
        {syncTime ? (
          <Text style={[styles.syncHint, { textAlign: align }]}>
            {`${trx.syncLeadHint} — ${symbols[leader]}`}
          </Text>
        ) : null}
        <View style={[styles.grid, rtl && styles.gridRtl, phone && styles.gridPhone]}>
          {symbols.map((sym, i) => {
            const isLeader = i === leader;
            const following = syncTime && !isLeader;
            return (
              <Pressable
                key={sym}
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
                    livePrice={livePriceForChart(series[i]!, ticks[sym] ?? null, {
                      tickAsOf: ticks[sym]?.source.as_of ?? null,
                      timeframe: series[i]!.timeframe,
                    })}
                    liveTickSource={ticks[sym]?.source ?? null}
                    accent={sym === 'DXY' ? colors.dxy : colors.accent}
                    initialLens="clean"
                    initialIndicators={[]}
                    panControls={!syncTime || isLeader}
                    syncWindow={following ? syncWindow : null}
                    onSyncWindow={syncTime && isLeader ? setSyncWindow : undefined}
                    syncFollow={following}
                    syncTimeOnly
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
  cellPhone: { width: '100%' },
  cellHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  cellHeadRtl: { flexDirection: 'row-reverse' },
  sym: { color: colors.accent, fontWeight: '800' },
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
