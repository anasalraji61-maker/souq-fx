/**
 * وسوم قيم طبقات السعر على المحور (كـTradingView «Indicator last value»): EMA 21 / SMA 50 / حدّا BB…
 * كلٌّ بلون خطّه عند الشمعة الأخيرة بالنافذة — حيث يلتقي الخطّ بالمحور بالضبط.
 *
 * كان المحور يحمل السعر الحيّ وحده، فـ«كم يبعد السعر عن EMA 21؟» يعني تتبّع خطّ منقّط رفيع بالعين
 * إلى أرقام المحور ثم الطرح — وخطّان متقاربان (SMA 20 وEMA 21) لا يُعرف أيّهما عند أيّ رقم. المفتاح
 * بالأعلى يطبع القيمة، لكنه بعيد عن الخطّ ويختفي بخلايا الرباعي الضيّقة.
 *
 * الأولوية بترتيب `items` (الأهمّ أولاً): وسم يلمس وسماً أهمّ منه أو علبة محجوزة (السعر الحيّ، التقاطع،
 * الرسم المحدَّد) يُسقط بدل أن يتكدّس. وسمٌ لخطّ خارج المدى المرئيّ لا يُلصق بالحافّة (لا مستوى مختلَق).
 */
import { boxesTouch } from './axisTicks';

export type OverlayTagInput = { key: string; price: number; color: string };
export type OverlayTag = OverlayTagInput & { top: number; text: string };

/** سقف الوسوم: أكثر من هذا يغطّي أرقام المحور كلّها بهاتف (علوّ اللوح ~300px). */
export const OVERLAY_TAG_MAX = 6;

export function placeOverlayTags(
  items: readonly OverlayTagInput[],
  yOf: (price: number) => number,
  plotH: number,
  tagH: number,
  reserved: readonly { top: number; h: number }[],
  max: number = OVERLAY_TAG_MAX
): Omit<OverlayTag, 'text'>[] {
  const out: Omit<OverlayTag, 'text'>[] = [];
  for (const it of items) {
    if (out.length >= max) break;
    if (!Number.isFinite(it.price)) continue;
    const y = yOf(it.price);
    if (!Number.isFinite(y) || y < 0 || y > plotH) continue;
    const top = Math.max(0, Math.min(plotH - tagH - 2, y - tagH / 2));
    if (reserved.some((r) => boxesTouch(top, tagH, r.top, r.h, 0))) continue;
    if (out.some((t) => boxesTouch(top, tagH, t.top, tagH, 0))) continue;
    out.push({ ...it, top });
  }
  return out;
}

/**
 * لون النصّ فوق خلفية الوسم: داكن فوق الفاتح (VWAP الأبيض، SMA 20 الكهرماني)، أبيض فوق الداكن
 * (أزرق كحلي). لون غير سداسي (rgba/رمز) ⇒ داكن كوسوم الشارت الأخرى.
 */
export function tagTextColor(bg: string): '#041514' | '#FFFFFF' {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(bg.trim());
  if (!m) return '#041514';
  const h = m[1]!.length === 3 ? m[1]!.replace(/./g, (c) => c + c) : m[1]!;
  const lin = (i: number) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4);
  // التباين مع الداكن (L≈0.008) مقابل الأبيض: نقطة التعادل ≈ 0.18.
  return L >= 0.18 ? '#041514' : '#FFFFFF';
}
