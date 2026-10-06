import { apiClient } from './client';

/**
 * Trade ideas shared by users (server: /api/votes) and content reports (/api/reports).
 * Reading ideas is public; sharing, voting and reporting need an account.
 * The server answers `{ ok: false, error: 'login_required' | 'links_not_allowed' | ... }` with HTTP 200
 * for those cases, and 422 when the levels are inconsistent (buy needs SL < entry < TP).
 */

export interface TradeIdea {
  id: string;
  symbol: string;
  direction: 'buy' | 'sell';
  entry: number | null;
  sl: number | null;
  tp: number | null;
  note: string;
  agree: number;
  disagree: number;
  author: string | null;
  ts?: string;
  /** seconds UTC */
  created_at?: number | null;
  my_choice?: 'agree' | 'disagree' | null;
  mine?: boolean;
}

export type IdeaErrorCode =
  | 'login_required'
  | 'links_not_allowed'
  | 'invalid_levels'
  | 'not_found'
  | 'network'
  | 'server';

function code(status: number, error: string | null | undefined): IdeaErrorCode {
  const e = (error || '').toLowerCase();
  if (status === 401 || e === 'login_required') return 'login_required';
  if (e === 'links_not_allowed') return 'links_not_allowed';
  if (status === 422) return 'invalid_levels';
  if (e.includes('not found') || e === 'not_found') return 'not_found';
  if (status === 0) return 'network';
  return 'server';
}

export async function fetchIdeas(): Promise<{ ok: boolean; ideas: TradeIdea[]; error?: IdeaErrorCode }> {
  const res = await apiClient.get<{ votes?: TradeIdea[] }>('/api/votes');
  if (res.ok && res.data && Array.isArray(res.data.votes)) {
    return { ok: true, ideas: res.data.votes };
  }
  return { ok: false, ideas: [], error: code(res.status, res.error) };
}

export async function voteIdea(
  id: string,
  choice: 'agree' | 'disagree'
): Promise<{ ok: boolean; idea?: TradeIdea; error?: IdeaErrorCode }> {
  const res = await apiClient.post<{ ok: boolean; vote?: TradeIdea; error?: string }>('/api/votes/ballot', {
    vote_id: id,
    choice,
  });
  if (res.ok && res.data?.ok && res.data.vote) return { ok: true, idea: res.data.vote };
  return { ok: false, error: code(res.status, res.data?.error ?? res.error) };
}

export async function shareIdea(idea: {
  symbol: string;
  direction: 'buy' | 'sell';
  entry: number;
  sl: number;
  tp: number;
  note: string;
}): Promise<{ ok: boolean; idea?: TradeIdea; error?: IdeaErrorCode }> {
  const res = await apiClient.post<{ ok: boolean; vote?: TradeIdea; error?: string }>('/api/votes', idea);
  if (res.ok && res.data?.ok && res.data.vote) return { ok: true, idea: res.data.vote };
  return { ok: false, error: code(res.status, res.data?.error ?? res.error) };
}

export type ReportReason = 'scam' | 'abuse' | 'spam' | 'other';
export type ReportKind = 'channel_message' | 'group_message' | 'vote';

export async function reportContent(
  kind: ReportKind,
  targetId: string,
  reason: ReportReason
): Promise<{ ok: boolean; alreadyReported?: boolean; error?: IdeaErrorCode }> {
  const res = await apiClient.post<{ ok: boolean; new?: boolean; error?: string }>('/api/reports', {
    kind,
    target_id: targetId,
    reason,
  });
  if (res.ok && res.data?.ok) return { ok: true, alreadyReported: res.data.new === false };
  return { ok: false, error: code(res.status, res.data?.error ?? res.error) };
}

/** Risk:reward of an idea (null when the levels are missing or inconsistent). */
export function ideaRiskReward(i: Pick<TradeIdea, 'entry' | 'sl' | 'tp'>): number | null {
  if (i.entry == null || i.sl == null || i.tp == null) return null;
  const risk = Math.abs(i.entry - i.sl);
  const reward = Math.abs(i.tp - i.entry);
  if (!(risk > 0) || !Number.isFinite(reward)) return null;
  return reward / risk;
}
