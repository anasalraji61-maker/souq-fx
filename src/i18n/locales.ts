export type LangId = 'ar' | 'en-US' | 'ku';

export interface Dict {
  appName: string;
  tabHome: string;
  tabTools: string;
  tabAcademy: string;
  tabAccount: string;
  tabCommunity: string;
  tabPricing: string;
  tabWatchlist: string;
  moreTabs: string;

  // Header & Status
  marketStatusOpen: string;
  marketStatusClosed: string;
  localModeBadge: string;
  selectSymbol: string;
  searchSymbol: string;
  notificationsTitle: string;
  aiAssistant: string;
  accountSettings: string;
  languageSelect: string;

  // Chart HUD & Controls
  timeframes: string;
  indicators: string;
  drawings: string;
  layout: string;
  chartType: string;
  candles: string;
  line: string;
  area: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  closePrice: string;
  volume: string;
  change: string;
  spread: string;
  pips: string;
  bid: string;
  ask: string;

  // Watchlist
  watchlist: string;
  allSymbols: string;
  forex: string;
  metals: string;
  indices: string;

  // Tools Navigation & General
  toolsTitle: string;
  toolsSubtitle: string;
  toolPositionCalc: string;
  toolTradeJournal: string;
  toolCalendar: string;
  toolScreener: string;
  toolAlerts: string;
  toolBacktest: string;
  toolRisk: string;
  toolAnalytics: string;

  // Position Calculator
  accountBalance: string;
  riskPercent: string;
  stopLossPips: string;
  calculatedLots: string;
  cashAtRisk: string;
  pipValue: string;
  calculate: string;

  // Trade Journal
  newTrade: string;
  editTrade: string;
  totalTrades: string;
  winRate: string;
  netProfit: string;
  profitFactor: string;
  symbol: string;
  type: string;
  buy: string;
  sell: string;
  entry: string;
  exit: string;
  lots: string;
  pnl: string;
  date: string;
  status: string;
  notes: string;
  addTrade: string;
  saveChanges: string;
  noTrades: string;
  noTradesDesc: string;
  filterSymbol: string;
  filterDirection: string;
  filterResult: string;
  filterDateFrom: string;
  filterDateTo: string;
  directionAll: string;
  resultAll: string;
  resultWin: string;
  resultLoss: string;
  resultBreakeven: string;
  exportCsv: string;
  printReport: string;
  pagePrev: string;
  pageNext: string;
  pageOf: string;
  confirmDeleteTrade: string;
  tagsLabel: string;
  emotionLabel: string;
  screenshotLabel: string;

  // Trade Journal Statistics
  statsTotalTrades: string;
  statsWinRate: string;
  statsProfitFactor: string;
  statsAvgWin: string;
  statsAvgLoss: string;
  statsExpectancy: string;
  statsBestTrade: string;
  statsWorstTrade: string;
  statsMaxConsecWins: string;
  statsMaxConsecLosses: string;
  statsAvgR: string;
  chartEquityCurve: string;
  chartPnlBySymbol: string;
  chartPnlByWeekday: string;
  chartPnlBySession: string;
  sessionAsia: string;
  sessionLondon: string;
  sessionNewYork: string;
  weekdayMon: string;
  weekdayTue: string;
  weekdayWed: string;
  weekdayThu: string;
  weekdayFri: string;
  weekdaySat: string;
  weekdaySun: string;

  // Economic Calendar
  calendarTitle: string;
  impactHigh: string;
  impactMedium: string;
  impactLow: string;
  event: string;
  time: string;
  actual: string;
  forecast: string;
  previous: string;

  // Screener
  screenerTitle: string;
  trend: string;
  rsi: string;
  signal: string;
  strongBuy: string;
  strongSell: string;
  neutral: string;

  // Price Alerts
  alertsTitle: string;
  createAlert: string;
  targetPrice: string;
  condition: string;
  crossesAbove: string;
  crossesBelow: string;
  activeAlerts: string;
  triggeredAlerts: string;
  testAlert: string;
  noAlerts: string;
  alertBannerTitle: string;
  dismiss: string;
  goToChart: string;

  // Backtester
  backtestTitle: string;
  strategy: string;
  runBacktest: string;
  running: string;
  equityCurve: string;
  maxDrawdown: string;

  // Academy
  academyTitle: string;
  academySubtitle: string;
  schools: string;
  startLecture: string;
  lessonSegments: string;
  interactiveChart: string;
  takeQuiz: string;
  markCompleted: string;
  completedBadge: string;
  overallProgress: string;
  lectureNotes: string;
  quizQuestion: string;
  quizSubmit: string;
  quizPassed: string;
  quizTryAgain: string;
  certificateTitle: string;
  downloadCertificate: string;

  // Community
  communityTitle: string;
  communitySubtitle: string;
  postAnalysis: string;
  newPost: string;
  sentimentBullish: string;
  sentimentBearish: string;
  like: string;
  comment: string;
  share: string;
  emptyPosts: string;
  writeFirstPost: string;
  disclaimerCommunity: string;

  // Notifications Center
  notifsTitle: string;
  notifsSubtitle: string;
  notifsFilterAll: string;
  notifsFilterAlerts: string;
  notifsFilterSystem: string;
  notifsMarkAllRead: string;
  notifsClearAll: string;
  notifsClearConfirmTitle: string;
  notifsClearConfirmMsg: string;
  notifsConfirmYes: string;
  notifsConfirmCancel: string;
  notifsEmpty: string;
  notifsEmptyDesc: string;
  notifsDayToday: string;
  notifsDayYesterday: string;
  notifsNewBadge: string;
  notifsTotalCount: string;

  // Account
  accountTitle: string;
  userProfile: string;
  traderTier: string;
  language: string;
  terminalPreferences: string;
  defaultSymbol: string;
  defaultTimeframe: string;
  soundEffects: string;
  chartGrid: string;
  disclaimerTitle: string;
  disclaimerText: string;
  onboardingReplay: string;

  // Common UI & Accessibility
  loadingContent: string;
  errorTitle: string;
  errorSubtitle: string;
  retryButton: string;
  emptyStateTitle: string;
  emptyStateAction: string;
  closeModal: string;
  skipTour: string;
  startTour: string;
  nextStep: string;
  prevStep: string;
  finishTour: string;
  searchPlaceholder: string;
  confirmAction: string;
  cancelAction: string;

  // Header & Navigation & Status Bar
  navChart: string;
  navChartShort: string;
  navCommunity: string;
  navCommunityShort: string;
  navAcademy: string;
  navAcademyShort: string;
  navTools: string;
  navToolsShort: string;
  navPricing: string;
  navPricingShort: string;
  navAccount: string;
  navAccountShort: string;
  moreMenuTitle: string;
  switchLanguage: string;
  currentSessionLabel: string;
  nextSessionLabel: string;
  checkingMarket: string;
  activeCloud: string;
  sessionTokyo: string;
  statusOpen: string;
  statusClosed: string;
  symbolLabel: string;
  educationalServiceNotice: string;

  // PWA & Bottom Bar
  pwaTitle: string;
  pwaDesc: string;
  pwaInstallBtn: string;
  pwaIosHint: string;
  pwaInstalled: string;
  bottomBarCommunityDesc: string;
  bottomBarPricingDesc: string;
  bottomBarJournalDesc: string;
  bottomBarAlertsDesc: string;

  // Onboarding Tour
  tourStepOf: string;
  tourTitle1: string;
  tourDesc1: string;
  tourTag1: string;
  tourTitle2: string;
  tourDesc2: string;
  tourTag2: string;
  tourTitle3: string;
  tourDesc3: string;
  tourTag3: string;
  tourTitle4: string;
  tourDesc4: string;
  tourTag4: string;
  tourTitle5: string;
  tourDesc5: string;
  tourTag5: string;
  tourStartTrading: string;

  // Notifications Center Items
  notifsDeleteThis: string;
  notifSystemReadyTitle: string;
  notifSystemReadyMsg: string;
  notifCpiTitle: string;
  notifCpiMsg: string;
  notifGoldAlertTitle: string;
  notifGoldAlertMsg: string;

  // Analytics Dashboard Panel
  analyticsTitle: string;
  analyticsSubtitle: string;
  analyticsRefresh: string;
  analyticsEmptyTitle: string;
  analyticsEmptyDesc: string;
  kpiWinRate: string;
  kpiProfitFactor: string;
  kpiSharpeRatio: string;
  kpiMaxDrawdown: string;
  kpiWinningTradesOf: string;
  kpiGrossRatio: string;
  kpiSharpeSuperior: string;
  kpiSharpeAcceptable: string;
  kpiDrawdownPeak: string;
  equityCurveTitle: string;
  equityCurveDesc: string;
  initialBalance: string;
  currentEquity: string;
  distPnlTitle: string;
  distBySymbol: string;
  distByTimeframe: string;
  noSymbolData: string;
  noTimeframeData: string;
  tradesCountFormat: string;

  // Portfolio Risk Panel
  riskPanelTitle: string;
  riskPanelSubtitle: string;
  riskRefreshBtn: string;
  riskEmptyTitle: string;
  riskEmptyDesc: string;
  varSectionTitle: string;
  var95Title: string;
  var95Desc: string;
  cvar95Title: string;
  cvar95Desc: string;
  var99Title: string;
  var99Desc: string;
  cvar99Title: string;
  cvar99Desc: string;
  stressSectionTitle: string;
  stressColScenario: string;
  stressColChange: string;
  stressColPnl: string;
  stressColEquity: string;
  stressColImpact: string;
  stressColStatus: string;
  stressStatusStable: string;
  stressStatusWarning: string;
  stressStatusDanger: string;
  correlationSectionTitle: string;
  correlationSymbolCol: string;
  correlationTooltip: string;

  // Position Size Calculator
  calcTitle: string;
  calcSubtitle: string;
  calcProtectMargin: string;
  calcAccountData: string;
  calcDemoBadge: string;
  calcLeverage: string;
  calcStopLoss: string;
  calcRequiredMargin: string;
  calcResultsHeader: string;
  calcCalculateBtn: string;

  // Academy Classroom & Certificates
  academyClassroom: string;
  academyAllCourses: string;
  academyMyCertificates: string;
  academyBackToCourses: string;
  academyVerifyCert: string;
  academyCertEarnedOn: string;
  academyPrintCert: string;
  academyQuizTitle: string;
  academyScoreLabel: string;

  // Community Screen
  communityChannelForex: string;
  communityChannelGold: string;
  communityChannelIndices: string;
  communitySendMsg: string;
  communityComposerPlaceholder: string;
  communityChannelsTitle: string;
  communityOnlineUsers: string;
  communityRateLimitToast: string;
  communityDisclaimer: string;

  // Chat & Bot & Trading
  chatAiTitle: string;
  chatAiSubtitle: string;
  chatAiPlaceholder: string;
  chatAiDisclaimer: string;
  chatAiClearHistory: string;
  orderBuyButton: string;
  orderSellButton: string;
  orderLimit: string;
  orderMarket: string;
  orderStopLoss: string;
  orderTakeProfit: string;
  orderOpenPositions: string;
  orderClosePosition: string;
  botCommandTitle: string;
  botCommandSubtitle: string;
  botDevSwarm: string;
}

