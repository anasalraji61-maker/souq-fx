/**
 * تحويل سلسلة قيم (متوسط متحرك، خطّ مؤشر) إلى **قطع خطّية متّصلة** تُرسم كـ`View`
 * مُدارة، بدل نقطة لكل شمعة.
 *
 * السبب: طبقات لوحة السعر كلّها كانت تُرسم `styles.dot` — مربّع 3×3 عند كل شمعة. وهذا
 * يُقرأ خطّاً **فقط** حين تكون خطوة العمود ≈ 3px أو أقلّ. لكن التكبير بالشارت يصل إلى
 * **شمعتين** (`zoomAroundCenter` تحدّ النافذة بـ2..1000)، وعند عشرين شمعة على هاتف تصير
 * خطوة العمود ‎~16px‎: فيرى المتداول **نقاطاً متباعدة** لا متوسطاً متحركاً. وتقاطع
 * متوسطَين — وهو أكثر ما يستعمله متداول التجزئة — لا يُرى أصلاً بين نقطتين متباعدتين:
 * لحظة العبور تقع بالفراغ بينهما.
 *
 * والشارت نفسه يعرف الطريقة الصحيحة أصلاً: **طبقة رمز المقارنة** (`comparePrices`) تُرسم
 * قطعاً مُدارة متّصلة. فالمقارنة الاختيارية كانت تحصل على خطّ حقيقي بينما SMA 50 لا.
 *
 * الوحدة **خالصة** (بلا React ولا أنماط): تُعيد إحداثيات وزوايا، والرسم يبقى بمواضعه
 * داخل `MatrixChart.tsx` بألوانه المكتوبة حرفياً هناك — وهو شرط مسح `priceLegend.selftest`
 * الذي يقارن لون الرسم بلون الشارة.
 */

/** قطعة خطّية جاهزة للرسم: `left/top` طرفها الأول، و`deg` دورانها حول `left center`. */
export interface LineSeg {
  /** س الطرف الأول بالبكسل. */
  left: number;
  /**
   * ص الطرف الأول بالبكسل — **موضع القيمة تماماً**. سُمك الخطّ أمر أنماط لا حساب،
   * فالمستدعي يطرح نصفه (`top - 1` لخطّ 2px) ليقع مركز الخطّ على القيمة لا حافّته.
   */
  top: number;
  /** طول القطعة بالبكسل (الوتر، لا الفرق الأفقي). */
  len: number;
  /** الزاوية بالدرجات. */
  deg: number;
  /** فهرس الطرف الثاني بالسلسلة — مفتاح React ثابت بين الإطارات. */
  at: number;
}

/** قيمة سلسلة: رقم، أو فجوة (`null` قبل اكتمال فترة المؤشر). */
export type SeriesValue = number | null | undefined;

export interface LineSegOptions {
  /**
   * طول القطعة البديلة لنقطة **معزولة** (جارتاها فجوة): بلا هذا تختفي السلسلة التي لها
   * قيمة صالحة واحدة تماماً — وهي حالة قائمة لا نظرية: نافذة بعشرين شمعة تعطي SMA 20
   * قيمةً واحدة عند آخر شمعة. الافتراض 3 = مقاس النقطة القديمة، فالسلوك القديم محفوظ
   * حيث كان صحيحاً.
   */
  stubLen?: number;
}

const DEFAULT_STUB = 3;

/**
 * يبني قطع الخطّ بين كل قيمتين **متجاورتين وصالحتين**.
 *
 * - الفجوة (`null`/`undefined`/`NaN`) تقطع الخطّ ولا تُوصَل بقفزة: متوسط لم يبدأ بعد
 *   لا يُوصَل بأول قيمة له من حافّة اللوح.
 * - إحداثي غير محدود (`xOf`/`yOf` بمقياس لم يُهيّأ، `range.span = 0`) ⇒ القطعة تُسقَط.
 *   الصفر إحداثيّ صالح، فالفحص `Number.isFinite` لا `!x`.
 * - قطعة بطول صفر (شمعتان على العمود نفسه بعرض لوح صفري) تُسقَط: `View` بعرض صفر
 *   لا يرسم شيئاً ويستهلك عقدة.
 * - نقطة صالحة بين فجوتين تُعطى قطعة أفقية بطول `stubLen` **متمركزة عليها**، فتبقى مرئية.
 */
