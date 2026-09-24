# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-24 (دورة QA 3، بعد 732a7d4) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور (تشغيل n للطالب). ★ = عالق (≥3 دورات للمنفّذ). «الخادم» = `backend/` بلا وكيل مالك ⇒ قرار أنس.
«بلا مالك» = ملفات مكوّنات لم يلمسها أي وكيل (تاريخ git: أنس وحده) — المفاتيح جاهزة ولا أحد مخوَّل بالربط ⇒ أنس يحدّد المالك.

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
| QA | chart | **جهاز**: سحب جسم الرسم المحدَّد (ميت حتى 4315956) — RELEASE §5 بند 128 | QA1 |
| QA | بلا مالك | **كردي يرى أطراً عربية**: `tfLabels`/`tfLabelsA11y` جاهزة (8dfdaff) لكن `TimeframeBar.tsx:26` ما زال `arabic ? TIMEFRAME_LABELS` و`TerminalScreen.tsx:988` `arabic={rtl}` | QA2 |
| QA | بلا مالك | `cpp*`/`ntp*`/`tds*`/`accNetLoadError` جاهزة (541dcfb) — `CommissionPlanPanel`/`NetworkTreePanel`/`TreeDiagramSketch` بلا `useI18n`، `AccountScreen.tsx:248` ما زال ثابتاً | QA2 |
| QA | بلا مالك | `subPlans` جاهزة (b8ec2f7) — `SubscriptionPlansPanel.tsx:34-100` ما زال يقرأ `COPY` الداخلي | QA2 |
| chart | launch | `mcLogScaleA11y`/`mcShareDialogTitle`/`mcSessTokyo|London|NewYork` لتحلّ محلّ `chartLocalLabels` (`typeLabels.ts:95-125`) | chart41 |
| QA | tools | `planJournalNote()` (`positionSize.ts:1127`) يكتب ملاحظة الدفتر إنجليزية دائماً («lot · risk · commission») | QA2 |
| launch | tools | `journalMicroMoneyNote` بلا قارئ (السنت موصول 4c38069، micro لا) | launch50 |
| QA | chart | `DRAW_MARK` (`MatrixEdgeRails.tsx:28-40`) بلا `hray`/`channel`/`long`/`short` ⇒ «·» | chart20 ★ |
| launch | chart | «₴» للدفتر باقٍ: `MatrixEdgeRails.tsx:142`، `MatrixBottomDock.tsx:85` (ToolsScreen أُصلح 732a7d4 بـ«▤» — وحّدوه) | launch4 ★ |
| launch | chart | حذف `dxyPrice` الميت (`TerminalScreen.tsx:868`) | QA1 |
| QA | chart | منطق saveError منسوخ 4 مرات (template/drawing/layout/watchlist Store) | QA1 |
| QA | tools | `dirColor` متطابقة ×3 (Analysts/IndicatorForecast/SocialConsensus)؛ `planSummary` ×2 | QA1 |
| QA | الجميع | 17 تصديراً بلا مستخدم (mock.ts ×3، `computeDomLite`، `PINE_PRESETS`، `deleteTemplate`، `motion`، `FRAME_SYMBOLS`…) | QA1 |
| launch | chart | DeMarker 0..100 والمنصات 0..1 (قرار ⇒ أنس) | launch48 |
| tools+launch | الخادم | spread مُختلَق = السعر × 0.00008 (`backend/twelve_data.py:315-318`) | tools13 ★ |
| tools | الخادم | الحجم يُخزَّن 1 حين لا يُرسل (`backend/db.py:1704`) | 09-22 ★ |
| tools | الخادم | كاش 30–60ث لـ`/api/market/quote` | 09-23 ★ |
| launch | الخادم/أنس | `openrouter_ai.py:71` «أنت خبير تداول» ويعطي دخول/وقف/هدف | launch9 ★ |
| tools | chart | إيقاف سوكت التيكات حين TerminalScreen غير مركّزة (`useMultiLiveTicks(watchSymbols, true)` :211) | 09-23 ★ |
| chart | useMultiLiveTicks | إسقاط التيك بعد 20ث بلا بثّ + حارس `isFinite && >0` (`useMultiLiveTicks.ts:50` يقبل أي number) | chart2 ★ |
| chart | FocusChartModal | الرأس يطبع تيك الرمز الجديد فوق شموع القديم؛ «+0.00%» أخضر | chart3 ★ |
| tools | chart | التغيّر اليومي على إغلاق الجلسة السابقة ≤10د بعد التدوير (`dailyRefStore.ts`) | tools25 |
| tools | بلا مالك | `AccountScreen.tsx:111` `.then` بلا `catch` حول `getNotificationPermissionState` — الزر قد يعلق على «…» | tools≈14:00 |
| chart | TerminalScreen | عرض الشموع المخزّنة فوراً عند تبديل الفريم (`seriesCache` في QuadChartModal فقط) | chart17 |
| chart | الجميع | `Alert.alert` لا يعمل على الويب (24 استدعاءً) — مساعد `confirmDestructive` مشترك (غير موجود) | chart29 |
| QA | chart | **a11y**: أزرار الرسم المدمجة (`MatrixChart.tsx:4830`) تُقرأ «⫽ Channel» (رمز ثم اسم) وبلا `accessibilityState` للمحدَّد؛ «⌫ Clear» (:4906)؛ ضغط الشارت (:5208) وخلفيتا `MatrixSidePanel.tsx:83`/`ChartFrame.tsx:391` بلا اسم ولا دور | QA3 |
| QA | chart | **a11y**: ~40 مفتاحاً/تبويباً حالته لونية فقط (بلا `accessibilityState={{selected}}`): `MatrixChart` :4938 :4954 :10216 :10295-10325، `TerminalScreen` :1001-1585 (×7)، `MatrixEdgeRails` (×6)، `MatrixBottomDock` (×3)، `TimeframeBar:28` | QA3 |
| QA | tools | **a11y**: تبويبات `ToolsScreen` :497 :570 :662 وشراء/بيع `TradeJournalPanel` :1142 :1157 بلا `accessibilityState`؛ وصف SL/TP (:1456 :1473) هو نص الـplaceholder | QA3 |
| QA | بلا مالك | **a11y**: `AccountScreen` رقائق اللغة :195، دخول/تسجيل :324 :338، الدور :439، يسار/يمين :477 :493 — بلا وصف ولا حالة؛ زرّ «...» أثناء الانتظار يُقرأ «...»؛ `NetworkTreePanel:136/:152`، `MessagesScreen` أوصاف عربية ثابتة | QA3 |

**أُسقط — مُتحقَّق منه بالكود هذه الدورة:** `instrumentSpec('GOLDm')` ⇒ XAUUSD (c59cc11، شُغِّل فعلاً)؛ `chartExtraLabels` و`EXTRA_TOOL_LABELS` محذوفتان
(b92e81c)؛ زرّ «Log» له `accessibilityLabel`+`accessibilityState`، عنوان المشاركة والجلسات مترجمة محلياً (b92e81c، الترحيل للقاموس صار صفّ chart41)؛
`mcDeleteDrawingTitle/Body` حُذفا من `locales.ts`؛ `journalCentMoneyNote`/`journalMoneyUsc` موصولة (4c38069).