export const DICTS: Record<LangId, Dict> = {
  ar: {
    appName: 'MATRIX',
    tabHome: 'الشارت الرئيسي',
    tabTools: 'الأدوات الفنية',
    tabAcademy: 'الأكاديمية',
    tabAccount: 'حسابي',
    tabCommunity: 'المجتمع',
    tabPricing: 'الباقات',
    tabWatchlist: 'المراقبة',
    moreTabs: 'المزيد',

    marketStatusOpen: 'السوق مفتوح',
    marketStatusClosed: 'السوق مغلق',
    localModeBadge: 'الوضع المحلي',
    selectSymbol: 'اختر الزوج',
    searchSymbol: 'بحث عن زوج أو أداة...',
    notificationsTitle: 'مركز الإشعارات',
    aiAssistant: 'المساعد الذكي AI',
    accountSettings: 'إعدادات الحساب',
    languageSelect: 'اللغة',

    timeframes: 'الفريم الزمني',
    indicators: 'المؤشرات',
    drawings: 'أدوات الرسم',
    layout: 'تخطيط الشاشات',
    chartType: 'نمط الشارت',
    candles: 'شموع يابانية',
    line: 'خط سعري',
    area: 'مساحة مظللة',
    openPrice: 'افتتاح',
    highPrice: 'أعلى',
    lowPrice: 'أدنى',
    closePrice: 'إغلاق',
    volume: 'الحجم',
    change: 'التغير',
    spread: 'الفارق',
    pips: 'نقطة',
    bid: 'طلب (Bid)',
    ask: 'عرض (Ask)',

    watchlist: 'قائمة المتابعة',
    allSymbols: 'الكل',
    forex: 'فوركس',
    metals: 'معادن وسلع',
    indices: 'مؤشرات',

    toolsTitle: 'مجموعة أدوات المتداول',
    toolsSubtitle: 'حاسبات وإحصائيات وتحليلات فنية متقدمة لإدارة المخاطر',
    toolPositionCalc: 'حاسبة حجم اللوت والمخاطرة',
    toolTradeJournal: 'دفتر الصفقات والإحصائيات',
    toolCalendar: 'التقويم الاقتصادي',
    toolScreener: 'الماسح الفني للأسواق',
    toolAlerts: 'تنبيهات الأسعار',
    toolBacktest: 'محاكي الاستراتيجيات (Backtest)',
    toolRisk: 'إدارة المخاطر والمحفظة',
    toolAnalytics: 'لوحة التحليلات المتقدمة',

    accountBalance: 'رأس مال الحساب ($)',
    riskPercent: 'نسبة المخاطرة لكل صفقة (%)',
    stopLossPips: 'وقف الخسارة بالنقاط (Pips)',
    calculatedLots: 'حجم اللوت الموصى به',
    cashAtRisk: 'مبلغ المخاطرة بالدولار',
    pipValue: 'قيمة النقطة المقدرة',
    calculate: 'احسب الحجم الآمن',

    newTrade: 'تسجيل صفقة جديدة',
    editTrade: 'تعديل بيانات الصفقة',
    totalTrades: 'إجمالي الصفقات',
    winRate: 'نسبة النجاح',
    netProfit: 'صافي الربح / الخسارة',
    profitFactor: 'معامل الربحية (Profit Factor)',
    symbol: 'الزوج',
    type: 'النوع',
    buy: 'شراء (BUY)',
    sell: 'بيع (SELL)',
    entry: 'سعر الدخول',
    exit: 'سعر الخروج',
    lots: 'حجم اللوت',
    pnl: 'الربح/الخسارة ($)',
    date: 'التاريخ',
    status: 'الحالة',
    notes: 'ملاحظات والاستراتيجية',
    addTrade: 'حفظ الصفقة في الدفتر',
    saveChanges: 'حفظ التعديلات',
    noTrades: 'لا توجد صفقات مسجلة بعد في الدفتر',
    noTradesDesc: 'سجّل صفقاتك السابقة لمتابعة أدائك ونسبة نجاحك وإحصائيات التداول.',
    filterSymbol: 'تصفية حسب الزوج',
    filterDirection: 'تصفية حسب الاتجاه',
    filterResult: 'تصفية حسب النتيجة',
    filterDateFrom: 'من تاريخ',
    filterDateTo: 'إلى تاريخ',
    directionAll: 'كافة الصفقات (شراء/بيع)',
    resultAll: 'كافة النتائج',
    resultWin: 'صفقات رابحة فقط',
    resultLoss: 'صفقات خاسرة فقط',
    resultBreakeven: 'نقطة التعادل (صفر)',
    exportCsv: 'تصدير CSV',
    printReport: 'طباعة التقرير',
    pagePrev: 'السابق',
    pageNext: 'التالي',
    pageOf: 'صفحة {current} من {total}',
    confirmDeleteTrade: 'هل أنت متأكد من حذف هذه الصفقة من الدفتر؟',
    tagsLabel: 'الوسوم الفنية',
    emotionLabel: 'الحالة النفسية عند التنفيذ',
    screenshotLabel: 'رابط صورة الشارت',

    statsTotalTrades: 'إجمالي الصفقات المنفذة',
    statsWinRate: 'نسبة الصفقات الرابحة',
    statsProfitFactor: 'معامل الربحية',
    statsAvgWin: 'متوسط الربح بالصفقة',
    statsAvgLoss: 'متوسط الخسارة بالصفقة',
    statsExpectancy: 'التوقع الرياضي (Expectancy)',
    statsBestTrade: 'أفضل صفقة ربحية',
    statsWorstTrade: 'أكبر صفقة خاسرة',
    statsMaxConsecWins: 'أقصى صفقات رابحة متتالية',
    statsMaxConsecLosses: 'أقصى صفقات خاسرة متتالية',
    statsAvgR: 'متوسط العائد إلى المخاطرة (R)',
    chartEquityCurve: 'منحنى نمو رأس المال التراكمي',
    chartPnlBySymbol: 'الأرباح والخسائر حسب الزوج',
    chartPnlByWeekday: 'الأرباح والخسائر حسب أيام الأسبوع',
    chartPnlBySession: 'الأرباح والخسائر حسب جلسات التداول',
    sessionAsia: 'الجلسة الآسيوية (طوكيو)',
    sessionLondon: 'جلسة لندن (الأوروبية)',
    sessionNewYork: 'جلسة نيويورك (الأمريكية)',
    weekdayMon: 'الإثنين',
    weekdayTue: 'الثلاثاء',
    weekdayWed: 'الأربعاء',
    weekdayThu: 'الخميس',
    weekdayFri: 'الجمعة',
    weekdaySat: 'السبت',
    weekdaySun: 'الأحد',

    calendarTitle: 'مفكرة الأحداث الاقتصادية العالمية',
    impactHigh: 'تأثير قوي',
    impactMedium: 'تأثير متوسط',
    impactLow: 'تأثير منخفض',
    event: 'الحدث / المؤشر',
    time: 'الوقت',
    actual: 'الفعلي',
    forecast: 'التقديري',
    previous: 'السابق',

    screenerTitle: 'المسح الفني المتزامن للأزواج',
    trend: 'الاتجاه العام',
    rsi: 'مؤشر القوة (RSI)',
    signal: 'التقييم الفني',
    strongBuy: 'شراء قوي',
    strongSell: 'بيع قوي',
    neutral: 'حيادي',

    alertsTitle: 'نظام مراقبة وتنبيهات الأسعار',
    createAlert: 'إنشاء تنبيه سعر جديد',
    targetPrice: 'السعر المستهدف للتنبيه',
    condition: 'شرط الإطلاق',
    crossesAbove: 'اختراق لأعلى (Above)',
    crossesBelow: 'كسر لأسفل (Below)',
    activeAlerts: 'تنبيهات قيد المراقبة',
    triggeredAlerts: 'تنبيهات منفذة سابقاً',
    testAlert: 'تجربة صوت وتنبيه تجريبي',
    noAlerts: 'لا توجد تنبيهات نشطة حالياً',
    alertBannerTitle: 'تم إطلاق تنبيه سعري!',
    dismiss: 'إغلاق',
    goToChart: 'عرض الشارت',

    backtestTitle: 'مختبر اختبار الاستراتيجيات الفنية',
    strategy: 'الاستراتيجية',
    runBacktest: 'تشغيل الاختبار التاريخي',
    running: 'جارٍ المحاكاة على الشموع...',
    equityCurve: 'منحنى نمو رأس المال',
    maxDrawdown: 'أقصى تراجع (Max DD)',

    academyTitle: 'أكاديمية MATRIX للتداول والتحليل',
    academySubtitle: 'منهج تدريبي شامل من الصفر وحتى مدارس السيولة المؤسسية',
    schools: 'المدارس التعليمية',
    startLecture: 'فتح قاعة المحاضرة',
    lessonSegments: 'محاور الشرح والتحليل',
    interactiveChart: 'الرسم البياني التوضيحي للدرس',
    takeQuiz: 'اختبار فهم الدرس',
    markCompleted: 'إتمام الدرس والحصول على الشارة',
    completedBadge: 'مكتمل بنجاح',
    overallProgress: 'التقدم الإجمالي بالأكاديمية',
    lectureNotes: 'الملاحظات الدراسية',
    quizQuestion: 'سؤال الاختبار',
    quizSubmit: 'تأكيد الإجابة',
    quizPassed: 'تهانينا! اجتزت الاختبار بنجاح',
    quizTryAgain: 'إعادة محاولة الاختبار',
    certificateTitle: 'شهادة إتمام المسار التعليمي',
    downloadCertificate: 'تحميل الشهادة',

    communityTitle: 'مجتمع متداولي MATRIX',
    communitySubtitle: 'شارك تحليلاتك الفنية ورؤيتك للأسواق مع زملائك المتداولين',
    postAnalysis: 'كتابة تحليل فني جديد',
    newPost: 'نشر التحليل',
    sentimentBullish: 'صعودي (Bullish)',
    sentimentBearish: 'هبوطي (Bearish)',
    like: 'إعجاب',
    comment: 'تعليق',
    share: 'مشاركة',
    emptyPosts: 'لا توجد منشورات حتى الآن في المجتمع',
    writeFirstPost: 'كن أول من يشارك تحليله الفني اليوم',
    disclaimerCommunity: 'تنويه: المشاركات تعبر عن آراء أصحابها ولا تعتبر توصيات مالية أو استثمارية.',

    notifsTitle: 'مركز الإشعارات والتنبيهات',
    notifsSubtitle: 'سجل تنبيهات الأسعار، تحذيرات الأخبار، والرسائل النظامية.',
    notifsFilterAll: 'الكل',
    notifsFilterAlerts: 'تنبيهات الأسعار',
    notifsFilterSystem: 'رسائل النظام',
    notifsMarkAllRead: 'تحديد الكل كمقروء',
    notifsClearAll: 'مسح السجل',
    notifsClearConfirmTitle: 'تأكيد مسح الإشعارات',
    notifsClearConfirmMsg: 'هل أنت متأكد من مسح كافة الإشعارات؟ لا يمكن التراجع عن هذا الإجراء.',
    notifsConfirmYes: 'نعم، امسح الكل',
    notifsConfirmCancel: 'إلغاء',
    notifsEmpty: 'لا توجد إشعارات حالياً',
    notifsEmptyDesc: 'ستظهر هنا التنبيهات السعرية وتحذيرات تقلبات الأخبار فور حدوثها.',
    notifsDayToday: 'اليوم',
    notifsDayYesterday: 'أمس',
    notifsNewBadge: 'جديد',
    notifsTotalCount: 'إجمالي: {count} إشعار',

    accountTitle: 'بيانات الحساب وتفضيلات المنصة',
    userProfile: 'الملف التعريفي للمتداول',
    traderTier: 'فئة المتداول: عضوية MATRIX الاحترافية',
    language: 'لغة الواجهة (Language)',
    terminalPreferences: 'تفضيلات الشارت والطرفية',
    defaultSymbol: 'الزوج الافتراضي عند الإقلاع',
    defaultTimeframe: 'الفريم الزمني الافتراضي',
    soundEffects: 'المؤثرات الصوتية للتنبيهات والتكات',
    chartGrid: 'إظهار شبكة الخطوط على الشارت',
    disclaimerTitle: 'إخلاء المسؤولية القانونية والتنظيمية',
    disclaimerText: 'تطبيق MATRIX هو أداة متقدمة للتحليل الفني والتعليم ومحاكاة الأسواق فقط. التطبيق لا يقدّم نصائح استثمارية مالية ولا ينفّذ أي صفقات نقدية أو وساطة تداول مع أي جهة. تداول العملات والسلع ينطوي على مخاطر عالية قد لا تناسب جميع المستثمرين.',
    onboardingReplay: 'إعادة عرض الجولة الترحيبية التعريفية',

    loadingContent: 'جارٍ تحميل البيانات...',
    errorTitle: 'تعذر تحميل البيانات المطلوبة',
    errorSubtitle: 'يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.',
    retryButton: 'إعادة المحاولة',
    emptyStateTitle: 'لا توجد بيانات متوفرة حالياً',
    emptyStateAction: 'تحديث البيانات',
    closeModal: 'إغلاق',
    skipTour: 'تخطي الجولة',
    startTour: 'بدء الجولة',
    nextStep: 'التالي',
    prevStep: 'السابق',
    finishTour: 'إنهاء الجولة',
    searchPlaceholder: 'بحث...',
    confirmAction: 'تأكيد',
    cancelAction: 'إلغاء',

    // Header & Navigation & Status Bar
    navChart: 'الشارت الفني',
    navChartShort: 'الشارت',
    navCommunity: 'مجتمع المتداولين',
    navCommunityShort: 'المجتمع',
    navAcademy: 'الأكاديمية والدروس',
    navAcademyShort: 'الأكاديمية',
    navTools: 'أدوات التحليل والتقويم',
    navToolsShort: 'الأدوات',
    navPricing: 'الباقات والترقية',
    navPricingShort: 'الباقات',
    navAccount: 'حسابي والإعدادات',
    navAccountShort: 'حسابي',
    moreMenuTitle: 'المزيد من الأقسام والأدوات',
    switchLanguage: 'تغيير لغة المنصة',
    currentSessionLabel: 'الجلسة الحالية',
    nextSessionLabel: 'الجلسة القادمة',
    checkingMarket: 'جاري فحص حالة السوق...',
    activeCloud: 'سحابة التحليل الفني: متصلة ونشطة',
    sessionTokyo: 'طوكيو',
    statusOpen: 'مفتوح',
    statusClosed: 'مغلق',
    symbolLabel: 'الرمز',
    educationalServiceNotice: 'خدمة تحليل فني تعليمية • ليست نصيحة استثمارية',

    // PWA & Bottom Bar
    pwaTitle: 'تثبيت تطبيق MATRIX على هاتفك',
    pwaDesc: 'تصفح فوري، وصول مباشر من الشاشة الرئيسية، وتشغيل أسرع ومستقر دون متصفح.',
    pwaInstallBtn: 'تثبيت التطبيق الآن',
    pwaIosHint: 'للتثبيت على iPhone: اضغط زر المشاركة Share ثم اختر إضافة إلى الشاشة الرئيسية (Add to Home Screen).',
    pwaInstalled: 'التطبيق مثبت أو مدعوم عبر قائمة المتصفح (⋮ ← تثبيت التطبيق)',
    bottomBarCommunityDesc: 'نقاشات وتحليلات',
    bottomBarPricingDesc: 'بوابات العراق',
    bottomBarJournalDesc: 'اليوميات وتحليل الأداء',
    bottomBarAlertsDesc: 'مراقبة فورية',

    // Onboarding Tour
    tourStepOf: 'خطوة {current} من {total}',
    tourTitle1: 'مرحباً بك في محطة MATRIX الاحترافية',
    tourDesc1: 'منصة تحليل فني متقدمة مصممة لأسواق الفوركس، الذهب، المعادن، ومؤشرات الأسهم العالمية مع شارت تفاعلي فائق السرعة.',
    tourTag1: 'مقدمة المنصة',
    tourTitle2: 'شارت التداول وأدوات الرسم الفنية',
    tourDesc2: 'أكثر من 15 أداة رسم (فيبوناتشي، قنوات سعرية، نماذج السيولة)، حساب مباشر لنسبة العائد للمخاطرة R:R، وشاشات متعددة متزامنة.',
    tourTag2: 'مساحة الشارت',
    tourTitle3: '14 مؤشراً فنياً ومذبذبات سفلية',
    tourDesc3: 'حسابات دقيقة على الشموع المغلقة تشمل إيشيموكو، بولينجر، VWAP، والماكد، مع إمكانية ضبط وتخصيص المعاملات لحظياً.',
    tourTag3: 'المؤشرات الفنية',
    tourTitle4: 'أكاديمية التدريب والشهادات المعتمدة',
    tourDesc4: 'مسارات تعليمية شاملة من المبتدئ إلى الاحتراف، مع اختبارات تفاعلية وشهادات إتمام قابلة للطباعة عند إكمال 100%.',
    tourTag4: 'الأكاديمية',
    tourTitle5: 'التنبيهات السعرية الحية وقائمة المراقبة',
    tourDesc5: 'تنبيهات فورية عند وصول السعر لأهدافك مع إشعارات صوتية ونغمات تنبيهية، وقوائم مراقبة مخصصة برسم بياني مصغر Sparkline.',
    tourTag5: 'التنبيهات والمراقبة',
    tourStartTrading: 'ابدأ الاستخدام الآن',

    // Notifications Center Items
    notifsDeleteThis: 'حذف هذا الإشعار',
    notifSystemReadyTitle: 'منصة MATRIX جاهزة',
    notifSystemReadyMsg: 'تم تفعيل الاتصال بخادم التحليل الفني والبيانات الحية بنجاح.',
    notifCpiTitle: 'تحذير تقلبات: مؤشر التضخم الأمريكي CPI',
    notifCpiMsg: 'حدث عالي التأثير مجدول. يرجى توخي الحذر وإدارة المخاطر على أزواج الدولار.',
    notifGoldAlertTitle: 'تنبيه سعري: الذهب XAUUSD',
    notifGoldAlertMsg: 'وصل سعر الذهب إلى المقاومة التاريخية 2750.00$.',

    // Analytics Dashboard Panel
    analyticsTitle: 'لوحة تحليلات الأداء ومنحنى رأس المال',
    analyticsSubtitle: 'تحليل إحصائي دقيق لمنحنى النمو، مؤشر Sharpe، أقصى تراجع، وتوزيع الأرباح.',
    analyticsRefresh: 'تحديث',
    analyticsEmptyTitle: 'لا توجد بيانات صفقات مغلقة للتحليل',
    analyticsEmptyDesc: 'سجل صفقاتك المكتملة في دفتر الصفقات لتوليد منحنى رأس المال الفعلي وحساب نسبة النجاح الحقيقية دون أي بيانات وهمية أو افتراضية.',
    kpiWinRate: 'معدل الفوز بالصفقات',
    kpiProfitFactor: 'معامل الربحية',
    kpiSharpeRatio: 'مؤشر شارب للمخاطر',
    kpiMaxDrawdown: 'أقصى تراجع للمحفظة',
    kpiWinningTradesOf: '{wins} رابحة من {total} صفقة',
    kpiGrossRatio: 'إجمالي الأرباح ÷ الخسائر',
    kpiSharpeSuperior: 'أداء متفوق ومستقر',
    kpiSharpeAcceptable: 'مخاطرة مقبولة',
    kpiDrawdownPeak: 'أقصى هبوط من القمة',
    equityCurveTitle: 'منحنى نمو رأس المال',
    equityCurveDesc: 'تطور رصيد الحساب مع كل صفقة مغلقة مبني على نتائج الدفتر الفعلية',
    initialBalance: 'الرصيد الابتدائي',
    currentEquity: 'الرصيد الحالي',
    distPnlTitle: 'توزيع الأرباح والخسائر',
    distBySymbol: 'حسب الزوج',
    distByTimeframe: 'حسب الفاصل الزمني',
    noSymbolData: 'لا توجد بيانات رموز مسجلة',
    noTimeframeData: 'لا توجد بيانات فريمات مسجلة',
    tradesCountFormat: '{count} صفقات • {winRate}% فوز',

    // Portfolio Risk Panel
    riskPanelTitle: 'إدارة مخاطر المحفظة واختبارات الإجهاد',
    riskPanelSubtitle: 'تحليل القيمة المعرضة للمخاطر (VaR / CVaR)، مصفوفة الترابط السعري، واختبارات الصدمات الحادة.',
    riskRefreshBtn: 'تحديث الحسابات',
    riskEmptyTitle: 'لا توجد صفقات مغلقة لحساب مؤشرات المخاطر',
    riskEmptyDesc: 'تتطلب حاسبة القيمة المعرضة للمخاطر (VaR) واختبارات الإجهاد وجود صفقات مغلقة في دفتر الصفقات لحساب الأرقام الفعلية دون أرقام وهمية أو افتراضية.',
    varSectionTitle: 'القيمة المعرضة للمخاطر الشرطية (Value at Risk & CVaR)',
    var95Title: 'VaR 95% (أقصى خسارة متوقعة)',
    var95Desc: 'من رأس المال',
    cvar95Title: 'CVaR 95% (متوسط خسارة الذيل)',
    cvar95Desc: 'أسوأ 5% من الحالات',
    var99Title: 'VaR 99% (أقصى خسارة استثنائية)',
    var99Desc: 'من رأس المال',
    cvar99Title: 'CVaR 99% (خسارة الصدمة القصوى)',
    cvar99Desc: 'أسوأ 1% من الحالات',
    stressSectionTitle: 'اختبارات الإجهاد وصدمات السوق الفجائية (Stress Testing ±2%, ±5%)',
    stressColScenario: 'سيناريو الصدمة',
    stressColChange: 'نسبة التغير بالسوق',
    stressColPnl: 'الأثر التقديري P&L',
    stressColEquity: 'رأس المال المتوقع',
    stressColImpact: 'نسبة التأثير',
    stressColStatus: 'حالة الاستقرار',
    stressStatusStable: 'آمن ومستقر',
    stressStatusWarning: 'تحذير ضغط هامش',
    stressStatusDanger: 'خطر استنزاف',
    correlationSectionTitle: 'مصفوفة الترابط بين أزواج العملات والسلع (Correlation Heat-Map)',
    correlationSymbolCol: 'الرمز',
    correlationTooltip: 'الترابط بين {sym1} و {sym2}: {val}',

    // Position Size Calculator
    calcTitle: 'حاسبة حجم اللوت وإدارة المخاطر',
    calcSubtitle: 'احسب حجم العقد الآمن بدقة بالغة وفق أسعار السوق الحقيقية وقواعد النقاط الصارمة.',
    calcProtectMargin: 'حماية رأس المال من نداء الهامش',
    calcAccountData: 'بيانات الحساب والصفقة',
    calcDemoBadge: 'بيانات تجريبية',
    calcLeverage: 'الرافعة المالية للحساب',
    calcStopLoss: 'وقف الخسارة بالنقاط',
    calcRequiredMargin: 'الهامش المطلوب لفتح العقد',
    calcResultsHeader: 'النتائج وحجم العقد الموصى به',
    calcCalculateBtn: 'احسب الحجم الآمن',

    // Academy Classroom & Certificates
    academyClassroom: 'قاعة المحاضرة والدرس',
    academyAllCourses: 'جميع المسارات التعليمية',
    academyMyCertificates: 'شهاداتي المعتمدة',
    academyBackToCourses: 'العودة لقائمة المسارات',
    academyVerifyCert: 'التحقق من صحة الشهادة',
    academyCertEarnedOn: 'تاريخ الإتمام',
    academyPrintCert: 'طباعة الشهادة الرسمية',
    academyQuizTitle: 'اختبار الفهم والاستيعاب',
    academyScoreLabel: 'الدرجة المحققة',

    // Community Screen
    communityChannelForex: 'نقاشات أزواج العملات الفوركس',
    communityChannelGold: 'غرفة الذهب والمعادن الثمينة',
    communityChannelIndices: 'مؤشرات الأسهم والنفط',
    communitySendMsg: 'إرسال',
    communityComposerPlaceholder: 'اكتب تحليلك الفني أو وجهة نظرك في السوق...',
    communityChannelsTitle: 'غرف التحليل والمجتمع',
    communityOnlineUsers: '{count} متداول متصل الآن',
    communityRateLimitToast: 'يرجى الانتظار بضع ثوانٍ قبل إرسال رسالة جديدة لتجنب التكرار.',
    communityDisclaimer: 'تنويه: المشاركات تعبر عن آراء المتداولين وليست توصيات استثمارية.',

    // Chat & Bot & Trading
    chatAiTitle: 'المساعد الذكي للتحليل الفني',
    chatAiSubtitle: 'تحليل شارت، استخراج مستويات الدعم والمقاومة، وتفسير النماذج السعرية.',
    chatAiPlaceholder: 'اسأل عن أي زوج، مستوى فني، أو استراتيجية...',
    chatAiDisclaimer: 'المساعد أداة مساعدة للتحليل الفني ولا يقدم توصيات تداول ملزمة.',
    chatAiClearHistory: 'مسح المحادثة',
    orderBuyButton: 'شراء (Buy)',
    orderSellButton: 'بيع (Sell)',
    orderLimit: 'أمر معلق (Limit)',
    orderMarket: 'تنفيذ فوري (Market)',
    orderStopLoss: 'وقف الخسارة (SL)',
    orderTakeProfit: 'أخذ الربح (TP)',
    orderOpenPositions: 'الصفقات المفتوحة',
    orderClosePosition: 'إغلاق الصفقة',
    botCommandTitle: 'مركز التحكم بالبوتات والوكلاء',
    botCommandSubtitle: 'مراقبة الروبوتات الاستراتيجية واختبار النماذج المؤتمتة.',
    botDevSwarm: 'سرب التطوير والتحليل الآلي',
  },

  'en-US': {
    appName: 'MATRIX',
    tabHome: 'Live Chart',
    tabTools: 'Technical Tools',
    tabAcademy: 'Academy',
    tabAccount: 'Account',
    tabCommunity: 'Community',
    tabPricing: 'Plans',
    tabWatchlist: 'Watchlist',
    moreTabs: 'More',

    marketStatusOpen: 'Market Open',
    marketStatusClosed: 'Market Closed',
    localModeBadge: 'Local Mode',
    selectSymbol: 'Select Pair',
    searchSymbol: 'Search pair or asset...',
    notificationsTitle: 'Notification Center',
    aiAssistant: 'AI Copilot',
    accountSettings: 'Account Settings',
    languageSelect: 'Language',

    timeframes: 'Timeframe',
    indicators: 'Indicators',
    drawings: 'Drawings',
    layout: 'Layout',
    chartType: 'Chart Style',
    candles: 'Candlesticks',
    line: 'Line',
    area: 'Area',
    openPrice: 'Open',
    highPrice: 'High',
    lowPrice: 'Low',
    closePrice: 'Close',
    volume: 'Volume',
    change: 'Change',
    spread: 'Spread',
    pips: 'Pips',
    bid: 'Bid',
    ask: 'Ask',

    watchlist: 'Market Watchlist',
    allSymbols: 'All',
    forex: 'Forex',
    metals: 'Metals & Energy',
    indices: 'Indices',

    toolsTitle: 'Trader Toolbox',
    toolsSubtitle: 'Professional calculators, journal analytics, and risk management',
    toolPositionCalc: 'Position Size & Risk Calculator',
    toolTradeJournal: 'Trade Journal & Analytics',
    toolCalendar: 'Economic Calendar',
    toolScreener: 'Multi-Asset Screener',
    toolAlerts: 'Price Alerts',
    toolBacktest: 'Strategy Backtester',
    toolRisk: 'Portfolio Risk Guard',
    toolAnalytics: 'Analytics Dashboard',

    accountBalance: 'Account Balance ($)',
    riskPercent: 'Risk Per Trade (%)',
    stopLossPips: 'Stop Loss (Pips)',
    calculatedLots: 'Recommended Position Size (Lots)',
    cashAtRisk: 'Monetary Risk ($)',
    pipValue: 'Estimated Pip Value',
    calculate: 'Calculate Safe Size',

    newTrade: 'Log New Trade',
    editTrade: 'Edit Trade Record',
    totalTrades: 'Total Trades',
    winRate: 'Win Rate',
    netProfit: 'Net P/L ($)',
    profitFactor: 'Profit Factor',
    symbol: 'Symbol',
    type: 'Direction',
    buy: 'Buy (Long)',
    sell: 'Sell (Short)',
    entry: 'Entry Price',
    exit: 'Exit Price',
    lots: 'Volume (Lots)',
    pnl: 'P/L ($)',
    date: 'Date & Time',
    status: 'Status',
    notes: 'Notes & Strategy',
    addTrade: 'Save to Journal',
    saveChanges: 'Save Changes',
    noTrades: 'No trades recorded in the journal yet',
    noTradesDesc: 'Log your executed positions to track performance metrics and statistics.',
    filterSymbol: 'Filter by Symbol',
    filterDirection: 'Filter by Direction',
    filterResult: 'Filter by Result',
    filterDateFrom: 'From Date',
    filterDateTo: 'To Date',
    directionAll: 'All Directions (Buy/Sell)',
    resultAll: 'All Results',
    resultWin: 'Winning Trades Only',
    resultLoss: 'Losing Trades Only',
    resultBreakeven: 'Breakeven Only',
    exportCsv: 'Export CSV',
    printReport: 'Print Report',
    pagePrev: 'Previous',
    pageNext: 'Next',
    pageOf: 'Page {current} of {total}',
    confirmDeleteTrade: 'Are you sure you want to delete this trade from your journal?',
    tagsLabel: 'Technical Tags',
    emotionLabel: 'Trader Mindset / Emotion',
    screenshotLabel: 'Chart Screenshot URL',

    statsTotalTrades: 'Total Closed Trades',
    statsWinRate: 'Win Rate (%)',
    statsProfitFactor: 'Profit Factor',
    statsAvgWin: 'Average Win ($)',
    statsAvgLoss: 'Average Loss ($)',
    statsExpectancy: 'Math Expectancy',
    statsBestTrade: 'Best Trade ($)',
    statsWorstTrade: 'Worst Trade ($)',
    statsMaxConsecWins: 'Max Consecutive Wins',
    statsMaxConsecLosses: 'Max Consecutive Losses',
    statsAvgR: 'Average R-Multiple',
    chartEquityCurve: 'Cumulative Equity Curve',
    chartPnlBySymbol: 'P/L Breakdown by Symbol',
    chartPnlByWeekday: 'P/L Distribution by Weekday',
    chartPnlBySession: 'P/L Distribution by Trading Session',
    sessionAsia: 'Asian Session (Tokyo)',
    sessionLondon: 'London Session (Europe)',
    sessionNewYork: 'New York Session (US)',
    weekdayMon: 'Monday',
    weekdayTue: 'Tuesday',
    weekdayWed: 'Wednesday',
    weekdayThu: 'Thursday',
    weekdayFri: 'Friday',
    weekdaySat: 'Saturday',
    weekdaySun: 'Sunday',

    calendarTitle: 'Global Economic Events',
    impactHigh: 'High Impact',
    impactMedium: 'Medium Impact',
    impactLow: 'Low Impact',
    event: 'Economic Event',
    time: 'Time',
    actual: 'Actual',
    forecast: 'Forecast',
    previous: 'Previous',

    screenerTitle: 'Market Technical Screener',
    trend: 'Overall Trend',
    rsi: 'RSI Momentum',
    signal: 'Technical Rating',
    strongBuy: 'Strong Buy',
    strongSell: 'Strong Sell',
    neutral: 'Neutral',

    alertsTitle: 'Price Alerts Monitoring',
    createAlert: 'Create Price Alert',
    targetPrice: 'Target Trigger Price',
    condition: 'Trigger Condition',
    crossesAbove: 'Crosses Above',
    crossesBelow: 'Crosses Below',
    activeAlerts: 'Active Alerts',
    triggeredAlerts: 'Triggered History',
    testAlert: 'Test Alert Chime',
    noAlerts: 'No active price alerts',
    alertBannerTitle: 'Price Alert Triggered!',
    dismiss: 'Dismiss',
    goToChart: 'View Chart',

    backtestTitle: 'Strategy Backtester Lab',
    strategy: 'Strategy Model',
    runBacktest: 'Execute Simulation',
    running: 'Simulating historical bars...',
    equityCurve: 'Capital Growth Curve',
    maxDrawdown: 'Max Drawdown (DD)',

    academyTitle: 'MATRIX Academy for Traders',
    academySubtitle: 'Comprehensive technical curriculum from foundations to smart money concepts',
    schools: 'Educational Schools',
    startLecture: 'Open Classroom',
    lessonSegments: 'Lecture Outline',
    interactiveChart: 'Lesson Educational Chart',
    takeQuiz: 'Take Concept Quiz',
    markCompleted: 'Mark Lesson as Completed',
    completedBadge: 'Completed',
    overallProgress: 'Overall Academy Progress',
    lectureNotes: 'Study Notes',
    quizQuestion: 'Quiz Question',
    quizSubmit: 'Submit Answer',
    quizPassed: 'Congratulations! You passed the quiz',
    quizTryAgain: 'Try Quiz Again',
    certificateTitle: 'Course Completion Certificate',
    downloadCertificate: 'Download Certificate',

    communityTitle: 'MATRIX Trader Community',
    communitySubtitle: 'Share your charts and technical ideas with fellow analysts',
    postAnalysis: 'Share New Analysis',
    newPost: 'Publish Idea',
    sentimentBullish: 'Bullish Sentiment',
    sentimentBearish: 'Bearish Sentiment',
    like: 'Like',
    comment: 'Comment',
    share: 'Share',
    emptyPosts: 'No community discussions posted yet',
    writeFirstPost: 'Be the first to share your market analysis today',
    disclaimerCommunity: 'Notice: Ideas represent users opinions only and do not constitute financial advice.',

    notifsTitle: 'Notifications & Alerts Center',
    notifsSubtitle: 'Log of price triggers, volatility warnings, and system messages.',
    notifsFilterAll: 'All',
    notifsFilterAlerts: 'Price Alerts',
    notifsFilterSystem: 'System Notices',
    notifsMarkAllRead: 'Mark All as Read',
    notifsClearAll: 'Clear History',
    notifsClearConfirmTitle: 'Confirm Clearing Notifications',
    notifsClearConfirmMsg: 'Are you sure you want to clear all notifications? This action cannot be undone.',
    notifsConfirmYes: 'Yes, Clear All',
    notifsConfirmCancel: 'Cancel',
    notifsEmpty: 'No notifications at this time',
    notifsEmptyDesc: 'Triggered price alerts and economic impact notices will show up here.',
    notifsDayToday: 'Today',
    notifsDayYesterday: 'Yesterday',
    notifsNewBadge: 'New',
    notifsTotalCount: 'Total: {count} notifications',

    accountTitle: 'Account & Terminal Preferences',
    userProfile: 'Trader Profile',
    traderTier: 'Tier: MATRIX Pro Membership',
    language: 'UI Language',
    terminalPreferences: 'Terminal & Chart Settings',
    defaultSymbol: 'Default Launch Pair',
    defaultTimeframe: 'Default Timeframe',
    soundEffects: 'Sound Alerts & Tick Chimes',
    chartGrid: 'Show Chart Background Grid',
    disclaimerTitle: 'Legal & Risk Disclaimer',
    disclaimerText: 'MATRIX is an advanced technical analysis and educational market simulation tool. The platform does not offer financial advice and does not execute real-money orders or broker connections. Trading currencies and commodities carries high financial risk.',
    onboardingReplay: 'Replay Guided Onboarding Tour',

    loadingContent: 'Loading content...',
    errorTitle: 'Unable to Load Data',
    errorSubtitle: 'Please check your connection and try again.',
    retryButton: 'Try Again',
    emptyStateTitle: 'No data currently available',
    emptyStateAction: 'Refresh Data',
    closeModal: 'Close',
    skipTour: 'Skip Tour',
    startTour: 'Start Tour',
    nextStep: 'Next',
    prevStep: 'Back',
    finishTour: 'Finish Tour',
    searchPlaceholder: 'Search...',
    confirmAction: 'Confirm',
    cancelAction: 'Cancel',

    // Header & Navigation & Status Bar
    navChart: 'Technical Chart',
    navChartShort: 'Chart',
    navCommunity: 'Trader Community',
    navCommunityShort: 'Community',
    navAcademy: 'Academy & Courses',
    navAcademyShort: 'Academy',
    navTools: 'Analysis & Calendar Tools',
    navToolsShort: 'Tools',
    navPricing: 'Plans & Upgrade',
    navPricingShort: 'Plans',
    navAccount: 'Account & Settings',
    navAccountShort: 'Account',
    moreMenuTitle: 'More Sections & Tools',
    switchLanguage: 'Change Platform Language',
    currentSessionLabel: 'Current Session',
    nextSessionLabel: 'Next Session',
    checkingMarket: 'Checking market status...',
    activeCloud: 'MATRIX Cloud Engine: Active & Synchronized',
    sessionTokyo: 'Tokyo',
    statusOpen: 'Open',
    statusClosed: 'Closed',
    symbolLabel: 'Symbol',
    educationalServiceNotice: 'Educational Technical Analysis Service • Not Investment Advice',

    // PWA & Bottom Bar
    pwaTitle: 'Install MATRIX on Device',
    pwaDesc: 'Instant access from home screen, faster execution and offline caching.',
    pwaInstallBtn: 'Install App Now',
    pwaIosHint: 'To install on iPhone: tap Share then choose Add to Home Screen.',
    pwaInstalled: 'App is installed or supported via browser menu (⋮ ← Install App)',
    bottomBarCommunityDesc: 'Discussions & Analysis',
    bottomBarPricingDesc: 'Iraq Payment Portals',
    bottomBarJournalDesc: 'Journal & Analytics',
    bottomBarAlertsDesc: 'Instant Alerts',

    // Onboarding Tour
    tourStepOf: 'Step {current} of {total}',
    tourTitle1: 'Welcome to MATRIX Professional Terminal',
    tourDesc1: 'Advanced technical analysis terminal designed for Forex, Gold, Commodities, and Global Indices with ultra-fast charting.',
    tourTag1: 'Platform Overview',
    tourTitle2: 'Trading Chart & Drawing Tools',
    tourDesc2: 'Over 15 drawing instruments (Fibonacci, Channels, SMC Liquidity zones), real-time R:R metrics, and synced multi-charts.',
    tourTag2: 'Chart Workspace',
    tourTitle3: '14 Technical Indicators & Oscillators',
    tourDesc3: 'Precision calculations on closed bars including Ichimoku, Bollinger Bands, VWAP, and MACD with customizable inputs.',
    tourTag3: 'Indicators',
    tourTitle4: 'Training Academy & Official Certificates',
    tourDesc4: 'Comprehensive learning tracks from beginner to pro, featuring quizzes and printable completion certificates.',
    tourTag4: 'Academy',
    tourTitle5: 'Live Price Alerts & Watchlist',
    tourDesc5: 'Instant alerts on price targets with audible sounds and custom watchlists with sparkline charts.',
    tourTag5: 'Alerts & Watchlist',
    tourStartTrading: 'Start Using Terminal Now',

    // Notifications Center Items
    notifsDeleteThis: 'Delete this notification',
    notifSystemReadyTitle: 'MATRIX Terminal Ready',
    notifSystemReadyMsg: 'Connected to technical analysis server and live data feed successfully.',
    notifCpiTitle: 'Volatility Warning: US CPI Release',
    notifCpiMsg: 'High impact event scheduled. Exercise caution and manage risk on USD pairs.',
    notifGoldAlertTitle: 'Price Alert: Gold XAUUSD',
    notifGoldAlertMsg: 'Gold price reached historic resistance at $2750.00.',

    // Analytics Dashboard Panel
    analyticsTitle: 'Performance Analytics & Equity Curve',
    analyticsSubtitle: 'Precision statistical breakdown of capital growth, Sharpe ratio, drawdown, and trade distribution.',
    analyticsRefresh: 'Refresh',
    analyticsEmptyTitle: 'No closed trades data to analyze',
    analyticsEmptyDesc: 'Record your completed trades in the journal to generate actual equity curve without fake data.',
    kpiWinRate: 'Trade Win Rate',
    kpiProfitFactor: 'Profit Factor',
    kpiSharpeRatio: 'Sharpe Ratio',
    kpiMaxDrawdown: 'Max Portfolio Drawdown',
    kpiWinningTradesOf: '{wins} wins of {total} trades',
    kpiGrossRatio: 'Gross Profits ÷ Losses',
    kpiSharpeSuperior: 'Superior stable performance',
    kpiSharpeAcceptable: 'Acceptable risk profile',
    kpiDrawdownPeak: 'Max drop from equity peak',
    equityCurveTitle: 'Capital Growth Curve',
    equityCurveDesc: 'Account balance progression with each closed trade based on journal records',
    initialBalance: 'Initial Balance',
    currentEquity: 'Current Balance',
    distPnlTitle: 'P/L Distribution Breakdown',
    distBySymbol: 'By Symbol',
    distByTimeframe: 'By Timeframe',
    noSymbolData: 'No recorded symbol data',
    noTimeframeData: 'No recorded timeframe data',
    tradesCountFormat: '{count} trades • {winRate}% win',

    // Portfolio Risk Panel
    riskPanelTitle: 'Portfolio Risk Management & Stress Testing',
    riskPanelSubtitle: 'Value at Risk (VaR / CVaR) modeling, cross-asset correlation matrix, and market shock scenarios.',
    riskRefreshBtn: 'Recalculate Risk',
    riskEmptyTitle: 'No closed trades to calculate risk metrics',
    riskEmptyDesc: 'VaR and stress testing calculators require closed trades in journal for real metrics without fake data.',
    varSectionTitle: 'Conditional Value at Risk (VaR & CVaR)',
    var95Title: 'VaR 95% (Expected Max Loss)',
    var95Desc: 'of Capital',
    cvar95Title: 'CVaR 95% (Tail Risk Average)',
    cvar95Desc: 'worst 5% of cases',
    var99Title: 'VaR 99% (Extreme Scenario Loss)',
    var99Desc: 'of Capital',
    cvar99Title: 'CVaR 99% (Max Shock Loss)',
    cvar99Desc: 'worst 1% of cases',
    stressSectionTitle: 'Stress Testing & Sudden Market Shocks (±2%, ±5%)',
    stressColScenario: 'Shock Scenario',
    stressColChange: 'Market Move %',
    stressColPnl: 'Estimated P&L Impact',
    stressColEquity: 'Projected Balance',
    stressColImpact: 'Impact %',
    stressColStatus: 'Solvency Status',
    stressStatusStable: 'Safe & Stable',
    stressStatusWarning: 'Margin Pressure Alert',
    stressStatusDanger: 'Depletion Risk',
    correlationSectionTitle: 'Cross-Asset Correlation Heat-Map',
    correlationSymbolCol: 'Symbol',
    correlationTooltip: 'Correlation between {sym1} and {sym2}: {val}',

    // Position Size Calculator
    calcTitle: 'Position Size & Risk Calculator',
    calcSubtitle: 'Calculate exact safe lot sizes with live pricing and strict pip calculation rules.',
    calcProtectMargin: 'Capital Margin Call Protection',
    calcAccountData: 'Account & Trade Parameters',
    calcDemoBadge: 'Demo Data',
    calcLeverage: 'Account Leverage',
    calcStopLoss: 'Stop Loss (Pips)',
    calcRequiredMargin: 'Required Margin',
    calcResultsHeader: 'Calculation Results & Recommended Lots',
    calcCalculateBtn: 'Calculate Safe Lot Size',

    // Academy Classroom & Certificates
    academyClassroom: 'Classroom & Lecture Hall',
    academyAllCourses: 'All Learning Tracks',
    academyMyCertificates: 'Earned Certificates',
    academyBackToCourses: 'Back to Courses',
    academyVerifyCert: 'Verify Certificate Authenticity',
    academyCertEarnedOn: 'Completion Date',
    academyPrintCert: 'Print Official Certificate',
    academyQuizTitle: 'Concept Comprehension Quiz',
    academyScoreLabel: 'Achieved Score',

    // Community Screen
    communityChannelForex: 'Forex Currency Discussions',
    communityChannelGold: 'Gold & Precious Metals Room',
    communityChannelIndices: 'Indices & Oil Market',
    communitySendMsg: 'Send',
    communityComposerPlaceholder: 'Write your technical analysis or market perspective...',
    communityChannelsTitle: 'Analysis Channels',
    communityOnlineUsers: '{count} traders online now',
    communityRateLimitToast: 'Please wait a few seconds before posting another message to prevent duplication.',
    communityDisclaimer: 'Notice: Discussions reflect traders opinions and are not financial recommendations.',

    // Chat & Bot & Trading
    chatAiTitle: 'AI Technical Copilot',
    chatAiSubtitle: 'Chart analysis, support & resistance extraction, and price pattern interpretation.',
    chatAiPlaceholder: 'Ask about any pair, technical level, or strategy...',
    chatAiDisclaimer: 'The AI is a technical aid and does not provide financial or binding signals.',
    chatAiClearHistory: 'Clear Chat',
    orderBuyButton: 'Buy (Long)',
    orderSellButton: 'Sell (Short)',
    orderLimit: 'Pending Order (Limit)',
    orderMarket: 'Market Execution',
    orderStopLoss: 'Stop Loss (SL)',
    orderTakeProfit: 'Take Profit (TP)',
    orderOpenPositions: 'Open Positions',
    orderClosePosition: 'Close Position',
    botCommandTitle: 'Trading Bots & Swarm Center',
    botCommandSubtitle: 'Strategy bot monitoring and automated algorithmic models.',
    botDevSwarm: 'Automated Development & Analysis Swarm',
  },

  ku: {
    appName: 'MATRIX',
    tabHome: 'چارتی سەرەکی',
    tabTools: 'ئامرازە تەکنیکییەکان',
    tabAcademy: 'ئەکادیمیا',
    tabAccount: 'هەژمارەکەم',
    tabCommunity: 'کۆمەڵگە',
    tabPricing: 'پلانی بەشداریکردن',
    tabWatchlist: 'چاودێری بازاڕ',
    moreTabs: 'زیاتر',

    marketStatusOpen: 'بازاڕ کراوەیە',
    marketStatusClosed: 'بازاڕ داخراوە',
    localModeBadge: 'دۆخی ناوخۆیی',
    selectSymbol: 'جووت هەڵبژێرە',
    searchSymbol: 'گەڕان بۆ جووت یان سەرمایە...',
    notificationsTitle: 'سەنتەری ئاگادارییەکان',
    aiAssistant: 'یاریدەدەری زیرەک AI',
    accountSettings: 'ڕێکخستنەکانی هەژمار',
    languageSelect: 'زمان',

    timeframes: 'ماوەی کاتی',
    indicators: 'ئیندیکەیتەرەکان',
    drawings: 'ئامرازەکانی وێنەکێشان',
    layout: 'شێوازی شاشەکان',
    chartType: 'جۆری چارت',
    candles: 'مۆمی ژاپۆنی',
    line: 'هێڵ',
    area: 'ڕووبەر',
    openPrice: 'کردنەوە',
    highPrice: 'بەرزترین',
    lowPrice: 'نزمترین',
    closePrice: 'داخستن',
    volume: 'قەبارە',
    change: 'گۆڕانکاری',
    spread: 'جیاوازی سپڕێد',
    pips: 'پێپس',
    bid: 'کڕین (Bid)',
    ask: 'فرۆشتن (Ask)',

    watchlist: 'لیستی چاودێری',
    allSymbols: 'هەموو',
    forex: 'فۆرێکس',
    metals: 'کانزا و وزە',
    indices: 'پێوەرەکان',

    toolsTitle: 'کۆمەڵەی ئامرازەکانی بازرگان',
    toolsSubtitle: 'حاسیبە، ئامارەکان و شیکاری تەکنیکی پێشکەوتوو بۆ بەڕێوەبردنی مەترسی',
    toolPositionCalc: 'حاسیبەی قەبارەی لۆت و مەترسی',
    toolTradeJournal: 'دەفتەری مامەڵەکان و ئامار',
    toolCalendar: 'ڕۆژژمێری ئابووری',
    toolScreener: 'پشکنەری تەکنیکی هاوکات',
    toolAlerts: 'ئاگادارییەکانی نرخ',
    toolBacktest: 'تاقیکردنەوەی ستراتیژ (Backtest)',
    toolRisk: 'بەڕێوەبردنی مەترسی سەرمایە',
    toolAnalytics: 'تەختەی شیکاری پێشکەوتوو',

    accountBalance: 'سەرمایەی هەژمار ($)',
    riskPercent: 'ڕێژەی مەترسی لە هەر مامەڵەیەکدا (%)',
    stopLossPips: 'ڕاگرتنی زیان بە پیپ (Stop Loss)',
    calculatedLots: 'قەبارەی لۆتی پێشنیارکراو',
    cashAtRisk: 'بڕی پارەی مەترسی ($)',
    pipValue: 'نرخی خەمڵێنراوی یەک پیپ',
    calculate: 'ئەژمارکردنی قەبارەی پارێزراو',

    newTrade: 'تۆمارکردنی مامەڵەی نوێ',
    editTrade: 'دەستکاری مامەڵە',
    totalTrades: 'کۆی گشتی مامەڵەکان',
    winRate: 'ڕێژەی بردنەوە',
    netProfit: 'قازانج/زیانی پوخت ($)',
    profitFactor: 'فاکتەری قازانج (Profit Factor)',
    symbol: 'جووت',
    type: 'جۆر',
    buy: 'کڕین (BUY)',
    sell: 'فرۆشتن (SELL)',
    entry: 'نرخی چوونەژوورەوە',
    exit: 'نرخی دەرچوون',
    lots: 'قەبارەی لۆت',
    pnl: 'قازانج/زیان ($)',
    date: 'بەروار و کات',
    status: 'دۆخ',
    notes: 'تێبینی و ستراتیژ',
    addTrade: 'پاشەکەوتکردن لە دەفتەر',
    saveChanges: 'پاشەکەوتکردنی گۆڕانکارییەکان',
    noTrades: 'تا ئێستا هیچ مامەڵەیەک تۆمار نەکراوە',
    noTradesDesc: 'مامەڵە ئەنجامدراوەکانی خۆت بنووسە بۆ بەدواداچوونی ئاست و ئامارەکان.',
    filterSymbol: 'فلتەر بەپێی جووت',
    filterDirection: 'فلتەر بەپێی ئاراستە',
    filterResult: 'فلتەر بەپێی ئەنجام',
    filterDateFrom: 'لە بەرواری',
    filterDateTo: 'بۆ بەرواری',
    directionAll: 'هەموو جۆرەکان (کڕین/فرۆشتن)',
    resultAll: 'هەموو ئەنجامەکان',
    resultWin: 'تەنها مامەڵە سەرکەوتووەکان',
    resultLoss: 'تەنها مامەڵە دۆڕاوەکان',
    resultBreakeven: 'خاڵی یەکسانبوون (سفر)',
    exportCsv: 'هەناردەکردنی CSV',
    printReport: 'چاپکردنی ڕاپۆرت',
    pagePrev: 'پێشوو',
    pageNext: 'داهاتوو',
    pageOf: 'پەڕەی {current} لە {total}',
    confirmDeleteTrade: 'ئایا دڵنیایت لە سڕینەوەی ئەم مامەڵەیە لە دەفتەردا؟',
    tagsLabel: 'تاگە تەکنیکییەکان',
    emotionLabel: 'باری دەروونی کاتی جێبەجێکردن',
    screenshotLabel: 'لینکی وێنەی چارت',

    statsTotalTrades: 'کۆی گشتی مامەڵە ئەنجامدراوەکان',
    statsWinRate: 'ڕێژەی بردنەوە (%)',
    statsProfitFactor: 'فاکتەری قازانج',
    statsAvgWin: 'تێکڕای قازانج لە هەر مامەڵەیەکدا',
    statsAvgLoss: 'تێکڕای زیان لە هەر مامەڵەیەکدا',
    statsExpectancy: 'چاوەڕوانی بیرکاری (Expectancy)',
    statsBestTrade: 'باشترین مامەڵەی قازانج',
    statsWorstTrade: 'خراپترین مامەڵەی زیان',
    statsMaxConsecWins: 'زۆرترین بردنەوەی لەسەریەک',
    statsMaxConsecLosses: 'زۆرترین زیانی لەسەریەک',
    statsAvgR: 'تێکڕای پاداشت بەرامبەر مەترسی (R)',
    chartEquityCurve: 'هێڵی گەشەی سەرمایەی کەڵەکەبوو',
    chartPnlBySymbol: 'قازانج و زیان بەپێی جووتەکان',
    chartPnlByWeekday: 'قازانج و زیان بەپێی ڕۆژانی هەفتە',
    chartPnlBySession: 'قازانج و زیان بەپێی کاتی بازاڕەکان',
    sessionAsia: 'دانیشتنی ئاسیا (تۆکیۆ)',
    sessionLondon: 'دانیشتنی لەندەن (ئەوروپا)',
    sessionNewYork: 'دانیشتنی نیویۆرک (ئەمریکا)',
    weekdayMon: 'دووشەممە',
    weekdayTue: 'سێشەممە',
    weekdayWed: 'چوارشەممە',
    weekdayThu: 'پێنجشەممە',
    weekdayFri: 'هەینی',
    weekdaySat: 'شەممە',
    weekdaySun: 'یەکشەممە',

    calendarTitle: 'ڕۆژژمێری ڕووداوە ئابوورییە جیهانییەکان',
    impactHigh: 'کاریگەری بەهێز',
    impactMedium: 'کاریگەری مامناوەند',
    impactLow: 'کاریگەری کەم',
    event: 'ڕووداوی ئابووری',
    time: 'کات',
    actual: 'ڕاستەقینە',
    forecast: 'پێشبینیکراو',
    previous: 'پێشوو',

    screenerTitle: 'پشکنەری تەکنیکی هاوکاتی بازاڕەکان',
    trend: 'ئاراستەی گشتی',
    rsi: 'مۆمێنتۆم (RSI)',
    signal: 'هەڵسەنگاندنی تەکنیکی',
    strongBuy: 'کڕینی بەهێز',
    strongSell: 'فرۆشتنی بەهێز',
    neutral: 'بێ لایەن',

    alertsTitle: 'سیستەمی چاودێری و ئاگاداری نرخ',
    createAlert: 'دروستکردنی ئاگاداری نوێ',
    targetPrice: 'نرخی دیاریکراو',
    condition: 'مەرجی ئاگاداری',
    crossesAbove: 'بەرزبوونەوە بۆ سەرەوە',
    crossesBelow: 'دابەزین بۆ خوارەوە',
    activeAlerts: 'ئاگادارییە چالاکەکان',
    triggeredAlerts: 'ئاگادارییە تەواوبووەکان',
    testAlert: 'تاقیکردنەوەی دەنگ و ئاگاداری',
    noAlerts: 'هیچ ئاگادارییەکی چالاک نییە',
    alertBannerTitle: 'ئاگاداری نرخ کاراکرا!',
    dismiss: 'داخستن',
    goToChart: 'نیشاندانی چارت',

    backtestTitle: 'تاقیکردنەوەی ستراتیژی لە مێژووی بازاڕدا',
    strategy: 'مۆدێلی ستراتیژ',
    runBacktest: 'دەستپێکردنی تاقیکردنەوە',
    running: 'چواندنی مۆمە مێژووییەکان...',
    equityCurve: 'هێڵی گەشەی سەرمایە',
    maxDrawdown: 'زۆرترین پاشەکشە (Max DD)',

    academyTitle: 'ئەکادیمیای MATRIX بۆ فێربوونی شیکاری',
    academySubtitle: 'پڕۆگرامی فێرکاری گشتگیر لە سەرەتاوە تا پارەی زیرەکی دامەزراوەیی',
    schools: 'قوتابخانە فێرکارییەکان',
    startLecture: 'کردنەوەی هۆڵی وانە',
    lessonSegments: 'تەوەرەکانی ڕوونکردنەوە',
    interactiveChart: 'نەخشەی ڕوونکردنەوەی وانەکە',
    takeQuiz: 'تاقیکردنەوەی تێگەیشتن',
    markCompleted: 'تەواوکردنی وانەکە',
    completedBadge: 'تەواوکراوە',
    overallProgress: 'پێشکەوتنی گشتی لە ئەکادیمیا',
    lectureNotes: 'تێبینییەکانی وانە',
    quizQuestion: 'پرسیاری تاقیکردنەوە',
    quizSubmit: 'پشتڕاستکردنەوەی وەڵام',
    quizPassed: 'پیرۆزە! تاقیکردنەوەکەت بە سەرکەوتوویی بڕی',
    quizTryAgain: 'دووبارەکردنەوەی تاقیکردنەوە',
    certificateTitle: 'بڕوانامەی تەواوکردنی خولی فێرکاری',
    downloadCertificate: 'داگرتنی بڕوانامە',

    communityTitle: 'کۆمەڵگەی بازرگانانی MATRIX',
    communitySubtitle: 'شیکاری و بۆچوونی خۆت بۆ بازاڕ لەگەڵ بازرگانانی تردا هاوبەش بکە',
    postAnalysis: 'نووسینی شیکاری تەکنیکی نوێ',
    newPost: 'بڵاوکردنەوەی شیکاری',
    sentimentBullish: 'ئاراستەی بەرزبوونەوە (Bullish)',
    sentimentBearish: 'ئاراستەی دابەزین (Bearish)',
    like: 'سەرسامبوون',
    comment: 'لێدوان',
    share: 'هاوبەشکردن',
    emptyPosts: 'تا ئێستا هیچ پۆستێک لە کۆمەڵگەدا نییە',
    writeFirstPost: 'یەکەم کەس بە کە ئەمڕۆ شیکاری تەکنیکی بڵاودەکاتەوە',
    disclaimerCommunity: 'تێبینی: بۆچوونەکان تەنها بۆچوونی نووسەرانن و ڕاوێژی دارایی نین.',

    notifsTitle: 'سەنتەری ئاگادارییەکان',
    notifsSubtitle: 'مێژووی ئاگادارییەکانی نرخ، هوشدارییەکانی هەواڵ و پەیامەکانی سیستەم.',
    notifsFilterAll: 'هەموو',
    notifsFilterAlerts: 'ئاگادارییەکانی نرخ',
    notifsFilterSystem: 'پەیامەکانی سیستەم',
    notifsMarkAllRead: 'هەمووی وەک خوێندراوە نیشان بدە',
    notifsClearAll: 'سڕینەوەی هەمووی',
    notifsClearConfirmTitle: 'دڵنیابوونەوە لە سڕینەوەی ئاگادارییەکان',
    notifsClearConfirmMsg: 'ئایا دڵنیایت لە سڕینەوەی هەموو ئاگادارییەکان؟ ناگەڕێتەوە.',
    notifsConfirmYes: 'بەڵێ، هەمووی بسڕەوە',
    notifsConfirmCancel: 'پاشگەزبوونەوە',
    notifsEmpty: 'هیچ ئاگادارییەک نییە',
    notifsEmptyDesc: 'لێرەدا ئاگادارییەکانی نرخ و هەواڵەکان دەردەکەون کاتێک ڕوودەدەن.',
    notifsDayToday: 'ئەمڕۆ',
    notifsDayYesterday: 'دوێنێ',
    notifsNewBadge: 'نوێ',
    notifsTotalCount: 'سەرجەم: {count} ئاگاداری',

    accountTitle: 'زانیاری هەژمار و ڕێکخستنەکان',
    userProfile: 'ناسنامەی بازرگان',
    traderTier: 'ئاست: ئەندامی پیشەگەری MATRIX',
    language: 'زمانی بەرنامە (Language)',
    terminalPreferences: 'ڕێکخستنەکانی چارت',
    defaultSymbol: 'جووتی سەرەکی',
    defaultTimeframe: 'کاتی سەرەکی چارت',
    soundEffects: 'دەنگی ئاگادارییەکان',
    chartGrid: 'نیشاندانی هێڵەکانی چارت',
    disclaimerTitle: 'ئاگاداری یاسایی و مەترسییەکان',
    disclaimerText: 'بەرنامەی MATRIX تەنها بۆ فێربوون و شیکاری تەکنیکییە، ئامۆژگاری دارایی نادات و مامەڵەی ڕاستەقینە جێبەجێ ناکات. مامەڵەکردن بە دراو و کانزاکان مەترسی گەورەی هەیە.',
    onboardingReplay: 'دووبارە پیشاندانی ڕێبەری سەرەتایی',

    loadingContent: 'بارکردنی ناوەڕۆک...',
    errorTitle: 'هەڵەیەک ڕوویدا لە بارکردنی زانیارییەکان',
    errorSubtitle: 'تکایە هێڵی ئینتەرنێتەکەت بپشکنە و دووبارە هەوڵبدەرەوە.',
    retryButton: 'دووبارە هەوڵدانەوە',
    emptyStateTitle: 'هیچ زانیارییەک بەردەست نییە',
    emptyStateAction: 'نوێکردنەوەی زانیاری',
    closeModal: 'داخستن',
    skipTour: 'تێپەڕاندنی گەشتەکە',
    startTour: 'دەستپێکردنی گەشتەکە',
    nextStep: 'داهاتوو',
    prevStep: 'پێشوو',
    finishTour: 'تەواوکردنی گەشتەکە',
    searchPlaceholder: 'گەڕان...',
    confirmAction: 'پشتڕاستکردنەوە',
    cancelAction: 'پاشگەزبوونەوە',

    // Header & Navigation & Status Bar
    navChart: 'چارتی تەکنیکی',
    navChartShort: 'چارت',
    navCommunity: 'کۆمەڵگەی بازرگانان',
    navCommunityShort: 'کۆمەڵگە',
    navAcademy: 'ئەکادیمیا و وانەکان',
    navAcademyShort: 'ئەکادیمیا',
    navTools: 'ئامرازەکانی شیکاری و ڕۆژژمێر',
    navToolsShort: 'ئامرازەکان',
    navPricing: 'پلان و بەرزکردنەوە',
    navPricingShort: 'پلانەکان',
    navAccount: 'هەژمار و ڕێکخستنەکان',
    navAccountShort: 'هەژمارەکەم',
    moreMenuTitle: 'بەش و ئامرازی زیاتر',
    switchLanguage: 'گۆڕینی زمانی بەرنامە',
    currentSessionLabel: 'دانیشتنی ئێستا',
    nextSessionLabel: 'دانیشتنی داهاتوو',
    checkingMarket: 'پشکنینی دۆخی بازاڕ...',
    activeCloud: 'سێرڤەری هەوری شیکاری: چالاک و پەیوەستکراوە',
    sessionTokyo: 'تۆکیۆ',
    statusOpen: 'کراوەیە',
    statusClosed: 'داخراوە',
    symbolLabel: 'جووت',
    educationalServiceNotice: 'خزمەتگوزاری فێرکاری شیکاری تەکنیکی • ڕاوێژی دارایی نییە',

    // PWA & Bottom Bar
    pwaTitle: 'دابەزاندنی بەرنامەی MATRIX بۆ مۆبایل',
    pwaDesc: 'دەستگەیشتنی دەستبەجێ لە شاشەی سەرەکی، کارکردنی خێراتر بەبێ وێبگەڕ.',
    pwaInstallBtn: 'دابەزاندنی بەرنامە ئێستا',
    pwaIosHint: 'بۆ دابەزاندن لەسەر iPhone: دوگمەی Share دابگرە پاشان Add to Home Screen هەڵبژێرە.',
    pwaInstalled: 'بەرنامەکە دابەزێندراوە یان پشتگیری دەکرێت لە لیستی وێبگەڕ (⋮ ← Install)',
    bottomBarCommunityDesc: 'گفتوگۆ و شیکاری',
    bottomBarPricingDesc: 'دەروازەکانی عێراق',
    bottomBarJournalDesc: 'دەفتەر و شیکاری ئاست',
    bottomBarAlertsDesc: 'چاودێری دەستبەجێ',

    // Onboarding Tour
    tourStepOf: 'هەنگاوی {current} لە {total}',
    tourTitle1: 'بەخێربێن بۆ تێرمیناڵی پێشکەوتووی MATRIX',
    tourDesc1: 'پلاتفۆرمی شیکاری تەکنیکی پێشکەوتوو بۆ فۆرێکس، زێڕ، کانزاکان و پێوەرە جیهانییەکان بە چارتی خێرا.',
    tourTag1: 'پێشەکی پلاتفۆرم',
    tourTitle2: 'چارتی بازرگانی و ئامرازەکانی وێنەکێشان',
    tourDesc2: 'زیاتر لە 15 ئامرازی وێنەکێشان (فیبۆناچی، کەناڵەکان، ناوچەکانی نەختینەیی)، ئەژمارکردنی ڕاستەوخۆی R:R و فرە شاشەی هاوکات.',
    tourTag2: 'شاشەی چارت',
    tourTitle3: '14 ئیندیکەیتەری تەکنیکی پێشکەوتوو',
    tourDesc3: 'ئەژمارکردنی ورد لەسەر مۆمە داخراوەکان بە ئیچیمۆکۆ، بۆلینجەر، VWAP و ماکد بە ڕێکخستنی دەستبەجێ.',
    tourTag3: 'ئیندیکەیتەرەکان',
    tourTitle4: 'ئەکادیمیای ڕاهێنان و بڕوانامە فەرمییەکان',
    tourDesc4: 'ڕێڕەوی فێرکاری گشتگیر لە سەرەتاوە تا پیشەگەری بە تاقیکردنەوە و بڕوانامەی شایستەی چاپکردن.',
    tourTag4: 'ئەکادیمیا',
    tourTitle5: 'ئاگادارییەکانی نرخی ڕاستەوخۆ و لیستی چاودێری',
    tourDesc5: 'ئاگاداری دەستبەجێ کاتێک نرخ دەگاتە ئامانجەکانت بە دەنگی تایبەت و لیستی چاودێری سپارکلاین.',
    tourTag5: 'ئاگاداری و چاودێری',
    tourStartTrading: 'دەستپێکردنی بەکارهێنان ئێستا',

    // Notifications Center Items
    notifsDeleteThis: 'سڕینەوەی ئەم ئاگادارییە',
    notifSystemReadyTitle: 'تێرمیناڵی MATRIX ئامادەیە',
    notifSystemReadyMsg: 'پەیوەندی بە سێرڤەری شیکاری تەکنیکی و داتای ڕاستەوخۆ بە سەرکەوتوویی جێبەجێ کرا.',
    notifCpiTitle: 'هۆشداری ناجێگیری: ئاماری هەڵاوسانی ئەمریکا CPI',
    notifCpiMsg: 'ڕووداوی کاریگەری بەهێز دیاریکراوە. تکایە بە وریایی مامەڵە بکە لەسەر جووتەکانی دۆلار.',
    notifGoldAlertTitle: 'ئاگاداری نرخ: زێڕ XAUUSD',
    notifGoldAlertMsg: 'نرخی زێڕ گەیشتە ئاستی بەرگری مێژوویی 2750.00$.',

    // Analytics Dashboard Panel
    analyticsTitle: 'تەختەی شیکاری ئاست و هێڵی سەرمایە',
    analyticsSubtitle: 'شیکاری ئاماری ورد بۆ هێڵی گەشە، پێوەری Sharpe، زۆرترین پاشەکشە، و دابەشبوونی قازانج.',
    analyticsRefresh: 'نوێکردنەوە',
    analyticsEmptyTitle: 'هیچ داتایەکی مامەڵەی داخراو نییە بۆ شیکاری',
    analyticsEmptyDesc: 'مامەڵە ئەنجامدراوەکانت لە دەفتەری مامەڵە تۆمار بکە بۆ بەدەستهێنانی هێڵی سەرمایەی ڕاستەقینە بەبێ ژمارەی خەیاڵی.',
    kpiWinRate: 'ڕێژەی سەرکەوتنی مامەڵەکان',
    kpiProfitFactor: 'فاکتەری قازانج',
    kpiSharpeRatio: 'پێوەری مەترسی شارپ (Sharpe)',
    kpiMaxDrawdown: 'زۆرترین پاشەکشەی سەرمایە',
    kpiWinningTradesOf: '{wins} براوە لە {total} مامەڵە',
    kpiGrossRatio: 'کۆی قازانج ÷ زیان',
    kpiSharpeSuperior: 'ئاستی بەرز و سەقامگیر',
    kpiSharpeAcceptable: 'مەترسی گونجاو',
    kpiDrawdownPeak: 'زۆرترین دابەزین لە لوتکەی سەرمایە',
    equityCurveTitle: 'هێڵی گەشەی سەرمایە',
    equityCurveDesc: 'پەرەسەندنی باڵانسی هەژمار لەگەڵ هەر مامەڵەیەکی داخراو بەپێی تۆمارەکان',
    initialBalance: 'سەرمایەی سەرەتایی',
    currentEquity: 'سەرمایەی ئێستا',
    distPnlTitle: 'دابەشبوونی قازانج و زیان',
    distBySymbol: 'بەپێی جووت',
    distByTimeframe: 'بەپێی ماوەی کاتی',
    noSymbolData: 'هیچ داتایەکی جووت تۆمار نەکراوە',
    noTimeframeData: 'هیچ داتایەکی فریم تۆمار نەکراوە',
    tradesCountFormat: '{count} مامەڵە • {winRate}% بردنەوە',

    // Portfolio Risk Panel
    riskPanelTitle: 'بەڕێوەبردنی مەترسی و تاقیکردنەوەی گوشاری بازاڕ',
    riskPanelSubtitle: 'شیکاری بەهای لەژێر مەترسی (VaR / CVaR)، ماتریکسی پەیوەندی نرخ، و تاقیکردنەوەی شۆکی کتوپڕ.',
    riskRefreshBtn: 'نوێکردنەوەی ئەژمارکردن',
    riskEmptyTitle: 'هیچ مامەڵەیەکی داخراو نییە بۆ ئەژمارکردنی مەترسی',
    riskEmptyDesc: 'حاسیبەی مەترسی و تاقیکردنەوەی گوشار پێویستی بە مامەڵەی داخراوە لە دەفتەردا بەبێ ژمارەی وەهمی.',
    varSectionTitle: 'بەهای لەژێر مەترسی مەرجدار (Value at Risk & CVaR)',
    var95Title: 'VaR 95% (زۆرترین زیانی چاوەڕوانکراو)',
    var95Desc: 'لە سەرمایە',
    cvar95Title: 'CVaR 95% (تێکڕای زیانی کلک)',
    cvar95Desc: 'خراپترین 5%ی حاڵەتەکان',
    var99Title: 'VaR 99% (زیانی بارودۆخی توند)',
    var99Desc: 'لە سەرمایە',
    cvar99Title: 'CVaR 99% (گەورەترین شۆکی زیان)',
    cvar99Desc: 'خراپترین 1%ی حاڵەتەکان',
    stressSectionTitle: 'تاقیکردنەوەی گوشار و شۆکی کتوپڕی بازاڕ (±2%, ±5%)',
    stressColScenario: 'سیناریۆی شۆک',
    stressColChange: 'ڕێژەی جووڵەی بازاڕ %',
    stressColPnl: 'کاریگەری خەمڵێنراوی P&L',
    stressColEquity: 'سەرمایەی پێشبینیکراو',
    stressColImpact: 'ڕێژەی کاریگەری',
    stressColStatus: 'دۆخی سەقامگیری',
    stressStatusStable: 'پارێزراو و جێگیر',
    stressStatusWarning: 'ئاگاداری گوشاری مارجن',
    stressStatusDanger: 'مەترسی لەناوچوون',
    correlationSectionTitle: 'ماتریکسی پەیوەندی نێوان سەرمایەکان (Correlation Heat-Map)',
    correlationSymbolCol: 'جووت',
    correlationTooltip: 'پەیوەندی نێوان {sym1} و {sym2}: {val}',

    // Position Size Calculator
    calcTitle: 'حاسیبەی قەبارەی لۆت و بەڕێوەبردنی مەترسی',
    calcSubtitle: 'قەبارەی لۆتی پارێزراو بە وردی ئەژمار بکە بەپێی نرخی بازاڕ و یاسای پیپ.',
    calcProtectMargin: 'پاراستنی سەرمایە لە داواکردنی مارجن',
    calcAccountData: 'زانیاری هەژمار و مامەڵە',
    calcDemoBadge: 'داتای تاقیکاری',
    calcLeverage: 'لێڤریجی دارایی هەژمار',
    calcStopLoss: 'ڕاگرتنی زیان (پیپ)',
    calcRequiredMargin: 'مارجنی پێویست بۆ کردنەوەی گرێبەست',
    calcResultsHeader: 'ئەنجامەکان و قەبارەی لۆتی پێشنیارکراو',
    calcCalculateBtn: 'ئەژمارکردنی قەبارەی پارێزراو',

    // Academy Classroom & Certificates
    academyClassroom: 'هۆڵی وانە و وانەوتنەوە',
    academyAllCourses: 'هەموو خولە فێرکارییەکان',
    academyMyCertificates: 'بڕوانامە بەدەستهاتووەکانم',
    academyBackToCourses: 'گەڕانەوە بۆ خولەکان',
    academyVerifyCert: 'پشکنینی دروستی بڕوانامە',
    academyCertEarnedOn: 'بەرواری تەواوکردن',
    academyPrintCert: 'چاپکردنی بڕوانامەی فەرمی',
    academyQuizTitle: 'تاقیکردنەوەی تێگەیشتن',
    academyScoreLabel: 'نمرەی بەدەستهاتوو',

    // Community Screen
    communityChannelForex: 'گفتوگۆی جووتەکانی فۆرێکس',
    communityChannelGold: 'ژووری زێڕ و کانزا بەنرخەکان',
    communityChannelIndices: 'پێوەرەکان و نەوت',
    communitySendMsg: 'ناردن',
    communityComposerPlaceholder: 'شیکاری تەکنیکی یان بۆچوونت لەسەر بازاڕ بنووسە...',
    communityChannelsTitle: 'ژوورەکانی شیکاری',
    communityOnlineUsers: '{count} بازرگان ئێستا ئۆنلاینن',
    communityRateLimitToast: 'تکایە چەند چرکەیەک چاوەڕێ بکە پێش ناردنی پەیامی نوێ.',
    communityDisclaimer: 'ئاگاداری: بۆچوونی بازرگانانە و ڕاوێژی دارایی نییە.',

    // Chat & Bot & Trading
    chatAiTitle: 'یاریدەدەری زیرەکی شیکاری تەکنیکی',
    chatAiSubtitle: 'شیکاری چارت، دەرهێنانی ئاستەکانی پاڵپشتی و بەرگری، و شیکردنەوەی مۆدێلەکان.',
    chatAiPlaceholder: 'پرسیار لەسەر هەر جووتێک، ئاستێکی تەکنیکی یان ستراتیژێک بکە...',
    chatAiDisclaimer: 'یاریدەدەر تەنها یارمەتیدەری تەکنیکییە و ڕاوێژی دارایی پێشکەش ناکات.',
    chatAiClearHistory: 'سڕینەوەی گفتوگۆ',
    orderBuyButton: 'کڕین (Buy)',
    orderSellButton: 'فرۆشتن (Sell)',
    orderLimit: 'فەرمانی هەڵپەسێردراو (Limit)',
    orderMarket: 'جێبەجێکردنی دەستبەجێ (Market)',
    orderStopLoss: 'ڕاگرتنی زیان (SL)',
    orderTakeProfit: 'وەرگرتنی قازانج (TP)',
    orderOpenPositions: 'مامەڵە کراوەکان',
    orderClosePosition: 'داخستنی مامەڵە',
    botCommandTitle: 'ناوەندی کۆنترۆڵی بۆتەکان',
    botCommandSubtitle: 'چاودێری بۆتەکانی ستراتیژ و تاقیکردنەوەی مۆدێلە ئۆتۆماتیکییەکان.',
    botDevSwarm: 'تیمی پەرەپێدان و شیکاری خۆکار',
  },
};

