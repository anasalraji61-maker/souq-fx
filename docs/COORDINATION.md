# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 5، بعد ba9f33b) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور (تشغيل n للطالب). ★ = عالق (≥3 دورات للمنفّذ). «الخادم» = `backend/` بلا وكيل مالك ⇒ قرار أنس.
«بلا مالك» = ملفات مكوّنات لم يلمسها أي وكيل (تاريخ git: أنس وحده) — المفاتيح جاهزة ولا أحد مخوَّل بالربط ⇒ أنس يحدّد المالك.

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
| QA | الخادم/أنس | **(e) محلّلون مختلَقون بأسماء بنوك حقيقية**: `signal_hub.py:35-42` «HSBC FX Desk/Citi Research/UBS Macro/Nomura FX/Commerzbank/ING Markets» + اتجاه وهدف = SHA-256 لـ(id\|رمز\|خانة 6س) :191؛ تُعرض بـ`AnalystsPanel` (ToolsScreen/BottomDock) تحت «إجماع بيوت الأبحاث» بلا وسم «محاكاة» | QA5 |
| QA | الخادم/أنس | **(e) قنوات مختلَقة**: `SOCIAL_CATALOG` :17-32 (منها `"TradingCentral-like"` :29 — اسم منافس بنص معروض، ip-legal-caution) أصواتها hash :140، وتنبيه :177 يقول «من مصادر اخترتها»؛ ميل ثابت :60-69 (ذهب/يورو هابط، DXY صاعد)؛ «ثقة» ≥35% حتى المحايد :79-82 | QA5 |
| QA | الخادم | **(e)** مستويات الإشارة نسبة ثابتة 0.18% (`_trade_levels` :91 اسمه atr بلا ATR) ⇒ وقف ~29 pip لليورو على 1m وD1؛ نصوص عربية فقط (`house`/horizon/summary/disclaimer) تصل الواجهة الإنجليزية؛ `/api/signals/analysts` و`/social/consensus` بلا `data_kind` | QA5 |
| QA | tools | **(e)** `AnalystsPanel.tsx:118` يعرض «دخول X · وقف X · هدف X» متساوية حين محايد (الخادم :105) — Social/IndicatorForecast تُخفيها | QA5 |
| QA | tools | **(e)** `VotePanel.tsx:422-430` يطبع `{v.entry}/{v.sl}/{v.tp}` خاماً («1.1»، «157.4») لا `formatPrice` | QA5 |
| QA | chart | **(e)** Footprint/CVD مختلَقان من لون الشمعة (`orderflow.ts:17-22`؛ لا شريط مركزي بالفوركس) ويُعرضان كمؤشرين عاديين، وCVD بعدسة Liquidity (`MatrixChart.tsx:421`) — وسم «تقديري» أو إخفاء للفوركس | QA5 |
| QA | chart | **(e)** PDH/PDL/Pivot: المصدر D1 بيوم UTC (`twelve_data.py:196`) والاحتياطي `prevDayFromIntraday` بيوم 17:00 NY (`MatrixChart.tsx:1639-1646`) ⇒ مستويات تختلف بنجاح الجلب، ولا تطابق MT4/MT5 | QA5 |
| chart+launch | chart | مفاتيح `mcDrawColorWord`/`mcDrawColorA11y`/`mcColorNames` جاهزة (df3bc33) ⇒ اربطها واحذف `drawColorLabels` (`chart/typeLabels.ts:110`) | chart43 |
| launch | chart | `mcAutoManualA11y` جاهز غير موصول: `MatrixChart.tsx` AUTO ← `priceManual ? tr.mcAutoManualA11y : tr.mcAutoA11y` | launch53 |
| QA | chart | **جهاز**: سحب جسم الرسم المحدَّد (ميت حتى 4315956) — RELEASE §5 بند 128 | QA1 |
| QA+launch | بلا مالك | **كردي يرى أطراً عربية**: `TimeframeBar.tsx:15` `arabic` و`TerminalScreen` `arabic={rtl}` ← `t.tfLabels`/`tfLabelsA11y` (جاهزة) | QA2 ★ |
| QA | بلا مالك | `CommissionPlanPanel`/`NetworkTreePanel`/`TreeDiagramSketch` بلا `useI18n` (مفاتيح `cpp*`/`ntp*`/`tds*` جاهزة)؛ `SubscriptionPlansPanel.tsx:34-100` يقرأ `COPY` الداخلي؛ `AccountScreen.tsx:248` ثابت | QA2 ★ |
| launch | tools | `a11yBusy` باقٍ: `AlertsPanel:983 :1061` (0 استعمال بالملف) | launch52 |
| launch | بلا مالك | `a11yBusy` لـ`AccountScreen:279 :316 :429`، `NetworkTreePanel:168`؛ رقائق اللغة/الدور/الجهة + `selected` | launch52 |
| QA | chart | `DRAW_MARK` (`components/MatrixEdgeRails.tsx:28-40`) بلا `hray`/`channel`/`long`/`short` ⇒ «·» | chart20 ★ |
| launch | chart | «₴» للدفتر: `MatrixEdgeRails.tsx:142`، `MatrixBottomDock.tsx:85` ← «▤» كما بـ`ToolsScreen:85` | launch4 ★ |
| launch | chart | حذف `dxyPrice` الميت (`TerminalScreen.tsx:868`) | QA1 ★ |
| QA+tools | بلا مالك | `dirColor` ×3 (Analysts/IndicatorForecast/SocialConsensus)؛ `VotePanel.tsx:82` نسخته من `planSummaryText` | QA1 ★ |
| QA | الجميع | 17 تصديراً بلا مستخدم (mock.ts ×3، `computeDomLite`، `PINE_PRESETS`، `deleteTemplate`، `motion`، `FRAME_SYMBOLS`…) | QA1 ★ |
| launch | chart | DeMarker 0..100 والمنصات 0..1 (قرار ⇒ أنس) | launch48 |
| tools+launch+QA | الخادم | **spread مُختلَق** = السعر × 0.00008 (`twelve_data.py:314-318`) موسوم `data_kind:"provider"`، يناقض `backtest.py:26-37`؛ يظهر بـ`DomLitePanel:64`/`FocusChartModal:185` ويُزيح أسعار الدفتر (`tradePlan.ts:669 :741`) | tools13 ★ |
| tools | الخادم | الحجم يُخزَّن 1 حين لا يُرسل (`backend/db.py:1704`) | 09-22 ★ |
| tools | الخادم | كاش 30–60ث لـ`/api/market/quote` | 09-23 ★ |
| launch | الخادم/أنس | `openrouter_ai.py:71` «أنت خبير تداول» ويعطي دخول/وقف/هدف | launch9 ★ |
| tools | chart | إيقاف سوكت التيكات حين TerminalScreen غير مركّزة (`useMultiLiveTicks(watchSymbols, true)` :211) | 09-23 ★ |
| chart+QA | chart | **useMultiLiveTicks بلا حدّ تقادم ولا رفض ≤0** مقابل `useLiveTicks.ts` 20ث؛ `TerminalScreen:833 :855` يبني مرجع تنبيه الشارت على تيك متجمّد | chart2 ★ |
| chart | FocusChartModal | الرأس يطبع تيك الرمز الجديد فوق شموع القديم؛ «+0.00%» أخضر | chart3 ★ |
| tools | بلا مالك | `AccountScreen.tsx:111` `.then` بلا `catch` حول `getNotificationPermissionState` — الزر قد يعلق على «…» | tools≈14:00 |
| chart | TerminalScreen | عرض الشموع المخزّنة فوراً عند تبديل الفريم (`seriesCache` بـQuadChartModal فقط) | chart17 |
| chart | الجميع | بقي 16 `Alert.alert` بـ7 ملفات (TradeJournal ×6، Alerts ×4، Watchlist/IndicatorAlerts ×2، FocusChart/Terminal/Account ×1) ← `confirmDestructive` | chart29 |
| QA | chart | **a11y**: خلفية `MatrixSidePanel.tsx:83` بلا اسم ولا دور | QA3 ★ |
| QA | chart | **a11y**: `MatrixEdgeRails`/`MatrixBottomDock` صفر `accessibilityState` (حالة لونية فقط) — آخر ما يمنع «Differentiate Without Color» (RELEASE §4)؛ `TimeframeBar:28` بلا مالك | QA3 ★ |
| QA | بلا مالك | **a11y**: `AccountScreen` :195 :324 :338 :439 :477 :493 بلا وصف ولا حالة؛ `NetworkTreePanel:136/:152` | QA3 ★ |
| launch | أنس | `MessagesScreen` غير مستوردة (وحدها تستعمل `mockPeers`)، نصوصها عربية ثابتة — تُحذف أم تُربط؟ | launch52 |
| QA | الخادم | **(d)** `main.py:1774` يقرّب الوقف/الهدف لخانتين إن السعر ≥50 ⇒ USDJPY/DXY تفقد خانة؛ لا شاشة تعرضه اليوم | QA4 |
| QA | الخادم | **(e)** تقويم العيّنة (`econ_calendar.py:39-47`): الفائدة الأمريكية «21:00 UTC» (الصحيح 18:00/19:00)، CPI «15:30 UTC» (الصحيح 12:30/13:30)، «5.25%» قديم؛ `_impact` :77 يجعل عطلة البنوك «low» | QA5 |
| QA | chart | **(e) منخفض**: `marketHours.ts:51-60` بلا عطل (25 ديسمبر/1 يناير «السوق مفتوح») | QA5 |

**أُسقط — مُتحقَّق منه بالكود:** حدّ المخاطرة (3bffef5: `RISK_HIGH_PCT=2` سقفاً و1% افتراضياً موصى به — يتّسق مع «1–2%» بالأكاديمية)؛ «50–100 lot» (4c1bd75: `ORDER_WARN_LOTS=50`)؛ مفاتيح «تراجع» `mcUndo*` موجودة و`chartExtraLabels` محذوفة؛ `planNoteCommission`/`planNoteNetRR` أُضيفا وحُذفت مفاتيح الدفتر الميتة (c8f93bf — بقيت إشارات بتعليقات `tradePlan.ts:52-173` لـtools)؛ `STORE-LISTING.md:116` يذكر CVD «مقدَّراً من الشموع» (2105e87).
**(e) سليم:** جلسات وDST، افتتاح الأحد 17:00 NY وإغلاق الجمعة، pip الين وخاناته، إغلاق الشراء على Bid، وسم بيانات العرض، `mock.ts` لا يصل الواجهة.
