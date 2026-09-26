# LOG-QA — سجل وكيل الجودة

## 2026-09-24 — الدورة 1
**البناء:** كان أحمر بـ66 خطأ tsc (60 منها ملفات selftest بلا @types/node) ⇒ **أخضر 0**.
- b484754 `candleTimeSec` مستورد من dataSource ومعرّف محلياً بـMatrixChart (تعارض ربط) — حُذفت النسخة المحلية المتطابقة.
- 4315956 **خلل سلوكي حقيقي**: `hitDrawing()` يعيد id نصاً والكود قارن `?.id` ⇒ undefined دائماً ⇒ سحب جسم الرسم المحدَّد لم يبدأ أبداً. صار `!== d.id`.
- نوعيّات بلا أثر تشغيلي: sourceRef.plot بلا time، تضييق d.b داخل map، اتحاد side، و`mv.r` unknown بـTradeJournalPanel.
- @types/node ~20.19 (Node الخادم 20) في devDependencies + `"types": ["node"]` في tsconfig (TS 6 لم يعد يضمّ @types تلقائياً). مقايضة: عموميات Node صارت مرئية بكود التطبيق أيضاً. package-lock أُعيد تزامنه مع package.json (كان متأخراً: 1.0.0، expo-splash-screen). qa-build-check.sh صار متتبَّعاً.
**Selftests:** 57/57 ناجح (`npx tsx`).
**المراجعة (a — تكرار/كود ميت/تصديرات بلا مستورد):** 7 مجموعات تكرار، 17 تصديراً بلا أي مستخدم، 82 `export` زائداً (مستخدم محلياً فقط)، 3 متغيرات ميتة (أبرزها `dxyPrice` بـTerminalScreen:868)، 18 استيراداً ميتاً بملفات indicators. أُرسلت لأصحابها في COORDINATION.md.
**اكتشاف أثناء التحقق:** `backend/twelve_data.py:148-153` يرسل volume=0 لا null ⇒ مؤشرات الحجم على الفوركس تعمل على أصفار.
**التنسيق:** 33 بنداً مفتوحاً مُتحقَّقاً منه بالكود؛ 4 مجموعات أُسقطت لأنها منجزة فعلاً.
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة خارج locales.ts.

## 2026-09-24 — الدورة 2
**البناء:** أخضر 0 قبل وبعد سحب 9 commits جديدة (a0197cc) — لا إصلاح لازم.
**Selftests:** 59/59 ناجح (أُضيف `withVolume.selftest.ts`).
**المراجعة (b — نصوص ثابتة خارج locales.ts)، مُتحقَّق منها بالكود:**
- launch: `CommissionPlanPanel`/`NetworkTreePanel`/`TreeDiagramSketch` بلا `useI18n` (~55 نصاً عربياً فقط)، `AccountScreen.tsx:248`، `MessagesScreen` (غير مركّبة)، قاموس `SubscriptionPlansPanel` داخلي.
- **خلل مؤكّد**: `TimeframeBar arabic={rtl}` + `isRtl('ku')`=true ⇒ الكردي يرى أطراً عربية.
- chart: زر «Log» (:5173) بلا a11y، `'MATRIX Chart'`، جلسات Tokyo/London/New York.
- tools: `planJournalNote()` إنجليزية دائماً وتُحفظ بالدفتر.
- لا اسم منافس في نص معروض.
**اكتشاف (d):** `instrumentSpec('GOLDm')`=null مقابل `chartPipSpec('GOLDm')`=XAUUSD.
**التنسيق:** 10 بنود أُسقطت بعد التحقق (AUTO a11y، Bar Replay، mcHint*/MeasureDur/BarOne، EURUSD.c، diOf، حجم الفوركس الصفري…). 28 بنداً مفتوحاً؛ بنود `backend/` بلا مالك رُفعت لأنس.
**ملاحظة:** وكيل الأدوات (run 33) لم يرَ COORDINATION.md — نسخته كانت قبل d2d6d63.
**بعد 6 commits وصلت أثناء الدورة (2196e28):** أخضر 0، **62/62** (`compare.selftest` جديد). لا طلب تنسيق جديد؛ `RECONNECT_*` صار «بلا مالك» (chart: خارج نطاقه).
**الدورة القادمة:** المراجعة (c) — عناصر تفاعلية بلا accessibilityLabel.

## 2026-09-24 — الدورة 3
**البناء:** أخضر 0 (بعد 732a7d4) — لا إصلاح لازم.
**Selftests:** 59/59 ناجح (`npx tsx`).
**التحقّق من إغلاقات الوكلاء بالكود:** مُغلق فعلاً — `instrumentSpec('GOLDm')`⇒XAUUSD (شُغِّل)، `chartExtraLabels`/`EXTRA_TOOL_LABELS` محذوفتان، زرّ Log موصوف بحالة،
`mcDeleteDrawing*` محذوفان، مال السنت موصول. **غير مُغلق رغم رسائل الـcommit**: 8dfdaff/541dcfb/b8ec2f7 أضافت مفاتيح لـ`locales.ts` فقط —
`TimeframeBar`/`CommissionPlanPanel`/`NetworkTreePanel`/`TreeDiagramSketch`/`SubscriptionPlansPanel`/`AccountScreen` لم تتغيّر. تاريخ git لهذه الملفات: أنس وحده ⇒ **فجوة ملكية** رُفعت لأنس.
732a7d4 أصلح «₴» بـToolsScreen وحده ⇒ أيقونتان مختلفتان للدفتر الآن (EdgeRails/BottomDock ما زالتا «₴»).
**المراجعة (c — a11y)، بسكربت ثم قراءة:** 235 عنصراً/49 ملفاً؛ 33 بلا وصف (5 حقيقية: أزرار الرسم المدمجة تُقرأ بالرمز، ضغط الشارت، خلفيتان)؛ ~55 تبديلاً بلا
`accessibilityState`؛ AccountScreen أسوأ ملف (10 بلا وصف). كل الـTextInput موصوفة. صفوف QA3 بـCOORDINATION.md.
**الدورة القادمة:** المراجعة (d) — أرقام وحدود متناقضة بين الملفات.

## 2026-09-24 — الدورة 4
**البناء:** أخضر 0 (بعد dcb738e) — لا إصلاح لازم.
**Selftests:** 59/59 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** (أُعيد البناء+selftests بعد 7 commits وصلت أثناء الدورة: أخضر 0، 59/59) مُغلق فعلاً — a11y QA3 للشارت (6d50f09 عدا MatrixSidePanel:83) والأدوات (72cf43e)، Terminal (f66ce07)، chart41 (`chartLocalLabels` محذوفة، `tr.mcShareDialogTitle`/`tr.mcLogScaleA11y` موصولة)، saveError ×4 ⇒
`createSaveErrorSignal` (cdaceca)، التغيّر اليومي ≤1د بعد التدوير (3665071، `sessionKeyAt`)، `newsUnavailable`/`riskCalcStopInsideSpread` موصولان.
جزئي: `planJournalNote` بلغة الواجهة (d0da6fc) وينتظر `planNoteCommission`/`planNoteNetRR`؛ `confirmDestructive` موجود بالشارت وبقي 21 `Alert.alert` بـ7 ملفات.
**غير مُغلق:** `a11yBusy` (0 استعمال)، `TimeframeBar`، لوحات العمولات/الشبكة، «₴»، `DRAW_MARK`، `dxyPrice`. `journalCentNoMoney`/`journalMicroNoMoney` بلا قارئ (تعليقات فقط).
**المراجعة (d — أرقام متناقضة)، وكيل بحث ثم تحقّق يدوي للأهم:**
- spread الخادم المختلَق (×0.00008، `data_kind:"provider"`) يناقض `backtest.py` (1.0/3.0 pip) وتعليق `main.py:1352`، ويُزيح أسعار الدفتر — دُمج بصف tools13 ★.
- `useMultiLiveTicks` بلا حدّ تقادم/رفض ≤0 مقابل `useLiveTicks` 20ث؛ مرجع تنبيه الشارت بـTerminalScreen:855 — دُمج بصف chart2 ★.
- المخاطرة: 1% (نصائح) / 1–2% (أكاديمية) / تحذير >2% (الحاسبة) ⇒ أنس ⛔10. «50–100 lot» نصاً مقابل تحذير >100 كوداً.
- STORE-LISTING: عدسة Liquidity بلا CVD. الخادم يقرّب الوقف/الهدف لخانتين للين/DXY (لا شاشة تعرضه).
- متّسق: pip/عقد/لوت، سنت/مايكرو، رافعة، باقات، عمولات، أطر، جلسات/DST، فترات مؤشرات، حدود الشموع.
**الدورة القادمة:** المراجعة (e) — ما يُحرجنا أمام متداول فوركس حقيقي.

## 2026-09-25 — الدورة 5
**البناء:** أخضر 0 (بعد b3bcc9d) — لا إصلاح لازم.
**Selftests:** 59/59 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — حدّ المخاطرة (3bffef5 `RISK_HIGH_PCT=2`، 1% افتراضي ⇒ متّسق مع أكاديمية 1–2%)، «50–100 lot» (4c1bd75 `ORDER_WARN_LOTS=50`)،
`mcUndo*` موجودة. **غير مُغلق:** `AlertsPanel` a11yBusy (0)، `planNoteCommission` (0)، `journalCent/MicroNoMoney` ما زالا، EdgeRails/BottomDock صفر `accessibilityState`،
«₴»، `dxyPrice`، `DRAW_MARK`. صفوف «بلا مالك» (QA2/QA3) بلغت 3 دورات ⇒ ★. جديد: chart43 (`mcDrawColor*` لـlaunch)، launch53 (`mcAutoManualA11y` لـchart).
**المراجعة (e — ما يُحرج أمام متداول فوركس)، وكيل بحث ثم تحقّق يدوي للأهم:**
- **★★ `backend/signal_hub.py`**: محلّلون بأسماء بنوك حقيقية (HSBC/Citi/UBS/Nomura/Commerzbank/ING) وقنوات وهمية (منها «TradingCentral-like» — اسم منافس بنص معروض)؛
  الاتجاه/الهدف SHA-256 لـ(id|رمز|خانة 6س)، ميل ثابت، «ثقة» ≥35%؛ اللوحات مركّبة بـToolsScreen/BottomDock ⇒ ⛔ أنس 1.
- وقف الإشارة 0.18% ثابت لكل فريم؛ نصوص عربية فقط للواجهة الإنجليزية؛ `AnalystsPanel:118` يعرض دخول=وقف=هدف للمحايد؛ `VotePanel:422-430` أسعار خام.
- Footprint/CVD مختلَقان من لون الشمعة (`orderflow.ts`)؛ PDH/PDL بيومين مختلفين (UTC للـD1، 17:00 NY للاحتياطي)؛ لا عطل؛ تقويم العيّنة بأوقات UTC خاطئة.
- سليم: الجلسات/DST، افتتاح الأحد/إغلاق الجمعة، pip الين، Bid للإغلاق، وسم بيانات العرض.
**بعد 7 commits وصلت أثناء الدورة (ba9f33b):** أخضر 0، 59/59. أُغلقت: tools34 (c8f93bf)، launch50 (المفاتيح الميتة حُذفت)، STORE-LISTING CVD (2105e87)؛ chart43 صار «اربط `mcDrawColor*`» للشارت.
**الدورة القادمة:** دورة جديدة للمراجعة — (a) تكرار/كود ميت.

## 2026-09-25 — الدورة 6
**البناء:** أخضر 0 (بعد 478b0a6) — لا إصلاح لازم.
**Selftests:** 61/61 ناجح (`npx tsx`؛ جديدان: `marketHours`، `notifications`).
**التحقّق من الإغلاقات بالكود:** مُغلق — chart43 (`tr.mcColorNames`/`mcDrawColor*` :1999-2029، `drawColorLabels` محذوفة)، launch53 (:7678)، عطل 25/12 و1/1 (bd99eca)،
PDH/PDL بيوم 17:00 NY أوّلاً (:1641-1646)، Footprint «≈»/CVD «تقديري» (9d937e5)، مقبس التيكات بـ`screenFocused` (3d1bda8)، `getNotificationPermissionState` لا ترمي (08429d3).
جزئي: أسماء البنوك/«TradingCentral-like» باقية بالخادم والواجهة موسومة «محاكاة» (376434d)؛ تقويم العيّنة موسوم (63c2ef6) وأوقاته خاطئة بالخادم.
**فجوة الملكية اتّسعت:** chart صرّح أن EdgeRails/BottomDock/SidePanel/TerminalScreen/useMultiLiveTicks/FocusChartModal خارج نطاقه، وtools قال ذلك عن Analysts/Vote/AlertsPanel
⇒ 13 صفاً «بلا مالك» (9 ★) ⇒ ⛔ أنس 1.
**المراجعة (a — تكرار/كود ميت)، بسكربت ثم قراءة:** `QUICK_SYMBOLS` ×4 حرفياً؛ `pineLite` بنسخة `sma`/`ema` خاصة (مطابقة على بيانات بلا فراغات)؛ `DAY_SEC` ×3؛
`RECONNECT_*` ×2؛ `dirColor`/`dirLabel` ×3 باقية؛ ~12 تصديراً بلا مستخدم (`priceLegend` ×3 للاختبار فقط — مقبول). `estimatedTag` المؤقّت ما زال بدل `mcEstimatedTag`.
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة خارج locales.ts.

## 2026-09-25 — الدورة 7
**البناء:** أخضر 0 (بعد 0df9a68) — لا إصلاح لازم.
**Selftests:** 61/61 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — launch55 (`tr.mcEstimatedTag`، `estimatedTag` محذوفة)، `dxyPrice` (0)، مرجع تنبيه الشارت (`TerminalScreen:855` `freshTickRefPrice`)،
`pineLite` يستورد `sma`/`ema`، `DAY_SEC` مرة واحدة، `QUICK_SYMBOLS` بـPositionSize/TradeJournal. **جزئي:** `QUICK_SYMBOLS` باقٍ بـBacktest/IndicatorAlerts (بلا مالك)،
`RECONNECT_*` ×2، `useMultiLiveTicks` بلا حدّ تقادم (القائمة). `TerminalScreen` صار للأدوات ⇒ صف seriesCache أُسند لهم. جديد: tools38 مفتاح `journalExposureStacked`
للإطلاق، وقرار «أمس» UTC مقابل 17:00 NY ⇒ ⛔ أنس 11. **غير مُغلق:** a11yBusy (0)، «₴»، EdgeRails/BottomDock صفر `accessibilityState`، `TimeframeBar`، 17 `Alert.alert`.
**المراجعة (b — نصوص ثابتة خارج locales.ts)، بسكربت (حروف عربية/جمل إنجليزية/props نصية) ثم قراءة كل ملف:**
- القوائم العربية بـ`types.ts`/`dataSource.ts`/`marketHours.ts`/`measureReadout.ts` احتياطات فقط — كل مستدعٍ يمرّر `t.*` (`localized*`، `dsMarketOpen`…).
- مطالبات `WeeklyReportPanel` داخلية واللغة من `lang`؛ اسم التخطيط الافتراضي بـ`t.layoutBuiltinName`؛ لا `e.message` يصل الشاشة؛ أسماء المؤشرات الإنجليزية معيارية.
- الثابت الحقيقي كلّه بملفات بلا مالك (Subscription/Commission/NetworkTree/TreeDiagram/Messages/TimeframeBar) + `AlertsPanel:903` «pip» (صف QA7).
- الأكاديمية: الكردي يرى `name_en` (لا حقل كردي) — ملاحظة فقط.
**بعد 6 commits وصلت أثناء الدورة (2196e28):** أخضر 0، **62/62** (`compare.selftest` جديد). لا طلب تنسيق جديد؛ `RECONNECT_*` صار «بلا مالك» (chart: خارج نطاقه).
**الدورة القادمة:** المراجعة (c) — عناصر تفاعلية بلا accessibilityLabel.

## 2026-09-25 — الدورة 8
**البناء:** أخضر 0 (بعد 6178185، وأُعيد بعد 92a3a87 الوافد أثناء الدورة: أخضر 0) — لا إصلاح لازم.
**Selftests:** 62/62 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — chart17 (`TerminalScreen.tsx:52 :132` `createSeriesCache`، 60e8892)، tools38 (`journalExposureStacked` ×3 ويُعرض
`TradeJournalPanel.tsx:600`)، حصّة tools من chart29 (`Alert.alert` = 0 بالدفتر/الطرفية). أُسقط QA7 «pip» بعد ردّ launch57 (اصطلاح التطبيق بـ9 مواضع وبالقاموس).
**غير مُغلق:** 10 `Alert.alert` بـ5 ملفات، `QUICK_SYMBOLS` بـBacktest/IndicatorAlerts، `RECONNECT_*` ×2، «₴»، a11yBusy بـAlerts/Account/NetworkTree، `useMultiLiveTicks`.
**المراجعة (c — a11y)، بسكربت (وسم الفتح كاملاً بعمق الأقواس) ثم قراءة:** 237 عنصراً/40 ملفاً؛ 27 بلا `accessibilityLabel` — 18 بنصّ ابن مقروء (سليمة)؛
الحقيقية: `AccountScreen` ×6، خلفية `MatrixSidePanel:83`، `MessagesScreen` ×3 (ميّتة). **جديد:** `TimeframeBar.tsx:28` بلا `accessibilityState.selected` (6 شاشات) —
دُمج بصفّ TimeframeBar ★. EdgeRails/BottomDock/SidePanel ما زالت صفر `accessibilityState`. الجديد منذ الدورة 3 (الرسم بالمستقبل، محرّر الملاحظة 92a3a87،
الدفتر، مفاتيح `switch` بالرباعي/الطرفية) موصوف كلّه. كل النواقص بملفات بلا مالك ⇒ ⛔ أنس 1.
**الدورة القادمة:** المراجعة (d) — أرقام وحدود متناقضة بين الملفات.

## 2026-09-25 — الدورة 9
**البناء:** أخضر 0 (بعد 043683e) — لا إصلاح لازم. `@types/node` موجود بـ`mobile/package.json` (أُنجز سابقاً).
**Selftests:** 62/62 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — launch58 (`043683e`: `MatrixChart.tsx:7373` `tr.mcNoteTextA11y`، تلميح :5226 للملاحظة).
**غير مُغلق (بلا تغيير):** 10 `Alert.alert` حقيقية، «₴» ×2، `TimeframeBar` بلا `accessibilityState`، `QUICK_SYMBOLS` ×3 تعريفات، `useMultiLiveTicks` بلا تقادم.
**المراجعة (d — أرقام/حدود متناقضة)، بمسح أرقام نصوص `en` ثم مطابقة كل رقم بمُطبِّقه بالتطبيق والخادم:**
متطابق: المسح 9/21 و30/70 و80 شمعة و65/35، 2%، 50/200 لوت، 1:{MAX_LEVERAGE}، ~30 صفقة، 60 حرفاً، 60ث للتنبيهات، 5د التقويم، 24س/3س/15د،
حدود الخادم للدردشة 1000/التصويت 500، الباقات $10/15/20، pip الذهب/الفضة، رموز الخادم ≤12 (رموز الدفتر من الشارت).
**جديد (QA9 → الخادم):** `db.py:1681` `LIMIT 200` يقصّ الدفتر و`trade_stats` بصمت؛ `days=30` معامل ميّت. 15ث «حيّ» مقابل 20ث إعادة اتصال — مقصود.
**بعد 3 commits وصلت أثناء الدورة (1e2a4f1):** أخضر 0، اختباراتها الأربعة المعدَّلة ناجحة (marketHours، measureReadout، positionSize، tradePlan).
**الدورة القادمة:** المراجعة (e) — ما قد يُحرجنا أمام متداول حقيقي.

## 2026-09-25 — الدورة 10
**البناء:** أخضر 0 (بعد 61da9e5، وأُعيد بعد e40b2da الوافد أثناء الدورة: أخضر 0) — لا إصلاح لازم.
**Selftests:** 62/62 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — launch59 ×2 (`0c34e61`: `TradeJournalPanel.tsx:1672` `journalInitialStopNote`، `:1704` `journalCappedNote`،
`JOURNAL_LIST_LIMIT` = 200 = `db.py:1681`). QA9 بقي للخادم (إحصاء SQL + ترقيم). **غير مُغلق (بلا تغيير):** 10 `Alert.alert`، «₴» ×2، `TimeframeBar` بلا
`accessibilityState`، `QUICK_SYMBOLS` ×3، `RECONNECT_*` ×2، أسماء البنوك/«TradingCentral-like»، السبريد ×0.00008، «خبير تداول». QA4/QA5/QA6 صارت ★.
**طلبات تنسيق جديدة:** tools40 → launch (`riskCalcSpreadPipsHint` — «بالنقاط» تُقرأ points)؛ chart → launch (تلميح الملاحظة «تحتها» والخانة قد تنقلب فوقها).
**المراجعة (e — ما يُحرج أمام متداول)، وكيل فحص فروق 043683e..HEAD بتشغيل الدوال الحقيقية بـ`npx tsx`، ثم تحقّق يدوي:**
- سليم: R من الوقف الأصلي، `formatRR` للأسفل، `targetAtRR` على JPY/XAU/US30، إسقاط العطلة لليورو صيفاً/شتاءً، علامات المحور، الهامش ≤120ث، الماسح.
- **QA10 → chart:** `marketHours.ts:160` `projectBarTimeSec('XAUUSD', Fri 20:00Z, 3600, 1)` = الأحد 21:00Z (أعدتُ التشغيل) — الذهب يفتح 18:00 NY؛ وعلامة محور تجميلية.
- **QA10 → tools:** `TerminalScreen.tsx:1575` السبريد سعراً خاماً مقابل `DomLitePanel.tsx:72` بالـpip.
**الدورة القادمة:** المراجعة (a) — تكرار/كود ميت.

## 2026-09-25 — الدورة 11
**البناء:** أخضر 0 (بعد 20f0ade) — لا إصلاح لازم. **Selftests:** 62/62 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — QA10/tools (`TerminalScreen.tsx:1579` `quoteSpreadPips`)، tools40 (`afbb0c2` ×3 لغات + `PositionSizePanel.tsx:1236`)،
تلميح الملاحظة (`mcHintNoteSelected` «المجاورة/next to it»)، QA10/chart للمعادن (`83dd284` — شغّلتُ `projectBarTimeSec`: XAUUSD الجمعة 20:00Z ⇒ الأحد 22:00Z، شتاءً 23:00Z).
النصف التجميلي (علامة المحور) أُسقط بردّ chart. **غير مُغلق:** US30 ما زال ⇒ الأحد 21:00Z (صفّ QA10 بقيّة)؛ `useMultiLiveTicks` بلا تقادم (`d59afdc` لـ`useLiveTicks` فقط)؛
10 `Alert.alert`، «₴» ×2، `TimeframeBar` بلا `accessibilityState`، `QUICK_SYMBOLS` ×3.
**المراجعة (a — تكرار/كود ميت)، بسكربت يعدّ كل `export` خارج ملفه وداخله ثم تكرار أسماء التعريفات:** 160 تصديراً بلا مستورد (أغلبها أنواع/ثوابت مستعملة داخل ملفها)؛
الميّتة تماماً 16 — القائمة نفسها منذ QA1 (+`WatchSymbol` نوع). **جديد:** `DomLitePanel.tsx:67-73` نسخة `quoteSpreadPips` و`last` خاصية ميتة (بلا مالك)؛
`PANE_PAD`/`clamp`/`finite` ×3 بلوحات centered/macd/stoch (chart، منخفض). المكرّرات القديمة (`dirColor`/`dirLabel` ×3، `RECONNECT_*` ×2) بلا تغيير.
**الدورة القادمة:** المراجعة (b) — نصوص ظاهرة ثابتة مكانها `locales.ts`.

## 2026-09-25 — الدورة 12
**البناء:** أخضر 0 (بعد 4af5d4c) — لا إصلاح لازم. **Selftests:** 62/62 ناجح (`npx tsx`).
**التحقّق بالكود:** لا إغلاق جديد (ردّ launch61 عن tools40/التلميح سبق إسقاطه بالدورة 11). **غير مُغلق:** QA11 — أعدتُ تشغيل `projectBarTimeSec`: US30 الجمعة
20:00Z +H1 ⇒ الأحد 21:00Z؛ والذهب الثلاثاء 20:00Z +H1 ⇒ 21:00Z (داخل الكسر اليومي؛ chart يعرفه — خطّته التالية)؛ 10 `Alert.alert` (أُبرز `AccountScreen:162`
حذف الحساب لا يعمل على الويب — launch61)، «₴» ×2، `TimeframeBar` صفر `accessibilityState`، `QUICK_SYMBOLS` ×3.
**طلب تنسيق جديد:** chart → launch `mcWeekdays` (0 بـ`locales.ts`).
**المراجعة (b — نصوص ثابتة)، بسكربت على فروق 2196e28..HEAD (24 ملفاً) ثم على كل `.tsx`:** الجديد كلّه عبر `t.*` (المطابقات تعليقات فقط)؛ الثوابت الظاهرة
المتبقية مصطلحات معيارية (Log/POC/TPO/AUTO/pip، placeholder «EURUSD») أو بملفات بلا مالك. فحص القواميس بـ`tsx`: 950 مفتاحاً، 0 فارغ، 0 قيمة
إنجليزية منسوخة بالعربي/الكردي، 0 عدم تطابق `{…}`.
**الدورة القادمة:** المراجعة (c) — عناصر تفاعلية بلا accessibilityLabel.

## 2026-09-25 — الدورة 13
**البناء:** أخضر 0 (بعد 447ab3e) — لا إصلاح لازم. **Selftests:** 62/62 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — QA11 (`b32c26b`): شغّلتُ `projectBarTimeSec` — US30/NAS100/WTI الجمعة 20:00Z +H1 ⇒ الأحد 22:00Z (شتاءً 21:00Z ⇒ 23:00Z)،
XAUUSD الثلاثاء 20:00Z +H1 ⇒ 22:00Z و19:00Z +3 ⇒ 23:00Z (يتخطّى الكسر)، EURUSD بلا تغيير 21:00Z؛ `isForexMarketOpen` US30/WTI/XAG 21:30Z مغلق. QA11 (a) `PANE_PAD`
(`5a20d8b`). `mcWeekdays` أُضيف (`348efee`) ⇒ الصف صار «chart: اربط» (0 مستعمل). **غير مُغلق:** 10 `Alert.alert` (+2 داخل `confirmDestructive` نفسها)، «₴» ×2 (+تعليق)،
`QUICK_SYMBOLS` ×3، `DomLitePanel` `void last`، `LIMIT 200`، `TradingCentral-like`.
**طلبات تنسيق جديدة:** launch62 → tools (`journalSizeDottedFix`، 0 ربط)؛ tools42 → chart (`dailyChange.ts:32` `sessionOf` بلا رمز ⇒ «0.00%» للمعادن/CME ساعةً مساء الأحد — تأكّدتُ أن `sessionOf` يستعمل `forexSundayOpenSec` وحده).
**المراجعة (c — a11y)، بسكربتين على كل `.tsx`:** (1) عناصر تفاعلية بلا `accessibilityLabel` ولا نصّ ابن: 1 فقط (`MatrixSidePanel.tsx:83`، مسجّل)؛ أزرار برمز وحده بلا وصف: 0.
(2) أزرار نمطها `&& styles.*On/Active/Selected` بلا `accessibilityState`: **32** بـ14 ملفاً (صف QA13) — منها `AccountScreen` ×6 التي وُصفت خطأً بصفّ QA3 «بلا وصف» (لها نصّ ابن) ⇒ صُحّح الصف.
**الدورة القادمة:** المراجعة (d) — أرقام/حدود متناقضة بين الملفات.