/**
 * Safe translation lookup helper. Falls back to Arabic if key or language is missing.
 * Never returns the raw key name.
 */
export function t(key: keyof Dict, lang: LangId = 'ar'): string {
  const dict = DICTS[lang] || DICTS.ar;
  if (dict && dict[key]) {
    return dict[key];
  }
  return (DICTS.ar && DICTS.ar[key]) || '';
}

/**
 * Returns supported Intl locale string with fallback for Kurdish Sorani.
 */
export function getIntlLocale(lang: LangId): string {
  if (lang === 'en-US') return 'en-US';
  if (lang === 'ku') {
    try {
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat.supportedLocalesOf(['ckb-IQ']).length > 0) {
        return 'ckb-IQ';
      }
    } catch {}
    return 'ar-IQ';
  }
  return 'ar-IQ';
}

/**
 * Format dates & times using Intl with the current language.
 * Always maintains Western digits (0-9) via numberingSystem: 'latn'.
 */
export function formatDateTime(
  dateInput: string | number | Date,
  lang: LangId = 'ar',
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return String(dateInput);
    const locale = getIntlLocale(lang);
    const defaultOpts: Intl.DateTimeFormatOptions = {
      numberingSystem: 'latn',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options,
    };
    return new Intl.DateTimeFormat(locale, defaultOpts).format(date);
  } catch {
    return String(dateInput);
  }
}

