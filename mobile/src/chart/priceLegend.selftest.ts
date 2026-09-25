/**
 * Self-test for the price-pane legend (pure) + a source scan that keeps the legend's
 * colours honest against the 40-odd draw sites inside MatrixChart.tsx.
 * Run: npx --yes tsx src/chart/priceLegend.selftest.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  LEGEND_MAX_CHIPS,
  LEGEND_MORE_W,
  DIRECTIONAL_OVERLAYS,
  PRICE_OVERLAYS,
  PRICE_OVERLAY_ORDER,
  activePriceOverlays,
  legendChipWidth,
  legendBandAt,
  legendMultiAt,
  legendValueAt,
  planPriceLegendForWidth,
  resolveColorExpr,
} from './priceLegend';

// المخطِّط الحيّ `planPriceLegendForWidth`: عرض يكفي كل شيء، وعرض يكفي أوّل `n` شارات بالضبط (+«+ن»)
const WIDE = 10_000;
const widthForFirst = (ids: readonly string[], n: number): number =>
  activePriceOverlays(ids)
    .slice(0, n)
    .reduce((w, c) => w + legendChipWidth(c), 0) + LEGEND_MORE_W;

// ١) الترتيب هو الأولوية: الشائع أولاً، والقصّ يقع على النادر لا على الشائع
{
  assert.equal(PRICE_OVERLAY_ORDER[0], 'sma20');
  assert.ok(PRICE_OVERLAY_ORDER.indexOf('bb') < PRICE_OVERLAY_ORDER.indexOf('vidya'));
  assert.ok(PRICE_OVERLAY_ORDER.indexOf('ema21') < PRICE_OVERLAY_ORDER.indexOf('trima'));
  // مفعَّل بترتيب مبعثر ← المعروض بترتيب الأولوية لا بترتيب الإدخال
  const ids = ['vidya', 'sma50', 'trima', 'ema21'];
  const plan = planPriceLegendForWidth(ids, widthForFirst(ids, 2));
  assert.deepEqual(plan.chips.map((c) => c.id), ['sma50', 'ema21']);
  assert.equal(plan.more, 2);
}

// ٢) مؤشرات اللوحات المستقلّة لا تدخل مفتاح السعر ولا تُحسب ضمن «+ن»
{
  const plan = planPriceLegendForWidth(['rsi', 'macd', 'stoch', 'adx', 'sma20'], WIDE);
  assert.deepEqual(plan.chips.map((c) => c.id), ['sma20']);
  assert.equal(plan.more, 0);
}

// ٣) التكرار بقائمة المؤشرات لا يُنتج شارتين
{
  const plan = planPriceLegendForWidth(['sma20', 'sma20', 'sma20'], WIDE);
  assert.equal(plan.chips.length, 1);
  assert.equal(plan.more, 0);
}

// ٤) لا مؤشرات ← لا مفتاح أصلاً (لا صندوق فارغ فوق الشموع)
{
  const plan = planPriceLegendForWidth([], WIDE);
  assert.equal(plan.chips.length, 0);
  assert.equal(plan.more, 0);
}

// ٥) «+ن» تحفظ كل ما لم يتّسع — لا إخفاء صامت بأيّ عرض، ولا أكثر من السقف مهما اتّسع
{
  const active = ['sma20', 'sma50', 'ema21', 'bb', 'vwap', 'psar', 'wma20', 'hma20'];
  for (const w of [0, -5, Number.NaN, 60, 150, 300, 600, WIDE]) {
    const plan = planPriceLegendForWidth(active, w);
    assert.equal(plan.chips.length + plan.more, active.length, `w=${w}`);
    assert.ok(plan.chips.length <= LEGEND_MAX_CHIPS, `w=${w}`);
  }
  // عرض صفر: لا شارات، والعدد كامل بـ«+ن»
  const zero = planPriceLegendForWidth(active, 0);
  assert.equal(zero.chips.length, 0);
  assert.equal(zero.more, active.length);
  // يتزايد مع العرض
  let prev = -1;
  for (const w of [0, 60, 120, 200, 300, 400, 900]) {
    const c = planPriceLegendForWidth(active, w).chips.length;
    assert.ok(c >= prev, `w=${w}`);
    prev = c;
  }
}

// ٧) حلّ اللون: الحرفي كما هو، والرمز من الجدول، والمجهول لون محايد لا undefined
{
  const tokens = { accent: '#2DD4BF', 'colors.infoAccent': '#A78BFA' };
  assert.equal(resolveColorExpr('#FBBF24', tokens), '#FBBF24');
  assert.equal(resolveColorExpr('rgba(56,189,248,0.18)', tokens), 'rgba(56,189,248,0.18)');
  assert.equal(resolveColorExpr('accent', tokens), '#2DD4BF');
  assert.equal(resolveColorExpr('colors.infoAccent', tokens), '#A78BFA');
  const unknown = resolveColorExpr('colors.doesNotExist', tokens);
  assert.ok(typeof unknown === 'string' && unknown.startsWith('#'), 'fallback colour');
}

// ٨) كل شارة لها اسم ولون صالح واحد على الأقل، وحتى ثلاثة
{
  for (const [id, spec] of Object.entries(PRICE_OVERLAYS)) {
    assert.ok(spec.label.length > 0 && spec.label.length <= 10, `${id} label=${spec.label}`);
    assert.ok(spec.swatch.length >= 1 && spec.swatch.length <= 3, `${id} swatch`);
    for (const c of spec.swatch) assert.ok(c.length > 0, `${id} empty colour`);
  }
  // لا اسمان متطابقان — وإلا صار المفتاح نفسه ملتبساً
  const labels = Object.values(PRICE_OVERLAYS).map((s) => s.label);
  assert.equal(new Set(labels).size, labels.length, 'duplicate labels');
}

// ٩) **المسح الآليّ**: لون كل شارة مستعمَل فعلاً برسم تلك الطبقة داخل MatrixChart.tsx
//    (أربعون موضع رسم مكتوبة بمواضعها — هذا ما يمنع مفتاحاً يكذب على المتداول)
{
  const src = fs.readFileSync(path.join(__dirname, 'MatrixChart.tsx'), 'utf8');
  const OPEN = "\n        {indicators.includes('";
  const drawnFor = (id: string): Set<string> => {
    const out = new Set<string>();
    let from = 0;
    for (;;) {
      const at = src.indexOf(`${OPEN}${id}')`, from);
      if (at < 0) break;
      from = at + 1;
      // حدّ المقطع: أول ابن JSX تالٍ بنفس المستوى (مسافة بادئة 8) — فلا يتسرّب لون جار
      const next = src.indexOf('\n        {', at + OPEN.length);
      const seg = src.slice(at, next < 0 ? src.length : next);
      for (const m of seg.matchAll(/backgroundColor: ([^\n]+)/g)) {
        const tail = m[1]!;
        for (const lit of tail.matchAll(/'([^']+)'/g)) out.add(lit[1]!);
        for (const tok of tail.matchAll(/\b(accent|colors\.[A-Za-z]+)\b/g)) out.add(tok[1]!);
      }
    }
    return out;
  };

  let checked = 0;
  for (const [id, spec] of Object.entries(PRICE_OVERLAYS)) {
    assert.ok(
      src.includes(`indicators.includes('${id}')`),
      `${id}: مفتاح غير موجود بالشارت إطلاقاً`
    );
    const drawn = drawnFor(id);
    assert.ok(drawn.size > 0, `${id}: لم يُعثر على لون رسم واحد`);
    for (const expr of spec.drawn ?? spec.swatch) {
      assert.ok(
        drawn.has(expr),
        `${id}: لون الشارة ${expr} غير مستعمَل بالرسم — المفتاح يكذب. المرسوم: ${[
          ...drawn,
        ].join(', ')}`
      );
      checked++;
    }
  }
  assert.ok(checked >= 40, `عدد الألوان المتحقَّق منها ${checked} < 40`);
}

// ١٠) **تغطية كاملة**: كل طبقة تُرسم على لوحة السعر لها مدخل بالجدول — لا طبقة تُرسم
//     بلا اسم، ولا مدخل يشير لطبقة لا تُرسم. (كان الجدول يغطّي 35 من 48 فيبدو المفتاح
//     كاملاً وهو ليس كذلك: من يفعّل Supertrend وحده لم يكن يرى شارة واحدة.)
{
  const src = fs.readFileSync(path.join(__dirname, 'MatrixChart.tsx'), 'utf8');
  // مواضع الرسم على لوحة السعر وحدها: ابن JSX بمسافة بادئة 8 بالضبط
  const drawnIds = new Set<string>();
  for (const m of src.matchAll(/\n        \{indicators\.includes\('([A-Za-z0-9_]+)'\)/g)) {
    drawnIds.add(m[1]!);
  }
  assert.ok(drawnIds.size >= 48, `مواضع الرسم المكتشَفة ${drawnIds.size} — المسح انكسر`);
  const tableIds = new Set(PRICE_OVERLAY_ORDER);
  const missing = [...drawnIds].filter((id) => !tableIds.has(id)).sort();
  const orphan = [...tableIds].filter((id) => !drawnIds.has(id)).sort();
  assert.deepEqual(missing, [], `طبقات تُرسم بلا مدخل بالمفتاح: ${missing.join(', ')}`);
  assert.deepEqual(orphan, [], `مداخل بالمفتاح لا تُرسم: ${orphan.join(', ')}`);
}

// ١١) التخطيط بالعرض الحقيقي: «+ن» محجوزة، والثابت محفوظ بكل عرض
{
  const ALL = PRICE_OVERLAY_ORDER;
  for (const w of [-50, 0, 12, 24, 40, 80, 150, 240, 320, 700, 2000, Number.NaN]) {
    const plan = planPriceLegendForWidth(ALL, w);
    assert.equal(
      plan.chips.length + plan.more,
      ALL.length,
      `w=${w}: إخفاء صامت (${plan.chips.length}+${plan.more} ≠ ${ALL.length})`
    );
    assert.ok(plan.chips.length <= LEGEND_MAX_CHIPS, `w=${w}: تجاوز السقف`);
    if (plan.chips.length > 0) {
      // الشارات المعروضة + «+ن» المحجوزة تسع فعلاً بالعرض المتاح
      let used = 0;
      for (const c of plan.chips) used += legendChipWidth(c);
      const need = plan.more > 0 ? used + LEGEND_MORE_W : used;
      assert.ok(need <= w, `w=${w}: العرض المخطَّط ${need} يتجاوز المتاح`);
    }
  }
  // رتابة: العرض الأكبر لا يعرض شارات أقلّ
  let prev = -1;
  for (const w of [0, 40, 80, 150, 240, 320, 480, 700]) {
    const n = planPriceLegendForWidth(ALL, w).chips.length;
    assert.ok(n >= prev, `w=${w}: ${n} < ${prev}`);
    prev = n;
  }
  // الحالة التي دفعت لهذا: اسمان طويلان بعرض هاتف ضيّق — العدّاد يبقى مرئياً
  const longOnes = planPriceLegendForWidth(['supertrend', 'chandelierExit', 'sma20'], 120);
  assert.equal(longOnes.chips.length + longOnes.more, 3);
  // التقدير الثابت السابق (58px) كان يَعِد بشارتين على الأقل بنفس العرض
  assert.ok(legendChipWidth({ label: 'Supertrend', swatch: ['a', 'b'] }) > 58);
  // لا شيء مفعَّل ← لا مفتاح ولا عدّاد
  assert.deepEqual(planPriceLegendForWidth([], 400), { chips: [], more: 0 });
  // مؤشرات اللوحات المستقلّة لا تدخل ولا تُحسب
  assert.deepEqual(planPriceLegendForWidth(['rsi', 'macd'], 400), { chips: [], more: 0 });
  // كل المفعَّل يتّسع ← بلا «+ن» إطلاقاً
  const few = planPriceLegendForWidth(['sma20', 'bb'], 600);
  assert.equal(few.more, 0);
  assert.equal(few.chips.length, 2);
}

// ١٢) `activePriceOverlays`: الترتيب أولوية، بلا تكرار، وبلا حدّ
{
  const a = activePriceOverlays(['vidya', 'vidya', 'sma20', 'rsi', 'bb']);
  assert.deepEqual(a.map((c) => c.id), ['sma20', 'bb', 'vidya']);
  assert.equal(activePriceOverlays(PRICE_OVERLAY_ORDER).length, PRICE_OVERLAY_ORDER.length);
  assert.equal(activePriceOverlays([]).length, 0);
}

// ١٣) **تفرّد اللون**: لا طبقتان تُرسمان بنفس اللون بالضبط على لوحة السعر.
//     السبب: مفتاح فيه مربّعان متطابقان لا يميّز شيئاً — ومن يفعّل SMA 50 مع Keltner
//     كان يرى خطّاً ووشاحاً بلون #A78BFA نفسه، وBB مع Ichimoku بلون #38BDF8 نفسه.
//     يُستثنى ما لونه دلالي (اتجاه) لا هويّتي: Supertrend وFractals وElder.
{
  const theme = fs.readFileSync(path.join(__dirname, '..', 'theme.ts'), 'utf8');
  const tokens: Record<string, string> = {};
  for (const m of theme.matchAll(
    /^\s*([A-Za-z][A-Za-z0-9]*): '(#[0-9A-Fa-f]{6}|rgba?\([^']*\))',/gm
  )) {
    tokens[`colors.${m[1]!}`] = m[2]!;
  }
  tokens.accent = tokens['colors.accent']!;
  assert.ok(tokens['colors.infoAccent'], 'لم تُقرأ رموز السمة');

  /** يوحّد التعبير إلى ‎#RRGGBB‎ حتى يُكشف تطابق رمز مع hex حرفي (وهو ما كان يُخفي الخلل). */
  const solid = (expr: string): string => {
    const raw = tokens[expr] ?? expr;
    const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(raw);
    if (!m) return raw.toUpperCase();
    const hex = (n: string) => Number(n).toString(16).padStart(2, '0');
    return `#${hex(m[1]!)}${hex(m[2]!)}${hex(m[3]!)}`.toUpperCase();
  };

  const owner = new Map<string, string>();
  for (const id of PRICE_OVERLAY_ORDER) {
    if (DIRECTIONAL_OVERLAYS.includes(id)) continue;
    for (const expr of PRICE_OVERLAYS[id]!.swatch) {
      const c = solid(expr);
      const prev = owner.get(c);
      assert.equal(prev, undefined, `اللون ${c} مشترك بين ${prev} و${id} — المفتاح لا يميّز`);
      owner.set(c, id);
    }
  }
  assert.ok(owner.size >= 45, `ألوان متفرّدة ${owner.size} — المسح انكسر`);

  // والاستثناء مقصود لا ثغرة: الدلالية فعلاً تتشارك bull/bear، ولا تُذكر بلا سبب
  for (const id of DIRECTIONAL_OVERLAYS) {
    assert.ok(PRICE_OVERLAYS[id], `${id}: باستثناء الدلالية وليس بالجدول`);
    const sw = PRICE_OVERLAYS[id]!.swatch.map(solid);
    assert.ok(
      sw.includes(solid('colors.bull')) && sw.includes(solid('colors.bear')),
      `${id}: مستثنى كدلالي لكنه لا يستعمل ألوان الاتجاه`
    );
  }
}

