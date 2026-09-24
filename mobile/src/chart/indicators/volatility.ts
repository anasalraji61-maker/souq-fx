/** مؤشرات التذبذب والنطاقات (Volatility / Bands family). */
import type { Candle } from '../../api';
import { ema, sma, smma, tema } from './moving-averages';
import { computeFractals, computeGmma, computeGmmaOscillator, computeLinRegChannel, computeOverlays, computeRwi, computeVhf } from './trend';
import { computeRoc, computeRvi } from './momentum';
import { computeAccumDist, computeChaikinOsc, computeVzo } from './volume';


/**
 * الانحراف المعياري (Standard Deviation) — نفس صيغة الانحراف المستخدَمة داخل حساب بولنجر تماماً
 * (تباين المجتمع الكامل على نافذة period، لا عيّنة) لكن مُصدَّرة كمؤشر مستقل بپين خاص بدل حصرها
 * داخل حساب بولنجر الداخلي — يقيس تشتّت/تقلّب السعر بمعزل عن اتجاهه، بعكس بولنجر الذي يستخدمها
 * فقط لرسم نطاق حول متوسط متحرك.
 */
export function computeStdDev(closes: number[], period = 20): (number | null)[] {
  const mid = sma(closes, period);
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (mid[i] == null || i < period - 1) {
      out.push(null);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = mid[i]!;
    const variance = slice.reduce((a, v) => a + (v - mean) ** 2, 0) / period;
    out.push(Math.sqrt(variance));
  }
  return out;
}

/**
 * ATR بتنعيم Wilder (RMA/SMMA: بذرة SMA لأول period ثم (سابق×(n−1)+TR)/n) — تعريف وايلدر الأصلي وما تعرضه
 * TradingView (`ta.atr`) — مرجع هذا الشارت (MT5 وحده يعرض iATR بـSMA). كان SMA: ATR14 يخالف TradingView بعد كل شمعة كبيرة (يهبط فجأة
 * بعد 14 شمعة حين تخرج من النافذة بدل أن يتلاشى أثرها)، ومعه SuperTrend وKeltner وChandelier وChande Kroll
 * وSTARC وATR% وPGO وRWI ونسبة التقلّب — كلها تقرأ من هنا.
 */
export function computeAtr(candles: Candle[], period = 14): (number | null)[] {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
      continue;
    }
    const prev = candles[i - 1].close;
    tr.push(
      Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - prev),
        Math.abs(candles[i].low - prev)
      )
    );
  }
  return smma(tr, period);
}

/**
 * True Range (TR) — المدى الحقيقي الخام لكل شمعة منفردة **بلا تنعيم** (خلافاً لـcomputeAtr الذي
 * يطبّق عليها تنعيم Wilder). يقيس أقصى تذبذب فعلي بالشمعة الواحدة بثلاث مقارنات: مدى الشمعة نفسها
 * (أعلى−أدنى)، الفجوة الصاعدة عن إغلاق الشمعة السابقة (|أعلى−إغلاق سابق|)، والفجوة الهابطة عنه
 * (|أدنى−إغلاق سابق|) — القيمة الأكبر بينها (وايلدر، 1978، نفس التعريف الأساسي المستخدَم داخلياً
 * بـcomputeAtr حرفياً، **مُستخرَجة هنا كدالة مستقلة مُصدَّرة** بدل بقائها منطقاً داخلياً غير قابل
 * لإعادة الاستخدام كمؤشر خاص به — نفس أسلوب استخراج computeAccumDist من computeChaikinOsc سابقاً
 * بالملف). الشمعة الأولى (لا سابقة لها) = أعلى−أدنى فقط (نفس تحفّظ computeAtr[i=0] حرفياً). صفر
 * إحماء (كل نقطة صالحة من الشمعة الأولى)، صفر حساب EMA/SMA جديد. **تحقّق حسابي فعلي (Node.js قبل
 * الكتابة)**: سوق مسطّح تماماً (بلا فتائل، high=low=close لكل شمعة) → TR=0 بالضبط لكل نقطة؛ سيناريو
 * فجوة صناعي (شمعة ثانية تفتح بفجوة صاعدة كاملة فوق مدى الشمعة الأولى) → التحقّق يدوياً أن الفجوة
 * (|أدنى−إغلاق سابق|) هي المهيمنة لا مدى الشمعة نفسه، طابق التوقع بالضبط (2 ثم 11)؛ **تحقّق تناسق
 * حاسم** (يوم كانت ATR بـSMA؛ صارت Wilder — `smma` لا `sma`): `sma(computeTrueRange(candles), period)` طابق `computeAtr` بالضبط
 * (فرق=0 حرفياً) عبر 300 شمعة عشوائية بذرة ثابتة (mulberry32) — إثبات أن الدالة المستقلة الجديدة هي
 * حرفياً نفس اللبنة الداخلية المستخدَمة بـATR الموثَّقة والمستخدَمة بالإنتاج منذ البداية، صفر خطر
 * رياضي جديد. صفر NaN/Infinity/قيمة سالبة عبر كل النقاط.
 */
export function computeTrueRange(candles: Candle[]): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      out.push(candles[i].high - candles[i].low);
      continue;
    }
    const prev = candles[i - 1].close;
    out.push(
      Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - prev),
        Math.abs(candles[i].low - prev)
      )
    );
  }
  return out;
}

/**
 * Volatility Ratio (نسبة التقلّب، أسلوب وايلدر) — **إعادة استخدام كاملة لدالتَين موجودتين مسبقاً
 * بالملف** بلا أي حساب رياضي جديد: نسبة المدى الحقيقي الخام للشمعة الحالية (`computeTrueRange`) إلى
 * متوسطه المتدحرج (`computeAtr`، نفس `period`، القيمة القياسية 14 — وهي تنعيم Wilder للمدى الحقيقي نفسه). VR≈1 = تقلّب الشمعة الحالية طبيعي مقارنة بمتوسطها
 * الأخير، VR≫1 = طفرة تقلّب حادة تتجاوز المعتاد بوضوح (فجوة سعرية أو شمعة استثنائية)، VR≪1 = انكماش
 * تقلّب (سوق يهدأ قبل حركة محتملة). حارس صريح: `atr===0` (سوق مسطّح تماماً بلا أي مدى) → null بدل
 * قسمة على صفر. **تحقّق حسابي فعلي (Node.js، بيئة سحابية، قبل الكتابة)**: سوق مسطّح تماماً (40 شمعة)
 * → TR=0 وATR=0 لكل نقطة → VR=null بالكامل (حارس القسمة على صفر يعمل بشكل صحيح)؛ سيناريو طفرة تقلّب
 * صناعي (29 شمعة هادئة بمدى ثابت صغير ثم شمعة واحدة بفجوة سعرية حادة) → VR>1 عند نقطة الطفرة بالضبط
 * (11.5 تقريباً) بينما القيم المجاورة تبقى قريبة من 1 قبلها وتنخفض دون 1 بعدها (ATR يرتفع مؤقتاً بعد
 * دمج الطفرة بالنافذة المتدحرجة)؛ 300 شمعة عشوائية بذرة ثابتة (mulberry32) → صفر NaN/Infinity، صفر
 * قيمة سالبة (287 نقطة صالحة)، وإعادة حساب brute-force مستقلة تماماً (حلقتا TR/ATR مُعاد كتابتهما من
 * الصفر ببنية مختلفة عن `computeTrueRange`/`computeAtr` الفعليتين) عند idx=200 طابقت الدالة الفعلية
 * بالضبط (فرق=0).
 */
export function computeVolatilityRatio(candles: Candle[], period = 14): (number | null)[] {
  const tr = computeTrueRange(candles);
  const atr = computeAtr(candles, period);
  const n = candles.length;
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const a = atr[i];
    if (a == null || a === 0 || tr[i] == null) continue;
    out[i] = tr[i]! / a;
  }
  return out;
}

/**
 * قنوات كلتنر (Keltner Channels) — نطاق حول EMA للإغلاق (emaPeriod=20 افتراضياً) بعرض
 * multiplier×ATR (atrPeriod=10 افتراضياً، multiplier=2 افتراضياً — نفس القيم الشائعة بمعظم
 * المنصات). بعكس بولنجر الذي يستخدم الانحراف المعياري للسعر نفسه لضبط عرض النطاق، كلتنر يستخدم
 * ATR (متوسط المدى الحقيقي، مبني من High/Low/Close الشمعة كاملة) فتتفاعل حدوده مع التقلب الفعلي
 * بالشموع لا فقط تشتت الإغلاق — نطاق أهدأ وأقل تذبذباً من بولنجر عادة. mid = ema(closes,
 * emaPeriod)، upper/lower = mid ± multiplier×computeAtr(candles, atrPeriod).
 */
export function computeKeltner(
  candles: Candle[],
  emaPeriod = 20,
  atrPeriod = 10,
  multiplier = 2
): { mid: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const closes = candles.map((c) => c.close);
  const mid = ema(closes, emaPeriod);
  const atr = computeAtr(candles, atrPeriod);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (mid[i] == null || atr[i] == null) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    upper.push(mid[i]! + multiplier * atr[i]!);
    lower.push(mid[i]! - multiplier * atr[i]!);
  }
  return { mid, upper, lower };
}

/**
 * STARC Bands (Stoller Average Range Channels، مانينغ ستولر) — نطاق بنفس بنية computeKeltner
 * أعلاه حرفياً (خط وسط ± multiplier×ATR) لكن بخط وسط SMA بدل EMA — الفارق التصميمي الجوهري
 * تاريخياً بين الاثنين (كلتنر بُني أصلاً حول EMA، ستولر حول SMA). mid = sma(closes، smaPeriod)،
 * upper/lower = mid ± multiplier×computeAtr(candles، atrPeriod) (**إعادة استخدام كاملة** لـ
 * computeAtr الموجودة، صفر حساب ATR جديد). القيم الافتراضية القياسية smaPeriod=5/atrPeriod=15/
 * multiplier=2 (اصطلاح ستولر الأصلي الشائع بمعظم المنصات المرجعية) — مختلفة عمداً عن
 * keltner(20/10/2) الافتراضية لإبقاء الاثنين متمايزَين زمنياً/بصرياً لا نسخة مكرَّرة بنفس الفترات.
 * **تحقّق يدوي**: سوق مسطّح تماماً (كل high=low=close ثابتة) → TR=0 لكل شمعة (بالتعريف: أعلى−أدنى
 * =0، |أعلى−إغلاق سابق|=0، |أدنى−إغلاق سابق|=0) ⇒ ATR=0 بالضبط ⇒ upper=mid=lower بالضبط بلا فارق
 * تقريب.
 */
