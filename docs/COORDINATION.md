# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-24 (دورة QA 2، بعد a0197cc) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور (تشغيل n للطالب). ★ = عالق (≥3 دورات للمنفّذ). «الخادم» = `backend/` بلا وكيل مالك ⇒ قرار أنس.

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
| QA | chart | **جهاز**: سحب جسم الرسم المحدَّد (ميت حتى 4315956) — RELEASE §5 بند 128 | QA1 |
| QA | launch | **كردي يرى أطر زمنية بالعربية**: `TimeframeBar arabic={rtl}` (`TerminalScreen.tsx:988`) و`isRtl('ku')`=true ⇒ «دقيقة/ساعة/يومي» من `timeframes.ts:7-14` | QA2 |
| QA | launch | `CommissionPlanPanel`/`NetworkTreePanel`/`TreeDiagramSketch` بلا `useI18n` إطلاقاً (~55 نصاً عربياً فقط)؛ `AccountScreen.tsx:248` نص عربي ثابت | QA2 |
| QA | launch | `SubscriptionPlansPanel.tsx:32-100` قاموس ar/en/ku داخلي (~45 نصاً) خارج `locales.ts` | QA2 |
| QA | chart | زر «Log» (`MatrixChart.tsx:5173`) نص ثابت وبلا `accessibilityLabel`؛ `dialogTitle: 'MATRIX Chart'` (:3473)؛ جلسات Tokyo/London/New York (`sessions.ts:24-28`) إنجليزية فقط | QA2 |
| QA | tools | `planJournalNote()` (`positionSize.ts:1138-1150`) يكتب ملاحظة الدفتر إنجليزية دائماً («lot · risk · R:R · spread · commission») | QA2 |
| QA | tools | `instrumentSpec('GOLDm')` = null بالحاسبة، و`chartPipSpec('GOLDm')` = XAUUSD بالشارت — الرمز نفسه يعمل بالشارت ولا يعمل بالحاسبة | QA2 |
| QA | chart | `DRAW_MARK` (`MatrixEdgeRails.tsx:28-40`) بلا `hray`/`channel`/`long`/`short` ⇒ «·» | chart20 ★ |
| launch | chart | `chartExtraLabels` ← `tr.mcHideDrawings/mcShowDrawings`؛ `EXTRA_TOOL_LABELS` ← `t.ctlToolHray/ctlToolChannel` (المفاتيح جاهزة، 0 مستخدم) | launch50 |
| launch | chart | حذف `dxyPrice` الميت (`TerminalScreen.tsx:868`) — عرض DXY ليس مفقوداً (تحقق launch50) | QA1 |
| QA | chart | منطق saveError منسوخ 4 مرات (template/drawing/layout/watchlist Store) | QA1 |
| QA | tools | `dirColor` متطابقة ×3 (Analysts/IndicatorForecast/SocialConsensus)؛ `planSummary` ×2 | QA1 |
| QA | الجميع | 17 تصديراً بلا مستخدم (mock.ts ×3، `computeDomLite`، `PINE_PRESETS`، `deleteTemplate`، `motion`، `FRAME_SYMBOLS`…) | QA1 |
| launch | tools | `journalCentMoneyNote`/`journalMicroMoneyNote`/`journalMoneyUsc` جاهزة (4c8e529) بلا قارئ | tools30 |
| chart | launch | `mcDeleteDrawingTitle/Body` بلا مستخدم — احذفهما | chart39 |
| launch | chart | DeMarker 0..100 والمنصات 0..1 (قرار ⇒ أنس) | launch48 |
| tools+launch | الخادم | spread مُختلَق = السعر × 0.00008 (`backend/twelve_data.py:315-318`) | tools13 ★ |
| tools | الخادم | الحجم يُخزَّن 1 حين لا يُرسل (`backend/db.py:1704`) | 09-22 ★ |
| tools | الخادم | كاش 30–60ث لـ`/api/market/quote` | 09-23 ★ |
| launch | الخادم/أنس | `openrouter_ai.py:71` «أنت خبير تداول» ويعطي دخول/وقف/هدف | launch9 ★ |
| tools | chart | إيقاف سوكت التيكات حين TerminalScreen غير مركّزة (`useMultiLiveTicks(watchSymbols, true)` :211) | 09-23 ★ |
| tools | chart | التغيّر اليومي على إغلاق الجلسة السابقة ≤10د بعد التدوير (`dailyRefStore.ts`) | tools25 |
| tools | AccountScreen | `AccountScreen.tsx:111` `.then` بلا `catch` حول `getNotificationPermissionState` — الزر قد يعلق على «…» | tools≈14:00 |
| chart | TerminalScreen | عرض الشموع المخزّنة فوراً عند تبديل الفريم (`seriesCache` في QuadChartModal فقط) | chart17 |
| chart | useMultiLiveTicks | إسقاط التيك بعد 20ث بلا بثّ + حارس `isFinite && >0` (`useMultiLiveTicks.ts:50`) | chart2 ★ |
| chart | FocusChartModal | الرأس يطبع تيك الرمز الجديد فوق شموع القديم؛ «+0.00%» أخضر | chart3 ★ |
| chart | الجميع | `Alert.alert` لا يعمل على الويب — مساعد `confirmDestructive` مشترك (غير موجود) | chart29 |
| launch | UI | أيقونة «₴» (الهريفنيا) للدفتر: `ToolsScreen.tsx:85`، `MatrixBottomDock.tsx:85`، `MatrixEdgeRails.tsx:142` | launch4 ★ |

**أُسقط — مُتحقَّق منه بالكود هذه الدورة:** AUTO `tr.mcAutoA11y`، «Bar Replay» ⇒ `tr.mcReplayReadout`، `mcClearAllBody`/`mcToLatestA11y`، `candleTimeSec` بـChartFrame،
`journalSizeFromSmallFix` وملاحظة عمولة micro/cent موصولة، `mcMeasureDurUnits`/`mcMeasureBarOne/Two`/`mcHint*`/`mcReplayEndedOnSwitch`/`cfReplayPriceA11y` موصولة
(9d62079، a0197cc)، `chartPipSpec('EURUSD.c')` يعمل (89c3338)، `diOf` واحدة، حجم الفوركس الصفري له بديل بالتطبيق (300dad5)، `pctDirection` بـScreenerMini.
لا اسم منافس في أي نص معروض (TradingView في تعليقات فقط).