## 2026-09-25 — الدورة 14
**البناء:** أخضر 0 (بعد b5c8955) — لا إصلاح لازم. **Selftests:** 62/62 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — tools42 (`77cce19`: `sessionKeyAt(…, symbol)` بـ`dailyRefStore.ts:43 :75` و`dailyChange.ts:80`؛ selftest يمرّ)،
`mcWeekdays` مربوط (`MatrixChart.tsx:5014`)، `journalSizeDottedFix` مربوط (`TradeJournalPanel.tsx:366`)، `IndicatorForecastPanel.tsx:217` `selected` (QA13 ⇒ 31).
**غير مُغلق:** 10 `Alert.alert`، «₴» ×2، `TimeframeBar` صفر `accessibilityState`، `QUICK_SYMBOLS` ×3، `DomLitePanel` `void last`، `LIMIT 200`، `TradingCentral-like`.
أُضيف `accNetLoadError` (launch63) لصفّ التصديرات الميتة.
**المراجعة (d — أرقام/حدود متناقضة)، بمقارنة ثوابت `MAX_*`/`maxLength` بالتطبيق مع `Field(max_length…)` بالخادم، ثم `journalSymbol` بـ`tsx` على 8 لواحق وسيط:**
متّسق — pip (`backtest.py` = `positionSize.ts`)، شموع 50..5000، رمز الدفتر ≤12 = الخادم 12، 200 صفقة، ملاحظة التصويت 500، الدردشة 1000.
**جديد QA14 → tools:** ملاحظة الدفتر `TradeJournalPanel.tsx:1683` بلا `maxLength` والخادم يرفض >500 ⇒ 422 يُعرض «تحقق من الاتصال» (`JOURNAL_NOTE_MAX` جاهز).
**جديد QA14 → الخادم:** ملاحظة التنبيه/تنبيه المؤشر `main.py:199 :399` بلا حدّ.
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول.

## 2026-09-25 — الدورة 15
**البناء:** أخضر 0 (بعد b70f388) — لا إصلاح لازم. **Selftests:** 62/62 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — QA14 → tools (`15226bd`: `maxLength={JOURNAL_NOTE_MAX}` `TradeJournalPanel.tsx:1690` + `noteCharsLeft` :1705)؛
launch64 → tools (`82f38f5`: `riskCalcLeverageAmbiguous` `PositionSizePanel.tsx:447`). **غير مُغلق:** 10 `Alert.alert`، «₴» ×2، `TimeframeBar` صفر
`accessibilityState`، `accNetLoadError` 0 مستعمل.
**المراجعة (e — ما يُحرج أمام متداول):** `b70f388` سطر التقاطع عن إغلاق السابقة — `source.all[start+crossIndex-1]` صحيح بالنافذة والتابع، أول شمعة ⇒ الافتتاح،
الأنواع المصطنعة تقيس عن لبنتها السابقة (كـTV)، الرموز بلا مواصفة ⇒ % فقط. `sessions.ts` طوكيو 00–09Z، لندن/نيويورك 08–17 محلياً بـDST. `instrumentSpec` بـ`tsx`
على 12 غريبة: HUF/CZK/KRW/THB/INR/IDR ⇒ null (مقصود)، MXN/ZAR/TRY/SEK/HKD/CNH ⇒ 0.0001. **جديد QA15:** التعادل خسارة بنسبة الفوز (`pnl <= 0` =
`db.py:1848`) ⇒ أنس؛ الإنجليزية تخلط «N pip»/«N pips» (`locales.ts` :2466 :2499 :2578 مقابل :2507 :2600) ⇒ launch (منخفض).
**الدورة القادمة:** المراجعة (a) — تكرار/كود ميت.

## 2026-09-25 — الدورة 16
**البناء:** أخضر 0 (بعد 8805813) — لا إصلاح لازم. **Selftests:** 62/62 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — QA15 → launch (`758fc25`: «({derived} pips)» `locales.ts` :2466 :2499، «Net: {pips} pips» :2578).
**غير مُغلق:** 10 `Alert.alert` بـ5 ملفات، «₴» ×2، `TimeframeBar` صفر `accessibilityState`، `accNetLoadError` 0 مستعمل، `QUICK_SYMBOLS` ×2، `void last`، `RECONNECT_BASE_MS` ×2.
**طلب تنسيق جديد:** launch65 → chart — `measureReadout.ts:52` يولّد «pip» مفرداً بالإنجليزية (منخفض).
**المراجعة (a — تكرار/كود ميت)، بسكربت على تصديرات `measureReadout.ts`/`positionSize.ts` وفروق 1671724..HEAD:** التصديرات الجديدة الثلاثة مستوردة؛
`normalizeSymbol`/`moneyDecimals`/`RISK_HIGH_PCT` مصدَّرة ومستعملة بملفها وحده (تصدير زائد، لا يستحقّ صفاً)؛ قائمة الميتة الـ11 كما هي؛ لا تكرار جديد.
ملاحظة صغيرة: `leverageAmbiguousThousands` لا تقبل «．» العريضة بينما `ambiguousThousandsPrice` تقبلها — نادر، لم يُسجَّل.
**الدورة القادمة:** المراجعة (b) — نصوص ظاهرة ثابتة مكانها `locales.ts`.

## 2026-09-25 — الدورة 17
**البناء:** أخضر 0 (بعد 5933093) — لا إصلاح لازم. **Selftests:** 62/62 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — launch65 → chart (`f446081`: `pipUnit(lang)` `measureReadout.ts:38`، يصل القياس/التقاطع/مدى الشمعة/صندوق المركز/الوسوم/السبريد؛
لا « pip» ثابتة باقية بـ`src/chart`). **غير مُغلق:** 10 `Alert.alert` بـ5 ملفات، «₴» ×2، `TimeframeBar` صفر `accessibilityState`، `accNetLoadError` 0 مستعمل.
**طلب تنسيق جديد:** tools45 → الخادم — `close_trade` `backend/db.py:1761` بلا `AND status='open'` (تحقّقتُ). نجمة ★ لصفوف QA9/QA11/QA13/QA14 (≥3 دورات).
**المراجعة (b — نصوص ثابتة)، بسكربت على فروق 57f6a31..HEAD (15 ملفاً) ثم على كل `.tsx` (عربية خارج التعليقات، نصّ JSX لاتيني، props نصّية):** الجديد كلّه عبر
`t.*`/`tr.*` (`positionOutcomeText` تأخذ `tr.entryLabel`؛ «TP/SL/R:R» مصطلحات معيارية). العربية الثابتة بملفات بلا مالك وحدها (Commission 25، NetworkTree 22،
SubscriptionPlans 48، TreeDiagram 10، Messages 13 ميتة، `AccountScreen:248`) — صف QA2؛ `MatrixChart:3038-3040` تحليل وسوم لا عرض؛ مطالبات `WeeklyReportPanel` داخلية.
القواميس بـ`tsx` عبر `DICTS`: 954 مفتاحاً ×4، 0 فارغ، 0 عدم تطابق `{…}`.
**الدورة القادمة:** المراجعة (c) — عناصر تفاعلية بلا accessibilityLabel.

## 2026-09-25 — الدورة 18
**البناء:** أخضر 0 (بعد 3920848) — لا إصلاح لازم. **Selftests:** 62/62 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** لا صف مُغلق منذ QA17. **غير مُغلق:** 10 `Alert.alert` بـ5 ملفات (المطابقة الـ11 `TradeJournalPanel:908` تعليق)، «₴» ×2،
`TimeframeBar` صفر `accessibilityState`، `accNetLoadError` 0 مستعمل.
**طلبات تنسيق جديدة:** launch67 → tools (`journalClosedElsewhereTitle`/`Body` 0 مستعمل — تحقّقتُ، الفرع يحدّث بصمت)؛ launch67 → أنس (إعادة الجولة الترحيبية، `AccountScreen` بلا مالك).
**المراجعة (c — a11y)، بثلاثة سكربتات على كل `.tsx`:** (1) Pressable/Touchable بلا `accessibilityLabel` ولا `<Text` ابن: 1 (`MatrixSidePanel.tsx:83`، مسجّل)؛
(2) TextInput/Switch/Slider بلا وصف: 0 (مطابقة `TradeJournalPanel:1719` إيجابية كاذبة — «>500» داخل تعليق)؛ (3) اختيار باللون بلا `accessibilityState`: 31 كما هو.
شرائح الخروج الجديدة (`3920848`) لها `selected` ووصف كامل بلغة المستخدم.
**الدورة القادمة:** المراجعة (d) — أرقام/حدود متناقضة بين الملفات.

## 2026-09-25 — الدورة 19
**البناء:** أخضر 0 (بعد d9f53a9) — لا إصلاح لازم. **Selftests:** 62/62 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** لا صف مُغلق منذ QA18. **غير مُغلق:** 10 `Alert.alert` بـ5 ملفات، «₴» ×2، `TimeframeBar` صفر `accessibilityState`،
`accNetLoadError`/`journalClosedElsewhere*` 0 مستعمل.
**طلبات تنسيق جديدة (تحقّقتُ 0 مستعمل):** launch68 → tools — ربط `riskCalcConvStale` و`journalExitAtProfitStopA11y`.
**المراجعة (d — أرقام/حدود متناقضة):** `Field(max_length)` بـ`main.py` مقابل `maxLength` الواجهة: الملاحظة 500=500، الدردشة 1000=1000؛ الرمز: الحاسبة
`SYMBOL_INPUT_MAX_LEN` 13 لكن `journalSymbol` (المستعمل للتسجيل من الحاسبة `PositionSizePanel:889`) يُخرج ≤12 — فحصتُه بـ`tsx` على 9 رموز بلواحق
(`EUR/USD.micro`⇒`EURUSD.MICRO`، `GBP/JPY-ECN12`، `XAU/USD_micro`…) كلها ≤12 ⇒ لا 422. عتبات التقادم (تيك 20ث، اقتباس الحاسبة 120ث، تحويل 60ث،
تقويم 5د، عدّاد 24س، `MAX_SANE_LOTS` 100) تطابق نصوص `locales.ts`. **جديد QA19 (منخفض) → tools:** `CalendarPanel.tsx:37-38` ينسخ 3س/15د من
`newsRisk.ts:224-225` بدل الاستيراد.
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول.

## 2026-09-25 — الدورة 20
**البناء:** أخضر 0 (بعد f7f0e82) — لا إصلاح لازم. **Selftests:** 65/65 ناجح (`npx tsx`؛ +3 من الشارت: `noteLabel`/`paneInline`/`translateDrawing`).
**التحقّق من الإغلاقات بالكود:** مُغلق — launch67 `journalClosedElsewhere*` (`TradeJournalPanel.tsx:940`)، launch68 `riskCalcConvStale` (`PositionSizePanel.tsx:1296`، 5 د)
و`journalExitAtProfitStopA11y` (`TradeJournalPanel.tsx:1587`). **غير مُغلق:** 10 `Alert.alert` بـ5 ملفات، «₴» ×2، `TimeframeBar` صفر `accessibilityState`، `accNetLoadError` 0.
**طلبات تنسيق جديدة (تحقّقتُ):** launch69 → tools `noteCharsLeftReserved` 0 مستعمل؛ chart12 → launch `mcCloneDrawing*` 0 بـ`locales.ts`. QA19 → بلا مالك (tools: خارج نطاقه).
نجمة ★ لـQA15 وtools45.
**المراجعة (e — ما يُحرج أمام متداول):** `tsx` على `instrumentSpec`/`pipValuePerLot` لـ14 رمزاً: EURUSD 10$/pip، USDJPY 1000¥، XAU pip 0.1 عقد 100، XAG 0.01×5000،
EURUSDm يُطبَّع؛ US30/NAS100/BTC/USOIL/DXY/GER40/USDHUF ⇒ null (رفض لا تخمين) — سليم. بحث وعود بـ`locales.ts` (guarantee/risk-free/never lose/مضمون):
**جديد QA20 → launch:** `riskCalcSub` en «never lose more than» ×3 لغات (الفجوة/الانزلاق). **جديد QA20 → بلا مالك/الخادم:** «Confidence n%» بـ`AnalystsPanel:115`
و`SocialConsensusPanel:219` من `_confidence` الثابتة `signal_hub.py:79-82` — أُزيلت من `IndicatorForecastPanel` لنفس السبب.
**الدورة القادمة:** المراجعة (a) — تكرار/كود ميت/تصديرات بلا مستورد.

## 2026-09-25 — الدورة 21
**البناء:** أخضر 0 (بعد d678aa0) — لا إصلاح لازم. **Selftests:** 65/65 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — launch69 `noteCharsLeftReserved` (`7381a9e`، 1 مستعمل)، QA20 `riskCalcSub` (`90d61a5`، 0 «never lose» بـ`locales.ts`)،
chart12 شقّ launch (`3d12429`) ⇒ الصفّ صار chart ← chart للربط (0 مستعمل). **غير مُغلق:** 10 `Alert.alert` بـ5 ملفات، «₴» ×2، `TimeframeBar` صفر `accessibilityState`، `accNetLoadError` 0.
**طلبات تنسيق جديدة (تحقّقتُ):** launch70 → tools `riskCalcSlPipsAmbiguous` 0 مستعمل (`54ff3fa`). نجمة ★ لـlaunch67 (أنس).
**المراجعة (a — تكرار/ميت/تصديرات)، بسكربتين على كل `src`:** (1) تصديرات لا يذكرها ملف آخر: 168 (أغلبها أنواع/ثوابت تُستعمل داخل ملفها — ليست ميتة)؛
المطابقة مرّة واحدة بملفها = ميتة فعلاً: 20، منها القائمة المعروفة (QA1) و**جديد QA21 → chart:** `priceLegend.ts` `planPriceLegend`/`legendCapacity`/`DIRECTIONAL_OVERLAYS`
و`dailyChange.ts` `prevCloseFromDaily` — مستعملة بالـselftest وحده. (2) أسماء `const`/`function` معرَّفة بأكثر من ملف: `TF_SECONDS` بـ`mock.ts:16` نسخة `timeframes.ts:17`
(أُلحقت بصفّ QA1)؛ `RECONNECT_*`/`dirColor`/`QUICK_SYMBOLS` مسجّلة؛ `FIAT`/`METALS` (`positionSize` مقابل `newsRisk`) بغرضين مختلفين — ليست تكراراً.
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة خارج `locales.ts`.

## 2026-09-25 — الدورة 22
**البناء:** أخضر 0 (بعد 6a727de) — لا إصلاح لازم. **Selftests:** 66/66 ناجح (`npx tsx`؛ +1 `overlayTags` من الشارت).
**التحقّق من الإغلاقات بالكود:** مُغلق — launch70 `riskCalcSlPipsAmbiguous` (`PositionSizePanel.tsx:469`، `4133676`)؛ شقّ QA21 `prevCloseFromDaily` (`29c1d91`، 0 مطابقة).
**غير مُغلق:** `priceLegend.ts` ×3 (QA21)، `mcCloneDrawing*` 0 بـ`.tsx` (chart12)، 10 `Alert.alert` بـ5 ملفات، «₴» ×2، `TimeframeBar` صفر `accessibilityState`، `accNetLoadError` 0.
نجمة ★ لـchart12 وQA19 وQA20.
**طلبات تنسيق جديدة (تحقّقتُ):** tools48 → chart (`pipSpec.ts`): `chartPipSpec('USDJPYMICRO'|'USDJPY-CENT'|'GBPJPY_MICRO')` = null بـ`tsx` بينما
`smallContractPair` يقرؤها ⇒ منازل مخمَّنة بالدفتر. قرار أنس جديد من tools48: توسيع الوقف يعيد تعريف 1R (⛔ 15).
**المراجعة (b — نصوص ثابتة خارج `locales.ts`)، بسكربتين:** (1) عربي خارج التعليقات بكل `.ts/.tsx` عدا `locales.ts`: كله بملفات مسجّلة
(Subscription 48، Commission 25، NetworkTree 22، TreeDiagram 10، Messages 13، `timeframes.ts` 8، Account:248) أو افتراضيات توافق
(`dataSource`/`marketHours`/`measureReadout`/`CHART_KINDS`/`DEFAULT_LAYOUT`) — تحقّقتُ أن كل مستدعٍ بالإنتاج يمرّر الترجمة (`LayoutPanel:42`،
`TerminalScreen:941-946`، `FocusChartModal:291-304`، `MatrixChart:4978`، `typeLabels:66`)؛ `academy.ts` له `_en`؛ تعليمات `WeeklyReportPanel` داخلية واللغة تُرسل `lang`.
(2) نص إنجليزي بـJSX/خصائص: 0 سوى «AUTO» (زر المحور، له وصف مترجم) و`placeholder="EURUSD"`. «pip»/«lot» بالقوالب مصطلح المنصّات — مقبول.
**الدورة القادمة:** المراجعة (c) — a11y.

## 2026-09-25 — الدورة 23
**البناء:** أخضر 0 (بعد 233e090، وأُعيد بعد سحب 03b01cf) — لا إصلاح لازم. **Selftests:** 66/66 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — chart12 (`39e26a2`، `MatrixChart.tsx:5422 :11333`)، tools48 (`b962d58`، `chartPipSpec` بـ`tsx` يعيد USDJPY/GBPJPY)،
QA21 (`d8446d0`؛ `DIRECTIONAL_OVERLAYS` باقٍ عمداً — استثناء لوني دلالي). **غير مُغلق:** 10 `Alert.alert` بـ5 ملفات، «₴» ×2، Rails/Dock/SidePanel/`TimeframeBar` صفر `accessibilityState`، `accNetLoadError` 0.
**طلبات تنسيق جديدة (تحقّقتُ):** launch72 → tools `riskCalcPipValueAtStop`/`Hint` 0 مستعمل (`233e090`).
**المراجعة (c — a11y)، بسكربت على كل `.tsx`:** كل `Pressable`/`Touchable*`/`Switch`/`TextInput` له `accessibilityLabel` أو `<Text>` ابن عدا `MatrixSidePanel.tsx:83`
(مسجّلة QA3). لا جديد. `selected` المفقود: 31 كما هو؛ `a11yBusy` بـAlerts/Account/NetworkTree صفر (launch52).
**الدورة القادمة:** المراجعة (d) — أرقام/حدود متناقضة بين الملفات.

## 2026-09-25 — الدورة 24
**البناء:** أخضر 0 (بعد c320213) — لا إصلاح لازم. **Selftests:** 66/66 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — launch72 `riskCalcPipValueAtStop`/`Hint` (`PositionSizePanel.tsx:1431 :1437`، `d33f9ab`)؛ ملاحظة chart
«`fitChannelWidth` باللوغاريتمي» (`55bb0f3`). **غير مُغلق:** 10 `Alert.alert` بـ5 ملفات، «₴» ×2، Rails/Dock/SidePanel/`TimeframeBar` صفر `accessibilityState`، `accNetLoadError` 0.
**طلبات تنسيق جديدة:** لا شيء من السجلات الثلاثة.
**المراجعة (d — حدود متناقضة):** قارنتُ كل `maxLength` بالتطبيق بحقول Pydantic بـ`main.py`: الرموز 12، الملاحظة 500 (`JOURNAL_NOTE_MAX` = :447)، الدردشة 1000 = :135 — متطابقة.
**جديد QA24 → بلا مالك (`AccountScreen`) + أنس:** `AuthRegister` :203-205 (اسم 3–32، كلمة مرور ≥4) بلا `maxLength`/تلميح بالشاشة ⇒ 422 يظهر كـ`registerError`
«تحقّق من الإيميل ورمز الدعوة والاتصال»؛ وحدّ 4 أحرف ضعيف (⛔ 16). `VoteCreate.symbol` 20 مقابل 12 بغيره — غير ضارّ. `MAX_SEARCH_QUERY` 64 لا يستعمله التطبيق.
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول.

## 2026-09-25 — الدورة 25
**البناء:** أخضر 0 (بعد 541ac5d) — لا إصلاح لازم. **Selftests:** 67/67 ناجح (`npx tsx`؛ +1 `connorsRsi` من الشارت).
**التحقّق من الإغلاقات بالكود:** لا إغلاق جديد. **غير مُغلق:** 10 `Alert.alert` بـ5 ملفات، «₴» ×2، Rails/Dock/SidePanel/`TimeframeBar` صفر `accessibilityState`، `accNetLoadError` 0، `main.py:203-205` (QA24).
**طلبات تنسيق جديدة (تحقّقتُ):** chart15 → launch مفاتيح `mcNudge*` (0 بـ`locales.ts`)؛ launch73 → أنس ترخيص مصادر البيانات (⛔ 17).
**المراجعة (e — ما يُحرج أمام متداول)، بوكيل فرعي ثم تحقّقتُ بنفسي:** سليم — أسبوع الفوركس/DST، الجلسات، المنازل، اللوت/الهامش، افتراضيات المؤشرات، الإنجليزية.
**جديد QA25:** (1) `FocusChartModal.tsx:283-288` النسبة = `series.change_pct` (أول شمعة محمّلة) لا `headerChangePct` — أُلحق بصفّ chart3 (بلا مالك)؛
(2) `marketHours.ts:13` `ALWAYS_OPEN` حرفي ⇒ SOLUSD/BTCUSDT «مغلق» السبت (→ chart)؛ DXY/UKOIL بلا استراحة ICE اليومية — محتمل، لم يُتحقّق من ساعات البورصة؛
(3) `reportJournalDataLine` «PnL=x%» = مجموع حركة السعر (→ launch + tools)؛ (4) `dailyChange.ts:34` يوم UTC يغذّي رأس الشارت ⇒ يناقض خطّ PDC — أُلحق بـtools38 (أنس).
**الدورة القادمة:** المراجعة (a) — تكرار/ميت/تصديرات.
**إلحاق:** وصل launch `c5e3991` (`journalStopTypoFix` ×3) أثناء الدفع ⇒ tools86 أُغلق بالكود؛ البناء أخضر 0. المفتوح على وكيل: launch129 وحده.
**إلحاق بعد سحب launch74:** QA24 شقّ الرسالة مُغلق (`aff9f14`، `locales.ts:1148 :2219`)؛ `maxLength` بالشاشة وحدّ كلمة المرور باقيان. البناء أُعيد: أخضر 0.

## 2026-09-25 — الدورة 26
**البناء:** أخضر 0 (بعد 8473457) — لا إصلاح لازم. **Selftests:** 70/70 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — QA25 سطر التقرير الأسبوعي (`e8bf12a`، `locales.ts:1541 :2614`، «مجموع حركة السعر»)؛ chart15 مفاتيح `mcNudge*` (`f72bee3`، 20 بـ`locales.ts`)
⇒ الصفّ صار chart ← chart للربط (0 بـ`.tsx`). **غير مُغلق:** `FocusChartModal:283-288` `series.change_pct`، `marketHours.ts:13` حرفي، 10 `Alert.alert` بـ5 ملفات، «₴» ×2، `accNetLoadError` 0.
**طلبات تنسيق جديدة:** لا شيء من السجلات الثلاثة (launch75 ردّ فقط).
**المراجعة (a — تكرار/ميت/تصديرات)، بسكربتين على كل `src`:** (1) التصديرات التي لا يذكرها ملف آخر ولا تُستعمل بملفها = القائمة المعروفة (QA1) +
`DIRECTIONAL_OVERLAYS` (مقصود)؛ `OnboardingOverlay`/`CoursesScreen`/`onboarding.ts` إيجابيات كاذبة (يستوردها `App.tsx` خارج `src`). (2) أسماء مكرّرة بأكثر من ملف:
**جديد QA26 → chart + tools + بلا مالك:** `BASES` ×3 (`TerminalScreen:99`، `FocusChartModal:56` 21 رمزاً، `QuadChartModal:48` 6 فقط ⇒ `?? 1` يرسم AUDUSD/USOIL حول 1.0 بالرباعي بلا اتصال).
`PREFS_KEY` ×2 مفتاحان مختلفان، `NO_INDICATORS` ×2 ثابت فارغ، `TTL_MS`/`FAIL_TTL_MS` بغرضين — غير ضارّة.
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة خارج `locales.ts`.

## 2026-09-25 — الدورة 27
**البناء:** أخضر 0 (بعد 70787c1، وأُعيد بعد سحب 8730c5b) — لا إصلاح لازم. **Selftests:** 71/71 ناجح (`npx tsx`؛ +1 `smiErgodic`).
**التحقّق من الإغلاقات بالكود:** مُغلق — QA25 الكريبتو (`c4d17cb`، `isCryptoSymbol` بـ`marketHours.ts`)؛ QA26 الرباعي (`8c483b7`، `chart/mockBases.ts`)؛ chart15
(`51777fd`، `mcNudge*` 5 بـ`.tsx`). **غير مُغلق:** `BASES` محلّي بـ`TerminalScreen:99`/`FocusChartModal:56`، `series.change_pct`، 10 `Alert.alert`، «₴» ×2، `accNetLoadError` 0.
**طلبات تنسيق جديدة (تحقّقتُ):** launch76 ملاحظة √252 ⇒ **QA27 → chart**: Parkinson/GK/RS/YZ/EWMA √252 ثابت بلا فريم (`volatility.ts:871…1077`،
`MatrixChart.tsx:2689-2703`) ⇒ W1 ~2.2× أعلى من HV، D1 أقلّ ~17%. tools (آخر تشغيل): `username` حسّاس للحالة (خادم/أنس ⛔ 19)، `VotePanel` `v.mine` (بلا مالك).
**المراجعة (b — نصوص ثابتة)، بسكربتين (JSX + حرفيات عربية بكل `src`):** الجداول العربية بـ`types.ts`/`dataSource.ts`/`marketHours.ts` احتياط، كل مستهلك يمرّر `t.*`؛
`DEFAULT_LAYOUT` ⇒ `t.layoutBuiltinName`؛ `DEFAULT_TEMPLATE.name` لا يُعرض. المعروف: `SubscriptionPlansPanel`/`CommissionPlan`/`NetworkTree`/`TreeDiagram`/`MessagesScreen` (QA2).
**جديد QA27 → الخادم/أنس (⛔ 18):** `backend/academy_data.py` 45 محاضرة عربية فقط (عنوان، مخطّط، سرد يُرسل للصوت) ⇒ الإنجليزي/الكردي يرى المدرسة بلغته وما تحتها عربي.
**الدورة القادمة:** المراجعة (c) — a11y.

## 2026-09-25 — الدورة 28
**البناء:** أخضر 0 (بعد e4b2cd5) — لا إصلاح لازم. **Selftests:** 72/72 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — QA27 التذبذب (`e4b2cd5`، الخمسة تأخذ `volAnnual` بـ`MatrixChart.tsx:2696-2711 :2848`، لا مستدعٍ آخر)؛ QA26 شقّ الطرفية
(`48f582b`، `MOCK_BASES`)؛ QA27 الأكاديمية شقّ الوسم (`d08f8dc`/`d20796d`) وصُحّح العدد لـ44 (launch77). **غير مُغلق:** `FocusChartModal:56` `BASES`، 10 `Alert.alert`، «₴» ×2، `accNetLoadError` 0.
**طلبات تنسيق جديدة (تحقّقتُ):** launch77 → الخادم/أنس: قوالب الردّ بلا ذكاء اصطناعي `main.py:1671 :1798` تفرّع `en` فقط ⇒ الكردي بالعربية (مقصود بتعليق :1800).
**المراجعة (c — a11y)، بسكربت على كل `.tsx`:** لا عنصر تفاعلي بلا اسم عدا `MatrixSidePanel.tsx:83` (مسجّل). حدّثتُ أرقام أسطر `selected` المفقود بـ`AlertsPanel` (:943 :961) و`VotePanel` (:258 :273). لا جديد.
**الدورة القادمة:** المراجعة (d) — أرقام/حدود متناقضة بين الملفات.
**إلحاق بعد سحب cb168fd:** QA25 DXY/UKOIL مُغلق (`inIceDailyBreak`، selftest يمرّ). البناء أُعيد: أخضر 0.

