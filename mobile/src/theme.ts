/** هوية MATRIX: عمق هادئ قريب من سلاسة الأنظمة الحديثة — دون تقليد واجهة Apple. */
export const colors = {
  bg: '#0B1220',
  bgElevated: '#121A2B',
  bgPanel: '#162033',
  bgGlass: 'rgba(18, 26, 43, 0.86)',
  border: '#243049',
  borderSoft: '#1C2740',
  text: '#E8EEF9',
  textMuted: '#A3B4D0',
  textDim: '#7B8DA8',
  accent: '#2DD4BF',
  accentSoft: 'rgba(45, 212, 191, 0.14)',
  bull: '#22C55E',
  bear: '#F43F5E',
  warn: '#F59E0B',
  highImpact: '#FB7185',
  dxy: '#38BDF8',
  white: '#FFFFFF',
  /** إنجاز / تشجيع (تعلّم، إكمال درس) — ليس للربح أو حجم التداول */
  warmAccent: '#E8B86D',
  /** معلومة إيجابية هادئة — مختلف عن dxy وعن التيل */
  infoAccent: '#A78BFA',
  /** لون النص فوق خلفية accent الممتلئة (تباين داكن آمن) — كان مكرَّراً كقيمة hex ثابتة
   * بـ12 ملفاً منفصلاً لنص أزرار "رئيسية" (خلفية accent)؛ وُحِّد هنا كرمز واحد بلا أي
   * تغيير بصري (نفس القيمة الحرفية بالضبط) لسهولة الصيانة/الاتساق المستقبلي فقط. */
  onAccent: '#042F2E',
  /** خلفية غائرة لعناصر تحكم مدمجة (شرائح/مقابض/أزرار مربعة صغيرة) — أغمق من bgPanel،
   * كانت مكرَّرة كقيمة hex ثابتة بأربعة ملفات (نفس الاستخدام بالضبط: حاوية عنصر تحكم
   * مضغوط بحدّ colors.border/colors.accent)؛ وُحِّد هنا بلا أي تغيير بصري. */
  controlBg: '#0A1524',
  /** حدّ بطاقة "بارزة" داكن مزرَق (DXY/hero/شاشة أكاديمية) — كان مكرَّراً كقيمة hex
   * ثابتة بثلاثة ملفات لنفس المعنى البصري (حدّ تمييز أغمق من colors.border العادي). */
  heroBorder: '#1E3A5F',
  /** خلفية البطاقة "البارزة" المرافقة لـheroBorder (DXY/hero) — كانت مكرَّرة بملفين
   * بنفس الزوج بالضبط (heroBorder+heroBg معاً). */
  heroBg: '#0E1728',
  /** أخضر "قائد التزامن" — أفتح/أسطع من colors.bull عمداً لتمييز شارة "القائد" عن
   * إشارات الربح/الخسارة العادية؛ كان مكرَّراً كقيمة hex ثابتة بملفين لنفس المعنى. */
  leaderGreen: '#4ADE80',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
};

/** مدد حركة قصيرة للأفعال المهمة فقط */
export const motion = {
  snap: 160,
  panel: 220,
};

/**
 * توكنات زر رئيسي بإيحاء لمسي (ممتلئ + ظل خفيف + ضغط).
 * للاستخدام لاحقاً على أزرار الإجراءات المهمة فقط — لا لكل نقرة.
 */
export const buttons = {
  /** ظل من الأسفل يعطي عمقاً خفيفاً للزر الممتلئ */
  shadowColor: '#000000',
  shadowOpacity: 0.28,
  shadowRadius: 6,
  shadowOffsetY: 3,
  /** elevation لأندرويد */
  elevation: 4,
  /** حالة الضغط: تصغير خفيف */
  pressedScale: 0.96,
  /** حالة الضغط: شفافية خفيفة */
  pressedOpacity: 0.9,
};

/** حشوة اللوحات داخل فريم الشبكة — بجانب مقبض النقاط التسع */
export const frameEmbed = {
  padTop: 10,
  padLeft: 50,
  padRight: 10,
  padBottom: 8,
};

/** صف عنوان موحّد: العنوان يساراً بجانب المقبض · الزر/فراغ يميناً */
export const frameEmbedHead = {
  flexDirection: 'row-reverse' as const,
  justifyContent: 'space-between' as const,
  alignItems: 'flex-start' as const,
  gap: 10,
  marginBottom: spacing.sm,
};

/** يمنع العنوان من الانتشار إلى يمين المربع */
export const frameEmbedTitleBlock = {
  flexGrow: 0,
  flexShrink: 1,
  alignSelf: 'flex-start' as const,
  maxWidth: '78%' as `${number}%`,
};

export const frameEmbedTitle = {
  textAlign: 'left' as const,
};

export const frameEmbedSub = {
  textAlign: 'left' as const,
};

export const frameEmbedHeadTail = {
  flex: 1,
  minWidth: 12,
};
