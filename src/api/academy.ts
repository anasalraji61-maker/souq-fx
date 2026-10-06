import { apiClient } from './client';
import { getToken } from './session';
import { ACADEMY_SCHOOLS, AcademySchool } from '../data/academyData';

/**
 * Academy progress and completion certificates.
 *  - Guests: progress and certificates live on this device (localStorage).
 *  - Signed in: the server is the source of truth (/api/academy/progress...). Lectures completed as a guest on
 *    this device are uploaded once after sign-in so nothing is lost.
 *  - No invented data: no pre-completed lectures, no grades (there is no graded exam).
 */

export interface CourseProgress {
  school_id: string;
  total_lectures: number;
  completed_lectures: number;
  progress_pct: number;
}

export interface CertificateItem {
  id: string;
  school_id: string;
  course_name: string;
  /** seconds UTC (server) or ISO string (older local certificates) */
  issued_at: number | string;
  /** true for a certificate kept only on this device (guest) */
  local?: boolean;
}

const STORAGE_PROGRESS_KEY = 'matrix_academy_completed';
const STORAGE_CERTS_KEY = 'matrix_academy_certificates';
const STORAGE_LAST_KEY = 'matrix.academy.last.v1';
const STORAGE_NAME_KEY = 'matrix.academy.certname.v1';

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked
  }
}

function localCompleted(): string[] {
  const v = readLocal<unknown>(STORAGE_PROGRESS_KEY, []);
  return Array.isArray(v) ? v.filter((i): i is string => typeof i === 'string') : [];
}

/** Curriculum in use: the server's (same ids the progress API accepts, shared with the mobile app). */
let currentSchools: AcademySchool[] = ACADEMY_SCHOOLS;

type RawLecture = AcademySchool['levels'][number]['lectures'][number];

