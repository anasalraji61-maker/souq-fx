export type LangId = 'ar' | 'en-US' | 'en-GB' | 'ku';

export type Dict = {
  langName: string;
  accountTitle: string;
  accountSub: string;
  tabHome: string;
  tabTools: string;
  tabAcademy: string;
  tabMessages: string;
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
  accountType: string;
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
  registerError: string;
  language: string;
  commissionsReport: string;
  networkTree: string;
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
  restartRequiredTitle: string;
  restartRequiredBody: string;
  restartRequiredBtn: string;
  onboardStep1Title: string;
  onboardStep1Body: string;
  onboardStep2Title: string;
  onboardStep2Body: string;
  onboardStep3Title: string;
  onboardStep3Body: string;
  onboardStep4Title: string;
  onboardStep4Body: string;
  onboardSkip: string;
  onboardNext: string;
  onboardStart: string;
  // ToolsScreen + الثمانية لوحات hub (أخبار/اجتماعي/دردشة/تصويت/AI/محللون/توقعات/تنبيهات) — 2026-09-17
  dirBuy: string;
  dirSell: string;
  dirNeutral: string;
  confidenceLabel: string;
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
  newsTitle: string;
  newsStale: string;
  newsEmpty: string;
  aiPanelTitle: string;
  aiGreeting: string;
  aiOfflineFallback: string;
  aiWinEstimate: string;
  aiWinDisclaimer: string;
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
  chatSendError: string;
  chatYou: string;
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
  voteCastError: string;
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
  forecastError: string;
  alertsTitle: string;
  alertsSub: string;
  alertsPushTitle: string;
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
  reportWinLabel: string;
  reportJournalDataLine: string;
  reportJournalEmptyLine: string;
  reportFallbackWeekly: string;
  reportFallbackPerformance: string;
  reportFallbackRisk: string;
  reportFallbackAdvice: string;
  journalTitle: string;
  journalSub: string;
  journalStatClosed: string;
  journalStatWinRate: string;
  journalStatTotalPnl: string;
  journalStatBestWorst: string;
  journalSideA11yPrefix: string;
  journalSymbolPlaceholder: string;
  journalSymbolA11y: string;
  journalEntryPlaceholder: string;
  journalEntryA11y: string;
  journalExitPlaceholder: string;
  journalExitA11y: string;
  journalNotePlaceholder: string;
  journalNoteA11y: string;
  journalAddA11y: string;
  journalAddBtn: string;
  journalAddError: string;
  journalCloseFailedTitle: string;
  journalCloseFailedBody: string;
  journalLoadError: string;
  journalEmpty: string;
  journalOpenSuffix: string;
  journalCloseLinkA11y: string;
  journalCloseLinkBtn: string;
  backtestSub: string;
  backtestSymbolA11y: string;
  backtestStrategyA11yPrefix: string;
  backtestRunA11y: string;
  backtestRunBtn: string;
  backtestRunError: string;
  backtestStatTrades: string;
  backtestStatWinRate: string;
  backtestStatReturn: string;
  backtestStatEquity: string;
  backtestStatDrawdown: string;
  backtestStatAvgWinLoss: string;
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
  calendarTitle: string;
  calendarCurrencyA11yPrefix: string;
  calendarAllWord: string;
  calendarImpactA11yPrefix: string;
  calendarAllShort: string;
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
  layoutDeleteA11yPrefix: string;
  coursesTitle: string;
  coursesSub: string;
  coursesStaleNote: string;
  coursesNoteTitle: string;
  coursesNoteText: string;
  coursesSchoolA11yPrefix: string;
  coursesLevelsWord: string;
  coursesLecturesUnitWord: string;
  coursesVoiceWord: string;
  coursesAudioLabel: string;
  coursesFallbackNote: string;
  coursesLevelWord: string;
  coursesLectureA11yPrefix: string;
  coursesMinuteWord: string;
  coursesMinuteAbbrev: string;
  coursesFullLectureWord: string;
  coursesBackToSchoolsA11y: string;
  coursesBack: string;
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
  focusInComparisonSuffix: string;
  focusAlertCreateFailedTitle: string;
  focusAlertCreateFailedBody: string;
  focusAlertFromDrawingNote: string;
  gridFramesWord: string;
  gridSquaresWord: string;
  gridSquaresA11y: string;
  gridRectanglesWord: string;
  gridRectanglesA11y: string;
};

export const LANGS: { id: LangId; label: string; rtl: boolean }[] = [
  { id: 'ar', label: 'العربية', rtl: true },
  { id: 'en-US', label: 'English (US)', rtl: false },
  { id: 'en-GB', label: 'English (UK)', rtl: false },
  { id: 'ku', label: 'کوردی', rtl: true },
];

