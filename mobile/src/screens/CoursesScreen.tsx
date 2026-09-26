import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing, buttons, numeric } from '../theme';
import { api } from '../api';
import {
  mockAcademySchools,
  type AcademySchool,
  type AcademySchoolSummary,
  type AcademyLecture,
} from '../academy';
import { LectureClassroom } from '../components/LectureClassroom';
import { useI18n } from '../i18n/I18nContext';

/** name_ar/name_en (و summary/summary_en) حقلان ثنائيا اللغة على بيانات المدرسة نفسها (كتالوج
 * محتوى، لا نص واجهة ثابت عبر Dict) — كانا موجودين بالنوع من البداية لكن `name_en`/`summary_en`
 * لم يُستخدَما إطلاقاً بالعرض (`name_ar`/`summary` فقط، بصرف النظر عن اللغة المختارة). لا حقل
 * `_ku` منفصل (نفس نمط الملف الأصلي: ar/en فقط)، فتُستخدَم النسخة الإنجليزية لأي لغة غير عربية
 * (بضمنها الكردية) — نفس قرار "الإنجليزية محور اللغات غير العربية" المتَّبع بأماكن أخرى للمحتوى
 * (لا نصوص الواجهة الثابتة التي تغطّي الأربع لغات عبر Dict). راجع HANDOFF.md. */
/** backend-r55: مدّة السرد بالدقائق من الخادم، أو `null` (قيمة غائبة/غير صالحة) ⇒ لا تُعرض. */
function lectureMinutes(l: { duration_min?: number | null }): number | null {
  const m = l.duration_min;
  return typeof m === 'number' && Number.isFinite(m) && m > 0 ? m : null;
}
function schoolName(s: { name_ar: string; name_en: string }, lang: string): string {
  return lang === 'ar' ? s.name_ar : s.name_en;
}
function schoolSummary(s: { summary: string; summary_en?: string }, lang: string): string {
  return lang === 'ar' ? s.summary : s.summary_en ?? s.summary;
}