// ١٤) كل رمز سمة بالجدول موجود فعلاً بـ`legendTokens` داخل MatrixChart.tsx.
//     وإلا أعاد `resolveColorExpr` لونه الاحتياطي ‎#94A3B8‎ — وهو لون Median نفسه،
//     أي مربّع رمادي يدّعي أنه لون الطبقة. فشل صامت بالضبط كالذي يمنعه هذا الملف.
{
  const src = fs.readFileSync(path.join(__dirname, 'MatrixChart.tsx'), 'utf8');
  const at = src.indexOf('const legendTokens = useMemo(');
  assert.ok(at > 0, 'legendTokens غير موجودة — تغيّر اسمها؟');
  const block = src.slice(at, src.indexOf('[accent]', at));
  const provided = new Set<string>();
  if (/(^|\W)accent,/m.test(block)) provided.add('accent');
  for (const m of block.matchAll(/'(colors\.[A-Za-z]+)':/g)) provided.add(m[1]!);

  const needed = new Set<string>();
  for (const spec of Object.values(PRICE_OVERLAYS)) {
    for (const expr of spec.swatch) {
      if (!expr.startsWith('#') && !expr.startsWith('rgb')) needed.add(expr);
    }
  }
  const unresolved = [...needed].filter((t) => !provided.has(t)).sort();
  assert.deepEqual(unresolved, [], `رموز بلا قيمة بـlegendTokens: ${unresolved.join(', ')}`);
  const unused = [...provided].filter((t) => !needed.has(t)).sort();
  assert.deepEqual(unused, [], `رموز بـlegendTokens لا يستعملها الجدول: ${unused.join(', ')}`);
}

