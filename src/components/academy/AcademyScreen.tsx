import React, { useState, useEffect } from 'react';
import { AcademySchool, AcademyLecture } from '../../data/academyData';
import {
  fetchSchools,
  fetchSchoolProgress,
  markLectureComplete,
  fetchCertificates,
  claimCourseCertificate,
  CertificateItem,
  CourseProgress,
} from '../../api/academy';
import { LectureClassroom } from './LectureClassroom';
import { CertificateCard } from './CertificateCard';
import { OfflineBadge } from '../common/OfflineBadge';
import { LoadingSkeleton, EmptyState, ErrorState } from '../common/ScreenState';
import {
  GraduationCap,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  Award,
  Sparkles,
  Layers,
  Printer,
  Calendar,
} from 'lucide-react';

export const AcademyScreen: React.FC<{ currentLang?: import('../../i18n/locales').LangId }> = () => {
  const [activeTab, setActiveTab] = useState<'courses' | 'certificates'>('courses');
  const [schools, setSchools] = useState<AcademySchool[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<AcademySchool | null>(null);
  const [activeLecture, setActiveLecture] = useState<AcademyLecture | null>(null);
  const [completedLectures, setCompletedLectures] = useState<string[]>([]);
  const [courseProgressMap, setCourseProgressMap] = useState<Record<string, CourseProgress>>({});
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateItem | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Load Academy Data
  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [schoolsRes, progressRes, certsRes] = await Promise.all([
        fetchSchools(),
        fetchSchoolProgress(),
        fetchCertificates(),
      ]);

      setSchools(schoolsRes.schools);
      setCompletedLectures(progressRes.completedLectureIds);
      setCourseProgressMap(progressRes.courseProgress);
      setCertificates(certsRes.certificates);
      setIsOffline(schoolsRes.isOffline || progressRes.isOffline);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Lecture Complete without full reload (Part 1.2)
  const handleToggleComplete = async (lectureId: string, schoolId: string) => {
    const res = await markLectureComplete(lectureId, schoolId);
    setCompletedLectures(res.completedIds);

    // Update course progress map
    setCourseProgressMap((prev) => {
      const currentCourse = prev[schoolId];
      if (!currentCourse) return prev;
      const completed = currentCourse.completed_lectures + (res.completedIds.includes(lectureId) ? 1 : -1);
      const total = currentCourse.total_lectures || 1;
      return {
        ...prev,
        [schoolId]: {
          ...currentCourse,
          completed_lectures: Math.max(0, completed),
          progress_pct: Math.min(100, Math.round((completed / total) * 100)),
        },
      };
    });
  };

  // Handle Certificate Claim (Part 1.3)
  const handleClaimCertificate = async (school: AcademySchool) => {
    const cert = await claimCourseCertificate(school.id, school.name_ar);
    setCertificates((prev) => (prev.some((c) => c.id === cert.id) ? prev : [...prev, cert]));
    setSelectedCertificate(cert);
  };

  // Total lectures and overall progress
  let totalLecturesCount = 0;
  schools.forEach((school) => {
    school.levels.forEach((lvl) => {
      totalLecturesCount += lvl.lectures.length;
    });
  });

  const overallProgressPct = Math.round((completedLectures.length / (totalLecturesCount || 1)) * 100);

  // If in Classroom mode
  if (selectedSchool && activeLecture) {
    return (
      <LectureClassroom
        school={selectedSchool}
        lecture={activeLecture}
        onBack={() => setActiveLecture(null)}
        isCompleted={completedLectures.includes(activeLecture.id)}
        onToggleComplete={(lecId) => handleToggleComplete(lecId, selectedSchool.id)}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto space-y-6 select-none text-xs pb-28 md:pb-10">
      {/* Educational Disclaimer Banner */}
      <div className="px-3.5 py-2 rounded-xl bg-[#0B1528] border border-[#1E293B] text-[11px] text-[#94A3B8] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#2DD4BF] shrink-0" />
          <span>منهاج تدريبي تحليلي لأغراض تعليمية بحتة • لا تمثل أي مادة تدريبية توصية استثمارية أو مالية.</span>
        </div>
        <span className="text-[10px] text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 shrink-0">
          تعليمي 100%
        </span>
      </div>

      {/* Title & Progress Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#243049]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#E8EEF9]">أكاديمية MATRIX للتحليل الفني والتداول</h1>
              {isOffline && <OfflineBadge forceShow />}
            </div>
            <p className="text-[#7B8DA8]">منهج تدريبي تحليلي متكامل من أساسيات التداول وحتى مدارس السيولة المتقدمة.</p>
          </div>
        </div>

        {/* Overall Progress Ribbon */}
        <div className="flex items-center gap-3 bg-[#121A2B] px-4 py-2 rounded-xl border border-[#243049] shrink-0">
          <Award className="w-5 h-5 text-[#E8B86D]" />
          <div>
            <div className="flex items-center justify-between gap-4 text-[11px]">
              <span className="text-[#A3B4D0]">التقدم الإجمالي:</span>
              <span className="font-mono font-bold text-[#2DD4BF]">{overallProgressPct}%</span>
            </div>
            <div className="w-32 h-1.5 bg-[#0B1220] rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-[#2DD4BF] to-[#22C55E]"
                style={{ width: `${overallProgressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Courses vs Certificates (Part 1.4) */}
      <div className="flex items-center gap-2 border-b border-[#1E283D] pb-1">
        <button
          onClick={() => {
            setActiveTab('courses');
            setSelectedSchool(null);
          }}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors min-h-[44px] cursor-pointer ${
            activeTab === 'courses'
              ? 'bg-[#1C2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
              : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>المسارات التعليمية ({schools.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('certificates')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors min-h-[44px] cursor-pointer ${
            activeTab === 'certificates'
              ? 'bg-[#1C2E4A] text-[#E8B86D] border border-[#E8B86D]/40'
              : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>شهاداتي المعتمدة ({certificates.length})</span>
        </button>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : isError ? (
        <ErrorState onRetry={loadData} />
      ) : activeTab === 'certificates' ? (
        /* 1.4 "شهاداتي" Tab View */
        <div className="space-y-4">
          {certificates.length === 0 ? (
            <EmptyState
              icon={<Award className="w-8 h-8 text-[#E8B86D]" />}
              title="لم تحصل على أي شهادات بعد"
              message="أكمل أحد المسارات التعليمية بنسبة 100% للحصول على شهادة إتمام معتمدة قابلة للطباعة والمشاركة."
              action={
                <button
                  onClick={() => setActiveTab('courses')}
                  className="px-4 py-2 rounded-lg bg-[#2DD4BF] text-[#042F2E] font-bold text-xs hover:brightness-110"
                >
                  استعراض المسارات التدريبية
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="p-5 rounded-2xl bg-gradient-to-br from-[#121A2B] to-[#0D1524] border border-[#E8B86D]/40 flex flex-col justify-between shadow-xl space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#E8B86D]/15 border border-[#E8B86D]/30 flex items-center justify-center text-[#E8B86D]">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-[#E8B86D] block">شهادة معتمدة</span>
                        <h4 className="font-bold text-sm text-white">{cert.course_name}</h4>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] font-mono text-[10px] font-bold">
                      {cert.grade || '100% إتمام'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[#7B8DA8] text-[11px] pt-3 border-t border-[#1E283D]">
                    <div className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{cert.issued_at}</span>
                    </div>
                    <span className="font-mono text-[#A3B4D0]">كود: {cert.id}</span>
                  </div>

                  <button
                    onClick={() => setSelectedCertificate(cert)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1C2740] hover:bg-[#233554] text-[#E8B86D] hover:text-white font-bold text-xs transition-colors border border-[#E8B86D]/30 min-h-[44px] cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>عرض الشهادة وطباعتها</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : selectedSchool ? (
        /* School Detail View */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#121A2B] p-4 rounded-xl border border-[#243049] gap-3">
            <div>
              <div className="flex items-center gap-2 text-[#2DD4BF] font-semibold text-xs mb-1">
                <button
                  onClick={() => setSelectedSchool(null)}
                  className="hover:underline flex items-center gap-1 cursor-pointer"
                >
                  المدارس التعليمية
                </button>
                <span>/</span>
                <span>{selectedSchool.name_ar}</span>
              </div>
              <h2 className="text-lg font-bold text-[#E8EEF9]">{selectedSchool.name_ar}</h2>
              <p className="text-[#7B8DA8] text-xs mt-1">{selectedSchool.summary}</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Claim Certificate Button if 100% (Part 1.3) */}
              {(courseProgressMap[selectedSchool.id]?.progress_pct ?? 0) >= 100 && (
                <button
                  onClick={() => handleClaimCertificate(selectedSchool)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#E8B86D] to-[#F59E0B] text-[#0B1220] font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all animate-pulse min-h-[44px] cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>استلام الشهادة المعتمدة</span>
                </button>
              )}

              <button
                onClick={() => setSelectedSchool(null)}
                className="px-3.5 py-2 rounded-lg bg-[#162033] hover:bg-[#1E293B] border border-[#243049] text-[#E8EEF9] min-h-[44px] cursor-pointer"
              >
                الرجوع لكافة المدارس
              </button>
            </div>
          </div>

          {/* School Levels & Lectures */}
          <div className="space-y-4">
            {selectedSchool.levels.map((lvl) => (
              <div key={lvl.level} className="bg-[#121A2B] rounded-xl border border-[#243049] overflow-hidden">
                <div className="px-4 py-3 bg-[#0E1728] border-b border-[#243049] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#2DD4BF]" />
                    <h3 className="font-bold text-sm text-[#E8EEF9]">
                      المستوى {lvl.level}: {lvl.title}
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#7B8DA8] font-mono">{lvl.lectures.length} محاضرات</span>
                </div>

                <div className="divide-y divide-[#243049]/50">
                  {lvl.lectures.map((lec) => {
                    const isDone = completedLectures.includes(lec.id);
                    return (
                      <div
                        key={lec.id}
                        onClick={() => setActiveLecture(lec)}
                        className="p-4 min-h-[56px] flex items-center justify-between hover:bg-[#162033]/60 cursor-pointer transition-colors active:bg-[#1C283D]"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center ${
                              isDone ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'bg-[#162033] text-[#7B8DA8]'
                            }`}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-[#E8EEF9]">{lec.title}</h4>
                            <div className="flex items-center gap-3 text-[#7B8DA8] text-[11px] mt-0.5">
                              <span>المدة: ~{lec.duration_min} د</span>
                              <span>•</span>
                              <span>{lec.outline.join(' • ')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[#2DD4BF] font-semibold text-xs">
                          <span>فتح القاعة</span>
                          <ChevronLeft className="w-4 h-4" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Schools Grid View (1.1: progress bar per course) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schools.map((school) => {
            const progress = courseProgressMap[school.id];
            const schoolPct = progress?.progress_pct ?? 0;
            const completedCount = progress?.completed_lectures ?? 0;
            const totalCount = progress?.total_lectures ?? school.levels_count * 2;
            const isFinished = schoolPct >= 100;

            return (
              <div
                key={school.id}
                onClick={() => setSelectedSchool(school)}
                className={`p-5 bg-[#121A2B] hover:bg-[#162033] rounded-xl border ${
                  isFinished ? 'border-[#E8B86D]/60' : 'border-[#243049] hover:border-[#2DD4BF]/50'
                } cursor-pointer transition-all flex flex-col justify-between space-y-4 group`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20">
                      {school.name_en}
                    </span>
                    <span className="text-[11px] text-[#7B8DA8] font-mono">
                      {completedCount} / {totalCount} مكتمل ({schoolPct}%)
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#E8EEF9] group-hover:text-[#2DD4BF] transition-colors">
                    {school.name_ar}
                  </h3>
                  <p className="text-[#A3B4D0] leading-relaxed text-xs mt-1.5">{school.summary}</p>
                </div>

                <div>
                  {/* Progress Bar (Part 1.1) */}
                  <div className="w-full h-1.5 bg-[#0B1220] rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full ${isFinished ? 'bg-[#E8B86D]' : 'bg-[#2DD4BF]'}`}
                      style={{ width: `${schoolPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[#7B8DA8] text-xs pt-1 border-t border-[#243049]/40">
                    <span>{school.levels_count} مستويات • {totalCount} محاضرات</span>
                    {isFinished ? (
                      <span className="text-[#E8B86D] font-bold flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        <span>مكتمل 100%</span>
                      </span>
                    ) : (
                      <span className="text-[#2DD4BF] font-semibold group-hover:translate-x-[-4px] transition-transform flex items-center">
                        استعراض الدروس ←
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Certificate Modal Dialog */}
      {selectedCertificate && (
        <CertificateCard
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}
    </div>
  );
};
