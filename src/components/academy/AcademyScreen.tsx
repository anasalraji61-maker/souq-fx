import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AcademySchool, AcademyLecture } from '../../data/academyData';
import {
  fetchSchools,
  fetchSchoolProgress,
  markLectureComplete,
  fetchCertificates,
  claimCourseCertificate,
  getLastLecture,
  setLastLecture,
  CertificateItem,
  CourseProgress,
  calculateLocalProgress,
} from '../../api/academy';
import { LectureClassroom } from './LectureClassroom';
import { CertificateCard } from './CertificateCard';
import { LoadingSkeleton, EmptyState, ErrorState } from '../common/ScreenState';
import { GraduationCap, BookOpen, CheckCircle2, Award, Lock, PlayCircle, Layers, Printer, Calendar, Info, ArrowRight, ArrowLeft, Clock } from 'lucide-react';
import { LangId, gx, fmt, getIntlLocale } from '../../i18n/locales';
import { isLevelUnlocked, nextLecture, orderedLectures, schoolName, schoolSummary, contentIsArabic } from './academyUtils';

/** Circular progress indicator. */
export const ProgressRing: React.FC<{ pct: number; size?: number; stroke?: number; done?: boolean; label?: string }> = ({
  pct,
  size = 56,
  stroke = 5,
  done,
  label,
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label ?? `${p}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1E2B44" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={done ? '#E8B86D' : '#2DD4BF'}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p / 100)}
          style={{ transition: 'stroke-dashoffset 400ms ease' }}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center font-mono font-bold ${size >= 56 ? 'text-[13px]' : 'text-[10px]'} ${done ? 'text-[#E8B86D]' : 'text-[#E8EEF9]'}`}>
        {p}%
      </span>
    </div>
  );
};