export function CoursesScreen() {
  const { t, rtl, lang } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [schools, setSchools] = useState<AcademySchoolSummary[]>(mockAcademySchools);
  const [school, setSchool] = useState<AcademySchool | null>(null);
  const [loadingSchool, setLoadingSchool] = useState(false);
  const [schoolFallback, setSchoolFallback] = useState(false);
  const [activeLecture, setActiveLecture] = useState<{
    schoolId: string;
    lectureId: string;
  } | null>(null);
  /** وضوح الحالة: يعلم المستخدم إذا فشل تحميل قائمة المدارس بدل صمت كامل (كانت الأخطاء تُبتلَع
   * بلا أي إشعار — نفس نمط "تعذر تحميل... تُعرض بيانات محفوظة" المستخدَم بباقي اللوحات المشابهة
   * [NewsPanel/GroupChatPanel/VotePanel/MessagesScreen] التي تُبذَر ببيانات mock ثم تحاول التحميل
   * الحي؛ لا تُفعَّل قبل أول محاولة فعلية — لا ادّعاء فشل قبل حدوثه). */
  const [schoolsStale, setSchoolsStale] = useState(false);
  /** جيل طلب فتح المدرسة: يُزاد عند كل فتح وعند الإلغاء، فيُهمَل ردّ أي طلب لم يعد مطلوباً
   * (إلغاء المتداول، أو إلغاء تركيب الشاشة بتبديل التبويب أثناء الجلب). */
  const openGen = useRef(0);
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );

  useEffect(() => {
    // حارس "alive" يمنع تحديث الحالة بعد إلغاء تركيب الشاشة قبل اكتمال الطلب — نفس نمط
    // ChartFrame/SymbolSnapshot/FocusChartModal المؤسَّس بالكود.
    let alive = true;
    api
      .academySchools()
      .then((r) => {
        if (alive) {
          setSchools(r.schools);
          setSchoolsStale(false);
        }
      })
      .catch(() => {
        if (alive) setSchoolsStale(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  /** إلغاء الفتح: يغلق الورقة ويُبطل ردّ الطلب الجاري بزيادة الجيل. */
  const cancelOpen = () => {
    openGen.current += 1;
    setLoadingSchool(false);
    setSchool(null);
  };

  const openSchool = async (id: string) => {
    // نقرة ثانية على بطاقة أخرى أثناء الجلب كانت تُطلق طلباً ثانياً ويفوز أبطؤهما بالعرض.
    if (loadingSchool) return;
    const gen = openGen.current + 1;
    openGen.current = gen;
    const fresh = () => mounted.current && openGen.current === gen;
    setLoadingSchool(true);
    setSchoolFallback(false);
    try {
      const detail = await api.academySchool(id);
      if (!fresh()) return;
      setSchool(detail);
    } catch {
      if (!fresh()) return;
      const summary = schools.find((s) => s.id === id);
      if (summary) {
        setSchoolFallback(true);
        setSchool({
          ...summary,
          levels: [
            {
              level: 1,
              title: t.coursesFallbackLevelTitle,
              lectures_count: 1,
              lectures: [
                {
                  id: `${id}-demo`,
                  title: t.coursesFallbackLectureTitle,
                  duration_min: null,
                  format: 'classroom',
                  video_status: 'script_ready',
                  outline: [t.coursesFallbackOutlineIntro],
                  script_segments: [],
                } as AcademyLecture,
              ],
            },
          ],
        });
      }
    } finally {
      if (mounted.current && openGen.current === gen) setLoadingSchool(false);
    }
  };

  if (activeLecture) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <LectureClassroom
          schoolId={activeLecture.schoolId}
          lectureId={activeLecture.lectureId}
          onClose={() => setActiveLecture(null)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={[styles.brand, { textAlign: align }]}>{t.coursesTitle}</Text>
        <Text style={[styles.sub, { textAlign: align }]}>{t.coursesSub}</Text>
        {schoolsStale ? (
          <Text style={[styles.staleNote, { textAlign: align }]}>{t.coursesStaleNote}</Text>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.noteBox}>
          <Text style={[styles.noteTitle, { textAlign: align }]}>{t.coursesNoteTitle}</Text>
          <Text style={[styles.noteText, { textAlign: align }]}>{t.coursesNoteText}</Text>
        </View>

        {schools.map((s) => (
          <Pressable
            accessibilityRole="button"
            key={s.id}
            style={({ pressed }) => [
              styles.card,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => openSchool(s.id)}
            accessibilityLabel={`${t.coursesSchoolA11yPrefix}: ${schoolName(s, lang)}`}
          >
            <View style={[styles.cardTop, rtl && styles.cardTopRtl]}>
              <Text style={styles.order}>#{s.order}</Text>
              <Text style={styles.school}>{schoolName(s, lang)}</Text>
            </View>
            <Text style={[styles.desc, { textAlign: align }]}>{schoolSummary(s, lang)}</Text>
            <View style={[styles.meta, rtl && styles.metaRtl]}>
              <Text style={styles.metaText}>
                {s.levels_count} {t.coursesLevelsWord}
              </Text>
              <Text style={styles.metaText}>
                {s.lectures_count} {t.coursesLecturesUnitWord}
              </Text>
              {/* ما يهمّ المتداول: أن الدرس مشروح صوتياً. اسم مزوّد الـTTS وسلسلة `video_pipeline`
                  (نصّ داخلي إنجليزي من الباك-إند) لا تعنيان له شيئاً ولا تُترجَمان. */}
              <Text style={styles.aiTag}>{t.coursesNarratedBadge}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* الورقة تُفتح **بمجرّد النقر** لا بعد وصول الردّ: كانت `visible={!!school}` وحدها، و`school`
          دائماً `null` لحظة النقر (تُمسح عند الإغلاق)، فكان مؤشّر التحميل بداخلها شيفرةً ميتة —
          يضغط المتداول بطاقة المدرسة فلا يحدث **شيء مرئي** حتى يردّ الخادم. */}
      <Modal
        visible={!!school || loadingSchool}
        animationType="slide"
        transparent
        onRequestClose={cancelOpen}
      >
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            {loadingSchool ? (
              <>
                <ActivityIndicator color={colors.accent} />
                {/* مخرج أثناء الجلب: بلا هذا الزر يبقى مستخدم iOS محبوساً بورقة مؤشّر
                    (زر الرجوع بأندرويد وحده كان يغلقها). */}
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.close,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={cancelOpen}
                  hitSlop={8}
                  accessibilityLabel={t.coursesBackToSchoolsA11y}
                >
                  <Text style={styles.closeText}>{t.coursesBack}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.modalSchool, { textAlign: align }]}>
                  {school ? schoolName(school, lang) : ''}
                </Text>
                <Text style={[styles.modalDesc, { textAlign: align }]}>
                  {school ? schoolSummary(school, lang) : ''}
                </Text>
                {schoolFallback ? (
                  <Text style={[styles.fallbackNote, { textAlign: align }]}>
                    {t.coursesFallbackNote}
                  </Text>
                ) : null}
                <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: spacing.md }}>
                  {school?.levels.map((lv) => (
                    <View key={lv.level} style={styles.levelBox}>
                      <Text style={[styles.levelTitle, { textAlign: align }]}>
                        {t.coursesLevelWord} {lv.level}: {lv.title}
                      </Text>
                      {lv.lectures.map((lec) => (
                        <Pressable
                          accessibilityRole="button"
                          key={lec.id}
                          style={({ pressed }) => [
                            styles.lecRow,
                            pressed && {
                              opacity: buttons.pressedOpacity,
                              transform: [{ scale: buttons.pressedScale }],
                            },
                          ]}
                          onPress={() => {
                            const sid = school!.id;
                            setSchool(null);
                            setActiveLecture({ schoolId: sid, lectureId: lec.id });
                          }}
                          accessibilityLabel={`${t.coursesLectureA11yPrefix}: ${lec.title}${lectureMinutes(lec) != null ? ` · ${lectureMinutes(lec)} ${t.coursesMinuteWord}` : ''}`}
                        >
                          <Text style={[styles.lecTitle, { textAlign: align }]}>{lec.title}</Text>
                          {lectureMinutes(lec) != null && (
                            <Text style={[styles.lecMeta, { textAlign: align }]}>
                              {lectureMinutes(lec)} {t.coursesMinuteAbbrev}
                            </Text>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  ))}
                </ScrollView>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.close,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={cancelOpen}
                  hitSlop={8}
                  accessibilityLabel={t.coursesBackToSchoolsA11y}
                >
                  <Text style={styles.closeText}>{t.coursesBack}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  brand: { color: colors.text, fontSize: 24, fontWeight: '500' },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  staleNote: {
    color: colors.warn,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 40 },
  noteBox: {
    backgroundColor: colors.warnSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.warn,
    padding: spacing.md,
  },
  noteTitle: { color: colors.warn, fontWeight: '500' },
  noteText: { color: colors.text, marginTop: 4, lineHeight: 20, fontSize: 13 },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTopRtl: { flexDirection: 'row-reverse' },
  order: { color: colors.textDim, fontWeight: '500' },
  school: { color: colors.accent, fontWeight: '500', fontSize: 16 },
  desc: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaRtl: { flexDirection: 'row-reverse' },
  metaText: { ...numeric, color: colors.textDim, fontSize: 12 },
  aiTag: {
    color: colors.textMuted,
    fontWeight: '500',
    fontSize: 11,
    backgroundColor: colors.borderSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '88%',
  },
  modalSchool: { color: colors.accent, fontWeight: '500', fontSize: 18 },
  modalDesc: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  fallbackNote: {
    color: colors.warn,
    fontSize: 12,
    marginTop: -4,
    marginBottom: spacing.md,
  },
  levelBox: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    gap: spacing.sm,
  },
  levelTitle: { color: colors.text, fontWeight: '500' },
  lecRow: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lecTitle: { color: colors.text, fontWeight: '500' },
  lecMeta: { ...numeric, color: colors.textDim, fontSize: 11, marginTop: spacing.xs },
  close: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeText: { color: colors.onAccent, fontWeight: '500', fontSize: 15 },
});