## 2026-09-25 — الدورة 29
**البناء:** أخضر 0 (بعد 5ebbbc1) — لا إصلاح لازم. **Selftests:** 73/73 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** ⛔ أنس 15 (توسيع/مسح الوقف و1R) نفّذه tools `5ebbbc1` (`noteWithInitialStop` يُلحق «1R @» عند التوسيع والمسح، selftest يمرّ) ⇒ حُذف من STATUS
مع ملاحظة «قل إن أردت غيره». `8c0255c` CL-OIL ⇒ أخبار USD. **غير مُغلق:** 10 `Alert.alert` بـ5 ملفات، «₴» ×2، `FocusChartModal:56` `BASES`، `series.change_pct`.
**طلبات تنسيق جديدة (تحقّقتُ):** launch78 — `accNetLoadError` غير موصول لا ميت (`AccountScreen.tsx:248` حرفي عربي) ⇒ نُقل من صفّ QA1 إلى صفّ QA2.
**المراجعة (d — أرقام/حدود متناقضة)، بوكيل فرعي ثم تحقّقتُ من `main.py` والشاشات:** سليم — pip (`positionSize.ts` = `backtest.py`)، افتراضيات المؤشرات، 500/1000، `outputsize`.
**جديد QA29:** (1) سؤال AI/المحاضرة 2–2000 بالخادم (`main.py:174 :184`) والشاشتان بلا حدّ ⇒ 422 يُعرض «غير متاح» والسؤال مُسح (بلا مالك)؛
(2) اسم التخطيط ≤64 (`main.py:227`) و`LayoutPanel.tsx:136` بلا `maxLength` + `catch` صامت (→ chart)؛ (3) رمز التنبيه 3–12 و`AlertsPanel.tsx:503` `!sym` فقط،
التصويت 1–20 (`main.py:139`) خلاف كل رمز آخر، الماسح «80 شمعة» = 79 (بلا مالك + الخادم).
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول.

## 2026-09-25 — الدورة 30
**البناء:** أخضر 0 (بعد d9fae48، وأُعيد بعد سحب 1243060) — لا إصلاح لازم. **Selftests:** 74/74 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — QA29 اسم التخطيط (`6f9f3da`، `maxLength={64}` + قصّ)؛ QA29 «80 شمعة» (`c947183`). **غير مُغلق:** `AiPanel`/`LectureClassroom` بلا
`maxLength`، رمز التنبيه 3–12، 10 `Alert.alert` بـ5 ملفات، «₴» ×2، `FocusChartModal:56` `BASES`. tools52 أغلق بنفسه BTC +100000R (`2dc8c9a`) وSHIB (`65026c1`) وسباق الدفتر (`323c650`).
**طلبات تنسيق جديدة:** launch80 ردّ فقط. مشتبه tools52 (Screener) تحقّقتُ منه: حقيقي ⇒ صفّ لـtools.
**المراجعة (e — ما يُحرج أمام متداول)، بأربعة وكلاء فرعيين ثم تحقّقتُ بالكود وبقوائم Twelve Data العامة (بلا مفتاح):**
**جديد QA30:** (1) `twelve_data.py:31` `BRENT/USD` غير موجود (الصحيح `XBR/USD`)، و`:34`/`twelve_data_ws.py:25` `DX-Y.NYB` لا مقابل له ⇒ DXY/UKOIL تجريبيان دائماً (الخادم/أنس ⛔ 19)؛
(2) `locales.ts:2513` «stop-out» بمعنى ضرب الوقف (→ launch)؛ (3) VWAP D1+ تراكم مستمر لا per-bar كـTradingView (→ chart، منخفض).
**أُسقط بعد التحقّق:** «مجموع %» غير موزون (موسوم «حركة السعر» ويُخفى عند التناقض)؛ تنبيه على مستوى متحقّق (الواجهة تستنتج الاتجاه وتحذّر).
**الدورة القادمة:** المراجعة (a) — تكرار/ميت/تصديرات.
**إلحاق:** وصل launch `c5e3991` (`journalStopTypoFix` ×3) أثناء الدفع ⇒ tools86 أُغلق بالكود؛ البناء أخضر 0. المفتوح على وكيل: launch129 وحده.
**إلحاق الدورة 30 (وكيل فرعي متأخّر، تحقّقتُ):** `indicators.py:68` إشارة MACD من أصفار (backtest/screener)؛ `signal_hub.py:278 :288` تفاصيل `:.5f` عربية خام بالواجهة الإنجليزية؛
منخفض `backtest.py:21` GOLD/USOIL بلا سبريد ⇒ صفّ واحد للخادم/أنس. سليم: pip/لوت/هامش/R/جلسات DST/Pivots/Fibo.

## 2026-09-25 — الدورة 31
**البناء:** أخضر 0 (بعد 6dd7a29) — لا إصلاح لازم. **Selftests:** 75/75 ناجح (`npx tsx`؛ +1 `vwapSession`).
**التحقّق من الإغلاقات بالكود:** مُغلق — QA30 «stop-out» (`2ae6d46`، صفر «stop-out» بـ`locales.ts`)؛ QA30 VWAP D1 (`a37247e`)؛ Screener (`c28204c` `runSeq`).
**غير مُغلق:** 10 `Alert.alert` بـ5 ملفات، «₴» ×2، `FocusChartModal:56` `BASES` و:284-288 `series.change_pct`، `AiPanel`/`LectureClassroom` بلا `maxLength`، `BRENT/USD`، MACD أصفار `indicators.py:66`.
**طلبات تنسيق جديدة:** لا شيء (launch82 ردّ فقط؛ chart21 وtools53 بلا طلب).
**المراجعة (a — تكرار/ميت/تصديرات)، بسكربتين على كل `src`:** التصديرات الميتة = قائمة QA1 + النوع `WatchSymbol` (`watchlist.ts:26`، تافه)؛ `tools-panels/registry.ts` ميت بتعليق صريح.
**جديد QA31 → chart (منخفض):** `ukDst` نسخة خاصة بـ`marketHours.ts:78` من `sessions.ts:33` المُصدَّرة. `FIAT`/`METALS` ×2 لغرضين مختلفين — غير ضارّة.
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة خارج `locales.ts`.

## 2026-09-25 — الدورة 32
**البناء:** أخضر 0 (بعد 699d06d) — لا إصلاح لازم. **Selftests:** 76/76 ناجح (`npx tsx`؛ +1 `renko`).
**التحقّق من الإغلاقات بالكود:** لا commit منذ 6dd7a29 يلمس صفّاً مفتوحاً. **غير مُغلق:** 10 `Alert.alert` بـ5 ملفات (الـ11 بـgrep تعليق `TradeJournalPanel:939`)،
«₴» ×2، `FocusChartModal:56` `BASES` و:284-288 `series.change_pct`، `AiPanel`/`LectureClassroom` بلا `maxLength`، `BRENT/USD`، `ukDst` `marketHours.ts:78`.
**طلبات تنسيق جديدة:** لا شيء (chart22 وlaunch83 ردّ/ملاحظات فقط؛ tools54 وصل بعد الكتابة: Screener أُسقط بالدورة 31 أصلاً، بلا طلب جديد). ملاحظة launch83 `MatrixSidePanel.tsx:162` بلا `selected` مشمولة بصفّ QA3.
**المراجعة (b — نصوص ثابتة)، بسكربتين (حرفيات عربية بكل `.tsx` + label/placeholder/a11y حرفية):** لا جديد خارج QA2. `CHART_KINDS` احتياط قديم يستبدله `localizedChartKinds`.
قوائم العملات العربية/الكردية بـ`positionSize.ts` (`fdf405b`) للقراءة فقط.
**جديد QA32 → chart + launch (منخفض):** `renko`/`kagi`/`pnf` بلا مفتاح بـ`KIND_KEYS` (`typeLabels.ts:24-33`) ⇒ لاتينية بالعربي/الكردي و«P&F» لقارئ الشاشة، والمتجر :51 يقول
«رينكو، كاجي، نقطة ورقم»؛ ومعه المتجر :51 «منطقة» والتطبيق «مساحة» (`290e166`).
**الدورة القادمة:** المراجعة (c) — a11y.

## 2026-09-25 — الدورة 33
**البناء:** أخضر 0 (بعد 374d92e) — لا إصلاح لازم. **Selftests:** 76/76 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — QA31 `ukDst` (`c1fd673`، نسخة واحدة `marketHours.ts:81` و`sessions.ts` يستوردها)؛ QA32 جانب launch (`2ff22c8` مفاتيح
`ctlKindRenko/Kagi/Pnf` ×3 + `STORE-LISTING.md:51` «مساحة») ⇒ الصفّ صار لـchart وحده (ربط `KIND_KEYS`). **غير مُغلق:** 10 `Alert.alert` بـ5 ملفات، «₴» ×2،
`FocusChartModal:56` `BASES`، `AiPanel`/`LectureClassroom` بلا `maxLength`، `BRENT/USD`.
**طلبات تنسيق جديدة (تحقّقتُ):** launch84 → tools (منخفض): «40 يورو» بحساب دولار ⇒ `parseRiskInput` `null` كالنصّ غير المقروء ⇒ رسالة عامة؛ lookbehind بـ`moneyWordsToMarks` خطوة جهاز 298.
**المراجعة (c — a11y)، بسكربت على كل `.tsx` + diff منذ الدورة 28:** لا جديد — `MatrixSidePanel.tsx:83` فقط (QA3)؛ `TradeJournalPanel:1755` إيجابية كاذبة (`>` بتعليق). أزرار ▲▼◀▶ المطوّلة لها أسماء.
**الدورة القادمة:** المراجعة (d) — أرقام/حدود متناقضة بين الملفات.

## 2026-09-25 — الدورة 34
**البناء:** أخضر 0 (بعد 5a1c967) — لا إصلاح لازم. **Selftests:** 78/78 ناجح (`npx tsx`؛ +`chandeKroll` +`tvWarmup`).
**التحقّق من الإغلاقات بالكود:** مُغلق — launch84 (`33b3566` `moneyInOtherCurrency`، 18 اختباراً). **غير مُغلق:** 10 `Alert.alert` بـ5 ملفات، «₴» ×2، `FocusChartModal:56` `BASES`،
`AiPanel`/`LectureClassroom` بلا `maxLength`، `BRENT/USD`، QA32 `KIND_KEYS` بلا renko/kagi/pnf.
**طلبات تنسيق جديدة (تحقّقتُ):** launch85 → tools: ربط `riskCalcSlPointsHint`/`riskCalcOtherCcyHint` (صفر استعمال خارج `locales.ts`). chart23 وtools55 بلا طلب.
**المراجعة (d — أرقام/حدود متناقضة)، بوكيل فرعي على commits منذ 374d92e ثم تحقّقتُ بالكود:**
**جديد QA34 → chart:** `resetChartView`/`axisTapped` (`MatrixChart.tsx:4459 :4513`) بلا `restXPan` بالـdeps ⇒ `canPan` قديم ⇒ AUTO بلا هامش يمين لشارت رُكّب تابعاً. منخفض جداً: تعليق
`chandeKroll.selftest.ts:21` حسابه خاطئ (18≠17) ولا يفحص [17]؛ `price-transform.ts:412` «band». **أُسقط:** الدفتر `maxLength=10` مع «10.000 lots» (11) — المقصوص يُقرأ صحيحاً.
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول.

## 2026-09-25 — الدورة 35
**البناء:** أخضر 0 (بعد e93cc1c) — لا إصلاح لازم. **Selftests:** 80/80 ناجح (`npx tsx`؛ +`klingerTv` +`kagiPnfAtr`).
**التحقّق من الإغلاقات بالكود:** مُغلق — QA32 (`44d0096` `typeLabels.ts:34-36`)؛ QA34 (`ef40f4a` `restXPan` بـdeps :4459 :4514)؛ launch85 (`2bc7267`/`79057a9`،
`PositionSizePanel.tsx:487 :489 :533`). **غير مُغلق:** 10 `Alert.alert` بـ5 ملفات، «₴» ×2، `FocusChartModal:56` `BASES`، `AiPanel`/`LectureClassroom` بلا `maxLength`، `BRENT/USD`.
**طلبات تنسيق جديدة (تحقّقتُ):** launch86 → tools (منخفض): `PositionSizePanel.tsx:534` وسم العمولة الطويل ⇒ `t.planNoteCommission`. chart24 وtools بلا طلب.
**المراجعة (e — ما يُحرج أمام متداول)، على commits منذ 5a1c967:** Klinger/Kagi/P&F/Range/نصّ الجولة سليمة مقابل TradingView.
**جديد QA35 → chart (متوسّط):** `withVolume` (`types.ts:466`) يختلق حجم الفوركس بعامل دوري `(i*17)%40` مرتبط بالفهرس ⇒ مؤشرات الحجم كلها (OBV/Klinger/MFI/CMF…) من
حجم مختلَق بدورة 40 شمعة وهمية، والقيم تتغيّر حين يُحمَّل تاريخ أقدم؛ ولا «≈» إلا بلوحة `VOL`.
**الدورة القادمة:** المراجعة (a) — تكرار/ميت/تصديرات.
**إلحاق:** وصل launch `c5e3991` (`journalStopTypoFix` ×3) أثناء الدفع ⇒ tools86 أُغلق بالكود؛ البناء أخضر 0. المفتوح على وكيل: launch129 وحده.

## 2026-09-25 — الدورة 36
**البناء:** أخضر 0 (بعد 0d7a26f) — لا إصلاح لازم. **Selftests:** 80/80 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — launch86 (`0d7a26f`، `PositionSizePanel.tsx:541`). **غير مُغلق:** QA35 (المفتاحان `mcEstimatedTag`/`mcVolEstimatedHint` جاهزان وغير موصولين،
`withVolume` بلا تغيير)، 10 `Alert.alert` بـ5 ملفات، «₴» ×2، `FocusChartModal:56` `BASES`، `AiPanel`/`LectureClassroom` بلا `maxLength`، `BRENT/USD`.
**طلبات تنسيق جديدة:** لا شيء (launch87 ردّ فقط؛ chart وtools لم يكتبا سجلاً لـcommits `05de326`/`7fa422f`/`0d7a26f` بعد).
**المراجعة (a — تكرار/ميت/تصديرات)، بسكربت على كل `src` + diff منذ e93cc1c:** التصديرات الميتة = قائمة QA1 نفسها؛ لا نسخ جديدة.
**جديد QA36 → chart (متوسّط):** `rangeBars` (`05de326`) أرضية صندوق `1e-8` مطلقة + حلقة إغلاق حتى حارس 100000 لكل نقطة سعر ⇒ تاريخ مسطّح ثم شمعة +1%
= 100,001 شمعة (جرّبتُها؛ قبلها ≈21) ⇒ تجمّد محتمل مع مزوّد متوقّف، والحارس يقصّ بصمت.
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة خارج `locales.ts`.

## 2026-09-25 — الدورة 37
**البناء:** أخضر 0 (بعد 855d1e8) — لا إصلاح لازم. **Selftests:** 80/80 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** مُغلق — QA36 (`855d1e8` `MIN_BOX_FRACTION = 5e-5` + `RANGE_MAX_BARS` مع قفز): تاريخ مسطّح ثم +1% BTC = 199 شمعة وآخر إغلاق 60600 صحيح؛
صندوق صريح 1e-9 على قفزة 1.08→2.2 = 5000 شمعة بـ4ms وآخر إغلاق صحيح. **غير مُغلق:** QA35 (`withVolume` `types.ts:482` بلا تغيير، OBV :8617 بلا «≈») ⇒ ★ عالق؛
10 `Alert.alert` بـ5 ملفات، «₴» ×2، `FocusChartModal:56` `BASES`، `AiPanel`/`LectureClassroom` بلا `maxLength`، `BRENT/USD`.
**طلبات تنسيق جديدة (تحقّقتُ):** launch88 → tools: ربط `riskCalcSlLooksLikePrice`/`riskCalcStopPxLooksLikePips`/`levelLooksLikePipsHint` (صفر استعمال خارج `locales.ts`). tools56/57 ردّ فقط.
**المراجعة (b — نصوص ثابتة)، diff منذ 0d7a26f + مسح حرفيات عربية بكل `.tsx`:** لا جديد خارج QA2 (الباقي تعليقات JSX متعدّدة الأسطر). الجديد الوحيد: رسائل
`PositionSizePanel`/`TradeJournalPanel` المركّبة `… → N pip = X?` بـ«pip» لاتينية للعربي/الكردي — مشمولة بصفّ launch88.
**الدورة القادمة:** المراجعة (c) — a11y.
**إلحاق بعد الدفع:** وصلت `da0f2f8` (QA35) و`e927eaa` (launch88) و`a318e43` أثناء الدورة — تحقّقتُ بالكود (لا `(i*17)%40`، OBV `volName` «≈»، المفاتيح الثلاثة موصولة) ⇒ أُسقط الصفّان. البناء أخضر 0 وselftests 80/80 بعدها.

## 2026-09-25 — الدورة 38
**البناء:** أخضر 0 (بعد 5453b82) — لا إصلاح لازم. **Selftests:** 80/80 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** launch89 أنجزه tools (`bd38290`، `NewsRiskBanner.tsx:143`) — لم يكن صفّاً. Renko `5453b82`: تاريخ مسطّح ثم +1% BTC = 198 لبنة بـ2ms،
صندوق 1e-9 على قفزة 1.08→2.2 = 4999 لبنة بـ5ms وآخر إغلاق صحيح. **غير مُغلق:** 10 `Alert.alert`، «₴» ×2، `FocusChartModal:56` `BASES`، `AiPanel`/`LectureClassroom` بلا `maxLength`، `BRENT/USD`.
**طلبات تنسيق جديدة:** لا شيء (tools58 وlaunch89 طلبهما أُنجز؛ chart لم يسجّل `fec1906`/`5453b82` بعد).
**المراجعة (c — a11y)، diff `.tsx` منذ 855d1e8:** لا عنصر تفاعلي جديد بلا اسم. **جديد QA38 → tools (منخفض):** شريط الخبر للمفتوحة `TradeJournalPanel.tsx:1284`
بلا شرط `flow` ⇒ تكرار مع شريط الشارت بالرصيف/اللوح، وبـ`flow` مع رمز النموذج نفسه شريطان `alert` ⇒ إعلان مزدوج لقارئ الشاشة.
**الدورة القادمة:** المراجعة (d) — أرقام/حدود متناقضة.
**إلحاق بعد الدفع:** وصلت `123a1d1` (سطر التراكم قبل الدخول بجملة مترجمة بدل «3 (+1)») و`12b88e5` (خطوات 323–325) — البناء أخضر 0 بعدها و`tradePlan.selftest` ناجح؛ STATUS حُدِّث.

## 2026-09-25 — الدورة 39
**البناء:** أخضر 0 (بعد b2d44e9) — لا إصلاح لازم. **Selftests:** 83/83 ناجح (`npx tsx`؛ +`eomTv` +`rviSignal` +`volumeOscTv`).
**التحقّق من الإغلاقات بالكود:** لا إغلاق جديد. **غير مُغلق:** QA38 (`TradeJournalPanel.tsx:1284` بلا شرط `flow`)، 10 `Alert.alert`، «₴» ×2، `FocusChartModal:56` `BASES`،
`AiPanel`/`LectureClassroom` بلا `maxLength`، `BRENT/USD`، `TimeframeBar` بلا `accessibilityState`.
**طلبات تنسيق جديدة:** لا شيء (chart26 وlaunch90 ردّ فقط؛ tools لم يسجّل `b2d44e9` بعد).
**المراجعة (d — أرقام متناقضة)، على commits منذ 5453b82:** `b2d44e9` صحيح حسابياً (USDJPY 150، 150 pip ⇒ 148.50، 6.73). سقف 5000 متطابق Range/Renko؛
Kagi/P&F بلا حلقة لكل صندوق ولا حجم من الواجهة. **جديد QA39 → tools+launch (منخفض):** `pipsOnlyExitPrice` يفترض خروجاً تحت الدخول (أسوأ حالة، مقصود)
لكن السطر يقول «عند **وقفك** {price}» ⇒ البائع يُسمّى له سعر ليس وقفه ← مفتاح منفصل لحالة النقاط وحدها. تنظيف: `MIN_BOX_FRACTION` منسوخ `range.ts:19`/`renko.ts:33`.
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول.
**إلحاق بعد الدفع:** وصلت `731262b` (مفاتيح QA39 ×3 لغات، غير موصولة) و`ace75bf` — الصفّ صار لـtools وحده. البناء أخضر 0 بعدها.

## 2026-09-25 — الدورة 40
**البناء:** أخضر 0 (بعد f952b6f) — لا إصلاح لازم. **Selftests:** 84/84 ناجح (`npx tsx`؛ +`netVolumeTv`؛ `drawNudge` الذي أبلغ عنه tools59 فاشلاً صار ناجحاً بعد `00ede5f`).
**التحقّق من الإغلاقات بالكود:** مُغلق — QA38 (`6da30aa`، `TradeJournalPanel.tsx:1287` `shownSymbol` ⇒ `openPositionsNewsRisk` يُسقط اللحظة نفسها)؛ QA39 (`874fbd9`،
`PositionSizePanel.tsx:1517 :1526` `riskCalcPipValueAtPipsExit`+`Hint` حين `stopRate == null`). launch91 → tools = QA39 نفسه، أُنجز. **غير مُغلق:** تنظيف QA39
`MIN_BOX_FRACTION` ×2 (صار صفّاً لـchart وحده)، 10 `Alert.alert`، «₴» ×2، `FocusChartModal:56` `BASES`، `AiPanel`/`LectureClassroom` بلا `maxLength`، `BRENT/USD`، `TimeframeBar`.
**طلبات تنسيق جديدة:** لا شيء (launch91 لـchart: `ctlKindLineBreak`/`mcPercentScaleA11y` جاهزان لميزة لم تُبنَ — إعلام لا طلب).
**المراجعة (e — ما يُحرج أمام متداول)، على commits منذ b2d44e9:** `eecee47` Net Volume = ‎±volume حسب تغيّر الإغلاق‎ كصيغة TradingView، ولوحته بـ`volName` «≈»؛
كل لوحات الحجم (OBV/NVI/PVI/A/D/CMF/Klinger/Twiggs/MFI/…) بـ«≈». `ce86399` `niceLogPriceTicks` مانتيسات مستديرة وتعود لـ`nicePriceTicks` تحت ضعفين.
`4d7c7b3` سليم؛ الحاسبة `lots.toFixed(2)` سليمة لأن `LOT_STEP` = 0.01. **لا بند جديد.**
**الدورة القادمة:** المراجعة (a) — تكرار/ميت/تصديرات.
**إلحاق:** وصل launch `c5e3991` (`journalStopTypoFix` ×3) أثناء الدفع ⇒ tools86 أُغلق بالكود؛ البناء أخضر 0. المفتوح على وكيل: launch129 وحده.

## 2026-09-25 — الدورة 41
**البناء:** أخضر 0 (بعد 5b2a25e) — لا إصلاح لازم. **Selftests:** 84/84 ناجح (`npx tsx`؛ `notifications.selftest` و`newsRisk.selftest` بحالاتهما الجديدة).
**التحقّق من الإغلاقات بالكود:** مُغلق — تنظيف QA39 (`19d7236`: `range.ts:20` `export MIN_BOX_FRACTION`، `renko.ts:4` يستورده، لا نسخة ثانية). `0c18f10`
`USDINDEX`/`UKBRENT` ⇒ USD سليم. **غير مُغلق:** 10 `Alert.alert`، «₴» ×2، `FocusChartModal:56` `BASES`، `AiPanel`/`LectureClassroom` بلا `maxLength`، `BRENT/USD`، `TimeframeBar`.
**طلبات تنسيق جديدة:** لا شيء (launch92 ردّ فقط؛ chart27 بنود «التشغيل القادم» ذاتية لا طلبات).
**المراجعة (a — تكرار/ميت/تصديرات)، مسح آلي لـ923 تصديراً + أسماء الدوال المكرّرة:** التصديرات الميّتة = قائمة QA1 نفسها (+ النوع `WatchSymbol`)؛
`dirColor`/`dirLabel` ×3، `QUICK_SYMBOLS` ×2، `RECONNECT_*` ×2 بلا تغيير. **جديد QA41 → tools (منخفض):** `notifLang` (`notifications.ts:21`، `5b2a25e`) نسخة
حرفية من `deviceLang` (`I18nContext.tsx:23`) و`'matrix.lang.v1'` منسوخ ⇒ مصدر واحد كي لا تعود لغة الإشعار تخالف الواجهة.
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة.
**إلحاق بعد الدفع:** وصلت `47dc67c` (`resolveLang`/`deviceLocaleTag` بـ`locales.ts`، يستعملها `I18nContext`) و`e03df4c`/`edc54a1` وتعديلات `drawingAnchors`/`positionSize` —
البناء أخضر 0 وselftests الثلاثة المعدَّلة ناجحة. QA41 **نصف منجز**: `notifications.ts:20` `notifLang` ما زال نسخة، والمفتاح منسوخ ⇒ الصفّ باقٍ بصيغة محدّثة.

## 2026-09-25 — الدورة 42
**البناء:** أخضر 0 (بعد a1fb55f) — لا إصلاح لازم. **Selftests:** 84/84 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** QA41 القاعدة مُغلقة (`a1fb55f`: `notifications.ts:17` `notifLang = resolveLang`، الاختبار يفرض الهوية). **باقٍ:** `'matrix.lang.v1'`
منسوخ (`notifications.ts:10`، `I18nContext.tsx:15`) ⇒ الصفّ صار تنظيف الثابت وحده. **غير مُغلق:** 10 `Alert.alert`، «₴» ×2، `FocusChartModal:56` `BASES`،
`AiPanel`/`LectureClassroom` بلا `maxLength`، `BRENT/USD`، `TimeframeBar`.
**طلبات تنسيق جديدة (تحقّقتُ):** launch93 → بلا مالك: `WeeklyReportPanel.tsx:46` تعليمة `matrix_advice` «ما رأيك… 5 نصائح مرتبطة بالدولار والذهب» ⇒ صفّ + ⛔ 20.
tools60 (لمالك `I18nContext` يستورد `notifLang`) أُنجز بالعكس في `47dc67c`/`a1fb55f`. chart28 بنود ذاتية.
**المراجعة (b — نصوص ثابتة)، diff منذ 5b2a25e (10 ملفات):** كل الحرفيات الجديدة بـ`locales.ts`. ملاحظة منخفضة لـlaunch: `reportFallbackAdvice` الكردي
البند 4 بلا «افتح التقويم» والبند 5 بلا «التي تعرف حركتها» مقارنةً بـar/en. تعليمات `WeeklyReportPanel` العربية للنموذج مقصودة (الخادم يُجيب بـ`lang`).
**الدورة القادمة:** المراجعة (c) — a11y.

## 2026-09-25 — الدورة 43
**البناء:** أخضر 0 (بعد a9e520e) — لا إصلاح لازم. **Selftests:** 84/84 ناجح (`npx tsx`؛ `indicatorWindow.selftest` بحالاته الجديدة).
**التحقّق من الإغلاقات بالكود:** لا صفّ أُغلق. QA20 نصفه النصّي أُنجز (`4609ed4` «درجة الاتفاق»)، الرقم ما زال يُعرض ⇒ الصفّ باقٍ. **غير مُغلق:** 10 `Alert.alert`،
«₴» ×2، `FocusChartModal:56` `BASES`، `matrix.lang.v1` ×2، `AiPanel`/`LectureClassroom` بلا `maxLength`، `BRENT/USD`، `TimeframeBar`، `WeeklyReportPanel:46`.
**طلبات تنسيق جديدة (تحقّقتُ):** chart-r29 → tools: `TerminalScreen.tsx:762 :790` `{ ...copy[index], timeframe: nextTf }` يوسم شموع الفريم القديم بالجديد ⇒ صفّ جديد.
chart-r29 عن `FocusChartModal` (بلا تحديث 90ث، `:400` يفكّ الشارت) و`useMultiLiveTicks` (بلا كشف مقبس صامت/إعادة اتصال) ⇒ دُمجت بصفّي chart3/chart2.
tools61 وlaunch94 ردّ فقط.
**المراجعة (c — a11y):** diff منذ 106341a بلا عناصر تفاعلية جديدة. مسح آلي لكل `Pressable`/`TouchableOpacity`/`TextInput`/`Switch` (تحليل الوسم بعمق الأقواس):
كلّها بـ`accessibilityLabel` أو نصّ ابن — **لا بند جديد**. الناقص `accessibilityState` فقط (QA3/QA13/QA2، بلا تغيير).
**إلحاق (تعارض دمج على COORDINATION):** وصل chart 56 (`e216316`) بثلاثة صفوف chart-r56، وtools `6ef8432` بإصلاح (1)(2). تحقّقتُ بالكود:
(1)(2) أُغلقا (`TerminalScreen.tsx` `key="single"`، `:201` `cachedSeries`، `:671` `allSettled`)؛ (3) مفتوح لـui+tools (`AlertsPanel.tsx:294`، `WatchlistPanel.tsx:385`
`instrumentSpec`)؛ Mass Index ← أنس (⛔17). أعدتُ البناء والـselftests على 6ef8432: أخضر 0، 101/101.
**إلحاق 2:** وصل backend 35 (`92d6edf`، `e4abf4d` — `backend/` فقط، لا أثر على tsc) بصفّ backend-r35 (TTS بلا مصادقة) — تحقّقتُ: `main.py:1633` `academy_tts(body)` بلا `Depends`،
و`LectureClassroom.tsx:255` يستدعيه مجهولاً ⇒ ⛔18 بـSTATUS.
**الدورة القادمة:** المراجعة (d) — أرقام متناقضة.
**إلحاق بعد الدفع:** وصلت `49c42a5` (launch: البندان 4–5 الكرديان بـ`reportFallbackAdvice` يطابقان ar/en) ⇒ ملاحظة QA42 المنخفضة مُغلقة. البناء أخضر 0 بعدها.