// ١٤) قيمة الخطّ بالمفتاح: عند الشمعة، بلا رقم مختلَق للإحماء، وعرضها محجوز بالتخطيط
{
  const line = [null, null, 1.0851, 1.08532];
  assert.equal(legendValueAt(line, 3), 1.08532);
  assert.equal(legendValueAt(line, 2), 1.0851);
  assert.equal(legendValueAt(line, 0), null); // إحماء SMA
  assert.equal(legendValueAt(line, 4), null);
  assert.equal(legendValueAt(line, -1), null);
  assert.equal(legendValueAt(line, null), null);
  assert.equal(legendValueAt(null, 1), null);
  assert.equal(legendValueAt([NaN], 0), null);
  // القيمة تُعرّض الشارة: «SMA 20 1.08532» أعرض من «SMA 20» بسبعة محارف (القيمة + فراغ)
  const chip = { label: 'SMA 20', swatch: ['a'] };
  assert.ok(Math.abs(legendChipWidth(chip, 7) - legendChipWidth(chip) - 8 * 5.2) < 1e-9);
  assert.equal(legendChipWidth(chip, 0), legendChipWidth(chip));
  // ثلاث طبقات تتّسع بأسمائها بـ200px، ومع قيمها لا ⇒ «+ن» لا قصّ صامت
  const ids = ['sma20', 'sma50', 'ema21'];
  assert.equal(planPriceLegendForWidth(ids, 200).more, 0);
  const withV = planPriceLegendForWidth(ids, 200, { sma20: 7, sma50: 7, ema21: 7 });
  assert.ok(withV.more > 0);
  assert.equal(withV.chips.length + withV.more, 3);
}

