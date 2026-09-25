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