const ar: Dict = {
  langName: 'العربية',
  accountTitle: 'حساب MATRIX',
  accountSub: 'مزامنة · أكاديمية · عمولات الشبكة الثنائية',
  tabHome: 'الرئيسية',
  tabTools: 'أدوات',
  tabAcademy: 'أكاديمية',
  tabMessages: 'رسائل',
  tabAccount: 'حساب',
  login: 'دخول',
  register: 'تسجيل',
  name: 'الاسم',
  namePlaceholder: 'اسم المستخدم',
  email: 'الإيميل',
  emailPlaceholder: 'name@example.com',
  password: 'باسوورد',
  passwordPlaceholder: 'باسوورد',
  enter: 'دخول',
  createAccount: 'إنشاء حساب',
  logout: 'تسجيل خروج',
  hello: 'مرحباً',
  accountType: 'نوع الحساب',
  sponsorCode: 'رمز الكفيل (اختياري)',
  underSponsor: 'الطرف تحت الكفيل',
  left: 'يسار',
  right: 'يمين',
  trader: 'متداول',
  trainer: 'مدرب',
  broker: 'بروكر',
  agent: 'وكيل',
  company: 'شركة',
  loginError: 'تعذر الدخول — تحقق من الاسم/الإيميل والباسوورد',
  registerError: 'تعذر التسجيل — تحقق من الإيميل والبيانات ورمز الكفيل',
  language: 'اللغة',
  commissionsReport: 'تقرير العمولات',
  networkTree: 'شجرة الشبكة',
  deleteAccount: 'حذف الحساب',
  deleteAccountConfirmTitle: 'حذف الحساب نهائياً؟',
  deleteAccountConfirmBody:
    'سيُحذف اسم المستخدم والإيميل وكلمة المرور نهائياً ولن تقدر تسجّل الدخول بهذا الحساب مرة أخرى. هذا الإجراء لا يمكن التراجع عنه.',
  deleteAccountConfirmBtn: 'حذف نهائياً',
  deleteAccountError: 'تعذر حذف الحساب — حاول لاحقاً',
  cancel: 'إلغاء',
  notifications: 'الإشعارات',
  notifStatusGranted: 'مفعّلة',
  notifStatusDenied: 'مرفوضة من إعدادات الجهاز',
  notifStatusUndetermined: 'تحتاج إذن',
  notifStatusUnsupported: 'غير مدعومة على الويب',
  notifEnableBtn: 'تفعيل الإشعارات',
  notifOpenSettingsBtn: 'فتح إعدادات الجهاز',
  restartRequiredTitle: 'يلزم إعادة تشغيل التطبيق',
  restartRequiredBody:
    'تم تغيير اللغة. أغلق التطبيق وأعد فتحه لتطبيق اتجاه الواجهة (يمين/يسار) بالكامل على كل الشاشات.',
  restartRequiredBtn: 'حسناً',
  onboardStep1Title: 'فريمات متعددة',
  onboardStep1Body:
    'افتح حتى أربع شارتات معاً وقارن بين الأزواج والأطر الزمنية بلمسة واحدة، مع تخطيط 2×2 وفريم بملء الشاشة.',
  onboardStep2Title: 'أدوات الرسم',
  onboardStep2Body:
    'تبويب «رسم» بالشريط السفلي يفتح لك خطوط الترند وفيبوناتشي والمستطيلات وباقي أدوات التحليل الفني مباشرة على الشارت.',
  onboardStep3Title: 'المؤشرات والعدسات',
  onboardStep3Body:
    'اختر من عشرات المؤشرات الجاهزة (RSI, MACD, بولنجر وغيرها)، أو فعّل عدسة جاهزة تلخّص حالة السوق بنظرة واحدة.',
  onboardStep4Title: 'التنبيهات',
  onboardStep4Body:
    'أنشئ تنبيه سعر أو مؤشر وسيصلك إشعار فوري على جهازك أينما كنت — لا حاجة لمراقبة الشارت طوال الوقت.',
  onboardSkip: 'تخطي',
  onboardNext: 'التالي',
  onboardStart: 'ابدأ',
  dirBuy: 'شراء',
  dirSell: 'بيع',
  dirNeutral: 'محايد',
  confidenceLabel: 'ثقة',
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
  toolsTabHub: 'إشارات ومجتمع',
  toolsTabReports: 'تقارير',
  toolsTabJournal: 'PnL',
  toolsTabScreener: 'فحص',
  toolsTabBacktest: 'Backtest',
  toolsTabIndAlerts: 'تنبيهات+',
  toolsTabCalendar: 'تقويم',
  toolsTabLayouts: 'تخطيط',
  toolsTabAi: 'AI',
  a11yTabPrefix: 'تبويب',
  a11ySignalSymbolPrefix: 'رمز الإشارة',
  toolsHubCommunity: 'مجتمع وأخبار',
  toolsHubAnalysis: 'تحليل وتنبيهات',
  a11yHubSectionPrefix: 'قسم لوحات',
  toolsGridHint: 'اسحب النقاط لإعادة ترتيب لوحات هذا القسم',
  toolsFiltersLabel: 'الفلاتر',
  filterMaUpLabel: 'MA صعودي',
  filterMaUpHint: 'السعر تجاوز متوسطه المتحرك للأعلى',
  filterMaDownLabel: 'MA هبوطي',
  filterMaDownHint: 'السعر تجاوز متوسطه المتحرك للأسفل',
  filterRsiOversoldLabel: 'RSI oversold',
  filterRsiOversoldHint: 'تشبّع بيعي — قد يرتد صعوداً',
  filterRsiOverboughtLabel: 'RSI overbought',
  filterRsiOverboughtHint: 'تشبّع شرائي — قد يرتد هبوطاً',
  filterMacdUpLabel: 'MACD up',
  filterMacdUpHint: 'تقاطع MACD صاعد — زخم إيجابي جديد',
  filterBullishLabel: 'زخم +',
  filterBullishHint: 'زخم سعري إيجابي عام',
  filterBearishLabel: 'زخم -',
  filterBearishHint: 'زخم سعري سلبي عام',
  a11yFilterPrefix: 'فلتر',
  screenerRunning: 'جاري الفحص...',
  screenerRunBtn: 'تشغيل Screener',
  screenerRunNeedFilter: 'تشغيل Screener، اختر فلتراً أولاً',
  screenerNeedApiKey: 'الفحص يحتاج مفتاح Twelve Data مفعّلاً على الخادم',
  screenerNoResults: 'لا نتائج مطابقة للفلاتر الحالية',
  screenerFailed: 'تعذر تشغيل الفحص — تحقق من الاتصال وحاول مرة أخرى',
  newsTitle: 'أخبار مؤثرة على الفوركس',
  newsStale: 'تعذر تحديث الأخبار — تُعرض بيانات محفوظة',
  newsEmpty: 'لا توجد أخبار حالياً',
  aiPanelTitle: 'مساعد ذكاء اصطناعي',
  aiGreeting: 'أنا خبير تداول MATRIX. اسأل عن تحليل، سيناريو صفقة، إدارة مخاطر، أو علاقة الزوج بـ DXY.',
  aiOfflineFallback:
    'تعذر الاتصال بالخادم. تأكد أن Backend يعمل على المنفذ 8100.\n\nتحليل محلي سريع: راقب DXY قبل أي دخول على أزواج الدولار، واستخدم وقف واضح بنسبة مخاطرة ≤ 1%.',
  aiWinEstimate: 'توقع نجاح تقديري: {pct}%',
  aiWinDisclaimer: 'تقدير إحصائي وليس ضماناً — أدر مخاطرك دوماً',
  aiInputPlaceholder: 'مثال: تحليل {symbol} اليوم؟',
  aiInputA11y: 'سؤال لمساعد الذكاء الاصطناعي',
  aiSendA11y: 'إرسال سؤال لمساعد الذكاء الاصطناعي',
  aiAskBtn: 'اسأل',
  analystsTitle: 'توقعات المحللين',
  analystsSubSuffix: 'إجماع بيوت بحث',
  analystsRefreshA11y: 'تحديث توقعات المحللين',
  analystsLoadError: 'تعذر تحميل توقعات المحللين',
  socialPlatformTelegram: 'تيليجرام',
  socialPlatformFacebook: 'فيسبوك',
  socialPlatformInstagram: 'إنستغرام',
  socialPlatformX: 'X',
  socialPlatformYoutube: 'يوتيوب',
  socialPlatformDiscord: 'ديسكورد',
  socialPlatformApp: 'تطبيق',
  socialComputeA11y: 'احسب إجماع المصادر المختارة',
  socialComputeBtn: 'احسب',
  socialTitle: 'المعدل التقريبي للتوصيات والصفقات',
  socialSub: 'تيليجرام · فيسبوك · إنستغرام · X · تطبيقات',
  socialPickHint: 'اختر المصادر التي تتابعها — ثم يُحسب المعدل العام',
  socialSourcesError: 'تعذر تحميل قائمة المصادر — تحقق من الاتصال',
  a11ySourcePrefix: 'مصدر',
  sourcesCountLabel: 'مصادر',
  suggestedTradeLabel: 'صفقة مقترحة',
  socialNoClearTrade: 'لا صفقة واضحة — الآراء متضاربة أو محايدة',
  socialComputeError: 'تعذر حساب إجماع القنوات',
  chatTitle: 'دردشة جماعية',
  chatLoadError: 'تعذر تحميل الرسائل — تُعرض رسائل محفوظة',
  chatEmpty: 'لا توجد رسائل بعد — كن أول من يكتب',
  chatSendError: 'تعذر إرسال رسالتك للمجموعة — قد لا تصل، حاول لاحقاً',
  chatYou: 'أنت',
  chatInputPlaceholder: 'اكتب رسالة...',
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
  voteLoadError: 'تعذر تحديث التصويتات — تُعرض بيانات محفوظة',
  voteEmpty: 'لا توجد تصويتات نشطة حالياً',
  voteByAuthor: 'بواسطة {author}',
  voteApprovalLabel: 'موافقة',
  voteAgreeWord: 'موافق',
  voteDisagreeWord: 'رافض',
  voteCastError: 'تعذر إرسال صوتك للخادم — قد لا يُحتسب، حاول لاحقاً',
  voteAgreeA11yPrefix: 'موافقة على فكرة',
  voteDisagreeA11yPrefix: 'رفض فكرة',
  indicatorBollinger: 'بولنجر',
  indicatorTrend: 'ميل',
  forecastRunA11y: 'توقّع المؤشرات',
  forecastRunBtn: 'توقّع',
  forecastTitle: 'توقعات المؤشرات',
  forecastAvgLabel: 'معدل مؤشرات',
  forecastTradeLabel: 'صفقة',
  forecastNoSignal: 'لا إشارة قوية — انتظر تأكيد المؤشرات',
  forecastError: 'تعذر حساب توقعات المؤشرات',
  alertsTitle: 'تنبيهات السعر',
  alertsSub: 'فوق / تحت · Twelve Data · إشعار عند التفعيل',
  alertsPushTitle: 'MATRIX · تنبيه سعر',
  alertsSymbolA11y: 'رمز الأداة للتنبيه',
  alertsPriceA11y: 'سعر التنبيه',
  alertsAboveConditionA11y: 'شرط التنبيه: فوق السعر',
  alertsBelowConditionA11y: 'شرط التنبيه: تحت السعر',
  alertsAddA11y: 'إضافة تنبيه سعر',
  alertsNotePlaceholder: 'ملاحظة (اختياري)',
  alertsNoteA11y: 'ملاحظة التنبيه (اختياري)',
  alertsAddError: 'تعذر إضافة التنبيه — تحقق من الاتصال وحاول مرة أخرى',
  alertsFirstBadge: '🎉 أول تنبيه مضبوط — سنُعلمك فور وصول السعر',
  alertsLoadError: 'تعذر تحميل التنبيهات',
  alertsEmpty: 'لا تنبيهات بعد',
  alertsDeleteConfirmTitle: 'حذف التنبيه؟',
  alertsDeleteFailedTitle: 'تعذر الحذف',
  alertsDeleteFailedBody: 'حدث خطأ أثناء حذف التنبيه، حاول مرة أخرى.',
  alertsDeleteA11yPrefix: 'حذف تنبيه',
  reportsTitle: 'تقارير MATRIX',
  reportsSubGrid: 'نفس حجم الفريمات · قدّم/أخّر · اضغط للقراءة',
  reportsSub: 'أسبوعي · أداء · رأي المنصة ونصائح',
  reportWeeklyTitle: 'تقرير أسبوعي',
  reportWeeklyHint: 'أرباح وخسائر',
  reportPerformanceTitle: 'تقرير أداء',
  reportPerformanceHint: 'انضباط وتنفيذ',
  reportAdviceTitle: 'رأي MATRIX',
  reportAdviceHint: 'نصائح الأسبوع',
  reportRiskTitle: 'موجز مخاطر',
  reportRiskHint: 'إدارة رأس المال',
  reportOpenWord: 'مفتوح ↓',
  reportAiFallbackNote: 'تعذر الاتصال بالذكاء الاصطناعي — هذا قالب عام بدل تحليل مخصَّص',
  reportWinLabel: 'ثقة تقديرية للسيناريو: {pct}%',
  reportJournalDataLine:
    'بيانات دفتر الصفقات الفعلية: صفقات={trades} نجاح={winRate}% PnL={pnl}% أفضل={best}% أسوأ={worst}%. اعتمد عليها في التقرير.',
  reportJournalEmptyLine: '(لا توجد صفقات مسجّلة بعد في الدفتر).',
  reportFallbackWeekly: 'تقرير من دفتر الصفقات{journalLine}\nسجّل صفقاتك في تبويب PnL لبناء تقرير أدق.',
  reportFallbackPerformance: 'تقييم مبني على الدفتر{journalLine}',
  reportFallbackRisk: 'موجز مخاطر{journalLine}\n1) مخاطرة ≤1%.\n2) وقف واضح.\n3) تجنّب الأخبار الثقيلة.',
  reportFallbackAdvice:
    'نصائح MATRIX{journalLine}\n1) راجع صفقاتك المفتوحة.\n2) اربط الدخول بـ DXY.\n3) مخاطرة ≤1%.\n4) تجنّب الأخبار عالية التأثير.\n5) ركّز على 2–3 أزواج.',
  journalTitle: 'دفتر الصفقات · PnL حقيقي',
  journalSub: 'سجّل صفقاتك — التقارير تُبنى من يوميتك',
  journalStatClosed: 'صفقات مغلقة: {n}',
  journalStatWinRate: 'نسبة نجاح: {pct}%',
  journalStatTotalPnl: 'إجمالي PnL: {pct}%',
  journalStatBestWorst: 'أفضل/أسوأ: {best}% / {worst}%',
  journalSideA11yPrefix: 'اتجاه الصفقة',
  journalSymbolPlaceholder: 'الرمز',
  journalSymbolA11y: 'رمز الصفقة',
  journalEntryPlaceholder: 'دخول',
  journalEntryA11y: 'سعر الدخول',
  journalExitPlaceholder: 'خروج (اختياري)',
  journalExitA11y: 'سعر الخروج (اختياري)',
  journalNotePlaceholder: 'ملاحظة',
  journalNoteA11y: 'ملاحظة الصفقة (اختياري)',
  journalAddA11y: 'إضافة صفقة جديدة',
  journalAddBtn: 'إضافة صفقة',
  journalAddError: 'تعذر إضافة الصفقة — تحقق من الاتصال وحاول مرة أخرى',
  journalCloseFailedTitle: 'تعذر الإغلاق',
  journalCloseFailedBody: 'حدث خطأ أثناء إغلاق الصفقة، حاول مرة أخرى.',
  journalLoadError: 'تعذر تحميل السجل',
  journalEmpty: 'لا صفقات مسجّلة بعد',
  journalOpenSuffix: '(مفتوحة)',
  journalCloseLinkA11y: 'إغلاق صفقة {symbol} بسعر خانة الخروج',
  journalCloseLinkBtn: 'إغلاق بسعر خانة الخروج',
  backtestSub: 'MA · RSI · MACD · BB · منحنى Equity',
  backtestSymbolA11y: 'رمز الأداة للاختبار الخلفي',
  backtestStrategyA11yPrefix: 'استراتيجية',
  backtestRunA11y: 'تشغيل الاختبار الخلفي',
  backtestRunBtn: 'تشغيل Backtest',
  backtestRunError: 'تعذر تشغيل الاختبار الخلفي — تحقق من الاتصال وحاول مرة أخرى',
  backtestStatTrades: 'صفقات: {n}',
  backtestStatWinRate: 'نسبة نجاح: {pct}%',
  backtestStatReturn: 'عائد إجمالي: {pct}%',
  backtestStatEquity: 'Equity نهائي: {v}',
  backtestStatDrawdown: 'أقصى هبوط: {pct}%',
  backtestStatAvgWinLoss: 'متوسط ربح/خسارة: {win}% / {loss}%',
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
  indAlertsAddA11y: 'إضافة تنبيه مؤشر',
  indAlertsAddBtn: 'إضافة تنبيه',
  indAlertsAddError: 'تعذر إضافة تنبيه المؤشر — تحقق من الاتصال وحاول مرة أخرى',
  indAlertsLoadError: 'تعذر تحميل تنبيهات المؤشرات',
  indAlertsEmpty: 'لا تنبيهات مؤشرات بعد',
  indAlertsDeleteConfirmTitle: 'حذف تنبيه المؤشر؟',
  indAlertsDeleteFailedTitle: 'تعذر الحذف',
  indAlertsDeleteFailedBody: 'حدث خطأ أثناء حذف تنبيه المؤشر، حاول مرة أخرى.',
  indAlertsDeleteA11yPrefix: 'حذف تنبيه مؤشر',
  indAlertsPushTitle: 'MATRIX · تنبيه مؤشر',
  calendarTitle: 'تقويم اقتصادي · حي',
  calendarCurrencyA11yPrefix: 'تصفية حسب العملة',
  calendarAllWord: 'الكل',
  calendarImpactA11yPrefix: 'تصفية حسب الأهمية',
  calendarAllShort: 'كل',
  calendarLoading: 'جاري تحميل التقويم…',
  calendarLoadError: 'تعذر تحميل التقويم — تحقق من الاتصال',
  calendarEmpty: 'لا أحداث بهذا الفلتر',
  layoutDefaultName: 'تخطيطي',
  layoutFallbackName: 'تخطيط',
  layoutsTitle: 'تخطيطات محفوظة',
  layoutNamePlaceholder: 'اسم التخطيط',
  layoutNameA11y: 'اسم التخطيط',
  layoutSaveA11y: 'حفظ التخطيط الحالي',
  layoutSaveBtn: 'حفظ التخطيط الحالي',
  layoutApplyA11yPrefix: 'تطبيق تخطيط',
  layoutDeleteConfirmTitle: 'حذف التخطيط؟',
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
  coursesVoiceWord: 'صوت',
  coursesAudioLabel: 'الصوت',
  coursesFallbackNote: 'تعذر تحميل المنهج الكامل — تُعرض محاضرة افتتاحية مؤقتة فقط',
  coursesLevelWord: 'المستوى',
  coursesLectureA11yPrefix: 'محاضرة',
  coursesMinuteWord: 'دقيقة',
  coursesMinuteAbbrev: 'د',
  coursesFullLectureWord: 'محاضرة كاملة',
  coursesBackToSchoolsA11y: 'رجوع لقائمة المدارس',
  coursesBack: 'رجوع',
  lectureClose: 'إغلاق',
  lectureCloseA11y: 'إغلاق المحاضرة',
  lectureLevelWord: 'مستوى',
  lectureLoadFailedNote: 'تعذر تحميل هذه المحاضرة — يُعرض محتوى تجريبي عام بدلاً منها',
  lectureFullScreenTag: 'شاشة كاملة',
  lectureVoicePausedForQ: 'متوقف للسؤال',
  lecturePreparingVoice: 'يجهّز الصوت...',
  lectureExplainingNow: 'يشرح الآن',
  lectureVoicePlayError: 'تعذر تشغيل الصوت',
  lectureChartLabel: 'شارت تفاعلي',
  lectureHideChart: 'إخفاء',
  lectureHideChartA11y: 'إخفاء الشارت التفاعلي',
  lectureShowChart: 'إظهار الشارت التفاعلي',
  lectureVoiceStopped: 'الصوت متوقف',
  lectureGenerating: 'جاري التوليد',
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
  lectureQuestionPlaceholder: 'مثال: لم أفهم CHOCH...',
  lectureQuestionA11y: 'سؤال أثناء إيقاف الشرح',
  lectureAskBtn: 'اسأل',
  lectureAskA11y: 'إرسال السؤال',
  termShadowSizeSmall: 'صغير',
  termShadowSizeMedium: 'وسط',
  termShadowSizeBig: 'كبير',
  termServerOnline: 'خادم متصل',
  termServerOffline: 'خادم غير متصل',
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
  termTimeSyncUnavailable: 'المزامنة غير متاحة في فريم الظل',
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
  termSquareFramesHintSuffix: 'فريمات مربعة · امسك كل مربع لتبديل مكانه · المؤشرات اختيارية',
  termHintMoveText:
    'التوقعات · التنبيهات · الأخبار · المجتمع → أدوات · امسك الشريط واسحب لتبديل أماكن الفريمات',
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
  wlLoadError: 'تعذر تحميل قائمة المتابعة',
  wlRetryA11y: 'إعادة محاولة تحميل قائمة المتابعة',
  wlRetryBtn: 'إعادة المحاولة',
  wlLoadingWord: 'جاري التحميل…',
  wlEmpty: 'لا رموز في المتابعة',
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
  focusCompareHint: 'اضغط مطولاً للمقارنة',
  focusCompareTag: 'مقارنة',
  focusPickSymbolA11yPrefix: 'اختيار الرمز',
  focusCompareNotePrefix: 'مقارنة مع',
  focusCompareNoteSuffix: '(بنفسجي)',
  focusInComparisonSuffix: ' · قيد المقارنة',
  focusAlertCreateFailedTitle: 'تعذر إنشاء التنبيه',
  focusAlertCreateFailedBody: 'حدث خطأ أثناء إنشاء تنبيه من خط الرسم، حاول مرة أخرى.',
  focusAlertFromDrawingNote: 'من خط رسم',
  gridFramesWord: 'الفريمات',
  gridSquaresWord: 'المربعات',
  gridSquaresA11y: 'عرض الفريمات كمربعات',
  gridRectanglesWord: 'المستطيلات',
  gridRectanglesA11y: 'عرض الفريمات كمستطيلات',
};

