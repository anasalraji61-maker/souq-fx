# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 6، بعد 478b0a6) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور (تشغيل n للطالب). ★ = عالق (≥3 دورات للمنفّذ). «الخادم» = `backend/` بلا وكيل مالك ⇒ قرار أنس.
«بلا مالك» = ملفات لم يلمسها أي وكيل أو صرّح مالكها المفترض أنها خارج نطاقه (LOG-CHART «خارج نطاق ملفاتي»، LOG-TOOLS «إن أُسندا لي») ⇒ أنس يحدّد المالك.

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
| QA | الخادم/أنس | **(e) محلّلون بأسماء بنوك حقيقية** `signal_hub.py:35-42` + اتجاه/هدف = SHA-256 :191. الواجهة صارت تقول «محاكاة للعرض» (376434d `analystsSubSuffix`) — **الأسماء باقية بالخادم**: حذف أم استبدال بأسماء عامة؟ | QA5 |
| QA | الخادم/أنس | **(e)** `SOCIAL_CATALOG` :29 `"TradingCentral-like"` — اسم منافس بنص معروض (ip-legal-caution)؛ ميل ثابت :60-69؛ «ثقة» ≥35% :79-82. الواجهة موسومة (`socialPickHint`) | QA5 |
| QA | الخادم | **(e)** وقف الإشارة 0.18% ثابت لكل فريم (`_trade_levels` :91)؛ نصوص عربية فقط تصل الواجهة الإنجليزية؛ `/api/signals/*` بلا `data_kind` | QA5 |
| QA | بلا مالك | **(e)** `AnalystsPanel.tsx:118` دخول=وقف=هدف حين محايد؛ `VotePanel.tsx:422-430` `{v.entry}` خام لا `formatPrice` — tools: «خارج نطاقي» | QA5 |
| launch | chart | `mcEstimatedTag` جاهز (8428787) ⇒ `MatrixChart.tsx:7754` ← `tr.mcEstimatedTag`، واحذف `estimatedTag` (`typeLabels.ts:111`) | launch55 |
| QA | chart | **جهاز**: سحب جسم الرسم المحدَّد — RELEASE §5 بند 128 | QA1 |
| QA+launch | بلا مالك | **كردي يرى أطراً عربية**: `TimeframeBar.tsx:15` `arabic` ← `t.tfLabels`/`tfLabelsA11y` (جاهزة) | QA2 ★ |
| QA | بلا مالك | `CommissionPlanPanel`/`NetworkTreePanel`/`TreeDiagramSketch` صفر `useI18n` (مفاتيح `cpp*`/`ntp*`/`tds*` جاهزة)؛ `SubscriptionPlansPanel.tsx:34-100` `COPY` داخلي؛ `AccountScreen.tsx:248` | QA2 ★ |
| launch | بلا مالك | `a11yBusy`: `AlertsPanel:983 :1061` (tools: خارج نطاقه)، `AccountScreen:279 :316 :429`، `NetworkTreePanel:168` | launch52 ★ |
| QA | بلا مالك | `DRAW_MARK` (`MatrixEdgeRails.tsx:28-40`) بلا `hray`/`channel`/`long`/`short` ⇒ «·» — chart: خارج نطاقه | chart20 ★ |
| launch | بلا مالك | «₴» للدفتر: `MatrixEdgeRails.tsx:142`، `MatrixBottomDock.tsx:85` ← «▤» كما `ToolsScreen:85` | launch4 ★ |
| QA | بلا مالك | **a11y**: `MatrixEdgeRails`/`MatrixBottomDock` صفر `accessibilityState` (يمنع «Differentiate Without Color»)؛ خلفية `MatrixSidePanel.tsx:83` بلا اسم | QA3 ★ |
| QA | بلا مالك | **a11y**: `AccountScreen` :195 :324 :338 :439 :477 :493؛ `NetworkTreePanel:136/:152` | QA3 ★ |
| chart+QA | بلا مالك | **`useMultiLiveTicks.ts:49-51` بلا حدّ تقادم ولا رفض ≤0** (`useLiveTicks` 20ث)؛ `TerminalScreen:833 :855` مرجع تنبيه الشارت على تيك متجمّد | chart2 ★ |
| chart | بلا مالك | `FocusChartModal`: الرأس يطبع تيك الرمز الجديد فوق شموع القديم؛ «+0.00%» أخضر | chart3 ★ |
| launch | بلا مالك | حذف `dxyPrice` الميت (`TerminalScreen.tsx:867`) | QA1 ★ |
| chart | بلا مالك | `seriesCache` لـTerminalScreen عند تبديل الفريم (موجود بـQuadChartModal فقط) | chart17 |
| chart | الجميع | 17 `Alert.alert` بـ7 ملفات (TradeJournal ×6، Alerts ×4، Watchlist/IndicatorAlerts ×2، FocusChart/Terminal/Account ×1) ← `confirmDestructive` | chart29 |
| QA+tools | بلا مالك | **(a)** `dirColor`/`dirLabel` ×3 (Analysts/IndicatorForecast/SocialConsensus)؛ `VotePanel.tsx:82` نسخة `planSummaryText` | QA1 ★ |
| QA | tools | **(a)** `QUICK_SYMBOLS` ×4 حرفياً (Backtest:54، IndicatorAlerts:61، PositionSize:84، TradeJournal:70) ⇒ ثابت واحد | QA6 |
| QA | chart | **(a)** `pineLite.ts:3-35` نسخة خاصة من `sma`/`ema` (مطابقة لـ`indicators/moving-averages.ts` على بيانات بلا فراغات)؛ `DAY_SEC` ×3؛ `RECONNECT_*` ×2 | QA6 |
| QA | الجميع | **(a)** تصديرات بلا مستخدم خارج ملفها: `deleteTemplate`، `subscribeTemplatesSaveError`، `getDrawingsSaveError`، `getLayoutsSaveError`، `ensureSeriesProvenance`، `computeDomLite`، `PINE_PRESETS`، `getToolPanel`، `__setWatchlistStorageForTests`/`__reset…` (ولا اختبار)، `motion`، `FRAME_SYMBOLS`، mock.ts ×3 | QA1 ★ |
| launch | chart | DeMarker 0..100 والمنصات 0..1 (قرار ⇒ أنس) | launch48 |
| tools+launch+QA | الخادم | **spread مُختلَق** = السعر × 0.00008 (`twelve_data.py:316`) موسوم `provider`، يناقض `backtest.py:26-37`؛ يُزيح أسعار الدفتر (`tradePlan.ts:669 :741`) | tools13 ★ |
| tools | الخادم | الحجم يُخزَّن 1 حين لا يُرسل (`backend/db.py:1704`) | 09-22 ★ |
| tools | الخادم | كاش 30–60ث لـ`/api/market/quote` | 09-23 ★ |
| launch | الخادم/أنس | `openrouter_ai.py:71` «أنت خبير تداول» ويعطي دخول/وقف/هدف | launch9 ★ |
| launch | أنس | `MessagesScreen` غير مستوردة (وحدها تستعمل `mockPeers`) — تُحذف أم تُربط؟ | launch52 |
| QA | الخادم | **(d)** `main.py:1774` يقرّب الوقف/الهدف لخانتين إن السعر ≥50 ⇒ USDJPY/DXY تفقد خانة | QA4 |
| QA | الخادم | **(e)** تقويم العيّنة `econ_calendar.py:39-47` أوقات خاطئة و«5.25%» قديم؛ `_impact` :77. الواجهة تقول الآن «عيّنة لا تتداول عليها» (63c2ef6) | QA5 |

**أُسقط هذه الدورة — مُتحقَّق منه بالكود:** chart43 (`tr.mcColorNames`/`mcDrawColorWord`/`mcDrawColorA11y` موصولة :1999-2029، `drawColorLabels` محذوفة)؛
launch53 (`MatrixChart.tsx:7678`)؛ عطل 25 ديسمبر/1 يناير (bd99eca + selftest)؛ PDH/PDL بيوم 17:00 NY أوّلاً (`MatrixChart.tsx:1641-1646`، D1 احتياط)؛
Footprint «≈» وCVD «تقديري» (9d937e5)؛ مقبس التيكات يُغلق خارج التركيز (`TerminalScreen:236` `screenFocused`)؛ زرّ الإشعارات العالق
(`notifications.ts:108-115` لا ترمي). **(e) سليم:** الجلسات/DST، الأحد/الجمعة، pip الين، Bid للإغلاق، وسم بيانات العرض.
