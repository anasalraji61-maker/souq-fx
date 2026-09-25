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
| 713d55f | زرّ «أعد الجولة» ← `t.accReplayTour`/`accReplayTourA11y` (مفتاحا الإطلاق b48ff08)؛ حُذف `REPLAY_TOUR_COPY` المحلّي | ui1 |
| 5167d24 | `CalendarPanel`: `status: 'unavailable'` ⇒ `t.calendarUnavailable` بدل «لا أحداث بهذا الفلتر»؛ التحديث الصامت يُبقي آخر أحداث معروفة مع سطر تحذير؛ نوع `status`/`as_of` بـ`api.calendar` | launch102 (جزء ui؛ `newsRisk.ts` للشارت) |
| e890e9b | الإشارات: `levels`/`analysts[].target` قد تكون null (backend-r1) ⇒ السبب من `levels_basis.unavailable` (`sigLevels*`) بدل الفراغ، ولا «هدف null»؛ `dirColor`/`dirLabel` ← `components/signalDirection.ts` (كانت ×3) | backend-r1 (إشارات)، QA1 (dirColor) |
| 6092085 | `FocusChartModal`: الشارت يبقى مركَّباً عند تبديل الرمز/الفريم (باهت + مؤشّر `busy`) فلا يضيع النوع/المؤشرات/اللوغاريتمي؛ لا تيك الرمز الجديد فوق شموع القديم؛ تحديث صامت 90ث كالرباعي | chart3 (الباقي) |
| a7c1629 | `VotePanel` ← `planSummaryText` المشترك بدل النسخة المحلية | QA1 (planSummaryText) |
| 504548e | `DomLitePanel` ← `quoteSpreadPips`؛ حُذفت الخاصية الميتة `last`/`candles` (Dock/SidePanel تبقيانها `@deprecated` حتى تكفّ الطرفية عن تمريرها) | QA11 |
| 99f43e9 | **⛔ انهيار (launch103)**: backend-r2 يرسل `avg_score: null` ⇒ `toFixed` كان يُسقط التطبيق كلّه عند فتح «المحلّلين». `status: 'unavailable'` ⇒ `analystsUnavailable`/`socialUnavailable` بدل «محايد»؛ المجتمع لا يعرض «محايد · +0.00» قبل أي نتيجة ويُسقط معرّفات مصادر محفوظة ليست بالكتالوج؛ `formatScore` مشترك | launch103، backend-r2 |
| 5b42f3a | `api.trades({limit, offset})` + `total`؛ `postJson` يرفق `status`/`detail` (409)؛ التقرير الأسبوعي يطلب صفّاً واحداً (يقرأ `stats` فقط) | tools67 |
| b1da89f | أنواع `indicatorForecast`: `lang`، `detail_code`/`detail_values`، `disclaimer_code`، `price_decimals`؛ `direction`/`avg_score` nullable بلا `confidence` | backend-r3، chart-r35 (2) |
| df61575 | `VotePanel`: رمز الفكرة كالخادم (تُزال «/»، 3–12 حرفاً/رقماً) برسالة واضحة، 422 = خطأ نموذج | backend-r3 (QA29) |
| 8193d5e | حُذفت `lastPrice`/`candles` من `MatrixBottomDock`/`MatrixSidePanel` بعد أن كفّت الطرفية عن تمريرها (6119b24) | ui2 |

**باقٍ / لغيري:**
- `DataOriginKind` + `'unavailable'` (chart-r35 (1)): جرّبتُه — يكسر 4 مواضع `Record<DataOriginKind,string>` (`chart/dataSource.ts:5`، `ChartFrame:208`، `FocusChartModal:326`، `TerminalScreen:947`) ولا مفتاح «غير متاح» عام ⇒ لم يُدمج؛ صفّ للشارت/الإطلاق.
- `CalendarPanel`: `isSample`/`calSampleBanner` أُبقي عمداً (خادم أقدم يرسل عيّنة ⇒ لا تُعرض كحقيقية). `holiday`/`none`/`unknown` نقطة رمادية بلا كلمة حتى مفتاح `impactHoliday` (الإطلاق).
- DXY بقائمة المتابعة: قائمة المتابعة تعرض سعر `bases` موسوماً «تجريبي» — ليس رقماً مقدَّماً كحقيقي.
- `VotePanel` استثناء فكرة المتداول من فلتر الحظر: الخادم لا يرسل `mine` للأفكار (`db.py` يرسله للرسائل فقط) ⇒ الخادم.
- `MessagesScreen` ميّتة (قرار أنس، launch52).

## 2026-09-25 — تشغيل 3
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). صفوف COORDINATION الموجّهة لـui أولاً، ثم مسح تراجعات لبنود المهمّة السبعة (أزرار بلون فقط، `Alert.alert`، عربي حرفي، «₴»، «درجة الاتفاق»، سعر متجمّد، إعادة الجولة) — كلها قائمة عدا ما أُصلح أدناه.

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 7b56e40 | `Vote.mine` بالنوع؛ فكرة المتداول لا يُخفيها فلتر الحظر، ولا قائمة إبلاغ/حظر عليها (كالدردشة) | backend-r4، ui2، tools+QA (VotePanel:26) |
| 5968660 | `DataOriginKind` + `'unavailable'` (الشارت جهّز `ec57a4a`)؛ رأس `FocusChartModal` يقول «غير متاح» لا «غير معروف» | chart-r35 (1)، ui3، backend-r2 (1) |
| 7fd8748 | `BacktestPanel`: `costs_included === false` ⇒ `t.backtestBeforeCosts` (DXY/الرقمية لم تعد تبدو صافية)؛ نوع `stats` يقبل boolean/null | backend-r3، launch104 (2) |
| 1bdd381 | `CalendarPanel`: `impact: 'holiday'` ⇒ كلمة `t.impactHoliday` بلون تنبيه بدل نقطة رمادية | backend-r3، ui3، launch104 (3) |
| d663079 | `BacktestPanel`: عدد التعادلات بجانب نسبة النجاح (`breakeven_count`) بنصّ `journalStatBreakeven` | backend-r5 |
| eb13382 | `WeeklyReportPanel`: البلاطات/البطاقات تعلن `selected`/`busy` (كانت باللون فقط — المسح وجدها) | QA13 (تراجع) |
| f896484 | `VotePanel`: بلا أصوات لا «موافقة 0%» ولا شريط — العدّان فقط | — |
| 1eb6075 | `mock.ts`: حُذفت تجهيزات مختلَقة ميّتة (`mockChat`/`mockVotes` 18/5/`mockNews` فيدرالي/`mockTerminal`/`mockCourses`) و`FRAME_SYMBOLS`؛ `TF_SECONDS` من `timeframes` | QA1 (a) جزء ui |

**لم يُحتج / لغيري:**
- `NewsRiskBanner` ← `t.newsHolidayToday`: أنجزه tools (`686c90e`) قبلي فأُسقطت نسختي المطابقة عند الـrebase.
- `IndicatorForecastPanel` `lang`/`detail_code`/`disclaimer_code` (launch104 (1)): أنجزه chart (`38ccb87`).
- قائمة المتابعة تسِم `demo` فقط؛ `'unknown'` يظهر حيّاً ⇒ صفّ ui4 لـtools (`TerminalScreen`). التيك يُسقط بعد 20ث (`useMultiLiveTicks`) فأقصى عمر معروض ~25ث.
- `CommissionPlanPanel` جدول احتياطي بنسب ثابتة عند فشل الخادم — نسب خطّة MATRIX نفسها (ليست بيانات سوق) ومعلَّمة تقريبية ⇒ أُبقيت.
- `api.ts` `from_user: 'أنت'` و`mockPeers` تخدم `MessagesScreen` الميّتة فقط (قرار أنس، launch52).
- `motion` (`theme.ts`) بلا مستعمل — توكن تصميم مُبقى عمداً (مدد 160–220ms بقاعدة اللمسة).


## 2026-09-25 — تشغيل 4
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). تحقّقتُ بالكود من بنود المهمّة السبعة قبل أي تعديل: مسح آلي لكل `Pressable`/`TouchableOpacity` بملفاتي بنمط مختار/فعّال بلا `accessibilityState` = 0؛ القاموس الكردي بلا مفتاح ناقص ولا قيمة منسوخة من العربي (فحص `DICTS.ku` مقابل `DICTS.ar` = 0)؛ لا «₴»؛ لا `Alert.alert` خارج `confirmDestructive`؛ «أعد الجولة» بالحساب؛ لا «درجة اتفاق» بالمحلّلين/المجتمع. البند الوحيد الذي بقي فيه ضرر فعلي هو السعر المتجمّد، فأُصلح أدناه.

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 95093aa | **سعر متجمّد**: الخادم يعيد بثّ كل رمز وصل خلال دقيقتين من أحدثها كل ثانية، والعميل كان يختمه بلحظة الوصول ⇒ قائمة المتابعة/الرباعي/رأس الشارت الموسّع تعرضه حيّاً حتى ~دقيقتين. `hooks/tickAge.ts`: العمر = `ts − ticks_at[sym]` (ساعة الخادم نفسها، بلا فرق ساعة) ⇒ أقدم من `TICK_STALE_MS` يُرفض؛ `at` = لحظة الاستلام الحقيقية؛ `as_of` للرمز نفسه لا أحدث رمز بالدفعة. خادم أقدم بلا `ticks_at` ⇒ السلوك السابق. `tickAge.selftest.ts` | backend `1f40c21` |
| 6544dd7 | `WeeklyReportPanel`: دفتر كل مغلقاته تعادل ⇒ «نجاح=—» لا «0%» (تُقرأ «خسر كل صفقاته»)؛ `win_rate: null` مقبول | backend-r6 (5) (جزء ui) |
| 9c3a532 | `SymbolSnapshot`: الشريحة ± تُسمّى بنافذتها `t.snapChangeOverBars` («… خلال آخر 180 شمعة») لا تبدو «تغيّر اليوم»؛ `change_pct: null` ⇒ «—»؛ نوع `change_bars`/`timeframe` | backend-r6 (2)، launch106 |
| 8ca1226 | `NewsPanel`: `impact_basis: 'headline_keywords'` ⇒ «≈» على الشارة + سطر `t.newsImpactFromHeadline` واحد فوق القائمة | backend-r6 (3)، launch106 |

**لم أنفّذه / لغيري:**
- **QA52 `dsKindLabels` بـ`TerminalScreen.tsx:934`** موجّه لـui، لكن `TerminalScreen` ملك tools بحسب توزيع النطاق ⇒ لم ألمسه (سطر واحد: `unavailable: t.dsKindUnavailable` كـ`FocusChartModal.tsx:331`). يُرجى تحويل الصفّ لـtools.
- ui4 (قائمة المتابعة `'unknown'` حيّ) بـ`TerminalScreen` ⇒ tools. بعد 95093aa السعر المتجمّد يُرفض على أي حال عند خادم يرسل `ticks_at`.
- backend-r6 (5) جزء tools (`TradeJournalPanel.tsx:1422`) ⇒ tools.