## 2026-09-25 — الدورة 44
**البناء:** أخضر 0 (بعد 4578fcc) — لا إصلاح لازم. **Selftests:** 86/86 ناجح (`npx tsx`؛ جديدان `waveTrendTv`/`zigzagLegs`، و`positionSize`/`tradePlan` بحالات mini).
**التحقّق من الإغلاقات بالكود:** لا صفّ أُغلق. **غير مُغلق:** 10 `Alert.alert`، «₴» ×2، `FocusChartModal:56` `BASES`، `TerminalScreen:762 :790`، `matrix.lang.v1` ×2،
`AiPanel`/`LectureClassroom` بلا `maxLength`، `BRENT/USD`، `TimeframeBar`، `WeeklyReportPanel:46`.
**طلبات تنسيق جديدة:** لا شيء (launch95 ردّ فقط؛ chart «خارج نطاق ملفاتي» = صفوف chart-r29/chart2/chart3 القائمة؛ tools: `.mini` نفّذه بنفسه `aa19298`).
**المراجعة (d — أرقام متناقضة)، diff منذ 49c42a5:** `aa19298`/`4578fcc` بـ`tsx` على 8 رموز (`.mini`، `mini` ملاصقة، `-MINI`، `GOLD_mini`، `XAUUSD.mini`،
`USDJPY.mini`، `GER40.mini`، `.m`): `journalSpec`/`quoteSymbol`/`journalSymbol`/`isMiniJournalSymbol` متّسقة، `journalPnl` null لـmini، `.m` باقٍ عادياً. `recentLotSizes`
يفصل mini بالاتجاهين. **جديد QA44 → tools (منخفض):** الحاسبة ترفض mini لكن تعرض `riskCalcBadSymbol` العامّ (مثاله «EURUSD.m») ⇒ نصّ خاصّ.
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول.
**إلحاق (بعد e86bcf4):** وصلت `37eaee5`/`13b5b64` (tools) و`70e3ce9`/`5fc5dea`/`e86bcf4` (launch) — البناء أخضر 0 وselftests 86/86. tools62 (تحقّقتُ):
`chartPipSpec` null لـ«EURUSD-MINI»/«_MINI» ⇒ دُمج بصفّ QA44 لـchart، ومفتاح نصّ mini لـlaunch؛ `main.py:1351-1363` احتياط `data_kind: "cache"` بلا `as_of` ⇒
دُمج بصفّ كاش الخادم. launch: حزم Expo متأخّرة (RELEASE §0) ⇒ ⛔ 3 بـSTATUS.

## 2026-09-25 — الدورة 45
**البناء:** أخضر 0 (بعد b7a9d02) — لا إصلاح لازم. **Selftests:** 87/87 ناجح (`npx tsx`؛ جديد `zigzagLegend`، و`pipSpec`/`positionSize` بحالات جديدة).
**التحقّق من الإغلاقات بالكود:** مُغلق — chart-r29 (`f57f9e2`، `TerminalScreen.tsx:763 :794` `if (hit)` فقط ⇒ الوسم القديم يبقى حتى الجلب)؛ QA44 (2)
(`28cbadb`، `chartPipSpec` ← `miniAccountSymbol`). **نصف منجز:** QA44 (1) — `fac5e1d` مفتاح `riskCalcMiniSymbol` بثلاث لغات، لكنه بلا مستعمل
(`PositionSizePanel.tsx:1203` ما زال `riskCalcBadSymbol`) ⇒ الصفّ صار لـtools (الوصل). كاش الخادم: العميل جاهز (`a9d9fdb` يقرأ `as_of`)، الخادم ما زال بلا `as_of`.
**★ جديدة (≥3 دورات):** QA24، QA26، QA29 ×2، QA30 ×2، QA41، launch93. **غير مُغلق:** 10 `Alert.alert`، «₴» ×2، `FocusChartModal:56`، `matrix.lang.v1` ×2،
`BRENT/USD`، `TimeframeBar`، `WeeklyReportPanel:46`.
**طلبات تنسيق جديدة:** لا شيء (launch97 ردّ + الوصل لـtools = صفّ QA44؛ tools62 لـchart أُنجز؛ chart30 بنود ذاتية).
**المراجعة (e — ما يُحرج أمام متداول)، diff منذ 4578fcc:** `98e25a3` Woodie = (H+L+2×افتتاح الجارية)/4 كـTradingView؛ `37eaee5` رقم صحيح تحت الدخول
>20% ⇒ نقاط (لا يحدث وقف/هدف حقيقي بهذا البعد لزوج أو معدن)؛ `13b5b64` ربح الأساس=عملة الحساب ÷ الهدف صحيح؛ `8ca9577` `zigzagLegendText` بـ`tsx`
على 7 رموز (EURUSD «≈540.0 pip»، USDJPY «≈787.0»، ذهب «≈1325»، BTC/GER40/DXY بالسعر) صحيحة. **لا بند جديد.**
**الدورة القادمة:** المراجعة (a) — تكرار/ميت/تصديرات.
**إلحاق:** وصل launch `c5e3991` (`journalStopTypoFix` ×3) أثناء الدفع ⇒ tools86 أُغلق بالكود؛ البناء أخضر 0. المفتوح على وكيل: launch129 وحده.

## 2026-09-25 — الدورة 46
**البناء:** أخضر 0 (بعد 25f2dc0) — لا إصلاح لازم. **Selftests:** 87/87 ناجح (`npx tsx`؛ `pivotBase`/`positionSize`/`tradePlan` بحالات جديدة).
**التحقّق من الإغلاقات بالكود:** مُغلق — QA44 (`c23a162`، `PositionSizePanel.tsx:1211` `riskCalcMiniSymbol` حين `!spec && miniAccountSymbol`؛ الدفتر عمداً بلا وصل).
**غير مُغلق (grep):** 10 `Alert.alert` (الـ11 الظاهرة إحداها تعليق `TradeJournalPanel:1031`)، «₴» ×2، `FocusChartModal:56` `BASES`، `matrix.lang.v1` ×2،
`BRENT/USD`، `TimeframeBar`، `WeeklyReportPanel:46`.
**طلبات تنسيق جديدة (تحقّقتُ):** tools63 منخفضة ⇒ صفّ واحد: `formatPrice` سقف 10 منازل (`tsx`: 1.23e-9 ⇒ «0.0000000012») لـchart؛ مفتاحا نصّ (mini بالدفتر،
سبريد بالنقاط) لـlaunch. launch98 ردّ فقط. chart: «خارج نطاق ملفاتي» = صفوف قائمة.
**المراجعة (a — تكرار/ميت/تصديرات)، diff منذ b7a9d02 (10 ملفات):** التصديرات الست الجديدة (`useDailyCurrOpen`، `currentSessionOpenAfter`، `costsForRisk`،
`computedPriceText`، `openQuotesRefreshDue`، `OPEN_QUOTES_REFRESH_AFTER_MS`) كلّها مستوردة. مسح أسماء المستوى الأعلى المكرّرة: لا جديد (`pineEma` ×4 مراجع
اختبار مستقلّة، مقبول). **لا بند جديد.**
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة.

## 2026-09-25 — الدورة 47
**البناء:** أخضر 0 (بعد 316c94e) — لا إصلاح لازم. **Selftests:** 88/88 ناجح (`npx tsx`؛ جديد `lineBreak`، و`axisTicks`/`newsRisk`/`tradePlan`/`zigzagLegend` بحالات جديدة).
**التحقّق من الإغلاقات بالكود:** لا صفّ أُغلق. tools63: مفاتيح launch (`c7ee34c`) موجودة بثلاث لغات لكن `journalMiniNoMoney`/`riskCalcSpreadPointsHint` بلا مستعمل
(grep) ⇒ الصفّ صار وصلاً لـtools + `formatPrice` لـchart (ما زال سقف 10). **غير مُغلق:** 10 `Alert.alert`، «₴» ×2، `FocusChartModal:56`، `matrix.lang.v1` ×2،
`BRENT/USD`، `TimeframeBar`، `WeeklyReportPanel:46`.
**طلبات تنسيق جديدة (تحقّقتُ):** launch99 → chart: وصل `mcZigzagDevA11y` (`MatrixChart.tsx` ما زال `` `ZigZag ${zigzagDev}% → …` ``) ⇒ دُمج بصفّ tools63.
launch99 (a): `openCurrencyExposure` (`tradePlan.ts:1707`) بلا مستعمل خارج ملفه ⇒ أُضيف لصفّ التصديرات الميتة. tools64/chart32 بنود ذاتية.
**المراجعة (b — نصوص ثابتة)، diff منذ 25f2dc0 (18 ملفاً):** `mcPercentScaleA11y` (`MatrixChart.tsx:6109`) و`ctlKindLineBreak` (`typeLabels.ts:37`) موصولان.
«Log»/«%»/`label: 'Line Break'` (`types.ts:269`، يُترجم عبر `typeLabels`) مقبولة. الوحيد: اسم a11y لشريحة ZigZag حرفي — المفتاح جاهز (أعلاه). **لا بند إضافي.**
**الدورة القادمة:** المراجعة (c) — a11y.
**إلحاق (بعد f80d388):** وصلت `933d73a` (launch: `LANG_STORAGE_KEY` مُصدَّر) و`f80d388` (chart: وسم التقاطع بالنسبة). البناء أخضر 0. صفّ QA41 صار: `notifications.ts:10` يستورد الثابت (tools).

## 2026-09-25 — الدورة 48
**البناء:** أخضر 0 (بعد 5bf9b70) — لا إصلاح لازم. **Selftests:** 88/88 ناجح (`npx tsx`؛ `newsRisk`/`positionSize`/`tradePlan` بحالات جديدة).
**السكربت:** أُثبت تعديل `qa-build-check.sh` المعلَّق (قفل `flock` مشترك `/tmp/matrix-tsc.lock` كي لا تتزاحم فحوص الوكلاء، ذاكرة 2048).
**التحقّق من الإغلاقات بالكود:** tools63 — شقّ tools أُغلق (`PositionSizePanel.tsx:556` `riskCalcSpreadPointsHint`، `TradeJournalPanel.tsx:1870` `journalMiniNoMoney`)،
و`formatPrice` لـchart أُغلق (`73aabd9`، `magnitudeDecimals(1e-30)=20` بالاختبار) ⇒ الصفّ صار chart وحده (`mcZigzagDevA11y`). QA41: tools65 يقول «`locales.ts` لا يصدّر»
— خطأ، `locales.ts:4525` يصدّر `LANG_STORAGE_KEY` ⇒ الصفّ يوضّح ذلك لـtools. **غير مُغلق:** 10 `Alert.alert`، «₴» ×2، `FocusChartModal:56`، `notifications.ts:10`،
`BRENT/USD`، `TimeframeBar`، `WeeklyReportPanel:46`.
**طلبات تنسيق جديدة (تحقّقتُ):** tools65 → launch: `priceAmbiguousThousandsHint` «هل النقطة…» (ar/en/ku) يظهر الآن تحت «157,250» ⇒ صفّ جديد. launch100: قرار إرسال الأعطال ⇒ ⛔ 21.
chart33 بنود ذاتية.
**المراجعة (c — a11y)، diff منذ f80d388 + `9b1c2ba`:** `AppErrorBoundary` (زرّ «إعادة المحاولة» باسم، `alert`/`header`، سطر `selectable`) سليم.
**جديد QA48 → launch+chart (منخفض):** شريحة عدد Line Break `accessibilityLabel={`${k.label} ${lineBreakCount} → …`}` حرفي كشريحة ZigZag ⇒ دُمج بصفّ tools63.
**إلحاق 2:** وصل backend 35 (`92d6edf`، `e4abf4d` — `backend/` فقط، لا أثر على tsc) بصفّ backend-r35 (TTS بلا مصادقة) — تحقّقتُ: `main.py:1633` `academy_tts(body)` بلا `Depends`،
و`LectureClassroom.tsx:255` يستدعيه مجهولاً ⇒ ⛔18 بـSTATUS.
**الدورة القادمة:** المراجعة (d) — أرقام متناقضة.
**إلحاق (تعارض دمج مع 452960a):** وصلت أثناء الدورة `6fee41e` (launch: «الفاصل» ⇒ طلب tools65 مُنجز قبل أن أرفعه)، `aea854c` (chart: `mcZigzagDevA11y` موصول)،
`b08a1da` (chart: `RECONNECT_*` مُصدَّران)، `0faf734` (launch: `mcLineBreakCountA11y` = بندي QA48 نفسه ⇒ صفّ launch101)، `d17d255` (tools: QA41 مُغلق)، و`452960a`
(chart-r34 يسند صفوف «بلا مالك» إلى «ui» + يطلب مفاتيح قفل الرسم). تحقّقتُ بالكود وحذفتُ صفوف QA41/tools63 ولم أضف tools65. **«ui» بلا سجلّ في `docs/`** ⇒ ⛔ 1 لأنس.
البناء بعد الدمج أخضر 0.
**إلحاق 2:** `3a66ae1` (chart) وصل `mcLineBreakCountA11y` (`MatrixChart.tsx:5891`، لا `→ ${` حرفي باقٍ) ⇒ صفّ launch101 أُغلق. البناء أخضر 0.

## 2026-09-25 — الدورة 49
**البناء:** أخضر 0 (بعد b3a9ba4) — لا إصلاح لازم. **Selftests:** 88/88 ناجح (`npx tsx`).
**وكيلان جديدان:** `LOG-UI.md` (ui، المالك الافتراضي لكل `mobile/src` خارج chart/tools/i18n) و`LOG-BACKEND.md` (backend) ⇒ ⛔ «ui بلا سجلّ» أُزيل، و«بلا مالك»/«الخادم» صارا ui/backend.
**التحقّق من الإغلاقات بالكود (grep/قراءة):** ui `eb8b265`…`dbb5781` — `Alert.alert` صفر خارج `confirmDestructive`، «₴» تعليقات فقط، `DRAW_MARK`، `TimeframeBar`، `accessibilityState` بالملفات
المذكورة، `useMultiLiveTicks`، رأس `FocusChartModal`/`mockBase`، `QUICK_SYMBOLS`، `CalendarPanel`، `WeeklyReportPanel:48`، `maxLength` (32/12/500/2000)، ترجمة cpp/ntp/tds/subPlans.
backend `f54ba4e`…`46ce46f` — السبريد، 409، `size` null، MACD، ATR، `XBR/USD`، كاش `as_of`، التقويم، إحصاء/ترقيم، NOCASE؛ `main.py` لم يعد يقرّب الوقف لخانتين (QA4). ~30 صفّاً أُغلق.
**باقٍ:** FocusChartModal (90ث + فكّ الشارت)، dirColor ×3، DomLite، تصديرات ميتة، `VotePanel` حظر الذات، صفوف backend/أنس (البنوك، TradingCentral، «خبير»، ملاحظة التنبيه بلا حدّ، التصويت 1–20).
**طلبات تنسيق جديدة:** backend-r1 ×3 (tools/chart+ui/ui) مع مفاتيح launch `b3a9ba4`؛ ui1 (المفاتيح جاهزة ⇒ ui يصل)؛ chart-r34 (مفاتيح القفل جاهزة ⇒ chart يصل).
**المراجعة (d — أرقام متناقضة):**
- **🔴 QA49 → ui:** `analysts[].target` صار null لكل سلسلة demo (`main.py:1329`، `signal_hub.py:223`) و`AnalystsPanel.tsx:149` `formatPrice(a.target)` ⇒ `TypeError: null.toFixed`
  (جرّبتُ `formatPrice(null,'EURUSD')` بـ`tsx`). tsc أخضر لأن `api.ts:643` `target: number`. لم أُصلحه: ليس خطأ بناء، والعرض البديل («—» أم إخفاء) قرار ui.
- tools: `tradePlan.ts:841` يعدّ التعادل خسارة والخادم لا ⇒ نسبتا فوز. backend: هدف المحلّل ±1.2% عشوائي بجانب مستويات ATR.
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول حقيقي.
**إلحاق (تعارض دمج مع 46d3a9f):** وصلت أثناء الدورة backend-r2 (`9b26459` المحلّلون/التواصل `unavailable` بلا بنوك ولا `confidence`؛ `68788a8` البثّ؛ `f00081b` لا أرقام من demo؛
`65a24a4` ملاحظة التنبيه 500) وtools (`52b15bd` التعادل ليس خسارة، `46d3a9f` 409/`size` null/«N من الكل») وlaunch102 (تراجع التقويم: `newsRisk.ts:514` لا يعرف `status: "unavailable"` — تحقّقتُ، مفتوح).
⇒ انهيار QA49 لم يعد قابلاً للحدوث من الخادم الحالي (`analysts: []`) فدُمج بصفّ backend-r2 مع `setDirection(null)` ⇒ «محايد» مضلّل. أُغلقت QA5 (بنوك/منافس)، QA20، QA14، وشقّ tools من backend-r1
عدا «تحميل الأقدم». صفّ `CalendarPanel` دُمج بـlaunch102. ⛔ 2 صار: مصدر مرخَّص أم إخفاء اللوحتين.
**إلحاق 2:** `449c12f` (chart) أغلق شقّ launch102 بالشارت (`newsRisk.ts:515`) ⇒ الصفّ صار ui وحده (`CalendarPanel`). `67ebd17` (tools: سطر DXY بالطرفية). البناء بعد الدمج أخضر 0.

## 2026-09-25 — الدورة 50
**البناء:** أخضر 0 (بعد 923010f) — لا إصلاح لازم. **Selftests:** 88/88 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** أُغلق — ui1 (`AccountScreen.tsx:221`)، chart-r34 (`MatrixChart.tsx:5813 :8670`)، chart3 ★ (`FocusChartModal.tsx:182` 90ث، :435 الشارت مركَّب)،
QA1 ★ `dirColor`/`dirLabel` (`signalDirection.ts`) و`VotePanel` `planSummaryText`، QA11 ★ (`DomLitePanel.tsx:67`)، launch102 (`CalendarPanel.tsx:311`)، شقّ الإشارات من backend-r1.
**باقٍ (تحقّقتُ):** `DataOriginKind` بلا `'unavailable'` (`api.ts:84`)؛ `TerminalScreen.tsx:1833 :1853` يمرّر `lastPrice` (ui2 → tools)؛ «تحميل الأقدم» (tools67 → ui).
**طلبات تنسيق جديدة (تحقّقتُ):** launch103 → ui — **🔴 انهيار**: `AnalystsPanel.tsx:114`/`SocialConsensusPanel.tsx:211` `avg.toFixed(2)` والخادم `signal_hub.py:95` `avg_score: None`؛
tsc أخضر لأن `api.ts:617 :639` `avg_score: number`. ليس خطأ بناء وإصلاحه يغيّر العرض (بديل الاتجاه/المتوسط) ⇒ لم أمسّه، الصفّ أولاً بالجدول. tools67: مفتاح `riskCalcConvInverted` جاهز
(`9bd862f`) ⇒ الصفّ صار لـtools؛ و`{pair}` ×2 بـ`CONV_INVERTED_COPY.ar` مع `.replace` واحد (:1502) مؤكّد. ui2 صفّا tools/backend.
**المراجعة (e — ما يُحرج أمام متداول)، diff منذ 449c12f (24 ملفاً):** الأسوأ الانهيار أعلاه، ثم «{pair}» الحرفي بالعربية، ثم «محايد» بلا بيانات (بصفّ backend-r2). لا نصّ «مضمون/بلا مخاطرة»؛
«نسبة نجاح» بالدفتر/الاختبار الخلفي مع تحذير العيّنة الصغيرة. `.confidence` لا يُعرض بأي لوحة (النوع باقٍ فقط). **لا بند جديد منفصل.**
**الدورة القادمة:** المراجعة (a) — تكرار/ميت/تصديرات.
**إلحاق:** وصل launch `c5e3991` (`journalStopTypoFix` ×3) أثناء الدفع ⇒ tools86 أُغلق بالكود؛ البناء أخضر 0. المفتوح على وكيل: launch129 وحده.
**إلحاق (تعارض دمج مع 0d6c443):** وصلت أثناء الدورة `99f43e9` (ui: launch103 — `status === 'unavailable'` ⇒ «لا مصدر مرخَّص»، `formatScore`، `avg_score: number | null`، «احسب» معطَّل
بلا مصادر؛ `confidence` أُزيل من `api.ts`)، `0d6c443` (tools: `riskCalcConvInverted` بـ`.split('{pair}').join`، النسخة المحلية حُذفت)، backend-r3 (`c06e5c9` QA5 `lang`/`detail_code`/منازل الرمز،
`7941d54` QA29، `ee2d153`/`27f5f8d` QA30) وchart-r35. تحقّقتُ بالكود ⇒ أُغلقت launch103، tools67 (المفتاح)، backend-r2 شقّ ui، QA5 ★، QA29 ★، QA30؛ صفوف chart-r35/backend-r3 الجديدة
أُدرجت، و`DataOriginKind` باقٍ بصفّ chart-r35 (1). STATUS: الانهيار صار «أُصلح أثناء الدورة».
**إلحاق 2:** `6119b24` (tools) كفّ عن تمرير `lastPrice`/`candles` ⇒ صفّ ui2 صار ui وحده (حذف الخاصيتين). البناء أخضر 0.

## 2026-09-25 — الدورة 51
**البناء:** أخضر 0 (بعد f55ff1b) — لا إصلاح لازم. **Selftests:** 89/89 ناجح (`npx tsx`؛ +1 `forecastText`).
**التحقّق من الإغلاقات بالكود:** tools67 (`api.ts:744` `trades({limit,offset})`، `postJson` يرفق `status`)؛ chart-r35 (2) و`disclaimer_code` (`signal_hub.py:280 :302`)؛
backend-r3 التوقّع + launch104 (1) (`IndicatorForecastPanel.tsx:104` `lang`، `chart/forecastText.ts`)؛ 422 التصويت (`VotePanel.tsx:146`)؛ ui3 → chart (`ec57a4a`) و→ launch؛ tools68 → launch؛
backend-r2 (2)(3)(4)؛ backend-r4 شقّ الخادم (`db.py:1207 :1283` `mine`). ~10 صفوف أُغلقت.
**تجربة:** وسّعتُ `DataOriginKind` بـ`'unavailable'` مؤقّتاً (`api.ts:84`) ⇒ tsc 0 أخطاء ⇒ أعدتُه (ليس خطأ بناء، ملك ui). الموانع زالت ⇒ الصفّ لـui وحده ★.
**دمج الصفوف:** `DataOriginKind` ×4 ⇒ 1 (ui ★)؛ حظر الذات ×3 ⇒ 1 (ui ★: نوع الفكرة بلا `mine`، `VotePanel.tsx:26`)؛ «تحميل الأقدم» ⇒ tools ★ (`journalLoadOlder` بلا مستعمل).
**المراجعة (a — تكرار/ميت/تصديرات):** قائمة QA1 الـ14 كلّها باقية (grep). كل تصدير بالملفات المتغيّرة (`forecastText`، `dataSource`، `newsRisk`، `liveSeries`، `signalDirection`) مستعمل.
جديد: `IndicatorForecastPanel.tsx:29` نوع `Vote` محلّي ينسخ `api.ts:692-700` (QA51)؛ `NewsRiskBanner.tsx:66` `HOLIDAY_COPY` ينسخ `newsHolidayToday` (صفّ tools68 قائم).
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة تنتمي لـ`locales.ts`.
**إلحاق:** `686c90e` (tools) وصل `t.newsHolidayToday` وحذف `HOLIDAY_COPY` (grep: صفر) ⇒ صفّ launch104/tools68 أُغلق. البناء بعد الدمج أخضر 0.

## 2026-09-25 — الدورة 52
**البناء:** أخضر 0 (بعد 4e53e39، ثم أُعيد بعد 2781d6f — 9 إيداعات وصلت أثناء الدورة) — لا إصلاح لازم. **Selftests:** 91/91 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود (9 صفوف، 3 منها ★):** `DataOriginKind` ★ (`api.ts:84`)؛ «تحميل الأقدم» ★ (`94f71e6`)؛ حظر الذات ★ (`api.ts:124`، `VotePanel.tsx:27`)؛ `costs_included`
(`BacktestPanel.tsx:232`)؛ عطلة التقويم (`CalendarPanel.tsx:253`)؛ backend-r5 (`BacktestPanel.tsx:242`)؛ QA51 `Vote` (`bf0ac4b`)؛ tools69 مفتاحاً ووصلاً (`2781d6f`، `OLDER_ERROR_COPY` grep صفر).
QA1 (a): `1eb6075` حذف `FRAME_SYMBOLS`/نسخة `TF_SECONDS`/معظم mock.ts ⇒ القائمة 11.
**صفوف جديدة:** QA52 → chart (حذف تحويلات `as ProvenanceKind` الآن)؛ QA52 → ui (`TerminalScreen.tsx:934` بلا `unavailable`)؛ QA52 (b) → ui/launch (`backtestStatBreakeven` بلا مستعمل،
`BacktestPanel` يقرأ `journalStatBreakeven` بالنصّ نفسه). أبقيتُ ui4 (تحقّقتُ `TerminalScreen.tsx:910`) وchart-r37 (`MatrixChart.tsx:3678`) كما أضافهما الوكيلان.
**المراجعة (b — نصوص ثابتة):** grep للعربي داخل علامات تنصيص خارج التعليقات و`locales.ts`، ولـ`label/title/placeholder="…"` ولـ`>Text<` إنجليزي: لا شيء يُعرض
إلا `academy.ts` (QA27) و`MessagesScreen` (launch52). احتياطات عربية افتراضية (`marketHours.ts:180`، `KIND_LABEL_AR`، `CHART_KINDS`) كل مستدعٍ يمرّر الترجمة. `DEFAULT_TEMPLATE.name` لا يُعرض.
**الدورة القادمة:** المراجعة (c) — أزرار بلا `accessibilityLabel`.
**إلحاق:** `6233533` (launch) حذف `backtestStatBreakeven` (grep صفر) ⇒ QA52 (b) أُغلق. `149c711` (backend: الحجم null بلا مزوّد). البناء بعد الدمج أخضر 0.

