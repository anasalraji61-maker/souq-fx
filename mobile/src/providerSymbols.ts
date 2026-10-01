/**
 * رموز لا يقدّمها مزوّد البيانات أبداً (backend-r19) — الخادم يرسل لها `candles: []` بـ`not_offered_by_provider`،
 * ويرفض التنبيه عليها بـ422 `symbol unavailable at provider` (backend-r50c، `be94525`): تنبيهٌ عليها كان يُحفظ
 * «يراقب» ولا يُطلق أبداً. المصدر الوحيد — `TerminalScreen` والتنبيهات يستوردونه من هنا.
 */
export const NOT_OFFERED_SYMBOLS: ReadonlySet<string> = new Set(['DXY']);

export function isNotOfferedSymbol(symbol: string): boolean {
  return NOT_OFFERED_SYMBOLS.has(symbol.trim().toUpperCase());
}

/**
 * رفض الخادم لتنبيه على رمز لا يقدّمه المزوّد: التفصيل «symbol unavailable at provider» (بقائمة أخطاء
 * pydantic)، أو 422 على رمز نعرفه غير مقدَّم (`patchJson` لا يحمل التفصيل). غير ذلك ⇒ خطأ الإضافة العام.
 */
export function isSymbolUnavailableError(e: unknown, symbol: string): boolean {
  const err = e as { status?: number; detail?: unknown } | null;
  if (!err || err.status !== 422) return false;
  let detail = '';
  try {
    detail = JSON.stringify(err.detail ?? '');
  } catch {
    /* تفصيل دائري — نكتفي بالرمز */
  }
  return detail.includes('symbol unavailable at provider') || isNotOfferedSymbol(symbol);
}
