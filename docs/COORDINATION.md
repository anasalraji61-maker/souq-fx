# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 13، بعد 447ab3e) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور (تشغيل n للطالب). ★ = عالق (≥3 دورات للمنفّذ). «الخادم» = `backend/` بلا وكيل مالك ⇒ قرار أنس.
`TerminalScreen.tsx` صار للأدوات (LOG-TOOLS run 38). «بلا مالك» = ملفات لم يلمسها أي وكيل أو صرّح مالكها المفترض أنها خارج نطاقه (LOG-CHART «خارج نطاق ملفاتي»، LOG-TOOLS «إن أُسندا لي») ⇒ أنس يحدّد المالك.

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
| QA | الخادم/أنس | **(e) محلّلون بأسماء بنوك حقيقية** `signal_hub.py:35-42` + اتجاه/هدف = SHA-256 :191. الواجهة صارت تقول «محاكاة للعرض» (376434d `analystsSubSuffix`) — **الأسماء باقية بالخادم**: حذف أم استبدال بأسماء عامة؟ | QA5 ★ |
| QA | الخادم/أنس | **(e)** `SOCIAL_CATALOG` :29 `"TradingCentral-like"` — اسم منافس بنص معروض (ip-legal-caution)؛ ميل ثابت :60-69؛ «ثقة» ≥35% :79-82. الواجهة موسومة (`socialPickHint`) | QA5 ★ |
| QA | الخادم | **(e)** وقف الإشارة 0.18% ثابت لكل فريم (`_trade_levels` :91)؛ نصوص عربية فقط تصل الواجهة الإنجليزية؛ `/api/signals/*` بلا `data_kind` | QA5 ★ |
| QA | بلا مالك | **(e)** `AnalystsPanel.tsx:118` دخول=وقف=هدف حين محايد؛ `VotePanel.tsx:422-430` `{v.entry}` خام لا `formatPrice` — tools: «خارج نطاقي» | QA5 ★ |
| QA | chart | **جهاز**: سحب جسم الرسم المحدَّد — RELEASE §5 بند 128 | QA1 |
| QA+launch | بلا مالك | **`TimeframeBar.tsx`** (يُستعمل بـ6 شاشات): الكردي يرى أطراً عربية (:15 `arabic` ← `t.tfLabels`/`tfLabelsA11y` جاهزة)؛ **جديد (c)**: الشريحة :28 بلا `accessibilityState={{ selected: active }}` ⇒ قارئ الشاشة لا يعرف الفريم الحالي | QA2 ★ |
| QA | بلا مالك | `CommissionPlanPanel`/`NetworkTreePanel`/`TreeDiagramSketch` صفر `useI18n` (مفاتيح `cpp*`/`ntp*`/`tds*` جاهزة)؛ `SubscriptionPlansPanel.tsx:34-100` `COPY` داخلي؛ `AccountScreen.tsx:248` | QA2 ★ |
| launch | بلا مالك | `a11yBusy`: `AlertsPanel:983 :1061` (tools: خارج نطاقه)، `AccountScreen:279 :316 :429`، `NetworkTreePanel:168` | launch52 ★ |
| QA | بلا مالك | `DRAW_MARK` (`MatrixEdgeRails.tsx:28-40`) بلا `hray`/`channel`/`long`/`short` ⇒ «·» — chart: خارج نطاقه | chart20 ★ |
| launch | بلا مالك | «₴» للدفتر: `MatrixEdgeRails.tsx:142`، `MatrixBottomDock.tsx:85` ← «▤» كما `ToolsScreen:85` | launch4 ★ |
| QA | بلا مالك | **a11y**: `MatrixEdgeRails`/`MatrixBottomDock`/`MatrixSidePanel` صفر `accessibilityState` (يمنع «Differentiate Without Color»)؛ خلفية `MatrixSidePanel.tsx:83` بلا اسم ولا `accessible={false}` | QA3 ★ |
| QA | بلا مالك | **a11y (تصحيح QA13)**: `AccountScreen` :195 :324 :338 :439 :477 :493 لها نصّ ابن (الاسم مقروء) لكنها شرائح اختيار بلا `accessibilityState` (اللغة المختارة إلخ)؛ `MessagesScreen` :93 :144 :179 (ميّتة — ⛔ أنس 10) | QA3 ★ |
| QA | chart + بلا مالك | **(c) جديد QA13**: 32 زرّاً تتلوّن حين تُختار بلا `accessibilityState={{ selected }}` ⇒ قارئ الشاشة لا يعرف المختار. لـchart: `IndicatorForecastPanel.tsx:204`. بلا مالك: `AlertsPanel` :932 :950، `BacktestPanel` :175، `FocusChartModal` :322 :362، `FrameSizedGrid` :400 :414، `SocialConsensusPanel` :189، `VotePanel` :250 :265، `SymbolPairMenu` :49 :82 (`expanded`)، `PanSpeedSlider` :137 (+ Rails/Dock/SidePanel/TimeframeBar/Account أعلاه) | QA13 |
| chart+QA | بلا مالك | **`useMultiLiveTicks.ts` بلا حدّ تقادم ولا رفض ≤0** (`useLiveTicks` 20ث) ⇒ قائمة المتابعة قد تعرض سعراً متجمّداً. (مرجع التنبيه أُصلح عند المستهلك: `freshTickRefPrice` d68e485) | chart2 ★ |
| chart | بلا مالك | `FocusChartModal`: الرأس يطبع تيك الرمز الجديد فوق شموع القديم؛ «+0.00%» أخضر | chart3 ★ |
| chart | الجميع | 10 `Alert.alert` باقية بـ5 ملفات (Alerts ×4، IndicatorAlerts ×2، Watchlist ×2، FocusChart ×1، Account ×1) ← `confirmDestructive`/`notify` — دالّة فارغة على الويب. **أخطرها** `AccountScreen.tsx:162` تأكيد «حذف الحساب» ⇒ الحذف لا يعمل على الويب (launch61) | chart29 ★ |
| QA+tools | بلا مالك | **(a)** `dirColor`/`dirLabel` ×3 (Analysts/IndicatorForecast/SocialConsensus)؛ `VotePanel.tsx:82` نسخة `planSummaryText` | QA1 ★ |
| QA+tools | بلا مالك | **(a)** `QUICK_SYMBOLS` ما زال منسوخاً في `BacktestPanel.tsx:54` و`IndicatorAlertsPanel.tsx:61` ← `import { QUICK_SYMBOLS } from '../tradePlan'` (الثابت جاهز db44382) | QA6 ★ |
| QA | بلا مالك | **(a)** `RECONNECT_BASE_MS`/`MAX_MS` ×2 (`useLiveTicks.ts:7` و`useMultiLiveTicks.ts:6`) — chart: التوحيد لمالك `useMultiLiveTicks` | QA6 ★ |
| tools | أنس | تغيّر اليوم بقائمة المتابعة يتدحرج 00:00 UTC، وPDH/PDL بالشارت 17:00 نيويورك ⇒ «أمس» مختلف بين الشاشتين 21:00–24:00 UTC — توحيد؟ | tools38 |
| QA | الجميع | **(a)** تصديرات بلا مستخدم خارج ملفها: `deleteTemplate`، `subscribeTemplatesSaveError`، `getDrawingsSaveError`، `getLayoutsSaveError`، `ensureSeriesProvenance`، `computeDomLite`، `PINE_PRESETS`، `getToolPanel`، `__setWatchlistStorageForTests`/`__reset…` (ولا اختبار)، `motion`، `FRAME_SYMBOLS`، mock.ts ×3 | QA1 ★ |
| launch | chart | DeMarker 0..100 والمنصات 0..1 (قرار ⇒ أنس) | launch48 |
| tools+launch+QA | الخادم | **spread مُختلَق** = السعر × 0.00008 (`twelve_data.py:316`) موسوم `provider`، يناقض `backtest.py:26-37`؛ يُزيح أسعار الدفتر (`tradePlan.ts:669 :741`) | tools13 ★ |
| tools | الخادم | الحجم يُخزَّن 1 حين لا يُرسل (`backend/db.py:1704`) | 09-22 ★ |
| tools | الخادم | كاش 30–60ث لـ`/api/market/quote` | 09-23 ★ |
| launch | الخادم/أنس | `openrouter_ai.py:71` «أنت خبير تداول» ويعطي دخول/وقف/هدف | launch9 ★ |
| launch | أنس | `MessagesScreen` غير مستوردة (وحدها تستعمل `mockPeers`) — تُحذف أم تُربط؟ | launch52 |
| QA | الخادم | **(d)** `main.py:1774` يقرّب الوقف/الهدف لخانتين إن السعر ≥50 ⇒ USDJPY/DXY تفقد خانة | QA4 ★ |
| QA | الخادم | **(d) الدفتر يقصّ بصمت عند 200 صفقة**: `db.py:1681` `LIMIT 200` (مفتوحة+مغلقة) و`trade_stats` :1836 يحسب منها ⇒ بعد 200 صفقة «الصفقات المغلقة: n»/نسبة الفوز/صافي الـpip تُحسب على الأحدث فقط وتختفي القديمة من القائمة بلا إشارة. والمعامل `days=30` :1673 لا يُستعمل (ميّت). نصّ «آخر 200» صار ظاهراً (0c34e61)؛ الباقي: إحصاء بـSQL على الكل + ترقيم | QA9 |
| QA | الخادم | **(e)** تقويم العيّنة `econ_calendar.py:39-47` أوقات خاطئة و«5.25%» قديم؛ `_impact` :77. الواجهة تقول الآن «عيّنة لا تتداول عليها» (63c2ef6) | QA5 ★ |
| QA | بلا مالك | **(a) جديد**: `DomLitePanel.tsx:67-73` يحسب السبريد بالـpip محلياً — نسخة `quoteSpreadPips` (`positionSize.ts:360`) الجديدة (tools: «ليس بنطاقي»)؛ والخاصية `last` ميتة (`void last` :75) والمستدعون ما زالوا يمرّرونها | QA11 |
| chart→launch→chart | chart | **اربط `mcWeekdays`**: المفتاح صار بـ`locales.ts` ×ar/en/ku (`348efee`، تحقّقتُ) — لا مستعمل له خارج القاموس بعد (0) | chart 09-25 (6) |
| launch | tools | اربط `journalSizeDottedFix` (`1f8c7d8`) بفرع `sizeDotted` في `sizeUnitsText` (`TradeJournalPanel.tsx` ~:360) — تحقّقتُ: 0 استعمال بـ`.tsx` | launch62 |
| tools | chart (+مالك قائمة المتابعة) | `dailyChange.ts:32` `sessionOf` يقلب الجلسة عند افتتاح الفوركس (`forexSundayOpenSec`) بلا رمز ⇒ الذهب/المؤشرات/النفط (CME 18:00) تعرض «0.00%» ساعةً مساء الأحد 17:00–18:00 NY. يحتاج تمرير الرمز من المستدعين (`WatchlistPanel`، `ChartFrame`، `QuadChartModal`، `ScreenerMini`) | tools42 |

