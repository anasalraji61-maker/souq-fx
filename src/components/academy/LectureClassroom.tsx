import React, { useState } from 'react';
import { AcademyLecture, AcademySchool } from '../../data/academyData';
import { ArrowRight, Play, Pause, CheckCircle2, HelpCircle, BookOpen, Volume2, Sparkles } from 'lucide-react';

interface LectureClassroomProps {
  school: AcademySchool;
  lecture: AcademyLecture;
  onBack: () => void;
  isCompleted: boolean;
  onToggleComplete: (lectureId: string) => void;
}

export const LectureClassroom: React.FC<LectureClassroomProps> = ({
  school,
  lecture,
  onBack,
  isCompleted,
  onToggleComplete,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Concept Visualizer SVG
  const renderConceptDiagram = (concept?: string) => {
    switch (concept) {
      case 'support_resistance':
        return (
          <div className="bg-[#0B1220] p-4 rounded-xl border border-[#243049] flex flex-col items-center">
            <span className="text-[11px] text-[#7B8DA8] mb-2 font-mono">مخطط ارتداد وتبادل أدوار الدعم والمقاومة</span>
            <svg viewBox="0 0 400 160" className="w-full h-36">
              {/* Resistance line */}
              <line x1="20" y1="40" x2="380" y2="40" stroke="#EF4444" strokeWidth="2" strokeDasharray="4 4" />
              <text x="320" y="32" fill="#EF4444" fontSize="10" fontFamily="sans-serif">مقاومة (Resistance)</text>

              {/* Support line */}
              <line x1="20" y1="120" x2="380" y2="120" stroke="#22C55E" strokeWidth="2" strokeDasharray="4 4" />
              <text x="320" y="140" fill="#22C55E" fontSize="10" fontFamily="sans-serif">دعم (Support)</text>

              {/* Price Wave bouncing between */}
              <path
                d="M 30 115 Q 70 45 110 115 T 190 115 T 250 45 L 290 20 L 330 40 L 370 15"
                fill="none"
                stroke="#2DD4BF"
                strokeWidth="2.5"
              />
              <circle cx="110" cy="118" r="4" fill="#22C55E" />
              <circle cx="190" cy="118" r="4" fill="#22C55E" />
              <circle cx="250" cy="42" r="4" fill="#EF4444" />
              <circle cx="330" cy="40" r="4" fill="#22C55E" />
            </svg>
          </div>
        );

      case 'order_block':
        return (
          <div className="bg-[#0B1220] p-4 rounded-xl border border-[#243049] flex flex-col items-center">
            <span className="text-[11px] text-[#7B8DA8] mb-2 font-mono">مخطط كتلة الأوامر (Order Block) و FVG</span>
            <svg viewBox="0 0 400 160" className="w-full h-36">
              {/* Order block rectangle */}
              <rect x="120" y="70" width="70" height="40" fill="rgba(45, 212, 191, 0.2)" stroke="#2DD4BF" strokeWidth="1.5" />
              <text x="125" y="94" fill="#2DD4BF" fontSize="10" fontWeight="bold">Bullish OB</text>

              {/* FVG rectangle */}
              <rect x="220" y="45" width="55" height="30" fill="rgba(245, 158, 11, 0.2)" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="2 2" />
              <text x="230" y="64" fill="#F59E0B" fontSize="10" fontWeight="bold">FVG Gap</text>

              {/* Candle sticks sketch */}
              <line x1="80" y1="50" x2="80" y2="120" stroke="#EF4444" strokeWidth="3" />
              <line x1="140" y1="65" x2="140" y2="115" stroke="#EF4444" strokeWidth="5" />
              <line x1="200" y1="20" x2="200" y2="90" stroke="#22C55E" strokeWidth="5" />
              <line x1="260" y1="10" x2="260" y2="60" stroke="#22C55E" strokeWidth="4" />
              
              {/* Retest arrow */}
              <path d="M 280 40 Q 230 80 180 85" fill="none" stroke="#E8EEF9" strokeWidth="1.5" markerEnd="url(#arrow)" />
            </svg>
          </div>
        );

      case 'elliott_wave':
        return (
          <div className="bg-[#0B1220] p-4 rounded-xl border border-[#243049] flex flex-col items-center">
            <span className="text-[11px] text-[#7B8DA8] mb-2 font-mono">مخطط دورة موجات إليوت الكاملة (1-2-3-4-5 و A-B-C)</span>
            <svg viewBox="0 0 400 160" className="w-full h-36">
              <polyline
                points="30,130 80,80 120,110 200,30 250,70 300,20 340,65 370,50 390,95"
                fill="none"
                stroke="#2DD4BF"
                strokeWidth="2.5"
              />
              <text x="75" y="70" fill="#2DD4BF" fontWeight="bold" fontSize="12">(1)</text>
              <text x="115" y="125" fill="#EF4444" fontWeight="bold" fontSize="12">(2)</text>
              <text x="195" y="20" fill="#2DD4BF" fontWeight="bold" fontSize="12">(3)</text>
              <text x="245" y="85" fill="#EF4444" fontWeight="bold" fontSize="12">(4)</text>
              <text x="305" y="15" fill="#2DD4BF" fontWeight="bold" fontSize="12">(5)</text>

              <text x="340" y="80" fill="#F59E0B" fontWeight="bold" fontSize="12">A</text>
              <text x="365" y="40" fill="#F59E0B" fontWeight="bold" fontSize="12">B</text>
              <text x="385" y="110" fill="#F59E0B" fontWeight="bold" fontSize="12">C</text>
            </svg>
          </div>
        );

      default:
        return (
          <div className="bg-[#0B1220] p-4 rounded-xl border border-[#243049] flex flex-col items-center">
            <span className="text-[11px] text-[#7B8DA8] mb-2 font-mono">نموذج الشموع والتحليل الفني</span>
            <div className="h-28 flex items-center justify-center text-[#7B8DA8]">
              <BookOpen className="w-10 h-10 text-[#2DD4BF]/40" />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 select-none text-xs">
      {/* Navigation Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-[#243049]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#A3B4D0] hover:text-[#E8EEF9] transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لدروس مدرسة: {school.name_ar}</span>
        </button>

        <button
          onClick={() => onToggleComplete(lecture.id)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition-all active:scale-95 cursor-pointer shadow-md ${
            isCompleted
              ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 hover:bg-[#22C55E]/30'
              : 'bg-[#2DD4BF] text-[#042F2E] hover:bg-[#26bba8]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isCompleted ? 'أكملت الدرس ✓' : 'أكملت الدرس'}</span>
        </button>
      </div>

      {/* Lecture Title Card */}
      <div className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] space-y-2">
        <div className="flex items-center gap-2 text-[#2DD4BF] text-[11px] font-semibold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>{school.name_ar} • المحاضرة {lecture.id}</span>
        </div>
        <h1 className="text-xl font-bold text-[#E8EEF9]">{lecture.title}</h1>
        <div className="flex items-center gap-4 text-[#7B8DA8] pt-1">
          <span>المدة التقديرية: ~{lecture.duration_min} دقائق</span>
          <span>•</span>
          <span>المدرّب: {school.classroom.teacher}</span>
        </div>
      </div>

      {/* Audio Lecture Simulation Player */}
      <div className="p-4 bg-[#162033] rounded-xl border border-[#2DD4BF]/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlayingAudio(!isPlayingAudio)}
            className="w-10 h-10 rounded-full bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] flex items-center justify-center shadow-lg transition-transform active:scale-95"
          >
            {isPlayingAudio ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>
          <div>
            <div className="font-bold text-[#E8EEF9] flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-[#2DD4BF]" />
              <span>الشرح الصوتي التفاعلي للدرس</span>
            </div>
            <div className="text-[11px] text-[#A3B4D0]">
              {isPlayingAudio ? 'جارٍ الاستماع للشرح المنهجي...' : 'انقر لبدء إلقاء الدرس صوتياً'}
            </div>
          </div>
        </div>

        {isPlayingAudio && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#2DD4BF]/10 text-[#2DD4BF] font-mono text-[11px] animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>صوت نشط</span>
          </div>
        )}
      </div>

      {/* Lecture Outline & Key Points */}
      <div className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] space-y-3">
        <h3 className="font-bold text-sm text-[#E8EEF9]">محاور ومخطط المحاضرة</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {lecture.outline.map((item, idx) => (
            <div
              key={idx}
              className="p-3 bg-[#0B1220] rounded-lg border border-[#243049] flex items-center gap-2.5"
            >
              <span className="w-5 h-5 rounded-full bg-[#162033] text-[#2DD4BF] font-mono font-bold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <span className="text-[#E8EEF9] font-medium leading-tight">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Concept Diagram */}
      {renderConceptDiagram(lecture.chartConcept)}

      {/* Detailed Syllables & Narration Segments */}
      <div className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] space-y-4">
        <h3 className="font-bold text-sm text-[#E8EEF9]">المحتوى التفصيلي والتحليلي</h3>

        <div className="space-y-3">
          {lecture.script_segments.map((seg, idx) => (
            <div
              key={seg.id}
              onClick={() => setActiveSegmentIndex(idx)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                activeSegmentIndex === idx
                  ? 'bg-[#162033] border-[#2DD4BF]'
                  : 'bg-[#0B1220]/70 border-[#243049] hover:border-[#7B8DA8]'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-[#E8EEF9] mb-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2DD4BF]" />
                <span>{seg.title}</span>
              </div>
              <p className="text-[#A3B4D0] leading-relaxed text-[12px]">{seg.narration}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Comprehension Quiz (if available) */}
      {lecture.quiz && (
        <div className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#F59E0B]" />
            <h3 className="font-bold text-sm text-[#E8EEF9]">اختبار فهم واستيعاب الدرس</h3>
          </div>

          <div className="p-4 bg-[#0B1220] rounded-xl border border-[#243049] space-y-3">
            <p className="font-medium text-[#E8EEF9] text-sm">{lecture.quiz.question}</p>

            <div className="space-y-2">
              {lecture.quiz.options.map((option, optIdx) => {
                const isSelected = selectedQuizOption === optIdx;
                const isCorrect = optIdx === lecture.quiz?.correctAnswer;

                let optClass = 'bg-[#162033] border-[#243049] text-[#E8EEF9]';
                if (quizSubmitted) {
                  if (isCorrect) optClass = 'bg-[#22C55E]/20 border-[#22C55E] text-[#22C55E] font-bold';
                  else if (isSelected) optClass = 'bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444]';
                } else if (isSelected) {
                  optClass = 'bg-[#2DD4BF]/20 border-[#2DD4BF] text-[#2DD4BF] font-bold';
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => !quizSubmitted && setSelectedQuizOption(optIdx)}
                    className={`w-full p-3 rounded-lg border text-right transition-colors ${optClass}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {!quizSubmitted ? (
              <button
                disabled={selectedQuizOption === null}
                onClick={() => setQuizSubmitted(true)}
                className="mt-2 px-4 py-2 rounded-lg bg-[#2DD4BF] disabled:opacity-50 text-[#042F2E] font-bold"
              >
                تأكيد الإجابة
              </button>
            ) : (
              <div className="mt-3 p-3 rounded-lg bg-[#162033] border border-[#243049] text-[#A3B4D0] leading-relaxed">
                <strong>التوضيح الفني:</strong> {lecture.quiz.explanation}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
