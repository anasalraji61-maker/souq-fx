import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, radii, spacing, buttons, numeric } from '../theme';
import { api } from '../api';
import { playSoftClick } from '../audio/playSoftClick';
import { TimeframeBar } from '../components/TimeframeBar';
import { isTimeframe, TF_SECONDS, type Timeframe } from '../timeframes';
import { formatLocalStamp } from '../localStamp';
import { BacktestPanel } from '../components/BacktestPanel';
import { IndicatorAlertsPanel } from '../components/IndicatorAlertsPanel';
import { CalendarPanel } from '../components/CalendarPanel';
import { LayoutPanel } from '../components/LayoutPanel';
import { WeeklyReportPanel } from '../components/WeeklyReportPanel';
import { TradeJournalPanel } from '../components/TradeJournalPanel';
import { AiPanel } from '../components/AiPanel';
import { AnalystsPanel } from '../components/AnalystsPanel';
import { SocialConsensusPanel } from '../components/SocialConsensusPanel';
import { IndicatorForecastPanel } from '../components/IndicatorForecastPanel';
import { AlertsPanel } from '../components/AlertsPanel';
import { PositionSizePanel } from '../components/PositionSizePanel';
import { NewsPanel } from '../components/NewsPanel';
import { SHOW_NEWS_FEED, SHOW_UNLICENSED_SIGNAL_PANELS } from '../featureFlags';
import { GroupChatPanel } from '../components/GroupChatPanel';
import { VotePanel } from '../components/VotePanel';
import { FrameSizedGrid } from '../components/FrameSizedGrid';
import { DEFAULT_LAYOUT } from '../chart/layoutStore';
import { formatPrice } from '../chart/math';
import { formatPct, isVerifiedTickKind, pctDirection } from '../chart/dailyChange';
import { useMultiLiveTicks } from '../hooks/useMultiLiveTicks';
import { isFreshTick, serverNowSec } from '../chart/dataSource';
import { ensureWatchlistLoaded, subscribeWatchlist } from '../chart/watchlistStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../i18n/I18nContext';
import type { Dict } from '../i18n/locales';

/** كل فلتر يحمل تلميحاً عربياً مختصراً (hint) — فجوة موثَّقة بتدقيق أنس المباشر: مصطلحات
 * "RSI oversold/overbought"/"MACD up" بلا أي شرح بالعربية لمتداول لا يعرف هذه المؤشرات أصلاً. */
function buildFilters(t: Dict): { id: string; label: string; hint: string }[] {
  return [
    { id: 'ma_cross_up', label: t.filterMaUpLabel, hint: t.filterMaUpHint },
    { id: 'ma_cross_down', label: t.filterMaDownLabel, hint: t.filterMaDownHint },
    { id: 'rsi_oversold', label: t.filterRsiOversoldLabel, hint: t.filterRsiOversoldHint },
    { id: 'rsi_overbought', label: t.filterRsiOverboughtLabel, hint: t.filterRsiOverboughtHint },
    { id: 'macd_cross_up', label: t.filterMacdUpLabel, hint: t.filterMacdUpHint },
    { id: 'bullish', label: t.filterBullishLabel, hint: t.filterBullishHint },
    { id: 'bearish', label: t.filterBearishLabel, hint: t.filterBearishHint },
  ];
}

type Hit = {
  symbol: string;
  last: number;
  change_pct: number;
  rsi: number;
  filters_matched: string[];
  /** ثوانٍ UTC: إغلاق آخر شمعة بُنيت عليها النتيجة (backend-r17)؛ غائب = خادم أقدم أو نتيجة مخزَّنة قبله */
  price_as_of?: number | null;
};

type TabId =
  | 'hub'
  | 'reports'
  | 'journal'
  | 'risk'
  | 'screener'
  | 'backtest'
  | 'alerts'
  | 'indAlerts'
  | 'calendar'
  | 'layouts'
  | 'ai';

/** نفس رموز التبويبات المعتمدة أصلاً بـMatrixBottomDock.tsx (نسخة اللابتوب) —
 * توحيد بصري بين نسخة الهاتف ونسخة اللابتوب بدل تبويبات نصّ فقط بلا أيقونة. */
function buildTabs(t: Dict): { id: TabId; label: string; mark: string }[] {
  return [
    { id: 'hub', label: t.toolsTabHub, mark: '✦' },
    { id: 'reports', label: t.toolsTabReports, mark: '≡' },
    // «₴» رمز الهريفنيا الأوكرانية لا دفتر — ولا علاقة له بالصفقات؛ «▤» صفحةٌ مسطّرة (طلب الإطلاق launch4).
    // الـDock والشريط الجانبي (`MatrixBottomDock`/`MatrixEdgeRails`) يحتاجان الرمز نفسه — ليسا بنطاق الأدوات.
    { id: 'journal', label: t.toolsTabJournal, mark: '▤' },
    { id: 'risk', label: t.toolsTabRisk, mark: '%' },
    { id: 'screener', label: t.toolsTabScreener, mark: '⌕' },
    { id: 'backtest', label: t.toolsTabBacktest, mark: '↺' },
    // «تنبيهات السعر» تستعمل عنوان اللوحة نفسه (`alertsTitle`) — لا مفتاح نصّ جديد، والاسم هو ما
    // تسمّيه به اللوحة بكل اللغات. وموضعها **ملاصق** لـ«تنبيهات+»: التبويبان أخوان، ووجود الأول
    // هو ما يجعل «+» بالثاني مفهوماً أصلاً؛ متفرّقين يقرأ المتداول اسمين متشابهين بلا رابط.
    { id: 'alerts', label: t.alertsTitle, mark: '◎' },
    { id: 'indAlerts', label: t.toolsTabIndAlerts, mark: '⚐' },
    { id: 'calendar', label: t.toolsTabCalendar, mark: '◷' },
    { id: 'layouts', label: t.toolsTabLayouts, mark: '▦' },
    { id: 'ai', label: t.toolsTabAi, mark: '✧' },
  ];
}

/** قسما لوحة "إشارات ومجتمع" — تقسيم القسم الواحد (8 لوحات بشبكة سحب واحدة) إلى
 * قسمين قابلَين للتبديل بدل الاعتماد على "الصف الأول/الأسفل" (لا معنى لهما فعلياً
 * لأن ترتيب اللوحات متغيّر بيد المتداول نفسه بالسحب) — يطابق التقسيم الذي كان موصوفاً
 * أصلاً بنص العنوان الفرعي وتلميح الشبكة (مجتمع/أخبار مقابل تحليل/تنبيهات)، فقرار
 * تصميمي مستقر لا تخمين جديد. راجع docs/ROADMAP.md بند (ب.5). */
type HubSection = 'community' | 'analysis';

function buildHubSections(t: Dict): { id: HubSection; label: string; mark: string }[] {
  return [
    // قرار أنس ٦: بلا الأخبار النصية يصير القسم «مجتمع» فقط — «مجتمع وأخبار» يَعِد بلوحة غير موجودة.
    { id: 'community', label: SHOW_NEWS_FEED ? t.toolsHubCommunity : t.dockCommunityTab, mark: '◆' },
    { id: 'analysis', label: t.toolsHubAnalysis, mark: '◈' },
  ];
}