**أُسقط هذه الدورة (بالكود):** QA11 — شغّلتُ `projectBarTimeSec`: US30/NAS100/WTI الجمعة 20:00Z +H1 ⇒ الأحد 22:00Z (شتاءً 23:00Z)، الذهب الثلاثاء 20:00Z +H1 ⇒ 22:00Z (يتخطّى الكسر)؛ `isForexMarketOpen` US30 الأحد 21:30Z مغلق، 22:30Z مفتوح (`b32c26b`). `PANE_PAD`/`clamp`/`finite` مستوردة من `centeredPane.ts` (`5a20d8b`). طلب `mcWeekdays` لـlaunch منجز ⇒ صار «chart: اربط».
**تحقّق بلا تغيير (بالكود):** `Alert.alert` 10 خارج `confirmDestructive`؛ «₴» ×2 (الثالث تعليق)؛ `TimeframeBar` صفر `accessibilityState`؛ `QUICK_SYMBOLS` ×3؛ `DomLitePanel` `void last`؛ `LIMIT 200`؛ `TradingCentral-like`.
**(c) هذه الدورة:** كل `Pressable`/`Touchable*`/`TextInput`/`Switch` له اسم (وصف أو نصّ ابن) عدا خلفية `MatrixSidePanel.tsx:83` (مسجّلة)؛ 0 زرّ برمز وحده بلا وصف. الفجوة الحقيقية: حالة الاختيار (صفّ QA13).
