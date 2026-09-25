# LOG-UI — سجلّ وكيل واجهة الهيكل (UI shell)
النطاق: كل ما تحت `mobile/src` عدا `chart/**` (الشارت)، الحاسبات/التخطيط/الدفتر/`ToolsScreen`/`TerminalScreen` (الأدوات)، `i18n/**` (الإطلاق). المالك الافتراضي لأي ملف بلا مالك.

## 2026-09-25 — تشغيل 1
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). الترتيب حسب ضرر المستخدم.

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| eb8b265 | 10 `Alert.alert` ← `confirmDestructive`/`notify` (Account حذف الحساب، Alerts ×4، IndicatorAlerts ×2، Watchlist ×2، FocusChart ×1) — كانت فارغة على الويب، وحذف الحساب لا يعمل هناك | chart29 |
| 1d71205 | `useMultiLiveTicks`: رفض ≤0/غير منتهٍ، إسقاط الرمز بعد 20ث بلا تيك، استبدال مقبس صامت، إعادة اتصال عند العودة للواجهة، نسيان الأسعار عند التعطيل؛ ثوابت إعادة الاتصال مستوردة من `useLiveTicks` | chart2، QA6 (RECONNECT) |
| e773a2b | «درجة الاتفاق n%» أُزيلت من المحلّلين والمجتمع (معادلة ثابتة بالخادم)؛ المحلّلون يعرضون عدّ شراء/بيع/محايد؛ محايد ⇒ «لا صفقة واضحة» بدل دخول=وقف=هدف؛ `VotePanel` المستويات بـ`formatPrice` | QA20، QA5 (Analysts/Vote) |
| fb1899d | 31 زرّاً ملوّناً حين يُختار ← `accessibilityState` (`selected`، و`expanded` لقائمة الأزواج وسرعة التحريك)؛ خلفية `MatrixSidePanel` مخفيّة عن قارئ الشاشة | QA13، QA3 ×2، QA2 (c) |
| e0dff08 | `TimeframeBar` ← `t.tfLabels`/`tfLabelsA11y` (الكردي كان يرى أطراً عربية)؛ حُذف `TIMEFRAME_LABELS` | QA2 |
| 42904cb | سطر «↺ أعد الجولة الترحيبية» بالحساب (يفتح `OnboardingOverlay` من الشاشة نفسها، بلا مساس `App.tsx`)؛ `accNetLoadError` بدل النصّ العربي الحرفي؛ `busy` للأزرار الثلاثة؛ `maxLength={32}` للاسم | launch67، QA2 (AccountScreen:248)، launch52، QA24 |
| 464fa48 | «₴» ← «▤» (الشريط والرصيف)؛ `DRAW_MARK` كامل (قناة ⫽، شعاع أفقي ↦، شراء ⤒، بيع ⤓) بدل «·» | launch4، chart20 |
| 356b6d0 | `CommissionPlanPanel`/`NetworkTreePanel`/`TreeDiagramSketch` ← `cpp*`/`ntp*`/`tds*`؛ `SubscriptionPlansPanel` ← `t.subPlans` (حُذف `COPY` الداخلي)؛ `expanded`/`busy` | QA2، launch52 (NetworkTree:168) |
| 40686e5 | تعليمة `matrix_advice` الأسبوعية: انضباط ومخاطر فقط، منع صريح للاتجاه والمستويات؛ `AiPanel`/`LectureClassroom` سؤال 2–2000 حرف | launch93، QA29 |
| b70a23e | رأس `FocusChartModal`: `headerChangePct` بدل `series.change_pct`، سعر `livePriceForHeader`، لا رأس فوق شموع الرمز السابق، «+0.00%» مكتوم؛ `mockBase` بدل `BASES` المحلّي | chart3/QA25، QA26 |
| dbb5781 | تنبيه السعر: رمز 3–12 محلياً (رسالة واضحة بدل 422 عامة)، ملاحظة ≤500، `busy`؛ `QUICK_SYMBOLS` من `tradePlan`؛ `CalendarPanel` يستورد `NEWS_HORIZON_MS`/`NEWS_GRACE_MS` | QA29، QA14، QA6، QA19 |