export const AcademyScreen: React.FC<{ currentLang?: LangId }> = ({ currentLang = 'ar' }) => {
  const x = gx(currentLang);
  const locale = getIntlLocale(currentLang);
  const rtl = currentLang !== 'en-US';
  const Back = rtl ? ArrowRight : ArrowLeft;
  const [activeTab, setActiveTab] = useState<'courses' | 'certificates'>('courses');
  const [schools, setSchools] = useState<AcademySchool[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<AcademySchool | null>(null);
  const [activeLecture, setActiveLecture] = useState<AcademyLecture | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [progress, setProgress] = useState<Record<string, CourseProgress>>({});
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateItem | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [notice, setNotice] = useState<string | null>(null);
  const [lockedHint, setLockedHint] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setState('loading');
    try {
      const s = await fetchSchools(currentLang); // first: progress maths use the curriculum it loads
      const [p, c] = await Promise.all([fetchSchoolProgress(), fetchCertificates()]);
      setSchools(s.schools);
      setCompleted(p.completedLectureIds);
      setProgress(p.courseProgress);
      setCertificates(c.certificates);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [currentLang]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const complete = async (lectureId: string, schoolId: string) => {
    const r = await markLectureComplete(lectureId, schoolId);
    const ids = Array.from(new Set([...completed, ...r.completedIds, lectureId]));
    setCompleted(ids);
    setProgress(calculateLocalProgress(ids));
  };

  const openLecture = (school: AcademySchool, lecture: AcademyLecture) => {
    setSelectedSchool(school);
    setActiveLecture(lecture);
    setLastLecture(school.id, lecture.id);
  };

  const claim = async (school: AcademySchool) => {
    const r = await claimCourseCertificate(school.id);
    if (r.ok) {
      setCertificates((prev) => (prev.some((c) => c.id === r.certificate.id) ? prev : [...prev, r.certificate]));
      setSelectedCertificate(r.certificate);
    } else {
      setNotice(r.reason === 'not_complete' ? x.a_certNotComplete : r.reason === 'network' ? x.g_networkError : x.g_serverError);
    }
  };

  const totalLectures = useMemo(() => schools.reduce((n, s) => n + orderedLectures(s).length, 0), [schools]);
  const overallPct = Math.round((schools.reduce((n, s) => n + orderedLectures(s).filter((l) => completed.includes(l.lecture.id)).length, 0) / (totalLectures || 1)) * 100);

  // "Continue where you left off": last opened lecture if not done, else the next lecture of that school.
  const resume = useMemo(() => {
    const last = getLastLecture();
    const school = last ? schools.find((s) => s.id === last.schoolId) : schools.find((s) => (progress[s.id]?.completed_lectures ?? 0) > 0 && (progress[s.id]?.progress_pct ?? 0) < 100);
    if (!school) return null;
    const lastLec = last ? orderedLectures(school).find((l) => l.lecture.id === last.lectureId)?.lecture : undefined;
    const lec = lastLec && !completed.includes(lastLec.id) ? lastLec : nextLecture(school, completed);
    return lec ? { school, lecture: lec } : null;
  }, [schools, completed, progress, activeLecture]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmtDate = (v: number | string) => {
    const d = typeof v === 'number' ? new Date(v * 1000) : new Date(v);
    return Number.isNaN(d.getTime()) ? String(v) : new Intl.DateTimeFormat(locale, { dateStyle: 'long', numberingSystem: 'latn' }).format(d);
  };

  if (selectedSchool && activeLecture) {
    return (
      <LectureClassroom
        school={selectedSchool}
        lecture={activeLecture}
        completed={completed}
        currentLang={currentLang}
        onBack={() => setActiveLecture(null)}
        onOpenLecture={(lec) => openLecture(selectedSchool, lec)}
        onComplete={(lecId) => complete(lecId, selectedSchool.id)}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto" data-testid="academy">
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5 text-xs pb-28 md:pb-10">
        <div className="px-3.5 py-2 rounded-xl bg-[#0B1528] border border-[#1E293B] text-[11px] text-[#94A3B8] flex items-center gap-2">
          <Info className="w-4 h-4 text-[#2DD4BF] shrink-0" />
          <span>{x.a_eduBanner}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#243049]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#E8EEF9]">{x.a_title}</h1>
              <p className="text-[#7B8DA8]">{x.a_sub}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-[#121A2B] px-4 py-2.5 rounded-xl border border-[#243049] shrink-0">
            <ProgressRing pct={overallPct} size={44} stroke={4} done={overallPct >= 100} label={fmt(x.a_overall, { n: overallPct })} />
            <div>
              <div className="text-[11px] text-[#A3B4D0]">{x.a_overallLabel}</div>
              <div className="text-[12px] text-[#E8EEF9] font-mono" dir="ltr">
                {completed.filter((id) => schools.some((s) => orderedLectures(s).some((l) => l.lecture.id === id))).length} / {totalLectures}
              </div>
            </div>
          </div>
        </div>

        {state === 'ready' && contentIsArabic(currentLang, schools) && (
          <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200" data-testid="content-lang-note">
            {x.a_contentArabic}
          </div>
        )}

        {resume && activeTab === 'courses' && !selectedSchool && (
          <button
            onClick={() => openLecture(resume.school, resume.lecture)}
            className="w-full text-start rounded-2xl border border-[#2DD4BF]/40 bg-gradient-to-l from-[#0F2A2A] to-[#121A2B] p-4 flex items-center gap-3 hover:border-[#2DD4BF] cursor-pointer"
            data-testid="resume-btn"
          >
            <PlayCircle className="w-8 h-8 text-[#2DD4BF] shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] text-[#2DD4BF] font-semibold">{x.a_continue}</span>
              <span className="block text-[14px] font-bold text-[#E8EEF9] truncate" dir="auto">
                {resume.lecture.title}
              </span>
              <span className="block text-[11px] text-[#7B8DA8] truncate">{schoolName(resume.school, currentLang)}</span>
            </span>
          </button>
        )}

        <div className="flex items-center gap-2 border-b border-[#1E283D] pb-1" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'courses'}
            onClick={() => {
              setActiveTab('courses');
              setSelectedSchool(null);
            }}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs min-h-[44px] cursor-pointer ${
              activeTab === 'courses' ? 'bg-[#1C2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            {fmt(x.a_tabCourses, { n: schools.length })}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'certificates'}
            onClick={() => setActiveTab('certificates')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs min-h-[44px] cursor-pointer ${
              activeTab === 'certificates' ? 'bg-[#1C2E4A] text-[#E8B86D] border border-[#E8B86D]/40' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
            data-testid="tab-certs"
          >
            <Award className="w-4 h-4" />
            {fmt(x.a_tabCerts, { n: certificates.length })}
          </button>
        </div>

        {notice && (
          <div role="alert" className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-[12px] text-rose-200">
            {notice}
          </div>
        )}

        {state === 'loading' ? (
          <LoadingSkeleton rows={5} />
        ) : state === 'error' ? (
          <ErrorState currentLang={currentLang} onRetry={() => void loadData()} />
        ) : activeTab === 'certificates' ? (
          certificates.length === 0 ? (
            <EmptyState
              currentLang={currentLang}
              icon={<Award className="w-7 h-7 text-[#E8B86D]" />}
              title={x.a_noCertsTitle}
              message={x.a_noCertsText}
              action={
                <button onClick={() => setActiveTab('courses')} className="px-4 min-h-[40px] rounded-lg bg-[#2DD4BF] text-[#042F2E] font-bold text-xs cursor-pointer">
                  {x.a_browseCourses}
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((cert) => {
                const sch = schools.find((s) => s.id === cert.school_id);
                return (
                  <div key={cert.id} className="p-5 rounded-2xl bg-gradient-to-br from-[#121A2B] to-[#0D1524] border border-[#E8B86D]/40 space-y-4" data-testid="cert-item">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#E8B86D]/15 border border-[#E8B86D]/30 flex items-center justify-center text-[#E8B86D]">
                        <Award className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-[#E8B86D] block">{x.a_certKind}</span>
                        <h4 className="font-bold text-sm text-white">{sch ? schoolName(sch, currentLang) : cert.course_name}</h4>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[#7B8DA8] text-[11px] pt-3 border-t border-[#1E283D]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {fmtDate(cert.issued_at)}
                      </span>
                      <span className="font-mono text-[#A3B4D0]" dir="ltr">
                        {cert.id}
                      </span>
                    </div>
                    {cert.local && <p className="text-[10px] text-amber-300/80">{x.a_certLocal}</p>}
                    <button
                      onClick={() => setSelectedCertificate(cert)}
                      className="w-full flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-[#1C2740] hover:bg-[#233554] text-[#E8B86D] font-bold text-xs border border-[#E8B86D]/30 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> {x.a_viewPrint}
                    </button>
                  </div>
                );
              })}
            </div>
          )
        ) : selectedSchool ? (
          (() => {
            const school = selectedSchool;
            const pct = progress[school.id]?.progress_pct ?? 0;
            const next = nextLecture(school, completed);
            const done = pct >= 100;
            return (
              <div className="space-y-4" data-testid="school-detail">
                <div className="bg-[#121A2B] p-4 rounded-2xl border border-[#243049] flex flex-col sm:flex-row sm:items-center gap-4">
                  <ProgressRing pct={pct} size={72} stroke={6} done={done} />
                  <div className="flex-1 min-w-0">
                    <button onClick={() => setSelectedSchool(null)} className="text-[#2DD4BF] text-[11px] font-semibold hover:underline flex items-center gap-1 cursor-pointer mb-1">
                      <Back className="w-3.5 h-3.5" /> {x.a_allCourses}
                    </button>
                    <h2 className="text-lg font-bold text-[#E8EEF9]">{schoolName(school, currentLang)}</h2>
                    <p className="text-[#7B8DA8] text-xs mt-1 leading-relaxed">{schoolSummary(school, currentLang)}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {next && (
                      <button
                        onClick={() => openLecture(school, next)}
                        className="min-h-[44px] px-4 rounded-xl bg-[#2DD4BF] text-[#042F2E] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        data-testid="continue-course"
                      >
                        <PlayCircle className="w-4 h-4" /> {pct > 0 ? x.a_continueShort : x.a_start}
                      </button>
                    )}
                    {done && (
                      <button
                        onClick={() => void claim(school)}
                        className="min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-[#E8B86D] to-[#F59E0B] text-[#0B1220] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        data-testid="claim-cert"
                      >
                        <Award className="w-4 h-4" /> {x.a_getCert}
                      </button>
                    )}
                  </div>
                </div>

                {[...school.levels]
                  .sort((a, b) => a.level - b.level)
                  .map((lvl) => {
                    const unlocked = isLevelUnlocked(school, lvl.level, completed);
                    const lvlDone = lvl.lectures.filter((l) => completed.includes(l.id)).length;
                    return (
                      <section
                        key={lvl.level}
                        className={`rounded-2xl border overflow-hidden ${unlocked ? 'bg-[#121A2B] border-[#243049]' : 'bg-[#0D1422] border-[#1E283D]'}`}
                        data-testid={`level-${lvl.level}`}
                        data-locked={!unlocked}
                      >
                        <header className="px-4 py-3 bg-[#0E1728] border-b border-[#243049] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {unlocked ? <Layers className="w-4 h-4 text-[#2DD4BF] shrink-0" /> : <Lock className="w-4 h-4 text-[#64748B] shrink-0" />}
                            <h3 className={`font-bold text-sm truncate ${unlocked ? 'text-[#E8EEF9]' : 'text-[#64748B]'}`}>
                              {fmt(x.a_level, { n: lvl.level })}: <span dir="auto">{lvl.title}</span>
                            </h3>
                          </div>
                          <span className="text-[11px] text-[#7B8DA8] font-mono shrink-0" dir="ltr">
                            {lvlDone}/{lvl.lectures.length}
                          </span>
                        </header>
                        {!unlocked && (
                          <p className="px-4 pt-3 text-[11px] text-[#7B8DA8] flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" /> {x.a_lockedHint}
                          </p>
                        )}
                        <ol className="divide-y divide-[#243049]/50">
                          {lvl.lectures.map((lec, i) => {
                            const isDone = completed.includes(lec.id);
                            const isNext = next?.id === lec.id;
                            return (
                              <li key={lec.id}>
                                <button
                                  onClick={() => (unlocked ? openLecture(school, lec) : setLockedHint(lvl.level))}
                                  aria-disabled={!unlocked}
                                  className={`w-full text-start p-4 min-h-[60px] flex items-center gap-3 transition-colors ${
                                    unlocked ? 'hover:bg-[#162033]/60 cursor-pointer' : 'cursor-not-allowed opacity-60'
                                  } ${isNext ? 'bg-[#13283A]/50' : ''}`}
                                  data-testid="lecture-row"
                                  data-state={isDone ? 'done' : !unlocked ? 'locked' : isNext ? 'next' : 'open'}
                                >
                                  <span
                                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold ${
                                      isDone
                                        ? 'bg-[#22C55E]/20 text-[#22C55E]'
                                        : !unlocked
                                          ? 'bg-[#162033] text-[#475569]'
                                          : isNext
                                            ? 'bg-[#2DD4BF] text-[#042F2E]'
                                            : 'bg-[#162033] text-[#A3B4D0]'
                                    }`}
                                  >
                                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : !unlocked ? <Lock className="w-3.5 h-3.5" /> : i + 1}
                                  </span>
                                  <span className="flex-1 min-w-0">
                                    <span className="block font-bold text-[13px] text-[#E8EEF9]" dir="auto">
                                      {lec.title}
                                    </span>
                                    <span className="flex items-center gap-2 text-[#7B8DA8] text-[11px] mt-0.5">
                                      <Clock className="w-3 h-3" /> {fmt(x.a_minutes, { n: lec.duration_min })}
                                      {isNext && <span className="text-[#2DD4BF] font-semibold">• {x.a_upNext}</span>}
                                      {isDone && <span className="text-[#22C55E]">• {x.a_done}</span>}
                                    </span>
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ol>
                        {lockedHint === lvl.level && !unlocked && (
                          <p role="alert" className="px-4 pb-3 text-[11px] text-amber-300">
                            {x.a_lockedTap}
                          </p>
                        )}
                      </section>
                    );
                  })}
              </div>
            );
          })()
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...schools]
              .sort((a, b) => a.order - b.order)
              .map((school) => {
                const p = progress[school.id];
                const pct = p?.progress_pct ?? 0;
                const total = orderedLectures(school).length;
                const doneCount = p?.completed_lectures ?? 0;
                const finished = pct >= 100;
                const next = nextLecture(school, completed);
                return (
                  <div
                    key={school.id}
                    className={`p-5 bg-[#121A2B] rounded-2xl border ${finished ? 'border-[#E8B86D]/60' : 'border-[#243049]'} flex flex-col gap-4`}
                    data-testid="school-card"
                  >
                    <button onClick={() => setSelectedSchool(school)} className="text-start flex items-start gap-4 cursor-pointer group">
                      <ProgressRing pct={pct} done={finished} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-base font-bold text-[#E8EEF9] group-hover:text-[#2DD4BF]">{schoolName(school, currentLang)}</span>
                        <span className="block text-[#A3B4D0] leading-relaxed text-xs mt-1">{schoolSummary(school, currentLang)}</span>
                        <span className="block text-[11px] text-[#7B8DA8] mt-2">
                          {fmt(x.a_cardMeta, { levels: school.levels.length, lectures: total, done: doneCount })}
                        </span>
                      </span>
                    </button>
                    <div className="flex gap-2">
                      {finished ? (
                        <button onClick={() => void claim(school)} className="flex-1 min-h-[42px] rounded-xl bg-[#E8B86D]/15 border border-[#E8B86D]/40 text-[#E8B86D] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                          <Award className="w-4 h-4" /> {x.a_getCert}
                        </button>
                      ) : next ? (
                        <button
                          onClick={() => openLecture(school, next)}
                          className="flex-1 min-h-[42px] rounded-xl bg-[#2DD4BF]/15 border border-[#2DD4BF]/40 text-[#2DD4BF] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <PlayCircle className="w-4 h-4" /> {pct > 0 ? x.a_continueShort : x.a_start}
                        </button>
                      ) : null}
                      <button onClick={() => setSelectedSchool(school)} className="min-h-[42px] px-4 rounded-xl border border-[#24344E] text-[#A3B4D0] text-xs font-semibold cursor-pointer hover:text-white">
                        {x.a_lessons}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {selectedCertificate && (
          <CertificateCard
            certificate={selectedCertificate}
            courseTitle={(() => {
              const s = schools.find((q) => q.id === selectedCertificate.school_id);
              return s ? schoolName(s, currentLang) : selectedCertificate.course_name;
            })()}
            dateText={fmtDate(selectedCertificate.issued_at)}
            currentLang={currentLang}
            onClose={() => setSelectedCertificate(null)}
          />
        )}
      </div>
    </div>
  );
};