/** التبويبات التي يقود فيها الرمز المحتوى فعلاً — شريط الرموز يظهر فوقها وحدها (لا بالتخطيطات/
 * التقارير/الماسح، فالرمز لا يعني شيئاً هناك).
 *
 * **`alerts` كان ناقصاً**: تبويب تنبيهات السعر أُضيف بعد كتابة هذه القائمة ولم يُضَف إليها، فكان
 * يُمرَّر `defaultSymbol={signalSym}` من شريطٍ **مخفيّ بذلك التبويب وحده** — يُملأ نموذج الإنشاء
 * برمزٍ لا يراه المتداول ولا يملك تغييره إلا بالكتابة بلوحة المفاتيح، بينما جاره «تنبيهات المؤشرات»
 * يعرض الشريط. و«أقلّ نقرات لإنشاء تنبيه» أول ما يُطلب من لوح تنبيهات السعر بالذات. */
const SYMBOL_TABS: readonly TabId[] = [
  'hub',
  'journal',
  'risk',
  'backtest',
  'alerts',
  'indAlerts',
  'calendar',
  // المساعد يُسأل عن رمزٍ (`AiPanel symbol`) — بلا الشريط كان يُسأل عن EURUSD دائماً والمتداول على الذهب
  'ai',
];
/** احتياط حين تتعذّر قراءة قائمة المتابعة (تخزين معطَّل/أول تشغيل) — أشهر ما يتابعه متداول فردي */
// لا «DXY»: المزوّد لا يقدّمه (قرار أنس ٢) ⇒ شريحةٌ تفتح الحاسبة/الدفتر على رمز بلا سعر.
const FALLBACK_SYMBOLS = ['EURUSD', 'GBPUSD', 'XAUUSD', 'USDJPY'];
/** آخر رمز اختاره المتداول بشاشة الأدوات — يبقى بين الجلسات كبقية تفضيلات الشاشة */
const TOOLS_SYMBOL_KEY = 'matrix.tools.symbol.v1';
/**
 * آخر تبويب فتحه المتداول بشاشة الأدوات.
 *
 * الشاشة كانت تفتح على «الهب» كل مرّة مهما كان التبويب الذي يعيش فيه صاحبها: من يفتح «الأدوات»
 * ليحسب حجم مركز، أو ليضع تنبيهاً قبل خبر، يدفع نقرتين **زائدتين** بكل مرّة (شريط أفقي بأحد عشر
 * تبويباً — فالوجهة قد تكون خارج الشاشة فيسبقها تمرير). والرمز المختار يبقى بين الجلسات بهذه
 * الشاشة نفسها (`TOOLS_SYMBOL_KEY`)، والفلاتر تبقى بالتقويم، وفريمات الإطارات تبقى: التبويب كان
 * التفضيل الوحيد الذي يُنسى.
 */
const TOOLS_TAB_KEY = 'matrix.tools.tab.v1';
/** الخانة الرابعة (الشارت الرئيسي) بالترمينال — نفس `DXY_SYMBOL_KEY`/`DXY_TF_KEY` في `TerminalScreen.tsx`. */
const HERO_SYMBOL_KEY = 'matrix.home.dxySymbol.v1';
/** نسخة مطابقة لـ`DEFAULT_HERO_SYMBOL` في `TerminalScreen.tsx` (كان «DXY» — لا يقدّمه المزوّد، قرار ٢). */
const DEFAULT_HERO_SYMBOL = 'USDJPY';
const HERO_TF_KEY = 'matrix.home.dxyTf.v1';
/**
 * التبويبات المعروفة — `Record<TabId, true>` عمداً لا مصفوفة: إضافة تبويب لـ`TabId` **تكسر البناء**
 * حتى يُذكر هنا، فلا يُستعاد يوماً معرّفٌ حُذف ولا يُنسى معرّفٌ أُضيف (قيمة محفوظة لا تطابق أياً من
 * هذه تُهمَل ويبقى الافتراضي — تخزينٌ قديم أو تالف لا يفتح شاشةً بلا محتوى).
 */
const TAB_IDS: Record<TabId, true> = {
  hub: true,
  reports: true,
  journal: true,
  risk: true,
  screener: true,
  backtest: true,
  alerts: true,
  indAlerts: true,
  calendar: true,
  layouts: true,
  ai: true,
};
const isTabId = (v: unknown): v is TabId =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(TAB_IDS, v);
const MAX_SYMBOL_CHIPS = 8;

/**
 * التبويبات التي يعني فيها **سعر السوق الآن** شيئاً — عليها وحدها يُفتح مقبس التيكات.
 * فتحُه بكل التبويبات يعني مقبساً ثانياً (لشاشة الشارت واحدٌ دائماً) لمن يجلس على الماسح أو
 * التخطيطات، بلا أن يقرأ أحدٌ رقماً منه.
 */
const TICK_TABS: readonly TabId[] = ['journal', 'alerts'];

/**
 * إيقاع إعادة تقييم حداثة التيكات (`isFreshTick`، نافذتها `FRESH_TICK_SEC` = 15 ثانية). خمس ثوانٍ:
 * تُسقط السعر البائت خلال عشرين ثانية من آخر تيك بدل أن يبقى معروضاً إلى الأبد، وهي أبطأ كثيراً من
 * تردّد التيكات بسوق مفتوح فلا تضيف تصييراً هناك. حسابٌ محلّي صِرف — لا طلب ولا مقبس.
 */
const FRESH_RECHECK_MS = 5000;

/**
 * القائمة المُمرَّرة لخطّاف التيكات **ثابتة عمداً**: `/ws/ticks` يبثّ ما اشترك به الخادم كلّه
 * ويتجاهل أي قائمة من العميل (`backend/main.py` — لا رسالة اشتراك أصلاً)، بينما `syms` تابعٌ
 * لأثر الخطّاف. فتمريرُ شرائح الرموز كان سيقطع المقبس ويعيد وصله **مع كل نقرة رمز** بلا أن
 * يتغيّر حرفٌ ممّا يصل. الدفتر يقرأ ما يصل ويطابقه برمز الصفقة، لا برمز الشاشة.
 */
const TICK_WS_SYMBOLS = FALLBACK_SYMBOLS;

const HUB_COMMUNITY_ORDER = ['news', 'social', 'chat', 'votes'] as const;
const HUB_ANALYSIS_ORDER = ['ai', 'analysts', 'forecast', 'alerts'] as const;

/**
 * قرارا أنس ٥ و٦ (`featureFlags.ts`، الراية نفسها التي يقرؤها الرصيف والشريط الجانبي): لوحات بلا مصدر
 * مرخَّص لا تُركَّب بنسخة المتجر — لا يُخفى إطارها فقط، فلا طلب شبكة منها أصلاً. `FrameSizedGrid`
 * يُسقط من الترتيب المحفوظ كل معرّف غائب عن `items` ⇒ ترتيب قديم يضمّ «news» لا يترك خانة فارغة.
 */
function hubPanelVisible(id: string): boolean {
  if (id === 'news') return SHOW_NEWS_FEED;
  if (id === 'social' || id === 'analysts') return SHOW_UNLICENSED_SIGNAL_PANELS;
  return true;
}


