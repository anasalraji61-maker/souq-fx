import { AcademyLecture, AcademySchool } from '../../data/academyData';
import type { LangId } from '../../i18n/locales';

/** Lectures of a school in teaching order, with their level number. */
export function orderedLectures(school: AcademySchool): { lecture: AcademyLecture; level: number }[] {
  return [...school.levels]
    .sort((a, b) => a.level - b.level)
    .flatMap((lvl) => lvl.lectures.map((lecture) => ({ lecture, level: lvl.level })));
}

/** A level is unlocked when it is the first one or every lecture of the previous level is completed. */
export function isLevelUnlocked(school: AcademySchool, level: number, completed: string[]): boolean {
  const levels = [...school.levels].sort((a, b) => a.level - b.level);
  const idx = levels.findIndex((l) => l.level === level);
  if (idx <= 0) return true;
  return levels[idx - 1].lectures.every((l) => completed.includes(l.id));
}

export function isLectureUnlocked(school: AcademySchool, lectureId: string, completed: string[]): boolean {
  const item = orderedLectures(school).find((x) => x.lecture.id === lectureId);
  return item ? isLevelUnlocked(school, item.level, completed) : false;
}

/** First lecture not completed yet among the unlocked levels (null when the course is finished). */
export function nextLecture(school: AcademySchool, completed: string[]): AcademyLecture | null {
  for (const { lecture, level } of orderedLectures(school)) {
    if (!isLevelUnlocked(school, level, completed)) return null;
    if (!completed.includes(lecture.id)) return lecture;
  }
  return null;
}

export function schoolName(s: AcademySchool, lang: LangId): string {
  return lang === 'en-US' ? s.name_en : s.name_ar;
}

export function schoolSummary(s: AcademySchool, lang: LangId): string {
  return lang === 'en-US' ? s.summary_en || s.summary : s.summary;
}

/** Arabic content language note: lecture texts are Arabic for now. */
export function contentIsArabic(lang: LangId): boolean {
  return lang !== 'ar';
}