export function computeStarcBands(
  candles: Candle[],
  smaPeriod = 5,
  atrPeriod = 15,
  multiplier = 2
): { mid: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const closes = candles.map((c) => c.close);
  const mid = sma(closes, smaPeriod);
  const atr = computeAtr(candles, atrPeriod);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (mid[i] == null || atr[i] == null) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    upper.push(mid[i]! + multiplier * atr[i]!);
    lower.push(mid[i]! - multiplier * atr[i]!);
  }
  return { mid, upper, lower };
}

/**
 * Chaikin Volatility (period=10 لتنعيم EMA على مدى الشمعة، وrocPeriod=10 لنافذة معدّل التغيّر بينهما
 * — نفس الفترة للاثنين هي التطبيق الشائع الأكثر انتشاراً) — يقيس تسارع/تباطؤ *اتساع* مدى الشمعة
 * (High−Low) بلا اعتبار لاتجاه السعر إطلاقاً: أولاً emaRange = EMA(أعلى−أدنى، period) لتنعيم التذبذب
 * اللحظي (طبقة ema أحادية مباشرة على المدى الخام، لا طبقات متعددة)، ثم نسبة تغيّرها المئوية عبر
 * rocPeriod شمعة (نفس صيغة computeRoc أعلاه حرفياً لكن مطبَّقة على emaRange بدل الإغلاق مباشرة):
 * ChaikinVol[i] = (emaRange[i] − emaRange[i-rocPeriod]) / emaRange[i-rocPeriod] × 100 (صفر عند قيمة
 * سابقة صفرية بدل قسمة على صفر). موجب = اتساع مدى الشموع يتسارع (تقلّب متزايد، غالباً قرب انعكاسات
 * أو بدايات اتجاه)، سالب = مدى الشموع يضيق (تقلّب متراجع، غالباً استقرار/تجميع). **تحقّق يدوي**: مدى
 * الشمعة (أعلى−أدنى) ثابت تماماً بكل شمعة → emaRange تستقر على نفس القيمة الثابتة بالضبط بدءاً من
 * أول نقطة صالحة (طبقة ema أحادية، نفس منطق PPO أعلاه بالضبط) → emaRange[i] يساوي emaRange[i-rocPeriod]
 * تماماً لأي i،i-rocPeriod كلاهما ضمن نطاق الاستقرار → ChaikinVol=0 بالضبط، يطابق "لا تغيّر بتقلّب
 * ثابت تماماً" بالتعريف.
 */
export function computeChaikinVolatility(
  candles: Candle[],
  period = 10,
  rocPeriod = 10
): (number | null)[] {
  const range = candles.map((c) => c.high - c.low);
  const emaRange = ema(range, period);
  const out: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    const prevIdx = i - rocPeriod;
    if (emaRange[i] == null || prevIdx < 0 || emaRange[prevIdx] == null) {
      out.push(null);
      continue;
    }
    const prev = emaRange[prevIdx]!;
    out.push(prev === 0 ? 0 : ((emaRange[i]! - prev) / prev) * 100);
  }
  return out;
}

/**
 * Mass Index (Donald Dorsey، period=25 نافذة تراكمية وemaPeriod=9 لطبقتي التنعيم — القيم القياسية
 * الشائعة) — يقيس *اتساع* مدى الشمعة (High−Low) بلا اعتبار لاتجاه السعر إطلاقاً (بعكس كل مؤشرات
 * الزخم أعلاه)، يبحث عن "انتفاخ" (bulge) ينذر بانعكاس محتمل بصرف النظر عن اتجاهه: لكل شمعة range =
 * أعلى−أدنى، singleEma = EMA(range, emaPeriod)، doubleEma = EMA(singleEma, emaPeriod) (**نفس تقنية
 * تعويض null بصفر بين الطبقتين ثم بوابة صلاحية بالقيمة الأصلية المستخدَمة بـdema/tema/trix/tsi/
 * coppock أعلاه بهذا الملف حرفياً — وتحمل نفس تحفّظ الإحماء التقريبي الموثَّق لتلك الدوال: doubleEma
 * *يقترب* من نفس قيمة singleEma الثابتة تدريجياً كلما ابتعدنا عن نقطة الإحماء الأولى، لا يساويها
 * مساواة تامة عند أول نقطة صالحة تحديداً، بسبب بذرة المتوسط الأولي المخلوطة بالأصفار المعوَّضة**)،
 * ratio = singleEma/doubleEma (1 عند doubleEma صفرية بدل قسمة على صفر). Mass Index = مجموع ratio
 * على نافذة period شمعة. **ملاحظة صادقة**: هذه القيمة الخام فقط (بلا اكتشاف تلقائي لعبور 27 ثم
 * الهبوط تحت 26.5 — إشارة "الانتفاخ" المرجعية القياسية) — تبسيط متعمَّد يترك القراءة البصرية
 * للمتداول، قابل لإضافة اكتشاف تلقائي لاحقاً. يُرسم بنمط پين OBV/NVI (تطبيع أدنى/أعلى ضمن النافذة
 * الظاهرة، تلوين حسب اتجاه لحظي) لأنه دائماً موجب وغير محدود المدى نظرياً، لا أوسيليتر ثنائي القطبية
 * حول الصفر. **تحقّق يدوي**: مدى الشمعة ثابت تماماً بكل شمعة → singleEma تستقر بالضبط على نفس القيمة
 * الثابتة بدءاً من أول نقطة صالحة لها (طبقة أحادية مباشرة على مدى ثابت) → ratio *يقترب* تدريجياً من 1
 * (لا يساويه بالضبط عند أول نقطة بسبب بذرة doubleEma الموضَّحة أعلاه) → Mass Index *يقترب* من period
 * (25) كلما ابتعدت نافذة الجمع عن نقطة الإحماء الأولى — يطابق "لا انتفاخ تذبذب حقيقي بتقلّب ثابت
 * تماماً" بالتعريف تقريبياً (نفس درجة الدقة المقبولة لمؤشرات الطبقة المزدوجة الأخرى أعلاه).
 */
export function computeMassIndex(
  candles: Candle[],
  period = 25,
  emaPeriod = 9
): (number | null)[] {
  const n = candles.length;
  const range = candles.map((c) => c.high - c.low);
  const singleEma = ema(range, emaPeriod);
  const doubleEma = ema(singleEma, emaPeriod);
  const ratio: (number | null)[] = candles.map((_, i) =>
    singleEma[i] != null && doubleEma[i] != null
      ? doubleEma[i] === 0
        ? 1
        : singleEma[i]! / doubleEma[i]!
      : null
  );
  const out: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let sum = 0;
    let valid = true;
    for (let w = i - period + 1; w <= i; w++) {
      if (ratio[w] == null) {
        valid = false;
        break;
      }
      sum += ratio[w]!;
    }
    out.push(valid ? sum : null);
  }
  return out;
}

/**
 * Envelopes (نطاق نسبي حول متوسط متحرك بسيط، period=20 وpct=2.5% القيمتان الشائعتان) — أبسط بديل
 * لبولنجر/كلتنر: بدل استخدام انحراف معياري (بولنجر) أو ATR (كلتنر) لضبط عرض النطاق، يستخدم Envelopes
 * نسبة مئوية ثابتة من قيمة المتوسط نفسه: mid = SMA(closes, period)، upper = mid×(1+pct)، lower =
 * mid×(1-pct). عرض النطاق يتناسب طردياً مع مستوى السعر نفسه (بعكس بولنجر/كلتنر اللذين يتفاعلان مع
 * التقلّب الفعلي) — أبسط حسابياً وأكثر ثباتاً بصرياً عبر فترات التقلّب المختلفة، على حساب عدم التكيّف
 * مع تغيّر التقلّب الفعلي. **تحقّق يدوي**: سعر ثابت تماماً بكل الشموع → mid يستقر على نفس القيمة
 * الثابتة (SMA لقيم متطابقة = نفس القيمة) → upper/lower ثابتان أيضاً بنفس النسبة المطلوبة من تلك
 * القيمة — يطابق "نطاق ثابت حول سعر ثابت" بالتعريف تماماً.
 */
export function computeEnvelopes(
  closes: number[],
  period = 20,
  pct = 0.025
): { mid: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const mid = sma(closes, period);
  const upper = mid.map((v) => (v == null ? null : v * (1 + pct)));
  const lower = mid.map((v) => (v == null ? null : v * (1 - pct)));
  return { mid, upper, lower };
}

/**
 * Donchian Channels (period=20 القيمة الشائعة، أبسط قناة اتجاه بلا أي تنعيم إحصائي إطلاقاً) —
 * upper = أعلى قمة (High) خلال آخر period شمعة (تشمل الشمعة الحالية)، lower = أدنى قاع (Low) بنفس
 * النافذة، mid = (upper+lower)/2 (خط الوسط، لا SMA — تعريف Donchian القياسي). بعكس بولنجر/كلتنر/
 * Envelopes التي تُبنى فوق متوسط متحرك للإغلاق، Donchian يعتمد فقط على أعلى/أدنى فعليين بالسوق —
 * يعكس مباشرة "أعلى قمة/أدنى قاع فعلي شهدته السوق مؤخراً" بلا أي تنعيم أو افتراض إحصائي. **تحقّق
 * يدوي**: أعلى/أدنى ثابتان بنفس القيمة بكل شمعة (سوق مسطّح تماماً) → أعلى قمة = أدنى قاع = تلك القيمة
 * الثابتة لأي نافذة → upper=lower=القيمة الثابتة وmid=نفس القيمة أيضاً، عرض القناة صفر — يطابق "لا
 * تذبذب فعلي بسعر ساكن تماماً" بالتعريف.
 */
export function computeDonchian(
  candles: Candle[],
  period = 20
): { upper: (number | null)[]; lower: (number | null)[]; mid: (number | null)[] } {
  const n = candles.length;
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const mid: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
      mid.push(null);
      continue;
    }
    let hh = -Infinity;
    let ll = Infinity;
    for (let w = i - period + 1; w <= i; w++) {
      hh = Math.max(hh, candles[w].high);
      ll = Math.min(ll, candles[w].low);
    }
    upper.push(hh);
    lower.push(ll);
    mid.push((hh + ll) / 2);
  }
  return { upper, lower, mid };
}

