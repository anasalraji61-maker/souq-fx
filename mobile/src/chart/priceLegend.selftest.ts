/**
 * Self-test for the price-pane legend (pure) + a source scan that keeps the legend's
 * colours honest against the 40-odd draw sites inside MatrixChart.tsx.
 * Run: npx --yes tsx src/chart/priceLegend.selftest.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  LEGEND_CHIP_W,
  LEGEND_MAX_CHIPS,
  PRICE_OVERLAYS,
  PRICE_OVERLAY_ORDER,
  legendCapacity,
  planPriceLegend,
  resolveColorExpr,
} from './priceLegend';

// ١) الترتيب هو الأولوية: الشائع أولاً، والقصّ يقع على النادر لا على الشائع
{
  assert.equal(PRICE_OVERLAY_ORDER[0], 'sma20');
  assert.ok(PRICE_OVERLAY_ORDER.indexOf('bb') < PRICE_OVERLAY_ORDER.indexOf('vidya'));
  assert.ok(PRICE_OVERLAY_ORDER.indexOf('ema21') < PRICE_OVERLAY_ORDER.indexOf('trima'));
  // مفعَّل بترتيب مبعثر ← المعروض بترتيب الأولوية لا بترتيب الإدخال
  const plan = planPriceLegend(['vidya', 'sma50', 'trima', 'ema21'], 2);
  assert.deepEqual(plan.chips.map((c) => c.id), ['sma50', 'ema21']);
  assert.equal(plan.more, 2);
}

// ٢) مؤشرات اللوحات المستقلّة لا تدخل مفتاح السعر ولا تُحسب ضمن «+ن»
{
  const plan = planPriceLegend(['rsi', 'macd', 'stoch', 'adx', 'sma20'], 6);
  assert.deepEqual(plan.chips.map((c) => c.id), ['sma20']);
  assert.equal(plan.more, 0);
}

// ٣) التكرار بقائمة المؤشرات لا يُنتج شارتين
{
  const plan = planPriceLegend(['sma20', 'sma20', 'sma20'], 6);
  assert.equal(plan.chips.length, 1);
  assert.equal(plan.more, 0);
}

// ٤) لا مؤشرات ← لا مفتاح أصلاً (لا صندوق فارغ فوق الشموع)
{
  const plan = planPriceLegend([], 6);
  assert.equal(plan.chips.length, 0);
  assert.equal(plan.more, 0);
}

// ٥) «+ن» تحفظ كل ما لم يتّسع — لا إخفاء صامت بأيّ حال
{
  const active = ['sma20', 'sma50', 'ema21', 'bb', 'vwap', 'psar', 'wma20', 'hma20'];
  for (const cap of [0, 1, 3, 5, 8, 20]) {
    const plan = planPriceLegend(active, cap);
    assert.equal(plan.chips.length + plan.more, active.length, `cap=${cap}`);
    assert.ok(plan.chips.length <= cap || cap < 0, `cap=${cap}`);
  }
  // حدّ صفر: لا شارات، والعدد كامل بـ«+ن»
  const zero = planPriceLegend(active, 0);
  assert.equal(zero.chips.length, 0);
  assert.equal(zero.more, active.length);
}

// ٦) سعة العرض: تتزايد مع العرض، محدودة بسقف ثابت، وصفر عند عرض فاسد
{
  assert.equal(legendCapacity(0), 0);
  assert.equal(legendCapacity(-100), 0);
  assert.equal(legendCapacity(Number.NaN), 0);
  assert.equal(legendCapacity(LEGEND_CHIP_W - 1), 0);
  assert.equal(legendCapacity(LEGEND_CHIP_W), 1);
  assert.equal(legendCapacity(LEGEND_CHIP_W * 3), 3);
  assert.equal(legendCapacity(LEGEND_CHIP_W * 100), LEGEND_MAX_CHIPS);
  let prev = -1;
  for (const w of [0, 60, 120, 200, 300, 400, 900]) {
    const c = legendCapacity(w);
    assert.ok(c >= prev, `w=${w}`);
    prev = c;
  }
  // عرض هاتف ضيّق بخلية رباعية (~150px بعد محور السعر) ← شارتان، لا صفّ يغطّي الشموع
  assert.ok(legendCapacity(150) >= 1 && legendCapacity(150) <= 3);
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

console.log('priceLegend.selftest: PASS');
