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

type Props = {
  schoolId: string;
  lectureId: string;
  onClose: () => void;
};

export function LectureClassroom({ schoolId, lectureId, onClose }: Props) {
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
          setVoiceError(e instanceof Error ? e.message : 'تعذر تشغيل الصوت');
        }
      } finally {
        if (!cancelled) setVoiceBusy(false);
      }
    };

    void playSegment();
    return () => {
      cancelled = true;
    };
  }, [current?.id, current?.narration, paused, clarification]);

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
        `توقف الشرح مؤقتاً.\n\nسؤالك: ${q}\n\nركّز على الفكرة العملية على الشاشة، ثم نتابع من نفس المقطع.`
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
      <View style={styles.top}>
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
          accessibilityLabel="إغلاق المحاضرة"
        >
          <Text style={styles.back}>إغلاق</Text>
        </Pressable>
        <Text style={styles.meta}>
          {lecture?.school_name} · مستوى {lecture?.level ?? '-'}
        </Text>
      </View>

      <Text style={styles.title}>{lecture?.title}</Text>
      {lectureFallback ? (
        <Text style={styles.voiceErr}>تعذر تحميل هذه المحاضرة — يُعرض محتوى تجريبي عام بدلاً منها</Text>
      ) : null}
      <Text style={styles.voiceHint}>
        شاشة كاملة · صوت ElevenLabs ·{' '}
        {paused ? 'متوقف للسؤال' : voiceBusy ? 'يجهّز الصوت...' : 'يشرح الآن'}
      </Text>
      {voiceError ? <Text style={styles.voiceErr}>{voiceError}</Text> : null}

      {showChart && chartSeries ? (
        <View style={styles.chartBox}>
          <View style={styles.chartHead}>
            <Text style={styles.chartLabel}>
              شارت تفاعلي · {chartMeta.symbol} · {chartMeta.tf}
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
              accessibilityLabel="إخفاء الشارت التفاعلي"
            >
              <Text style={styles.chartHide}>إخفاء</Text>
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
          accessibilityLabel="إظهار الشارت التفاعلي"
        >
          <Text style={styles.showChart}>إظهار الشارت التفاعلي</Text>
        </Pressable>
      ) : null}

      <View style={styles.bigScreen}>
        <View style={styles.voiceBar}>
          <View style={[styles.voiceDot, (paused || voiceError) && styles.voiceDotPaused]} />
          <Text style={styles.voiceBarText}>
            {paused ? 'الصوت متوقف' : voiceBusy ? 'جاري التوليد' : 'شرح صوتي نشط'}
          </Text>
        </View>
        <Text style={styles.screenTitle}>{current?.title || '—'}</Text>
        <ScrollView style={{ flexGrow: 0, maxHeight: 220 }}>
          <Text style={styles.screenBody}>{current?.narration}</Text>
        </ScrollView>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          مقطع {segIndex + 1}/{segments.length || 1} · {progress}%
        </Text>
        {showComplete ? (
          <View style={styles.completeBadge}>
            <Text style={styles.completeBadgeText}>🎉 أنهيت هذه المحاضرة</Text>
          </View>
        ) : null}
      </View>

      {clarification ? (
        <View style={styles.clarifyBox}>
          <Text style={styles.clarifyTitle}>توضيح بعد إيقاف الشرح</Text>
          <Text style={styles.clarifyText}>{clarification}</Text>
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
            accessibilityLabel="متابعة المحاضرة"
            hitSlop={8}
          >
            <Text style={styles.resumeText}>متابعة المحاضرة</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.controls}>
          <View style={styles.navRow}>
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
              accessibilityLabel="الفقرة السابقة"
            >
              <Text style={styles.navText}>السابق</Text>
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
              accessibilityLabel="الفقرة التالية"
            >
              <Text style={styles.navText}>التالي</Text>
            </Pressable>
          </View>

          <Text style={styles.interruptLabel}>أوقف الشرح واسأل عن جزء غير واضح</Text>
          <View style={styles.askRow}>
            <TextInput
              style={styles.input}
              value={question}
              onChangeText={setQuestion}
              placeholder="مثال: لم أفهم CHOCH..."
              placeholderTextColor={colors.textDim}
              editable={!asking}
              returnKeyType="done"
              underlineColorAndroid="transparent"
              clearButtonMode="while-editing"
              keyboardAppearance="dark"
              selectionColor={colors.accent}
              accessibilityLabel="سؤال أثناء إيقاف الشرح"
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
              accessibilityLabel="إرسال السؤال"
              hitSlop={8}
            >
              <Text style={styles.askText}>{asking ? '...' : 'اسأل'}</Text>
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
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  back: { color: colors.accent, fontWeight: '700' },
  meta: { color: colors.textDim, fontSize: 12 },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'right',
    marginTop: spacing.md,
  },
  voiceHint: {
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    fontSize: 12,
  },
  voiceErr: {
    color: colors.bear,
    textAlign: 'right',
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
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  chartLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  chartHide: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  showChart: {
    color: colors.accent,
    textAlign: 'right',
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 10,
  },
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
    textAlign: 'right',
  },
  screenBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'right',
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
  progressText: { color: colors.textDim, fontSize: 11, marginTop: spacing.xs, textAlign: 'right' },
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
  navRow: { flexDirection: 'row-reverse', gap: spacing.sm },
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
    textAlign: 'right',
    marginTop: 6,
  },
  askRow: { flexDirection: 'row-reverse', gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 10,
    textAlign: 'right',
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
  clarifyTitle: { color: colors.accent, fontWeight: '800', textAlign: 'right' },
  clarifyText: {
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'right',
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