const enUS: Dict = {
  langName: 'English (US)',
  accountTitle: 'MATRIX Account',
  accountSub: 'Sync · Academy · Binary network commissions',
  tabHome: 'Home',
  tabTools: 'Tools',
  tabAcademy: 'Academy',
  tabMessages: 'Messages',
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
  accountType: 'Account type',
  sponsorCode: 'Sponsor code (optional)',
  underSponsor: 'Side under sponsor',
  left: 'Left',
  right: 'Right',
  trader: 'Trader',
  trainer: 'Trainer',
  broker: 'Broker',
  agent: 'Agent',
  company: 'Company',
  loginError: 'Login failed — check name/email and password',
  registerError: 'Sign-up failed — check email, details, and sponsor code',
  language: 'Language',
  commissionsReport: 'Commissions report',
  networkTree: 'Network tree',
  deleteAccount: 'Delete account',
  deleteAccountConfirmTitle: 'Delete account permanently?',
  deleteAccountConfirmBody:
    'Your username, email, and password will be permanently erased and you will not be able to sign back into this account. This cannot be undone.',
  deleteAccountConfirmBtn: 'Delete permanently',
  deleteAccountError: 'Could not delete account — try again later',
  cancel: 'Cancel',
  notifications: 'Notifications',
  notifStatusGranted: 'Enabled',
  notifStatusDenied: 'Blocked in device settings',
  notifStatusUndetermined: 'Needs permission',
  notifStatusUnsupported: 'Not supported on web',
  notifEnableBtn: 'Enable notifications',
  notifOpenSettingsBtn: 'Open device settings',
  restartRequiredTitle: 'Restart required',
  restartRequiredBody:
    'Language changed. Close and reopen the app to fully apply the new layout direction across all screens.',
  restartRequiredBtn: 'OK',
  onboardStep1Title: 'Multiple frames',
  onboardStep1Body:
    'Open up to four charts at once and compare pairs and timeframes in one tap, with a 2x2 layout and a full-screen frame.',
  onboardStep2Title: 'Drawing tools',
  onboardStep2Body:
    'The Draw tab in the bottom bar opens trend lines, Fibonacci, rectangles, and more analysis tools right on the chart.',
  onboardStep3Title: 'Indicators & lenses',
  onboardStep3Body:
    'Choose from dozens of ready indicators (RSI, MACD, Bollinger, and more), or turn on a lens that summarizes market state at a glance.',
  onboardStep4Title: 'Alerts',
  onboardStep4Body:
    'Create a price or indicator alert and get an instant notification on your device — no need to watch the chart all day.',
  onboardSkip: 'Skip',
  onboardNext: 'Next',
  onboardStart: 'Start',
  dirBuy: 'Buy',
  dirSell: 'Sell',
  dirNeutral: 'Neutral',
  confidenceLabel: 'Confidence',
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
  toolsTabHub: 'Signals & community',
  toolsTabReports: 'Reports',
  toolsTabJournal: 'PnL',
  toolsTabScreener: 'Screener',
  toolsTabBacktest: 'Backtest',
  toolsTabIndAlerts: 'Alerts+',
  toolsTabCalendar: 'Calendar',
  toolsTabLayouts: 'Layout',
  toolsTabAi: 'AI',
  a11yTabPrefix: 'Tab',
  a11ySignalSymbolPrefix: 'Signal symbol',
  toolsHubCommunity: 'Community & news',
  toolsHubAnalysis: 'Analysis & alerts',
  a11yHubSectionPrefix: 'Panel section',
  toolsGridHint: "Drag the dots to reorder this section's panels",
  toolsFiltersLabel: 'Filters',
  filterMaUpLabel: 'MA up',
  filterMaUpHint: 'Price crossed above its moving average',
  filterMaDownLabel: 'MA down',
  filterMaDownHint: 'Price crossed below its moving average',
  filterRsiOversoldLabel: 'RSI oversold',
  filterRsiOversoldHint: 'Oversold — may bounce upward',
  filterRsiOverboughtLabel: 'RSI overbought',
  filterRsiOverboughtHint: 'Overbought — may pull back downward',
  filterMacdUpLabel: 'MACD up',
  filterMacdUpHint: 'Bullish MACD cross — fresh positive momentum',
  filterBullishLabel: 'Momentum +',
  filterBullishHint: 'General positive price momentum',
  filterBearishLabel: 'Momentum -',
  filterBearishHint: 'General negative price momentum',
  a11yFilterPrefix: 'Filter',
  screenerRunning: 'Scanning...',
  screenerRunBtn: 'Run screener',
  screenerRunNeedFilter: 'Run screener — pick a filter first',
  screenerNeedApiKey: 'The screener needs an active Twelve Data key on the server',
  screenerNoResults: 'No results match the current filters',
  screenerFailed: 'Could not run the scan — check your connection and try again',
  newsTitle: 'News affecting forex',
  newsStale: 'Could not refresh news — showing saved data',
  newsEmpty: 'No news right now',
  aiPanelTitle: 'AI assistant',
  aiGreeting:
    "I'm the MATRIX trading expert. Ask about analysis, a trade scenario, risk management, or the pair's relation to DXY.",
  aiOfflineFallback:
    'Could not reach the server. Make sure the backend is running on port 8100.\n\nQuick local take: watch DXY before entering any dollar pair, and use a clear stop with risk ≤ 1%.',
  aiWinEstimate: 'Estimated success chance: {pct}%',
  aiWinDisclaimer: 'A statistical estimate, not a guarantee — always manage your risk',
  aiInputPlaceholder: 'e.g. analysis of {symbol} today?',
  aiInputA11y: 'Question for the AI assistant',
  aiSendA11y: 'Send question to the AI assistant',
  aiAskBtn: 'Ask',
  analystsTitle: 'Analyst forecasts',
  analystsSubSuffix: 'Research house consensus',
  analystsRefreshA11y: 'Refresh analyst forecasts',
  analystsLoadError: 'Could not load analyst forecasts',
  socialPlatformTelegram: 'Telegram',
  socialPlatformFacebook: 'Facebook',
  socialPlatformInstagram: 'Instagram',
  socialPlatformX: 'X',
  socialPlatformYoutube: 'YouTube',
  socialPlatformDiscord: 'Discord',
  socialPlatformApp: 'App',
  socialComputeA11y: 'Compute consensus of selected sources',
  socialComputeBtn: 'Compute',
  socialTitle: 'Approximate average of tips & trades',
  socialSub: 'Telegram · Facebook · Instagram · X · Apps',
  socialPickHint: 'Pick the sources you follow — the overall average is then computed',
  socialSourcesError: 'Could not load the source list — check your connection',
  a11ySourcePrefix: 'Source',
  sourcesCountLabel: 'Sources',
  suggestedTradeLabel: 'Suggested trade',
  socialNoClearTrade: 'No clear trade — opinions are mixed or neutral',
  socialComputeError: 'Could not compute channel consensus',
  chatTitle: 'Group chat',
  chatLoadError: 'Could not load messages — showing saved messages',
  chatEmpty: 'No messages yet — be the first to write',
  chatSendError: 'Could not send your message to the group — it may not arrive, try later',
  chatYou: 'You',
  chatInputPlaceholder: 'Type a message...',
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
  voteLoadError: 'Could not refresh votes — showing saved data',
  voteEmpty: 'No active votes right now',
  voteByAuthor: 'By {author}',
  voteApprovalLabel: 'Approval',
  voteAgreeWord: 'Agree',
  voteDisagreeWord: 'Disagree',
  voteCastError: 'Could not send your vote to the server — it may not count, try later',
  voteAgreeA11yPrefix: 'Agree with idea',
  voteDisagreeA11yPrefix: 'Disagree with idea',
  indicatorBollinger: 'Bollinger',
  indicatorTrend: 'Trend',
  forecastRunA11y: 'Forecast indicators',
  forecastRunBtn: 'Forecast',
  forecastTitle: 'Indicator forecasts',
  forecastAvgLabel: 'Indicator avg',
  forecastTradeLabel: 'Trade',
  forecastNoSignal: 'No strong signal — wait for indicator confirmation',
  forecastError: 'Could not compute indicator forecasts',
  alertsTitle: 'Price alerts',
  alertsSub: 'Above / Below · Twelve Data · Notification when triggered',
  alertsPushTitle: 'MATRIX · Price alert',
  alertsSymbolA11y: 'Instrument symbol for the alert',
  alertsPriceA11y: 'Alert price',
  alertsAboveConditionA11y: 'Alert condition: above price',
  alertsBelowConditionA11y: 'Alert condition: below price',
  alertsAddA11y: 'Add price alert',
  alertsNotePlaceholder: 'Note (optional)',
  alertsNoteA11y: 'Alert note (optional)',
  alertsAddError: 'Could not add the alert — check your connection and try again',
  alertsFirstBadge: "🎉 First alert set — we'll notify you when the price hits",
  alertsLoadError: 'Could not load alerts',
  alertsEmpty: 'No alerts yet',
  alertsDeleteConfirmTitle: 'Delete the alert?',
  alertsDeleteFailedTitle: 'Could not delete',
  alertsDeleteFailedBody: 'An error occurred while deleting the alert, try again.',
  alertsDeleteA11yPrefix: 'Delete alert',
  reportsTitle: 'MATRIX Reports',
  reportsSubGrid: 'Same frame size · prev/next · tap to read',
  reportsSub: 'Weekly · Performance · Platform view & tips',
  reportWeeklyTitle: 'Weekly report',
  reportWeeklyHint: 'Profit & loss',
  reportPerformanceTitle: 'Performance report',
  reportPerformanceHint: 'Discipline & execution',
  reportAdviceTitle: 'MATRIX view',
  reportAdviceHint: "This week's tips",
  reportRiskTitle: 'Risk brief',
  reportRiskHint: 'Capital management',
  reportOpenWord: 'Open ↓',
  reportAiFallbackNote: 'Could not reach the AI — this is a general template, not a custom analysis',
  reportWinLabel: 'Estimated scenario confidence: {pct}%',
  reportJournalDataLine:
    'Actual trade journal data: trades={trades} win rate={winRate}% PnL={pnl}% best={best}% worst={worst}%. Base the report on it.',
  reportJournalEmptyLine: '(No trades logged in the journal yet).',
  reportFallbackWeekly:
    'Report from the trade journal{journalLine}\nLog your trades in the PnL tab for a more accurate report.',
  reportFallbackPerformance: 'Assessment based on the journal{journalLine}',
  reportFallbackRisk: 'Risk brief{journalLine}\n1) Risk ≤1%.\n2) Use a clear stop.\n3) Avoid heavy news.',
  reportFallbackAdvice:
    'MATRIX tips{journalLine}\n1) Review your open trades.\n2) Tie entries to DXY.\n3) Risk ≤1%.\n4) Avoid high-impact news.\n5) Focus on 2–3 pairs.',
  journalTitle: 'Trade journal · Real PnL',
  journalSub: 'Log your trades — reports are built from your journal',
  journalStatClosed: 'Closed trades: {n}',
  journalStatWinRate: 'Win rate: {pct}%',
  journalStatTotalPnl: 'Total PnL: {pct}%',
  journalStatBestWorst: 'Best/Worst: {best}% / {worst}%',
  journalSideA11yPrefix: 'Trade direction',
  journalSymbolPlaceholder: 'Symbol',
  journalSymbolA11y: 'Trade symbol',
  journalEntryPlaceholder: 'Entry',
  journalEntryA11y: 'Entry price',
  journalExitPlaceholder: 'Exit (optional)',
  journalExitA11y: 'Exit price (optional)',
  journalNotePlaceholder: 'Note',
  journalNoteA11y: 'Trade note (optional)',
  journalAddA11y: 'Add a new trade',
  journalAddBtn: 'Add trade',
  journalAddError: 'Could not add the trade — check your connection and try again',
  journalCloseFailedTitle: 'Could not close',
  journalCloseFailedBody: 'An error occurred while closing the trade, try again.',
  journalLoadError: 'Could not load the journal',
  journalEmpty: 'No trades logged yet',
  journalOpenSuffix: '(open)',
  journalCloseLinkA11y: 'Close {symbol} trade at the exit field price',
  journalCloseLinkBtn: 'Close at exit field price',
  backtestSub: 'MA · RSI · MACD · BB · Equity curve',
  backtestSymbolA11y: 'Instrument symbol for the backtest',
  backtestStrategyA11yPrefix: 'Strategy',
  backtestRunA11y: 'Run the backtest',
  backtestRunBtn: 'Run Backtest',
  backtestRunError: 'Could not run the backtest — check your connection and try again',
  backtestStatTrades: 'Trades: {n}',
  backtestStatWinRate: 'Win rate: {pct}%',
  backtestStatReturn: 'Total return: {pct}%',
  backtestStatEquity: 'Final equity: {v}',
  backtestStatDrawdown: 'Max drawdown: {pct}%',
  backtestStatAvgWinLoss: 'Avg win/loss: {win}% / {loss}%',
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
  indAlertsAddA11y: 'Add indicator alert',
  indAlertsAddBtn: 'Add alert',
  indAlertsAddError: 'Could not add the indicator alert — check your connection and try again',
  indAlertsLoadError: 'Could not load indicator alerts',
  indAlertsEmpty: 'No indicator alerts yet',
  indAlertsDeleteConfirmTitle: 'Delete the indicator alert?',
  indAlertsDeleteFailedTitle: 'Could not delete',
  indAlertsDeleteFailedBody: 'An error occurred while deleting the indicator alert, try again.',
  indAlertsDeleteA11yPrefix: 'Delete indicator alert',
  indAlertsPushTitle: 'MATRIX · Indicator alert',
  calendarTitle: 'Economic calendar · Live',
  calendarCurrencyA11yPrefix: 'Filter by currency',
  calendarAllWord: 'All',
  calendarImpactA11yPrefix: 'Filter by impact',
  calendarAllShort: 'All',
  calendarLoading: 'Loading the calendar…',
  calendarLoadError: 'Could not load the calendar — check your connection',
  calendarEmpty: 'No events match this filter',
  layoutDefaultName: 'My layout',
  layoutFallbackName: 'Layout',
  layoutsTitle: 'Saved layouts',
  layoutNamePlaceholder: 'Layout name',
  layoutNameA11y: 'Layout name',
  layoutSaveA11y: 'Save the current layout',
  layoutSaveBtn: 'Save current layout',
  layoutApplyA11yPrefix: 'Apply layout',
  layoutDeleteConfirmTitle: 'Delete the layout?',
  layoutDeleteA11yPrefix: 'Delete layout',
  coursesTitle: 'Academy',
  coursesSub: 'Full screen · voice narration · pause and ask about any part',
  coursesStaleNote: "Couldn't refresh the school list — showing saved data",
  coursesNoteTitle: 'Important classification',
  coursesNoteText:
    'BOS and CHOCH belong to the Order Block and Fair Value Gap group inside the ICT/SMC school — they are not a separate school.',
  coursesSchoolA11yPrefix: 'School',
  coursesLevelsWord: 'levels',
  coursesLecturesUnitWord: 'lectures',
  coursesVoiceWord: 'Voice',
  coursesAudioLabel: 'Audio',
  coursesFallbackNote: "Couldn't load the full curriculum — showing only a temporary introductory lecture",
  coursesLevelWord: 'Level',
  coursesLectureA11yPrefix: 'Lecture',
  coursesMinuteWord: 'minute',
  coursesMinuteAbbrev: 'min',
  coursesFullLectureWord: 'full lecture',
  coursesBackToSchoolsA11y: 'Back to the school list',
  coursesBack: 'Back',
  lectureClose: 'Close',
  lectureCloseA11y: 'Close the lecture',
  lectureLevelWord: 'level',
  lectureLoadFailedNote: "Couldn't load this lecture — showing generic sample content instead",
  lectureFullScreenTag: 'Full screen',
  lectureVoicePausedForQ: 'Paused for a question',
  lecturePreparingVoice: 'Preparing the audio...',
  lectureExplainingNow: 'Explaining now',
  lectureVoicePlayError: "Couldn't play the audio",
  lectureChartLabel: 'Interactive chart',
  lectureHideChart: 'Hide',
  lectureHideChartA11y: 'Hide the interactive chart',
  lectureShowChart: 'Show the interactive chart',
  lectureVoiceStopped: 'Audio stopped',
  lectureGenerating: 'Generating...',
  lectureVoiceActive: 'Voice narration active',
  lectureSegmentWord: 'Segment',
  lectureCompleteBadge: '🎉 You finished this lecture',
  lectureClarifyTitle: 'Clarification after pausing',
  lectureClarifyPausedLine: 'The narration has been paused for a moment.',
  lectureClarifyQuestionLabel: 'Your question:',
  lectureClarifyFocusLine:
    "Focus on the practical idea on the screen, then we'll continue from the same segment.",
  lectureResume: 'Resume the lecture',
  lecturePrev: 'Previous',
  lecturePrevA11y: 'Previous segment',
  lectureNext: 'Next',
  lectureNextA11y: 'Next segment',
  lectureInterruptLabel: 'Pause the narration and ask about an unclear part',
  lectureQuestionPlaceholder: "Example: I didn't understand CHOCH...",
  lectureQuestionA11y: 'Question while the narration is paused',
  lectureAskBtn: 'Ask',
  lectureAskA11y: 'Send the question',
  termShadowSizeSmall: 'Small',
  termShadowSizeMedium: 'Medium',
  termShadowSizeBig: 'Large',
  termServerOnline: 'Server connected',
  termServerOffline: 'Server disconnected',
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
  termTimeSyncUnavailable: 'Sync is not available in shadow frame',
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
  termSquareFramesHintSuffix: 'square frames · long-press any box to reorder it · indicators optional',
  termHintMoveText:
    'Forecasts · Alerts · News · Community → Tools · long-press the bar and drag to reorder frames',
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
  wlLoadError: "Couldn't load watchlist",
  wlRetryA11y: 'Retry loading watchlist',
  wlRetryBtn: 'Retry',
  wlLoadingWord: 'Loading…',
  wlEmpty: 'No symbols in watchlist',
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
  focusCompareHint: 'Long-press to compare',
  focusCompareTag: 'Compare',
  focusPickSymbolA11yPrefix: 'Select symbol',
  focusCompareNotePrefix: 'Comparing with',
  focusCompareNoteSuffix: '(purple)',
  focusInComparisonSuffix: ' · in comparison',
  focusAlertCreateFailedTitle: "Couldn't create alert",
  focusAlertCreateFailedBody: 'An error occurred creating an alert from the drawing line, try again.',
  focusAlertFromDrawingNote: 'From drawing line',
  gridFramesWord: 'Frames',
  gridSquaresWord: 'Squares',
  gridSquaresA11y: 'View frames as squares',
  gridRectanglesWord: 'Rectangles',
  gridRectanglesA11y: 'View frames as rectangles',
};