function words(t: string): Set<string> {
  return new Set(
    (t || '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

/** Same lecture topic? (ids were reused for different lessons between the two curricula) */
function sameTopic(a: string, b: string): boolean {
  const A = words(a);
  const B = words(b);
  if (!A.size || !B.size) return false;
  let inter = 0;
  A.forEach((w) => B.has(w) && inter++);
  return inter / Math.min(A.size, B.size) >= 0.5;
}

function mergeSchool(raw: AcademySchool): AcademySchool {
  const local = ACADEMY_SCHOOLS.find((s) => s.id === raw.id);
  const localLecture = (id: string) => local?.levels.flatMap((l) => l.lectures).find((l) => l.id === id);
  const levels = (Array.isArray(raw.levels) ? raw.levels : []).map((lvl) => ({
    ...lvl,
    lectures: (Array.isArray(lvl.lectures) ? lvl.lectures : []).map((lec: RawLecture) => {
      const cand = localLecture(lec.id);
      const ll = cand && sameTopic(cand.title, lec.title) ? cand : undefined;
      return {
        ...lec,
        outline: Array.isArray(lec.outline) ? lec.outline : [],
        script_segments: Array.isArray(lec.script_segments) ? lec.script_segments : [],
        // quizzes and illustrations exist in the app's copy only, for matching lectures
        quiz: lec.quiz ?? ll?.quiz,
        chartConcept: lec.chartConcept ?? ll?.chartConcept,
      };
    }),
  }));
  return {
    ...raw,
    summary_en: raw.summary_en || local?.summary_en || '',
    levels,
    levels_count: levels.length,
    lectures_count: levels.reduce((n, l) => n + l.lectures.length, 0),
  };
}

export async function fetchSchools(): Promise<{ schools: AcademySchool[]; isOffline: boolean }> {
  const res = await apiClient.get<{ schools?: { id: string }[] }>('/api/academy/schools');
  if (res.ok && res.data && Array.isArray(res.data.schools) && res.data.schools.length > 0) {
    const details = await Promise.all(
      res.data.schools.map((s) => apiClient.get<AcademySchool>(`/api/academy/schools/${encodeURIComponent(s.id)}`))
    );
    if (details.every((d) => d.ok && d.data && Array.isArray(d.data.levels))) {
      currentSchools = details.map((d) => mergeSchool(d.data as AcademySchool)).sort((a, b) => a.order - b.order);
      return { schools: currentSchools, isOffline: false };
    }
  }
  // Offline: the copy shipped with the app.
  currentSchools = ACADEMY_SCHOOLS;
  return { schools: ACADEMY_SCHOOLS, isOffline: true };
}

function schoolOf(lectureId: string): string | null {
  for (const s of currentSchools) {
    for (const l of s.levels) if (l.lectures.some((x) => x.id === lectureId)) return s.id;
  }
  return null;
}

let uploadedOnce = false;

export async function fetchSchoolProgress(): Promise<{
  completedLectureIds: string[];
  courseProgress: Record<string, CourseProgress>;
  isOffline: boolean;
  signedIn: boolean;
}> {
  const local = localCompleted();
  if (!getToken()) {
    return { completedLectureIds: local, courseProgress: calculateLocalProgress(local), isOffline: false, signedIn: false };
  }
  const res = await apiClient.get<{ completed?: string[] }>('/api/academy/progress/courses');
  if (res.ok && res.data) {
    const server = Array.isArray(res.data.completed) ? res.data.completed : [];
    const missing = local.filter((id) => !server.includes(id));
    if (missing.length && !uploadedOnce) {
      uploadedOnce = true;
      // best effort: lectures finished as a guest on this device
      void Promise.all(
        missing.map((id) => {
          const sid = schoolOf(id);
          return sid
            ? apiClient.post('/api/academy/progress', { lecture_id: id, school_id: sid, segment_index: 0, completed: true })
            : Promise.resolve(null);
        })
      );
    }
    const ids = Array.from(new Set([...server, ...missing]));
    return { completedLectureIds: ids, courseProgress: calculateLocalProgress(ids), isOffline: false, signedIn: true };
  }
  return { completedLectureIds: local, courseProgress: calculateLocalProgress(local), isOffline: true, signedIn: true };
}

export async function markLectureComplete(
  lectureId: string,
  schoolId: string
): Promise<{ completed: boolean; completedIds: string[]; synced: boolean }> {
  const ids = localCompleted();
  if (!ids.includes(lectureId)) {
    ids.push(lectureId);
    writeLocal(STORAGE_PROGRESS_KEY, ids);
  }
  let synced = false;
  if (getToken()) {
    const r = await apiClient.post('/api/academy/progress', {
      lecture_id: lectureId,
      school_id: schoolId,
      segment_index: 0,
      completed: true,
    });
    synced = r.ok;
  }
  return { completed: true, completedIds: ids, synced };
}

interface RawCert {
  id?: string;
  school_id?: string;
  course_name?: string;
  issued_at?: number | string;
}

function schoolName(id: string): string {
  return currentSchools.find((s) => s.id === id)?.name_ar || id;
}

export async function fetchCertificates(): Promise<{ certificates: CertificateItem[]; isOffline: boolean }> {
  const local = readLocal<CertificateItem[]>(STORAGE_CERTS_KEY, []).filter((c) => c && c.id && c.school_id);
  if (!getToken()) return { certificates: local.map((c) => ({ ...c, local: true })), isOffline: false };
  const res = await apiClient.get<RawCert[]>('/api/academy/progress/certificates');
  if (res.ok && Array.isArray(res.data)) {
    const server = res.data.map((c) => ({
      id: String(c.id || ''),
      school_id: String(c.school_id || ''),
      course_name: c.school_id ? schoolName(String(c.school_id)) : String(c.course_name || ''),
      issued_at: c.issued_at ?? '',
    }));
    // keep device-only certificates for schools the server has not issued yet
    const extra = local.filter((l) => !server.some((s) => s.school_id === l.school_id)).map((c) => ({ ...c, local: true }));
    return { certificates: [...server, ...extra], isOffline: false };
  }
  return { certificates: local.map((c) => ({ ...c, local: true })), isOffline: true };
}

export async function claimCourseCertificate(
  schoolId: string
): Promise<{ ok: true; certificate: CertificateItem } | { ok: false; reason: 'not_complete' | 'network' | 'server' }> {
  if (getToken()) {
    const res = await apiClient.post<{ certificate?: RawCert }>(`/api/academy/progress/courses/${encodeURIComponent(schoolId)}/certificate`, {});
    if (res.ok && res.data?.certificate) {
      const c = res.data.certificate;
      return {
        ok: true,
        certificate: { id: String(c.id), school_id: schoolId, course_name: schoolName(schoolId), issued_at: c.issued_at ?? Date.now() / 1000 },
      };
    }
    if (res.status === 409) return { ok: false, reason: 'not_complete' };
    return { ok: false, reason: res.status === 0 ? 'network' : 'server' };
  }
  const certs = readLocal<CertificateItem[]>(STORAGE_CERTS_KEY, []);
  const existing = certs.find((c) => c.school_id === schoolId);
  if (existing) return { ok: true, certificate: { ...existing, local: true } };
  const rnd = (() => {
    try {
      const b = new Uint8Array(4);
      crypto.getRandomValues(b);
      return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    } catch {
      return Math.random().toString(16).slice(2, 10).toUpperCase();
    }
  })();
  const cert: CertificateItem = {
    id: `LOCAL-${schoolId.toUpperCase()}-${rnd}`,
    school_id: schoolId,
    course_name: schoolName(schoolId),
    issued_at: Math.floor(Date.now() / 1000),
  };
  writeLocal(STORAGE_CERTS_KEY, [...certs, cert]);
  return { ok: true, certificate: { ...cert, local: true } };
}

export function calculateLocalProgress(completedIds: string[]): Record<string, CourseProgress> {
  const result: Record<string, CourseProgress> = {};
  currentSchools.forEach((school) => {
    let total = 0;
    let completed = 0;
    school.levels.forEach((lvl) => {
      lvl.lectures.forEach((lec) => {
        total++;
        if (completedIds.includes(lec.id)) completed++;
      });
    });
    result[school.id] = {
      school_id: school.id,
      total_lectures: total,
      completed_lectures: completed,
      progress_pct: Math.round((completed / (total || 1)) * 100),
    };
  });
  return result;
}

/** Last lecture opened (for "continue where you left off"). */
export function getLastLecture(): { schoolId: string; lectureId: string } | null {
  const v = readLocal<{ schoolId?: string; lectureId?: string } | null>(STORAGE_LAST_KEY, null);
  return v && v.schoolId && v.lectureId ? { schoolId: v.schoolId, lectureId: v.lectureId } : null;
}

export function setLastLecture(schoolId: string, lectureId: string) {
  writeLocal(STORAGE_LAST_KEY, { schoolId, lectureId });
}

/** Name printed on certificates (kept on this device only). */
export function getCertificateName(): string {
  return readLocal<string>(STORAGE_NAME_KEY, '');
}

export function setCertificateName(name: string) {
  writeLocal(STORAGE_NAME_KEY, name.slice(0, 60));
}
