import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// ملاحظة: لا نستورد expo-av بشكل ثابت (static import) — على Expo Go
// مع SDK الحالي الوحدة الأصلية 'ExponentAV' غير مشمولة، ومجرد استيراد
// الحزمة في أعلى الملف يُعطّل التطبيق بالكامل عند الإقلاع (حتى قبل فتح
// هذه الشاشة). لذلك نحمّلها ديناميكياً فقط عند الاستخدام الفعلي، داخل
// try/catch، حتى يستمر التطبيق بدون صوت إن لم تكن الوحدة متاحة.
import type { Audio as ExpoAudioNS } from 'expo-av';
import { colors, radii, spacing, buttons } from '../theme';
import { playSoftClick } from '../audio/playSoftClick';
import { API_URL, api, type ChartSeries } from '../api';
import type { AcademyLecture, ScriptSegment } from '../academy';
import { MatrixChart } from '../chart/MatrixChart';
import { academyChartFor } from '../chart/academyChart';
import { mockSeries } from '../mock';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';

type Props = {
  schoolId: string;
  lectureId: string;
  onClose: () => void;
};

export function LectureClassroom({ schoolId, lectureId, onClose }: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const { user } = useAuth();
  const [lecture, setLecture] = useState<AcademyLecture | null>(null);
  const [segIndex, setSegIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [clarification, setClarification] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** وضوح الحالة: يعلم المستخدم إذا فشل تحميل المحاضرة الفعلية وأن ما يراه محتوى تجريبي عام
   * بدلاً منها (لا ادّعاء فشل قبل حدوثه). */
  const [lectureFallback, setLectureFallback] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [chartSeries, setChartSeries] = useState<ChartSeries | null>(null);
  const [showChart, setShowChart] = useState(true);
  const [showComplete, setShowComplete] = useState(false);
  const soundRef = useRef<ExpoAudioNS.Sound | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, []);

  const chartMeta = academyChartFor(schoolId);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await api.chart(chartMeta.symbol, chartMeta.tf);
        if (alive) setChartSeries(s);
      } catch {
        if (alive) setChartSeries(mockSeries(chartMeta.symbol, 1.08, chartMeta.tf, 80));
      }
    })();
    return () => {
      alive = false;
    };
  }, [schoolId, chartMeta.symbol, chartMeta.tf]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        try {
          const { Audio } = await import('expo-av');
          await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        } catch {
          // الصوت غير متاح في Expo Go لهذا الإصدار — نكمل بدون تهيئة الصوت
        }
        const lec = await api.academyLecture(schoolId, lectureId);
        if (alive) {
          setLecture(lec);
          setLectureFallback(false);
        }
      } catch {
        if (alive) {
          setLectureFallback(true);
          setLecture({
            id: lectureId,
            title: 'محاضرة تجريبية',
            duration_min: 20,
            format: 'screen_voice',
            video_status: 'script_ready',
            outline: ['تعريف', 'تطبيق'],
            teacher: 'الشرح الصوتي',
            school_name: 'MATRIX Academy',
            script_segments: [
              {
                id: 's1',
                title: 'افتتاح',
                narration:
                  'أهلاً بك. الشاشة فقط مع شرح صوتي. يمكنك إيقاف الشرح في أي لحظة لتسأل.',
              },
              {
                id: 's2',
                title: 'الفكرة الأساسية',
                narration:
                  'BOS و CHOCH جزء من هيكل السوق داخل Order Blocks و Fair Value Gaps في ICT/SMC.',
              },
            ],
          });
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      void soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, [schoolId, lectureId]);

  const segments: ScriptSegment[] = lecture?.script_segments ?? [];
  const current = segments[segIndex];

  const progress = useMemo(() => {
    if (!segments.length) return 0;
    return Math.round(((segIndex + 1) / segments.length) * 100);
  }, [segIndex, segments.length]);

  useEffect(() => {
    if (!lecture) return;
    const key = `matrix.progress.${schoolId}.${lectureId}`;
    void AsyncStorage.setItem(key, String(segIndex));
    if (user) {
      void api.saveProgress({
        school_id: schoolId,
        lecture_id: lectureId,
        segment_index: segIndex,
        completed: segIndex >= segments.length - 1,
      });
    }
  }, [segIndex, schoolId, lectureId, lecture, user, segments.length]);

  useEffect(() => {
    let cancelled = false;

    const playSegment = async () => {
      if (!current?.narration || paused || clarification) return;
      setVoiceBusy(true);
      setVoiceError(null);
      try {
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        const res = await fetch(`${API_URL}/api/academy/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: current.narration }),
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(err.slice(0, 180) || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { audio_url: string };
        if (cancelled) return;
        const uri = data.audio_url.startsWith('http')
          ? data.audio_url
          : `${API_URL}${data.audio_url}`;
        const { Audio } = await import('expo-av');
        const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
        if (cancelled) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
      } catch (e) {
        if (!cancelled) {
          setVoiceError(e instanceof Error ? e.message : t.lectureVoicePlayError);
        }
      } finally {
        if (!cancelled) setVoiceBusy(false);
      }
    };

    void playSegment();
    return () => {
      cancelled = true;
    };
  }, [current?.id, current?.narration, paused, clarification, t.lectureVoicePlayError]);

  const stopVoice = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch {
      /* ignore */
    }
  };

  const interrupt = async () => {
    const q = question.trim();
    if (!q || !lecture || asking) return;
    setAsking(true);
    setPaused(true);
    await stopVoice();
    try {
      const res = await api.academyInterrupt({
        school_id: schoolId,
        lecture_id: lectureId,
        segment_id: current?.id,
        question: q,
      });
      setClarification(res.clarification);
      setQuestion('');
    } catch {
      setClarification(
        `${t.lectureClarifyPausedLine}\n\n${t.lectureClarifyQuestionLabel} ${q}\n\n${t.lectureClarifyFocusLine}`
      );
      setQuestion('');
    } finally {
      setAsking(false);
    }
  };

  const resume = () => {
    setClarification(null);
    setPaused(false);
  };

  const next = async () => {
    await stopVoice();
    if (segIndex < segments.length - 1) {
      const newIndex = segIndex + 1;
      setSegIndex(newIndex);
      /** احتفال بصري/لمسي خفيف عند إكمال آخر مقطع بالمحاضرة (matrix-tactile-feel.mdc) —
       * warmAccent مخصَّص أصلاً بالثيم لـ"إنجاز/تشجيع (تعلّم، إكمال درس)" ولم يكن مستخدَماً بأي
       * مكان بالتطبيق قبل هذا التعديل. شارة نصية مؤقتة تختفي تلقائياً بعد 2.6 ثانية. */
      if (newIndex === segments.length - 1) {
        playSoftClick();
        setShowComplete(true);
        if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
        completeTimerRef.current = setTimeout(() => setShowComplete(false), 2600);
      }
    }
  };

  const prev = async () => {
    await stopVoice();
    if (segIndex > 0) setSegIndex((i) => i - 1);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.top, rtl && styles.topRtl]}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) =>
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            }
          }
          hitSlop={8}
          accessibilityLabel={t.lectureCloseA11y}
        >
          <Text style={styles.back}>{t.lectureClose}</Text>
        </Pressable>
        <Text style={styles.meta}>
          {lecture?.school_name} · {t.lectureLevelWord} {lecture?.level ?? '-'}
        </Text>
      </View>

      <Text style={[styles.title, { textAlign: align }]}>{lecture?.title}</Text>
      {lectureFallback ? (
        <Text style={[styles.voiceErr, { textAlign: align }]}>{t.lectureLoadFailedNote}</Text>
      ) : null}
      <Text style={[styles.voiceHint, { textAlign: align }]}>
        {t.lectureFullScreenTag} · {t.coursesVoiceWord} ElevenLabs ·{' '}
        {paused ? t.lectureVoicePausedForQ : voiceBusy ? t.lecturePreparingVoice : t.lectureExplainingNow}
      </Text>
      {voiceError ? <Text style={[styles.voiceErr, { textAlign: align }]}>{voiceError}</Text> : null}

      {showChart && chartSeries ? (
        <View style={styles.chartBox}>
          <View style={[styles.chartHead, rtl && styles.chartHeadRtl]}>
            <Text style={styles.chartLabel}>
              {t.lectureChartLabel} · {chartMeta.symbol} · {chartMeta.tf}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowChart(false)}
              style={({ pressed }) =>
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                }
              }
              hitSlop={8}
              accessibilityLabel={t.lectureHideChartA11y}
            >
              <Text style={styles.chartHide}>{t.lectureHideChart}</Text>
            </Pressable>
          </View>
          <MatrixChart
            series={chartSeries}
            height={220}
            interactive
            persistDrawings
            accent={colors.accent}
          />
        </View>
      ) : !showChart ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowChart(true)}
          style={({ pressed }) =>
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            }
          }
          hitSlop={8}
          accessibilityLabel={t.lectureShowChart}
        >
          <Text style={[styles.showChart, { textAlign: align }]}>{t.lectureShowChart}</Text>
        </Pressable>
      ) : null}

      <View style={styles.bigScreen}>
        <View style={[styles.voiceBar, rtl && styles.voiceBarRtl]}>
          <View style={[styles.voiceDot, (paused || voiceError) && styles.voiceDotPaused]} />
          <Text style={styles.voiceBarText}>
            {paused ? t.lectureVoiceStopped : voiceBusy ? t.lectureGenerating : t.lectureVoiceActive}
          </Text>
        </View>
        <Text style={[styles.screenTitle, { textAlign: align }]}>{current?.title || '—'}</Text>
        <ScrollView style={{ flexGrow: 0, maxHeight: 220 }}>
          <Text style={[styles.screenBody, { textAlign: align }]}>{current?.narration}</Text>
        </ScrollView>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={[styles.progressText, { textAlign: align }]}>
          {t.lectureSegmentWord} {segIndex + 1}/{segments.length || 1} · {progress}%
        </Text>
        {showComplete ? (
          <View style={styles.completeBadge}>
            <Text style={styles.completeBadgeText}>{t.lectureCompleteBadge}</Text>
          </View>
        ) : null}
      </View>

      {clarification ? (
        <View style={styles.clarifyBox}>
          <Text style={[styles.clarifyTitle, { textAlign: align }]}>{t.lectureClarifyTitle}</Text>
          <Text style={[styles.clarifyText, { textAlign: align }]}>{clarification}</Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.resumeBtn,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={resume}
            accessibilityLabel={t.lectureResume}
            hitSlop={8}
          >
            <Text style={styles.resumeText}>{t.lectureResume}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.controls}>
          <View style={[styles.navRow, rtl && styles.navRowRtl]}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.navBtn,
                (segIndex === 0 || paused) && styles.navBtnDisabled,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={prev}
              disabled={segIndex === 0 || paused}
              accessibilityState={{ disabled: segIndex === 0 || paused }}
              accessibilityLabel={t.lecturePrevA11y}
            >
              <Text style={styles.navText}>{t.lecturePrev}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.navBtn,
                (paused || segIndex >= segments.length - 1) && styles.navBtnDisabled,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={next}
              disabled={paused || segIndex >= segments.length - 1}
              accessibilityState={{ disabled: paused || segIndex >= segments.length - 1 }}
              accessibilityLabel={t.lectureNextA11y}
            >
              <Text style={styles.navText}>{t.lectureNext}</Text>
            </Pressable>
          </View>

          <Text style={[styles.interruptLabel, { textAlign: align }]}>{t.lectureInterruptLabel}</Text>
          <View style={[styles.askRow, rtl && styles.askRowRtl]}>
            <TextInput
              style={[styles.input, { textAlign: align }]}
              value={question}
              onChangeText={setQuestion}
              placeholder={t.lectureQuestionPlaceholder}
              placeholderTextColor={colors.textDim}
              editable={!asking}
              returnKeyType="done"
              underlineColorAndroid="transparent"
              clearButtonMode="while-editing"
              keyboardAppearance="dark"
              selectionColor={colors.accent}
              accessibilityLabel={t.lectureQuestionA11y}
            />
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.askBtn,
                asking && styles.askBtnDisabled,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={interrupt}
              disabled={asking}
              accessibilityState={{ disabled: asking }}
              accessibilityLabel={t.lectureAskA11y}
              hitSlop={8}
            >
              <Text style={styles.askText}>{asking ? '...' : t.lectureAskBtn}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topRtl: { flexDirection: 'row-reverse' },
  back: { color: colors.accent, fontWeight: '700' },
  meta: { color: colors.textDim, fontSize: 12 },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  voiceHint: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    fontSize: 12,
  },
  voiceErr: {
    color: colors.bear,
    fontSize: 11,
    marginBottom: spacing.sm,
  },
  chartBox: {
    marginBottom: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  chartHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  chartHeadRtl: { flexDirection: 'row-reverse' },
  chartLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  chartHide: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  showChart: {
    color: colors.accent,
    marginBottom: spacing.sm,
    fontWeight: '700',
    fontSize: 12,
  },
  bigScreen: {
    flex: 1,
    backgroundColor: colors.stageBg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.heroBorder,
    padding: spacing.md,
    minHeight: 280,
  },
  voiceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 10,
  },
  voiceBarRtl: { flexDirection: 'row-reverse' },
  voiceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  voiceDotPaused: { backgroundColor: colors.warn },
  voiceBarText: { color: colors.dxy, fontSize: 11, fontWeight: '700' },
  screenTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  screenBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
  },
  progressBg: {
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  progressFill: { height: 5, backgroundColor: colors.accent },
  progressText: { color: colors.textDim, fontSize: 11, marginTop: spacing.xs },
  completeBadge: {
    marginTop: spacing.sm,
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(232,184,109,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,184,109,0.4)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
  },
  completeBadgeText: { color: colors.warmAccent, fontSize: 11, fontWeight: '800' },
  controls: { marginTop: spacing.md, gap: spacing.sm },
  navRow: { flexDirection: 'row', gap: spacing.sm },
  navRowRtl: { flexDirection: 'row-reverse' },
  navBtn: {
    flex: 1,
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  navBtnDisabled: { opacity: 0.4 },
  navText: { color: colors.text, fontWeight: '700' },
  interruptLabel: {
    color: colors.warn,
    fontWeight: '700',
    fontSize: 12,
    marginTop: 6,
  },
  askRow: { flexDirection: 'row', gap: spacing.sm },
  askRowRtl: { flexDirection: 'row-reverse' },
  input: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  askBtn: {
    backgroundColor: colors.warn,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    justifyContent: 'center',
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  askText: { color: colors.onWarnFill, fontWeight: '800' },
  askBtnDisabled: { opacity: 0.4 },
  clarifyBox: {
    marginTop: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.md,
  },
  clarifyTitle: { color: colors.accent, fontWeight: '800' },
  clarifyText: {
    color: colors.text,
    marginTop: spacing.sm,
    lineHeight: 21,
    fontSize: 13,
  },
  resumeBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  resumeText: { color: colors.onAccent, fontWeight: '800' },
});
