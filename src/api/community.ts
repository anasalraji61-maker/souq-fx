import { apiClient } from './client';

export interface CommunityChannel {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  online_count: number;
}

export interface CommunityMessage {
  id: string;
  channel_id: string;
  sender_name: string;
  badge?: 'VIP Member' | 'Pro Analyst' | 'Community' | 'AI Sentinel';
  avatar_bg?: string;
  content: string;
  created_at: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  symbol_tag?: string;
  likes: number;
  is_flagged?: boolean;
}

export const DEFAULT_CHANNELS: CommunityChannel[] = [
  {
    id: 'forex',
    name: 'Forex Majors',
    name_ar: 'غرفة العملات والفوركس',
    description: 'تحليلات أزواج العملات الرئيسية وتذبذب الجلسات اللندنية والأمريكية',
    online_count: 142,
  },
  {
    id: 'metals',
    name: 'Precious Metals',
    name_ar: 'غرفة الذهب والمعادن (XAU / XAG)',
    description: 'متابعة حركة أونصة الذهب والفضة ومناطق السيولة وملاذات الأمان',
    online_count: 218,
  },
  {
    id: 'indices',
    name: 'Global Indices',
    name_ar: 'غرفة المؤشرات العالمية والأسهم',
    description: 'متابعة داو جونز US30 وناسداك NAS100 وداكس الألماني GER40',
    online_count: 96,
  },
  {
    id: 'energy',
    name: 'Energy & Oil',
    name_ar: 'غرفة الطاقة والنفط (USOIL)',
    description: 'مناقشات خام تكساس والنفط والغاز وإعلانات المخزونات الأسبوعية',
    online_count: 73,
  },
];

const INITIAL_MESSAGES_FALLBACK: CommunityMessage[] = [
  {
    id: 'msg-seed-1',
    channel_id: 'forex',
    sender_name: 'طارق الزهراني',
    badge: 'Pro Analyst',
    avatar_bg: 'bg-emerald-600',
    content: 'زوج EURUSD يحترم منطقة الدعم 1.0845 مع تشبع بيعي على مؤشر RSI فريم 15 دقيقة. @أحمد_الشمري ما رأيك في كسر القمة السابقة؟',
    created_at: 'منذ 4 دقائق',
    sentiment: 'bullish',
    symbol_tag: 'EURUSD',
    likes: 14,
    is_flagged: false,
  },
  {
    id: 'msg-seed-2',
    channel_id: 'forex',
    sender_name: 'MATRIX AI Sentinel',
    badge: 'AI Sentinel',
    avatar_bg: 'bg-cyan-600',
    content: 'تنبيه نظامي: رصد تذبذب سعري مرتفع قبل افتتاح الجلسة الأمريكية. يرجى مراعاة حجم العقود وعدم الإفراط في الرافعة المالية.',
    created_at: 'منذ 8 دقائق',
    sentiment: 'neutral',
    symbol_tag: 'DXY',
    likes: 29,
    is_flagged: false,
  },
  {
    id: 'msg-seed-3',
    channel_id: 'forex',
    sender_name: 'مجهول_تجريبي',
    badge: 'Community',
    avatar_bg: 'bg-slate-600',
    content: 'رسالة تحت فحص الإشراف الآلي للاشتباه في ترويج روابط خارجية.',
    created_at: 'منذ 10 دقائق',
    sentiment: 'neutral',
    likes: 0,
    is_flagged: true,
  },
  {
    id: 'msg-seed-4',
    channel_id: 'metals',
    sender_name: 'خالد المنصوري',
    badge: 'VIP Member',
    avatar_bg: 'bg-amber-600',
    content: 'الذهب XAUUSD اخترق مقاومة 2745 بثبات، والهدف التالي حسب مستويات فيبوناتشي عند 2760. @الجميع راقبوا شمعة الإغلاق!',
    created_at: 'منذ 12 دقيقة',
    sentiment: 'bullish',
    symbol_tag: 'XAUUSD',
    likes: 22,
    is_flagged: false,
  },
  {
    id: 'msg-seed-5',
    channel_id: 'indices',
    sender_name: 'سعد العتيبي',
    badge: 'Community',
    avatar_bg: 'bg-blue-600',
    content: 'مؤشر داو جونز US30 يتماسك فوق 42,000 نقطة، في انتظار افتتاح وول ستريت لتأكيد استمرار الزخم الصاعد.',
    created_at: 'منذ 18 دقيقة',
    sentiment: 'neutral',
    symbol_tag: 'US30',
    likes: 8,
    is_flagged: false,
  },
  {
    id: 'msg-seed-6',
    channel_id: 'energy',
    sender_name: 'فهد الدوسري',
    badge: 'Pro Analyst',
    avatar_bg: 'bg-rose-600',
    content: 'خام تكساس USOIL يلامس دعم 70.20 دولار للبرميل، ترقب بيانات معهد البترول اليوم.',
    created_at: 'منذ 25 دقيقة',
    sentiment: 'bullish',
    symbol_tag: 'USOIL',
    likes: 11,
    is_flagged: false,
  },
];