## 2026-09-25 — الدورة 53
**البناء:** أخضر 0 (بعد 6934941، ثم أُعيد بعد 3d42eef — 9 إيداعات وصلت أثناء الدورة) — لا إصلاح لازم. `@types/node` و`types: ["node"]` قائمان منذ دورات
(مهمّة «الضجيج» منجزة). **Selftests:** 92/92 ناجح (`npx tsx`)؛ المتغيّرة أثناء الدورة (`positionSize`، `tradePlan`، `tickAge`) أُعيدت ونجحت.
**التحقّق من الإغلاقات بالكود (11 صفّاً):** QA52 التحويلات (grep صفر)؛ QA52 `dsKindLabels` (`cb5f753`، `TerminalScreen.tsx:943` — ui نبّه أنه ملك tools فنفّذه tools)؛
ui4 (`6c1aa59`)؛ chart-r37 (`MatrixChart.tsx:3731`)؛ launch106 ×3 (chart :8105، tools `cbf5266` `market_open`، ui `9c3a532`/`8ca1226`)؛ backend-r6 (2)(3)(4)(5).
**ضُيِّق:** backend-r6 (1) → chart: معظم لوحات الحجم موسومة «≈» (`volName`)؛ الباقي `volumeProfile`/TPO/footprint خارج `VOLUME_PRICE_OVERLAYS` (:837).
**صفوف جديدة من الوكلاء (تحقّقتُ):** launch107 → chart (`MatrixChart.tsx:5708` `void moveArmedAlert`)؛ tools71 → ui (`BacktestPanel.tsx:240`)؛ backend-r7 → ui (`:22` `number`).
QA1 (a): `openCurrencyExposure` حُذف ⇒ 10 باقية (grep لكل اسم: صفر مستعمل خارج ملفه). QA1 (جهاز) ضمّ سحب `AlertDragHandle`.
**المراجعة (c — بلا `accessibilityLabel`):** سكربت يقرأ وسم الفتح لكل `Pressable`/`Touchable*`/`Switch`/`TextInput`: 29 بلا وسم، كلّها بنصّ مرئي مترجم (زرّ `pipsInPx`
نصّه يقول «اضغط لنقله»)؛ إنذار كاذب واحد (`>` داخل تعليق، `TradeJournalPanel.tsx:1947` له `placeholder`). لا `<Text onPress>`. وسم ثابت: `MessagesScreen.tsx:142` (launch52). **لا بند جديد.**
**الدورة القادمة:** المراجعة (d) — أرقام متناقضة بين الملفات.

## 2026-09-25 — الدورة 54
**البناء:** أخضر 0 (بعد 3e69fe9) — لا إصلاح لازم. **Selftests:** 92/92 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود (3 صفوف):** launch107 ← chart (`40b15f9`، `MatrixChart.tsx:5715`)؛ backend-r7 (`e4fe10d`، `backtest.py:75` + `tests/test_backtest.py:65`)؛
backend-r6 (1) (`e9df083`، `MatrixChart.tsx:8091` `volName('POC')`؛ TPO من عدد الشموع، footprint موسوم «≈» — قبلتُ تعليل chart). لا طلبات تنسيق جديدة بسجلات chart/tools/launch/ui/backend.
**المراجعة (d — أرقام متناقضة):** حدود خانات التطبيق مقابل Pydantic `main.py` (ملاحظة 500، تخطيط 64، رمز 12، دردشة 1000، سؤال 2000، اسم 3–32، كلمة مرور 4 = `registerError`)؛
صفحة الدفتر 500 = 500؛ pip الحاسبة = `backtest.py`؛ حدود اللوت 100/200 = النصّ؛ عيّنة 30، `CHANGE_WINDOW` 80، `SOON_MS` 24س، RSI 1–99، الجلسات و17:00 نيويورك — كلّها متّسقة.
جديد QA54 → backend: `/api/screener/filters` «(<30)»/«(>70)» مقابل `<=`/`>=` بالفحص، تسميات مختلطة اللغة، بلا مستدعٍ. `TICK_STALE_MS` 20ث ≠ `LIVE_MAX_AGE` 180ث مقصود.
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول حقيقي.
**إلحاق (تعارض دمج مع 6f24d85):** وصلت أثناء الدورة `e22efdd`/`e2551bb` (tools: عطلة بيوم العملة المحلي، لواحق الوسطاء بالأخبار)، `6f24d85` (launch108 ← chart: `mcArmedAlertAdjustHint` — تحقّقتُ: غير موصول، أُدرج الصفّ)،
`acdaa66` كسر البناء (فاصلة عليا غير مهرَّبة بـ`onboardStep4Body`) وأصلحه launch نفسه `62caa5f` قبل أن أصل. البناء بعد الدمج أخضر 0؛ `newsRisk.selftest` ناجح.

## 2026-09-25 — الدورة 55
**البناء:** أخضر 0 (بعد b9711c9) — لا إصلاح لازم. **Selftests:** 92/92 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود (صفّان):** launch108 ← chart (`def61c3`، `MatrixChart.tsx:8162` `accessibilityHint={tr.mcArmedAlertAdjustHint}`)؛
QA54 (d) ← backend (`b7c2357`، `screener.py:37-54` ثوابت مشتركة + `test_screener_backtest_routes.py:119`). طلب tools «`newsUnavailable`» (LOG-TOOLS:2531) قديم ومنفَّذ (`NewsRiskBanner.tsx:171`).
launch109 → ui فُتح وأُغلق أثناء الدورة (`363f793`؛ تحقّقتُ: `ChartFrame.tsx:438`، `QuadChartModal.tsx:346`، `FocusChartModal.tsx:340`) — لم يُدرج.
**المراجعة (e — ما يُحرج أمام متداول):** وكيل فرعي قرأ الحساب والأسواق والمؤشرات (قائمة السليم بـCOORDINATION). تحقّقتُ بنفسي من الاثنين:
QA55 → backend: `backtest.py:154-157` خروج bb_bounce عند `mid` يُطلق `sell`/`buy` فيعكس المحرّك (:162-190) الصفقة بدل الإغلاق؛
QA55 → backend+ui: الصفقة الأخيرة `"open": True` (:192-217) داخل `_stats` (:58)، و`BacktestPanel.tsx` لا يقرأ `open` (grep صفر).
لم يُعدّا بنداً: التقلّب التاريخي بـ365 على الفريمات الصغيرة (كـTradingView)، وتقاطعات الماسح/التنبيهات على الشمعة الجارية.
**الدورة القادمة:** المراجعة (a) — تكرار/ميت/تصديرات بلا مستعمل.
**إلحاق:** `84980ee` (backend run 10) أصلح نصف الخادم من «الصفقة المفتوحة» بالتوازي (`backtest.py:61-62` + `open_pnl_pct`)، ونصف الواجهة صفّ backend-r10 (أ) ⇒ حذفتُ صفّي المكرّر؛
QA55 bb_bounce باقٍ (`backtest.py:154-157` بلا تغيير). backend-r10 (أ)(ب)(ج) تحقّقتُ أنها مفتوحة (`BacktestPanel` بلا `open`، `pineLite.ts:16 :23` ما زال 100). البناء بعد الدمج أخضر 0.

## 2026-09-25 — الدورة 56
**البناء:** أخضر 0 (بعد a033a84) — لا إصلاح لازم. **Selftests:** 93/93 ناجح (`npx tsx`؛ +1 منذ الدورة 55).
**التحقّق من الإغلاقات بالكود (صفّان):** QA55 (e) ← backend (`bea2bb1`، `backtest.py:162-165` `signal = "flat"` + `test_backtest.py:103`)؛
backend-r10 (ب) ← chart (`4cb92bf`، `pineLite.ts:16 :23`، `momentum.ts:22 :29 :981 :988 :1133`). باقٍ: backend-r10 (أ) (`BacktestPanel.tsx` بلا `open`)، tools73 (`I18nContext.tsx:59`).
طلب chart القديم `mcEstimatedTag` منفَّذ (`locales.ts`). لا طلبات تنسيق جديدة بسجلات chart run 44 / tools 73 / launch 109 / ui 7 / backend 11.
**المراجعة (a — تكرار/ميت/تصديرات):** سكربت على كل `export` بـ`mobile/src` (+`App.tsx`، الـselftests تُعدّ مستعملاً): 0 تعريف مكرّر بين الملفات؛ 120 تصديراً بلا مستورد خارجي،
108 منها مستعملة داخل ملفها (تصدير زائد فقط). ميتة تماماً 12: العشرة القديمة + جديدان (chart) `WatchSymbol` (`watchlist.ts:26`) و`__resetWatchlistMemoryForTests` (`watchlistStore.ts:62`) ⇒ أُضيفا لصفّ QA1 (a).
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة خارج `locales.ts`.
**إلحاق:** وصل أثناء الدفع launch 110 وui 8 — تحقّقتُ بالكود وأغلقتُ 4 صفوف: tools73 (`6d28f47`، `I18nContext.tsx:71`)، backend-r10 (أ) (`6afb33b`، `BacktestPanel.tsx:137-141`)،
backend-r10 (ج) (`0350136`)، launch110 (فُتح وأُغلق، `3f7ea80` `notifications.ts:39-40`). البناء بعد الدمج أخضر 0، الـselftests 93/93. باقٍ بالجدول: QA1 (a)(جهاز) وقرارات أنس فقط. صفّ جديد backend-r12 → ui (`ee90f7d`) تحقّقتُ أنه مفتوح (`price_as_of` grep صفر بـ`mobile/src`) — أُبقي بعد حلّ تعارض دمج.

## 2026-09-25 — الدورة 57
**البناء:** أخضر 0 (بعد 59bb26b) — لا إصلاح لازم. **Selftests:** 95/95 ناجح (`npx tsx`؛ +2 منذ الدورة 56: `linRegChannel`، `fractalsTv`).
**التحقّق من الإغلاقات بالكود (صفّان + تضييق):** launch110 (`notifications.ts:40` «فوراً»)؛ backend-r12 ← ui (`095954f`، `AiPanel.tsx:82-83`)؛
QA1 (a) من 12 إلى 2 (`9909b91`؛ grep لكل اسم صفر) — باقٍ `getToolPanel` (tools، `registry.ts:53`) و`motion` (ui، عمداً).
**مفتوح بعد التحقّق:** launch111 → ui (`ChartFrame.tsx:427` ما زال `t.cfSpreadA11y`)؛ ui9 → ui (`PRICE_AT_COPY` `AiPanel.tsx:23` باقٍ). **جديد:** chart-r41 → أنس (TTM Squeeze: LazyBear أم إبقاء).
**المراجعة (b — نصوص ثابتة):** grep للعربي خارج التعليقات و`locales.ts`/selftests، ولـ`label/placeholder/title="…"` و`>Text<` إنجليزي: لا جديد يُعرض.
المعروف: `academy.ts` (QA27)، `MessagesScreen`/`mock.ts`/`api.ts:882` (launch52)، `PRICE_AT_COPY` (ui9). `CHART_KINDS` احتياط يُترجم بالمستدعي؛ «Log» و«EURUSD» مصطلحات. **لا بند جديد.**
**الدورة القادمة:** المراجعة (c) — أزرار بلا `accessibilityLabel`.
**إلحاق:** وصل أثناء الدفع backend run 13 (`14d6474`: PATCH الصفقة المسابق لإغلاق لا يمحو الخروج، 409 `trade_changed_concurrently`). تحقّقتُ: `TradeJournalPanel.tsx:983` يلتقط كل خطأ
بـ`journalEditError` العامّ ⇒ صفّ اختياري QA57 → tools. البناء بعد الدمج أخضر 0.

## 2026-09-25 — الدورة 58
**البناء:** أخضر 0 (بعد 27165bf) — لا إصلاح لازم. **Selftests:** 95/95 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود (صفّان):** launch111 ← chart (`5658652`، `ChartFrame.tsx:433-436`؛ `cfSpreadA11y` حُذف `892066d`)؛ ui9 (`c2a765f`، `AiPanel.tsx:119`، `PRICE_AT_COPY` grep صفر).
**مفتوح بعد التحقّق:** backend-r14 → ui (`CalendarPanel.tsx:344` `fmtLocal(ts)`، `time_tbd` لا يُقرأ خارج `newsRisk.ts`)؛ QA57 → tools (`TradeJournalPanel.tsx:985` ما زال `journalEditError`).
طلب tools القديم «السبريد المختلَق» (LOG-TOOLS:2477) منفَّذ (`twelve_data.py:297 :359`). لا طلبات تنسيق جديدة بسجلات chart run 42 / tools / launch 112 / ui 10 / backend 14 غير backend-r14.
**المراجعة (c — بلا `accessibilityLabel`):** سكربت الدورة 53 على كل `.tsx`: 30 بلا وسم (29 سابقاً)؛ الـ11 في `MatrixChart.tsx` (الملف الوحيد المتغيّر منذ 57 بينها) كلّها بنصّ مرئي مترجم. **لا بند جديد.**
**الدورة القادمة:** المراجعة (d) — أرقام متناقضة بين الملفات.
**إلحاق:** وصل أثناء الدفع tools 75 (`1dc5ee0`): QA57 منفَّذ (`TradeJournalPanel.tsx:990` `t.journalEditConflict`) ⇒ أُغلق. صفّا tools75a → launch (`newsTimeTbd` grep صفر) وtools75b → ui (`ScreenerMini.tsx:198` `Math.round`) تحقّقتُ أنهما مفتوحان. البناء بعد الدمج أخضر 0.

## 2026-09-25 — الدورة 59
**البناء:** أخضر 0 (بعد beeb656) — لا إصلاح لازم. **Selftests:** 95/95 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود (5 صفوف):** backend-r14 ← ui (`75a7ba1`، `CalendarPanel.tsx:285 :310`)؛ tools75a ← launch (`2c68c59`) + tools (`4bc21ec`، `NewsRiskBanner.tsx:167`)؛
tools75b ← ui (`6a58a2b`، `ScreenerMini.tsx:195`)؛ ui10 ← launch (`65700ad`)؛ launch113 ← tools (`4bc21ec`، `newsRisk.ts:365-387`). **مفتوح:** tools76a (`newsTimeTbdTomorrow` grep صفر).
طلب chart القديم `mcEstimatedTag` (LOG-CHART:3618) منفَّذ. لا طلبات جديدة بسجلات chart/tools/launch/ui/backend غير ما سبق.
**المراجعة (d — أرقام متناقضة):** `NEWS_HORIZON_MS` 3س = `ROW_SOON_MS`؛ `SOON_MS`/`UNANNOUNCED_SPAN_MS` 24س؛ حجم `None` بالخادم يطابق backend-r15.
جديد QA59 (d) → ui: `backtest.py:91-92` يُرجع `null` لمتوسط بلا رابح/خاسر (`2b0d3ee`) و`BacktestPanel.tsx:276-280` يفحص `avg_win_pct` فقط ⇒ «/ null%». وتتمّة ui10: حذف `TIME_TBD_COPY` بـ`CalendarPanel.tsx:36`.
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول حقيقي.
**إلحاق:** وصل أثناء الدفع chart 43 / tools / launch / ui 12 / backend 15. تحقّقتُ: ui10 تتمّة (`c24c7aa`)، backend-r15b (`6b1875a`؛ `VotePanel` بلا وقت) ⇒ أُغلقا؛ tools76a منفَّذ من launch (`1f619da`) وبقي حذف
`TIME_TBD_TOMORROW_COPY` (tools). QA59 مكرّر لـbackend-r15a (مفتوح، `BacktestPanel.tsx:276-280`) ⇒ دُمج. البناء بعد الدمج أخضر 0، الـselftests 96/96.
**إلحاق 2:** tools `2254a8d` حذف `TIME_TBD_TOMORROW_COPY` (grep صفر) ⇒ tools76a أُغلق كلياً. launch114 → ui (مفتاحا `backtestStatAvgWin`/`AvgLoss` موجودان ×3، `BacktestPanel.tsx:278` ما زال `backtestStatAvgWinLoss`) مفتوح.

## 2026-09-25 — الدورة 60
**البناء:** أخضر 0 (قبل الدمج وبعده، 9c8e741) — لا إصلاح لازم. **Selftests:** 96/96 ناجح (`npx tsx`؛ `newsRisk`/`tradePlan` المتغيّران أُعيدا بعد الدمج: ناجحان).
**التحقّق من الإغلاقات بالكود (3 صفوف):** backend-r15a + launch114 ← ui (`22715cb`، `BacktestPanel.tsx:146-155`)؛ backend-r16 ← ui (`4f1ea41`، `IndicatorForecastPanel.tsx:126 :171`).
**مفتوح بعد التحقّق:** backend-r17 → tools ((a) `ToolsScreen.tsx:479` لا يقرأ `price_as_of`؛ (b) تعليق `TradeJournalPanel.tsx:986` قديم)؛ ui11 انتقل لـui (`9e9ad12` أضاف `screenerPriceAsOf`، و`ScreenerMini.tsx:17` `AS_OF_COPY` باقٍ).
**المراجعة (e — ما يُحرج أمام متداول):** pip موحّد بـ`positionSize.ts` (grep JPY خارجه: لا تعريف ثانٍ)؛ `backtest.py:218-221` يخصم السبريد و`backtestBeforeCosts` حين لا؛ لا «مضمون/guarantee» إلا بإخلاء المسؤولية.
جديد **QA60 → launch/أنس**: `socialTitle` «المعدل التقريبي للتوصيات والصفقات» / «tips» (`locales.ts:1475/2642/3834`، يُعرض `SocialConsensusPanel.tsx:183`) يخالف `STORE-LISTING.md:9`.
**الدورة القادمة:** المراجعة (a) — تكرار/ميت/تصديرات.
**إلحاق:** وصل launch `c5e3991` (`journalStopTypoFix` ×3) أثناء الدفع ⇒ tools86 أُغلق بالكود؛ البناء أخضر 0. المفتوح على وكيل: launch129 وحده.

## 2026-09-25 — الدورة 61
**البناء:** أخضر 0 (بعد 99e365e) — لا إصلاح لازم. **Selftests:** 97/97 ناجح (`npx tsx`؛ +1 منذ الدورة 60).
**التحقّق من الإغلاقات بالكود (6 صفوف):** backend-r17 (a) ← tools (`9ad2dfb`، `ToolsScreen.tsx:794-797`)؛ backend-r18 ← ui (`c90822c`، `NewsPanel.tsx:22 :95`، `api.ts:132`)؛
ui11 ← ui (`a0f67d1`، `AS_OF_COPY` grep صفر)؛ QA60 ← launch (`99e365e`، `locales.ts:1481/2650/3844`)؛ tools77a ← launch (`5fda82c`)؛ tools77b ← ui (`d918a7f`، `api.ts:810`).
**مفتوح بعد التحقّق:** صفّ جديد «تتمّة tools77» → tools (`TradeJournalPanel.tsx:141 :820` `OPEN_RISK_UNKNOWN_COPY` باقٍ؛ `:1003-1004` لا يرسل `size: null`). launch9 ضُيّق للصياغة (`openrouter_ai.py:71-74`).
لا طلبات تنسيق جديدة بسجلات chart 45 / tools 77 / launch 116 / ui 15 / backend 18.
**المراجعة (a — تكرار/ميت/تصديرات):** سكربت على كل `export` بـ`mobile/src` + `App.tsx`: 0 تعريف مكرّر؛ 109 تصدير زائد مستعمل داخل ملفه؛ ميت تماماً 2 فقط (`getToolPanel`، `motion` — QA1 (a)). **لا بند جديد.**
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة خارج `locales.ts`.
**إلحاق:** وصل أثناء الدفع launch 117 (صفّ launch117 = نصف (b) من صفّي) ⇒ دُمجا صفّاً واحداً «tools + launch». RELEASE-MOBILE صار 475 خطوة. البناء بعد الدمج أخضر 0.

## 2026-09-25 — الدورة 62
**البناء:** أخضر 0 (بعد 283ba25) — لا إصلاح لازم. **Selftests:** 99/99 ناجح (`npx tsx`؛ +2 منذ الدورة 61).
**التحقّق من الإغلاقات بالكود (3 صفوف):** chart-r46 ← ui (`a6e048d`، `useTickFreshnessClock.ts:17 :25` `serverNowSec()`)؛ تتمّة tools77 + launch117 ← tools
(`3ab55bf`: `OPEN_RISK_UNKNOWN_COPY` grep صفر، `TradeJournalPanel.tsx:810`؛ `cbc8ce6`: `editSizeValue` `:993` + selftest)؛ backend-r19 دُمج مع ui16b (جزء ui `af3954f` منجز؛ باقٍ tools `TerminalScreen.tsx:958` ثم backend `candles: []`).
**ui16a حُوِّل لـui:** طلب ui من launch مفتاحاً مستقلاً، لكن `chartNotOfferedTitle`/`Body` موجودان ×3 (`954fcc4`، سبق `af3954f`) ⇒ `ProviderUnavailableNotice.tsx:24-31` يقرؤهما بدل اقتطاع `originUnavailableProvider`.
لا طلبات تنسيق جديدة بسجلات chart 46 / tools / launch 118 / ui 16 / backend 19 غير ما سبق.
**المراجعة (b — نصوص ثابتة):** سكربت على كل `.ts/.tsx` بـ`src` (عربي بسلاسل خارج التعليقات، و`>Text<` إنجليزي، و`label/placeholder/title="…"`): 126 إصابة، كلّها
معروفة (`academy.ts` QA27، `MessagesScreen`/`mock.ts`/`api.ts:893` launch52) أو غير معروضة (مفاتيح مطابقة نصّ الخادم بـ`CommissionPlanPanel`، regex الحاسبة، أوامر AI بـ`WeeklyReportPanel`، احتياطات تُستبدل بالمستدعي). **لا بند جديد.**
**الدورة القادمة:** المراجعة (c) — أزرار بلا `accessibilityLabel`.
**إلحاق:** تعارض عند الدفع مع tools 78 / launch 118 / ui 16 / backend 20. تحقّقتُ: ui16a ← ui (`86a1992`، `ProviderUnavailableNotice.tsx:25-30`)؛ launch118 ← backend (`f88d36b`، `main.py:1892`) ⇒ أُغلقا (المجموع 5).
البناء بعد الدمج أخضر 0، الـselftests 99/99. RELEASE-MOBILE 482 خطوة.

## 2026-09-25 — الدورة 63
**البناء:** أخضر 0 (بعد 9ee873b) — لا إصلاح لازم. **Selftests:** 99/99 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** tools79 ← launch (`cbd9554`، `originUnavailableProvider` grep صفر خارج التعليقات)؛ chart-r47 (a)(b)(c) ← tools (`308f430`، `TerminalScreen.tsx:1508-1509 :1664-1665`، مؤشّر `:1496-1504 :1650-1658`).
**مفتوح بعد التحقّق:** chart-r47 ضُيّق لـtools: عرض `t.chartFirstLoad` (launch `90f2767`، grep `.tsx` صفر)؛ launch119 → chart (`chartNoCandles*` غير مقروء بـ`MatrixChart.tsx`)؛ backend-r19/ui16 → ui (`api.ts:98-99` `last`/`change_pct` ما زالا `number`).
لا طلبات تنسيق جديدة بسجلات chart 47 / tools 79 / launch 119 / ui 17 / backend 21.
**المراجعة (c — `accessibilityLabel`):** سكربت على `Pressable/Touchable*/Switch/TextInput` بـ`mobile/src`: 35 بلا label صريح — 27 زرّاً بابن `<Text>` ظاهر (يُقرأ تلقائياً)، 6 مراجع `useRef<TextInput>`، و`TradeJournalPanel.tsx:1995` له `journalNoteA11y` (إيجابي كاذب من `>` بتعليق). **لا بند جديد.**
**الدورة القادمة:** المراجعة (d) — أرقام متناقضة بين الملفات.

## 2026-09-25 — الدورة 64
**البناء:** أخضر 0 (بعد e1d8205) — لا إصلاح لازم. **Selftests:** 99/99 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** chart-r47 ← tools (`093e1b5`، `TerminalScreen.tsx:964 :1516-1521 :1674-1679` نصّ `chartFirstLoad` ظاهر + label)؛ ملاحظة launch119 ← tools
(`e86abca`، `offlineFrame` `:110-118` ⇒ `candles: []` + `not_offered_by_provider`، البطل محروس `:962`). صفّ launch119 القديم (`04d9188`) حُذف. backend-r19/ui16 دُمج بـui18 (`api.ts:98-99` ما زال `number`).
**مفتوح بعد التحقّق:** ui18 → chart؛ launch120 الإشعار → ui (`ProviderUnavailableNotice.tsx:25`)؛ launch120 الفريم الخام → tools/ui/chart (`TerminalScreen.tsx:964`، `QuadChartModal.tsx:398 :402`، `MatrixChart.tsx:5983`).
لا طلبات تنسيق جديدة بسجلات chart 47 / tools 79 / launch 119 / ui 18 / backend 22.
**المراجعة (d — أرقام متناقضة):** حدود `maxLength` بالتطبيق ↔ `Field(max_length)` بـ`main.py` (1000/2000/500/12/32) متطابقة؛ الفريمات الثمانية `timeframes.ts` ↔ `twelve_data.py:59-66` ↔ `alert_worker.py:111`؛
`LIVE_ENTRY_MAX_AGE_MS` 3 د = `LIVE_MAX_AGE` 180 ث (`TICK_STALE_MS` 20 ث مفهوم آخر: انقطاع البثّ). **لا بند جديد.**
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول.
**إلحاق (تعارض عند الدفع):** وصل chart `4874d20` (حُرّاس ui18) وbackend `8ff0a7c` (backend-r22) وlaunch 120. تحقّقتُ: قلبتُ `api.ts:98-99` إلى `number | null` مؤقتاً ⇒ tsc **0 أخطاء** ثم أعدته ⇒ ui18 صار سطرين لـui.
backend-r22 حيّ ⇒ launch120 (الإشعار) صار **عاجلاً**: EURUSD وقت 429 يُعرض «غير متاح من مزوّد البيانات»؛ دُمج صفّ backend-r22 فيه. البناء بعد الدمج أخضر 0.
**إلحاق 2 (تعارض ثانٍ):** وصل ui 19 (`20e7b46` الإشعار يفرّع `provider_unavailable`، `8025a34` قلب `api.ts`، `b8f1569` `{tf}` بالرباعي) وtools80 وchart `ff29997`. تحقّقتُ بالكود ⇒ أُغلق ui18 وlaunch120 (الإشعار، ضُمّ لـui19).
مفتوح: ui19 **عاجل** → tools (`TerminalScreen.tsx:1510 :1668`) + chart (`MatrixChart.tsx:5998`) بلا `dataSource`؛ launch120 الفريم → tools/chart؛ tools80 → launch. البناء بعد الدمج أخضر 0.

## 2026-09-25 — الدورة 65
**البناء:** أخضر 0 (بعد 479d309، أُعيد بعد تعارضَي دفع) — لا إصلاح لازم. **Selftests:** 99/99 ناجح (`npx tsx`، على cf99ac9).
**التحقّق من الإغلاقات بالكود (5 صفوف):** ui19 ← tools `cf99ac9` (`TerminalScreen.tsx:1516 :1679`) + chart `e73d518`؛ launch120 الفريم ← tools (`:965-966`) + chart (`MatrixChart.tsx:6010-6011`)؛
tools80 ← tools `1d028e8` (`TradeJournalPanel.tsx:977-981`، `{button}` = `journalSaveEditBtn`/`journalAddBtn`)؛ launch121 ← tools `11db392` + ui `5753fba`؛ chart-r48 ← ui `02d60f4` (`DomLitePanel.tsx:71`).
**مفتوح:** launch122 (`FocusChartModal.tsx:143` ui، `anchorDemoSeries` chart؛ جزء tools أُنجز `6005b59`، `TerminalScreen.tsx:760-763`). tools81 ×2 (backend RSS `econ_calendar.py:103`، ui `bootFrame` حالة تحميل) — نُقلا كما هما.
**المراجعة (e — ما يُحرج أمام متداول):** سكربت `instrumentSpec`/`pipValuePerLot` على 20 رمزاً + 12 لاحقة وسيط: EURUSD 10، JPY 1000 ¥، XAU 100 أونصة، XAG 5000؛ `.c`/`c` سنت (رفض مقصود بالمواصفة العادية)؛ المؤشرات/الكريبتو null (مقصود).
«pip» الثابت بعدّة ملفات وحدة عالمية (لا بند). **جديد:** (1) مسار الظلّ `:760` يرسم `mockSeries` **والخادم متّصل** حين يعيد `candles: []` (DXY، أو 429 بعد backend-r22) — وجده launch122 بالتوازي
لمسار الفشل فقط، ضُمّت ملاحظتي إليه؛ (2) صفّ QA65 → tools: سبريد رأس الطرفية `TerminalScreen.tsx:1678` `formatPrice(ask-bid)` — نسخة chart-r48 التي لم تُصلَح.
**إلحاق (تعارضان عند الدفع):** وصل ui 20 وtools 81 (`6005b59` الظلّ — يشمل ملاحظتي) وchart `f975167` وlaunch 122 أثناء الدورة ⇒ أعدتُ بناء COORDINATION على الرأس وأعدتُ التحقّق بالكود؛ البناء أخضر 0.
**الدورة القادمة:** المراجعة (a) — تكرار/ميت/تصديرات (`anchorDemoSeries` صار بلا مستعمل).

