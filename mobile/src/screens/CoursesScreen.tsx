import React, { useEffect, useState } from 'react';
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
import { colors, radii, spacing, buttons } from '../theme';
import { api } from '../api';
import {
  mockAcademySchools,
  type AcademySchool,
  type AcademySchoolSummary,
  type AcademyLecture,
} from '../academy';
import { LectureClassroom } from '../components/LectureClassroom';

export function CoursesScreen() {
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

  useEffect(() => {
    api
      .academySchools()
      .then((r) => {
        setSchools(r.schools);
        setSchoolsStale(false);
      })
      .catch(() => setSchoolsStale(true));
  }, []);

  const openSchool = async (id: string) => {
    setLoadingSchool(true);
    setSchoolFallback(false);
    try {
      const detail = await api.academySchool(id);
      setSchool(detail);
    } catch {
      const summary = schools.find((s) => s.id === id);
      if (summary) {
        setSchoolFallback(true);
        setSchool({
          ...summary,
          levels: [
            {
              level: 1,
              title: 'التأسيس',
              lectures_count: 1,
              lectures: [
                {
                  id: `${id}-demo`,
                  title: 'محاضرة افتتاحية',
                  duration_min: 20,
                  format: 'classroom',
                  video_status: 'script_ready',
                  outline: ['مقدمة'],
                  script_segments: [],
                } as AcademyLecture,
              ],
            },
          ],
        });
      }
    } finally {
      setLoadingSchool(false);
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
        <Text style={styles.brand}>الأكاديمية</Text>
        <Text style={styles.sub}>
          شاشة كاملة · شرح صوتي · أوقف واسأل عن أي جزء
        </Text>
        {schoolsStale ? (
          <Text style={styles.staleNote}>تعذر تحديث قائمة المدارس — تُعرض بيانات محفوظة</Text>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>تصنيف مهم</Text>
          <Text style={styles.noteText}>
            BOS و CHOCH ضمن جماعة Order Block و Fair Value Gap داخل مدرسة ICT/SMC — وليست مدرسة
            منفصلة.
          </Text>
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
            accessibilityLabel={`مدرسة: ${s.name_ar}`}
          >
            <View style={styles.cardTop}>
              <Text style={styles.order}>#{s.order}</Text>
              <Text style={styles.school}>{s.name_ar}</Text>
            </View>
            <Text style={styles.desc}>{s.summary}</Text>
            <View style={styles.meta}>
              <Text style={styles.metaText}>{s.levels_count} مستويات</Text>
              <Text style={styles.metaText}>{s.lectures_count} محاضرة</Text>
              <Text style={styles.aiTag}>صوت ElevenLabs</Text>
            </View>
            <Text style={styles.pipeline}>الصوت: {s.classroom.video_pipeline}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={!!school} animationType="slide" transparent onRequestClose={() => setSchool(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            {loadingSchool ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                <Text style={styles.modalSchool}>{school?.name_ar}</Text>
                <Text style={styles.modalDesc}>{school?.summary}</Text>
                {schoolFallback ? (
                  <Text style={styles.fallbackNote}>
                    تعذر تحميل المنهج الكامل — تُعرض محاضرة افتتاحية مؤقتة فقط
                  </Text>
                ) : null}
                <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: spacing.md }}>
                  {school?.levels.map((lv) => (
                    <View key={lv.level} style={styles.levelBox}>
                      <Text style={styles.levelTitle}>
                        المستوى {lv.level}: {lv.title}
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
                          accessibilityLabel={`محاضرة: ${lec.title} · ${lec.duration_min} دقيقة`}
                        >
                          <Text style={styles.lecTitle}>{lec.title}</Text>
                          <Text style={styles.lecMeta}>{lec.duration_min} د · محاضرة كاملة</Text>
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
                  onPress={() => setSchool(null)}
                  hitSlop={8}
                  accessibilityLabel="رجوع لقائمة المدارس"
                >
                  <Text style={styles.closeText}>رجوع</Text>
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
  brand: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'right' },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs, textAlign: 'right' },
  staleNote: {
    color: colors.warn,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 6,
  },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 40 },
  noteBox: {
    backgroundColor: colors.warnSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.warn,
    padding: spacing.md,
  },
  noteTitle: { color: colors.warn, fontWeight: '800', textAlign: 'right' },
  noteText: { color: colors.text, marginTop: 6, textAlign: 'right', lineHeight: 20, fontSize: 13 },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  order: { color: colors.textDim, fontWeight: '700' },
  school: { color: colors.accent, fontWeight: '800', fontSize: 16 },
  desc: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: 'right',
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaText: { color: colors.textDim, fontSize: 12 },
  aiTag: {
    color: colors.dxy,
    fontWeight: '800',
    fontSize: 11,
    backgroundColor: 'rgba(56,189,248,0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pipeline: { color: colors.textDim, fontSize: 11, marginTop: spacing.sm, textAlign: 'right' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '88%',
  },
  modalSchool: { color: colors.accent, fontWeight: '800', fontSize: 18, textAlign: 'right' },
  modalDesc: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    textAlign: 'right',
    lineHeight: 20,
  },
  fallbackNote: {
    color: colors.warn,
    fontSize: 12,
    textAlign: 'right',
    marginTop: -6,
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
  levelTitle: { color: colors.text, fontWeight: '800', textAlign: 'right' },
  lecRow: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lecTitle: { color: colors.text, fontWeight: '700', textAlign: 'right' },
  lecMeta: { color: colors.textDim, fontSize: 11, marginTop: spacing.xs, textAlign: 'right' },
  close: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  closeText: { color: colors.onAccent, fontWeight: '800', fontSize: 15 },
});