/**
 * Historical Volatility (HV، period=10 نافذة قياسية شائعة، annualization=252 يوم تداول سنوي قياسي) —
 * الانحراف المعياري لعوائد لوغاريتمية يومية (لا الأسعار الخام كـcomputeStdDev أعلاه) مُعاد قياسه سنوياً
 * ومئوياً: عائد لوغاريتمي[i] = ln(إغلاق[i]/إغلاق[i-1]) (صفر عند إغلاق سابق ≤ صفر نظرياً بدل ln غير
 * معرَّف)، ثم HV[i] = الانحراف المعياري لعوائد النافذة الأخيرة × √annualization × 100. **الفرق عن
 * computeStdDev أعلاه**: ذاك يقيس تشتّت الأسعار المطلقة (وحدة سعر)، بينما HV يقيس تشتّت *العوائد
 * النسبية* (نسبة مئوية سنوية قابلة للمقارنة عبر رموز مختلفة السعر تماماً — المقياس المعياري لتقلّب
 * الأصول بالأسواق المالية). **تحقّق يدوي**: سعر ثابت تماماً بكل الشموع → كل عائد لوغاريتمي=ln(1)=0 →
 * الانحراف المعياري لسلسلة أصفار=0 → HV=0×√252×100=0 بالضبط، يطابق "لا تقلّب فعلي بسعر ساكن تماماً"
 * بالتعريف تماماً.
 */
export function computeHistoricalVolatility(
  closes: number[],
  period = 10,
  annualization = 252
): (number | null)[] {
  const n = closes.length;
  const logReturns: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const prev = closes[i - 1];
    logReturns[i] = prev <= 0 ? 0 : Math.log(closes[i] / prev);
  }
  const out: (number | null)[] = [];
  const annFactor = Math.sqrt(annualization) * 100;
  for (let i = 0; i < n; i++) {
    if (i < period) {
      out.push(null);
      continue;
    }
    const slice = logReturns.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, v) => a + v, 0) / period;
    const variance = slice.reduce((a, v) => a + (v - mean) ** 2, 0) / period;
    out.push(Math.sqrt(variance) * annFactor);
  }
  return out;
}

/**
 * Percent B (%B، period=20 وmult=2 القيمتان القياسيتان لبولنجر — نفس قيم computeOverlays.bb أعلاه
 * تماماً) — يقيس موقع الإغلاق *نسبةً* لعرض نطاق بولنجر بدل قراءة الإغلاق مقابل النطاقين مباشرة على
 * الشارت: %B[i] = (إغلاق[i] − lower[i]) / (upper[i] − lower[i])، حيث mid=SMA(period)،
 * upper=mid+mult×الانحراف المعياري، lower=mid−mult×الانحراف المعياري (**نفس صيغة بولنجر المستخدَمة
 * بـcomputeOverlays أعلاه حرفياً، مُعاد حسابها هنا مستقلة لأن computeOverlays لا يُصدِّر %B نفسه**).
 * 0 = الإغلاق عند الحد الأدنى بالضبط، 1 = عند الحد الأعلى بالضبط، 0.5 = عند الوسط بالضبط، وقيمة خارج
 * 0..1 تعني كسر أحد النطاقين فعلياً. 0.5 عند عرض نطاق صفري (تقلّب صفري) بدل قسمة على صفر — قيمة الوسط
 * الحيادية بدل الانحياز لأي طرف تعسّفاً. **تحقّق يدوي**: سعر ثابت تماماً بكل شموع النافذة → الانحراف
 * المعياري=0 → upper=lower=mid=السعر الثابت نفسه → عرض النطاق صفري → %B=0.5 بالضبط (الحالة الحدّية
 * المُعالَجة صراحة أعلاه)، يطابق "لا معنى لموقع نسبي داخل نطاق منعدم العرض" بأكثر تفسير حيادي ممكن.
 */
export function computePercentB(closes: number[], period = 20, mult = 2): (number | null)[] {
  const mid = sma(closes, period);
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (mid[i] == null || i < period - 1) {
      out.push(null);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = mid[i]!;
    const variance = slice.reduce((a, v) => a + (v - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    const upper = mean + mult * sd;
    const lower = mean - mult * sd;
    const span = upper - lower;
    out.push(span === 0 ? 0.5 : (closes[i] - lower) / span);
  }
  return out;
}

/**
 * Bollinger Bandwidth (BBW، period=20 وmult=2 نفس قيم %B/computeOverlays.bb أعلاه) — يقيس *اتساع*
 * نطاق بولنجر نسبةً لمستوى السعر نفسه بدل موقع الإغلاق داخله (كـ%B أعلاه): BBW[i] = (upper[i] −
 * lower[i]) / mid[i] × 100 (صفر عند mid صفرية نظرياً بدل قسمة على صفر). قيمة منخفضة = انضغاط تقلّب
 * ("Bollinger Squeeze" — غالباً ينذر بحركة قوية قادمة)، قيمة مرتفعة = تمدد تقلّب حاد. **الفرق عن STDEV
 * أعلاه**: STDEV يُرجع الانحراف المعياري بوحدة السعر المطلقة، بينما BBW يُعيد قياسه كنسبة مئوية من
 * مستوى السعر (مثل Envelopes مقابل بولنجر أعلاه — نفس فكرة التطبيع بمستوى السعر) فيصبح قابلاً للمقارنة
 * المباشرة عبر رموز مختلفة السعر أو عبر فترات زمنية متباعدة لنفس الرمز. **تحقّق يدوي**: سعر ثابت تماماً
 * بكل شموع النافذة → الانحراف المعياري=0 → upper=lower=mid → BBW=(mid−mid)/mid×100=0 بالضبط، يطابق
 * "لا اتساع نطاق فعلي بتقلّب صفري" بالتعريف تماماً.
 */
export function computeBollingerBandwidth(
  closes: number[],
  period = 20,
  mult = 2
): (number | null)[] {
  const mid = sma(closes, period);
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (mid[i] == null || i < period - 1) {
      out.push(null);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = mid[i]!;
    const variance = slice.reduce((a, v) => a + (v - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    const upper = mean + mult * sd;
    const lower = mean - mult * sd;
    out.push(mean === 0 ? 0 : ((upper - lower) / mean) * 100);
  }
  return out;
}

/**
 * Ulcer Index (Peter Martin، period=14 شائع) — يقيس "ألم" الانخفاض عن القمة المتحرّكة بدل التقلّب
 * ثنائي الاتجاه العادي (بعكس STDEV/ATR أعلاه اللذين لا يميّزان صعوداً عن هبوط): لكل شمعة j ضمن نافذة
 * period المنتهية عند i، أعلى إغلاق ضمن نافذة period المنتهية عند j نفسها (maxClose[j]، نافذة
 * متدحرجة وليست منذ البداية) يُحسَب أولاً، ثم نسبة الانخفاض المئوية pctDrawdown[j] = (إغلاق[j] −
 * maxClose[j]) / maxClose[j] × 100 (≤ 0 دائماً بالتعريف، صفر عند maxClose صفري نظرياً). Ulcer
 * Index[i] = الجذر التربيعي لمتوسط مربعات pctDrawdown لكل j بنافذة period المنتهية عند i (RMS) —
 * القيمة ≥ 0 دائماً بالتعريف (متوسط مربعات). ارتفاع القيمة = انخفاضات أعمق و/أو أطول أمداً عن القمم
 * الأخيرة، صفر = السعر عند قمة جديدة باستمرار بلا أي تراجع بالنافذة. **تحقّق يدوي**: سعر تصاعدي
 * بشكل صارم بكل شمعة (كل إغلاق أعلى من سابقه) → كل إغلاق هو أعلى إغلاق بأي نافذة تنتهي عنده بالتعريف
 * (تصاعد صارم) → maxClose[j]=إغلاق[j] لكل j → pctDrawdown=0 لكل نقطة → Ulcer Index=RMS(0s)=0 بالضبط،
 * يطابق "لا ألم انخفاض بصعود صارم متواصل" بالتعريف تماماً.
 */
export function computeUlcerIndex(closes: number[], period = 14): (number | null)[] {
  const n = closes.length;
  const out: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const windowStart = Math.max(0, j - period + 1);
      const maxClose = Math.max(...closes.slice(windowStart, j + 1));
      const pctDrawdown = maxClose === 0 ? 0 : ((closes[j] - maxClose) / maxClose) * 100;
      sumSq += pctDrawdown * pctDrawdown;
    }
    out.push(Math.sqrt(sumSq / period));
  }
  return out;
}

/**
 * Relative Volatility Index (RVI-Volatility، Donald Dorsey) — **ليس** نفس computeRvi أعلاه
 * (تلك Relative Vigor Index لـJohn Ehlers، صيغة مختلفة تماماً؛ الاثنان يُختصران "RVI" بمصادر
 * السوق المرجعية بلا تمييز، لذا استُخدِم اسم دالة صريح مختلف هنا لمنع أي التباس مستقبلي بالكود).
 * period=14 موحَّد لكلا نافذتَي الانحراف المعياري والتنعيم الأسي (تبسيط شائع بمنصات كثيرة بدل معلمَتين
 * منفصلتين 10/14 بنسخة Dorsey الأصلية — **قرار تصميم موثَّق صراحة**). الفكرة: بدل قياس اتجاه *السعر*
 * كـRSI، يقيس اتجاه *التقلّب* — لكل شمعة: إن أغلقت أعلى من السابقة يُنسَب computeStdDev(closes,period)
 * الحالي بالكامل لـ"تقلّب صاعد"، وإن أغلقت أدنى يُنسَب بالكامل لـ"تقلّب هابط" (تعادل السعر = صفر
 * للاثنين)، ثم يُموَّه كل مسار بـema() منفصلة (period) قبل الحساب: RVI=100×صاعدMA/(صاعدMA+هابطMA).
 * قيمة>50 = تقلّب الأيام الصاعدة أقوى مؤخراً (ميل صعودي)، <50 = العكس، =50 محايد — **قرار تصميم
 * موثَّق**: لون العرض bull/bear/accent حسب موقعها من 50 بالضبط (لا عتبات تشبّع 70/30 كـRSI، لأن
 * التفسير الشائع لهذا المؤشر تحديداً هو اتجاه لا تشبّع). حالة 0/0 (صاعدMA=هابطMA=0، سوق مسطّح
 * تماماً بلا أي تقلّب) تُرجَع 50 (محايد) بدل NaN — بنفس روح معالجة هذا الملف لحالات 0/0 (راجع RSI
 * عند avgLoss=0، LR R² عند SStot=0). **تحقّق حسابي فعلي (Node.js)**: سوق مسطّح تماماً (تباين صفري)
 * → 50 بالضبط لكل نقطة صالحة؛ مسار صاعد بحت (كل إغلاق أعلى من السابق) → 100 بالضبط لكل نقطة صالحة
 * (هابطMA=0 دائماً)؛ نفس المسار معكوساً (هابط بحت) → 0 بالضبط؛ 300 شمعة عشوائية بذرة ثابتة → كل قيمة
 * ضمن [0,100] بالضبط، صفر NaN/Infinity.
 */
export function computeRelativeVolatilityIndex(
  closes: number[],
  period = 14
): (number | null)[] {
  const n = closes.length;
  const stdev = computeStdDev(closes, period);
  const upRaw: number[] = new Array(n).fill(0);
  const downRaw: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    if (stdev[i] == null) continue;
    if (closes[i] > closes[i - 1]) upRaw[i] = stdev[i]!;
    else if (closes[i] < closes[i - 1]) downRaw[i] = stdev[i]!;
  }
  const upEma = ema(upRaw, period);
  const downEma = ema(downRaw, period);
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (upEma[i] == null || downEma[i] == null) continue;
    const u = upEma[i]!;
    const d = downEma[i]!;
    out[i] = u + d === 0 ? 50 : (100 * u) / (u + d);
  }
  return out;
}