## 2026-09-25 — الدورة 66
**البناء:** أخضر 0 (بعد a1277b5) — لا إصلاح لازم. **Selftests:** 100/100 ناجح (`npx tsx`؛ +1 منذ 65، و`anchorDemoSeries.selftest` حُذف مع دالّته).
**التحقّق من الإغلاقات بالكود (4 صفوف):** QA65 ← tools `df43700` (`TerminalScreen.tsx:1723`)؛ tools81 التحميل ← ui `ce58542` + tools `df43700` (`bootFrame` `:112-113`)؛
launch123 ← tools `a9aa402` (`TradeJournalPanel.tsx:980`) + launch `a1277b5` (grep `levelLooksLikePipsSaveAgain` صفر)؛ launch122 ← ui `345b676` + chart `11ebb3e` (grep `anchorDemoSeries` صفر).
**إلحاق (تعارض عند الدفع):** وصل chart `45b053a` (chart-r49) وbackend `eb8435e` (tools81 RSS) وui 22 وlaunch 124 أثناء الدورة ⇒ أعدتُ بناء COORDINATION على 86ea4a3 وتحقّقتُ بالكود:
chart-r49 أُغلق (`LayoutPanel.tsx:27 :60 :70 :123`)، tools81 RSS أُغلق (`econ_calendar.py:103-112` `ts: None`) ⇒ **6 صفوف أُغلقت**. launch124 → ui مفتوح (تحقّقتُ `LectureClassroom.tsx:170-199` ثم الحفظ `:220-229`).
**إلحاق 2:** وصل chart 50 (`chart-r50` → ui، تحقّقتُ `FocusChartModal.tsx:566 :569-570` `infoAccent`) وtools `8492e9a` (props مسمّاة لـ`LayoutPanel`، `ToolsScreen.tsx:900`). البناء أُعيد على الرأس.
**المراجعة (a — تكرار/ميت/تصديرات):** سكربت على كل `export` بـ`mobile/src` (بلا selftest) + كل ملف غير مستورد + أسماء معرّفة بأكثر من ملف: لا تكرار؛ غير المستورد
`modules/tools-panels/registry.ts` (الملف **كلّه**، منذ `3c27653`، كان الصفّ يذكر `getToolPanel` وحده) و`MessagesScreen` (launch52)؛ و`emptySlot` بالطرفية `:759` ما زال
يبني من `mockSeries` (غير معروض، `:1607` يُسقط الفارغ) ⇒ أُلحق بصفّ QA1 ★. 110 تصديراً يُستعمل داخل ملفه/اختباره فقط — ليس ميتاً، لا بند.
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة.

## 2026-09-25 — الدورة 67
**البناء:** أخضر 0 (على 2f4fc51 ثم 4b37c0e بعد السحب) — لا إصلاح لازم. **Selftests:** 100/100 ناجح (`npx tsx`؛ `visibleBars` أُعيد بعد `4b37c0e`: PASS).
**التحقّق من الإغلاقات بالكود:** chart-r50 ← ui `962aced` (`FocusChartModal.tsx:22 :569 :572-573`)؛ launch124 ← ui `db4c51f` (`LectureClassroom.tsx:223 :234`)؛
QA1 جزء ui ← `845546a` (`modules/tools-panels/` غير موجود) — الباقي بالصفّ `emptySlot`/`mockSeries` (tools، ★). backend-r27 جزئي: `newsStale` معروض (`755670f`)،
و`calStaleAsOf` بلا مستعمل (grep) ⇒ الصفّ باقٍ لـui. launch125 مفتوح (`PositionSizePanel.tsx:1414` `'20'`). طلب tools القديم `newsUnavailable` موجود (`locales.ts:498`).
**المراجعة (b — نصوص ثابتة):** grep لكل حرفية عربية وكل نصّ JSX/prop حرفي بـ`mobile/src` خارج `locales.ts`: الظاهر `MessagesScreen` (launch52) و`AUTO`
(`MatrixChart.tsx:9303`) ⇒ صفّ **QA67 → chart**. الباقي احتياطيّ خلف القاموس (`typeLabels.ts`، `dataSource`/`marketHours`/`measureReadout`، `layoutBuiltinName`)
أو مفاتيح نصّ الخادم (`CommissionPlanPanel`) أو موجّهات AI بـ`lang` (`WeeklyReportPanel`). `placeholder="EURUSD"` رمز لا نصّ.
**الدورة القادمة:** المراجعة (c) — عناصر تفاعلية بلا `accessibilityLabel`.

## 2026-09-25 — الدورة 68
**البناء:** أخضر 0 (على 14b59dd ثم 094079a بعد السحب) — لا إصلاح لازم. **Selftests:** 101/101 ناجح (`npx tsx`؛ +1 منذ 67).
**التحقّق من الإغلاقات بالكود (5 صفوف):** QA1 (a) ← tools `9640d80` (`TerminalScreen.tsx:763` `serverUnreachableSeries`)؛ launch125 ← tools `c277ee2`
(`PositionSizePanel.tsx:1416` `typicalSlPipsExample(spec)`)؛ backend-r27 ← ui `6d8a467` (`CalendarPanel.tsx:416`)؛ QA67 ← chart `094079a` (`MatrixChart.tsx:9404` `tr.mcAutoShort`)؛
launch126 ← backend `a58fed3` (`alert_worker.py:218`). طلب chart `mcEstimatedTag` منجز (`locales.ts:2322`). **لا صفّ مفتوح على وكيل** — الباقي 12 صفّاً: قرارات أنس + جهاز.
**المراجعة (c — `accessibilityLabel`):** سكربت على `Pressable/Touchable*/Switch/TextInput` بـ`mobile/src`: 36 بلا label صريح — 27 بابن `<Text>`، 6 `useRef<TextInput>`،
خلفية `MatrixSidePanel.tsx:79` (`accessible={false}`)، `TradeJournalPanel.tsx:2013` (label `:2028`)، `MessagesScreen` (launch52). **لا بند جديد.**
أضفتُ لـSTATUS ⛔16 سؤال backend-r6 (تقاطعات على الشمعة غير المغلقة) — كان بـCOORDINATION وحده.
**الدورة القادمة:** المراجعة (d) — أرقام متناقضة (مرشّح: `MAX_SPREAD_PIPS = 500` واحد لكل الأدوات، ذكره tools 85).

## 2026-09-25 — الدورة 69
**البناء:** أخضر 0 (على 9f7be25) — لا إصلاح لازم. **Selftests:** 101/101 ناجح (`npx tsx`؛ `stopInsideTypicalSpread` أُضيف لـ`positionSize.selftest` القائم).
**التحقّق بالكود:** لا صفّ أُغلق. launch127 مفتوح (`PositionSizePanel.tsx:1553` `'7'`/`'0.07'` لا يتبع `moneyCcy`). **جديد tools85 → launch:** مفتاح
`riskCalcStopInsideTypicalSpread` — الكود يقرأه اختيارياً (`:896 :1707-1713`) وgrep بـ`locales.ts` صفر ⇒ التحذير غير ظاهر. «تصحيح لا تحريك» فكرة بقائمة tools لا طلب.
لا طلبات جديدة بسجلات chart 52 / tools 84 / launch 126 / ui 26 / backend.
**المراجعة (d — أرقام متناقضة):** `MAX_SPREAD_PIPS` 500 و`MAX_SPREAD_PIPS_HIGH_VOL_EXOTIC` 3000 ↔ نصّ الخطأ (بلا رقم منذ `aa640ed`)؛ `MAX_LEVERAGE` 3000 ↔ `{max}`؛
`RISK_HIGH_PCT` 2 ↔ `riskCalcHighRisk` و«1–2%» بالنصوص الثلاثة؛ `ORDER_WARN_LOTS` 50 / `MAX_SMALL_LOTS` 200 ↔ «50–100 lot»؛ `typicalSpreadPipsExample` ↔ `stopInsideTypicalSpread`؛
RSI 14/30/70 بالماسح، والتطبيق لا يرسل `symbols` (سقف `MAX_SCAN_SYMBOLS` 30 لا يُمسّ). **لا بند** — تعليق مطوّر قديم فقط `locales.ts:473` يذكر `MAX_SANE_LOTS` (100) والحدّ الفعلي 50.
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول.
**إلحاق:** وصل backend 30 (`d568eb3` `opened_at` مقروء أو 422، `b2e3c23` الاختبار الخلفي يستثني الشمعة الجارية) أثناء الدفع. تحقّقتُ: التطبيق لا يرسل `opened_at`
(`api.ts:784-797` `createTrade`) ⇒ الـ422 الجديد لا يمسّه. لا طلب تنسيق جديد بسجلّه. البناء على ccec4b7 أخضر 0.

## 2026-09-25 — الدورة 70
**البناء:** أخضر 0 (على a3c5ec1 ثم 3f3987a بعد السحب) — لا إصلاح لازم. **Selftests:** 101/101 ناجح (`npx tsx`؛ `drawingAnchors` الجديد من chart 53: PASS).
**التحقّق من الإغلاقات بالكود (5 صفوف):** tools85 ×2 ← launch `3a1b36d` (`locales.ts:1757 :1761`)؛ launch127 ← tools `42425e0` (`PositionSizePanel.tsx:1556` `commissionPlaceholder`)؛
launch128 ← ui `ba57ae0` (`NewsRiskBanner.tsx:235-238`، `CalendarPanel.tsx:272-274 :387`)؛ طلب ui27 → backend ← `50189c3` (`econ_calendar.py` `curs | {"all"}`).
**مفتوح:** tools86 → launch (`journalStopTypoFix` صفر بـ`locales.ts`)؛ launch129 → tools (tsx: XAUJPY مثاله `''` ⇒ «1.5»). chart 53 بلا طلب.
**المراجعة (e — ما يُحرج أمام متداول):** `isForexMarketOpen` على 14 لحظة (DST أمريكي 8/3 قبل الأوروبي، 1/11، 24–25/12، 31/12–1/1، الذهب +1س، BTC 24/7) و`barCloseCountdown`
D1/4H يوم الجمعة (يُقصّ لإغلاق 21:00 UTC) ⇒ كلها صحيحة، **لا بند**.
**الدورة القادمة:** المراجعة (a) — تكرار/ميت/تصديرات.
**إلحاق:** وصل launch `c5e3991` (`journalStopTypoFix` ×3) أثناء الدفع ⇒ tools86 أُغلق بالكود؛ البناء أخضر 0. المفتوح على وكيل: launch129 وحده.

## 2026-09-25 — الدورة 71
**البناء:** أخضر 0 (على f04249f ثم b419d87 بعد السحب) — لا إصلاح لازم. **Selftests:** 101/101 ناجح (`npx tsx`، أُعيد بعد السحب: 101/101).
**التحقّق من الإغلاقات بالكود (صفّان):** launch129 ← tools `75ee789` (`PositionSizePanel.tsx:598` `fillExampleOrDrop(…, typicalSpreadPipsExample(spec))`)؛
launch130 ← ui `aed77b9` (`LectureClassroom.tsx:435-436`). لا طلب جديد بسجلات chart 54 / ui 29 / launch 128 / backend 32 (اقتراح ui لـlaunch اختياري).
**launch131 → ui (وجدتُه مستقلاً، سبقني launch):** backend `2e55e5b` يرسل `progress: null` والنوعان `Course.progress` (`api.ts:147`) و`AcademySchoolSummary.progress` (`academy.ts:13`) `number`؛ لا مستهلك (grep) ⇒ صغير.
**المراجعة (a — تكرار/ميت/تصديرات):** سكربت على كل `export` بـ`mobile/src`: 0 اسم مكرّر بين ملفين؛ 175 تصديراً بلا مستورد خارجي — كلها مستعملة داخل ملفها أو بالـselftests
عدا `motion` (`theme.ts:119`، ui عمداً)؛ `getToolPanel` لم يعد موجوداً. ملف غير مستورد: `MessagesScreen` وحده (launch52).
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة خارج `locales.ts`.

## 2026-09-25 — الدورة 72
**البناء:** أخضر 0 (على deecbe9) — لا إصلاح لازم. **Selftests:** 101/101 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** launch131 ← ui `76b2256` (`api.ts:148`، `academy.ts:14` `progress: number | null`). دمجتُ backend-r33 وlaunch132 بصفّ واحد لـui
(`NewsPanel.tsx` لا يقرأ `status`/`stale` — grep صفر؛ المفتاحان `locales.ts:1536-1537` جاهزان). backend `95c7ad0` لا يغلق سؤال backend-r6 عن الشمعة الجارية (أضفتُ ملاحظة).
سجلات chart 55 / tools 87 / ui 30 / launch 130: بلا طلب جديد.
**المراجعة (b — نصوص ثابتة):** مسح `mobile/src` لنصوص JSX و`placeholder`/`accessibilityLabel` الحرفية والحرفيات العربية خارج التعليقات و`throw new Error`:
لا جديد — `MessagesScreen`/`mock.ts` (launch52)، `academy.ts` (QA27)، مرادفات العملات `positionSize.ts:925-934` (محلّل إدخال)، ورسائل `Error` تُستبدل بنصّ مترجم (`AccountScreen.tsx:157-158`). **لا بند.**
**الدورة القادمة:** المراجعة (c) — `accessibilityLabel` (مع أزرار chart الجديدة 44pt).

## 2026-09-25 — الدورة 73
**البناء:** أخضر 0 (على f94b576) — لا إصلاح لازم. **Selftests:** 101/101 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** backend-r33+launch132 ← ui `77e39f2` (`NewsPanel.tsx:52-53` `status`/`stale`/`as_of`، `:86` `newsSourceUnavailable`، `:90` `newsStaleAsOf`).
سجلات chart 55 / tools 88 / ui 31 / launch 130 / backend 34: بلا طلب جديد؛ commits chart `dbb2d88`/`c028f5f`/`f94b576` بلا سجلّ بعد. **لا صفّ مفتوح على وكيل.**
**المراجعة (c — `accessibilityLabel`):** سكربت على `Pressable/Touchable*/Switch/TextInput` (مع `placeholder` كوصف للخانة): 8 بقايا كلها كاذبة —
6 `useRef<TextInput>`، `TradeJournalPanel.tsx:2033` (label `:2048`)، `MessagesScreen.tsx:179` (launch52). فحص ثانٍ: لا `Pressable` ابنه نصّ رمزي فقط (✕/↕) بلا label. **لا بند.**
STATUS: ⛔6 حُدّث (مصدرا الأخبار ميّتان)، وأُضيفت 4 بنود جهاز (تبديل الرمز، ↕ على US30، عمولة السنت، لوحة الأخبار).
**إلحاق 2:** وصل backend 35 (`92d6edf`، `e4abf4d` — `backend/` فقط، لا أثر على tsc) بصفّ backend-r35 (TTS بلا مصادقة) — تحقّقتُ: `main.py:1633` `academy_tts(body)` بلا `Depends`،
و`LectureClassroom.tsx:255` يستدعيه مجهولاً ⇒ ⛔18 بـSTATUS.
**الدورة القادمة:** المراجعة (d) — أرقام متناقضة.

## 2026-09-25 — الدورة 74
**البناء:** أخضر 0 (على de91b88) — لا إصلاح لازم. **Selftests:** 101/101 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** launch133 ← tools `43176e5` (`TerminalScreen.tsx:210` `online: boolean | null` من `slotResults.some(Boolean)`، `:1051` بلا وسم عند null).
chart-r56 (3): Alerts/Watchlist ← ui `7023c51` (`AlertsPanel.tsx:297`، `WatchlistPanel.tsx:387` `chartPipSpec` + `pipUnit(lang)`)؛ **ضُيّق الصفّ لـui على `DomLitePanel.tsx:68-71` وحده**
(`quoteSpreadPips` بلا `chartPipSpec`، `' pip'` ثابتة، `formatPrice` بلا مرجع). سجلات chart 57 / launch 132 / ui 33 / backend 35: بلا طلب جديد.
**المراجعة (d — أرقام متناقضة):** حدود الطول تطبيق↔خادم متطابقة (ملاحظة 500، دردشة 1000، AI/معلّم 2000، رمز 12، تخطيط 64، مستخدم 32).
**جديد QA74 → tools (منخفض):** backend `de91b88` جعل `avg_win`/`avg_loss`/`best`/`worst` `null` بلا صفقة خلفها؛ `tradePlan.ts` `journalStats` («بمعادلة الخادم نفسها») يعيد `0`
و`win_rate: 0` (الخادم `null`)، والنوع `JournalStats` `number`. لا أثر مرئي: المستهلكون يحرسون بـ`trade_count > 0` (`TradeJournalPanel.tsx:1486`، `WeeklyReportPanel.tsx:117`)، و`avg_*` لا يُعرض.
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول.

## 2026-09-25 — الدورة 75
**البناء:** أخضر 0 (على 2628416، ثم 205501b بعد السحب) — لا إصلاح لازم. **Selftests:** 101/101 ناجح (`npx tsx`، أُعيد على 205501b).
**التحقّق بالكود:** أوّل تحقّق وجد chart-r56 (3) وQA74 قائمين (ui 34 عدّ DomLite منجزاً ولم يُمسّ)، ثم وصل أثناء الدفع: ui `1136739` (`DomLitePanel.tsx:71` `chartPipSpec`، `:74` `pipUnit`)
وtools `205501b` (`JournalStats` `number | null`، selftest ناجح) ⇒ أُغلقا. backend-r37 ← ui `3b45502` (السبب المجهول بلا سطر مناقض)؛ النصّ صفّ ui35 → launch (سحبٌ ثانٍ أثناء الدفع).
**المراجعة (e — ما يُحرج أمام متداول):** جلسات طوكيو/لندن/نيويورك مع الصيفي (`chart/sessions.ts:29-37`)، مواصفات XAU 0.1/100 وXAG 0.01/5000 والين 0.01، ولا «ربح مضمون» بـ`locales.ts` — سليمة.
**جديد QA75 → tools (منخفض):** `planSummaryText` (`tradePlan.ts:300`) يكتب «pip» ثابتة ⇒ «Risk 25 pip» بالإنجليزية بالدفتر ولوحة الأفكار، وبقية التطبيق «pips» (`pipUnit`).
**الدورة القادمة:** المراجعة (a) — تكرار/ميت/تصديرات.

## 2026-09-25 — دورة QA 77 (بعد 933352c)
**بداية:** وُجدت مسوّدة الدورة 76 غير مدفوعة (autostash تعارض على `COORDINATION.md`، و`STATUS.md` بعنصر نائب `SELFTEST_RESULT`). حُلّ التعارض بإبقاء الطرفين، أُسقط الـstash، ودُمجت نتائج 76 (QA76، إغلاق ui35) هنا.
**البناء:** `qa-build-check.sh` أخضر — 0 أخطاء. **selftests:** 102/102 (`npx tsx`، كل `*.selftest.ts`).
**التحقّق بالكود:** QA75 جانب tools مُغلق ← `6791c64` (`tradePlan.ts:299`، `TradeJournalPanel.tsx:572`)؛ جانب ui (`VotePanel.tsx:85`) قائم. launch135 جديد قائم (`SymbolSearchBar.tsx` بلا `ssbNoMatch`). QA76 قائم.
**المراجعة (b — نصوص ثابتة):** مسح AST (`JsxText` + `accessibilityLabel/Hint`، `placeholder`، `title`، `label`) ⇒ 27: 7 بـ`MessagesScreen` (غير موصولة، ⛔)، مصطلحات موحّدة، و**QA77 → tools**: «pip» ثابتة بـ`PositionSizePanel.tsx:1541,1674` و`TradeJournalPanel.tsx:2055`.
**الدورة القادمة:** المراجعة (c) — أزرار بلا `accessibilityLabel`.
**إضافة (سحب أثناء الدفع):** ui `b9e28c9` (QA75 جانب ui، `VotePanel.tsx:86`) و`5906252` (launch135، `SymbolSearchBar.tsx:100`) ⇒ أُغلقا؛ إعادة البناء على 3268271 أخضر (0)، 102/102.

## 2026-09-25 — الدورة 78
**البناء:** أخضر 0 (على 42c0f3b، ثم 7d5a4d2 بعد السحب) — لا إصلاح لازم. **Selftests:** 102/102 ناجح (`npx tsx`، أُعيد على 7d5a4d2).
**التحقّق بالكود:** QA77 ← tools `50d9fb5` (لا «pip» ثابتة بـ`.tsx` خارج التعليقات؛ `PositionSizePanel.tsx:1437` «1 pip = …» تعريف وحدة). QA76 ← chart `24ab767` (لا `tickBelongsToCandle`).
chart-r60 (ui) ← `57d2053` (`TimeframeBar.tsx:31` `scrollTo`). chart-r60 (launch) ← `93a3177` (`locales.ts:1140-1141`) ⇒ حُوّل الصفّ إلى chart لربط الزرّ (لا مستهلك `.tsx` بعد).
سجلات chart 60 / tools 91 / ui 39 / launch 136 / backend 41: بلا طلب جديد.
**المراجعة (c — `accessibilityLabel`):** مسح AST (`Pressable/Touchable*/Switch/TextInput`، `placeholder` كوصف) ⇒ 28 بلا label: كلها بابن `<Text>` مترجم (MatrixChart ×11، Account ×10، Commission/NetworkTree «تحديث»، PositionSize `:1529`، Journal `:2029`) أو `MessagesScreen` ×3 (launch52).
الأزرار الرمزية فقط (✕ ↶ − + ⛶ ⋯): 7 كلها بـlabel (`MatrixChart.tsx:6306,6425,6613,6624`، `ChartFrame.tsx:319`، `ModerationActions.tsx:151`، `AlertsPanel.tsx:853`). **لا بند.**
**الدورة القادمة:** المراجعة (d) — أرقام متناقضة.
**إضافة (سحب أثناء الدفع):** tools `10f8b0c` أضاف صفّ tools92 → ui بـCOORDINATION (تعارض حُلّ بإبقائه) — تحقّقتُ: `MatrixBottomDock.tsx:210` بلا `chartBannerVisible` ⇒ قائم. launch 137 أغلق جانبه من chart-r60. إعادة البناء على 95ebc9b أخضر (0)، 102/102.

## 2026-09-25 — الدورة 79
**البناء:** أخضر 0 (على a97dab9) — لا إصلاح لازم. **Selftests:** 102/102 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** tools92 ← ui `b0c7b7d` (`MatrixBottomDock.tsx:212` `chartBannerVisible`؛ `MatrixSidePanel` بلا تمرير كما طُلب). chart-r61 ← ui `51089f9`
(`useMultiLiveTicks.ts:52,120`). chart-r60 ← chart `1478382` (`MatrixChart.tsx:6438-6446`). سجلات chart 61 / tools 92 / ui 41 / launch 138 / backend 43: بلا طلب جديد.
**المراجعة (d — أرقام متناقضة):** `TICK_STALE_MS` 20 ث مشترك بالخطّافين؛ إغلاق 17:00 نيويورك تطبيق (`marketHours.ts`) = خادم (`twelve_data.bar_end`)؛ pip السبريد بالخادم (`backtest.py:37-43`) = `positionSize.ts:36-37`.
**جديد QA79 → backend (منخفض):** `backtest.closed_candles` (`backtest.py:56`) بقي على `time + step > now` بعد أن نقل `16d352a` الإشارات إلى `bar_end` ⇒ بالعطلة تُسقط شمعة W المكتملة من الاختبار الخلفي.
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول.

## 2026-09-25 — الدورة 80
**البناء:** أخضر 0 (على 97eb1c4) — لا إصلاح لازم. **Selftests:** 102/102 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** QA79 ← backend `fa0cf42` (`backtest.py:57-68` `bar_end(symbol, …) > now`، `main.py` يمرّر الرمز). سجلات chart 62 / tools 93 / ui 43 / launch 139 / backend 44:
بلا طلب تنسيق جديد (tools 93: تحذير سبريد بمنزلتين يحتاج مفتاحاً — مرشّح لم يُطلب). **لا صفّ مفتوح على وكيل؛ الباقي قرارات أنس.**
**المراجعة (e — ما يُحرج أمام متداول):** Pivot/Fib/Camarilla/Woodie/DeMark/CPR من الجلسة السابقة (`pivotBase.ts`، `MatrixChart.tsx:2165-2173` `period=1`) بصيغ قياسية؛
`FIB_EXTENSIONS` −0.272/−0.618 (127.2%/161.8%)؛ `positionSize` يقرّب اللوت للأسفل (`positionSize.ts:852`). **لا بند.**
STATUS: بنود جهاز جديدة (خروج «25» بالدفتر، تقويم قديم خطوة 633).
**الدورة القادمة:** المراجعة (a) — تكرار/ميت/تصديرات.

## 2026-09-25 — الدورة 81
**البناء:** أخضر 0 (على 59337ff) — لا إصلاح لازم. **Selftests:** 103/103 ناجح (`npx tsx`).
**التحقّق بالكود:** launch140/140b قائمان على tools (لا `journalRetryBtn` ولا `levelLooksLikePoints` بأي `.tsx`). سجلات chart 63 / tools 94 / ui 44 / launch 140 / backend 45: بلا طلب آخر.
**قائمة قبول DESIGN-PRO (أول تشغيل، بسكربتات):** فشل 10/12 ⇒ صفوف DP1–DP12 بـCOORDINATION: `tabular-nums` بـ5 أنماط فقط؛ مُحدِّد التخطيط بالشريطين (`TerminalScreen:1100`، `MatrixEdgeRails:185,222`)؛
`railTip` تحت الأيقونات؛ «حذف» على كل صفّ (`WatchlistPanel:514`)؛ الدوك 14 (`MatrixBottomDock:70-83`)؛ `armedTag` بالتأكيد؛ الرمز المختار باللون وحده؛ `compactToolbar` حدّ+خلفية+ظلّ
(`MatrixChart:12884`)؛ 349 مسافة خارج 4؛ 380 وزناً ≥700. نجح 8 (شارة «تجريبي» بالصفّ المتدهور وحده) و9 (مسح 78).
**المراجعة (a — ميت/تصديرات):** مسح TS AST: 108 تصديرات بلا مستورد خارجي، كلها مستعملة داخل ملفها عدا **QA81 → ui (منخفض)**: `motion` (`theme.ts:119`) ميت ويناقض §6. غير المستورد: `MessagesScreen` وحده.
STATUS: قسم «معيار التصميم» جديد، وبنود جهاز 639/640/643 والجولة الترحيبية.
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة؛ وإعادة قائمة DESIGN-PRO.
**إضافة (سحب أثناء الدفع):** ui `936974a` (tabular-nums بـ22 ملفاً عبر `numeric`) ⇒ DP1 ضُيّق على chart/tools. إعادة البناء أخضر (0).

