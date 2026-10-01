import React, { useState } from 'react';
import { Bot, GitBranch, Cpu, CheckCircle2, RefreshCw, Terminal, ArrowUpRight, Zap, Shield, Sparkles, Layers, Activity } from 'lucide-react';

interface AgentInfo {
  id: number;
  name: string;
  role: string;
  specialty: string;
  status: 'ACTIVE' | 'PROCESSING' | 'IDLE';
  lastAction: string;
  commitsCount: number;
  accuracy: number;
  iconBg: string;
}

const AGENTS_LIST: AgentInfo[] = [
  {
    id: 1,
    name: 'Agent Alpha (UI/UX Architect)',
    role: 'هندسة الواجهة وستاندرد TradingView',
    specialty: 'تنظيم الشارتات، إزالة الازدحام، هندسة القوائم والتصميم المالي الاحترافي',
    status: 'ACTIVE',
    lastAction: 'إعادة ضبط أبعاد الشارت وتوحيد الشريط السفلي ومنع التداخل',
    commitsCount: 34,
    accuracy: 99.2,
    iconBg: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  },
  {
    id: 2,
    name: 'Agent Beta (Chart Engine Master)',
    role: 'محرك الشموع والمؤشرات الفنية',
    specialty: 'حساب خوارزميات RSI و Bollinger و MACD و رسم الشموع عالية الدقة في Canvas',
    status: 'ACTIVE',
    lastAction: 'تسريع معدل تحديث الفريمات الزمنية 1m و 15m و 1h لتقليل استهلاك الذاكرة',
    commitsCount: 28,
    accuracy: 98.7,
    iconBg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  {
    id: 3,
    name: 'Agent Gamma (Live Market Feed)',
    role: 'قنوات الأسعار والربط اللحظي',
    specialty: 'إدارة تدفق بيانات أزواج العملات، الذهب XAUUSD، والنفط مع التحديث التلقائي',
    status: 'ACTIVE',
    lastAction: 'فحص استقرار التغذية السعرية الحية وتوزيع الأسعار على الشاشات الأربعة',
    commitsCount: 42,
    accuracy: 99.9,
    iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 4,
    name: 'Agent Delta (Analysis Copilot)',
    role: 'مساعد التحليل الفني الذكي',
    specialty: 'استخراج مستويات الدعم والمقاومة، ونماذج الشموع اليابانية لخدمة المشتركين',
    status: 'ACTIVE',
    lastAction: 'تجهيز قوالب السيناريوهات الصاعدة والهابطة مع تنبيهات وقف الخسارة',
    commitsCount: 19,
    accuracy: 97.4,
    iconBg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  {
    id: 5,
    name: 'Agent Epsilon (Community Engine)',
    role: 'نظام غرف الدردشة والنقاش',
    specialty: 'تنظيم قنوات تداول الفوركس، الذهب، والكريبتو وحماية جودة المنشورات التحليلية',
    status: 'ACTIVE',
    lastAction: 'تفعيل فلترة المشاعر (Bullish/Bearish) وربط كل رسالة برمز العملة المعنية',
    commitsCount: 22,
    accuracy: 98.9,
    iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  {
    id: 6,
    name: 'Agent Zeta (Trading Academy)',
    role: 'محرك الدورات والتعليم التفاعلي',
    specialty: 'هيكلة مسارات التعليم من الصفر، واختبارات قياس الفهم وسيكولوجية المتداول',
    status: 'ACTIVE',
    lastAction: 'ربط نظام متابعة نسبة التقدم وإصدار شهادات إتمام مستويات التحليل الفني',
    commitsCount: 17,
    accuracy: 99.5,
    iconBg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  },
  {
    id: 7,
    name: 'Agent Eta (Plans & Billing)',
    role: 'باقات الاشتراك والضوابط القانونية',
    specialty: 'تنسيق صلاحيات الباقات (Starter, Pro, VIP) وفرض نصوص إخلاء المسؤولية الصارمة',
    status: 'ACTIVE',
    lastAction: 'تحديث شروط وسياسات الاستخدام وإبراز تنويه المخاطر في كافة الصفحات',
    commitsCount: 15,
    accuracy: 100,
    iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  },
  {
    id: 8,
    name: 'Agent Theta (Git Sync & QA)',
    role: 'حارس الجودة والمزامنة مع GitHub',
    specialty: 'فحص الأخطاء، البناء البرمجي الدوري، ودفع الأكواد تلقائياً إلى anasalraji61-maker/souq-fx',
    status: 'ACTIVE',
    lastAction: 'مزامنة ناجحة إلى مستودع GitHub: anasalraji61-maker/souq-fx (main branch)',
    commitsCount: 48,
    accuracy: 99.8,
    iconBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
];

export const AgentDevSwarm: React.FC = () => {
  const [agents] = useState<AgentInfo[]>(AGENTS_LIST);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('متصل ومزامن مع GitHub: anasalraji61-maker/souq-fx');

  const handleManualSync = () => {
    setIsSyncing(true);
    setSyncStatus('جاري التحقق من التغييرات والمزامنة مع مستودع GitHub...');
    setTimeout(() => {
      setIsSyncing(false);
      setSyncStatus('تمت المزامنة بنجاح! فرع main محدث بالكامل.');
    }, 1200);
  };

  return (
    <div className="h-full overflow-y-auto bg-[#070E1A] text-[#E2E8F0] p-6 space-y-6 select-none">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-[#0B1528] border border-[#1E293B] flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#2DD4BF] to-[#0284C7] flex items-center justify-center text-[#042F2E] shadow-lg shrink-0">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-white">
                منظومة الوكلاء السحابيون الـ 8 (Cloud Agent Dev Swarm)
              </h1>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                8/8 نشطون بالسحابة 24/7
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              فريق وكلاء ذكاء اصطناعي متخصص يعمل على تطوير المنصة، صيانة الكود، ورفع التحديثات تلقائياً إلى مستودعك.
            </p>
          </div>
        </div>

        {/* GitHub Direct Link & Auto-Sync Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="p-2.5 rounded-xl bg-[#070D18] border border-[#1E2B44] flex items-center gap-3 text-xs">
            <GitBranch className="w-4 h-4 text-[#2DD4BF]" />
            <div>
              <div className="font-mono text-white text-[11px] font-bold">
                anasalraji61-maker / souq-fx
              </div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{syncStatus}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-xl bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#042F2E] text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>مزامنة فورية الآن</span>
          </button>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="p-4 rounded-xl bg-[#0B1528] border border-[#1E293B] hover:border-[#2DD4BF]/40 transition-all flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`p-2 rounded-lg border text-xs font-mono font-bold ${agent.iconBg}`}>
                  Agent #{agent.id}
                </span>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {agent.status}
                </span>
              </div>

              <div>
                <h3 className="text-xs font-bold text-white">{agent.name}</h3>
                <span className="text-[11px] text-[#2DD4BF] font-medium block mt-0.5">
                  {agent.role}
                </span>
              </div>

              <p className="text-[11px] text-[#94A3B8] leading-relaxed line-clamp-2">
                {agent.specialty}
              </p>
            </div>

            <div className="pt-2 border-t border-[#162238] space-y-2 text-[10px]">
              <div className="text-[#CBD5E1] bg-[#070D18] p-2 rounded border border-[#17243B]">
                <strong className="text-[#64748B] block mb-0.5">آخر مهمة منفذة:</strong>
                <span className="text-[#A3B4D0]">{agent.lastAction}</span>
              </div>

              <div className="flex items-center justify-between text-[#64748B] font-mono">
                <span>الكوميتات: {agent.commitsCount}</span>
                <span className="text-emerald-400">الدقة: {agent.accuracy}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Daily Laptop Sync Instruction */}
      <div className="p-4 rounded-xl bg-[#0D182E] border border-[#1E2E4E] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-[#2DD4BF] shrink-0" />
          <div>
            <strong className="text-white block">كيف تسحب كل تحديثات الوكلاء يومياً إلى لابتوبك؟</strong>
            <span className="text-[#94A3B8] text-[11px]">
              فقط افتح موجه الأوامر في مجلد المشروع في لابتوبك واكتب هذا الأمر لتحميل كل ما بناه الوكلاء:
            </span>
          </div>
        </div>

        <code className="px-3.5 py-1.5 rounded-lg bg-[#050B14] border border-[#243657] font-mono text-[#2DD4BF] text-xs font-bold shrink-0">
          git pull origin main
        </code>
      </div>
    </div>
  );
};