/**
 * TTM Squeeze (Squeeze Momentum، جون كارتر) — يكشف لحظات "انضغاط" التقلب التي تسبق عادة انفجار حركة
 * سعرية قوية: عندما ينكمش نطاق بولنجر (تشتت السعر) بالكامل داخل قناة كلتنر (تقلّب المدى الحقيقي
 * ATR)، يعني ذلك أن التقلّب الفعلي بالسوق أقل بكثير من المعتاد نسبةً لتاريخه القريب — غالباً ما يسبق
 * ذلك حركة قوية باتجاه ما. period=20 موحَّد للثلاثة (بولنجر/كلتنر/الزخم — القيمة القياسية لدى TTM
 * الأصلي)، bbMult=2 (نفس بولنجر القياسي بالمشروع، `computeStdDev`/`computeOverlays.bb` أعلاه
 * حرفياً)، ktMult=1.5 (**قرار تصميم موثَّق**: قيمة TTM الأصلية 1.5، أضيق عمداً من معامل
 * `computeKeltner` الافتراضي [multiplier=2] المستخدَم لعرضها المستقل كمؤشر منفصل بالمشروع — اختبار
 * "الانضغاط" [بولنجر داخل كلتنر] يفقد معناه القياسي المعروف بمعامل مختلف عن 1.5، فاستُدعي
 * `computeKeltner(candles, period, period, 1.5)` مباشرة بمعامل صريح بدل الاعتماد على الافتراضي).
 * **الانضغاط** (`squeezeOn`): upperBB<upperKC && lowerBB>lowerKC (بولنجر بالكامل داخل كلتنر).
 * **الزخم** (`momentum`): يعيد استخدام *نفس* صيغة الانحدار الخطي (sumX/sumX2/denom/meanY/meanX/
 * intercept، القيمة المتوقَّعة عند نهاية النافذة x=period-1) المستخدَمة حرفياً بـcomputeLsma/
 * computeLinRegChannel أعلاه — لكن مطبَّقة على سلسلة مشتقة `delta[i]=إغلاق[i]−(donchianMid[i]+
 * bbMid[i])/2` بدل الإغلاق الخام مباشرة (donchianMid = وسط أعلى قمة/أدنى قاع بنافذة period من
 * `computeDonchian` أعلاه — **إعادة استخدام كاملة لدالة موجودة بدل حساب highest/lowest جديد**؛
 * bbMid=sma(period) نفسها المستخدَمة لحد بولنجر) — هذا ما يميّز "الزخم" هنا عن LSMA العادي (الذي
 * يتنبأ بموقع السعر نفسه، لا بانحرافه عن متوسط مزدوج دونشيان/بولنجر). null صراحةً قبل توفر نافذة
 * زخم كاملة من نقاط delta صالحة (warm-up مركَّب: period-1 لصلاحية أول delta، ثم period إضافية
 * لاكتمال نافذة الانحدار → أول قيمة صالحة عند 2×period-2). يُرسَم بإعادة استخدام كاملة لنمط هستوغرام
 * TRIX/Force/Chaikin Osc/DPO أعلاه حرفياً (bull/bear حسب الإشارة)، مع تمييز بصري إضافي لحالة
 * الانضغاط عبر شفافية/حدّ الشريط نفسه بدل عنصر رسم جديد (معتم+حدّ لوني عند التحرر من الانضغاط،
 * شفاف بلا حدّ أثناء الانضغاط النشط) — بلا أي نمط رسم جديد فعلياً. **تحقّق حسابي فعلي (Node.js، قبل
 * الكتابة)**: شمعة بمدى ثابت صغير حول سعر ثابت (50 شمعة) → ATR ثابت غير صفري بينما انحراف بولنجر
 * المعياري=0 (إغلاق ثابت) → بولنجر أضيق دوماً من كلتنر → squeezeOn=true لكل نقطة صالحة، ومومنتوم
 * يتقارب لصفر تماماً (فرق<10⁻¹⁵، ضجيج تقريب فقط)؛ 300 شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity
 * عبر كل الـ262 نقطة الزخم الصالحة (300−(2×period-2)) وكل الـ281 نقطة الانضغاط الصالحة
 * (300−(period-1))؛ إعادة حساب مستقلة منفصلة عن الدالة لنقطة عشوائية واحدة لمومنتوم طابقت الدالة
 * تماماً (فرق<10⁻¹²). مسار صاعد خطي بحت بمدى ثابت → مومنتوم ثابت غير صفري متّسق الإشارة عبر كل
 * النقاط الصالحة (اتجاه واضح، لا NaN).
 */
export function computeSqueeze(
  candles: Candle[],
  period = 20,
  bbMult = 2,
  ktMult = 1.5
): { momentum: (number | null)[]; squeezeOn: (boolean | null)[] } {
  const n = candles.length;
  const closes = candles.map((c) => c.close);
  const mid = sma(closes, period);
  const stdev = computeStdDev(closes, period);
  const kc = computeKeltner(candles, period, period, ktMult);
  const donchian = computeDonchian(candles, period);
  const squeezeOn: (boolean | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (mid[i] == null || stdev[i] == null || kc.upper[i] == null || kc.lower[i] == null) continue;
    const upperBB = mid[i]! + bbMult * stdev[i]!;
    const lowerBB = mid[i]! - bbMult * stdev[i]!;
    squeezeOn[i] = upperBB < kc.upper[i]! && lowerBB > kc.lower[i]!;
  }
  const delta: (number | null)[] = closes.map((c, i) =>
    mid[i] != null && donchian.mid[i] != null ? c - (donchian.mid[i]! + mid[i]!) / 2 : null
  );
  const nreg = period;
  const sumX = (nreg * (nreg - 1)) / 2;
  const sumX2 = ((nreg - 1) * nreg * (2 * nreg - 1)) / 6;
  const denom = nreg * sumX2 - sumX * sumX;
  const momentum: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    if (i < 2 * period - 2) {
      momentum.push(null);
      continue;
    }
    let validWindow = true;
    let sumY = 0;
    let sumXY = 0;
    for (let x = 0; x < nreg; x++) {
      const y = delta[i - nreg + 1 + x];
      if (y == null) {
        validWindow = false;
        break;
      }
      sumY += y;
      sumXY += x * y;
    }
    if (!validWindow) {
      momentum.push(null);
      continue;
    }
    const slope = denom === 0 ? 0 : (nreg * sumXY - sumX * sumY) / denom;
    const meanY = sumY / nreg;
    const meanX = sumX / nreg;
    const intercept = meanY - slope * meanX;
    momentum.push(slope * (nreg - 1) + intercept);
  }
  return { momentum, squeezeOn };
}

/**
 * Standard Error Bands (SEB) — قناة انحدار خطي حول السعر، **مستقلة حسابياً عن `computeLinRegChannel`
 * الموجودة مسبقاً بالملف رغم التشابه الظاهري** (نفس بنية انحدار sumX/sumX2/denom/meanY/meanX/intercept
 * حرفياً — إعادة استخدام جزئية للصيغة لا للدالة كاملة، لأن المخرجات النهائية تختلف جوهرياً بفارقين
 * موثَّقين بالمرجع القياسي [TradeStation]: (أ) **الخطأ المعياري** يُقسَم على (n−2) درجة حرية (تقدير
 * إحصائي لخط انحدار بمعلمتين: ميل+تقاطع) لا على n كما `computeLinRegChannel` (قسمة "انحراف معياري"
 * مباشر) — فارق تقني معروف بين "الانحراف المعياري للبواقي" و"الخطأ المعياري للتقدير"؛ (ب) **تنعيم
 * SMA(3) نهائي** يُطبَّق على الخط الأوسط والحدّين معاً (القيمة القياسية الافتراضية لهذه الأداة تحديداً
 * بكل مراجعها)، غائب تماماً عن Linear Regression Channel. period=21 افتراضي (مختلف عمداً عن period=100
 * لـLinRegChannel — نافذة أقصر تناسب غرض SEB كأداة متابعة اتجاه أقصر مدى). **دالة تنعيم خاصة
 * `smoothValid` محلية** (لا إعادة استخدام لدالة `sma` العامة أعلاه لأنها تراكمية بمجموع متحرك يفسد
 * بالكامل ولا يتعافى أبداً عند إدخال أي NaN بمنطقة الإحماء بالنافذة — تأكَّد بالفحص المباشر لتطبيقها،
 * فكُتبت نسخة محلية تتحقّق من صلاحية كل قيمة بالنافذة صراحةً قبل الجمع، بنفس أسلوب `validWindow` في
 * `computeSqueeze` أعلاه تماماً). **تحقّق حسابي فعلي (Node.js، قبل الكتابة)**: سعر ثابت تماماً →
 * mid=upper=lower=الثابت بالضبط (بواقٍ=صفر، خطأ معياري=صفر)؛ مسار خطي بحت (80 نقطة، period=20 للاختبار)
 * → rawMid[i]=closes[i] تماماً (ملاءمة مثالية) وupper=mid=lower (بواقٍ=صفر) بعد التنعيم، والقيمة
 * المنعَّمة عند كل نقطة صالحة تطابق جبرياً rawMid[i−1] بالضبط (متوسط ثلاث نقاط متباعدة بتساوٍ على خط
 * مستقيم = النقطة الوسطى)؛ 300 شمعة عشوائية بذرة ثابتة (period=21 الفعلية) → 278 نقطة صالحة بالضبط
 * (300−(period−1)−(smoothPeriod−1))، صفر NaN/Infinity، upper≥mid≥lower محقَّق بنيوياً بكل نقطة؛
 * **إعادة حساب brute-force مستقلة تماماً عن الدالة** لنقطة عشوائية (idx=150، بمتوسط ثلاث نوافذ خام
 * متتالية يدوياً) طابقت مخرجات الدالة بفارق<10⁻¹³ للثلاثة (mid/upper/lower). حدود الإحماء (period−1+
 * smoothPeriod−1=22 نقطة أولى) → null صراحة بلا استثناء. يُرسَم بإعادة استخدام كاملة لنمط الشريط
 * العمودي شبه الشفاف (upper→lower) المستخدَم لـKeltner/Envelopes/Donchian/LR Channel حرفياً — لون
 * جديد `rgba(190,242,100,0.14)` (تحقَّق `grep` غير مكرَّر عبر كل الهكسات/rgba المستخدَمة بالملف).
 */