// حدّا النطاق: الأعلى أولاً، ولا نصف نطاق بالإحماء
{
  const up = [null, 1.0873, 1.0875];
  const lo = [null, 1.0833, NaN];
  assert.deepEqual(legendBandAt(up, lo, 1), [1.0873, 1.0833]);
  assert.equal(legendBandAt(up, lo, 0), null);
  assert.equal(legendBandAt(up, lo, 2), null);
  assert.equal(legendBandAt(up, lo, 5), null);
  assert.deepEqual(legendBandAt([1.0], [2.0], 0), [2.0, 1.0]);
  assert.equal(legendBandAt(null, lo, 1), null);
}

// قيم متعدّدة الخطوط (إيشيموكو/التمساح): بالترتيب المُمرَّر، وأيّ خطّ بالإحماء ⇒ لا شيء
{
  const tenkan = [null, 1.0851, 1.0852];
  const kijun = [null, 1.0847, null];
  assert.deepEqual(legendMultiAt([tenkan, kijun], 1), [1.0851, 1.0847]);
  assert.equal(legendMultiAt([tenkan, kijun], 0), null);
  assert.equal(legendMultiAt([tenkan, kijun], 2), null);
  assert.equal(legendMultiAt([tenkan, null], 1), null);
  assert.equal(legendMultiAt([], 1), null);
  assert.deepEqual(legendMultiAt([[3], [1], [2]], 0), [3, 1, 2]);
}

console.log('priceLegend.selftest: PASS');
