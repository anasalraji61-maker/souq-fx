# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-24 (دورة QA 4، بعد 7c16343) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور (تشغيل n للطالب). ★ = عالق (≥3 دورات للمنفّذ). «الخادم» = `backend/` بلا وكيل مالك ⇒ قرار أنس.
«بلا مالك» = ملفات مكوّنات لم يلمسها أي وكيل (تاريخ git: أنس وحده) — المفاتيح جاهزة ولا أحد مخوَّل بالربط ⇒ أنس يحدّد المالك.

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
| QA | chart | **جهاز**: سحب جسم الرسم المحدَّد (ميت حتى 4315956) — RELEASE §5 بند 128 | QA1 |
| QA+launch | بلا مالك | **كردي يرى أطراً عربية**: `TimeframeBar.tsx:26` `arabic ? TIMEFRAME_LABELS` و`TerminalScreen.tsx:988` `arabic={rtl}` ← `t.tfLabels`/`tfLabelsA11y` (جاهزة) | QA2 |
| QA | بلا مالك | `CommissionPlanPanel`/`NetworkTreePanel`/`TreeDiagramSketch` بلا `useI18n` (مفاتيح `cpp*`/`ntp*`/`tds*` جاهزة)؛ `SubscriptionPlansPanel.tsx:34-100` يقرأ `COPY` الداخلي لا `t.subPlans`؛ `AccountScreen.tsx:248` ثابت | QA2 |
| tools | launch | مفتاحا `planNoteCommission`/`planNoteNetRR` (غير موجودين) لإكمال ملاحظة الدفتر بلغة الواجهة (d0da6fc أنجز الباقي) | tools34 |
| tools | launch | `journalCentNoMoney`/`journalMicroNoMoney` بلا قارئ (تعليقات فقط) ⇒ احذفهما؛ `journalMicroMoneyNote` يقول «بعملة حسابك» والدفتر يعرض عملة التسعير ⇒ أعد صياغته أو احذفه | launch50 |
| launch | tools | `a11yBusy`: موصول بـ`PositionSizePanel`/`TradeJournalPanel`/`ToolsScreen` (72cf43e)؛ **بقي** `AlertsPanel:980 :1047` (حالة busy بلا الوسم) | launch52 |
| launch | بلا مالك | `a11yBusy` لـ`AccountScreen:279 :316 :429`، `NetworkTreePanel:168`؛ رقائق اللغة/الدور/الجهة بوسوم مركّبة + `selected` | launch52 |
| QA | chart | `DRAW_MARK` (`MatrixEdgeRails.tsx:28-40`) بلا `hray`/`channel`/`long`/`short` ⇒ «·» | chart20 ★ |
| launch | chart | «₴» للدفتر: `MatrixEdgeRails.tsx:142`، `MatrixBottomDock.tsx:85` ← «▤» كما بـ`ToolsScreen` | launch4 ★ |
| launch | chart | حذف `dxyPrice` الميت (`TerminalScreen.tsx:868`) | QA1 ★ |
| QA+tools | بلا مالك | `dirColor` ×3 (Analysts/IndicatorForecast/SocialConsensus)؛ `VotePanel.tsx:82` نسخته من `planSummaryText` (tradePlan) | QA1 ★ |
| QA | الجميع | 17 تصديراً بلا مستخدم (mock.ts ×3، `computeDomLite`، `PINE_PRESETS`، `deleteTemplate`، `motion`، `FRAME_SYMBOLS`…) | QA1 ★ |
| launch | chart | DeMarker 0..100 والمنصات 0..1 (قرار ⇒ أنس) | launch48 |
| tools+launch+QA | الخادم | **spread مُختلَق** = السعر × 0.00008 (`twelve_data.py:314-318`) يُرسَل `data_kind:"provider"`، ويناقض `backtest.py:26-37` (1.0/3.0 pip) وتعليق `main.py:1352`؛ يظهر بـ`DomLitePanel:64` و`FocusChartModal:185` ويُزيح أسعار دخول/خروج الدفتر (`tradePlan.ts:669 :741`) | tools13 ★ |
| tools | الخادم | الحجم يُخزَّن 1 حين لا يُرسل (`backend/db.py:1704`) | 09-22 ★ |
| tools | الخادم | كاش 30–60ث لـ`/api/market/quote` | 09-23 ★ |
| launch | الخادم/أنس | `openrouter_ai.py:71` «أنت خبير تداول» ويعطي دخول/وقف/هدف | launch9 ★ |
| tools | chart | إيقاف سوكت التيكات حين TerminalScreen غير مركّزة (`useMultiLiveTicks(watchSymbols, true)` :211) | 09-23 ★ |
| chart+QA | chart | **useMultiLiveTicks بلا حدّ تقادم ولا رفض ≤0** (`:50` يقبل أي number) بينما `useLiveTicks.ts:18,26` يُسقط بعد 20ث ويرفض ≤0؛ `TerminalScreen:833 :855` يبني مرجع تنبيه الشارت (فوق/تحت) على تيك متجمّد | chart2 ★ |
| chart | FocusChartModal | الرأس يطبع تيك الرمز الجديد فوق شموع القديم؛ «+0.00%» أخضر | chart3 ★ |
| tools | بلا مالك | `AccountScreen.tsx:111` `.then` بلا `catch` حول `getNotificationPermissionState` — الزر قد يعلق على «…» | tools≈14:00 |
| chart | TerminalScreen | عرض الشموع المخزّنة فوراً عند تبديل الفريم (`seriesCache` في QuadChartModal فقط) | chart17 |
| chart | الجميع | `confirmDestructive` صار موجوداً (`chart/confirmDestructive.ts`) — بقي 21 `Alert.alert` بـ7 ملفات (Watchlist/Alerts/IndicatorAlerts/TradeJournal/FocusChart/Terminal/Account) | chart29 |
| QA | chart | **a11y**: بقيت خلفية `MatrixSidePanel.tsx:83` بلا اسم ولا دور (أزرار الرسم/Clear/ضغط الشارت/ChartFrame أُصلحت 6d50f09) | QA3 |
| QA | chart | **a11y**: حالة لونية فقط باقية في `MatrixEdgeRails` ×6، `MatrixBottomDock` ×3 (0 `accessibilityState`)؛ `TimeframeBar:28` بلا مالك (MatrixChart/TerminalScreen أُصلحا 6d50f09/f66ce07) | QA3 |
| QA | بلا مالك | **a11y**: `AccountScreen` :195 :324 :338 :439 :477 :493 بلا وصف ولا حالة؛ `NetworkTreePanel:136/:152` | QA3 |
| launch | أنس | `MessagesScreen` غير مستوردة بأي ملف، نصوصها عربية ثابتة — تُحذف أم تُربط؟ | launch52 |
| QA | launch+tools | **(d) المخاطرة**: النصائح «≤1%» (`locales.ts:1463 :1465 :2228`، `main.py:1824`) والأكاديمية «1-2%» (`academy_data.py:94`)، والحاسبة تحذّر فقط فوق 2% (`PositionSizePanel.tsx:955`) — وحّدوا الحدّ المعلَن | QA4 |
| QA | launch+tools | **(d)** `riskCalcOverOrderMax` يقول «50–100 lot» (`locales.ts:1416` ×3 لغات) والكود يحذّر فوق 100 فقط (`positionSize.ts:1084`) ⇒ 75 lot بلا تحذير | QA4 |
| QA | launch | **(d)** `STORE-LISTING.md:116` عدسة Liquidity = volume+Bollinger، والكود يضيف CVD (`MatrixChart.tsx:420`) | QA4 |
| QA | الخادم | **(d)** `main.py:1774` يقرّب الوقف/الهدف لخانتين إن السعر ≥50 وإلا 5 ⇒ USDJPY/DXY تفقد خانة، XAGUSD 5 (التطبيق: `indicators/utils.ts:6-18`)؛ لا شاشة تعرضه اليوم | QA4 |

**أُسقط — مُتحقَّق منه بالكود هذه الدورة:** saveError ×4 ⇒ `createSaveErrorSignal` واحد بالمتاجر الأربعة (cdaceca)؛ التغيّر اليومي يتجدّد ≤1د بعد تدوير الجلسة (`sessionKeyAt`، 3665071)؛ **a11y QA3 أدوات** — تبويبات ToolsScreen/شراء-بيع/SL-TP بحالة ووصف (72cf43e)؛ chart41 — `chartLocalLabels` محذوفة، `MatrixChart.tsx:3472/:5164` تقرأ `tr.mcShareDialogTitle`/`tr.mcLogScaleA11y` (dcb738e)؛
`newsUnavailable` و`riskCalcStopInsideSpread` موجودان وموصولان؛ `planJournalNote` صار بلغة الواجهة (d0da6fc، الباقي صفّ tools34).
**(d) متّسق:** pip/عقد/لوت (مصدر واحد `chartPipSpec`)، سنت/مايكرو ÷100، الرافعة 3000، أسعار الباقات $10/15/20، العمولات 10%/5%، الأطر، الجلسات وDST، فترات المؤشرات.
