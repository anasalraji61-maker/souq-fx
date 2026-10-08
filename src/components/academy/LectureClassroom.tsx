import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AcademyLecture, AcademySchool } from '../../data/academyData';
import { ArrowRight, ArrowLeft, CheckCircle2, HelpCircle, BookOpen, Volume2, Square, ListOrdered, Clock, Lock, ChevronDown } from 'lucide-react';
import { LangId, gx, fmt } from '../../i18n/locales';
import { ConceptDiagram } from './conceptDiagrams';
import { isLectureUnlocked, orderedLectures, schoolName } from './academyUtils';
import { API_BASE as API_BASE_URL } from '../../api/client';

interface LectureClassroomProps {
  school: AcademySchool;
  lecture: AcademyLecture;
  completed: string[];
  currentLang?: LangId;
  onBack: () => void;
  onOpenLecture: (lecture: AcademyLecture) => void;
  onComplete: (lectureId: string) => Promise<void> | void;
}

const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

export const LectureClassroom: React.FC<LectureClassroomProps> = ({
  school,
  lecture,
  completed,
  currentLang = 'ar',
  onBack,
  onOpenLecture,
  onComplete,
}) => {
  const x = gx(currentLang);
  const rtl = currentLang !== 'en-US';
  const Back = rtl ? ArrowRight : ArrowLeft;
  const Fwd = rtl ? ArrowLeft : ArrowRight;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string>('');
  const [quizChoice, setQuizChoice] = useState<number | null>(null);
  const [quizDone, setQuizDone] = useState(false);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  const list = useMemo(() => orderedLectures(school), [school]);
  const idx = list.findIndex((l) => l.lecture.id === lecture.id);
  const prev = idx > 0 ? list[idx - 1].lecture : null;
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1].lecture : null;
  const isDone = completed.includes(lecture.id);
  const nextUnlocked = next ? isLectureUnlocked(school, next.id, completed) : false;
  const nextUnlockedIfDone = next ? isLectureUnlocked(school, next.id, [...completed, lecture.id]) : false;

  const sections = useMemo(
    () => [
      ...lecture.script_segments.map((s, i) => ({ id: `sec-${i}`, title: s.title })),
      ...(lecture.quiz ? [{ id: 'sec-quiz', title: x.a_quiz }] : []),
    ],
    [lecture, x.a_quiz]
  );
  const showToc = sections.length >= 3;

  // Reset per lecture.
  useEffect(() => {
    setQuizChoice(null);
    setQuizDone(false);
    setTocOpen(false);
    stopSpeaking();
    scrollRef.current?.scrollTo({ top: 0 });
    setProgress(0);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lecture.id]);

  // Reading progress + current section.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(100, Math.round((el.scrollTop / max) * 100)) : 100);
      let current = sections[0]?.id || '';
      for (const s of sections) {
        const node = document.getElementById(s.id);
        if (node && node.getBoundingClientRect().top - el.getBoundingClientRect().top < 140) current = s.id;
      }
      setActiveSection(current);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [sections]);

  // Keyboard: arrows move between lectures (reading direction aware), Esc goes back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
      const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === forward && next && nextUnlocked) {
        e.preventDefault();
        onOpenLecture(next);
      } else if (e.key === backward && prev) {
        e.preventDefault();
        onOpenLecture(prev);
      } else if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rtl, next, prev, nextUnlocked, onOpenLecture, onBack]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const RATES = [1, 1.2, 1.4, 1.6];
  const [rate, setRate] = useState<number>(() => {
    try {
      const n = Number(localStorage.getItem('matrix_lesson_rate'));
      return RATES.includes(n) ? n : 1.2;
    } catch {
      return 1.2;
    }
  });
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    try {
      localStorage.setItem('matrix_lesson_rate', String(next));
    } catch {
      /* private mode */
    }
    if (audioRef.current) audioRef.current.playbackRate = next;
  };
  const playRun = useRef(0);

  function stopSpeaking() {
    playRun.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    if (canSpeak()) window.speechSynthesis.cancel();
    setSpeaking(null);
  }

  /** Narration: the server's ElevenLabs voice (same cached audio as the phone app); the browser's own voice
   * only when the server has no voice configured or the request fails. */
  const speakFrom = (i: number) => {
    stopSpeaking();
    const run = playRun.current;
    const segs = lecture.script_segments;
    const want = school.content_lang === 'en' ? 'en' : 'ar';
    let useBrowser = false;
    const show = (k: number) => {
      setSpeaking(k);
      document.getElementById(`sec-${k}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const browserSay = (k: number) => {
      if (!canSpeak()) {
        setSpeaking(null);
        return;
      }
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith(want));
      const u = new SpeechSynthesisUtterance(`${segs[k].title}. ${segs[k].narration}`);
      u.lang = want;
      if (voice) u.voice = voice;
      u.rate = Math.min(1.6, 0.95 * rateRef.current);
      u.onstart = () => show(k);
      u.onend = () => run === playRun.current && sayIndex(k + 1);
      u.onerror = () => setSpeaking(null);
      window.speechSynthesis.speak(u);
    };
    const sayIndex = async (k: number) => {
      if (run !== playRun.current) return;
      if (k >= segs.length) {
        setSpeaking(null);
        return;
      }
      if (!useBrowser) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/academy/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: segs[k].narration }),
          });
          if (run !== playRun.current) return;
          if (res.ok) {
            const data = (await res.json()) as { audio_url: string };
            const audio = new Audio(data.audio_url.startsWith('http') ? data.audio_url : `${API_BASE_URL}${data.audio_url}`);
            audioRef.current = audio;
            audio.playbackRate = rateRef.current;
            audio.onended = () => run === playRun.current && sayIndex(k + 1);
            audio.onerror = () => {
              useBrowser = true;
              browserSay(k);
            };
            show(k);
            await audio.play();
            return;
          }
        } catch {
          // network / autoplay problem: fall back below
        }
        useBrowser = true;
      }
      browserSay(k);
    };
    void sayIndex(i);
  };

  const finish = async (goNext: boolean) => {
    setBusy(true);
    if (!isDone) await onComplete(lecture.id);
    setBusy(false);
    if (goNext && next && nextUnlockedIfDone) onOpenLecture(next);
  };

  const jump = (id: string) => {
    setTocOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toc = (
    <nav aria-label={x.a_toc} className="space-y-1">
      {sections.map((s, i) => (
        <button
          key={s.id}
          onClick={() => jump(s.id)}
          aria-current={activeSection === s.id ? 'true' : undefined}
          className={`w-full text-start flex items-start gap-2 px-3 py-2 rounded-lg text-[12px] leading-snug cursor-pointer border-s-2 ${
            activeSection === s.id ? 'border-[#2DD4BF] bg-[#13283A] text-[#E8EEF9]' : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <span className="font-mono text-[10px] mt-0.5 text-[#64748B]">{s.id === 'sec-quiz' ? '?' : i + 1}</span>
          <span dir="auto">{s.title}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto bg-[#0A111E]" data-testid="classroom">
      {/* Sticky bar: reading progress + navigation */}
      <div className="sticky top-0 z-30 bg-[#0B1220]/95 backdrop-blur border-b border-[#1E283D]">
        <div className="h-1 bg-[#13213A]" aria-hidden="true">
          <div className="h-full bg-gradient-to-r from-[#2DD4BF] to-[#22C55E] transition-[width] duration-150" style={{ width: `${progress}%` }} data-testid="read-progress" />
        </div>
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-2">
          <button onClick={onBack} className="flex items-center gap-1.5 min-h-[40px] px-2.5 rounded-lg text-[#A3B4D0] hover:text-white hover:bg-[#162033] text-xs cursor-pointer shrink-0" data-testid="classroom-back">
            <Back className="w-4 h-4" />
            <span className="hidden sm:inline">{x.a_backToCourse}</span>
          </button>
          <div className="min-w-0 flex-1 text-[12px] text-[#7B8DA8] truncate" dir="auto">
            {schoolName(school, currentLang)} · <span className="text-[#E8EEF9]">{lecture.title}</span>
          </div>
          <span className="text-[11px] font-mono text-[#64748B] shrink-0" dir="ltr">
            {idx + 1}/{list.length}
          </span>
          <button
            onClick={() => void finish(false)}
            disabled={isDone || busy}
            className={`shrink-0 min-h-[40px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              isDone ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/40' : 'bg-[#2DD4BF] text-[#042F2E]'
            }`}
            data-testid="mark-complete"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden sm:inline">{isDone ? x.a_completed : x.a_markComplete}</span>
          </button>
        </div>
      </div>

      <div className={`max-w-6xl mx-auto px-4 sm:px-6 py-6 ${showToc ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-10' : ''}`}>
        <article
          className="mx-auto w-full max-w-[70ch] text-[#CBD5E1]"
          lang={school.content_lang === 'en' ? 'en' : school.content_lang === 'ku' ? 'ckb' : 'ar'}
          dir={school.content_lang === 'en' ? 'ltr' : 'rtl'}
          data-testid="lecture-article"
        >
          <header className="space-y-2 mb-6" dir={rtl ? 'rtl' : 'ltr'} lang={currentLang === 'en-US' ? 'en' : currentLang}>
            <div className="flex items-center gap-2 text-[#2DD4BF] text-[12px] font-semibold">
              <BookOpen className="w-4 h-4" />
              <span>{fmt(x.a_lectureN, { n: idx + 1, total: list.length })}</span>
            </div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#E8EEF9] leading-snug" dir="auto">
              {lecture.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#7B8DA8]">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {fmt(x.a_minutes, { n: lecture.duration_min })}
              </span>
              {school.content_lang !== 'ku' && (
                <button
                  onClick={() => (speaking === null ? speakFrom(0) : stopSpeaking())}
                  className="flex items-center gap-1.5 min-h-[34px] px-3 rounded-full border border-[#2DD4BF]/40 text-[#2DD4BF] hover:bg-[#2DD4BF]/10 cursor-pointer"
                  data-testid="listen-btn"
                >
                  {speaking === null ? <Volume2 className="w-3.5 h-3.5" /> : <Square className="w-3 h-3 fill-current" />}
                  {speaking === null ? x.a_listen : x.a_stopListen}
                </button>
              )}
              {school.content_lang !== 'ku' && (
                <button
                  onClick={cycleRate}
                  className="min-h-[34px] px-3 rounded-full border border-[#1E283D] text-[#2DD4BF] font-bold font-mono hover:bg-[#2DD4BF]/10 cursor-pointer"
                  aria-label={`${rate}×`}
                  data-testid="rate-btn"
                >
                  {`${rate}×`}
                </button>
              )}
            </div>
          </header>

          {showToc && (
            <div className="lg:hidden mb-6 rounded-xl border border-[#1E283D] bg-[#0F1828]" dir={rtl ? 'rtl' : 'ltr'}>
              <button onClick={() => setTocOpen((v) => !v)} aria-expanded={tocOpen} className="w-full flex items-center justify-between px-4 min-h-[46px] text-[13px] font-bold text-[#E8EEF9] cursor-pointer" data-testid="toc-toggle">
                <span className="flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-[#2DD4BF]" /> {x.a_toc}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${tocOpen ? 'rotate-180' : ''}`} />
              </button>
              {tocOpen && <div className="px-2 pb-3">{toc}</div>}
            </div>
          )}

          {lecture.outline.length > 0 && (
            <section className="mb-8 rounded-xl bg-[#0F1828] border border-[#1E283D] p-4">
              <h2 className="text-[13px] font-bold text-[#E8EEF9] mb-2" dir={rtl ? 'rtl' : 'ltr'}>
                {x.a_outline}
              </h2>
              <ol className="list-decimal ps-5 space-y-1 text-[14px] leading-[1.9]">
                {lecture.outline.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ol>
            </section>
          )}

          <div className="mb-8">
            <ConceptDiagram concept={lecture.chartConcept} />
          </div>

          {lecture.script_segments.map((seg, i) => (
            <section key={seg.id} id={`sec-${i}`} className="scroll-mt-20 mb-8" data-testid="lecture-section">
              <h2 className={`text-[19px] font-bold mb-3 flex items-center gap-2 ${speaking === i ? 'text-[#2DD4BF]' : 'text-[#E8EEF9]'}`}>
                <span className="w-7 h-7 rounded-full bg-[#13283A] text-[#2DD4BF] text-[12px] font-mono flex items-center justify-center shrink-0">{i + 1}</span>
                {seg.title}
              </h2>
              <p className={`text-[16px] leading-[1.9] ${speaking === i ? 'text-white' : ''}`}>{seg.narration}</p>
            </section>
          ))}

          {lecture.quiz && (
            <section id="sec-quiz" className="scroll-mt-20 mb-8 rounded-2xl bg-[#121A2B] border border-[#243049] p-5 space-y-4" data-testid="quiz">
              <h2 className="text-[17px] font-bold text-[#E8EEF9] flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#F59E0B]" /> {x.a_quiz}
              </h2>
              <p className="text-[15px] leading-[1.9] text-[#E8EEF9]">{lecture.quiz.question}</p>
              <div className="space-y-2" role="radiogroup">
                {lecture.quiz.options.map((opt, i) => {
                  const correct = i === lecture.quiz!.correctAnswer;
                  const chosen = quizChoice === i;
                  let cls = 'bg-[#0F1828] border-[#24344E] text-[#E8EEF9]';
                  if (quizDone && correct) cls = 'bg-[#22C55E]/15 border-[#22C55E] text-[#86EFAC] font-bold';
                  else if (quizDone && chosen) cls = 'bg-[#EF4444]/15 border-[#EF4444] text-[#FCA5A5]';
                  else if (chosen) cls = 'bg-[#2DD4BF]/15 border-[#2DD4BF] text-[#CFFAFE] font-bold';
                  return (
                    <button
                      key={i}
                      role="radio"
                      aria-checked={chosen}
                      onClick={() => !quizDone && setQuizChoice(i)}
                      className={`w-full text-start min-h-[46px] px-4 py-2.5 rounded-xl border text-[14px] cursor-pointer ${cls}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {!quizDone ? (
                <button
                  disabled={quizChoice === null}
                  onClick={() => setQuizDone(true)}
                  className="min-h-[42px] px-5 rounded-xl bg-[#2DD4BF] text-[#042F2E] font-bold text-[13px] disabled:opacity-50 cursor-pointer"
                  data-testid="quiz-submit"
                >
                  {x.a_checkAnswer}
                </button>
              ) : (
                <div className="rounded-xl bg-[#0F1828] border border-[#24344E] p-4 text-[14px] leading-[1.9]" data-testid="quiz-result">
                  <strong className={quizChoice === lecture.quiz.correctAnswer ? 'text-[#86EFAC]' : 'text-[#FCA5A5]'}>
                    {quizChoice === lecture.quiz.correctAnswer ? x.a_correct : x.a_wrong}
                  </strong>{' '}
                  {lecture.quiz.explanation}
                </div>
              )}
            </section>
          )}

          {/* Completion + prev / next */}
          <footer className="mt-10 pt-6 border-t border-[#1E283D] space-y-4" dir={rtl ? 'rtl' : 'ltr'}>
            {!isDone && (
              <button
                onClick={() => void finish(true)}
                disabled={busy}
                className="w-full min-h-[50px] rounded-xl bg-[#2DD4BF] text-[#042F2E] font-bold text-[14px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                data-testid="complete-next"
              >
                <CheckCircle2 className="w-5 h-5" />
                {next && nextUnlockedIfDone ? x.a_completeAndNext : x.a_markComplete}
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => prev && onOpenLecture(prev)}
                disabled={!prev}
                className="min-h-[64px] rounded-xl border border-[#24344E] bg-[#0F1828] px-4 text-start disabled:opacity-40 cursor-pointer hover:border-[#2DD4BF]/50"
                data-testid="prev-lecture"
              >
                <span className="flex items-center gap-1 text-[11px] text-[#7B8DA8]">
                  <Back className="w-3.5 h-3.5" /> {x.a_prev}
                </span>
                <span className="block text-[13px] text-[#E8EEF9] font-semibold truncate" dir="auto">
                  {prev ? prev.title : '—'}
                </span>
              </button>
              <button
                onClick={() => next && nextUnlocked && onOpenLecture(next)}
                disabled={!next || !nextUnlocked}
                className="min-h-[64px] rounded-xl border border-[#24344E] bg-[#0F1828] px-4 text-end disabled:opacity-40 cursor-pointer hover:border-[#2DD4BF]/50"
                data-testid="next-lecture"
              >
                <span className="flex items-center justify-end gap-1 text-[11px] text-[#7B8DA8]">
                  {next && !nextUnlocked && <Lock className="w-3 h-3" />} {x.a_next} <Fwd className="w-3.5 h-3.5" />
                </span>
                <span className="block text-[13px] text-[#E8EEF9] font-semibold truncate" dir="auto">
                  {next ? next.title : x.a_courseEnd}
                </span>
              </button>
            </div>
            {next && !nextUnlocked && <p className="text-[11px] text-[#7B8DA8] text-center">{x.a_nextLocked}</p>}
            <p className="text-[11px] text-[#64748B] text-center hidden md:block">{rtl ? x.a_kbdHintRtl : x.a_kbdHintLtr}</p>
          </footer>
        </article>

        {showToc && (
          <aside className="hidden lg:block" dir={rtl ? 'rtl' : 'ltr'}>
            <div className="sticky top-20">
              <div className="text-[11px] font-semibold text-[#64748B] mb-2 px-3">{x.a_toc}</div>
              {toc}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