const enGB: Dict = {
  ...enUS,
  langName: 'English (UK)',
  login: 'Sign in',
  register: 'Register',
  enter: 'Sign in',
  createAccount: 'Create an account',
  logout: 'Sign out',
  hello: 'Hello',
  email: 'E-mail',
  sponsorCode: 'Sponsor code (optional)',
  loginError: 'Sign-in failed — check name/e-mail and password',
  registerError: 'Registration failed — check e-mail, details, and sponsor code',
  language: 'Language',
  commissionsReport: 'Commission report',
  networkTree: 'Network tree',
};

const ku: Dict = {
  langName: 'کوردی',
  accountTitle: 'هەژماری MATRIX',
  accountSub: 'هاوکاتکردن · ئەکادیمی · کۆمیسیۆنی تۆڕی دووقۆڵی',
  tabHome: 'سەرەکی',
  tabTools: 'ئامرازەکان',
  tabAcademy: 'ئەکادیمی',
  tabMessages: 'نامەکان',
  tabAccount: 'هەژمار',
  login: 'چوونەژوورەوە',
  register: 'تۆمارکردن',
  name: 'ناو',
  namePlaceholder: 'ناوی بەکارهێنەر',
  email: 'ئیمەیڵ',
  emailPlaceholder: 'name@example.com',
  password: 'پاسوۆرد',
  passwordPlaceholder: 'پاسوۆرد',
  enter: 'چوونەژوورەوە',
  createAccount: 'دروستکردنی هەژمار',
  logout: 'دەرچوون',
  hello: 'سڵاو',
  accountType: 'جۆری هەژمار',
  sponsorCode: 'کۆدی سپۆنسەر (ئیختیاری)',
  underSponsor: 'لایەن لەژێر سپۆنسەر',
  left: 'چەپ',
  right: 'ڕاست',
  trader: 'بازرگان',
  trainer: 'ڕاهێنەر',
  broker: 'برۆکەر',
  agent: 'بریکار',
  company: 'کۆمپانیا',
  loginError: 'چوونەژوورەوە سەرکەوتوو نەبوو — ناو/ئیمەیڵ و پاسوۆرد بپشکنە',
  registerError: 'تۆمارکردن سەرکەوتوو نەبوو — ئیمەیڵ و زانیاری و کۆدی سپۆنسەر بپشکنە',
  language: 'زمان',
  commissionsReport: 'ڕاپۆرتی کۆمیسیۆن',
  networkTree: 'دارەکەی تۆڕ',
  deleteAccount: 'سڕینەوەی هەژمار',
  deleteAccountConfirmTitle: 'هەژمار بە تەواوی بسڕدرێتەوە؟',
  deleteAccountConfirmBody:
    'ناوی بەکارهێنەر و ئیمەیڵ و پاسوۆرد بە تەواوی دەسڕدرێنەوە و ئیتر ناتوانیت بچیتەژوورەوەی ئەم هەژمارە. ئەم کردارە ناگەڕێتەوە.',
  deleteAccountConfirmBtn: 'بە تەواوی بسڕەوە',
  deleteAccountError: 'سڕینەوەی هەژمار سەرکەوتوو نەبوو — دواتر هەوڵبدەرەوە',
  cancel: 'پاشگەزبوونەوە',
  notifications: 'ئاگادارکردنەوەکان',
  notifStatusGranted: 'چالاکە',
  notifStatusDenied: 'ڕەتکراوەتەوە لە ڕێکخستنی ئامێر',
  notifStatusUndetermined: 'پێویستی بە مۆڵەتە',
  notifStatusUnsupported: 'پشتگیری ناکرێت لەسەر وێب',
  notifEnableBtn: 'چالاککردنی ئاگادارکردنەوەکان',
  notifOpenSettingsBtn: 'کردنەوەی ڕێکخستنی ئامێر',
  restartRequiredTitle: 'پێویستە ئەپەکە دووبارە بکرێتەوە',
  restartRequiredBody:
    'زمان گۆڕدرا. ئەپەکە دابخە و دووبارە بیکەرەوە بۆ ئەوەی ئاراستەی ڕووکار (ڕاست/چەپ) بە تەواوی لەسەر هەموو پەیجەکان جێبەجێ بێت.',
  restartRequiredBtn: 'باشە',
  onboardStep1Title: 'چەند چوارچێوەیەک بەیەکەوە',
  onboardStep1Body:
    'هەتا چوار شێوەنیگار بەیەکەوە بکەرەوە و جووت و کاتەکان بە یەک دەستدان بەراورد بکە، لەگەڵ نەخشەی 2×2 و چوارچێوەی پڕ شاشە.',
  onboardStep2Title: 'ئامرازەکانی وێنەکێشان',
  onboardStep2Body:
    'تابی «وێنەکێشان» لە شریتی خوارەوە هێڵی ترێند و فیبۆناتچی و لاکێشەکان و ئامرازەکانی تری شیکردنەوەی تەکنیکی دەکاتەوە ڕاستەوخۆ لەسەر شێوەنیگار.',
  onboardStep3Title: 'پێوەرەکان و لینزەکان',
  onboardStep3Body:
    'لە دەیان پێوەری ئامادە هەڵبژێرە (RSI، MACD، بۆلینگەر و زیاتر)، یان لینزێک چالاک بکە کە بارودۆخی بازاڕ بە یەک تەماشاکردن کورت دەکاتەوە.',
  onboardStep4Title: 'ئاگادارکردنەوەکان',
  onboardStep4Body:
    'ئاگادارکردنەوەیەکی نرخ یان پێوەر دروست بکە و ئاگاداری خێرا لەسەر ئامێرەکەت وەربگرە — پێویست ناکات بە درێژایی ڕۆژ چاودێری شێوەنیگار بکەیت.',
  onboardSkip: 'تێپەڕاندن',
  onboardNext: 'دواتر',
  onboardStart: 'دەستپێبکە',
  dirBuy: 'کڕین',
  dirSell: 'فرۆشتن',
  dirNeutral: 'بێلایەن',
  confidenceLabel: 'دڵنیایی',
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
  toolsTabHub: 'نیشانەکان و کۆمەڵگا',
  toolsTabReports: 'ڕاپۆرتەکان',
  toolsTabJournal: 'PnL',
  toolsTabScreener: 'پشکنین',
  toolsTabBacktest: 'Backtest',
  toolsTabIndAlerts: 'ئاگادارکردنەوە+',
  toolsTabCalendar: 'ڕۆژژمێر',
  toolsTabLayouts: 'نەخشەسازی',
  toolsTabAi: 'AI',
  a11yTabPrefix: 'تاب',
  a11ySignalSymbolPrefix: 'هێمای نیشانە',
  toolsHubCommunity: 'کۆمەڵگا و هەواڵ',
  toolsHubAnalysis: 'شیکاری و ئاگادارکردنەوە',
  a11yHubSectionPrefix: 'بەشی پانێڵ',
  toolsGridHint: 'خاڵەکان ڕاکێشە بۆ ڕیزبەندی دووبارەی پانێڵەکانی ئەم بەشە',
  toolsFiltersLabel: 'فلتەرەکان',
  filterMaUpLabel: 'MA بەرزبوونەوە',
  filterMaUpHint: 'نرخ لە ناوەندی جوڵاوی خۆی بەرزتر بووەتەوە',
  filterMaDownLabel: 'MA دابەزین',
  filterMaDownHint: 'نرخ لە ناوەندی جوڵاوی خۆی نزمتر بووەتەوە',
  filterRsiOversoldLabel: 'RSI oversold',
  filterRsiOversoldHint: 'زۆر فرۆشراوە — لەوانەیە بگەڕێتەوە سەرەوە',
  filterRsiOverboughtLabel: 'RSI overbought',
  filterRsiOverboughtHint: 'زۆر کڕدراوە — لەوانەیە بگەڕێتەوە خوارەوە',
  filterMacdUpLabel: 'MACD up',
  filterMacdUpHint: 'بڕینەوەی MACD بەرزبوونەوە — بەهێزی ئەرێنی نوێ',
  filterBullishLabel: 'خۆشوڕی +',
  filterBullishHint: 'خۆشوڕی گشتی ئەرێنی نرخ',
  filterBearishLabel: 'خۆشوڕی -',
  filterBearishHint: 'خۆشوڕی گشتی نەرێنی نرخ',
  a11yFilterPrefix: 'فلتەر',
  screenerRunning: 'پشکنین بەردەوامە...',
  screenerRunBtn: 'کارپێکردنی پشکنەر',
  screenerRunNeedFilter: 'کارپێکردنی پشکنەر — سەرەتا فلتەرێک هەڵبژێرە',
  screenerNeedApiKey: 'پشکنین پێویستی بە کلیلی چالاکی Twelve Data لەسەر ڕاژە هەیە',
  screenerNoResults: 'هیچ ئەنجامێک لەگەڵ فلتەرە ئێستاکان ناگونجێت',
  screenerFailed: 'نەکرا پشکنین کارپێبکرێت — پەیوەندییەکەت بپشکنە و دووبارە هەوڵبدەرەوە',
  newsTitle: 'هەواڵی کاریگەر لەسەر فۆرێکس',
  newsStale: 'نەکرا هەواڵ نوێبکرێتەوە — زانیاری پاشەکەوتکراو پیشان دەدرێت',
  newsEmpty: 'هیچ هەواڵێک لە ئێستادا نییە',
  aiPanelTitle: 'یاریدەدەری زیرەکی دەستکرد',
  aiGreeting:
    'من پسپۆڕی مامەڵەکردنی MATRIX ـم. پرسیار بکە دەربارەی شیکاری، دیمەنی مامەڵە، بەڕێوەبردنی مەترسی، یان پەیوەندی جووتەکە بە DXY.',
  aiOfflineFallback:
    'نەکرا پەیوەندی بە ڕاژەوە بکرێت. دڵنیابەرەوە کە Backend لەسەر پۆرتی 8100 کاردەکات.\n\nشیکاری خێرای ناوخۆیی: چاودێری DXY بکە پێش هەر چوونەژوورەوەیەک بۆ جووتەکانی دۆلار، و وەستانێکی ڕوون بەکاربهێنە بە مەترسی ≤ 1%.',
  aiWinEstimate: 'ڕێژەی سەرکەوتنی خەمڵێنراو: {pct}%',
  aiWinDisclaimer: 'خەمڵاندنێکی ئاماریە نەک دڵنیایی — هەمیشە مەترسیت بەڕێوە ببە',
  aiInputPlaceholder: 'نموونە: شیکاری {symbol} ئەمڕۆ؟',
  aiInputA11y: 'پرسیار بۆ یاریدەدەری زیرەکی دەستکرد',
  aiSendA11y: 'ناردنی پرسیار بۆ یاریدەدەری زیرەکی دەستکرد',
  aiAskBtn: 'بپرسە',
  analystsTitle: 'پێشبینیەکانی شیکارکاران',
  analystsSubSuffix: 'ڕێکەوتنی ماڵی توێژینەوە',
  analystsRefreshA11y: 'نوێکردنەوەی پێشبینیەکانی شیکارکاران',
  analystsLoadError: 'نەکرا پێشبینیەکانی شیکارکاران باربکرێت',
  socialPlatformTelegram: 'تێلێگرام',
  socialPlatformFacebook: 'فەیسبووک',
  socialPlatformInstagram: 'ئینستاگرام',
  socialPlatformX: 'X',
  socialPlatformYoutube: 'یوتیوب',
  socialPlatformDiscord: 'دیسکۆرد',
  socialPlatformApp: 'ئەپ',
  socialComputeA11y: 'ڕێکەوتنی سەرچاوە هەڵبژێردراوەکان بژمێرە',
  socialComputeBtn: 'بژمێرە',
  socialTitle: 'ناوەندی نزیکەی ڕاسپاردە و مامەڵەکان',
  socialSub: 'تێلێگرام · فەیسبووک · ئینستاگرام · X · ئەپەکان',
  socialPickHint: 'سەرچاوەکانی شوێنکەوتووت هەڵبژێرە — ئینجا ناوەندی گشتی دەژمێردرێت',
  socialSourcesError: 'نەکرا لیستی سەرچاوەکان باربکرێت — پەیوەندییەکەت بپشکنە',
  a11ySourcePrefix: 'سەرچاوە',
  sourcesCountLabel: 'سەرچاوەکان',
  suggestedTradeLabel: 'مامەڵەی پێشنیارکراو',
  socialNoClearTrade: 'هیچ مامەڵەیەکی ڕوون نییە — بۆچوونەکان تێکەڵ یان بێلایەنن',
  socialComputeError: 'نەکرا ڕێکەوتنی کەناڵەکان بژمێردرێت',
  chatTitle: 'گفتوگۆی گروپی',
  chatLoadError: 'نەکرا نامەکان باربکرێت — نامە پاشەکەوتکراوەکان پیشان دەدرێن',
  chatEmpty: 'هێشتا هیچ نامەیەک نییە — یەکەم کەس بە بۆ نووسین',
  chatSendError: 'نەکرا نامەکەت بۆ گروپ بنێردرێت — لەوانەیە نەگات، دواتر هەوڵبدەرەوە',
  chatYou: 'تۆ',
  chatInputPlaceholder: 'نامەیەک بنووسە...',
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
  voteLoadError: 'نەکرا دەنگەکان نوێبکرێتەوە — زانیاری پاشەکەوتکراو پیشان دەدرێت',
  voteEmpty: 'هیچ دەنگدانێکی چالاک لە ئێستادا نییە',
  voteByAuthor: 'لەلایەن {author}',
  voteApprovalLabel: 'ڕەزامەندی',
  voteAgreeWord: 'ڕازیم',
  voteDisagreeWord: 'ڕازی نیم',
  voteCastError: 'نەکرا دەنگت بۆ ڕاژە بنێردرێت — لەوانەیە نەژمێردرێت، دواتر هەوڵبدەرەوە',
  voteAgreeA11yPrefix: 'ڕازیبوون لەگەڵ بیرۆکەی',
  voteDisagreeA11yPrefix: 'ڕەتکردنەوەی بیرۆکەی',
  indicatorBollinger: 'بۆلینگەر',
  indicatorTrend: 'ترێند',
  forecastRunA11y: 'پێشبینیکردنی پێوەرەکان',
  forecastRunBtn: 'پێشبینیکردن',
  forecastTitle: 'پێشبینیەکانی پێوەرەکان',
  forecastAvgLabel: 'ناوەندی پێوەرەکان',
  forecastTradeLabel: 'مامەڵە',
  forecastNoSignal: 'هیچ نیشانەیەکی بەهێز نییە — چاوەڕێی دڵنیاکردنەوەی پێوەرەکان بکە',
  forecastError: 'نەکرا پێشبینیەکانی پێوەرەکان بژمێردرێت',
  alertsTitle: 'ئاگادارکردنەوەی نرخ',
  alertsSub: 'سەرەوە / خوارەوە · Twelve Data · ئاگادارکردنەوە کاتێک چالاک دەبێت',
  alertsPushTitle: 'MATRIX · ئاگادارکردنەوەی نرخ',
  alertsSymbolA11y: 'هێمای ئامراز بۆ ئاگادارکردنەوە',
  alertsPriceA11y: 'نرخی ئاگادارکردنەوە',
  alertsAboveConditionA11y: 'مەرجی ئاگادارکردنەوە: سەرەوەی نرخ',
  alertsBelowConditionA11y: 'مەرجی ئاگادارکردنەوە: خوارەوەی نرخ',
  alertsAddA11y: 'زیادکردنی ئاگادارکردنەوەی نرخ',
  alertsNotePlaceholder: 'تێبینی (ئیختیاری)',
  alertsNoteA11y: 'تێبینی ئاگادارکردنەوە (ئیختیاری)',
  alertsAddError: 'نەکرا ئاگادارکردنەوە زیادبکرێت — پەیوەندییەکەت بپشکنە و دووبارە هەوڵبدەرەوە',
  alertsFirstBadge: '🎉 یەکەم ئاگادارکردنەوەت دانرا — کاتێک نرخ بگاتە ئاستەکە ئاگادارت دەکەینەوە',
  alertsLoadError: 'نەکرا ئاگادارکردنەوەکان باربکرێن',
  alertsEmpty: 'هێشتا هیچ ئاگادارکردنەوەیەک نییە',
  alertsDeleteConfirmTitle: 'ئاگادارکردنەوەکە بسڕدرێتەوە؟',
  alertsDeleteFailedTitle: 'سڕینەوە سەرکەوتوو نەبوو',
  alertsDeleteFailedBody: 'هەڵەیەک ڕوویدا لە کاتی سڕینەوەی ئاگادارکردنەوەکە، دووبارە هەوڵبدەرەوە.',
  alertsDeleteA11yPrefix: 'سڕینەوەی ئاگادارکردنەوە',
  reportsTitle: 'ڕاپۆرتەکانی MATRIX',
  reportsSubGrid: 'هەمان قەبارەی چوارچێوە · پێشوو/دواتر · دەستلێدان بۆ خوێندنەوە',
  reportsSub: 'هەفتانە · کارایی · بۆچوونی پلاتفۆرم و ئامۆژگاری',
  reportWeeklyTitle: 'ڕاپۆرتی هەفتانە',
  reportWeeklyHint: 'قازانج و زیان',
  reportPerformanceTitle: 'ڕاپۆرتی کارایی',
  reportPerformanceHint: 'ئینزیباتی و جێبەجێکردن',
  reportAdviceTitle: 'بۆچوونی MATRIX',
  reportAdviceHint: 'ئامۆژگاری ئەم هەفتەیە',
  reportRiskTitle: 'کورتەی مەترسی',
  reportRiskHint: 'بەڕێوەبردنی سەرمایە',
  reportOpenWord: 'کراوەیە ↓',
  reportAiFallbackNote:
    'نەکرا پەیوەندی بە زیرەکی دەستکردەوە بکرێت — ئەمە داڵدەیەکی گشتییە نەک شیکارییەکی تایبەت',
  reportWinLabel: 'دڵنیایی خەمڵێنراوی دیمەن: {pct}%',
  reportJournalDataLine:
    'زانیاری ڕاستەقینەی دەفتەری مامەڵە: مامەڵە={trades} ڕێژەی سەرکەوتن={winRate}% PnL={pnl}% باشترین={best}% خراپترین={worst}%. پشت بەمە ببەستە لە ڕاپۆرتەکە.',
  reportJournalEmptyLine: '(هێشتا هیچ مامەڵەیەک لە دەفتەرەکەدا تۆمار نەکراوە).',
  reportFallbackWeekly:
    'ڕاپۆرت لە دەفتەری مامەڵە{journalLine}\nمامەڵەکانت لە تابی PnL تۆماربکە بۆ ڕاپۆرتێکی وردتر.',
  reportFallbackPerformance: 'هەڵسەنگاندن لەسەر بنەمای دەفتەرەکە{journalLine}',
  reportFallbackRisk:
    'کورتەی مەترسی{journalLine}\n1) مەترسی ≤1%.\n2) وەستانێکی ڕوون بەکاربهێنە.\n3) دوور بە لە هەواڵی قورس.',
  reportFallbackAdvice:
    'ئامۆژگاری MATRIX{journalLine}\n1) مامەڵە کراوەکانت پێداچوونەوەیان بۆ بکە.\n2) چوونەژوورەوەکان بە DXY ببەستەوە.\n3) مەترسی ≤1%.\n4) دوور بە لە هەواڵی کاریگەری بەرز.\n5) سەرنج بدە بە 2-3 جووت.',
  journalTitle: 'دەفتەری مامەڵە · PnL ڕاستەقینە',
  journalSub: 'مامەڵەکانت تۆماربکە — ڕاپۆرتەکان لە ڕۆژنووسەکەت دروستدەبن',
  journalStatClosed: 'مامەڵە داخراوەکان: {n}',
  journalStatWinRate: 'ڕێژەی سەرکەوتن: {pct}%',
  journalStatTotalPnl: 'کۆی PnL: {pct}%',
  journalStatBestWorst: 'باشترین/خراپترین: {best}% / {worst}%',
  journalSideA11yPrefix: 'ئاراستەی مامەڵە',
  journalSymbolPlaceholder: 'هێما',
  journalSymbolA11y: 'هێمای مامەڵە',
  journalEntryPlaceholder: 'چوونەژوورەوە',
  journalEntryA11y: 'نرخی چوونەژوورەوە',
  journalExitPlaceholder: 'دەرچوون (ئیختیاری)',
  journalExitA11y: 'نرخی دەرچوون (ئیختیاری)',
  journalNotePlaceholder: 'تێبینی',
  journalNoteA11y: 'تێبینی مامەڵە (ئیختیاری)',
  journalAddA11y: 'زیادکردنی مامەڵەیەکی نوێ',
  journalAddBtn: 'زیادکردنی مامەڵە',
  journalAddError: 'نەکرا مامەڵە زیادبکرێت — پەیوەندییەکەت بپشکنە و دووبارە هەوڵبدەرەوە',
  journalCloseFailedTitle: 'داخستن سەرکەوتوو نەبوو',
  journalCloseFailedBody: 'هەڵەیەک ڕوویدا لە کاتی داخستنی مامەڵەکە، دووبارە هەوڵبدەرەوە.',
  journalLoadError: 'نەکرا تۆمارەکە باربکرێت',
  journalEmpty: 'هێشتا هیچ مامەڵەیەک تۆمار نەکراوە',
  journalOpenSuffix: '(کراوەیە)',
  journalCloseLinkA11y: 'داخستنی مامەڵەی {symbol} بە نرخی خانەی دەرچوون',
  journalCloseLinkBtn: 'داخستن بە نرخی خانەی دەرچوون',
  backtestSub: 'MA · RSI · MACD · BB · کەوانەی Equity',
  backtestSymbolA11y: 'هێمای ئامراز بۆ تاقیکردنەوەی دواوە',
  backtestStrategyA11yPrefix: 'ستراتیژی',
  backtestRunA11y: 'کارپێکردنی تاقیکردنەوەی دواوە',
  backtestRunBtn: 'کارپێکردنی Backtest',
  backtestRunError: 'نەکرا تاقیکردنەوەی دواوە کارپێبکرێت — پەیوەندییەکەت بپشکنە و دووبارە هەوڵبدەرەوە',
  backtestStatTrades: 'مامەڵەکان: {n}',
  backtestStatWinRate: 'ڕێژەی سەرکەوتن: {pct}%',
  backtestStatReturn: 'کۆی گەڕانەوە: {pct}%',
  backtestStatEquity: 'Equity کۆتایی: {v}',
  backtestStatDrawdown: 'زۆرترین دابەزین: {pct}%',
  backtestStatAvgWinLoss: 'ناوەندی قازانج/زیان: {win}% / {loss}%',
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
  indAlertsAddA11y: 'زیادکردنی ئاگادارکردنەوەی پێوەر',
  indAlertsAddBtn: 'زیادکردنی ئاگادارکردنەوە',
  indAlertsAddError:
    'نەکرا ئاگادارکردنەوەی پێوەر زیادبکرێت — پەیوەندییەکەت بپشکنە و دووبارە هەوڵبدەرەوە',
  indAlertsLoadError: 'نەکرا ئاگادارکردنەوەکانی پێوەر باربکرێن',
  indAlertsEmpty: 'هێشتا هیچ ئاگادارکردنەوەیەکی پێوەر نییە',
  indAlertsDeleteConfirmTitle: 'ئاگادارکردنەوەی پێوەرەکە بسڕدرێتەوە؟',
  indAlertsDeleteFailedTitle: 'سڕینەوە سەرکەوتوو نەبوو',
  indAlertsDeleteFailedBody: 'هەڵەیەک ڕوویدا لە کاتی سڕینەوەی ئاگادارکردنەوەی پێوەرەکە، دووبارە هەوڵبدەرەوە.',
  indAlertsDeleteA11yPrefix: 'سڕینەوەی ئاگادارکردنەوەی پێوەر',
  indAlertsPushTitle: 'MATRIX · ئاگادارکردنەوەی پێوەر',
  calendarTitle: 'ڕۆژژمێری ئابووری · ڕاستەوخۆ',
  calendarCurrencyA11yPrefix: 'پاڵاوتن بەپێی دراو',
  calendarAllWord: 'هەمووی',
  calendarImpactA11yPrefix: 'پاڵاوتن بەپێی کاریگەری',
  calendarAllShort: 'هەموو',
  calendarLoading: 'ڕۆژژمێرەکە بار دەکرێت…',
  calendarLoadError: 'نەکرا ڕۆژژمێرەکە باربکرێت — پەیوەندییەکەت بپشکنە',
  calendarEmpty: 'هیچ ڕووداوێک لەگەڵ ئەم فلتەرە نییە',
  layoutDefaultName: 'نەخشەسازیم',
  layoutFallbackName: 'نەخشەسازی',
  layoutsTitle: 'نەخشەسازییە پاشەکەوتکراوەکان',
  layoutNamePlaceholder: 'ناوی نەخشەسازی',
  layoutNameA11y: 'ناوی نەخشەسازی',
  layoutSaveA11y: 'پاشەکەوتکردنی نەخشەسازی ئێستا',
  layoutSaveBtn: 'پاشەکەوتکردنی نەخشەسازی ئێستا',
  layoutApplyA11yPrefix: 'جێبەجێکردنی نەخشەسازی',
  layoutDeleteConfirmTitle: 'نەخشەسازییەکە بسڕدرێتەوە؟',
  layoutDeleteA11yPrefix: 'سڕینەوەی نەخشەسازی',
  coursesTitle: 'ئەکادیمی',
  coursesSub: 'شاشەی تەواو · ڕوونکردنەوەی دەنگی · ڕاوەستە و پرسیار بکە دەربارەی هەر بەشێک',
  coursesStaleNote: 'نەکرا لیستی قوتابخانەکان نوێبکرێتەوە — زانیاری پاشەکەوتکراو پیشان دەدرێت',
  coursesNoteTitle: 'پۆلێنبەندییەکی گرنگ',
  coursesNoteText:
    'BOS و CHOCH پەیوەستن بە کۆمەڵەی Order Block و Fair Value Gap ناو قوتابخانەی ICT/SMC — قوتابخانەیەکی جیاواز نین.',
  coursesSchoolA11yPrefix: 'قوتابخانە',
  coursesLevelsWord: 'ئاست',
  coursesLecturesUnitWord: 'وانە',
  coursesVoiceWord: 'دەنگی',
  coursesAudioLabel: 'دەنگ',
  coursesFallbackNote: 'نەکرا کوریکولەی تەواو باربکرێت — تەنها وانەیەکی سەرەتایی کاتی پیشان دەدرێت',
  coursesLevelWord: 'ئاست',
  coursesLectureA11yPrefix: 'وانە',
  coursesMinuteWord: 'خولەک',
  coursesMinuteAbbrev: 'خولەک',
  coursesFullLectureWord: 'وانەی تەواو',
  coursesBackToSchoolsA11y: 'گەڕانەوە بۆ لیستی قوتابخانەکان',
  coursesBack: 'گەڕانەوە',
  lectureClose: 'داخستن',
  lectureCloseA11y: 'داخستنی وانەکە',
  lectureLevelWord: 'ئاست',
  lectureLoadFailedNote: 'نەکرا ئەم وانەیە باربکرێت — لە جیاتی ئەوە ناوەڕۆکی نموونەیی گشتی پیشان دەدرێت',
  lectureFullScreenTag: 'شاشەی تەواو',
  lectureVoicePausedForQ: 'ڕاوەستاوە بۆ پرسیارێک',
  lecturePreparingVoice: 'دەنگ ئامادە دەکرێت...',
  lectureExplainingNow: 'ئێستا ڕوون دەکاتەوە',
  lectureVoicePlayError: 'نەکرا دەنگ لێبدرێت',
  lectureChartLabel: 'چارتی کارلێککەرەوە',
  lectureHideChart: 'شاردنەوە',
  lectureHideChartA11y: 'شاردنەوەی چارتی کارلێککەرەوە',
  lectureShowChart: 'پیشاندانی چارتی کارلێککەرەوە',
  lectureVoiceStopped: 'دەنگ ڕاوەستا',
  lectureGenerating: 'دروستکردن لە جێبەجێکردندایە...',
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
  lectureQuestionPlaceholder: 'نموونە: تێنەگەیشتم لە CHOCH...',
  lectureQuestionA11y: 'پرسیار لە کاتی ڕاگرتنی ڕوونکردنەوەکە',
  lectureAskBtn: 'بپرسە',
  lectureAskA11y: 'ناردنی پرسیارەکە',
  termShadowSizeSmall: 'بچووک',
  termShadowSizeMedium: 'ناوەند',
  termShadowSizeBig: 'گەورە',
  termServerOnline: 'ڕاژە بەستراوە',
  termServerOffline: 'ڕاژە پەیوەندی نیە',
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
  termTimeSyncUnavailable: 'هاوکاتکردن بەردەست نیە لە چوارچێوەی سێبەردا',
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
  termSquareFramesHintSuffix: 'چوارچێوەی چوارگۆشە · پەنجە بگرە لەسەر هەر بۆکسێک بۆ گۆڕینی شوێنی · ئاماژەکان ئارەزوومەندانەن',
  termHintMoveText:
    'پێشبینیەکان · ئاگاداریەکان · هەواڵەکان · کۆمەڵگا → ئامرازەکان · پەنجە بگرە لەسەر شریتەکە و ڕایکێشە بۆ گۆڕینی شوێنی چوارچێوەکان',
  termCloseWatchlistA11y: 'داخستنی لیستی چاودێری',
  wlTitle: 'لیستی چاودێری',
  wlAddBtn: 'زیادکردن',
  wlAddA11y: 'زیادکردنی هێما بۆ چاودێری',
  wlResetBtn: 'بنەڕەت',
  wlResetA11y: 'گەڕاندنەوەی لیستی چاودێری بۆ بنەڕەت',
  wlResetConfirmTitle: 'لیستی چاودێری بگەڕێتەوە بۆ بنەڕەت؟',
  wlResetConfirmBody: 'هەموو هێماکانی زیادکراو بە دەستی دەگۆڕدرێن بۆ لیستی بنەڕەت.',
  wlResetConfirmBtn: 'گەڕاندنەوە بۆ بنەڕەت',
  wlSearchPlaceholder: 'گەڕان بۆ هێما...',
  wlLoadError: 'نەتوانرا لیستی چاودێری بار بکرێت',
  wlRetryA11y: 'دووبارە هەوڵدانەوەی بارکردنی لیستی چاودێری',
  wlRetryBtn: 'دووبارە هەوڵدان',
  wlLoadingWord: 'بارکردن...',
  wlEmpty: 'هیچ هێمایەک لە چاودێریدا نییە',
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
  focusCompareHint: 'درێژ دابگرە بۆ بەراورد',
  focusCompareTag: 'بەراورد',
  focusPickSymbolA11yPrefix: 'هەڵبژاردنی هێما',
  focusCompareNotePrefix: 'بەراوردکردن لەگەڵ',
  focusCompareNoteSuffix: '(مۆر)',
  focusInComparisonSuffix: ' · لە بەراوردکردندایە',
  focusAlertCreateFailedTitle: 'نەتوانرا ئاگادارکردنەوە دروست بکرێت',
  focusAlertCreateFailedBody: 'هەڵەیەک ڕوویدا لە دروستکردنی ئاگادارکردنەوە لە هێڵی وێنەکێشان، دووبارە هەوڵبدەرەوە.',
  focusAlertFromDrawingNote: 'لە هێڵی وێنەکێشانەوە',
  gridFramesWord: 'چوارچێوەکان',
  gridSquaresWord: 'چوارگۆشەکان',
  gridSquaresA11y: 'پیشاندانی چوارچێوەکان وەک چوارگۆشە',
  gridRectanglesWord: 'لاکێشراوەکان',
  gridRectanglesA11y: 'پیشاندانی چوارچێوەکان وەک لاکێشراو',
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
