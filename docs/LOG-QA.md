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