/**
 * Dev-only check ensuring every key exists in all three dictionaries without falling back.
 */
export function validateDictionaries(): boolean {
  if (process.env.NODE_ENV !== 'production' && typeof console !== 'undefined') {
    const arKeys = Object.keys(DICTS.ar) as (keyof Dict)[];
    const enKeys = new Set(Object.keys(DICTS['en-US']));
    const kuKeys = new Set(Object.keys(DICTS.ku));

    const missingInEn = arKeys.filter((k) => !enKeys.has(k) || !DICTS['en-US'][k]);
    const missingInKu = arKeys.filter((k) => !kuKeys.has(k) || !DICTS.ku[k]);

    if (missingInEn.length > 0) {
      console.warn('[i18n] Missing keys in en-US:', missingInEn);
    }
    if (missingInKu.length > 0) {
      console.warn('[i18n] Missing keys in ku:', missingInKu);
    }
    return missingInEn.length === 0 && missingInKu.length === 0;
  }
  return true;
}

// Run dev validation on load
validateDictionaries();

// =============================================================================================
// MEGA G texts (Community v2, Tools v2, Academy classroom). One flat dictionary per language.
// `GX_AR` is the source of keys; en-US and ku must define every key (TypeScript enforces it).
// Placeholders: {n}, {ch}, ... filled with `fmt`.
// =============================================================================================

