import type { Timeframe } from '../timeframes';

export type LangId = 'ar' | 'en-US' | 'en-GB' | 'ku';

/** نصوص `SubscriptionPlansPanel` — كانت قاموساً داخلياً `COPY` بالملف نفسه (طلب QA2) */
export type SubPlansCopy = {
  title: string;
  subtitle: string;
  perMonth: string;
  coreBadge: string;
  academyBadge: string;
  fullBadge: string;
  coreName: string;
  academyName: string;
  fullName: string;
  academyAddOn: string;
  fullAddOn: string;
  /** ميزات تعدّها الباقة — **ما يصل إليه المستخدم فعلاً فقط**: «الأخبار» صارت «التقويم الاقتصادي» (مصدرا الأخبار ميّتان، backend-r33)،
   * و«الرسائل الخاصة» حُذفت (`MessagesScreen` غير مستوردة، launch52)، و«المحللون» حُذفوا (`AnalystsPanel` «غير متاح» — لا مصدر مرخَّص).
   * أعِدها حين تعود الميزة. الأكاديمية بالإنجليزية/الكردية تقول إن الدروس بالعربية (QA27). */
  coreFeatures: string[];
  academyFeatures: string[];
  fullFeatures: string[];
  note: string;
};

export type Dict = {
  accountTitle: string;
  accountSub: string;
  tabHome: string;
  tabTools: string;
  tabAcademy: string;
  tabAccount: string;
  login: string;
  register: string;
  name: string;
  namePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  enter: string;
  createAccount: string;
  logout: string;
  hello: string;
  sponsorCode: string;
  underSponsor: string;
  left: string;
  right: string;
  trader: string;
  trainer: string;
  broker: string;
  agent: string;
  company: string;
  loginError: string;
  /** جلسة منتهية (`create_session` 30 يوماً من الدخول، لا من آخر استعمال) — للدعوة بعد 401 من `/api/auth/me` (backend-r52 ← ui). */
  sessionExpired: string;
  registerError: string;
  /** سبب رفض التسجيل من `detail` الخادم — يختارها `registerErrorText` (i18n/authErrors.ts)؛ `{login}`/`{trader}` تُملأ هناك. */
  regErrReserved: string;
  regErrInvisible: string;
  regErrLink: string;
  regErrUsernameTaken: string;
  regErrEmailTaken: string;
  regErrInvalidEmail: string;
  regErrSponsorNotFound: string;
  regErrUsernameLength: string;
  regErrPasswordLength: string;
  regErrRoleNotOpen: string;
  /** الاسم أو الإيميل فارغ بالتسجيل — `AccountScreen` يرمي `Error('missing fields')` قبل أي طلب (`registerErrorText`). */
  regErrMissingFields: string;
  /** رفض الدخول 401 `invalid credentials` (`db.login_user`): الاسم/الإيميل غير موجود أو كلمة المرور خطأ — لا نفرّق عمداً. `loginErrorText`. */
  loginErrCredentials: string;
  /** الدخول بحقل الاسم/الإيميل فارغ (`Error('missing identity')` أو 400 `email or username required`). `loginErrorText`. */
  loginErrMissing: string;
  language: string;
  deleteAccount: string;
  deleteAccountConfirmTitle: string;
  deleteAccountConfirmBody: string;
  deleteAccountConfirmBtn: string;
  deleteAccountError: string;
  cancel: string;
  notifications: string;
  notifStatusGranted: string;
  notifStatusDenied: string;
  notifStatusUndetermined: string;
  notifStatusUnsupported: string;
  notifEnableBtn: string;
  notifOpenSettingsBtn: string;
  onboardStep1Title: string;
  onboardStep1Body: string;
  onboardStep2Title: string;
  onboardStep2Body: string;
  onboardStep3Title: string;
  onboardStep3Body: string;
  onboardStep4Title: string;
  onboardStep4Body: string;
  onboardStep5Title: string;
  onboardStep5Body: string;
  onboardRiskNote: string;
  onboardStepCounterA11y: string;
  onboardSkip: string;
  /** بالبطاقة الأخيرة مكان «تخطي» (لا شيء بعدها يُتخطّى): يرجع خطوة. */
  onboardBack: string;
  onboardNext: string;
  onboardStart: string;
  // ToolsScreen + الثمانية لوحات hub (أخبار/اجتماعي/دردشة/تصويت/AI/محللون/توقعات/تنبيهات) — 2026-09-17
  dirBuy: string;
  dirSell: string;
  dirNeutral: string;
  avgLabel: string;
  entryLabel: string;
  slLabel: string;
  tpLabel: string;
  enabledWord: string;
  disabledWord: string;
  sendBtn: string;
  refreshBtn: string;
  aboveWord: string;
  belowWord: string;
  addBtn: string;
  deleteWord: string;
  priceWord: string;
  impactHigh: string;
  impactMedium: string;
  impactLow: string;
  toolsTitle: string;
  toolsSub: string;
  toolsTabHub: string;
  toolsTabReports: string;
  toolsTabJournal: string;
  toolsTabScreener: string;
  toolsTabBacktest: string;
  toolsTabIndAlerts: string;
  toolsTabCalendar: string;
  toolsTabLayouts: string;
  toolsTabAi: string;
  a11yTabPrefix: string;
  a11ySignalSymbolPrefix: string;
  /** وسم الشريحة: هذا الزوج مفتوح الآن على شارت المتداول */
  toolsSymOnChart: string;
  toolsHubCommunity: string;
  toolsHubAnalysis: string;
  a11yHubSectionPrefix: string;
  toolsGridHint: string;
  toolsFiltersLabel: string;
  filterMaUpLabel: string;
  filterMaUpHint: string;
  filterMaDownLabel: string;
  filterMaDownHint: string;
  filterRsiOversoldLabel: string;
  filterRsiOversoldHint: string;
  filterRsiOverboughtLabel: string;
  filterRsiOverboughtHint: string;
  filterMacdUpLabel: string;
  filterMacdUpHint: string;
  filterBullishLabel: string;
  filterBullishHint: string;
  filterBearishLabel: string;
  filterBearishHint: string;
  a11yFilterPrefix: string;
  screenerRunning: string;
  screenerRunBtn: string;
  screenerRunNeedFilter: string;
  screenerNeedApiKey: string;
  screenerNoResults: string;
  screenerFailed: string;
  screenerScanNone: string;
  screenerScanPartial: string;
  /** ui11/backend-r17 (a): وسم نتيجة الماسح المبنيّة على شموع أقدم من شمعتين من الفريم (عطلة الأسبوع، كاش المزوّد).
   * `{time}` = `formatLocalStamp(price_as_of)` = وقت إغلاق آخر شمعة بتوقيت الجهاز — لذا «إغلاق» لا «حتى» (التي تُقرأ «إلى أن»). */
  screenerPriceAsOf: string;
  screenerNoMatchOf: string;
  screenerShowingOf: string;
  screenerChangeSpan: string;
  screenerTapToOpen: string;
  screenerOpenChartA11y: string;
  newsTitle: string;
  newsStale: string;
  newsEmpty: string;
  newsLoadError: string;
  /** backend-r33 (`acace1d`): `/api/news` `status === 'unavailable'` — المصدر لم يُجب (لا اتصال المستخدم). يحلّ محلّ `newsLoadError`
   * و`newsEmpty` حين تصل الاستجابة بلا عناوين وبهذه الحالة: «لا عناوين مؤثرة الآن» كذبٌ حين المصدر ميّت. بلا متغيّرات. */
  newsSourceUnavailable: string;
  /** backend-r33: `stale: true` — عناوين من جلب سابق والمحاولة الأخيرة فشلت. `{time}` = `formatLocalStamp(as_of)` مرة واحدة. */
  newsStaleAsOf: string;
  /** سطر واحد تحت عنوان الأخبار حين خبرٌ فيها `impact_basis === 'headline_keywords'` (backend `9a05735`): شارة «قوي/متوسط/ضعيف»
   * مخمَّنة من كلمات العنوان لا تصنيفاً من المصدر كتأثير التقويم. */
  newsImpactFromHeadline: string;
  /** قارئ الشاشة على شارة «≈ عالي» (`NewsPanel.tsx:96`، `8ca1226`): «≈» يُقرأ «يساوي تقريباً» — جملة بدلها. {impact} = `impactHigh/Medium/Low`. */
  newsImpactEstimatedA11y: string;
  /** شريحة تغيّر اللقطة (`SymbolSnapshot`) بعد backend `5324d55`: `change_pct` على كامل السلسلة المحمّلة لا يومياً — {pct} بـ`formatPct`،
   * {bars} = `change_bars`. بلا `change_bars` (خادم أقدم) ⇒ النسبة وحدها كما اليوم. */
  snapChangeOverBars: string;
  aiPanelTitle: string;
  aiGreeting: string;
  /** سطر خافت تحت جواب المساعد له `price_as_of` (backend-r12، ui9): الدخول بالنصّ إغلاق شمعة قد يكون مخزَّناً أو إغلاق الجمعة —
   * `{time}` من `AiPanel.formatPriceAt` («21:45» أو «الجمعة، 25 سبتمبر 21:45»؛ الكردي «26/09 21:45») */
  aiPriceAsOf: string;
  /** سطر خافت تحت «دخول/وقف/هدف» بلوحة توقّع المؤشرات (`IndicatorForecastPanel`) حين `price_as_of` أقدم من دقائق (backend-r16، `e4d940e`):
   * يوم السبت الدخول = إغلاق الجمعة، وعند حدّ المزوّد كاش حتى 15د. `{time}` من `formatLocalStamp` كما `aiPriceAsOf`؛ null ⇒ لا سطر. */
  forecastPriceAsOf: string;
  aiOfflineFallback: string;
  aiInputPlaceholder: string;
  aiInputA11y: string;
  aiSendA11y: string;
  aiAskBtn: string;
  analystsTitle: string;
  analystsSubSuffix: string;
  analystsRefreshA11y: string;
  analystsLoadError: string;
  socialPlatformTelegram: string;
  socialPlatformFacebook: string;
  socialPlatformInstagram: string;
  socialPlatformX: string;
  socialPlatformYoutube: string;
  socialPlatformDiscord: string;
  socialPlatformApp: string;
  socialComputeA11y: string;
  socialComputeBtn: string;
  socialTitle: string;
  socialSub: string;
  socialPickHint: string;
  socialSourcesError: string;
  a11ySourcePrefix: string;
  sourcesCountLabel: string;
  suggestedTradeLabel: string;
  socialNoClearTrade: string;
  socialComputeError: string;
  chatTitle: string;
  chatLoadError: string;
  chatEmpty: string;
  /** `GroupChatPanel` عند فشل الشبكة: الرسالة المحلية تبقى بالقائمة والخانة فُرّغت؛ إعادة التركيب تجلب قائمة الخادم فتختفي إن لم تصل. */
  chatSendError: string;
  chatYou: string;
  chatAnonTrader: string;
  chatLoginRequired: string;
  chatInputPlaceholder: string;
  chatInputA11y: string;
  chatSendA11y: string;
  voteTitle: string;
  voteCloseFormA11y: string;
  votePublishNewA11y: string;
  closeWord: string;
  votePublishToggleBtn: string;
  voteSymbolPlaceholder: string;
  voteSymbolA11y: string;
  voteDirA11yPrefix: string;
  voteEntryPriceA11y: string;
  voteSlPriceA11y: string;
  voteTpPriceA11y: string;
  voteNotePlaceholder: string;
  voteNoteA11y: string;
  voteFormError: string;
  votePublishError: string;
  votePublishBtn: string;
  voteLoadError: string;
  voteEmpty: string;
  voteByAuthor: string;
  voteApprovalLabel: string;
  voteAgreeWord: string;
  voteDisagreeWord: string;
  /** `VotePanel` عند فشل الشبكة: العدّاد المتفائل لا يُرجَع؛ إعادة التركيب (`load`) تعرض العدّ الفعلي. */
  voteCastError: string;
  voteLoginRequired: string;
  chatLinksNotAllowed: string;
  votePublishLoginRequired: string;
  voteLinksNotAllowed: string;
  modMessageOptionsA11y: string;
  modIdeaOptionsA11y: string;
  modReportLabel: string;
  modReasonSpam: string;
  modReasonAbuse: string;
  modReasonScam: string;
  modBlockUser: string;
  modReported: string;
  modReportLoginRequired: string;
  modReportError: string;
  modBlocked: string;
  modBlockedCount: string;
  modUnblockA11y: string;
  voteAgreeA11yPrefix: string;
  voteDisagreeA11yPrefix: string;
  indicatorBollinger: string;
  indicatorTrend: string;
  forecastRunA11y: string;
  forecastRunBtn: string;
  forecastTitle: string;
  forecastAvgLabel: string;
  forecastTradeLabel: string;
  forecastNoSignal: string;
  forecastAgreeLabel: string;
  forecastError: string;
  alertsTitle: string;
  /**
   * سطر تحت عنوان التنبيهات. الشرط ≥/≤ (`alert_worker._price_hit`) لا «عبور»، والفحص كل 60 ث (`run_alert_loop(60.0)`) —
   * كان «إشعار عند التفعيل» يُقرأ «حين تضغط تفعيل»، وبالكردية «حين يصبح نشطاً».
   */
  alertsSub: string;
  alertsPushTitle: string;
  /** اسم قناة إشعارات أندرويد كما يراه المتداول بإعدادات النظام */
  notifChannelName: string;
  notifChannelDesc: string;
  alertsSymbolA11y: string;
  alertsPriceA11y: string;
  alertsAboveConditionA11y: string;
  alertsBelowConditionA11y: string;
  alertsAddA11y: string;
  alertsNotePlaceholder: string;
  alertsNoteA11y: string;
  alertsAddError: string;
  alertsFirstBadge: string;
  alertsLoadError: string;
  alertsEmpty: string;
  alertsDeleteConfirmTitle: string;
  alertsDeleteFailedTitle: string;
  alertsDeleteFailedBody: string;
  alertsDeleteA11yPrefix: string;
  alertsInvalidInput: string;
  alertsUnknownSymbolWarn: string;
  alertsEditOldRemains: string;
  alertsRearmBtn: string;
  alertsRearmA11yPrefix: string;
  alertsRearmedMsg: string;
  alertsRearmFailed: string;
  alertsArmedPrefix: string;
  alertsUpdatedPrefix: string;
  alertsCurrentPrefix: string;
  alertsUseCurrent: string;
  alertsUseCurrentA11y: string;
  alertsSaveEdit: string;
  alertsEditingHint: string;
  alertsCancelEdit: string;
  alertsFiresNowWarn: string;
  alertsActiveCount: string;
  alertsTapToEdit: string;
  alertsClearFiredBtn: string;
  alertsClearFiredConfirm: string;
  alertsEditA11yPrefix: string;
  alertsStatusArmed: string;
  alertsStatusTriggered: string;
  riskCalcTitle: string;
  /** QA20: لا «never lose more» — الفجوة/الانزلاق عند الخبر تتخطّى الوقف (`newsRiskHint`)؛ الوعد هو كلفة ضرب الوقف فقط */
  riskCalcSub: string;
  riskCalcSymbol: string;
  riskCalcBadSymbol: string;
  /**
   * QA44/tools62: رمز **حساب mini** («EURUSD.mini»، «GBPJPY-MINI») — `instrumentSpec` يرفضه عمداً لأن حجم لوت mini يختلف بين الوسطاء
   * (`MINI_SUFFIX` بـ`positionSize.ts`)؛ يُعرض بدل `riskCalcBadSymbol` العامّ الذي يوحي بأن الرمز خطأ مطبعي. للحاسبة والدفتر.
   * `{symbol}` كما كُتب؛ `{pair}` الزوج العادي (`miniAccountSymbol`)
   */
  riskCalcMiniSymbol: string;
  /**
   * وضع حساب السنت/micro بالحاسبة (موصول بـ`PositionSizePanel.tsx`، `6408499`): رمز سنت يُحسب بدل رفضه والرصيد يُقرأ بالسنت
   * (عقدٌ أصغر بمئة مرّة ورصيدٌ بوحدة أصغر بمئة مرّة ⇒ الحساب العادي نفسه بالأرقام نفسها إن عومل USC كـUSD بالتحويل)؛ رمز micro رصيده بعملة الحساب ولوته
   * = اللوت العادي × 100. `{symbol}` كما كُتب؛ `{usd}` مبلغ USC ÷ 100؛ `{std}` اللوت بمقياس الحساب العادي (÷ 100)
   */
  riskCalcCentModeNote: string;
  riskCalcCentBalance: string;
  riskCalcCentUsdEquiv: string;
  riskCalcSmallLotsStdEquiv: string;
  riskCalcMicroModeNote: string;
  appCrashTitle: string;
  appCrashBody: string;
  appCrashRepeatBody: string;
  appCrashRetry: string;
  /** سطر تقني تحت نصّ التكرار (`AppErrorBoundary`)، يتبعه اسم الخطأ ورسالته بالإنجليزية كما هي. */
  appCrashDetailLabel: string;
  planSlWrongBuy: string;
  planSlWrongSell: string;
  planTpWrongBuy: string;
  planTpWrongSell: string;
  planSlTooClose: string;
  planRiskWord: string;
  /** كلمتا ملاحظة الدفتر من الحاسبة (`planJournalNote` words.commission / words.netRR): «عمولة 7.00 USD/lot» و«R:R بعد التكاليف 1:1.7» */
  planNoteCommission: string;
  planNoteNetRR: string;
  planRewardWord: string;
  planLowRR: string;
  riskCalcAccountCcy: string;
  riskCalcBalance: string;
  riskCalcRiskPct: string;
  riskCalcRiskMoneyHint: string;
  /** المخاطرة أكبر من الرصيد (طلب وكيل الأدوات)؛ `{risk}` و`{balance}` مبلغان بعملة الحساب كما تُعرض */
  riskCalcRiskOverBalance: string;
  riskCalcHighRisk: string;
  riskCalcSlPips: string;
  riskCalcFromPrice: string;
  riskCalcSlMismatch: string;
  riskCalcEntry: string;
  riskCalcStop: string;
  /**
   * شريحة سعر الوقف لكلّ اتجاه (`stopsForPips`) حين تُكتب النقاط والدخول بلا سعر وقف — `{side}` «▲ شراء»/«▼ بيع».
   * «▲ شراء 1.0830» وحدها تُقرأ «اشترِ عند 1.0830»؛ السعر هنا سعر **الوقف** لو كانت الصفقة بهذا الاتجاه.
   */
  riskCalcStopChip: string;
  riskCalcConvFailed: string;
  riskCalcConvManual: string;
  /** سعر التحويل لم يتجدّد (التجديد الصامت كل دقيقة فشل): {pair} الزوج، {min} الدقائق منذ آخر سعر ناجح */
  riskCalcConvStale: string;
  /** بديل `riskCalcConvStale` حين `market_open === false` من `/api/market/quote` (backend `9f5cccd`): بعطلة نهاية الأسبوع
   * `as_of` صار وقت إغلاق الجمعة فالتحذير يقول «لم يتجدّد منذ 2900 د» — صحيح لكنه يوحي بعطل. {pair} الزوج؛ بلا دقائق. */
  riskCalcConvMarketClosed: string;
  riskCalcLots: string;
  riskCalcRiskAmount: string;
  riskCalcUnits: string;
  riskCalcBelowMin: string;
  riskCalcFillHint: string;
  invalidNumberHint: string;
  /**
   * سعر «3.450» مرفوض لأنه مبهم لأداة منازلها أقلّ من ثلاث (`parsePriceFor`)، أو «157,250» بفاصلة قبل ثلاثة أرقام لأي رمز (`25dc815`) —
   * {value} كما كُتب، {whole} بلا الفاصل (3450)، {small} كسراً (3.45). النصّ لا يقول «النقطة» لأن الفاصل قد يكون فاصلة.
   */
  priceAmbiguousThousandsHint: string;
  /**
   * نقاط وقف «1.500» مرفوضة لأنها مبهمة (`parseSlPips`، `ffa6b92`) — الرسالة العامة «اكتبه بلا فواصل آلاف، مثل 1.0850» تدعوه لكتابة ما كتبه.
   * {value} كما كُتب، {whole} بلا الفاصل (1500)، {small} كسراً (1.5) — «1.500» و«1,500» كلاهما، فالنصّ لا يقول «النقطة». موصول (`4133676`)
   */
  riskCalcSlPipsAmbiguous: string;
  /**
   * «250 points»/«250 نقاط» بخانة الوقف/السبريد — مرفوضة عمداً (`stripUnitWord`، `374d92e`): النقطة بمنصّة MT4/MT5 عُشر pip بأسعار الخمس خانات.
   * الرسالة العامة «اكتبه بلا فواصل آلاف» لا تقول ذلك. {value} كما كُتب، {pips} الرقم ÷ 10. **غير موصول بعد** (tools: فرع قبل `invalidNumberHint`)
   */
  riskCalcSlPointsHint: string;
  /**
   * «€40» مخاطرةً أو «€7» عمولةً بحساب دولار (`moneyInOtherCurrency`، `33b3566`) — اليوم «المخاطرة «€40»: عملة الحساب USD» لا تقول ماذا يفعل.
   * {field} الاسم القصير، {value} كما كُتب، {ccy} عملة الحساب. **غير موصول بعد** (tools)
   */
  riskCalcOtherCcyHint: string;
  /** رقم فيه «٬» (فاصل الآلاف العربي) بغير موضع آلاف — «0٬5» يُرفض (`parseDecimal`، `49db13b`)؛ الحرفان متشابهان على لوحة المفاتيح العربية فيُقال أيّهما يُكتب للكسر */
  arabicThousandsSignHint: string;
  /** اسم الخانة المرفوضة وما كُتب فيها، يسبق `invalidNumberHint`/`arabicThousandsSignHint` («الهدف «3.5.0»: …» — `d28991b`)؛ {field} الاسم القصير، {value} كما كُتب. علامتا الاقتباس بحسب اللغة: «» للعربية والكردية، “” للإنجليزية */
  riskCalcBadFieldValue: string;
  /** «1.0820» بخانة الوقف بالـpip: سعرٌ لا مسافة (`slPipsLooksLikePrice`) — `{value}`. بلا رقم مثال: «25» وقفٌ معقول على EURUSD وداخل السبريد على USDZAR/USDTRY (وقفها بالمئات، `7caf5c5`) */
  riskCalcSlLooksLikePrice: string;
  /** «25» بخانة سعر الوقف: نقاطٌ لا سعر، النقرة تنقلها لخانة النقاط (`levelLooksLikePips`) — `{value}` */
  riskCalcStopPxLooksLikePips: string;
  /** «50» بخانة الهدف (الحاسبة/الدفتر) أو الوقف (الدفتر): نقاطٌ لا سعر، النقرة تكتب السعر — `{field}` `{value}` `{pips}` `{price}` */
  levelLooksLikePipsHint: string;
  /**
   * launch123: سطر الخطأ تحت زرّ الحفظ بالدفتر حين يُمنع الحفظ الأول. كان `levelLooksLikePipsHint` + لاحقة «اضغط مرّة ثانية» (tools80، حُذفت)
   * ⇒ الجملة نفسها مرّتين (السطر القابل للنقر فوق، ونسخة نصّية تحت الزرّ) والنسخة السفلى تقول «اضغط لكتابة {price}» ولا تفعل شيئاً.
   * هذا مستقلّ ولا يَعِد بنقرة: يقول إن الحفظ لم يتمّ، ويحيل للسطر أعلاه، ويشرح الضغطة الثانية. `{field}` الاسم القصير، `{value}` كما كُتب،
   * `{button}` نصّ الزرّ — بدالّة لا نصّ بديل
   */
  levelLooksLikePipsSaveBlocked: string;
  /**
   * كـ`levelLooksLikePips*` لرمز **بلا pip** (مؤشر/عملة رقمية، tools `fa1fda2`: US30 وقف «50» ⇒ 41,950): «pip» خطأ هناك — النقطة
   * 1.0 من السعر. نفس المواضع `{field}`/`{value}`/`{pips}`/`{price}`/`{button}`؛ المستهلك يختارها حين `journalSpec(symbol)` = null (launch140).
   */
  levelLooksLikePointsHint: string;
  levelLooksLikePointsSaveBlocked: string;
  /**
   * tools102a: دخولٌ بالدفتر بلا فاصلة عشرية («10850» على EURUSD) بينما الوقف سعر صحيح (1.0820) ⇒ حارس النقاط كان يلوم الوقف.
   * `{value}` الدخول كما كُتب، `{price}` السعر المقترح (فاصلة بمنازل الرمز) — بدالّة لا نصّ بديل. سؤالٌ لا يَعِد بنقرة.
   */
  journalEntryDecimalSlip: string;
  /**
   * tools104a: وقف/هدف بالدفتر بلا فاصلة عشرية («10880» وقفاً لبيع EURUSD على 1.0850) — حارس النقاط لا يراه (قراءته نقاطاً تعطي سعراً بعيداً)
   * فكان يُحفظ وقفاً عند 10880 وR ≈ 0. `{field}` تسمية الخانة الموجودة، `{value}` كما كُتب، `{price}` المقترح بمنازل الرمز. سؤالٌ لا يَعِد بنقرة.
   */
  journalLevelDecimalSlip: string;
  riskCalcPipValue: string;
  /** الأساس = عملة الحساب (USDJPY بحساب دولار…) ⇒ قيمة الـpip محسوبة بسعر الوقف لا الحيّ (`exitQuoteToAccount`) فتخالف المنصّة — {price} = الوقف */
  riskCalcPipValueAtStop: string;
  /** سطر صغير تحت السابق: لماذا يخالف رقم المنصّة */
  riskCalcPipValueAtStopHint: string;
  /** النقاط وحدها بلا سعر وقف (`pipsOnlyExitPrice`): الاتجاه مجهول ⇒ حُسبت بالخروج **تحت** السعر؛ «عند وقفك» يكذب على البائع — `{price}` الخروج المفترض، `{pips}` النقاط */
  riskCalcPipValueAtPipsExit: string;
  /** تحت السابق بدل `riskCalcPipValueAtStopHint`: لماذا تحت السعر ولماذا تخالف المنصّة */
  riskCalcPipValueAtPipsExitHint: string;
  /** حاسبة الهامش (طلب وكيل الأدوات): خانة الرافعة، سطر الهامش، وملاحظة أن الهامش ليس الخسارة */
  riskCalcLeverage: string;
  /** رافعة مفهومة لكن خارج مدى `parseLeverage` (كـ«1:5000») — بدل «رقم غير مفهوم… بلا فواصل آلاف» المضلِّل؛
   *  `{value}` كما كُتبت، `{max}` سقف `parseLeverage` (3000 اليوم) */
  riskCalcLeverageOutOfRange: string;
  /** «1.000»/«1:1.000» بخانة الرافعة (`readLeverage` يرفضها منذ `7ee9d77`): 1:1000 بكتابة أوروبية أم 1:1؟ بدل «رقم غير مفهوم… مثل 1.0850».
   *  `{value}` كما كُتبت، `{big}` قراءة الآلاف («1000»). للأدوات: فرع قبل `invalidNumberHint` حين تكون الرافعة وحدها المرفوضة */
  riskCalcLeverageAmbiguous: string;
  riskCalcMargin: string;
  riskCalcMarginNote: string;
  riskCalcTarget: string;
  riskCalcTargetPlaceholder: string;
  riskCalcPotentialProfit: string;
  riskCalcLogToJournal: string;
  riskCalcSideLabel: string;
  riskCalcSideFromStop: string;
  riskCalcLoggedToJournal: string;
  riskCalcLogFailed: string;
  riskCalcMarginMaxLots: string;
  riskCalcLogBlockedMismatch: string;
  riskCalcSlMismatchNarrower: string;
  riskCalcSpread: string;
  riskCalcSpreadNote: string;
  riskCalcSpreadPipsHint: string;
  riskCalcRiskWithSpread: string;
  riskCalcSpreadLotsWithin: string;
  riskCalcSpreadTooWide: string;
  /** «12 points» بخانة السبريد ⇒ «اكتب 1.2» (`slPipsInPoints` يصلح للخانة نفسها) — طلب tools63؛ `{value}` كما كُتب و`{pips}` ÷10 */
  riskCalcSpreadPointsHint: string;
  /**
   * تحذير لا رفض (طلب tools93): سبريد بمنزلتين عشريّتين على زوج سعره بمدى السبريد نفسه (ZARJPY ~8، USDMXN ~18، USDZAR ~18)
   * قد يكون السعر منسوخاً — لكن سبريدات هذه الأزواج الحقيقية بهذا المدى أحياناً، فالحساب يبقى. `{n}` كما كُتب، `{symbol}` الرمز.
   */
  riskCalcSpreadMaybePrice: string;
  /** الوقف ليس أبعد من السبريد — يُضرب لحظة الفتح تقريباً (طلب وكيل الأدوات)؛ `{sl}` و`{spread}` بالنقاط كما تُعرض */
  riskCalcStopInsideSpread: string;
  /**
   * خانة السبريد فارغة والوقف ليس أبعد من السبريد **المعتاد** للأداة (`stopInsideTypicalSpread`) — طلب tools85.
   * `{sl}` الوقف بالـpip، `{spread}` المعتاد (`typicalSpreadPipsExample`)، `{symbol}` الرمز. تقدير لا قراءة حيّة ⇒ «~» و«المعتاد».
   */
  riskCalcStopInsideTypicalSpread: string;
  riskCalcCommission: string;
  riskCalcCommissionNote: string;
  /** بدل `riskCalcCommissionNote` بوضع micro: العمولة لكل لوت micro، وتُحوَّل تلقائياً (`commissionAcrossModes`). {std} = مثال العادي، {micro} = مكافئه */
  riskCalcCommissionNoteMicro: string;
  /** بدل `riskCalcCommissionNote` بوضع السنت: بالـUSC لكل لوت سنت — الرقم نفسه كالعادي. {usc} = المثال */
  riskCalcCommissionNoteCent: string;
  riskCalcRiskWithCosts: string;
  riskCalcCostsLotsWithin: string;
  riskCalcNetAfterCosts: string;
  riskCalcNetNegative: string;
  // تحذير R:R منخفضة حين تُقرأ من الصافي (`rewardBelowRisk` مع تكاليف): `planLowRR` («الربح المحتمل…») يسمّي السطر الإجمالي فوقه وقد يقول 1:1.1
  riskCalcLowNetRR: string;
  // الحجم فوق `MAX_SANE_LOTS` (100): رصيد كبير بوقف 1 pip يُخرج 200 lot بلا إشارة، وأغلب الوسطاء يرفضون أمراً فوق 50–100
  riskCalcOverOrderMax: string;
  // الحجم فوق `MAX_SMALL_LOTS` (200) بوضع السنت/micro (`lotsOverOrderMax(result, true)`، 8713abf): النص العادي يقول «50–100 lot»
  // فيبدو 150 لوت سنت تحذيراً كاذباً رغم أنّ الحدّ 200 — جاهز غير موصول
  riskCalcOverOrderMaxSmall: string;
  riskCalcCostsBelowMin: string;
  riskCalcUseLivePrice: string;
  riskCalcUseLivePriceA11y: string;
  riskCalcLiveFilled: string;
  /** الدخول الحيّ نُقل تلقائياً لـAsk/Bid حين ظهرت جهة الوقف — {quote} = Ask|Bid، {side} = dirBuy|dirSell، {price} */
  riskCalcLiveSideMoved: string;
  riskCalcNoLiveQuote: string;
  riskCalcDisclaimer: string;
  toolsTabRisk: string;
  calTimesLocal: string;
  calUpcomingHead: string;
  calNow: string;
  calPast: string;
  calInPrefix: string;
  calHourShort: string;
  calMinShort: string;
  calDayShort: string;
  newsRiskHigh: string;
  newsRiskHint: string;
  /** سطر شريط «خبر قوي» فوق صفقات الدفتر المفتوحة (`openPositionsNewsRisk`): `{symbols}` = الرموز التي يمسّها الخبر مفصولة بـ`listSep`. لا «حجم الصفقة» — الصفقة مفتوحة؛ الخطر الفعلي انزلاق الوقف. */
  newsRiskOpenHint: string;
  /** فاصل قائمة قصيرة داخل جملة: «, » بالإنجليزية، «، » بالعربية والكردية. */
  listSep: string;
  /** شريط الخبر حين فشل التقويم ولا نسخة محفوظة، أو المحفوظ أقدم من ساعة بلا خبر فيه (`calendarStaleSilent`، tools `8bdf23f`) — غياب التحذير هنا ليس «لا خطر». «تحديث» لا «تحميل»: يصحّ للحالتين */
  newsUnavailable: string;
  /** موعد خبرٍ قويّ اليوم **بلا ساعة معلنة** بسطر شريط الأخبار مكان «بعد 2س» (`NewsRiskBanner`، tools75a). */
  newsTimeTbd: string;
  /** مثل `newsTimeTbd` لكن يومُ الخبر **غداً** بتقويم الجهاز (`unannouncedHighImpactToday().tomorrow`، launch113/tools76a). */
  newsTimeTbdTomorrow: string;
  calToday: string;
  calTomorrow: string;
  /** يلي تاريخ حدث التقويم **بلا ساعة معلنة** («اليوم · الساعة غير معلنة»، `CalendarPanel`، ui10). */
  calTimeTbd: string;
  /** `/api/calendar` بـ`stale: true` (backend-r27، `86fd24c`): فشل آخر تحديث والأحداث من جلب سابق — `{time}` = `as_of` (ثوانٍ UTC) بساعة المستخدم HH:MM. الأحداث حقيقية فليس تحذير عطل */
  calStaleAsOf: string;
  calSampleBanner: string;
  calForecast: string;
  calPrevious: string;
  calActual: string;
  // WeeklyReportPanel/TradeJournalPanel/BacktestPanel/IndicatorAlertsPanel/CalendarPanel/LayoutPanel — 2026-09-17
  reportsTitle: string;
  reportsSubGrid: string;
  reportsSub: string;
  reportWeeklyTitle: string;
  reportWeeklyHint: string;
  reportPerformanceTitle: string;
  reportPerformanceHint: string;
  reportAdviceTitle: string;
  reportAdviceHint: string;
  reportRiskTitle: string;
  reportRiskHint: string;
  reportOpenWord: string;
  reportAiFallbackNote: string;
  reportJournalDataLine: string;
  reportJournalEmptyLine: string;
  reportJournalUnavailableLine: string;
  reportFallbackWeekly: string;
  reportFallbackPerformance: string;
  reportFallbackRisk: string;
  reportFallbackAdvice: string;
  journalTitle: string;
  journalSub: string;
  journalStatClosed: string;
  journalStatWinRate: string;
  /** الرقم مجموع نسب حركة السعر لكل صفقة بلا حجم (`db.trade_stats`)، لا ربح الحساب */
  journalStatPriceMoveSum: string;
  /** سطر صفقات السنت (مالها بعقد ÷100، `smallContractSpec`): المبلغ بـUSC لا USD. micro لا يحتاج سطراً: مبلغه بعملة التسعير كالحساب العادي */
  journalCentMoneyNote: string;
  /** سطر رمز حساب mini بالدفتر (`isMiniJournalSymbol`): نقاط وأسعار بلا مال — طلب tools63 */
  journalMiniNoMoney: string;
  /** مبلغ صفقة سنت: `{usc}` بالسنت، `{usd}` = usc ÷ 100 — كلاهما منسّقان مع الإشارة */
  journalMoneyUsc: string;
  journalStatBestWorst: string;
  journalStatsPending: string;
  journalStatNetPips: string;
  journalStatNetPipsBySymbol: string;
  journalStatAvgR: string;
  journalSideA11yPrefix: string;
  journalSymbolPlaceholder: string;
  journalSymbolA11y: string;
  journalEntryPlaceholder: string;
  journalUseLivePrice: string;
  journalUseLivePriceA11y: string;
  journalNoLiveQuote: string;
  journalEntryA11y: string;
  journalExitPlaceholder: string;
  journalSizePlaceholder: string;
  journalSizeA11y: string;
  journalSizeUnitsFix: string;
  journalSizeUnitsNoFix: string;
  /** «10.000» مبهم (`journalSizeDottedThousands`): `{n}` كما كُتب، `{units}` الوحدات بفواصل، `{lots}` اللوت المقترح، `{whole}` قراءة اللوت («10»). */
  journalSizeDottedFix: string;
  /** حجمٌ كُتب لرمز سنت/micro ثم تبدّل الرمز إلى عادي: `{n}` الحجم، `{prev}` الرمز السابق، `{symbol}` الحالي، `{std}` = `smallLotsStdEquiv(n)`؛ النقر يحوّله. */
  journalSizeFromSmallFix: string;
  journalExitA11y: string;
  /** قارئ الشاشة لشرائح «= SL/= BE/= TP» تحت خانة الخروج — `{price}` نصّ الخانة المنسوخ؛ «SL»/«BE» تُقرأ حروفاً */
  journalExitAtSlA11y: string;
  journalExitAtBeA11y: string;
  /** شريحة «= SL» حين نُقل الوقف إلى الربح (`x.gain`): «وقف الخسارة» خطأ لقارئ الشاشة — الخروج هنا ربح */
  journalExitAtProfitStopA11y: string;
  journalExitAtTpA11y: string;
  /** قارئ الشاشة لشرائح الوقف بالمسافة («−20 pip») تحت خانة الوقف — `{pips}` العدد، `{price}` سعر الوقف المكتوب */
  journalSlAtPipsA11y: string;
  journalNotePlaceholder: string;
  journalSlPlaceholder: string;
  journalTpPlaceholder: string;
  journalInvalidEntry: string;
  journalResultR: string;
  journalNoteA11y: string;
  /** عدّاد تحت خانة ملاحظة قريبة من حدّها (الدفتر `JOURNAL_NOTE_MAX` = 500 = الخادم `main.py:447`) — مع `maxLength` تتوقّف الكتابة بصمت
   *  بدونه (صفّ QA14). `{n}` الباقي، `{max}` الحدّ. صيغة «الباقية: n من max» كي لا يُصرَّف «حرف» بالعدد. يصلح لأي خانة ملاحظة */
  noteCharsLeft: string;
  /** بدل `noteCharsLeft` بالدفتر حين `journalNoteRoom` < 500 (`695ad41`): بلا شرح يقرأ المتداول «0 من 489» ويسأل أين ذهبت 11 حرفاً.
   *  `{n}` الباقي، `{max}` الحدّ بعد الحجز، `{reserved}` = 500 − `{max}`. العلامتان تُكتبان كما تظهران بالملاحظة المحفوظة */
  noteCharsLeftReserved: string;
  /**
   * تحت خانة الملاحظة حين تحمل (أو ستحمل بالحفظ) علامة الوقف الأصلي «1R @ …» (`noteWithInitialStop`/`initialStop` بـ`tradePlan.ts`):
   * `{stop}` سعر الوقف الأصلي. يشرح لماذا ظهر النصّ بملاحظته وما يحدث إن حذفه.
   */
  journalInitialStopNote: string;
  /**
   * tools86: زرّ اختيار تحت الملاحظة حين يُعدَّل وقف صفقة مفتوحة وسيُلحق التعديل «1R @ …» (`stopTypoFixText` بـ`TradeJournalPanel`).
   * عند اختياره لا تُلحق العلامة فيُقاس الـR من الوقف المصحَّح (1.0380 مكتوبة خطأً ⇒ 1.0830). قصير — وسم زرّ، بلا متغيّرات.
   */
  journalStopTypoFix: string;
  /**
   * فوق قائمة الدفتر حين يصل من الخادم `{n}` صفقة = حدّ `db.list_trades` (`LIMIT 200`، مرتّبة بـ`opened_at`): الأقدم لا تصل
   * ولا تُحسب بالإحصاءات — ولو كانت مفتوحة. صفّ QA9.
   */
  journalCappedNote: string;
  journalAddA11y: string;
  journalAddBtn: string;
  journalAddError: string;
  journalCloseFailedTitle: string;
  journalCloseFailedBody: string;
  journalEmpty: string;
  journalOpenSuffix: string;
  /** بدل سطر «المخاطرة (مفتوحة)» الغائب (`openRiskTotals` = null) حين السبب صفقة مفتوحة بلا وقف فقط — `{n}` عددها. العدد بعد النقطتين فلا صيغ جمع */
  journalOpenRiskNoStop: string;
  /** tools77a: بدل «المخاطرة (مفتوحة)» حين بين المفتوحة صفقة بحجم مجهول أو أداة بلا عقد معروف (BTCUSD، US30) — `{n}` عددها. العدد بعد النقطتين فلا صيغ جمع */
  journalOpenRiskUnknown: string;
  /** بدل «المخاطرة (مفتوحة)» الغائب حين صفقات مفتوحة أقدم لم تُحمَّل بعد (`journalOpenRiskComplete` = false، e81dfc3/tools103b) — لا رقم جزئي. بلا متغيّرات */
  journalOpenRiskPartial: string;
  /** سطر تحذير بالدفتر من `stackedCurrencyExposure` (صفقتان مفتوحتان أو أكثر بالاتجاه نفسه، بلا ساق معاكسة) — `{ccy}` العملة و`{n}` عدد الصفقات (مرّة واحدة لكلٍّ). العدد بعد النقطتين فلا صيغ جمع */
  journalExposureStacked: string;
  /** قبل الحفظ (`draftStackedExposure`): الصفقة المكتوبة لم تُفتح بعد، فـ«صفقات مفتوحة…: 3 (+1)» يعدّها مفتوحة — `{ccy}` و`{after}` العدد بعدها و`{before}` المفتوحة الآن. الأعداد بعد اسم لا قبله فلا صيغ جمع */
  journalExposureStackedDraft: string;
  journalClosedWord: string;
  journalCloseNeedsExit: string;
  journalDeleteConfirmTitle: string;
  journalDeleteFailedBody: string;
  journalDeleteA11y: string;
  journalEditBtn: string;
  journalEditA11y: string;
  journalEditingBanner: string;
  journalSaveEditBtn: string;
  journalCancelEdit: string;
  journalEditError: string;
  journalEditConflict: string;
  journalCloseLinkA11y: string;
  journalCloseLinkBtn: string;
  journalCloseMarketBtn: string;
  journalCloseMarketA11y: string;
  journalCloseMarketConfirmTitle: string;
  journalCloseMarketConfirmBody: string;
  /** عنوان تأكيد «إغلاق بسعر خانة الخروج» — سؤال، بدل `journalCloseLinkBtn` (اسم الزرّ) */
  journalCloseFieldConfirmTitle: string;
  journalCloseMarketConfirmBtn: string;
  journalCloseMarketNoQuote: string;
  /** «إغلاق بالسعر الحالي» على صفقة أُغلقت بجهاز آخر: القائمة تتحدّث بلا كتابة خروج (`closedElsewhere`) — هذا يشرح السبب. */
  journalClosedElsewhereTitle: string;
  journalClosedElsewhereBody: string;
  /** 409 `trade_changed_concurrently` على الإغلاق: عُدِّلت (لا أُغلقت) من جهاز آخر أثناء الإغلاق. */
  journalCloseConflictTitle: string;
  journalCloseConflictBody: string;
  backtestSub: string;
  backtestSymbolA11y: string;
  backtestStrategyA11yPrefix: string;
  backtestRunA11y: string;
  backtestRunBtn: string;
  backtestRunError: string;
  noLiveDataResult: string;
  backtestStatTrades: string;
  backtestStatWinRate: string;
  backtestStatReturn: string;
  backtestStatEquity: string;
  backtestStatDrawdown: string;
  backtestStatAvgWinLoss: string;
  /** طرفٌ واحد فقط: الخادم يرسل `avg_loss_pct`/`avg_win_pct` null حين لا خاسرة/لا رابحة (backend-r15a `2b0d3ee`). */
  backtestStatAvgWin: string;
  backtestStatAvgLoss: string;
  backtestNoTrades: string;
  backtestSmallSample: string;
  backtestSpreadNote: string;
  backtestTitle: string;
  backtestEquityTitle: string;
  backtestStratMaCross: string;
  backtestStratRsi: string;
  backtestStratMacd: string;
  backtestStratBb: string;
  indAlertsTitle: string;
  indAlertsSub: string;
  indAlertsSymbolA11y: string;
  indAlertsTypeA11yPrefix: string;
  indAlertsTypeRsi: string;
  indAlertsTypeMaCross: string;
  indAlertsTypeMacdCross: string;
  indAlertsBelowA11y: string;
  indAlertsAboveA11y: string;
  indAlertsBelowChip: string;
  indAlertsAboveChip: string;
  indAlertsThresholdA11y: string;
  indAlertsCrossUpA11y: string;
  indAlertsCrossDownA11y: string;
  indAlertsCrossUpChip: string;
  indAlertsCrossDownChip: string;
  indAlertsAddA11y: string;
  indAlertsAddBtn: string;
  indAlertsAddError: string;
  indAlertsLoadError: string;
  indAlertsEmpty: string;
  indAlertsDeleteConfirmTitle: string;
  indAlertsDeleteFailedTitle: string;
  indAlertsDeleteFailedBody: string;
  indAlertsDeleteA11yPrefix: string;
  indAlertsPushTitle: string;
  indAlertsTfLabel: string;
  indAlertsHintRsi: string;
  indAlertsHintMa: string;
  indAlertsHintMacd: string;
  indAlertsRsiRange: string;
  indAlertsSymbolInvalid: string;
  indAlertsArmed: string;
  indAlertsFiredTag: string;
  indAlertsRearmBtn: string;
  indAlertsRearmA11yPrefix: string;
  indAlertsRearmedMsg: string;
  indAlertsRearmFailed: string;
  indAlertsWatchingTag: string;
  /** عنوان `CalendarPanel` — بلا «· حي»: كان يُطبع ثابتاً فوق «التقويم غير متاح الآن…» وفوق أحداث من جلب قديم (`calStaleAsOf`)،
   * والتقويم يُجلب كل 5 دقائق (`RELOAD_MS`) لا بثّاً. حالة الحداثة تقولها الأسطر تحته. */
  calendarTitle: string;
  calendarCurrencyA11yPrefix: string;
  calendarAllWord: string;
  /**
   * عملة حدث ForexFactory `ALL` (اجتماعات G20 ونحوها) حيث تُعرض العملة: شريط خطر الأخبار (`newsBannerText`، منذ `b5c0fe8`
   * يطابق كل الأزواج) وشارة العملة بصفّ التقويم. غير `calendarAllWord` («الكل» زرّ فلتر لا وصف حدث).
   */
  newsAllCurrencies: string;
  calendarImpactA11yPrefix: string;
  calendarAllShort: string;
  calImpactMedPlus: string;
  calImpactMedPlusA11y: string;
  calendarLoading: string;
  calendarLoadError: string;
  calendarEmpty: string;
  layoutDefaultName: string;
  layoutFallbackName: string;
  layoutsTitle: string;
  layoutNamePlaceholder: string;
  layoutNameA11y: string;
  layoutSaveA11y: string;
  layoutSaveBtn: string;
  layoutApplyA11yPrefix: string;
  layoutDeleteConfirmTitle: string;
  layoutsHint: string;
  layoutCurrentTag: string;
  layoutSavedMsg: string;
  layoutBuiltinName: string;
  layoutDeleteA11yPrefix: string;
  coursesTitle: string;
  coursesSub: string;
  coursesStaleNote: string;
  coursesNoteTitle: string;
  coursesNoteText: string;
  coursesSchoolA11yPrefix: string;
  coursesLevelsWord: string;
  coursesLecturesUnitWord: string;
  coursesNarratedBadge: string;
  coursesFallbackNote: string;
  coursesLevelWord: string;
  coursesLectureA11yPrefix: string;
  coursesMinuteWord: string;
  coursesMinuteAbbrev: string;
  coursesBackToSchoolsA11y: string;
  coursesBack: string;
  coursesFallbackLevelTitle: string;
  coursesFallbackLectureTitle: string;
  coursesFallbackOutlineIntro: string;
  lectureClose: string;
  lectureCloseA11y: string;
  lectureLevelWord: string;
  lectureLoadFailedNote: string;
  lectureFullScreenTag: string;
  lectureVoicePausedForQ: string;
  lecturePreparingVoice: string;
  lectureExplainingNow: string;
  lectureVoicePlayError: string;
  lectureChartLabel: string;
  lectureHideChart: string;
  lectureHideChartA11y: string;
  lectureShowChart: string;
  /**
   * launch130: شارت القاعة بلا اتصال يرسم `mockSeries` (`LectureClassroom.tsx:90`) موسوماً «تجريبي» فقط. منذ `22ff26c` (chart) الرسم على
   * سلسلة تجريبية لا يُحفظ — بلا سطر يرسم الطالب خطوط الدرس ثم تختفي. سطر تحت الشارت حين `chartKind === 'demo'`؛ لا يَعِد بعودة تلقائية.
   */
  lectureChartPracticeNote: string;
  lectureVoiceStopped: string;
  lectureGenerating: string;
  lectureVoiceActive: string;
  lectureSegmentWord: string;
  lectureCompleteBadge: string;
  lectureClarifyTitle: string;
  lectureClarifyPausedLine: string;
  lectureClarifyQuestionLabel: string;
  lectureClarifyFocusLine: string;
  lectureResume: string;
  lecturePrev: string;
  lecturePrevA11y: string;
  lectureNext: string;
  lectureNextA11y: string;
  lectureInterruptLabel: string;
  lectureQuestionPlaceholder: string;
  lectureQuestionA11y: string;
  lectureAskBtn: string;
  lectureAskA11y: string;
  /**
   * launch124: محتوى `LectureClassroom` حين يفشل جلب المحاضرة. كان «محاضرة تجريبية» (20 د) يسرد جملة ICT/SMC عامّة أيّاً كانت المحاضرة
   * المطلوبة — المتعلّم يظنّه الدرس. الآن المقطعان يقولان ما حدث وما يفعله؛ مفاتيح الـoutline بأسمائها القديمة (Definition/Application)
   * تحمل «ماذا حدث/ماذا تفعل».
   */
  lectureFallbackTitle: string;
  lectureFallbackOutlineDefinition: string;
  lectureFallbackOutlineApplication: string;
  lectureFallbackTeacher: string;
  lectureFallbackSeg1Title: string;
  lectureFallbackSeg1Narration: string;
  lectureFallbackSeg2Title: string;
  lectureFallbackSeg2Narration: string;
  // TerminalScreen.tsx (شاشة الشارت، أولوية MVP الأولى) — 2026-09-18
  termShadowSizeSmall: string;
  termShadowSizeMedium: string;
  termShadowSizeBig: string;
  termServerOnline: string;
  termServerOffline: string;
  termLastPriceWord: string;
  termIndicatorsWord: string;
  termAlertWord: string;
  termKindWord: string;
  termFrameWord: string;
  termSquareWord: string;
  termRectWord: string;
  termLayoutSquareA11yPrefix: string;
  termLayoutRectA11yPrefix: string;
  termShadowFrameA11y: string;
  termShadowWord: string;
  termTimeSyncLabel: string;
  termTimeSyncUnavailable: string;
  termToolA11yPrefix: string;
  termChartKindA11yPrefix: string;
  termSymbolA11yPrefix: string;
  termManageWatchlistLabel: string;
  termManageWord: string;
  termPrimaryWord: string;
  termShadowHintText: string;
  termPrimaryTimeframeA11yPrefix: string;
  termOnWord: string;
  termOffWord: string;
  termTimeframeWord: string;
  termTimeframeA11yPrefix: string;
  termOpenFullscreenA11y: string;
  termFullscreenLabel: string;
  termFxMarketWord: string;
  termSpreadWord: string;
  termBidLabel: string;
  termAskLabel: string;
  termSquareFramesHintSuffix: string;
  termHintMoveText: string;
  termCloseWatchlistA11y: string;
  wlTitle: string;
  wlAddBtn: string;
  wlAddA11y: string;
  wlResetBtn: string;
  wlResetA11y: string;
  wlResetConfirmTitle: string;
  wlResetConfirmBody: string;
  wlResetConfirmBtn: string;
  wlSearchPlaceholder: string;
  wlLoadError: string;
  /** رسائل فشل مخازن الشارت غير الـReact — أسماء هذه المفاتيح هي نفسها رموز الحالة
   *  التي تُصدِرها layoutStore/chartTemplateStore/drawingStore/watchlistStoreCore،
   *  فطبقة العرض تترجم بـ`t[code]` مباشرة. أي تغيير باسم مفتاح هنا يلزمه تغيير الرمز هناك. */
  layoutSaveFailed: string;
  layoutDeleteFailed: string;
  chartTemplateSaveFailed: string;
  drawingsSaveFailed: string;
  drawingsDeleteFailed: string;
  wlSaveFailed: string;
  wlRetryA11y: string;
  wlRetryBtn: string;
  wlLoadingWord: string;
  wlEmpty: string;
  wlAddEmptyBtn: string;
  wlDemoPriceA11ySuffix: string;
  wlDemoTag: string;
  wlMoveUpA11y: string;
  wlMoveDownA11y: string;
  wlRemoveA11y: string;
  wlRemoveConfirmTitle: string;
  wlRemoveConfirmBtn: string;
  wlCatalogTitle: string;
  wlCatalogAllAdded: string;
  wlCatalogCloseA11y: string;
  focusSymbolA11yPrefix: string;
  focusVsWord: string;
  focusPhoneSubHint: string;
  focusDesktopSub: string;
  focusLastPriceWord: string;
  focusWatchlistTitle: string;
  focusCompareHint: string;
  focusCompareTag: string;
  focusPickSymbolA11yPrefix: string;
  focusCompareNotePrefix: string;
  focusCompareNoteSuffix: string;
  focusCompareUnavailable: string;
  focusInComparisonSuffix: string;
  focusAlertCreateFailedTitle: string;
  focusAlertCreateFailedBody: string;
  focusAlertFromDrawingNote: string;
  focusAlertFromChartNote: string;
  gridFramesWord: string;
  gridSquaresWord: string;
  gridSquaresA11y: string;
  /** مقبض النقاط التسع بزاوية كل فريم (`FrameSizedGrid` `handleBar`) — كان بلا تسمية (DESIGN-PRO §4). */
  gridHandleA11y: string;
  /** قيمة المقبض القابل للضبط (`accessibilityValue.text`): بلا `text` يحوّل iOS ‏min/max/now نسبةً («33 percent»، والأخير «133 percent»). `{n}` `{total}` */
  gridHandlePosA11y: string;
  gridRectanglesWord: string;
  gridRectanglesA11y: string;
  quadCloseA11y: string;
  quadTitlePrefix: string;
  spmCloseA11y: string;
  spmOpenA11y: string;
  spmPanelTitle: string;
  panSpeedMarkA11y: string;
  panTapDetailsSuffix: string;
  panHideDetailsA11y: string;
  panChartSpeedPrefix: string;
  lensA11yPrefix: string;
  drawToolA11yPrefix: string;
  lensSectionTitle: string;
  ctlKindCandles: string;
  ctlKindHollow: string;
  ctlKindHeikin: string;
  ctlKindBars: string;
  ctlKindLine: string;
  ctlKindArea: string;
  ctlKindBaseline: string;
  ctlKindRange: string;
  ctlKindRenko: string;
  ctlKindKagi: string;
  /** Point & Figure — الشريحة كانت «P&F» اللاتينية وقارئ الشاشة يقرؤها «P and F». */
  ctlKindPnf: string;
  /** Line Break (3 خطوط، كـTradingView) — مُعَدّ لطلب chart run 26 «يحتاج مفاتيح i18n»؛ غير موصول بعد */
  ctlKindLineBreak: string;
  /** أوّل شريحة بشريط الرسم: لا أداة رسم (الشارت يُسحب ويُكبَّر). بالعربية «بلا رسم» لا «مؤشر» — «مؤشر» بكل التطبيق = indicator وقائمة «المؤشرات» بالشارت نفسه. */
  ctlToolNone: string;
  ctlToolSelect: string;
  ctlToolTrend: string;
  ctlToolRay: string;
  ctlToolHline: string;
  ctlToolVline: string;
  ctlToolRect: string;
  ctlToolFib: string;
  ctlToolZone: string;
  ctlToolNote: string;
  ctlToolMeasure: string;
  /** أداتا مركز الشراء/البيع على الشارت (دخول، وقف، هدف) — «شراء» وحدها بشريط أدوات تُقرأ زرَّ أمر؛ هذه رسمة تخطيط لا صفقة */
  ctlToolLong: string;
  ctlToolShort: string;
  /** شعاع أفقي (`hray`) — يُغني عن `EXTRA_TOOL_LABELS` بـ`chart/typeLabels.ts` */
  ctlToolHray: string;
  /** قناة متوازية (`channel`) */
  ctlToolChannel: string;
  ctlLensClean: string;
  ctlLensCleanHint: string;
  ctlLensStructure: string;
  ctlLensStructureHint: string;
  ctlLensMomentum: string;
  ctlLensMomentumHint: string;
  ctlLensLiquidity: string;
  ctlLensLiquidityHint: string;
  ctlIndBollinger: string;
  ctlIndVolume: string;
  backtestWord: string;
  depthWord: string;
  mspDrawTitle: string;
  mspIndicatorsTitle: string;
  mspKindsTitle: string;
  mspAlertsTitle: string;
  mspIndAlertsTitle: string;
  mspCalendarTitle: string;
  mspScreenerTitle: string;
  mspReportsTitle: string;
  mspBacktestTitle: string;
  mspNewsTitle: string;
  mspDomTitle: string;
  mspJournalTitle: string;
  mspIndicatorA11yPrefix: string;
  mspIndicatorEnabledSuffix: string;
  mspKindA11yPrefix: string;
  dockDrawTab: string;
  dockSignalsTab: string;
  dockAnalystsTab: string;
  dockSocialTab: string;
  dockIndForecastTab: string;
  dockScreenerTab: string;
  dockAlertsTab: string;
  dockNewsTab: string;
  dockCommunityTab: string;
  dockHideBtn: string;
  dockHideA11yPrefix: string;
  dockPanelFallback: string;
  dockLibraryFallback: string;
  /** DESIGN-PRO §5.4: the 5-entry dock's overflow entry */
  dockMoreTab: string;
  dockMoreA11y: string;
  dockDrawToolSectionTitle: string;
  dockTabA11yPrefix: string;
  railDrawSectionTitle: string;
  railPanelsSectionTitle: string;
  railPanelA11yPrefix: string;
  railTipAlert: string;
  railTipIndicator: string;
  railTipReport: string;
  railTipNewsItem: string;
  railOpenQuadA11y: string;
  cfSyncLeaderBadge: string;
  cfSyncPartialBadge: string;
  cfSyncFollowBadge: string;
  cfSubtitleInteractive: string;
  cfSubtitleNavigate: string;
  cfSubtitleDefault: string;
  /** يسبق اسم الرمز: إجراء مخصّص (جوال) أو زرّ (ويب) يجعل إطاراً تابعاً قائد الزمن — المزامنة مفعّلة أصلاً حين يظهر */
  cfSyncActivateA11yPrefix: string;
  cfChangeSymbolA11y: string;
  /**
   * نسبة رأس الإطار (`ChartFrame`/`QuadChartModal`/`FocusChartModal`) — منذ `8aeaf13` يصلها VoiceOver منفردة، فيسمع «+0.12%»
   * بلا سياق أو «—» كعلامة ترقيم. `{pct}` = `formatPct`. `…NoneA11y` حين تُطبع «—» (لا إغلاق أمس، أو سعر لا تُحسب منه النسبة `63c38f8`).
   */
  cfDayChangeA11y: string;
  cfDayChangeNoneA11y: string;
  cfMarketClosedA11y: string;
  /** «⏪» بجانب سعر الرأس بالإعادة — `mcReplayModeA11y` («وضع الإعادة») لا يقول إن السعر المقروء ليس الحيّ */
  cfReplayPriceA11y: string;
  cfMarketClosedTag: string;
  /** قارئ الشاشة لوسم السبريد برأس الإطار (`ChartFrame`، launch111) — يُقرأ ما يظهر فقط — `{bid}` `{ask}` */
  cfSpreadBidAskA11y: string;
  /** `{pips}` بالصيغة المعروضة (`toFixed(1)`) — يُلحق بـ`cfSpreadBidAskA11y` بفاصلة، أو وحده (الهاتف/السعر القديم) */
  cfSpreadPipsA11y: string;
  // Shared chart/dataSource.ts + chart/marketHours.ts labels (ChartFrame/TerminalScreen/FocusChartModal) — 2026-09-18
  dsKindProvider: string;
  dsKindDemo: string;
  dsKindCache: string;
  dsKindUnknown: string;
  dsTickLive: string;
  dsTickDemo: string;
  dsLastPriceWord: string;
  dsMarketOpen: string;
  dsMarketClosed: string;
  // chart/MatrixChart.tsx — نصوص الشارت والمرسى (i18n الشارت، 2026-09-20)
  mcMonths: string[];
  /** 7 أسماء أيام قصيرة مرتّبة كـ`Date.getUTCDay()`: [0] = الأحد … [6] = السبت. لوسم زمن مثل «الجمعة 25 سبتمبر 14:00». */
  mcWeekdays: string[];
  mcPrimaryLane: string;
  mcMeasureBarsWord: string;
  /** لواحق مدّة سطر القياس (`measureDurationText`): `{m}`/`{h}`/`{d}` تُلصق بالعدد كما هي — المسافة جزء منها بالعربية والكردية. */
  mcMeasureDurUnits: { m: string; h: string; d: string };
  mcNoteDefault: string;
  /** خانة تحرير نصّ الملاحظة المحدَّدة على الشارت (`MatrixChart` `noteEdit-…`): اسمها لقارئ الشاشة — `mcNoteDefault` وحدها تُقرأ «ملاحظة» بلا ما يدلّ أنها خانة للكتابة. */
  mcNoteTextA11y: string;
  /** سطر التلميح حين المحدَّد ملاحظة: لا «مقبض طرف» لها (نقطة واحدة)، وخانة النصّ تحتها هي الجديد. `…Web` لسطح المكتب. */
  mcHintNoteSelected: string;
  mcHintNoteSelectedWeb: string;
  mcSnapshotSaved: string;
  mcSnapshotFailed: string;
  mcTemplateDefaultName: string;
  mcTemplateSaved: string;
  mcClearAllTitle: string;
  mcClearAllBody: string;
  mcClearWord: string;
  mcHintDraw: string;
  mcHintNavigate: string;
  /** الويب بالفأرة: المعاينة بالمرور، النقر يثبّت، ←/→ و Esc بعد التثبيت. واختصارات Alt (`WEB_TOOL_HOTKEYS` و`KeyR`
   * بـ`MatrixChart.tsx`) — لا تلميح غيره يذكرها، فبلا هذا السطر لا يعرف بها أحد. أسماء الأدوات = `ctlToolTrend/Hline/Vline/Fib`. */
  mcHintNavigateWeb: string;
  /** الويب بالفأرة وأداة رسم نشطة: Esc يلغي النقطة الأولى ثم يغادر الأداة، Ctrl/⌘+Z يتراجع وCtrl+Y أو Ctrl/⌘+Shift+Z يعيد (`c1fa634`)، Alt+حرف يبدّل الأداة. */
  mcHintDrawWeb: string;
  /** الويب ورسم محدَّد: Delete/Backspace يحذفه (قابل للتراجع)، Esc يلغي التحديد، والأسهم تُزيحه (↑/↓ pip، ←/→ شمعة، Shift ×10 — `b734ced`). */
  mcHintSelectedWeb: string;
  /** أداة «تحديد» ولا رسم محدَّد: اللمس على رسم يحدّده، وعلى فراغ يلغي التحديد (`hitDrawing`). */
  mcHintSelect: string;
  /** أداة «تحديد» ورسم محدَّد (الهاتف): جسمه يحرّكه كلّه (`translateDrawing`)، المقبض يحرّك طرفه. */
  mcHintSelected: string;
  /** زرّ AUTO بزاوية المحورين لقارئ الشاشة: يعيد مقياس السعر وعدد الشموع ويرجع لآخر شمعة. */
  mcAutoA11y: string;
  /** AUTO ممتلئ حين مقياس السعر يدوي (مطّ المحور أو سحب رأسي) — يشرح لماذا قد تختفي شمعة جديدة. */
  mcAutoManualA11y: string;
  /**
   * نصّ زرّ AUTO الظاهر بزاوية المحورين (QA67): كان «AUTO» ثابتاً بالعربية والكردية. كلمة واحدة قصيرة لأن
   * الزاوية بعرض محور السعر وخطّ 8 — لا جملة. الشرح الكامل بـ`mcAutoA11y`.
   */
  mcAutoShort: string;
  /** مفتاح (switch) «رأس السهم» على خطّ الترند المحدَّد (chart-r37، `4e53e39`): الحالة (مفعّل/لا) يقرؤها قارئ الشاشة من `accessibilityState` — فالنصّ اسمٌ لا فعل. */
  mcArrowHeadA11y: string;
  /** خطّ التنبيه المسلَّح على الشارت (`c34f991`، «🔔 ▲ السعر · pip») لقارئ الشاشة: {price} بمنازل الشارت، {dist} نصّ `signedDistanceText`
   * أو يُحذف مع « — » قبله حين لا سعر حالي. Above = `condition: 'above'`. */
  mcArmedAlertAboveA11y: string;
  mcArmedAlertBelowA11y: string;
  /** سحب خطّ التنبيه فشل (`moveArmedAlert` ⇒ `false`: خادم أقدم بلا PATCH، تنبيه حُذف، انقطاع) — الخطّ يعود لمكانه بلا تفسير
   * بدونه. {price} = السعر الأصلي بمنازل الشارت (`fmtPrice(al.price)`). يُمرَّر لـ`notify` كـ`mcSnapshotFailed`. */
  mcAlertMoveFailed: string;
  /** تلميح قارئ الشاشة على خطّ التنبيه المسلَّح بعد `76a0834` (`accessibilityRole="adjustable"`): بلا تلميح يسمع «قابل للتعديل» ولا يعرف
   * أنّ السحب لأعلى/لأسفل **ينقل التنبيه على الخادم** ولا يغيّر عرضاً فقط، ولا حجم الخطوة، ولا متى يُحفظ (`flushAlertNudge` بعد 900ms). */
  mcArmedAlertAdjustHint: string;
  /** وسم بين قوسين بعد اسم لوحة مشتقّة من شكل الشمعة لا من تدفّق أوامر حقيقي — «CVD (تقديري)». قصير: يُطبع برأس اللوحة. */
  mcEstimatedTag: string;
  /** شرح «≈»/«تقديري» بلوحات الحجم حين السلسلة بلا فوليوم (الفوركس، `seriesHasVolume` = false): الأعمدة من مدى كل شمعة نسبةً لسعرها (`estimatedVolume`) ⇒ OBV/MFI/VWAP/Klinger/CMF من التقدير نفسه ولا تطابق حجم التيك بمنصّة أخرى. */
  mcVolEstimatedHint: string;
  mcZoomOutA11y: string;
  mcZoomInA11y: string;
  mcPanBackA11y: string;
  mcPanForwardA11y: string;
  mcReplayModeA11y: string;
  /** سطر القراءة أثناء الإعادة: `{n}` الشموع المعروضة من `{total}`. بديل «Bar Replay» الثابت (اسم ميزة منافس). */
  mcReplayReadout: string;
  /** سطر قصير حين يُنهي تبديل الفريم أو الرمز الإعادة (`7c24e7e`) — كانت تنتهي بصمت فيبدو الشارت كأنه قفز للحيّ بلا سبب */
  mcReplayEndedOnSwitch: string;
  mcReplayStepBackA11y: string;
  mcReplayPauseA11y: string;
  mcReplayPlayA11y: string;
  mcReplayStepFwdA11y: string;
  mcMagnetA11y: string;
  mcDockTitle: string;
  mcNoPineLine: string;
  mcExportPng: string;
  mcSaveTemplate: string;
  mcAlertLine: string;
  mcAlertZone: string;
  mcAlertAtLineLevel: string;
  mcAlertAtCrossA11y: string;
  // chart/typeLabels.ts chartExtraLabels ← هنا (طلب وكيل الشارت). mcMeasureBarOne/Two: صيغتا المفرد والمثنّى لعدّ القياس (barsCountText)
  mcUndo: string;
  mcUndoA11y: string;
  mcNothingToUndo: string;
  /** زرّ «إعادة» بجانب «تراجع» (طلب chart-r60) — ومعه نصّ قارئ الشاشة، و`mcNothingToRedo` للحالة المعطّلة كنظير `mcNothingToUndo` */
  mcRedo: string;
  mcRedoA11y: string;
  mcNothingToRedo: string;
  /** قارئ الشاشة لزرّ «»» (العودة لآخر شمعة) — كان `chartExtraLabels(lang).toLatest` بـ`typeLabels.ts` */
  mcToLatestA11y: string;
  /** زرّ إخفاء كل الرسومات (`drawingsHidden`) — كان `chartExtraLabels(lang).hideDrawings` بـ`typeLabels.ts` */
  mcHideDrawings: string;
  /** الزرّ نفسه والرسومات مخفيّة؛ المستدعي يضيف «(n)» */
  mcShowDrawings: string;
  /** قارئ الشاشة لزرّ «Log» (النصّ الظاهر يبقى «Log» اللاتيني) — كان `chartLocalLabels(lang).logScaleA11y` بـ`typeLabels.ts` */
  mcLogScaleA11y: string;
  /** قارئ الشاشة لزرّ مقياس النسبة المئوية («%» ظاهر) — كـTradingView: التغيّر من أول شمعة ظاهرة؛ مُعَدّ لطلب chart run 26، غير موصول */
  mcPercentScaleA11y: string;
  /** شريحة انحراف ZigZag (`2973909`) — بدل «ZigZag 5% → 10%» الحرفي الذي يقرأ السهم؛ `{pct}` الحالي و`{next}` التالي بالدورة */
  mcZigzagDevA11y: string;
  /** شريحة عدد خطوط الانعكاس بـLine Break (`9b1c2ba`، تدور 2→3→4) — بدل «Line break 3 → 4» الحرفي؛ `{count}` الحالي و`{next}` التالي */
  mcLineBreakCountA11y: string;
  /** قفل الرسم المحدَّد (كقفل TradingView): المقفول لا يُسحب ولا تتحرّك مقابضه بلمسة عابرة على الهاتف. */
  mcLockDrawing: string;
  mcUnlockDrawing: string;
  mcLockDrawingA11y: string;
  /** يظهر حين يحاول المستخدم سحب رسم مقفول. */
  mcDrawingLockedHint: string;
  /**
   * زرّ لون الرسم المحدَّد (`85dcbf6`، بدل `drawColorLabels` المؤقّتة بـ`typeLabels.ts`): الكلمة تحت الأيقونة، والوصف يسمّي اللون الحالي
   * `{color}` ← `mcColorNames[i]` بترتيب `drawPalette` (تمييز الإطار، أخضر، أحمر، برتقالي، أزرق، أبيض) — فلا تبقى الحالة لونية فقط
   */
  mcDrawColorWord: string;
  mcDrawColorA11y: string;
  /** زرّ «نسخ الرسم» (Clone) بشريط الرسم المحدَّد — طلب chart12: الكلمة تحت الأيقونة + وصف قارئ الشاشة */
  mcCloneDrawing: string;
  mcCloneDrawingA11y: string;
  /**
   * أزرار إزاحة الرسم المحدَّد بالهاتف (طلب chart15 — نظير أسهم لوحة المفاتيح `arrowNudge`/`nudgePipPrice` بـ`drawEdit.ts`):
   * ↑/↓ خطوة سعر (pip للأزواج والمعادن)، ‹/› شمعة. «أبكر/أحدث» لا «يسار/يمين» كي لا يلتبس الاتجاه بالعربية والكردية (RTL).
   */
  mcNudgeUpA11y: string;
  mcNudgeDownA11y: string;
  mcNudgeEarlierA11y: string;
  mcNudgeLaterA11y: string;
  mcColorNames: [string, string, string, string, string, string];
  /** عنوان نافذة المشاركة (`Sharing.shareAsync` dialogTitle) — كان `chartLocalLabels(lang).shareDialogTitle` */
  mcShareDialogTitle: string;
  /** أسماء الجلسات فوق تظليل مؤشّر «Sessions» — كانت `chartLocalLabels(lang).sessions` */
  mcSessTokyo: string;
  mcSessLondon: string;
  mcSessNewYork: string;
  mcPanesCollapsed: string;
  mcPanesCollapsedA11y: string;
  mcPanesPageA11y: string;
  mcSwitching: string;
  mcSwitchingA11y: string;
  mcSyncTimeOn: string;
  mcSyncTimeOff: string;
  mcSyncLeadHint: string;
  mcSyncToggleA11y: string;
  mcMeasureBarOne: string;
  mcMeasureBarTwo: string;
  // components/SymbolSearchBar.tsx + ScreenerMini.tsx + DomLitePanel.tsx + PairDrumWheel.tsx
  // (i18n طبقة أدوات شاشة الشارت، 2026-09-21)
  ssbPlaceholder: string;
  /**
   * البحث فشل (شبكة أو خطأ خادم — 503 «Twelve Data not configured» يصل هنا أيضاً، launch135): لا يُلقى على اتصال
   * المستخدم وحده — السببان كلاهما، والعمل واحد (المحاولة بعد قليل). لا «اختر من القائمة»: بقائمة المتابعة القائمة تحت الحقل هي ما أُضيف أصلاً.
   */
  ssbError: string;
  /** بحث نجح بلا نتيجة (`results` فارغة، `q` ≥ حرفين) — كان الشريط صامتاً فيُظنّ أنه لم يعمل. `{q}` نصّ البحث. */
  ssbNoMatch: string;
  /**
   * صفّ من `ambiguous` (backend-r46، `/api/symbols/search`): الرمز نفسه مدرج بعدّة بورصات، والتطبيق يرسم `symbol` وحده
   * فيختار المزوّد الإدراج — «AAPL · BMV» كان يرسم ناسداك بالدولار، و«SHEL · PSX» شركة أخرى. يُعرض غير قابل للضغط تحت الاسم.
   */
  ssbAmbiguousTag: string;
  /** `results` فارغة و`ambiguous` ممتلئة: بدل `ssbNoMatch` («لا رمز» كاذبة — الرمز موجود لكن لا نرسمه بعد). `{q}` نصّ البحث. */
  ssbOnlyAmbiguous: string;
  ssbPickA11yPrefix: string;
  smnTitle: string;
  smnFilterMomentum: string;
  smnA11yMaCross: string;
  smnA11yRsiOversold: string;
  smnA11yBullish: string;
  domTitle: string;
  domBidLabel: string;
  domAskLabel: string;
  domSpreadLabel: string;
  domBidAskHint: string;
  domNoBidAsk: string;
  domNoLiveQuote: string;
  domOtcNote: string;
  pdwPrevA11yPrefix: string;
  pdwCurrentA11yPrefix: string;
  pdwNextA11yPrefix: string;
  /**
   * شريحة الإطار الزمني بـ`TimeframeBar` حسب اللغة — بدل `TIMEFRAME_LABELS` العربي الثابت بـ`timeframes.ts` الذي يراه الكردي أيضاً
   * (`arabic={rtl}` و`isRtl('ku')` = true). الإنجليزية والكردية بالرموز اللاتينية كما بمنصّة الوسيط (1m/1H)؛ العربية كما هي اليوم حرفياً.
   */
  tfLabels: Record<Timeframe, string>;
  /** ما يقرؤه قارئ الشاشة بعد `termTimeframeA11yPrefix` — كلمات كاملة لا «1H» */
  tfLabelsA11y: Record<Timeframe, string>;
  /** باقات الاشتراك — يُقرأ كاملاً كـ`t.subPlans` بدل `COPY[lang]` بـ`SubscriptionPlansPanel.tsx` */
  subPlans: SubPlansCopy;
  // CommissionPlanPanel (cpp) + NetworkTreePanel (ntp) + TreeDiagramSketch (tds) + AccountScreen — كانت عربية ثابتة بلا useI18n (طلب QA2).
  // أدوار جدول المستويات: `t.trader`، و`[t.trainer, t.broker, t.agent, t.company].join('/')`؛ «يسار/يمين» = `t.left`/`t.right`؛ «تحديث» = `t.refreshBtn`.
  cppOpenA11y: string;
  cppCloseA11y: string;
  cppTitle: string;
  cppSubOpen: string;
  cppSubClosed: string;
  cppLiveError: string;
  cppTableCommissions: string;
  cppColType: string;
  cppColCondition: string;
  cppColPoints: string;
  cppTableLevels: string;
  cppColRole: string;
  cppColLevels: string;
  cppTableMonthly: string;
  cppColMonth: string;
  cppColDirect: string;
  cppColBalance: string;
  cppColTotal: string;
  cppNoEarnings: string;
  /**
   * ui58a: خطة العمولات حُمّلت وتقرير الأرباح فشل (مهلة/5xx، لا 401 الزائر) — كان الجدول يقول «لا أرباح مسجّلة بعد» لمن له أرباح.
   * يذكر زرّ `refreshBtn` بتسميته في كل لغة.
   */
  cppEarningsLoadError: string;
  cppBasisNote: string;
  cppTypeDirect: string;
  cppTypeBalance: string;
  cppTypeActiveBalanced: string;
  cppTypeActiveUnbalanced: string;
  cppCondNewMember: string;
  cppCondBalanced: string;
  cppCondUnbalanced: string;
  ntpNamePlaceholder: string;
  ntpNameA11y: string;
  ntpConfirmA11y: string;
  ntpLevelTitle: string;
  ntpNewBranches: string;
  ntpLoadError: string;
  ntpPlaceError: string;
  ntpOpenA11y: string;
  ntpCloseA11y: string;
  ntpTitle: string;
  ntpSubLive: string;
  ntpSubPreview: string;
  ntpSubClosed: string;
  ntpYou: string;
  ntpGuestHint: string;
  ntpLevelBranches: string;
  ntpTrunkHint: string;
  ntpYouRoot: string;
  tdsCaption: string;
  tdsLevel: string;
  tdsLevelOne: string;
  tdsRootBottom: string;
  tdsFootnote: string;
  accNetLoadError: string;
  /** سطر بالحساب يعيد الجولة الترحيبية (`matrix.onboarding.v1`) لمن تخطّاها. */
  accReplayTour: string;
  accReplayTourA11y: string;
  /**
   * قارئ الشاشة لأي زرّ يعرض «...» أثناء الانتظار (10 مواضع: AccountScreen ×3، TradeJournalPanel ×2، AlertsPanel ×2،
   * PositionSizePanel ×2، NetworkTreePanel «…»): `accessibilityLabel={busy ? t.a11yBusy : <النصّ>}` مع `accessibilityState={{ busy }}`.
   * وسم رقائق AccountScreen يُركَّب من مفاتيح موجودة: `${t.language}: ${l.label}`، `${t.underSponsor}: ${t.left}`.
   */
  a11yBusy: string;
  /**
   * عقود الخادم الجديدة (backend-r1، COORDINATION). لا شيء منها موصول بعد:
   * `calendarUnavailable` — `/api/calendar` `status: "unavailable"` مع `events: []` (بدل `calendarEmpty` الذي يلوم الفلتر)؛
   * `sigLevels*` — `levels: null` مع `levels_basis.unavailable` = `no_live_price` | `not_enough_candles` | `neutral`؛
   * `journalStatBreakeven` — `stats.breakeven_count` (التعادل ليس خسارة ولا يدخل نسبة النجاح)؛
   * `journalShownOfTotal`/`journalLoadOlder` — `/api/trades` `total`/`limit`/`offset` بدل `journalCappedNote`؛
   * `journalSizeUnknown` — `size: null` (لم يُكتب حجم)؛
   * `journalLoadOlderError` — فشل «تحميل الأقدم» (tools69): الزرّ نفسه يعيد المحاولة والقائمة المعروضة سليمة، لذلك لا جملة إعادة المحاولة كـ`journalLoadErrorRetry`.
   */
  calendarUnavailable: string;
  sigLevelsUnavailableNoPrice: string;
  sigLevelsUnavailableFewCandles: string;
  /** backend-r37 `atr_exceeds_price`: الوقف أو الهدف سيكون سعراً ≤ 0 */
  sigLevelsUnavailableAtrWide: string;
  sigLevelsUnavailableNeutral: string;
  /** backend-r54 `no_range`: سلسلة كاملة بلا حركة (ATR = 0) — ليست «شموع قليلة» */
  sigLevelsUnavailableNoRange: string;
  /** backend `80d4193`: المدى (ATR) دون نصف تسعيرة (زوج مربوط كـUSDSAR على 1m) ⇒ الوقف/الهدف يُقرَّب على الدخول نفسه — صفقة بلا مخاطرة */
  sigLevelsUnavailableAtrBelowTick: string;
  journalStatBreakeven: string;
  journalShownOfTotal: string;
  journalLoadOlder: string;
  journalSizeUnknown: string;
  journalLoadOlderError: string;
  /**
   * فشل تحميل الدفتر مع زرّ «إعادة المحاولة» (launch140 → tools، موصول `TradeJournalPanel.tsx`). `journalLoadError`
   * («غادر وارجع») حُذف: لم يعد يُعرض منذ رُبط الزرّ.
   */
  journalRetryBtn: string;
  journalLoadErrorRetry: string;
  /**
   * backend-r2: لا مصدر مرخَّص للمحلّلين ولا لقنوات التواصل — `/api/signals/analysts/*` و`/social/consensus` يعيدان
   * `status: "unavailable"`، `unavailable_reason: "no_licensed_feed"`، `direction`/`levels` = null. يُعرض النصّ بدل القائمة
   * والاتجاه (لا «محايد»، لا «null»). `analystsSubSuffix`/`socialPickHint` صارا يقولان «لا مصدر مرخَّص بعد» (launch103) بدل «محاكاة للعرض».
   */
  analystsUnavailable: string;
  socialUnavailable: string;
  /**
   * tools67: سعر تحويل مكتوب باليد مقلوب يقيناً (USDJPY 0.0067). `{typed}` ما كتبه، `{pair}` الزوج، `{likely}` = 1 ÷ المكتوب.
   * كل موضع مرة واحدة فقط — يكفي `.replace` لكل منها (لا `replaceAll`).
   */
  riskCalcConvInverted: string;
  /**
   * backend-r3 (launch104). لا شيء موصول بعد:
   * `impactHoliday` — `/api/calendar` `impact: "holiday"` (عطلة بنوك ForexFactory) بـ`CalendarPanel` (ui3)؛ `none`/`unknown` بلا كلمة.
   * `newsHolidayToday` — سطر شريط الأخبار (`NewsRiskBanner` `HOLIDAY_COPY`، tools): `{ccy}` العملات مفصولة «/»، `{title}` = « · عنوان» أو فارغ. كلٌّ مرة واحدة.
   * `backtestBeforeCosts` — `stats.costs_included === false` (DXY، الرقمية، والناشئة والمجهولة منذ `d18ff23`): النتيجة قبل السبريد والعمولة (بدل الصمت).
   * `forecastDetail` — `votes[].detail_code` ⇒ قالب، والقيم من `detail_values` بالأسماء نفسها (`{rsi}`، `{fast}`، `{slow}`، `{macd}`،
   *   `{signal}`، `{pos}`، `{k}`، `{pct}`)؛ القائمة = `signal_hub._DETAIL_TEXT`. رمز غير معروف ⇒ اعرض `detail` الخادم كما هو.
   * `forecastVoteNames` — مفاتيح `_VOTE_NAMES`. الخادم يرسل `votes[].id` لا مفتاح الاسم: `id` = المفتاح نفسه، إلا `ma` فهو
   *   `ma_cross` حين `detail_code` يبدأ بـ`ma_cross_` وإلا `ma_trend`.
   * `forecastDisclaimer*` — `disclaimer_code`: `indicator_consensus` | `not_enough_data` (chart-r35).
   * `dsKindUnavailable` — `DataOriginKind` `'unavailable'` (ui3/chart-r35) للوسم القصير (ووسم حالة الشارت الرئيسي لـDXY، `b1d1adb`).
   */
  impactHoliday: string;
  newsHolidayToday: string;
  backtestBeforeCosts: string;
  forecastDetail: {
    rsi_overbought: string;
    rsi_oversold: string;
    rsi_bullish: string;
    rsi_bearish: string;
    rsi_neutral: string;
    ma_cross_up: string;
    ma_cross_down: string;
    ma_above: string;
    ma_below: string;
    macd_cross_up: string;
    macd_cross_down: string;
    macd_above: string;
    macd_below: string;
    bb_upper: string;
    bb_lower: string;
    bb_position: string;
    stoch_k: string;
    trend_slope: string;
  };
  forecastVoteNames: { rsi: string; ma_cross: string; ma_trend: string; macd: string; bb: string; stoch: string; trend: string };
  forecastDisclaimerConsensus: string;
  forecastDisclaimerNoData: string;
  /** backend-r54 `disclaimer_code: no_movement` — الخادم يرسل ar/en فقط */
  forecastDisclaimerNoMovement: string;
  dsKindUnavailable: string;
  /**
   * backend-r19: خانة شارت لرمز لا يقدّمه المزوّد (`unavailable_reason: "not_offered_by_provider"`، DXY) — مكان الشارت
   * بدل شموع البذرة. `{symbol}` = الرمز. الجسم يقول ما العمل: اسم الرمز ▾ فوق الشارت — برأس الإطار بالشبكة (`ChartFrame`
   * `onSymbolChange`) وبالشريط العلوي للشارت الرئيسي (`SymbolPairMenu`، `TerminalScreen`). launch119: حُذف `originUnavailableProvider`
   * («الرسم مولَّد للعرض») — آخر مستعمل له أُزيل بـ`b1d1adb`.
   */
  chartNotOfferedTitle: string;
  chartNotOfferedBody: string;
  /**
   * launch119: `MatrixChart` بسلسلة `candles: []` ليست «غير متاح» (`da73ec6`) يرسم لوحاً فارغاً صامتاً — هذا نصّه (للـchart).
   * `{symbol}` و`{tf}` كلٌّ مرة واحدة؛ `{tf}` = `t.tfLabels[tf]` للنصّ و`t.tfLabelsA11y[tf]` للـlabel، لا المعرّف الخام
   * (`'15m'`/`'D'` ⇒ «على فريم D» بالعربية؛ launch120). لا يَعِد بسبب محدَّد: قد يكون المزوّد لم يُرجع شيئاً أو الرمز جديداً.
   */
  chartNoCandlesTitle: string;
  chartNoCandlesBody: string;
  /**
   * launch119 (chart-r47 c، tools): أوّل جلب لـ(رمز، فريم) بلا سلسلة سابقة بالذاكرة — مكان الشارت بدل شموع البذرة حول 1.0854.
   * `mcSwitching*` يبقى للتبديل **مع** بيانات سابقة معروضة (نصّه القارئ يقول ذلك). `{symbol}` و`{tf}` كلٌّ مرة واحدة؛
   * `{tf}` = `t.tfLabels[tf]` للنصّ الظاهر و`t.tfLabelsA11y[tf]` للـlabel (launch120).
   */
  chartFirstLoad: string;
  /**
   * launch120 (قبل backend-r22): `unavailable_reason: "provider_unavailable"` — رمز يقدّمه المزوّد لكن الجلب تعذّر (429 بلا كاش،
   * انقطاع، بلا مفتاح) فيصل `candles: []`. `chartNotOffered*` («غير متاح من المزوّد») كاذب هنا لـEURUSD. لا يَعِد بموعد عودة
   * ولا بتحديث تلقائي (لم أجد إعادة محاولة مضمونة). `{symbol}` مرة واحدة. للـui (`ProviderUnavailableNotice` يفرّع على السبب).
   */
  chartProviderDownTitle: string;
  chartProviderDownBody: string;
  /**
   * launch121: لا ردّ من خادم MATRIX أصلاً (بلا إنترنت، الخادم متوقّف) — غير `chartProviderDown*` (الخادم ردّ والمزوّد تعذّر).
   * الخادم لم يعد يرسم بذرة لأي رمز (backend-r22 `8ff0a7c`) لكن التطبيق ما زال يرسم `mockSeries` حول أسعار 2024 عند فشل الطلب
   * (`offlineFrame` بـ`TerminalScreen`، `QuadChartModal`) ⇒ نصّ يقول أين المشكلة وما العمل. لا يَعِد بتحديث تلقائي. `{symbol}` مرة.
   */
  chartServerUnreachableTitle: string;
  chartServerUnreachableBody: string;
};

export const LANGS: { id: LangId; label: string; rtl: boolean }[] = [
  { id: 'ar', label: 'العربية', rtl: true },
  { id: 'en-US', label: 'English (US)', rtl: false },
  { id: 'en-GB', label: 'English (UK)', rtl: false },
  { id: 'ku', label: 'کوردی', rtl: true },
];

const ar: Dict = {
  accountTitle: 'حساب MATRIX',
  accountSub: 'مزامنة · أكاديمية · عمولات الشبكة الثنائية',
  tabHome: 'الرئيسية',
  tabTools: 'أدوات',
  tabAcademy: 'أكاديمية',
  tabAccount: 'حساب',
  login: 'دخول',
  register: 'تسجيل',
  name: 'الاسم',
  namePlaceholder: 'اسم المستخدم',
  email: 'الإيميل',
  emailPlaceholder: 'name@example.com',
  password: 'كلمة المرور',
  passwordPlaceholder: 'كلمة المرور',
  enter: 'دخول',
  createAccount: 'إنشاء حساب',
  logout: 'تسجيل خروج',
  hello: 'مرحباً',
  sponsorCode: 'رمز الدعوة (اختياري)',
  underSponsor: 'جهتك تحت صاحب الدعوة',
  left: 'يسار',
  right: 'يمين',
  trader: 'متداول',
  trainer: 'مدرب',
  broker: 'بروكر',
  agent: 'وكيل',
  company: 'شركة',
  loginError: 'تعذّر الدخول — لم يصل الطلب إلى الخادم أو لم يكتمل. تحقّق من اتصالك بالإنترنت ثم حاول مرة أخرى',
  sessionExpired: 'انتهت جلستك — تدوم 30 يوماً من تسجيل الدخول. سجّل الدخول مجدداً لترى تنبيهاتك ودفترك المحفوظة بحسابك',
  registerError: 'تعذّر التسجيل — لم يصل الطلب إلى الخادم أو لم يكتمل. تحقّق من اتصالك بالإنترنت ثم حاول مرة أخرى',
  regErrReserved: 'هذا الاسم محجوز — اختر اسماً آخر',
  regErrInvisible: 'في الاسم محرف مخفي أو حرف بعرض كامل (يأتي غالباً مع النسخ واللصق) — اكتبه بنفسك من لوحة المفاتيح',
  regErrLink: 'لا يقبل الاسم رابطاً ولا «@» ولا «/» — يظهر اسمك على كل رسالة، فاختر اسماً بلا عنوان موقع',
  regErrUsernameTaken: 'هذا الاسم مسجَّل من قبل — اختر اسماً آخر، أو ادخل إن كان حسابك',
  regErrEmailTaken: 'هذا الإيميل مسجَّل من قبل — ادخل به من «{login}» بدل إنشاء حساب جديد',
  regErrInvalidEmail: 'الإيميل غير صحيح — شكله مثل name@example.com',
  regErrSponsorNotFound: 'رمز الدعوة غير موجود — تأكّد منه مع من دعاك، أو اترك الخانة فارغة',
  regErrUsernameLength: 'الاسم من 3 إلى 32 حرفاً',
  regErrPasswordLength: 'كلمة المرور 4 أحرف على الأقل',
  regErrRoleNotOpen: 'الحساب الجديد يُسجَّل «{trader}» فقط — الأدوار الأخرى يمنحها راعيك من شبكته بعد التسجيل',
  regErrMissingFields: 'اكتب اسم المستخدم والإيميل — كلاهما مطلوب لإنشاء الحساب',
  loginErrCredentials: 'الاسم أو الإيميل أو كلمة المرور غير صحيحة — تحقّق منها وأعد المحاولة',
  loginErrMissing: 'اكتب اسم المستخدم أو الإيميل الذي سجّلت به',
  language: 'اللغة',
  deleteAccount: 'حذف الحساب',
  deleteAccountConfirmTitle: 'حذف الحساب نهائياً؟',
  deleteAccountConfirmBody:
    'سيُحذف اسم المستخدم والإيميل وكلمة المرور نهائياً ولن تقدر تسجّل الدخول بهذا الحساب مرة أخرى. هذا الإجراء لا يمكن التراجع عنه.',
  deleteAccountConfirmBtn: 'حذف نهائياً',
  deleteAccountError: 'تعذّر تأكيد حذف الحساب — تحقّق من الاتصال ثم اضغط «حذف الحساب» مرة أخرى.',
  cancel: 'إلغاء',
  notifications: 'الإشعارات',
  notifStatusGranted: 'مفعّلة',
  notifStatusDenied: 'مرفوضة من إعدادات الجهاز',
  notifStatusUndetermined: 'تحتاج إذن',
  notifStatusUnsupported: 'غير مدعومة على الويب',
  notifEnableBtn: 'تفعيل الإشعارات',
  notifOpenSettingsBtn: 'فتح إعدادات الجهاز',
  onboardStep1Title: 'بدّل الزوج بلمسة',
  onboardStep1Body:
    'اضغط أي زوج بالشريط العلوي (EURUSD، GBPUSD، الذهب XAUUSD…) لينتقل إليه الشارت، وتغيّر اليوم ▲▼ بجانبه. اقرص بإصبعين للتكبير، واسحب محور السعر لتطول الشموع أو تقصر، وزرّ «تلقائي» بزاوية المحورين يعيد العرض. المس شمعة لتقرأ أسعارها (O H L C)، أو اضغط مطوّلاً ثم اسحب لتمرّ على الشموع واحدةً واحدة.',
  onboardStep2Title: 'أدوات الرسم',
  onboardStep2Body:
    'تبويب «رسم» بالشريط السفلي يفتح خطوط الترند وفيبوناتشي وباقي الأدوات على الشارت، وما ترسمه على 4H يبقى حين تنزل إلى الساعة. ولتخطيط صفقة استعمل «خطة شراء» أو «خطة بيع»: اسحب من الدخول إلى الوقف فيظهر الهدف وبُعده بالـpip ونسبة العائد إلى المخاطرة. المس رسماً لتحدّده: اسحبه لتحريكه أو أزِحه بأزرار ▲▼◀▶ (pip واحد أو شمعة واحدة بكل لمسة، واضغط مطوّلاً ليتكرّر ثم يُسرع)، أو اضغط «نسخة» ❐ لتضع المستوى نفسه في مكان آخر. أخطأت؟ «تراجع» ↶ يلغي آخر تغيير، و«إعادة» ↷ يرجعه إن تراجعتَ أكثر مما أردت.',
  onboardStep3Title: 'المؤشرات والعدسات',
  onboardStep3Body:
    'اختر من عشرات المؤشرات (RSI وMACD وبولنجر…) أو ابدأ بعدسة تضيف مجموعة بلمسة: «هيكل» للمتوسطات المتحركة، «زخم» لـRSI وMACD، «سيولة» للفوليوم وبولنجر وCVD (بالفوركس الفوليوم وCVD تقدير من الشموع، لا حجم ولا تدفّق أوامر حقيقي). قيم المتوسطات وحدود بولنجر تظهر على محور السعر بلون خطوطها. وللفوركس: «Sessions» يظلّل جلسات طوكيو ولندن ونيويورك بأوقاتها صيفاً وشتاءً، و«PDH / PDL» يرسم أعلى وأدنى جلسة الأمس.',
  onboardStep4Title: 'التنبيهات',
  onboardStep4Body:
    'أسرع طريق: المس المستوى على الشارت ثم زرّ 🔔 — بلا كتابة أرقام. ويصلك إشعار حين يبلغه السعر (يُفحص كل دقيقة تقريباً)، فلا داعي لمراقبة الشارت طوال اليوم. ولنقله اسحب وسمه 🔔 على حافة الشارت إلى السعر الجديد. تنبيهات المؤشرات وتفعيل الإشعارات من لوح التنبيهات.',
  onboardStep5Title: 'المخاطرة أولاً',
  onboardStep5Body:
    'قبل أي صفقة افتح «أدوات ← المخاطرة»: اختر الرمز كما يكتبه وسيطك (EURUSDc لحساب السنت)، وأدخل رصيدك ونسبة المخاطرة ووقف الخسارة (بالـpip لا بنقاط MT4/MT5 — 250 نقطة عادةً 25 pip — أو بسعرَي الدخول والوقف) لتعرف حجم اللوت المناسب (وأضف السبريد والعمولة ليشملهما الرقم)، ثم «سجّل هذه الخطة بالدفتر» لتراجع نتيجتها لاحقاً. كثير من المتداولين لا يخاطرون بأكثر من 1–2% بالصفقة.',
  onboardRiskNote:
    'MATRIX أداة تحليل وتعليم، لا تنفّذ صفقات ولا تقدّم نصيحة مالية. التداول بالرافعة ينطوي على مخاطرة عالية بخسارة المال.',
  onboardStepCounterA11y: 'الخطوة {n} من {total}',
  onboardSkip: 'تخطي',
  onboardBack: 'السابق',
  onboardNext: 'التالي',
  onboardStart: 'ابدأ',
  dirBuy: 'شراء',
  dirSell: 'بيع',
  dirNeutral: 'محايد',
  avgLabel: 'معدل',
  entryLabel: 'دخول',
  slLabel: 'وقف',
  tpLabel: 'هدف',
  enabledWord: 'مفعّل',
  disabledWord: 'معطّل',
  sendBtn: 'إرسال',
  refreshBtn: 'تحديث',
  aboveWord: 'فوق',
  belowWord: 'تحت',
  addBtn: 'إضافة',
  deleteWord: 'حذف',
  priceWord: 'السعر',
  impactHigh: 'عالي',
  impactMedium: 'متوسط',
  impactLow: 'منخفض',
  toolsTitle: 'أدوات MATRIX',
  toolsSub: 'مجتمع وأخبار · تحليل وتنبيهات — قسمان قابلان للتبديل',
  toolsTabHub: 'تحليلات ومجتمع',
  toolsTabReports: 'تقارير',
  toolsTabJournal: 'الدفتر',
  toolsTabScreener: 'فحص',
  toolsTabBacktest: 'اختبار خلفي',
  toolsTabIndAlerts: 'تنبيهات+',
  toolsTabCalendar: 'تقويم',
  toolsTabLayouts: 'تخطيط',
  toolsTabAi: 'AI',
  a11yTabPrefix: 'تبويب',
  a11ySignalSymbolPrefix: 'رمز التحليل',
  toolsSymOnChart: 'على شارتك',
  toolsHubCommunity: 'مجتمع وأخبار',
  toolsHubAnalysis: 'تحليل وتنبيهات',
  a11yHubSectionPrefix: 'قسم لوحات',
  toolsGridHint: 'اسحب النقاط لإعادة ترتيب لوحات هذا القسم',
  toolsFiltersLabel: 'الفلاتر',
  filterMaUpLabel: 'تقاطع MA صاعد',
  filterMaUpHint: 'المتوسط السريع SMA 9 قطع البطيء SMA 21 للأعلى على آخر شمعة',
  filterMaDownLabel: 'تقاطع MA هابط',
  filterMaDownHint: 'المتوسط السريع SMA 9 قطع البطيء SMA 21 للأسفل على آخر شمعة',
  filterRsiOversoldLabel: 'RSI تشبّع بيعي',
  filterRsiOversoldHint: 'RSI 14 عند 30 أو أقل — قد يرتد صعوداً، وقد يبقى منخفضاً بترند هابط قوي',
  filterRsiOverboughtLabel: 'RSI تشبّع شرائي',
  filterRsiOverboughtHint: 'RSI 14 عند 70 أو أكثر — قد يتراجع، وقد يبقى مرتفعاً بترند صاعد قوي',
  filterMacdUpLabel: 'تقاطع MACD صاعد',
  filterMacdUpHint: 'خط MACD قطع خط الإشارة للأعلى على آخر شمعة — زخم إيجابي جديد',
  filterBullishLabel: 'زخم +',
  filterBullishHint: 'السعر صعد خلال آخر 80 شمعة (من إغلاق أولها إلى آخرها)، وRSI دون 65 (غير متشبّع)',
  filterBearishLabel: 'زخم -',
  filterBearishHint: 'السعر هبط خلال آخر 80 شمعة (من إغلاق أولها إلى آخرها)، وRSI فوق 35 (غير متشبّع)',
  a11yFilterPrefix: 'فلتر',
  screenerRunning: 'جاري الفحص…',
  screenerRunBtn: 'شغّل الفحص',
  screenerRunNeedFilter: 'اختر فلتراً أولاً ثم شغّل الفحص',
  screenerNeedApiKey: 'الفحص يحتاج مفتاح Twelve Data مفعّلاً على الخادم',
  screenerNoResults: 'لا رمز يحقّق الفلاتر الحالية الآن — جرّب فلتراً آخر أو أعد الفحص لاحقاً',
  screenerFailed: 'تعذر تشغيل الفحص — تحقق من الاتصال وحاول مرة أخرى',
  screenerScanNone: 'تعذّر جلب أسعار أي رمز — غالباً حدّ طلبات مزوّد الأسعار؛ انتظر دقيقة وأعد الفحص',
  screenerScanPartial: 'فُحص {k} من {total} رمزاً فقط — تعذّرت قراءة: {list} (حدّ طلبات المزوّد غالباً). النتائج من المفحوصة فقط.',
  screenerPriceAsOf: 'إغلاق {time}',
  screenerNoMatchOf: 'فُحص {k} رمزاً على فريم {tf} ولا أحد يحقّق الشرط الآن — جرّب فلتراً آخر أو أعد الفحص لاحقاً',
  // «من 9 نتيجة» خطأ: المعدود بعد 3–10 جمع — العدد بعد النقطتين لا يُصرَّف معه اسم
  screenerShowingOf: 'أقوى النتائج: {n} من {total} (الأكبر حركةً أولاً)',
  screenerChangeSpan: '(آخر 80 شمعة)',
  screenerTapToOpen: 'اضغط أي نتيجة لفتح شارتها على نفس الفريم',
  screenerOpenChartA11y: 'فتح الشارت',
  newsTitle: 'أخبار مؤثرة على الفوركس',
  newsStale: 'تعذّر التحديث — الموعد من تقويم محفوظ',
  newsEmpty: 'لا عناوين مؤثرة الآن — ومواعيد البيانات القادمة (الفائدة، الوظائف، التضخم) تجدها في «تقويم».',
  newsLoadError: 'تعذّر تحميل الأخبار — تحقّق من الاتصال، ثم غادر هذا القسم وارجع إليه لإعادة المحاولة',
  newsSourceUnavailable: 'مصدر الأخبار لا يستجيب الآن — العطل عنده لا في اتصالك. مواعيد البيانات المؤكَّدة (الفائدة، الوظائف، التضخم) تجدها في «تقويم».',
  newsStaleAsOf: 'آخر تحديث للعناوين {time} — المصدر لا يستجيب الآن، فقد تفوتك أخبار أحدث',
  newsImpactFromHeadline: 'شارة التأثير تقدير من كلمات العنوان، لا تصنيف من مصدر الخبر — مواعيد البيانات المؤكَّدة في «تقويم».',
  newsImpactEstimatedA11y: 'تأثير {impact} — تقدير من كلمات العنوان',
  snapChangeOverBars: '{pct} خلال آخر {bars} شمعة',
  aiPanelTitle: 'مساعد ذكاء اصطناعي',
  aiGreeting:
    'أنا مساعد MATRIX الآلي. اسألني عن تحليل الزوج، سيناريو صفقة، أو إدارة المخاطرة. إجاباتي تحليل آلي تتعلّم منه، لا نصيحة مالية — راجع أي مستوى على الشارت قبل أن تعتمد عليه.',
  aiPriceAsOf: 'الأسعار في هذا الجواب مبنيّة على إغلاق شمعة {time} بتوقيتك — وليست سعراً حيّاً',
  forecastPriceAsOf: 'المستويات مبنيّة على إغلاق شمعة {time} بتوقيتك — وليست سعراً حيّاً',
  aiOfflineFallback:
    'تعذّر الاتصال بالخادم — تحقّق من اتصالك بالإنترنت وحاول بعد قليل.\n\nتحليل محلي سريع: راقب الدولار على أكثر من زوج (EURUSD وUSDJPY) قبل أي دخول على أزواج الدولار، واستخدم وقفاً واضحاً بمخاطرة 1% للصفقة (2% حدّاً أقصى).',
  aiInputPlaceholder: 'مثال: تحليل {symbol} اليوم؟',
  aiInputA11y: 'سؤال لمساعد الذكاء الاصطناعي',
  aiSendA11y: 'إرسال سؤال لمساعد الذكاء الاصطناعي',
  aiAskBtn: 'اسأل',
  analystsTitle: 'توقعات المحللين',
  analystsSubSuffix: 'لا مصدر مرخَّص بعد — لا نعرض آراء مختلَقة',
  analystsRefreshA11y: 'تحديث توقعات المحللين',
  analystsLoadError: 'تعذّر تحميل توقعات المحللين — تحقّق من الاتصال ثم اضغط «تحديث»',
  socialPlatformTelegram: 'تيليجرام',
  socialPlatformFacebook: 'فيسبوك',
  socialPlatformInstagram: 'إنستغرام',
  socialPlatformX: 'X',
  socialPlatformYoutube: 'يوتيوب',
  socialPlatformDiscord: 'ديسكورد',
  socialPlatformApp: 'تطبيق',
  socialComputeA11y: 'احسب إجماع المصادر المختارة',
  socialComputeBtn: 'احسب',
  socialTitle: 'متوسّط آراء القنوات',
  socialSub: 'تيليجرام · فيسبوك · إنستغرام · X · تطبيقات',
  socialPickHint: 'لا مصدر مرخَّص لآراء القنوات بعد، فقائمة المصادر فارغة — ولا نخترع آراءً بدلها',
  socialSourcesError: 'تعذّر تحميل قائمة المصادر — تحقّق من الاتصال، ثم غادر هذا القسم وارجع إليه لإعادة المحاولة',
  a11ySourcePrefix: 'مصدر',
  sourcesCountLabel: 'مصادر',
  suggestedTradeLabel: 'صفقة مقترحة',
  socialNoClearTrade: 'لا صفقة واضحة — الآراء متضاربة أو محايدة',
  socialComputeError: 'تعذّر حساب إجماع القنوات — تحقّق من الاتصال ثم اضغط «احسب»',
  chatTitle: 'دردشة جماعية',
  chatLoadError: 'تعذّر تحميل الرسائل — تحقّق من الاتصال، ثم غادر هذا القسم وارجع إليه لإعادة المحاولة',
  chatEmpty: 'لا توجد رسائل بعد — كن أول من يكتب',
  chatSendError: 'تعذّر التأكد من وصول رسالتك — تظهر عندك وقد لا يراها أحد. تحقّق من الاتصال، ثم غادر هذا القسم وارجع إليه: إن لم تجدها فاكتبها من جديد',
  chatYou: 'أنت',
  chatAnonTrader: 'متداول',
  chatLoginRequired: 'سجّل الدخول للمشاركة بمحادثة المجموعة — رسائلك تظهر باسم حسابك',
  chatInputPlaceholder: 'اكتب رسالة…',
  chatInputA11y: 'رسالة الدردشة الجماعية',
  chatSendA11y: 'إرسال رسالة الدردشة الجماعية',
  voteTitle: 'تصويت على صفقة',
  voteCloseFormA11y: 'إغلاق نموذج نشر الفكرة',
  votePublishNewA11y: 'نشر فكرة تداول جديدة',
  closeWord: 'إغلاق',
  votePublishToggleBtn: 'انشر فكرتك',
  voteSymbolPlaceholder: 'الرمز (مثال EURUSD)',
  voteSymbolA11y: 'رمز الأداة لفكرتك',
  voteDirA11yPrefix: 'اتجاه الفكرة',
  voteEntryPriceA11y: 'سعر الدخول',
  voteSlPriceA11y: 'سعر وقف الخسارة',
  voteTpPriceA11y: 'سعر الهدف',
  voteNotePlaceholder: 'ملاحظة (اختياري) — لماذا هذه الفكرة؟',
  voteNoteA11y: 'ملاحظة الفكرة (اختياري)',
  voteFormError: 'أدخل الرمز والدخول والوقف والهدف بشكل صحيح',
  votePublishError: 'تعذر نشر الفكرة — تحقق من الاتصال وحاول مرة أخرى',
  votePublishBtn: 'نشر الفكرة',
  voteLoadError: 'تعذّر تحميل التصويتات — تحقّق من الاتصال، ثم غادر هذا القسم وارجع إليه لإعادة المحاولة',
  voteEmpty:
    'لا تصويتات نشطة حالياً — انشر فكرتك بالأعلى (رمز واتجاه ودخول ووقف وهدف) وشاهد رأي بقية المتداولين.',
  voteByAuthor: 'بواسطة {author}',
  voteApprovalLabel: 'موافقة',
  voteAgreeWord: 'موافق',
  voteDisagreeWord: 'رافض',
  voteCastError: 'تعذّر التأكد من احتساب صوتك — العدّاد أمامك قد يشمله وهو لم يصل. تحقّق من الاتصال، ثم غادر هذا القسم وارجع إليه لترى العدّ الفعلي وصوّت مجدداً إن لزم',
  voteLoginRequired: 'سجّل الدخول للتصويت — صوت واحد لكل حساب حتى تبقى نسبة الموافقة صادقة',
  chatLinksNotAllowed: 'الروابط غير مسموحة بالمجموعة — حماية من قنوات «التوصيات» الاحتيالية',
  votePublishLoginRequired: 'سجّل الدخول لنشر فكرة — تظهر باسم حسابك',
  voteLinksNotAllowed: 'الروابط غير مسموحة بالأفكار — اكتب تحليلك نصاً',
  modMessageOptionsA11y: 'خيارات الرسالة: إبلاغ أو حظر',
  modIdeaOptionsA11y: 'خيارات الفكرة: إبلاغ أو حظر',
  modReportLabel: 'إبلاغ:',
  modReasonSpam: 'مزعج',
  modReasonAbuse: 'مسيء',
  modReasonScam: 'احتيال',
  modBlockUser: 'حظر {user}',
  modReported: 'شكراً — أُخفي المحتوى عندك وسيُراجَع البلاغ',
  modReportLoginRequired: 'سجّل الدخول للإبلاغ — أو احظر المرسل ليختفي عندك',
  modReportError: 'تعذّر إرسال البلاغ — حاول مجدداً',
  modBlocked: 'حُظر {user} — لن تظهر رسائله وأفكاره عندك',
  modBlockedCount: 'محظورون: {n} · إلغاء الحظر',
  modUnblockA11y: 'إلغاء حظر كل المستخدمين المحظورين',
  voteAgreeA11yPrefix: 'موافقة على فكرة',
  voteDisagreeA11yPrefix: 'رفض فكرة',
  indicatorBollinger: 'بولنجر',
  indicatorTrend: 'ميل',
  forecastRunA11y: 'توقّع المؤشرات',
  forecastRunBtn: 'توقّع',
  forecastTitle: 'توقعات المؤشرات',
  forecastAvgLabel: 'معدل مؤشرات',
  forecastTradeLabel: 'مستويات محسوبة',
  forecastNoSignal: 'لا اتجاه غالب بين المؤشرات المختارة — لذا لا مستويات دخول ووقف وهدف',
  forecastAgreeLabel: 'مؤشرات متوافقة',
  forecastError: 'تعذّر حساب توقعات المؤشرات — تحقّق من الاتصال ثم اضغط «توقّع»',
  alertsTitle: 'تنبيهات السعر',
  alertsSub: 'عند المستوى أو فوقه / أو تحته · أسعار Twelve Data تُفحص كل دقيقة تقريباً · إشعار حين يتحقّق الشرط',
  alertsPushTitle: 'MATRIX · تنبيه سعر',
  notifChannelName: 'تنبيهات الأسعار والمؤشرات',
  notifChannelDesc: 'إشعار حين يبلغ السعر مستوىً ضبطتَه أو يتحقّق شرط مؤشر اخترتَه (يُفحص كل دقيقة تقريباً)',
  alertsSymbolA11y: 'رمز الأداة للتنبيه',
  alertsPriceA11y: 'سعر التنبيه',
  alertsAboveConditionA11y: 'شرط التنبيه: فوق السعر',
  alertsBelowConditionA11y: 'شرط التنبيه: تحت السعر',
  alertsAddA11y: 'إضافة تنبيه سعر',
  alertsNotePlaceholder: 'ملاحظة (اختياري)',
  alertsNoteA11y: 'ملاحظة التنبيه (اختياري)',
  alertsAddError: 'تعذر إضافة التنبيه — تحقق من الاتصال وحاول مرة أخرى',
  alertsFirstBadge: '🎉 أول تنبيه مضبوط — سنُعلمك حين يبلغ السعر مستواك (الفحص كل دقيقة تقريباً)',
  alertsLoadError: 'تعذّر تحميل التنبيهات — تحقّق من الاتصال. تنبيهاتك المحفوظة لم تُحذف.',
  alertsEmpty:
    'لا تنبيهات بعد — اكتب سعراً بالأعلى (أو اضغط «استخدمه» للسعر الحالي) واختر فوق/تحت، وسيصلك إشعار حين يصل السعر إليه. أو من الشارت: المس المستوى ثم 🔔.',
  alertsDeleteConfirmTitle: 'حذف التنبيه؟',
  alertsDeleteFailedTitle: 'تعذر الحذف',
  alertsDeleteFailedBody: 'لم نتأكّد من الحذف — تحقّق من الاتصال. إن بقي التنبيه بالقائمة فاحذفه مرة أخرى.',
  alertsDeleteA11yPrefix: 'حذف تنبيه',
  alertsInvalidInput: 'أدخل رمزاً وسعراً صحيحاً أكبر من صفر',
  alertsUnknownSymbolWarn: 'مزوّد الأسعار لا يعرف هذا الرمز — راجع كتابته، وإلا لن يُطلق التنبيه',
  alertsEditOldRemains: 'حُفظ التنبيه الجديد لكن تعذّر حذف القديم — احذفه يدوياً من القائمة',
  alertsRearmBtn: 'إعادة التسليح',
  alertsRearmA11yPrefix: 'إعادة تسليح التنبيه',
  alertsRearmedMsg: 'مُسلَّح من جديد: {desc} — إن كان السعر ما زال متجاوزاً المستوى يُطلق بالفحص التالي',
  alertsRearmFailed: 'تعذّرت إعادة التسليح — تحقّق من الاتصال وحاول مرة أخرى',
  alertsArmedPrefix: 'مُفعَّل',
  alertsUpdatedPrefix: 'حُدِّث',
  alertsCurrentPrefix: 'السعر الآن',
  alertsUseCurrent: 'استخدمه',
  alertsUseCurrentA11y: 'استخدام السعر الحالي',
  alertsSaveEdit: 'حفظ التعديل',
  alertsEditingHint: 'تعدّل تنبيهاً قائماً',
  alertsCancelEdit: 'إلغاء التعديل',
  alertsFiresNowWarn: '⚠ الشرط متحقق الآن — سيُطلق التنبيه فوراً',
  alertsActiveCount: 'نشطة',
  alertsTapToEdit: 'اضغط تنبيهاً لتعديله',
  alertsClearFiredBtn: 'مسح المُطلقة ({n})',
  // «حذف 3 تنبيه» خطأ (3–10 تُتبع بجمع) — العدد بين قوسين لا يُصرَّف معه المعدود
  alertsClearFiredConfirm: 'حذف التنبيهات التي أُطلقت ({n})؟ التنبيهات التي تراقب تبقى كما هي.',
  alertsEditA11yPrefix: 'تعديل التنبيه',
  alertsStatusArmed: '● مُفعَّل — بانتظار السعر',
  alertsStatusTriggered: 'انطلق ✓',
  riskCalcTitle: 'حاسبة حجم المركز',
  riskCalcSub: 'كم لوت تفتح حتى يكلّفك ضرب الوقف نسبة محدّدة من رصيدك',
  riskCalcSymbol: 'الأداة',
  riskCalcBadSymbol:
    'رمز غير مدعوم — الحاسبة تحسب أزواج الفوركس والذهب والفضة، مثل EURUSD أو XAUUSD أو GOLD أو EURUSD.m، ورموز حساب السنت مثل EURUSDc',
  riskCalcMiniSymbol:
    '«{symbol}» رمز حساب mini، وحجم لوت mini يختلف بين الوسطاء (10,000 وحدة عند أكثرهم، ولوت عادي عند بعضهم) فلا نخمّنه. اكتب الزوج العادي {pair}، وتأكّد من حجم العقد في مواصفات الرمز بمنصّتك قبل نسخ اللوت',
  riskCalcCentModeNote:
    '«{symbol}» رمز حساب سنت: اكتب الرصيد بالسنت (USC) كما تعرضه منصّتك — 10,000 USC = 100 USD. اللوت أدناه هو ما تكتبه بحساب السنت',
  riskCalcCentBalance: 'رصيد الحساب (USC — بالسنت)',
  riskCalcCentUsdEquiv: '≈ {usd} USD',
  riskCalcSmallLotsStdEquiv: '= {std} لوت بالحساب العادي',
  riskCalcMicroModeNote:
    '«{symbol}» رمز حساب micro: الرصيد بعملة حسابك كما هو، واللوت أدناه بلوتات micro (1,000 وحدة) — اكتبه كما هو بحساب micro',
  appCrashTitle: 'حدث خطأ غير متوقع',
  appCrashBody: 'تعذّر عرض هذه الشاشة. بياناتك ورسوماتك محفوظة — اضغط «إعادة المحاولة» للمتابعة.',
  appCrashRepeatBody:
    'ما زالت الشاشة تتعثّر. أغلق MATRIX كلياً (اسحبه من قائمة التطبيقات المفتوحة) ثم افتحه من جديد — رسوماتك محفوظة.',
  appCrashRetry: 'إعادة المحاولة',
  appCrashDetailLabel: 'تفصيل تقني (صوّره إن أبلغت عن المشكلة):',
  planSlWrongBuy: 'الوقف يجب أن يكون تحت سعر الدخول في صفقة الشراء',
  planSlWrongSell: 'الوقف يجب أن يكون فوق سعر الدخول في صفقة البيع',
  planTpWrongBuy: 'الهدف يجب أن يكون فوق سعر الدخول في صفقة الشراء',
  planTpWrongSell: 'الهدف يجب أن يكون تحت سعر الدخول في صفقة البيع',
  planSlTooClose: 'الوقف يكاد يلاصق الدخول (أقل من 1 pip، أو من 0.002% من السعر للرموز بلا pip كالبيتكوين والمؤشرات) — أضيق من السبريد نفسه؛ راجع الرقم',
  planRiskWord: 'المخاطرة',
  planNoteCommission: 'عمولة',
  planNoteNetRR: 'R:R بعد التكاليف',
  planRewardWord: 'الربح المحتمل',
  planLowRR: '⚠ الربح المحتمل أقل من المخاطرة',
  riskCalcAccountCcy: 'عملة الحساب',
  riskCalcBalance: 'رصيد الحساب',
  riskCalcRiskPct: 'المخاطرة (% أو مبلغ)',
  riskCalcRiskMoneyHint: 'اضغط {ccy} لتكتب المخاطرة مبلغاً بدل النسبة',
  riskCalcRiskOverBalance:
    'المخاطرة ({risk}) أكبر من رصيد الحساب ({balance}) — ضربة وقف واحدة تمحو الحساب كلّه. راجع الخانتين: ربما كتبتَ مبلغاً مكان النسبة، أو نقص الرصيد صفراً.',
  riskCalcHighRisk: '⚠ أكثر من 2% للصفقة الواحدة مخاطرة عالية',
  riskCalcSlPips: 'وقف الخسارة (pip)',
  riskCalcFromPrice: 'أو احسبه من السعر: الدخول والوقف كما تراهما على الشارت',
  riskCalcSlMismatch:
    '⚠ الـpip المكتوبة ({pips}) لا تطابق سعرَي الدخول والوقف ({derived} pip) — حجم اللوت والمخاطرة محسوبان من خانة الـpip، وR:R من السعرين',
  riskCalcEntry: 'سعر الدخول',
  riskCalcStop: 'سعر الوقف',
  riskCalcStopChip: '{side}: الوقف {price}',
  riskCalcConvFailed: 'تعذّر جلب سعر التحويل تلقائياً — اكتبه بالخانة أدناه كما تراه بمنصّتك ليظهر حجم اللوت. الزوج:',
  riskCalcConvManual: 'أدخل سعر',
  riskCalcConvStale: 'سعر التحويل {pair} لم يتجدّد منذ {min} د — اللوت محسوب على آخر سعر وصلنا. قارنه بمنصّتك قبل الدخول.',
  riskCalcConvMarketClosed: 'السوق مغلق — سعر التحويل {pair} هو آخر سعر قبل الإغلاق، وقد يفتح السوق على سعر مختلف. أعد الحساب بعد الافتتاح.',
  riskCalcLots: 'حجم الصفقة (لوت)',
  riskCalcRiskAmount: 'المخاطرة الفعلية',
  riskCalcUnits: 'الوحدات',
  riskCalcBelowMin: 'لا حجم يناسب هذه المخاطرة: أصغر لوت (0.01) يتجاوز ما حدّدتَه',
  riskCalcFillHint: 'أدخل الرصيد ونسبة المخاطرة ووقف الخسارة',
  invalidNumberHint: 'رقم غير مفهوم — اكتبه بلا فواصل آلاف، مثل 10000 أو 1.0850',
  priceAmbiguousThousandsHint: 'السعر «{value}» مبهم — هل الفاصل للآلاف أم للكسر العشري؟ اكتب {whole} أو {small}',
  riskCalcSlPipsAmbiguous: 'وقف «{value}» pip مبهم — هل الفاصل للآلاف أم للكسر العشري؟ اكتب {whole} أو {small}',
  riskCalcSlPointsHint: 'وقف «{value}» بالنقاط (points) — النقطة بمنصّة MT4/MT5 عادةً عُشر pip، فاكتب {pips} pip',
  riskCalcOtherCcyHint: '{field} «{value}» بغير عملة الحساب ({ccy}) — اكتب المبلغ بالـ{ccy}، أو غيّر عملة الحساب',
  arabicThousandsSignHint: '«٬» فاصلة الآلاف لا الفاصلة العشرية — للكسر اكتب «٫» أو نقطة، مثل 0٫5',
  riskCalcBadFieldValue: '{field} «{value}»',
  riskCalcSlLooksLikePrice: '⚠ «{value}» سعرٌ على الأرجح لا مسافة — اكتبه بخانة «سعر الوقف»، أو اكتب بالـpip المسافةَ بين سعر الدخول وسعر الوقف',
  riskCalcStopPxLooksLikePips: '⚠ «{value}» بخانة سعر الوقف عددُ pip على الأرجح لا سعر — اضغط لنقله إلى خانة الوقف بالـpip',
  levelLooksLikePipsHint: '⚠ {field} «{value}» عددُ pip على الأرجح لا سعر: {pips} pip تعني {price}. اضغط لكتابة {price}',
  levelLooksLikePipsSaveBlocked: 'لم تُحفظ الصفقة: {field} «{value}» يبدو عدد pip لا سعراً — التصحيح في السطر أعلاه. لإبقاء {value} سعراً كما كتبته اضغط «{button}» مرّة ثانية.',
  levelLooksLikePointsHint: '⚠ {field} «{value}» عددُ نقاط على الأرجح لا سعر: {pips} نقطة تعني {price}. اضغط لكتابة {price}',
  levelLooksLikePointsSaveBlocked: 'لم تُحفظ الصفقة: {field} «{value}» يبدو عدد نقاط لا سعراً — التصحيح في السطر أعلاه. لإبقاء {value} سعراً كما كتبته اضغط «{button}» مرّة ثانية.',
  journalEntryDecimalSlip: '⚠ الدخول «{value}» يبدو بلا فاصلة عشرية — هل تقصد {price}؟',
  journalLevelDecimalSlip: '⚠ {field} «{value}» يبدو بلا فاصلة عشرية — هل تقصد {price}؟',
  riskCalcPipValue: 'قيمة الـpip للوت',
  riskCalcPipValueAtStop: 'قيمة الـpip للوت عند وقفك {price}',
  riskCalcPipValueAtStopHint: 'منصّتك تعرضها بالسعر الحالي فقد تختلف قليلاً — لكن خسارتك إن ضُرب الوقف تُحوَّل إلى عملة حسابك بسعر الوقف، فحسبناها به',
  riskCalcPipValueAtPipsExit: 'قيمة الـpip للوت عند {price} ({pips} pip تحت السعر)',
  riskCalcPipValueAtPipsExitHint:
    'لم تكتب سعر وقف فلا نعرف أتشتري أم تبيع، فحسبناها بالخروج تحت السعر لأنه الأغلى بعملة حسابك — هكذا لا تتجاوز خسارتك المخاطرة التي اخترتها في الاتجاهين. منصّتك تعرضها بالسعر الحالي فقد تختلف قليلاً',
  riskCalcLeverage: 'الرافعة المالية (100 تعني 1:100)',
  riskCalcLeverageOutOfRange: 'رافعة «{value}» خارج ما تحسبه الحاسبة (من 1:1 حتى 1:{max}) — اكتب رافعة حسابك كما تظهر بمنصّتك، مثل 500.',
  riskCalcLeverageAmbiguous: 'رافعة «{value}» مبهمة — هل تقصد 1:{big}؟ اكتب {big} بلا نقطة، أو 1 إن كان حسابك بلا رافعة.',
  riskCalcMargin: 'الهامش المحجوز',
  riskCalcMarginNote:
    'الهامش مبلغ يحجزه الوسيط ما دامت الصفقة مفتوحة، وليس ما قد تخسره — خسارتك يحدّدها الوقف. والرافعة المتاحة تختلف حسب الوسيط والأداة.',
  riskCalcTarget: 'الهدف (اختياري) — لحساب R:R والربح المحتمل',
  riskCalcTargetPlaceholder: 'سعر الهدف',
  riskCalcPotentialProfit: 'الربح المحتمل',
  riskCalcLogToJournal: 'سجّل هذه الخطة بالدفتر',
  riskCalcSideLabel: 'اتجاه الصفقة',
  riskCalcSideFromStop: 'مستنتَج من موضع الوقف',
  riskCalcLoggedToJournal: '✓ سُجِّلت صفقة مفتوحة بالدفتر — أغلقها من «الدفتر» عند الخروج',
  riskCalcLogFailed: 'تعذّر التسجيل بالدفتر — تحقّق من الاتصال وحاول مرة أخرى',
  riskCalcMarginMaxLots: 'أكبر حجم يتّسع له رصيدك هامشاً: {lots} lot — وهو حدّ أقصى لا يُبقي هامشاً حرّاً لأي تذبذب',
  riskCalcLogBlockedMismatch:
    'لا تُسجَّل الخطة بوقفين مختلفين — اكتب {derived} بخانة الـpip، أو عدّل سعر الوقف ليطابق ما كتبته',
  riskCalcSlMismatchNarrower: '⚠ وقفك ({pips} pip) أضيق من مسافة السعرين ({derived} pip) — اللوت المحسوب أكبر مما تحتمله مخاطرتك إن بقي الوقف عند سعره',
  riskCalcSpread: 'السبريد (pip، اختياري)',
  riskCalcSpreadPipsHint: 'اكتبه بالـpip لا بالـpoints: MT4/MT5 تعرض السبريد بالـpoints غالباً، وكل 10 points = 1 pip — فـ12 بالمنصّة تُكتب هنا 1.2.',
  riskCalcSpreadNote: 'السبريد يُضاف عادةً إلى مسافة الوقف: وقف 20 pip بسبريد 1.5 يخسر قرابة 21.5 عند ضربه. انظر السبريد الحالي بمنصّتك — يتّسع عند الأخبار وافتتاح الأسبوع.',
  riskCalcRiskWithSpread: 'المخاطرة شاملة السبريد',
  riskCalcSpreadLotsWithin: 'لتبقى مخاطرتك {pct}% شاملة السبريد: {lots} lot',
  riskCalcSpreadTooWide: '«{n}» لا يبدو سبريداً بالـpip — هل كتبتَ سعراً أو points بدل الـpip؟ اكتب بالـpip الفرقَ بين Ask وBid كما تعرضه منصّتك الآن (مثل {example}).',
  riskCalcSpreadPointsHint: 'سبريد «{value}» بالنقاط (points) — كل 10 points = 1 pip، فاكتبه هنا {pips}',
  riskCalcSpreadMaybePrice: 'هل «{n}» سعر {symbol} لا سبريده؟ سعر هذا الزوج قريب من هذا الرقم. إن كان السبريد بالـpip فعلاً فالحساب صحيح كما هو.',
  riskCalcStopInsideSpread:
    'الوقف ({sl} pip) ليس أبعد من السبريد ({spread} pip) — قد يُضرب فور فتح الصفقة. وسّع الوقف وقلّل اللوت، أو انتظر سبريداً أضيق.',
  riskCalcStopInsideTypicalSpread:
    'الوقف ({sl} pip) ليس أبعد من السبريد المعتاد لـ{symbol} (~{spread} pip) — قد يُضرب فور فتح الصفقة. اكتب سبريد وسيطك بخانته، أو وسّع الوقف وقلّل اللوت.',
  riskCalcCommission: 'عمولة اختيارية لكل لوت، فتحاً وإغلاقاً',
  riskCalcCommissionNote: 'حسابات Raw/ECN تأخذ عمولة عند الفتح وعند الإغلاق. اكتب مجموع الطرفين للوت الواحد بعملة حسابك (مثل 7 بحساب دولار؛ بحساب ين نحو 1000)، واتركها فارغة إن كان حسابك بلا عمولة.',
  riskCalcCommissionNoteMicro:
    'العمولة هنا لكل لوت micro (0.01 لوت عادي): {std} للوت العادي = {micro} للوت micro. إن كتبتها لحساب عادي حوّلناها لك — راجعها بعقد حسابك.',
  riskCalcCommissionNoteCent:
    'العمولة هنا بالسنت (USC) لكل لوت سنت — غالباً صفر بحسابات السنت. {usc} USC للوت السنت تساوي {usc} USD للوت العادي، فالرقم لا يتغيّر.',
  riskCalcRiskWithCosts: 'المخاطرة شاملة التكاليف',
  riskCalcCostsLotsWithin: 'لتبقى مخاطرتك {pct}% شاملة التكاليف: {lots} lot',
  riskCalcNetAfterCosts: 'بعد التكاليف: {profit} · R:R {rr}',
  riskCalcNetNegative: 'التكاليف تأكل الهدف كلّه: الصافي {profit} — أبعِد الهدف أو اختر حساباً بتكاليف أقل',
  riskCalcLowNetRR: '⚠ بعد التكاليف يصير الربح أقل من المخاطرة',
  riskCalcOverOrderMax: '⚠ {lots} lot أكبر من أقصى أمر يقبله أغلب الوسطاء (50–100 lot) — قسّم الصفقة على أوامر أو راجع الوقف',
  riskCalcOverOrderMaxSmall: '⚠ {lots} lot أكبر من أقصى أمر يقبله أغلب الوسطاء بحساب السنت أو micro (200 lot عادةً) — قسّم الصفقة على أوامر أو راجع الوقف',
  riskCalcCostsBelowMin: 'مع التكاليف، حتى أصغر لوت (0.01) يتجاوز {pct}% — ارفع النسبة أو قرّب الوقف',
  riskCalcUseLivePrice: '↓ الدخول = السعر الحالي',
  riskCalcUseLivePriceA11y: 'تعبئة خانة الدخول بسعر السوق الحالي (Ask للشراء وBid للبيع حسب موضع الوقف)',
  riskCalcLiveFilled: '✓ الدخول من السعر الحالي:',
  riskCalcLiveSideMoved: '✓ نُقل الدخول إلى {quote} (سعر {side}): {price}',
  riskCalcNoLiveQuote: 'لا سعر حديث لهذا الرمز الآن (لم يصل سعر خلال آخر 3 دقائق) — اكتب سعر الدخول يدوياً',
  riskCalcDisclaimer: 'تقدير تعليمي: مواصفات العقود (خصوصاً الذهب) قد تختلف لدى وسيطك — تحقّق قبل التداول.',
  toolsTabRisk: 'المخاطرة',
  calTimesLocal: 'الأوقات بتوقيتك',
  calUpcomingHead: 'خلال 24 ساعة',
  calNow: 'الآن',
  calPast: 'انتهى',
  calInPrefix: 'بعد',
  // مسبوقة بمسافة: «بعد 2 يوم 4 س» — «2ي» لا يقرؤها عربي كاختصار ليوم. نفس وحدات زمن أداة القياس
  calHourShort: ' س',
  calMinShort: ' د',
  calDayShort: ' يوم',
  newsRiskHigh: 'خبر قوي',
  newsRiskHint: 'تقلّب حاد وانزلاق محتمل — راجع وقف الخسارة وحجم الصفقة',
  newsRiskOpenHint: 'يمسّ صفقاتك المفتوحة على {symbols}: تقلّب حاد، وقد يُنفَّذ وقف الخسارة بسعر أسوأ من المكتوب',
  listSep: '، ',
  newsUnavailable: 'تعذّر تحديث تقويم الأخبار — لا نعرف إن كان خبر قوي قريباً؛ تحقّق قبل الدخول',
  newsTimeTbd: 'اليوم، الساعة غير معلنة',
  newsTimeTbdTomorrow: 'غداً، الساعة غير معلنة',
  calToday: 'اليوم',
  calTomorrow: 'غداً',
  calTimeTbd: 'الساعة غير معلنة',
  calStaleAsOf: 'آخر تحديث للتقويم {time} — تعذّر جلب نسخة أحدث. المواعيد صحيحة، لكن الأرقام الفعلية لما صدر بعدها قد لا تظهر',
  calSampleBanner: '⚠ أمثلة توضيحية لا أحداث هذا الأسبوع — مواعيدها وأرقامها ليست للتداول عليها. تعذّر جلب التقويم الحي الآن',
  calForecast: 'توقّع',
  calPrevious: 'سابق',
  calActual: 'فعلي',
  reportsTitle: 'تقارير MATRIX',
  reportsSubGrid: 'نفس حجم الفريمات · قدّم/أخّر · اضغط للقراءة',
  reportsSub: 'أسبوعي · أداء · رأي المنصة ونصائح',
  reportWeeklyTitle: 'تقرير أسبوعي',
  reportWeeklyHint: 'أرباح وخسائر',
  reportPerformanceTitle: 'تقرير أداء',
  reportPerformanceHint: 'انضباط وتنفيذ',
  reportAdviceTitle: 'ملاحظات للأسبوع القادم',
  reportAdviceHint: 'خمس نقاط عملية',
  reportRiskTitle: 'موجز مخاطر',
  reportRiskHint: 'إدارة رأس المال',
  reportOpenWord: 'مفتوح ↓',
  reportAiFallbackNote: 'تعذر الاتصال بالذكاء الاصطناعي — هذا قالب عام بدل تحليل مخصَّص',
  reportJournalDataLine:
    'بيانات دفتر الصفقات الفعلية (كل الصفقات المغلقة، لا هذا الأسبوع وحده): صفقات={trades}، نجاح={winRate}%، مجموع حركة السعر={pnl}%، أفضل صفقة={best}%، أسوأ صفقة={worst}%. النسب حركة سعر من الدخول للخروج بلا حجم الصفقة — ليست ربحاً أو خسارة من الحساب، فلا تسمّها كذلك. اعتمد عليها في التقرير.',
  reportJournalEmptyLine: '(لا توجد صفقات مغلقة في الدفتر بعد — لا أرقام أداء لعرضها).',
  reportJournalUnavailableLine: '(تعذّرت قراءة دفتر الصفقات الآن — التقرير بلا أرقامك).',
  reportFallbackWeekly: 'تقرير من دفتر الصفقات{journalLine}\nسجّل صفقاتك في تبويب «الدفتر» لبناء تقرير أدق.',
  reportFallbackPerformance: 'تقييم مبني على الدفتر{journalLine}',
  reportFallbackRisk: 'موجز مخاطر{journalLine}\n1) مخاطرة 1% للصفقة، 2% حدّاً أقصى.\n2) وقف واضح.\n3) تجنّب الأخبار الثقيلة.',
  reportFallbackAdvice:
    'ملاحظات للأسبوع القادم{journalLine}\n1) راجع صفقاتك المفتوحة ووقف كلٍّ منها.\n2) قبل تحليل أزواج الدولار والذهب، انظر قوة الدولار على أكثر من زوج (EURUSD وUSDJPY).\n3) مخاطرة 1% للصفقة، 2% حدّاً أقصى.\n4) افتح التقويم وتجنّب الدخول قبيل الأخبار عالية التأثير.\n5) ركّز على 2–3 أزواج تعرف حركتها.',
  journalTitle: 'دفتر الصفقات · PnL من صفقاتك',
  journalSub: 'سجّل صفقاتك — التقارير تُبنى من يوميتك',
  journalStatClosed: 'صفقات مغلقة: {n}',
  journalStatWinRate: 'نسبة نجاح: {pct}%',
  journalStatPriceMoveSum: 'مجموع حركة السعر (بلا حجم الصفقة): {pct}%',
  journalCentMoneyNote: 'حساب سنت: المبالغ بالسنت الأمريكي (USC) كما تظهر في حسابك — كل 100 USC = 1 USD',
  journalMiniNoMoney:
    'حساب mini: الدفتر يحفظ النقاط والأسعار بلا مبالغ — حجم لوت mini يختلف بين الوسطاء (10,000 وحدة عند أكثرهم)، فلا نحسب مالاً قد يكون خاطئاً. راجع الربح بمنصّتك',
  journalMoneyUsc: '{usc} USC (≈ {usd} USD)',
  journalStatBestWorst: 'أفضل/أسوأ: {best}% / {worst}%',
  journalStatsPending:
    'لا صفقات مغلقة بعد — نسبة النجاح وصافي الـpip تظهر بعد إغلاق أول صفقة، والنتيجة بالمال حين تكتب حجم اللوت.',
  journalStatNetPips: 'الصافي: {pips} pip',
  journalStatNetPipsBySymbol: 'الصافي لكل أداة: {parts}',
  journalStatAvgR: 'متوسط النتيجة: {r} لكل صفقة ({n} بوقف مسجَّل)',
  journalSideA11yPrefix: 'اتجاه الصفقة',
  journalSymbolPlaceholder: 'الرمز',
  journalSymbolA11y: 'رمز الصفقة',
  journalEntryPlaceholder: 'دخول',
  journalUseLivePrice: '↓ السعر الحالي',
  journalUseLivePriceA11y: 'تعبئة سعر الدخول بالسعر الحالي (Ask للشراء، Bid للبيع)',
  journalNoLiveQuote: 'لا سعر حديث لهذا الرمز الآن (لم يصل سعر خلال آخر 3 دقائق) — اكتب سعر الدخول يدوياً',
  journalEntryA11y: 'سعر الدخول',
  journalExitPlaceholder: 'خروج (اختياري)',
  journalSizePlaceholder: 'الحجم لوت (اختياري)',
  journalSizeA11y: 'حجم الصفقة باللوت (اختياري)',
  journalSizeUnitsFix: '⚠ {n} تبدو عدد وحدات لا لوتات — اضغط لتحويلها إلى {lots} lot',
  journalSizeUnitsNoFix: '⚠ {n} lot حجم غير واقعي — يبدو عدد وحدات منسوخاً من منصّتك؛ اكتب الحجم باللوت (مثل 0.10)',
  journalSizeDottedFix: '⚠ {n}: هل تقصد {units} وحدة أم {whole} lot؟ اضغط لتحويلها إلى {lots} lot، أو اكتب {whole} إن كانت لوتات',
  journalSizeFromSmallFix: '⚠ «{n}» كُتبت لـ{prev} — على {symbol} تعني {n} لوت عادي، أي مئة ضعف. اضغط لتحويلها إلى {std} lot',
  journalExitA11y: 'سعر الخروج (اختياري)',
  journalExitAtSlA11y: 'الخروج عند وقف الخسارة {price}',
  journalExitAtBeA11y: 'الخروج عند سعر الدخول (تعادل) {price}',
  journalExitAtProfitStopA11y: 'الخروج عند الوقف المنقول إلى الربح {price}',
  journalExitAtTpA11y: 'الخروج عند الهدف {price}',
  journalSlAtPipsA11y: 'وقف الخسارة على بُعد {pips} pip من الدخول: {price}',
  journalNotePlaceholder: 'ملاحظة',
  journalSlPlaceholder: 'وقف الخسارة (اختياري)',
  journalTpPlaceholder: 'الهدف (اختياري)',
  journalInvalidEntry: 'اكتب رمزاً صحيحاً (مثل EURUSD أو XAUUSD) وسعر الدخول',
  journalResultR: 'النتيجة {r}',
  journalNoteA11y: 'ملاحظة الصفقة (اختياري)',
  noteCharsLeft: 'الأحرف الباقية: {n} من {max}',
  noteCharsLeftReserved: 'الأحرف الباقية: {n} من {max} — و{reserved} محجوزة لعلامة «1.00 lot» أو «1R @ …» التي تُحفظ مع ملاحظتك',
  journalInitialStopNote:
    '«1R @ {stop}» بالملاحظة يحفظ وقفك الأصلي عند الدخول: منه تُقاس النتيجة بـR ونسبة R:R المخطَّطة مهما حرّكت الوقف بعده. احذفه فتُقاس من الوقف الحالي',
  journalStopTypoFix: 'أصحّح خطأً كتابياً بالوقف — لا أحرّكه',
  journalCappedNote:
    'يظهر هنا أحدث {n} صفقة فقط، ومنها وحدها تُحسب الإحصاءات. صفقاتك الأقدم باقية على الخادم لكنها لا تظهر ولا تُحسب — حتى المفتوحة منها',
  journalAddA11y: 'إضافة صفقة جديدة',
  journalAddBtn: 'إضافة صفقة',
  journalAddError: 'تعذر إضافة الصفقة — تحقق من الاتصال وحاول مرة أخرى',
  journalCloseFailedTitle: 'تعذر الإغلاق',
  journalCloseFailedBody: 'تعذّر تأكيد الإغلاق — تحقّق من الاتصال. إن بقيت الصفقة «مفتوحة» في القائمة فأغلقها مرة أخرى.',
  journalEmpty:
    'لا صفقات مسجّلة بعد — سجّل كل صفقة (حتى على حساب تجريبي) لتعرف مع الوقت ما ينجح معك وما لا ينجح. اكتبها بالنموذج أعلاه («↓ السعر الحالي» يملأ الدخول لحظة فتحها)، أو احسبها في «المخاطرة» ثم اضغط «سجّل هذه الخطة بالدفتر».',
  journalOpenSuffix: '(مفتوحة)',
  journalOpenRiskNoStop: 'صفقات مفتوحة بلا وقف: {n} — خسارتها بلا حدّ، فلا يُجمع خطر المفتوحة',
  journalOpenRiskUnknown: 'صفقات مفتوحة بحجم أو عقد غير معروف: {n} — مخاطرتها بالمال لا تُحسب، فلا يُجمع خطر المفتوحة',
  journalOpenRiskPartial: 'بعض صفقاتك المفتوحة لم تُحمَّل بعد، فلا يُجمع خطر المفتوحة — اضغط «تحميل الأقدم» لرؤيته',
  journalExposureStacked: 'صفقات مفتوحة تراهن على {ccy} بالاتجاه نفسه: {n} — خبرٌ واحد يضربها معاً، فمخاطرتها تتجمّع لا تتوزّع',
  journalExposureStackedDraft: 'بهذه الصفقة يصير عدد صفقاتك التي تراهن على {ccy} بالاتجاه نفسه {after} (المفتوحة الآن: {before}) — خبرٌ واحد يضربها معاً، فمخاطرتها تتجمّع لا تتوزّع',
  journalClosedWord: 'مغلقة',
  journalCloseNeedsExit: 'اكتب سعر الخروج في خانة «خروج» أعلى النموذج، ثم اضغط «إغلاق بسعر خانة الخروج» تحت الصفقة.',
  journalDeleteConfirmTitle: 'حذف هذه الصفقة من الدفتر؟',
  journalDeleteFailedBody: 'لم نتأكّد من الحذف — تحقّق من الاتصال. إن بقيت الصفقة بالدفتر فاحذفها مرة أخرى.',
  journalDeleteA11y: 'حذف صفقة {symbol} من الدفتر',
  journalEditBtn: 'تعديل',
  journalEditA11y: 'تعديل صفقة {symbol}',
  journalEditingBanner: 'تعديل صفقة {symbol} — غيّر الحقول ثم «حفظ التعديل». امسح خانة الخروج لإعادتها مفتوحة.',
  journalSaveEditBtn: 'حفظ التعديل',
  journalCancelEdit: 'إلغاء التعديل',
  journalEditError: 'تعذّر حفظ التعديل — تحقّق من الاتصال وحاول مرة أخرى',
  journalEditConflict: 'لم يُحفظ التعديل: أُغلقت هذه الصفقة أو أُعيد فتحها أو عُدِّلت من جهاز آخر أثناء تعديلك. القائمة محدَّثة الآن — راجع حالتها ثم احفظ من جديد إن لزم.',
  journalCloseLinkA11y: 'إغلاق صفقة {symbol} بسعر خانة الخروج',
  journalCloseLinkBtn: 'إغلاق بسعر خانة الخروج',
  journalCloseMarketBtn: 'إغلاق بالسعر الحالي',
  journalCloseMarketA11y: 'إغلاق صفقة {symbol} بالسعر الحالي',
  journalCloseMarketConfirmTitle: 'إغلاق بالسعر الحالي؟',
  journalCloseMarketConfirmBody: '{side} {symbol} · {entry} → {exit}\nالنتيجة: {result}\n\nالسعر من مزوّد البيانات (Bid للشراء، Ask للبيع) وقد يختلف قليلاً عن سعر وسيطك — يمكنك تعديله بعد الإغلاق.',
  journalCloseFieldConfirmTitle: 'إغلاق بسعر خانة الخروج؟',
  journalCloseMarketConfirmBtn: 'إغلاق',
  journalCloseMarketNoQuote: 'لا سعر حديث لهذا الرمز الآن (لم يصل سعر خلال آخر 3 دقائق) — اكتب سعر الخروج بخانة «خروج» ثم «إغلاق بسعر خانة الخروج»',
  journalClosedElsewhereTitle: 'الصفقة مغلقة من قبل',
  journalClosedElsewhereBody: 'أُغلقت هذه الصفقة من جهاز آخر، فلم نسجّل خروجاً ثانياً فوقها. القائمة محدَّثة الآن بسعر خروجها ونتيجتها المسجَّلين.',
  journalCloseConflictTitle: 'لم يُسجَّل الإغلاق',
  journalCloseConflictBody: 'عُدِّلت هذه الصفقة من جهاز آخر في اللحظة نفسها، فلم نسجّل خروجك فوق ذلك التعديل. القائمة محدَّثة الآن — راجع الصفقة ثم أغلقها من جديد إن لزم.',
  backtestSub: 'MA · RSI · MACD · BB · منحنى رأس المال',
  backtestSymbolA11y: 'رمز الأداة للاختبار الخلفي',
  backtestStrategyA11yPrefix: 'استراتيجية',
  backtestRunA11y: 'تشغيل الاختبار الخلفي',
  backtestRunBtn: 'شغّل الاختبار',
  backtestRunError: 'تعذر تشغيل الاختبار الخلفي — تحقق من الاتصال وحاول مرة أخرى',
  noLiveDataResult: 'لا تتوفر بيانات سوق حقيقية لهذا الرمز الآن — لا نحسب النتيجة على أسعار تجريبية. حاول لاحقاً.',
  backtestStatTrades: 'صفقات: {n}',
  backtestStatWinRate: 'نسبة نجاح: {pct}%',
  backtestStatReturn: 'عائد إجمالي: {pct}%',
  backtestStatEquity: 'رأس المال النهائي: {v}',
  backtestStatDrawdown: 'أقصى هبوط: {pct}%',
  backtestStatAvgWinLoss: 'متوسط ربح/خسارة: {win}% / {loss}%',
  backtestStatAvgWin: 'متوسط الربح: {win}% — لا صفقة خاسرة',
  backtestStatAvgLoss: 'متوسط الخسارة: {loss}% — لا صفقة رابحة',
  backtestNoTrades: 'لم تُولِّد الاستراتيجية أي صفقة بهذه الفترة — لا نسبة نجاح ولا عائد لعرضهما. جرّب فريماً آخر.',
  // «(12 صفقات)» خطأ (11–99 تُتبع بمفرد) — «عدد الصفقات: n» يصحّ لكل عدد
  backtestSmallSample: '⚠ عينة صغيرة (عدد الصفقات: {n}) — نسبة النجاح هنا غير موثوقة؛ لا تبنِ قراراً على أقل من ~30 صفقة.',
  backtestSpreadNote: 'النتائج بعد خصم سبريد تقديري {pips} pip لكل صفقة (يختلف حسب الوسيط).',
  backtestTitle: 'اختبار خلفي للاستراتيجية',
  backtestEquityTitle: 'منحنى رأس المال',
  backtestStratMaCross: 'تقاطع MA',
  backtestStratRsi: 'انعكاس RSI',
  backtestStratMacd: 'تقاطع MACD',
  backtestStratBb: 'ارتداد BB',
  indAlertsTitle: 'تنبيهات المؤشرات',
  indAlertsSub: 'RSI · تقاطع MA · MACD',
  indAlertsSymbolA11y: 'رمز الأداة',
  indAlertsTypeA11yPrefix: 'نوع تنبيه المؤشر',
  indAlertsTypeRsi: 'RSI',
  indAlertsTypeMaCross: 'تقاطع المتوسط المتحرك',
  indAlertsTypeMacdCross: 'تقاطع MACD',
  indAlertsBelowA11y: 'شرط: RSI تحت العتبة',
  indAlertsAboveA11y: 'شرط: RSI فوق العتبة',
  indAlertsBelowChip: 'RSI تحت',
  indAlertsAboveChip: 'RSI فوق',
  indAlertsThresholdA11y: 'قيمة عتبة المؤشر',
  indAlertsCrossUpA11y: 'شرط: تقاطع صاعد',
  indAlertsCrossDownA11y: 'شرط: تقاطع هابط',
  indAlertsCrossUpChip: 'تقاطع صاعد ▲',
  indAlertsCrossDownChip: 'تقاطع هابط ▼',
  indAlertsAddA11y: 'إضافة تنبيه مؤشر',
  indAlertsAddBtn: 'إضافة تنبيه',
  indAlertsAddError: 'تعذر إضافة تنبيه المؤشر — تحقق من الاتصال وحاول مرة أخرى',
  indAlertsLoadError: 'تعذّر تحميل تنبيهات المؤشرات — تحقّق من الاتصال. تنبيهاتك المحفوظة لم تُحذف.',
  indAlertsEmpty:
    'لا تنبيهات مؤشرات بعد — اختر مؤشراً وشرطاً بالأعلى (RSI تحت 30 مثلاً) ليصلك إشعار دون مراقبة الشارت.',
  indAlertsDeleteConfirmTitle: 'حذف تنبيه المؤشر؟',
  indAlertsDeleteFailedTitle: 'تعذر الحذف',
  indAlertsDeleteFailedBody: 'لم نتأكّد من الحذف — تحقّق من الاتصال. إن بقي تنبيه المؤشر بالقائمة فاحذفه مرة أخرى.',
  indAlertsDeleteA11yPrefix: 'حذف تنبيه مؤشر',
  indAlertsPushTitle: 'MATRIX · تنبيه مؤشر',
  indAlertsTfLabel: 'الفريم:',
  indAlertsHintRsi: 'RSI 14: تحت 30 = تشبّع بيعي، فوق 70 = تشبّع شرائي — قد يبقى متشبّعاً طويلاً بترند قوي',
  indAlertsHintMa: 'المتوسط السريع SMA 9 يقطع البطيء SMA 21 على آخر شمعة من الفريم المختار',
  indAlertsHintMacd: 'خط MACD (12، 26) يقطع خط الإشارة (9) على آخر شمعة من الفريم المختار',
  indAlertsRsiRange: 'عتبة RSI رقم بين 1 و99 (الشائع 30 أو 70)',
  indAlertsSymbolInvalid: 'اكتب رمزاً صحيحاً مثل EURUSD',
  indAlertsArmed: '✓ التنبيه مفعَّل:',
  indAlertsFiredTag: 'أُطلق',
  indAlertsRearmBtn: 'إعادة التفعيل',
  indAlertsRearmA11yPrefix: 'إعادة تفعيل التنبيه',
  indAlertsRearmedMsg: '✓ يراقب من جديد: {desc} — إن كان الشرط ما زال متحققاً يُطلق بالفحص التالي',
  indAlertsRearmFailed: 'تعذّرت إعادة التفعيل — تحقّق من الاتصال وحاول مرة أخرى',
  indAlertsWatchingTag: 'يراقب',
  calendarTitle: 'التقويم الاقتصادي',
  calendarCurrencyA11yPrefix: 'تصفية حسب العملة',
  calendarAllWord: 'الكل',
  newsAllCurrencies: 'كل العملات',
  calendarImpactA11yPrefix: 'تصفية حسب الأهمية',
  calendarAllShort: 'كل',
  calImpactMedPlus: 'متوسط+',
  calImpactMedPlusA11y: 'عالي ومتوسط',
  calendarLoading: 'جاري تحميل التقويم…',
  calendarLoadError: 'تعذّر تحميل التقويم — تحقّق من الاتصال. يعيد المحاولة وحده كل 5 دقائق، أو غيّر أحد الفلاتر لتعيدها الآن',
  calendarEmpty:
    'لا أحداث بهذا الفلتر هذا الأسبوع — اضغط ALL بصفّ العملة أو «كل» بصفّ الأهمية لترى المزيد. التقويم يعرض الأسبوع الجاري فقط.',
  layoutDefaultName: 'تخطيطي',
  layoutFallbackName: 'تخطيط',
  layoutsTitle: 'تخطيطات محفوظة',
  layoutNamePlaceholder: 'اسم التخطيط',
  layoutNameA11y: 'اسم التخطيط',
  layoutSaveA11y: 'حفظ التخطيط الحالي',
  layoutSaveBtn: 'حفظ التخطيط الحالي',
  layoutApplyA11yPrefix: 'تطبيق تخطيط',
  layoutDeleteConfirmTitle: 'حذف التخطيط؟',
  layoutsHint: 'التخطيط = أزواج وفريمات الشارتات الثلاثة بالشاشة الرئيسية. اضغط تخطيطاً لتطبيقه وفتح الشارت.',
  layoutCurrentTag: 'الحالي',
  layoutSavedMsg: '✓ حُفظ:',
  layoutBuiltinName: 'افتراضي',
  layoutDeleteA11yPrefix: 'حذف تخطيط',
  coursesTitle: 'الأكاديمية',
  coursesSub: 'شاشة كاملة · شرح صوتي · أوقف واسأل عن أي جزء',
  coursesStaleNote: 'تعذر تحديث قائمة المدارس — تُعرض بيانات محفوظة',
  coursesNoteTitle: 'تصنيف مهم',
  coursesNoteText:
    'BOS و CHOCH ضمن جماعة Order Block و Fair Value Gap داخل مدرسة ICT/SMC — وليست مدرسة منفصلة.',
  coursesSchoolA11yPrefix: 'مدرسة',
  coursesLevelsWord: 'مستويات',
  coursesLecturesUnitWord: 'محاضرة',
  coursesNarratedBadge: '🔊 شرح صوتي كامل',
  coursesFallbackNote: 'تعذر تحميل المنهج الكامل — تُعرض محاضرة افتتاحية مؤقتة فقط',
  coursesLevelWord: 'المستوى',
  coursesLectureA11yPrefix: 'محاضرة',
  coursesMinuteWord: 'دقيقة',
  coursesMinuteAbbrev: 'د',
  coursesBackToSchoolsA11y: 'رجوع لقائمة المدارس',
  coursesBack: 'رجوع',
  coursesFallbackLevelTitle: 'التأسيس',
  coursesFallbackLectureTitle: 'محاضرة افتتاحية',
  coursesFallbackOutlineIntro: 'مقدمة',
  lectureClose: 'إغلاق',
  lectureCloseA11y: 'إغلاق المحاضرة',
  lectureLevelWord: 'مستوى',
  lectureLoadFailedNote: 'لم تصل المحاضرة من الخادم — ما يلي ليس درساً. تحقّق من اتصالك ثم افتحها من جديد.',
  lectureFullScreenTag: 'شاشة كاملة',
  lectureVoicePausedForQ: 'متوقف للسؤال',
  lecturePreparingVoice: 'يجهّز الصوت…',
  lectureExplainingNow: 'يشرح الآن',
  lectureVoicePlayError: 'تعذّر تشغيل الصوت — تحقّق من اتصالك. نصّ الدرس كامل أمامك ويمكنك متابعته قراءةً.',
  lectureChartLabel: 'شارت تفاعلي',
  lectureHideChart: 'إخفاء',
  lectureHideChartA11y: 'إخفاء الشارت التفاعلي',
  lectureShowChart: 'إظهار الشارت التفاعلي',
  lectureChartPracticeNote: 'بلا اتصال بالخادم: هذه شموع تدريبية لا أسعار السوق. تدرّب عليها كما تشاء، لكن ما ترسمه هنا لا يُحفظ.',
  lectureVoiceStopped: 'الصوت متوقف',
  lectureGenerating: 'جاري التوليد…',
  lectureVoiceActive: 'شرح صوتي نشط',
  lectureSegmentWord: 'مقطع',
  lectureCompleteBadge: '🎉 أنهيت هذه المحاضرة',
  lectureClarifyTitle: 'توضيح بعد إيقاف الشرح',
  lectureClarifyPausedLine: 'توقف الشرح مؤقتاً.',
  lectureClarifyQuestionLabel: 'سؤالك:',
  lectureClarifyFocusLine:
    'ركّز على الفكرة العملية على الشاشة، ثم نتابع من نفس المقطع.',
  lectureResume: 'متابعة المحاضرة',
  lecturePrev: 'السابق',
  lecturePrevA11y: 'الفقرة السابقة',
  lectureNext: 'التالي',
  lectureNextA11y: 'الفقرة التالية',
  lectureInterruptLabel: 'أوقف الشرح واسأل عن جزء غير واضح',
  lectureQuestionPlaceholder: 'مثال: لم أفهم CHOCH…',
  lectureQuestionA11y: 'سؤال أثناء إيقاف الشرح',
  lectureAskBtn: 'اسأل',
  lectureAskA11y: 'إرسال السؤال',
  lectureFallbackTitle: 'تعذّر تحميل المحاضرة',
  lectureFallbackOutlineDefinition: 'ماذا حدث',
  lectureFallbackOutlineApplication: 'ماذا تفعل',
  lectureFallbackTeacher: 'الشرح الصوتي',
  lectureFallbackSeg1Title: 'ماذا حدث',
  lectureFallbackSeg1Narration:
    'لم نتمكّن من تحميل هذه المحاضرة الآن، والأرجح أن الاتصال بالإنترنت أو بخادم MATRIX انقطع.',
  lectureFallbackSeg2Title: 'ماذا تفعل',
  lectureFallbackSeg2Narration:
    'تحقّق من اتصالك، ثم أغلق هذه الشاشة وافتح المحاضرة من جديد.',
  termShadowSizeSmall: 'صغير',
  termShadowSizeMedium: 'وسط',
  termShadowSizeBig: 'كبير',
  termServerOnline: 'متصل بالخادم',
  termServerOffline: 'لا اتصال بالخادم',
  termLastPriceWord: 'آخر سعر',
  termIndicatorsWord: 'مؤشرات',
  termAlertWord: 'تنبيه',
  termKindWord: 'نوع',
  termFrameWord: 'فريم',
  termSquareWord: 'مربع',
  termRectWord: 'مستطيل',
  termLayoutSquareA11yPrefix: 'تخطيط مربع',
  termLayoutRectA11yPrefix: 'تخطيط مستطيل',
  termShadowFrameA11y: 'فريم الظل',
  termShadowWord: 'الظل',
  termTimeSyncLabel: 'مزامنة الزمن',
  termTimeSyncUnavailable: 'مزامنة الزمن لا تعمل بتخطيط «الظل»',
  termToolA11yPrefix: 'أداة',
  termChartKindA11yPrefix: 'نوع الشارت',
  termSymbolA11yPrefix: 'رمز',
  termManageWatchlistLabel: 'إدارة قائمة المتابعة',
  termManageWord: 'إدارة',
  termPrimaryWord: 'أساسي',
  termShadowHintText: 'أساسي فوق · الظلال تحته من الأكبر إلى الأصغر',
  termPrimaryTimeframeA11yPrefix: 'الإطار الزمني الأساسي',
  termOnWord: 'تشغيل',
  termOffWord: 'إيقاف',
  termTimeframeWord: 'إطار زمني',
  termTimeframeA11yPrefix: 'الإطار الزمني',
  termOpenFullscreenA11y: 'فتح الشارت بملء الشاشة',
  termFullscreenLabel: 'ملء الشاشة ⛶',
  termFxMarketWord: 'سوق العملات',
  termSpreadWord: 'سبريد',
  termBidLabel: 'البيع',
  termAskLabel: 'الشراء',
  termSquareFramesHintSuffix: 'فريمات مربعة · اسحب النقاط بزاوية أي مربع لتبديل مكانه · المؤشرات اختيارية',
  termHintMoveText:
    'التوقعات · التنبيهات · الأخبار · المجتمع → أدوات · اسحب النقاط بزاوية الفريم لتبديل مكانه مع فريم آخر',
  termCloseWatchlistA11y: 'إغلاق قائمة المتابعة',
  wlTitle: 'قائمة متابعة',
  wlAddBtn: 'إضافة',
  wlAddA11y: 'إضافة رمز للمتابعة',
  wlResetBtn: 'افتراضي',
  wlResetA11y: 'إعادة قائمة المتابعة للافتراضي',
  wlResetConfirmTitle: 'إعادة قائمة المتابعة للافتراضي؟',
  wlResetConfirmBody: 'سيتم استبدال كل الرموز المضافة يدوياً بالقائمة الافتراضية.',
  wlResetConfirmBtn: 'إعادة للافتراضي',
  wlSearchPlaceholder: 'بحث رمز…',
  wlLoadError: 'تعذّرت قراءة قائمة المتابعة من الهاتف — اضغط «إعادة المحاولة»',
  layoutSaveFailed: 'تعذّر حفظ التخطيط على الهاتف — تحقّق من مساحة التخزين وحاول مرة أخرى',
  layoutDeleteFailed: 'تعذّر حذف التخطيط — قد يعود للقائمة عند فتحها مجدداً، فاحذفه مرة أخرى',
  chartTemplateSaveFailed: 'تعذّر حفظ الإعداد الافتراضي على الهاتف — تحقّق من مساحة التخزين وحاول مرة أخرى',
  drawingsSaveFailed: 'لم تُحفظ الرسومات على الهاتف — تحقّق من مساحة التخزين، وإلا ضاعت بتبديل الرمز أو إغلاق التطبيق',
  drawingsDeleteFailed: 'لم تُمسح الرسومات من الهاتف — قد تعود عند فتح هذا الشارت مجدداً',
  wlSaveFailed: 'لم يُحفظ التعديل — أُعيدت القائمة كما كانت. تحقّق من مساحة التخزين وحاول مرة أخرى',
  wlRetryA11y: 'إعادة محاولة تحميل قائمة المتابعة',
  wlRetryBtn: 'إعادة المحاولة',
  wlLoadingWord: 'جاري التحميل…',
  wlEmpty:
    'لا رموز في المتابعة — أضف أزواجك من الزرّ أدناه لتراها بسعرها وتغيّرها اليومي وتبدّل الشارت بنقرة.',
  wlAddEmptyBtn: 'إضافة رمز',
  wlDemoPriceA11ySuffix: ' · سعر افتراضي',
  wlDemoTag: 'افتراضي',
  wlMoveUpA11y: 'تحريك لأعلى',
  wlMoveDownA11y: 'تحريك لأسفل',
  wlRemoveA11y: 'إزالة من المتابعة',
  wlRemoveConfirmTitle: 'إزالة من المتابعة؟',
  wlRemoveConfirmBtn: 'إزالة',
  wlCatalogTitle: 'إضافة من الكتالوج',
  wlCatalogAllAdded: 'كل رموز الكتالوج مضافة',
  wlCatalogCloseA11y: 'إغلاق نافذة الإضافة',
  focusSymbolA11yPrefix: 'الرمز',
  focusVsWord: 'مقابل',
  focusPhoneSubHint: 'اضغط لتغيير الرمز',
  focusDesktopSub: 'محطة التحليل · رسم · مقارنة · تنبيهات',
  focusLastPriceWord: 'آخر سعر',
  focusWatchlistTitle: 'قائمة المراقبة',
  focusCompareHint: 'اضغط مطوّلاً على رمز لتقارنه بالشارت، ومرة أخرى لإزالته',
  focusCompareTag: 'مقارنة',
  focusPickSymbolA11yPrefix: 'اختيار الرمز',
  focusCompareNotePrefix: 'مقارنة مع',
  focusCompareNoteSuffix: '(بنفسجي)',
  focusCompareUnavailable: 'تعذّر تحميل بيانات {sym} الحقيقية — لا خط مقارنة',
  focusInComparisonSuffix: ' · قيد المقارنة',
  focusAlertCreateFailedTitle: 'تعذر إنشاء التنبيه',
  focusAlertCreateFailedBody:
    'لم يُنشأ التنبيه. تحقّق من اتصالك وحاول مرة أخرى. التنبيه يحتاج سعراً حقيقياً للرمز ليعرف أينتظر صعوداً أم هبوطاً، فلا يُنشأ والشارت يعرض أسعاراً تجريبية.',
  focusAlertFromDrawingNote: 'من خط رسم',
  focusAlertFromChartNote: 'من الشارت',
  gridFramesWord: 'الفريمات',
  gridSquaresWord: 'المربعات',
  gridSquaresA11y: 'عرض الفريمات كمربعات',
  gridHandleA11y: 'مقبض ترتيب الفريم — يبدّل مكانه مع فريم آخر',
  gridHandlePosA11y: 'الفريم {n} من {total}',
  gridRectanglesWord: 'المستطيلات',
  gridRectanglesA11y: 'عرض الفريمات كمستطيلات',
  quadCloseA11y: 'إغلاق عرض 2×2',
  quadTitlePrefix: 'محطة 2×2',
  spmCloseA11y: 'إغلاق قائمة الأزواج',
  spmOpenA11y: 'فتح قائمة الأزواج',
  spmPanelTitle: 'أزواجك',
  panSpeedMarkA11y: 'مثبت السرعة',
  panTapDetailsSuffix: '— اضغط للتفاصيل',
  panHideDetailsA11y: 'إخفاء تفاصيل السرعة',
  panChartSpeedPrefix: 'مثبت سرعة الشارت',
  lensA11yPrefix: 'عدسة: ',
  drawToolA11yPrefix: 'أداة رسم: ',
  lensSectionTitle: 'عدسة',
  ctlKindCandles: 'شموع',
  ctlKindHollow: 'شموع مجوّفة',
  ctlKindHeikin: 'هايكن آشي',
  ctlKindBars: 'أعمدة',
  ctlKindLine: 'خط',
  ctlKindArea: 'مساحة',
  ctlKindBaseline: 'خط أساس',
  ctlKindRange: 'نطاق',
  ctlKindRenko: 'رينكو',
  ctlKindKagi: 'كاجي',
  ctlKindPnf: 'نقطة ورقم',
  ctlKindLineBreak: 'كسر الخطوط',
  ctlToolNone: 'بلا رسم',
  ctlToolSelect: 'تحديد',
  ctlToolTrend: 'ترند',
  ctlToolRay: 'شعاع',
  ctlToolHline: 'أفقي',
  ctlToolVline: 'عمودي',
  ctlToolRect: 'مستطيل',
  ctlToolFib: 'فيبو',
  ctlToolZone: 'منطقة',
  ctlToolNote: 'ملاحظة',
  ctlToolMeasure: 'قياس',
  ctlToolLong: 'خطة شراء',
  ctlToolShort: 'خطة بيع',
  ctlToolHray: 'شعاع أفقي',
  ctlToolChannel: 'قناة',
  ctlLensClean: 'نظيف',
  ctlLensCleanHint: 'سعر فقط',
  ctlLensStructure: 'هيكل',
  ctlLensStructureHint: 'SMA + EMA',
  ctlLensMomentum: 'زخم',
  ctlLensMomentumHint: 'RSI + MACD',
  ctlLensLiquidity: 'سيولة',
  ctlLensLiquidityHint: 'فوليوم + بولنجر + CVD',
  ctlIndBollinger: 'بولنجر',
  ctlIndVolume: 'فوليوم',
  backtestWord: 'اختبار',
  depthWord: 'السبريد',
  mspDrawTitle: 'أدوات الرسم · MATRIX',
  mspIndicatorsTitle: 'المؤشرات · MATRIX',
  mspKindsTitle: 'أنواع الشارت',
  mspAlertsTitle: 'تنبيهات السعر',
  mspIndAlertsTitle: 'تنبيهات المؤشرات',
  mspCalendarTitle: 'التقويم الاقتصادي',
  mspScreenerTitle: 'فحص السوق',
  mspReportsTitle: 'تقارير MATRIX',
  mspBacktestTitle: 'اختبار خلفي للاستراتيجية',
  mspNewsTitle: 'الأخبار',
  mspDomTitle: 'Bid / Ask',
  mspJournalTitle: 'دفتر الصفقات',
  mspIndicatorA11yPrefix: 'مؤشر: ',
  mspIndicatorEnabledSuffix: ' · مفعّل',
  mspKindA11yPrefix: 'نوع الشارت: ',
  dockDrawTab: 'رسم',
  dockSignalsTab: 'توقعات',
  dockAnalystsTab: 'محللون',
  dockSocialTab: 'قنوات',
  dockIndForecastTab: 'مؤشرات+',
  dockScreenerTab: 'فحص',
  dockAlertsTab: 'تنبيهات',
  dockNewsTab: 'أخبار',
  dockCommunityTab: 'مجتمع',
  dockHideBtn: 'إخفاء',
  dockHideA11yPrefix: 'إخفاء ',
  dockPanelFallback: 'اللوحة',
  dockLibraryFallback: 'مكتبة',
  dockMoreTab: 'المزيد',
  dockMoreA11y: 'لوحات أخرى',
  dockDrawToolSectionTitle: 'أداة الرسم',
  dockTabA11yPrefix: 'تبويب: ',
  railDrawSectionTitle: 'رسم',
  railPanelsSectionTitle: 'لوحات',
  railPanelA11yPrefix: 'لوحة: ',
  railTipAlert: 'تنبيه',
  railTipIndicator: 'مؤشّر',
  railTipReport: 'تقرير',
  railTipNewsItem: 'خبر',
  railOpenQuadA11y: 'فتح تخطيط 2×2',
  cfSyncLeaderBadge: 'قائد الزمن',
  cfSyncPartialBadge: 'متزامن · جزئي',
  cfSyncFollowBadge: 'متزامن',
  cfSubtitleInteractive: 'محرك MATRIX · عدسات وأدوات',
  cfSubtitleNavigate: 'اسحب الوسط · السعر · التواريخ',
  cfSubtitleDefault: 'اضغط للتحليل الكامل',
  cfSyncActivateA11yPrefix: 'اجعله قائد الزمن: ',
  cfChangeSymbolA11y: 'تغيير الرمز',
  cfDayChangeA11y: 'تغيّر اليوم {pct}',
  cfDayChangeNoneA11y: 'تغيّر اليوم غير متاح لهذا السعر',
  cfMarketClosedA11y: 'السوق مغلق حالياً',
  cfReplayPriceA11y: 'إعادة الشموع — السعر إغلاق شمعة الإعادة لا السعر الحيّ',
  cfMarketClosedTag: 'مغلق',
  cfSpreadBidAskA11y: 'Bid (بيع) {bid}، Ask (شراء) {ask}',
  cfSpreadPipsA11y: 'السبريد {pips} pip',
  dsKindProvider: 'مزود',
  dsKindDemo: 'تجريبي',
  dsKindCache: 'مخزن',
  dsKindUnknown: 'مصدر غير محدد',
  dsTickLive: 'حي',
  dsTickDemo: 'تيك تجريبي',
  dsLastPriceWord: 'آخر سعر',
  dsMarketOpen: 'السوق مفتوح',
  dsMarketClosed: 'السوق مغلق',
  // chart/MatrixChart.tsx (i18n الشارت, 2026-09-20)
  mcMonths: [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ],
  mcWeekdays: [
    'الأحد',
    'الإثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
  ],
  mcPrimaryLane: 'أساسي',
  mcMeasureBarsWord: 'شموع',
  mcMeasureDurUnits: { m: ' د', h: ' س', d: ' يوم' },
  mcNoteDefault: 'ملاحظة',
  mcNoteTextA11y: 'نصّ الملاحظة على الشارت — حتى 60 حرفاً',
  mcHintNoteSelected: 'اكتب نصّ الملاحظة بالخانة المجاورة لها · اسحبها لتحريكها · يُحفظ تلقائياً',
  mcHintNoteSelectedWeb: 'اكتب نصّ الملاحظة بالخانة المجاورة لها · اسحبها لتحريكها · Esc لإلغاء التحديد · Ctrl+Z / Ctrl+Y للتراجع والإعادة',
  mcSnapshotSaved: 'تم حفظ لقطة الشارت',
  mcSnapshotFailed: 'تعذّر تصدير الشارت — حاول مرة أخرى، أو خذ لقطة شاشة للشارت',
  mcTemplateDefaultName: 'افتراضي',
  mcTemplateSaved: 'حُفظ كإعداد افتراضي — الشارتات التي تفتحها لاحقاً تبدأ بهذه المؤشرات وإعدادات المقياس',
  mcClearAllTitle: 'مسح كل الرسومات؟',
  mcClearAllBody: 'سيتم حذف كل عناصر الرسم بهذا الرمز على كل الأطر الزمنية',
  mcClearWord: 'مسح',
  mcHintDraw: 'اسحب لرسم، أو المس نقطتين · يُحفظ تلقائياً',
  mcHintNavigate: 'اسحب للتنقل · المس شمعة لقراءتها، أو اضغط مطوّلاً ثم اسحب · باعد إصبعين أو اسحب المحورين للتكبير',
  mcHintNavigateWeb: 'مرّر الفأرة للقراءة · انقر للتثبيت · ←/→ شمعة شمعة · Esc للإلغاء · Alt+R لإعادة العرض · Alt+T ترند، H أفقي، V عمودي، F فيبو',
  mcHintDrawWeb: 'اسحب لرسم، أو انقر نقطتين · Esc للإلغاء · Ctrl+Z / Ctrl+Y للتراجع والإعادة · Alt+T/H/V/F لأداة أخرى · يُحفظ تلقائياً',
  mcHintSelectedWeb: 'اسحب أو استعمل الأسهم لتحريك الرسم (Shift ×10) · Delete لحذفه · Esc لإلغاء التحديد · Ctrl+Z / Ctrl+Y للتراجع والإعادة',
  mcHintSelect: 'المس رسماً لتحديده · المس مكاناً فارغاً لإلغاء التحديد',
  mcHintSelected: 'اسحب الرسم لتحريكه · اسحب مقبضاً لتعديل طرف · يُحفظ تلقائياً',
  mcAutoA11y: 'تلقائي: ملاءمة الأسعار والعودة لآخر شمعة',
  mcAutoManualA11y: 'مقياس السعر يدوي — قد تخرج الشموع الجديدة عن العرض. اضغط لإعادته تلقائياً والعودة لآخر شمعة',
  mcAutoShort: 'تلقائي',
  mcArrowHeadA11y: 'رأس سهم بنهاية خطّ الترند',
  mcArmedAlertAboveA11y: 'تنبيه مفعّل حين يصعد السعر إلى {price} — {dist}',
  mcArmedAlertBelowA11y: 'تنبيه مفعّل حين ينزل السعر إلى {price} — {dist}',
  mcAlertMoveFailed: 'تعذّر نقل التنبيه — ما زال على {price}. تحقّق من الاتصال واسحبه مرة أخرى.',
  mcArmedAlertAdjustHint: 'مرّر لأعلى أو لأسفل لنقل التنبيه خطوة سعر واحدة (pip للأزواج والمعادن) — يُحفظ السعر الجديد بعد توقّف قصير',
  mcEstimatedTag: 'تقديري',
  mcVolEstimatedHint:
    'مزوّدنا لا يرسل حجم تداول لهذا الرمز (الفوركس بلا حجم مركزي) — هذه الأعمدة تقدير من مدى كل شمعة (من أعلاها إلى أدناها). مؤشرات الحجم (OBV وMFI وVWAP وKlinger…) محسوبة من التقدير نفسه، فلا تطابق أرقامها منصّة تعرض حجم التيك من وسيطها.',
  mcZoomOutA11y: 'تصغير',
  mcZoomInA11y: 'تكبير',
  mcPanBackA11y: 'تحريك للخلف',
  mcPanForwardA11y: 'تحريك للأمام',
  mcReplayModeA11y: 'وضع الإعادة',
  mcReplayReadout: 'إعادة الشموع · {n}/{total}',
  mcReplayEndedOnSwitch: 'انتهت الإعادة لتغيّر الإطار الزمني أو الرمز — الشارت الآن على السعر الحيّ',
  mcReplayStepBackA11y: 'خطوة إعادة للخلف',
  mcReplayPauseA11y: 'إيقاف الإعادة',
  mcReplayPlayA11y: 'تشغيل الإعادة',
  mcReplayStepFwdA11y: 'خطوة إعادة للأمام',
  mcMagnetA11y: 'الالتصاق بالشبكة',
  mcDockTitle: 'مرسى الأدوات · MATRIX',
  mcNoPineLine: 'بلا خط معادلة',
  mcExportPng: 'تصدير PNG',
  mcSaveTemplate: 'حفظ كافتراضي',
  mcAlertLine: 'تنبيه خط',
  mcAlertZone: 'تنبيه منطقة',
  mcAlertAtLineLevel: 'تنبيه عند مستوى الخط الحالي',
  mcAlertAtCrossA11y: 'إنشاء تنبيه سعر عند',
  mcUndo: 'تراجع',
  mcUndoA11y: 'تراجع عن آخر تغيير في الرسم',
  mcNothingToUndo: 'لا شيء للتراجع عنه',
  mcRedo: 'إعادة',
  mcRedoA11y: 'إعادة آخر تغيير تراجعتَ عنه في الرسم',
  mcNothingToRedo: 'لا شيء لإعادته',
  mcToLatestA11y: 'العودة لآخر شمعة',
  mcHideDrawings: 'إخفاء الرسوم',
  mcShowDrawings: 'إظهار الرسوم',
  mcLogScaleA11y: 'مقياس لوغاريتمي للسعر',
  mcPercentScaleA11y: 'مقياس النسبة المئوية: التغيّر من أول شمعة ظاهرة',
  mcZigzagDevA11y: 'انحراف ZigZag {pct}% — اضغط للتبديل إلى {next}%',
  mcLineBreakCountA11y: 'كسر الخطوط: عدد خطوط الانعكاس {count} — اضغط للتبديل إلى {next}',
  mcLockDrawing: 'قفل',
  mcUnlockDrawing: 'فكّ القفل',
  mcLockDrawingA11y: 'قفل الرسم المحدَّد كي لا يتحرّك بلمسة عابرة',
  mcDrawingLockedHint: 'الرسم مقفول — فكّ القفل لتحريكه',
  mcDrawColorWord: 'لون',
  mcDrawColorA11y: 'لون الرسم: {color} — انقر للّون التالي',
  mcCloneDrawing: 'نسخة',
  mcCloneDrawingA11y: 'انسخ هذا الرسم بجانبه — تصير النسخة هي المحدَّدة فتحرّكها وتعدّلها وحدها',
  mcNudgeUpA11y: 'ارفع الرسم المحدَّد خطوة سعر واحدة (pip للأزواج والمعادن). اضغط مطوّلاً للتكرار',
  mcNudgeDownA11y: 'اخفض الرسم المحدَّد خطوة سعر واحدة (pip للأزواج والمعادن). اضغط مطوّلاً للتكرار',
  mcNudgeEarlierA11y: 'أزِح الرسم المحدَّد شمعة واحدة نحو الأقدم. اضغط مطوّلاً للتكرار',
  mcNudgeLaterA11y: 'أزِح الرسم المحدَّد شمعة واحدة نحو الأحدث. اضغط مطوّلاً للتكرار',
  mcColorNames: ['لون الإطار', 'أخضر', 'أحمر', 'برتقالي', 'أزرق', 'أبيض'],
  mcShareDialogTitle: 'شارت MATRIX',
  mcSessTokyo: 'طوكيو',
  mcSessLondon: 'لندن',
  mcSessNewYork: 'نيويورك',
  mcPanesCollapsed: 'مطويّة',
  mcPanesCollapsedA11y: 'لوحات مؤشرات مطويّة: ارتفاع الشارت لا يتّسع لها',
  mcPanesPageA11y: 'اضغط لعرض اللوحات المطويّة بدل الظاهرة',
  mcSwitching: 'تحميل…',
  mcSwitchingA11y: 'جارٍ تحميل الشارت الجديد — المعروض الآن بيانات سابقة',
  mcSyncTimeOn: 'مزامنة الوقت',
  mcSyncTimeOff: 'بلا مزامنة',
  mcSyncLeadHint: 'اضغط أي شارت لتتبعه البقية في الوقت',
  mcSyncToggleA11y: 'تشغيل مزامنة الوقت بين الشارتات الأربعة أو إيقافها',
  mcMeasureBarOne: 'شمعة',
  mcMeasureBarTwo: 'شمعتان',
  // أدوات شاشة الشارت (i18n، 2026-09-21)
  ssbPlaceholder: 'بحث رمز... EUR, XAU, BTC',
  ssbError: 'تعذّر البحث الآن — السبب اتصالك أو مزوّد البيانات. حاول بعد قليل',
  ssbNoMatch: 'لا رمز يطابق «{q}» لدى مزوّد البيانات — جرّب جزءاً أقصر مثل EUR أو XAU أو BTC',
  ssbAmbiguousTag: 'مُدرج بعدّة بورصات — غير مدعوم بعد',
  ssbOnlyAmbiguous: '«{q}» مُدرج بأكثر من بورصة، والتطبيق لا يحدّد بعدُ أيّها يرسم — لذا لا يمكن فتحه حالياً',
  ssbPickA11yPrefix: 'اختيار الرمز: ',
  smnTitle: 'فحص سريع',
  smnFilterMomentum: 'زخم+',
  smnA11yMaCross: 'تقاطع المتوسط المتحرك صعوداً',
  smnA11yRsiOversold: 'تشبّع بيعي بمؤشر RSI',
  smnA11yBullish: 'زخم صعودي',
  domTitle: 'Bid / Ask · السبريد',
  domBidLabel: 'Bid (بيع)',
  domAskLabel: 'Ask (شراء)',
  domSpreadLabel: 'السبريد',
  domBidAskHint: 'تبيع على Bid وتشتري على Ask — السبريد تكلفة كل صفقة.',
  domNoBidAsk: 'المزوّد لا يوفّر Bid/Ask لهذا الرمز — السعر الأخير فقط.',
  domNoLiveQuote: 'لا سعر حيّ الآن — قد يكون السوق مغلقاً (عطلة نهاية الأسبوع) أو المزوّد لا يردّ. يُعاد الطلب تلقائياً.',
  domOtcNote: 'الفوركس سوق لا مركزي: لا يوجد عمق سوق موحّد، والسبريد الفعلي يختلف حسب وسيطك.',
  pdwPrevA11yPrefix: 'الزوج السابق: ',
  pdwCurrentA11yPrefix: 'اختيار الزوج الحالي: ',
  pdwNextA11yPrefix: 'الزوج التالي: ',
  tfLabels: { '1m': 'دقيقة', '5m': '5 د', '15m': '15 د', '30m': '30 د', '1H': 'ساعة', '4H': '4 س', D: 'يومي', W: 'أسبوعي' },
  tfLabelsA11y: {
    '1m': 'دقيقة واحدة',
    '5m': '5 دقائق',
    '15m': '15 دقيقة',
    '30m': '30 دقيقة',
    '1H': 'ساعة واحدة',
    '4H': '4 ساعات',
    D: 'يومي',
    W: 'أسبوعي',
  },
  subPlans: {
    title: 'باقات MATRIX',
    subtitle: 'ابدأ بالشارت والمجتمع، وأضف الأكاديمية وبقية الأدوات حين تحتاجها',
    perMonth: '/ شهرياً',
    coreBadge: 'البداية',
    academyBadge: '+ الأكاديمية',
    fullBadge: 'كل الميزات',
    coreName: 'الأساسية',
    academyName: 'الأكاديمية',
    fullName: 'الكاملة',
    academyAddOn: '+5$ للدورات',
    fullAddOn: '+5$ لبقية الأدوات',
    coreFeatures: [
      'كل أنواع الشموع والشارت',
      'كل الإطارات: المربّع والمستطيل والظلّ',
      'الدردشة الجماعية والتصويت',
      'التقويم الاقتصادي وقائمة المتابعة وأدوات الرسم',
      'المؤشرات والأطر الزمنية',
    ],
    academyFeatures: [
      'كل ما في الباقة الأساسية',
      'الأكاديمية كاملة: مدارس ومستويات ومحاضرات',
      'قاعة تفاعلية تقاطع فيها المدرّس بسؤالك',
    ],
    fullFeatures: [
      'كل ما في باقة الأكاديمية',
      'مساعد AI والتنبيهات والفاحص والاختبار الرجعي',
      'توقّعات المؤشرات وبقية الأدوات',
    ],
    note: '10$ شهرياً للشارت والمجتمع، و5$ إضافية لمن يريد الدورات، ثم 5$ أخرى لكل ما تبقّى من أدوات.',
  },
  cppOpenA11y: 'فتح تقرير العمولات',
  cppCloseA11y: 'طي تقرير العمولات',
  cppTitle: 'تقرير العمولات',
  cppSubOpen: 'جداول العمولات · الأرباح الشهرية',
  cppSubClosed: 'اضغط السهم لفتح التقرير',
  cppLiveError: 'تعذّر تحميل العمولات من الخادم — الجداول أدناه أمثلة تقريبية، لا أرقامك الفعلية',
  cppTableCommissions: 'جدول العمولات',
  cppColType: 'النوع',
  cppColCondition: 'الشرط',
  cppColPoints: 'نقاط',
  cppTableLevels: 'جدول المستويات',
  cppColRole: 'الدور',
  cppColLevels: 'المستويات',
  cppTableMonthly: 'الأرباح الشهرية',
  cppColMonth: 'الشهر',
  cppColDirect: 'جلب',
  cppColBalance: 'توازن',
  cppColTotal: 'الإجمالي',
  cppNoEarnings: 'لا أرباح مسجّلة بعد — تظهر هنا حين تضيف أعضاء من الشجرة',
  cppEarningsLoadError: 'تعذّر تحميل أرباحك — تحقّق من الاتصال واضغط «تحديث»',
  cppBasisNote: 'أساس الحساب: {unit} نقطة لكل عضو × نسبة العمولة',
  cppTypeDirect: 'جلب مباشر',
  cppTypeBalance: 'مكافأة توازن',
  cppTypeActiveBalanced: 'فعّالة متوازنة',
  cppTypeActiveUnbalanced: 'فعّالة غير متوازنة',
  cppCondNewMember: 'عند إضافة عضو جديد',
  cppCondBalanced: 'يمين = يسار',
  cppCondUnbalanced: 'يمين ≠ يسار',
  ntpNamePlaceholder: 'اكتب الاسم',
  ntpNameA11y: 'اسم العضو الجديد في هذا المربع — 3 أحرف على الأقل',
  ntpConfirmA11y: 'تأكيد وضع العضو في المربع',
  ntpLevelTitle: 'مستوى {gen} · كل جهة 1–{n}',
  ntpNewBranches: ' · فروع جديدة',
  ntpLoadError: 'تعذّر تحميل الشجرة — تحقّق من اتصالك واضغط «تحديث»',
  ntpPlaceError: 'لم يُوضع العضو — الاسم مستخدم، أو المربع مشغول، أو الاسم أقصر من 3 أحرف',
  ntpOpenA11y: 'فتح شجرة الشبكة',
  ntpCloseA11y: 'طي شجرة الشبكة',
  ntpTitle: 'شجرة الشبكة',
  ntpSubLive: 'يسار | يمين · الترقيم من 1 في كل جهة',
  ntpSubPreview: 'معاينة · سجّل الدخول لتفعيلها',
  ntpSubClosed: 'اضغط السهم لفتح الشجرة',
  ntpYou: 'أنت',
  ntpGuestHint: 'سجّل الدخول، ثم اكتب اسم العضو داخل مربع مرقّم.',
  ntpLevelBranches: '↓ فروع المستوى {gen}',
  ntpTrunkHint: 'خط الجذر ↓',
  ntpYouRoot: 'أنت · الجذر',
  tdsCaption: 'كيف تنمو الشجرة · اليسار واليمين منفصلان',
  tdsLevel: 'مستوى {gen} · كل جهة 1–{n}',
  tdsLevelOne: 'مستوى 1 · مربع واحد في كل جهة',
  tdsRootBottom: 'الجذر · أسفل',
  tdsFootnote: 'الترقيم يبدأ من 1 في كل جهة، واليسار منفصل عن اليمين · اكتب الاسم داخل المربع فقط',
  accNetLoadError: 'تعذّر تحميل بيانات الشبكة والإحالة — حاول لاحقاً',
  accReplayTour: '↺ أعد الجولة الترحيبية',
  accReplayTourA11y: 'أعد عرض الجولة الترحيبية من أولها',
  a11yBusy: 'جارٍ التنفيذ، انتظر لحظة',
  calendarUnavailable: 'التقويم غير متاح الآن — مصدر الأحداث لم يستجب، وهذا لا يعني أنه لا أخبار اليوم. يعيد المحاولة وحده كل 5 دقائق',
  sigLevelsUnavailableNoPrice: 'لا مستويات دخول ووقف وهدف — لا سعر حيّ الآن',
  sigLevelsUnavailableFewCandles: 'لا مستويات دخول ووقف وهدف — الشموع قليلة لحساب المدى (ATR)',
  sigLevelsUnavailableAtrWide: 'لا مستويات دخول ووقف وهدف — المدى (ATR) أوسع من السعر نفسه',
  sigLevelsUnavailableNeutral: 'لا مستويات دخول ووقف وهدف — الاتجاه محايد',
  sigLevelsUnavailableNoRange: 'لا مستويات دخول ووقف وهدف — السعر لم يتحرّك في هذه الفترة، فلا مدى (ATR) يُقاس عليه',
  sigLevelsUnavailableAtrBelowTick: 'لا مستويات دخول ووقف وهدف — المدى (ATR) أصغر من أصغر خطوة للسعر، فالوقف سيقع على الدخول نفسه. جرّب فريماً أطول',
  journalStatBreakeven: 'تعادل: {n} (لا يدخل نسبة النجاح)',
  journalShownOfTotal: 'معروضة {shown} من {total} صفقة — الإحصاءات على الكل',
  journalLoadOlder: 'تحميل الأقدم',
  journalSizeUnknown: 'الحجم غير مسجَّل',
  journalLoadOlderError: 'تعذّر تحميل الصفقات الأقدم — تحقّق من الاتصال واضغط «تحميل الأقدم» مجدداً. ما يظهر أمامك لم يتغيّر.',
  journalRetryBtn: 'إعادة المحاولة',
  journalLoadErrorRetry: 'تعذّر تحميل الدفتر — تحقّق من الاتصال ثم اضغط «إعادة المحاولة». صفقاتك المسجّلة لم تُحذف.',
  analystsUnavailable: 'لا مصدر مرخَّص لتوقعات المحللين بعد — لذلك لا نعرض اتجاهاً ولا أهدافاً بدل أن نخترعها',
  socialUnavailable: 'لا مصدر مرخَّص لآراء القنوات بعد — لذلك لا نعرض إجماعاً ولا صفقة مقترحة بدل أن نخترعهما',
  riskCalcConvInverted: '«{typed}» لا يصلح سعراً لـ{pair} — يبدو مقلوباً (1 ÷ السعر). على الأرجح قصدتَ {likely}؛ اكتبه كما تراه بمنصّتك.',
  impactHoliday: 'عطلة — سيولة رقيقة',
  newsHolidayToday: 'عطلة بنوك اليوم · {ccy}{title} — سيولة أقل: سبريد أوسع، وانزلاق وفجوات محتملة',
  backtestBeforeCosts: 'النتائج قبل السبريد والعمولة — لا تقدير سبريد لهذا الرمز، فالنتيجة الفعلية أسوأ من المعروضة.',
  forecastDetail: {
    rsi_overbought: 'تشبّع شراء ({rsi})',
    rsi_oversold: 'تشبّع بيع ({rsi})',
    rsi_bullish: 'زخم إيجابي ({rsi})',
    rsi_bearish: 'زخم سلبي ({rsi})',
    rsi_neutral: 'محايد ({rsi})',
    ma_cross_up: 'المتوسط السريع قطع البطيء صعوداً',
    ma_cross_down: 'المتوسط السريع قطع البطيء هبوطاً',
    ma_above: 'السريع {fast} فوق البطيء {slow}',
    ma_below: 'السريع {fast} تحت البطيء {slow}',
    macd_cross_up: 'قطع خط الإشارة صعوداً',
    macd_cross_down: 'قطع خط الإشارة هبوطاً',
    macd_above: 'الخط {macd} فوق الإشارة {signal}',
    macd_below: 'الخط {macd} تحت الإشارة {signal}',
    bb_upper: 'قرب الحد العلوي',
    bb_lower: 'قرب الحد السفلي',
    bb_position: 'موقعه داخل النطاق {pos}%',
    stoch_k: '%K≈{k}',
    trend_slope: 'آخر 10 شموع · {pct}%',
  },
  forecastVoteNames: { rsi: 'RSI 14', ma_cross: 'تقاطع MA', ma_trend: 'اتجاه MA', macd: 'MACD', bb: 'بولنجر', stoch: 'Stochastic', trend: 'ميل السعر' },
  forecastDisclaimerConsensus: 'إجماع مؤشرات فنية داخل MATRIX — ليس ضماناً للربح.',
  forecastDisclaimerNoData: 'لا بيانات كافية لحساب المؤشرات المختارة — فعّل مؤشراً آخر من الأزرار أعلاه؛ RSI و«ميل» يكفيهما تاريخ أقصر.',
  forecastDisclaimerNoMovement: 'لم يتحرّك السعر في هذه الفترة — قد يكون السوق مغلقاً، فلا اتجاه تقرؤه المؤشرات. جرّب فريماً أطول أو عُد عند افتتاح السوق.',
  dsKindUnavailable: 'غير متاح',
  chartNotOfferedTitle: '{symbol} غير متاح من مزوّد البيانات',
  chartNotOfferedBody: 'لا نرسم له شموعاً ولا سعراً كي لا تقرأ أرقاماً مولَّدة. اضغط اسم الرمز ▾ فوق الشارت لتختار زوجاً آخر.',
  chartNoCandlesTitle: 'لا شموع لـ{symbol} على فريم {tf} الآن',
  chartNoCandlesBody: 'لم يُرجع مزوّد البيانات شموعاً لهذا الفريم. جرّب فريماً آخر، أو ارجع بعد قليل.',
  chartFirstLoad: 'جارٍ تحميل شموع {symbol} على فريم {tf}…',
  chartProviderDownTitle: 'تعذّر جلب شموع {symbol} من مزوّد البيانات الآن',
  chartProviderDownBody: 'المشكلة في الاتصال بمزوّد البيانات، وغالباً مؤقّتة. لا نرسم شموعاً تقديرية في الأثناء كي لا تقرأ أسعاراً غير حقيقية. جرّب مرة أخرى بعد دقائق.',
  chartServerUnreachableTitle: 'تعذّر تحميل شموع {symbol}: لا اتصال بخادم MATRIX',
  chartServerUnreachableBody: 'تأكّد من اتصالك بالإنترنت ثم جرّب مرة أخرى. لا نرسم شموعاً تقديرية في الأثناء كي لا تقرأ أسعاراً غير حقيقية.',
};

const enUS: Dict = {
  accountTitle: 'MATRIX Account',
  accountSub: 'Sync · Academy · Binary network commissions',
  tabHome: 'Home',
  tabTools: 'Tools',
  tabAcademy: 'Academy',
  tabAccount: 'Account',
  login: 'Log in',
  register: 'Sign up',
  name: 'Name',
  namePlaceholder: 'Username',
  email: 'Email',
  emailPlaceholder: 'name@example.com',
  password: 'Password',
  passwordPlaceholder: 'Password',
  enter: 'Log in',
  createAccount: 'Create account',
  logout: 'Log out',
  hello: 'Welcome',
  sponsorCode: 'Invite code (optional)',
  underSponsor: 'Your side under the inviter',
  left: 'Left',
  right: 'Right',
  trader: 'Trader',
  trainer: 'Trainer',
  broker: 'Broker',
  agent: 'Agent',
  company: 'Company',
  loginError: "Login didn’t go through — the request didn’t reach the server or didn’t finish. Check your internet connection and try again",
  sessionExpired: 'Your session has ended — sessions last 30 days from login. Log in again to see the alerts and journal saved to your account',
  registerError: "Sign-up didn’t go through — the request didn’t reach the server or didn’t finish. Check your internet connection and try again",
  regErrReserved: 'That username is reserved — pick another one',
  regErrInvisible: 'The username contains a hidden or full-width character (copy and paste often brings these along) — type it in from the keyboard',
  regErrLink: 'Usernames can’t contain a link, “@” or “/” — your name appears on every message, so pick one without a web address',
  regErrUsernameTaken: 'That username is already registered — pick another one, or log in if it’s yours',
  regErrEmailTaken: 'That email is already registered — use “{login}” instead of creating a new account',
  regErrInvalidEmail: 'That email doesn’t look right — it should look like name@example.com',
  regErrSponsorNotFound: 'Invite code not found — check it with whoever invited you, or leave the field empty',
  regErrUsernameLength: 'Username must be 3 to 32 characters',
  regErrPasswordLength: 'Password must be at least 4 characters',
  regErrRoleNotOpen: 'New accounts are created as “{trader}” only — other roles are given by your sponsor from their network after you sign up',
  regErrMissingFields: 'Enter a username and an email — both are needed to create an account',
  loginErrCredentials: "That name, email or password isn’t right — check them and try again",
  loginErrMissing: 'Enter the username or email you signed up with',
  language: 'Language',
  deleteAccount: 'Delete account',
  deleteAccountConfirmTitle: 'Delete account permanently?',
  deleteAccountConfirmBody:
    'Your username, email, and password will be permanently erased and you will not be able to sign back into this account. This cannot be undone.',
  deleteAccountConfirmBtn: 'Delete permanently',
  deleteAccountError: 'Couldn’t confirm your account was deleted — check your connection, then tap “Delete account” again.',
  cancel: 'Cancel',
  notifications: 'Notifications',
  notifStatusGranted: 'Enabled',
  notifStatusDenied: 'Blocked in device settings',
  notifStatusUndetermined: 'Needs permission',
  notifStatusUnsupported: 'Not supported on web',
  notifEnableBtn: 'Enable notifications',
  notifOpenSettingsBtn: 'Open device settings',
  onboardStep1Title: 'Switch pairs in one tap',
  onboardStep1Body:
    'Tap any pair in the top strip (EURUSD, GBPUSD, gold XAUUSD…) to switch the chart, with today’s change ▲▼ beside it. Pinch to zoom, drag the price axis to make candles taller or shorter, and AUTO resets the view. Tap a candle to read its O H L C, or press and hold, then drag to step through the candles one by one.',
  onboardStep2Title: 'Drawing tools',
  onboardStep2Body:
    'The Draw tab in the bottom bar opens trend lines, Fibonacci and more tools right on the chart — a line drawn on 4H stays when you drop to 1H. To plan a trade, use Buy plan or Sell plan: drag from entry to stop to see the target, pips and reward-to-risk. Tap a drawing to select it: drag to move it or nudge it with ▲▼◀▶ (one pip or one candle per tap; hold to repeat, faster after a moment), or press Clone ❐ to reuse the same level somewhere else. Drew something wrong? Undo ↶ reverses the last change, and Redo ↷ brings it back if you went one step too far.',
  onboardStep3Title: 'Indicators & lenses',
  onboardStep3Body:
    'Pick from dozens of indicators (RSI, MACD, Bollinger…) or start with a lens that adds a set in one tap: Structure for moving averages, Momentum for RSI and MACD, Liquidity for volume, Bollinger and CVD (on forex, volume and CVD are estimated from candles, not real volume or order flow). Moving averages and Bollinger bands show their values on the price axis in tags that match their lines. For forex: Sessions shades Tokyo, London and New York at their correct hours through daylight saving, and PDH / PDL marks yesterday’s session high and low.',
  onboardStep4Title: 'Alerts',
  onboardStep4Body:
    'Fastest way: tap a level on the chart, then 🔔 — no typing. You get a notification when price reaches it (checked about once a minute), so no need to watch the chart all day. To move it, drag its 🔔 label at the edge of the chart to the new price. Indicator alerts and notification settings are in the alerts panel.',
  onboardStep5Title: 'Risk first',
  onboardStep5Body:
    'Before any trade, open Tools → Risk: pick the symbol as your broker writes it (EURUSDc for a cent account), enter your balance, risk % and stop loss (in pips, not MT4/MT5 points — 250 points is usually 25 pips — or as entry and stop prices) to get the right lot size (add spread and commission to include them), then “Log this plan to the journal” to review how it played out. Many traders risk no more than 1–2% per trade.',
  onboardRiskNote:
    'MATRIX is an analysis and learning tool. It does not place trades or give financial advice. Leveraged trading carries a high risk of losing money.',
  onboardStepCounterA11y: 'Step {n} of {total}',
  onboardSkip: 'Skip',
  onboardBack: 'Back',
  onboardNext: 'Next',
  onboardStart: 'Start',
  dirBuy: 'Buy',
  dirSell: 'Sell',
  dirNeutral: 'Neutral',
  avgLabel: 'Avg',
  entryLabel: 'Entry',
  slLabel: 'Stop',
  tpLabel: 'Target',
  enabledWord: 'On',
  disabledWord: 'Off',
  sendBtn: 'Send',
  refreshBtn: 'Refresh',
  aboveWord: 'Above',
  belowWord: 'Below',
  addBtn: 'Add',
  deleteWord: 'Delete',
  priceWord: 'Price',
  impactHigh: 'High',
  impactMedium: 'Medium',
  impactLow: 'Low',
  toolsTitle: 'MATRIX Tools',
  toolsSub: 'Community & news · Analysis & alerts — two switchable sections',
  toolsTabHub: 'Analysis & community',
  toolsTabReports: 'Reports',
  toolsTabJournal: 'Journal',
  toolsTabScreener: 'Screener',
  toolsTabBacktest: 'Backtest',
  toolsTabIndAlerts: 'Alerts+',
  toolsTabCalendar: 'Calendar',
  toolsTabLayouts: 'Layout',
  toolsTabAi: 'AI',
  a11yTabPrefix: 'Tab',
  a11ySignalSymbolPrefix: 'Analysis symbol',
  toolsSymOnChart: 'on your chart',
  toolsHubCommunity: 'Community & news',
  toolsHubAnalysis: 'Analysis & alerts',
  a11yHubSectionPrefix: 'Panel section',
  toolsGridHint: "Drag the dots to reorder this section’s panels",
  toolsFiltersLabel: 'Filters',
  filterMaUpLabel: 'MA cross up',
  filterMaUpHint: 'Fast SMA 9 crossed above slow SMA 21 on the latest candle',
  filterMaDownLabel: 'MA cross down',
  filterMaDownHint: 'Fast SMA 9 crossed below slow SMA 21 on the latest candle',
  filterRsiOversoldLabel: 'RSI oversold',
  filterRsiOversoldHint: 'RSI 14 at 30 or below — may bounce, but can stay low in a strong downtrend',
  filterRsiOverboughtLabel: 'RSI overbought',
  filterRsiOverboughtHint: 'RSI 14 at 70 or above — may pull back, but can stay high in a strong uptrend',
  filterMacdUpLabel: 'MACD cross up',
  filterMacdUpHint: 'MACD line crossed above its signal line on the latest candle — fresh positive momentum',
  filterBullishLabel: 'Momentum +',
  filterBullishHint: 'Price up over the last 80 candles (first close to latest), RSI under 65 (not stretched)',
  filterBearishLabel: 'Momentum -',
  filterBearishHint: 'Price down over the last 80 candles (first close to latest), RSI above 35 (not stretched)',
  a11yFilterPrefix: 'Filter',
  screenerRunning: 'Scanning…',
  screenerRunBtn: 'Run screener',
  screenerRunNeedFilter: 'Pick a filter first, then run the screener',
  screenerNeedApiKey: 'The screener needs an active Twelve Data key on the server',
  screenerNoResults: 'No symbol meets the current filters right now — try another filter or scan again later',
  screenerFailed: 'Could not run the scan — check your connection and try again',
  screenerScanNone: 'Could not load prices for any symbol — likely the data provider rate limit; wait a minute and scan again',
  screenerScanPartial: 'Only {k} of {total} symbols scanned — could not read: {list} (likely provider rate limit). Results cover scanned symbols only.',
  screenerPriceAsOf: 'as of {time}',
  screenerNoMatchOf: 'Scanned {k} symbols on {tf} and none meet the condition right now — try another filter or scan again later',
  screenerShowingOf: 'Showing the top {n} of {total} results (biggest movers first)',
  screenerChangeSpan: '(last 80 candles)',
  screenerTapToOpen: 'Tap a result to open its chart on the same timeframe',
  screenerOpenChartA11y: 'Open chart',
  newsTitle: 'News affecting forex',
  newsStale: 'Not refreshed — time from saved calendar',
  newsEmpty: 'No market-moving headlines right now — upcoming releases (rates, jobs, inflation) are in Calendar.',
  newsLoadError: "Couldn’t load news — check your connection, then leave this section and come back to retry",
  newsSourceUnavailable: "The news source isn’t responding right now — the problem is on its end, not your connection. Confirmed release times (rates, jobs, inflation) are in Calendar.",
  newsStaleAsOf: "Headlines last updated {time} — the source isn’t responding, so newer news may be missing",
  newsImpactFromHeadline: 'The impact badge is estimated from headline keywords, not rated by the source — confirmed release times are in Calendar.',
  newsImpactEstimatedA11y: '{impact} impact — estimated from headline keywords',
  snapChangeOverBars: '{pct} over the last {bars} candles',
  aiPanelTitle: 'AI assistant',
  aiGreeting:
    "I’m MATRIX’s AI assistant. Ask me about the pair’s analysis, a trade scenario, or risk management. My answers are automated analysis to learn from, not financial advice — check any level on the chart before relying on it.",
  aiPriceAsOf: 'Prices in this answer are based on the candle close at {time} your time — not a live price',
  forecastPriceAsOf: 'Levels are based on the candle close at {time} your time — not a live price',
  aiOfflineFallback:
    'Could not reach the server — check your internet connection and try again shortly.\n\nQuick local take: check the dollar on more than one pair (EURUSD and USDJPY) before entering any dollar pair, and use a clear stop, risking 1% per trade (2% at most).',
  aiInputPlaceholder: 'e.g. analysis of {symbol} today?',
  aiInputA11y: 'Question for the AI assistant',
  aiSendA11y: 'Send question to the AI assistant',
  aiAskBtn: 'Ask',
  analystsTitle: 'Analyst forecasts',
  analystsSubSuffix: 'No licensed source yet — we don’t show made-up views',
  analystsRefreshA11y: 'Refresh analyst forecasts',
  analystsLoadError: 'Couldn’t load analyst forecasts — check your connection, then tap “Refresh”',
  socialPlatformTelegram: 'Telegram',
  socialPlatformFacebook: 'Facebook',
  socialPlatformInstagram: 'Instagram',
  socialPlatformX: 'X',
  socialPlatformYoutube: 'YouTube',
  socialPlatformDiscord: 'Discord',
  socialPlatformApp: 'App',
  socialComputeA11y: 'Compute consensus of selected sources',
  socialComputeBtn: 'Compute',
  socialTitle: 'Average of channel views',
  socialSub: 'Telegram · Facebook · Instagram · X · Apps',
  socialPickHint: 'No licensed source for channel views yet, so the source list is empty — we don’t invent views to fill it',
  socialSourcesError: "Couldn’t load the source list — check your connection, then leave this section and come back to retry",
  a11ySourcePrefix: 'Source',
  sourcesCountLabel: 'Sources',
  suggestedTradeLabel: 'Suggested trade',
  socialNoClearTrade: 'No clear trade — opinions are mixed or neutral',
  socialComputeError: 'Couldn’t compute channel consensus — check your connection, then tap “Compute”',
  chatTitle: 'Group chat',
  chatLoadError: "Couldn’t load messages — check your connection, then leave this section and come back to retry",
  chatEmpty: 'No messages yet — be the first to write',
  chatSendError: "Couldn’t confirm your message was sent — you can see it, but others may not. Check your connection, then leave this section and come back: if it’s gone, write it again",
  chatYou: 'You',
  chatAnonTrader: 'Trader',
  chatLoginRequired: 'Sign in to post in the group chat — your messages show under your account name',
  chatInputPlaceholder: 'Type a message…',
  chatInputA11y: 'Group chat message',
  chatSendA11y: 'Send group chat message',
  voteTitle: 'Vote on a trade',
  voteCloseFormA11y: 'Close the idea form',
  votePublishNewA11y: 'Publish a new trade idea',
  closeWord: 'Close',
  votePublishToggleBtn: 'Publish your idea',
  voteSymbolPlaceholder: 'Symbol (e.g. EURUSD)',
  voteSymbolA11y: 'Instrument symbol for your idea',
  voteDirA11yPrefix: 'Idea direction',
  voteEntryPriceA11y: 'Entry price',
  voteSlPriceA11y: 'Stop-loss price',
  voteTpPriceA11y: 'Target price',
  voteNotePlaceholder: 'Note (optional) — why this idea?',
  voteNoteA11y: 'Idea note (optional)',
  voteFormError: 'Enter the symbol, entry, stop, and target correctly',
  votePublishError: 'Could not publish the idea — check your connection and try again',
  votePublishBtn: 'Publish idea',
  voteLoadError: "Couldn’t load votes — check your connection, then leave this section and come back to retry",
  voteEmpty:
    'No active votes right now — post your idea above (symbol, direction, entry, stop, target) and see what other traders think.',
  voteByAuthor: 'By {author}',
  voteApprovalLabel: 'Approval',
  voteAgreeWord: 'Agree',
  voteDisagreeWord: 'Disagree',
  voteCastError: "Couldn’t confirm your vote counted — the tally may include it even though it didn’t arrive. Check your connection, then leave this section and come back to see the real count, and vote again if needed",
  voteLoginRequired: 'Sign in to vote — one vote per account keeps the approval rate honest',
  chatLinksNotAllowed: 'Links aren’t allowed in the group — protection against scam “signal” channels',
  votePublishLoginRequired: 'Sign in to publish an idea — it shows under your account name',
  voteLinksNotAllowed: 'Links aren’t allowed in ideas — write your analysis as text',
  modMessageOptionsA11y: 'Message options: report or block',
  modIdeaOptionsA11y: 'Idea options: report or block',
  modReportLabel: 'Report:',
  modReasonSpam: 'Spam',
  modReasonAbuse: 'Abusive',
  modReasonScam: 'Scam',
  modBlockUser: 'Block {user}',
  modReported: 'Thanks — hidden for you, and the report will be reviewed',
  modReportLoginRequired: 'Sign in to report — or block the sender to hide them for you',
  modReportError: 'Couldn’t send the report — try again',
  modBlocked: '{user} blocked — their messages and ideas won’t show for you',
  modBlockedCount: 'Blocked: {n} · Unblock',
  modUnblockA11y: 'Unblock all blocked users',
  voteAgreeA11yPrefix: 'Agree with idea',
  voteDisagreeA11yPrefix: 'Disagree with idea',
  indicatorBollinger: 'Bollinger',
  indicatorTrend: 'Trend',
  forecastRunA11y: 'Forecast indicators',
  forecastRunBtn: 'Forecast',
  forecastTitle: 'Indicator forecasts',
  forecastAvgLabel: 'Indicator avg',
  forecastTradeLabel: 'Computed levels',
  forecastNoSignal: 'No clear direction across the selected indicators — so no entry, stop or target levels',
  forecastAgreeLabel: 'Indicators agreeing',
  forecastError: 'Couldn’t compute indicator forecasts — check your connection, then tap “Forecast”',
  alertsTitle: 'Price alerts',
  alertsSub: 'At or above / at or below a level · Twelve Data prices checked about once a minute · notified when it triggers',
  alertsPushTitle: 'MATRIX · Price alert',
  notifChannelName: 'Price & indicator alerts',
  notifChannelDesc: 'A notification when price reaches a level you set or an indicator condition you chose is met (checked about once a minute)',
  alertsSymbolA11y: 'Instrument symbol for the alert',
  alertsPriceA11y: 'Alert price',
  alertsAboveConditionA11y: 'Alert condition: above price',
  alertsBelowConditionA11y: 'Alert condition: below price',
  alertsAddA11y: 'Add price alert',
  alertsNotePlaceholder: 'Note (optional)',
  alertsNoteA11y: 'Alert note (optional)',
  alertsAddError: 'Could not add the alert — check your connection and try again',
  alertsFirstBadge: "🎉 First alert set — we’ll notify you when the price reaches your level (checked about once a minute)",
  alertsLoadError: 'Couldn’t load your alerts — check your connection. Your saved alerts haven’t been deleted.',
  alertsEmpty:
    'No alerts yet — enter a price above (or tap “Use it” for the current price), pick above/below, and you’ll be notified when price gets there. Or from the chart: tap a level, then 🔔.',
  alertsDeleteConfirmTitle: 'Delete the alert?',
  alertsDeleteFailedTitle: 'Could not delete',
  alertsDeleteFailedBody: 'We couldn’t confirm the delete — check your connection. If the alert is still in the list, delete it again.',
  alertsDeleteA11yPrefix: 'Delete alert',
  alertsInvalidInput: 'Enter a symbol and a valid price above zero',
  alertsUnknownSymbolWarn: 'The price provider does not know this symbol — check the spelling, or this alert will never fire',
  alertsEditOldRemains: 'New alert saved, but the old one could not be removed — delete it from the list',
  alertsRearmBtn: 'Re-arm',
  alertsRearmA11yPrefix: 'Re-arm alert',
  alertsRearmedMsg: 'Armed again: {desc} — if price is still past the level it fires on the next check',
  alertsRearmFailed: 'Could not re-arm — check your connection and try again',
  alertsArmedPrefix: 'Armed',
  alertsUpdatedPrefix: 'Updated',
  alertsCurrentPrefix: 'Now',
  alertsUseCurrent: 'Use it',
  alertsUseCurrentA11y: 'Use current price',
  alertsSaveEdit: 'Save changes',
  alertsEditingHint: 'Editing an existing alert',
  alertsCancelEdit: 'Cancel edit',
  alertsFiresNowWarn: '⚠ Condition already met — this alert will fire immediately',
  alertsActiveCount: 'Active',
  alertsTapToEdit: 'Tap an alert to edit it',
  alertsClearFiredBtn: 'Clear fired ({n})',
  alertsClearFiredConfirm: 'Delete {n} fired alert(s)? Alerts still watching stay as they are.',
  alertsEditA11yPrefix: 'Edit alert',
  alertsStatusArmed: '● Armed — waiting for price',
  alertsStatusTriggered: 'Triggered ✓',
  riskCalcTitle: 'Position size calculator',
  riskCalcSub: 'How many lots to open so that hitting your stop costs a set % of your balance',
  riskCalcSymbol: 'Instrument',
  riskCalcBadSymbol:
    'Unsupported symbol — the calculator sizes forex pairs, gold and silver, e.g. EURUSD, XAUUSD, GOLD or EURUSD.m, and cent-account symbols such as EURUSDc',
  riskCalcMiniSymbol:
    '“{symbol}” is a mini-account symbol, and mini lot size differs between brokers (10,000 units at most, a full standard lot at some), so we won’t guess it. Type the regular pair {pair}, and check the contract size in your platform’s symbol specification before copying the lot',
  riskCalcCentModeNote:
    '“{symbol}” is a cent-account symbol: enter your balance in cents (USC) as your platform shows it — 10,000 USC = 100 USD. Type the lot below on the cent account',
  riskCalcCentBalance: 'Account balance (USC — cents)',
  riskCalcCentUsdEquiv: '≈ {usd} USD',
  riskCalcSmallLotsStdEquiv: '= {std} lots on a standard account',
  riskCalcMicroModeNote:
    '“{symbol}” is a micro-account symbol: the balance stays in your account currency, and the lot below is in micro lots (1,000 units) — type it as-is on the micro account',
  appCrashTitle: 'Something went wrong',
  appCrashBody: 'This screen could not be displayed. Your data and drawings are safe — tap “Try again” to continue.',
  appCrashRepeatBody:
    'Still not working. Fully close MATRIX (swipe it away from your recent apps) and open it again — your drawings are safe.',
  appCrashRetry: 'Try again',
  appCrashDetailLabel: 'Technical detail (screenshot it if you report this):',
  planSlWrongBuy: 'For a buy, the stop must be below the entry',
  planSlWrongSell: 'For a sell, the stop must be above the entry',
  planTpWrongBuy: 'For a buy, the target must be above the entry',
  planTpWrongSell: 'For a sell, the target must be below the entry',
  planSlTooClose: 'Stop is practically on the entry (under 1 pip, or under 0.002% of price for symbols without pips such as Bitcoin and indices) — tighter than the spread itself; check the number',
  planRiskWord: 'Risk',
  planNoteCommission: 'Commission',
  planNoteNetRR: 'Net R:R',
  planRewardWord: 'Reward',
  planLowRR: '⚠ Potential reward is smaller than the risk',
  riskCalcAccountCcy: 'Account currency',
  riskCalcBalance: 'Account balance',
  riskCalcRiskPct: 'Risk (% or amount)',
  riskCalcRiskMoneyHint: 'Tap {ccy} to enter the risk as an amount instead of a percent',
  riskCalcRiskOverBalance:
    'Your risk ({risk}) is larger than your account balance ({balance}) — a single stop-loss hit would wipe out the whole account. Check both fields: you may have typed an amount instead of a percent, or left a zero off the balance.',
  riskCalcHighRisk: '⚠ More than 2% per trade is high risk',
  riskCalcSlPips: 'Stop loss (pips)',
  riskCalcFromPrice: 'Or from price: entry and stop as you see them on the chart',
  riskCalcSlMismatch:
    '⚠ The pips you typed ({pips}) do not match your entry and stop prices ({derived} pips) — lot size and risk use the pips, R:R uses the prices',
  riskCalcEntry: 'Entry price',
  riskCalcStop: 'Stop price',
  riskCalcStopChip: '{side}: stop {price}',
  riskCalcConvFailed: "Couldn’t fetch the conversion rate — type it below as your platform shows it to get the lot size. Pair:",
  riskCalcConvManual: 'Enter price of',
  riskCalcConvStale: "The {pair} conversion rate hasn’t updated for {min} min — the lot uses the last rate we received. Check it against your platform before you enter.",
  riskCalcConvMarketClosed: 'Market closed — the {pair} conversion rate is the last price before the close, and the market may open at a different price. Recalculate after the open.',
  riskCalcLots: 'Position size (lots)',
  riskCalcRiskAmount: 'Actual risk',
  riskCalcUnits: 'Units',
  riskCalcBelowMin: 'No size fits this risk: the smallest lot (0.01) risks more than you set',
  riskCalcFillHint: 'Enter balance, risk % and stop loss',
  invalidNumberHint: 'Number not recognized — type it without thousands separators, e.g. 10000 or 1.0850',
  priceAmbiguousThousandsHint: 'Price “{value}” is ambiguous — is that separator for thousands or for decimals? Type {whole} or {small}',
  riskCalcSlPipsAmbiguous: 'A stop of “{value}” pips is ambiguous — is that separator for thousands or for decimals? Type {whole} or {small}',
  riskCalcSlPointsHint: 'A stop of “{value}” is in points — on MT4/MT5 a point is usually a tenth of a pip, so type {pips} pips',
  riskCalcOtherCcyHint: '{field} “{value}” is not in the account currency ({ccy}) — enter the amount in {ccy}, or change the account currency',
  arabicThousandsSignHint: '“٬” is the Arabic thousands sign, not the decimal comma — for a fraction type “٫” or a dot, e.g. 0.5',
  riskCalcBadFieldValue: '{field} “{value}”',
  riskCalcSlLooksLikePrice: '⚠ “{value}” looks like a price, not a distance — enter it under Stop price, or type the distance from entry to stop in pips',
  riskCalcStopPxLooksLikePips: '⚠ “{value}” in Stop price looks like pips, not a price — tap to move it to the pips box',
  levelLooksLikePipsHint: '⚠ {field} “{value}” looks like pips, not a price: {pips} pips is {price}. Tap to use {price}',
  levelLooksLikePipsSaveBlocked: 'Not saved: {field} “{value}” looks like pips, not a price — the fix is in the line above. To keep {value} as a price, press “{button}” again.',
  levelLooksLikePointsHint: '⚠ {field} “{value}” looks like points, not a price: {pips} points is {price}. Tap to use {price}',
  levelLooksLikePointsSaveBlocked: 'Not saved: {field} “{value}” looks like points, not a price — the fix is in the line above. To keep {value} as a price, press “{button}” again.',
  journalEntryDecimalSlip: '⚠ Entry “{value}” looks like it’s missing the decimal point — did you mean {price}?',
  journalLevelDecimalSlip: '⚠ {field} “{value}” looks like it’s missing the decimal point — did you mean {price}?',
  riskCalcPipValue: 'Pip value per lot',
  riskCalcPipValueAtStop: 'Pip value per lot at your stop {price}',
  riskCalcPipValueAtStopHint: 'Your platform shows it at the current price, so it may differ a little — but if your stop is hit the loss converts to your account currency at the stop price, so we used that',
  riskCalcPipValueAtPipsExit: 'Pip value per lot at {price} ({pips} pips below the price)',
  riskCalcPipValueAtPipsExitHint:
    "You didn’t type a stop price, so we can’t tell whether you’re buying or selling — we used the exit below the price because it costs more in your account currency, so your loss can’t exceed the risk you chose either way. Your platform shows it at the current price, so it may differ a little",
  riskCalcLeverage: 'Leverage (100 means 1:100)',
  riskCalcLeverageOutOfRange: 'Leverage “{value}” is outside what the calculator handles (1:1 to 1:{max}) — enter your account’s leverage as your platform shows it, e.g. 500.',
  riskCalcLeverageAmbiguous: 'Leverage “{value}” is ambiguous — did you mean 1:{big}? Type {big} without the dot, or 1 if your account has no leverage.',
  riskCalcMargin: 'Margin held',
  riskCalcMarginNote:
    'Margin is what your broker sets aside while the trade is open, not what you can lose — your stop decides that. Available leverage varies by broker and instrument.',
  riskCalcTarget: 'Target (optional) — for R:R and potential profit',
  riskCalcTargetPlaceholder: 'Target price',
  riskCalcPotentialProfit: 'Potential profit',
  riskCalcLogToJournal: 'Log this plan to the journal',
  riskCalcSideLabel: 'Trade direction',
  riskCalcSideFromStop: 'inferred from the stop',
  riskCalcLoggedToJournal: '✓ Logged as an open trade — close it from “Journal” when you exit',
  riskCalcLogFailed: 'Could not log to the journal — check your connection and try again',
  riskCalcMarginMaxLots: 'Largest size your balance can cover in margin: {lots} lot — a ceiling that leaves no free margin for any swing',
  riskCalcLogBlockedMismatch:
    'A plan with two different stops can’t be logged — type {derived} in the pips box, or move your stop price to match your pips',
  riskCalcSlMismatchNarrower: '⚠ Your pips ({pips}) are tighter than the distance between your prices ({derived} pips) — the lot size is larger than your risk allows if the stop stays at its price',
  riskCalcSpread: 'Spread (pips, optional)',
  riskCalcSpreadPipsHint: 'Enter pips, not points: MT4/MT5 usually show spread in points, and 10 points = 1 pip — so 12 on your platform is 1.2 here.',
  riskCalcSpreadNote: 'Spread usually adds to your stop distance: a 20-pip stop with a 1.5 spread loses about 21.5 when hit. Check the current spread on your platform — it widens around news and the weekly open.',
  riskCalcRiskWithSpread: 'Risk including spread',
  riskCalcSpreadLotsWithin: 'To keep your risk at {pct}% including spread: {lots} lot',
  riskCalcSpreadTooWide: '“{n}” doesn’t look like a spread in pips — did you type a price or points instead of pips? Enter the gap between Ask and Bid in pips, as your platform shows it now (e.g. {example}).',
  riskCalcSpreadPointsHint: 'A spread of “{value}” is in points — 10 points = 1 pip, so type {pips} here',
  riskCalcSpreadMaybePrice: 'Is “{n}” the {symbol} price rather than its spread? This pair trades close to that number. If it really is the spread in pips, the calculation stands as it is.',
  riskCalcStopInsideSpread:
    'Your stop ({sl} pips) is no wider than the spread ({spread} pips) — it can be hit the moment the trade opens. Widen the stop and cut the lot, or wait for a tighter spread.',
  riskCalcStopInsideTypicalSpread:
    'Your stop ({sl} pips) is no wider than the usual {symbol} spread (~{spread} pips) — it can be hit the moment the trade opens. Enter your broker’s spread in its field, or widen the stop and cut the lot.',
  riskCalcCommission: 'Optional commission per lot, open + close',
  riskCalcCommissionNote: 'Raw/ECN accounts charge commission when you open and again when you close. Enter both sides for one lot in your account currency (e.g. 7 on a USD account; around 1000 on a JPY account), or leave it empty if your account has no commission.',
  riskCalcCommissionNoteMicro:
    'Commission here is per micro lot (0.01 standard lot): {std} per standard lot = {micro} per micro lot. If you typed it for a standard account we converted it — check it against your account terms.',
  riskCalcCommissionNoteCent:
    'Commission here is in cents (USC) per cent lot — usually zero on cent accounts. {usc} USC per cent lot equals {usc} USD per standard lot, so the number stays the same.',
  riskCalcRiskWithCosts: 'Risk including costs',
  riskCalcCostsLotsWithin: 'To keep your risk at {pct}% including costs: {lots} lot',
  riskCalcNetAfterCosts: 'After costs: {profit} · R:R {rr}',
  riskCalcNetNegative: 'Costs eat the whole target: net {profit} — move the target further or use a cheaper account',
  riskCalcLowNetRR: '⚠ After costs, the reward is smaller than the risk',
  riskCalcOverOrderMax: "⚠ {lots} lot is above most brokers' largest order (50–100 lot) — split it into several orders or check the stop",
  riskCalcOverOrderMaxSmall: "⚠ {lots} lot is above the largest order most brokers accept on a cent or micro account (usually 200 lot) — split it into several orders or check the stop",
  riskCalcCostsBelowMin: 'With costs, even the smallest lot (0.01) risks more than {pct}% — raise the % or tighten the stop',
  riskCalcUseLivePrice: '↓ Entry = current price',
  riskCalcUseLivePriceA11y: 'Fill the entry with the current market price (Ask for buy, Bid for sell, from where the stop sits)',
  riskCalcLiveFilled: '✓ Entry from the current price:',
  riskCalcLiveSideMoved: '✓ {side} at {quote} — entry moved to {price}',
  riskCalcNoLiveQuote: 'No up-to-date price for this symbol right now (none received in the last 3 minutes) — type the entry manually',
  riskCalcDisclaimer: 'Educational estimate: contract specs (especially gold) can differ at your broker — check before trading.',
  toolsTabRisk: 'Risk',
  calTimesLocal: 'Times in your timezone',
  calUpcomingHead: 'Next 24h',
  calNow: 'Now',
  calPast: 'Done',
  calInPrefix: 'in',
  calHourShort: 'h',
  calMinShort: 'm',
  calDayShort: 'd',
  newsRiskHigh: 'High-impact news',
  newsRiskHint: 'Expect sharp moves and slippage — check your stop and position size',
  newsRiskOpenHint: 'Affects your open {symbols} trades: expect sharp moves, and a stop may fill worse than its price',
  listSep: ', ',
  newsUnavailable: 'Couldn’t update the news calendar — we can’t tell if a big release is close; check before you enter',
  newsTimeTbd: 'today, time not announced',
  newsTimeTbdTomorrow: 'tomorrow, time not announced',
  calToday: 'Today',
  calTomorrow: 'Tomorrow',
  calTimeTbd: 'time not announced',
  calStaleAsOf: 'Calendar last updated {time} — couldn’t fetch a newer copy. Times are correct, but actual figures released since may be missing',
  calSampleBanner: '⚠ Sample events, not this week’s — don’t trade on their times or figures. Live calendar unavailable right now',
  calForecast: 'Fcst',
  calPrevious: 'Prev',
  calActual: 'Actual',
  reportsTitle: 'MATRIX Reports',
  reportsSubGrid: 'Same frame size · prev/next · tap to read',
  reportsSub: 'Weekly · Performance · Platform view & tips',
  reportWeeklyTitle: 'Weekly report',
  reportWeeklyHint: 'Profit & loss',
  reportPerformanceTitle: 'Performance report',
  reportPerformanceHint: 'Discipline & execution',
  reportAdviceTitle: 'Notes for next week',
  reportAdviceHint: 'Five practical points',
  reportRiskTitle: 'Risk brief',
  reportRiskHint: 'Capital management',
  reportOpenWord: 'Open ↓',
  reportAiFallbackNote: 'Could not reach the AI — this is a general template, not a custom analysis',
  reportJournalDataLine:
    'Actual trade journal data (all closed trades, not just this week): trades={trades}, win rate={winRate}%, sum of price moves={pnl}%, best trade={best}%, worst trade={worst}%. The percentages are price moves from entry to exit with lot size ignored — not account profit or loss, so do not call them that. Base the report on it.',
  reportJournalEmptyLine: '(No closed trades in the journal yet — no performance numbers to show).',
  reportJournalUnavailableLine: '(Could not read the trade journal right now — this report has none of your numbers).',
  reportFallbackWeekly:
    'Report from the trade journal{journalLine}\nLog your trades in the “Journal” tab for a more accurate report.',
  reportFallbackPerformance: 'Assessment based on the journal{journalLine}',
  reportFallbackRisk: 'Risk brief{journalLine}\n1) Risk 1% per trade, 2% at most.\n2) Use a clear stop.\n3) Avoid heavy news.',
  reportFallbackAdvice:
    'Notes for next week{journalLine}\n1) Review your open trades and each one’s stop.\n2) Before reading USD-pair and gold charts, check the dollar’s strength on more than one pair (EURUSD and USDJPY).\n3) Risk 1% per trade, 2% at most.\n4) Check the calendar and avoid entering just before high-impact news.\n5) Focus on 2–3 pairs whose moves you know.',
  journalTitle: 'Trade journal · PnL from your trades',
  journalSub: 'Log your trades — reports are built from your journal',
  journalStatClosed: 'Closed trades: {n}',
  journalStatWinRate: 'Win rate: {pct}%',
  journalStatPriceMoveSum: 'Sum of price moves (lot size ignored): {pct}%',
  journalCentMoneyNote: 'Cent account: amounts are in US cents (USC), as your account shows them — 100 USC = 1 USD',
  journalMiniNoMoney:
    'Mini account: the journal keeps pips and prices but no money amounts — a mini lot differs between brokers (10,000 units at most), so we don’t guess a figure that could be wrong. Check the profit on your platform',
  journalMoneyUsc: '{usc} USC (≈ {usd} USD)',
  journalStatBestWorst: 'Best/Worst: {best}% / {worst}%',
  journalStatsPending:
    'No closed trades yet — win rate and net pips appear once you close your first trade, and the money result when you enter the lot size.',
  journalStatNetPips: 'Net: {pips} pips',
  journalStatNetPipsBySymbol: 'Net per instrument: {parts}',
  journalStatAvgR: 'Average result: {r} per trade ({n} with a stop)',
  journalSideA11yPrefix: 'Trade direction',
  journalSymbolPlaceholder: 'Symbol',
  journalSymbolA11y: 'Trade symbol',
  journalEntryPlaceholder: 'Entry',
  journalUseLivePrice: '↓ Current price',
  journalUseLivePriceA11y: 'Fill the entry with the current price (Ask for buy, Bid for sell)',
  journalNoLiveQuote: 'No up-to-date price for this symbol right now (none received in the last 3 minutes) — type the entry manually',
  journalEntryA11y: 'Entry price',
  journalExitPlaceholder: 'Exit (optional)',
  journalSizePlaceholder: 'Size in lots (optional)',
  journalSizeA11y: 'Trade size in lots (optional)',
  journalSizeUnitsFix: '⚠ {n} looks like units, not lots — tap to convert to {lots} lot',
  journalSizeUnitsNoFix: '⚠ {n} lots is not a realistic size — it looks like a unit count copied from your platform; type the size in lots (e.g. 0.10)',
  journalSizeDottedFix: '⚠ {n}: {units} units or {whole} lots? Tap to convert to {lots} lot, or type {whole} if you meant lots',
  journalSizeFromSmallFix: '⚠ “{n}” was typed for {prev} — on {symbol} it means {n} standard lots, 100 times the size. Tap to convert it to {std} lot',
  journalExitA11y: 'Exit price (optional)',
  journalExitAtSlA11y: 'Exit at stop loss {price}',
  journalExitAtBeA11y: 'Exit at entry (breakeven) {price}',
  journalExitAtProfitStopA11y: 'Exit at the stop moved into profit {price}',
  journalExitAtTpA11y: 'Exit at take profit {price}',
  journalSlAtPipsA11y: 'Stop loss {pips} pips from entry: {price}',
  journalNotePlaceholder: 'Note',
  journalSlPlaceholder: 'Stop loss (optional)',
  journalTpPlaceholder: 'Take profit (optional)',
  journalInvalidEntry: 'Enter a valid symbol (e.g. EURUSD or XAUUSD) and the entry price',
  journalResultR: 'Result {r}',
  journalNoteA11y: 'Trade note (optional)',
  noteCharsLeft: '{n} of {max} characters left',
  noteCharsLeftReserved: '{n} of {max} characters left — {reserved} are kept for the «1.00 lot» or «1R @ …» mark saved with your note',
  journalInitialStopNote:
    '“1R @ {stop}” in the note keeps your stop from when you entered: your R result and planned R:R are measured from it, however you move the stop later. Delete it to measure from the current stop',
  journalStopTypoFix: 'Fixing a stop typo — not moving the stop',
  journalCappedNote:
    'Only your latest {n} trades are shown, and the stats count only those. Older trades are still stored on the server but are not shown or counted, even if they are still open',
  journalAddA11y: 'Add a new trade',
  journalAddBtn: 'Add trade',
  journalAddError: 'Could not add the trade — check your connection and try again',
  journalCloseFailedTitle: 'Could not close',
  journalCloseFailedBody: 'Couldn’t confirm the close — check your connection. If the trade still shows as open, close it again.',
  journalEmpty:
    'No trades logged yet — log every trade (even on a demo account) to learn over time what works for you and what doesn’t. Fill in the form above (“↓ Current price” fills the entry as you open it), or size it under “Risk” and tap “Log this plan to the journal”.',
  journalOpenSuffix: '(open)',
  journalOpenRiskNoStop: 'Open trades without a stop: {n} — their loss has no limit, so open risk is not totalled',
  journalOpenRiskUnknown: 'Open trades with an unknown size or contract: {n} — their risk in money can’t be computed, so open risk is not totalled',
  journalOpenRiskPartial: 'Some of your open trades aren’t loaded yet, so open risk is not totalled — tap “Load older” to see it',
  journalExposureStacked: 'Open trades betting the same way on {ccy}: {n} — one news release hits them all at once, so their risk stacks up instead of spreading out',
  journalExposureStackedDraft: 'With this trade, {after} of your trades bet the same way on {ccy} ({before} already open) — one news release hits them all at once, so the risk stacks up instead of spreading out',
  journalClosedWord: 'Closed',
  journalCloseNeedsExit: 'Type the exit price in the “Exit” field at the top of the form, then tap “Close at exit field price” under the trade.',
  journalDeleteConfirmTitle: 'Delete this trade from the journal?',
  journalDeleteFailedBody: 'We couldn’t confirm the delete — check your connection. If the trade is still in the journal, delete it again.',
  journalDeleteA11y: 'Delete {symbol} trade from the journal',
  journalEditBtn: 'Edit',
  journalEditA11y: 'Edit {symbol} trade',
  journalEditingBanner: 'Editing {symbol} trade — change the fields, then “Save changes”. Clear the exit field to reopen it.',
  journalSaveEditBtn: 'Save changes',
  journalCancelEdit: 'Cancel edit',
  journalEditError: 'Couldn’t save the changes — check your connection and try again',
  journalEditConflict: 'Changes not saved: this trade was closed, reopened or edited on another device while you were editing. The list is up to date now — check its status, then save again if needed.',
  journalCloseLinkA11y: 'Close {symbol} trade at the exit field price',
  journalCloseLinkBtn: 'Close at exit field price',
  journalCloseMarketBtn: 'Close at market',
  journalCloseMarketA11y: 'Close {symbol} trade at the current price',
  journalCloseMarketConfirmTitle: 'Close at market price?',
  journalCloseMarketConfirmBody: '{side} {symbol} · {entry} → {exit}\nResult: {result}\n\nPrice from the data provider (Bid for buys, Ask for sells) and may differ slightly from your broker — you can edit it after closing.',
  journalCloseFieldConfirmTitle: 'Close at exit field price?',
  journalCloseMarketConfirmBtn: 'Close',
  journalCloseMarketNoQuote: 'No up-to-date price for this symbol right now (none received in the last 3 minutes) — type the exit in the “Exit” field, then use “Close at exit field price”',
  journalClosedElsewhereTitle: 'Already closed',
  journalClosedElsewhereBody: 'This trade was closed on another device, so no second exit was recorded over it. The list now shows its recorded exit price and result.',
  journalCloseConflictTitle: 'Close not recorded',
  journalCloseConflictBody: 'This trade was edited on another device at the same moment, so your exit was not recorded over that change. The list is up to date now — check the trade, then close it again if needed.',
  backtestSub: 'MA · RSI · MACD · BB · Equity curve',
  backtestSymbolA11y: 'Instrument symbol for the backtest',
  backtestStrategyA11yPrefix: 'Strategy',
  backtestRunA11y: 'Run the backtest',
  backtestRunBtn: 'Run Backtest',
  backtestRunError: 'Could not run the backtest — check your connection and try again',
  noLiveDataResult: 'No real market data for this symbol right now — we don’t compute results on demo prices. Try again later.',
  backtestStatTrades: 'Trades: {n}',
  backtestStatWinRate: 'Win rate: {pct}%',
  backtestStatReturn: 'Total return: {pct}%',
  backtestStatEquity: 'Final equity: {v}',
  backtestStatDrawdown: 'Max drawdown: {pct}%',
  backtestStatAvgWinLoss: 'Avg win/loss: {win}% / {loss}%',
  backtestStatAvgWin: 'Avg win: {win}% — no losing trades',
  backtestStatAvgLoss: 'Avg loss: {loss}% — no winning trades',
  backtestNoTrades: 'The strategy produced no trades in this period — no win rate or return to show. Try another timeframe.',
  // «(1 trades)» — لكل عدد
  backtestSmallSample: '⚠ Small sample (trades: {n}) — this win rate isn’t reliable; don’t decide on fewer than ~30 trades.',
  backtestSpreadNote: 'Results are after an estimated {pips}-pip spread per trade (varies by broker).',
  backtestTitle: 'Strategy Backtest',
  backtestEquityTitle: 'Equity curve',
  backtestStratMaCross: 'MA Cross',
  backtestStratRsi: 'RSI Reversal',
  backtestStratMacd: 'MACD Cross',
  backtestStratBb: 'BB Bounce',
  indAlertsTitle: 'Indicator alerts',
  indAlertsSub: 'RSI · MA cross · MACD',
  indAlertsSymbolA11y: 'Instrument symbol',
  indAlertsTypeA11yPrefix: 'Indicator alert type',
  indAlertsTypeRsi: 'RSI',
  indAlertsTypeMaCross: 'Moving average cross',
  indAlertsTypeMacdCross: 'MACD cross',
  indAlertsBelowA11y: 'Condition: RSI below threshold',
  indAlertsAboveA11y: 'Condition: RSI above threshold',
  indAlertsBelowChip: 'RSI below',
  indAlertsAboveChip: 'RSI above',
  indAlertsThresholdA11y: 'Indicator threshold value',
  indAlertsCrossUpA11y: 'Condition: cross up',
  indAlertsCrossDownA11y: 'Condition: cross down',
  indAlertsCrossUpChip: 'Cross up ▲',
  indAlertsCrossDownChip: 'Cross down ▼',
  indAlertsAddA11y: 'Add indicator alert',
  indAlertsAddBtn: 'Add alert',
  indAlertsAddError: 'Could not add the indicator alert — check your connection and try again',
  indAlertsLoadError: 'Couldn’t load your indicator alerts — check your connection. Your saved alerts haven’t been deleted.',
  indAlertsEmpty:
    'No indicator alerts yet — pick an indicator and a condition above (RSI below 30, say) and get notified without watching the chart.',
  indAlertsDeleteConfirmTitle: 'Delete the indicator alert?',
  indAlertsDeleteFailedTitle: 'Could not delete',
  indAlertsDeleteFailedBody: 'We couldn’t confirm the delete — check your connection. If the indicator alert is still in the list, delete it again.',
  indAlertsDeleteA11yPrefix: 'Delete indicator alert',
  indAlertsPushTitle: 'MATRIX · Indicator alert',
  indAlertsTfLabel: 'Timeframe:',
  indAlertsHintRsi: 'RSI 14: below 30 = oversold, above 70 = overbought — it can stay stretched for a long time in a strong trend',
  indAlertsHintMa: 'Fast SMA 9 crosses slow SMA 21 on the latest candle of the chosen timeframe',
  indAlertsHintMacd: 'MACD line (12, 26) crosses its signal line (9) on the latest candle of the chosen timeframe',
  indAlertsRsiRange: 'RSI threshold must be a number from 1 to 99 (30 or 70 are common)',
  indAlertsSymbolInvalid: 'Enter a valid symbol such as EURUSD',
  indAlertsArmed: '✓ Alert armed:',
  indAlertsFiredTag: 'fired',
  indAlertsRearmBtn: 'Re-arm',
  indAlertsRearmA11yPrefix: 'Re-arm alert',
  indAlertsRearmedMsg: '✓ Watching again: {desc} — if the condition still holds it fires on the next check',
  indAlertsRearmFailed: 'Couldn’t re-arm the alert — check your connection and try again',
  indAlertsWatchingTag: 'watching',
  calendarTitle: 'Economic calendar',
  calendarCurrencyA11yPrefix: 'Filter by currency',
  calendarAllWord: 'All',
  newsAllCurrencies: 'All currencies',
  calendarImpactA11yPrefix: 'Filter by impact',
  calendarAllShort: 'All',
  calImpactMedPlus: 'Medium+',
  calImpactMedPlusA11y: 'High and medium',
  calendarLoading: 'Loading the calendar…',
  calendarLoadError: "Couldn’t load the calendar — check your connection. It retries by itself every 5 minutes, or change a filter to retry now",
  calendarEmpty:
    'No events match this filter this week — tap ALL in the currency row or All in the impact row to see more. The calendar covers the current week only.',
  layoutDefaultName: 'My layout',
  layoutFallbackName: 'Layout',
  layoutsTitle: 'Saved layouts',
  layoutNamePlaceholder: 'Layout name',
  layoutNameA11y: 'Layout name',
  layoutSaveA11y: 'Save the current layout',
  layoutSaveBtn: 'Save current layout',
  layoutApplyA11yPrefix: 'Apply layout',
  layoutDeleteConfirmTitle: 'Delete the layout?',
  layoutsHint: 'A layout = the pairs and timeframes of the three charts on the main screen. Tap one to apply it and open the chart.',
  layoutCurrentTag: 'current',
  layoutSavedMsg: '✓ Saved:',
  layoutBuiltinName: 'Default',
  layoutDeleteA11yPrefix: 'Delete layout',
  coursesTitle: 'Academy',
  // المحاضرات نفسها عربية فقط (`backend/academy_data.py`، QA27) — تُقال هنا قبل أن يفتح المستخدم درساً. سؤالك يُجاب بلغتك.
  coursesSub: 'Lessons in Arabic · voice narration · pause and ask about any part in English',
  coursesStaleNote: "Couldn’t refresh the school list — showing saved data",
  coursesNoteTitle: 'Important classification',
  coursesNoteText:
    'BOS and CHOCH belong to the Order Block and Fair Value Gap group inside the ICT/SMC school — they are not a separate school.',
  coursesSchoolA11yPrefix: 'School',
  coursesLevelsWord: 'levels',
  coursesLecturesUnitWord: 'lectures',
  coursesNarratedBadge: '🔊 Full audio narration',
  coursesFallbackNote: "Couldn’t load the full curriculum — showing only a temporary introductory lecture",
  coursesLevelWord: 'Level',
  coursesLectureA11yPrefix: 'Lecture',
  coursesMinuteWord: 'minute',
  coursesMinuteAbbrev: 'min',
  coursesBackToSchoolsA11y: 'Back to the school list',
  coursesBack: 'Back',
  coursesFallbackLevelTitle: 'Foundation',
  coursesFallbackLectureTitle: 'Opening Lecture',
  coursesFallbackOutlineIntro: 'Introduction',
  lectureClose: 'Close',
  lectureCloseA11y: 'Close the lecture',
  lectureLevelWord: 'level',
  lectureLoadFailedNote: "The lecture didn’t arrive from the server — what follows is not a lesson. Check your connection, then open it again.",
  lectureFullScreenTag: 'Full screen',
  lectureVoicePausedForQ: 'Paused for a question',
  lecturePreparingVoice: 'Preparing the audio…',
  lectureExplainingNow: 'Explaining now',
  lectureVoicePlayError:
    "Couldn’t play the audio — check your connection. The full lesson text is on screen, so you can keep reading.",
  lectureChartLabel: 'Interactive chart',
  lectureHideChart: 'Hide',
  lectureHideChartA11y: 'Hide the interactive chart',
  lectureShowChart: 'Show the interactive chart',
  lectureChartPracticeNote: 'No connection to the server: these are practice candles, not market prices. Practice freely — but what you draw here isn’t saved.',
  lectureVoiceStopped: 'Audio stopped',
  lectureGenerating: 'Generating…',
  lectureVoiceActive: 'Voice narration active',
  lectureSegmentWord: 'Segment',
  lectureCompleteBadge: '🎉 You finished this lecture',
  lectureClarifyTitle: 'Clarification after pausing',
  lectureClarifyPausedLine: 'The narration has been paused for a moment.',
  lectureClarifyQuestionLabel: 'Your question:',
  lectureClarifyFocusLine:
    "Focus on the practical idea on the screen, then we’ll continue from the same segment.",
  lectureResume: 'Resume the lecture',
  lecturePrev: 'Previous',
  lecturePrevA11y: 'Previous segment',
  lectureNext: 'Next',
  lectureNextA11y: 'Next segment',
  lectureInterruptLabel: 'Pause the narration and ask about an unclear part',
  lectureQuestionPlaceholder: 'e.g. I didn’t get the CHOCH part…',
  lectureQuestionA11y: 'Question while the narration is paused',
  lectureAskBtn: 'Ask',
  lectureAskA11y: 'Send the question',
  lectureFallbackTitle: "Couldn’t load this lecture",
  lectureFallbackOutlineDefinition: 'What happened',
  lectureFallbackOutlineApplication: 'What to do',
  lectureFallbackTeacher: 'Voice narration',
  lectureFallbackSeg1Title: 'What happened',
  lectureFallbackSeg1Narration:
    "We couldn’t load this lecture right now. Most likely the connection to the internet or to the MATRIX server dropped.",
  lectureFallbackSeg2Title: 'What to do',
  lectureFallbackSeg2Narration:
    'Check your connection, then close this screen and open the lecture again.',
  termShadowSizeSmall: 'Small',
  termShadowSizeMedium: 'Medium',
  termShadowSizeBig: 'Large',
  termServerOnline: 'Connected to server',
  termServerOffline: 'No connection to server',
  termLastPriceWord: 'Last price',
  termIndicatorsWord: 'Indicators',
  termAlertWord: 'Alert',
  termKindWord: 'Type',
  termFrameWord: 'Frame',
  termSquareWord: 'Square',
  termRectWord: 'Rectangle',
  termLayoutSquareA11yPrefix: 'Square layout',
  termLayoutRectA11yPrefix: 'Rectangle layout',
  termShadowFrameA11y: 'Shadow frame',
  termShadowWord: 'Shadow',
  termTimeSyncLabel: 'Time sync',
  termTimeSyncUnavailable: 'Time sync doesn’t work in the Shadow layout',
  termToolA11yPrefix: 'Tool',
  termChartKindA11yPrefix: 'Chart type',
  termSymbolA11yPrefix: 'Symbol',
  termManageWatchlistLabel: 'Manage watchlist',
  termManageWord: 'Manage',
  termPrimaryWord: 'Primary',
  termShadowHintText: 'Primary above · shadows below, largest to smallest',
  termPrimaryTimeframeA11yPrefix: 'Primary timeframe',
  termOnWord: 'On',
  termOffWord: 'Off',
  termTimeframeWord: 'timeframe',
  termTimeframeA11yPrefix: 'Timeframe',
  termOpenFullscreenA11y: 'Open chart in fullscreen',
  termFullscreenLabel: 'Fullscreen ⛶',
  termFxMarketWord: 'FX market',
  termSpreadWord: 'Spread',
  termBidLabel: 'Bid',
  termAskLabel: 'Ask',
  termSquareFramesHintSuffix: 'square frames · drag the dots in a frame’s corner to swap it with another · indicators optional',
  termHintMoveText:
    'Forecasts · Alerts · News · Community → Tools · drag the dots in a frame’s corner to swap it with another',
  termCloseWatchlistA11y: 'Close watchlist',
  wlTitle: 'Watchlist',
  wlAddBtn: 'Add',
  wlAddA11y: 'Add symbol to watchlist',
  wlResetBtn: 'Default',
  wlResetA11y: 'Reset watchlist to default',
  wlResetConfirmTitle: 'Reset watchlist to default?',
  wlResetConfirmBody: 'All manually added symbols will be replaced with the default list.',
  wlResetConfirmBtn: 'Reset to default',
  wlSearchPlaceholder: 'Search symbol…',
  wlLoadError: "Couldn’t read your watchlist from this phone — tap “Retry”",
  layoutSaveFailed: "Couldn’t save the layout on this phone — check free storage and try again",
  layoutDeleteFailed: "Couldn’t delete the layout — it may reappear next time, so delete it again",
  chartTemplateSaveFailed: "Couldn’t save your default setup on this phone — check free storage and try again",
  drawingsSaveFailed: "Drawings not saved on this phone — check free storage, or they’ll be lost when you switch symbol or close the app",
  drawingsDeleteFailed: "Drawings not cleared from this phone — they may come back when you reopen this chart",
  wlSaveFailed: "Change not saved — the list was put back as it was. Check free storage and try again",
  wlRetryA11y: 'Retry loading watchlist',
  wlRetryBtn: 'Retry',
  wlLoadingWord: 'Loading…',
  wlEmpty:
    'No symbols in your watchlist — add your pairs with the button below to see price, daily change, and switch the chart in one tap.',
  wlAddEmptyBtn: 'Add symbol',
  wlDemoPriceA11ySuffix: ' · demo price',
  wlDemoTag: 'Demo',
  wlMoveUpA11y: 'Move up',
  wlMoveDownA11y: 'Move down',
  wlRemoveA11y: 'Remove from watchlist',
  wlRemoveConfirmTitle: 'Remove from watchlist?',
  wlRemoveConfirmBtn: 'Remove',
  wlCatalogTitle: 'Add from catalog',
  wlCatalogAllAdded: 'All catalog symbols added',
  wlCatalogCloseA11y: 'Close add dialog',
  focusSymbolA11yPrefix: 'Symbol',
  focusVsWord: 'vs',
  focusPhoneSubHint: 'Tap to change symbol',
  focusDesktopSub: 'Analysis station · draw · compare · alerts',
  focusLastPriceWord: 'Last price',
  focusWatchlistTitle: 'Watchlist',
  focusCompareHint: 'Press and hold a symbol to compare it on the chart; again to remove it',
  focusCompareTag: 'Compare',
  focusPickSymbolA11yPrefix: 'Select symbol',
  focusCompareNotePrefix: 'Comparing with',
  focusCompareNoteSuffix: '(purple)',
  focusCompareUnavailable: 'Couldn’t load real {sym} data — no comparison line',
  focusInComparisonSuffix: ' · in comparison',
  focusAlertCreateFailedTitle: "Couldn’t create alert",
  focusAlertCreateFailedBody:
    'The alert wasn’t created. Check your connection and try again. An alert needs a real price for the symbol to know whether to wait for a rise or a drop, so it can’t be set while the chart shows demo prices.',
  focusAlertFromDrawingNote: 'From drawing line',
  focusAlertFromChartNote: 'From chart',
  gridFramesWord: 'Frames',
  gridSquaresWord: 'Squares',
  gridSquaresA11y: 'View frames as squares',
  gridHandleA11y: 'Frame order handle — swaps this frame with another',
  gridHandlePosA11y: 'Frame {n} of {total}',
  gridRectanglesWord: 'Rectangles',
  gridRectanglesA11y: 'View frames as rectangles',
  quadCloseA11y: 'Close 2×2 view',
  quadTitlePrefix: '2×2 Station',
  spmCloseA11y: 'Close pairs menu',
  spmOpenA11y: 'Open pairs menu',
  spmPanelTitle: 'Your pairs',
  panSpeedMarkA11y: 'Speed mark',
  panTapDetailsSuffix: '— tap for details',
  panHideDetailsA11y: 'Hide speed details',
  panChartSpeedPrefix: 'Chart pan speed',
  lensA11yPrefix: 'Lens: ',
  drawToolA11yPrefix: 'Draw tool: ',
  lensSectionTitle: 'Lens',
  ctlKindCandles: 'Candles',
  ctlKindHollow: 'Hollow candles',
  ctlKindHeikin: 'Heikin Ashi',
  ctlKindBars: 'Bars',
  ctlKindLine: 'Line',
  ctlKindArea: 'Area',
  ctlKindBaseline: 'Baseline',
  ctlKindRange: 'Range',
  ctlKindRenko: 'Renko',
  ctlKindKagi: 'Kagi',
  ctlKindPnf: 'Point & Figure',
  ctlKindLineBreak: 'Line break',
  ctlToolNone: 'Cursor',
  ctlToolSelect: 'Select',
  ctlToolTrend: 'Trend',
  ctlToolRay: 'Ray',
  ctlToolHline: 'H-line',
  ctlToolVline: 'V-line',
  ctlToolRect: 'Box',
  ctlToolFib: 'Fib',
  ctlToolZone: 'Zone',
  ctlToolNote: 'Note',
  ctlToolMeasure: 'Measure',
  ctlToolLong: 'Buy plan',
  ctlToolShort: 'Sell plan',
  ctlToolHray: 'H-ray',
  ctlToolChannel: 'Channel',
  ctlLensClean: 'Clean',
  ctlLensCleanHint: 'Price only',
  ctlLensStructure: 'Structure',
  ctlLensStructureHint: 'SMA + EMA',
  ctlLensMomentum: 'Momentum',
  ctlLensMomentumHint: 'RSI + MACD',
  ctlLensLiquidity: 'Liquidity',
  ctlLensLiquidityHint: 'Volume + BB + CVD',
  ctlIndBollinger: 'Bollinger',
  ctlIndVolume: 'Volume',
  backtestWord: 'Backtest',
  depthWord: 'Spread',
  mspDrawTitle: 'Draw tools · MATRIX',
  mspIndicatorsTitle: 'Indicators · MATRIX',
  mspKindsTitle: 'Chart types',
  mspAlertsTitle: 'Price alerts',
  mspIndAlertsTitle: 'Indicator alerts',
  mspCalendarTitle: 'Economic calendar',
  mspScreenerTitle: 'Market screener',
  mspReportsTitle: 'MATRIX reports',
  mspBacktestTitle: 'Strategy Backtest',
  mspNewsTitle: 'News',
  mspDomTitle: 'Bid / Ask',
  mspJournalTitle: 'Trade journal',
  mspIndicatorA11yPrefix: 'Indicator: ',
  mspIndicatorEnabledSuffix: ' · on',
  mspKindA11yPrefix: 'Chart type: ',
  dockDrawTab: 'Draw',
  dockSignalsTab: 'Forecasts',
  dockAnalystsTab: 'Analysts',
  dockSocialTab: 'Channels',
  dockIndForecastTab: 'Indicators+',
  dockScreenerTab: 'Screener',
  dockAlertsTab: 'Alerts',
  dockNewsTab: 'News',
  dockCommunityTab: 'Community',
  dockHideBtn: 'Hide',
  dockHideA11yPrefix: 'Hide ',
  dockPanelFallback: 'Panel',
  dockLibraryFallback: 'Library',
  dockMoreTab: 'More',
  dockMoreA11y: 'More panels',
  dockDrawToolSectionTitle: 'Draw tool',
  dockTabA11yPrefix: 'Tab: ',
  railDrawSectionTitle: 'Draw',
  railPanelsSectionTitle: 'Panels',
  railPanelA11yPrefix: 'Panel: ',
  railTipAlert: 'Alert',
  railTipIndicator: 'Indicator',
  railTipReport: 'Report',
  railTipNewsItem: 'News',
  railOpenQuadA11y: 'Open 2×2 layout',
  cfSyncLeaderBadge: 'Time leader',
  cfSyncPartialBadge: 'Synced · partial',
  cfSyncFollowBadge: 'Synced',
  cfSubtitleInteractive: 'MATRIX engine · lenses & tools',
  cfSubtitleNavigate: 'Drag middle · price · dates',
  cfSubtitleDefault: 'Tap for full analysis',
  cfSyncActivateA11yPrefix: 'Make time leader: ',
  cfChangeSymbolA11y: 'Change symbol',
  cfDayChangeA11y: 'Today’s change {pct}',
  cfDayChangeNoneA11y: 'Today’s change not available for this price',
  cfMarketClosedA11y: 'Market currently closed',
  cfReplayPriceA11y: 'Candle replay — this is the replay candle’s close, not the live price',
  cfMarketClosedTag: 'Closed',
  cfSpreadBidAskA11y: 'Bid {bid}, ask {ask}',
  cfSpreadPipsA11y: 'Spread {pips} pips',
  dsKindProvider: 'Provider',
  dsKindDemo: 'Demo',
  dsKindCache: 'Cached',
  dsKindUnknown: 'Unknown source',
  dsTickLive: 'Live',
  dsTickDemo: 'Demo tick',
  dsLastPriceWord: 'Last price',
  dsMarketOpen: 'Market open',
  dsMarketClosed: 'Market closed',
  // chart/MatrixChart.tsx (i18n الشارت, 2026-09-20)
  mcMonths: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ],
  mcWeekdays: [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
  ],
  mcPrimaryLane: 'Primary',
  mcMeasureBarsWord: 'bars',
  mcMeasureDurUnits: { m: 'm', h: 'h', d: 'd' },
  mcNoteDefault: 'Note',
  mcNoteTextA11y: 'Note text on the chart — up to 60 characters',
  mcHintNoteSelected: 'Type the note in the box next to it · drag the note to move it · saved automatically',
  mcHintNoteSelectedWeb: 'Type the note in the box next to it · drag the note to move it · Esc deselects · Ctrl+Z / Ctrl+Y to undo / redo',
  mcSnapshotSaved: 'Chart snapshot saved',
  mcSnapshotFailed: "Couldn’t export the chart — try again, or take a screenshot of the chart",
  mcTemplateDefaultName: 'Default',
  mcTemplateSaved: 'Saved as default — charts you open later start with these indicators and scale settings',
  mcClearAllTitle: 'Clear all drawings?',
  mcClearAllBody: 'Every drawing on this symbol will be deleted, on all timeframes',
  mcClearWord: 'Clear',
  mcHintDraw: 'Drag to draw, or tap two points · saved automatically',
  mcHintNavigate: 'Drag to pan · tap a candle to read it, or hold then drag · pinch or drag the axes to zoom',
  mcHintNavigateWeb: 'Hover to read · click to pin · ←/→ one candle · Esc to clear · Alt+R resets the view · Alt+T trend, H H-line, V V-line, F Fib',
  mcHintDrawWeb: 'Drag to draw, or click two points · Esc to cancel · Ctrl+Z / Ctrl+Y to undo / redo · Alt+T/H/V/F switches tool · saved automatically',
  mcHintSelectedWeb: 'Drag or use the arrow keys to move the drawing (Shift ×10) · Delete removes it · Esc deselects · Ctrl+Z / Ctrl+Y to undo / redo',
  mcHintSelect: 'Tap a drawing to select it · tap empty space to deselect',
  mcHintSelected: 'Drag the drawing to move it · drag a handle to adjust one end · saved automatically',
  mcAutoA11y: 'Auto: fit prices and return to the latest candle',
  mcAutoManualA11y: 'Price scale is manual — new candles may leave the view. Tap to restore auto and return to the latest candle',
  mcAutoShort: 'AUTO',
  mcArrowHeadA11y: 'Arrowhead at the end of the trend line',
  mcArmedAlertAboveA11y: 'Alert set for price rising to {price} — {dist}',
  mcArmedAlertBelowA11y: 'Alert set for price falling to {price} — {dist}',
  mcAlertMoveFailed: "Couldn’t move the alert — it’s still at {price}. Check your connection and drag it again.",
  mcArmedAlertAdjustHint: 'Swipe up or down to move the alert one price step (one pip on pairs and metals) — the new price saves after a short pause',
  mcEstimatedTag: 'est.',
  mcVolEstimatedHint:
    'Our data provider sends no traded volume for this symbol (forex has no central volume) — these bars are estimated from each candle’s high-to-low range. Volume indicators (OBV, MFI, VWAP, Klinger…) are built from the same estimate, so their values won’t match a platform that shows your broker’s tick volume.',
  mcZoomOutA11y: 'Zoom out',
  mcZoomInA11y: 'Zoom in',
  mcPanBackA11y: 'Pan back',
  mcPanForwardA11y: 'Pan forward',
  mcReplayModeA11y: 'Replay mode',
  mcReplayReadout: 'Candle replay · {n}/{total}',
  mcReplayEndedOnSwitch: 'Replay ended because the timeframe or symbol changed — the chart is back on the live price',
  mcReplayStepBackA11y: 'Replay step back',
  mcReplayPauseA11y: 'Pause replay',
  mcReplayPlayA11y: 'Play replay',
  mcReplayStepFwdA11y: 'Replay step forward',
  mcMagnetA11y: 'Snap to grid',
  mcDockTitle: 'Tool dock · MATRIX',
  mcNoPineLine: 'No formula line',
  mcExportPng: 'Export PNG',
  mcSaveTemplate: 'Save as default',
  mcAlertLine: 'Line alert',
  mcAlertZone: 'Zone alert',
  mcAlertAtLineLevel: 'Alert at the current line level',
  mcAlertAtCrossA11y: 'Create a price alert at',
  mcUndo: 'Undo',
  mcUndoA11y: 'Undo the last drawing change',
  mcNothingToUndo: 'Nothing to undo',
  mcRedo: 'Redo',
  mcRedoA11y: 'Redo the last drawing change you undid',
  mcNothingToRedo: 'Nothing to redo',
  mcToLatestA11y: 'Scroll to the latest candle',
  mcHideDrawings: 'Hide drawings',
  mcShowDrawings: 'Show drawings',
  mcLogScaleA11y: 'Logarithmic price scale',
  mcPercentScaleA11y: 'Percentage scale: change from the first visible candle',
  mcZigzagDevA11y: 'ZigZag deviation {pct}% — tap to switch to {next}%',
  mcLineBreakCountA11y: 'Line break: reverses after {count} lines — tap to switch to {next}',
  mcLockDrawing: 'Lock',
  mcUnlockDrawing: 'Unlock',
  mcLockDrawingA11y: "Lock the selected drawing so a stray touch can’t move it",
  mcDrawingLockedHint: 'Drawing is locked — unlock it to move it',
  mcDrawColorWord: 'Color',
  mcDrawColorA11y: 'Drawing color: {color} — tap for the next color',
  mcCloneDrawing: 'Clone',
  mcCloneDrawingA11y: 'Copy this drawing beside it — the copy becomes the selected one, to move and edit on its own',
  mcNudgeUpA11y: 'Move the selected drawing up one price step (one pip on pairs and metals). Hold to repeat',
  mcNudgeDownA11y: 'Move the selected drawing down one price step (one pip on pairs and metals). Hold to repeat',
  mcNudgeEarlierA11y: 'Move the selected drawing one candle earlier. Hold to repeat',
  mcNudgeLaterA11y: 'Move the selected drawing one candle later. Hold to repeat',
  mcColorNames: ['Frame color', 'Green', 'Red', 'Amber', 'Blue', 'White'],
  mcShareDialogTitle: 'MATRIX chart',
  mcSessTokyo: 'Tokyo',
  mcSessLondon: 'London',
  mcSessNewYork: 'New York',
  mcPanesCollapsed: 'Hidden',
  mcPanesCollapsedA11y: 'Indicator panes hidden: the chart is too short to fit them',
  mcPanesPageA11y: 'Tap to show the hidden panes instead of the visible ones',
  mcSwitching: 'Loading…',
  mcSwitchingA11y: 'Loading the new chart — showing the previous data until it arrives',
  mcSyncTimeOn: 'Time sync',
  mcSyncTimeOff: 'Sync off',
  mcSyncLeadHint: 'Tap a chart and the others follow its time',
  mcSyncToggleA11y: 'Turn time sync across the four charts on or off',
  mcMeasureBarOne: 'bar',
  mcMeasureBarTwo: 'bars',
  // Chart-screen widget layer (i18n, 2026-09-21)
  ssbPlaceholder: 'Search symbol… EUR, XAU, BTC',
  ssbError: 'Search isn’t available right now — either your connection or our data provider. Try again shortly',
  ssbNoMatch: 'No symbol matches “{q}” at our data provider — try a shorter part like EUR, XAU or BTC',
  ssbAmbiguousTag: 'Listed on several exchanges — not supported yet',
  ssbOnlyAmbiguous: '“{q}” is listed on more than one exchange, and the app can’t yet tell which one to chart — so it can’t be opened for now',
  ssbPickA11yPrefix: 'Select symbol: ',
  smnTitle: 'Quick scan',
  smnFilterMomentum: 'Mom+',
  smnA11yMaCross: 'Moving average cross up',
  smnA11yRsiOversold: 'RSI oversold',
  smnA11yBullish: 'Bullish momentum',
  domTitle: 'Bid / Ask · Spread',
  domBidLabel: 'Bid (sell)',
  domAskLabel: 'Ask (buy)',
  domSpreadLabel: 'Spread',
  domBidAskHint: 'You sell at the Bid and buy at the Ask — the spread is a cost on every trade.',
  domNoBidAsk: 'The provider has no Bid/Ask for this symbol — last price only.',
  domNoLiveQuote: 'No live price right now — the market may be closed (weekend) or the data provider is not responding. Retrying automatically.',
  domOtcNote: 'Forex is decentralized: there is no single market depth, and your real spread depends on your broker.',
  pdwPrevA11yPrefix: 'Previous pair: ',
  pdwCurrentA11yPrefix: 'Select current pair: ',
  pdwNextA11yPrefix: 'Next pair: ',
  tfLabels: { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1H': '1H', '4H': '4H', D: 'D', W: 'W' },
  tfLabelsA11y: {
    '1m': '1 minute',
    '5m': '5 minutes',
    '15m': '15 minutes',
    '30m': '30 minutes',
    '1H': '1 hour',
    '4H': '4 hours',
    D: 'Daily',
    W: 'Weekly',
  },
  subPlans: {
    title: 'MATRIX plans',
    subtitle: 'Start with charts and community; add the academy and the other tools when you need them',
    perMonth: '/ month',
    coreBadge: 'Start here',
    academyBadge: '+ Academy',
    fullBadge: 'Everything',
    coreName: 'Core',
    academyName: 'Academy',
    fullName: 'Full',
    academyAddOn: '+$5 for courses',
    fullAddOn: '+$5 for everything else',
    coreFeatures: [
      'Every candle and chart type',
      'Every frame: square, rectangle and shadow',
      'Group chat and polls',
      'Economic calendar, watchlist and drawing tools',
      'Indicators and timeframes',
    ],
    academyFeatures: [
      'Everything in Core',
      'The full academy: schools, levels and lectures (taught in Arabic)',
      'Interactive classroom — interrupt the teacher with a question',
    ],
    fullFeatures: [
      'Everything in Academy',
      'AI assistant, alerts, screener and backtesting',
      'Indicator forecasts and the other tools',
    ],
    note: 'Core is $10 a month for charts and community. Add $5 for the academy, and $5 more for everything else.',
  },
  cppOpenA11y: 'Open commission report',
  cppCloseA11y: 'Collapse commission report',
  cppTitle: 'Commission report',
  cppSubOpen: 'Commission tables · monthly earnings',
  cppSubClosed: 'Tap the arrow to open the report',
  cppLiveError: 'Couldn’t load commissions from the server — the tables below are rough examples, not your actual figures',
  cppTableCommissions: 'Commissions',
  cppColType: 'Type',
  cppColCondition: 'Condition',
  cppColPoints: 'Points',
  cppTableLevels: 'Levels',
  cppColRole: 'Role',
  cppColLevels: 'Levels',
  cppTableMonthly: 'Monthly earnings',
  cppColMonth: 'Month',
  cppColDirect: 'Direct',
  cppColBalance: 'Balance',
  cppColTotal: 'Total',
  cppNoEarnings: 'No earnings recorded yet — they appear here once you add members from the tree',
  cppEarningsLoadError: 'Couldn’t load your earnings — check your connection and tap “Refresh”',
  cppBasisNote: 'Basis: {unit} points per member × commission rate',
  cppTypeDirect: 'Direct referral',
  cppTypeBalance: 'Balance bonus',
  cppTypeActiveBalanced: 'Active, balanced',
  cppTypeActiveUnbalanced: 'Active, unbalanced',
  cppCondNewMember: 'When a new member joins',
  cppCondBalanced: 'Right = Left',
  cppCondUnbalanced: 'Right ≠ Left',
  ntpNamePlaceholder: 'Type a name',
  ntpNameA11y: 'New member name for this box — at least 3 characters',
  ntpConfirmA11y: 'Place member in this box',
  ntpLevelTitle: 'Level {gen} · 1–{n} per side',
  ntpNewBranches: ' · new branches',
  ntpLoadError: 'Couldn’t load the tree — check your connection and tap Refresh',
  ntpPlaceError: 'Member not placed — the name is taken, the box is filled, or the name is shorter than 3 characters',
  ntpOpenA11y: 'Open network tree',
  ntpCloseA11y: 'Collapse network tree',
  ntpTitle: 'Network tree',
  ntpSubLive: 'Left | Right · numbering starts at 1 on each side',
  ntpSubPreview: 'Preview · sign in to activate',
  ntpSubClosed: 'Tap the arrow to open the tree',
  ntpYou: 'You',
  ntpGuestHint: 'Sign in, then type a member name inside a numbered box.',
  ntpLevelBranches: '↓ Level {gen} branches',
  ntpTrunkHint: 'Root line ↓',
  ntpYouRoot: 'You · root',
  tdsCaption: 'How the tree grows · left and right are separate',
  tdsLevel: 'Level {gen} · 1–{n} per side',
  tdsLevelOne: 'Level 1 · one box per side',
  tdsRootBottom: 'Root · bottom',
  tdsFootnote: 'Numbering starts at 1 on each side, and left is separate from right · type the name inside the box only',
  accNetLoadError: 'Couldn’t load your network and referral data — try again later',
  accReplayTour: '↺ Replay welcome tour',
  accReplayTourA11y: 'Show the welcome tour again from the start',
  a11yBusy: 'Working, please wait',
  calendarUnavailable: "Calendar unavailable right now — the events source didn’t respond. That doesn’t mean there’s no news today. Retries on its own every 5 minutes",
  sigLevelsUnavailableNoPrice: 'No entry, stop or target — no live price right now',
  sigLevelsUnavailableFewCandles: 'No entry, stop or target — not enough candles to measure the range (ATR)',
  sigLevelsUnavailableAtrWide: 'No entry, stop or target — the range (ATR) is wider than the price itself',
  sigLevelsUnavailableNeutral: 'No entry, stop or target — direction is neutral',
  sigLevelsUnavailableNoRange: 'No entry, stop or target — the price hasn’t moved in this window, so there’s no range (ATR) to measure from',
  sigLevelsUnavailableAtrBelowTick: 'No entry, stop or target — the range (ATR) is smaller than the price’s smallest step, so the stop would sit on the entry itself. Try a longer timeframe',
  journalStatBreakeven: 'Breakeven: {n} (not counted in win rate)',
  journalShownOfTotal: 'Showing {shown} of {total} trades — stats cover all of them',
  journalLoadOlder: 'Load older',
  journalSizeUnknown: 'Size not recorded',
  journalLoadOlderError: 'Couldn’t load older trades — check your connection and tap “Load older” again. The trades already shown are unchanged.',
  journalRetryBtn: 'Try again',
  journalLoadErrorRetry: 'Couldn’t load your journal — check your connection, then tap “Try again”. Your logged trades haven’t been deleted.',
  analystsUnavailable: "No licensed source for analyst forecasts yet — so we show no direction or targets rather than make them up",
  socialUnavailable: "No licensed source for channel views yet — so we show no consensus or suggested trade rather than make them up",
  riskCalcConvInverted: '“{typed}” can’t be the {pair} rate — it looks inverted (1 ÷ the price). You likely meant {likely}; type it as your platform shows it.',
  impactHoliday: 'Bank holiday — thin liquidity',
  newsHolidayToday: 'Bank holiday today · {ccy}{title} — thin liquidity: wider spreads, slippage and gaps are likely',
  backtestBeforeCosts: "Results are before spread and commission — there’s no spread estimate for this symbol, so real results would be worse.",
  forecastDetail: {
    rsi_overbought: 'Overbought ({rsi})',
    rsi_oversold: 'Oversold ({rsi})',
    rsi_bullish: 'Positive momentum ({rsi})',
    rsi_bearish: 'Negative momentum ({rsi})',
    rsi_neutral: 'Neutral ({rsi})',
    ma_cross_up: 'Fast MA crossed above slow',
    ma_cross_down: 'Fast MA crossed below slow',
    ma_above: 'Fast {fast} above slow {slow}',
    ma_below: 'Fast {fast} below slow {slow}',
    macd_cross_up: 'Crossed above the signal line',
    macd_cross_down: 'Crossed below the signal line',
    macd_above: 'Line {macd} above signal {signal}',
    macd_below: 'Line {macd} below signal {signal}',
    bb_upper: 'Near the upper band',
    bb_lower: 'Near the lower band',
    bb_position: '{pos}% up the band',
    stoch_k: '%K≈{k}',
    trend_slope: 'Last 10 candles · {pct}%',
  },
  forecastVoteNames: { rsi: 'RSI 14', ma_cross: 'MA cross', ma_trend: 'MA trend', macd: 'MACD', bb: 'Bollinger', stoch: 'Stochastic', trend: 'Price slope' },
  forecastDisclaimerConsensus: 'Technical-indicator consensus inside MATRIX — not a guarantee of profit.',
  forecastDisclaimerNoData: 'Not enough data to compute the selected indicators — turn on another one above; RSI and Trend need the shortest history.',
  forecastDisclaimerNoMovement: 'The price hasn’t moved in this window — the market may be closed, so the indicators have no direction to read. Try a longer timeframe, or check back when the market opens.',
  dsKindUnavailable: 'Unavailable',
  chartNotOfferedTitle: '{symbol} isn’t offered by our data provider',
  chartNotOfferedBody: 'We draw no candles or price for it, so you never read made-up numbers. Tap the symbol name ▾ above the chart to pick another pair.',
  chartNoCandlesTitle: 'No candles for {symbol} on the {tf} timeframe right now',
  chartNoCandlesBody: 'The data provider returned no candles for this timeframe. Try another timeframe, or check back in a moment.',
  chartFirstLoad: 'Loading {symbol} candles on the {tf} timeframe…',
  chartProviderDownTitle: 'Can’t get {symbol} candles from the data provider right now',
  chartProviderDownBody: 'The connection to our data provider failed — usually a temporary problem. We don’t draw estimated candles meanwhile, so you never read prices that aren’t real. Try again in a few minutes.',
  chartServerUnreachableTitle: 'Can’t load {symbol} candles — no connection to the MATRIX server',
  chartServerUnreachableBody: 'Check your internet connection, then try again. We don’t draw estimated candles meanwhile, so you never read prices that aren’t real.',
};

const enGB: Dict = {
  ...enUS,
  regErrUsernameTaken: 'That username is already registered — pick another one, or sign in if it’s yours',
  login: 'Sign in',
  register: 'Register',
  enter: 'Sign in',
  createAccount: 'Create an account',
  logout: 'Sign out',
  hello: 'Hello',
  // «E-mail» بشرطة صار قديماً ببريطانيا نفسها (الحكومة وBBC تكتبان email).
  email: 'Email',
  sponsorCode: 'Invite code (optional)',
  loginError: "Sign-in didn’t go through — the request didn’t reach the server or didn’t finish. Check your internet connection and try again",
  sessionExpired: 'Your session has ended — sessions last 30 days from signing in. Sign in again to see the alerts and journal saved to your account',
  registerError: "Registration didn’t go through — the request didn’t reach the server or didn’t finish. Check your internet connection and try again",
  language: 'Language',
  // التهجئة البريطانية لما افترق. (نصّ الجولة `onboardStep3Body` لم يعد فيه «summarize» فلا يحتاج نسخة هنا.)
  wlCatalogTitle: 'Add from catalogue',
  mcDrawColorWord: 'Colour',
  mcDrawColorA11y: 'Drawing colour: {color} — tap for the next colour',
  mcColorNames: ['Frame colour', 'Green', 'Red', 'Amber', 'Blue', 'White'],
  wlCatalogAllAdded: 'All catalogue symbols added',
  invalidNumberHint: 'Number not recognised — type it without thousands separators, e.g. 10000 or 1.0850',
  // الفعل «practise» بريطاني و«practice» أمريكي — كانت نسخة en-US بالتهجئة البريطانية.
  lectureChartPracticeNote: 'No connection to the server: these are practice candles, not market prices. Practise freely — but what you draw here isn’t saved.',
  domOtcNote: 'Forex is decentralised: there is no single market depth, and your real spread depends on your broker.',
};

const ku: Dict = {
  accountTitle: 'هەژماری MATRIX',
  accountSub: 'هاوکاتکردن · ئەکادیمی · کۆمیسیۆنی تۆڕی دووقۆڵی',
  tabHome: 'سەرەکی',
  tabTools: 'ئامرازەکان',
  tabAcademy: 'ئەکادیمی',
  tabAccount: 'هەژمار',
  login: 'چوونەژوورەوە',
  register: 'تۆمارکردن',
  name: 'ناو',
  namePlaceholder: 'ناوی بەکارهێنەر',
  email: 'ئیمەیڵ',
  emailPlaceholder: 'name@example.com',
  password: 'وشەی نهێنی',
  passwordPlaceholder: 'وشەی نهێنی',
  enter: 'چوونەژوورەوە',
  createAccount: 'دروستکردنی هەژمار',
  logout: 'دەرچوون',
  hello: 'سڵاو',
  sponsorCode: 'کۆدی بانگهێشت (ئیختیاری)',
  underSponsor: 'لایەنی تۆ لەژێر بانگهێشتکەر',
  left: 'چەپ',
  right: 'ڕاست',
  trader: 'بازرگان',
  trainer: 'ڕاهێنەر',
  broker: 'برۆکەر',
  agent: 'بریکار',
  company: 'کۆمپانیا',
  loginError: 'چوونەژوورەوە سەرکەوتوو نەبوو — داواکارییەکە نەگەیشتە ڕاژەکار یان تەواو نەبوو. پەیوەندیت بە ئینتەرنێتەوە بپشکنە و دووبارە هەوڵ بدەرەوە',
  sessionExpired: 'دانیشتنەکەت کۆتایی هات — 30 ڕۆژ لە چوونەژوورەوە دەمێنێتەوە. دووبارە بچۆ ژوورەوە بۆ بینینی ئاگادارکردنەوە و دەفتەری مامەڵەی پاشەکەوتکراو لە هەژمارەکەت',
  registerError: 'تۆمارکردن سەرکەوتوو نەبوو — داواکارییەکە نەگەیشتە ڕاژەکار یان تەواو نەبوو. پەیوەندیت بە ئینتەرنێتەوە بپشکنە و دووبارە هەوڵ بدەرەوە',
  regErrReserved: 'ئەم ناوە پارێزراوە — ناوێکی تر هەڵبژێرە',
  regErrInvisible: 'ناوەکە پیتێکی شاراوە یان پانی تێدایە (زۆرجار لەگەڵ کۆپی و پەیست دێت) — خۆت بە کیبۆرد بینووسە',
  regErrLink: 'ناو ناتوانێت بەستەر یان «@» یان «/»ـی تێدا بێت — ناوەکەت لەسەر هەموو نامەیەک دەردەکەوێت، ناوێک بێ ناونیشانی ماڵپەڕ هەڵبژێرە',
  regErrUsernameTaken: 'ئەم ناوە پێشتر تۆمار کراوە — ناوێکی تر هەڵبژێرە، یان ئەگەر هی خۆتە بچۆ ژوورەوە',
  regErrEmailTaken: 'ئەم ئیمەیڵە پێشتر تۆمار کراوە — لە «{login}»ەوە پێی بچۆ ژوورەوە لە جیاتی دروستکردنی هەژمارێکی نوێ',
  regErrInvalidEmail: 'ئیمەیڵەکە دروست نییە — دەبێت وەک name@example.com بێت',
  regErrSponsorNotFound: 'کۆدی بانگهێشت نەدۆزرایەوە — لەگەڵ ئەو کەسەی بانگهێشتی کردوویت بیپشکنە، یان خانەکە بەتاڵ بهێڵەوە',
  regErrUsernameLength: 'ناو دەبێت 3 تا 32 پیت بێت',
  regErrPasswordLength: 'وشەی نهێنی دەبێت لانیکەم 4 پیت بێت',
  regErrRoleNotOpen: 'هەژماری نوێ تەنها وەک «{trader}» تۆمار دەکرێت — ڕۆڵەکانی تر سپۆنسەرەکەت دوای تۆمارکردن لە تۆڕەکەیەوە پێت دەدات',
  regErrMissingFields: 'ناوی بەکارهێنەر و ئیمەیڵ بنووسە — هەردووکیان بۆ دروستکردنی هەژمار پێویستن',
  loginErrCredentials: 'ناو یان ئیمەیڵ یان وشەی نهێنی هەڵەیە — بیانپشکنە و دووبارە هەوڵ بدەرەوە',
  loginErrMissing: 'ئەو ناوی بەکارهێنەر یان ئیمەیڵە بنووسە کە پێی تۆمار بوویت',
  language: 'زمان',
  deleteAccount: 'سڕینەوەی هەژمار',
  deleteAccountConfirmTitle: 'هەژمار بە تەواوی بسڕدرێتەوە؟',
  deleteAccountConfirmBody:
    'ناوی بەکارهێنەر و ئیمەیڵ و وشەی نهێنی بە تەواوی دەسڕدرێنەوە و ئیتر ناتوانیت بچیتەژوورەوەی ئەم هەژمارە. ئەم کردارە ناگەڕێتەوە.',
  deleteAccountConfirmBtn: 'بە تەواوی بسڕەوە',
  deleteAccountError: 'سڕینەوەی هەژمار پشتڕاست نەکرایەوە — پەیوەندییەکەت بپشکنە، پاشان دووبارە «سڕینەوەی هەژمار» دابگرە.',
  cancel: 'پاشگەزبوونەوە',
  notifications: 'ئاگادارکردنەوەکان',
  notifStatusGranted: 'چالاکە',
  notifStatusDenied: 'ڕەتکراوەتەوە لە ڕێکخستنی ئامێر',
  notifStatusUndetermined: 'پێویستی بە مۆڵەتە',
  notifStatusUnsupported: 'پشتگیری ناکرێت لەسەر وێب',
  notifEnableBtn: 'چالاککردنی ئاگادارکردنەوەکان',
  notifOpenSettingsBtn: 'کردنەوەی ڕێکخستنی ئامێر',
  onboardStep1Title: 'گۆڕینی جووت بە یەک دەستدان',
  onboardStep1Body:
    'دەست لە هەر جووتێک بدە لە شریتی سەرەوە (EURUSD، GBPUSD، زێڕ XAUUSD…) و چارتەکە یەکسەر دەچێتە سەری، لەگەڵ گۆڕانی ئەمڕۆ ▲▼ لە تەنیشتیەوە. بە دوو پەنجە گەورەی بکە، تەوەری نرخ ڕابکێشە بۆ درێژکردن یان کورتکردنی مۆمەکان، و «خۆکار» لە گۆشەی تەوەرەکان دیمەنەکە دەگەڕێنێتەوە. دەست لە مۆمێک بدە بۆ خوێندنەوەی نرخەکانی (O H L C)، یان پەنجە ڕابگرە پاشان ڕایبکێشە بۆ تێپەڕین بە مۆمەکاندا یەک بە یەک.',
  onboardStep2Title: 'ئامرازەکانی وێنەکێشان',
  onboardStep2Body:
    'تابی «وێنەکێشان» لە شریتی خوارەوە هێڵی ترێند و فیبۆناتچی و ئامرازەکانی تر ڕاستەوخۆ لەسەر چارت دەکاتەوە، و ئەوەی لەسەر 4H دەیکێشیت دەمێنێتەوە کاتێک دادەبەزیت بۆ کاتژمێرێک. بۆ پلاندانانی مامەڵەیەک «پلانی کڕین» یان «پلانی فرۆشتن» بەکاربهێنە: لە چوونەژوورەوە بۆ وەستان ڕایبکێشە و ئامانج و pip و ڕێژەی قازانج بۆ مەترسی دەبینیت. دەست لە وێنەیەک بدە بۆ هەڵبژاردنی: ڕایبکێشە بۆ جوولاندنی یان بە دوگمەکانی ▲▼◀▶ بیجووڵێنە (یەک pip یان یەک مۆم بە هەر دەستدانێک؛ پەنجەت ڕابگرە بۆ دووبارەبوونەوە، دواتر خێراتر)، یان «کۆپی» ❐ دابگرە بۆ دانانی هەمان ئاست لە شوێنێکی تر. هەڵەت کرد؟ «گەڕاندنەوە» ↶ دوایین گۆڕانکاری هەڵدەوەشێنێتەوە، و «دووبارەکردنەوە» ↷ دەیگەڕێنێتەوە ئەگەر زیاتر لە پێویست گەڕاندتەوە.',
  onboardStep3Title: 'پێوەرەکان و لینزەکان',
  onboardStep3Body:
    'لە دەیان پێوەر هەڵبژێرە (RSI، MACD، بۆلینجەر…)، یان بە لینزێک دەست پێبکە کە بە یەک دەستدان کۆمەڵێک زیاد دەکات: «پێکهاتە» بۆ ناوەندە جووڵاوەکان، «پاڵنە» بۆ RSI و MACD، «شلەیی» بۆ قەبارە و بۆلینجەر و CVD (لە فۆرێکس قەبارە و CVD خەمڵێنراون لە مۆمەکان، نەک قەبارە یان ڕەوتی ڕاستەقینەی فەرمانەکان). بەهای ناوەندە جووڵاوەکان و سنوورەکانی بۆلینجەر لەسەر تەوەرەی نرخ بە ڕەنگی هێڵەکانیان دەردەکەوێت. بۆ فۆرێکس: «Sessions» دانیشتنەکانی تۆکیۆ و لەندەن و نیویۆرک بە کاتی دروستیان ڕەنگ دەکات هاوین و زستان، و «PDH / PDL» بەرزترین و نزمترینی دانیشتنی دوێنێ دەکێشێت.',
  onboardStep4Title: 'ئاگادارکردنەوەکان',
  onboardStep4Body:
    'خێراترین ڕێگا: دەست لە ئاستەکە بدە لەسەر چارت پاشان 🔔 — بێ نووسینی ژمارە. کاتێک نرخ گەیشتە ئەوێ ئاگاداری وەردەگریت (نزیکەی هەر خولەکێک دەپشکنرێت)، پێویست ناکات بە درێژایی ڕۆژ چاودێری چارت بکەیت. بۆ گواستنەوەی، نیشانەی 🔔ی لە لێواری چارت ڕابکێشە بۆ نرخە نوێیەکە. ئاگادارکردنەوەی پێوەرەکان و چالاککردنی ئاگادارییەکان لە پانێڵی ئاگادارکردنەوەکاندایە.',
  onboardStep5Title: 'سەرەتا مەترسی',
  onboardStep5Body:
    'پێش هەر مامەڵەیەک «ئامرازەکان ← مەترسی» بکەرەوە: هێماکە هەڵبژێرە وەک بڕۆکەرەکەت دەینووسێت (EURUSDc بۆ هەژماری سەنت)، باڵانس و ڕێژەی مەترسی و وەستانی زیان (بە pip نەک بە خاڵی MT4/MT5 — 250 خاڵ زۆرجار 25 pipە — یان بە نرخی چوونەژوورەوە و وەستان) بنووسە بۆ ئەوەی قەبارەی لۆتی گونجاو بزانیت (سپرێد و کۆمیسیۆن زیاد بکە بۆ ئەوەی ژمارەکە بیانگرێتەوە)، پاشان «ئەم پلانە لە دەفتەر تۆمار بکە» بۆ ئەوەی دواتر ئەنجامەکەی ببینیتەوە. زۆر لە بازرگانان زیاتر لە 1–2% لە هەر مامەڵەیەکدا ناخەنە مەترسییەوە.',
  onboardRiskNote:
    'MATRIX ئامرازێکی شیکردنەوە و فێربوونە، مامەڵە ناکات و ئامۆژگاری دارایی نادات. بازرگانی بە لیڤەرێج مەترسیی بەرزی لەدەستدانی پارەی تێدایە.',
  onboardStepCounterA11y: 'هەنگاوی {n} لە {total}',
  onboardSkip: 'تێپەڕاندن',
  onboardBack: 'پێشوو',
  onboardNext: 'دواتر',
  onboardStart: 'دەستپێبکە',
  dirBuy: 'کڕین',
  dirSell: 'فرۆشتن',
  dirNeutral: 'بێلایەن',
  avgLabel: 'ناوەند',
  entryLabel: 'چوونەژوورەوە',
  slLabel: 'وەستان',
  tpLabel: 'ئامانج',
  enabledWord: 'چالاک',
  disabledWord: 'ناچالاک',
  sendBtn: 'ناردن',
  refreshBtn: 'نوێکردنەوە',
  aboveWord: 'سەرەوە',
  belowWord: 'خوارەوە',
  addBtn: 'زیادکردن',
  deleteWord: 'سڕینەوە',
  priceWord: 'نرخ',
  impactHigh: 'بەرز',
  impactMedium: 'مامناوەند',
  impactLow: 'نزم',
  toolsTitle: 'ئامرازەکانی MATRIX',
  toolsSub: 'کۆمەڵگا و هەواڵ · شیکاری و ئاگادارکردنەوە — دوو بەشی گۆڕاو',
  toolsTabHub: 'شیکاری و کۆمەڵگا',
  toolsTabReports: 'ڕاپۆرتەکان',
  toolsTabJournal: 'دەفتەر',
  toolsTabScreener: 'پشکنین',
  toolsTabBacktest: 'تاقیکردنەوەی دواوە',
  toolsTabIndAlerts: 'ئاگادارکردنەوە+',
  toolsTabCalendar: 'ڕۆژژمێر',
  toolsTabLayouts: 'نەخشەسازی',
  toolsTabAi: 'AI',
  a11yTabPrefix: 'تاب',
  a11ySignalSymbolPrefix: 'هێمای شیکاری',
  toolsSymOnChart: 'لەسەر چارتەکەت',
  toolsHubCommunity: 'کۆمەڵگا و هەواڵ',
  toolsHubAnalysis: 'شیکاری و ئاگادارکردنەوە',
  a11yHubSectionPrefix: 'بەشی پانێڵ',
  toolsGridHint: 'خاڵەکان ڕاکێشە بۆ ڕیزبەندی دووبارەی پانێڵەکانی ئەم بەشە',
  toolsFiltersLabel: 'فلتەرەکان',
  filterMaUpLabel: 'MA بەرزبوونەوە',
  filterMaUpHint: 'SMA 9ی خێرا لەسەر دوایین مۆم SMA 21ی هێواشی بەرەو سەرەوە بڕی',
  filterMaDownLabel: 'MA دابەزین',
  filterMaDownHint: 'SMA 9ی خێرا لەسەر دوایین مۆم SMA 21ی هێواشی بەرەو خوارەوە بڕی',
  filterRsiOversoldLabel: 'RSI زۆر فرۆشراو',
  filterRsiOversoldHint: 'RSI 14 لە 30 یان کەمتر — لەوانەیە بگەڕێتەوە سەرەوە، بەڵام لە ترێندێکی دابەزینی بەهێزدا دەتوانێت نزم بمێنێتەوە',
  filterRsiOverboughtLabel: 'RSI زۆر کڕدراو',
  filterRsiOverboughtHint: 'RSI 14 لە 70 یان زیاتر — لەوانەیە بگەڕێتەوە خوارەوە، بەڵام لە ترێندێکی بەرزبوونەوەی بەهێزدا دەتوانێت بەرز بمێنێتەوە',
  filterMacdUpLabel: 'بڕینەوەی MACD بەرەو سەرەوە',
  filterMacdUpHint: 'هێڵی MACD لەسەر دوایین مۆم هێڵی ئاماژەی بەرەو سەرەوە بڕی — تەوژمی ئەرێنی نوێ',
  filterBullishLabel: 'تەوژم +',
  filterBullishHint: 'نرخ لە دوایین 80 مۆمدا بەرز بووەتەوە (لە داخستنی یەکەمیانەوە بۆ دوایین) و RSI لە خوار 65ە',
  filterBearishLabel: 'تەوژم -',
  filterBearishHint: 'نرخ لە دوایین 80 مۆمدا نزم بووەتەوە (لە داخستنی یەکەمیانەوە بۆ دوایین) و RSI لە سەرووی 35ە',
  a11yFilterPrefix: 'فلتەر',
  screenerRunning: 'پشکنین بەردەوامە…',
  screenerRunBtn: 'کارپێکردنی پشکنەر',
  screenerRunNeedFilter: 'سەرەتا فلتەرێک هەڵبژێرە، پاشان پشکنین کارپێبکە',
  screenerNeedApiKey: 'پشکنین پێویستی بە کلیلی چالاکی Twelve Data لەسەر ڕاژە هەیە',
  screenerNoResults: 'ئێستا هیچ هێمایەک مەرجی فلتەرەکان پڕ ناکاتەوە — فلتەرێکی تر تاقی بکەرەوە یان دواتر دووبارە بپشکنە',
  screenerFailed: 'نەکرا پشکنین کارپێبکرێت — پەیوەندییەکەت بپشکنە و دووبارە هەوڵبدەرەوە',
  screenerScanNone: 'نرخی هیچ هێمایەک نەهێنرا — لەوانەیە سنووری داواکاری دابینکەری داتا بێت؛ خولەکێک چاوەڕێ بکە و دووبارە بپشکنە',
  screenerScanPartial: 'تەنها {k} لە {total} هێما پشکنران — نەخوێنرانەوە: {list} (لەوانەیە سنووری داواکاری دابینکەر). ئەنجامەکان تەنها بۆ پشکنراوەکانن.',
  screenerPriceAsOf: 'داخستنی {time}',
  screenerNoMatchOf: '{k} هێما لە {tf} پشکنران و ئێستا هیچیان مەرجەکە پڕ ناکاتەوە — فلتەرێکی تر تاقی بکەرەوە یان دواتر دووبارە بپشکنە',
  screenerShowingOf: 'پیشاندانی بەهێزترین {n} لە {total} ئەنجام (زۆرترین جووڵە سەرەتا)',
  screenerChangeSpan: '(دوایین 80 مۆم)',
  screenerTapToOpen: 'کرتە لە هەر ئەنجامێک بکە بۆ کردنەوەی چارتەکەی لە هەمان کات',
  screenerOpenChartA11y: 'کردنەوەی چارت',
  newsTitle: 'هەواڵی کاریگەر لەسەر فۆرێکس',
  newsStale: 'نوێ نەکرایەوە — کات لە ڕۆژژمێری پاشەکەوتکراوە',
  newsEmpty: 'ئێستا هیچ سەردێڕێکی کاریگەر نییە — کاتی داتا داهاتووەکان (سوود، کار، هەڵاوسان) لە «ڕۆژژمێر» دەبینیت.',
  newsLoadError: 'نەکرا هەواڵەکان باربکرێن — پەیوەندییەکەت بپشکنە، پاشان ئەم بەشە جێبهێڵە و بگەڕێوە بۆی بۆ هەوڵدانەوە',
  newsSourceUnavailable: 'سەرچاوەی هەواڵەکان ئێستا وەڵام ناداتەوە — کێشەکە لای ئەوە نەک لە پەیوەندییەکەت. کاتە دڵنیاکانی داتا (سوود، کار، هەڵاوسان) لە «ڕۆژژمێر»دان.',
  newsStaleAsOf: 'دوایین نوێکردنەوەی سەردێڕەکان {time} — سەرچاوەکە وەڵام ناداتەوە، لەوانەیە هەواڵی نوێتر دیار نەبن',
  newsImpactFromHeadline: 'نیشانەی کاریگەری خەمڵاندنە لە وشەکانی سەردێڕ، نەک پۆلێنکردنی سەرچاوە — کاتە دڵنیاکانی داتا لە «ڕۆژژمێر»دان.',
  newsImpactEstimatedA11y: 'کاریگەریی {impact} — خەمڵاندن لە وشەکانی سەردێڕ',
  snapChangeOverBars: '{pct} لە دوایین {bars} مۆمدا',
  aiPanelTitle: 'یاریدەدەری زیرەکی دەستکرد',
  aiGreeting:
    'من یاریدەدەری خۆکاری MATRIX ـم. پرسیارم لێ بکە دەربارەی شیکاری جووتەکە، دیمەنی مامەڵە، یان بەڕێوەبردنی مەترسی. وەڵامەکانم شیکاری خۆکارن بۆ فێربوون، نەک ئامۆژگاری دارایی — پێش ئەوەی پشتی پێ ببەستیت هەر ئاستێک لەسەر چارتەکە بپشکنە.',
  aiPriceAsOf: 'نرخەکانی ئەم وەڵامە لەسەر داخستنی مۆمی {time} بە کاتی تۆن — نرخی ڕاستەوخۆ نین',
  forecastPriceAsOf: 'ئاستەکان لەسەر داخستنی مۆمی {time} بە کاتی تۆن — نرخی ڕاستەوخۆ نین',
  aiOfflineFallback:
    'نەکرا پەیوەندی بە ڕاژەوە بکرێت — لە پەیوەندییەکەت بە ئینتەرنێت دڵنیابە و دوای کەمێک دووبارە هەوڵ بدەرەوە.\n\nشیکاری خێرای ناوخۆیی: پێش هەر چوونەژوورەوەیەک بۆ جووتەکانی دۆلار، دۆلار لەسەر زیاتر لە یەک جووت (EURUSD و USDJPY) بپشکنە، و وەستانێکی ڕوون بەکاربهێنە بە مەترسی 1% بۆ هەر مامەڵەیەک (زۆرترین 2%).',
  aiInputPlaceholder: 'نموونە: شیکاری {symbol} ئەمڕۆ؟',
  aiInputA11y: 'پرسیار بۆ یاریدەدەری زیرەکی دەستکرد',
  aiSendA11y: 'ناردنی پرسیار بۆ یاریدەدەری زیرەکی دەستکرد',
  aiAskBtn: 'بپرسە',
  analystsTitle: 'پێشبینیەکانی شیکارکاران',
  analystsSubSuffix: 'هێشتا سەرچاوەی مۆڵەتدار نییە — بۆچوونی دەستکرد پیشان نادەین',
  analystsRefreshA11y: 'نوێکردنەوەی پێشبینیەکانی شیکارکاران',
  analystsLoadError: 'نەکرا پێشبینیەکانی شیکارکاران باربکرێن — پەیوەندییەکەت بپشکنە و پاشان «نوێکردنەوە» دابگرە',
  socialPlatformTelegram: 'تێلێگرام',
  socialPlatformFacebook: 'فەیسبووک',
  socialPlatformInstagram: 'ئینستاگرام',
  socialPlatformX: 'X',
  socialPlatformYoutube: 'یوتیوب',
  socialPlatformDiscord: 'دیسکۆرد',
  socialPlatformApp: 'ئەپ',
  socialComputeA11y: 'ڕێکەوتنی سەرچاوە هەڵبژێردراوەکان بژمێرە',
  socialComputeBtn: 'بژمێرە',
  socialTitle: 'ناوەندی بۆچوونی کەناڵەکان',
  socialSub: 'تێلێگرام · فەیسبووک · ئینستاگرام · X · ئەپەکان',
  socialPickHint: 'هێشتا سەرچاوەی مۆڵەتدار بۆ بۆچوونی کەناڵەکان نییە، بۆیە لیستی سەرچاوەکان بەتاڵە — بۆچوون دروست ناکەین بۆ پڕکردنەوەی',
  socialSourcesError: 'نەکرا لیستی سەرچاوەکان باربکرێت — پەیوەندییەکەت بپشکنە، پاشان ئەم بەشە جێبهێڵە و بگەڕێوە بۆی بۆ هەوڵدانەوە',
  a11ySourcePrefix: 'سەرچاوە',
  sourcesCountLabel: 'سەرچاوەکان',
  suggestedTradeLabel: 'مامەڵەی پێشنیارکراو',
  socialNoClearTrade: 'هیچ مامەڵەیەکی ڕوون نییە — بۆچوونەکان تێکەڵ یان بێلایەنن',
  socialComputeError: 'نەکرا ڕێکەوتنی کەناڵەکان بژمێردرێت — پەیوەندییەکەت بپشکنە و پاشان «بژمێرە» دابگرە',
  chatTitle: 'گفتوگۆی گروپی',
  chatLoadError: 'نەکرا نامەکان باربکرێن — پەیوەندییەکەت بپشکنە، پاشان ئەم بەشە جێبهێڵە و بگەڕێوە بۆی بۆ هەوڵدانەوە',
  chatEmpty: 'هێشتا هیچ نامەیەک نییە — یەکەم کەس بە بۆ نووسین',
  chatSendError: 'نەتوانرا دڵنیا ببینەوە کە نامەکەت گەیشت — تۆ دەیبینیت بەڵام لەوانەیە کەس نەیبینێت. پەیوەندی بپشکنە، پاشان ئەم بەشە جێبهێڵە و بگەڕێوە: ئەگەر نەمابوو دووبارە بینووسەوە',
  chatYou: 'تۆ',
  chatAnonTrader: 'بازرگان',
  chatLoginRequired: 'بۆ نووسین لە گفتوگۆی گروپ بچۆ ژوورەوە — نامەکانت بە ناوی هەژمارەکەت دەردەکەون',
  chatInputPlaceholder: 'نامەیەک بنووسە…',
  chatInputA11y: 'نامەی گفتوگۆی گروپی',
  chatSendA11y: 'ناردنی نامەی گفتوگۆی گروپی',
  voteTitle: 'دەنگدان لەسەر مامەڵەیەک',
  voteCloseFormA11y: 'داخستنی فۆرمی بیرۆکە',
  votePublishNewA11y: 'بڵاوکردنەوەی بیرۆکەیەکی نوێی مامەڵە',
  closeWord: 'داخستن',
  votePublishToggleBtn: 'بیرۆکەکەت بڵاوبکەرەوە',
  voteSymbolPlaceholder: 'هێما (نموونە EURUSD)',
  voteSymbolA11y: 'هێمای ئامرازی بیرۆکەکەت',
  voteDirA11yPrefix: 'ئاراستەی بیرۆکە',
  voteEntryPriceA11y: 'نرخی چوونەژوورەوە',
  voteSlPriceA11y: 'نرخی وەستاندنی زیان',
  voteTpPriceA11y: 'نرخی ئامانج',
  voteNotePlaceholder: 'تێبینی (ئیختیاری) — بۆچی ئەم بیرۆکەیە؟',
  voteNoteA11y: 'تێبینی بیرۆکە (ئیختیاری)',
  voteFormError: 'هێما و چوونەژوورەوە و وەستان و ئامانج بە دروستی بنووسە',
  votePublishError: 'نەکرا بیرۆکە بڵاوبکرێتەوە — پەیوەندییەکەت بپشکنە و دووبارە هەوڵبدەرەوە',
  votePublishBtn: 'بیرۆکە بڵاوبکەرەوە',
  voteLoadError: 'نەکرا دەنگەکان باربکرێن — پەیوەندییەکەت بپشکنە، پاشان ئەم بەشە جێبهێڵە و بگەڕێوە بۆی بۆ هەوڵدانەوە',
  voteEmpty:
    'هیچ دەنگدانێکی چالاک لە ئێستادا نییە — بیرۆکەکەت لە سەرەوە بڵاو بکەرەوە (هێما، ئاراستە، چوونەژوورەوە، وەستان، ئامانج) و بۆچوونی بازرگانانی تر ببینە.',
  voteByAuthor: 'لەلایەن {author}',
  voteApprovalLabel: 'ڕەزامەندی',
  voteAgreeWord: 'ڕازیم',
  voteDisagreeWord: 'ڕازی نیم',
  voteCastError: 'نەتوانرا دڵنیا ببینەوە کە دەنگەکەت ژمێردرا — ژمارەکە لەوانەیە بیگرێتەوە بەبێ ئەوەی گەیشتبێت. پەیوەندی بپشکنە، پاشان ئەم بەشە جێبهێڵە و بگەڕێوە بۆ بینینی ژمارەی ڕاستەقینە، و ئەگەر پێویست بوو دووبارە دەنگ بدە',
  voteLoginRequired: 'بۆ دەنگدان بچۆ ژوورەوە — یەک دەنگ بۆ هەر هەژمارێک',
  chatLinksNotAllowed: 'بەستەر لە گروپدا ڕێگەپێدراو نییە — پاراستن لە کەناڵی «ئامۆژگاری» فێڵبازانە',
  votePublishLoginRequired: 'بۆ بڵاوکردنەوەی بیرۆکە بچۆ ژوورەوە — بە ناوی هەژمارەکەت دەردەکەوێت',
  voteLinksNotAllowed: 'بەستەر لە بیرۆکەکاندا ڕێگەپێدراو نییە — شیکارییەکەت بە دەق بنووسە',
  modMessageOptionsA11y: 'هەڵبژاردەکانی نامە: ڕاپۆرت یان بلۆک',
  modIdeaOptionsA11y: 'هەڵبژاردەکانی بیرۆکە: ڕاپۆرت یان بلۆک',
  modReportLabel: 'ڕاپۆرت:',
  modReasonSpam: 'بێزارکەر',
  modReasonAbuse: 'سووکایەتی',
  modReasonScam: 'فێڵ',
  modBlockUser: 'بلۆککردنی {user}',
  modReported: 'سوپاس — لای تۆ شاردرایەوە و ڕاپۆرتەکە پێداچوونەوەی بۆ دەکرێت',
  modReportLoginRequired: 'بۆ ڕاپۆرتدان بچۆ ژوورەوە — یان نێرەر بلۆک بکە تا لای تۆ نەبینرێت',
  modReportError: 'ناردنی ڕاپۆرت سەرکەوتوو نەبوو — دووبارە هەوڵ بدەوە',
  modBlocked: '{user} بلۆک کرا — نامە و بیرۆکەکانی لای تۆ دەرناکەون',
  modBlockedCount: 'بلۆککراوەکان: {n} · لابردنی بلۆک',
  modUnblockA11y: 'لابردنی بلۆک لە هەموو بەکارهێنەرە بلۆککراوەکان',
  voteAgreeA11yPrefix: 'ڕازیبوون لەگەڵ بیرۆکەی',
  voteDisagreeA11yPrefix: 'ڕەتکردنەوەی بیرۆکەی',
  indicatorBollinger: 'بۆلینگەر',
  indicatorTrend: 'ترێند',
  forecastRunA11y: 'پێشبینیکردنی پێوەرەکان',
  forecastRunBtn: 'پێشبینیکردن',
  forecastTitle: 'پێشبینیەکانی پێوەرەکان',
  forecastAvgLabel: 'ناوەندی پێوەرەکان',
  forecastTradeLabel: 'ئاستە ژمێردراوەکان',
  forecastNoSignal: 'هیچ ئاراستەیەکی زاڵ لە نێوان پێوەرە هەڵبژێردراوەکاندا نییە — بۆیە ئاستی چوونەژوورەوە و وەستان و ئامانج نییە',
  forecastAgreeLabel: 'پێوەرە هاوڕاکان',
  forecastError: 'نەکرا پێشبینیەکانی پێوەرەکان بژمێردرێن — پەیوەندییەکەت بپشکنە و پاشان «پێشبینیکردن» دابگرە',
  alertsTitle: 'ئاگادارکردنەوەی نرخ',
  alertsSub: 'لە ئاستەکە یان سەرووی / یان خوارووی · نرخەکانی Twelve Data نزیکەی خولەکێک جارێک دەپشکنرێن · ئاگادارکردنەوە کاتێک مەرجەکە دێتەدی',
  alertsPushTitle: 'MATRIX · ئاگادارکردنەوەی نرخ',
  notifChannelName: 'ئاگادارکردنەوەی نرخ و پێوەر',
  notifChannelDesc: 'ئاگادارکردنەوە کاتێک نرخ دەگاتە ئەو ئاستەی خۆت دیاریت کردووە یان مەرجی پێوەرێک دێتەدی (نزیکەی هەر خولەکێک دەپشکنرێت)',
  alertsSymbolA11y: 'هێمای ئامراز بۆ ئاگادارکردنەوە',
  alertsPriceA11y: 'نرخی ئاگادارکردنەوە',
  alertsAboveConditionA11y: 'مەرجی ئاگادارکردنەوە: سەرەوەی نرخ',
  alertsBelowConditionA11y: 'مەرجی ئاگادارکردنەوە: خوارەوەی نرخ',
  alertsAddA11y: 'زیادکردنی ئاگادارکردنەوەی نرخ',
  alertsNotePlaceholder: 'تێبینی (ئیختیاری)',
  alertsNoteA11y: 'تێبینی ئاگادارکردنەوە (ئیختیاری)',
  alertsAddError: 'نەکرا ئاگادارکردنەوە زیادبکرێت — پەیوەندییەکەت بپشکنە و دووبارە هەوڵبدەرەوە',
  alertsFirstBadge: '🎉 یەکەم ئاگادارکردنەوەت دانرا — کاتێک نرخ بگاتە ئاستەکە ئاگادارت دەکەینەوە',
  alertsLoadError: 'نەکرا ئاگادارکردنەوەکان باربکرێن — پەیوەندییەکەت بپشکنە. ئاگادارکردنەوە پاشەکەوتکراوەکانت نەسڕاونەتەوە.',
  alertsEmpty:
    'هێشتا هیچ ئاگادارکردنەوەیەک نییە — نرخێک لە سەرەوە بنووسە (یان «بەکاری بهێنە» بۆ نرخی ئێستا دابگرە) و سەرەوە/خوارەوە هەڵبژێرە، کاتێک نرخ گەیشتە ئەوێ ئاگادار دەکرێیتەوە. یان لە چارتەوە: دەست لە ئاستەکە بدە پاشان 🔔.',
  alertsDeleteConfirmTitle: 'ئاگادارکردنەوەکە بسڕدرێتەوە؟',
  alertsDeleteFailedTitle: 'سڕینەوە سەرکەوتوو نەبوو',
  alertsDeleteFailedBody: 'دڵنیا نەبووینەوە لە سڕینەوە — پەیوەندییەکەت بپشکنە. ئەگەر ئاگادارکردنەوەکە هێشتا لە لیستەکەدایە، دووبارە بیسڕەوە.',
  alertsDeleteA11yPrefix: 'سڕینەوەی ئاگادارکردنەوە',
  alertsInvalidInput: 'هێمایەک و نرخێکی دروست لە سەرووی سفر بنووسە',
  alertsUnknownSymbolWarn: 'دابینکەری نرخ ئەم هێمایە ناناسێت — ڕێنووسەکەی بپشکنە، ئەگەرنا ئەم ئاگادارکردنەوەیە هەرگیز ناچالاک نابێت',
  alertsEditOldRemains: 'ئاگادارکردنەوەی نوێ پاشەکەوت کرا بەڵام کۆنەکە نەسڕایەوە — لە لیستەکە بیسڕەوە',
  alertsRearmBtn: 'دووبارە چالاککردن',
  alertsRearmA11yPrefix: 'دووبارە چالاککردنی ئاگادارکردنەوە',
  alertsRearmedMsg: 'دووبارە چالاکە: {desc} — ئەگەر نرخ هێشتا لەو ئاستە تێپەڕیوە لە پشکنینی داهاتوودا دەتەقێتەوە',
  alertsRearmFailed: 'دووبارە چالاککردن سەرنەکەوت — پەیوەندی بپشکنە و دووبارە هەوڵ بدە',
  alertsArmedPrefix: 'چالاککرا',
  alertsUpdatedPrefix: 'نوێکرایەوە',
  alertsCurrentPrefix: 'نرخی ئێستا',
  alertsUseCurrent: 'بەکاری بهێنە',
  alertsUseCurrentA11y: 'بەکارهێنانی نرخی ئێستا',
  alertsSaveEdit: 'پاشەکەوتی گۆڕانکاری',
  alertsEditingHint: 'ئاگادارکردنەوەیەکی هەبوو دەگۆڕیت',
  alertsCancelEdit: 'هەڵوەشاندنەوەی گۆڕانکاری',
  alertsFiresNowWarn: '⚠ مەرجەکە ئێستا هاتۆتە دی — ئاگادارکردنەوەکە یەکسەر دەردەچێت',
  alertsActiveCount: 'چالاک',
  alertsTapToEdit: 'بۆ گۆڕین کلیک لە ئاگادارکردنەوەیەک بکە',
  alertsClearFiredBtn: 'سڕینەوەی کارابووەکان ({n})',
  alertsClearFiredConfirm: '{n} ئاگادارکردنەوەی کارابوو بسڕدرێتەوە؟ ئەوانەی چاودێری دەکەن وەک خۆیان دەمێننەوە.',
  alertsEditA11yPrefix: 'گۆڕینی ئاگادارکردنەوە',
  alertsStatusArmed: '● چالاکە — چاوەڕێی نرخ',
  alertsStatusTriggered: 'دەرچوو ✓',
  riskCalcTitle: 'ژمێرەری قەبارەی پۆزیشن',
  riskCalcSub: 'چەند لۆت بکەیتەوە بۆ ئەوەی لێدانی وەستان ڕێژەیەکی دیاریکراو لە باڵانسەکەت بخایەنێت',
  riskCalcSymbol: 'ئامراز',
  riskCalcBadSymbol:
    'هێمای پشتگیری نەکراو — ژمێرەرەکە جووتەکانی فۆرێکس و زێڕ و زیو دەژمێرێت، وەک EURUSD یان XAUUSD یان GOLD یان EURUSD.m، و هێماکانی هەژماری سەنت وەک EURUSDc',
  riskCalcMiniSymbol:
    '«{symbol}» هێمای هەژماری mini یە، و قەبارەی لۆتی mini لە بڕۆکەرێکەوە بۆ یەکێکی تر جیاوازە (10,000 یەکە لای زۆربەیان، و لۆتێکی ئاسایی لای هەندێکیان) بۆیە مەزەندەی ناکەین. جووتە ئاساییەکە {pair} بنووسە، و پێش کۆپیکردنی لۆت قەبارەی گرێبەست لە تایبەتمەندییەکانی هێما لە پلاتفۆرمەکەت بپشکنە',
  riskCalcCentModeNote:
    '«{symbol}» هێمای هەژماری سەنتە: باڵانس بە سەنت (USC) بنووسە وەک پلاتفۆرمەکەت پیشانی دەدات — 10,000 USC = 100 USD. ئەو لۆتەی خوارەوە لە هەژماری سەنت بنووسە',
  riskCalcCentBalance: 'باڵانسی هەژمار (USC — سەنت)',
  riskCalcCentUsdEquiv: '≈ {usd} USD',
  riskCalcSmallLotsStdEquiv: '= {std} لۆت لە هەژماری ئاسایی',
  riskCalcMicroModeNote:
    '«{symbol}» هێمای هەژماری مایکرۆیە: باڵانس بە دراوی هەژمارەکەت دەمێنێتەوە، و لۆتی خوارەوە لۆتی مایکرۆیە (1,000 یەکە) — وەک خۆی لە هەژماری مایکرۆ بنووسە',
  appCrashTitle: 'هەڵەیەکی چاوەڕواننەکراو ڕوویدا',
  appCrashBody: 'ئەم شاشەیە نیشان نەدرا. زانیاری و کێشانەکانت پارێزراون — «دووبارە هەوڵبدەرەوە» دابگرە.',
  appCrashRepeatBody:
    'هێشتا کار ناکات. MATRIX بە تەواوی دابخە (لە لیستی ئەپە کراوەکان لایبەرە) و دووبارە بیکەرەوە — کێشانەکانت پارێزراون.',
  appCrashRetry: 'دووبارە هەوڵبدەرەوە',
  appCrashDetailLabel: 'وردەکاری تەکنیکی (ئەگەر کێشەکەت ڕاگەیاند وێنەی بگرە):',
  planSlWrongBuy: 'بۆ کڕین، وەستان دەبێت لە خوار نرخی چوونەژوورەوە بێت',
  planSlWrongSell: 'بۆ فرۆشتن، وەستان دەبێت لە سەرووی نرخی چوونەژوورەوە بێت',
  planTpWrongBuy: 'بۆ کڕین، ئامانج دەبێت لە سەرووی نرخی چوونەژوورەوە بێت',
  planTpWrongSell: 'بۆ فرۆشتن، ئامانج دەبێت لە خوار نرخی چوونەژوورەوە بێت',
  planSlTooClose: 'وەستان بە کردەوە لەسەر چوونەژوورەوەیە (کەمتر لە 1 pip، یان لە 0.002%ی نرخ بۆ هێماکانی بێ pip وەک بیتکۆین و ئیندێکسەکان) — لە سپرێد تەسکترە؛ ژمارەکە بپشکنە',
  planRiskWord: 'مەترسی',
  planNoteCommission: 'کۆمیسیۆن',
  planNoteNetRR: 'R:R دوای تێچووەکان',
  planRewardWord: 'قازانجی ئەگەری',
  planLowRR: '⚠ قازانجی ئەگەری لە مەترسی کەمترە',
  riskCalcAccountCcy: 'دراوی هەژمار',
  riskCalcBalance: 'باڵانسی هەژمار',
  riskCalcRiskPct: 'مەترسی (% یان بڕی پارە)',
  riskCalcRiskMoneyHint: 'بۆ نووسینی مەترسی بە بڕی پارە لە جیاتی ڕێژە، {ccy} دابگرە',
  riskCalcRiskOverBalance:
    'مەترسی ({risk}) لە باڵانسی هەژمار ({balance}) زیاترە — یەک لێدانی وەستان هەموو هەژمارەکە دەسڕێتەوە. هەردوو خانەکە بپشکنە: لەوانەیە بڕی پارەت لە جیاتی ڕێژە نووسیبێت، یان سفرێک لە باڵانسەکە کەم بێت.',
  riskCalcHighRisk: '⚠ زیاتر لە 2% بۆ هەر مامەڵەیەک مەترسی زۆرە',
  riskCalcSlPips: 'وەستانی زیان (pip)',
  riskCalcFromPrice: 'یان لە نرخەوە: چوونەژوورەوە و وەستان وەک لە چارتەکەدا دەیانبینیت',
  riskCalcSlMismatch:
    '⚠ pip ە نووسراوەکان ({pips}) لەگەڵ نرخی چوونەژوورەوە و وەستان ({derived} pip) ناگونجێن — قەبارەی لۆت و مەترسی لە خانەی pip ەوە دەردەچن، R:R لە نرخەکانەوە',
  riskCalcEntry: 'نرخی چوونەژوورەوە',
  riskCalcStop: 'نرخی وەستان',
  riskCalcStopChip: '{side}: وەستان {price}',
  riskCalcConvFailed: 'نرخی گۆڕینەوە وەرنەگیرا — لە خانەی خوارەوە بینووسە وەک لە پلاتفۆرمەکەتدا دەیبینیت بۆ ئەوەی قەبارەی لۆت دەربکەوێت. جووت:',
  riskCalcConvManual: 'نرخی ئەمە بنووسە',
  riskCalcConvStale: 'نرخی گۆڕینەوەی {pair} {min} خولەکە نوێ نەبووەتەوە — لۆتەکە لەسەر دوایین نرخی وەرگیراو ژمێردراوە. پێش چوونەژوورەوە لەگەڵ پلاتفۆرمەکەتدا بەراوردی بکە.',
  riskCalcConvMarketClosed: 'بازاڕ داخراوە — نرخی گۆڕینەوەی {pair} دوایین نرخی پێش داخستنە، و لەوانەیە بازاڕ بە نرخێکی جیاواز بکرێتەوە. دوای کردنەوە دووبارە بیژمێرە.',
  riskCalcLots: 'قەبارەی مامەڵە (لۆت)',
  riskCalcRiskAmount: 'مەترسی ڕاستەقینە',
  riskCalcUnits: 'یەکەکان',
  riskCalcBelowMin: 'هیچ قەبارەیەک لەگەڵ ئەم مەترسییە ناگونجێت: بچووکترین لۆت (0.01) زیاتر لەوەی دیاریت کردووە دەخاتە مەترسییەوە',
  riskCalcFillHint: 'باڵانس، ڕێژەی مەترسی و وەستانی زیان بنووسە',
  invalidNumberHint: 'ژمارەکە ناناسرێتەوە — بەبێ جیاکەرەوەی هەزاران بنووسە، وەک 10000 یان 1.0850',
  priceAmbiguousThousandsHint: 'نرخی «{value}» ڕوون نییە — جیاکەرەوەکە بۆ هەزارانە یان بۆ دەیی؟ {whole} یان {small} بنووسە',
  riskCalcSlPipsAmbiguous: 'وەستانی «{value}» pip ڕوون نییە — جیاکەرەوەکە بۆ هەزارانە یان بۆ دەیی؟ {whole} یان {small} بنووسە',
  riskCalcSlPointsHint: 'وەستانی «{value}» بە خاڵە (points) — لە MT4/MT5 هەر خاڵێک زۆرجار دەیەکی pipە، بۆیە {pips} pip بنووسە',
  riskCalcOtherCcyHint: '{field} «{value}» بە دراوی هەژمار نییە ({ccy}) — بڕەکە بە {ccy} بنووسە، یان دراوی هەژمار بگۆڕە',
  arabicThousandsSignHint: '«٬» جیاکەرەوەی هەزارانە نەک فاریزەی دەیی — بۆ کەرت «٫» یان خاڵ بنووسە، وەک 0٫5',
  riskCalcBadFieldValue: '{field} «{value}»',
  riskCalcSlLooksLikePrice: '⚠ «{value}» زۆرجار نرخە نەک دووری — لە خانەی «نرخی وەستان» بینووسە، یان دووری نێوان نرخی چوونەژوورەوە و نرخی وەستان بە pip بنووسە',
  riskCalcStopPxLooksLikePips: '⚠ «{value}» لە خانەی نرخی وەستان زۆرجار ژمارەی pipە نەک نرخ — دەست بنێ بۆ گواستنەوەی بۆ خانەی وەستان بە pip',
  levelLooksLikePipsHint: '⚠ {field} «{value}» زۆرجار ژمارەی pipە نەک نرخ: {pips} pip واتە {price}. دەست بنێ بۆ نووسینی {price}',
  levelLooksLikePipsSaveBlocked: 'مامەڵەکە پاشەکەوت نەکرا: {field} «{value}» وەک ژمارەی pip دەردەکەوێت نەک نرخ — ڕاستکردنەوەکە لە دێڕی سەرەوەیە. بۆ هێشتنەوەی {value} وەک نرخ، جارێکی تر «{button}» دابگرە.',
  // بحاجة مراجعة ناطق كردي (الاثنان أدناه)
  levelLooksLikePointsHint: '⚠ {field} «{value}» زۆرجار ژمارەی خاڵە نەک نرخ: {pips} خاڵ واتە {price}. دەست بنێ بۆ نووسینی {price}',
  levelLooksLikePointsSaveBlocked: 'مامەڵەکە پاشەکەوت نەکرا: {field} «{value}» وەک ژمارەی خاڵ دەردەکەوێت نەک نرخ — ڕاستکردنەوەکە لە دێڕی سەرەوەیە. بۆ هێشتنەوەی {value} وەک نرخ، جارێکی تر «{button}» دابگرە.',
  // بحاجة مراجعة ناطق كردي
  journalEntryDecimalSlip: '⚠ نرخی چوونەژوورەوە «{value}» وەک ئەوە دەردەکەوێت کە خاڵی دەیی تێدا نییە — مەبەستت {price}ە؟',
  // بحاجة مراجعة ناطق كردي
  journalLevelDecimalSlip: '⚠ {field} «{value}» وەک ئەوە دەردەکەوێت کە خاڵی دەیی تێدا نییە — مەبەستت {price}ە؟',
  riskCalcPipValue: 'بەهای pip بۆ هەر لۆتێک',
  riskCalcPipValueAtStop: 'بەهای pip بۆ هەر لۆتێک لە وەستانەکەت {price}',
  riskCalcPipValueAtStopHint: 'پلاتفۆرمەکەت بە نرخی ئێستا پیشانی دەدات بۆیە لەوانەیە کەمێک جیاواز بێت — بەڵام ئەگەر وەستانەکە لێدرا زیانەکە بە نرخی وەستان دەگۆڕدرێت بۆ دراوی هەژمارەکەت، بۆیە ئەومان بەکارهێنا',
  riskCalcPipValueAtPipsExit: 'بەهای pip بۆ هەر لۆتێک لە {price} ({pips} pip لە خوار نرخەکە)',
  riskCalcPipValueAtPipsExitHint:
    'نرخی وەستانت نەنووسیوە بۆیە نازانین دەکڕیت یان دەفرۆشیت — بە دەرچوون لە خوار نرخەکە ژماردمان چونکە بە دراوی هەژمارەکەت گرانترە، بەم شێوەیە زیانەکەت لە هەردوو ئاراستەدا لە ئەو مەترسییەی هەڵتبژاردووە تێناپەڕێت. پلاتفۆرمەکەت بە نرخی ئێستا پیشانی دەدات بۆیە لەوانەیە کەمێک جیاواز بێت',
  riskCalcLeverage: 'لێڤەرێج (100 واتە 1:100)',
  riskCalcLeverageOutOfRange: 'لێڤەرێجی «{value}» لە دەرەوەی ئەوەیە کە حاسیبەکە حیسابی دەکات (لە 1:1 تا 1:{max}) — لێڤەرێجی هەژمارەکەت وەک لە پلاتفۆرمەکەتدا دەردەکەوێت بنووسە، وەک 500.',
  riskCalcLeverageAmbiguous: 'لێڤەرێجی «{value}» ڕوون نییە — مەبەستت 1:{big}ە؟ {big} بەبێ خاڵ بنووسە، یان 1 ئەگەر هەژمارەکەت بێ لێڤەرێجە.',
  riskCalcMargin: 'مارجینی گیراو',
  riskCalcMarginNote:
    'مارجین ئەو بڕەیە کە بڕۆکەر تا مامەڵەکە کراوە بێت دەیگرێت، نەک ئەوەی لەوانەیە لەدەستی بدەیت — زیانەکەت وەستانەکە دیاری دەکات. لێڤەرێجی بەردەست بەپێی بڕۆکەر و ئامراز جیاوازە.',
  riskCalcTarget: 'ئامانج (ئیختیاری) — بۆ R:R و قازانجی چاوەڕوانکراو',
  riskCalcTargetPlaceholder: 'نرخی ئامانج',
  riskCalcPotentialProfit: 'قازانجی چاوەڕوانکراو',
  riskCalcLogToJournal: 'ئەم پلانە لە دەفتەر تۆمار بکە',
  riskCalcSideLabel: 'ئاراستەی مامەڵە',
  riskCalcSideFromStop: 'لە شوێنی وەستان دەرهێنراوە',
  riskCalcLoggedToJournal: '✓ وەک مامەڵەیەکی کراوە تۆمارکرا — لە «دەفتەر» بیخە کاتی دەرچوون',
  riskCalcLogFailed: 'تۆمارکردن لە دەفتەر سەرکەوتوو نەبوو — پەیوەندییەکەت بپشکنە و دووبارە هەوڵبدەوە',
  riskCalcMarginMaxLots: 'گەورەترین قەبارە کە باڵانسەکەت مارجینەکەی دەگرێتە ئەستۆ: {lots} lot — سنووری سەرەوەیە و هیچ مارجینی ئازاد بۆ هیچ جووڵەیەک ناهێڵێتەوە',
  riskCalcLogBlockedMismatch:
    'پلانێک بە دوو وەستانی جیاواز تۆمار ناکرێت — {derived} لە خانەی pip بنووسە، یان نرخی وەستان بگۆڕە تا لەگەڵ ئەوەی نووسیوتە بگونجێت',
  riskCalcSlMismatchNarrower: '⚠ وەستانەکەت ({pips} pip) تەسکترە لە دووری نێوان دوو نرخەکە ({derived} pip) — لۆتی حیسابکراو گەورەترە لەوەی مەترسییەکەت هەڵیدەگرێت ئەگەر وەستان لە نرخی خۆی بمێنێتەوە',
  riskCalcSpread: 'سپرێد (pip، ئیختیاری)',
  riskCalcSpreadPipsHint: 'بە pip بینووسە نەک points: MT4/MT5 زۆرجار سپرێد بە points پیشان دەدەن، و هەر 10 points = 1 pip — کەواتە 12 لە پلاتفۆرمەکەت لێرە دەبێتە 1.2.',
  riskCalcSpreadNote: 'سپرێد زۆرجار دەچێتە سەر دووری وەستان: وەستانی 20 pip بە سپرێدی 1.5 نزیکەی 21.5 لەدەست دەدات کاتێک لێی دەدرێت. سپرێدی ئێستا لە پلاتفۆرمەکەت ببینە — لە کاتی هەواڵ و کرانەوەی هەفتەدا فراوانتر دەبێت.',
  riskCalcRiskWithSpread: 'مەترسی لەگەڵ سپرێد',
  riskCalcSpreadLotsWithin: 'بۆ ئەوەی مەترسییەکەت لەگەڵ سپرێد لە {pct}% بمێنێتەوە: {lots} lot',
  riskCalcSpreadTooWide: '«{n}» لە سپرێد بە pip ناچێت — نرخ یان points ت نووسیوە لە جیاتی pip؟ جیاوازی نێوان Ask و Bid بە pip بنووسە، وەک ئێستا لە پلاتفۆرمەکەت دیارە (بۆ نموونە {example}).',
  riskCalcSpreadPointsHint: 'سپرێدی «{value}» بە خاڵە (points) — هەر 10 points = 1 pip، بۆیە لێرە {pips} بنووسە',
  riskCalcSpreadMaybePrice: 'ئایا «{n}» نرخی {symbol}ـە نەک سپرێدەکەی؟ نرخی ئەم جووتە نزیکە لەم ژمارەیە. ئەگەر بەڕاستی سپرێدە بە pip، ژماردنەکە وەک خۆی ڕاستە.',
  riskCalcStopInsideSpread:
    'وەستان ({sl} pip) لە سپرێد ({spread} pip) دوورتر نییە — لەوانەیە هەر کە مامەڵەکە کرایەوە لێی بدرێت. وەستان فراوانتر بکە و لۆت کەم بکەرەوە، یان چاوەڕێی سپرێدی تەسکتر بکە.',
  riskCalcStopInsideTypicalSpread:
    'وەستان ({sl} pip) لە سپرێدی ئاسایی {symbol} (~{spread} pip) دوورتر نییە — لەوانەیە هەر کە مامەڵەکە کرایەوە لێی بدرێت. سپرێدی بڕۆکەرەکەت لە خانەکەیدا بنووسە، یان وەستان فراوانتر بکە و لۆت کەم بکەرەوە.',
  riskCalcCommission: 'کۆمیسیۆنی ئیختیاری بۆ هەر lot، کردنەوە و داخستن',
  riskCalcCommissionNote: 'هەژمارەکانی Raw/ECN لە کاتی کردنەوە و داخستندا کۆمیسیۆن وەردەگرن. کۆی هەردوو لا بۆ یەک lot بە دراوی هەژمارەکەت بنووسە (وەک 7 لە هەژماری دۆلار؛ لە هەژماری یەن نزیکەی 1000)، یان بەتاڵی بهێڵەوە ئەگەر هەژمارەکەت بێ کۆمیسیۆنە.',
  riskCalcCommissionNoteMicro:
    'کۆمیسیۆن لێرە بۆ هەر لۆتێکی مایکرۆیە (0.01 لۆتی ئاسایی): {std} بۆ لۆتی ئاسایی = {micro} بۆ لۆتی مایکرۆ. ئەگەر بۆ هەژماری ئاسایی نووسیبێتت گۆڕیمان — لەگەڵ مەرجەکانی هەژمارەکەت بەراوردی بکە.',
  riskCalcCommissionNoteCent:
    'کۆمیسیۆن لێرە بە سەنتە (USC) بۆ هەر لۆتێکی سەنت — زۆرجار سفرە لە هەژماری سەنت. {usc} USC بۆ لۆتی سەنت یەکسانە بە {usc} USD بۆ لۆتی ئاسایی، بۆیە ژمارەکە ناگۆڕێت.',
  riskCalcRiskWithCosts: 'مەترسی لەگەڵ تێچووەکان',
  riskCalcCostsLotsWithin: 'بۆ ئەوەی مەترسییەکەت لەگەڵ تێچووەکان لە {pct}% بمێنێتەوە: {lots} lot',
  riskCalcNetAfterCosts: 'دوای تێچووەکان: {profit} · R:R {rr}',
  riskCalcNetNegative: 'تێچووەکان هەموو ئامانجەکە دەخۆن: پوختە {profit} — ئامانجەکە دوورتر بخە یان هەژمارێکی کەمتێچووتر هەڵبژێرە',
  riskCalcLowNetRR: '⚠ دوای تێچووەکان، قازانج لە مەترسی کەمتر دەبێت',
  riskCalcOverOrderMax: '⚠ {lots} lot لە گەورەترین فەرمانێک زیاترە کە زۆربەی بڕۆکەرەکان وەریدەگرن (50–100 lot) — بیکە بە چەند فەرمانێک یان وەستانەکە بپشکنە',
  riskCalcOverOrderMaxSmall: '⚠ {lots} lot لە گەورەترین فەرمانێک زیاترە کە زۆربەی بڕۆکەرەکان لە هەژماری cent یان micro وەریدەگرن (زۆرجار 200 lot) — بیکە بە چەند فەرمانێک یان وەستانەکە بپشکنە',
  riskCalcCostsBelowMin: 'لەگەڵ تێچووەکان، تەنانەت بچووکترین لۆت (0.01) لە {pct}% زیاتر دەخاتە مەترسییەوە — ڕێژەکە بەرز بکەرەوە یان وەستانەکە نزیک بکەرەوە',
  riskCalcUseLivePrice: '↓ چوونەژوورەوە = نرخی ئێستا',
  riskCalcUseLivePriceA11y: 'پڕکردنەوەی خانەی چوونەژوورەوە بە نرخی بازاڕی ئێستا (Ask بۆ کڕین و Bid بۆ فرۆشتن بەپێی شوێنی وەستان)',
  riskCalcLiveFilled: '✓ چوونەژوورەوە لە نرخی ئێستاوە:',
  riskCalcLiveSideMoved: '✓ چوونەژوورەوە گوازرایەوە بۆ {quote} (نرخی {side}): {price}',
  riskCalcNoLiveQuote: 'ئێستا نرخی نوێ بۆ ئەم هێمایە نییە (لە 3 خولەکی ڕابردوودا هیچ نرخێک نەگەیشتووە) — نرخی چوونەژوورەوە بە دەست بنووسە',
  riskCalcDisclaimer: 'خەمڵاندنی فێرکاری: تایبەتمەندی گرێبەستەکان (بەتایبەتی زێڕ) لای بڕۆکەرەکەت جیاواز دەبێت — پێش مامەڵە پشتڕاستی بکەرەوە.',
  toolsTabRisk: 'مەترسی',
  calTimesLocal: 'کاتەکان بە کاتی خۆت',
  calUpcomingHead: '24 کاتژمێری داهاتوو',
  calNow: 'ئێستا',
  calPast: 'تەواو بوو',
  calInPrefix: 'دوای',
  calHourShort: ' ک',
  calMinShort: ' خ',
  calDayShort: ' ڕۆژ',
  newsRiskHigh: 'هەواڵی بەهێز',
  newsRiskHint: 'جووڵەی توند و خلیسکان چاوەڕوانکراوە — وەستان و قەبارەی مامەڵە بپشکنە',
  newsRiskOpenHint: 'کار دەکاتە سەر مامەڵە کراوەکانت لە {symbols}: جووڵەی توند، و لەوانەیە وەستان بە نرخێکی خراپتر لە نووسراوەکە جێبەجێ بێت',
  listSep: '، ',
  newsUnavailable: 'نەکرا ڕۆژژمێری هەواڵ نوێ بکرێتەوە — نازانین هەواڵێکی بەهێز نزیکە یان نا؛ پێش چوونەژوورەوە بپشکنە',
  // بحاجة مراجعة ناطق
  newsTimeTbd: 'ئەمڕۆ، کاتەکەی ڕانەگەیەندراوە',
  // بحاجة مراجعة ناطق
  newsTimeTbdTomorrow: 'سبەینێ، کاتەکەی ڕانەگەیەندراوە',
  calToday: 'ئەمڕۆ',
  calTomorrow: 'سبەینێ',
  // بحاجة مراجعة ناطق
  calTimeTbd: 'کاتەکەی ڕانەگەیەندراوە',
  calStaleAsOf: 'دوایین نوێکردنەوەی ڕۆژژمێر {time} — نەتوانرا وەشانێکی نوێتر بهێنرێت. کاتەکان دروستن، بەڵام لەوانەیە ژمارە ڕاستەقینەکانی دوای ئەوە دەرچوون دیار نەبن',
  calSampleBanner: '⚠ نموونەی ڕوونکردنەوەن، ڕووداوەکانی ئەم هەفتەیە نین — کات و ژمارەکانیان بۆ بازرگانی نین. ڕۆژژمێری ڕاستەوخۆ ئێستا بەردەست نییە',
  calForecast: 'پێشبینی',
  calPrevious: 'پێشوو',
  calActual: 'ڕاستەقینە',
  reportsTitle: 'ڕاپۆرتەکانی MATRIX',
  reportsSubGrid: 'هەمان قەبارەی چوارچێوە · پێشوو/دواتر · دەستلێدان بۆ خوێندنەوە',
  reportsSub: 'هەفتانە · کارایی · بۆچوونی پلاتفۆرم و ئامۆژگاری',
  reportWeeklyTitle: 'ڕاپۆرتی هەفتانە',
  reportWeeklyHint: 'قازانج و زیان',
  reportPerformanceTitle: 'ڕاپۆرتی کارایی',
  reportPerformanceHint: 'ئینزیباتی و جێبەجێکردن',
  reportAdviceTitle: 'تێبینی بۆ هەفتەی داهاتوو',
  reportAdviceHint: 'پێنج خاڵی کرداری',
  reportRiskTitle: 'کورتەی مەترسی',
  reportRiskHint: 'بەڕێوەبردنی سەرمایە',
  reportOpenWord: 'کراوەیە ↓',
  reportAiFallbackNote:
    'نەکرا پەیوەندی بە زیرەکی دەستکردەوە بکرێت — ئەمە داڵدەیەکی گشتییە نەک شیکارییەکی تایبەت',
  reportJournalDataLine:
    'زانیاری ڕاستەقینەی دەفتەری مامەڵە (هەموو مامەڵە داخراوەکان، نەک تەنها ئەم هەفتەیە): مامەڵە={trades}، ڕێژەی سەرکەوتن={winRate}%، کۆی جووڵەی نرخ={pnl}%، باشترین مامەڵە={best}%، خراپترین مامەڵە={worst}%. ڕێژەکان جووڵەی نرخن لە چوونەژوورەوە تا دەرچوون بێ قەبارەی مامەڵە — قازانج یان زیانی هەژمار نین، بەو ناوە ناویان مەبە. پشت بەمە ببەستە لە ڕاپۆرتەکە.',
  reportJournalEmptyLine: '(هێشتا هیچ مامەڵەیەکی داخراو لە دەفتەرەکەدا نییە — ژمارەی ئەدا نییە بۆ پیشاندان).',
  reportJournalUnavailableLine: '(ئێستا دەفتەری مامەڵە نەخوێندرایەوە — ئەم ڕاپۆرتە ژمارەکانی تۆی تێدا نییە).',
  reportFallbackWeekly:
    'ڕاپۆرت لە دەفتەری مامەڵە{journalLine}\nمامەڵەکانت لە تابی «دەفتەر» تۆماربکە بۆ ڕاپۆرتێکی وردتر.',
  reportFallbackPerformance: 'هەڵسەنگاندن لەسەر بنەمای دەفتەرەکە{journalLine}',
  reportFallbackRisk:
    'کورتەی مەترسی{journalLine}\n1) مەترسی 1% بۆ هەر مامەڵەیەک، زۆرترین 2%.\n2) وەستانێکی ڕوون بەکاربهێنە.\n3) دوور بە لە هەواڵی قورس.',
  reportFallbackAdvice:
    'تێبینی بۆ هەفتەی داهاتوو{journalLine}\n1) مامەڵە کراوەکانت و وەستانی هەر یەکێکیان پێداچوونەوە بکە.\n2) پێش شیکاری جووتەکانی دۆلار و زێڕ، هێزی دۆلار لەسەر زیاتر لە یەک جووت (EURUSD و USDJPY) بپشکنە.\n3) مەترسی 1% بۆ هەر مامەڵەیەک، زۆرترین 2%.\n4) ڕۆژژمێرەکە بکەرەوە و ڕاست پێش هەواڵی کاریگەری بەرز مەچۆ ناو مامەڵە.\n5) سەرنج بدە بە 2–3 جووت کە جووڵەیان دەناسیت.',
  journalTitle: 'دەفتەری مامەڵە · PnL لە مامەڵەکانت',
  journalSub: 'مامەڵەکانت تۆماربکە — ڕاپۆرتەکان لە ڕۆژنووسەکەت دروستدەبن',
  journalStatClosed: 'مامەڵە داخراوەکان: {n}',
  journalStatWinRate: 'ڕێژەی سەرکەوتن: {pct}%',
  journalStatPriceMoveSum: 'کۆی جووڵەی نرخ (بێ قەبارەی مامەڵە): {pct}%',
  journalCentMoneyNote: 'هەژماری سەنت: بڕەکان بە سەنتی ئەمریکین (USC)، وەک لە هەژمارەکەتدا دەردەکەون — هەر 100 USC = 1 USD',
  journalMiniNoMoney:
    'هەژماری mini: دەفتەرەکە pip و نرخەکان تۆمار دەکات بەبێ بڕی پارە — قەبارەی لۆتی mini لە بڕۆکەرێکەوە بۆ یەکێکی تر جیاوازە (لای زۆربەیان 10,000 یەکە)، بۆیە پارەیەک ناخەمڵێنین کە لەوانەیە هەڵە بێت. قازانج لە پلاتفۆرمەکەت ببینە',
  journalMoneyUsc: '{usc} USC (≈ {usd} USD)',
  journalStatBestWorst: 'باشترین/خراپترین: {best}% / {worst}%',
  journalStatsPending:
    'هێشتا هیچ مامەڵەیەکی داخراو نییە — ڕێژەی سەرکەوتن و پوختەی pip دوای داخستنی یەکەم مامەڵە دەردەکەون، و ئەنجام بە پارە کاتێک قەبارەی لۆت بنووسیت.',
  journalStatNetPips: 'کۆی گشتی: {pips} pip',
  journalStatNetPipsBySymbol: 'کۆی گشتی بۆ هەر ئامرازێک: {parts}',
  journalStatAvgR: 'ناوەندی ئەنجام: {r} بۆ هەر مامەڵەیەک ({n} بە وەستان)',
  journalSideA11yPrefix: 'ئاراستەی مامەڵە',
  journalSymbolPlaceholder: 'هێما',
  journalSymbolA11y: 'هێمای مامەڵە',
  journalEntryPlaceholder: 'چوونەژوورەوە',
  journalUseLivePrice: '↓ نرخی ئێستا',
  journalUseLivePriceA11y: 'پڕکردنەوەی نرخی چوونەژوورەوە بە نرخی ئێستا (Ask بۆ کڕین، Bid بۆ فرۆشتن)',
  journalNoLiveQuote: 'ئێستا نرخی نوێ بۆ ئەم هێمایە نییە (لە 3 خولەکی ڕابردوودا هیچ نرخێک نەگەیشتووە) — نرخی چوونەژوورەوە بە دەست بنووسە',
  journalEntryA11y: 'نرخی چوونەژوورەوە',
  journalExitPlaceholder: 'دەرچوون (ئیختیاری)',
  journalSizePlaceholder: 'قەبارە بە لۆت (ئیختیاری)',
  journalSizeA11y: 'قەبارەی مامەڵە بە لۆت (ئیختیاری)',
  journalSizeUnitsFix: '⚠ {n} وەک ژمارەی یەکە دەردەکەوێت نەک لۆت — دەست بنێ بۆ گۆڕینی بۆ {lots} lot',
  journalSizeUnitsNoFix: '⚠ {n} lot قەبارەیەکی نائاساییە — وادیارە ژمارەی یەکەکانە لە پلاتفۆرمەکەتەوە کۆپی کراوە؛ قەبارە بە لۆت بنووسە (وەک 0.10)',
  journalSizeDottedFix: '⚠ {n}: مەبەستت {units} یەکەیە یان {whole} lot؟ دەست بنێ بۆ گۆڕینی بۆ {lots} lot، یان {whole} بنووسە ئەگەر لۆتە',
  journalSizeFromSmallFix: '⚠ «{n}» بۆ {prev} نووسرا — لەسەر {symbol} واتە {n} لۆتی ئاسایی، سەد هێندە. دەست بنێ بۆ گۆڕینی بۆ {std} lot',
  journalExitA11y: 'نرخی دەرچوون (ئیختیاری)',
  journalExitAtSlA11y: 'دەرچوون لەسەر وەستانی زیان {price}',
  journalExitAtBeA11y: 'دەرچوون لەسەر نرخی چوونەژوورەوە (بێ قازانج و زیان) {price}',
  journalExitAtProfitStopA11y: 'دەرچوون لەسەر وەستانی گوازراوە بۆ ناو قازانج {price}',
  journalExitAtTpA11y: 'دەرچوون لەسەر ئامانج {price}',
  journalSlAtPipsA11y: 'وەستانی زیان {pips} pip دوور لە چوونەژوورەوە: {price}',
  journalNotePlaceholder: 'تێبینی',
  journalSlPlaceholder: 'وەستانی زیان (ئیختیاری)',
  journalTpPlaceholder: 'ئامانج (ئیختیاری)',
  journalInvalidEntry: 'هێمایەکی دروست (وەک EURUSD یان XAUUSD) و نرخی چوونەژوورەوە بنووسە',
  journalResultR: 'ئەنجام {r}',
  journalNoteA11y: 'تێبینی مامەڵە (ئیختیاری)',
  noteCharsLeft: 'پیتی ماوە: {n} لە {max}',
  noteCharsLeftReserved: 'پیتی ماوە: {n} لە {max} — {reserved} پیت بۆ نیشانەی «1.00 lot» یان «1R @ …» پارێزراون کە لەگەڵ تێبینییەکەت پاشەکەوت دەکرێت',
  journalInitialStopNote:
    '«1R @ {stop}» لە تێبینییەکەدا وەستانی سەرەتاییت لە کاتی چوونەژوورەوە دەپارێزێت: ئەنجامی R و ڕێژەی R:R ی پلاندانراو لەوەوە دەپێورێن، هەرچەندە دواتر وەستانەکە بجوڵێنیت. بیسڕەوە بۆ ئەوەی لە وەستانی ئێستاوە بپێورێت',
  journalStopTypoFix: 'هەڵەی نووسینی وەستان ڕاست دەکەمەوە — نایجوڵێنم',
  journalCappedNote:
    'تەنها نوێترین {n} مامەڵە لێرە دەردەکەون، و ئامارەکان تەنها لەوانە دەژمێردرێن. مامەڵە کۆنەکانت هێشتا لەسەر سێرڤەر پارێزراون بەڵام نە دەردەکەون و نە دەژمێردرێن — تەنانەت ئەوانەی هێشتا کراوەن',
  journalAddA11y: 'زیادکردنی مامەڵەیەکی نوێ',
  journalAddBtn: 'زیادکردنی مامەڵە',
  journalAddError: 'نەکرا مامەڵە زیادبکرێت — پەیوەندییەکەت بپشکنە و دووبارە هەوڵبدەرەوە',
  journalCloseFailedTitle: 'داخستن سەرکەوتوو نەبوو',
  journalCloseFailedBody: 'داخستنەکە پشتڕاست نەکرایەوە — پەیوەندییەکەت بپشکنە. ئەگەر مامەڵەکە هێشتا کراوە دیار بوو، دووبارە دایبخە.',
  journalEmpty:
    'هێشتا هیچ مامەڵەیەک تۆمار نەکراوە — هەموو مامەڵەیەک تۆمار بکە (تەنانەت لەسەر هەژماری تاقیکردنەوە) بۆ ئەوەی بە تێپەڕبوونی کات بزانیت چی بۆت سەرکەوتووە و چی نا. لە فۆرمەکەی سەرەوە بینووسە («↓ نرخی ئێستا» چوونەژوورەوە لە کاتی کردنەوەدا پڕ دەکاتەوە)، یان لە «مەترسی» حیسابی بکە و «ئەم پلانە لە دەفتەر تۆمار بکە» دابگرە.',
  journalOpenSuffix: '(کراوەیە)',
  journalOpenRiskNoStop: 'مامەڵە کراوەکانی بێ وەستان: {n} — زیانیان سنووری نییە، بۆیە مەترسیی کراوەکان کۆ ناکرێتەوە',
  journalOpenRiskUnknown: 'مامەڵە کراوەکانی قەبارە یان گرێبەستی نەناسراو: {n} — مەترسییەکەیان بە پارە ناژمێردرێت، بۆیە مەترسیی کراوەکان کۆ ناکرێتەوە',
  journalOpenRiskPartial: 'هەندێک لە مامەڵە کراوەکانت هێشتا بار نەکراون، بۆیە مەترسیی کراوەکان کۆ ناکرێتەوە — «بارکردنی کۆنترەکان» دابگرە بۆ بینینی',
  journalExposureStacked: 'مامەڵە کراوەکانی هەمان ئاراستە لەسەر {ccy}: {n} — یەک هەواڵ هەموویان پێکەوە دەپێکێت، بۆیە مەترسییان کەڵەکە دەبێت نەک دابەش',
  journalExposureStackedDraft: 'بەم مامەڵەیە ژمارەی مامەڵەکانت کە بە هەمان ئاراستە لەسەر {ccy} دەوەستن دەبێتە {after} (ئێستا کراوە: {before}) — یەک هەواڵ هەموویان پێکەوە دەپێکێت، بۆیە مەترسییان کەڵەکە دەبێت نەک دابەش',
  journalClosedWord: 'داخراو',
  journalCloseNeedsExit: 'نرخی دەرچوون لە خانەی «دەرچوون» لە سەرەوەی فۆڕمەکە بنووسە، پاشان «داخستن بە نرخی خانەی دەرچوون» لە ژێر مامەڵەکە دابگرە.',
  journalDeleteConfirmTitle: 'ئەم مامەڵەیە لە دەفتەرەکە بسڕدرێتەوە؟',
  journalDeleteFailedBody: 'دڵنیا نەبووینەوە لە سڕینەوە — پەیوەندییەکەت بپشکنە. ئەگەر مامەڵەکە هێشتا لە دەفتەرەکەدایە، دووبارە بیسڕەوە.',
  journalDeleteA11y: 'سڕینەوەی مامەڵەی {symbol} لە دەفتەرەکە',
  journalEditBtn: 'دەستکاری',
  journalEditA11y: 'دەستکاریکردنی مامەڵەی {symbol}',
  journalEditingBanner: 'دەستکاریکردنی مامەڵەی {symbol} — خانەکان بگۆڕە پاشان «پاشەکەوتکردنی گۆڕانکاری». خانەی دەرچوون بسڕەوە بۆ کردنەوەی دووبارە.',
  journalSaveEditBtn: 'پاشەکەوتکردنی گۆڕانکاری',
  journalCancelEdit: 'هەڵوەشاندنەوەی دەستکاری',
  journalEditError: 'نەکرا گۆڕانکارییەکان پاشەکەوت بکرێن — پەیوەندییەکەت بپشکنە و دووبارە هەوڵبدەرەوە',
  journalEditConflict: 'گۆڕانکارییەکان پاشەکەوت نەکران: لە کاتی دەستکارییەکەتدا ئەم مامەڵەیە لە ئامێرێکی ترەوە داخرا، دووبارە کرایەوە یان دەستکاری کرا. لیستەکە ئێستا نوێکراوەتەوە — دۆخەکەی بپشکنە و ئەگەر پێویست بوو دووبارە پاشەکەوت بکە.',
  journalCloseLinkA11y: 'داخستنی مامەڵەی {symbol} بە نرخی خانەی دەرچوون',
  journalCloseLinkBtn: 'داخستن بە نرخی خانەی دەرچوون',
  journalCloseMarketBtn: 'داخستن بە نرخی ئێستا',
  journalCloseMarketA11y: 'داخستنی مامەڵەی {symbol} بە نرخی ئێستا',
  journalCloseMarketConfirmTitle: 'داخستن بە نرخی ئێستا؟',
  journalCloseMarketConfirmBody: '{side} {symbol} · {entry} → {exit}\nئەنجام: {result}\n\nنرخەکە لە دابینکەری داتاوەیە (Bid بۆ کڕین، Ask بۆ فرۆشتن) و لەوانەیە کەمێک جیاواز بێت لە نرخی بریکەرەکەت — دەتوانیت دوای داخستن دەستکاری بکەیت.',
  journalCloseFieldConfirmTitle: 'داخستن بە نرخی خانەی دەرچوون؟',
  journalCloseMarketConfirmBtn: 'داخستن',
  journalCloseMarketNoQuote: 'ئێستا نرخی نوێ بۆ ئەم هێمایە نییە (لە 3 خولەکی ڕابردوودا هیچ نرخێک نەگەیشتووە) — نرخی دەرچوون لە خانەی «دەرچوون» بنووسە و پاشان «داخستن بە نرخی خانەی دەرچوون»',
  journalClosedElsewhereTitle: 'مامەڵەکە پێشتر داخراوە',
  journalClosedElsewhereBody: 'ئەم مامەڵەیە لە ئامێرێکی ترەوە داخراوە، بۆیە دەرچوونی دووەممان لەسەری تۆمار نەکرد. لیستەکە ئێستا نرخی دەرچوون و ئەنجامە تۆمارکراوەکەی پیشان دەدات.',
  journalCloseConflictTitle: 'داخستنەکە تۆمار نەکرا',
  journalCloseConflictBody: 'ئەم مامەڵەیە لە هەمان کاتدا لە ئامێرێکی ترەوە دەستکاری کرا، بۆیە دەرچوونەکەت لەسەر ئەو گۆڕانکارییە تۆمار نەکرا. لیستەکە ئێستا نوێکراوەتەوە — مامەڵەکە بپشکنە و ئەگەر پێویست بوو دووبارە دایبخە.',
  backtestSub: 'MA · RSI · MACD · BB · کەوانەی سەرمایە',
  backtestSymbolA11y: 'هێمای ئامراز بۆ تاقیکردنەوەی دواوە',
  backtestStrategyA11yPrefix: 'ستراتیژی',
  backtestRunA11y: 'کارپێکردنی تاقیکردنەوەی دواوە',
  backtestRunBtn: 'تاقیکردنەوەکە بکە',
  backtestRunError: 'نەکرا تاقیکردنەوەی دواوە کارپێبکرێت — پەیوەندییەکەت بپشکنە و دووبارە هەوڵبدەرەوە',
  noLiveDataResult: 'ئێستا داتای ڕاستەقینەی بازاڕ بۆ ئەم هێمایە بەردەست نییە — ئەنجام لەسەر نرخی تاقیکاری ناژمێرین. دواتر هەوڵبدەرەوە.',
  backtestStatTrades: 'مامەڵەکان: {n}',
  backtestStatWinRate: 'ڕێژەی سەرکەوتن: {pct}%',
  backtestStatReturn: 'کۆی گەڕانەوە: {pct}%',
  backtestStatEquity: 'سەرمایەی کۆتایی: {v}',
  backtestStatDrawdown: 'زۆرترین دابەزین: {pct}%',
  backtestStatAvgWinLoss: 'ناوەندی قازانج/زیان: {win}% / {loss}%',
  // بحاجة مراجعة ناطق
  backtestStatAvgWin: 'ناوەندی قازانج: {win}% — هیچ مامەڵەیەکی زیانبەخش نییە',
  backtestStatAvgLoss: 'ناوەندی زیان: {loss}% — هیچ مامەڵەیەکی قازانجبەخش نییە',
  backtestNoTrades: 'ستراتیژییەکە لەم ماوەیەدا هیچ مامەڵەیەکی دروست نەکرد — ڕێژەی سەرکەوتن و قازانج نییە بۆ پیشاندان. کاتێکی تر تاقی بکەرەوە.',
  backtestSmallSample: '⚠ نموونەی بچووک ({n} مامەڵە) — ئەم ڕێژەی سەرکەوتنە متمانەپێکراو نییە؛ لەسەر کەمتر لە ~30 مامەڵە بڕیار مەدە.',
  backtestSpreadNote: 'ئەنجامەکان دوای لابردنی سپرێدێکی خەمڵێنراوی {pips} pip بۆ هەر مامەڵەیەکن (بەپێی بڕۆکەر جیاوازە).',
  backtestTitle: 'تاقیکردنەوەی دواوەی ستراتیژی',
  backtestEquityTitle: 'کەوانەی سەرمایە',
  backtestStratMaCross: 'بڕینەوەی MA',
  backtestStratRsi: 'گەڕانەوەی RSI',
  backtestStratMacd: 'بڕینەوەی MACD',
  backtestStratBb: 'وەرگەڕانەوەی BB',
  indAlertsTitle: 'ئاگادارکردنەوەی پێوەرەکان',
  indAlertsSub: 'RSI · بڕینەوەی MA · MACD',
  indAlertsSymbolA11y: 'هێمای ئامراز',
  indAlertsTypeA11yPrefix: 'جۆری ئاگادارکردنەوەی پێوەر',
  indAlertsTypeRsi: 'RSI',
  indAlertsTypeMaCross: 'بڕینەوەی ناوەندی جوڵاو',
  indAlertsTypeMacdCross: 'بڕینەوەی MACD',
  indAlertsBelowA11y: 'مەرج: RSI لەژێر ئاستی سنوور',
  indAlertsAboveA11y: 'مەرج: RSI لەسەر ئاستی سنوور',
  indAlertsBelowChip: 'RSI خوارەوە',
  indAlertsAboveChip: 'RSI سەرەوە',
  indAlertsThresholdA11y: 'نرخی ئاستی سنووری پێوەر',
  indAlertsCrossUpA11y: 'مەرج: بڕینەوەی بەرزبوونەوە',
  indAlertsCrossDownA11y: 'مەرج: بڕینەوەی دابەزین',
  indAlertsCrossUpChip: 'بڕینەوەی بەرزبوونەوە ▲',
  indAlertsCrossDownChip: 'بڕینەوەی دابەزین ▼',
  indAlertsAddA11y: 'زیادکردنی ئاگادارکردنەوەی پێوەر',
  indAlertsAddBtn: 'زیادکردنی ئاگادارکردنەوە',
  indAlertsAddError:
    'نەکرا ئاگادارکردنەوەی پێوەر زیادبکرێت — پەیوەندییەکەت بپشکنە و دووبارە هەوڵبدەرەوە',
  indAlertsLoadError: 'نەکرا ئاگادارکردنەوەکانی پێوەر باربکرێن — پەیوەندییەکەت بپشکنە. ئاگادارکردنەوە پاشەکەوتکراوەکانت نەسڕاونەتەوە.',
  indAlertsEmpty:
    'هێشتا هیچ ئاگادارکردنەوەیەکی پێوەر نییە — پێوەرێک و مەرجێک لە سەرەوە هەڵبژێرە (بۆ نموونە RSI خوار ٣٠) تا ئاگادار بکرێیتەوە بەبێ چاودێری چارتەکە.',
  indAlertsDeleteConfirmTitle: 'ئاگادارکردنەوەی پێوەرەکە بسڕدرێتەوە؟',
  indAlertsDeleteFailedTitle: 'سڕینەوە سەرکەوتوو نەبوو',
  indAlertsDeleteFailedBody: 'دڵنیا نەبووینەوە لە سڕینەوە — پەیوەندییەکەت بپشکنە. ئەگەر ئاگادارکردنەوەی پێوەرەکە هێشتا لە لیستەکەدایە، دووبارە بیسڕەوە.',
  indAlertsDeleteA11yPrefix: 'سڕینەوەی ئاگادارکردنەوەی پێوەر',
  indAlertsPushTitle: 'MATRIX · ئاگادارکردنەوەی پێوەر',
  indAlertsTfLabel: 'تایم‌فرەیم:',
  indAlertsHintRsi: 'RSI 14: خوار 30 = زۆر فرۆشراو، سەرووی 70 = زۆر کڕدراو — لە ترێندی بەهێزدا دەتوانێت بۆ ماوەیەکی درێژ وا بمێنێتەوە',
  indAlertsHintMa: 'SMA 9ی خێرا SMA 21ی هێواش دەبڕێت لەسەر دوایین مۆمی تایم‌فرەیمی هەڵبژێردراو',
  indAlertsHintMacd: 'هێڵی MACD (12، 26) هێڵی ئاماژە (9) دەبڕێت لەسەر دوایین مۆمی تایم‌فرەیمی هەڵبژێردراو',
  indAlertsRsiRange: 'سنووری RSI دەبێت ژمارەیەک بێت لە 1 تا 99 (باوترین 30 یان 70)',
  indAlertsSymbolInvalid: 'هێمایەکی دروست بنووسە وەک EURUSD',
  indAlertsArmed: '✓ ئاگادارکردنەوە چالاکە:',
  indAlertsFiredTag: 'کارا بوو',
  indAlertsRearmBtn: 'دووبارە چالاککردنەوە',
  indAlertsRearmA11yPrefix: 'دووبارە چالاککردنەوەی ئاگادارکردنەوە',
  indAlertsRearmedMsg: '✓ دووبارە چاودێری دەکات: {desc} — ئەگەر مەرجەکە هێشتا هەبێت لە پشکنینی داهاتوودا کارا دەبێت',
  indAlertsRearmFailed: 'نەکرا دووبارە چالاک بکرێتەوە — پەیوەندییەکەت بپشکنە و دووبارە هەوڵبدەرەوە',
  indAlertsWatchingTag: 'چاودێری دەکات',
  calendarTitle: 'ڕۆژژمێری ئابووری',
  calendarCurrencyA11yPrefix: 'پاڵاوتن بەپێی دراو',
  calendarAllWord: 'هەمووی',
  newsAllCurrencies: 'هەموو دراوەکان',
  calendarImpactA11yPrefix: 'پاڵاوتن بەپێی کاریگەری',
  calendarAllShort: 'هەموو',
  calImpactMedPlus: 'مامناوەند+',
  calImpactMedPlusA11y: 'بەرز و مامناوەند',
  calendarLoading: 'ڕۆژژمێرەکە بار دەکرێت…',
  calendarLoadError: 'نەکرا ڕۆژژمێرەکە باربکرێت — پەیوەندییەکەت بپشکنە. هەر 5 خولەک خۆی دووبارە هەوڵ دەداتەوە، یان فلتەرێک بگۆڕە بۆ هەوڵدانەوەی ئێستا',
  calendarEmpty:
    'ئەم هەفتەیە هیچ ڕووداوێک لەگەڵ ئەم فلتەرە نییە — ALL لە ڕیزی دراو یان «هەموو» لە ڕیزی گرنگی دابگرە بۆ بینینی زیاتر. ڕۆژژمێرەکە تەنها هەفتەی ئێستا پیشان دەدات.',
  layoutDefaultName: 'نەخشەسازیم',
  layoutFallbackName: 'نەخشەسازی',
  layoutsTitle: 'نەخشەسازییە پاشەکەوتکراوەکان',
  layoutNamePlaceholder: 'ناوی نەخشەسازی',
  layoutNameA11y: 'ناوی نەخشەسازی',
  layoutSaveA11y: 'پاشەکەوتکردنی نەخشەسازی ئێستا',
  layoutSaveBtn: 'پاشەکەوتکردنی نەخشەسازی ئێستا',
  layoutApplyA11yPrefix: 'جێبەجێکردنی نەخشەسازی',
  layoutDeleteConfirmTitle: 'نەخشەسازییەکە بسڕدرێتەوە؟',
  layoutsHint: 'نەخشەسازی = جووت و تایم‌فرەیمی سێ چارتەکەی شاشەی سەرەکی. یەکێک دابگرە بۆ جێبەجێکردن و کردنەوەی چارت.',
  layoutCurrentTag: 'ئێستا',
  layoutSavedMsg: '✓ پاشەکەوت کرا:',
  layoutBuiltinName: 'بنەڕەت',
  layoutDeleteA11yPrefix: 'سڕینەوەی نەخشەسازی',
  coursesTitle: 'ئەکادیمی',
  coursesSub: 'وانەکان بە عەرەبین · ڕوونکردنەوەی دەنگی · ڕاوەستە و بە کوردی پرسیار بکە دەربارەی هەر بەشێک',
  coursesStaleNote: 'نەکرا لیستی قوتابخانەکان نوێبکرێتەوە — زانیاری پاشەکەوتکراو پیشان دەدرێت',
  coursesNoteTitle: 'پۆلێنبەندییەکی گرنگ',
  coursesNoteText:
    'BOS و CHOCH پەیوەستن بە کۆمەڵەی Order Block و Fair Value Gap ناو قوتابخانەی ICT/SMC — قوتابخانەیەکی جیاواز نین.',
  coursesSchoolA11yPrefix: 'قوتابخانە',
  coursesLevelsWord: 'ئاست',
  coursesLecturesUnitWord: 'وانە',
  coursesNarratedBadge: '🔊 ڕوونکردنەوەی دەنگیی تەواو',
  coursesFallbackNote: 'نەکرا کوریکولەی تەواو باربکرێت — تەنها وانەیەکی سەرەتایی کاتی پیشان دەدرێت',
  coursesLevelWord: 'ئاست',
  coursesLectureA11yPrefix: 'وانە',
  coursesMinuteWord: 'خولەک',
  coursesMinuteAbbrev: 'خولەک',
  coursesBackToSchoolsA11y: 'گەڕانەوە بۆ لیستی قوتابخانەکان',
  coursesBack: 'گەڕانەوە',
  coursesFallbackLevelTitle: 'بناغە',
  coursesFallbackLectureTitle: 'وانەی کردنەوە',
  coursesFallbackOutlineIntro: 'پێشەکی',
  lectureClose: 'داخستن',
  lectureCloseA11y: 'داخستنی وانەکە',
  lectureLevelWord: 'ئاست',
  lectureLoadFailedNote: 'وانەکە لە ڕاژەوە نەگەیشت — ئەوەی خوارەوە وانە نییە. پەیوەندییەکەت بپشکنە، پاشان دووبارە بیکەرەوە.',
  lectureFullScreenTag: 'شاشەی تەواو',
  lectureVoicePausedForQ: 'ڕاوەستاوە بۆ پرسیارێک',
  lecturePreparingVoice: 'دەنگ ئامادە دەکرێت…',
  lectureExplainingNow: 'ئێستا ڕوون دەکاتەوە',
  lectureVoicePlayError:
    'نەکرا دەنگ لێبدرێت — پەیوەندییەکەت بپشکنە. دەقی تەواوی وانەکە لەبەردەمتە و دەتوانیت بە خوێندنەوە بەردەوام بیت.',
  lectureChartLabel: 'چارتی کارلێککەرەوە',
  lectureHideChart: 'شاردنەوە',
  lectureHideChartA11y: 'شاردنەوەی چارتی کارلێککەرەوە',
  lectureShowChart: 'پیشاندانی چارتی کارلێککەرەوە',
  lectureChartPracticeNote: 'پەیوەندی بە ڕاژەوە نییە: ئەمانە مۆمی ڕاهێنانن، نەک نرخی بازاڕ. چۆنت بوێت مەشقیان لەسەر بکە — بەڵام ئەوەی لێرە دەیکێشیت پاشەکەوت ناکرێت.',
  lectureVoiceStopped: 'دەنگ ڕاوەستا',
  lectureGenerating: 'دروست دەکرێت…',
  lectureVoiceActive: 'ڕوونکردنەوەی دەنگی چالاکە',
  lectureSegmentWord: 'بەش',
  lectureCompleteBadge: '🎉 ئەم وانەیەت تەواو کرد',
  lectureClarifyTitle: 'ڕوونکردنەوە دوای ڕاگرتنی ڕوونکردنەوەکە',
  lectureClarifyPausedLine: 'ڕوونکردنەوەکە بۆ ماوەیەک ڕاگیرا.',
  lectureClarifyQuestionLabel: 'پرسیارەکەت:',
  lectureClarifyFocusLine:
    'سەرنج بدە بیرۆکە کارەکییەکە لەسەر شاشەکە، پاشان لە هەمان بەشەوە بەردەوام دەبین.',
  lectureResume: 'بەردەوامبوون لە وانەکە',
  lecturePrev: 'پێشوو',
  lecturePrevA11y: 'بەشی پێشوو',
  lectureNext: 'دواتر',
  lectureNextA11y: 'بەشی دواتر',
  lectureInterruptLabel: 'ڕوونکردنەوەکە ڕابگرە و پرسیار بکە دەربارەی بەشێکی ناڕوون',
  lectureQuestionPlaceholder: 'نموونە: تێنەگەیشتم لە CHOCH…',
  lectureQuestionA11y: 'پرسیار لە کاتی ڕاگرتنی ڕوونکردنەوەکە',
  lectureAskBtn: 'بپرسە',
  lectureAskA11y: 'ناردنی پرسیارەکە',
  lectureFallbackTitle: 'نەکرا وانەکە باربکرێت',
  lectureFallbackOutlineDefinition: 'چی ڕوویدا',
  lectureFallbackOutlineApplication: 'چی بکەیت',
  lectureFallbackTeacher: 'ڕوونکردنەوەی دەنگی',
  lectureFallbackSeg1Title: 'چی ڕوویدا',
  lectureFallbackSeg1Narration:
    'ئێستا نەمانتوانی ئەم وانەیە باربکەین؛ بە ئەگەری زۆر پەیوەندی بە ئینتەرنێت یان بە ڕاژەی MATRIX پچڕاوە.',
  lectureFallbackSeg2Title: 'چی بکەیت',
  lectureFallbackSeg2Narration:
    'پەیوەندییەکەت بپشکنە، پاشان ئەم شاشەیە دابخە و وانەکە دووبارە بکەرەوە.',
  termShadowSizeSmall: 'بچووک',
  termShadowSizeMedium: 'ناوەند',
  termShadowSizeBig: 'گەورە',
  termServerOnline: 'بە ڕاژەوە بەستراوە',
  termServerOffline: 'پەیوەندی بە ڕاژەوە نییە',
  termLastPriceWord: 'دوایین نرخ',
  termIndicatorsWord: 'ئاماژەکان',
  termAlertWord: 'ئاگاداری',
  termKindWord: 'جۆر',
  termFrameWord: 'چوارچێوە',
  termSquareWord: 'چوارگۆشە',
  termRectWord: 'لاکێشراو',
  termLayoutSquareA11yPrefix: 'نەخشەی چوارگۆشە',
  termLayoutRectA11yPrefix: 'نەخشەی لاکێشراو',
  termShadowFrameA11y: 'چوارچێوەی سێبەر',
  termShadowWord: 'سێبەر',
  termTimeSyncLabel: 'هاوکاتکردنی کات',
  termTimeSyncUnavailable: 'هاوکاتکردنی کات لە ڕێکخستنی «سێبەر»دا کار ناکات',
  termToolA11yPrefix: 'ئامراز',
  termChartKindA11yPrefix: 'جۆری چارت',
  termSymbolA11yPrefix: 'هێما',
  termManageWatchlistLabel: 'بەڕێوەبردنی لیستی چاودێری',
  termManageWord: 'بەڕێوەبردن',
  termPrimaryWord: 'سەرەکی',
  termShadowHintText: 'سەرەکی سەرەوە · سێبەرەکان خوارەوەن، لە گەورەوە بۆ بچووک',
  termPrimaryTimeframeA11yPrefix: 'کاتی چوارچێوەی سەرەکی',
  termOnWord: 'کارپێکردن',
  termOffWord: 'ڕاگرتن',
  termTimeframeWord: 'کاتی چوارچێوە',
  termTimeframeA11yPrefix: 'کاتی چوارچێوەکە',
  termOpenFullscreenA11y: 'کردنەوەی چارت بە شاشەی پڕ',
  termFullscreenLabel: 'شاشەی پڕ ⛶',
  termFxMarketWord: 'بازاڕی دراو',
  termSpreadWord: 'سپرێد',
  termBidLabel: 'فرۆشتن',
  termAskLabel: 'کڕین',
  termSquareFramesHintSuffix: 'چوارچێوەی چوارگۆشە · خاڵەکانی گۆشەی هەر بۆکسێک ڕابکێشە بۆ گۆڕینی شوێنی · ئاماژەکان ئارەزوومەندانەن',
  termHintMoveText:
    'پێشبینیەکان · ئاگاداریەکان · هەواڵەکان · کۆمەڵگا → ئامرازەکان · خاڵەکانی گۆشەی چوارچێوەکە ڕابکێشە بۆ گۆڕینەوەی شوێنی لەگەڵ چوارچێوەیەکی تر',
  termCloseWatchlistA11y: 'داخستنی لیستی چاودێری',
  wlTitle: 'لیستی چاودێری',
  wlAddBtn: 'زیادکردن',
  wlAddA11y: 'زیادکردنی هێما بۆ چاودێری',
  wlResetBtn: 'بنەڕەت',
  wlResetA11y: 'گەڕاندنەوەی لیستی چاودێری بۆ بنەڕەت',
  wlResetConfirmTitle: 'لیستی چاودێری بگەڕێتەوە بۆ بنەڕەت؟',
  wlResetConfirmBody: 'هەموو هێماکانی زیادکراو بە دەستی دەگۆڕدرێن بۆ لیستی بنەڕەت.',
  wlResetConfirmBtn: 'گەڕاندنەوە بۆ بنەڕەت',
  wlSearchPlaceholder: 'گەڕان بۆ هێما…',
  wlLoadError: 'نەتوانرا لیستی چاودێری لە مۆبایلەکە بخوێندرێتەوە — «دووبارە هەوڵدان» دابگرە',
  layoutSaveFailed: 'نەتوانرا نەخشەسازی لە مۆبایلەکە پاشەکەوت بکرێت — شوێنی بەتاڵی بیرگە بپشکنە و دووبارە هەوڵ بدەرەوە',
  layoutDeleteFailed: 'نەتوانرا نەخشەسازی بسڕدرێتەوە — لەوانەیە جارێکی تر دەربکەوێتەوە، دووبارە بیسڕەوە',
  chartTemplateSaveFailed: 'نەتوانرا ڕێکخستنی بنەڕەت لە مۆبایلەکە پاشەکەوت بکرێت — شوێنی بەتاڵی بیرگە بپشکنە و دووبارە هەوڵ بدەرەوە',
  drawingsSaveFailed: 'وێنەکێشانەکان لە مۆبایلەکە پاشەکەوت نەکران — شوێنی بەتاڵی بیرگە بپشکنە، دەنا بە گۆڕینی هێما یان داخستنی ئەپ ون دەبن',
  drawingsDeleteFailed: 'وێنەکێشانەکان لە مۆبایلەکە نەسڕانەوە — لەوانەیە بە کردنەوەی ئەم چارتە بگەڕێنەوە',
  wlSaveFailed: 'گۆڕانکارییەکە پاشەکەوت نەکرا — لیستەکە وەک خۆی گەڕایەوە. شوێنی بەتاڵی بیرگە بپشکنە و دووبارە هەوڵ بدەرەوە',
  wlRetryA11y: 'دووبارە هەوڵدانەوەی بارکردنی لیستی چاودێری',
  wlRetryBtn: 'دووبارە هەوڵدان',
  wlLoadingWord: 'بارکردن…',
  wlEmpty:
    'هیچ هێمایەک لە چاودێریدا نییە — بە دوگمەی خوارەوە جوتەکانت زیاد بکە تا نرخ و گۆڕانی ڕۆژانە ببینیت و بە یەک دەست چارتەکە بگۆڕیت.',
  wlAddEmptyBtn: 'زیادکردنی هێما',
  wlDemoPriceA11ySuffix: ' · نرخی نموونەیی',
  wlDemoTag: 'نموونەیی',
  wlMoveUpA11y: 'بۆ سەرەوە بگوازەرەوە',
  wlMoveDownA11y: 'بۆ خوارەوە بگوازەرەوە',
  wlRemoveA11y: 'لابردن لە چاودێری',
  wlRemoveConfirmTitle: 'لابردن لە چاودێری؟',
  wlRemoveConfirmBtn: 'لابردن',
  wlCatalogTitle: 'زیادکردن لە کاتالۆگەوە',
  wlCatalogAllAdded: 'هەموو هێماکانی کاتالۆگ زیادکراون',
  wlCatalogCloseA11y: 'داخستنی پەنجەرەی زیادکردن',
  focusSymbolA11yPrefix: 'هێما',
  focusVsWord: 'بەرامبەر',
  focusPhoneSubHint: 'دەست بنێ بۆ گۆڕینی هێما',
  focusDesktopSub: 'وێستگەی شیکاری · وێنەکێشان · بەراورد · ئاگادارکردنەوە',
  focusLastPriceWord: 'کۆتا نرخ',
  focusWatchlistTitle: 'لیستی چاودێری',
  focusCompareHint: 'لەسەر هێمایەک درێژ دابگرە بۆ بەراوردکردنی لەسەر چارتەکە، دووبارە بۆ لابردنی',
  focusCompareTag: 'بەراورد',
  focusPickSymbolA11yPrefix: 'هەڵبژاردنی هێما',
  focusCompareNotePrefix: 'بەراوردکردن لەگەڵ',
  focusCompareNoteSuffix: '(مۆر)',
  focusCompareUnavailable: 'نەکرا زانیاری ڕاستەقینەی {sym} باربکرێت — هێڵی بەراوردکردن نییە',
  focusInComparisonSuffix: ' · لە بەراوردکردندایە',
  focusAlertCreateFailedTitle: 'نەتوانرا ئاگادارکردنەوە دروست بکرێت',
  focusAlertCreateFailedBody:
    'ئاگادارکردنەوەکە دروست نەکرا. پەیوەندییەکەت بپشکنە و دووبارە هەوڵبدەرەوە. ئاگادارکردنەوە پێویستی بە نرخی ڕاستەقینەی هێماکەیە تا بزانێت چاوەڕێی بەرزبوونەوە بێت یان دابەزین، بۆیە کاتێک چارتەکە نرخی نموونەیی پیشان دەدات دروست ناکرێت.',
  focusAlertFromDrawingNote: 'لە هێڵی وێنەکێشانەوە',
  focusAlertFromChartNote: 'لە چارتەوە',
  gridFramesWord: 'چوارچێوەکان',
  gridSquaresWord: 'چوارگۆشەکان',
  gridSquaresA11y: 'پیشاندانی چوارچێوەکان وەک چوارگۆشە',
  gridHandleA11y: 'دەستگری ڕیزبەندی چوارچێوە — شوێنی لەگەڵ چوارچێوەیەکی تر دەگۆڕێتەوە',
  gridHandlePosA11y: 'چوارچێوەی {n} لە {total}',
  gridRectanglesWord: 'لاکێشراوەکان',
  gridRectanglesA11y: 'پیشاندانی چوارچێوەکان وەک لاکێشراو',
  quadCloseA11y: 'داخستنی دیمەنی 2×2',
  quadTitlePrefix: 'وێستگەی 2×2',
  spmCloseA11y: 'داخستنی لیستی جووتەکان',
  spmOpenA11y: 'کردنەوەی لیستی جووتەکان',
  spmPanelTitle: 'جووتەکانت',
  panSpeedMarkA11y: 'نیشانەی خێرایی',
  panTapDetailsSuffix: '— دابگرە بۆ وردەکاری',
  panHideDetailsA11y: 'شاردنەوەی وردەکاری خێرایی',
  panChartSpeedPrefix: 'خێرایی جوڵەی چارت',
  lensA11yPrefix: 'لینز: ',
  drawToolA11yPrefix: 'ئامرازی وێنەکێشان: ',
  lensSectionTitle: 'لینز',
  ctlKindCandles: 'مۆم',
  ctlKindHollow: 'مۆمی بەتاڵ',
  ctlKindHeikin: 'هایکن ئاشی',
  ctlKindBars: 'ستوون',
  ctlKindLine: 'هێڵ',
  ctlKindArea: 'ڕووبەر',
  ctlKindBaseline: 'هێڵی بنەڕەت',
  ctlKindRange: 'مەودا',
  ctlKindRenko: 'ڕێنکۆ',
  ctlKindKagi: 'کاگی',
  ctlKindPnf: 'خاڵ و ژمارە',
  ctlKindLineBreak: 'شکانی هێڵ',
  ctlToolNone: 'نیشانکەر',
  ctlToolSelect: 'هەڵبژاردن',
  ctlToolTrend: 'ترێند',
  ctlToolRay: 'تیشک',
  ctlToolHline: 'ئاسۆیی',
  ctlToolVline: 'ستوونی',
  ctlToolRect: 'لاکێشە',
  ctlToolFib: 'فیبۆ',
  ctlToolZone: 'ناوچە',
  ctlToolNote: 'تێبینی',
  ctlToolMeasure: 'پێوان',
  ctlToolLong: 'پلانی کڕین',
  ctlToolShort: 'پلانی فرۆشتن',
  ctlToolHray: 'تیشکی ئاسۆیی',
  ctlToolChannel: 'کەناڵ',
  ctlLensClean: 'پاک',
  ctlLensCleanHint: 'تەنها نرخ',
  ctlLensStructure: 'پێکهاتە',
  ctlLensStructureHint: 'SMA + EMA',
  ctlLensMomentum: 'پاڵنە',
  ctlLensMomentumHint: 'RSI + MACD',
  ctlLensLiquidity: 'شلەیی',
  ctlLensLiquidityHint: 'قەبارە + بۆلینجەر + CVD',
  ctlIndBollinger: 'بۆلینجەر',
  ctlIndVolume: 'قەبارە',
  backtestWord: 'تاقیکردنەوە',
  depthWord: 'سپرێد',
  mspDrawTitle: 'ئامرازەکانی وێنەکێشان · MATRIX',
  mspIndicatorsTitle: 'نیشانەکان · MATRIX',
  mspKindsTitle: 'جۆرەکانی چارت',
  mspAlertsTitle: 'ئاگادارکردنەوەی نرخ',
  mspIndAlertsTitle: 'ئاگادارکردنەوەی نیشانەکان',
  mspCalendarTitle: 'ڕۆژژمێری ئابووری',
  mspScreenerTitle: 'پشکنینی بازاڕ',
  mspReportsTitle: 'ڕاپۆرتەکانی MATRIX',
  mspBacktestTitle: 'تاقیکردنەوەی دواوەی ستراتیژی',
  mspNewsTitle: 'هەواڵەکان',
  mspDomTitle: 'Bid / Ask',
  mspJournalTitle: 'دەفتەری مامەڵەکان',
  mspIndicatorA11yPrefix: 'نیشانە: ',
  mspIndicatorEnabledSuffix: ' · چالاک',
  mspKindA11yPrefix: 'جۆری چارت: ',
  dockDrawTab: 'وێنەکێشان',
  dockSignalsTab: 'پێشبینیەکان',
  dockAnalystsTab: 'شیکارکاران',
  dockSocialTab: 'کەناڵەکان',
  dockIndForecastTab: 'نیشانەکان+',
  dockScreenerTab: 'پشکنین',
  dockAlertsTab: 'ئاگادارکردنەوەکان',
  dockNewsTab: 'هەواڵ',
  dockCommunityTab: 'کۆمەڵگا',
  dockHideBtn: 'شاردنەوە',
  dockHideA11yPrefix: 'شاردنەوەی ',
  dockPanelFallback: 'پانێڵ',
  dockLibraryFallback: 'کتێبخانە',
  dockMoreTab: 'زیاتر',
  dockMoreA11y: 'پانێڵی تر',
  dockDrawToolSectionTitle: 'ئامرازی وێنەکێشان',
  dockTabA11yPrefix: 'تابی: ',
  railDrawSectionTitle: 'وێنەکێشان',
  railPanelsSectionTitle: 'پانێڵەکان',
  railPanelA11yPrefix: 'پانێڵ: ',
  railTipAlert: 'ئاگادارکردنەوە',
  railTipIndicator: 'نیشانە',
  railTipReport: 'ڕاپۆرت',
  railTipNewsItem: 'هەواڵ',
  railOpenQuadA11y: 'کردنەوەی نەخشەی 2×2',
  cfSyncLeaderBadge: 'سەرکردەی کات',
  cfSyncPartialBadge: 'هاوکات · بەشی',
  cfSyncFollowBadge: 'هاوکات',
  cfSubtitleInteractive: 'ئەنجینی MATRIX · لینز و ئامرازەکان',
  cfSubtitleNavigate: 'ناوەڕاست ڕایبکێشە · نرخ · بەروار',
  cfSubtitleDefault: 'دەستبدە بۆ شیکاری تەواو',
  cfSyncActivateA11yPrefix: 'بیکە بە سەرکردەی کات: ',
  cfChangeSymbolA11y: 'گۆڕینی هێما',
  // بحاجة مراجعة ناطق كردي (الاثنان أدناه)
  cfDayChangeA11y: 'گۆڕانی ئەمڕۆ {pct}',
  cfDayChangeNoneA11y: 'گۆڕانی ئەمڕۆ بۆ ئەم نرخە بەردەست نییە',
  cfMarketClosedA11y: 'بازاڕ ئێستا داخراوە',
  cfReplayPriceA11y: 'دووبارەکردنەوەی مۆم — ئەم نرخە داخستنی مۆمی دووبارەکردنەوەیە، نەک نرخی زیندوو',
  cfMarketClosedTag: 'داخراو',
  cfSpreadBidAskA11y: 'Bid (فرۆشتن) {bid}، Ask (کڕین) {ask}',
  cfSpreadPipsA11y: 'سپرێد {pips} pip',
  dsKindProvider: 'دابینکەر',
  dsKindDemo: 'نموونەیی',
  dsKindCache: 'خەزنکراو',
  dsKindUnknown: 'سەرچاوەی نادیار',
  dsTickLive: 'زیندوو',
  dsTickDemo: 'تیکی نموونەیی',
  dsLastPriceWord: 'دوایین نرخ',
  dsMarketOpen: 'بازاڕ کراوەیە',
  dsMarketClosed: 'بازاڕ داخراوە',
  // chart/MatrixChart.tsx (i18n الشارت, 2026-09-20)
  mcMonths: [
    'کانوونی دووەم',
    'شوبات',
    'ئازار',
    'نیسان',
    'ئایار',
    'حوزەیران',
    'تەمووز',
    'ئاب',
    'ئەیلوول',
    'تشرینی یەکەم',
    'تشرینی دووەم',
    'کانوونی یەکەم',
  ],
  mcWeekdays: [
    'یەکشەممە',
    'دووشەممە',
    'سێشەممە',
    'چوارشەممە',
    'پێنجشەممە',
    'هەینی',
    'شەممە',
  ],
  mcPrimaryLane: 'سەرەکی',
  mcMeasureBarsWord: 'مۆم',
  mcMeasureDurUnits: { m: ' خولەک', h: ' کاتژمێر', d: ' ڕۆژ' },
  mcNoteDefault: 'تێبینی',
  mcNoteTextA11y: 'دەقی تێبینی لەسەر چارت — تا 60 پیت',
  mcHintNoteSelected: 'دەقی تێبینییەکە لە خانەی تەنیشتی بنووسە · ڕایبکێشە بۆ جوولاندنی · خۆکار پاشەکەوت دەبێت',
  mcHintNoteSelectedWeb: 'دەقی تێبینییەکە لە خانەی تەنیشتی بنووسە · ڕایبکێشە بۆ جوولاندنی · Esc بۆ لابردنی دیاریکردن · Ctrl+Z / Ctrl+Y بۆ گەڕانەوە و دووبارەکردنەوە',
  mcSnapshotSaved: 'وێنەی چارت پاشەکەوت کرا',
  mcSnapshotFailed: 'نەتوانرا چارت هەناردە بکرێت — دووبارە هەوڵ بدەرەوە، یان وێنەی شاشەی چارتەکە بگرە',
  mcTemplateDefaultName: 'بنەڕەت',
  mcTemplateSaved: 'وەک بنەڕەت پاشەکەوت کرا — ئەو چارتانەی دواتر دەیکەیتەوە بەم پێوەرانەوە دەست پێ دەکەن',
  mcClearAllTitle: 'سڕینەوەی هەموو کێشانەکان؟',
  mcClearAllBody: 'هەموو توخمەکانی کێشان بۆ ئەم هێمایە لە هەموو ماوە کاتییەکاندا دەسڕێنەوە',
  mcClearWord: 'سڕینەوە',
  mcHintDraw: 'ڕایبکێشە بۆ کێشان، یان دوو خاڵ دابگرە · خۆکار پاشەکەوت دەبێت',
  mcHintNavigate: 'ڕایبکێشە بۆ جوڵان · دەست لە مۆمێک بدە بۆ خوێندنەوە، یان دایگرە و ڕایبکێشە · دوو پەنجە لێک دوور بخەرەوە یان تەوەرەکان ڕایبکێشە بۆ زووم',
  mcHintNavigateWeb: 'ماوس ببە سەری بۆ خوێندنەوە · کلیک بکە بۆ جێگیرکردن · ←/→ مۆم بە مۆم · Esc بۆ لابردن · Alt+R بۆ ڕێکخستنەوەی پیشاندان · Alt+T ترێند، H ئاسۆیی، V ستوونی، F فیبۆ',
  mcHintDrawWeb: 'ڕایبکێشە بۆ کێشان، یان کلیک لە دوو خاڵ بکە · Esc بۆ هەڵوەشاندنەوە · Ctrl+Z / Ctrl+Y بۆ گەڕانەوە و دووبارەکردنەوە · Alt+T/H/V/F بۆ ئامرازێکی تر · خۆکار پاشەکەوت دەبێت',
  mcHintSelectedWeb: 'ڕایبکێشە یان تیرەکان بەکاربهێنە بۆ جوولاندنی کێشراو (Shift ×10) · Delete بۆ سڕینەوەی · Esc بۆ لابردنی دیاریکردن · Ctrl+Z / Ctrl+Y بۆ گەڕانەوە و دووبارەکردنەوە',
  mcHintSelect: 'کێشراوێک دابگرە بۆ دیاریکردنی · شوێنێکی بەتاڵ دابگرە بۆ لابردنی دیاریکردن',
  mcHintSelected: 'کێشراوەکە ڕایبکێشە بۆ جوولاندنی · دەسکێک ڕایبکێشە بۆ گۆڕینی لایەکی · خۆکار پاشەکەوت دەبێت',
  mcAutoA11y: 'خۆکار: گونجاندنی نرخەکان و گەڕانەوە بۆ دوایین مۆم',
  mcAutoManualA11y: 'پێوەری نرخ دەستییە — لەوانەیە مۆمە نوێیەکان لە دیمەن دەربچن. دابگرە بۆ گەڕاندنەوەی خۆکار و گەڕانەوە بۆ دوایین مۆم',
  mcAutoShort: 'خۆکار',
  mcArrowHeadA11y: 'سەری تیر لە کۆتایی هێڵی ترێند',
  mcArmedAlertAboveA11y: 'ئاگادارکردنەوە چالاکە کاتێک نرخ بەرز دەبێتەوە بۆ {price} — {dist}',
  mcArmedAlertBelowA11y: 'ئاگادارکردنەوە چالاکە کاتێک نرخ دادەبەزێت بۆ {price} — {dist}',
  mcAlertMoveFailed: 'نەتوانرا ئاگادارکردنەوەکە بگوازرێتەوە — هێشتا لەسەر {price}یە. پەیوەندییەکە بپشکنە و دووبارە ڕایبکێشە.',
  mcArmedAlertAdjustHint: 'بۆ سەرەوە یان خوارەوە ڕابکێشە بۆ گواستنەوەی ئاگادارکردنەوەکە یەک هەنگاوی نرخ (یەک pip بۆ جووتەکان و کانزاکان) — نرخە نوێیەکە دوای وەستانێکی کورت پاشەکەوت دەکرێت',
  mcEstimatedTag: 'خەمڵێنراو',
  mcVolEstimatedHint:
    'دابینکەرەکەمان قەبارەی بازرگانی بۆ ئەم هێمایە نانێرێت (فۆرێکس قەبارەی ناوەندیی نییە) — ئەم ستوونانە خەمڵاندنن لە مەودای هەر مۆمێک (لە بەرزترینەوە بۆ نزمترین). پێوەرەکانی قەبارە (OBV، MFI، VWAP، Klinger…) لە هەمان خەمڵاندن حیساب دەکرێن، بۆیە ژمارەکانیان لەگەڵ پلاتفۆرمێک کە قەبارەی تیکی بڕۆکەرەکەت پیشان دەدات یەک ناگرنەوە.',
  mcZoomOutA11y: 'بچووککردنەوە',
  mcZoomInA11y: 'گەورەکردن',
  mcPanBackA11y: 'جوڵان بۆ دواوە',
  mcPanForwardA11y: 'جوڵان بۆ پێشەوە',
  mcReplayModeA11y: 'دۆخی دووبارەکردنەوە',
  mcReplayReadout: 'دووبارەکردنەوەی مۆم · {n}/{total}',
  mcReplayEndedOnSwitch: 'دووبارەکردنەوە کۆتایی هات چونکە تایم‌فرەیم یان هێما گۆڕا — چارتەکە ئێستا لەسەر نرخی زیندووە',
  mcReplayStepBackA11y: 'هەنگاوی دووبارەکردنەوە بۆ دواوە',
  mcReplayPauseA11y: 'وەستاندنی دووبارەکردنەوە',
  mcReplayPlayA11y: 'پێکردنی دووبارەکردنەوە',
  mcReplayStepFwdA11y: 'هەنگاوی دووبارەکردنەوە بۆ پێشەوە',
  mcMagnetA11y: 'لکاندن بە تۆڕ',
  mcDockTitle: 'لەنگەری ئامرازەکان · MATRIX',
  mcNoPineLine: 'بێ هێڵی هاوکێشە',
  mcExportPng: 'هەناردەی PNG',
  mcSaveTemplate: 'پاشەکەوت وەک بنەڕەت',
  mcAlertLine: 'ئاگاداری هێڵ',
  mcAlertZone: 'ئاگاداری ناوچە',
  mcAlertAtLineLevel: 'ئاگاداری لە ئاستی هێڵی ئێستا',
  mcAlertAtCrossA11y: 'دروستکردنی ئاگاداری نرخ لە',
  mcUndo: 'گەڕاندنەوە',
  mcUndoA11y: 'گەڕاندنەوەی دوایین گۆڕانکاری لە کێشان',
  mcNothingToUndo: 'هیچ شتێک نییە بۆ گەڕاندنەوە',
  mcRedo: 'دووبارەکردنەوە',
  mcRedoA11y: 'دووبارەکردنەوەی دوایین گۆڕانکاری کە گەڕاندتەوە لە کێشان',
  mcNothingToRedo: 'هیچ شتێک نییە بۆ دووبارەکردنەوە',
  mcToLatestA11y: 'گەڕانەوە بۆ دوایین مۆم',
  mcHideDrawings: 'شاردنەوەی هێڵکارییەکان',
  mcShowDrawings: 'پیشاندانی هێڵکارییەکان',
  mcLogScaleA11y: 'پێوەری لۆگاریتمی بۆ نرخ',
  mcPercentScaleA11y: 'پێوەری سەدی: گۆڕان لە یەکەم مۆمی دیار',
  mcZigzagDevA11y: 'لادانی ZigZag {pct}% — دایبگرە بۆ گۆڕین بۆ {next}%',
  mcLineBreakCountA11y: 'شکانی هێڵ: ژمارەی هێڵەکانی پێچەوانەبوونەوە {count} — دایبگرە بۆ گۆڕین بۆ {next}',
  mcLockDrawing: 'قوفڵ',
  mcUnlockDrawing: 'کردنەوەی قوفڵ',
  mcLockDrawingA11y: 'کێشراوی دیاریکراو قوفڵ بکە بۆ ئەوەی بە دەستلێدانێکی هەڵە نەجووڵێت',
  mcDrawingLockedHint: 'کێشراوەکە قوفڵە — بۆ جوولاندنی قوفڵەکەی بکەرەوە',
  mcDrawColorWord: 'ڕەنگ',
  mcDrawColorA11y: 'ڕەنگی وێنەکە: {color} — بۆ ڕەنگی دواتر لێبدە',
  mcCloneDrawing: 'کۆپی',
  mcCloneDrawingA11y: 'ئەم وێنەیە لە تەنیشتیەوە کۆپی بکە — کۆپییەکە هەڵدەبژێردرێت تا بە جیا بیجووڵێنیت و دەستکاری بکەیت',
  mcNudgeUpA11y: 'وێنە هەڵبژێردراوەکە یەک هەنگاوی نرخ بەرز بکەرەوە (یەک pip بۆ جووتەکان و کانزاکان). ڕایبگرە بۆ دووبارەکردنەوە',
  mcNudgeDownA11y: 'وێنە هەڵبژێردراوەکە یەک هەنگاوی نرخ نزم بکەرەوە (یەک pip بۆ جووتەکان و کانزاکان). ڕایبگرە بۆ دووبارەکردنەوە',
  mcNudgeEarlierA11y: 'وێنە هەڵبژێردراوەکە یەک مۆم بەرەو کۆنتر ببە. ڕایبگرە بۆ دووبارەکردنەوە',
  mcNudgeLaterA11y: 'وێنە هەڵبژێردراوەکە یەک مۆم بەرەو نوێتر ببە. ڕایبگرە بۆ دووبارەکردنەوە',
  mcColorNames: ['ڕەنگی چوارچێوە', 'سەوز', 'سوور', 'پرتەقاڵی', 'شین', 'سپی'],
  mcShareDialogTitle: 'چارتی MATRIX',
  mcSessTokyo: 'تۆکیۆ',
  mcSessLondon: 'لەندەن',
  mcSessNewYork: 'نیویۆرک',
  mcPanesCollapsed: 'شاراوە',
  mcPanesCollapsedA11y: 'پانێڵی پێوەرەکان شاراونەتەوە: بەرزی چارتەکە بەشیان ناکات',
  mcPanesPageA11y: 'دەستی لێ بدە بۆ پیشاندانی پانێڵە شاراوەکان لە جیاتی ئەوانەی دیارن',
  mcSwitching: 'بارکردن…',
  mcSwitchingA11y: 'بارکردنی چارتی نوێ — ئەوەی پیشان دەدرێت داتای پێشووە',
  mcSyncTimeOn: 'هاوکاتکردنی کات',
  mcSyncTimeOff: 'بێ هاوکاتکردن',
  mcSyncLeadHint: 'دەست لە چارتێک بدە و ئەوانی تر کاتەکەی دوای دەکەون',
  mcSyncToggleA11y: 'هاوکاتکردنی کات لە نێوان چوار چارتەکە بکەوە یان بیکوژێنەوە',
  mcMeasureBarOne: 'مۆم',
  mcMeasureBarTwo: 'مۆم',
  // ئامرازەکانی شاشەی چارت (i18n، 2026-09-21)
  ssbPlaceholder: 'گەڕان بۆ هێما... EUR, XAU, BTC',
  ssbError: 'گەڕان ئێستا کار ناکات — لە پەیوەندییەکەتەوەیە یان لە دابینکەری داتا. کەمێکی تر هەوڵبدەرەوە',
  ssbNoMatch: 'هیچ هێمایەک لەگەڵ «{q}» ناگونجێت لای دابینکەری داتا — بەشێکی کورتتر تاقی بکەرەوە وەک EUR یان XAU یان BTC',
  ssbAmbiguousTag: 'لە چەند بۆرسەیەکدا تۆمارکراوە — هێشتا پشتگیری ناکرێت',
  ssbOnlyAmbiguous: '«{q}» لە زیاتر لە بۆرسەیەکدا تۆمارکراوە، و ئەپەکە هێشتا ناتوانێت دیاری بکات کامیان پیشان بدات — بۆیە ئێستا ناکرێتەوە',
  ssbPickA11yPrefix: 'دیاریکردنی هێما: ',
  smnTitle: 'پشکنینی خێرا',
  smnFilterMomentum: 'پاڵنە+',
  smnA11yMaCross: 'یەکتربڕینی مامناوەندی جوڵاو بەرەو سەرەوە',
  smnA11yRsiOversold: 'تێری فرۆشتن لە RSI',
  smnA11yBullish: 'پاڵنەی بەرزبوونەوە',
  domTitle: 'Bid / Ask · سپرێد',
  domBidLabel: 'Bid (فرۆشتن)',
  domAskLabel: 'Ask (کڕین)',
  domSpreadLabel: 'سپرێد',
  domBidAskHint: 'لەسەر Bid دەفرۆشیت و لەسەر Ask دەکڕیت — سپرێد تێچووی هەر مامەڵەیەکە.',
  domNoBidAsk: 'دابینکەر Bid/Ask بۆ ئەم هێمایە نییە — تەنها دوایین نرخ.',
  domNoLiveQuote: 'ئێستا نرخی زیندوو نییە — لەوانەیە بازاڕ داخرابێت (کۆتایی هەفتە) یان دابینکەری داتا وەڵام نەداتەوە. خۆکارانە دووبارە هەوڵ دەدرێتەوە.',
  domOtcNote: 'فۆرێکس بازاڕێکی ناناوەندییە: قووڵایی یەکگرتوو نییە، و سپرێدی ڕاستەقینە بەپێی بڕۆکەرەکەت دەگۆڕێت.',
  pdwPrevA11yPrefix: 'جووتی پێشوو: ',
  pdwCurrentA11yPrefix: 'دیاریکردنی جووتی ئێستا: ',
  pdwNextA11yPrefix: 'جووتی داهاتوو: ',
  // لا اختصار كردي شائع لـ«خولەک/کاتژمێر» ⇒ الرموز اللاتينية كمنصّة الوسيط؛ قارئ الشاشة يقرأ الكلمة كاملة (الكردية لا تجمع بعد العدد).
  tfLabels: { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1H': '1H', '4H': '4H', D: 'D', W: 'W' },
  tfLabelsA11y: {
    '1m': '1 خولەک',
    '5m': '5 خولەک',
    '15m': '15 خولەک',
    '30m': '30 خولەک',
    '1H': '1 کاتژمێر',
    '4H': '4 کاتژمێر',
    D: 'ڕۆژانە',
    W: 'هەفتانە',
  },
  subPlans: {
    title: 'پلانەکانی MATRIX',
    subtitle: 'بە چارت و کۆمەڵگە دەست پێ بکە؛ ئەکادیمیا و ئامرازەکانی تر کاتێک پێویستت بوو زیاد بکە',
    perMonth: '/ مانگانە',
    coreBadge: 'دەستپێک',
    academyBadge: '+ ئەکادیمیا',
    fullBadge: 'هەمووی',
    coreName: 'بنەڕەتی',
    academyName: 'ئەکادیمیا',
    fullName: 'تەواو',
    academyAddOn: '+5$ بۆ خولەکان',
    fullAddOn: '+5$ بۆ ئامرازەکانی تر',
    coreFeatures: [
      'هەموو جۆرەکانی مۆم و چارت',
      'هەموو چوارچێوەکان: چوارگۆشە، لاکێشە و سێبەر',
      'گفتوگۆی گرووپ و دەنگدان',
      'ڕۆژژمێری ئابووری، لیستی چاودێری و ئامرازەکانی هێڵکاری',
      'نیشاندەرەکان و چوارچێوە کاتییەکان',
    ],
    academyFeatures: [
      'هەموو ئەوەی لە پلانی بنەڕەتیدایە',
      'ئەکادیمیای تەواو: قوتابخانە، ئاست و وانە (وانەکان بە عەرەبین)',
      'پۆلی کارلێکەر — لە ناوەڕاستی وانەدا پرسیار لە مامۆستا بکە',
    ],
    fullFeatures: [
      'هەموو ئەوەی لە پلانی ئەکادیمیادایە',
      'یاریدەدەری AI، ئاگادارکردنەوە، پشکنەر و تاقیکردنەوەی پێشوو',
      'پێشبینی نیشاندەرەکان و ئامرازەکانی تر',
    ],
    note: 'پلانی بنەڕەتی مانگانە 10$ ـە بۆ چارت و کۆمەڵگە. 5$ زیاد بکە بۆ خولەکان، و 5$ی تر بۆ هەموو ئامرازەکانی تر.',
  },
  cppOpenA11y: 'کردنەوەی ڕاپۆرتی کۆمیسیۆن',
  cppCloseA11y: 'داخستنی ڕاپۆرتی کۆمیسیۆن',
  cppTitle: 'ڕاپۆرتی کۆمیسیۆن',
  cppSubOpen: 'خشتەی کۆمیسیۆن · قازانجی مانگانە',
  cppSubClosed: 'بۆ کردنەوەی ڕاپۆرتەکە تیرەکە دابگرە',
  cppLiveError: 'کۆمیسیۆنەکان لە ڕاژەکار بار نەبوون — خشتەکانی خوارەوە نموونەی نزیکن، نەک ژمارە ڕاستەقینەکانی تۆ',
  cppTableCommissions: 'خشتەی کۆمیسیۆن',
  cppColType: 'جۆر',
  cppColCondition: 'مەرج',
  cppColPoints: 'خاڵ',
  cppTableLevels: 'خشتەی ئاستەکان',
  cppColRole: 'ڕۆڵ',
  cppColLevels: 'ئاستەکان',
  cppTableMonthly: 'قازانجی مانگانە',
  cppColMonth: 'مانگ',
  cppColDirect: 'هێنان',
  cppColBalance: 'هاوسەنگی',
  cppColTotal: 'کۆی گشتی',
  cppNoEarnings: 'هێشتا هیچ قازانجێک تۆمار نەکراوە — کاتێک ئەندام لە دارەکەوە زیاد دەکەیت لێرە دەردەکەوێت',
  // بحاجة مراجعة ناطق كردي
  cppEarningsLoadError: 'قازانجەکانت بار نەبوون — پەیوەندییەکەت بپشکنە و «نوێکردنەوە» دابگرە',
  cppBasisNote: 'بنەمای ژماردن: {unit} خاڵ بۆ هەر ئەندامێک × ڕێژەی کۆمیسیۆن',
  cppTypeDirect: 'هێنانی ڕاستەوخۆ',
  cppTypeBalance: 'پاداشتی هاوسەنگی',
  cppTypeActiveBalanced: 'چالاک، هاوسەنگ',
  cppTypeActiveUnbalanced: 'چالاک، ناهاوسەنگ',
  cppCondNewMember: 'کاتێک ئەندامێکی نوێ زیاد دەکرێت',
  cppCondBalanced: 'ڕاست = چەپ',
  cppCondUnbalanced: 'ڕاست ≠ چەپ',
  ntpNamePlaceholder: 'ناوەکە بنووسە',
  ntpNameA11y: 'ناوی ئەندامی نوێ بۆ ئەم خانەیە — لانیکەم 3 پیت',
  ntpConfirmA11y: 'دانانی ئەندام لەم خانەیەدا',
  ntpLevelTitle: 'ئاستی {gen} · هەر لایەک 1–{n}',
  ntpNewBranches: ' · لقی نوێ',
  ntpLoadError: 'دارەکە بار نەبوو — پەیوەندییەکەت بپشکنە و «نوێکردنەوە» دابگرە',
  ntpPlaceError: 'ئەندامەکە دانەنرا — ناوەکە بەکارهاتووە، یان خانەکە پڕە، یان ناوەکە لە 3 پیت کورتترە',
  ntpOpenA11y: 'کردنەوەی داری تۆڕ',
  ntpCloseA11y: 'داخستنی داری تۆڕ',
  ntpTitle: 'داری تۆڕ',
  ntpSubLive: 'چەپ | ڕاست · ژمارەکردن لە 1ـەوە لە هەر لایەک',
  ntpSubPreview: 'پێشبینین · بۆ چالاککردن بچۆ ژوورەوە',
  ntpSubClosed: 'بۆ کردنەوەی دارەکە تیرەکە دابگرە',
  ntpYou: 'تۆ',
  ntpGuestHint: 'بچۆ ژوورەوە، پاشان ناوی ئەندام لەناو خانەیەکی ژمارەدار بنووسە.',
  ntpLevelBranches: '↓ لقەکانی ئاستی {gen}',
  ntpTrunkHint: 'هێڵی ڕەگ ↓',
  ntpYouRoot: 'تۆ · ڕەگ',
  tdsCaption: 'دارەکە چۆن گەشە دەکات · چەپ و ڕاست جیان',
  tdsLevel: 'ئاستی {gen} · هەر لایەک 1–{n}',
  tdsLevelOne: 'ئاستی 1 · یەک خانە لە هەر لایەک',
  tdsRootBottom: 'ڕەگ · خوارەوە',
  tdsFootnote: 'ژمارەکردن لە هەر لایەک لە 1ـەوە دەست پێ دەکات و چەپ لە ڕاست جیایە · ناوەکە تەنها لەناو خانەکەدا بنووسە',
  accNetLoadError: 'داتای تۆڕ و بانگهێشت بار نەبوو — دواتر هەوڵ بدەرەوە',
  accReplayTour: '↺ گەشتی ناساندن دووبارە ببینەوە',
  accReplayTourA11y: 'گەشتی ناساندن لە سەرەتاوە دووبارە پیشان بدەوە',
  a11yBusy: 'خەریکە، تکایە کەمێک چاوەڕێ بکە',
  calendarUnavailable: 'ڕۆژژمێر ئێستا بەردەست نییە — سەرچاوەی ڕووداوەکان وەڵامی نەدایەوە، ئەمەش مانای ئەوە نییە کە ئەمڕۆ هیچ هەواڵێک نییە. خۆی هەر 5 خولەک جارێک هەوڵ دەداتەوە',
  sigLevelsUnavailableNoPrice: 'هیچ ئاستێکی چوونەژوورەوە و وەستان و ئامانج نییە — ئێستا نرخی ڕاستەوخۆ نییە',
  sigLevelsUnavailableFewCandles: 'هیچ ئاستێکی چوونەژوورەوە و وەستان و ئامانج نییە — مۆمەکان کەمن بۆ پێوانی مەودا (ATR)',
  sigLevelsUnavailableAtrWide: 'هیچ ئاستێکی چوونەژوورەوە و وەستان و ئامانج نییە — مەودا (ATR) لە خودی نرخەکە فراوانترە',
  sigLevelsUnavailableNeutral: 'هیچ ئاستێکی چوونەژوورەوە و وەستان و ئامانج نییە — ئاڕاستە بێلایەنە',
  sigLevelsUnavailableNoRange: 'هیچ ئاستێکی چوونەژوورەوە و وەستان و ئامانج نییە — نرخ لەم ماوەیەدا نەجووڵاوە، بۆیە هیچ مەودایەک (ATR) نییە بۆ پێوان',
  // بحاجة مراجعة ناطق كردي
  sigLevelsUnavailableAtrBelowTick: 'هیچ ئاستێکی چوونەژوورەوە و وەستان و ئامانج نییە — مەودا (ATR) لە بچووکترین هەنگاوی نرخ بچووکترە، بۆیە وەستان دەکەوێتە سەر خودی چوونەژوورەوە. تایم‌فرەیمێکی درێژتر تاقی بکەرەوە',
  journalStatBreakeven: 'بێ قازانج و زیان: {n} (لە ڕێژەی سەرکەوتندا ناژمێردرێت)',
  journalShownOfTotal: '{shown} لە {total} مامەڵە پیشان دراوە — ئامارەکان هەموویان دەگرنەوە',
  journalLoadOlder: 'بارکردنی کۆنترەکان',
  journalSizeUnknown: 'قەبارە تۆمار نەکراوە',
  journalLoadOlderError: 'بارکردنی مامەڵە کۆنترەکان سەرکەوتوو نەبوو — پەیوەندییەکەت بپشکنە و دووبارە «بارکردنی کۆنترەکان» دابگرە. ئەوەی لەبەردەمتە نەگۆڕاوە.',
  // بحاجة مراجعة ناطق كردي (الاثنان أدناه)
  journalRetryBtn: 'دووبارە هەوڵبدەرەوە',
  journalLoadErrorRetry: 'نەکرا تۆمارەکە باربکرێت — پەیوەندییەکەت بپشکنە، پاشان «دووبارە هەوڵبدەرەوە» دابگرە. مامەڵە تۆمارکراوەکانت نەسڕاونەتەوە.',
  // بحاجة مراجعة ناطق كردي (الثلاثة أدناه)
  analystsUnavailable: 'هێشتا سەرچاوەیەکی مۆڵەتدار بۆ پێشبینییەکانی شیکەرەوان نییە — بۆیە ئاراستە و ئامانج پیشان نادەین لەجیاتی ئەوەی دایانبهێنین',
  socialUnavailable: 'هێشتا سەرچاوەیەکی مۆڵەتدار بۆ بۆچوونی کەناڵەکان نییە — بۆیە کۆدەنگی و مامەڵەی پێشنیارکراو پیشان نادەین لەجیاتی ئەوەی دایانبهێنین',
  riskCalcConvInverted: '«{typed}» ناتوانێت نرخی {pair} بێت — پێدەچێت پێچەوانە بێت (1 ÷ نرخ). لەوانەیە مەبەستت {likely} بێت؛ وەک لە پلاتفۆرمەکەتدا دەیبینیت بینووسە.',
  impactHoliday: 'پشوو — شلەیی کەم',
  newsHolidayToday: 'پشووی بانکەکان ئەمڕۆ · {ccy}{title} — شلەیی کەمتر: سپرێدی فراوانتر، و لەوانەیە خزان و بۆشایی هەبێت',
  backtestBeforeCosts: 'ئەنجامەکان پێش سپرێد و کۆمیسیۆنن — هیچ خەمڵاندنێکی سپرێد بۆ ئەم هێمایە نییە، بۆیە ئەنجامی ڕاستەقینە خراپتر دەبێت.',
  forecastDetail: {
    rsi_overbought: 'زۆر کڕدراو ({rsi})',
    rsi_oversold: 'زۆر فرۆشراو ({rsi})',
    rsi_bullish: 'تەوژمی ئەرێنی ({rsi})',
    rsi_bearish: 'تەوژمی نەرێنی ({rsi})',
    rsi_neutral: 'بێلایەن ({rsi})',
    ma_cross_up: 'MAی خێرا MAی هێواشی بەرەو سەرەوە بڕی',
    ma_cross_down: 'MAی خێرا MAی هێواشی بەرەو خوارەوە بڕی',
    ma_above: 'خێرا {fast} لە سەرووی هێواش {slow}',
    ma_below: 'خێرا {fast} لە خوارووی هێواش {slow}',
    macd_cross_up: 'هێڵی ئاماژەی بەرەو سەرەوە بڕی',
    macd_cross_down: 'هێڵی ئاماژەی بەرەو خوارەوە بڕی',
    macd_above: 'هێڵ {macd} لە سەرووی ئاماژە {signal}',
    macd_below: 'هێڵ {macd} لە خوارووی ئاماژە {signal}',
    bb_upper: 'نزیک سنووری سەرەوە',
    bb_lower: 'نزیک سنووری خوارەوە',
    bb_position: 'شوێنی لەناو باندەکەدا {pos}%',
    stoch_k: '%K≈{k}',
    trend_slope: 'دوایین 10 مۆم · {pct}%',
  },
  forecastVoteNames: { rsi: 'RSI 14', ma_cross: 'بڕینی MA', ma_trend: 'ئاراستەی MA', macd: 'MACD', bb: 'بۆلینجەر', stoch: 'Stochastic', trend: 'لاری نرخ' },
  forecastDisclaimerConsensus: 'کۆدەنگی پێوەرە تەکنیکییەکان لەناو MATRIX — گەرەنتی قازانج نییە.',
  forecastDisclaimerNoData: 'داتای پێویست نییە بۆ ژماردنی پێوەرە هەڵبژێردراوەکان — پێوەرێکی تر لە دوگمەکانی سەرەوە چالاک بکە؛ RSI و «ترێند» مێژوویەکی کورتتریان بەسە.',
  forecastDisclaimerNoMovement: 'نرخ لەم ماوەیەدا نەجووڵاوە — لەوانەیە بازاڕ داخرابێت، بۆیە پێوەرەکان هیچ ئاڕاستەیەک نابینن. چوارچێوەیەکی درێژتر تاقی بکەرەوە یان کاتی کردنەوەی بازاڕ بگەڕێوە.',
  dsKindUnavailable: 'بەردەست نییە',
  chartNotOfferedTitle: '{symbol} لەلایەن دابینکەری داتاوە پێشکەش ناکرێت',
  chartNotOfferedBody: 'هیچ مۆم و نرخێکی بۆ ناکێشین تا ژمارەی دروستکراو نەخوێنیتەوە. ناوی هێماکە ▾ لە سەرووی نەخشەکە دابگرە بۆ هەڵبژاردنی جووتێکی تر.',
  chartNoCandlesTitle: 'ئێستا هیچ مۆمێک بۆ {symbol} لەسەر کاتی چوارچێوەی {tf} نییە',
  chartNoCandlesBody: 'دابینکەری داتا هیچ مۆمێکی بۆ ئەم کاتی چوارچێوەیە نەگەڕاندەوە. کاتی چوارچێوەیەکی تر تاقی بکەرەوە، یان کەمێکی تر بگەڕێوە.',
  chartFirstLoad: 'مۆمەکانی {symbol} لەسەر کاتی چوارچێوەی {tf} بار دەکرێن…',
  chartProviderDownTitle: 'ئێستا ناتوانرێت مۆمەکانی {symbol} لە دابینکەری داتا وەربگیرێن',
  chartProviderDownBody: 'پەیوەندی لەگەڵ دابینکەری داتا سەرکەوتوو نەبوو — زۆرجار کاتییە. لەم ماوەیەدا هیچ مۆمێکی خەمڵێنراو ناکێشین تا نرخی ناڕاستەقینە نەخوێنیتەوە. دوای چەند خولەکێک دووبارە هەوڵ بدەرەوە.',
  chartServerUnreachableTitle: 'مۆمەکانی {symbol} بار نەکران — پەیوەندی بە ڕاژەی MATRIX نییە',
  chartServerUnreachableBody: 'پەیوەندی ئینتەرنێتەکەت بپشکنە، پاشان دووبارە هەوڵ بدەرەوە. لەم ماوەیەدا هیچ مۆمێکی خەمڵێنراو ناکێشین تا نرخی ناڕاستەقینە نەخوێنیتەوە.',
};

export const DICTS: Record<LangId, Dict> = {
  ar,
  'en-US': enUS,
  'en-GB': enGB,
  ku,
};

export function isRtl(lang: LangId): boolean {
  return LANGS.find((l) => l.id === lang)?.rtl ?? true;
}

/**
 * مفتاح AsyncStorage لاختيار اللغة الصريح. مصدر واحد: `I18nContext` يحفظ به و`notifications.ts` يقرؤه ليُرسل
 * لغة التنبيهات مع توكن الـPush — نسختان حرفيّتان تنحرفان بصمت عند أول تغيير لإحداهما (التنبيهات بلغة قديمة).
 */
export const LANG_STORAGE_KEY = 'matrix.lang.v1';

/**
 * اللغة المعروضة: اختيار المتداول المحفوظ إن كان لغةً ندعمها، وإلا لغة الجهاز — ckb/ku ⇒ ku، en-GB ⇒ en-GB،
 * en* ⇒ en-US، غيرها ⇒ ar (جمهور MATRIX الأول). مصدر واحد للقاعدة: الواجهة (`I18nContext`) وقناة الإشعارات
 * وتوكن الـPush (`notifications.ts`) يجب أن تتّفق، وإلا رأى صاحب الهاتف الإنجليزي واجهةً إنجليزية وتنبيهاتٍ عربية.
 */
export function resolveLang(saved: string | null | undefined, deviceTag: string | undefined): LangId {
  if (saved && saved in DICTS) return saved as LangId;
  const tag = (deviceTag ?? '').toLowerCase();
  if (tag.startsWith('ckb') || tag.startsWith('ku')) return 'ku';
  if (tag === 'en-gb' || tag.startsWith('en-gb-')) return 'en-GB';
  if (tag.startsWith('en')) return 'en-US';
  return 'ar';
}

/** وسم لغة الجهاز من `Intl` (بلا تبعية جديدة)؛ `undefined` إن غاب `Intl`. */
export function deviceLocaleTag(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}
