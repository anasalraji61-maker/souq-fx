export type AcademySchoolSummary = {
  id: string;
  order: number;
  name_ar: string;
  name_en: string;
  density: string;
  max_level: number;
  summary: string;
  summary_en: string;
  levels_count: number;
  lectures_count: number;
  classroom: { teacher: string; screen_theme: string; video_pipeline: string };
  /** الخادم يرسل `null` (لا تقدّم محسوب للملخّص) — لا تطبعه كنسبة دون فحص. */
  progress: number | null;
};

export type ScriptSegment = {
  id: string;
  title: string;
  narration: string;
};

export type AcademyLecture = {
  id: string;
  title: string;
  duration_min: number;
  format: string;
  video_status: string;
  outline: string[];
  script_segments: ScriptSegment[];
  school_id?: string;
  school_name?: string;
  /** الاسم الإنجليزي للمدرسة — يُعرَض لأي لغة واجهة غير عربية (نفس قاعدة `schoolName` بـCoursesScreen). */
  school_name_en?: string;
  level?: number;
  level_title?: string;
  teacher?: string;
  screen_theme?: string;
  interrupt_enabled?: boolean;
};

export type AcademyLevel = {
  level: number;
  title: string;
  lectures_count: number;
  lectures: AcademyLecture[];
};

export type AcademySchool = AcademySchoolSummary & {
  levels: AcademyLevel[];
};

/** Offline fallback mirrors backend academy (BOS/CHOCH inside ICT/SMC OB+FVG). */
export const mockAcademySchools: AcademySchoolSummary[] = [
  {
    id: 'basics',
    order: 0,
    name_ar: 'أساسيات التداول للمبتدئين',
    name_en: 'Trading Basics',
    density: 'low',
    max_level: 1,
    summary: 'النقطة (Pip)، اللوت، الرافعة والهامش، وإدارة المخاطر قبل أول صفقة.',
    summary_en: 'Pips, lot sizes, leverage and margin, and risk management before your first trade.',
    levels_count: 1,
    lectures_count: 5,
    classroom: {
      teacher: 'شرح صوتي',
      screen_theme: 'basics_intro',
      video_pipeline: 'ElevenLabs TTS + screen',
    },
    progress: null,
  },
  {
    id: 'classic',
    order: 1,
    name_ar: 'المدرسة الكلاسيكية',
    name_en: 'Classical TA',
    density: 'medium',
    max_level: 3,
    summary: 'الاتجاه، الدعم والمقاومة، الشموع، والمؤشرات الكلاسيكية.',
    summary_en: 'Trend, support and resistance, candlesticks, and classic indicators.',
    levels_count: 3,
    lectures_count: 8,
    classroom: {
      teacher: 'شرح صوتي',
      screen_theme: 'classic_charts',
      video_pipeline: 'ElevenLabs TTS + screen',
    },
    progress: null,
  },
  {
    id: 'wyckoff',
    order: 2,
    name_ar: 'مدرسة وايكوف',
    name_en: 'Wyckoff',
    density: 'high',
    max_level: 4,
    summary: 'التجميع والتوزيع وقراءة نية المؤسسات.',
    summary_en: 'Accumulation, distribution, and reading institutional intent.',
    levels_count: 4,
    lectures_count: 6,
    classroom: {
      teacher: 'شرح صوتي',
      screen_theme: 'wyckoff_schematic',
      video_pipeline: 'ElevenLabs TTS + screen',
    },
    progress: null,
  },
  {
    id: 'ict-smc',
    order: 3,
    name_ar: 'ICT و SMC',
    name_en: 'ICT / SMC',
    density: 'very_high',
    max_level: 5,
    summary:
      'Order Blocks و FVG وبضمنها BOS و CHOCH كهيكل سوق — ليست مدرسة منفصلة عن الـ OB/FVG.',
    summary_en:
      'Order Blocks and FVGs, including BOS and CHOCH as market structure — not a separate school from OB/FVG.',
    levels_count: 5,
    lectures_count: 9,
    classroom: {
      teacher: 'شرح صوتي',
      screen_theme: 'smc_liquidity',
      video_pipeline: 'ElevenLabs TTS + screen',
    },
    progress: null,
  },
  {
    id: 'gann',
    order: 4,
    name_ar: 'مربع جان',
    name_en: 'Gann',
    density: 'high',
    max_level: 4,
    summary: 'الزوايا الزمنية والسعرية ومربع 9.',
    summary_en: 'Time and price angles, and the Square of 9.',
    levels_count: 4,
    lectures_count: 5,
    classroom: {
      teacher: 'شرح صوتي',
      screen_theme: 'gann_grid',
      video_pipeline: 'ElevenLabs TTS + screen',
    },
    progress: null,
  },
  {
    id: 'elliott',
    order: 5,
    name_ar: 'موجات إليوت',
    name_en: 'Elliott',
    density: 'very_high',
    max_level: 5,
    summary: 'العدّ الموجي والفيبوناتشي والتوافق مع السيولة.',
    summary_en: 'Wave counting, Fibonacci, and alignment with liquidity.',
    levels_count: 5,
    lectures_count: 6,
    classroom: {
      teacher: 'شرح صوتي',
      screen_theme: 'elliott_count',
      video_pipeline: 'ElevenLabs TTS + screen',
    },
    progress: null,
  },
  {
    id: 'sk',
    order: 6,
    name_ar: 'مدرسة SK',
    name_en: 'SK',
    density: 'high',
    max_level: 4,
    summary: 'مناطق العرض والطلب وإدارة الصفقة بأسلوب SK.',
    summary_en: 'Supply and demand zones, and SK-style trade management.',
    levels_count: 4,
    lectures_count: 5,
    classroom: {
      teacher: 'شرح صوتي',
      screen_theme: 'sk_zones',
      video_pipeline: 'ElevenLabs TTS + screen',
    },
    progress: null,
  },
];
