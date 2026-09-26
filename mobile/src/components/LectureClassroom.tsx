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
import { colors, radii, spacing, buttons, numeric } from '../theme';
import { playSoftClick } from '../audio/playSoftClick';
import { API_URL, api, type ChartSeries } from '../api';
import type { AcademyLecture, ScriptSegment } from '../academy';
import { parseStoredIndex, resumeSegmentIndex } from '../academyResume';
import { MatrixChart } from '../chart/MatrixChart';
import { academyChartFor } from '../chart/academyChart';
import { mockBase } from '../chart/mockBases';
import { normalizeProvenance } from '../chart/dataSource';
import { mockSeries } from '../mock';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';

type Props = {
  schoolId: string;
  lectureId: string;
  onClose: () => void;
};

export function LectureClassroom({ schoolId, lectureId, onClose }: Props) {
  const { t, rtl, lang } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const { user } = useAuth();
  const [lecture, setLecture] = useState<AcademyLecture | null>(null);
  const [segIndex, setSegIndex] = useState(0);
  /**
   * هل استُعيد موضع المتداول بعد؟ الموضع كان يُحفظ بمكانين (AsyncStorage وجدول
   * `academy_progress` بالخادم) و**لا يُقرأ من أيٍّ منهما**: كل فتح للمحاضرة يبدأ من
   * المقطع الأول مهما بلغ المتداول. وهذا الحارس شرطٌ لا تحسين: أثر الحفظ يعمل فور
   * وصول المحاضرة، فبلا انتظار الاستعادة يُكتب 0 فوق الموضع المخزَّن قبل قراءته.
   */
  const [restored, setRestored] = useState(false);
  /**
   * الموضع الذي وُضع المتداول عنده بآخر استعادة. الأثر أدناه يُعاد تشغيله حين تصل
   * المصادقة متأخّرة (فتحُ محاضرة بإقلاع بارد)، وبلا هذا كانت الاستعادة الثانية تسحب
   * مَن تقدّم بالفعل إلى صفّ خادم أقدم — أي قفزة للخلف وسط المحاضرة. فإن كان المتداول
   * قد تحرّك عن موضع الاستعادة يبقى مكانه، وإلا يُطبَّق ما وصل من الخادم.
   */
  const restoredAtRef = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [clarification, setClarification] = useState<string | null>(null);
  /** قرار ١٢ (backend-r78a): التوضيح جاء بالعربية (`clarification_lang: "ar"`) ولغة الواجهة غيرها. */
  const [clarificationArabic, setClarificationArabic] = useState(false);
  const [loading, setLoading] = useState(true);
  /** وضوح الحالة: يعلم المستخدم إذا فشل تحميل المحاضرة الفعلية وأن ما يراه محتوى تجريبي عام
   * بدلاً منها (لا ادّعاء فشل قبل حدوثه). */
  const [lectureFallback, setLectureFallback] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [chartSeries, setChartSeries] = useState<ChartSeries | null>(null);
  /** الشموع من `mockSeries` لأن الطلب فشل — لا سلسلة `demo` أرسلها الخادم (نصّ الملاحظة يقول «بلا اتصال»). */
  const [chartOffline, setChartOffline] = useState(false);
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
  const chartKind = chartSeries ? normalizeProvenance(chartSeries.data_source).kind : null;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await api.chart(chartMeta.symbol, chartMeta.tf);
        if (!alive) return;
        setChartSeries(s);
        setChartOffline(false);
      } catch {
        // `mockBase` لا 1.08 ثابتة: مدرستا غان وSK تعرضان XAUUSD — كان الذهب يُرسم حول 1.08 بلا اتصال.
        if (!alive) return;
        setChartSeries(mockSeries(chartMeta.symbol, mockBase(chartMeta.symbol), chartMeta.tf, 80));
        setChartOffline(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [schoolId, chartMeta.symbol, chartMeta.tf]);

  // هوية الحساب لا كائنه: الأثر أدناه يُعاد تشغيله حين تصل المصادقة (قد تصل بعد فتح
  // القاعة، فبلا ذلك لا يُقرأ صفّ الخادم أبداً) — لا مع كل تحديث لبيانات المستخدم.
  const userId = user?.user_id ?? null;

  useEffect(() => {
    let alive = true;
    // إعادة تشغيل الأثر (تبديل محاضرة أو وصول المصادقة) تُعيد الحارس: لا حفظ قبل
    // استعادة الموضع من جديد.
    setRestored(false);

    /**
     * أين توقّف المتداول بهذه المحاضرة. **الخادم أولاً** (يتبعه بين أجهزته وبعد إعادة
     * التثبيت) ثم المحفوظ محلياً حين لا حساب أو تعذّر الاتصال — وكلاهما كان يُكتب ولا
     * يُقرأ إطلاقاً قبل هذا.
     *
     * وموضعٌ عند **آخر** مقطع يعني محاضرة منتهية، فتُفتح من أولها لا من خاتمتها:
     * هذا الشرط وحده يغطّي الحالتين بلا قراءة عَلَم `completed`، فيصحّ للمجهول أيضاً
     * (لا صفّ خادم له)، ويُبقي استئناف **إعادة** مشاهدة متوقّفة بمنتصفها يعمل كما هو.
     */
    const resolveResume = async (total: number): Promise<number> => {
      let stored: number | null = null;
      if (userId !== null) {
        try {
          const res = await api.getProgress();
          const row = res.progress.find(
            (p) => p.school_id === schoolId && p.lecture_id === lectureId
          );
          if (row) stored = row.segment_index;
        } catch {
          // الخادم غير متاح — يُعتمد المحفوظ محلياً أدناه
        }
      }
      if (stored === null) {
        try {
          stored = parseStoredIndex(
            await AsyncStorage.getItem(`matrix.progress.${schoolId}.${lectureId}`)
          );
        } catch {
          // تخزين الجهاز غير متاح — يُبدأ من الأول
        }
      }
      // القصّ وشرط «انتهت» بـ`academyResume` (خالص، ومغطّى بـ`academyResume.selftest.ts`)
      return resumeSegmentIndex(stored, total);
    };

    (async () => {
      try {
        try {
          const { Audio } = await import('expo-av');
          await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        } catch {
          // الصوت غير متاح في Expo Go لهذا الإصدار — نكمل بدون تهيئة الصوت
        }
        const lec = await api.academyLecture(schoolId, lectureId);
        const resume = await resolveResume(lec.script_segments?.length ?? 0);
        if (alive) {
          // الموضع والمحاضرة بدفعة واحدة: لو ضُبط الموضع بعدها لبدأ السرد من المقطع
          // الأول ثم قفز، ولأعاد تحميل الصوت مرتين.
          setSegIndex((cur) => {
            const moved = restoredAtRef.current !== null && cur !== restoredAtRef.current;
            return moved ? cur : resume;
          });
          restoredAtRef.current = resume;
          setLecture(lec);
          setLectureFallback(false);
        }
      } catch {
        if (alive) {
          setLectureFallback(true);
          // المحاضرة الاحتياطية محتوى عام بمقطعين — تُبدأ من أولها دائماً، وإلا بقي
          // موضعٌ أبعد من طولها فيصير `current` غير معرّف.
          setSegIndex(0);
          restoredAtRef.current = 0;
          setLecture({
            id: lectureId,
            title: t.lectureFallbackTitle,
            duration_min: null,
            format: 'screen_voice',
            video_status: 'script_ready',
            outline: [t.lectureFallbackOutlineDefinition, t.lectureFallbackOutlineApplication],
            teacher: t.lectureFallbackTeacher,
            school_name: 'MATRIX Academy',
            script_segments: [
              {
                id: 's1',
                title: t.lectureFallbackSeg1Title,
                narration: t.lectureFallbackSeg1Narration,
              },
              {
                id: 's2',
                title: t.lectureFallbackSeg2Title,
                narration: t.lectureFallbackSeg2Narration,
              },
            ],
          });
        }
      } finally {
        if (alive) {
          setLoading(false);
          // يُرفع دائماً — ولو فشل التحميل وعُرضت المحاضرة الاحتياطية — وإلا توقّف
          // حفظ التقدّم بصمت لبقية الجلسة. (الاحتياطية نفسها لا تُحفظ: `lectureFallback`
          // يحرس مؤثّر الحفظ.)
          setRestored(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [schoolId, lectureId, userId]);

  // إيقاف الصوت يتبع المحاضرة لا المستخدم: كان بتنظيف أثر التحميل أعلاه، وهو يُعاد عند اكتمال
  // الدخول (`userId`) ⇒ يُفرَّغ الصوت ولا يُعاد تشغيله (المقطع نفسه، فأثر التشغيل لا يُعاد)،
  // والشريط يقول «الصوت يعمل» فوق صمت.
  useEffect(
    () => () => {
      void soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    },
    [schoolId, lectureId]
  );

  const segments: ScriptSegment[] = lecture?.script_segments ?? [];
  const current = segments[segIndex];
  /** لا صوت يُشغَّل: فشل الـTTS، أو مقطع بلا نصّ شرح — كان الشريط «شرح صوتي نشط» و«يشرح الآن» فوق صمت. */
  const voiceSilent = !voiceBusy && (voiceError != null || !current?.narration);

  const progress = useMemo(() => {
    if (!segments.length) return 0;
    return Math.round(((segIndex + 1) / segments.length) * 100);
  }, [segIndex, segments.length]);

  useEffect(() => {
    // المحاضرة الاحتياطية (فشل التحميل) مقطعان عامّان تحت `lectureId` الحقيقي: حفظها كان
    // يكتب 0 فوق موضع الاستئناف الحقيقي، ويعلّم المحاضرة «مكتملة» بالمقطع الثاني لمن لم
    // يسمعها. لا تقدّم يُحفظ حتى تُحمَّل المحاضرة الحقيقية.
    if (!lecture || !restored || lectureFallback) return;
    const key = `matrix.progress.${schoolId}.${lectureId}`;
    // الحفظ تحسين صامت: فشل الشبكة/5xx لا يُرمى رفضاً غير معالَج مع كل «التالي».
    AsyncStorage.setItem(key, String(segIndex)).catch(() => {});
    if (user) {
      api
        .saveProgress({
          school_id: schoolId,
          lecture_id: lectureId,
          segment_index: segIndex,
          completed: segIndex >= segments.length - 1,
        })
        .catch(() => {});
    }
  }, [segIndex, schoolId, lectureId, lecture, restored, lectureFallback, user, segments.length]);

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
      } catch {
        // لا يُعرض نصّ الاستثناء أبداً: `err.slice(0,180)` أعلاه هو **جسم ردّ الخادم كما هو** (تفصيل
        // FastAPI أو خطأ مزوّد الـTTS)، وخطأ الشبكة رسالتُه إنجليزية ثابتة — كلاهما نصّ مطوّر يراه
        // متداول تجزئة بالمتجر وقد يسرّب داخليات المزوّد. رسالة واحدة مترجَمة تصف الحالة وتكفي.
        if (!cancelled) {
          setVoiceError(t.lectureVoicePlayError);
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
    // الخادم يطلب 2–2000 حرف: أقصر يُرفض 422.
    if (q.length < 2 || !lecture || asking) return;
    setAsking(true);
    setPaused(true);
    await stopVoice();
    try {
      const res = await api.academyInterrupt({
        school_id: schoolId,
        lecture_id: lectureId,
        segment_id: current?.id,
        question: q,
        lang,
      });
      setClarification(res.clarification);
      setClarificationArabic(res.clarification_lang === 'ar' && lang !== 'ar');
      setQuestion('');
    } catch {
      setClarificationArabic(false);
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
          {(lang === 'ar' ? lecture?.school_name : lecture?.school_name_en ?? lecture?.school_name)} ·{' '}
          {t.lectureLevelWord} {lecture?.level ?? '-'}
        </Text>
      </View>

      <Text style={[styles.title, { textAlign: align }]}>{lecture?.title}</Text>
      {lectureFallback ? (
        <Text style={[styles.voiceErr, { textAlign: align }]}>{t.lectureLoadFailedNote}</Text>
      ) : null}
      <Text style={[styles.voiceHint, { textAlign: align }]}>
        {t.lectureFullScreenTag}
        {paused
          ? ` · ${t.lectureVoicePausedForQ}`
          : voiceBusy
            ? ` · ${t.lecturePreparingVoice}`
            : voiceSilent
              ? ''
              : ` · ${t.lectureExplainingNow}`}
      </Text>
      {voiceError ? <Text style={[styles.voiceErr, { textAlign: align }]}>{voiceError}</Text> : null}

      {showChart && chartSeries ? (
        <View style={styles.chartBox}>
          <View style={[styles.chartHead, rtl && styles.chartHeadRtl]}>
            <Text style={styles.chartLabel}>
              {t.lectureChartLabel} · {chartMeta.symbol} · {t.tfLabels[chartMeta.tf]}
              {/* شموع تجريبية (بلا اتصال أو بذرة الخادم) كانت تُعرض بلا وسم فتُقرأ كسوق حقيقي — كوسم الرباعي. */}
              {chartKind === 'demo' ? <Text style={styles.chartDemoTag}>{` · ${t.dsKindDemo}`}</Text> : null}
              {chartKind === 'unavailable' ? (
                <Text style={styles.chartDemoTag}>{` · ${t.dsKindUnavailable}`}</Text>
              ) : null}
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
          {/* منذ chart `22ff26c` الرسم على سلسلة تجريبية لا يُحفظ — كان يضيع بصمت عند إغلاق الدرس (launch130). */}
          {chartOffline && chartKind === 'demo' ? (
            <Text style={[styles.chartPracticeNote, { textAlign: align }]}>{t.lectureChartPracticeNote}</Text>
          ) : null}
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
          <View style={[styles.voiceDot, (paused || voiceSilent) && styles.voiceDotPaused]} />
          <Text style={styles.voiceBarText}>
            {paused || voiceSilent ? t.lectureVoiceStopped : voiceBusy ? t.lectureGenerating : t.lectureVoiceActive}
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
          {clarificationArabic ? (
            <Text style={[styles.clarifyLangNote, { textAlign: align }]}>{t.aiReplyInArabicNote}</Text>
          ) : null}
          <Text
            style={[
              styles.clarifyText,
              { textAlign: clarificationArabic ? 'right' : align },
              clarificationArabic && styles.clarifyTextRtl,
            ]}
          >
            {clarification}
          </Text>
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
              maxLength={2000}
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
              accessibilityState={{ disabled: asking, busy: asking }}
              accessibilityLabel={asking ? t.a11yBusy : t.lectureAskA11y}
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
  back: { color: colors.textMuted, fontWeight: '500', fontSize: 13 },
  meta: { color: colors.textDim, fontSize: 12 },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '500',
    marginTop: spacing.md,
  },
  voiceHint: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    fontSize: 12,
  },
  voiceErr: {
    // عنبري لا أحمر: الأحمر بالتطبيق لون البيع/الخسارة، وتعذّر الصوت حالة متدهورة والدرس مقروء
    // أمام المتداول — نفس معالجة فقاعة انقطاع المساعد.
    color: colors.warn,
    fontSize: 11,
    marginBottom: spacing.sm,
  },
  chartBox: {
    // DESIGN-PRO §5.5: فاصل واحد — تعبئة بلا حدّ فوقها (كذلك الشاشة الكبيرة ووسام الإكمال).
    marginBottom: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  chartHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  chartHeadRtl: { flexDirection: 'row-reverse' },
  chartLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  // DESIGN-PRO §1: رابطا إخفاء/إظهار الشارت نصّ ثانوي — التأكيد يبقى لشريط التقدّم وحده بالدرس.
  chartHide: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  chartDemoTag: { color: colors.warn, fontWeight: '500' },
  chartPracticeNote: { color: colors.warn, fontSize: 11, marginTop: spacing.xs },
  showChart: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    fontWeight: '500',
    fontSize: 12,
  },
  bigScreen: {
    flex: 1,
    backgroundColor: colors.stageBg,
    borderRadius: radii.lg,
    padding: spacing.md,
    minHeight: 280,
  },
  voiceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 8,
  },
  voiceBarRtl: { flexDirection: 'row-reverse' },
  voiceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    // النقطة بجانب نصّ الحالة («الصوت يعمل»/«متوقف») لا تحمل المعنى وحدها؛ بلا تأكيد ثانٍ بجانب شريط التقدّم.
    backgroundColor: colors.textMuted,
  },
  voiceDotPaused: { backgroundColor: colors.warn },
  voiceBarText: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  screenTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '500',
  },
  screenBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 8,
  },
  progressBg: {
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  progressFill: { height: 5, backgroundColor: colors.accent },
  progressText: { ...numeric, color: colors.textDim, fontSize: 11, marginTop: spacing.xs },
  completeBadge: {
    marginTop: spacing.sm,
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(232,184,109,0.14)',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  completeBadgeText: { color: colors.warmAccent, fontSize: 11, fontWeight: '500' },
  controls: { marginTop: spacing.md, gap: spacing.sm },
  navRow: { flexDirection: 'row', gap: spacing.sm },
  navRowRtl: { flexDirection: 'row-reverse' },
  navBtn: {
    flex: 1,
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navBtnDisabled: { opacity: 0.4 },
  navText: { color: colors.text, fontWeight: '500' },
  interruptLabel: {
    color: colors.warn,
    fontWeight: '500',
    fontSize: 12,
    marginTop: 4,
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
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  askBtn: {
    backgroundColor: colors.warn,
    borderRadius: radii.sm,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  askText: { color: colors.onWarnFill, fontWeight: '500' },
  askBtnDisabled: { opacity: 0.4 },
  clarifyBox: {
    marginTop: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    // DESIGN-PRO §5.5: تعبئة وحدها بلا حدّ تأكيد فوقها.
    padding: spacing.md,
  },
  clarifyTitle: { color: colors.text, fontWeight: '500' },
  clarifyLangNote: { color: colors.textMuted, fontSize: 11, marginTop: spacing.sm },
  clarifyTextRtl: { writingDirection: 'rtl' },
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
  },
  resumeText: { color: colors.onAccent, fontWeight: '500' },
});
