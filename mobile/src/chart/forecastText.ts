/**
 * نصوص صوت «توقّع المؤشرات» من رموز الخادم (backend-r3) بمفاتيح i18n — الكردي يُبنى هنا (الخادم عربي/إنجليزي فقط).
 * رمز لا نعرفه (خادم أحدث) ⇒ نصّ الخادم كما وصل؛ لا جملة ناقصة ولا `{rsi}` حرفي أمام المتداول.
 */
import type { Dict } from '../i18n/locales';

type VoteLike = {
  id: string;
  name: string;
  detail: string;
  detail_code?: string;
  detail_values?: Record<string, number>;
};

/** مفتاح `_VOTE_NAMES`: `id` نفسه، إلا `ma` ⇒ `ma_cross` لرموز التقاطع وإلا `ma_trend`. */
export function forecastVoteNameKey(v: Pick<VoteLike, 'id' | 'detail_code'>): string {
  if (v.id === 'ma') return (v.detail_code ?? '').startsWith('ma_cross_') ? 'ma_cross' : 'ma_trend';
  return v.id;
}

export function forecastVoteName(v: VoteLike, t: Pick<Dict, 'forecastVoteNames'>): string {
  const names = t.forecastVoteNames as Record<string, string | undefined>;
  return names[forecastVoteNameKey(v)] ?? v.name;
}

/** رقم كما قرّبه الخادم، بلا صيغة أُسّية (`String(1.2e-7)` = «1.2e-7»). */
function valueText(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const s = String(n);
  return /e/i.test(s) ? n.toFixed(12).replace(/\.?0+$/, '') : s;
}

export function forecastVoteDetail(v: VoteLike, t: Pick<Dict, 'forecastDetail'>): string {
  const tpl = v.detail_code ? (t.forecastDetail as Record<string, string | undefined>)[v.detail_code] : undefined;
  if (!tpl) return v.detail;
  const vals = v.detail_values ?? {};
  let missing = false;
  const out = tpl.replace(/\{(\w+)\}/g, (_m, k: string) => {
    const n = vals[k];
    if (typeof n !== 'number') {
      missing = true;
      return '';
    }
    return valueText(n);
  });
  return missing ? v.detail : out;
}

/** `disclaimer_code` ⇒ مفتاح i18n؛ رمز غائب/مجهول ⇒ نصّ الخادم. */
export function forecastDisclaimer(
  code: string | null | undefined,
  serverText: string | null | undefined,
  t: Pick<Dict, 'forecastDisclaimerConsensus' | 'forecastDisclaimerNoData' | 'forecastDisclaimerNoMovement'>
): string {
  if (code === 'indicator_consensus') return t.forecastDisclaimerConsensus;
  if (code === 'not_enough_data') return t.forecastDisclaimerNoData;
  // backend-r54: سلسلة كاملة بلا حركة (سوق مجمّد/مغلق) — ليست «شموعاً قليلة».
  if (code === 'no_movement') return t.forecastDisclaimerNoMovement;
  return serverText ?? '';
}