## 2026-09-25 — الدورة 82
**البناء:** أخضر 0 (على 014143a، ثم 769702a بعد السحب). **Selftests:** 103/103 ناجح (`npx tsx`، أُعيد على 769702a).
**إصلاح بناء:** بعد السحب الثالث صار **أحمر 1** — `WatchlistPanel.tsx:452` `t.wlRowActionsHint` (ui `5ec2eec` ربطه، launch `be3be9d` سحبه بالتوازي) ⇒ `8a9b7af` حذف السطر (قرار launch؛ لا أثر وقت التشغيل) ⇒ أخضر 0 على 8a9b7af؛ tools96 مُغلق.
**التحقّق بالكود:** launch140 ← `a7849c4`، launch140b ← `5fcea8f`، ui45 ← `71d8066` (بقي حذف الخصائص `@deprecated` من النوع على ui)، QA81 ← `014143a`.
launch141 ← `5ec2eec`؛ backend-r46/launch142 ← ui `983adcd`؛ launch142b ← backend `6fc66f9`. جديد مفتوح: chart-r65/65b → tools، backend-r47 → launch/أنس.
**قائمة قبول DESIGN-PRO (التشغيل الثاني):** أول قراءة فشل 3/12 (كان 10)، والنهائية 1/12 (أدناه). أُغلقت DP1/3/4/5/6/7/10/12 بالكود (ضغط 12: `MatrixChart.tsx:7333` X/O علامة بيانات — مقبول، كما قبلتُ قيم chart الـ25 تحت 4px كهندسة وسوم).
باقٍ: **2** → tools (الشريط العلوي `TerminalScreen` 3–4 عناصر تأكيد، `ToolsScreen` تبويبان)؛ **§1** `colors.warn` كلون الإطار الثالث (`TerminalScreen.tsx:1855,1928`).
**تعارضان أثناء الدفع:** وصل chart `619b8f1`، tools DP11 كاملاً و`1bd9457`/`da26fa0`/`cde72df` (DP2 بـToolsScreen/الحاسبة/الدفتر) ⇒ الفشل النهائي **1/12** (DP2 الشريط العلوي بـ`TerminalScreen`؛ العنبري = chart-r65b). selftests 103/103 على b338d27.
المسح بسكربتات: أوزان ≥700 = 1، مسافات خارج 4 = 101 ثم 25 (chart، مقبولة)، نمط حدّ+خلفية+ظلّ = 0، أزرار بلا label = 30 كلها بابن `<Text>`.
**المراجعة (b — نصوص ثابتة، ملفّات منذ 59337ff):** 19 مرشّحاً كلها مصطلحات (RSI/SL/TP/lot/MATRIX). **لا بند.**
**الدورة القادمة:** المراجعة (c) — `accessibilityLabel`؛ وإعادة قائمة DESIGN-PRO.
**إضافة (تعارض أثناء الدفع، cb975eb):** أُخذت COORDINATION من الأعلى وأُعيدت تعديلاتي؛ أخضر 0. جديد مُتحقَّق: **launch156a → ui** (`AccountScreen.tsx:173-182` بلا فرع 401؛ `accPasswordSessionEnded` بلا قارئ). diff الواجهة (`ac3a381`، `94ec997`، `94bf338`) يزيل حدود/نصّ تأكيد ويضيف `a11yBusy` ⇒ 0/12 باقٍ.
**إضافة (سحب أثناء الدفع):** إعادة البناء على 8820090 أخضر 0، selftests 110/110. أُغلقت QA86a (`abc6eca`)، QA86b (`c6d97ec`)، QA86c (`c5ed090`، الباقي هوية DXY وألوان مستويات الشجرة — مقبول)، QA86d (`3612351`). QA87a قائم.

## 2026-09-26 — الدورة 83
**البناء:** أخضر 0 (على 73544b3) — لا إصلاح لازم. **Selftests:** 105/105 ناجح (`npx tsx`، +`axisTagFont`، +`authErrors`).
**التحقّق بالكود:** chart-r65b ← tools `f335037`؛ launch143 ← ui `918ae86` (`AccountScreen.tsx:138,146`)؛ launch143b ← tools `d981730` (`TradeJournalPanel.tsx:187-191,1257`)؛
ui45 ← `ed917cd`؛ backend-r47→launch ← `65aeaea`. قائم: chart-r65 → tools (لا `onChartInteract` بـ`TerminalScreen`)، DP2 → tools. سجلات chart/tools/launch: بلا طلب تنسيق جديد.
**قائمة قبول DESIGN-PRO (الثالث):** فشل 1/12 — البند 2 (الشريط العلوي بالطرفية). المسح: وزن ≥700 = 1 (X/O `MatrixChart.tsx:7423`، مقبول)، خارج 4 = 25 (chart، مقبولة)، حدّ+خلفية+ظلّ = 0.
**المراجعة (c — `accessibilityLabel`):** مسح AST ⇒ 18 بلا label صريح، كلها بابن `<Text>` أو خلفية معتمة `accessible={false}` (`MatrixSidePanel.tsx:79`). **لا بند.**
**الدورة القادمة:** المراجعة (d) — أرقام متناقضة؛ وإعادة قائمة DESIGN-PRO.
**إضافة (سحب أثناء الدفع):** tools `28876c6` (chart-r65) و`ccf0205`/`3535c7f` (DP2) ⇒ مُغلقان بالكود؛ **قائمة DESIGN-PRO: 0/12 فشل**. إعادة البناء على f9c1125 ثم 0a88ab9 أخضر (0)، 105/105. chart-r66b ← ui `b1a4ffc`؛ مفتوح: chart-r66 → tools، launch144 → ui.

## 2026-09-26 — الدورة 84
**البناء:** أخضر 0 (على b1265a1) — لا إصلاح لازم. **Selftests:** 105/105 ناجح (`npx tsx`).
**التحقّق بالكود:** chart-r66 ← tools `f03b726` (`TerminalScreen.tsx:159-169` `fetchSeries` يعيد الحقيقي المخزَّن للردّ التجريبي، فيشمل كل المستدعين)؛ launch144 ← ui `578f60c` (`AccountScreen.tsx:146`).
سجلات chart 66 / tools 98 / ui 49 / launch 144 / backend 49: بلا طلب جديد؛ حُوّل تكرار tools «مفتاح تحذير سبريد بمنزلتين» (منذ 93) إلى صفّ → launch.
**قائمة قبول DESIGN-PRO (الرابع):** 0/12 فشل (diff منذ 0a88ab9: لا وزن ≥700 جديد، مسافتان خارج 4 بهندسة وسوم chart مقبولة، لا حدّ+خلفية+ظلّ جديد).
خارج القائمة: **QA84a → ui/tools** §2: 131 `fontSize` < 11 في 34 ملفّاً (124/32 بعد سحب 8a597d5؛ أُعيد البناء أخضر 0) (`TerminalScreen.tsx:2244` 7px، `WatchlistPanel.tsx:700` سعر 10px بدل 15).
**المراجعة (d — أرقام متناقضة):** حدود Pydantic بـ`main.py` = `maxLength` ونصوص `regErr*Length`؛ حدّا القلب بموضع واحد. **QA84b → chart (منخفض):** عرض حرف 11px مقدَّر 6.4/6.6/6.8 بثلاثة مواضع.
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول؛ وإعادة قائمة DESIGN-PRO.

## 2026-09-26 — الدورة 85
**البناء:** أخضر 0 (على 9e5c8cf) — لا إصلاح لازم. **Selftests:** 108/108 ناجح (`npx tsx`، +`textWidth`، +`denseOhlcFit`، +`providerSymbols`).
**التحقّق بالكود:** backend-r50a ← ui `5ff2713` (`AuthContext.tsx:94-101`)؛ backend-r50b ← launch `eb15f40` (`authErrors.ts:18`)؛ backend-r50c ← ui `a7daed8`؛ QA84b ← chart `961a6d2`
(`textWidth.ts`، `MatrixChart.tsx:565`)؛ tools93 ← launch `9e5c8cf` ⇒ launch146 → tools. قائم: ui50 → chart/tools. جديد بالسحب: backend-r51 → أنس (مُتحقَّق: `db.ballot` بلا مقارنة `user_id`). QA84a: ui/tools = 0 باقٍ ⇒ البقية 19 بـ`MatrixChart.tsx` → chart
(+ `denseOhlcFit` ينزل إلى 9px، §7).
**قائمة قبول DESIGN-PRO (الخامس):** 0/12 فشل (diff منذ b1265a1، 53 ملفّاً: لا وزن ≥700، لا مسافة خارج 4، لا ظلّ، تأكيد جديد `youTag` فقط).
**المراجعة (e — ما يُحرج أمام متداول):** pip مصدر واحد (`positionSize.ts:134`، معادن :36-37) = `backtest.py:48`؛ نصّ `riskCalcSpreadMaybePrice` تحذير لا رفض. **لا بند جديد.**
**الدورة القادمة:** المراجعة (a) — تكرار/ميت/تصديرات؛ وإعادة قائمة DESIGN-PRO.
**بعد السحب (7e25ec3):** أخضر 0. وصلت 12 كوميتاً: تحسينات DESIGN-PRO (عنوان الترحيب والتوقّع 18⇐15، مسافات 3/5/6⇐4/8، لون الإشعار = التأكيد الواحد) ⇒ 0/12 باقٍ؛ لا طلب جديد.

## 2026-09-26 — الدورة 86
**البناء:** أخضر 0 (على 6c93b2d، ثم cd9f878 بعد السحب) — لا إصلاح لازم. **Selftests:** 108/108 ناجح (`npx tsx`، أُعيد على cd9f878).
**التحقّق بالكود:** ui50 ← chart `de5241f` (`MatrixChart.tsx:1451`، `alertFromChart.ts:42`) + tools `2a90b0a`؛ launch146 ← tools `3c07622`/`fd4ca6b` (`PositionSizePanel.tsx:1031`)؛
QA84a ← chart (5 كوميتات) — باقٍ `paneHeadValueLong` 10px لقيمة ≥10 محارف ⇒ استثناء مقبول. جديد بالسحب: launch147 → ui (`FrameSizedGrid.tsx:334` بلا label، المفتاح جاهز).
أحكام: tools «خطأ النموذج بالأحمر» مقبول؛ ui «حالات On تعبئة+حدّ بالتأكيد» مقبول.
**قائمة قبول DESIGN-PRO (السادس):** 0/12 فشل (diff منذ 9e5c8cf ثم 6c93b2d: لا وزن ≥700، لا مسافة خارج 4 جديدة، لا ظلّ، التأكيد نقص فقط).
خارج القائمة: **QA86a → ui** §6 وميض 180ms غير منفَّذ و`motion.flash` بلا مستعمل؛ **QA86b → ui(+chart)** §5.5 13 زرّاً خلفية+ظلّ؛ **QA86c → ui** §1 `colors.dxy` سماوي بـ5 لوحات.
**المراجعة (a — ميت/تصديرات، 20 ملفّاً منذ 9e5c8cf):** كل التصديرات بلا مستورد خارجي مستعملة داخل ملفها عدا `motion`؛ **QA86d (منخفض)** تعليقان ميّتان (`providerSymbols.ts:4`، `panes.ts:129`).
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة؛ وإعادة قائمة DESIGN-PRO.

## 2026-09-26 — الدورة 87
**البناء:** أخضر 0 (على d9024d1) — لا إصلاح لازم. **Selftests:** 108/108 ناجح (`npx tsx`).
**التحقّق بالكود:** backend-r52 ← ui `aacb194` (`AuthContext` `checkSession` عند الإقلاع وعودة الواجهة)؛ launch147 ← ui `d56828b`؛ QA86b/QA86d حصّة chart ← `2a394b9`؛ ملاحظة chart `ind` ← `df19d4a`.
**QA87a → ui (عالٍ):** `AccountScreen.tsx:32-35` يقرأ `t.authSessionExpired` وlaunch أضاف `t.sessionExpired` (`d9024d1`) ⇒ سطر «انتهت جلستك» لا يظهر أبداً. ui53 مُغلق بهذا.
قائم: launch148 (`accessibilityValue.text`، المفتاح جاهز `2836c3e`)، QA86a/b/c/d → ui. حكم لسؤال chart: `drawingsSaveError` بالأحمر مقبول اتّساقاً مع حكم tools (بعد فعل)، ولأنس نقضهما معاً.
**قائمة قبول DESIGN-PRO (السابع):** 0/12 فشل (diff منذ cd9f878، 10 ملفّات: لا زرّ جديد، لا وزن ≥700، الحشوة 8/4، لا ظلّ ولا تأكيد جديد).
**المراجعة (b — نصوص ثابتة، الملفّات المتغيّرة):** لا نصّ ثابت. **لا بند.**
**الدورة القادمة:** المراجعة (c) — `accessibilityLabel`؛ وإعادة قائمة DESIGN-PRO.
**إضافة (تعارض أثناء الدفع، cb975eb):** أُخذت COORDINATION من الأعلى وأُعيدت تعديلاتي؛ أخضر 0. جديد مُتحقَّق: **launch156a → ui** (`AccountScreen.tsx:173-182` بلا فرع 401؛ `accPasswordSessionEnded` بلا قارئ). diff الواجهة (`ac3a381`، `94ec997`، `94bf338`) يزيل حدود/نصّ تأكيد ويضيف `a11yBusy` ⇒ 0/12 باقٍ.
**إضافة (سحب أثناء الدفع):** إعادة البناء على 8820090 أخضر 0، selftests 110/110. أُغلقت QA86a (`abc6eca`)، QA86b (`c6d97ec`)، QA86c (`c5ed090`، الباقي هوية DXY وألوان مستويات الشجرة — مقبول)، QA86d (`3612351`). QA87a قائم.
**إضافة 2:** على c3cca88 أخضر 0. QA87a ← launch `b65e74e` (نسخة `authSessionExpired`) ⇒ السطر يظهر؛ باقٍ تنظيف منخفض → ui ثم launch. chart-r70 → ui مُتحقَّق بالكود (`AnalystsPanel.tsx:138`).

## 2026-09-26 — الدورة 88
**البناء:** أخضر 0 (على e321dec) — لا إصلاح لازم. **Selftests:** 112/112 ناجح (`npx tsx`، +`iftRsi`، +`pgoTv`).
**التحقّق بالكود:** launch148 ← ui `d0c0900` (`FrameSizedGrid.tsx:346` `text`)؛ chart-r70 ← ui `7819263` (`AnalystsPanel.tsx:142-143,165`، `SocialConsensusPanel.tsx:242-243`، `AlertsPanel.tsx:415-416`)؛
QA87a حصّة ui ← `4a84586` ⇒ الباقي → launch (حذف `authSessionExpired`، `locales.ts:59` والقيم الأربع). جديد: **backend-r54 → ui** مُتحقَّق (`signal_hub.py:79,342` يرسل `no_range`/`no_movement`؛ `signalDirection.ts:38-49` و`forecastText.ts` بلا معالجة). سجلات chart/tools بلا تحديث.
**قائمة قبول DESIGN-PRO (الثامن):** 0/12 فشل (diff منذ c3cca88، 14 ملفّاً: لا زرّ/وزن ≥700/مسافة/ظلّ جديد).
**المراجعة (c — `accessibilityLabel`):** مسح AST لكل `.tsx` ⇒ 7 بلا label صريح، كلها بابن `<Text>` عدا خلفية `MatrixSidePanel.tsx:79` (مقبول)؛ label ثابت وحيد `MessagesScreen.tsx:142` (launch52). **لا بند.**
**الدورة القادمة:** المراجعة (d) — أرقام متناقضة؛ وإعادة قائمة DESIGN-PRO.
**إضافة (تعارض أثناء الدفع، 4a802a7):** حُلّ تعارض COORDINATION بأخذ نسخة tools/launch ثم إعادة تعديلاتي. البناء أخضر 0، selftests 112/112. QA87a مُغلق كلياً ← launch `3841ce5`؛ جديد: launch149 → chart، tools102a → launch، tools102b → أنس (⛔21).
**إضافة 2 (8a129cc):** أخضر 0، 112/112. أُغلقت backend-r54 ← ui `ee6b068` وlaunch149 ← chart `eb15984` (مُتحقَّق بالكود). المفتوح على الوكلاء: tools102a → launch فقط.
**إضافة 3 (b486d2f، أخضر 0):** tools102a: المفتاح جاهز ← launch `b495ff2` ⇒ الربط → tools. **QA88a → launch ثم ui**: backend `80d4193` أضاف `atr_below_tick` (`signal_hub.py:92`) و`signalDirection.ts` يعيد null له.

## 2026-09-26 — الدورة 89
**البناء:** أخضر 0 (على 13a08a3) — لا إصلاح لازم. **Selftests:** 113/113 ناجح (`npx tsx`).
**التحقّق بالكود:** لا إغلاق. قائم: launch150 (المفتاح ← launch `0d96fb3`؛ لا `atr_below_tick` بأي `.ts` ⇒ ui) — دُمج فيه QA88a؛ tools102a (`journalEntryDecimalSlip` لا يُقرأ بأي `.tsx`)؛
tools103a (`liveSeries.ts:232`)؛ tools103b (`db.py:2007`)؛ backend-r55 (`CoursesScreen.tsx:120`). سجلات chart 72 / tools 103 / launch 150 / ui 56 / backend 55: لا طلب آخر.
**قائمة قبول DESIGN-PRO (التاسع):** 0/12 فشل (diff منذ 939ce4a، 15 ملفّاً: لا زرّ/وزن ≥700/مسافة/ظلّ جديد؛ سطر TBD الثاني بـ`NewsRiskBanner` بنمط `styles.main`).
**المراجعة (d — أرقام متناقضة):** صفحة الدفتر `tradePlan.ts:1159-1160` = `db.py:1989-1990`؛ STARC بموضع واحد (`volatility.ts`). **QA89 → ui** (أُلحق بـbackend-r55): `duration_min: 20` بـ`CoursesScreen.tsx:120` و`LectureClassroom.tsx:180` يناقض مدّة الخادم (1 د).
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول؛ وإعادة قائمة DESIGN-PRO.
**إضافة (تعارض أثناء الدفع، bd2b507):** وصلت 23 كوميتاً ⇒ أُخذت COORDINATION من الأعلى وأُعيد التحقّق. البناء أخضر 0، selftests 114/114 (بالتوازي -P4). أُغلقت بالكود:
launch150/QA88a (ui `c367cfc`)، backend-r55 (ui `f8e33e3`، ومعها QA89 فلا بند)، tools103a (chart `fa4dff3`)، tools103b (backend `9012172` + tools `abee7c9`)، launch151 (tools `2618e19`)، tools102a (tools `84e4e76`). مفتوح: tools104a → launch.

## 2026-09-26 — الدورة 90
**البناء:** أخضر 0 (على 45aa4be) — لا إصلاح لازم. **Selftests:** 114/114 ناجح (`npx tsx`).
**التحقّق بالكود:** tools104a ← tools `b7339c3` (`TradeJournalPanel.tsx:727`) + `9c9a39c` (`PositionSizePanel.tsx:1142`) بمفتاح launch `0981ef5` ⇒ مُغلق.
ui58a: المفتاح ← launch `4ed9ab0` ولا قارئ بأي `.tsx` (`CommissionPlanPanel.tsx:276` ما زال «—») ⇒ الربط → ui. سجلات chart/tools/launch/ui/backend: بلا طلب جديد.
**قائمة قبول DESIGN-PRO (العاشر):** 0/12 فشل (diff منذ bd2b507، 10 ملفّات: لا وزن ≥700/مسافة خارج 4/ظلّ؛ علامة التأكيد 2px لبطاقة `WeeklyReportPanel` المختارة وحدها — مقبول).
**المراجعة (e — ما يُحرج أمام متداول):** `USD_BALLPARK` (`tradePlan.ts:1472`، `9f000f3`) ضمن ×3 للأسعار ولا يدخل حساب مال؛ لا «مضمون/بلا مخاطرة» بالواجهة. **لا بند.**
**الدورة القادمة:** المراجعة (a) — تكرار/ميت/تصديرات؛ وإعادة قائمة DESIGN-PRO.
**بعد السحب (7e25ec3):** أخضر 0. وصلت 12 كوميتاً: تحسينات DESIGN-PRO (عنوان الترحيب والتوقّع 18⇐15، مسافات 3/5/6⇐4/8، لون الإشعار = التأكيد الواحد) ⇒ 0/12 باقٍ؛ لا طلب جديد.
**إضافة (تعارض أثناء الدفع، aacb013):** أُخذت COORDINATION من الأعلى وأُعيدت تعديلاتي. أخضر 0. أُغلقت chart-r74a (ui `681e0ff`) وchart-r74c حصّة ui (`aacb013`)؛ مفتوحان مُتحقَّقان: chart-r74b وui59a → tools.

## 2026-09-26 — الدورة 91
**البناء:** أخضر 0 (على e946239) — لا إصلاح لازم. **Selftests:** 114/114 ناجح (`npx tsx`).
**التحقّق بالكود:** chart-r74b ← tools `78f94e1` (`TerminalScreen.tsx:195-204` مراجع، التأثير :754 بلا `frameTfs/dxyTf`)؛ ui59a ← tools `fdb72a0` (`:157` عبر `hooks/chartSeriesCache`)؛
ui58a ← ui `0176476` (`CommissionPlanPanel.tsx:276`). سجلات chart/tools/launch/ui/backend: لا طلب جديد. **QA91a → ui (منخفض)**: `LectureClassroom.tsx:731` `clarifyBox` تعبئة+حدّ تأكيد (أبلغ عنه ui).
**قائمة قبول DESIGN-PRO (الحادي عشر):** 0/12 فشل (diff منذ aacb013، 15 ملفّاً: لا زرّ/وزن ≥700/مسافة/ظلّ جديد؛ `a58f166` أزال حدّي تأكيد).
**المراجعة (a — ميت/تصديرات):** تصديرات `holdView`/`seriesCache`/`chartSeriesCache` كلها مستوردة؛ `tsc --noUnusedLocals` على المتغيّرة: `React` فقط (ضجيج JSX). **لا بند.**
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة؛ وإعادة قائمة DESIGN-PRO.
**إضافة (تعارض أثناء الدفع، 4d51814):** وصلت 19 كوميتاً ⇒ أُخذت COORDINATION من الأعلى وأُعيدت تعديلاتي. أخضر 0، selftests 114/114. QA91a ← ui `dbd7e94` (أُغلق قبل أن يُرفع).
جديد مُتحقَّق: **backend-r58 → ui** (`main.py:848` `POST /api/auth/password`، لا مستدعٍ بـ`mobile/src`)؛ **backend-r58b → أنس** (⛔22). diff الواجهة (5 ملفّات) يزيل حدود تأكيد فقط + `accessibilityState` ⇒ 0/12 باقٍ.

## 2026-09-26 — الدورة 92
**البناء:** أخضر 0 (على dbdb750، ثم 8935d05 بعد السحب) — لا إصلاح لازم. **Selftests:** 114/114 ناجح (`npx tsx`، أُعيد بعد السحب).
**التحقّق بالكود:** ui60a ← launch `11c3848` (`locales.ts:1352-1358`)؛ backend-r58 ← ui `435ff8d` (`AccountScreen.tsx:160-186`، زرّ :346 بـlabel). سجلات chart/tools/launch/ui/backend: لا طلب جديد.
`QuadChartModal` تأثير `setLeader(0)` على `[visible, symbols]` — `symbols` مُذكَّر بمفتاح نصّي (:59-61) فلا يُصفَّر كل رسم. شريحة ATR (`5781765`/`4079c8c`) مصدر واحد `atrStopPips` بالشاشتين.
**قائمة قبول DESIGN-PRO (الثاني عشر):** 0/12 فشل (diff منذ 4d51814: `minHeight` 44، `fontSize` 13، `warn` لخطأ الحفظ، `selectionColor` بالتأكيد؛ شريحة ATR بنمط الشرائح القائم مع label).
**المراجعة (b — نصوص ثابتة، كل `.tsx`/`.ts`):** العربي خارج `locales.ts` = تعليقات، أنماط تحليل مدخلات (`parseDecimal`/`positionSize`)، أو صفوف قائمة (launch52، QA27)؛ `ATR_STOP_LABEL` اسم مؤشر مقصود. **لا بند.**
**الدورة القادمة:** المراجعة (c) — `accessibilityLabel`؛ وإعادة قائمة DESIGN-PRO.
**إضافة (تعارض أثناء الدفع، cb975eb):** أُخذت COORDINATION من الأعلى وأُعيدت تعديلاتي؛ أخضر 0. جديد مُتحقَّق: **launch156a → ui** (`AccountScreen.tsx:173-182` بلا فرع 401؛ `accPasswordSessionEnded` بلا قارئ). diff الواجهة (`ac3a381`، `94ec997`، `94bf338`) يزيل حدود/نصّ تأكيد ويضيف `a11yBusy` ⇒ 0/12 باقٍ.

## 2026-09-26 — الدورة 93
**البناء:** أخضر 0 (على e2e7286) — لا إصلاح لازم. **Selftests:** 114/114 ناجح (`npx tsx`، -P4).
**التحقّق بالكود:** launch156a ما زال (`AccountScreen.tsx` بلا `401` ولا قارئ لـ`accPasswordSessionEnded`) → ui؛ tools108a جديد مُتحقَّق (`tradePlan.ts:938`، لا `journalStatLossStreak` بـ`locales.ts`) → launch.
بنود chart المعلّقة بسجلّه (قصّ الترند بالحافّة، انزلاق القياس، تراجع بقاعدة عطلة الرمز) أُنجزت بـ`905e131`، `bf108fa`/`e2e7286`، `695b733`. backend r60 (W من D الاثنين–الجمعة) مُضاف لصفّ backend-r1 بقرارات أنس.
**قائمة قبول DESIGN-PRO (الثالث عشر):** 0/12 فشل (diff منذ cb975eb: 7 ملفّات، لا تغيير أنماط).
**المراجعة (c — `accessibilityLabel`):** مسح AST ⇒ 6 بلا label، كلها غير تفاعلية أو بشاشة غير مركّبة (launch52). **لا بند.**
**الدورة القادمة:** المراجعة (d) — أرقام متناقضة؛ وإعادة قائمة DESIGN-PRO.
**إضافة (تعارض أثناء الدفع، 988559f):** وصلت 12 كوميتاً ⇒ أُخذت COORDINATION من الأعلى وأُعيدت تعديلاتي. أُغلقت launch156a ← ui `7d949f4` (`AccountScreen.tsx:178`)؛
tools108a: المفتاحان ← launch `346b2a3` ⇒ الربط → tools. `fontWeight '900'` لرموز P&F (سؤال ui63): بيانات مرسومة ⇒ مقبول. 0/12 باقٍ.

## 2026-09-26 — الدورة 94
**البناء:** أخضر 0 (على ffb80e4) — لا إصلاح لازم. **Selftests:** 114/114 ناجح (`npx tsx`).
**التحقّق بالكود:** tools108a ← tools `36136cf` (`TradeJournalPanel.tsx:1737-1750`) ⇒ مُغلق. tools109a: المفتاحان ← launch `ca73c58` ولا قارئ بأي `.tsx` ⇒ الربط → tools.
backend r61: `change_pct` null لشمعة واحدة — `liveSeries.ts:201`، `ToolsScreen.tsx:791`، `SymbolSnapshot.tsx:68` تحرسه (نوع `screenerRun` `number` نظرياً فقط). سجلات chart/ui: لا طلب جديد.
**قائمة قبول DESIGN-PRO (الرابع عشر):** 0/12 فشل (diff منذ 988559f، 11 ملفّاً: عنوان `QuadChartModal` 13px؛ سطرا الدفتر بـ`styles.stat` ⇐ `...numeric`).
**المراجعة (d — أرقام متناقضة):** حدود النصوص `main.py` (1000/500/2000/32) = `maxLength` بالواجهة. **QA94a → ui**: `AlertsPanel.tsx:356` `String(a.price)` ⇒ «1.23456e-8» يرفضه `parseDecimal` (مُتحقَّق بـtsx)، و`maxLength={12}` (:892) مقابل `PRICE_MAX_LEN = 20` بالدفتر.
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول؛ وإعادة قائمة DESIGN-PRO.
**إضافة (بعد السحب، 6ebb13c):** أخضر 0؛ selftests `panClamp`/`positionSize`/`tradePlan` ناجحة. أُغلقت **tools109a** ← tools `b49ec7b` (أنماط `...numeric`). ui `3425fe8`/`41f444e` تحييد ألوان التصويت والشرائح ⇒ 0/12 باقٍ. جديد: tools110a → launch (مُتحقَّق).