const GX_AR = {
  // generic
  g_all: 'الكل',
  g_cancel: 'إلغاء',
  g_close: 'إغلاق',
  g_refresh: 'تحديث',
  g_signIn: 'تسجيل الدخول',
  g_today: 'اليوم',
  g_yesterday: 'أمس',
  g_tomorrow: 'غداً',
  g_networkError: 'تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مجدداً.',
  g_serverError: 'حدث خطأ في الخادم. حاول بعد قليل.',

  // community
  c_title: 'المجتمع',
  c_channels: 'القنوات',
  c_messages: 'الرسائل',
  c_ideasTab: 'الأفكار',
  c_ideasTitle: 'أفكار المتداولين',
  c_chGeneral: 'النقاش العام',
  c_chGeneralDesc: 'نقاش عام في الأسواق والأخبار الاقتصادية',
  c_chForex: 'العملات (فوركس)',
  c_chForexDesc: 'أزواج العملات الرئيسية والجلسات',
  c_chMetals: 'الذهب والمعادن',
  c_chMetalsDesc: 'الذهب XAU والفضة XAG ومناطق السيولة',
  c_chIndices: 'المؤشرات العالمية',
  c_chIndicesDesc: 'US30 وNAS100 وGER40',
  c_chEnergy: 'الطاقة والنفط',
  c_chEnergyDesc: 'النفط والغاز وبيانات المخزونات',
  c_chSignals: 'التحليل الفني',
  c_chSignalsDesc: 'مشاركة قراءات فنية للتعلّم والنقاش',
  c_rulesShort: 'احترم الآخرين. الروابط ممنوعة حمايةً من الاحتيال. لا أحد هنا يدير حسابك أو يطلب مالك.',
  c_guestTitle: 'انضم إلى نقاش المتداولين',
  c_guestText: 'القنوات متاحة للأعضاء المسجّلين فقط، حتى نعرف صاحب كل رسالة ونحمي المجتمع من الاحتيال.',
  c_loginToChat: 'سجّل الدخول لقراءة الرسائل والمشاركة في النقاش.',
  c_sessionExpired: 'انتهت جلستك. سجّل الدخول مجدداً لمتابعة النقاش.',
  c_loginToVote: 'سجّل الدخول للتصويت على الأفكار.',
  c_loginToReport: 'سجّل الدخول للإبلاغ عن المحتوى.',
  c_loginToShare: 'سجّل الدخول لمشاركة فكرة.',
  c_loginToAct: 'هذه الخطوة تحتاج تسجيل الدخول.',
  c_loadErrorTitle: 'تعذّر تحميل الرسائل',
  c_serverUnreachable: 'لا يمكن الوصول إلى الخادم الآن. لا نعرض رسائل وهمية بدلاً منها.',
  c_emptyTitle: 'لا رسائل بعد',
  c_emptyText: 'كن أول من يبدأ النقاش في قناة «{ch}».',
  c_loadOlder: 'تحميل رسائل أقدم',
  c_newMessages: 'رسائل جديدة ({n})',
  c_mine: 'أنت',
  c_moreActions: 'خيارات إضافية',
  c_showMore: 'عرض المزيد',
  c_showLess: 'عرض أقل',
  c_flagged: 'قيد المراجعة',
  c_sentUp: 'صاعدة',
  c_sentDown: 'هابطة',
  c_sentFlat: 'محايدة',
  c_myView: 'نظرتي:',
  c_tagSymbol: 'ربط الرسالة برمز',
  c_noTag: 'بدون رمز',
  c_composerPh: 'اكتب رسالة في «{ch}»…',
  c_composerLabel: 'نص الرسالة',
  c_composerHint: 'الروابط غير مسموحة. Enter للإرسال وShift+Enter لسطر جديد.',
  c_send: 'إرسال',
  c_errLinks: 'الروابط غير مسموحة في المجتمع حمايةً من الاحتيال. احذف الرابط ثم أرسل.',
  c_errRate: 'تمهّل قليلاً: أرسلت رسائل كثيرة خلال ثوانٍ. حاول بعد لحظات.',
  c_errTooLong: 'الرسالة أطول من {n} حرف.',
  c_errEmpty: 'اكتب رسالة أولاً.',
  c_report: 'إبلاغ',
  c_reportTitle: 'الإبلاغ عن محتوى',
  c_reportWhy: 'ما سبب الإبلاغ؟',
  c_reasonScam: 'احتيال',
  c_reasonAbuse: 'إساءة',
  c_reasonSpam: 'سبام',
  c_reasonOther: 'أخرى',
  c_reportNote: 'سيختفي هذا المحتوى عندك فوراً، ويُخفى عن الجميع إذا أبلغ عنه عدة أعضاء، ثم يراجعه فريق MATRIX.',
  c_reportSend: 'إرسال البلاغ',
  c_reportThanks: 'شكراً، وصلنا بلاغك وأخفينا المحتوى عنك.',
  c_reportAlready: 'سبق أن أبلغت عن هذا المحتوى، وأخفيناه عنك.',
  c_reportFailed: 'تعذّر إرسال البلاغ. حاول مجدداً.',
  c_reportGone: 'هذا المحتوى لم يعد موجوداً.',
  c_dirBuy: 'شراء',
  c_dirSell: 'بيع',
  c_entry: 'الدخول',
  c_sl: 'وقف الخسارة',
  c_tp: 'الهدف',
  c_rr: 'العائد إلى المخاطرة',
  c_agree: 'أوافق',
  c_disagree: 'لا أوافق',
  c_votesN: '{n} صوت',
  c_noVotes: 'لا أصوات بعد',
  c_anonymous: 'عضو سابق',
  c_ideaDisclaimer: 'فكرة تعليمية من مستخدم، وليست نصيحة استثمارية',
  c_filterSymbol: 'تصفية حسب الرمز',
  c_ideasEmptyTitle: 'لا أفكار منشورة',
  c_ideasEmptyText: 'شارك تحليلك بمستويات واضحة ليصوّت عليه الأعضاء ويتعلّموا منه.',
  c_ideasErrorTitle: 'تعذّر تحميل الأفكار',
  c_shareIdea: 'مشاركة فكرة تعليمية',
  c_shareIdeaShort: 'فكرة',
  c_symbol: 'الرمز',
  c_direction: 'الاتجاه',
  c_ideaNote: 'سبب الفكرة (اختياري)',
  c_ideaNotePh: 'مثال: ارتداد من دعم يومي مع تشبّع بيعي على RSI',
  c_ideaShareNote: 'تُنشر الفكرة باسم حسابك ويراها الجميع. لا تنشر وعوداً بأرباح أو طرق تواصل.',
  c_publishIdea: 'نشر الفكرة',
  c_ideaShared: 'نُشرت فكرتك.',
  c_ideaFillLevels: 'أدخل سعر الدخول ووقف الخسارة والهدف بأرقام موجبة.',
  c_ideaBuyRule: 'في الشراء: وقف الخسارة أقل من الدخول، والهدف أعلى منه.',
  c_ideaSellRule: 'في البيع: الهدف أقل من الدخول، ووقف الخسارة أعلى منه.',
  c_ideaErrLevels: 'المستويات غير منطقية أو بعيدة جداً عن سعر الدخول.',
  c_ideaGone: 'هذه الفكرة لم تعد متاحة.',
};

