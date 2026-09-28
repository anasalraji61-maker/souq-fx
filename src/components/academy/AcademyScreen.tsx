import React, { useState, useEffect } from 'react';
import { ACADEMY_SCHOOLS, AcademySchool, AcademyLecture } from '../../data/academyData';
import { LectureClassroom } from './LectureClassroom';
import { GraduationCap, BookOpen, CheckCircle, ChevronLeft, Award, Sparkles, Layers } from 'lucide-react';

export const AcademyScreen: React.FC = () => {
  const [selectedSchool, setSelectedSchool] = useState<AcademySchool | null>(null);
  const [activeLecture, setActiveLecture] = useState<AcademyLecture | null>(null);

  // Completed lectures state persisted in localStorage
  const [completedLectures, setCompletedLectures] = useState<string[]>(() => {
    const saved = localStorage.getItem('matrix_academy_completed');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return ['basics-l1-01'];
  });

  useEffect(() => {
    localStorage.setItem('matrix_academy_completed', JSON.stringify(completedLectures));
  }, [completedLectures]);

  const toggleLectureCompletion = (lectureId: string) => {
    if (completedLectures.includes(lectureId)) {
      setCompletedLectures(completedLectures.filter((id) => id !== lectureId));
    } else {
      setCompletedLectures([...completedLectures, lectureId]);
    }
  };

  // Calculate total lectures and progress
  let totalLecturesCount = 0;
  ACADEMY_SCHOOLS.forEach((school) => {
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
        onToggleComplete={toggleLectureCompletion}
      />
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 select-none text-xs">
      {/* Title & Progress Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#243049]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#E8EEF9]">أكاديمية MATRIX للتداول والتحليل الفني</h1>
            <p className="text-[#7B8DA8]">منهج تدريبي تحليلي متكامل من أساسيات التداول وحتى مدارس السيولة المتقدمة.</p>
          </div>
        </div>

        {/* Overall Progress Ribbon */}
        <div className="flex items-center gap-3 bg-[#121A2B] px-4 py-2 rounded-xl border border-[#243049]">
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

      {/* School Detail View (if school selected) */}
      {selectedSchool ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#121A2B] p-4 rounded-xl border border-[#243049]">
            <div>
              <div className="flex items-center gap-2 text-[#2DD4BF] font-semibold text-xs mb-1">
                <button
                  onClick={() => setSelectedSchool(null)}
                  className="hover:underline flex items-center gap-1"
                >
                  المدارس التعليمية
                </button>
                <span>/</span>
                <span>{selectedSchool.name_ar}</span>
              </div>
              <h2 className="text-lg font-bold text-[#E8EEF9]">{selectedSchool.name_ar}</h2>
              <p className="text-[#7B8DA8] text-xs mt-1">{selectedSchool.summary}</p>
            </div>

            <button
              onClick={() => setSelectedSchool(null)}
              className="px-3 py-1.5 rounded-lg bg-[#162033] hover:bg-[#1E293B] border border-[#243049] text-[#E8EEF9]"
            >
              الرجوع لكافة المدارس
            </button>
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
                        className="p-4 flex items-center justify-between hover:bg-[#162033]/60 cursor-pointer transition-colors"
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
        /* Schools Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ACADEMY_SCHOOLS.map((school) => {
            // Count completed in this school
            let schoolLecturesCount = 0;
            let schoolCompletedCount = 0;
            school.levels.forEach((l) => {
              l.lectures.forEach((lec) => {
                schoolLecturesCount++;
                if (completedLectures.includes(lec.id)) schoolCompletedCount++;
              });
            });

            const schoolPct = Math.round((schoolCompletedCount / (schoolLecturesCount || 1)) * 100);

            return (
              <div
                key={school.id}
                onClick={() => setSelectedSchool(school)}
                className="p-5 bg-[#121A2B] hover:bg-[#162033] rounded-xl border border-[#243049] hover:border-[#2DD4BF]/50 cursor-pointer transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20">
                      {school.name_en}
                    </span>
                    <span className="text-[11px] text-[#7B8DA8] font-mono">
                      {schoolCompletedCount} / {schoolLecturesCount} مكتمل
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#E8EEF9] group-hover:text-[#2DD4BF] transition-colors">
                    {school.name_ar}
                  </h3>
                  <p className="text-[#A3B4D0] leading-relaxed text-xs mt-1.5">{school.summary}</p>
                </div>

                <div>
                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-[#0B1220] rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-[#2DD4BF]"
                      style={{ width: `${schoolPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[#7B8DA8] text-xs pt-1 border-t border-[#243049]/40">
                    <span>{school.levels_count} مستويات • {schoolLecturesCount} محاضرات</span>
                    <span className="text-[#2DD4BF] font-semibold group-hover:translate-x-[-4px] transition-transform flex items-center">
                      استعراض الدروس ←
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