## 2026-09-26 — الدورة 95
**البناء:** أخضر 0 (على 63ba9b0) — لا إصلاح لازم. **Selftests:** 114/114 ناجح (`npx tsx`، -P4).
**التحقّق بالكود:** QA94a ← ui `f62561e` (`AlertsPanel.tsx:363` `plainStopText`، حدّ 20 :900، `VotePanel` خانات السعر 20) ⇒ مُغلق. tools110a: المفتاح ← launch `540d7df` ولا قارئ بأي `.tsx` ⇒ الربط → tools.
سجلات chart/tools/launch/ui/backend: لا طلب جديد.
**قائمة قبول DESIGN-PRO (الخامس عشر):** 0/12 فشل (diff منذ 6ebb13c: `...numeric` بـ`MatrixChart` (3 مواضع)، `fontSize` 13/12 صريحة بـ`LayoutPanel`/`QuadChartModal`).
**المراجعة (e — ما يُحرج أمام متداول):** `breakevenRR` بالصافي، وعند صافٍ ≤0 يظهر `riskCalcNetNegative` لا نسبة تعادل؛ ردّ الذكاء المقطوع يُسقط سطره الناقص. **لا بند.**
**الدورة القادمة:** المراجعة (a) — تكرار/ميت/تصديرات؛ وإعادة قائمة DESIGN-PRO.
**بعد السحب (7e25ec3):** أخضر 0. وصلت 12 كوميتاً: تحسينات DESIGN-PRO (عنوان الترحيب والتوقّع 18⇐15، مسافات 3/5/6⇐4/8، لون الإشعار = التأكيد الواحد) ⇒ 0/12 باقٍ؛ لا طلب جديد.

## 2026-09-26 — الدورة 96
**البناء:** أخضر 0 (على a1be669) — لا إصلاح لازم. **Selftests:** 114/114 ناجح (`npx tsx`).
**التحقّق بالكود:** tools110a ← tools `42e4e0e` (`TradeJournalPanel.tsx:1759`)؛ ui67a ← chart `ddf4557` (`chart/alpha.ts`، لا `244,63,94` متبقٍّ) ⇒ مُغلقان.
tools111a/tools111b: لا `riskCalcDaily*`/`riskCalcScaleOut` بـ`locales.ts` ⇒ مفتوحان → launch. backend `64499a5`/`a1be669` بلا طلب. سجلا chart/ui: لا طلب جديد غير ما سبق.
**قائمة قبول DESIGN-PRO (السادس عشر):** 0/12 فشل (diff منذ bac6631، 9 ملفّات: شريط الرسم أيقونات 44px + label + تلميح `railHintAbove` داخل `dock` بلا `overflow`؛ «مسح الكل» ⌫ خلف `confirmDestructive`).
**المراجعة (a — ميت/تصديرات):** `withAlpha`/`journalPayoffR` مستوردان؛ `styles.tool*` مستعملة. **QA96a → launch (منخفض)**: `mcUndo`/`mcRedo` بلا قارئ منذ `ae31a6a`.
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة؛ وإعادة قائمة DESIGN-PRO.
**بعد السحب (90ff55f):** أخضر 0. وصلت 14 كوميتاً: مفاتيح tools111a/b ← launch `17b9528` ⇒ الربط → tools؛ ui تقليل التأكيد (`52e61c3`، `a379910`) وبطاقة الجولة تعبئة فقط ⇒ 0/12 باقٍ.

## 2026-09-26 — الدورة 97
**البناء:** أخضر 0 (على 6ce3f80) — لا إصلاح لازم. **Selftests:** 114/114 ناجح (`npx tsx`).
**التحقّق بالكود:** tools111a/b ← tools `c146e63`/`1ab19fb`/`b83857e` (`PositionSizePanel.tsx:1023/1033/1899`)؛ QA96a ← launch `4c36fb5` (لا `mcUndo:`/`mcRedo:`) ⇒ مُغلقة. سجلات chart/tools/launch/ui/backend: لا طلب جديد.
**قائمة قبول DESIGN-PRO (السابع عشر):** 0/12 فشل (diff منذ 90ff55f، 23 ملفّاً: مقاسات 13/15/18 و`...numeric`؛ خطّ Ask `textDim`؛ `SelMark accent={t.id !== 'none'}`؛ لا وزن ≥700/مسافة/ظلّ).
**المراجعة (b — نصوص ثابتة):** العربي خارج `locales.ts` تعليقات/اختبارات + launch52. **QA97a → tools (منخفض)**: «lot» ثابتة بـ`PositionSizePanel.tsx:1044/1831/1858/1939` مقابل «لوت» بـ`riskCalcLots`.
**الدورة القادمة:** المراجعة (c) — `accessibilityLabel`؛ وإعادة قائمة DESIGN-PRO.
**بعد السحب (1890f0d):** أخضر 0. backend r65 (`7d62607` تقاطع SMA من ضجيج الفاصلة، `024beb1` قفل نقل صفوف الجهاز و`ballot` لحساب محذوف) — لا يمسّ backend-r51(1) (صاحب الفكرة يصوّت) ⇒ يبقى لأنس؛ launch 162 توثيق فقط. لا طلب جديد.

## 2026-09-26 — الدورة 98
**البناء:** أخضر 0 (على 1d7282b) — لا إصلاح لازم. **Selftests:** 115/115 ناجح (`npx tsx`؛ جديد `tfTyping.selftest`).
**التحقّق بالكود:** QA97a ← tools `dcec067` (`positionSize.ts:867` `LOT_UNIT`/`formatLots`، قرار صريح بإبقاء «lot») ⇒ مُغلق. launch163a باقٍ (`mcHintTypeTfWeb` بلا قارئ) → chart.
جديد مُتحقَّق: **chart-r82a** (تحسين) `onTimeframeKey` غير ممرَّر لـ`TerminalScreen.tsx:1633` → tools و`FocusChartModal.tsx:492` → ui. سجلات tools/launch/ui/backend: لا طلب جديد.
**قائمة قبول DESIGN-PRO (الثامن عشر):** 0/12 فشل (diff منذ 1890f0d، 14 ملفّاً: `tfTypedBox` تعبئة فقط، مسافات 8/12، `...numeric`؛ ui أزال التأكيد عن اسم الكاتب/شريط الموافقة/عنوان المدرسة).
**المراجعة (c — `accessibilityLabel`):** مسح AST لكل `.tsx` ⇒ 3 `Pressable` بـ`MessagesScreen.tsx` فقط (غير مركّبة، launch52). **لا بند.**
**الدورة القادمة:** المراجعة (d) — أرقام متناقضة؛ وإعادة قائمة DESIGN-PRO.

## 2026-09-26 — الدورة 99
**البناء:** أخضر 0 (على 0f89217) — لا إصلاح لازم. **Selftests:** 115/115 ناجح (`npx tsx`).
**التحقّق بالكود:** launch163a ← chart `670c1c9` (`MatrixChart.tsx:7041`) ⇒ مُغلق. chart-r82a: جزء ui ← `f96a309` (`FocusChartModal.tsx:513`)، جزء tools (`TerminalScreen`) باقٍ. سجلات chart/tools/launch/ui/backend: لا طلب جديد.
**قائمة قبول DESIGN-PRO (التاسع عشر):** 0/12 فشل (diff منذ 1d7282b، 7 ملفّات منطق فقط: Esc طبقةً طبقة `drawEscPendingRef`، ذيل التلميح، `stopTooClose`/`riskNoCosts` بالحاسبة).
**المراجعة (d — أرقام متناقضة):** حقول المتجر بعدّ Unicode ضمن الحدود (كامل 3960/3981 من 4000)؛ «1:1 إلى 1:3» = `QUICK_RR`. **QA99a → launch (منخفض)**: «11 نوعاً للشارت» (`STORE-LISTING.md:87/149`) والكود 12 (`lineBreak` منذ `d78a6c2`).
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول؛ وإعادة قائمة DESIGN-PRO.
**بعد السحب (d33f514):** وصلت 11 كوميتاً ⇒ أخضر 0، `crossAnchor.selftest` ناجح. أُغلق chart-r82a ← tools `cced072`. tools أزال صفّ الفريمات المكرّر (`25069dd`) وشريط الطرفية 32px بحدّ فقط (`d0226cb`/`b594403`؛ كان 34–38 بلا `hitSlop` أصلاً) ⇒ 0/12 باقٍ.
**بعد السحب (40054bc):** أخضر 0. ui `b1bec76` (حذف التنبيه مخفي وقت السكون، بند 4) و`9370541` (`animationType="none"`)؛ **ui72a → tools** مُتحقَّق (`TerminalScreen.tsx:2071` `"slide"`، صُحّح السطر من :2088). 0/12 باقٍ.

## 2026-09-26 — الدورة 100
**البناء:** أخضر 0 (على 52cdc2f) — لا إصلاح لازم. **Selftests:** 115/115 ناجح (`npx tsx`، -P4).
**التحقّق بالكود:** QA99a ← launch `59f30b7` (`STORE-LISTING.md:87/149` «12») ⇒ مُغلق. launch165a: `LayoutPanel.tsx:271` ← `52cdc2f`؛ `IndicatorAlertsPanel`/`WatchlistPanel` بلا `rowDeleteLongPressHint` ⇒ باقٍ → ui. ui72a باقٍ (`TerminalScreen.tsx:2071`). سجلات chart/tools/ui/backend: لا طلب جديد (ملاحظة chart الاختيارية `mcHintNavigateWeb` مذكورة بالتذييل).
**قائمة قبول DESIGN-PRO (العشرون):** 0/12 فشل (diff منذ 40054bc، 8 ملفّات: `longPressHint` 11px/`lineHeight` 16/`textMuted`؛ الباقي منطق).
**المراجعة (e — ما يُحرج أمام متداول):** tsx على `parseLeverage`/`parseDecimal`: «1 30» ⇒ null، «1 : 30»/«١:٣٠»/«1：100»/RLM ⇒ صحيحة، «1:1.000» ⇒ سؤال الآلاف، «‏10.000» ⇒ 10 مع كاشف السؤال؛ «30x» مرفوضة (اتجاه آمن). **لا بند.**
**الدورة القادمة:** المراجعة (a) — تكرار/ميت/تصديرات؛ وإعادة قائمة DESIGN-PRO.
**بعد السحب (aff05e2):** أخضر 0؛ `tfTyping.selftest` ناجح. أُغلق **launch165a** ← ui `6e980ef` و**ui72a** ← tools `aff05e2` (`TerminalScreen.tsx:2071` `"none"`). ui `010eb77` (§5.6) و`5f9d49f` (8/12)، chart `304ddfa` (انتقال لتاريخ) ⇒ 0/12 باقٍ. لا بند مفتوح على وكيل.

## 2026-09-26 — الدورة 101
**البناء:** أخضر 0 (على 11b6e30) — لا إصلاح لازم. **Selftests:** 115/115 ناجح (`npx tsx`، -P4).
**التحقّق بالكود:** launch166a ← chart `11b6e30` (`MatrixChart.tsx:7115`، المفتاح ×3 بـ`locales.ts`) ⇒ مُغلق. backend-r69 → tools باقٍ (اختياري؛ لا `insufficient_data` بـ`mobile/src`). سجلات chart/tools/launch/ui/backend: لا طلب جديد.
**قائمة قبول DESIGN-PRO (الحادي والعشرون):** 0/12 فشل (diff منذ aff05e2، 9 ملفّات: عدّ التقويم `...numeric`، إزالة تأكيد زائد بالتقويم/الشبكة/الباقات/المدرسة، فاصل واحد للطرفية/الحاسبة/الماسح).
**المراجعة (a — ميت/تصديرات):** سكربت على كل `export` بـ`src/`: لا دالة ميتة (`CoursesScreen`/`hasSeenOnboarding` مستوردان بـ`App.tsx`)؛ كل مفاتيح الترجمة مقروءة. **لا بند.**
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة؛ وإعادة قائمة DESIGN-PRO.
**بعد السحب (4ee84e5):** launch أضاف `screenerInsufficientData` ×3 و**launch167a → tools** (يكمل backend-r69) — مُتحقَّق: `api.ts` بلا `insufficient_data`. المفتاح غير مقروء بعد بانتظاره.

## 2026-09-26 — الدورة 102
**البناء:** أخضر 0 (على f739fca) — لا إصلاح لازم. **Selftests:** 116/116 ناجح (`npx tsx`).
**التحقّق بالكود:** أُغلقت backend-r70 ← ui `358bcc5` (`AuthContext.tsx:90`)؛ backend-r69/launch167a ← tools `c91e00a` (`ToolsScreen.tsx:531/796`)؛ tools115a ← ui `e684b8f` (`api.ts:615`، `ScreenerMini.tsx:106`). ui75a باقٍ (`MatrixChart.tsx:7133/9113` «🔔»، `TerminalScreen.tsx:1125` «⚡»). سجلّ chart (`278ae65`): لا طلب جديد.
**قائمة قبول DESIGN-PRO (الثاني والعشرون):** 0/12 فشل (diff منذ 4ee84e5: «افحص» حدّ فقط، رموز أحادية بالرصيف/الشريط؛ `'900'` بـ`MatrixChart.tsx:7869` لحرفي X/O = محتوى شارت).
**المراجعة (b — نصوص ثابتة):** لا نصّ حرفي جديد (EURUSD/MATRIX/launch52 فقط). **QA102a → tools (منخفض)**: تحويل `unknown` وتعليق قديم بـ`ToolsScreen.tsx:201/531` بعد أن وصف `api.ts` الحقل.
**الدورة القادمة:** المراجعة (c) — `accessibilityLabel`؛ وإعادة قائمة DESIGN-PRO.

## 2026-09-26 — الدورة 103
**البناء:** أخضر 0 (على 88b20ea) — لا إصلاح لازم. **Selftests:** 117/117 ناجح (`npx tsx`، -P6).
**التحقّق بالكود:** QA102a ← tools `86eec1c` (`ToolsScreen.tsx:530`) ⇒ مُغلق. ui75a: chart `fef7559`، tools `70b4e13`، launch `3440a74`/`a557a94` ⇒ الباقي ui وحده (`WatchlistPanel.tsx:414`، `AlertsPanel.tsx:877`).
ملاحظة launch (run 168) «الرصيف 14 مدخلاً» ليست فشلاً: `MatrixBottomDock.tsx:58` أربعة + «المزيد» = 5. سجلّا ui/backend: لا طلب جديد.
**بعد السحب (5d2a36f):** أخضر 0. **launch169a → tools** مُتحقَّق (`riskCalcLostTodayOtherCcy` بلا قارئ `.tsx`). chart `ec525b7`/`e4ae27a`/`d862fa0`، tools `2918a82`/`3a73961`/`0b3ce00`، backend `3935ab7`/`a04e78f` منطق فقط؛ selftests المتغيّرة (5) ناجحة.
**قائمة قبول DESIGN-PRO (الثالث والعشرون):** 1/12 فشل (منخفض) — ردّاً على سؤال chart-r85 للبند 11: وسوم الأسعار داخل اللوح و`'900'` لـX/O مُستثناة (محتوى شارت بميزانية بكسل)؛
**QA103a → chart**: `priceLegendChip` (:14146) و`collapsedPageChip` (:14216) كروم بـ`paddingVertical: 1`. باقي diff منذ f739fca نظيف.
**المراجعة (c — `accessibilityLabel`):** مسح AST (`Pressable`/`Touchable*`/`Switch`/`TextInput`) ⇒ 5 أغلفة hover `accessible={false}` وأزرارها الداخلية مسمّاة، و`MessagesScreen` (launch52). **لا بند.**
**الدورة القادمة:** المراجعة (d) — أرقام متناقضة؛ وإعادة قائمة DESIGN-PRO.

## 2026-09-26 — الدورة 104
**البناء:** أخضر 0 (على a2af2ed، ثم 2d7fef1 بعد السحب) — لا إصلاح لازم. **Selftests:** 117/117 ناجح (`npx tsx`)؛ بعد السحب الخمسة المتغيّرة ناجحة.
**التحقّق بالكود:** أُغلقت QA103a ← chart `5dc60cb`؛ launch169a ← tools `a2af2ed` (`PositionSizePanel.tsx:1655`)؛ ui75a ← ui `f86eca3` (لا «🔔» بكود `.tsx`)؛
tools116a ← launch `3493f06` + tools `f08db6f` (`NewsRiskBanner.tsx:189`). جديد: **launch170a → tools** (لا قارئ لـ`journalRefreshErrorRetry`)؛ **ui-r77 → أنس** (الأحمر للأخطاء/الحذف مقابل §1).
backend `693b05f` (مجهول بلا معرّف تثبيت ⇒ 400): التطبيق يولّد دائماً معرّفاً يطابق `_INSTALL_ID_RE` ⇒ لا أثر.
**قائمة قبول DESIGN-PRO (الرابع والعشرون):** 0/12 فشل (diff منذ 5d2a36f ثم a2af2ed: أهمية محايدة بكلمة، أوزان 500، شارتا QA103a؛ الباقي منطق).
**المراجعة (d — أرقام متناقضة):** الجلسة 30 يوماً، ملاحظة 500، رمز ≤12، RSI 1–99 ⊂ 0–100، «50–100 lot» = `MAX_SANE_LOTS`، الماسح 30، الحساب 32/كلمة مرور 4 — متّسقة. **لا بند.**
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول؛ وإعادة قائمة DESIGN-PRO.

## 2026-09-26 — الدورة 105
**البناء:** أخضر 0 (على 4fece89) — لا إصلاح لازم. **Selftests:** 118/118 ناجح (`npx tsx`؛ جديد `indicators/warmup.selftest`).
**التحقّق بالكود:** launch170a ← tools `c377e8b` (`TradeJournalPanel.tsx:2419`) ⇒ مُغلق. **launch171a → ui** مُتحقَّق (`railDrawGroup*` بلا قارئ؛ `MatrixEdgeRails.tsx:281` أسماء موصولة بلا `accessibilityHint`). سجلّات chart 87/ui 79/backend 74: لا طلب جديد (backend-r74 داخل backend-r6).
**قائمة قبول DESIGN-PRO (الخامس والعشرون):** 0/12 فشل (diff منذ 2d7fef1: `RailMenu` حدّ+خلفية بلا ظلّ، اختيار بتعبئة+علامة، `menuitem` مسمّاة، شبكة 4، وزن 500).
**المراجعة (e — ما يُحرج أمام متداول):** tsx على `formatPrice`/`formatPriceDiff` لثمانية رموز ⇒ صحيحة. **QA105a → tools (منخفض)**: `formatPips` يقرّر العدد الصحيح قبل التقريب ⇒ «0.0»/«1000.0»/«−0.0 pip» بالدفتر.
**الدورة القادمة:** المراجعة (a) — تكرار/ميت/تصديرات؛ وإعادة قائمة DESIGN-PRO.

## 2026-09-26 — الدورة 106
**البناء:** أخضر 0 (على b75971e) — لا إصلاح لازم. **Selftests:** 119/119 ناجح (`npx tsx`، -P6).
**التحقّق بالكود:** launch171a ← ui `5fd7737` (`MatrixEdgeRails.tsx:283` اسم قصير + `accessibilityHint`) ⇒ مُغلق. launch172a باقٍ على chart (المفاتيح `a7b1023` بلا قارئ؛ `layoutStore.ts:25`/`drawingStore.ts:11`). chart-r88a/QA105a باقيان على tools (`TerminalScreen.tsx:1629/1796`، `tradePlan.ts:441`).
**`DECISIONS-ANAS.md` (`cc42fc3`):** ١–٣ مُسقطة (منفَّذة). ٤ ⇒ backend (`openrouter_ai.py:85` «خبير»)؛ ٧ ⇒ backend `main.py:328`+`db.py:1691`، ui `AccountScreen.tsx:163`، launch `regErrPasswordLength`؛ ٥ ⇒ ui+tools راية بناء (لا راية اليوم)؛ ٦ ⇒ ui+tools إخفاء `NewsPanel`. STATUS ⛔ من 23 إلى 20 + قسم «قراراتك».
**قائمة قبول DESIGN-PRO (السادس والعشرون):** 0/12 فشل (diff منذ 4fece89 منطق + `accessibilityHint`).
**المراجعة (a — ميت/تصديرات):** كل `export` بالملفّات المتغيّرة مستورد. **لا بند.**
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة؛ متابعة تنفيذ القرارات ٤–٧؛ وإعادة قائمة DESIGN-PRO.
**بعد السحب (a69f89e):** أخضر 0؛ chart-r88a ← tools مُغلق (تحقّق الأنماط: خفوت 0.35، مؤشّر محايد مسمّى).
**بعد السحب (636daf6):** أخضر 0؛ QA105a ← tools مُغلق (tsx على formatPips).

## 2026-09-26 — الدورة 107
**البناء:** أخضر 0 (على d5d7d01) — لا إصلاح لازم. **Selftests:** 119/119 ناجح (`npx tsx`).
**التحقّق بالكود:** أُغلقت launch172a ← chart `ba11a69` (`layoutStore.ts:95`، `drawingStore.ts:167`، العرض `t[saveError]`)؛ قرارا ٥/٦ ← ui `610cc82` + tools `d5d7d01` (`featureFlags.ts`؛ الرصيف/الشريط الأيمن/اللوح الجانبي/`hubPanelVisible` — لا مدخل باقٍ).
قرار ٤: backend `352ad77` + لا `.tsx` يعرض `setup` ⇒ الباقي launch (`aiGreeting` ×3 «سيناريو صفقة»). قرار ٧: backend `f41a0fc` + ui `1c06841` ⇒ **خلل ظاهر**: 5–7 أحرف تُرفض بنصّ «4 أحرف» (`regErrPasswordLength` ×3) → launch؛ تعليق `AccountScreen.tsx:170` قديم → ui (منخفض).
**قائمة قبول DESIGN-PRO (السابع والعشرون):** 0/12 فشل (diff منذ b75971e: رايات، إخفاء مداخل، `top: 40`).
**المراجعة (b — نصوص ثابتة):** لا نصّ حرفي جديد بـ`.tsx`. ومن (e): **QA107a → أنس** — «توقعات المؤشرات» (`IndicatorForecastPanel.tsx:279`) تعرض دخول/وقف/هدف بأسعار؛ القرار ٤ خاصّ بالمساعد ⇒ سؤال جديد لا إعادة فتح.
**الدورة القادمة:** المراجعة (c) — `accessibilityLabel`؛ متابعة launch (قرارا ٤/٧)؛ وإعادة قائمة DESIGN-PRO.
**بعد السحب (1bb0dfc):** أخضر 0؛ `barCountdown`/`liveSeries`/`authErrors` selftests ناجحة. قرارا ٤/٧ أُغلقا ← launch `9b4f9e6`/`29b6cae` + ui `c132823` (قبل أن يُرفع إدخالي). جديد **tools120a → ui** مُتحقَّق (`WatchlistPanel.tsx:67` كامن؛ الموضعان يمرّران `NO_PRICE_BASES`). ui `3a765d3` (إغلاق بـ`textMuted`) ⇒ لا فشل تصميم.

## 2026-09-26 — الدورة 108
**البناء:** أخضر 0 (على d222e72 ثم 1276abf بعد السحب) — لا إصلاح لازم. **Selftests:** 119/119 ناجح (`npx tsx`)؛ بعد السحب الثلاثة المتغيّرة (`barCountdown`/`liveSeries`/`tradePlan`) ناجحة.
**التحقّق بالكود:** أُغلقت QA107b ← ui `c38571f`؛ tools120a ← ui `b574e4d`؛ قرار ١٤ ← backend `1276abf` (قراءة diff: `pays_balance_bonus`، `_log_commission_on_place`، `gmtime`؛ pytest غير مثبّت على السيرفر فلم يُشغَّل). باقٍ launch174a → ui (`wlNoPriceA11ySuffix` بلا قارئ).
**الدفعة الثانية من `DECISIONS-ANAS.md` (`5def7c1`، ٨–١٥):** ٨ → chart+backend (`dailyChange.ts:29` يوم UTC)؛ ٩ → ui (`MessagesScreen.tsx`، `mock.ts:47`)؛ ١٠ → ui (لا راية)؛ ١١ → chart (`paneGuides.ts:168` max 100)؛ ١٢ → backend (القالب الكردي، QA27 أُسقط)؛ ١٣ → ui+launch (لا Sentry)؛ ١٥ → tools (`MAX_SMALL_LOTS` 200). STATUS ⛔ من 22 إلى 16.
**قائمة قبول DESIGN-PRO (الثامن والعشرون):** 0/12 فشل (diff منذ 1bb0dfc: منطق، حذف `FALLBACK`، نصوص).
**المراجعة (c — `accessibilityLabel`):** مسح AST (TypeScript API) على كل `.tsx` ⇒ 5 أغلفة `accessible={false}` و`MessagesScreen` (تُحذف بقرار ٩). **لا بند.**
**الدورة القادمة:** المراجعة (d) — أرقام متناقضة (حدّ اليوم بعد قرار ٨، حدّ السنت بعد ١٥، DeMarker بعد ١١)؛ متابعة تنفيذ ٨–١٣/١٥؛ وإعادة قائمة DESIGN-PRO.
**بعد السحب (d81f592):** قرار ١٦ + عيوب أنس على الويب (جولتان) ⇒ W1–W9 بـCOORDINATION (W1 مُتحقَّق: `TerminalScreen.tsx:2047/2147` `NO_PRICE_BASES`؛ W2 بملف tools `TerminalScreen.tsx:~1190`). نوافذ التأكيد الفارغة على الويب مُتحقَّقة منجزة (`confirmDestructive` ×11، لا `Alert.alert`). backend-r78a/b أُدرجا، وlaunch77 استُبدل بـr78a. البناء احمرّ (TS1117 `moderation.selftest.ts:57` من `49aa90d`) وأصلحه tools `e33a350` قبل رفع إصلاحي ⇒ أخضر 0؛ selftests المتغيّرة (liveSeries/movingAverages/moderation) ناجحة. diff ChartFrame/QuadChartModal استخراج دالّة ⇒ لا فشل تصميم.

## 2026-09-26 — الدورة 109
**البناء:** أخضر 0 (على 21a88e8) — لا إصلاح لازم. **Selftests:** 119/119 ناجح (`npx tsx`).
**التحقّق بالكود:** أُغلقت W1 ← ui `b1b9578` (`useLastCloses`، `WatchlistPanel.tsx:384–395`) + backend `a77a23a`/`aa923bf` (r79a)؛ W3 ويب ← ui `939830b`؛ W7 ← chart `21a88e8`؛ قرار ١١ ← chart `0a925d9` (`paneGuides.ts:169`)؛ ٩ ← ui `ba7a5a6`؛ ١٠ ← ui `2bd513c`؛ launch174a ← `WatchlistPanel.tsx:407`.
مُعلَّمة «منجزة بالكود — تنتظر نظرة أنس» (قاعدة DECISIONS). باقٍ مُتحقَّق: W2 (`TerminalScreen.tsx:~1195`)، W5 (`:2538` `maxHeight: 44`)، ٨ (`dailyChange.ts` يوم UTC — backend-r79b دُمج بالصفّ، الباقي chart)، ١٣، ١٥ (200)، r78a/b، ui84a.
جديد: **launch175a → chart** (منخفض، `dataSource.ts:11/13` «مزود/مخزن»).
**قائمة قبول DESIGN-PRO (التاسع والعشرون):** 0/12 فشل (diff منذ d81f592: تبويبات 500، `»` محايد ساكناً، `statusTag` `textDim`؛ `marginTop: -2` قديم).
**المراجعة (d — أرقام متناقضة):** DeMarker 0–1 متّسق (حساب/دليل/ألوان/`paneBoundedDecimals` = خانتان)؛ لا نصّ 30/70 له. حدّ السنت 200 = قرار ١٥ المفتوح. **لا بند جديد.**
**الدورة القادمة:** المراجعة (e) — ما يُحرج أمام متداول؛ متابعة W2/W4/W5/W6/W8/W9 و٨/١٣/١٥؛ وإعادة قائمة DESIGN-PRO.