## 2026-09-25 — تشغيل 5
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). صفوف COORDINATION الموجّهة لـui أولاً (ثلاثة، منها launch107 وصل أثناء التشغيل)، ثم تحقّق بالكود من بنود المهمّة السبعة.

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 168f40f | `BacktestPanel`: كل الصفقات تعادل ⇒ «نسبة نجاح: —» لا «0%» (`journalWinRateLine`)؛ `win_rate: number \| null` ⇒ الصفّ حُوِّل لـbackend ليرسل `null` | tools71 (أُغلق)، backend-r7 (← backend) |
| 5bcd81a | `NewsPanel`: شارة التأثير «≈» تُقرأ `t.newsImpactEstimatedA11y` («تأثير عالي — تقدير من كلمات العنوان») لا «يساوي تقريباً عالي» | launch107 (ui، أُغلق) |
| ea7e3d5 | **الكردية/الإنجليزية تعرض عربياً**: جدول العمولات (النوع/الشرط/الدور) وسطر الدور بالحساب كانت نصوص الخادم العربية الثابتة (`commissions.py` `ROLE_LABELS_AR`، `db.commission_report`) ⇒ تُترجَم بمفاتيح القاموس القائمة؛ نصّ مجهول يمرّ كما هو | — |

**تحقّق بنود المهمّة (بالكود، لا بالسجل):**
- حالة الاختيار باللون فقط: مسح آلي لكل `Pressable`/`Touchable*` بـ`mobile/src` (كل المالكين) بشرط نمط/لون مشروط بلا `accessibilityState` ⇒ صفر بملفاتي؛ الإصابتان الباقيتان (`MatrixChart.tsx:6376`، `ToolsScreen.tsx:789`) لون اتجاه نسبة موقَّعة لا حالة اختيار.
- الكردي: `DICTS.ku` مقابل `DICTS.ar` — صفر قيمة عربية منسوخة. نصوص عربية ثابتة خارج القاموس بملفاتي: `WeeklyReportPanel` (تعليمات AI داخلية، الخادم يجيب بـ`lang`) و`MessagesScreen` (ميّتة، launch52) فقط. الباقي كان من الخادم ⇒ ea7e3d5.
- «₴»: لا يوجد إلا بتعليقين يشرحان إزالته. الأيقونة «▤».
- `Alert.alert`: فقط داخل `confirmDestructive` (يستعمل `window.confirm` على الويب)؛ حذف الحساب وإغلاق الصفقات يمرّان بها.
- الجولة الترحيبية: زرّ «أعد الجولة» بالحساب (`AccountScreen.tsx:219`) + النقاط رجوع + رجوع أندرويد خطوةً.
- «درجة الاتفاق»: أُزيلت من `AnalystsPanel`/`SocialConsensusPanel`؛ يُعرض عدّ الآراء ومتوسّطها فقط.
- السعر المتجمّد: `tickAge.ts` (95093aa، تشغيل 4) يرفض أقدم من `TICK_STALE_MS` بساعة الخادم؛ QA53 أغلق ui4.

## 2026-09-25 — تشغيل 6
بوابة البناء خضراء قبل الـcommit (tsc 0 أخطاء). لا صفّ موجّه لـui بـCOORDINATION (QA53)؛ صفّ (a) «الجميع»: التصديرات العشرة الباقية كلّها بـ`chart/` (و`motion` مُبقى عمداً).

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 9982e8a | **بيانات مخترعة بلا وسم**: شارت قاعة المحاضرة بلا اتصال يرسم `mockSeries(…, 1.08)` لكل رمز ⇒ مدرستا غان وSK تعرضان «XAUUSD» حول 1.08 بلا أي وسم. الآن `mockBase(symbol)` + وسم «تجريبي»/«غير متاح» (`dsKindDemo`/`dsKindUnavailable`) برأس الشارت حين `data_source` تجريبي — كالرباعي | — |

**إعادة تحقّق بنود المهمّة بالكود (لا بالسجل):**
- حالة الاختيار باللون: مسحان آليان بملفاتي — (1) نمط/لون مشروط على `Pressable`/`Touchable*` نفسه، (2) نمط مشروط باسم حالة (active/selected/on…) داخل أبنائه — بلا `accessibilityState` ⇒ صفر (إصابتان كاذبتان: `rtl`).
- الكردي: `DICTS.ku` مقابل `DICTS.ar` (tsx) — صفر ناقص، صفر منسوخ. نصّ عربي ثابت خارج التعليقات: `MessagesScreen` (ميّتة، launch52) و`academy.ts` (QA27) فقط — قرارا أنس.
- «₴» بتعليقين فقط؛ `Alert.alert` داخل `confirmDestructive` فقط؛ «أعد الجولة» `AccountScreen.tsx:219`؛ «درجة الاتفاق» أُزيلت؛ السعر المتجمّد `tickAge.ts`.
- ملاحظة كامنة: `AnalystsPanel`/`SocialConsensusPanel` يعرضان `res.disclaimer` (عربي/إنجليزي من الخادم) — غير قابل للوصول اليوم لأن `signal_hub` يعيد `unavailable` دائماً بلا `disclaimer`. حين يُربط مصدر مرخَّص: يحتاج الخادم `disclaimer_code` كـ`indicator_forecast` ليُترجَم للكردي.

## 2026-09-25 — تشغيل 7
بوابة البناء خضراء قبل الـcommit (tsc 0 أخطاء). لا صفّ موجّه لـui بـCOORDINATION (QA54)؛ صفّ (a) «الجميع»: التصديرات الباقية بـ`chart/` (و`motion` مُبقى عمداً).

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 8bcb901 | **الاختيار باللون/الشارة فقط**: مع تزامن الزمن كل إطار شارت (`ChartFrame`) زرّ `accessible`، والقائد يُعرف بشارة خضراء **داخله** لا يقرؤها VoiceOver (عنصر `accessible` يبتلع أبناءه). الآن `accessibilityState.selected` للقائد + الشارة («قائد»/«تابع»/«جزئي») بوسم الزرّ | — |
| 2bedbff | **launch109**: نسبة الرأس بـ`ChartFrame`/`QuadChartModal`/`FocusChartModal` تُقرأ «تغيّر اليوم +0.12%»، و«—» «تغيّر اليوم غير متاح لهذا السعر» (`cfDayChangeA11y`/`cfDayChangeNoneA11y`)؛ بالتركيز الذيل (التيك · المصدر · السوق · B/A) بالوسم كما يُرى | launch109 (أُغلق) |

**إعادة تحقّق بنود المهمّة بالكود (لا بالسجل):**
- حالة الاختيار: مسح آلي أوسع (أنماط مشروطة بـ`===`/`active`/`selected`… داخل كل `Pressable`/`Touchable*`/`Switch`) بلا `accessibilityState` ⇒ إصابة واحدة حقيقية (أعلاه)؛ ومسح ثانٍ: لا زرّ رمزيّ ولا `Switch`/`TextInput` بلا وسم بملفاتي. أزرار `MatrixBottomDock`/`MatrixSidePanel`/`LectureClassroom`/`MatrixEdgeRails`/`IndicatorAlertsPanel` بلا حالة كلّها أفعال (إغلاق/حذف/استئناف) لا مفاتيح.
- الكردي: مقارنة **عميقة** `DICTS.ku` مقابل `DICTS.ar` (كائنات متداخلة ومصفوفات كـ`subPlans` ودوالّ) ⇒ صفر منسوخ (عدا `listSep` «، » الصحيح بالسورانية). لا `*_ar` يُعرض بلا لغة؛ الخطط من `t.subPlans`؛ الشبكة أرقام؛ العمولات ea7e3d5.
- «₴» بتعليقين فقط؛ `Alert.alert` داخل `confirmDestructive` فقط (10 مواضع تأكيد تمرّ بها)؛ «أعد الجولة» `AccountScreen.tsx:219`؛ «درجة الاتفاق» أُزيلت.
- قائمة المتابعة: التيك المتجمّد يُرفض (`tickAge.ts`). بلا تيك حيّ تعرض `MOCK_BASES` **موسومة** («افتراضي»/«Demo»/«نموونەیی» + لاحقة قارئ الشاشة «سعر افتراضي») بنفس قواعد شموع العرض التجريبي ⇒ موسومة بوضوح، أُبقيت.

## 2026-09-25 — تشغيل 8
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). صفّان موجّهان لـui بـCOORDINATION (backend-r10 أ وج) — أُنجزا.

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 6afb33b | `BacktestPanel`: المركز المفتوح بآخر شمعة (`open: true`) يُعرض «دخول (مفتوحة)» بدل «دخول → آخر إغلاق» كصفقة منتهية، وسطر «شراء/بيع (مفتوحة): +x%» من `stats.open_pnl_pct` بجانب الإحصاء (يظهر ولو `trade_count` = 0، والقائمة محدودة الارتفاع قد تخفي الصفّ الأخير). مفاتيح قائمة فقط (`journalOpenSuffix`، `dirBuy/dirSell`) — لا مفتاح جديد | backend-r10 (أ) (أُنجز) |
| 0350136 | `ScreenerMini`: نتيجة من سلسلة مخزَّنة (`data_kind: 'cache'`، حتى 15د عند حدّ المزوّد) موسومة «· مخزن» (`dsKindCache`) بجانب الرمز — RSI/التقاطع كانا يُقرآن «الآن» | backend-r10 (ج) (أُنجز) |

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط؛ `Alert.alert` داخل `confirmDestructive`/`notify` فقط (الويب `window.confirm`/`alert`)؛ «أعد الجولة» `AccountScreen.tsx:221`؛ «درجة الاتفاق» أُزيلت (تعليقان)؛ مسح آلي لنمط مشروط (active/selected/on/===) على `Pressable`/`Touchable*` بلا `accessibilityState` بملفاتي ⇒ صفر. tools73 (`setLang` ⇒ `registerPushToken`) بـ`i18n/I18nContext.tsx` = ملك launch، لم يُمسّ.

## 2026-09-25 — تشغيل 9
بوابة البناء خضراء قبل الـcommit (tsc 0 أخطاء). صفّان موجّهان لـui بـCOORDINATION: launch110 (منفَّذ سلفاً `3f7ea80`، التعليق صحيح بالكود — الصفّ بانتظار إغلاق QA) وbackend-r12 (أُنجز).

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 095954f | `AiPanel`: تحت كل جواب له `price_as_of` سطر خافت «السعر بالجواب: إغلاق {time} بتوقيتك — ليس سعراً حيّاً» (الوقت وحده لليوم نفسه، وإلا يوم الأسبوع والتاريخ؛ الكردي `DD/MM`). الدخول بنصّ النموذج كان يُقرأ سعراً حيّاً وهو سلسلة مخزَّنة حتى 15د أو إغلاق الجمعة. النصّ محلّي `PRICE_AT_COPY` حتى يضيف الإطلاق `aiPriceAsOf` (صفّ ui9 جديد) | backend-r12 (أُنجز)، ui9 (فُتح ← launch) |

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط؛ `Alert.alert` داخل `confirmDestructive` فقط؛ «أعد الجولة» `AccountScreen.tsx` (`OnboardingOverlay`)؛ «درجة الاتفاق» أُزيلت (تعليقان)؛ التيك المتجمّد يُرفض (`TICK_STALE_MS`)؛ مسح نمط مشروط على `Pressable`/`Touchable*` بلا `accessibilityState` ⇒ صفر. `WatchSymbol`/`__resetWatchlistMemoryForTests` (صفّ a) بـ`chart/` ⇒ chart.

