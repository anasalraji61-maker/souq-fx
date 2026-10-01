/** `#RRGGBB` + شفافية ⇒ `rgba(...)` — كي تُشتقّ ظلال الشموع ونطاقات الوقف/الهدف من `colors.bull`/`colors.bear`
 * نفسها، فلا يختلف أحمر الشمعة عن أحمر نطاقها حين يتغيّر اللون بالسمة (ui67a). */
export function withAlpha(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