export type GxKey = keyof typeof GX_AR;
export type GxDict = Record<GxKey, string>;

const GX_EN: GxDict = {
  g_all: 'All',
  g_cancel: 'Cancel',
  g_close: 'Close',
  g_refresh: 'Refresh',
  g_signIn: 'Sign in',
  g_today: 'Today',
  g_yesterday: 'Yesterday',
  g_tomorrow: 'Tomorrow',
  g_networkError: 'Could not reach the server. Check your connection and try again.',
  g_serverError: 'Something went wrong on the server. Please try again shortly.',

  c_title: 'Community',
  c_channels: 'Channels',
  c_messages: 'Messages',
  c_ideasTab: 'Ideas',
  c_ideasTitle: 'Trader ideas',
  c_chGeneral: 'General',
  c_chGeneralDesc: 'Markets and economic news',
  c_chForex: 'Forex',
  c_chForexDesc: 'Major currency pairs and sessions',
  c_chMetals: 'Gold & metals',
  c_chMetalsDesc: 'Gold XAU, silver XAG and liquidity zones',
  c_chIndices: 'Global indices',
  c_chIndicesDesc: 'US30, NAS100 and GER40',
  c_chEnergy: 'Energy & oil',
  c_chEnergyDesc: 'Oil, gas and inventory reports',
  c_chSignals: 'Technical analysis',
  c_chSignalsDesc: 'Share chart readings to learn and discuss',
  c_rulesShort: 'Be respectful. Links are blocked to protect members from scams. Nobody here manages accounts or asks for money.',
  c_guestTitle: 'Join the traders’ discussion',
  c_guestText: 'Channels are for registered members only, so every message has a known author and the community stays safe from scams.',
  c_loginToChat: 'Sign in to read messages and join the discussion.',
  c_sessionExpired: 'Your session has expired. Sign in again to continue.',
  c_loginToVote: 'Sign in to vote on ideas.',
  c_loginToReport: 'Sign in to report content.',
  c_loginToShare: 'Sign in to share an idea.',
  c_loginToAct: 'This needs you to be signed in.',
  c_loadErrorTitle: 'Could not load messages',
  c_serverUnreachable: 'The server cannot be reached right now. We never show made-up messages instead.',
  c_emptyTitle: 'No messages yet',
  c_emptyText: 'Be the first to start the discussion in “{ch}”.',
  c_loadOlder: 'Load older messages',
  c_newMessages: 'New messages ({n})',
  c_mine: 'You',
  c_moreActions: 'More actions',
  c_showMore: 'Show more',
  c_showLess: 'Show less',
  c_flagged: 'Under review',
  c_sentUp: 'Bullish',
  c_sentDown: 'Bearish',
  c_sentFlat: 'Neutral',
  c_myView: 'My view:',
  c_tagSymbol: 'Tag a symbol',
  c_noTag: 'No symbol',
  c_composerPh: 'Write a message in “{ch}”…',
  c_composerLabel: 'Message text',
  c_composerHint: 'Links are not allowed. Enter to send, Shift+Enter for a new line.',
  c_send: 'Send',
  c_errLinks: 'Links are not allowed in the community, to protect members from scams. Remove the link and send again.',
  c_errRate: 'Slow down: you sent many messages in a few seconds. Try again in a moment.',
  c_errTooLong: 'The message is longer than {n} characters.',
  c_errEmpty: 'Write a message first.',
  c_report: 'Report',
  c_reportTitle: 'Report content',
  c_reportWhy: 'Why are you reporting this?',
  c_reasonScam: 'Scam',
  c_reasonAbuse: 'Abuse',
  c_reasonSpam: 'Spam',
  c_reasonOther: 'Other',
  c_reportNote: 'It disappears for you right away, is hidden for everyone once several members report it, and the MATRIX team reviews it.',
  c_reportSend: 'Send report',
  c_reportThanks: 'Thanks, we received your report and hid this content for you.',
  c_reportAlready: 'You already reported this content; it is hidden for you.',
  c_reportFailed: 'Could not send the report. Please try again.',
  c_reportGone: 'This content no longer exists.',
  c_dirBuy: 'Buy',
  c_dirSell: 'Sell',
  c_entry: 'Entry',
  c_sl: 'Stop loss',
  c_tp: 'Target',
  c_rr: 'Reward to risk',
  c_agree: 'Agree',
  c_disagree: 'Disagree',
  c_votesN: '{n} votes',
  c_noVotes: 'No votes yet',
  c_anonymous: 'Former member',
  c_ideaDisclaimer: 'An educational idea from a user, not investment advice',
  c_filterSymbol: 'Filter by symbol',
  c_ideasEmptyTitle: 'No ideas yet',
  c_ideasEmptyText: 'Share your analysis with clear levels so members can vote and learn from it.',
  c_ideasErrorTitle: 'Could not load ideas',
  c_shareIdea: 'Share an educational idea',
  c_shareIdeaShort: 'Idea',
  c_symbol: 'Symbol',
  c_direction: 'Direction',
  c_ideaNote: 'Reasoning (optional)',
  c_ideaNotePh: 'Example: bounce from daily support with RSI oversold',
  c_ideaShareNote: 'The idea is published under your account name and everyone can see it. Do not post profit promises or contact details.',
  c_publishIdea: 'Publish idea',
  c_ideaShared: 'Your idea is published.',
  c_ideaFillLevels: 'Enter entry, stop loss and target as positive numbers.',
  c_ideaBuyRule: 'For a buy: stop loss below entry and target above it.',
  c_ideaSellRule: 'For a sell: target below entry and stop loss above it.',
  c_ideaErrLevels: 'The levels are inconsistent or too far from the entry price.',
  c_ideaGone: 'This idea is no longer available.',
};