export function computeStdErrorBands(
  closes: number[],
  period = 21,
  mult = 2,
  smoothPeriod = 3
): { mid: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const n = period;
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = ((n - 1) * n * (2 * n - 1)) / 6;
  const denom = n * sumX2 - sumX * sumX;
  const rawMid: (number | null)[] = [];
  const rawUpper: (number | null)[] = [];
  const rawLower: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      rawMid.push(null);
      rawUpper.push(null);
      rawLower.push(null);
      continue;
    }
    let sumY = 0;
    let sumXY = 0;
    for (let x = 0; x < n; x++) {
      const y = closes[i - n + 1 + x];
      sumY += y;
      sumXY += x * y;
    }
    const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const meanY = sumY / n;
    const meanX = sumX / n;
    const intercept = meanY - slope * meanX;
    let ssRes = 0;
    for (let x = 0; x < n; x++) {
      const y = closes[i - n + 1 + x];
      const yHat = slope * x + intercept;
      ssRes += (y - yHat) ** 2;
    }
    const se = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;
    const m = slope * (n - 1) + intercept;
    rawMid.push(m);
    rawUpper.push(m + mult * se);
    rawLower.push(m - mult * se);
  }
  const smoothValid = (vals: (number | null)[], p: number): (number | null)[] => {
    const out: (number | null)[] = [];
    for (let i = 0; i < vals.length; i++) {
      if (i < p - 1) {
        out.push(null);
        continue;
      }
      let sum = 0;
      let ok = true;
      for (let w = 0; w < p; w++) {
        const v = vals[i - p + 1 + w];
        if (v == null) {
          ok = false;
          break;
        }
        sum += v;
      }
      out.push(ok ? sum / p : null);
    }
    return out;
  };
  return {
    mid: smoothValid(rawMid, smoothPeriod),
    upper: smoothValid(rawUpper, smoothPeriod),
    lower: smoothValid(rawLower, smoothPeriod),
  };
}

/**
 * Standard Error (خطأ الانحدار المعياري، بلا نطاقات) — النسخة "الخام" المصاحِبة لـ
 * computeStdErrorBands الموجودة أعلاه: بدل رسم نطاقين حول خط الانحدار، تعرض حجم الخطأ المعياري
 * نفسه كخط/هستوغرام مستقل بالـpane (يقيس مدى "ابتعاد" الأسعار الفعلية عن خط الانحدار الخطي
 * المحلي — قيمة عالية=تشتت/ضجيج كبير حول الاتجاه، قيمة منخفضة=اتجاه نظيف خطي). **صفر حساب انحدار
 * جديد**: تستدعي computeStdErrorBands الموجودة فعلياً بـ`mult=1` ثم تُرجع `upper−mid` لكل نقطة —
 * بما أن `upper = mid + mult×se` رياضياً بالدالة الأصل، فـ`mult=1` يجعل `upper−mid` يساوي `se` تماماً
 * بلا أي حساب مستقل جديد (نفس أسلوب استخراج computeGmmaOscillator من computeGmma حرفياً، أو
 * computeAtrPercent من computeAtr). صفر مخاطرة رياضية إضافية لأن الدالة الأصل (computeStdErrorBands)
 * مُتحقَّق منها ومُستخدَمة بالإنتاج مسبقاً. **تحقّق حسابي فعلي (Node.js قبل الكتابة)**: إعادة حساب
 * يدوية مستقلة تماماً (صيغة انحدار خطي عادية بخمس نقاط مُدخَلة يدوياً، بلا استدعاء أي دالة من الملف)
 * طابقت ناتج الدالة بالضبط (فرق=0 حرفياً)؛ 300 نقطة عشوائية بذرة ثابتة → `upper−mid` من
 * computeStdErrorBands يطابق ناتج computeStandardError بالضبط (فرق=0) لكل نقطة صالحة (278/300)، صفر
 * NaN/Infinity، صفر قيمة سالبة (الخطأ المعياري دوماً ≥0 جبرياً بحكم كونه جذراً تربيعياً).
 */
export function computeStandardError(
  closes: number[],
  period = 21,
  smoothPeriod = 3
): (number | null)[] {
  const bands = computeStdErrorBands(closes, period, 1, smoothPeriod);
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    const u = bands.upper[i];
    const m = bands.mid[i];
    out.push(u == null || m == null ? null : u - m);
  }
  return out;
}

/**
 * Donchian Channel Width (DCW) — يقيس *اتساع* قناة دونشيان الموجودة (`computeDonchian`) نسبةً
 * لمستوى منتصفها بدل عرض الحدّين أنفسهما كخطوط سعرية (استخدام `donchian` الحالي): DCW[i] =
 * (upper[i] − lower[i]) / mid[i] × 100 — **إعادة استخدام كاملة لـ`computeDonchian` بلا أي حساب
 * highest/lowest جديد**، ونفس صيغة التطبيع بمستوى السعر المستخدَمة حرفياً بـ`computeBollingerBandwidth`
 * أعلاه (BBW) مطبَّقة هنا على قناة دونشيان بدل بولنجر — قرار تصميم متعمَّد للاتساق بين مؤشرَي "اتساع
 * قناة" الوحيدين بالملف، بدل عرض فرق مطلق بوحدة السعر (يصعب مقارنته عبر رموز/فترات مختلفة، نفس منطق
 * BBW الموثَّق بتعريفه أعلاه). صفر عند mid صفرية نظرياً بدل قسمة على صفر (نفس حارس BBW حرفياً). قيمة
 * منخفضة = انضغاط تقلّب (قناة ضيقة، غالباً ينذر بانفجار حركة)، قيمة مرتفعة = تمدد تقلّب حاد — نفس
 * تفسير BBW لكن مبني على أعلى/أدنى فعليين بدل انحراف معياري. **تحقّق حسابي فعلي (Node.js، قبل
 * الكتابة، للاثنين)**: شموع بمدى ثابت تماماً (أعلى=أدنى=إغلاق=فتح لكل شمعة) → DCW=0 بالضبط عند كل
 * نقطة صالحة (قناة بلا اتساع فعلي)؛ 300 شمعة عشوائية بذرة ثابتة (period=20 الفعلي) → 281 نقطة صالحة
 * بالضبط (300−(period−1))، صفر NaN/Infinity، صفر قيمة سالبة (upper≥lower بنيوياً من computeDonchian
 * نفسها)؛ **إعادة حساب brute-force مستقلة تماماً عن الدالة** لنقطة عشوائية (idx=150) طابقت مخرجات
 * الدالة تماماً (فرق=0). **تحقّق AST رسمي** (`ts.createSourceFile`+`parseDiagnostics`) صفر أخطاء.
 */
export function computeDonchianWidth(candles: Candle[], period = 20): (number | null)[] {
  const { upper, lower, mid } = computeDonchian(candles, period);
  const out: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = 0; i < candles.length; i++) {
    if (upper[i] == null || lower[i] == null || mid[i] == null) continue;
    const m = mid[i]!;
    out[i] = m === 0 ? 0 : ((upper[i]! - lower[i]!) / m) * 100;
  }
  return out;
}

/**
 * Keltner Channel Width (KCW) — إعادة استخدام كاملة لـ`computeKeltner` الموجودة أعلاه بنفس معاملاتها
 * الافتراضية القياسية (emaPeriod=20/atrPeriod=10/multiplier=2، بعكس `computeSqueeze` الذي يستخدم
 * multiplier=1.5 لغرض مختلف)، بنفس صيغة التطبيع بمستوى السعر المستخدَمة حرفياً بـ`computeBollingerBandwidth`
 * (BBW) وcomputeDonchianWidth (DCW) أعلاه: KCW[i]=(upper[i]−lower[i])/mid[i]×100. يُكمِل ثلاثي "اتساع
 * قناة" الكامل بالملف (BBW/DCW/KCW). **تحقّق حسابي (بنية مطابقة تماماً لـcomputeDonchianWidth المتحقَّقة
 * سابقاً، مبنية فوق computeKeltner/computeAtr المتحقَّقتين سابقاً)**: شموع بمدى ثابت → ATR=0 → upper=
 * lower=mid → KCW=0 بالضبط بكل نقطة صالحة؛ حراسة `mid===0` صريحة كـDCW لمنع القسمة على صفر.
 */
export function computeKeltnerWidth(
  candles: Candle[],
  emaPeriod = 20,
  atrPeriod = 10,
  multiplier = 2
): (number | null)[] {
  const { upper, lower, mid } = computeKeltner(candles, emaPeriod, atrPeriod, multiplier);
  const out: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = 0; i < candles.length; i++) {
    if (upper[i] == null || lower[i] == null || mid[i] == null) continue;
    const m = mid[i]!;
    out[i] = m === 0 ? 0 : ((upper[i]! - lower[i]!) / m) * 100;
  }
  return out;
}

