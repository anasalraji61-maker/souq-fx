import { apiClient } from './client';

/**
 * Community channels (server: routers_community.py).
 *  - Reading and posting need an account (401 otherwise). There is no invented fallback content:
 *    when the server can't be reached the screen says so instead of showing fake messages.
 *  - The sender name always comes from the server (the account's username).
 *  - Links are refused by the server (400 `links_not_allowed`), 5 messages / 10 s per account (429).
 */

export interface CommunityChannel {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  /** Sent by the server but it is a static figure, so the app does not display it. */
  online_count?: number;
}

export interface CommunityMessage {
  id: string;
  channel_id: string;
  sender_name: string;
  badge?: string;
  avatar_bg?: string;
  content: string;
  /** ISO-8601 UTC */
  created_at: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  symbol_tag?: string | null;
  likes?: number;
  is_flagged?: boolean;
  /** Message of the signed-in account. */
  mine?: boolean;
}

/** Channel ids the server knows (community_chat.DEFAULT_CHANNELS); used before the list loads. */
export const DEFAULT_CHANNELS: CommunityChannel[] = [
  { id: 'general', name: 'General', name_ar: 'النقاش العام', description: '' },
  { id: 'forex', name: 'Forex Majors', name_ar: 'العملات والفوركس', description: '' },
  { id: 'metals', name: 'Precious Metals', name_ar: 'الذهب والمعادن', description: '' },
  { id: 'indices', name: 'Global Indices', name_ar: 'المؤشرات العالمية', description: '' },
  { id: 'energy', name: 'Energy & Oil', name_ar: 'الطاقة والنفط', description: '' },
  { id: 'signals', name: 'Technical Ideas', name_ar: 'التحليل الفني', description: '' },
];

export const MESSAGE_MAX_CHARS = 1000;
export const PAGE_SIZE = 40;

export type CommunityErrorCode =
  | 'login_required'
  | 'links_not_allowed'
  | 'rate_limited'
  | 'too_long'
  | 'empty'
  | 'unknown_channel'
  | 'network'
  | 'server';

function errorCode(status: number, error: string | null): CommunityErrorCode {
  if (status === 401) return 'login_required';
  if (status === 429) return 'rate_limited';
  if (status === 0) return 'network';
  const e = (error || '').toLowerCase();
  if (e.includes('links_not_allowed')) return 'links_not_allowed';
  if (e.includes('too long')) return 'too_long';
  if (e === 'empty' || e.includes('non-empty')) return 'empty';
  if (status === 404) return 'unknown_channel';
  return 'server';
}

export async function fetchChannels(): Promise<{
  ok: boolean;
  channels: CommunityChannel[];
  error?: CommunityErrorCode;
}> {
  const res = await apiClient.get<CommunityChannel[]>('/api/community/channels');
  if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
    return { ok: true, channels: res.data };
  }
  return { ok: false, channels: DEFAULT_CHANNELS, error: errorCode(res.status, res.error) };
}

/**
 * Messages of a channel in chronological order (oldest first).
 * `beforeId` loads the page older than that message id. `hasMore` = the page was full.
 */
export async function fetchChannelMessages(
  channelId: string,
  opts: { beforeId?: string | number; limit?: number } = {}
): Promise<{ ok: boolean; messages: CommunityMessage[]; hasMore: boolean; error?: CommunityErrorCode }> {
  const limit = opts.limit ?? PAGE_SIZE;
  const q = new URLSearchParams({ limit: String(limit) });
  if (opts.beforeId !== undefined && opts.beforeId !== null && String(opts.beforeId) !== '') {
    q.set('before_id', String(opts.beforeId));
  }
  const res = await apiClient.get<CommunityMessage[]>(
    `/api/community/channels/${encodeURIComponent(channelId)}/messages?${q.toString()}`
  );
  if (res.ok && Array.isArray(res.data)) {
    const chronological = [...res.data].reverse();
    return { ok: true, messages: chronological, hasMore: res.data.length >= limit };
  }
  return { ok: false, messages: [], hasMore: false, error: errorCode(res.status, res.error) };
}

export async function postChannelMessage(
  channelId: string,
  payload: { content: string; sentiment?: 'bullish' | 'bearish' | 'neutral'; symbol_tag?: string }
): Promise<{ ok: boolean; message?: CommunityMessage; error?: CommunityErrorCode }> {
  const content = payload.content.trim();
  if (!content) return { ok: false, error: 'empty' };
  if (content.length > MESSAGE_MAX_CHARS) return { ok: false, error: 'too_long' };
  const res = await apiClient.post<CommunityMessage>(
    `/api/community/channels/${encodeURIComponent(channelId)}/messages`,
    { content, sentiment: payload.sentiment, symbol_tag: payload.symbol_tag }
  );
  if (res.ok && res.data && typeof res.data === 'object') {
    return { ok: true, message: { ...res.data, mine: true } };
  }
  return { ok: false, error: errorCode(res.status, res.error) };
}

/**
 * Client-side copy of the server link filter (db.LINK_RE) so the composer can warn before sending.
 * The server stays the source of truth.
 */
const LINK_RE =
  /(https?:\/\/|www\.|\bt\.me\/|\bwa\.me\/|\btelegram\.me\/|\bchat\.whatsapp\.com\/|\b[a-z0-9-]+\.(?:com|net|org|io|me|xyz|link|site|online|top|info|biz|co|app|ly|ru|vip|cc|tk|club|pro|gg|ws|su|shop|store|live|icu)\b)/i;

export function containsLink(text: string): boolean {
  let norm = text || '';
  try {
    norm = norm.normalize('NFKC');
  } catch {
    // old engines
  }
  norm = norm.replace(/[。．｡]/g, '.').replace(/[​-‏‪-‮⁠-⁤﻿]/g, '');
  return LINK_RE.test(norm);
}
