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
  screenerNoMatchOf: string;
  screenerShowingOf: string;
  screenerChangeSpan: string;
  screenerTapToOpen: string;
  screenerOpenChartA11y: string;
  newsTitle: string;
  newsStale: string;
  newsEmpty: string;
  newsLoadError: string;
  aiPanelTitle: string;
  aiGreeting: string;
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
  riskCalcSub: string;
  riskCalcSymbol: string;
  riskCalcBadSymbol: string;
  /** رمز حساب Exness Cent («USDJPYc») — الحاسبة ترفضه عمداً (حجم العقد مختلف)؛ `{symbol}` كما كُتب، `{pair}` بلا «c» */
  riskCalcCentSymbolHint: string;
  appCrashTitle: string;
  appCrashBody: string;
  appCrashRepeatBody: string;
  appCrashRetry: string;
  planSlWrongBuy: string;
  planSlWrongSell: string;
  planTpWrongBuy: string;
  planTpWrongSell: string;
  planSlTooClose: string;
  planRiskWord: string;
  planRewardWord: string;
  planLowRR: string;
  riskCalcAccountCcy: string;
  riskCalcBalance: string;
  riskCalcRiskPct: string;
  riskCalcRiskMoneyHint: string;
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
  riskCalcLots: string;
  riskCalcRiskAmount: string;
  riskCalcUnits: string;
  riskCalcBelowMin: string;
  riskCalcFillHint: string;
  invalidNumberHint: string;
  /** سعر «3.450» مرفوض لأنه مبهم لأداة منازلها أقلّ من ثلاث (`parsePriceFor`) — {value} كما كُتب، {whole} بلا النقطة (3450)، {small} كسراً (3.45) */
  priceAmbiguousThousandsHint: string;
  /** رقم فيه «٬» (فاصل الآلاف العربي) بغير موضع آلاف — «0٬5» يُرفض (`parseDecimal`، `49db13b`)؛ الحرفان متشابهان على لوحة المفاتيح العربية فيُقال أيّهما يُكتب للكسر */
  arabicThousandsSignHint: string;
  riskCalcPipValue: string;
  /** حاسبة الهامش (طلب وكيل الأدوات): خانة الرافعة، سطر الهامش، وملاحظة أن الهامش ليس الخسارة */
  riskCalcLeverage: string;
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
  riskCalcRiskWithSpread: string;
  riskCalcSpreadLotsWithin: string;
  riskCalcSpreadTooWide: string;
  /** الوقف ليس أبعد من السبريد — يُضرب لحظة الفتح تقريباً (طلب وكيل الأدوات)؛ `{sl}` و`{spread}` بالنقاط كما تُعرض */
  riskCalcStopInsideSpread: string;
  riskCalcCommission: string;
  riskCalcCommissionNote: string;
  riskCalcRiskWithCosts: string;
  riskCalcCostsLotsWithin: string;
  riskCalcNetAfterCosts: string;
  riskCalcNetNegative: string;
  // تحذير R:R منخفضة حين تُقرأ من الصافي (`rewardBelowRisk` مع تكاليف): `planLowRR` («الربح المحتمل…») يسمّي السطر الإجمالي فوقه وقد يقول 1:1.1
  riskCalcLowNetRR: string;
  // الحجم فوق `MAX_SANE_LOTS` (100): رصيد كبير بوقف 1 pip يُخرج 200 lot بلا إشارة، وأغلب الوسطاء يرفضون أمراً فوق 50–100
  riskCalcOverOrderMax: string;
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
  /** شريط الخبر حين فشل التقويم ولا نسخة محفوظة — غياب التحذير هنا ليس «لا خطر» (طلب وكيل الأدوات) */
  newsUnavailable: string;
  calToday: string;
  calTomorrow: string;
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
  journalStatTotalPnl: string;
  /** بديل أصدق لـ`journalStatTotalPnl`: الرقم مجموع نسب حركة السعر لكل صفقة بلا حجم (`db.trade_stats`)، لا ربح الحساب */
  journalStatPriceMoveSum: string;
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
  journalExitA11y: string;
  /** قارئ الشاشة لشرائح «= SL/= BE/= TP» تحت خانة الخروج — `{price}` نصّ الخانة المنسوخ؛ «SL»/«BE» تُقرأ حروفاً */
  journalExitAtSlA11y: string;
  journalExitAtBeA11y: string;
  journalExitAtTpA11y: string;
  /** قارئ الشاشة لشرائح الوقف بالمسافة («−20 pip») تحت خانة الوقف — `{pips}` العدد، `{price}` سعر الوقف المكتوب */
  journalSlAtPipsA11y: string;
  journalNotePlaceholder: string;
  journalSlPlaceholder: string;
  journalTpPlaceholder: string;
  journalInvalidEntry: string;
  journalResultR: string;
  journalNoteA11y: string;
  journalAddA11y: string;
  journalAddBtn: string;
  journalAddError: string;
  journalCloseFailedTitle: string;
  journalCloseFailedBody: string;
  journalLoadError: string;
  journalEmpty: string;
  journalOpenSuffix: string;
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
  calendarTitle: string;
  calendarCurrencyA11yPrefix: string;
  calendarAllWord: string;
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
  coursesFullLectureWord: string;
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
  chartTemplateDeleteFailed: string;
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
  railFrameWord: string;
  railSquareWord: string;
  railRectangleWord: string;
  railShadowWord: string;
  cfSyncLeaderBadge: string;
  cfSyncPartialBadge: string;
  cfSyncFollowBadge: string;
  cfSubtitleInteractive: string;
  cfSubtitleNavigate: string;
  cfSubtitleDefault: string;
  cfSyncActivateA11yPrefix: string;
  cfChangeSymbolA11y: string;
  cfMarketClosedA11y: string;
  /** «⏪» بجانب سعر الرأس بالإعادة — `mcReplayModeA11y` («وضع الإعادة») لا يقول إن السعر المقروء ليس الحيّ */
  cfReplayPriceA11y: string;
  cfMarketClosedTag: string;
  cfSpreadA11y: string;
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
  mcPrimaryLane: string;
  mcMeasureBarsWord: string;
  mcNoteDefault: string;
  mcSnapshotSaved: string;
  mcSnapshotFailed: string;
  mcTemplateDefaultName: string;
  mcTemplateSaved: string;
  mcClearAllTitle: string;
  mcClearAllBody: string;
  mcClearWord: string;
  mcHintDraw: string;
  mcHintNavigate: string;
  /** الويب بالفأرة: المعاينة بالمرور، النقر يثبّت، ←/→ و Esc بعد التثبيت. */
  mcHintNavigateWeb: string;
  /** الويب بالفأرة وأداة رسم نشطة: Esc يلغي النقطة الأولى ثم يغادر الأداة، Ctrl/⌘+Z يتراجع. */
  mcHintDrawWeb: string;
  /** الويب ورسم محدَّد: Delete/Backspace يحذفه (قابل للتراجع)، Esc يلغي التحديد. */
  mcHintSelectedWeb: string;
  /** أداة «تحديد» ولا رسم محدَّد: اللمس على رسم يحدّده، وعلى فراغ يلغي التحديد (`hitDrawing`). */
  mcHintSelect: string;
  /** أداة «تحديد» ورسم محدَّد (الهاتف): جسمه يحرّكه كلّه (`translateDrawing`)، المقبض يحرّك طرفه. */
  mcHintSelected: string;
  /** زرّ AUTO بزاوية المحورين لقارئ الشاشة: يعيد مقياس السعر وعدد الشموع ويرجع لآخر شمعة. */
  mcAutoA11y: string;
  /** AUTO ممتلئ حين مقياس السعر يدوي (مطّ المحور أو سحب رأسي) — يشرح لماذا قد تختفي شمعة جديدة. */
  mcAutoManualA11y: string;
  mcZoomOutA11y: string;
  mcZoomInA11y: string;
  mcPanBackA11y: string;
  mcPanForwardA11y: string;
  mcReplayModeA11y: string;
  /** سطر القراءة أثناء الإعادة: `{n}` الشموع المعروضة من `{total}`. بديل «Bar Replay» الثابت (اسم ميزة منافس). */
  mcReplayReadout: string;
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
  ssbError: string;
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
  password: 'كلمة المرور',
  passwordPlaceholder: 'كلمة المرور',
  enter: 'دخول',
  createAccount: 'إنشاء حساب',
  logout: 'تسجيل خروج',
  hello: 'مرحباً',
  accountType: 'نوع الحساب',
  sponsorCode: 'رمز الدعوة (اختياري)',
  underSponsor: 'جهتك تحت صاحب الدعوة',
  left: 'يسار',
  right: 'يمين',
  trader: 'متداول',
  trainer: 'مدرب',
  broker: 'بروكر',
  agent: 'وكيل',
  company: 'شركة',
  loginError: 'تعذّر الدخول — تحقّق من الاسم أو الإيميل وكلمة المرور، ومن اتصالك بالإنترنت',
  registerError: 'تعذّر التسجيل — تحقّق من الإيميل والبيانات ورمز الدعوة، ومن اتصالك بالإنترنت',
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
  onboardStep1Title: 'بدّل الزوج بلمسة',
  onboardStep1Body:
    'اضغط على أي زوج بالشريط العلوي (EURUSD، GBPUSD، الذهب XAUUSD…) لينتقل الشارت إليه فوراً، مع تغيّر اليوم ▲▼ بجانبه. وعلى الشارت: اقرص بإصبعين للتكبير، واسحب محور السعر لتطول الشموع أو تقصر، وزرّ AUTO يعيد العرض لوضعه التلقائي. ولاحقاً افتح حتى أربع شارتات معاً للمقارنة.',
  onboardStep2Title: 'أدوات الرسم',
  onboardStep2Body:
    'تبويب «رسم» بالشريط السفلي يفتح خطوط الترند وفيبوناتشي وباقي الأدوات على الشارت، وما ترسمه على 4H يبقى حين تنزل إلى الساعة. ولتخطيط صفقة استعمل «خطة شراء» أو «خطة بيع»: اسحب من الدخول إلى الوقف فيظهر الهدف والنقاط ونسبة العائد إلى المخاطرة. أخطأت؟ زرّ «تراجع» يلغي آخر تغيير.',
  onboardStep3Title: 'المؤشرات والعدسات',
  onboardStep3Body:
    'اختر من عشرات المؤشرات الجاهزة (RSI وMACD وبولنجر وغيرها)، أو ابدأ بعدسة تضع لك مجموعة مؤشرات بلمسة واحدة: «هيكل» للمتوسطات المتحركة، «زخم» لـRSI وMACD، «سيولة» للفوليوم وبولنجر وCVD. وللفوركس خاصةً: «Sessions» يظلّل جلسات طوكيو ولندن ونيويورك بأوقاتها الصحيحة صيفاً وشتاءً، و«PDH / PDL» يرسم أعلى وأدنى جلسة الأمس.',
  onboardStep4Title: 'التنبيهات',
  onboardStep4Body:
    'أسرع طريق: المس المستوى على الشارت ثم زرّ 🔔 — بلا كتابة أرقام. ويصلك إشعار حين يبلغه السعر (يُفحص كل دقيقة تقريباً)، فلا داعي لمراقبة الشارت طوال اليوم. تنبيهات المؤشرات وتفعيل الإشعارات من لوح التنبيهات.',
  onboardStep5Title: 'المخاطرة أولاً',
  onboardStep5Body:
    'قبل أي صفقة افتح «أدوات ← المخاطرة»: أدخل رصيدك ونسبة المخاطرة ووقف الخسارة (بالـpip أو بسعرَي الدخول والوقف) لتعرف حجم اللوت المناسب (وأضف السبريد والعمولة ليشملهما الرقم)، ثم «سجّل هذه الخطة بالدفتر» لتراجع نتيجتها لاحقاً. كثير من المتداولين لا يخاطرون بأكثر من 1–2% بالصفقة.',
  onboardRiskNote:
    'MATRIX أداة تحليل وتعليم، لا تنفّذ صفقات ولا تقدّم نصيحة مالية. التداول بالرافعة ينطوي على مخاطرة عالية بخسارة المال.',
  onboardStepCounterA11y: 'الخطوة {n} من {total}',
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
  toolsTabJournal: 'الدفتر',
  toolsTabScreener: 'فحص',
  toolsTabBacktest: 'اختبار خلفي',
  toolsTabIndAlerts: 'تنبيهات+',
  toolsTabCalendar: 'تقويم',
  toolsTabLayouts: 'تخطيط',
  toolsTabAi: 'AI',
  a11yTabPrefix: 'تبويب',
  a11ySignalSymbolPrefix: 'رمز الإشارة',
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
  filterBullishHint: 'السعر أعلى مما كان قبل 80 شمعة، وRSI دون 65 (غير متشبّع)',
  filterBearishLabel: 'زخم -',
  filterBearishHint: 'السعر أدنى مما كان قبل 80 شمعة، وRSI فوق 35 (غير متشبّع)',
  a11yFilterPrefix: 'فلتر',
  screenerRunning: 'جاري الفحص...',
  screenerRunBtn: 'شغّل الفحص',
  screenerRunNeedFilter: 'اختر فلتراً أولاً ثم شغّل الفحص',
  screenerNeedApiKey: 'الفحص يحتاج مفتاح Twelve Data مفعّلاً على الخادم',
  screenerNoResults: 'لا نتائج مطابقة للفلاتر الحالية',
  screenerFailed: 'تعذر تشغيل الفحص — تحقق من الاتصال وحاول مرة أخرى',
  screenerScanNone: 'تعذّر جلب أسعار أي رمز — غالباً حدّ طلبات مزوّد الأسعار؛ انتظر دقيقة وأعد الفحص',
  screenerScanPartial: 'فُحص {k} من {total} رمزاً فقط — تعذّرت قراءة: {list} (حدّ طلبات المزوّد غالباً). النتائج من المفحوصة فقط.',
  screenerNoMatchOf: 'لا تطابق بين {k} رمزاً مفحوصاً على فريم {tf}',
  screenerShowingOf: 'عرض أقوى {n} من {total} نتيجة (الأكبر حركةً أولاً)',
  screenerChangeSpan: '(آخر 80 شمعة)',
  screenerTapToOpen: 'اضغط أي نتيجة لفتح شارتها على نفس الفريم',
  screenerOpenChartA11y: 'فتح الشارت',
  newsTitle: 'أخبار مؤثرة على الفوركس',
  newsStale: 'تعذّر التحديث — الموعد من تقويم محفوظ',
  newsEmpty: 'لا عناوين مؤثرة الآن — ومواعيد البيانات القادمة (الفائدة، الوظائف، التضخم) تجدها في «تقويم».',
  newsLoadError: 'تعذّر تحميل الأخبار — تحقق من الاتصال وافتح اللوحة لاحقاً',
  aiPanelTitle: 'مساعد ذكاء اصطناعي',
  aiGreeting:
    'أنا مساعد MATRIX الآلي. اسألني عن تحليل الزوج، سيناريو صفقة، إدارة المخاطرة، أو علاقته بـDXY. إجاباتي تحليل آلي تتعلّم منه، لا نصيحة مالية — راجع أي مستوى على الشارت قبل أن تعتمد عليه.',
  aiOfflineFallback:
    'تعذّر الاتصال بالخادم — تحقّق من اتصالك بالإنترنت وحاول بعد قليل.\n\nتحليل محلي سريع: راقب DXY قبل أي دخول على أزواج الدولار، واستخدم وقف واضح بنسبة مخاطرة ≤ 1%.',
  aiInputPlaceholder: 'مثال: تحليل {symbol} اليوم؟',
  aiInputA11y: 'سؤال لمساعد الذكاء الاصطناعي',
  aiSendA11y: 'إرسال سؤال لمساعد الذكاء الاصطناعي',
  aiAskBtn: 'اسأل',
  analystsTitle: 'توقعات المحللين',
  analystsSubSuffix: 'إجماع بيوت بحث',
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
  socialTitle: 'المعدل التقريبي للتوصيات والصفقات',
  socialSub: 'تيليجرام · فيسبوك · إنستغرام · X · تطبيقات',
  socialPickHint: 'اختر المصادر التي تتابعها — ثم يُحسب المعدل العام',
  socialSourcesError: 'تعذر تحميل قائمة المصادر — تحقق من الاتصال',
  a11ySourcePrefix: 'مصدر',
  sourcesCountLabel: 'مصادر',
  suggestedTradeLabel: 'صفقة مقترحة',
  socialNoClearTrade: 'لا صفقة واضحة — الآراء متضاربة أو محايدة',
  socialComputeError: 'تعذّر حساب إجماع القنوات — تحقّق من الاتصال ثم اضغط «احسب»',
  chatTitle: 'دردشة جماعية',
  chatLoadError: 'تعذر تحميل الرسائل — تحقق من الاتصال',
  chatEmpty: 'لا توجد رسائل بعد — كن أول من يكتب',
  chatSendError: 'تعذر إرسال رسالتك للمجموعة — قد لا تصل، حاول لاحقاً',
  chatYou: 'أنت',
  chatAnonTrader: 'متداول',
  chatLoginRequired: 'سجّل الدخول للمشاركة بمحادثة المجموعة — رسائلك تظهر باسم حسابك',
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
  voteLoadError: 'تعذر تحميل التصويتات — تحقق من الاتصال',
  voteEmpty:
    'لا تصويتات نشطة حالياً — انشر فكرتك بالأعلى (رمز واتجاه ودخول ووقف وهدف) وشاهد رأي بقية المتداولين.',
  voteByAuthor: 'بواسطة {author}',
  voteApprovalLabel: 'موافقة',
  voteAgreeWord: 'موافق',
  voteDisagreeWord: 'رافض',
  voteCastError: 'تعذر إرسال صوتك للخادم — قد لا يُحتسب، حاول لاحقاً',
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
  forecastTradeLabel: 'صفقة',
  forecastNoSignal: 'لا إشارة قوية — انتظر تأكيد المؤشرات',
  forecastAgreeLabel: 'مؤشرات متوافقة',
  forecastError: 'تعذّر حساب توقعات المؤشرات — تحقّق من الاتصال ثم اضغط «توقّع»',
  alertsTitle: 'تنبيهات السعر',
  alertsSub: 'فوق / تحت · Twelve Data · إشعار عند التفعيل',
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
  alertsFirstBadge: '🎉 أول تنبيه مضبوط — سنُعلمك فور وصول السعر',
  alertsLoadError: 'تعذّر تحميل التنبيهات — تحقّق من الاتصال. تنبيهاتك المحفوظة لم تُحذف.',
  alertsEmpty:
    'لا تنبيهات بعد — اكتب سعراً بالأعلى (أو اضغط «استخدمه» للسعر الحالي) واختر فوق/تحت، وسيصلك إشعار حين يصل السعر إليه.',
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
  alertsClearFiredConfirm: 'حذف {n} تنبيه أُطلق؟ التنبيهات التي تراقب تبقى كما هي.',
  alertsEditA11yPrefix: 'تعديل التنبيه',
  alertsStatusArmed: '● مُفعَّل — بانتظار السعر',
  alertsStatusTriggered: 'انطلق ✓',
  riskCalcTitle: 'حاسبة حجم المركز',
  riskCalcSub: 'كم لوت تفتح حتى لا تخسر أكثر من نسبة محددة من رصيدك',
  riskCalcSymbol: 'الأداة',
  riskCalcBadSymbol: 'رمز غير مدعوم — استخدم زوجاً من 6 أحرف مثل EURUSD أو XAUUSD',
  riskCalcCentSymbolHint:
    '«{symbol}» رمز حساب سنت — الحاسبة تحسب لوت الحساب العادي فقط، وعقد السنت أصغر. لحساب عادي اكتب {pair}',
  appCrashTitle: 'حدث خطأ غير متوقع',
  appCrashBody: 'تعذّر عرض هذه الشاشة. بياناتك ورسوماتك محفوظة — اضغط «إعادة المحاولة» للمتابعة.',
  appCrashRepeatBody:
    'ما زالت الشاشة تتعثّر. أغلق MATRIX كلياً (اسحبه من قائمة التطبيقات المفتوحة) ثم افتحه من جديد — رسوماتك محفوظة.',
  appCrashRetry: 'إعادة المحاولة',
  planSlWrongBuy: 'الوقف يجب أن يكون تحت سعر الدخول في صفقة الشراء',
  planSlWrongSell: 'الوقف يجب أن يكون فوق سعر الدخول في صفقة البيع',
  planTpWrongBuy: 'الهدف يجب أن يكون فوق سعر الدخول في صفقة الشراء',
  planTpWrongSell: 'الهدف يجب أن يكون تحت سعر الدخول في صفقة البيع',
  planSlTooClose: 'الوقف أقرب من 1 pip للدخول — أضيق من السبريد نفسه؛ راجع الرقم',
  planRiskWord: 'المخاطرة',
  planRewardWord: 'الربح المحتمل',
  planLowRR: '⚠ الربح المحتمل أقل من المخاطرة',
  riskCalcAccountCcy: 'عملة الحساب',
  riskCalcBalance: 'رصيد الحساب',
  riskCalcRiskPct: 'المخاطرة (% أو مبلغ)',
  riskCalcRiskMoneyHint: 'اضغط {ccy} لتكتب المخاطرة مبلغاً بدل النسبة',
  riskCalcHighRisk: '⚠ أكثر من 2% للصفقة الواحدة مخاطرة عالية',
  riskCalcSlPips: 'وقف الخسارة (بالنقاط pip)',
  riskCalcFromPrice: 'أو احسبه من السعر: الدخول والوقف كما تراهما على الشارت',
  riskCalcSlMismatch:
    '⚠ النقاط المكتوبة ({pips}) لا تطابق سعرَي الدخول والوقف ({derived} pip) — حجم اللوت والمخاطرة محسوبان من النقاط، وR:R من السعرين',
  riskCalcEntry: 'سعر الدخول',
  riskCalcStop: 'سعر الوقف',
  riskCalcStopChip: '{side}: الوقف {price}',
  riskCalcConvFailed: 'تعذّر جلب سعر التحويل',
  riskCalcConvManual: 'أدخل سعر',
  riskCalcLots: 'حجم الصفقة (لوت)',
  riskCalcRiskAmount: 'المخاطرة الفعلية',
  riskCalcUnits: 'الوحدات',
  riskCalcBelowMin: 'لا حجم يناسب هذه المخاطرة: أصغر لوت (0.01) يتجاوز ما حدّدتَه',
  riskCalcFillHint: 'أدخل الرصيد ونسبة المخاطرة ووقف الخسارة',
  invalidNumberHint: 'رقم غير مفهوم — اكتبه بلا فواصل آلاف، مثل 10000 أو 1.0850',
  priceAmbiguousThousandsHint: 'السعر «{value}» مبهم — هل النقطة فاصل آلاف أم فاصلة عشرية؟ اكتب {whole} أو {small}',
  arabicThousandsSignHint: '«٬» فاصلة الآلاف لا الفاصلة العشرية — للكسر اكتب «٫» أو نقطة، مثل 0٫5',
  riskCalcPipValue: 'قيمة النقطة للوت',
  riskCalcLeverage: 'الرافعة المالية (100 تعني 1:100)',
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
    'لا تُسجَّل الخطة بوقفين مختلفين — اكتب {derived} بخانة النقاط، أو عدّل سعر الوقف ليطابق نقاطك',
  riskCalcSlMismatchNarrower: '⚠ نقاطك ({pips}) أضيق من مسافة السعرين ({derived} pip) — اللوت المحسوب أكبر مما تحتمله مخاطرتك إن بقي الوقف عند سعره',
  riskCalcSpread: 'السبريد (بالنقاط، اختياري)',
  riskCalcSpreadNote: 'السبريد يُضاف عادةً إلى مسافة الوقف: وقف 20 نقطة بسبريد 1.5 يخسر قرابة 21.5 عند ضربه. انظر السبريد الحالي بمنصّتك — يتّسع عند الأخبار وافتتاح الأسبوع.',
  riskCalcRiskWithSpread: 'المخاطرة شاملة السبريد',
  riskCalcSpreadLotsWithin: 'لتبقى مخاطرتك {pct}% شاملة السبريد: {lots} lot',
  riskCalcSpreadTooWide: 'سبريد {n} نقطة غير واقعي — هل كتبتَ سعراً بدل النقاط؟ اكتب الفرق بين Ask وBid بالنقاط (مثل 1.5).',
  riskCalcStopInsideSpread:
    'الوقف ({sl} نقطة) ليس أبعد من السبريد ({spread} نقطة) — قد يُضرب فور فتح الصفقة. وسّع الوقف وقلّل اللوت، أو انتظر سبريداً أضيق.',
  riskCalcCommission: 'عمولة اختيارية لكل لوت، فتحاً وإغلاقاً',
  riskCalcCommissionNote: 'حسابات Raw/ECN تأخذ عمولة عند الفتح وعند الإغلاق. اكتب مجموع الطرفين للوت الواحد بعملة حسابك (مثل 7)، واتركها فارغة إن كان حسابك بلا عمولة.',
  riskCalcRiskWithCosts: 'المخاطرة شاملة التكاليف',
  riskCalcCostsLotsWithin: 'لتبقى مخاطرتك {pct}% شاملة التكاليف: {lots} lot',
  riskCalcNetAfterCosts: 'بعد التكاليف: {profit} · R:R {rr}',
  riskCalcNetNegative: 'التكاليف تأكل الهدف كلّه: الصافي {profit} — أبعِد الهدف أو اختر حساباً بتكاليف أقل',
  riskCalcLowNetRR: '⚠ بعد التكاليف يصير الربح أقل من المخاطرة',
  riskCalcOverOrderMax: '⚠ {lots} lot أكبر من أقصى أمر يقبله أغلب الوسطاء (50–100 lot) — قسّم الصفقة على أوامر أو راجع الوقف',
  riskCalcCostsBelowMin: 'مع التكاليف، حتى أصغر لوت (0.01) يتجاوز {pct}% — ارفع النسبة أو قرّب الوقف',
  riskCalcUseLivePrice: '↓ الدخول = السعر الحالي',
  riskCalcUseLivePriceA11y: 'تعبئة خانة الدخول بسعر السوق الحالي (Ask للشراء وBid للبيع حسب موضع الوقف)',
  riskCalcLiveFilled: '✓ الدخول من السعر الحالي:',
  riskCalcLiveSideMoved: '✓ نُقل الدخول إلى {quote} (سعر {side}): {price}',
  riskCalcNoLiveQuote: 'لا سعر حي لهذا الرمز الآن — اكتب سعر الدخول يدوياً',
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
  newsUnavailable: 'تعذّر تحميل تقويم الأخبار — لا نعرف إن كان خبر قوي قريباً؛ تحقّق قبل الدخول',
  calToday: 'اليوم',
  calTomorrow: 'غداً',
  calSampleBanner: '⚠ أمثلة توضيحية — تعذّر جلب التقويم الحي الآن',
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
  reportAdviceTitle: 'رأي MATRIX',
  reportAdviceHint: 'نصائح الأسبوع',
  reportRiskTitle: 'موجز مخاطر',
  reportRiskHint: 'إدارة رأس المال',
  reportOpenWord: 'مفتوح ↓',
  reportAiFallbackNote: 'تعذر الاتصال بالذكاء الاصطناعي — هذا قالب عام بدل تحليل مخصَّص',
  reportJournalDataLine:
    'بيانات دفتر الصفقات الفعلية (كل الصفقات المغلقة، لا هذا الأسبوع وحده): صفقات={trades} نجاح={winRate}% PnL={pnl}% أفضل={best}% أسوأ={worst}%. اعتمد عليها في التقرير.',
  reportJournalEmptyLine: '(لا توجد صفقات مغلقة في الدفتر بعد — لا أرقام أداء لعرضها).',
  reportJournalUnavailableLine: '(تعذّرت قراءة دفتر الصفقات الآن — التقرير بلا أرقامك).',
  reportFallbackWeekly: 'تقرير من دفتر الصفقات{journalLine}\nسجّل صفقاتك في تبويب «الدفتر» لبناء تقرير أدق.',
  reportFallbackPerformance: 'تقييم مبني على الدفتر{journalLine}',
  reportFallbackRisk: 'موجز مخاطر{journalLine}\n1) مخاطرة ≤1%.\n2) وقف واضح.\n3) تجنّب الأخبار الثقيلة.',
  reportFallbackAdvice:
    'نصائح MATRIX{journalLine}\n1) راجع صفقاتك المفتوحة.\n2) اربط الدخول بـ DXY.\n3) مخاطرة ≤1%.\n4) تجنّب الأخبار عالية التأثير.\n5) ركّز على 2–3 أزواج.',
  journalTitle: 'دفتر الصفقات · PnL من صفقاتك',
  journalSub: 'سجّل صفقاتك — التقارير تُبنى من يوميتك',
  journalStatClosed: 'صفقات مغلقة: {n}',
  journalStatWinRate: 'نسبة نجاح: {pct}%',
  journalStatTotalPnl: 'إجمالي PnL: {pct}%',
  journalStatPriceMoveSum: 'مجموع حركة السعر (بلا حجم الصفقة): {pct}%',
  journalStatBestWorst: 'أفضل/أسوأ: {best}% / {worst}%',
  journalStatsPending: 'لا صفقات مغلقة بعد — نسبة النجاح والـPnL تظهر بعد إغلاق أول صفقة.',
  journalStatNetPips: 'الصافي: {pips} pip',
  journalStatNetPipsBySymbol: 'الصافي لكل أداة: {parts}',
  journalStatAvgR: 'متوسط النتيجة: {r} لكل صفقة ({n} بوقف مسجَّل)',
  journalSideA11yPrefix: 'اتجاه الصفقة',
  journalSymbolPlaceholder: 'الرمز',
  journalSymbolA11y: 'رمز الصفقة',
  journalEntryPlaceholder: 'دخول',
  journalUseLivePrice: '↓ السعر الحالي',
  journalUseLivePriceA11y: 'تعبئة سعر الدخول بالسعر الحالي (Ask للشراء، Bid للبيع)',
  journalNoLiveQuote: 'لا سعر حي لهذا الرمز الآن — اكتب سعر الدخول يدوياً',
  journalEntryA11y: 'سعر الدخول',
  journalExitPlaceholder: 'خروج (اختياري)',
  journalSizePlaceholder: 'الحجم لوت (اختياري)',
  journalSizeA11y: 'حجم الصفقة باللوت (اختياري)',
  journalSizeUnitsFix: '⚠ {n} تبدو عدد وحدات لا لوتات — اضغط لتحويلها إلى {lots} lot',
  journalSizeUnitsNoFix: '⚠ {n} lot حجم غير واقعي — يبدو عدد وحدات منسوخاً من منصّتك؛ اكتب الحجم باللوت (مثل 0.10)',
  journalExitA11y: 'سعر الخروج (اختياري)',
  journalExitAtSlA11y: 'الخروج عند وقف الخسارة {price}',
  journalExitAtBeA11y: 'الخروج عند سعر الدخول (تعادل) {price}',
  journalExitAtTpA11y: 'الخروج عند الهدف {price}',
  journalSlAtPipsA11y: 'وقف الخسارة على بُعد {pips} نقطة من الدخول: {price}',
  journalNotePlaceholder: 'ملاحظة',
  journalSlPlaceholder: 'وقف الخسارة (اختياري)',
  journalTpPlaceholder: 'الهدف (اختياري)',
  journalInvalidEntry: 'اكتب رمزاً صحيحاً (مثل EURUSD أو XAUUSD) وسعر الدخول',
  journalResultR: 'النتيجة {r}',
  journalNoteA11y: 'ملاحظة الصفقة (اختياري)',
  journalAddA11y: 'إضافة صفقة جديدة',
  journalAddBtn: 'إضافة صفقة',
  journalAddError: 'تعذر إضافة الصفقة — تحقق من الاتصال وحاول مرة أخرى',
  journalCloseFailedTitle: 'تعذر الإغلاق',
  journalCloseFailedBody: 'تعذّر تأكيد الإغلاق — تحقّق من الاتصال. إن بقيت الصفقة «مفتوحة» في القائمة فأغلقها مرة أخرى.',
  journalLoadError: 'تعذّر تحميل الدفتر — تحقّق من الاتصال. صفقاتك المسجّلة لم تُحذف.',
  journalEmpty:
    'لا صفقات مسجّلة بعد — سجّل كل صفقة (حتى على حساب تجريبي) لتعرف مع الوقت ما ينجح معك وما لا ينجح. اكتبها بالنموذج أعلاه («↓ السعر الحالي» يملأ الدخول لحظة فتحها)، أو احسبها في «المخاطرة» ثم اضغط «سجّل هذه الخطة بالدفتر».',
  journalOpenSuffix: '(مفتوحة)',
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
  journalCloseLinkA11y: 'إغلاق صفقة {symbol} بسعر خانة الخروج',
  journalCloseLinkBtn: 'إغلاق بسعر خانة الخروج',
  journalCloseMarketBtn: 'إغلاق بالسعر الحالي',
  journalCloseMarketA11y: 'إغلاق صفقة {symbol} بالسعر الحالي',
  journalCloseMarketConfirmTitle: 'إغلاق بالسعر الحالي؟',
  journalCloseMarketConfirmBody: '{side} {symbol} · {entry} → {exit}\nالنتيجة: {result}\n\nالسعر من مزوّد البيانات (Bid للشراء، Ask للبيع) وقد يختلف قليلاً عن سعر وسيطك — يمكنك تعديله بعد الإغلاق.',
  journalCloseFieldConfirmTitle: 'إغلاق بسعر خانة الخروج؟',
  journalCloseMarketConfirmBtn: 'إغلاق',
  journalCloseMarketNoQuote: 'لا سعر حي لهذا الرمز الآن — اكتب سعر الخروج بخانة «خروج» ثم «إغلاق بسعر خانة الخروج»',
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
  backtestNoTrades: 'لم تُولِّد الاستراتيجية أي صفقة بهذه الفترة — لا نسبة نجاح ولا عائد لعرضهما. جرّب فريماً آخر.',
  backtestSmallSample: '⚠ عينة صغيرة ({n} صفقات) — نسبة النجاح هنا غير موثوقة؛ لا تبنِ قراراً على أقل من ~30 صفقة.',
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
  calendarTitle: 'تقويم اقتصادي · حي',
  calendarCurrencyA11yPrefix: 'تصفية حسب العملة',
  calendarAllWord: 'الكل',
  calendarImpactA11yPrefix: 'تصفية حسب الأهمية',
  calendarAllShort: 'كل',
  calImpactMedPlus: 'متوسط+',
  calImpactMedPlusA11y: 'عالي ومتوسط',
  calendarLoading: 'جاري تحميل التقويم…',
  calendarLoadError: 'تعذر تحميل التقويم — تحقق من الاتصال',
  calendarEmpty:
    'لا أحداث بهذا الفلتر — وسّع الأهمية أو أزل فلتر العملة، أو اختر يوماً آخر.',
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
  coursesFullLectureWord: 'محاضرة كاملة',
  coursesBackToSchoolsA11y: 'رجوع لقائمة المدارس',
  coursesBack: 'رجوع',
  coursesFallbackLevelTitle: 'التأسيس',
  coursesFallbackLectureTitle: 'محاضرة افتتاحية',
  coursesFallbackOutlineIntro: 'مقدمة',
  lectureClose: 'إغلاق',
  lectureCloseA11y: 'إغلاق المحاضرة',
  lectureLevelWord: 'مستوى',
  lectureLoadFailedNote: 'تعذر تحميل هذه المحاضرة — يُعرض محتوى تجريبي عام بدلاً منها',
  lectureFullScreenTag: 'شاشة كاملة',
  lectureVoicePausedForQ: 'متوقف للسؤال',
  lecturePreparingVoice: 'يجهّز الصوت...',
  lectureExplainingNow: 'يشرح الآن',
  lectureVoicePlayError: 'تعذّر تشغيل الصوت — تحقّق من اتصالك. نصّ الدرس كامل أمامك ويمكنك متابعته قراءةً.',
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
  lectureFallbackTitle: 'محاضرة تجريبية',
  lectureFallbackOutlineDefinition: 'تعريف',
  lectureFallbackOutlineApplication: 'تطبيق',
  lectureFallbackTeacher: 'الشرح الصوتي',
  lectureFallbackSeg1Title: 'افتتاح',
  lectureFallbackSeg1Narration:
    'أهلاً بك. الشاشة فقط مع شرح صوتي. يمكنك إيقاف الشرح في أي لحظة لتسأل.',
  lectureFallbackSeg2Title: 'الفكرة الأساسية',
  lectureFallbackSeg2Narration:
    'BOS و CHOCH جزء من هيكل السوق داخل Order Blocks و Fair Value Gaps في ICT/SMC.',
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
  wlLoadError: 'تعذّرت قراءة قائمة المتابعة من الهاتف — اضغط «إعادة المحاولة»',
  layoutSaveFailed: 'تعذّر حفظ التخطيط على الهاتف — تحقّق من مساحة التخزين وحاول مرة أخرى',
  layoutDeleteFailed: 'تعذّر حذف التخطيط — قد يعود للقائمة عند فتحها مجدداً، فاحذفه مرة أخرى',
  chartTemplateSaveFailed: 'تعذّر حفظ القالب على الهاتف — تحقّق من مساحة التخزين وحاول مرة أخرى',
  chartTemplateDeleteFailed: 'تعذّر حذف القالب — حاول مرة أخرى',
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
  focusCompareHint: 'اضغط مطولاً للمقارنة',
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
  ctlKindHollow: 'مجوّفة',
  ctlKindHeikin: 'هيكن',
  ctlKindBars: 'أعمدة',
  ctlKindLine: 'خط',
  ctlKindArea: 'منطقة',
  ctlKindBaseline: 'خط أساس',
  ctlKindRange: 'نطاق',
  ctlToolNone: 'مؤشر',
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
  railFrameWord: 'فريم',
  railSquareWord: 'مربع',
  railRectangleWord: 'مستطيل',
  railShadowWord: 'الظل',
  cfSyncLeaderBadge: 'قائد الزمن',
  cfSyncPartialBadge: 'متزامن · جزئي',
  cfSyncFollowBadge: 'متزامن',
  cfSubtitleInteractive: 'محرك MATRIX · عدسات وأدوات',
  cfSubtitleNavigate: 'اسحب الوسط · السعر · التواريخ',
  cfSubtitleDefault: 'اضغط للتحليل الكامل',
  cfSyncActivateA11yPrefix: 'تفعيل مزامنة شارت ',
  cfChangeSymbolA11y: 'تغيير الرمز',
  cfMarketClosedA11y: 'السوق مغلق حالياً',
  cfReplayPriceA11y: 'إعادة الشموع — السعر إغلاق شمعة الإعادة لا السعر الحيّ',
  cfMarketClosedTag: 'مغلق',
  cfSpreadA11y: 'سبريد البيع والشراء',
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
  mcPrimaryLane: 'أساسي',
  mcMeasureBarsWord: 'شموع',
  mcNoteDefault: 'ملاحظة',
  mcSnapshotSaved: 'تم حفظ لقطة الشارت',
  mcSnapshotFailed: 'تعذر تصدير الشارت',
  mcTemplateDefaultName: 'افتراضي',
  mcTemplateSaved: 'تم حفظ قالب الشارت',
  mcClearAllTitle: 'مسح كل الرسومات؟',
  mcClearAllBody: 'سيتم حذف كل عناصر الرسم بهذا الرمز على كل الأطر الزمنية',
  mcClearWord: 'مسح',
  mcHintDraw: 'اسحب لرسم، أو المس نقطتين · يُحفظ تلقائياً',
  mcHintNavigate: 'اسحب للتنقل · المس شمعة لقراءتها، أو اضغط مطوّلاً ثم اسحب · باعد إصبعين أو اسحب المحورين للتكبير',
  mcHintNavigateWeb: 'مرّر الفأرة للقراءة · انقر للتثبيت · ←/→ شمعة شمعة · Esc للإلغاء',
  mcHintDrawWeb: 'اسحب لرسم، أو انقر نقطتين · Esc للإلغاء · Ctrl+Z للتراجع · يُحفظ تلقائياً',
  mcHintSelectedWeb: 'اسحب لتحريك الرسم · Delete لحذفه · Esc لإلغاء التحديد · Ctrl+Z للتراجع',
  mcHintSelect: 'المس رسماً لتحديده · المس مكاناً فارغاً لإلغاء التحديد',
  mcHintSelected: 'اسحب الرسم لتحريكه · اسحب مقبضاً لتعديل طرف · يُحفظ تلقائياً',
  mcAutoA11y: 'تلقائي: ملاءمة الأسعار والعودة لآخر شمعة',
  mcAutoManualA11y: 'مقياس السعر يدوي — قد تخرج الشموع الجديدة عن العرض. اضغط لإعادته تلقائياً والعودة لآخر شمعة',
  mcZoomOutA11y: 'تصغير',
  mcZoomInA11y: 'تكبير',
  mcPanBackA11y: 'تحريك للخلف',
  mcPanForwardA11y: 'تحريك للأمام',
  mcReplayModeA11y: 'وضع الإعادة',
  mcReplayReadout: 'إعادة الشموع · {n}/{total}',
  mcReplayStepBackA11y: 'خطوة إعادة للخلف',
  mcReplayPauseA11y: 'إيقاف الإعادة',
  mcReplayPlayA11y: 'تشغيل الإعادة',
  mcReplayStepFwdA11y: 'خطوة إعادة للأمام',
  mcMagnetA11y: 'الالتصاق بالشبكة',
  mcDockTitle: 'مرسى الأدوات · MATRIX',
  mcNoPineLine: 'بلا خط معادلة',
  mcExportPng: 'تصدير PNG',
  mcSaveTemplate: 'حفظ قالب',
  mcAlertLine: 'تنبيه خط',
  mcAlertZone: 'تنبيه منطقة',
  mcAlertAtLineLevel: 'تنبيه عند مستوى الخط الحالي',
  mcAlertAtCrossA11y: 'إنشاء تنبيه سعر عند',
  mcUndo: 'تراجع',
  mcUndoA11y: 'تراجع عن آخر تغيير في الرسم',
  mcNothingToUndo: 'لا شيء للتراجع عنه',
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
  ssbError: 'تعذر البحث — تحقق من الاتصال وحاول مرة أخرى',
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
  domNoLiveQuote: 'لا سعر حي الآن — لا أرقام لعرضها.',
  domOtcNote: 'الفوركس سوق لا مركزي: لا يوجد عمق سوق موحّد، والسبريد الفعلي يختلف حسب وسيطك.',
  pdwPrevA11yPrefix: 'الزوج السابق: ',
  pdwCurrentA11yPrefix: 'اختيار الزوج الحالي: ',
  pdwNextA11yPrefix: 'الزوج التالي: ',
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
  sponsorCode: 'Invite code (optional)',
  underSponsor: 'Your side under the inviter',
  left: 'Left',
  right: 'Right',
  trader: 'Trader',
  trainer: 'Trainer',
  broker: 'Broker',
  agent: 'Agent',
  company: 'Company',
  loginError: 'Login failed — check your name or email, your password, and your connection',
  registerError: 'Sign-up failed — check your email, details, invite code, and connection',
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
  onboardStep1Title: 'Switch pairs in one tap',
  onboardStep1Body:
    'Tap any pair in the top strip (EURUSD, GBPUSD, gold XAUUSD…) and the chart jumps to it, with today\'s change ▲▼ beside it. On the chart, pinch to zoom, drag the price axis to make candles taller or shorter, and AUTO puts the view back. Later, open up to four charts side by side to compare.',
  onboardStep2Title: 'Drawing tools',
  onboardStep2Body:
    'The Draw tab in the bottom bar opens trend lines, Fibonacci and more tools right on the chart — a line drawn on 4H stays when you drop to 1H. To plan a trade, use Buy plan or Sell plan: drag from entry to stop to see the target, pips and reward-to-risk. Drew something wrong? Undo reverses the last change.',
  onboardStep3Title: 'Indicators & lenses',
  onboardStep3Body:
    'Choose from dozens of ready indicators (RSI, MACD, Bollinger, and more), or start with a lens that adds a set in one tap: Structure for moving averages, Momentum for RSI and MACD, Liquidity for volume, Bollinger and CVD. For forex: Sessions shades the Tokyo, London and New York sessions at their correct hours through daylight saving, and PDH / PDL marks yesterday\'s session high and low.',
  onboardStep4Title: 'Alerts',
  onboardStep4Body:
    'Fastest way: tap a level on the chart, then 🔔 — no typing. You get a notification when price reaches it (checked about once a minute), so no need to watch the chart all day. Indicator alerts and notification settings are in the alerts panel.',
  onboardStep5Title: 'Risk first',
  onboardStep5Body:
    'Before any trade, open Tools → Risk: enter your balance, risk % and stop loss (in pips, or as entry and stop prices) to get the right lot size (add spread and commission to include them), then “Log this plan to the journal” to review how it played out. Many traders risk no more than 1–2% per trade.',
  onboardRiskNote:
    'MATRIX is an analysis and learning tool. It does not place trades or give financial advice. Leveraged trading carries a high risk of losing money.',
  onboardStepCounterA11y: 'Step {n} of {total}',
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
  toolsTabJournal: 'Journal',
  toolsTabScreener: 'Screener',
  toolsTabBacktest: 'Backtest',
  toolsTabIndAlerts: 'Alerts+',
  toolsTabCalendar: 'Calendar',
  toolsTabLayouts: 'Layout',
  toolsTabAi: 'AI',
  a11yTabPrefix: 'Tab',
  a11ySignalSymbolPrefix: 'Signal symbol',
  toolsSymOnChart: 'on your chart',
  toolsHubCommunity: 'Community & news',
  toolsHubAnalysis: 'Analysis & alerts',
  a11yHubSectionPrefix: 'Panel section',
  toolsGridHint: "Drag the dots to reorder this section's panels",
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
  filterBullishHint: 'Price above where it was 80 candles ago, RSI under 65 (not stretched)',
  filterBearishLabel: 'Momentum -',
  filterBearishHint: 'Price below where it was 80 candles ago, RSI above 35 (not stretched)',
  a11yFilterPrefix: 'Filter',
  screenerRunning: 'Scanning...',
  screenerRunBtn: 'Run screener',
  screenerRunNeedFilter: 'Pick a filter first, then run the screener',
  screenerNeedApiKey: 'The screener needs an active Twelve Data key on the server',
  screenerNoResults: 'No results match the current filters',
  screenerFailed: 'Could not run the scan — check your connection and try again',
  screenerScanNone: 'Could not load prices for any symbol — likely the data provider rate limit; wait a minute and scan again',
  screenerScanPartial: 'Only {k} of {total} symbols scanned — could not read: {list} (likely provider rate limit). Results cover scanned symbols only.',
  screenerNoMatchOf: 'No match among {k} scanned symbols on {tf}',
  screenerShowingOf: 'Showing the top {n} of {total} results (biggest movers first)',
  screenerChangeSpan: '(last 80 candles)',
  screenerTapToOpen: 'Tap a result to open its chart on the same timeframe',
  screenerOpenChartA11y: 'Open chart',
  newsTitle: 'News affecting forex',
  newsStale: 'Not refreshed — time from saved calendar',
  newsEmpty: 'No market-moving headlines right now — upcoming releases (rates, jobs, inflation) are in Calendar.',
  newsLoadError: 'Couldn’t load news — check your connection and reopen the panel later',
  aiPanelTitle: 'AI assistant',
  aiGreeting:
    "I'm MATRIX's AI assistant. Ask me about the pair's analysis, a trade scenario, risk management, or its relation to DXY. My answers are automated analysis to learn from, not financial advice — check any level on the chart before relying on it.",
  aiOfflineFallback:
    'Could not reach the server — check your internet connection and try again shortly.\n\nQuick local take: watch DXY before entering any dollar pair, and use a clear stop with risk ≤ 1%.',
  aiInputPlaceholder: 'e.g. analysis of {symbol} today?',
  aiInputA11y: 'Question for the AI assistant',
  aiSendA11y: 'Send question to the AI assistant',
  aiAskBtn: 'Ask',
  analystsTitle: 'Analyst forecasts',
  analystsSubSuffix: 'Research house consensus',
  analystsRefreshA11y: 'Refresh analyst forecasts',
  analystsLoadError: 'Couldn\'t load analyst forecasts — check your connection, then tap “Refresh”',
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
  socialComputeError: 'Couldn\'t compute channel consensus — check your connection, then tap “Compute”',
  chatTitle: 'Group chat',
  chatLoadError: 'Could not load messages — check your connection',
  chatEmpty: 'No messages yet — be the first to write',
  chatSendError: 'Could not send your message to the group — it may not arrive, try later',
  chatYou: 'You',
  chatAnonTrader: 'Trader',
  chatLoginRequired: 'Sign in to post in the group chat — your messages show under your account name',
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
  voteLoadError: 'Could not load votes — check your connection',
  voteEmpty:
    'No active votes right now — post your idea above (symbol, direction, entry, stop, target) and see what other traders think.',
  voteByAuthor: 'By {author}',
  voteApprovalLabel: 'Approval',
  voteAgreeWord: 'Agree',
  voteDisagreeWord: 'Disagree',
  voteCastError: 'Could not send your vote to the server — it may not count, try later',
  voteLoginRequired: 'Sign in to vote — one vote per account keeps the approval rate honest',
  chatLinksNotAllowed: 'Links aren\'t allowed in the group — protection against scam "signal" channels',
  votePublishLoginRequired: 'Sign in to publish an idea — it shows under your account name',
  voteLinksNotAllowed: 'Links aren\'t allowed in ideas — write your analysis as text',
  modMessageOptionsA11y: 'Message options: report or block',
  modIdeaOptionsA11y: 'Idea options: report or block',
  modReportLabel: 'Report:',
  modReasonSpam: 'Spam',
  modReasonAbuse: 'Abusive',
  modReasonScam: 'Scam',
  modBlockUser: 'Block {user}',
  modReported: 'Thanks — hidden for you, and the report will be reviewed',
  modReportLoginRequired: 'Sign in to report — or block the sender to hide them for you',
  modReportError: 'Couldn\'t send the report — try again',
  modBlocked: '{user} blocked — their messages and ideas won\'t show for you',
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
  forecastTradeLabel: 'Trade',
  forecastNoSignal: 'No strong signal — wait for indicator confirmation',
  forecastAgreeLabel: 'Indicators agreeing',
  forecastError: 'Couldn\'t compute indicator forecasts — check your connection, then tap “Forecast”',
  alertsTitle: 'Price alerts',
  alertsSub: 'Above / Below · Twelve Data · Notification when triggered',
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
  alertsFirstBadge: "🎉 First alert set — we'll notify you when the price hits",
  alertsLoadError: 'Couldn\'t load your alerts — check your connection. Your saved alerts haven\'t been deleted.',
  alertsEmpty:
    'No alerts yet — enter a price above (or tap “Use it” for the current price), pick above/below, and you\'ll be notified when price gets there.',
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
  riskCalcSub: 'How many lots to open so you never lose more than a set % of your balance',
  riskCalcSymbol: 'Instrument',
  riskCalcBadSymbol: 'Unsupported symbol — use a 6-letter pair like EURUSD or XAUUSD',
  riskCalcCentSymbolHint:
    '“{symbol}” is a cent-account symbol — the calculator sizes standard-account lots only, and a cent lot is smaller. For a standard account type {pair}',
  appCrashTitle: 'Something went wrong',
  appCrashBody: 'This screen could not be displayed. Your data and drawings are safe — tap “Try again” to continue.',
  appCrashRepeatBody:
    'Still not working. Fully close MATRIX (swipe it away from your recent apps) and open it again — your drawings are safe.',
  appCrashRetry: 'Try again',
  planSlWrongBuy: 'For a buy, the stop must be below the entry',
  planSlWrongSell: 'For a sell, the stop must be above the entry',
  planTpWrongBuy: 'For a buy, the target must be above the entry',
  planTpWrongSell: 'For a sell, the target must be below the entry',
  planSlTooClose: 'Stop is less than 1 pip from entry — tighter than the spread itself; check the number',
  planRiskWord: 'Risk',
  planRewardWord: 'Reward',
  planLowRR: '⚠ Potential reward is smaller than the risk',
  riskCalcAccountCcy: 'Account currency',
  riskCalcBalance: 'Account balance',
  riskCalcRiskPct: 'Risk (% or amount)',
  riskCalcRiskMoneyHint: 'Tap {ccy} to enter the risk as an amount instead of a percent',
  riskCalcHighRisk: '⚠ More than 2% per trade is high risk',
  riskCalcSlPips: 'Stop loss (pips)',
  riskCalcFromPrice: 'Or from price: entry and stop as you see them on the chart',
  riskCalcSlMismatch:
    '⚠ The pips you typed ({pips}) do not match your entry and stop prices ({derived} pip) — lot size and risk use the pips, R:R uses the prices',
  riskCalcEntry: 'Entry price',
  riskCalcStop: 'Stop price',
  riskCalcStopChip: '{side}: stop {price}',
  riskCalcConvFailed: 'Could not fetch conversion rate',
  riskCalcConvManual: 'Enter price of',
  riskCalcLots: 'Position size (lots)',
  riskCalcRiskAmount: 'Actual risk',
  riskCalcUnits: 'Units',
  riskCalcBelowMin: 'No size fits this risk: the smallest lot (0.01) risks more than you set',
  riskCalcFillHint: 'Enter balance, risk % and stop loss',
  invalidNumberHint: 'Number not recognized — type it without thousands separators, e.g. 10000 or 1.0850',
  priceAmbiguousThousandsHint: 'Price “{value}” is ambiguous — is the dot a thousands separator or a decimal point? Type {whole} or {small}',
  arabicThousandsSignHint: '“٬” is the Arabic thousands sign, not the decimal comma — for a fraction type “٫” or a dot, e.g. 0.5',
  riskCalcPipValue: 'Pip value per lot',
  riskCalcLeverage: 'Leverage (100 means 1:100)',
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
    'A plan with two different stops can\'t be logged — type {derived} in the pips box, or move your stop price to match your pips',
  riskCalcSlMismatchNarrower: '⚠ Your pips ({pips}) are tighter than the distance between your prices ({derived} pip) — the lot size is larger than your risk allows if the stop stays at its price',
  riskCalcSpread: 'Spread (pips, optional)',
  riskCalcSpreadNote: 'Spread usually adds to your stop distance: a 20-pip stop with a 1.5 spread loses about 21.5 when hit. Check the current spread on your platform — it widens around news and the weekly open.',
  riskCalcRiskWithSpread: 'Risk including spread',
  riskCalcSpreadLotsWithin: 'To keep your risk at {pct}% including spread: {lots} lot',
  riskCalcSpreadTooWide: 'A {n}-pip spread isn’t realistic — did you type a price instead of pips? Enter the gap between Ask and Bid in pips (e.g. 1.5).',
  riskCalcStopInsideSpread:
    'Your stop ({sl} pips) is no wider than the spread ({spread} pips) — it can be hit the moment the trade opens. Widen the stop and cut the lot, or wait for a tighter spread.',
  riskCalcCommission: 'Optional commission per lot, open + close',
  riskCalcCommissionNote: 'Raw/ECN accounts charge commission when you open and again when you close. Enter both sides for one lot in your account currency (e.g. 7), or leave it empty if your account has no commission.',
  riskCalcRiskWithCosts: 'Risk including costs',
  riskCalcCostsLotsWithin: 'To keep your risk at {pct}% including costs: {lots} lot',
  riskCalcNetAfterCosts: 'After costs: {profit} · R:R {rr}',
  riskCalcNetNegative: 'Costs eat the whole target: net {profit} — move the target further or use a cheaper account',
  riskCalcLowNetRR: '⚠ After costs, the reward is smaller than the risk',
  riskCalcOverOrderMax: "⚠ {lots} lot is above most brokers' largest order (50–100 lot) — split it into several orders or check the stop",
  riskCalcCostsBelowMin: 'With costs, even the smallest lot (0.01) risks more than {pct}% — raise the % or tighten the stop',
  riskCalcUseLivePrice: '↓ Entry = current price',
  riskCalcUseLivePriceA11y: 'Fill the entry with the current market price (Ask for buy, Bid for sell, from where the stop sits)',
  riskCalcLiveFilled: '✓ Entry from the current price:',
  riskCalcLiveSideMoved: '✓ {side} at {quote} — entry moved to {price}',
  riskCalcNoLiveQuote: 'No live price for this symbol right now — type the entry manually',
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
  newsUnavailable: 'Couldn’t load the news calendar — we can’t tell if a big release is close; check before you enter',
  calToday: 'Today',
  calTomorrow: 'Tomorrow',
  calSampleBanner: '⚠ Sample events — live calendar unavailable right now',
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
  reportAdviceTitle: 'MATRIX view',
  reportAdviceHint: "This week's tips",
  reportRiskTitle: 'Risk brief',
  reportRiskHint: 'Capital management',
  reportOpenWord: 'Open ↓',
  reportAiFallbackNote: 'Could not reach the AI — this is a general template, not a custom analysis',
  reportJournalDataLine:
    'Actual trade journal data (all closed trades, not just this week): trades={trades} win rate={winRate}% PnL={pnl}% best={best}% worst={worst}%. Base the report on it.',
  reportJournalEmptyLine: '(No closed trades in the journal yet — no performance numbers to show).',
  reportJournalUnavailableLine: '(Could not read the trade journal right now — this report has none of your numbers).',
  reportFallbackWeekly:
    'Report from the trade journal{journalLine}\nLog your trades in the “Journal” tab for a more accurate report.',
  reportFallbackPerformance: 'Assessment based on the journal{journalLine}',
  reportFallbackRisk: 'Risk brief{journalLine}\n1) Risk ≤1%.\n2) Use a clear stop.\n3) Avoid heavy news.',
  reportFallbackAdvice:
    'MATRIX tips{journalLine}\n1) Review your open trades.\n2) Tie entries to DXY.\n3) Risk ≤1%.\n4) Avoid high-impact news.\n5) Focus on 2–3 pairs.',
  journalTitle: 'Trade journal · PnL from your trades',
  journalSub: 'Log your trades — reports are built from your journal',
  journalStatClosed: 'Closed trades: {n}',
  journalStatWinRate: 'Win rate: {pct}%',
  journalStatTotalPnl: 'Total PnL: {pct}%',
  journalStatPriceMoveSum: 'Sum of price moves (lot size ignored): {pct}%',
  journalStatBestWorst: 'Best/Worst: {best}% / {worst}%',
  journalStatsPending: 'No closed trades yet — win rate and PnL appear once you close your first trade.',
  journalStatNetPips: 'Net: {pips} pip',
  journalStatNetPipsBySymbol: 'Net per instrument: {parts}',
  journalStatAvgR: 'Average result: {r} per trade ({n} with a stop)',
  journalSideA11yPrefix: 'Trade direction',
  journalSymbolPlaceholder: 'Symbol',
  journalSymbolA11y: 'Trade symbol',
  journalEntryPlaceholder: 'Entry',
  journalUseLivePrice: '↓ Current price',
  journalUseLivePriceA11y: 'Fill the entry with the current price (Ask for buy, Bid for sell)',
  journalNoLiveQuote: 'No live price for this symbol right now — type the entry manually',
  journalEntryA11y: 'Entry price',
  journalExitPlaceholder: 'Exit (optional)',
  journalSizePlaceholder: 'Size in lots (optional)',
  journalSizeA11y: 'Trade size in lots (optional)',
  journalSizeUnitsFix: '⚠ {n} looks like units, not lots — tap to convert to {lots} lot',
  journalSizeUnitsNoFix: '⚠ {n} lots is not a realistic size — it looks like a unit count copied from your platform; type the size in lots (e.g. 0.10)',
  journalExitA11y: 'Exit price (optional)',
  journalExitAtSlA11y: 'Exit at stop loss {price}',
  journalExitAtBeA11y: 'Exit at entry (breakeven) {price}',
  journalExitAtTpA11y: 'Exit at take profit {price}',
  journalSlAtPipsA11y: 'Stop loss {pips} pips from entry: {price}',
  journalNotePlaceholder: 'Note',
  journalSlPlaceholder: 'Stop loss (optional)',
  journalTpPlaceholder: 'Take profit (optional)',
  journalInvalidEntry: 'Enter a valid symbol (e.g. EURUSD or XAUUSD) and the entry price',
  journalResultR: 'Result {r}',
  journalNoteA11y: 'Trade note (optional)',
  journalAddA11y: 'Add a new trade',
  journalAddBtn: 'Add trade',
  journalAddError: 'Could not add the trade — check your connection and try again',
  journalCloseFailedTitle: 'Could not close',
  journalCloseFailedBody: 'Couldn’t confirm the close — check your connection. If the trade still shows as open, close it again.',
  journalLoadError: 'Couldn\'t load your journal — check your connection. Your logged trades haven\'t been deleted.',
  journalEmpty:
    'No trades logged yet — log every trade (even on a demo account) to learn over time what works for you and what doesn\'t. Fill in the form above (“↓ Current price” fills the entry as you open it), or size it under “Risk” and tap “Log this plan to the journal”.',
  journalOpenSuffix: '(open)',
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
  journalCloseLinkA11y: 'Close {symbol} trade at the exit field price',
  journalCloseLinkBtn: 'Close at exit field price',
  journalCloseMarketBtn: 'Close at market',
  journalCloseMarketA11y: 'Close {symbol} trade at the current price',
  journalCloseMarketConfirmTitle: 'Close at market price?',
  journalCloseMarketConfirmBody: '{side} {symbol} · {entry} → {exit}\nResult: {result}\n\nPrice from the data provider (Bid for buys, Ask for sells) and may differ slightly from your broker — you can edit it after closing.',
  journalCloseFieldConfirmTitle: 'Close at exit field price?',
  journalCloseMarketConfirmBtn: 'Close',
  journalCloseMarketNoQuote: 'No live price for this symbol right now — type the exit in the “Exit” field, then use “Close at exit field price”',
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
  backtestNoTrades: 'The strategy produced no trades in this period — no win rate or return to show. Try another timeframe.',
  backtestSmallSample: '⚠ Small sample ({n} trades) — this win rate isn’t reliable; don’t decide on fewer than ~30 trades.',
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
  indAlertsLoadError: 'Couldn\'t load your indicator alerts — check your connection. Your saved alerts haven\'t been deleted.',
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
  calendarTitle: 'Economic calendar · Live',
  calendarCurrencyA11yPrefix: 'Filter by currency',
  calendarAllWord: 'All',
  calendarImpactA11yPrefix: 'Filter by impact',
  calendarAllShort: 'All',
  calImpactMedPlus: 'Medium+',
  calImpactMedPlusA11y: 'High and medium',
  calendarLoading: 'Loading the calendar…',
  calendarLoadError: 'Could not load the calendar — check your connection',
  calendarEmpty:
    'No events match this filter — widen the impact, clear the currency filter, or pick another day.',
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
  coursesSub: 'Full screen · voice narration · pause and ask about any part',
  coursesStaleNote: "Couldn't refresh the school list — showing saved data",
  coursesNoteTitle: 'Important classification',
  coursesNoteText:
    'BOS and CHOCH belong to the Order Block and Fair Value Gap group inside the ICT/SMC school — they are not a separate school.',
  coursesSchoolA11yPrefix: 'School',
  coursesLevelsWord: 'levels',
  coursesLecturesUnitWord: 'lectures',
  coursesNarratedBadge: '🔊 Full audio narration',
  coursesFallbackNote: "Couldn't load the full curriculum — showing only a temporary introductory lecture",
  coursesLevelWord: 'Level',
  coursesLectureA11yPrefix: 'Lecture',
  coursesMinuteWord: 'minute',
  coursesMinuteAbbrev: 'min',
  coursesFullLectureWord: 'full lecture',
  coursesBackToSchoolsA11y: 'Back to the school list',
  coursesBack: 'Back',
  coursesFallbackLevelTitle: 'Foundation',
  coursesFallbackLectureTitle: 'Opening Lecture',
  coursesFallbackOutlineIntro: 'Introduction',
  lectureClose: 'Close',
  lectureCloseA11y: 'Close the lecture',
  lectureLevelWord: 'level',
  lectureLoadFailedNote: "Couldn't load this lecture — showing generic sample content instead",
  lectureFullScreenTag: 'Full screen',
  lectureVoicePausedForQ: 'Paused for a question',
  lecturePreparingVoice: 'Preparing the audio...',
  lectureExplainingNow: 'Explaining now',
  lectureVoicePlayError:
    "Couldn't play the audio — check your connection. The full lesson text is on screen, so you can keep reading.",
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
  lectureFallbackTitle: 'Demo Lecture',
  lectureFallbackOutlineDefinition: 'Definition',
  lectureFallbackOutlineApplication: 'Application',
  lectureFallbackTeacher: 'Voice narration',
  lectureFallbackSeg1Title: 'Opening',
  lectureFallbackSeg1Narration:
    'Welcome. This is screen-only content with voice narration. You can pause the narration at any time to ask a question.',
  lectureFallbackSeg2Title: 'Core idea',
  lectureFallbackSeg2Narration:
    'BOS and CHOCH are part of market structure within Order Blocks and Fair Value Gaps in ICT/SMC.',
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
  wlLoadError: "Couldn't read your watchlist from this phone — tap “Retry”",
  layoutSaveFailed: "Couldn't save the layout on this phone — check free storage and try again",
  layoutDeleteFailed: "Couldn't delete the layout — it may reappear next time, so delete it again",
  chartTemplateSaveFailed: "Couldn't save the template on this phone — check free storage and try again",
  chartTemplateDeleteFailed: "Couldn't delete the template — try again",
  drawingsSaveFailed: "Drawings not saved on this phone — check free storage, or they'll be lost when you switch symbol or close the app",
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
  focusCompareHint: 'Long-press to compare',
  focusCompareTag: 'Compare',
  focusPickSymbolA11yPrefix: 'Select symbol',
  focusCompareNotePrefix: 'Comparing with',
  focusCompareNoteSuffix: '(purple)',
  focusCompareUnavailable: 'Couldn’t load real {sym} data — no comparison line',
  focusInComparisonSuffix: ' · in comparison',
  focusAlertCreateFailedTitle: "Couldn't create alert",
  focusAlertCreateFailedBody:
    'The alert wasn’t created. Check your connection and try again. An alert needs a real price for the symbol to know whether to wait for a rise or a drop, so it can’t be set while the chart shows demo prices.',
  focusAlertFromDrawingNote: 'From drawing line',
  focusAlertFromChartNote: 'From chart',
  gridFramesWord: 'Frames',
  gridSquaresWord: 'Squares',
  gridSquaresA11y: 'View frames as squares',
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
  ctlKindHollow: 'Hollow',
  ctlKindHeikin: 'Heikin Ashi',
  ctlKindBars: 'Bars',
  ctlKindLine: 'Line',
  ctlKindArea: 'Area',
  ctlKindBaseline: 'Baseline',
  ctlKindRange: 'Range',
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
  dockSignalsTab: 'Signals',
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
  railFrameWord: 'Frame',
  railSquareWord: 'Square',
  railRectangleWord: 'Rectangle',
  railShadowWord: 'Shadow',
  cfSyncLeaderBadge: 'Time leader',
  cfSyncPartialBadge: 'Synced · partial',
  cfSyncFollowBadge: 'Synced',
  cfSubtitleInteractive: 'MATRIX engine · lenses & tools',
  cfSubtitleNavigate: 'Drag middle · price · dates',
  cfSubtitleDefault: 'Tap for full analysis',
  cfSyncActivateA11yPrefix: 'Activate sync for chart ',
  cfChangeSymbolA11y: 'Change symbol',
  cfMarketClosedA11y: 'Market currently closed',
  cfReplayPriceA11y: 'Candle replay — this is the replay candle’s close, not the live price',
  cfMarketClosedTag: 'Closed',
  cfSpreadA11y: 'Bid/ask spread',
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
  mcPrimaryLane: 'Primary',
  mcMeasureBarsWord: 'bars',
  mcNoteDefault: 'Note',
  mcSnapshotSaved: 'Chart snapshot saved',
  mcSnapshotFailed: 'Could not export the chart',
  mcTemplateDefaultName: 'Default',
  mcTemplateSaved: 'Chart template saved',
  mcClearAllTitle: 'Clear all drawings?',
  mcClearAllBody: 'Every drawing on this symbol will be deleted, on all timeframes',
  mcClearWord: 'Clear',
  mcHintDraw: 'Drag to draw, or tap two points · saved automatically',
  mcHintNavigate: 'Drag to pan · tap a candle to read it, or hold then drag · pinch or drag the axes to zoom',
  mcHintNavigateWeb: 'Hover to read · click to pin · ←/→ one candle · Esc to clear',
  mcHintDrawWeb: 'Drag to draw, or click two points · Esc to cancel · Ctrl+Z to undo · saved automatically',
  mcHintSelectedWeb: 'Drag to move the drawing · Delete removes it · Esc deselects · Ctrl+Z to undo',
  mcHintSelect: 'Tap a drawing to select it · tap empty space to deselect',
  mcHintSelected: 'Drag the drawing to move it · drag a handle to adjust one end · saved automatically',
  mcAutoA11y: 'Auto: fit prices and return to the latest candle',
  mcAutoManualA11y: 'Price scale is manual — new candles may leave the view. Tap to restore auto and return to the latest candle',
  mcZoomOutA11y: 'Zoom out',
  mcZoomInA11y: 'Zoom in',
  mcPanBackA11y: 'Pan back',
  mcPanForwardA11y: 'Pan forward',
  mcReplayModeA11y: 'Replay mode',
  mcReplayReadout: 'Candle replay · {n}/{total}',
  mcReplayStepBackA11y: 'Replay step back',
  mcReplayPauseA11y: 'Pause replay',
  mcReplayPlayA11y: 'Play replay',
  mcReplayStepFwdA11y: 'Replay step forward',
  mcMagnetA11y: 'Snap to grid',
  mcDockTitle: 'Tool dock · MATRIX',
  mcNoPineLine: 'No formula line',
  mcExportPng: 'Export PNG',
  mcSaveTemplate: 'Save template',
  mcAlertLine: 'Line alert',
  mcAlertZone: 'Zone alert',
  mcAlertAtLineLevel: 'Alert at the current line level',
  mcAlertAtCrossA11y: 'Create a price alert at',
  mcUndo: 'Undo',
  mcUndoA11y: 'Undo the last drawing change',
  mcNothingToUndo: 'Nothing to undo',
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
  ssbError: 'Search failed — check your connection and try again',
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
  domNoLiveQuote: 'No live price right now — nothing to show.',
  domOtcNote: 'Forex is decentralized: there is no single market depth, and your real spread depends on your broker.',
  pdwPrevA11yPrefix: 'Previous pair: ',
  pdwCurrentA11yPrefix: 'Select current pair: ',
  pdwNextA11yPrefix: 'Next pair: ',
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
  // «E-mail» بشرطة صار قديماً ببريطانيا نفسها (الحكومة وBBC تكتبان email).
  email: 'Email',
  sponsorCode: 'Invite code (optional)',
  loginError: 'Sign-in failed — check your name or email, your password, and your connection',
  registerError: 'Registration failed — check your email, details, invite code, and connection',
  language: 'Language',
  commissionsReport: 'Commission report',
  networkTree: 'Network tree',
  // التهجئة البريطانية لما افترق. (نصّ الجولة `onboardStep3Body` لم يعد فيه «summarize» فلا يحتاج نسخة هنا.)
  wlCatalogTitle: 'Add from catalogue',
  wlCatalogAllAdded: 'All catalogue symbols added',
  invalidNumberHint: 'Number not recognised — type it without thousands separators, e.g. 10000 or 1.0850',
  domOtcNote: 'Forex is decentralised: there is no single market depth, and your real spread depends on your broker.',
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
  password: 'وشەی نهێنی',
  passwordPlaceholder: 'وشەی نهێنی',
  enter: 'چوونەژوورەوە',
  createAccount: 'دروستکردنی هەژمار',
  logout: 'دەرچوون',
  hello: 'سڵاو',
  accountType: 'جۆری هەژمار',
  sponsorCode: 'کۆدی بانگهێشت (ئیختیاری)',
  underSponsor: 'لایەنی تۆ لەژێر بانگهێشتکەر',
  left: 'چەپ',
  right: 'ڕاست',
  trader: 'بازرگان',
  trainer: 'ڕاهێنەر',
  broker: 'برۆکەر',
  agent: 'بریکار',
  company: 'کۆمپانیا',
  loginError: 'چوونەژوورەوە سەرکەوتوو نەبوو — ناو یان ئیمەیڵ و وشەی نهێنی بپشکنە، هەروەها پەیوەندیت بە ئینتەرنێتەوە',
  registerError: 'تۆمارکردن سەرکەوتوو نەبوو — ئیمەیڵ و زانیاری و کۆدی بانگهێشت بپشکنە، هەروەها پەیوەندیت بە ئینتەرنێتەوە',
  language: 'زمان',
  commissionsReport: 'ڕاپۆرتی کۆمیسیۆن',
  networkTree: 'دارەکەی تۆڕ',
  deleteAccount: 'سڕینەوەی هەژمار',
  deleteAccountConfirmTitle: 'هەژمار بە تەواوی بسڕدرێتەوە؟',
  deleteAccountConfirmBody:
    'ناوی بەکارهێنەر و ئیمەیڵ و وشەی نهێنی بە تەواوی دەسڕدرێنەوە و ئیتر ناتوانیت بچیتەژوورەوەی ئەم هەژمارە. ئەم کردارە ناگەڕێتەوە.',
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
  onboardStep1Title: 'گۆڕینی جووت بە یەک دەستدان',
  onboardStep1Body:
    'دەست لە هەر جووتێک بدە لە شریتی سەرەوە (EURUSD، GBPUSD، زێڕ XAUUSD…) و چارتەکە یەکسەر دەچێتە سەری، لەگەڵ گۆڕانی ئەمڕۆ ▲▼ لە تەنیشتیەوە. لەسەر چارت: بە دوو پەنجە گەورەی بکە، تەوەری نرخ ڕابکێشە بۆ درێژکردن یان کورتکردنی مۆمەکان، و دوگمەی AUTO دیمەنەکە دەگەڕێنێتەوە بۆ خۆکار. دواتر هەتا چوار چارت بەیەکەوە بکەرەوە بۆ بەراورد.',
  onboardStep2Title: 'ئامرازەکانی وێنەکێشان',
  onboardStep2Body:
    'تابی «وێنەکێشان» لە شریتی خوارەوە هێڵی ترێند و فیبۆناتچی و ئامرازەکانی تر ڕاستەوخۆ لەسەر چارت دەکاتەوە، و ئەوەی لەسەر 4H دەیکێشیت دەمێنێتەوە کاتێک دادەبەزیت بۆ کاتژمێرێک. بۆ پلاندانانی مامەڵەیەک «پلانی کڕین» یان «پلانی فرۆشتن» بەکاربهێنە: لە چوونەژوورەوە بۆ وەستان ڕایبکێشە و ئامانج و pip و ڕێژەی قازانج بۆ مەترسی دەبینیت. هەڵەت کرد؟ «گەڕاندنەوە» دوایین گۆڕانکاری هەڵدەوەشێنێتەوە.',
  onboardStep3Title: 'پێوەرەکان و لینزەکان',
  onboardStep3Body:
    'لە دەیان پێوەری ئامادە هەڵبژێرە (RSI، MACD، بۆلینجەر و زیاتر)، یان بە لینزێک دەست پێبکە کە بە یەک دەستدان کۆمەڵێک پێوەر زیاد دەکات: «پێکهاتە» بۆ ناوەندە جووڵاوەکان، «پاڵنە» بۆ RSI و MACD، «شلەیی» بۆ قەبارە و بۆلینجەر و CVD. بۆ فۆرێکس: «Sessions» دانیشتنەکانی تۆکیۆ و لەندەن و نیویۆرک بە کاتی دروستیان ڕەنگ دەکات هاوین و زستان، و «PDH / PDL» بەرزترین و نزمترینی دانیشتنی دوێنێ دەکێشێت.',
  onboardStep4Title: 'ئاگادارکردنەوەکان',
  onboardStep4Body:
    'خێراترین ڕێگا: دەست لە ئاستەکە بدە لەسەر چارت پاشان 🔔 — بێ نووسینی ژمارە. کاتێک نرخ گەیشتە ئەوێ ئاگاداری وەردەگریت (نزیکەی هەر خولەکێک دەپشکنرێت)، پێویست ناکات بە درێژایی ڕۆژ چاودێری چارت بکەیت. ئاگادارکردنەوەی پێوەرەکان و چالاککردنی ئاگادارییەکان لە پانێڵی ئاگادارکردنەوەکاندایە.',
  onboardStep5Title: 'سەرەتا مەترسی',
  onboardStep5Body:
    'پێش هەر مامەڵەیەک «ئامرازەکان ← مەترسی» بکەرەوە: باڵانس و ڕێژەی مەترسی و ستۆپ لۆس (بە pip یان بە نرخی چوونەژوورەوە و وەستان) بنووسە بۆ ئەوەی قەبارەی لۆتی گونجاو بزانیت (سپرێد و کۆمیسیۆن زیاد بکە بۆ ئەوەی ژمارەکە بیانگرێتەوە)، پاشان «ئەم پلانە لە دەفتەر تۆمار بکە» بۆ ئەوەی دواتر ئەنجامەکەی ببینیتەوە. زۆر لە بازرگانان زیاتر لە 1–2% لە هەر مامەڵەیەکدا ناخەنە مەترسییەوە.',
  onboardRiskNote:
    'MATRIX ئامرازێکی شیکردنەوە و فێربوونە، مامەڵە ناکات و ئامۆژگاری دارایی نادات. بازرگانی بە لیڤەرێج مەترسیی بەرزی لەدەستدانی پارەی تێدایە.',
  onboardStepCounterA11y: 'هەنگاوی {n} لە {total}',
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
  toolsTabJournal: 'دەفتەر',
  toolsTabScreener: 'پشکنین',
  toolsTabBacktest: 'تاقیکردنەوەی دواوە',
  toolsTabIndAlerts: 'ئاگادارکردنەوە+',
  toolsTabCalendar: 'ڕۆژژمێر',
  toolsTabLayouts: 'نەخشەسازی',
  toolsTabAi: 'AI',
  a11yTabPrefix: 'تاب',
  a11ySignalSymbolPrefix: 'هێمای نیشانە',
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
  filterMacdUpHint: 'هێڵی MACD لەسەر دوایین مۆم هێڵی ئاماژەی بەرەو سەرەوە بڕی — بەهێزی ئەرێنی نوێ',
  filterBullishLabel: 'خۆشوڕی +',
  filterBullishHint: 'نرخ لەوەی 80 مۆم پێش ئێستا بوو بەرزترە و RSI لە خوار 65ە',
  filterBearishLabel: 'خۆشوڕی -',
  filterBearishHint: 'نرخ لەوەی 80 مۆم پێش ئێستا بوو نزمترە و RSI لە سەرووی 35ە',
  a11yFilterPrefix: 'فلتەر',
  screenerRunning: 'پشکنین بەردەوامە...',
  screenerRunBtn: 'کارپێکردنی پشکنەر',
  screenerRunNeedFilter: 'سەرەتا فلتەرێک هەڵبژێرە، پاشان پشکنین کارپێبکە',
  screenerNeedApiKey: 'پشکنین پێویستی بە کلیلی چالاکی Twelve Data لەسەر ڕاژە هەیە',
  screenerNoResults: 'هیچ ئەنجامێک لەگەڵ فلتەرە ئێستاکان ناگونجێت',
  screenerFailed: 'نەکرا پشکنین کارپێبکرێت — پەیوەندییەکەت بپشکنە و دووبارە هەوڵبدەرەوە',
  screenerScanNone: 'نرخی هیچ هێمایەک نەهێنرا — لەوانەیە سنووری داواکاری دابینکەری داتا بێت؛ خولەکێک چاوەڕێ بکە و دووبارە بپشکنە',
  screenerScanPartial: 'تەنها {k} لە {total} هێما پشکنران — نەخوێنرانەوە: {list} (لەوانەیە سنووری داواکاری دابینکەر). ئەنجامەکان تەنها بۆ پشکنراوەکانن.',
  screenerNoMatchOf: 'هیچ گونجانێک نییە لە نێوان {k} هێمای پشکنراو لە {tf}',
  screenerShowingOf: 'پیشاندانی بەهێزترین {n} لە {total} ئەنجام (زۆرترین جووڵە سەرەتا)',
  screenerChangeSpan: '(دوایین 80 مۆم)',
  screenerTapToOpen: 'کرتە لە هەر ئەنجامێک بکە بۆ کردنەوەی چارتەکەی لە هەمان کات',
  screenerOpenChartA11y: 'کردنەوەی چارت',
  newsTitle: 'هەواڵی کاریگەر لەسەر فۆرێکس',
  newsStale: 'نوێ نەکرایەوە — کات لە ڕۆژژمێری پاشەکەوتکراوە',
  newsEmpty: 'ئێستا هیچ سەردێڕێکی کاریگەر نییە — کاتی داتا داهاتووەکان (سوود، کار، هەڵاوسان) لە «ڕۆژژمێر» دەبینیت.',
  newsLoadError: 'نەکرا هەواڵەکان باربکرێن — پەیوەندییەکەت بپشکنە و دواتر پانێڵەکە بکەرەوە',
  aiPanelTitle: 'یاریدەدەری زیرەکی دەستکرد',
  aiGreeting:
    'من یاریدەدەری خۆکاری MATRIX ـم. پرسیارم لێ بکە دەربارەی شیکاری جووتەکە، دیمەنی مامەڵە، بەڕێوەبردنی مەترسی، یان پەیوەندی بە DXY. وەڵامەکانم شیکاری خۆکارن بۆ فێربوون، نەک ئامۆژگاری دارایی — پێش ئەوەی پشتی پێ ببەستیت هەر ئاستێک لەسەر چارتەکە بپشکنە.',
  aiOfflineFallback:
    'نەکرا پەیوەندی بە ڕاژەوە بکرێت — لە پەیوەندییەکەت بە ئینتەرنێت دڵنیابە و دوای کەمێک دووبارە هەوڵ بدەرەوە.\n\nشیکاری خێرای ناوخۆیی: چاودێری DXY بکە پێش هەر چوونەژوورەوەیەک بۆ جووتەکانی دۆلار، و وەستانێکی ڕوون بەکاربهێنە بە مەترسی ≤ 1%.',
  aiInputPlaceholder: 'نموونە: شیکاری {symbol} ئەمڕۆ؟',
  aiInputA11y: 'پرسیار بۆ یاریدەدەری زیرەکی دەستکرد',
  aiSendA11y: 'ناردنی پرسیار بۆ یاریدەدەری زیرەکی دەستکرد',
  aiAskBtn: 'بپرسە',
  analystsTitle: 'پێشبینیەکانی شیکارکاران',
  analystsSubSuffix: 'ڕێکەوتنی ماڵی توێژینەوە',
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
  socialTitle: 'ناوەندی نزیکەی ڕاسپاردە و مامەڵەکان',
  socialSub: 'تێلێگرام · فەیسبووک · ئینستاگرام · X · ئەپەکان',
  socialPickHint: 'سەرچاوەکانی شوێنکەوتووت هەڵبژێرە — ئینجا ناوەندی گشتی دەژمێردرێت',
  socialSourcesError: 'نەکرا لیستی سەرچاوەکان باربکرێت — پەیوەندییەکەت بپشکنە',
  a11ySourcePrefix: 'سەرچاوە',
  sourcesCountLabel: 'سەرچاوەکان',
  suggestedTradeLabel: 'مامەڵەی پێشنیارکراو',
  socialNoClearTrade: 'هیچ مامەڵەیەکی ڕوون نییە — بۆچوونەکان تێکەڵ یان بێلایەنن',
  socialComputeError: 'نەکرا ڕێکەوتنی کەناڵەکان بژمێردرێت — پەیوەندییەکەت بپشکنە و پاشان «بژمێرە» دابگرە',
  chatTitle: 'گفتوگۆی گروپی',
  chatLoadError: 'نەکرا نامەکان باربکرێن — پەیوەندییەکەت بپشکنە',
  chatEmpty: 'هێشتا هیچ نامەیەک نییە — یەکەم کەس بە بۆ نووسین',
  chatSendError: 'نەکرا نامەکەت بۆ گروپ بنێردرێت — لەوانەیە نەگات، دواتر هەوڵبدەرەوە',
  chatYou: 'تۆ',
  chatAnonTrader: 'بازرگان',
  chatLoginRequired: 'بۆ نووسین لە گفتوگۆی گروپ بچۆ ژوورەوە — نامەکانت بە ناوی هەژمارەکەت دەردەکەون',
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
  voteLoadError: 'نەکرا دەنگەکان باربکرێن — پەیوەندییەکەت بپشکنە',
  voteEmpty:
    'هیچ دەنگدانێکی چالاک لە ئێستادا نییە — بیرۆکەکەت لە سەرەوە بڵاو بکەرەوە (هێما، ئاراستە، چوونەژوورەوە، وەستان، ئامانج) و بۆچوونی بازرگانانی تر ببینە.',
  voteByAuthor: 'لەلایەن {author}',
  voteApprovalLabel: 'ڕەزامەندی',
  voteAgreeWord: 'ڕازیم',
  voteDisagreeWord: 'ڕازی نیم',
  voteCastError: 'نەکرا دەنگت بۆ ڕاژە بنێردرێت — لەوانەیە نەژمێردرێت، دواتر هەوڵبدەرەوە',
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
  forecastTradeLabel: 'مامەڵە',
  forecastNoSignal: 'هیچ نیشانەیەکی بەهێز نییە — چاوەڕێی دڵنیاکردنەوەی پێوەرەکان بکە',
  forecastAgreeLabel: 'پێوەرە هاوڕاکان',
  forecastError: 'نەکرا پێشبینیەکانی پێوەرەکان بژمێردرێن — پەیوەندییەکەت بپشکنە و پاشان «پێشبینیکردن» دابگرە',
  alertsTitle: 'ئاگادارکردنەوەی نرخ',
  alertsSub: 'سەرەوە / خوارەوە · Twelve Data · ئاگادارکردنەوە کاتێک چالاک دەبێت',
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
    'هێشتا هیچ ئاگادارکردنەوەیەک نییە — نرخێک لە سەرەوە بنووسە و سەرەوە/خوارەوە هەڵبژێرە، کاتێک نرخ گەیشتە ئەوێ ئاگادار دەکرێیتەوە.',
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
  riskCalcSub: 'چەند لۆت بکەیتەوە بۆ ئەوەی زیاتر لە ڕێژەیەکی دیاریکراوی باڵانسەکەت لەدەست نەدەیت',
  riskCalcSymbol: 'ئامراز',
  riskCalcBadSymbol: 'هێمای پشتگیری نەکراو — جووتێکی 6 پیتی وەک EURUSD یان XAUUSD بەکاربهێنە',
  riskCalcCentSymbolHint:
    '«{symbol}» هێمای هەژماری سەنتە — ژمێرەرەکە تەنها لۆتی هەژماری ئاسایی دەژمێرێت، و لۆتی سەنت بچووکترە. بۆ هەژماری ئاسایی {pair} بنووسە',
  appCrashTitle: 'هەڵەیەکی چاوەڕواننەکراو ڕوویدا',
  appCrashBody: 'ئەم شاشەیە نیشان نەدرا. زانیاری و کێشانەکانت پارێزراون — «دووبارە هەوڵبدەرەوە» دابگرە.',
  appCrashRepeatBody:
    'هێشتا کار ناکات. MATRIX بە تەواوی دابخە (لە لیستی ئەپە کراوەکان لایبەرە) و دووبارە بیکەرەوە — کێشانەکانت پارێزراون.',
  appCrashRetry: 'دووبارە هەوڵبدەرەوە',
  planSlWrongBuy: 'بۆ کڕین، وەستان دەبێت لە خوار نرخی چوونەژوورەوە بێت',
  planSlWrongSell: 'بۆ فرۆشتن، وەستان دەبێت لە سەرووی نرخی چوونەژوورەوە بێت',
  planTpWrongBuy: 'بۆ کڕین، ئامانج دەبێت لە سەرووی نرخی چوونەژوورەوە بێت',
  planTpWrongSell: 'بۆ فرۆشتن، ئامانج دەبێت لە خوار نرخی چوونەژوورەوە بێت',
  planSlTooClose: 'وەستان کەمتر لە 1 pip لە چوونەژوورەوە دوورە — لە سپرێد تەسکترە؛ ژمارەکە بپشکنە',
  planRiskWord: 'مەترسی',
  planRewardWord: 'قازانجی ئەگەری',
  planLowRR: '⚠ قازانجی ئەگەری لە مەترسی کەمترە',
  riskCalcAccountCcy: 'دراوی هەژمار',
  riskCalcBalance: 'باڵانسی هەژمار',
  riskCalcRiskPct: 'مەترسی (% یان بڕی پارە)',
  riskCalcRiskMoneyHint: 'بۆ نووسینی مەترسی بە بڕی پارە لە جیاتی ڕێژە، {ccy} دابگرە',
  riskCalcHighRisk: '⚠ زیاتر لە 2% بۆ هەر مامەڵەیەک مەترسی زۆرە',
  riskCalcSlPips: 'وەستانی زیان (pip)',
  riskCalcFromPrice: 'یان لە نرخەوە: چوونەژوورەوە و وەستان وەک لە چارتەکەدا دەیانبینیت',
  riskCalcSlMismatch:
    '⚠ خاڵە نووسراوەکان ({pips}) لەگەڵ نرخی چوونەژوورەوە و وەستان ({derived} pip) ناگونجێن — قەبارەی لۆت و مەترسی لە خاڵەکانەوە دەردەچن، R:R لە نرخەکانەوە',
  riskCalcEntry: 'نرخی چوونەژوورەوە',
  riskCalcStop: 'نرخی وەستان',
  riskCalcStopChip: '{side}: وەستان {price}',
  riskCalcConvFailed: 'نرخی گۆڕینەوە وەرنەگیرا',
  riskCalcConvManual: 'نرخی ئەمە بنووسە',
  riskCalcLots: 'قەبارەی مامەڵە (لۆت)',
  riskCalcRiskAmount: 'مەترسی ڕاستەقینە',
  riskCalcUnits: 'یەکەکان',
  riskCalcBelowMin: 'هیچ قەبارەیەک لەگەڵ ئەم مەترسییە ناگونجێت: بچووکترین لۆت (0.01) زیاتر لەوەی دیاریت کردووە دەخاتە مەترسییەوە',
  riskCalcFillHint: 'باڵانس، ڕێژەی مەترسی و وەستانی زیان بنووسە',
  invalidNumberHint: 'ژمارەکە ناناسرێتەوە — بەبێ جیاکەرەوەی هەزاران بنووسە، وەک 10000 یان 1.0850',
  priceAmbiguousThousandsHint: 'نرخی «{value}» ڕوون نییە — خاڵەکە جیاکەرەوەی هەزارانە یان خاڵی دەیی؟ {whole} یان {small} بنووسە',
  arabicThousandsSignHint: '«٬» جیاکەرەوەی هەزارانە نەک فاریزەی دەیی — بۆ کەرت «٫» یان خاڵ بنووسە، وەک 0٫5',
  riskCalcPipValue: 'بەهای pip بۆ هەر لۆتێک',
  riskCalcLeverage: 'لێڤەرێج (100 واتە 1:100)',
  riskCalcMargin: 'مارجینی گیراو',
  riskCalcMarginNote:
    'مارجین ئەو بڕەیە کە بڕۆکەر تا مامەڵەکە کراوە بێت دەیگرێت، نەک ئەوەی لەوانەیە لەدەستی بدەیت — زیانەکەت ستۆپەکە دیاری دەکات. لێڤەرێجی بەردەست بەپێی بڕۆکەر و ئامراز جیاوازە.',
  riskCalcTarget: 'ئامانج (ئارەزوومەندانە) — بۆ R:R و قازانجی چاوەڕوانکراو',
  riskCalcTargetPlaceholder: 'نرخی ئامانج',
  riskCalcPotentialProfit: 'قازانجی چاوەڕوانکراو',
  riskCalcLogToJournal: 'ئەم پلانە لە دەفتەر تۆمار بکە',
  riskCalcSideLabel: 'ئاراستەی مامەڵە',
  riskCalcSideFromStop: 'لە شوێنی وەستان دەرهێنراوە',
  riskCalcLoggedToJournal: '✓ وەک مامەڵەیەکی کراوە تۆمارکرا — لە «دەفتەر» بیخە کاتی دەرچوون',
  riskCalcLogFailed: 'تۆمارکردن لە دەفتەر سەرکەوتوو نەبوو — پەیوەندییەکەت بپشکنە و دووبارە هەوڵبدەوە',
  riskCalcMarginMaxLots: 'گەورەترین قەبارە کە باڵانسەکەت مارجینەکەی دەگرێتە ئەستۆ: {lots} lot — سنووری سەرەوەیە و هیچ مارجینی ئازاد بۆ هیچ جووڵەیەک ناهێڵێتەوە',
  riskCalcLogBlockedMismatch:
    'پلانێک بە دوو وەستانی جیاواز تۆمار ناکرێت — {derived} لە خانەی خاڵەکان بنووسە، یان نرخی وەستان بگۆڕە تا لەگەڵ خاڵەکانت بگونجێت',
  riskCalcSlMismatchNarrower: '⚠ خاڵەکانت ({pips}) تەسکترن لە دووری نێوان دوو نرخەکە ({derived} pip) — لۆتی حیسابکراو گەورەترە لەوەی مەترسییەکەت هەڵیدەگرێت ئەگەر وەستان لە نرخی خۆی بمێنێتەوە',
  riskCalcSpread: 'سپرێد (pip، ئیختیاری)',
  riskCalcSpreadNote: 'سپرێد زۆرجار دەچێتە سەر دووری وەستان: وەستانی 20 pip بە سپرێدی 1.5 نزیکەی 21.5 لەدەست دەدات کاتێک لێی دەدرێت. سپرێدی ئێستا لە پلاتفۆرمەکەت ببینە — لە کاتی هەواڵ و کرانەوەی هەفتەدا فراوانتر دەبێت.',
  riskCalcRiskWithSpread: 'مەترسی لەگەڵ سپرێد',
  riskCalcSpreadLotsWithin: 'بۆ ئەوەی مەترسییەکەت لەگەڵ سپرێد لە {pct}% بمێنێتەوە: {lots} lot',
  riskCalcSpreadTooWide: 'سپرێدی {n} pip ئاسایی نییە — نرخت نووسیوە لە جیاتی pip؟ جیاوازی نێوان Ask و Bid بە pip بنووسە (وەک 1.5).',
  riskCalcStopInsideSpread:
    'وەستان ({sl} pip) لە سپرێد ({spread} pip) دوورتر نییە — لەوانەیە هەر کە مامەڵەکە کرایەوە لێی بدرێت. وەستان فراوانتر بکە و لۆت کەم بکەرەوە، یان چاوەڕێی سپرێدی تەسکتر بکە.',
  riskCalcCommission: 'کۆمیسیۆنی ئیختیاری بۆ هەر lot، کردنەوە و داخستن',
  riskCalcCommissionNote: 'هەژمارەکانی Raw/ECN لە کاتی کردنەوە و داخستندا کۆمیسیۆن وەردەگرن. کۆی هەردوو لا بۆ یەک lot بە دراوی هەژمارەکەت بنووسە (وەک 7)، یان بەتاڵی بهێڵەوە ئەگەر هەژمارەکەت بێ کۆمیسیۆنە.',
  riskCalcRiskWithCosts: 'مەترسی لەگەڵ تێچووەکان',
  riskCalcCostsLotsWithin: 'بۆ ئەوەی مەترسییەکەت لەگەڵ تێچووەکان لە {pct}% بمێنێتەوە: {lots} lot',
  riskCalcNetAfterCosts: 'دوای تێچووەکان: {profit} · R:R {rr}',
  riskCalcNetNegative: 'تێچووەکان هەموو ئامانجەکە دەخۆن: پوختە {profit} — ئامانجەکە دوورتر بخە یان هەژمارێکی کەمتێچووتر هەڵبژێرە',
  riskCalcLowNetRR: '⚠ دوای تێچووەکان، قازانج لە مەترسی کەمتر دەبێت',
  riskCalcOverOrderMax: '⚠ {lots} lot لە گەورەترین فەرمانێک زیاترە کە زۆربەی بڕۆکەرەکان وەریدەگرن (50–100 lot) — بیکە بە چەند فەرمانێک یان وەستانەکە بپشکنە',
  riskCalcCostsBelowMin: 'لەگەڵ تێچووەکان، تەنانەت بچووکترین لۆت (0.01) لە {pct}% زیاتر دەخاتە مەترسییەوە — ڕێژەکە بەرز بکەرەوە یان وەستانەکە نزیک بکەرەوە',
  riskCalcUseLivePrice: '↓ چوونەژوورەوە = نرخی ئێستا',
  riskCalcUseLivePriceA11y: 'پڕکردنەوەی خانەی چوونەژوورەوە بە نرخی بازاڕی ئێستا (Ask بۆ کڕین و Bid بۆ فرۆشتن بەپێی شوێنی وەستان)',
  riskCalcLiveFilled: '✓ چوونەژوورەوە لە نرخی ئێستاوە:',
  riskCalcLiveSideMoved: '✓ چوونەژوورەوە گوازرایەوە بۆ {quote} (نرخی {side}): {price}',
  riskCalcNoLiveQuote: 'ئێستا نرخی ڕاستەوخۆ بۆ ئەم هێمایە نییە — نرخی چوونەژوورەوە بە دەست بنووسە',
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
  newsUnavailable: 'نەکرا ڕۆژژمێری هەواڵ باربکرێت — نازانین هەواڵێکی بەهێز نزیکە یان نا؛ پێش چوونەژوورەوە بپشکنە',
  calToday: 'ئەمڕۆ',
  calTomorrow: 'سبەینێ',
  calSampleBanner: '⚠ نموونەی ڕوونکردنەوە — ڕۆژژمێری ڕاستەوخۆ ئێستا بەردەست نییە',
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
  reportAdviceTitle: 'بۆچوونی MATRIX',
  reportAdviceHint: 'ئامۆژگاری ئەم هەفتەیە',
  reportRiskTitle: 'کورتەی مەترسی',
  reportRiskHint: 'بەڕێوەبردنی سەرمایە',
  reportOpenWord: 'کراوەیە ↓',
  reportAiFallbackNote:
    'نەکرا پەیوەندی بە زیرەکی دەستکردەوە بکرێت — ئەمە داڵدەیەکی گشتییە نەک شیکارییەکی تایبەت',
  reportJournalDataLine:
    'زانیاری ڕاستەقینەی دەفتەری مامەڵە (هەموو مامەڵە داخراوەکان، نەک تەنها ئەم هەفتەیە): مامەڵە={trades} ڕێژەی سەرکەوتن={winRate}% PnL={pnl}% باشترین={best}% خراپترین={worst}%. پشت بەمە ببەستە لە ڕاپۆرتەکە.',
  reportJournalEmptyLine: '(هێشتا هیچ مامەڵەیەکی داخراو لە دەفتەرەکەدا نییە — ژمارەی ئەدا نییە بۆ پیشاندان).',
  reportJournalUnavailableLine: '(ئێستا دەفتەری مامەڵە نەخوێندرایەوە — ئەم ڕاپۆرتە ژمارەکانی تۆی تێدا نییە).',
  reportFallbackWeekly:
    'ڕاپۆرت لە دەفتەری مامەڵە{journalLine}\nمامەڵەکانت لە تابی «دەفتەر» تۆماربکە بۆ ڕاپۆرتێکی وردتر.',
  reportFallbackPerformance: 'هەڵسەنگاندن لەسەر بنەمای دەفتەرەکە{journalLine}',
  reportFallbackRisk:
    'کورتەی مەترسی{journalLine}\n1) مەترسی ≤1%.\n2) وەستانێکی ڕوون بەکاربهێنە.\n3) دوور بە لە هەواڵی قورس.',
  reportFallbackAdvice:
    'ئامۆژگاری MATRIX{journalLine}\n1) مامەڵە کراوەکانت پێداچوونەوەیان بۆ بکە.\n2) چوونەژوورەوەکان بە DXY ببەستەوە.\n3) مەترسی ≤1%.\n4) دوور بە لە هەواڵی کاریگەری بەرز.\n5) سەرنج بدە بە 2-3 جووت.',
  journalTitle: 'دەفتەری مامەڵە · PnL لە مامەڵەکانت',
  journalSub: 'مامەڵەکانت تۆماربکە — ڕاپۆرتەکان لە ڕۆژنووسەکەت دروستدەبن',
  journalStatClosed: 'مامەڵە داخراوەکان: {n}',
  journalStatWinRate: 'ڕێژەی سەرکەوتن: {pct}%',
  journalStatTotalPnl: 'کۆی PnL: {pct}%',
  journalStatPriceMoveSum: 'کۆی جووڵەی نرخ (بێ قەبارەی مامەڵە): {pct}%',
  journalStatBestWorst: 'باشترین/خراپترین: {best}% / {worst}%',
  journalStatsPending: 'هێشتا هیچ مامەڵەیەکی داخراو نییە — ڕێژەی سەرکەوتن و PnL دوای داخستنی یەکەم مامەڵە دەردەکەون.',
  journalStatNetPips: 'کۆی گشتی: {pips} pip',
  journalStatNetPipsBySymbol: 'کۆی گشتی بۆ هەر ئامرازێک: {parts}',
  journalStatAvgR: 'ناوەندی ئەنجام: {r} بۆ هەر مامەڵەیەک ({n} بە وەستان)',
  journalSideA11yPrefix: 'ئاراستەی مامەڵە',
  journalSymbolPlaceholder: 'هێما',
  journalSymbolA11y: 'هێمای مامەڵە',
  journalEntryPlaceholder: 'چوونەژوورەوە',
  journalUseLivePrice: '↓ نرخی ئێستا',
  journalUseLivePriceA11y: 'پڕکردنەوەی نرخی چوونەژوورەوە بە نرخی ئێستا (Ask بۆ کڕین، Bid بۆ فرۆشتن)',
  journalNoLiveQuote: 'ئێستا نرخی ڕاستەوخۆ بۆ ئەم هێمایە نییە — نرخی چوونەژوورەوە بە دەست بنووسە',
  journalEntryA11y: 'نرخی چوونەژوورەوە',
  journalExitPlaceholder: 'دەرچوون (ئیختیاری)',
  journalSizePlaceholder: 'قەبارە بە لۆت (ئیختیاری)',
  journalSizeA11y: 'قەبارەی مامەڵە بە لۆت (ئیختیاری)',
  journalSizeUnitsFix: '⚠ {n} وەک ژمارەی یەکە دەردەکەوێت نەک لۆت — دەست بنێ بۆ گۆڕینی بۆ {lots} lot',
  journalSizeUnitsNoFix: '⚠ {n} lot قەبارەیەکی نائاساییە — وادیارە ژمارەی یەکەکانە لە پلاتفۆرمەکەتەوە کۆپی کراوە؛ قەبارە بە لۆت بنووسە (وەک 0.10)',
  journalExitA11y: 'نرخی دەرچوون (ئیختیاری)',
  journalExitAtSlA11y: 'دەرچوون لەسەر وەستانی زیان {price}',
  journalExitAtBeA11y: 'دەرچوون لەسەر نرخی چوونەژوورەوە (بێ قازانج و زیان) {price}',
  journalExitAtTpA11y: 'دەرچوون لەسەر ئامانج {price}',
  journalSlAtPipsA11y: 'وەستانی زیان {pips} pip دوور لە چوونەژوورەوە: {price}',
  journalNotePlaceholder: 'تێبینی',
  journalSlPlaceholder: 'وەستانی زیان (ئیختیاری)',
  journalTpPlaceholder: 'ئامانج (ئیختیاری)',
  journalInvalidEntry: 'هێمایەکی دروست (وەک EURUSD یان XAUUSD) و نرخی چوونەژوورەوە بنووسە',
  journalResultR: 'ئەنجام {r}',
  journalNoteA11y: 'تێبینی مامەڵە (ئیختیاری)',
  journalAddA11y: 'زیادکردنی مامەڵەیەکی نوێ',
  journalAddBtn: 'زیادکردنی مامەڵە',
  journalAddError: 'نەکرا مامەڵە زیادبکرێت — پەیوەندییەکەت بپشکنە و دووبارە هەوڵبدەرەوە',
  journalCloseFailedTitle: 'داخستن سەرکەوتوو نەبوو',
  journalCloseFailedBody: 'داخستنەکە پشتڕاست نەکرایەوە — پەیوەندییەکەت بپشکنە. ئەگەر مامەڵەکە هێشتا کراوە دیار بوو، دووبارە دایبخە.',
  journalLoadError: 'نەکرا تۆمارەکە باربکرێت — پەیوەندییەکەت بپشکنە. مامەڵە تۆمارکراوەکانت نەسڕاونەتەوە.',
  journalEmpty:
    'هێشتا هیچ مامەڵەیەک تۆمار نەکراوە — هەموو مامەڵەیەک تۆمار بکە (تەنانەت لەسەر هەژماری تاقیکردنەوە) بۆ ئەوەی بە تێپەڕبوونی کات بزانیت چی بۆت سەرکەوتووە و چی نا. لە فۆرمەکەی سەرەوە بینووسە («↓ نرخی ئێستا» چوونەژوورەوە لە کاتی کردنەوەدا پڕ دەکاتەوە)، یان لە «مەترسی» حیسابی بکە و «ئەم پلانە لە دەفتەر تۆمار بکە» دابگرە.',
  journalOpenSuffix: '(کراوەیە)',
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
  journalCloseLinkA11y: 'داخستنی مامەڵەی {symbol} بە نرخی خانەی دەرچوون',
  journalCloseLinkBtn: 'داخستن بە نرخی خانەی دەرچوون',
  journalCloseMarketBtn: 'داخستن بە نرخی ئێستا',
  journalCloseMarketA11y: 'داخستنی مامەڵەی {symbol} بە نرخی ئێستا',
  journalCloseMarketConfirmTitle: 'داخستن بە نرخی ئێستا؟',
  journalCloseMarketConfirmBody: '{side} {symbol} · {entry} → {exit}\nئەنجام: {result}\n\nنرخەکە لە دابینکەری داتاوەیە (Bid بۆ کڕین، Ask بۆ فرۆشتن) و لەوانەیە کەمێک جیاواز بێت لە نرخی بریکەرەکەت — دەتوانیت دوای داخستن دەستکاری بکەیت.',
  journalCloseFieldConfirmTitle: 'داخستن بە نرخی خانەی دەرچوون؟',
  journalCloseMarketConfirmBtn: 'داخستن',
  journalCloseMarketNoQuote: 'ئێستا نرخی ڕاستەوخۆ بۆ ئەم هێمایە نییە — نرخی دەرچوون لە خانەی «دەرچوون» بنووسە و پاشان «داخستن بە نرخی خانەی دەرچوون»',
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
  calendarTitle: 'ڕۆژژمێری ئابووری · ڕاستەوخۆ',
  calendarCurrencyA11yPrefix: 'پاڵاوتن بەپێی دراو',
  calendarAllWord: 'هەمووی',
  calendarImpactA11yPrefix: 'پاڵاوتن بەپێی کاریگەری',
  calendarAllShort: 'هەموو',
  calImpactMedPlus: 'مامناوەند+',
  calImpactMedPlusA11y: 'بەرز و مامناوەند',
  calendarLoading: 'ڕۆژژمێرەکە بار دەکرێت…',
  calendarLoadError: 'نەکرا ڕۆژژمێرەکە باربکرێت — پەیوەندییەکەت بپشکنە',
  calendarEmpty:
    'هیچ ڕووداوێک لەگەڵ ئەم فلتەرە نییە — گرنگی فراوانتر بکە، فلتەری دراو لابە، یان ڕۆژێکی تر هەڵبژێرە.',
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
  coursesSub: 'شاشەی تەواو · ڕوونکردنەوەی دەنگی · ڕاوەستە و پرسیار بکە دەربارەی هەر بەشێک',
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
  coursesFullLectureWord: 'وانەی تەواو',
  coursesBackToSchoolsA11y: 'گەڕانەوە بۆ لیستی قوتابخانەکان',
  coursesBack: 'گەڕانەوە',
  coursesFallbackLevelTitle: 'بناغە',
  coursesFallbackLectureTitle: 'وانەی کردنەوە',
  coursesFallbackOutlineIntro: 'پێشەکی',
  lectureClose: 'داخستن',
  lectureCloseA11y: 'داخستنی وانەکە',
  lectureLevelWord: 'ئاست',
  lectureLoadFailedNote: 'نەکرا ئەم وانەیە باربکرێت — لە جیاتی ئەوە ناوەڕۆکی نموونەیی گشتی پیشان دەدرێت',
  lectureFullScreenTag: 'شاشەی تەواو',
  lectureVoicePausedForQ: 'ڕاوەستاوە بۆ پرسیارێک',
  lecturePreparingVoice: 'دەنگ ئامادە دەکرێت...',
  lectureExplainingNow: 'ئێستا ڕوون دەکاتەوە',
  lectureVoicePlayError:
    'نەکرا دەنگ لێبدرێت — پەیوەندییەکەت بپشکنە. دەقی تەواوی وانەکە لەبەردەمتە و دەتوانیت بە خوێندنەوە بەردەوام بیت.',
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
  lectureFallbackTitle: 'وانەی نموونەیی',
  lectureFallbackOutlineDefinition: 'پێناسە',
  lectureFallbackOutlineApplication: 'بەکارهێنان',
  lectureFallbackTeacher: 'ڕوونکردنەوەی دەنگی',
  lectureFallbackSeg1Title: 'کردنەوە',
  lectureFallbackSeg1Narration:
    'بەخێربێیت. ئەمە تەنها ناوەڕۆکی شاشەیە لەگەڵ ڕوونکردنەوەی دەنگی. دەتوانیت لە هەر کاتێکدا ڕوونکردنەوەکە ڕابگریت بۆ پرسیارکردن.',
  lectureFallbackSeg2Title: 'بیرۆکەی سەرەکی',
  lectureFallbackSeg2Narration:
    'BOS و CHOCH بەشێکن لە پێکهاتەی بازاڕ لەناو Order Blocks و Fair Value Gaps لە ICT/SMC.',
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
  wlLoadError: 'نەتوانرا لیستی چاودێری لە مۆبایلەکە بخوێندرێتەوە — «دووبارە هەوڵدان» دابگرە',
  layoutSaveFailed: 'نەتوانرا نەخشەسازی لە مۆبایلەکە پاشەکەوت بکرێت — شوێنی بەتاڵی بیرگە بپشکنە و دووبارە هەوڵ بدەرەوە',
  layoutDeleteFailed: 'نەتوانرا نەخشەسازی بسڕدرێتەوە — لەوانەیە جارێکی تر دەربکەوێتەوە، دووبارە بیسڕەوە',
  chartTemplateSaveFailed: 'نەتوانرا داڕێژەکە لە مۆبایلەکە پاشەکەوت بکرێت — شوێنی بەتاڵی بیرگە بپشکنە و دووبارە هەوڵ بدەرەوە',
  chartTemplateDeleteFailed: 'نەتوانرا داڕێژەکە بسڕدرێتەوە — دووبارە هەوڵ بدەرەوە',
  drawingsSaveFailed: 'وێنەکێشانەکان لە مۆبایلەکە پاشەکەوت نەکران — شوێنی بەتاڵی بیرگە بپشکنە، دەنا بە گۆڕینی هێما یان داخستنی ئەپ ون دەبن',
  drawingsDeleteFailed: 'وێنەکێشانەکان لە مۆبایلەکە نەسڕانەوە — لەوانەیە بە کردنەوەی ئەم چارتە بگەڕێنەوە',
  wlSaveFailed: 'گۆڕانکارییەکە پاشەکەوت نەکرا — لیستەکە وەک خۆی گەڕایەوە. شوێنی بەتاڵی بیرگە بپشکنە و دووبارە هەوڵ بدەرەوە',
  wlRetryA11y: 'دووبارە هەوڵدانەوەی بارکردنی لیستی چاودێری',
  wlRetryBtn: 'دووبارە هەوڵدان',
  wlLoadingWord: 'بارکردن...',
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
  focusCompareHint: 'درێژ دابگرە بۆ بەراورد',
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
  ctlKindHollow: 'بەتاڵ',
  ctlKindHeikin: 'هایکن',
  ctlKindBars: 'ستوون',
  ctlKindLine: 'هێڵ',
  ctlKindArea: 'ڕووبەر',
  ctlKindBaseline: 'هێڵی بنەڕەت',
  ctlKindRange: 'مەودا',
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
  railFrameWord: 'چوارچێوە',
  railSquareWord: 'چوارگۆشە',
  railRectangleWord: 'لاکێشراو',
  railShadowWord: 'سێبەر',
  cfSyncLeaderBadge: 'سەرکردەی کات',
  cfSyncPartialBadge: 'هاوکات · بەشی',
  cfSyncFollowBadge: 'هاوکات',
  cfSubtitleInteractive: 'ئەنجینی MATRIX · لینز و ئامرازەکان',
  cfSubtitleNavigate: 'ناوەڕاست ڕایبکێشە · نرخ · بەروار',
  cfSubtitleDefault: 'دەستبدە بۆ شیکاری تەواو',
  cfSyncActivateA11yPrefix: 'چالاککردنی هاوکاتکردنی چارتی ',
  cfChangeSymbolA11y: 'گۆڕینی هێما',
  cfMarketClosedA11y: 'بازاڕ ئێستا داخراوە',
  cfReplayPriceA11y: 'دووبارەکردنەوەی مۆم — ئەم نرخە داخستنی مۆمی دووبارەکردنەوەیە، نەک نرخی زیندوو',
  cfMarketClosedTag: 'داخراو',
  cfSpreadA11y: 'جیاوازی نرخی کڕین و فرۆشتن',
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
    'ژانویە',
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
  mcPrimaryLane: 'سەرەکی',
  mcMeasureBarsWord: 'مۆم',
  mcNoteDefault: 'تێبینی',
  mcSnapshotSaved: 'وێنەی چارت پاشەکەوت کرا',
  mcSnapshotFailed: 'نەتوانرا چارت هەناردە بکرێت',
  mcTemplateDefaultName: 'بنەڕەت',
  mcTemplateSaved: 'ڕووکاری چارت پاشەکەوت کرا',
  mcClearAllTitle: 'سڕینەوەی هەموو کێشانەکان؟',
  mcClearAllBody: 'هەموو توخمەکانی کێشان بۆ ئەم هێمایە لە هەموو ماوە کاتییەکاندا دەسڕێنەوە',
  mcClearWord: 'سڕینەوە',
  mcHintDraw: 'ڕایبکێشە بۆ کێشان، یان دوو خاڵ دابگرە · خۆکار پاشەکەوت دەبێت',
  mcHintNavigate: 'ڕایبکێشە بۆ جوڵان · دەست لە مۆمێک بدە بۆ خوێندنەوە، یان دایگرە و ڕایبکێشە · دوو پەنجە لێک دوور بخەرەوە یان تەوەرەکان ڕایبکێشە بۆ زووم',
  mcHintNavigateWeb: 'ماوس ببە سەری بۆ خوێندنەوە · کلیک بکە بۆ جێگیرکردن · ←/→ مۆم بە مۆم · Esc بۆ لابردن',
  mcHintDrawWeb: 'ڕایبکێشە بۆ کێشان، یان کلیک لە دوو خاڵ بکە · Esc بۆ هەڵوەشاندنەوە · Ctrl+Z بۆ گەڕانەوە · خۆکار پاشەکەوت دەبێت',
  mcHintSelectedWeb: 'ڕایبکێشە بۆ جوولاندنی کێشراو · Delete بۆ سڕینەوەی · Esc بۆ لابردنی دیاریکردن · Ctrl+Z بۆ گەڕانەوە',
  mcHintSelect: 'کێشراوێک دابگرە بۆ دیاریکردنی · شوێنێکی بەتاڵ دابگرە بۆ لابردنی دیاریکردن',
  mcHintSelected: 'کێشراوەکە ڕایبکێشە بۆ جوولاندنی · دەسکێک ڕایبکێشە بۆ گۆڕینی لایەکی · خۆکار پاشەکەوت دەبێت',
  mcAutoA11y: 'خۆکار: گونجاندنی نرخەکان و گەڕانەوە بۆ دوایین مۆم',
  mcAutoManualA11y: 'پێوەری نرخ دەستییە — لەوانەیە مۆمە نوێیەکان لە دیمەن دەربچن. دابگرە بۆ گەڕاندنەوەی خۆکار و گەڕانەوە بۆ دوایین مۆم',
  mcZoomOutA11y: 'بچووککردنەوە',
  mcZoomInA11y: 'گەورەکردن',
  mcPanBackA11y: 'جوڵان بۆ دواوە',
  mcPanForwardA11y: 'جوڵان بۆ پێشەوە',
  mcReplayModeA11y: 'دۆخی دووبارەکردنەوە',
  mcReplayReadout: 'دووبارەکردنەوەی مۆم · {n}/{total}',
  mcReplayStepBackA11y: 'هەنگاوی دووبارەکردنەوە بۆ دواوە',
  mcReplayPauseA11y: 'وەستاندنی دووبارەکردنەوە',
  mcReplayPlayA11y: 'پێکردنی دووبارەکردنەوە',
  mcReplayStepFwdA11y: 'هەنگاوی دووبارەکردنەوە بۆ پێشەوە',
  mcMagnetA11y: 'لکاندن بە تۆڕ',
  mcDockTitle: 'لەنگەری ئامرازەکان · MATRIX',
  mcNoPineLine: 'بێ هێڵی هاوکێشە',
  mcExportPng: 'هەناردەی PNG',
  mcSaveTemplate: 'پاشەکەوتی ڕووکار',
  mcAlertLine: 'ئاگاداری هێڵ',
  mcAlertZone: 'ئاگاداری ناوچە',
  mcAlertAtLineLevel: 'ئاگاداری لە ئاستی هێڵی ئێستا',
  mcAlertAtCrossA11y: 'دروستکردنی ئاگاداری نرخ لە',
  mcUndo: 'گەڕاندنەوە',
  mcUndoA11y: 'گەڕاندنەوەی دوایین گۆڕانکاری لە کێشان',
  mcNothingToUndo: 'هیچ شتێک نییە بۆ گەڕاندنەوە',
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
  ssbError: 'گەڕان سەرکەوتوو نەبوو — پەیوەندییەکەت بپشکنە و دووبارە هەوڵبدەرەوە',
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
  domNoLiveQuote: 'ئێستا نرخی زیندوو نییە — هیچ ژمارەیەک نییە بۆ پیشاندان.',
  domOtcNote: 'فۆرێکس بازاڕێکی ناناوەندییە: قووڵایی یەکگرتوو نییە، و سپرێدی ڕاستەقینە بەپێی بڕۆکەرەکەت دەگۆڕێت.',
  pdwPrevA11yPrefix: 'جووتی پێشوو: ',
  pdwCurrentA11yPrefix: 'دیاریکردنی جووتی ئێستا: ',
  pdwNextA11yPrefix: 'جووتی داهاتوو: ',
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