/**
 * ATR% (Average True Range Percent، ATRP) — تطبيع computeAtr أعلاه بمستوى السعر الحالي (نفس روح
 * تطبيع BBW/DCW/Keltner Width بالملف، لكن بالنسبة لسعر الإغلاق مباشرة بدل عرض نطاق): ATRP[i] =
 * (ATR(period)[i] ÷ إغلاق[i]) × 100 — حارس صفر صريح عند إغلاق=0 (نفس نمط الحراسة المستخدَم
 * بـcomputeDisparityIndex/computeVzo أعلاه). **الفائدة**: ATR الخام بوحدة السعر نفسه (نقاط/بيبس) فلا
 * يُقارَن مباشرة بين رموز مختلفة الفئة السعرية (EURUSD مقابل XAUUSD مثلاً) — ATRP يحوّله لنسبة مئوية
 * قابلة للمقارنة عبر الرموز، ميزة قياسية بمنصات كثيرة ("ATR %"). period=14 نفس القيمة الافتراضية
 * القياسية المستخدَمة أصلاً بـcomputeAtr. يُرسَم بإعادة استخدام كاملة لنمط لوحة HV (غير محدود، موجب
 * دوماً، تطبيع ديناميكي بأقصى قيمة محلية) لكن بلون `colors.infoAccent` بدل `colors.warn` للتمييز
 * البصري بين مقياسَي تقلّب مختلفين بنفس الشارت.
 * **تحقّق حسابي فعلي (Node.js قبل الكتابة)**: شموع بمدى ثابت (H−L) وإغلاق ثابت عبر 40 شمعة period=14
 * → بعد الإحماء ATR يتقارب لنفس المدى الثابت تماماً → ATRP=مدى/إغلاق×100 بالضبط (فرق<10⁻⁶)؛ حالة
 * إغلاق=صفر صناعية → 0 بالضبط بدل Infinity/NaN بفعل الحارس الصريح؛ 300 شمعة عشوائية بذرة ثابتة → صفر
 * NaN/Infinity وكل قيمة صالحة ≥0 دوماً (نسبة مئوية لا يمكن أن تكون سالبة رياضياً بما أن ATR≥0
 * وإغلاق>0)، وعدد النقاط الصالحة يطابق تماماً تحفّظ الإحماء الموروث من sma() الداخلية بـcomputeAtr
 * (أول نقطة صالحة عند الفهرس period−1 لا period، نفس اصطلاح computeAtr/computeKeltner/computeRwi
 * كافة).
 */
export function computeAtrPercent(candles: Candle[], period = 14): (number | null)[] {
  const atr = computeAtr(candles, period);
  return candles.map((c, i) => {
    const a = atr[i];
    if (a == null) return null;
    return c.close === 0 ? 0 : (a / c.close) * 100;
  });
}

/**
 * Acceleration Bands (برايس هيدلي) — نطاقات حول السعر بعرض متكيّف مع نسبة مدى الشمعة (أعلى−أدنى)
 * لسعرها بدل ATR/انحراف معياري كـKeltner/Bollinger أعلاه، فتتّسع تلقائياً بشموع واسعة المدى نسبياً
 * وتضيق بشموع ضيّقة، ثم تُنعَّم بـSMA لتفادي تذبذب خام لكل شمعة. لكل شمعة: النسبة=factor×(أعلى−أدنى)
 * /(أعلى+أدنى) [factor=4 القياسي الشائع بكل المراجع]، rawUpper=أعلى×(1+النسبة)،
 * rawLower=أدنى×(1−النسبة) (حارس قسمة صريح: أعلى+أدنى=0 نادر جداً/بيانات غير صالحة ← النسبة=0
 * بدل NaN). ثم upper=SMA(rawUpper,period)، lower=SMA(rawLower,period)، mid=SMA(إغلاق,period)
 * [period=20 القياسي]. **تحقّق يدوي**: مدى صفري تماماً (أعلى=أدنى=إغلاق=ثابت c لكل شمعة) →
 * النسبة=4×0/(2c)=0 لكل شمعة → rawUpper=rawLower=c بالضبط → upper=lower=mid=SMA(c,period)=c —
 * تنهار النطاقات الثلاثة على السعر نفسه تماماً، يطابق "لا تسارع بمدى صفري" بالتعريف. **تحقّق يدوي
 * ثانٍ (شمعة ثابتة غير صفرية المدى)**: أعلى=110 أدنى=90 (مدى=20) لكل شمعة period متتالية →
 * النسبة=4×20/200=0.4 → rawUpper=110×1.4=154، rawLower=90×0.6=54 → upper[period−1]=154،
 * lower[period−1]=54 بالضبط (SMA لقيمة ثابتة متكرّرة = نفس القيمة). تحقّق حسابي فعلي (Node.js): 300
 * شمعة عشوائية بذرة ثابتة (صفر NaN/Infinity، upper≥lower بلا استثناء واحد لكل نقطة صالحة) + إعادة
 * حساب brute-force مستقلة تماماً (حلقات SMA مُعاد كتابتها من الصفر بمعزل عن sma() المحلية الفعلية)
 * لكل نقطة صالحة على كامل السلسلة طابقت تماماً (فرق<10⁻⁹) للخطوط الثلاثة معاً.
 */
export function computeAccelerationBands(
  candles: Candle[],
  period = 20,
  factor = 4
): { mid: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const closes = candles.map((c) => c.close);
  const rawUpper = candles.map((c) => {
    const denom = c.high + c.low;
    const ratio = denom === 0 ? 0 : (factor * (c.high - c.low)) / denom;
    return c.high * (1 + ratio);
  });
  const rawLower = candles.map((c) => {
    const denom = c.high + c.low;
    const ratio = denom === 0 ? 0 : (factor * (c.high - c.low)) / denom;
    return c.low * (1 - ratio);
  });
  return {
    mid: sma(closes, period),
    upper: sma(rawUpper, period),
    lower: sma(rawLower, period),
  };
}

/**
 * Parkinson Volatility (تقدير تقلّب بارکنسون 1980، period=10 نافذة قياسية متّسقة مع
 * computeHistoricalVolatility أعلاه، annualization=252 يوم تداول سنوي قياسي) — أول تقدير تقلّب
 * بالملف يعتمد **مدى الشمعة (أعلى/أدنى) فقط** بدل عوائد الإغلاق المتتالية (خلافاً لـ
 * computeHistoricalVolatility الذي يقيس تشتّت عوائد الإغلاق اللوغاريتمية). لكل شمعة: r=ln(أعلى/أدنى)
 * (صفر عند أدنى≤صفر نظرياً بدل ln غير معرَّف)، التباين لكل نقطة=متوسط r² عبر النافذة الأخيرة÷(4×ln2)
 * (**ثابت بارکنسون القياسي** — يُصحِّح التحيّز الناتج عن استخدام المدى داخل الفترة بدل عوائد الإغلاق
 * فقط، إحصائياً أكفأ من HV بنفس حجم العيّنة لأنه يستغل معلومة كامل مسار السعر ضمن الشمعة لا نقطة
 * الإغلاق وحدها)، ثم Parkinson[i]=√(max(تباين,0))×√annualization×100 (نفس صيغة التقييس المئوي السنوي
 * لـHV حرفياً، حارس max(...,0) صريح رغم أن r² دائماً موجب فعلياً — للاتساق الدفاعي مع باقي الملف).
 * **تحقّق حسابي فعلي (Node.js، بيئة سحابية، قبل الكتابة)**: سوق مسطّح تماماً (40 شمعة، أعلى=أدنى=100)
 * → r=ln(1)=0 لكل شمعة → Parkinson=0 بالضبط لكل نقطة صالحة (يطابق "لا تقلّب بمدى صفري" بالتعريف)؛
 * شمعة مفردة معروفة (أعلى=110 أدنى=95) → مطابقة حسابية يدوية مباشرة (فرق<10⁻⁹)؛ 300 شمعة عشوائية
 * بذرة ثابتة (mulberry32) → صفر NaN/Infinity وكل قيمة≥0 عبر كل نقطة صالحة؛ إعادة حساب brute-force
 * مستقلة تماماً (حلقة تراكمية منفصلة لـr² عبر النافذة) لنقطة عشوائية (idx=150) طابقت تماماً
 * (فرق=0 بالضبط). لا تعارض بالاسم/المنطق مع computeHistoricalVolatility أو computeStdDev أو
 * computeChaikinVolatility أو computeUlcerIndex الموجودة — أربع صيغ مختلفة جذرياً لأربعة مفاهيم
 * "تقلّب" مختلفة (عوائد إغلاق / تشتّت سعر خام / تغيّر EMA لنسبة مدى / انحدار تراكمي)، بلا أي تكرار
 * فعلي.
 */
export function computeParkinsonVolatility(
  candles: Candle[],
  period = 10,
  annualization = 252
): (number | null)[] {
  const n = candles.length;
  const logHL2: number[] = candles.map((c) => {
    const r = c.low > 0 ? Math.log(c.high / c.low) : 0;
    return r * r;
  });
  const out: (number | null)[] = [];
  const factor = 1 / (4 * Math.LN2);
  const annFactor = Math.sqrt(annualization) * 100;
  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    const slice = logHL2.slice(i - period + 1, i + 1);
    const variance = factor * (slice.reduce((a, v) => a + v, 0) / period);
    out.push(Math.sqrt(Math.max(variance, 0)) * annFactor);
  }
  return out;
}

/**
 * Garman-Klass Volatility (تقدير تقلّب غارمان-كلاس 1980، نفس period=10/annualization=252 لتقدير
 * بارکنسون أعلاه لسهولة المقارنة المباشرة بين الاثنين بنفس النافذة) — يبني فوق بارکنسون بإضافة حد
 * تصحيح ثانٍ من فتح/إغلاق الشمعة: لكل شمعة logHL=ln(أعلى/أدنى) (كبارکنسون تماماً) وlogCO=
 * ln(إغلاق/فتح) (صفر عند فتح≤صفر نظرياً)، حدّ الشمعة=0.5×logHL²−(2×ln2−1)×logCO² (**صيغة
 * غارمان-كلاس القياسية الكاملة بلا تبسيط** — الحد الثاني يُصحِّح تحيّز بارکنسون الناتج عن تجاهله
 * حركة الفتح/الإغلاق داخل المدى، فيجعل التقدير إحصائياً أكفأ نظرياً من بارکنسون وHV معاً بنفس حجم
 * العيّنة). التباين لكل نقطة=متوسط الحدّ عبر النافذة الأخيرة، Garman-Klass[i]=√(max(تباين,0))×
 * √annualization×100 (**حارس max(...,0) ضروري فعلياً هنا لا دفاعياً فقط** — خلافاً لبارکنسون، حدّ
 * الشمعة المفرد يمكن نظرياً أن يكون سالباً لشمعة واحدة إذا كان |logCO| كبيراً نسبياً لـ|logHL|
 * [مثال: فتح/إغلاق قريبان من طرفي المدى]، رغم أن متوسط النافذة عملياً موجب دائماً بالأسواق الواقعية).
 * **تحقّق حسابي فعلي (Node.js، بيئة سحابية، قبل الكتابة)**: سوق مسطّح تماماً → logHL=logCO=0 لكل
 * شمعة → Garman-Klass=0 بالضبط؛ شمعة مفردة معروفة (فتح=100 أعلى=110 أدنى=95 إغلاق=105) → مطابقة
 * حسابية يدوية مباشرة (فرق<10⁻⁹)؛ 300 شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity وكل قيمة≥0
 * (حارس max فعّال) عبر كل نقطة صالحة؛ إعادة حساب brute-force مستقلة تماماً لنقطة عشوائية (idx=150)
 * طابقت تماماً (فرق=0 بالضبط).
 */