export function planLineSegments(
  values: readonly SeriesValue[],
  xOf: (i: number) => number,
  yOf: (v: number) => number,
  opts: LineSegOptions = {}
): LineSeg[] {
  const stub =
    Number.isFinite(opts.stubLen) && (opts.stubLen as number) > 0
      ? (opts.stubLen as number)
      : DEFAULT_STUB;
  const out: LineSeg[] = [];
  const ok = (v: SeriesValue): v is number => typeof v === 'number' && Number.isFinite(v);

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!ok(v)) continue;
    const prev = values[i - 1];
    const next = values[i + 1];

    if (!ok(prev)) {
      // بداية مقطع. إن كانت التالية فجوة أيضاً فهي نقطة معزولة ⇒ قطعة بديلة.
      if (!ok(next)) {
        const x = xOf(i);
        const y = yOf(v);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        out.push({ left: x - stub / 2, top: y, len: stub, deg: 0, at: i });
      }
      continue;
    }

    const x1 = xOf(i - 1);
    const y1 = yOf(prev);
    const x2 = xOf(i);
    const y2 = yOf(v);
    if (
      !Number.isFinite(x1) ||
      !Number.isFinite(y1) ||
      !Number.isFinite(x2) ||
      !Number.isFinite(y2)
    ) {
      continue;
    }
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (!(len > 0)) continue;
    out.push({
      left: x1,
      top: y1,
      len,
      deg: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI,
      at: i,
    });
  }
  return out;
}

/** شريحة نطاق (بولنجر/كلتنر…): مستطيل من الحدّ الأعلى إلى الأدنى عند عمود واحد. */
export interface BandStrip {
  left: number;
  top: number;
  width: number;
  height: number;
  at: number;
}

/**
 * عرض الشريحة = **خطوة العمود** لا رقم ثابت.
 *
 * السبب: النطاقات كانت تُرسم `width: 2` عند كل شمعة. وهذا يملأ المساحة فقط حين تكون
 * خطوة العمود ≤ 2px. عند التكبير (عشرون شمعة على هاتف، خطوة ‎~16px‎) يصير «النطاق»
 * **سياجاً من أعمدة متباعدة** لا مساحة، فلا يُرى انضغاط بولنجر ولا لمس السعر لحدّ.
 * وبالطرف الآخر — ألف شمعة، خطوة ‎0.35px‎ — كانت الشرائح تتراكب ستّ مرّات فيصير الملء
 * المقصود ‎18%‎ نحو ‎66%‎: **شفافية النطاق كانت تتبدّل بالتكبير** وهي ثابتة بالتصميم.
 *
 * `+0.5` تسدّ الشعرة بين شريحتين متجاورتين بعد تقريب البكسل.
 */
export function bandStripWidth(plotW: number, count: number): number {
  const w = Number.isFinite(plotW) ? plotW : 0;
  const n = Math.max(1, Math.floor(Number.isFinite(count) ? count : 1));
  const step = Math.max(0, w) / n;
  return Math.max(1, step + 0.5);
}

/**
 * شرائح نطاق متّصلة بين `upper` و`lower`.
 *
 * - أيّ طرف فجوة ⇒ لا شريحة (لا يُملأ نطاق قبل اكتمال فترته).
 * - الحدّ مقلوب (`upper` تحت `lower` بمقياس مقلوب) ⇒ يُؤخذ الأصغر أعلى والفرق بالمطلق،
 *   فلا ارتفاع سالب.
 * - أقلّ ارتفاع 2px: نطاق منضغط تماماً يبقى خطّاً مرئيّاً لا يختفي.
 */
export function planBandStrips(
  upper: readonly SeriesValue[],
  lower: readonly SeriesValue[],
  xOf: (i: number) => number,
  yOf: (v: number) => number,
  width: number
): BandStrip[] {
  const w = Number.isFinite(width) && width > 0 ? width : 2;
  const out: BandStrip[] = [];
  for (let i = 0; i < upper.length; i++) {
    const hi = upper[i];
    const lo = lower[i];
    if (typeof hi !== 'number' || !Number.isFinite(hi)) continue;
    if (typeof lo !== 'number' || !Number.isFinite(lo)) continue;
    const x = xOf(i);
    const yHi = yOf(hi);
    const yLo = yOf(lo);
    if (!Number.isFinite(x) || !Number.isFinite(yHi) || !Number.isFinite(yLo)) continue;
    out.push({
      left: x - w / 2,
      top: Math.min(yHi, yLo),
      width: w,
      height: Math.max(2, Math.abs(yLo - yHi)),
      at: i,
    });
  }
  return out;
}