## 2026-09-25 — تشغيل 10
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). أربعة صفوف موجّهة لـui بـCOORDINATION: launch110 (منفَّذ سلفاً `3f7ea80` — التعليق `notifications.ts:39-41` صحيح بالكود، بانتظار إغلاق QA)، backend-r12 (منفَّذ `095954f`)، وlaunch111 (أنجزه chart بالتوازي) وui9 — أُنجز.

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| — | launch111: كتبتُ الإصلاح نفسه ووجدت chart سبقني بـ`5658652` (نفس `ChartFrame.tsx`، نفس المفتاحين) ⇒ أُسقط commit ui المكرّر. **لـlaunch:** `cfSpreadA11y` صار بلا مستعمل (`locales.ts` ×4) — احذفه | launch111 (أنجزه chart) |
| c2a765f | `AiPanel`: يقرأ `t.aiPriceAsOf` مباشرة، حُذفت `PRICE_AT_COPY` المحلية | ui9 (أُنجز) |

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط؛ `Alert.alert` داخل `confirmDestructive`/`notify` فقط (9 ملفات تمرّ بها، منها حذف الحساب)؛ «أعد الجولة» `AccountScreen.tsx:219`؛ «درجة الاتفاق» أُزيلت (تعليقان)؛ التيك المتجمّد يُرفض (`acceptTick` + `TICK_STALE_MS` بـ`useLiveTicks`/`useMultiLiveTicks`)؛ مسح نمط مشروط (===/active/selected/on) على كل `Pressable`/`Touchable*` بملفاتي بلا `accessibilityState` ⇒ صفر (8 إصابات مرشّحة كلها تحمل الحالة بعد نافذة المسح). نصّ عربي بلا ترجمة: `CommissionPlanPanel` مفاتيح مطابقة لنصّ الخادم (تُترجَم)، `WeeklyReportPanel` موجّهات للنموذج لا تُعرض، `MessagesScreen` ميّتة (launch52، أنس).

## 2026-09-25 — تشغيل 11
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). صفّان موجّهان لـui بـCOORDINATION أُنجزا؛ launch111 أنجزه chart (`ChartFrame.tsx:433-436` يقرأ `cfSpreadBidAskA11y`/`cfSpreadPipsA11y`)، وui9 منفَّذ (`c2a765f`).

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 75a7ba1 | `CalendarPanel`: حدث `time_tbd` (أو `ts` = منتصف ليل نيويورك بالضبط، `newsTimeUnannounced`) يُعرض **تاريخَ يومه بنيويورك** + «الساعة غير معلنة» بدل «07:00» مخترَعة؛ بلا عدّ تنازلي ولا تلوين «قريب»، خارج عدّاد «القادم خلال 24 ساعة»، ويبقى «قادماً» حتى نهاية يومه (`UNANNOUNCED_SPAN_MS`). النصّ محلّي `TIME_TBD_COPY` حتى يضيف launch `calTimeTbd` | backend-r14 (أُنجز)، ui10 (فُتح ← launch) |
| 6a58a2b | `ScreenerMini`: اتجاه لون النسبة من `pctDirection` (تقريب `formatPct` نفسه) — ‎−0.005 كان يُطبع «−0.01%» بالرمادي | tools75b (أُنجز) |

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط؛ `Alert.alert` داخل `chart/confirmDestructive.ts` فقط (الويب `window.confirm`/`alert`، منها حذف الحساب)؛ «أعد الجولة» `AccountScreen.tsx:219`؛ «درجة الاتفاق» أُزيلت (تعليقان)؛ التيك المتجمّد يُرفض (`acceptTick` + `TICK_STALE_MS` بـ`useMultiLiveTicks`)؛ مسح آلي لكل `Pressable`/`Touchable*`/`Switch` بملفاتي بحالة مشروطة (props + الأبناء) بلا `accessibilityState` ⇒ 6 مرشّحات كلها كاذبة (`active` = فهرس العجلة بـ`PairDrumWheel`، علامة ثابتة بـ`PanSpeedSlider`، و`TerminalScreen` ملك tools).

## 2026-09-25 — تشغيل 12
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). صفوف ui بـCOORDINATION: backend-r14 وtools75b منفَّذان (`75a7ba1`، `6a58a2b` — بانتظار إغلاق QA)؛ ui10 أضافه launch (`65700ad`) ⇒ حُذفت النسخة المحلية.

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| c24c7aa | `CalendarPanel` يقرأ `t.calTimeTbd` مباشرة، حُذفت `TIME_TBD_COPY` | ui10 (أُغلق من جهتي) |
| 6b1875a | `GroupChatPanel`: وقت الرسالة من `created_at` (ثوانٍ UTC) بتوقيت الجهاز، ومع اليوم إن لم يكن اليوم — `ts` «HH:MM» بساعة الخادم (برلين) بلا تاريخ كان يُقرأ كتوقيت المتداول (متأخّر ساعة/ساعتين ببغداد، ورسالة الأمس تبدو من اليوم). رسالة قديمة بلا `created_at` بلا طابع. المنسّق مشترك `localStamp.ts` (`formatLocalStamp`) مع `AiPanel`. `VotePanel` لا يعرض `ts` | backend-r15 (`887592e`) |
| c99abce | a11y: وسم صفّ التنبيه (يحلّ محلّ نصّ الأبناء) صار يقول «مُطلق/مُفعّل» والملاحظة، و`selected` للصفّ قيد التعديل (كانت باللون/الإطار وحده)؛ زرّ رمز الشارت `expanded` لعجلة الأزواج | مهمّة: الحالة باللون وحده |

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط؛ `Alert.alert` داخل `chart/confirmDestructive.ts` فقط (الباقي تعليقات)؛ «أعد الجولة» `AccountScreen.tsx` (`OnboardingOverlay`)؛ «درجة الاتفاق» أُزيلت (تعليقان)؛ التيك المتجمّد يُرفض (`acceptTick` + `TICK_STALE_MS`)؛ الكردية: الخطط والشبكة مترجمة بـ`ku`، ونصوص العمولات العربية من الخادم تطابق مفاتيح `SERVER_*_KEYS` حرفياً (`commissions.py:89-106`)، و`rules`/`example` لا تُعرض؛ لا تفرّع `lang === 'en' ? … : عربي` بملفاتي (الأكاديمية ⇒ الإنجليزية للكردي، QA27 لأنس). مسح `Pressable`/`Touchable*` بنمط مشروط بلا `accessibilityState` ⇒ 6 مرشّحات، 2 حقيقيان (أُصلحا أعلاه) والباقي `pressed` فقط.

## 2026-09-25 — تشغيل 13
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). صفّان موجّهان لـui بـCOORDINATION (نفس الخلل) — أُنجزا.

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 22715cb | `BacktestPanel`: متوسّط الربح/الخسارة — كلاهما رقم ⇒ `backtestStatAvgWinLoss`؛ أحدهما null ⇒ `backtestStatAvgWin`/`backtestStatAvgLoss` وحده؛ كلاهما null ⇒ لا سطر. كان «/ null%» حين كلّ الصفقات رابحة، والسطر يختفي كلّه حين لا رابحة. النوع `number \| null` | backend-r15a + launch114 (أُنجزا) |
| 326735d | `VotePanel`: زرّ فتح/إغلاق نموذج النشر يعلن `expanded` (الوسم كان يتبدّل أصلاً) | مهمّة: الحالة باللون وحده |

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط؛ `Alert.alert` داخل `chart/confirmDestructive.ts` فقط؛ «أعد الجولة» `AccountScreen.tsx` (`OnboardingOverlay`)؛ «درجة الاتفاق» أُزيلت (تعليقان)؛ التيك المتجمّد يُرفض (`acceptTick` + `TICK_STALE_MS`)؛ الكردية: لا نصّ عربي معروض بملفاتي خارج `academy.ts` (QA27) و`mock.ts` (`MessagesScreen` ميّتة، launch52). مسح آلي لكل `Pressable`/`Touchable*` (نمط مشروط بالوسم أو بالأبناء) بلا `accessibilityState` ⇒ صفر بعد الإصلاح أعلاه.

## 2026-09-25 — تشغيل 14
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). صفوف ui بـCOORDINATION: backend-r15a + launch114 منفَّذان (`22715cb`، بانتظار إغلاق QA)؛ backend-r16 — أُنجز؛ backend-r17 (وصل أثناء التشغيل، موجّه لـtools) — جزؤه بـ`ScreenerMini` ملك ui فأُنجز.

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 4f1ea41 | `IndicatorForecastPanel`: `price_as_of` أقدم من 5 دقائق ⇒ سطر `t.forecastPriceAsOf` (بلون التحذير) تحت الدخول/الوقف/الهدف، `{time}` = `formatLocalStamp` كـ`AiPanel`؛ null/غياب/جلب طازج ⇒ لا شيء. يُمسح مع النتيجة عند تبديل الرمز/الخطأ. النوع بـ`api.indicatorForecast`. `/api/indicators/snapshot` مستهلكه `SymbolSnapshot` لا يعرض سعراً ⇒ لا طابع | backend-r16 (أُنجز) |
| dd93383 | `ScreenerMini`: نتيجة `price_as_of` أقدم من شمعتين (30د على 15m) ⇒ «حتى HH:MM» بدل وسم الكاش العام. النصّ محلّي `AS_OF_COPY` حتى يضيف launch مفتاحاً (صفّ ui11 جديد). الماسح الكامل (`ToolsScreen`) و(b) الدفتر لـtools | backend-r17 (a) — جزء ui |

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط؛ `Alert.alert` داخل `chart/confirmDestructive.ts` فقط (الويب `window.confirm`/`alert`)؛ «درجة الاتفاق» أُزيلت (تعليقان)؛ الجولة قابلة للإعادة (`AccountScreen` ⇐ `OnboardingOverlay`)؛ قائمة المتابعة: التيك من `useMultiLiveTicks` (`acceptTick` + `TICK_STALE_MS`)، وبلا تيك حيّ السعر الأساسي موسوم تجريبياً (لون خافت + لاحقة a11y). الكردية: كل نصّ عربي بملفاتي تعليق أو موجّه نموذج (`WeeklyReportPanel`) — عدا `academy.ts` (QA27) و`MessagesScreen`/`mock.ts` (launch52، أنس). مسح آلي جديد أوسع (أي نمط/لون شرطي بخصائص أو أبناء `Pressable`/`Touchable*`، عدا pressed/disabled/rtl…) بلا `accessibilityState` ⇒ مرشّح واحد كاذب (خلفية `ChartFrame` ذاتية الإغلاق).