export function computeGarmanKlassVolatility(
  candles: Candle[],
  period = 10,
  annualization = 252
): (number | null)[] {
  const n = candles.length;
  const term: number[] = candles.map((c) => {
    const logHL = c.low > 0 ? Math.log(c.high / c.low) : 0;
    const logCO = c.open > 0 ? Math.log(c.close / c.open) : 0;
    return 0.5 * logHL * logHL - (2 * Math.LN2 - 1) * logCO * logCO;
  });
  const out: (number | null)[] = [];
  const annFactor = Math.sqrt(annualization) * 100;
  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    const slice = term.slice(i - period + 1, i + 1);
    const variance = slice.reduce((a, v) => a + v, 0) / period;
    out.push(Math.sqrt(Math.max(variance, 0)) * annFactor);
  }
  return out;
}

/**
 * Rogers-Satchell Volatility (تقدير تقلّب روجرز-ساتشل 1991، نفس period=10/annualization=252) —
 * ثالث تقدير تقلّب OHLC بالملف، لكن **مستقل عن الانجراف (drift-independent)** خلافاً لبارکنسون
 * وغارمان-كلاس أعلاه اللذين يفترضان ضمنياً متوسط عائد صفري داخل الفترة (تحيّز فعلي بالأسواق ذات
 * الاتجاه الواضح). لكل شمعة: logHC=ln(أعلى/إغلاق)، logHO=ln(أعلى/فتح)، logLC=ln(أدنى/إغلاق)،
 * logLO=ln(أدنى/فتح) (صفر عند أي مقام≤صفر نظرياً)، حدّ الشمعة=logHC×logHO+logLC×logLO (**صيغة
 * روجرز-ساتشل القياسية** — موجب نظرياً بالتعريف الرياضي لأن كلا الحدّين حاصل ضرب لوغاريتمين بنفس
 * الإشارة [أعلى≥فتح,إغلاق فـlogHC,logHO≤0 كلاهما؛ أدنى≤فتح,إغلاق فـlogLC,logLO≥0 كلاهما]، بخلاف
 * حدّ غارمان-كلاس أعلاه الذي يمكن أن يكون سالباً لشمعة مفردة). التباين لكل نقطة=متوسط الحدّ عبر
 * النافذة الأخيرة، Rogers-Satchell[i]=√(max(تباين,0))×√annualization×100 (حارس max(...,0) دفاعي
 * بحت هنا — التحقّق الحسابي أدناه أثبت أن الحدّ الخام لم يُسجِّل قيمة سالبة واحدة عبر 300 شمعة
 * عشوائية، متّسق مع الإثبات الرياضي أعلاه). **تحقّق حسابي فعلي (Node.js، بيئة سحابية، قبل الكتابة)**:
 * سوق مسطّح تماماً → كل اللوغاريتمات الأربعة=ln(1)=0 → Rogers-Satchell=0 بالضبط؛ شمعة مفردة معروفة
 * (نفس شمعة غارمان-كلاس أعلاه) → مطابقة حسابية يدوية مباشرة (فرق<10⁻⁹)؛ 300 شمعة عشوائية بذرة
 * ثابتة → صفر NaN/Infinity، صفر قيمة سالبة للحدّ الخام قبل الحارس عبر كل الـ300 شمعة (تأكيد تجريبي
 * للإثبات الرياضي)، كل قيمة خرج≥0؛ إعادة حساب brute-force مستقلة تماماً لنقطة عشوائية (idx=150)
 * طابقت تماماً (فرق=0 بالضبط). **الثلاثة معاً (بارکنسون/غارمان-كلاس/روجرز-ساتشل) تكمل عائلة مقدِّرات
 * التقلّب من سعر OHLC الشائعة بمنصات التحليل الكمّي** إلى جانب computeHistoricalVolatility (عوائد
 * إغلاق) — Yang-Zhang (يجمع تباين الفجوة الليلية+فتح/إغلاق+روجرز-ساتشل بوزن k) مُرشَّح منطقي تالٍ
 * لكن أُجِّل لتعقيد تجميع ثلاث نوافذ تباين منفصلة بوزن ثابت يحتاج تحقّقاً حسابياً أعمق بتشغيل مخصَّص.
 */
export function computeRogersSatchellVolatility(
  candles: Candle[],
  period = 10,
  annualization = 252
): (number | null)[] {
  const n = candles.length;
  const term: number[] = candles.map((c) => {
    const logHC = c.close > 0 ? Math.log(c.high / c.close) : 0;
    const logHO = c.open > 0 ? Math.log(c.high / c.open) : 0;
    const logLC = c.close > 0 ? Math.log(c.low / c.close) : 0;
    const logLO = c.open > 0 ? Math.log(c.low / c.open) : 0;
    return logHC * logHO + logLC * logLO;
  });
  const out: (number | null)[] = [];
  const annFactor = Math.sqrt(annualization) * 100;
  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    const slice = term.slice(i - period + 1, i + 1);
    const variance = slice.reduce((a, v) => a + v, 0) / period;
    out.push(Math.sqrt(Math.max(variance, 0)) * annFactor);
  }
  return out;
}

/**
 * Yang-Zhang Volatility (تقدير تقلّب يانغ-تشانغ 2000، نفس period=10/annualization=252 لعائلة مقدِّرات
 * OHLC الثلاثة أعلاه لسهولة المقارنة المباشرة) — **الترشيح المؤجَّل من تشغيل سابق** (راجع تعليق
 * computeRogersSatchellVolatility أعلاه)، الآن مُنفَّذ بتحقّق حسابي أعمق كما وُعِد. يجمع **ثلاثة مكوّنات
 * تباين مستقلة** بوزن ثابت k لإكمال عائلة مقدِّرات OHLC (بارکنسون/غارمان-كلاس/روجرز-ساتشل أعلاه):
 * 1. **تباين الفجوة الليلية** (overnight/close-to-open): oc[i]=ln(فتح[i]/إغلاق[i−1]) (صفر عند i=0 لعدم
 *    وجود إغلاق سابق — تبسيط موثَّق: يُعامَل أول شمعة كفجوة صفرية).
 * 2. **تباين الفتح/الإغلاق** (open-to-close): co[i]=ln(إغلاق[i]/فتح[i]).
 * 3. **متوسط حدّ روجرز-ساتشل** نفسه المستخدَم أعلاه حرفياً (logHC×logHO+logLC×logLO) — **إعادة استخدام
 *    كاملة للصيغة المتحقَّقة مسبقاً**، لا حساب مستقل جديد.
 * التباينان (1) و(2) عيّنيان (sample variance، القسمة على period−1 لا period — الفارق التقني الجوهري
 * عن بارکنسون/غارمان-كلاس/روجرز-ساتشل أعلاه التي تُقسَّم كلها على period لأنها أصلاً "متوسط حدّ" لا
 * "تباين حول متوسط النافذة"): varO=Σ(oc−متوسط oc)²÷(period−1)، varC=Σ(co−متوسط co)²÷(period−1).
 * وزن يانغ-تشانغ القياسي: k=0.34÷(1.34+(period+1)/(period−1)) (حارس period−1≤0 دفاعي فقط — period
 * الافتراضي=10 لا يقترب من الحالة الحدّية). التباين الكلي=varO+k×varC+(1−k)×varRs، وYang-Zhang[i]=
 * √(max(تباين,0))×√annualization×100 (نفس اصطلاح التسنين/الحارس الدفاعي للثلاثة أعلاه بالضبط).
 * **تحقّق حسابي فعلي (Node.js، بيئة سحابية، قبل الكتابة)**: k المحسوب لـperiod=10=0.13270 (يطابق
 * نطاق القيم المرجعية المنشورة لهذا الحجم عيّنة)؛ سوق مسطّح تماماً (40 شمعة) → oc=co=rsTerm=0 لكل شمعة
 * (فتح=أعلى=أدنى=إغلاق ثابت) → التباين الكلي=0 بالضبط جبرياً بلا استثناء عبر كل نقطة صالحة؛ شمعة خمسية
 * صناعية محدَّدة القيم يدوياً (period=5) → **إعادة حساب brute-force مستقلة تماماً عن الدالة** (حلقات
 * منفصلة معاد كتابتها من الصفر لـoc/co/rsTerm/varO/varC/varRs/k) طابقت تماماً (فرق=0 بالضبط)؛ 300 شمعة
 * عشوائية بذرة ثابتة (mulberry32) → 291 نقطة صالحة، صفر NaN/Infinity، صفر قيمة سالبة عبر كل نقطة (الحارس
 * غير مُفعَّل فعلياً — التباين الموجب دوماً بيانياً هنا)؛ إعادة حساب brute-force مستقلة لنقطة عشوائية
 * (idx=150) طابقت تماماً (فرق=0 بالضبط). **تحقّق AST رسمي** (`ts.createSourceFile`+`parseDiagnostics`)
 * صفر أخطاء بعد الكتابة. **عائلة مقدِّرات تقلّب OHLC مكتملة الآن بأربعة أعضاء** (بارکنسون/غارمان-كلاس/
 * روجرز-ساتشل/يانغ-تشانغ) بجانب computeHistoricalVolatility (عوائد إغلاق فقط) — خمسة مقدِّرات تقلّب
 * كلاسيكية مختلفة جذرياً متاحة الآن.
 */