const STORAGE_MESSAGES_KEY = 'matrix_community_messages_cache';

function getStoredMessages(): CommunityMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_MESSAGES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_MESSAGES_FALLBACK;
}

function saveStoredMessages(msgs: CommunityMessage[]) {
  try {
    localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(msgs));
  } catch {}
}

export async function fetchChannels(): Promise<{
  channels: CommunityChannel[];
  isOffline: boolean;
}> {
  const res = await apiClient.get<CommunityChannel[]>('/api/community/channels');
  if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
    return { channels: res.data, isOffline: false };
  }
  return { channels: DEFAULT_CHANNELS, isOffline: true };
}

export async function fetchChannelMessages(
  channelId: string
): Promise<{ messages: CommunityMessage[]; isOffline: boolean }> {
  const res = await apiClient.get<CommunityMessage[]>(
    `/api/community/channels/${channelId}/messages`
  );

  if (res.ok && Array.isArray(res.data)) {
    return { messages: res.data, isOffline: false };
  }

  // Fallback to local storage
  const allStored = getStoredMessages();
  const channelMsgs = allStored.filter((m) => m.channel_id === channelId);
  return {
    messages: channelMsgs.length > 0 ? channelMsgs : INITIAL_MESSAGES_FALLBACK.filter((m) => m.channel_id === channelId),
    isOffline: true,
  };
}

export async function postChannelMessage(
  channelId: string,
  payload: {
    content: string;
    sentiment?: 'bullish' | 'bearish' | 'neutral';
    symbol_tag?: string;
    sender_name?: string;
  }
): Promise<{
  ok: boolean;
  message?: CommunityMessage;
  status: number;
  error?: string;
}> {
  const res = await apiClient.post<CommunityMessage>(
    `/api/community/channels/${channelId}/messages`,
    payload
  );

  if (res.status === 429) {
    return {
      ok: false,
      status: 429,
      error: 'تمهّل قليلاً (Rate Limit: 429)',
    };
  }

  if (res.ok && res.data) {
    return { ok: true, message: res.data, status: 200 };
  }

  // If offline fallback: save locally
  const newMsg: CommunityMessage = {
    id: `local-msg-${Date.now()}`,
    channel_id: channelId,
    sender_name: payload.sender_name || 'أنت (متداول نشط)',
    badge: 'VIP Member',
    avatar_bg: 'bg-teal-600',
    content: payload.content,
    created_at: 'الآن',
    sentiment: payload.sentiment || 'neutral',
    symbol_tag: payload.symbol_tag,
    likes: 0,
    is_flagged: false,
  };

  const stored = getStoredMessages();
  const updated = [...stored, newMsg];
  saveStoredMessages(updated);

  return {
    ok: true,
    message: newMsg,
    status: 200,
  };
}