## 2026-09-25 — تشغيل 15
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). صفوف ui بـCOORDINATION (ui11، tools77b، وbackend-r18 الذي وصل أثناء التشغيل) — أُنجزت.

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| a0f67d1 | `ScreenerMini`: طابع النتيجة القديمة يقرأ `t.screenerPriceAsOf` («إغلاق {time}»)؛ حُذفت `AS_OF_COPY` المحلية («حتى» تُقرأ «إلى أن») | ui11 (أُغلق من جهتي) |
| d918a7f | `api.updateTrade`: `size?: number \| null` — null = حجم غير معروف يمسح المحفوظ (الخادم يقبله، `main.py` `4f6356a`)؛ صُحّح التعليق. إرسال null من الدفتر عند مسح الخانة لـtools | tools77b (أُنجز) |
| c90822c | `NewsPanel`: `impact: "unknown"` (أو أي قيمة غير high/medium/low) ⇒ **بلا شارة** بدل السقوط على «≈ منخفض»؛ فراغ مكانها يُبقي الوقت بطرفه. النوع `NewsItem.impact` يضيف `'unknown'`. لا مفتاح جديد مطلوب من launch | backend-r18 (أُنجز، وصل أثناء التشغيل) |

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط؛ `Alert.alert` داخل `chart/confirmDestructive.ts` فقط (الويب `window.confirm`/`alert`، منها حذف الحساب)؛ «درجة الاتفاق» أُزيلت (تعليقان)؛ الجولة قابلة للإعادة (`AccountScreen` ⇐ `OnboardingOverlay`)؛ التيك المتجمّد يُرفض (`acceptTick` + `TICK_STALE_MS`). الكردية: لا تفرّع يعطي `ku` نصّاً عربياً بملفاتي (المدارس ⇒ `name_en` لغير العربية)، والنصّ العربي الوحيد غير التعليقي `api.ts` `from_user: 'أنت'` (launch52، أنس). مسح حالة مشروطة بلا `accessibilityState` ⇒ المرشّحات الجديدة (`CoursesScreen`، `LectureClassroom`) كاذبة (`ref.current`).

## 2026-09-25 — تشغيل 16
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). لا صفّ بـCOORDINATION موجّه لـui وحده (QA1 (a): `motion` مُبقى عمداً، بلا تغيير).

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| b5ab74a | a11y: زرّا النشر (`VotePanel`) والسؤال (`LectureClassroom`) يعلنان `busy` — «...» كانت مرئية فقط (الوسم الثابت يحجب نصّ الأبناء) | مهمّة: الحالة باللون وحده |
| d458791 | a11y: زرّ إخفاء تفاصيل `PanSpeedSlider` (الحالة المفتوحة) يعلن `expanded: true` — توأمه المطويّ كان يعلن `false` وحده | مهمّة: الحالة باللون وحده |

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط؛ `Alert.alert` داخل `chart/confirmDestructive.ts` فقط؛ «درجة الاتفاق» أُزيلت؛ الجولة قابلة للإعادة (`AccountScreen` ⇐ `OnboardingOverlay`)؛ التيك المتجمّد يُرفض (`acceptTick` + `TICK_STALE_MS`) وسعر بلا تيك حيّ موسوم (`wlDemoTag` + لاحقة a11y). الكردية: مسح AST لكل سلسلة/نصّ JSX عربي بملفاتي ⇒ مفاتيح مطابقة الخادم (`CommissionPlanPanel`)، موجّهات نموذج (`WeeklyReportPanel`)، الفاصلة «، » للـrtl، و`academy.ts` (QA27؛ `classroom.teacher` غير معروض) و`MessagesScreen`/`api.ts` (launch52) — لا شيء آخر. مسح AST لـ`Pressable`/`Touchable*` بنمط شرطي ولا `selected/checked/expanded` ⇒ 13 مرشّحاً كلها `disabled` معلَن؛ ومسح ثانٍ لعناصر `onPress` تذكر active/selected/current ⇒ `PairDrumWheel` (الوسم يقول «الحالي») و`PanSpeedSlider` (أُصلح).

**تتمّة التشغيل 16 — صفّان وصلا أثناءه (chart-r46، backend-r19):**

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 992b7ea | `useTickFreshnessClock` بساعة الخادم (`serverNowSec`): `remainMs` والإرجاع (`serverNowSec() * 1000`) — شارة «حي» بـ`ChartFrame`/`FocusChartModal`/رأس `TerminalScreen` لا تغيب مبكراً على جهاز متقدّم ولا تبقى بعد تجمّد التيك على متأخّر. كل المستهلكين يقارنون بطوابع الخادم | chart-r46 (أُنجز) |
| fc4ee7b | سلسلة بلا بيانات حقيقية (`unavailable_reason`، أو `kind: unavailable`) — DXY اليوم: `ChartFrame` (خانة DXY) و`QuadChartModal` و`FocusChartModal` بلا شموع بذرة ولا سعر ولا نسبة ولا سبريد؛ إشعار «{symbol} غير متاح من مزوّد البيانات» مكان الشارت (`ProviderUnavailableNotice.tsx` جديد)، والوسم «غير متاح» القصير. تحقّقتُ بـ`main.py:605-621` أن `unavailable_reason` لا يُضبط إلا على بذرة رمز لا يقدّمه المزوّد | backend-r19 (جزء ui) ⇒ ui16b (tools: البطل؛ backend: `candles: []`) |
| 86a1992 | الإشعار يقرأ `t.chartNotOfferedTitle`/`chartNotOfferedBody` (launch `954fcc4`، وصل أثناء التشغيل) بدل اقتطاع `originUnavailableProvider`؛ النصّ الثاني («اضغط اسم الرمز ▾») حين الإطار يعرض زرّ الرمز فقط (`ChartFrame` بـ`onSymbolChange`) — الرباعي والتركيز بلا ذلك الزرّ ⇒ العنوان وحده. صفّ ui16a حُذف قبل أن يُقرأ | backend-r19 |

## 2026-09-25 — تشغيل 17
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). لا صفّ بـCOORDINATION موجّه لـui وحده: QA1 (a) `motion` مُبقى عمداً؛ ui16b أنجزه tools (`b1d1adb`).

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| efea789 | a11y: `PanSpeedSlider` — `adjustable` كان على الغلاف (يحوي زرّاً) بلا `increment/decrement` ولا `accessibilityValue` ⇒ قارئ الشاشة يعلن «قابل للضبط» والتمرير لا يفعل شيئاً (السحب وحده يضبط). نُقل للمسار: `accessible` + القيمة 1..100 + إجراءا الزيادة/الإنقاص بخطوة 5؛ الرقم المرئي مخفيّ عن القارئ (لا يُقرأ مرّتين) | مهمّة: الحالة باللون وحده / a11y |

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط؛ `Alert.alert` داخل `chart/confirmDestructive.ts` فقط (حذف الحساب عبر `confirmDestructive`)؛ «درجة الاتفاق» أُزيلت (تعليقان)؛ الجولة قابلة للإعادة (`AccountScreen` ⇐ `OnboardingOverlay`)؛ التيك المتجمّد يُرفض (`acceptTick` + `TICK_STALE_MS`، و`at` بساعة الجهاز مطروحاً منها العمر عند الخادم ⇒ المقارنة بـ`Date.now()` متّسقة). مسح AST جديد: كل عنصر بدور tab/radio/switch/checkbox/togglebutton/menuitem بلا `accessibilityState`/`aria-*` ⇒ صفر (المرشّح الوحيد `adjustable`، أُصلح أعلاه). عناصر السحب الأخرى: `PairDrumWheel` له أزرار سابق/حالي/تالٍ، ومقابض `FrameSizedGrid` تخطيط فقط.

## 2026-09-25 — تشغيل 18
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). صفّ ui بـCOORDINATION: backend-r19/ui16 (نوع `ChartSeries.last`).

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| c51c651 | `ChartFrame`: صفّ السعر يُخفى حين `headerPrice` null (`last: null` بلا تيك) و`quoteStale` يحرس null؛ `FocusChartModal`: `headPrice = headPx ?? last ?? null` ⇒ لا سعر يُطبع. قلب النوع بـ`api.ts` إلى `number \| null` جُرِّب: 16 خطأ tsc كلها بـ`src/chart/` (`MatrixChart`، `liveSeries`) ⇒ أُعيد النوع (لا commit أحمر) وفُتح صفّ **ui18** لـchart بالمواضع كلها وإذن بقلب السطرين بعد الحراسة. وقت التشغيل آمن اليوم: كل المستهلكين خلف `seriesHasNoRealData` | backend-r19/ui16 ⇒ ui18 (chart) |

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط (`ToolsScreen:88`، `MatrixEdgeRails:149`)؛ `Alert.alert` داخل `chart/confirmDestructive.ts` فقط (الويب `window.confirm`، ورفض عند غيابه؛ حذف الحساب عبره)؛ «درجة الاتفاق» أُزيلت (تعليقان)؛ الجولة قابلة للإعادة (`AccountScreen:235` ⇐ `OnboardingOverlay`)؛ التيك المتجمّد يُرفض (`useMultiLiveTicks:75` `acceptTick` + `TICK_STALE_MS`). الكردية: تفرّعات `lang === 'ar'` الباقية بملفاتي (`CoursesScreen`، `LectureClassroom`) تُعطي `name_en`/`summary_en`/`school_name_en` لغير العربية وكلها موجودة (8/8 مدارس، والخادم يرسل `school_name_en`). مسحان جديدان لـ134 `Pressable`/`Touchable*` بملفاتي (شرط `===`/active/selected/on، وأي نمط `*On/*Active/*Sel` شرطي) بلا `accessibilityState` ⇒ صفر؛ عيّنة يدوية (`WatchlistPanel`، `VotePanel`) تؤكّد أن المسح يلتقط النمط وأن الحالة معلنة.

## 2026-09-25 — تشغيل 19
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). صفوف ui بـCOORDINATION: ui18/backend-r19 (قلب النوع)، launch120 (نصّ الإشعار، `{tf}` بالرباعي).

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 8025a34 | `ChartSeries.last`/`change_pct` = `number \| null` بـ`api.ts` — chart حرس مواضعه (`4874d20`) ⇒ tsc 0. (`:523-524` بالصفّ هي نتائج الـscreener لا سلسلة الشارت، لم تُمسّ) | ui18 / backend-r19 (أُغلق) |
| 20e7b46 | `ProviderUnavailableNotice`: prop اختياري `dataSource`؛ `unavailable_reason: provider_unavailable` ⇒ `chartProviderDownTitle/Body` (الجسم دائماً — لا يذكر زرّ ▾)، وغيره النصّ القديم. `ChartFrame`/`FocusChartModal` يمرّرانه (`QuadChartModal` ضمن الـcommit التالي). صفّ **ui19** لـchart/tools بمواضعهم الثلاثة | launch120 ⇒ ui19 |
| b8f1569 | `QuadChartModal`: `chartFirstLoad` `{tf}` = `t.tfLabels[tf]` للنصّ و`t.tfLabelsA11y[tf]` للـlabel بدل «15m»/«D» الخام؛ + تمرير `dataSource` للإشعار | launch120 (جزء ui) |

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط (`MatrixEdgeRails:149`، `ToolsScreen:88`)؛ `Alert.alert` داخل `chart/confirmDestructive.ts` فقط (الويب `window.confirm`، ورفض عند غيابه؛ حذف الحساب عبره `AccountScreen:166`)؛ «درجة الاتفاق» أُزيلت (تعليقان `AnalystsPanel:129`، `SocialConsensusPanel:234`)؛ الجولة قابلة للإعادة (`AccountScreen:235` ⇐ `OnboardingOverlay`)؛ التيك المتجمّد يُرفض (`useMultiLiveTicks:75`). الكردية: مسح كل سلسلة عربية غير تعليقية بملفاتي ⇒ `mock.ts:48-50` و`api.ts:893` فقط (launch52، أنس) والاختبارات. مسح AST جديد (`Pressable`/`Touchable*` بنمط شرطي active/selected/On/`===`): 22 تعلن الحالة، **0** بلا `accessibilityState` (عكستُ المسح للتأكّد أنه يلتقط النمط).