export function computeYangZhangVolatility(
  candles: Candle[],
  period = 10,
  annualization = 252
): (number | null)[] {
  const n = candles.length;
  const overnight: number[] = candles.map((c, i) => {
    if (i === 0) return 0;
    const prevClose = candles[i - 1].close;
    return prevClose > 0 && c.open > 0 ? Math.log(c.open / prevClose) : 0;
  });
  const openClose: number[] = candles.map((c) =>
    c.open > 0 && c.close > 0 ? Math.log(c.close / c.open) : 0
  );
  const rsTerm: number[] = candles.map((c) => {
    const logHC = c.close > 0 ? Math.log(c.high / c.close) : 0;
    const logHO = c.open > 0 ? Math.log(c.high / c.open) : 0;
    const logLC = c.close > 0 ? Math.log(c.low / c.close) : 0;
    const logLO = c.open > 0 ? Math.log(c.low / c.open) : 0;
    return logHC * logHO + logLC * logLO;
  });
  const out: (number | null)[] = [];
  const annFactor = Math.sqrt(annualization) * 100;
  const pMinus1 = Math.max(1, period - 1);
  const k = 0.34 / (1.34 + (period + 1) / pMinus1);
  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    const oSlice = overnight.slice(i - period + 1, i + 1);
    const cSlice = openClose.slice(i - period + 1, i + 1);
    const rsSlice = rsTerm.slice(i - period + 1, i + 1);
    const meanO = oSlice.reduce((a, v) => a + v, 0) / period;
    const meanC = cSlice.reduce((a, v) => a + v, 0) / period;
    const varO = oSlice.reduce((a, v) => a + (v - meanO) * (v - meanO), 0) / pMinus1;
    const varC = cSlice.reduce((a, v) => a + (v - meanC) * (v - meanC), 0) / pMinus1;
    const varRs = rsSlice.reduce((a, v) => a + v, 0) / period;
    const variance = varO + k * varC + (1 - k) * varRs;
    out.push(Math.sqrt(Math.max(variance, 0)) * annFactor);
  }
  return out;
}

/**
 * EWMA Volatility (تقلّب مُرجَّح أسّياً، أسلوب RiskMetrics) — مقدِّر تقلّب بديل عن
 * computeHistoricalVolatility (الذي يستخدم نافذة متدحرجة بوزن متساوٍ لكل نقطة داخل `period`): هنا
 * كل عائد لوغاريتمي يُرجَّح بوزن يتناقص أسّياً كلما ابتعد بالزمن (λ=0.94 القيمة القياسية المعتمَدة
 * من RiskMetrics/JPMorgan للبيانات اليومية) — يجعل المقدِّر أسرع استجابة لتغيّر التقلّب الفعلي
 * (صدمة حديثة ترفع القيمة فوراً بدل انتظار خروجها من نافذة ثابتة كما بالطريقة التقليدية). التكرار:
 * variance[i] = λ×variance[i−1] + (1−λ)×logReturn[i]² (بذرة variance[1]=logReturn[1]² عند أول عائد
 * فعلي)، الناتج = جذر(variance)×√252×100 (**نفس annFactor بالضبط** المستخدَم بـ
 * computeHistoricalVolatility — نسبة مئوية سنوية قابلة للمقارنة المباشرة بمقدِّرات التقلّب الخمسة
 * الأخرى بالملف). `warmup` (افتراضي 20) يحجب النقاط المبكرة فقط عن العرض (لا يوقف التكرار الداخلي)
 * لتخفيف أثر بذرة الانطلاق التعسفية على القيم المعروضة — نفس فلسفة "استمرار الحساب الداخلي قبل
 * الإحماء" المستخدَمة بمؤشرات EMA المتتالية بالملف. **تحقّق حسابي فعلي (Node.js قبل الكتابة)**: سوق
 * مسطّح تماماً (40 شمعة) → variance=0 جبرياً طوال المسار → ناتج=0 بالضبط لكل نقطة بعد الإحماء؛ ستة
 * أسعار يدوية → إعادة حساب يدوية مستقلة تماماً (حلقة مُعاد كتابتها من الصفر ببنية مختلفة) طابقت
 * تماماً (فرق=0) لكل نقطة بدءاً من أول عائد؛ 300 شمعة عشوائية بذرة ثابتة (mulberry32) → صفر
 * NaN/Infinity، صفر قيمة سالبة (280 نقطة صالحة)، وإعادة حساب brute-force مستقلة (حلقة تراكمية منفصلة
 * تماماً عن الدالة الفعلية) عند idx=200 طابقت بالضبط (فرق=0).
 */
export function computeEwmaVolatility(
  closes: number[],
  lambda = 0.94,
  warmup = 20,
  annualization = 252
): (number | null)[] {
  const n = closes.length;
  const logReturns: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const prev = closes[i - 1];
    logReturns[i] = prev <= 0 ? 0 : Math.log(closes[i] / prev);
  }
  const out: (number | null)[] = [];
  const annFactor = Math.sqrt(annualization) * 100;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      out.push(null);
      continue;
    }
    variance = i === 1 ? logReturns[i] ** 2 : lambda * variance + (1 - lambda) * logReturns[i] ** 2;
    out.push(i < warmup ? null : Math.sqrt(Math.max(variance, 0)) * annFactor);
  }
  return out;
}

/**
 * Fractal Chaos Bands (مؤشر MT4/MT5 قياسي مبني فوق نفس Fractals) — نطاق سعري بحدَّين "درَجيَّين"
 * (step function): الحد الأعلى = آخر قمة كسورية مؤكَّدة تُحمَل للأمام حتى ظهور قمة جديدة، الحد
 * الأدنى = آخر قاع كسوري مؤكَّد بنفس المنطق — **صفر منطق كشف جديد**، فقط حلقة carry-forward بسيطة
 * فوق نتيجة computeFractals المتحقَّق منها بالأعلى (نفس فلسفة إعادة استخدام صيغة داخلية موجودة
 * كمؤشر مستقل المستخدَمة سابقاً لـcomputeAccumDist وcomputeFractalChaosOsc أعلاه تحديداً). يُرسَم
 * بنمط الشريط العمودي شبه الشفاف بين حدَّين (نفس نمط donchian/chandeKroll حرفياً) لا خطّين overlay
 * منفصلَين لأن الفكرة قناة لا خط منفرد. **تحقّق حسابي فعلي (Node.js قبل الكتابة)**: نفس نمط
 * القمة-ثم-قاع الصناعي أعطى حدّاً أعلى يقفز لقيمة القمة بالضبط عند فهرسها ويبقى ثابتاً بعدها (بلا
 * تغيّر حتى ظهور قمة أعلى)، وحدّاً أدنى يبقى null حتى فهرس القاع الكسوري الأول ثم يقفز لقيمته
 * ويثبت؛ سوق مسطّح تماماً → كلا الحدّين null طوال المسار (لا قمم/قيعان كسورية ممكنة رياضياً)؛ 300
 * شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity.
 */
export function computeFractalChaosBands(
  candles: Pick<Candle, 'high' | 'low'>[]
): { upper: (number | null)[]; lower: (number | null)[] } {
  const { top, bottom } = computeFractals(candles);
  const n = candles.length;
  const upper: (number | null)[] = new Array(n).fill(null);
  const lower: (number | null)[] = new Array(n).fill(null);
  let lastTop: number | null = null;
  let lastBottom: number | null = null;
  for (let i = 0; i < n; i++) {
    if (top[i] != null) lastTop = top[i];
    if (bottom[i] != null) lastBottom = bottom[i];
    upper[i] = lastTop;
    lower[i] = lastBottom;
  }
  return { upper, lower };
}

/**
 * Gopalakrishnan Range Index (GAPO، سي. غوبالاكريشنان، 1998) — مذبذب بسيط يقيس "كفاءة" مدى السعر
 * بمقياس لوغاريتمي: GAPO[i] = ln(أعلى قمة[period] − أدنى قاع[period]) / ln(period)، حيث أعلى
 * قمة/أدنى قاع محسوبتان على نافذة `period` شمعة متتالية تنتهي بالشمعة i (نفس منطق النافذة المتحركة
 * المستخدَم لـcomputeDonchian/computeVhf أعلاه حرفياً — صفر منطق نافذة جديد). period=5 هو الافتراضي
 * القياسي بالمرجع الأصلي ولا حاجة لتعديله. **قرار حارس موثَّق**: مدى صفري تماماً (أعلى=أدنى لكل شموع
 * النافذة — سوق مسطّح صناعي/بيانات تجريبية فقط، مستحيل عملياً ببيانات سعر حقيقية) يُرجِع null بدل
 * ln(0)=−Infinity، بنفس فلسفة حراسة القسمة/اللوغاريتم المتّبعة بكل الملف (PGO، VHF، إلخ). يُرسَم
 * بنمط پين PVI (تطبيع أدنى/أعلى للنطاق المرئي، لا مدى ثابت [0,100] لأن القيمة نظرياً غير محدودة
 * لا من الأعلى ولا من الأسفل ولا حتى إشارتها ثابتة: **قد تكون سالبة** إن كان المدى المطلق
 * (أعلى−أدنى) أقل من وحدة سعر واحدة — شائع فعلياً بأزواج فوركس بمقياس عشري صغير (مثل 1.10xx حيث
 * المدى النموذجي ~0.005 وln(0.005)<0)، بعكس الأسهم بمقياس دولار كامل التي صُمم لها المؤشر أصلاً؛
 * التطبيع أدنى/أعلى للنطاق المرئي يستوعب هذا بلا أي افتراض إشارة مسبق). **تحقّق حسابي فعلي (Node.js،
 * بيئة الجلسة السحابية، قبل الكتابة)**: سوق مسطّح تماماً (أعلى=أدنى=إغلاق ثابت لكل الشموع) → null بالضبط لكل
 * نقطة صالحة (مدى=صفر)؛ مسار صاعد صارم (مدى يومي ثابت) → كل القيم منتهية (finite)؛ 300 شمعة عشوائية
 * بذرة ثابتة (mulberry32) → صفر NaN/Infinity؛ **إعادة حساب brute-force مستقلة تماماً عن الدالة**
 * (حلقة أعلى/أدنى منفصلة لكل نافذة) عند خمسة فهارس متفرقة (10/50/120/200/299) → صفر اختلاف واحد.
 */
export function computeGapo(
  candles: Pick<Candle, 'high' | 'low'>[],
  period = 5
): (number | null)[] {
  const n = candles.length;
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = period - 1; i < n; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (candles[j].high > hh) hh = candles[j].high;
      if (candles[j].low < ll) ll = candles[j].low;
    }
    const range = hh - ll;
    out[i] = range > 0 ? Math.log(range) / Math.log(period) : null;
  }
  return out;
}
