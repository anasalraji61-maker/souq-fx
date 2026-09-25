# LOG-UI — سجلّ وكيل واجهة الهيكل (UI shell)
النطاق: كل ما تحت `mobile/src` عدا `chart/**` (الشارت)، الحاسبات/التخطيط/الدفتر/`ToolsScreen`/`TerminalScreen` (الأدوات)، `i18n/**` (الإطلاق). المالك الافتراضي لأي ملف بلا مالك.

## 2026-09-25 — تشغيل 1
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). الترتيب حسب ضرر المستخدم.

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 1a4536f | 10 `Alert.alert` ← `confirmDestructive`/`notify` (Account حذف الحساب، Alerts ×4، IndicatorAlerts ×2، Watchlist ×2، FocusChart ×1) — كانت فارغة على الويب، وحذف الحساب لا يعمل هناك | chart29 |
| 8a3d602 | `useMultiLiveTicks`: رفض ≤0/غير منتهٍ، إسقاط الرمز بعد 20ث بلا تيك، استبدال مقبس صامت، إعادة اتصال عند العودة للواجهة، نسيان الأسعار عند التعطيل؛ ثوابت إعادة الاتصال مستوردة من `useLiveTicks` | chart2، QA6 (RECONNECT) |
| bd9772b | «درجة الاتفاق n%» أُزيلت من المحلّلين والمجتمع (معادلة ثابتة بالخادم)؛ المحلّلون يعرضون عدّ شراء/بيع/محايد؛ محايد ⇒ «لا صفقة واضحة» بدل دخول=وقف=هدف؛ `VotePanel` المستويات بـ`formatPrice` | QA20، QA5 (Analysts/Vote) |
| 511fa7b | 31 زرّاً ملوّناً حين يُختار ← `accessibilityState` (`selected`، و`expanded` لقائمة الأزواج وسرعة التحريك)؛ خلفية `MatrixSidePanel` مخفيّة عن قارئ الشاشة | QA13، QA3 ×2، QA2 (c) |
| 8d5b768 | `TimeframeBar` ← `t.tfLabels`/`tfLabelsA11y` (الكردي كان يرى أطراً عربية)؛ حُذف `TIMEFRAME_LABELS` | QA2 |
| 1061eae | سطر «↺ أعد الجولة الترحيبية» بالحساب (يفتح `OnboardingOverlay` من الشاشة نفسها، بلا مساس `App.tsx`)؛ `accNetLoadError` بدل النصّ العربي الحرفي؛ `busy` للأزرار الثلاثة؛ `maxLength={32}` للاسم | launch67، QA2 (AccountScreen:248)، launch52، QA24 |
| 2ac446e | «₴» ← «▤» (الشريط والرصيف)؛ `DRAW_MARK` كامل (قناة ⫽، شعاع أفقي ↦، شراء ⤒، بيع ⤓) بدل «·» | launch4، chart20 |
| 8602070 | `CommissionPlanPanel`/`NetworkTreePanel`/`TreeDiagramSketch` ← `cpp*`/`ntp*`/`tds*`؛ `SubscriptionPlansPanel` ← `t.subPlans` (حُذف `COPY` الداخلي)؛ `expanded`/`busy` | QA2، launch52 (NetworkTree:168) |
| d26d741 | تعليمة `matrix_advice` الأسبوعية: انضباط ومخاطر فقط، منع صريح للاتجاه والمستويات؛ `AiPanel`/`LectureClassroom` سؤال 2–2000 حرف | launch93، QA29 |
| 75c67a4 | رأس `FocusChartModal`: `headerChangePct` بدل `series.change_pct`، سعر `livePriceForHeader`، لا رأس فوق شموع الرمز السابق، «+0.00%» مكتوم؛ `mockBase` بدل `BASES` المحلّي | chart3/QA25، QA26 |
| 042bc31 | تنبيه السعر: رمز 3–12 محلياً (رسالة واضحة بدل 422 عامة)، ملاحظة ≤500، `busy`؛ `QUICK_SYMBOLS` من `tradePlan`؛ `CalendarPanel` يستورد `NEWS_HORIZON_MS`/`NEWS_GRACE_MS` | QA29، QA14، QA6، QA19 |

**باقٍ (لم يُنجز هذا التشغيل):**
- نصّ زرّ «أعد الجولة» محلّي بـ`AccountScreen` (`REPLAY_TOUR_COPY`) حتى يضيف الإطلاق مفتاحاً بـ`locales.ts` — الكردي بحاجة مراجعة. صفّ بـCOORDINATION.
- `FocusChartModal`: تحديث صامت 90ث، وفكّ الشارت عند كل تبديل (`loading ? spinner : MatrixChart`) يضيّع النوع/المؤشرات.
- `dirColor`/`dirLabel` ×3 و`VotePanel` `planSummaryText` منسوخة؛ `DomLitePanel` سبريد محلّي و`last` ميتة.
- `MessagesScreen` ميّتة (قرار أنس، launch52) فلم تُمسّ.
- صفوف الخادم (أسماء البنوك، `TradingCentral-like`، `v.mine`) خارج `mobile/src` ⇒ أنس/الخادم.
