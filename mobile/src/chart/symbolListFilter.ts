/**
 * تصفية منتقي الرمز بالشارت (`SymbolListPicker`): ما يبدأ بالمكتوب أوّلاً، ثم ما يحويه — «usd» تضع USDJPY
 * وUSDCAD قبل EURUSD. بلا حساسية حالة، وبلا «/» ولا مسافات («eur/usd» = EURUSD). الترتيب داخل كل مجموعة
 * ترتيب قائمة المتابعة نفسه، فلا يقفز زوج المتداول المعتاد عند كل حرف.
 */
export function filterSymbols(list: readonly string[], query: string): string[] {
  const q = query.replace(/[\s/]/g, '').toUpperCase();
  if (!q) return [...list];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const s of list) {
    const u = s.toUpperCase();
    if (u.startsWith(q)) starts.push(s);
    else if (u.includes(q)) contains.push(s);
  }
  return [...starts, ...contains];
}