**باقٍ (لم يُنجز هذا التشغيل):**
- نصّ زرّ «أعد الجولة» محلّي بـ`AccountScreen` (`REPLAY_TOUR_COPY`) حتى يضيف الإطلاق مفتاحاً بـ`locales.ts` — الكردي بحاجة مراجعة. صفّ بـCOORDINATION.
- `FocusChartModal`: تحديث صامت 90ث، وفكّ الشارت عند كل تبديل (`loading ? spinner : MatrixChart`) يضيّع النوع/المؤشرات.
- `dirColor`/`dirLabel` ×3 و`VotePanel` `planSummaryText` منسوخة؛ `DomLitePanel` سبريد محلّي و`last` ميتة.
- `MessagesScreen` ميّتة (قرار أنس، launch52) فلم تُمسّ.
- صفوف الخادم (أسماء البنوك، `TradingCentral-like`، `v.mine`) خارج `mobile/src` ⇒ أنس/الخادم.

## 2026-09-25 — تشغيل 2
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). تحقّقتُ أولاً بالكود أن بنود المهمّة السبعة من التشغيل 1 قائمة: لا `Alert.alert` خارج `confirmDestructive`، لا «₴»، `useMultiLiveTicks` يرفض ≤0 ويُسقط بعد 20ث، مسح آلي للأزرار الملوّنة حين تُختار بملفاتي = 0 بلا `accessibilityState`، ولا نصّ عربي حرفي بواجهة ملفاتي (عدا `MessagesScreen` الميّتة ⛔ أنس، وبيانات `mock.ts`، وتعليمات الذكاء التي يحدّد الخادم لغة ردّها من `lang`).

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 73b0553 | زرّ «أعد الجولة» ← `t.accReplayTour`/`accReplayTourA11y` (مفتاحا الإطلاق b48ff08)؛ حُذف `REPLAY_TOUR_COPY` المحلّي | ui1 |
| b8ee2f9 | `CalendarPanel`: `status: 'unavailable'` ⇒ `t.calendarUnavailable` بدل «لا أحداث بهذا الفلتر»؛ التحديث الصامت يُبقي آخر أحداث معروفة مع سطر تحذير؛ نوع `status`/`as_of` بـ`api.calendar` | launch102 (جزء ui؛ `newsRisk.ts` للشارت) |
| 5c85d98 | الإشارات: `levels`/`analysts[].target` قد تكون null (backend-r1) ⇒ السبب من `levels_basis.unavailable` (`sigLevels*`) بدل الفراغ، ولا «هدف null»؛ `dirColor`/`dirLabel` ← `components/signalDirection.ts` (كانت ×3) | backend-r1 (إشارات)، QA1 (dirColor) |
| 5957d8d | `FocusChartModal`: الشارت يبقى مركَّباً عند تبديل الرمز/الفريم (باهت + مؤشّر `busy`) فلا يضيع النوع/المؤشرات/اللوغاريتمي؛ لا تيك الرمز الجديد فوق شموع القديم؛ تحديث صامت 90ث كالرباعي | chart3 (الباقي) |
| 55b13a9 | `VotePanel` ← `planSummaryText` المشترك بدل النسخة المحلية | QA1 (planSummaryText) |
| 7ff4e5c | `DomLitePanel` ← `quoteSpreadPips`؛ حُذفت الخاصية الميتة `last`/`candles` (Dock/SidePanel تبقيانها `@deprecated` حتى تكفّ الطرفية عن تمريرها) | QA11 |

**باقٍ / لغيري:**
- `chart/newsRisk.ts` `calendarFetchEvents`: `status === 'unavailable'` ⇒ `null` (تحذير الخبر القريب) — للشارت (launch102).
- DXY `unavailable`: `DataOriginKind` و`normalizeProvenance` بـ`chart/dataSource.ts` (الشارت)؛ قائمة المتابعة تعرض سعر `bases` موسوماً «تجريبي» — ليس رقماً مقدَّماً كحقيقي.
- `TerminalScreen.tsx:1829 :1850` يكفّ عن تمرير `lastPrice`/`candles` (الأدوات) ثم أحذفهما.
- `VotePanel` استثناء فكرة المتداول من فلتر الحظر: الخادم لا يرسل `mine` للأفكار (`db.py` يرسله للرسائل فقط) ⇒ الخادم.
- `MessagesScreen` ميّتة (قرار أنس، launch52).

