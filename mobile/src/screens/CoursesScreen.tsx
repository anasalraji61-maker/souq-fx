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

  useEffect(() => {
    api
      .academySchools()
      .then((r) => setSchools(r.schools))
      .catch(() => undefined);
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
                <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 12 }}>
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
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'right' },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 40 },
  noteBox: {
    backgroundColor: 'rgba(245,158,11,0.12)',
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
    marginTop: 8,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pipeline: { color: colors.textDim, fontSize: 11, marginTop: 8, textAlign: 'right' },
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
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'right',
    lineHeight: 20,
  },
  fallbackNote: {
    color: colors.warn,
    fontSize: 12,
    textAlign: 'right',
    marginTop: -6,
    marginBottom: 12,
  },
  levelBox: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    gap: 8,
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
  lecMeta: { color: colors.textDim, fontSize: 11, marginTop: 4, textAlign: 'right' },
  close: {
    marginTop: 16,
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
  closeText: { color: '#042F2E', fontWeight: '800', fontSize: 15 },
});