## 2026-09-25 — تشغيل 20
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). صفّا ui بـCOORDINATION: chart-r48، launch121.

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 02d60f4 | `DomLitePanel`: سبريد رمز بلا مواصفة pip = `formatPriceDiff(ask - bid, bid, symbol)` ⇒ منازل السعر (BTCUSD «12.50» لا «12.500» بجانب «67420.50») | chart-r48 (أُغلق) |
| 5753fba | `QuadChartModal`: فشل الطلب بلا ذاكرة ⇒ `serverUnreachableSeries` (شموع فارغة، `last`/`change_pct` null، `unavailable_reason: server_unreachable`) ⇒ الإشعار بدل `mockSeries` حول أسعار 2024؛ حُذف منطق إرساء البذرة على التيك (`pendingAnchor`) — لم يعد له مدخل. `ProviderUnavailableNotice` يفرّع `server_unreachable` ⇒ `chartServerUnreachableTitle/Body` (الجسم دائماً). الدالّة و`SERVER_UNREACHABLE` مُصدَّرتان لـtools (`offlineFrame`) | launch121 (جزء ui؛ tools أنجز جزأه `11db392` بالتوازي) |

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط (`MatrixEdgeRails:149`، `ToolsScreen:88`)؛ `Alert.alert` داخل `chart/confirmDestructive.ts` فقط (حذف الحساب `AccountScreen:166` عبره)؛ «درجة الاتفاق» أُزيلت (تعليقان `AnalystsPanel:129`، `SocialConsensusPanel:234`)؛ الجولة قابلة للإعادة (`AccountScreen:235` ⇐ `OnboardingOverlay`)؛ التيك المتجمّد يُرفض (`useMultiLiveTicks` `acceptTick` + `TICK_STALE_MS`). الكردية: grep تفرّعات `lang === 'en'/'ku'` و`_ar` بملفاتي ⇒ `CoursesScreen:31` وحده (`name_en` لغير العربية، صحيح).

## 2026-09-25 — تشغيل 21
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). صفّا ui بـCOORDINATION: launch122 (جزء ui)، tools81 (حالة تحميل `ChartFrame`).

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 345b676 | `FocusChartModal`: فشل الطلب ⇒ `serverUnreachableSeries(sym, tf)` ⇒ إشعار «لا اتصال بخادم MATRIX» بدل `mockSeries` حول أسعار 2024؛ التحديث الصامت كل 90 ث يستبدله حين يعود الاتصال. حُذف استيرادا `mockSeries`/`mockBase` | launch122 (جزء ui) |
| ce58542 | `ProviderUnavailableNotice`: `loadingSeries()` + `SERIES_LOADING`/`isSeriesLoading` — سبب `loading` ⇒ دوّار + `chartFirstLoad` (`{tf}` = `tfLabels`، الـlabel `tfLabelsA11y`، دور `progressbar` و`busy`). `ChartFrame` يمرّر `timeframe` ويُخفي وسم المصدر أثناء التحميل (كان سيقول «غير متاح») | tools81 (جزء ui؛ tools يبدّل `bootFrame`) |

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط (`MatrixEdgeRails:149`، `ToolsScreen:88`)؛ `Alert.alert` بـ`AccountScreen:166` و`TradeJournalPanel:1129` تعليقان فقط — الاستدعاءات عبر `confirmDestructive`؛ «درجة الاتفاق» أُزيلت (`AnalystsPanel:129`، `SocialConsensusPanel:234`)؛ الجولة قابلة للإعادة وحالة الاختيار والتيك المتجمّد كما بتشغيل 20.

## 2026-09-25 — تشغيل 22
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). لا صفّ مفتوح موجَّه لـui بـCOORDINATION (launch122 وtools81 جزء ui أُنجز؛ `motion` مُبقى عمداً).

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| a288464 | `WeeklyReportPanel`: تعليمة «الأداء» كانت تطلب «درجة من 10» عن التوقيت وDXY، و«الأسبوعي» «أفضل/أسوأ يوم» — والدفتر يرسل خمس إجماليات لكل المغلقة فقط ⇒ درجة ويوم مختلَقان (من فئة «درجة الاتفاق»). الآن نقاط قوة/ضعف بما تسمح به الأرقام + «أفضل/أسوأ صفقة»، و`DATA_ONLY_AI_NOTE` تُلحق دائماً (حارس الاختلاق كان للدفتر الفارغ وحده) | — (بند مهمّة: رقم مختلَق) |

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط (`MatrixEdgeRails:149`، `ToolsScreen:88`)؛ `Alert.alert` داخل `chart/confirmDestructive.ts` فقط (الويب `window.confirm`/رفض عند غيابه؛ حذف الحساب `AccountScreen:166` عبره)؛ «درجة الاتفاق» أُزيلت (`AnalystsPanel:129`، `SocialConsensusPanel:234`)؛ الجولة قابلة للإعادة (`AccountScreen:235`)؛ التيك المتجمّد يُرفض (`useMultiLiveTicks:75` `acceptTick`). مسح AST جديد لكل `Pressable`/`Touchable*` بملفاتي بنمط `styles.*On/Active/Sel/Current`: 40 تعلن الحالة، الوحيد بلا `accessibilityState` = `AlertsPanel:891` `useCurrent` (زرّ «السعر الحالي»، ليس اختياراً — إيجابي كاذب). الكردية: السلاسل العربية غير التعليقية الباقية بملفاتي = `CommissionPlanPanel:41-57` (مفاتيح مطابقة لنصّ الخادم ⇒ مفاتيح i18n، صحيح)، `MessagesScreen`/`mock.ts`/`api.ts:893` (launch52، أنس)، `academy.ts` (QA27، أنس)، وتعليمات الذكاء الاصطناعي الداخلية (لغة الردّ من `lang`).

## 2026-09-25 — تشغيل 23
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). صفوف ui بـCOORDINATION: launch124، chart-r50، QA1 (a) جزء ui (`registry.ts`)، backend-r27 (وصل أثناء التشغيل).

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| db4c51f | `LectureClassroom`: مؤثّر الحفظ يتوقّف حين `lectureFallback` ⇒ المحاضرة الاحتياطية (فشل `academyLecture`) لا تكتب 0 فوق موضع الاستئناف المحلي ولا ترسل `saveProgress({completed: true})` عند مقطعها الثاني. تحميل حقيقي لاحق يُنزل العَلَم فيعود الحفظ | launch124 |
| 962aced | `FocusChartModal`: `compareTag`/`compareNote`/`watchCompare` = `COMPARE_COLOR` من `chart/compare` بدل `infoAccent` (لون SMA 50)؛ `compareNoteWarn` يبقى تحذيراً. + حبّة الرمز بالهاتف (الضغط المطوّل يبدّل المقارنة) تُلحق `focusInComparisonSuffix` بالـlabel كالقائمة الجانبية — كانت المقارنة غير معلنة لقارئ الشاشة هناك | chart-r50 |
| 1831bc4 | حذف `modules/tools-panels/registry.ts` (غير مستورد منذ `3c27653`)؛ ARCHITECTURE.md يشير لاسترجاعه من git عند النقل الفعلي. الباقي بالصفّ: `motion` (مُبقى عمداً)، `emptySlot` (tools) | QA1 (a) جزء ui |
| 755670f | `/api/calendar` `stale: true` (الخادم أجاب من جلب سابق بعد فشل مصدره): `CalendarPanel` يعرض `newsStale` («تعذّر التحديث — الموعد من تقويم محفوظ»، مترجم بالثلاث) تحت الحالة `ok`؛ `NewsRiskBanner` يعدّه كفشله هو (`cacheServerStale`، دون مسّ `chart/newsRisk.ts`). نوع `api.ts`: `as_of: string \| number`، `stale?: boolean`. لم يُضف «آخر تحديث HH:MM» — يحتاج مفتاح i18n جديداً (launch) | backend-r27 |

ملاحظة: `COMPARE_COLOR` `#FF9800` قريب من `warn` `#F59E0B` — سطر «تعذّرت المقارنة» يتميّز بالخط العريض ونصّه، لا بلونه وحده.

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط (`MatrixEdgeRails:149`، `ToolsScreen:88`)؛ `Alert.alert` داخل `chart/confirmDestructive.ts` فقط (حذف الحساب `AccountScreen:166` عبره)؛ «درجة الاتفاق» أُزيلت (`AnalystsPanel:129`، `SocialConsensusPanel:234`)؛ الجولة قابلة للإعادة (`AccountScreen:235` ⇐ `OnboardingOverlay`)؛ التيك المتجمّد يُرفض (`useMultiLiveTicks` `acceptTick`/`TICK_STALE_MS`). الكردية: كل سلسلة عربية غير تعليقية بملفات tsx خاصّتي = استمرار تعليقات متعدّدة الأسطر، و`CommissionPlanPanel:41-57` (مفاتيح مطابقة لنصّ الخادم ⇒ i18n)، و`MessagesScreen` (launch52، أنس). مسح Pressable/Touchable بنمط `&& styles.*On/Active/Sel/Current`: 41 تعلن الحالة، 0 بلا `accessibilityState`.

