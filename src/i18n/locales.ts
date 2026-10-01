export type LangId = 'ar' | 'en-US' | 'ku';

export interface Dict {
  appName: string;
  tabHome: string;
  tabTools: string;
  tabAcademy: string;
  tabAccount: string;

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
  searchSymbol: string;
  allSymbols: string;
  forex: string;
  metals: string;
  indices: string;

  // Tools
  toolsTitle: string;
  toolPositionCalc: string;
  toolTradeJournal: string;
  toolCalendar: string;
  toolScreener: string;
  toolAlerts: string;
  toolBacktest: string;

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
  pnl: string;
  date: string;
  status: string;
  notes: string;
  addTrade: string;
  noTrades: string;

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
}

export const DICTS: Record<LangId, Dict> = {
  ar: {
    appName: 'MATRIX',
    tabHome: 'الرئيسية (الشارت)',
    tabTools: 'الأدوات الفنية',
    tabAcademy: 'الأكاديمية',
    tabAccount: 'الحساب والإعدادات',

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
    searchSymbol: 'بحث عن زوج أو أداة...',
    allSymbols: 'الكل',
    forex: 'فوركس',
    metals: 'معادن وسلع',
    indices: 'مؤشرات',

    toolsTitle: 'مجموعة أدوات المتداول',
    toolPositionCalc: 'حاسبة حجم اللوت والمخاطرة',
    toolTradeJournal: 'دفتر الصفقات والإحصائيات',
    toolCalendar: 'التقويم الاقتصادي الحي',
    toolScreener: 'الماسح الفني للأسواق',
    toolAlerts: 'تنبيهات الأسعار',
    toolBacktest: 'محاكي الاستراتيجيات (Backtest)',

    accountBalance: 'رأس مال الحساب ($)',
    riskPercent: 'نسبة المخاطرة لكل صفقة (%)',
    stopLossPips: 'وقف الخسارة بالنقاط (Pips)',
    calculatedLots: 'حجم اللوت الموصى به',
    cashAtRisk: 'مبلغ المخاطرة بالدولار',
    pipValue: 'قيمة النقطة المقدرة',
    calculate: 'احسب الحجم الآمن',

    newTrade: 'تسجيل صفقة جديدة',
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
    pnl: 'الربح/الخسارة ($)',
    date: 'التاريخ',
    status: 'الحالة',
    notes: 'ملاحظات والاستراتيجية',
    addTrade: 'حفظ الصفقة في الدفتر',
    noTrades: 'لا توجد صفقات مسجلة بعد في الدفتر',

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
  },
  'en-US': {
    appName: 'MATRIX',
    tabHome: 'Terminal (Chart)',
    tabTools: 'Technical Tools',
    tabAcademy: 'Academy',
    tabAccount: 'Account & Settings',

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
    searchSymbol: 'Search pair or asset...',
    allSymbols: 'All',
    forex: 'Forex',
    metals: 'Metals & Energy',
    indices: 'Indices',

    toolsTitle: 'Trader Technical Suite',
    toolPositionCalc: 'Position Size & Risk Calculator',
    toolTradeJournal: 'Trade Journal & Analytics',
    toolCalendar: 'Live Economic Calendar',
    toolScreener: 'Multi-Asset Screener',
    toolAlerts: 'Price Alerts',
    toolBacktest: 'Strategy Backtester',

    accountBalance: 'Account Balance ($)',
    riskPercent: 'Risk per Trade (%)',
    stopLossPips: 'Stop Loss in Pips',
    calculatedLots: 'Recommended Lot Size',
    cashAtRisk: 'Cash at Risk ($)',
    pipValue: 'Estimated Pip Value',
    calculate: 'Calculate Position Size',

    newTrade: 'Log New Trade',
    totalTrades: 'Total Trades',
    winRate: 'Win Rate',
    netProfit: 'Net P&L',
    profitFactor: 'Profit Factor',
    symbol: 'Pair',
    type: 'Direction',
    buy: 'BUY',
    sell: 'SELL',
    entry: 'Entry Price',
    exit: 'Exit Price',
    pnl: 'P&L ($)',
    date: 'Date',
    status: 'Status',
    notes: 'Notes & Strategy',
    addTrade: 'Save to Journal',
    noTrades: 'No trades recorded in journal yet',

    calendarTitle: 'Global Economic Calendar',
    impactHigh: 'High Impact',
    impactMedium: 'Medium Impact',
    impactLow: 'Low Impact',
    event: 'Economic Event',
    time: 'Time',
    actual: 'Actual',
    forecast: 'Forecast',
    previous: 'Previous',

    screenerTitle: 'Multi-Symbol Technical Scanner',
    trend: 'Trend',
    rsi: 'RSI (14)',
    signal: 'Signal Rating',
    strongBuy: 'Strong Buy',
    strongSell: 'Strong Sell',
    neutral: 'Neutral',

    alertsTitle: 'Live Price Alert Monitor',
    createAlert: 'Create New Alert',
    targetPrice: 'Target Trigger Price',
    condition: 'Condition',
    crossesAbove: 'Crosses Above',
    crossesBelow: 'Crosses Below',
    activeAlerts: 'Active Watch Alerts',
    triggeredAlerts: 'Triggered History',
    testAlert: 'Test Alert Notification',
    noAlerts: 'No active price alerts right now',

    backtestTitle: 'Quantitative Strategy Backtester',
    strategy: 'Strategy Model',
    runBacktest: 'Run Simulation',
    running: 'Simulating historical bars...',
    equityCurve: 'Capital Equity Curve',
    maxDrawdown: 'Max Drawdown',

    academyTitle: 'MATRIX Trading Academy',
    academySubtitle: 'Comprehensive technical curriculum from basics to institutional smart money concepts',
    schools: 'Curriculum Schools',
    startLecture: 'Open Lecture Hall',
    lessonSegments: 'Lesson Syllabus & Audio Script',
    interactiveChart: 'Lesson Concept Schematic',
    takeQuiz: 'Comprehension Quiz',
    markCompleted: 'Mark Lecture Completed',
    completedBadge: 'Completed',
    overallProgress: 'Overall Academy Progress',

    accountTitle: 'Account Details & Preferences',
    userProfile: 'Trader Identity',
    traderTier: 'Tier: MATRIX Professional Member',
    language: 'Interface Language',
    terminalPreferences: 'Terminal & Charting Options',
    defaultSymbol: 'Default Instrument',
    defaultTimeframe: 'Default Timeframe',
    soundEffects: 'Sound Effects (Ticks & Alerts)',
    chartGrid: 'Show Chart Background Grid',
    disclaimerTitle: 'Regulatory Risk Disclaimer',
    disclaimerText: 'MATRIX is strictly a technical analysis, educational, and market simulation terminal. It does not provide individualized financial or investment advice, nor does it execute financial transactions or hold client funds. Trading foreign exchange and leveraged contracts involves substantial risk.',
    onboardingReplay: 'Replay Welcome Tour',
  },
  ku: {
    appName: 'MATRIX',
    tabHome: 'سەرەکی (چارت)',
    tabTools: 'ئامرازە تەکنیکییەکان',
    tabAcademy: 'ئەکادیمیا',
    tabAccount: 'هەژمار و ڕێکخستن',

    timeframes: 'کاتی چارت',
    indicators: 'ئیندیکەیتەرەکان',
    drawings: 'ئامرازەکانی وێنەکێشان',
    layout: 'ڕێکخستنی شاشەکان',
    chartType: 'جۆری چارت',
    candles: 'مۆمی یابانی',
    line: 'هێڵ',
    area: 'ڕووبەر',
    openPrice: 'کردنەوە',
    highPrice: 'بەرزترین',
    lowPrice: 'نزمترین',
    closePrice: 'داخستن',
    volume: 'قەبارە',
    change: 'گۆڕانکاری',
    spread: 'جیاوازی سپڕێد',
    pips: 'پیپ',
    bid: 'کڕین (Bid)',
    ask: 'فرۆشتن (Ask)',

    watchlist: 'لیستی چاودێری بازاڕ',
    searchSymbol: 'گەڕان بەدوای جووتە دراو...',
    allSymbols: 'هەموو',
    forex: 'فۆرێکس',
    metals: 'کانزاکان',
    indices: 'پێوەرەکان',

    toolsTitle: 'کۆمەڵەی ئامرازەکانی بازرگان',
    toolPositionCalc: 'حیسابکەری لۆت و مەترسی',
    toolTradeJournal: 'دەفتەری مامەڵەکان',
    toolCalendar: 'ڕۆژژمێری ئابووری ڕاستەوخۆ',
    toolScreener: 'پشکنەری تەکنیکی گشتی',
    toolAlerts: 'ئاگادارکردنەوەی نرخ',
    toolBacktest: 'تاقیکردنەوەی ستراتیژی (Backtest)',

    accountBalance: 'سەرمایەی هەژمار ($)',
    riskPercent: 'ڕێژەی مەترسی هەر مامەڵەیەک (%)',
    stopLossPips: 'وەستانی زیان بە پیپ (Pips)',
    calculatedLots: 'قەبارەی لۆتی پێشنیارکراو',
    cashAtRisk: 'بڕی مەترسی بە دۆلار',
    pipValue: 'نرخی خەمڵێنراوی پیپ',
    calculate: 'قەبارەی پارێزراو بژمێرە',

    newTrade: 'تۆمارکردنی مامەڵەی نوێ',
    totalTrades: 'کۆی مامەڵەکان',
    winRate: 'ڕێژەی بردنەوە',
    netProfit: 'قازانج / زیانی گشتی',
    profitFactor: 'فاکتەری قازانج',
    symbol: 'جووت',
    type: 'جۆر',
    buy: 'کڕین (BUY)',
    sell: 'فرۆشتن (SELL)',
    entry: 'نرخی چوونەژوورەوە',
    exit: 'نرخی دەرچوون',
    pnl: 'قازانج/زیان ($)',
    date: 'بەروار',
    status: 'دۆخ',
    notes: 'تێبینی و ستراتیژ',
    addTrade: 'پاشەکەوتکردن لە دەفتەر',
    noTrades: 'تا ئێستا هیچ مامەڵەیەک تۆمار نەکراوە',

    calendarTitle: 'ڕۆژژمێری ئابووری جیهانی',
    impactHigh: 'کاریگەری بەهێز',
    impactMedium: 'کاریگەری مامناوەند',
    impactLow: 'کاریگەری کەم',
    event: 'ڕووداوی ئابووری',
    time: 'کات',
    actual: 'ڕاستەقینە',
    forecast: 'پێشبینیکراو',
    previous: 'پێشوو',

    screenerTitle: 'پشکنینی تەکنیکی هاوکاتی بازاڕەکان',
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
  }
};