const GX_KU: GxDict = {
  g_all: 'هەموو',
  g_cancel: 'هەڵوەشاندنەوە',
  g_close: 'داخستن',
  g_refresh: 'نوێکردنەوە',
  g_signIn: 'چوونەژوورەوە',
  g_today: 'ئەمڕۆ',
  g_yesterday: 'دوێنێ',
  g_tomorrow: 'سبەی',
  g_networkError: 'پەیوەندی بە ڕاژەکارەوە نەکرا. ئینتەرنێتەکەت بپشکنە و دووبارە هەوڵ بدەرەوە.',
  g_serverError: 'هەڵەیەک لە ڕاژەکار ڕوویدا. کەمێکی تر هەوڵ بدەرەوە.',

  c_title: 'کۆمەڵگە',
  c_channels: 'کەناڵەکان',
  c_messages: 'نامەکان',
  c_ideasTab: 'بیرۆکەکان',
  c_ideasTitle: 'بیرۆکەی بازرگانان',
  c_chGeneral: 'گفتوگۆی گشتی',
  c_chGeneralDesc: 'بازاڕەکان و هەواڵی ئابووری',
  c_chForex: 'دراوەکان (فۆرێکس)',
  c_chForexDesc: 'جووتە دراوە سەرەکییەکان و دانیشتنەکان',
  c_chMetals: 'زێڕ و کانزاکان',
  c_chMetalsDesc: 'زێڕ XAU و زیو XAG و ناوچەکانی لیکویدیتی',
  c_chIndices: 'پێوەرە جیهانییەکان',
  c_chIndicesDesc: 'US30 و NAS100 و GER40',
  c_chEnergy: 'وزە و نەوت',
  c_chEnergyDesc: 'نەوت و گاز و ڕاپۆرتی کۆگاکان',
  c_chSignals: 'شیکاری تەکنیکی',
  c_chSignalsDesc: 'هاوبەشکردنی خوێندنەوەی چارت بۆ فێربوون و گفتوگۆ',
  c_rulesShort: 'ڕێز لە کەسانی تر بگرە. بەستەر قەدەغەیە بۆ پاراستن لە فێڵ. کەس لێرە هەژمارت بەڕێوە نابات و داوای پارەت لێ ناکات.',
  c_guestTitle: 'بەشداری گفتوگۆی بازرگانان بکە',
  c_guestText: 'کەناڵەکان تەنها بۆ ئەندامانی تۆمارکراون، بۆ ئەوەی خاوەنی هەر نامەیەک دیار بێت و کۆمەڵگە لە فێڵ پارێزراو بێت.',
  c_loginToChat: 'بچۆ ژوورەوە بۆ خوێندنەوەی نامەکان و بەشداریکردن لە گفتوگۆ.',
  c_sessionExpired: 'دانیشتنەکەت کۆتایی هات. دووبارە بچۆ ژوورەوە.',
  c_loginToVote: 'بچۆ ژوورەوە بۆ دەنگدان لەسەر بیرۆکەکان.',
  c_loginToReport: 'بچۆ ژوورەوە بۆ ڕاپۆرتکردنی ناوەڕۆک.',
  c_loginToShare: 'بچۆ ژوورەوە بۆ هاوبەشکردنی بیرۆکەیەک.',
  c_loginToAct: 'ئەم هەنگاوە پێویستی بە چوونەژوورەوە هەیە.',
  c_loadErrorTitle: 'نامەکان بار نەکران',
  c_serverUnreachable: 'ئێستا ناگەینە ڕاژەکار. هەرگیز نامەی ساختە لە جێگەیدا پیشان نادەین.',
  c_emptyTitle: 'هێشتا نامە نییە',
  c_emptyText: 'یەکەم کەس بە کە گفتوگۆ لە «{ch}» دەست پێ دەکات.',
  c_loadOlder: 'بارکردنی نامە کۆنەکان',
  c_newMessages: 'نامەی نوێ ({n})',
  c_mine: 'تۆ',
  c_moreActions: 'هەڵبژاردنی زیاتر',
  c_showMore: 'زیاتر پیشان بدە',
  c_showLess: 'کەمتر پیشان بدە',
  c_flagged: 'لە پشکنیندایە',
  c_sentUp: 'بەرزبوونەوە',
  c_sentDown: 'دابەزین',
  c_sentFlat: 'بێلایەن',
  c_myView: 'بۆچوونم:',
  c_tagSymbol: 'بەستنەوە بە هێمایەک',
  c_noTag: 'بێ هێما',
  c_composerPh: 'نامەیەک لە «{ch}» بنووسە…',
  c_composerLabel: 'دەقی نامە',
  c_composerHint: 'بەستەر ڕێگەپێدراو نییە. Enter بۆ ناردن، Shift+Enter بۆ دێڕی نوێ.',
  c_send: 'ناردن',
  c_errLinks: 'بەستەر لە کۆمەڵگە ڕێگەپێدراو نییە بۆ پاراستن لە فێڵ. بەستەرەکە بسڕەوە و دووبارە بنێرە.',
  c_errRate: 'هێواشتر: لە چەند چرکەیەکدا زۆر نامەت ناردووە. کەمێکی تر هەوڵ بدەرەوە.',
  c_errTooLong: 'نامەکە لە {n} پیت درێژترە.',
  c_errEmpty: 'سەرەتا نامەیەک بنووسە.',
  c_report: 'ڕاپۆرت',
  c_reportTitle: 'ڕاپۆرتکردنی ناوەڕۆک',
  c_reportWhy: 'هۆکاری ڕاپۆرتەکە چییە؟',
  c_reasonScam: 'فێڵ',
  c_reasonAbuse: 'سووکایەتی',
  c_reasonSpam: 'سپام',
  c_reasonOther: 'هی تر',
  c_reportNote: 'یەکسەر لای تۆ دەشاردرێتەوە، ئەگەر چەند ئەندامێک ڕاپۆرتی بکەن لای هەمووان دەشاردرێتەوە، پاشان تیمی MATRIX دەیپشکنێت.',
  c_reportSend: 'ناردنی ڕاپۆرت',
  c_reportThanks: 'سوپاس، ڕاپۆرتەکەت گەیشت و ناوەڕۆکەکەمان لای تۆ شاردەوە.',
  c_reportAlready: 'پێشتر ڕاپۆرتی ئەم ناوەڕۆکەت کردووە؛ لای تۆ شاردراوەتەوە.',
  c_reportFailed: 'ڕاپۆرتەکە نەنێردرا. دووبارە هەوڵ بدەرەوە.',
  c_reportGone: 'ئەم ناوەڕۆکە چیتر بوونی نییە.',
  c_dirBuy: 'کڕین',
  c_dirSell: 'فرۆشتن',
  c_entry: 'چوونەژوورەوە',
  c_sl: 'وەستاندنی زیان',
  c_tp: 'ئامانج',
  c_rr: 'قازانج بەرامبەر مەترسی',
  c_agree: 'هاوڕام',
  c_disagree: 'هاوڕا نیم',
  c_votesN: '{n} دەنگ',
  c_noVotes: 'هێشتا دەنگ نییە',
  c_anonymous: 'ئەندامی پێشوو',
  c_ideaDisclaimer: 'بیرۆکەیەکی فێرکاریی بەکارهێنەرێکە، ئامۆژگاری وەبەرهێنان نییە',
  c_filterSymbol: 'پاڵاوتن بەپێی هێما',
  c_ideasEmptyTitle: 'هیچ بیرۆکەیەک بڵاو نەکراوەتەوە',
  c_ideasEmptyText: 'شیکارییەکەت بە ئاستی ڕوون هاوبەش بکە با ئەندامان دەنگی لەسەر بدەن و فێری ببن.',
  c_ideasErrorTitle: 'بیرۆکەکان بار نەکران',
  c_shareIdea: 'هاوبەشکردنی بیرۆکەیەکی فێرکاری',
  c_shareIdeaShort: 'بیرۆکە',
  c_symbol: 'هێما',
  c_direction: 'ئاراستە',
  c_ideaNote: 'هۆکاری بیرۆکەکە (ئارەزوومەندانە)',
  c_ideaNotePh: 'نموونە: گەڕانەوە لە پاڵپشتی ڕۆژانە لەگەڵ RSI ی فرۆشتنی زۆر',
  c_ideaShareNote: 'بیرۆکەکە بە ناوی هەژمارەکەت بڵاو دەکرێتەوە و هەموو کەس دەیبینێت. بەڵێنی قازانج یان زانیاری پەیوەندی بڵاو مەکەرەوە.',
  c_publishIdea: 'بڵاوکردنەوەی بیرۆکە',
  c_ideaShared: 'بیرۆکەکەت بڵاو کرایەوە.',
  c_ideaFillLevels: 'نرخی چوونەژوورەوە و وەستاندنی زیان و ئامانج بە ژمارەی پۆزەتیڤ بنووسە.',
  c_ideaBuyRule: 'لە کڕیندا: وەستاندنی زیان خوار چوونەژوورەوە و ئامانج سەرووی بێت.',
  c_ideaSellRule: 'لە فرۆشتندا: ئامانج خوار چوونەژوورەوە و وەستاندنی زیان سەرووی بێت.',
  c_ideaErrLevels: 'ئاستەکان لۆژیکی نین یان زۆر دوورن لە نرخی چوونەژوورەوە.',
  c_ideaGone: 'ئەم بیرۆکەیە چیتر بەردەست نییە.',
};

export const GX: Record<LangId, GxDict> = { ar: GX_AR, 'en-US': GX_EN, ku: GX_KU };

/** MEGA G dictionary for a language (Arabic when unknown). */
export function gx(lang: LangId | string | undefined): GxDict {
  return GX[(lang as LangId) || 'ar'] || GX.ar;
}

/** Fill `{name}` placeholders. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