/**
 * `insufficient_data` من `/api/screener/run` (backend-r69) — خادم أقدم لا يرسله، والنوع لا يضمن الشكل وقت التشغيل. يُقبل كائن رمز → قائمة نصوص فقط؛ غير ذلك يُهمل فيبقى السلوك القديم.
 */
/** مفتاح «أيّ فحص هذا»: الفريم والفلاتر **كمجموعة** — الخادم يطابق كل فلتر على حدة، فترتيب النقر لا يغيّر الرموز المطابقة */
function screenerKey(tf: string, filters: readonly string[]): string {
  return `${tf}|${[...filters].sort().join(',')}`;
}

function readInsufficient(raw: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [sym, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(v)) continue;
    const ids = v.filter((f): f is string => typeof f === 'string');
    if (ids.length) out[sym.toUpperCase()] = ids;
  }
  return out;
}
export function ToolsScreen() {
  const { t, rtl, lang } = useI18n();
  const navigation = useNavigation();
  const align = rtl ? ('right' as const) : ('left' as const);
  const FILTERS = buildFilters(t);
  const TABS = buildTabs(t);
  const HUB_SECTIONS = buildHubSections(t);
  const [tab, setTab] = useState<TabId>('hub');
  const [hubSection, setHubSection] = useState<HubSection>('community');
  const [tf, setTf] = useState<Timeframe>('15m');
  const [signalSym, setSignalSym] = useState('EURUSD');
  /** قائمة متابعة المتداول نفسها — الشرائح كانت أربعة رموز ثابتة، فمتابع XAGUSD/USDJPY لم يكن
   * يجد زوجه بشاشة الأدوات إطلاقاً. null = لم تُقرأ بعد. */
  const [watchSymbols, setWatchSymbols] = useState<string[] | null>(null);
  /** استُعيد الرمز المحفوظ؟ قبلها لا نكتب فوقه (الكتابة الأولى كانت ستحفظ EURUSD الافتراضي) */
  const [symbolRestored, setSymbolRestored] = useState(false);
  const [selected, setSelected] = useState<string[]>(['ma_cross_up']);
  const [results, setResults] = useState<Hit[]>([]);
  const [providerConfigured, setProviderConfigured] = useState<boolean | null>(null);
  const [scanDone, setScanDone] = useState(false);
  /** كم رمزاً قُرئ فعلاً وأيّها تعذّر — بدونها «لا نتائج» بعد حدّ طلبات المزوّد تُقرأ «لا تطابق». */
  const [scanInfo, setScanInfo] = useState<{
    scanned?: number;
    failed: string[];
    total?: number;
    tf: string;
    /** backend-r69: رمز → فلاتر لم تكفِ شموعه لتقييمها. رمز كل فلاتره هنا يقع أيضاً في `failed`. */
    short?: Record<string, string[]>;
  }>({
    failed: [],
    tf: '15m',
  });
  const [loading, setLoading] = useState(false);
  const [frameTfs, setFrameTfs] = useState<string[]>([...DEFAULT_LAYOUT.frameTfs]);
  const [frameSymbols, setFrameSymbols] = useState<[string, string, string]>(
    DEFAULT_LAYOUT.frameSymbols
  );
  /** chart-r49: الخانة الرابعة (الشارت الرئيسي بالترمينال، مفتاحا `DXY_SYMBOL_KEY`/`DXY_TF_KEY` هناك) — كان التخطيط يحفظ
   * الثلاث فقط فتطبيق «A» لا يعيد XAUUSD 4H بالرابعة. */
  const [heroSymbol, setHeroSymbol] = useState(DEFAULT_HERO_SYMBOL);
  const [heroTf, setHeroTf] = useState('15m');

  useEffect(() => {
    let alive = true;
    const unsub = subscribeWatchlist((symbols) => {
      if (alive) setWatchSymbols(symbols);
    });
    ensureWatchlistLoaded().catch(() => {
      /* تعذّر التخزين — تبقى قائمة الاحتياط */
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  // الرمز المختار يبقى بين الجلسات: فتح «الأدوات» كان يعود لـEURUSD مهما كان زوج المتداول.
  // `symbolTouchedRef` كحارس التبويب أدناه: شريحة نُقرت قبل عودة القراءة (بدء بارد على أندرويد) كان المحفوظ
  // (XAUUSD) يدهسها ثم يُحفظ فوقها ⇒ نقر GBPUSD وأرقام التبويبات لـXAUUSD
  const symbolTouchedRef = useRef(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(TOOLS_SYMBOL_KEY);
        if (alive && !symbolTouchedRef.current && raw && /^[A-Z0-9._-]{3,15}$/.test(raw)) setSignalSym(raw);
      } catch {
        /* ignore */
      } finally {
        if (alive) setSymbolRestored(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!symbolRestored) return;
    AsyncStorage.setItem(TOOLS_SYMBOL_KEY, signalSym).catch(() => {
      /* ignore */
    });
  }, [signalSym, symbolRestored]);

  /**
   * التبويب المفتوح يبقى بين الجلسات — نفس نمط الرمز أعلاه حرفياً.
   *
   * `tabTouchedRef` يحرس السباق الوحيد هنا: القراءة من التخزين غير متزامنة، ومن نقر تبويباً قبل
   * أن تعود كان المحفوظُ **سيدهس نقرته تحت إصبعه**. وموضع التغيير واحد لا غير (شريط التبويبات)
   * فالحارس يُرفع من مكان واحد.
   */
  const [tabRestored, setTabRestored] = useState(false);
  const tabTouchedRef = useRef(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(TOOLS_TAB_KEY);
        if (alive && !tabTouchedRef.current && isTabId(raw)) setTab(raw);
      } catch {
        /* تخزين معطَّل/تالف — يبقى الافتراضي كما كان */
      } finally {
        if (alive) setTabRestored(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    // لا يُكتب قبل أن تُقرأ القيمة المحفوظة: وإلا كتب «الهب» الافتراضي فوق تبويب المتداول
    // بمجرّد فتح الشاشة، فلا يُستعاد شيء أبداً.
    if (!tabRestored) return;
    AsyncStorage.setItem(TOOLS_TAB_KEY, tab).catch(() => {
      /* ignore */
    });
  }, [tab, tabRestored]);

  /** أزواج الشارت المفتوح (الإطارات الثلاثة، بلا تكرار) — المتداول قادم لتوّه من زوج يراه أمامه،
   * فغيابه عن الشريط يعني فتح المتابعة وإضافته لمجرّد حساب لوت أو قراءة خبر. تُضاف الأزواج فقط ولا
   * تغلب اختياره المحفوظ: الرمز المفعَّل يبقى كما تركه. */
  const chartSymbols = useMemo(
    () =>
      Array.from(new Set(frameSymbols)).filter((s) => /^[A-Z0-9._-]{3,15}$/.test(s)),
    [frameSymbols]
  );

  /** الرموز المعروضة: قائمة المتابعة (أول 8) ومعها الرمز المختار وأزواج الشارت دوماً — وإلا اختفت
   * الشريحة المفعَّلة حين يُحذف الزوج من المتابعة وبقي المحتوى تحته بلا ما يدلّ عليه. الإضافات
   * تتصدّر كي لا يقتصّها الحدّ، وترتيب المتابعة يبقى كما هو (شريحة لا تقفز مكانها عند كل نقرة). */
  const symbolChoices = useMemo(() => {
    const base = watchSymbols && watchSymbols.length > 0 ? watchSymbols : FALLBACK_SYMBOLS;
    const list = base.slice(0, MAX_SYMBOL_CHIPS);
    const extras = [signalSym, ...chartSymbols].filter(
      (s, i, arr) => !list.includes(s) && arr.indexOf(s) === i
    );
    return extras.length > 0 ? [...extras, ...list].slice(0, MAX_SYMBOL_CHIPS) : list;
  }, [watchSymbols, signalSym, chartSymbols]);

  /**
   * تركيز الشاشة — لا يكفي التبويب وحده. شاشات التبويبات السفلية **تبقى مُركَّبة** بعد الانتقال
   * عنها، فمن فتح «الدفتر» ثم عاد للشارت كان سيبقي مقبساً ثانياً مفتوحاً طول الجلسة. القيمة
   * الابتدائية `true`: الشاشة تُركَّب وهي المعروضة، وحدث `focus` قد يكون مضى قبل تسجيل المستمع.
   */
  const [screenFocused, setScreenFocused] = useState(true);
  useEffect(() => {
    const nav = navigation as unknown as {
      addListener: (e: 'focus' | 'blur', cb: () => void) => () => void;
      isFocused?: () => boolean;
    };
    if (typeof nav.isFocused === 'function') setScreenFocused(nav.isFocused());
    const offFocus = nav.addListener('focus', () => setScreenFocused(true));
    const offBlur = nav.addListener('blur', () => setScreenFocused(false));
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);

  /** المقبس يعمل الآن؟ — نفس شرط الخطّاف، مرفوعاً إلى متغيّر كي يحكم ترشيح الأسعار أدناه أيضاً. */
  const ticksLive = screenFocused && TICK_TABS.includes(tab);

  /**
   * **تيكات حيّة بشاشة الأدوات.** الدفتر كان يعرض «أين هي الصفقة المفتوحة الآن» من **لقطة**
   * تُجلب مع كل تحميل (`/api/market/quote` غير مخزَّن بالخادم، فاستطلاعه بمؤقّت كلفةٌ تُقاس عند
   * المزوّد). والتيكات الواصلة بالمقبس **مجّانية تماماً**: بثٌّ واحد للشاشة كلها، قراءةُ ما
   * اشترك به الخادم أصلاً، بلا طلب لكل رمز ولا حدٍّ يُستهلك — وهي التي جعلت مسافة التنبيه
   * بقائمة المتابعة ممكنة بشاشة الشارت. فالسطر العائم يتحرّك مع السوق بدل أن يتجمّد لقطةً.
   */
  const liveTicks = useMultiLiveTicks(TICK_WS_SYMBOLS, ticksLive);
  /**
   * **نبضة إعادة تقييم الحداثة.** `isFreshTick` نافذتها **خمس عشرة ثانية**، لكنها كانت تُقيَّم
   * داخل `useMemo` تابعٍ لـ`liveTicks` وحدها — أي **عند وصول تيك جديد لا غير**. فما إن يتوقّف
   * البثّ (إغلاق السوق ليلة الجمعة، انقطاع المزوّد) حتى تتجمّد آخر قيمة محسوبة وتبقى معروضةً
   * بقيّة الجلسة: الحارس الذي وُضع ليمنع السعر البائت **يكفّ عن العمل بالضبط حين يبيت السعر**.
   *
   * النبضة تُعيد التقييم كل خمس ثوانٍ، و**لا تعمل إلا حيث المقبس عامل** (نفس انضباط `active`
   * المتّبع بهذه الشاشة). وتتوقّف عن إحداث تصيير متى فرغت الأسعار فعلاً: المُحدِّث يُرجع القيمة
   * نفسها فيتخطّى React التصيير — فالسوق المغلق لا يترك خلفه نبضاً يعمل بلا أثر. وبالسوق المفتوح
   * لا تضيف شيئاً أصلاً: التيكات تصل أسرع منها فالـmemo يُعاد بها لا بهذه.
   */
  const [freshBeat, setFreshBeat] = useState(0);

  /**
   * الأسعار الصالحة لأن يُبنى عليها رقمٌ يُقرأ كقرار — **شرطان، وكلاهما موجود لسبب**:
   * (أ) `isVerifiedTickKind` (provider/cache): حين يتعذّر المزوّد يبثّ `/ws/ticks` سلسلة **عشوائية** حول أسعار
   * بذرية (`ws_seed`) — نتيجةٌ عائمة منها رقمٌ مختلَق تماماً، وهو الشرط نفسه الذي يفرضه
   * `isRealQuote` على اقتباس REST بالدفتر. و`unknown` (خادمٌ أقدم بلا مصدر) قد يكون ذلك البثّ نفسه (ui4). (ب) `isFreshTick`: سعرٌ مجمَّد (عطلة/انقطاع مزوّد)
   * ليس «أين هي الآن»؛ عند سقوطه يعود الدفتر للقطة REST كما كان تماماً — أي أن هذا البند
   * **يضيف الحركة ولا يسحب شيئاً**.
   */
  const livePricesRef = useRef<Record<string, number>>({});
  const livePrices = useMemo(() => {
    const out: Record<string, number> = {};
    // المقبس متوقّف ⇒ لا «سعرٌ الآن». الخطّاف **لا يمسح حالته** عند التعطيل (أثره لا يعمل وحسب)،
    // فكانت آخر أسعارٍ وصلت قبل مغادرة الشاشة تبقى بيد اللوحات بقيّة الجلسة — يعود المتداول بعد
    // ساعة فيقرأ مسافة تنبيهه ونتيجة صفقته المفتوحة من سعر عمره ساعة. بالفراغ ترجع كلٌّ منهما
    // إلى لقطة REST الخاصّة بها (تُعاد بالعودة فوراً) كما كانتا قبل وصول التيكات أصلاً.
    if (ticksLive) {
      for (const [sym, tick] of Object.entries(liveTicks)) {
        if (!isVerifiedTickKind(tick.source.kind)) continue;
        if (!isFreshTick(tick.source.as_of)) continue;
        if (typeof tick.price === 'number' && Number.isFinite(tick.price) && tick.price > 0) {
          out[sym.toUpperCase()] = tick.price;
        }
      }
    }
    // ثباتُ الهوية: نبضةٌ لم تُسقط شيئاً يجب ألّا تُنتج مرجعاً جديداً، وإلا أُعيد تصيير كل لوحة
    // تستقبل `ticks` كل خمس ثوانٍ بلا أن يتغيّر رقم واحد.
    const prev = livePricesRef.current;
    const pk = Object.keys(prev);
    const ok = Object.keys(out);
    if (pk.length === ok.length && ok.every((k) => prev[k] === out[k])) return prev;
    livePricesRef.current = out;
    return out;
    // `freshBeat` تبعيةٌ **مقصودة بلا استعمال بالجسم**: هي وحدها ما يُعيد تقييم `isFreshTick`
    // حين يتوقّف البثّ (لا تيك جديد ⇒ لا تغيّر بـ`liveTicks`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveTicks, ticksLive, freshBeat]);

  /** النبضة نفسها — انظر `freshBeat` أعلاه. */
  useEffect(() => {
    if (!ticksLive) return;
    const id = setInterval(() => {
      // لا تصيير بلا سبب: بلا أسعار معروضة لا شيء يمكن أن يسقط، وإرجاع القيمة نفسها يوقف التحديث.
      setFreshBeat((v) => (Object.keys(livePricesRef.current).length > 0 ? v + 1 : v));
    }, FRESH_RECHECK_MS);
    return () => clearInterval(id);
  }, [ticksLive]);

  // يُعاد القراءة عند كل عودة للتبويب: كانت تُقرأ مرة عند التركيب فقط، فتغيير أزواج/فريمات الشارت بالشاشة
  // الرئيسية ثم «حفظ التخطيط الحالي» هنا يحفظ إعداداً قديماً، و«الحالي» يُعلَّم على تخطيط غير المطبَّق.
  React.useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem('matrix.frameTimeframes.v1');
        if (raw) {
          const p = JSON.parse(raw) as string[];
          if (Array.isArray(p) && p.length === 3) setFrameTfs(p);
        }
        const sym = await AsyncStorage.getItem('matrix.frameSymbols.v1');
        if (sym) {
          const p = JSON.parse(sym) as string[];
          if (Array.isArray(p) && p.length === 3) setFrameSymbols([p[0], p[1], p[2]]);
        }
        const heroSym = await AsyncStorage.getItem(HERO_SYMBOL_KEY);
        if (heroSym && heroSym.trim()) setHeroSymbol(heroSym.trim().toUpperCase());
        const heroTfRaw = await AsyncStorage.getItem(HERO_TF_KEY);
        if (heroTfRaw && isTimeframe(heroTfRaw)) setHeroTf(heroTfRaw);
      } catch {
        /* ignore */
      }
    };
    load();
    const unsub = (
      navigation as unknown as { addListener: (e: 'focus', cb: () => void) => () => void }
    ).addListener('focus', load);
    return unsub;
  }, [navigation]);

  /**
   * launch167a: رمزٌ لم تكفِ شموعه لأيّ فلتر يقع في `failed` أيضاً — كان يُسمّى «حدّ طلبات المزوّد غالباً» وسببه قِصَر
   * التاريخ، وإعادة الفحص بعد دقيقة لا تغيّر شيئاً. `rateFailed` = ما تعذّرت قراءته فعلاً.
   */
  const shortMap = scanInfo.short ?? {};
  const rateFailed = scanInfo.failed.filter((s) => !shortMap[s]?.length);
  const shortSyms = Object.keys(shortMap).filter((s) => shortMap[s].length > 0);
  /** لا رمز قُرئ أصلاً وكلّها تعذّر جلبه (كل الطلبات فشلت) — «لا تطابق» هنا كاذبة. */
  const scanNone =
    scanInfo.scanned === 0 && scanInfo.failed.length > 0 && rateFailed.length === scanInfo.failed.length;

  /** نتائج فحص سابق لا تُعرض تحت فلاتر/فريم تغيّرت — كانت تبقى فتُقرأ كأنها نتيجة الاختيار الجديد. */
  // مرتّبة: الفلاتر تُطبَّق معاً فترتيب النقر لا يغيّر الفحص — إلغاء فلترٍ وإعادته أثناء الفحص كان يُسقط نتيجته (ويمسح المعروضة)
  const scanKey = screenerKey(tf, selected);
  const lastScanKey = React.useRef<string | null>(null);
  /** الاختيار **الحالي** لـ`run` بعد انتظار الفحص — الإغلاق يحمل اختيار لحظة النقر */
  const scanKeyNow = React.useRef(scanKey);
  scanKeyNow.current = scanKey;
  React.useEffect(() => {
    if (lastScanKey.current !== null && lastScanKey.current !== scanKey) {
      lastScanKey.current = null;
      setResults([]);
      setScanDone(false);
      setScanInfo({ failed: [], tf });
    }
  }, [scanKey, tf]);
  const filterLabel = (id: string) => FILTERS.find((f) => f.id === id)?.label ?? id;
  /** نتيجة فحص بلا طريق للشارت = نسخ الرمز يدوياً والبحث عنه — الآن نقرة تفتح شارت التركيز
   * بنفس الفريم المفحوص (TerminalScreen يقرأ openSymbol/openTf؛ nonce يسمح بفتح نفس الرمز مرتين). */
  const openOnChart = (sym: string) => {
    playSoftClick();
    (navigation as unknown as { navigate: (name: string, params: object) => void }).navigate('Home', {
      openSymbol: sym,
      openTf: scanInfo.tf,
      nonce: Date.now(),
    });
  };

  const toggleFilter = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  /** رقم آخر فحص بدأ — المؤشّر يُطفئه آخر فحص فقط (نقرتان قبل أن يُعطَّل الزرّ = فحصان متزامنان). */
  const runSeq = React.useRef(0);
  const run = useCallback(async () => {
    const seq = ++runSeq.current;
    setLoading(true);
    const key = screenerKey(tf, selected);
    /**
     * الفريم والفلاتر تبقى قابلة للتغيير أثناء «جارٍ الفحص…»: فحصٌ على 15m + «تقاطع متوسطات» يعود بعد التبديل إلى 1h
     * كان يُعرض تحت 1h، ويحفظ مفتاحه القديم فلا يمسحه شيء — والبطاقات لا تذكر الفريم. نتيجةٌ لاختيارٍ لم يعد قائماً تُسقط.
     */
    const stale = () => scanKeyNow.current !== key || runSeq.current !== seq;
    try {
      const res = await api.screenerRun({ timeframe: tf, filters: selected });
      if (stale()) return;
      setResults(res.results);
      setScanInfo({
        scanned: res.scanned,
        failed: res.failed ?? [],
        total: res.total,
        tf,
        short: readInsufficient(res.insufficient_data),
      });
      lastScanKey.current = key;
      setProviderConfigured(res.provider_configured !== false);
      setScanDone(true);
      playSoftClick();
    } catch {
      if (stale()) return;
      setResults([]);
      setScanInfo({ failed: [], tf });
      lastScanKey.current = key;
      setProviderConfigured(null);
      setScanDone(true);
    } finally {
      /** لا `!stale()`: فحص أُسقط لتغيّر الفلاتر وهو الوحيد الجاري كان سيُبقي «جارٍ الفحص…» للأبد */
      if (runSeq.current === seq) setLoading(false);
    }
  }, [tf, selected]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.head}>
        <Text style={[styles.title, { textAlign: align }]}>{t.toolsTitle}</Text>
        {/* «مجتمع وأخبار · تحليل وتنبيهات» — بلا الأخبار (قرار ٦) يَعِد بما لا يوجد؛ مفتاحا القسمين تحته يسمّيانهما أصلاً */}
        {SHOW_NEWS_FEED ? <Text style={[styles.sub, { textAlign: align }]}>{t.toolsSub}</Text> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
        <View style={[styles.tabs, rtl && styles.tabsRtl]}>
          {TABS.map((tItem) => (
            <Pressable
              accessibilityRole="button"
              key={tItem.id}
              style={({ pressed }) => [
                styles.tab,
                tab === tItem.id && styles.tabOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => {
                tabTouchedRef.current = true;
                setTab(tItem.id);
              }}
              accessibilityLabel={`${t.a11yTabPrefix}: ${tItem.label}`}
              accessibilityState={{ selected: tab === tItem.id }}
            >
              <Text style={[styles.tabMark, tab === tItem.id && styles.tabMarkOn]}>{tItem.mark}</Text>
              <Text style={[styles.tabText, tab === tItem.id && styles.tabTextOn]}>{tItem.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {SYMBOL_TABS.includes(tab) ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.symBarScroll}
          contentContainerStyle={[styles.symBar, rtl && styles.symBarRtl]}
        >
          {symbolChoices.map((s) => {
            const onChart = chartSymbols.includes(s);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: signalSym === s }}
                key={s}
                style={({ pressed }) => [
                  styles.chip,
                  signalSym === s && styles.chipOn,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => {
                  symbolTouchedRef.current = true;
                  setSignalSym(s);
                }}
                accessibilityLabel={`${t.a11ySignalSymbolPrefix}: ${s}${
                  onChart ? ` — ${t.toolsSymOnChart}` : ''
                }`}
              >
                <Text style={[styles.chipText, signalSym === s && styles.chipTextOn]}>
                  {s}
                  {onChart ? <Text style={styles.chipOnChartMark}> •</Text> : null}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {tab === 'hub' ? (
        <ScrollView
          style={styles.pageScroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.toolbar}>
            <TimeframeBar value={tf} onChange={setTf} compact />
          </View>
          <View style={[styles.hubSectionTabs, rtl && styles.hubSectionTabsRtl]}>
            {HUB_SECTIONS.map((s) => (
              <Pressable
                accessibilityRole="button"
                key={s.id}
                style={({ pressed }) => [
                  styles.hubSectionTab,
                  hubSection === s.id && styles.hubSectionTabOn,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => setHubSection(s.id)}
                accessibilityLabel={`${t.a11yHubSectionPrefix}: ${s.label}`}
                accessibilityState={{ selected: hubSection === s.id }}
              >
                <Text style={[styles.hubSectionMark, hubSection === s.id && styles.hubSectionMarkOn]}>
                  {s.mark}
                </Text>
                <Text style={[styles.hubSectionText, hubSection === s.id && styles.hubSectionTextOn]}>
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.gridHint}>{t.toolsGridHint}</Text>
          {hubSection === 'community' ? (
            <FrameSizedGrid
              key="hub-community"
              storageKey="matrix.tools.hub.community.order.v1"
              showAll
              defaultOrder={[...HUB_COMMUNITY_ORDER]}
              items={[
                { id: 'news', node: <NewsPanel embedded /> },
                {
                  id: 'social',
                  node: <SocialConsensusPanel embedded symbol={signalSym} timeframe={tf} />,
                },
                { id: 'chat', node: <GroupChatPanel embedded /> },
                { id: 'votes', node: <VotePanel embedded /> },
              ].filter((it) => hubPanelVisible(it.id))}
            />
          ) : (
            <FrameSizedGrid
              key="hub-analysis"
              storageKey="matrix.tools.hub.analysis.order.v1"
              showAll
              defaultOrder={[...HUB_ANALYSIS_ORDER]}
              items={[
                { id: 'ai', node: <AiPanel embedded symbol={signalSym} /> },
                {
                  id: 'analysts',
                  node: <AnalystsPanel embedded symbol={signalSym} timeframe={tf} />,
                },
                {
                  id: 'forecast',
                  node: <IndicatorForecastPanel embedded symbol={signalSym} timeframe={tf} />,
                },
                {
                  id: 'alerts',
                  node: <AlertsPanel embedded defaultSymbol={signalSym} active={screenFocused} />,
                },
              ].filter((it) => hubPanelVisible(it.id))}
            />
          )}
        </ScrollView>
      ) : null}

      {tab === 'reports' ? (
        <ScrollView contentContainerStyle={styles.body}>
          <WeeklyReportPanel grid />
        </ScrollView>
      ) : null}

      {/* تبويب الدفتر: اللوحة تملك الصفحة وحدها، فالصفقات تُسرَد متدفّقة وتُمرَّر الصفحةُ نفسها —
          بدل نافذة 220px معشَّشة داخل تمرير الصفحة. */}
      {tab === 'journal' ? (
        <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
          <TradeJournalPanel flow defaultSymbol={signalSym} ticks={livePrices} />
        </ScrollView>
      ) : null}

      {tab === 'risk' ? (
        <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
          <PositionSizePanel defaultSymbol={signalSym} active={screenFocused} />
        </ScrollView>
      ) : null}

      {tab === 'screener' ? (
        <ScrollView contentContainerStyle={styles.body}>
          <TimeframeBar value={tf} onChange={setTf} />
          <Text style={[styles.label, { textAlign: align }]}>{t.toolsFiltersLabel}</Text>
          <View style={[styles.filters, rtl && styles.filtersRtl]}>
            {FILTERS.map((f) => (
              <Pressable
                accessibilityRole="button"
                key={f.id}
                style={({ pressed }) => [
                  styles.chip,
                  selected.includes(f.id) && styles.chipOn,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => toggleFilter(f.id)}
                accessibilityLabel={`${t.a11yFilterPrefix}: ${f.label} — ${f.hint}`}
                accessibilityState={{ checked: selected.includes(f.id) }}
              >
                <Text style={[styles.chipText, selected.includes(f.id) && styles.chipTextOn]}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {selected.length ? (
            <View style={styles.filterHints}>
              {FILTERS.filter((f) => selected.includes(f.id)).map((f) => (
                <Text key={f.id} style={[styles.filterHintText, { textAlign: align }]}>
                  {f.label}: {f.hint}
                </Text>
              ))}
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.runBtn,
              !loading && !selected.length && styles.runBtnDisabled,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={run}
            disabled={loading || !selected.length}
            accessibilityState={{ disabled: loading || !selected.length, busy: loading }}
            accessibilityLabel={
              loading ? t.a11yBusy : !selected.length ? t.screenerRunNeedFilter : t.screenerRunBtn
            }
            hitSlop={8}
          >
            <Text style={styles.runText}>{loading ? t.screenerRunning : t.screenerRunBtn}</Text>
          </Pressable>
          {loading ? <ActivityIndicator color={colors.textMuted} /> : null}
          {!loading && scanDone && providerConfigured === false ? (
            <Text style={[styles.scanHint, { textAlign: align }]}>{t.screenerNeedApiKey}</Text>
          ) : null}
          {!loading && scanDone && providerConfigured === true && scanNone ? (
            <Text style={[styles.scanHint, { textAlign: align }]}>{t.screenerScanNone}</Text>
          ) : null}
          {!loading && scanDone && providerConfigured === true && !scanNone && rateFailed.length > 0 ? (
            <Text style={[styles.scanHint, { textAlign: align }]}>
              {t.screenerScanPartial
                .replace('{k}', String(scanInfo.scanned ?? 0))
                .replace('{total}', String(scanInfo.total ?? scanInfo.failed.length))
                .replace('{list}', rateFailed.join(rtl ? '، ' : ', '))}
            </Text>
          ) : null}
          {!loading && scanDone && providerConfigured === true && shortSyms.length > 0 ? (
            <Text style={[styles.scanHint, { textAlign: align }]}>
              {t.screenerInsufficientData.replace('{tf}', scanInfo.tf).replace(
                '{list}',
                shortSyms
                  .map((s) =>
                    /** فُحص على بقيّة الفلاتر ⇒ نسمّي الفلتر الذي لم يُقيَّم لا الرمز كلّه */
                    scanInfo.failed.includes(s) ? s : `${s} (${shortMap[s].map(filterLabel).join(' · ')})`
                  )
                  .join(rtl ? '، ' : ', ')
              )}
            </Text>
          ) : null}
          {/* «فُحص 0 رمزاً ولا أحد يحقّق» حين لم يُقيَّم شيء (كلّها شموع غير كافية) — السطران فوقه يقولان السبب */}
          {!loading &&
          scanDone &&
          providerConfigured === true &&
          !scanNone &&
          scanInfo.scanned !== 0 &&
          results.length === 0 ? (
            <Text style={[styles.scanHint, { textAlign: align }]}>
              {scanInfo.scanned != null
                ? t.screenerNoMatchOf
                    .replace('{k}', String(scanInfo.scanned))
                    .replace('{tf}', scanInfo.tf)
                : t.screenerNoResults}
            </Text>
          ) : null}
          {!loading && scanDone && providerConfigured === null ? (
            <Text style={[styles.scanHint, { textAlign: align }]}>{t.screenerFailed}</Text>
          ) : null}
          {!loading && results.length > 0 ? (
            <Text style={[styles.filterHintText, { textAlign: align }]}>{t.screenerTapToOpen}</Text>
          ) : null}
          {!loading && results.length > 8 ? (
            <Text style={[styles.filterHintText, { textAlign: align }]}>
              {t.screenerShowingOf.replace('{n}', '8').replace('{total}', String(results.length))}
            </Text>
          ) : null}
          <FrameSizedGrid
            storageKey="matrix.tools.screener.order.v1"
            showAll
            items={results.slice(0, 8).map((r) => {
              /**
               * **نسبة التغيّر كانت تُطبع خاماً، وصفرُها أخضر.** الشرط `>= 0` يُدخل الصفر بجهة
               * الصعود، **وسالبُ الصفر معه**: الخادم يقرّب بـ`round(chg, 2)` فيُخرج `-0.0` لحركةٍ
               * هابطة دقيقة، و`-0 >= 0` صحيحٌ بجافاسكربت — أي أن الهبوط كان يُكتب «+0%» بالأخضر
               * بالبطاقة التي يفتح منها المتداول الشارت. والتنسيق كان بلا منازل ثابتة («0.5%» لا
               * «0.50%») فيخالف `formatPct` المعتمد ببقيّة الشاشات. نفس علاج `ScreenerMini` حرفاً
               * بحرف — واللوحتان تعرضان نتائج الماسح نفسه.
               */
              const pct =
                typeof r.change_pct === 'number' && Number.isFinite(r.change_pct) ? r.change_pct : null;
              /**
               * الاتجاه من **الرقم المطبوع** لا من الخام: `pctDirection` يقرّب كـ`formatPct` حرفاً بحرف. كان
               * `Math.round(pct * 100)` محلياً — ‎−0.005 يُطبع «−0.01%» (`round2` بعيداً عن الصفر) واللون رمادي.
               */
              const pctDir = pctDirection(pct);
              const pctText = pct != null ? formatPct(pct) : '—';
              const filtersText = r.filters_matched.map(filterLabel).join(' · ');
              /**
               * backend-r17 (a): وقت إغلاق آخر شمعة حين يتأخّر أكثر من شمعتين من فريم الفحص (السبت = إغلاق الجمعة، أو كاش
               * حدّ المزوّد) — كانت البطاقة تعرض سعر الجمعة وRSI كأنهما الآن. داخل شمعتين = لا شيء (شمعة 1H أُغلقت قبل 50د عادية).
               * «الآن» بساعة الخادم (`price_as_of` بها): بساعة الهاتف، متقدّمٌ 3 دقائق يَسِم كل بطاقة 1m «سعر قديم» ومتأخّرٌ يُخفي القديم.
               */
              const barSec = isTimeframe(scanInfo.tf) ? TF_SECONDS[scanInfo.tf] : 15 * 60;
              const asOf =
                typeof r.price_as_of === 'number' &&
                Number.isFinite(r.price_as_of) &&
                serverNowSec() - r.price_as_of > 2 * barSec
                  ? t.screenerPriceAsOf.replace('{time}', formatLocalStamp(r.price_as_of, lang))
                  : null;
              // التسمية تحلّ محلّ نصوص البطاقة كلها: كانت «افتح الشارت: EURUSD 15m» — بلا السعر وRSI والنسبة والمرشّحات
              // التي وُجدت البطاقة لأجلها
              const cardA11y = [
                `${t.screenerOpenChartA11y}: ${r.symbol} ${scanInfo.tf}`,
                asOf,
                formatPrice(r.last, r.symbol),
                `RSI ${r.rsi}`,
                `${pctText} ${t.screenerChangeSpan}`,
                filtersText,
              ]
                .filter(Boolean)
                .join(', ');
              return {
                id: r.symbol,
                node: (
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.hitCard,
                      pressed && {
                        opacity: buttons.pressedOpacity,
                        transform: [{ scale: buttons.pressedScale }],
                      },
                    ]}
                    onPress={() => openOnChart(r.symbol)}
                    accessibilityLabel={cardA11y}
                  >
                    <Text style={[styles.sym, { textAlign: align }]}>
                      {r.symbol}
                      {asOf ? <Text style={styles.match}> · {asOf}</Text> : null}
                    </Text>
                    <Text style={[styles.meta, { textAlign: align }]}>
                      {/* منازل السعر حسب الأداة لا حجم الرقم: كان هذا آخر موضع بالتطبيق يطبع سعراً خاماً
                          من الباك-إند — «157.4» للين و«1.085» لليورو بالسطر الذي يفتح عليه المتداول الشارت. */}
                      {formatPrice(r.last, r.symbol)} · RSI {r.rsi} ·{' '}
                      <Text
                        style={[
                          styles.hitPct,
                          pctDir === 'up' && styles.hitPctUp,
                          pctDir === 'down' && styles.hitPctDown,
                        ]}
                      >
                        {pctText}
                      </Text>{' '}
                      <Text style={styles.match}>{t.screenerChangeSpan}</Text>
                    </Text>
                    <Text style={[styles.match, { textAlign: align }]}>
                      {filtersText}
                    </Text>
                  </Pressable>
                ),
              };
            })}
          />
        </ScrollView>
      ) : null}

      {tab === 'backtest' ? (
        <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
          <BacktestPanel defaultSymbol={signalSym} />
        </ScrollView>
      ) : null}

      {/* تبويب تنبيهات السعر: اللوحة تملك الصفحة وحدها، فالقائمة تُسرَد متدفّقة وتُمرَّر الصفحةُ
          نفسها — بدل نافذة 160px بخليّة شبكة تشاركها ثلاث لوحات أخرى. */}
      {tab === 'alerts' ? (
        <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
          <AlertsPanel flow defaultSymbol={signalSym} ticks={livePrices} active={screenFocused} />
        </ScrollView>
      ) : null}

      {tab === 'indAlerts' ? (
        <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
          <IndicatorAlertsPanel flow defaultSymbol={signalSym} active={screenFocused} />
        </ScrollView>
      ) : null}

      {/* تبويب التقويم: اللوحة تملك الصفحة وحدها، فالصفوف تُسرَد متدفّقة وتُمرَّر الصفحةُ نفسها —
          بدل نافذة 280px معشَّشة داخل تمرير الصفحة والشاشة فارغة تحتها. */}
      {tab === 'calendar' ? (
        <ScrollView contentContainerStyle={styles.body}>
          <CalendarPanel flow symbol={signalSym} active={screenFocused} />
        </ScrollView>
      ) : null}

      {tab === 'layouts' ? (
        <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
          <LayoutPanel
            frameTfs={frameTfs}
            frameSymbols={frameSymbols}
            dxySymbol={heroSymbol}
            dxyTf={heroTf}
            onApply={async (layout) => {
              setFrameSymbols(layout.frameSymbols);
              setFrameTfs(layout.frameTfs);
              // الرابعة تُستعاد فقط من تخطيط حفظها فعلاً (`dxySymbol` موجود): القديمة تحمل `dxyTf: '15m'` ثابتاً لا
              // اختيار المستخدم، فاستعادتها كانت ستعيد فريمه للـ15m دون أن يطلب.
              const heroSym = layout.dxySymbol;
              const hero =
                typeof heroSym === 'string' && heroSym.trim()
                  ? { symbol: heroSym.trim().toUpperCase(), tf: isTimeframe(layout.dxyTf) ? layout.dxyTf : heroTf }
                  : null;
              if (hero) {
                setHeroSymbol(hero.symbol);
                setHeroTf(hero.tf);
                await AsyncStorage.setItem(HERO_SYMBOL_KEY, hero.symbol);
                await AsyncStorage.setItem(HERO_TF_KEY, hero.tf);
              }
              await AsyncStorage.setItem(
                'matrix.frameSymbols.v1',
                JSON.stringify(layout.frameSymbols)
              );
              await AsyncStorage.setItem(
                'matrix.frameTimeframes.v1',
                JSON.stringify(layout.frameTfs)
              );
              // الشاشة الرئيسية مركّبة مسبقاً وتقرأ التخزين عند التركيب فقط — كان التطبيق يبدو بلا أثر
              // حتى إعادة تشغيل التطبيق. نمرّر التخطيط كمعاملات (نفس نمط openSymbol) وننتقل للشارت.
              (navigation as unknown as { navigate: (name: string, params: object) => void }).navigate(
                'Home',
                {
                  layoutSymbols: layout.frameSymbols,
                  layoutTfs: layout.frameTfs,
                  layoutHeroSymbol: hero?.symbol,
                  layoutHeroTf: hero?.tf,
                  layoutNonce: Date.now(),
                }
              );
            }}
          />
        </ScrollView>
      ) : null}

      {tab === 'ai' ? (
        <View style={{ flex: 1, padding: spacing.md }}>
          <AiPanel symbol={signalSym} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.text, fontSize: 22, fontWeight: '500' },
  sub: { color: colors.textDim, fontSize: 12 },
  // W5 (كـ`phoneWatch` بالطرفية): `maxHeight` 52/46 قصّ أسفل التبويبات (المحتوى ~58: حشوة 8+8 + تبويب 12+سطر+12 + حدّ) والشرائح (~48).
  // `flexGrow: 0` ⇒ ارتفاع المحتوى بلا تمدّد عمودي.
  tabsScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  tabs: { flexDirection: 'row', padding: spacing.sm, gap: spacing.sm },
  tabsRtl: { flexDirection: 'row-reverse' },
  symBarScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  symBar: { flexDirection: 'row', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, gap: 4 },
  symBarRtl: { flexDirection: 'row-reverse' },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // DESIGN-PRO §1/§4: الاختيار تعبئة محايدة ونصّ أساسي؛ التأكيد الوحيد بالشريط رمز التبويب النشط.
  tabOn: { backgroundColor: colors.selectedFill },
  tabMark: { color: colors.textDim, fontWeight: '500', fontSize: 13 },
  tabMarkOn: { color: colors.accent },
  tabText: { color: colors.textMuted, fontWeight: '500', fontSize: 12 },
  tabTextOn: { color: colors.text },
  body: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm, paddingBottom: 48 },
  // تبويبات النماذج (الدفتر، الحاسبة، الاختبار، التنبيهات، التخطيطات) بعمود 720 بالوسط: على لابتوب 1440px كانت الخانة
  // بعرض الشاشة كلّه والشرائح في أقصاها (قرار ١٦). الهاتف أضيق من الحدّ ⇒ كما كان.
  formBody: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    paddingBottom: 48,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  pageScroll: { flex: 1 },
  toolbar: { gap: 4 },
  hubSectionTabs: { flexDirection: 'row', gap: spacing.sm },
  hubSectionTabsRtl: { flexDirection: 'row-reverse' },
  hubSectionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hubSectionTabOn: { backgroundColor: colors.selectedFill },
  hubSectionMark: { color: colors.textDim, fontWeight: '500', fontSize: 13 },
  hubSectionMarkOn: { color: colors.text },
  hubSectionText: { color: colors.textMuted, fontWeight: '500', fontSize: 12 },
  hubSectionTextOn: { color: colors.text, fontWeight: '500' },
  gridHint: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  label: { color: colors.textMuted, fontWeight: '500' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  filtersRtl: { flexDirection: 'row-reverse' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.selectedFill },
  chipText: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  chipTextOn: { color: colors.text },
  /** نقطة صغيرة تقول «هذا الزوج مفتوح على شارتك» — الشريحة وحدها لا تفسّر ظهور زوج خارج المتابعة */
  chipOnChartMark: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  filterHints: { gap: 4, marginTop: 4 },
  // DESIGN-PRO §2: «يعرض 8 من {total}» عدّادٌ يتغيّر
  filterHintText: { ...numeric, color: colors.textDim, fontSize: 11 },
  hitCard: {
    flex: 1,
    height: '100%',
    // DESIGN-PRO 5.5: حدّ وحده بلا تعبئة `bgElevated`
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    justifyContent: 'center',
  },
  // DESIGN-PRO §1/5.5: الفريم النشط (`TimeframeBar`) هو تأكيد هذه المنطقة — زرّ الفحص المعبّأ بالتأكيد كان ثانياً فيها. حدّ وحده ونصّ أساسي
  runBtn: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  runBtnDisabled: { opacity: 0.4 },
  runText: { color: colors.text, fontWeight: '500' },
  // «فُحص {k} من {total}» يتقدّم أثناء الفحص — أرقام ثابتة العرض (DESIGN-PRO §2)
  scanHint: {
    ...numeric,
    color: colors.warn,
    fontSize: 12,
    fontWeight: '500',
    paddingVertical: spacing.sm,
  },
  sym: { color: colors.text, fontWeight: '500', fontSize: 15 },
  meta: { ...numeric, color: colors.text, fontSize: 13 },
  /** لون النسبة يأتي من الاتجاه وحده — بلا اتجاه تبقى بلون `meta` كبقية السطر. */
  hitPct: { ...numeric, fontWeight: '500' },
  hitPctUp: { color: colors.bull },
  hitPctDown: { color: colors.bear },
  match: { ...numeric, color: colors.textDim, fontSize: 11 },
});
