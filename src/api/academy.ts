import { apiClient } from './client';
import { ACADEMY_SCHOOLS, AcademySchool, AcademyLecture } from '../data/academyData';

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
  student_name: string;
  issued_at: string;
  grade?: string;
}

const STORAGE_PROGRESS_KEY = 'matrix_academy_completed';
const STORAGE_CERTS_KEY = 'matrix_academy_certificates';

export async function fetchSchools(): Promise<{ schools: AcademySchool[]; isOffline: boolean }> {
  const res = await apiClient.get<AcademySchool[]>('/api/academy/schools');
  if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
    return { schools: res.data, isOffline: false };
  }
  return { schools: ACADEMY_SCHOOLS, isOffline: true };
}

export async function fetchSchoolProgress(): Promise<{
  completedLectureIds: string[];
  courseProgress: Record<string, CourseProgress>;
  isOffline: boolean;
}> {
  let localCompleted: string[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_PROGRESS_KEY);
    localCompleted = raw ? JSON.parse(raw) : ['basics-l1-01'];
  } catch {
    localCompleted = ['basics-l1-01'];
  }

  const res = await apiClient.get<{ completed: string[]; courses: Record<string, CourseProgress> }>(
    '/api/academy/progress/courses'
  );

  if (res.ok && res.data) {
    const ids = res.data.completed || localCompleted;
    return {
      completedLectureIds: ids,
      courseProgress: res.data.courses || calculateLocalProgress(ids),
      isOffline: false,
    };
  }

  return {
    completedLectureIds: localCompleted,
    courseProgress: calculateLocalProgress(localCompleted),
    isOffline: true,
  };
}

export async function markLectureComplete(
  lectureId: string,
  schoolId: string
): Promise<{ completed: boolean; completedIds: string[] }> {
  // Update local storage first
  let localCompleted: string[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_PROGRESS_KEY);
    localCompleted = raw ? JSON.parse(raw) : [];
  } catch {}

  if (!localCompleted.includes(lectureId)) {
    localCompleted.push(lectureId);
    try {
      localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(localCompleted));
    } catch {}
  }

  // Attempt backend update
  await apiClient.post('/api/academy/progress', {
    lecture_id: lectureId,
    school_id: schoolId,
    completed: true,
  });

  return { completed: true, completedIds: localCompleted };
}

export async function fetchCertificates(): Promise<{ certificates: CertificateItem[]; isOffline: boolean }> {
  let localCerts: CertificateItem[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_CERTS_KEY);
    localCerts = raw ? JSON.parse(raw) : [];
  } catch {}

  const res = await apiClient.get<CertificateItem[]>('/api/academy/progress/certificates');
  if (res.ok && Array.isArray(res.data)) {
    return { certificates: res.data, isOffline: false };
  }

  return { certificates: localCerts, isOffline: true };
}

export async function claimCourseCertificate(
  schoolId: string,
  courseName: string,
  studentName: string = 'متداول MATRIX'
): Promise<CertificateItem> {
  const newCert: CertificateItem = {
    id: `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    school_id: schoolId,
    course_name: courseName,
    student_name: studentName,
    issued_at: new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    grade: 'امتياز (Honor Distinction)',
  };

  // Persist locally
  try {
    const raw = localStorage.getItem(STORAGE_CERTS_KEY);
    const certs: CertificateItem[] = raw ? JSON.parse(raw) : [];
    if (!certs.some((c) => c.school_id === schoolId)) {
      certs.push(newCert);
      localStorage.setItem(STORAGE_CERTS_KEY, JSON.stringify(certs));
    }
  } catch {}

  // Sync to backend
  await apiClient.post(`/api/academy/progress/courses/${schoolId}/certificate`, {
    student_name: studentName,
  });

  return newCert;
}

export function calculateLocalProgress(completedIds: string[]): Record<string, CourseProgress> {
  const result: Record<string, CourseProgress> = {};

  ACADEMY_SCHOOLS.forEach((school) => {
    let total = 0;
    let completed = 0;

    school.levels.forEach((lvl) => {
      lvl.lectures.forEach((lec) => {
        total++;
        if (completedIds.includes(lec.id)) {
          completed++;
        }
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
