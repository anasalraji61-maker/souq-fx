/**
 * أسعار البداية للشموع التجريبية (`mockSeries`) حين يتعذّر الاتصال — مصدر واحد لكل شاشات الشارت.
 * كانت منسوخة ×3 (الطرفية 21 رمزاً، التركيز 21، الرباعي 6 فقط) ⇒ بالرباعي بلا اتصال رُسم AUDUSD/GBPJPY/
 * XAGUSD/USOIL حول **1.0** (QA26). المالكون الآخرون يستوردون من هنا بدل نسخهم.
 */
export const MOCK_BASES: Readonly<Record<string, number>> = {
  DXY: 104.25,
  EURUSD: 1.0854,
  GBPUSD: 1.2732,
  USDJPY: 157.42,
  AUDUSD: 0.662,
  USDCAD: 1.364,
  NZDUSD: 0.601,
  USDCHF: 0.884,
  EURJPY: 162.15,
  GBPJPY: 200.4,
  EURGBP: 0.852,
  AUDJPY: 104.2,
  EURAUD: 1.64,
  EURCHF: 0.96,
  CADJPY: 115.3,
  XAUUSD: 2348.6,
  XAGUSD: 28.4,
  USOIL: 78.35,
  UKOIL: 82.1,
};

/** سعر البداية التجريبي لرمز — 1 لما لا يُعرف (كما كان كل مستهلك يفعل). */
export function mockBase(symbol: string): number {
  return MOCK_BASES[symbol.toUpperCase()] ?? 1;
}