## 2026-09-25 — تشغيل 24
بوابة البناء خضراء قبل كل commit (tsc 0 أخطاء). صفوف ui بـCOORDINATION عند البدء: chart-r50، launch124، QA1 (a) جزء ui — **كلها أُنجزت بتشغيل 23** (`962aced`، `db4c51f`، `845546a`؛ QA67 أغلقها)؛ الباقي backend-r27 (سطر الوقت).

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 6d8a467 | `CalendarPanel`: حين `stale` يعرض `t.calStaleAsOf` بـ`{time}` = `as_of` (ثوانٍ UTC رقماً، أو نصّ تاريخ من خادم أقدم — `asOfSeconds`) بتوقيت الجهاز بصيغة `fmtLocal` نفسها لأحداث التقويم («اليوم 14:05»)؛ `as_of` غائب/غير مقروء ⇒ `newsStale` كما كان | backend-r27 (أُغلق من جهتي) |

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط (`MatrixEdgeRails:149`، `ToolsScreen:88`)؛ `Alert.alert` داخل `chart/confirmDestructive.ts` فقط (حذف الحساب `AccountScreen:166` عبره)؛ «درجة الاتفاق» أُزيلت (`AnalystsPanel:129`، `SocialConsensusPanel:234`)؛ الجولة قابلة للإعادة (`AccountScreen` زرّ `accReplayTour` ⇐ `OnboardingOverlay`)؛ التيك المتجمّد يُرفض (`useMultiLiveTicks:75` `acceptTick`/`TICK_STALE_MS`)، وسعر القاعدة بقائمة المتابعة موسوم «تجريبي» نصّاً وللقارئ (`WatchlistPanel:414 :428`). مسح AST (Pressable/Touchable/*Button بنمط شرطي active/selected/On/Sel/Current **بالعنصر أو أبنائه**): 45، الوحيد بلا `accessibilityState` = خلفية `MatrixSidePanel:79` (`accessible={false}`، إيجابي كاذب). الكردية: العربي غير التعليقي بـ`CommissionPlanPanel`/`NetworkTreePanel`/`SubscriptionPlansPanel` = مفاتيح مطابقة لنصّ الخادم (`:41-57`) فقط؛ الخطط كلّها من `t.subPlans`.

## 2026-09-25 — تشغيل 25
لا صفّ مفتوح موجَّه لـui بـCOORDINATION: backend-r27 (سطر «آخر تحديث») أُنجز بتشغيل 24 (`6d8a467`، `CalendarPanel.tsx:416` `t.calStaleAsOf`) — نصّ الصفّ «لا مستعمل له» قديم، يُغلقه QA. launch52 (`MessagesScreen`) وQA27 (الأكاديمية) قرار أنس. **لا تغيير بالكود هذا التشغيل** — لم يظهر بالتحقّق عيب جديد بنطاقي.

**إعادة تحقّق بنود المهمّة بالكود (بعد 14b59dd):**
- حالة الاختيار: مسح AST لكل `Pressable`/`Touchable*`/`*Button`/`*Chip`/`*Pill` بملفاتي بتنسيق شرطي (`styles.*On/Active/Sel/Selected/Current/Checked`، `colors.accent`): 44 مرشّحاً، **كلها** تحمل `accessibilityState`/aria أو دور switch/checkbox/radio.
- الكردية: مقارنة برمجية لقاموسَي `ar` و`ku` (`DICTS`) — صفر قيمة كردية مطابقة للعربية (>3 أحرف). الحرفيات العربية الظاهرة خارج القاموس: `MessagesScreen`/`mock.ts` `mockPeers`/`api.ts:896` فقط (launch52). `SubscriptionPlansPanel` من `t.subPlans`؛ `CommissionPlanPanel:41-57` مفاتيح لنصّ الخادم.
- «₴» بتعليقين فقط (`MatrixEdgeRails:149`، `ToolsScreen:88`)؛ `Alert.alert` داخل `chart/confirmDestructive.ts` فقط (حذف الحساب `AccountScreen:166` عبره)؛ «درجة الاتفاق» أُزيلت (`AnalystsPanel:129`، `SocialConsensusPanel:234`، و`WeeklyReportPanel:41`)؛ الجولة قابلة للإعادة (`AccountScreen:221-235` ⇐ `OnboardingOverlay`)؛ التيك المتجمّد يُرفض (`useMultiLiveTicks:75` `acceptTick`/`TICK_STALE_MS`).
- أرقام مختلَقة: `Math.random` خارج chart = `api.ts:45` (معرّف UUID احتياطي، ليس بيانات). `mockSeries` بنطاقي: `LectureClassroom:90` (فشل الطلب ⇒ `kind: 'demo'` ⇒ وسم `dsKindDemo` ظاهر `:401`) و`MessagesScreen` (غير مستوردة).

## 2026-09-25 — تشغيل 26
لا صفّ مفتوح موجَّه لـui بـCOORDINATION (دورة QA 68). منذ `d8973c6` لم يتغيّر أيّ ملف بنطاقي (التغييرات: chart/`PositionSizePanel`/`positionSize`/i18n فقط). بوابة البناء خضراء (tsc 0). **لا تغيير بالكود هذا التشغيل.**

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط (`MatrixEdgeRails:149`، `ToolsScreen:88`)؛ `Alert.alert` داخل `chart/confirmDestructive.ts` فقط (`AccountScreen:166`، `TradeJournalPanel:1131` تعليقان)؛ «درجة الاتفاق» أُزيلت (`AnalystsPanel:129`، `SocialConsensusPanel:234`، `WeeklyReportPanel:41`)؛ التيك المتجمّد يُرفض (`useMultiLiveTicks:75` `acceptTick`/`TICK_STALE_MS`)؛ الجولة وحالة الاختيار والكردية كما بتشغيل 25 (لا تغيير بالملفات). مسح إضافي: لا `ActionSheetIOS`/`Alert.prompt`/`ToastAndroid` (حوارات لا تعمل بالويب)؛ `accessibilityLabel`/`Hint` عربي ثابت خارج chart/i18n = `MessagesScreen:142` وحده (launch52، أنس).

## 2026-09-25 — تشغيل 27
لا صفّ مفتوح موجَّه لـui بـCOORDINATION (دورة QA 69). منذ `dd02b9a` لم يتغيّر أيّ ملف بنطاقي (التغييرات: `PositionSizePanel`/`positionSize`/i18n فقط). بوابة البناء خضراء (tsc 0). **لا تغيير بالكود هذا التشغيل** — التحقّق هذه المرّة بفحوص أوسع من السابقة، لا بنمط أسماء الأنماط وحده:

- **حالة الاختيار (أوسع):** مسح AST لكل عنصر JSX بـ`onPress`/`onValueChange` خارج chart/i18n/tools، يُعلَّم إن كان **أيّ** تعبير شرطي (`&&`/`?:`) بخصائصه أو أبنائه يغيّر `styles.*`/`colors.*`/لوناً سداسياً/`backgroundColor`/`fontWeight`/`opacity` (لا نمط الاسم فقط، ويشمل الكائنات المضمّنة): 76 مرشّحاً، الثلاثة بلا `accessibilityState` شرطها `rtl` (تخطيط لا حالة: `WatchlistPanel:530`، `AccountScreen:219`، `CoursesScreen:167`). ومسح للألوان المحسوبة خارج JSX: `PanSpeedSlider` `active` قيمته بالـlabel (`pct`)، ونسب التغيّر بإشارتها.
- **الكردية (برمجياً):** مقارنة `DICTS.ar`↔`DICTS.ku` بـtsx: صفر مفتاح ناقص، صفر قيمة مطابقة للعربية. الحرفيات العربية غير التعليقية بنطاقي: `CommissionPlanPanel:41-57` (مفاتيح لنصّ الخادم — تحقّقت أنها تطابق `commissions.py`/`db.py:854` حرفاً بحرف، و`plan.rules`/`title` العربيان لا يُعرضان)، تعليمات `WeeklyReportPanel` الداخلية (الردّ بـ`lang`)، `MessagesScreen`/`mock.ts`/`api.ts:896` (launch52، أنس)، `academy.ts` (QA27، أنس). الخطط من `t.subPlans`؛ الشبكة من القاموس.
- **الحوارات بالويب:** 11 استدعاء `confirmDestructive` بسبعة ملفات (منها `AccountScreen` حذف الحساب)؛ `Alert.alert` داخل `chart/confirmDestructive.ts` وحده (`window.confirm`/`window.alert` بالويب).
- «₴» بتعليقين فقط؛ «درجة الاتفاق» أُزيلت، و`signal_hub.analysts_forecast`/`social_consensus` يعيدان `unavailable` دائماً ⇒ لا متوسّط يُعرض؛ التيك المتجمّد يُرفض (`tickAge.acceptTick` بـ`ticks_at`، والرمز الغائب يُسقَط بعد `TICK_STALE_MS`)، وسعر الإغلاق البديل موسوم «تجريبي»؛ الجولة تُعاد من `AccountScreen` (ظاهر بلا تسجيل دخول) وزرّ رجوع أندرويد يرجع خطوة.

**وصل أثناء التشغيل — launch128 (صفّ ui):**

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| ba57ae0 | حدث `ALL` (G20): الشريط `NewsRiskBanner` يطبع `t.newsAllCurrencies` بدل «ALL» (وداخل «USD/ALL» من `sameMinuteCurrencyLabel` — تُقسَم بـ`/`)؛ شارة الصفّ `CalendarPanel` كذلك. فلتر «الزوج» صار `newsCurrencyMatches` (دالّة الشريط نفسها) بدل `pairCcys.includes` ⇒ لا يُخفي حدثاً يحذّر منه الشريط للزوج نفسه | launch128 |

**طلب → backend:** فلتر عملة واحدة (رقاقة USD مثلاً) يُرسَل للخادم `currency=USD`، و`econ_calendar.py:305` يطابق حرفياً ⇒ حدث `ALL` يسقط من القائمة بينما الشريط يحذّر منه لأزواج USD. المقترح: `... in curs or cur == "all"` حين يُطلب فلتر عملة.


## 2026-09-25 — تشغيل 28
صفّ ui الوحيد بـCOORDINATION (launch128) **أُنجز بتشغيل 27** (`ba57ae0`) — الصفّ باقٍ لأن QA لم يُغلقه بعد؛ وطلبي لـbackend (فلتر عملة يُبقي أحداث `ALL`) أُنجز هناك (`50189c3`). بوابة البناء خضراء (tsc 0). **لا تغيير بالكود هذا التشغيل** — لم يظهر بالتحقّق عيب جديد بنطاقي.

**إعادة تحقّق بنود المهمّة بالكود (بعد c5e3991)، بفحوص جديدة لا بنقل السجلّ:**
- **حالة الاختيار:** مسح AST لكل عنصر JSX بـ`onPress`/`onValueChange` خارج chart/i18n/tools، شرطه نمط `styles.*On/Active/Sel/Selected/Current/Checked` أو لون `colors.accent/bull/bear` شرطي أو متغيّر اختيار بشرط: 47 مرشّحاً، **صفر** بلا `accessibilityState`/aria/دور switch-checkbox-radio-tab. خصائص `active` بالمكوّنات (`WatchlistPanel`، `CalendarPanel`، `AlertsPanel`، `IndicatorAlertsPanel`) = ظهور اللوحة لا حالة اختيار.
- **الكردية:** `DICTS.ku` مقابل `DICTS.ar` مسطّحاً: صفر قيمة مطابقة (≥4 حروف عربية)، وصفر قيمة بحرف عربي لا تستعمله السورانية (ة ى ث ذ ض ظ). الحرفيات العربية بـtsx/ts خارج chart/i18n: مفاتيح نصّ الخادم (`CommissionPlanPanel`)، تعليمات الذكاء الداخلية (`WeeklyReportPanel`)، أنماط إدخال (`positionSize`/`parseDecimal`)، فاصلة «،» حين `rtl` فقط، و`api.ts:896`/`mock.ts`/`MessagesScreen` (launch52، أنس).
- **الحوارات بالويب:** لا `Alert.alert`/`Alert.prompt`/`ActionSheetIOS` خارج `chart/confirmDestructive.ts` (`window.confirm`/`window.alert` بالويب)؛ لا حوار تأكيد مخصّص بـ`<Modal>`؛ `confirmDestructive` بتسعة ملفات منها `AccountScreen` (حذف الحساب).
- «₴» بتعليقين فقط؛ «درجة الاتفاق» أُزيلت (`AnalystsPanel`، `SocialConsensusPanel`، `WeeklyReportPanel`)؛ التيك المتجمّد يُرفض (`tickAge.acceptTick` بـ`ticks_at`، والإسقاط بعد `TICK_STALE_MS`)، وسعر الإغلاق البديل بقائمة المتابعة موسوم «تجريبي» نصّاً وللقارئ؛ الجولة تُعاد من `AccountScreen` (`accReplayTour` ⇐ `OnboardingOverlay`).

**وصل أثناء التشغيل — launch130 (صفّ ui):**

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| aed77b9 | `LectureClassroom`: شارت القاعة من `mockSeries` (فشل الطلب) يعرض `t.lectureChartPracticeNote` تحته — شموع تدريبية لا أسعار، والرسم لا يُحفظ (منذ chart `22ff26c`). الشرط `chartOffline && chartKind === 'demo'` لا `demo` وحده: سلسلة `demo` من الخادم ليست «بلا اتصال» كما يقول النصّ؛ تبقى بوسم «تجريبي» بالرأس | launch130 |

**لـlaunch (اختياري):** سلسلة `demo`/`unavailable` **من الخادم** لا يُحفظ الرسم عليها كذلك (`isSyntheticProvenance`) ولا ملاحظة تقول ذلك؛ إن أردتموها فمفتاح بلا «بلا اتصال بالخادم» (مثلاً «شموع تجريبية لا أسعار السوق — ما ترسمه هنا لا يُحفظ») وأعرضه لكل `demo` بالقاعة.

## 2026-09-25 — تشغيل 29
لا صفّ مفتوح موجَّه لـui بـCOORDINATION (دورة QA 70): launch130 أُغلق (`aed77b9`)، وlaunch128 وطلبي لـbackend أُغلقا. منذ `d617362` لم يتغيّر أيّ ملف بنطاقي (التغييرات: chart/`PositionSizePanel`/`positionSize`/`TerminalScreen` فقط). بوابة البناء خضراء (tsc 0). **لا تغيير بالكود هذا التشغيل.**

**فحص سريع لبنود المهمّة بالكود:** `Alert.alert` داخل `chart/confirmDestructive.ts` وحده (`window.confirm`/`window.alert` بالويب؛ `AccountScreen:166` حذف الحساب يمرّ منه)؛ «₴» بتعليقين فقط؛ «درجة الاتفاق» بتعليقات فقط (`AnalystsPanel:129`، `SocialConsensusPanel:234`، `WeeklyReportPanel:41`)؛ `useMultiLiveTicks` يرفض التيك القديم (`acceptTick`) ويُسقط الرمز بعد `TICK_STALE_MS`؛ `Math.random` خارج chart = `api.ts:45` (معرّف UUID احتياطي فقط، ليس بيانات). حالة الاختيار والكردية وإعادة الجولة لم يتغيّر فيها ملف منذ مسوح تشغيلَي 27–28.

## 2026-09-25 — تشغيل 30
صفّ ui الوحيد بـCOORDINATION (دورة QA 71) = **launch131** — أُنجز:

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 76b2256 | `progress: number \| null` بـ`AcademySchoolSummary` (`academy.ts:13`) و`Course` (`api.ts:147`) — الخادم يرسل `null` منذ backend `2e55e5b`؛ بذور `academy.ts` الاحتياطية السبع `null` لا `0` (لا «0%» مختلَق ولا «null%» لاحقاً). لا مستهلك اليوم ⇒ tsc 0 | launch131 |

بوابة البناء خضراء (tsc 0) قبل الـcommit.

**إعادة تحقّق بنود المهمّة بالكود (بعد 5d03ebd pull):**
- **حالة الاختيار:** مسح لكل عنصر JSX بحرف كبير فيه `onPress`/`onValueChange` (لا أسماء أنماط فقط — يشمل شرط المساواة `x === y && styles.*` و`? colors.*`) خارج chart/i18n/tools: المرشّحات بلا `accessibilityState`/aria = الثلاثة شرطها `rtl` (تخطيط لا حالة: `WatchlistPanel:530`، `CoursesScreen:167`، `AccountScreen:219`) — كما تشغيل 27.
- **الكردية:** الحرفيات العربية غير التعليقية بنطاقي كما صنّفها تشغيل 28. `CommissionPlanPanel`: النصّ غير المعروف يُعرض كما وصل؛ الجدول الاحتياطي موسوم `t.cppLiveError` (ar/en/ku) عند الفشل؛ وتحقّقتُ أن `points_per_member: r.rate_pct` (مسار `/plan`) يطابق الخادم (`db.py:828` `COMMISSION_UNIT 100 × rate` = `rate_pct`) — ليس رقماً مختلَقاً.
- **التيك المتجمّد:** `acceptTick` يرفض ما عمره عند الخادم > `TICK_STALE_MS`؛ قائمة المتابعة لا تحسب نسبة/مسافة تنبيه من سعر افتراضي أو بثّ تجريبي (`WatchlistPanel:365-392`) وتسِمه `t.wlDemoTag`.
- **الحوارات بالويب:** `Alert.alert` بـ`chart/confirmDestructive.ts` وحده (`window.confirm`، وغيابه ⇒ لا تنفيذ).
- **الجولة:** `AccountScreen:219` ⇐ `OnboardingOverlay` (ظاهر بلا تسجيل دخول). «₴» بتعليقين فقط؛ «درجة الاتفاق» بتعليقات فقط.

## 2026-09-25 — تشغيل 31
صفّا ui المفتوحان بـCOORDINATION (دورة QA 71) = **backend-r33** و**launch132** (مكمّله) — أُنجزا معاً:

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 77e39f2 | `api.news()` يحمل `status?`/`as_of?`/`stale?` (اختيارية — خادم أقدم = السلوك السابق). `NewsPanel`: `status === 'unavailable'` بلا عناوين ⇒ `t.newsSourceUnavailable` (بلون `staleNote`) بدل «لا توجد أخبار حالياً»؛ `stale: true` مع عناوين ⇒ `t.newsStaleAsOf` بـ`formatLocalStamp(as_of, lang)` فوق القائمة. فشل الطلب نفسه يبقى `t.newsLoadError` (عطل اتصال ≠ عطل المصدر) | backend-r33، launch132 |

بوابة البناء خضراء (tsc 0) قبل الـcommit. launch131 أُنجز بتشغيل 30 (`76b2256`) — الصفّ باقٍ حتى يغلقه QA.

**إعادة تحقّق بنود المهمّة بالكود (بعد 2166ac4):** `Alert.alert` بـ`AccountScreen`/`TradeJournalPanel` = تعليقات فقط، والاستدعاء عبر `confirmDestructive` (`window.confirm` بالويب)؛ «₴» بتعليقين فقط؛ «درجة الاتفاق» بتعليقات فقط؛ `useMultiLiveTicks` يرفض التيك المتجمّد (`acceptTick`) ويُسقطه بعد `TICK_STALE_MS`؛ إعادة الجولة `AccountScreen:221-233`. ملفات نطاقي المتغيّرة منذ تشغيل 30 (`ChartFrame`، `LayoutPanel`، `QuadChartModal`، `IndicatorForecastPanel`) = أهداف لمس ونصّ حفظ — لا عنصر اختيار جديد بلا `accessibilityState`.

## 2026-09-25 — تشغيل 32
صفّ ui الوحيد بـCOORDINATION (دورة QA 72) = **backend-r33 + launch132** (أخبار `status`/`stale`) — **أُنجز بتشغيل 31** (`77e39f2`)؛ تحقّقتُ بالكود: `NewsPanel.tsx:52-53` يقرأ `status === 'unavailable'` و`stale`/`as_of`، ويعرض `t.newsSourceUnavailable` (:86) و`t.newsStaleAsOf` (:90). جملة QA «grep `status`/`stale` صفر» سابقة لـ`77e39f2` — الصفّ جاهز للإغلاق. بوابة البناء خضراء (tsc 0). **لا تغيير بالكود هذا التشغيل.**

**إعادة تحقّق بنود المهمّة بفحوص جديدة (بعد 6ff7144):**
- **حالة الاختيار:** مسحان: (1) وسم الفتح لكل عنصر بحرف كبير فيه `onPress`/`onValueChange` بشرط اختيار (`styles.*On/Active/Sel…`، `colors.accent/bull/bear`، `x === y &&`)؛ (2) **جسم** كل `Pressable`/`Touchable*`/`*Button`/`*Chip`/`*Pill` حتى وسم الإغلاق (يلتقط لون الاختيار على `Text` الابن) بما فيه ألوان hex شرطية: **صفر** بلا `accessibilityState`/aria/دور switch-checkbox-radio.
- **الكردية:** `ku` مقابل `ar` (1048 مفتاحاً لكلٍّ): صفر ناقص، صفر قيمة مطابقة (≥4 حروف عربية)، صفر حرف عربي لا تستعمله السورانية. العمولات: أنواع/شروط/أدوار الخادم العربية تُترجَم بـ`SERVER_TYPE_KEYS`/`SERVER_COND_KEYS`/`SERVER_ROLE_IDS`؛ `rules`/`title`/`example` من `plan_document()` لا تُعرض. `NetworkTreePanel`/`SubscriptionPlansPanel`: لا حرفية عربية خارج التعليقات.
- **الحوارات بالويب:** `Alert.alert` بـ`chart/confirmDestructive.ts` وحده (`window.confirm`/`window.alert`)؛ `confirmDestructive` بتسعة ملفات منها `AccountScreen` (حذف الحساب).
- «₴» بتعليقين فقط؛ «درجة الاتفاق» بتعليق فقط (`AnalystsPanel:129`)؛ `Math.random` خارج chart = `api.ts:45` (UUID).
- **السعر المتجمّد:** `acceptTick` يرفض ما عمره عند الخادم > `TICK_STALE_MS`؛ `WatchlistPanel` لا يحسب نسبة/مسافة إلا من تيك حيّ غير تجريبي، والسعر البديل موسوم للقارئ (`wlDemoPriceA11ySuffix`).
- **الجولة:** `AccountScreen:221-239` ⇐ `OnboardingOverlay`.

## 2026-09-25 — تشغيل 33
صفّ ui المفتوح بـCOORDINATION (دورة QA 73) = **chart-r56 (3)** (نصيب ui؛ نصيب tools أُنجز بـ`327a73d`):

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 7023c51 | `AlertsPanel` مسافة صفّ التنبيه و`WatchlistPanel` مسافة الجرس: `chartPipSpec` بدل `instrumentSpec` ⇒ «USDJPYc»/«XAUUSDm»/«EURUSD.pro» (وبالأحرف الكبيرة كما تُحفظ) تنال مسافة pip (تحقّقتُ: 0.01/0.1/0.0001؛ DXY وBTCUSD تبقى `null`). الوحدة `pipUnit(lang)` (الإنجليزية «pips») بنصّ المسافة وشرائح الإزاحة وقارئ الشاشة. مواصفة النموذج (مفتاح التيكات) باقية `instrumentSpec` | chart-r56 (3) |

بوابة البناء خضراء (tsc 0) قبل الـcommit.

**إعادة تحقّق بنود المهمّة بالكود:** مسح أجسام `Pressable`/`Touchable*`/`*Chip|Pill|Button` بنطاقي بشرط اختيار بلا `accessibilityState`/aria/دور = **صفر**؛ «₴» بتعليقين فقط؛ «درجة الاتفاق» بتعليقات فقط؛ `Alert.alert` بـ`chart/confirmDestructive.ts` وحده (`window.confirm` بالويب)؛ إعادة الجولة `AccountScreen:235` ⇐ `OnboardingOverlay`.

## 2026-09-25 — تشغيل 34
صفّ ui الوحيد بـCOORDINATION (دورة QA 73) = **chart-r56 (3)** — أُنجز بتشغيل 33 (`7023c51`: `AlertsPanel`/`WatchlistPanel` بـ`chartPipSpec` و`pipUnit(lang)`)؛ الصفّ جاهز للإغلاق (نصيب tools `327a73d`). بوابة البناء خضراء (tsc 0). **لا تغيير بالكود هذا التشغيل** — كل بنود المهمّة مُصلَحة، وتحقّقتُ بفحوص جديدة بشجرة TypeScript (AST) لا بـgrep:
- **حالة الاختيار:** كل عنصر JSX بـ`onPress`/`onValueChange` خارج chart/i18n (177؛ 117 بحالة): الستّون الباقية لا شرط اختيار بنمطها ولا بأبنائها سوى `pressed`/`rtl`/نصّ زرّ. `ModerationToggle` يمرّر `expanded` داخلياً (`ModerationActions.tsx:146`)؛ خلفية `MatrixSidePanel:79` `accessible={false}` (الإغلاق بزرّ مسمّى).
- **الكردية:** `DICTS.ku` مقابل `DICTS.ar` (1057 مفتاحاً): صفر ناقص، صفر قيمة مطابقة، صفر حرف عربي لا تستعمله السورانية (ة ث ذ ض ظ). الحرفيات العربية بنطاقي خارج التعليقات = مفاتيح مطابقة لنصّ الخادم (`CommissionPlanPanel` → قاموس)، ونصوص أوامر الذكاء (`WeeklyReportPanel`، اللغة تُرسَل بـ`lang`)، و`MessagesScreen`/`mock.ts`/`api.ts:900` (launch52، أنس)، و`academy.ts` (QA27، أنس).
- «₴» بتعليقين فقط؛ «درجة الاتفاق» بتعليقات فقط (`AnalystsPanel`/`SocialConsensusPanel` تعرض عدّ الآراء و`avg_score` من الخادم)؛ `Math.random` خارج chart = UUID فقط.
- **الحوارات بالويب:** `Alert.alert` بـ`chart/confirmDestructive.ts` وحده؛ `confirmDestructive`/`notify` بثمانية ملفات منها `AccountScreen` (حذف الحساب).
- **السعر المتجمّد:** `acceptTick` (`hooks/tickAge.ts`) يرفض ما عمره عند الخادم > `TICK_STALE_MS`؛ `WatchlistPanel` يسِم السعر الاحتياطي/التجريبي (`wlDemoTag`، `wlDemoPriceA11ySuffix`) ولا يحسب منه نسبة ولا مسافة.
- **الجولة:** زرّ `accReplayTour` (`AccountScreen:219-239`) خارج أي فرع دخول ⇐ `OnboardingOverlay`.

## 2026-09-25 — تشغيل 35
صفّ ui المفتوح بـCOORDINATION (دورة QA 74) = **chart-r56 (3) — لوح العمق** — أُنجز:

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 1136739 | `DomLitePanel`: `quoteSpreadPips(..., chartPipSpec)` ⇒ «USDJPYc» 1.5 و«XAUUSDm» 3 (تحقّقتُ بـtsx؛ BTCUSD `null` ⇒ `formatPriceDiff` كالسابق)؛ الوحدة `pipUnit(lang)` بدل «pip» الثابتة؛ `formatPrice(bid/ask, symbol, quote.bid)` بمرجع واحد (نفط 99.950 / 100.050)؛ فحص الدفتر `quoteBookValid` كرأس الطرفية (`TerminalScreen.tsx:1725`) | chart-r56 (3) |

بوابة البناء خضراء (tsc 0) قبل الـcommit.

**إعادة تحقّق بنود المهمّة بالكود (بعد 2628416):** «₴» بتعليقين فقط (`ToolsScreen:88`، `MatrixEdgeRails:149`)؛ «درجة الاتفاق» بتعليقات فقط؛ `Alert.alert` بـ`chart/confirmDestructive.ts` وحده (`window.confirm`/`window.alert` بالويب، غيابه ⇒ لا تنفيذ)؛ `useMultiLiveTicks` يرفض المتجمّد (`acceptTick`، `TICK_STALE_MS`)؛ إعادة الجولة `AccountScreen:221-233`؛ `Math.random` خارج chart = `api.ts:45` (UUID). حالة الاختيار والكردية: لم يتغيّر ملف بنطاقي منذ مسح AST بتشغيل 34.

**إضافة — backend-r37** (صفّ وصل بـpull أثناء التشغيل):

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 3b45502 | `levels_basis.unavailable` بسبب لا نعرفه (`atr_exceeds_price`) تحت «شراء/بيع»: `IndicatorForecastPanel` كان يطبع «لا اتجاه غالب»، و`AnalystsPanel`/`SocialConsensusPanel` «الآراء متضاربة أو محايدة» — الآن لا سطر (نصّ المحايد للمحايد فقط). اللوح يستعمل `levelsUnavailableText` المشترك بدل سلسلة الشروط المنسوخة. النصّ الخاص يحتاج مفتاحاً بـ`i18n` (نطاق launch) ⇒ صفّ ui35 → launch؛ الربط سطر `case` واحد بعده | backend-r37 |

بوابة البناء خضراء (tsc 0) قبل الـcommit.

## 2026-09-25 — تشغيل 36
صفّ ui المفتوح بـCOORDINATION (دورة QA 75) = **ui35** — أُنجز:

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| a737eee | `signalDirection.ts:levelsUnavailableText` `case 'atr_exceeds_price'` ⇒ `t.sigLevelsUnavailableAtrWide` (مفتاح launch `3a1b533`) — كان لا سطر تحت «شراء/بيع» بلوح توقّع المؤشرات والمحلّلين والمجتمع (الثلاثة تستعمل الدالّة المشتركة)؛ تعليق `IndicatorForecastPanel` حُدّث | ui35 |

بوابة البناء خضراء (tsc 0) قبل الـcommit. QA75 (`tradePlan.ts` «pip») صفّ tools — لم يُمسّ.

**إعادة تحقّق بنود المهمّة بالكود:** لا `Pressable`/`onPress` جديد بنطاقي منذ مسح AST بتشغيل 34 (`git diff 96ca81c` بلا سطر مضاف منها)؛ الكردية: 1057 مفتاحاً، صفر ناقص، صفر حرف عربي غير سوراني، المطابق للعربي `listSep` («، » علامة مشتركة) فقط؛ «₴» بتعليقين؛ «درجة الاتفاق» بتعليقات؛ `Alert.alert` بتعليقات `AccountScreen:166`/`TradeJournalPanel:1183` واستدعاء `chart/confirmDestructive.ts` وحده؛ `useMultiLiveTicks` ⇐ `acceptTick`؛ إعادة الجولة `AccountScreen:221-233`.

## 2026-09-25 — تشغيل 37
صفوف ui بـCOORDINATION (دورة QA 75): **ui35** وحده — أُنجز بتشغيل 36 (`a737eee`؛ `signalDirection.ts:44-45` `case 'atr_exceeds_price'` ⇒ `t.sigLevelsUnavailableAtrWide`)، الصفّ جاهز للإغلاق. QA75 صفّ tools. بوابة البناء خضراء (tsc 0). **لا تغيير بالكود هذا التشغيل** — أعدتُ تحقّق بنود المهمّة بالكود بعد 2d8d29a (ملفّا نطاقي المتغيّران منذ تشغيل 36: `IndicatorForecastPanel` `6604c22`، `LayoutPanel` `af936a2` — لا زرّ جديد):
- **حالة الاختيار:** مسح AST جديد لكل عنصر JSX بـ`onPress`/`onValueChange` بلا `accessibilityState`/aria وبشرط نمط اختيار — مرشّح واحد (`MatrixBottomDock:95`، زرّ الإغلاق، شرطه `pressed` فقط) = صفر فعلي.
- **الكردية:** مقارنة عميقة `DICTS.ku`/`DICTS.ar` بما فيها الكائنات المتداخلة (`subPlans`): صفر ناقص، صفر حرف غير سوراني، المطابق بحرف عربي `listSep` وحده؛ والمطابق الباقي (10) محايد لغوياً (`RSI`، `Bid / Ask`، البريد…). الحرفيات العربية المعروضة خارج التعليقات بنطاقي: لا شيء — الباقي أوامر ذكاء (`WeeklyReportPanel`، `lang` مرسَل)، ومفاتيح ترجمة نصّ الخادم (`CommissionPlanPanel`)، ومحلّلات إدخال (`parseDecimal`/`positionSize`)، و`api.ts:900` (launch52).
- «₴» بتعليقين؛ «درجة الاتفاق» بتعليقات؛ `Alert.alert` بـ`chart/confirmDestructive.ts` وحده (مستعمَل بعشرة ملفات منها `AccountScreen`)؛ `useMultiLiveTicks` ⇐ `acceptTick` + مؤقّت الإسقاط؛ إعادة الجولة `AccountScreen:221-233`.

## 2026-09-25 — تشغيل 38
صفّا ui بـCOORDINATION (دورة QA 75): **QA75 (جانب ui)** و**launch135** — أُنجزا:

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 25212d8 | `VotePanel` `planSummary` يمرّر `unit: pipUnit(lang)` ⇒ «Risk 25 pips · Reward 50 pips» بالإنجليزية كالدفتر (`TradeJournalPanel:572`)؛ العربية/الكردية «pip» كما هي | QA75 (ui) |
| ec24807 | `SymbolSearchBar`: حالة `searchedQ` (النصّ الذي عادت له النتائج فعلاً) ⇒ سطر `t.ssbNoMatch` (`{q}`) يظهر فقط حين يكتمل بحث النصّ الحالي فارغاً بلا خطأ ولا تحميل — لا أثناء مهلة 350ms ولا بنتيجة نصّ سابق. لون هادئ (`textDim`) لا أحمر الخطأ، و`accessibilityLiveRegion="polite"` لقارئ الشاشة | launch135 |

بوابة البناء خضراء (tsc 0) قبل كل commit. **باقٍ من launch135 (ملاحظة ثانوية، نطاق launch):** 503 «Twelve Data not configured» يُعرض `ssbError` «تحقق من الاتصال» — يحتاج مفتاحاً جديداً (مثلاً `ssbUnavailable`) ثم أفرّق بـ`SymbolSearchBar` حسب الحالة.

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط؛ «درجة الاتفاق» بتعليقات فقط؛ `Alert.alert` بـ`chart/confirmDestructive.ts` وحده؛ `useMultiLiveTicks:75` ⇐ `acceptTick`/`TICK_STALE_MS`؛ إعادة الجولة `AccountScreen:221-233`. الزرّان المعدَّلان هذا التشغيل لا حالة اختيار لهما.
