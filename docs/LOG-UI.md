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
| b9e28c9 | `VotePanel` `planSummary` يمرّر `unit: pipUnit(lang)` ⇒ «Risk 25 pips · Reward 50 pips» بالإنجليزية كالدفتر (`TradeJournalPanel:572`)؛ العربية/الكردية «pip» كما هي | QA75 (ui) |
| 5906252 | `SymbolSearchBar`: حالة `searchedQ` (النصّ الذي عادت له النتائج فعلاً) ⇒ سطر `t.ssbNoMatch` (`{q}`) يظهر فقط حين يكتمل بحث النصّ الحالي فارغاً بلا خطأ ولا تحميل — لا أثناء مهلة 350ms ولا بنتيجة نصّ سابق. لون هادئ (`textDim`) لا أحمر الخطأ، و`accessibilityLiveRegion="polite"` لقارئ الشاشة | launch135 |

بوابة البناء خضراء (tsc 0) قبل كل commit. **باقٍ من launch135 (ملاحظة ثانوية، نطاق launch):** 503 «Twelve Data not configured» يُعرض `ssbError` «تحقق من الاتصال» — يحتاج مفتاحاً جديداً (مثلاً `ssbUnavailable`) ثم أفرّق بـ`SymbolSearchBar` حسب الحالة.

**إعادة تحقّق بنود المهمّة بالكود:** «₴» بتعليقين فقط؛ «درجة الاتفاق» بتعليقات فقط؛ `Alert.alert` بـ`chart/confirmDestructive.ts` وحده؛ `useMultiLiveTicks:75` ⇐ `acceptTick`/`TICK_STALE_MS`؛ إعادة الجولة `AccountScreen:221-233`. الزرّان المعدَّلان هذا التشغيل لا حالة اختيار لهما.

## 2026-09-25 — تشغيل 39
صفّ ui بـCOORDINATION (دورة QA 77): **chart-r60** (`TimeframeBar`) — أُنجز:

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| 57d2053 | `TimeframeBar`: موضع كل زرّ بـ`onLayout` وعرض النافذة وإزاحتها ⇒ تمرير للفريم النشط عند التركيب وتغيّر `value`، **فقط** إن كان خارج النظر (يُوسَّط، لا قفز عند كل نقرة). RTL مُعطَّل بالتطبيق (`I18nContext:52`) فالمواضع يسار→يمين | chart-r60 |

بوابة البناء خضراء (tsc 0) قبل الـcommit. ملاحظة launch135 الثانوية (503) أغلقها launch بصياغة `ssbError` الجديدة (`90e0f05`) — لا شيء بـ`SymbolSearchBar`.

**إعادة تحقّق بنود المهمّة بالكود (بعد 779c767):**
- **حالة الاختيار:** مسح جديد لكل `Pressable`/`Touchable*`/`Switch` بنطاقي بنمط اختيار بصري بلا `accessibilityState`/aria — نتيجة واحدة (`CoursesScreen:252`، `setActiveLecture` تنقّل لا اختيار) = صفر فعلي.
- «₴» بتعليقين فقط (`ToolsScreen:88`، `MatrixEdgeRails:149`)؛ «درجة الاتفاق» بتعليقات فقط (`AnalystsPanel:129`، `SocialConsensusPanel:234`)؛ `Alert.alert` بـ`chart/confirmDestructive.ts` وحده؛ `useMultiLiveTicks` ⇐ `acceptTick`/`TICK_STALE_MS`؛ إعادة الجولة `AccountScreen:219-240` (`accReplayTour`).
- الكردية: لم يتغيّر ملف بنطاقي منذ تشغيل 37 عدا `TimeframeBar` (يستعمل `t.tfLabels`/`t.tfLabelsA11y`).

## 2026-09-25 — تشغيل 40
صفّ ui بـCOORDINATION (دورة QA 77): **chart-r60** (`TimeframeBar`) — أُنجز بتشغيل 39 (`57d2053`)، الصفّ جاهز للإغلاق. لا صفّ ui آخر. بوابة البناء خضراء (tsc 0، بعد 7d5a4d2). **لا تغيير بالكود هذا التشغيل** — كل بنود المهمّة تحقّقتُ منها بالكود من جديد (لا بالسجلّ) ولم يبقَ منها شيء مفتوح:
- **حالة الاختيار:** مسح AST لكل `Pressable`/`Touchable*`/`Switch` وكذلك `Text`/`View` ذات `onPress` بنطاقي، بنمط اختيار بصري (`on &&`/`active &&`/`=== value`…) بلا `accessibilityState`/aria — نتيجة واحدة (`MatrixBottomDock:95`، زرّ إغلاق شرطه `pressed` فقط) = صفر فعلي.
- **الكردية:** مقارنة عميقة لـ`DICTS.ku` مقابل `DICTS.ar` (بالكائنات المتداخلة): صفر مفتاح ناقص، صفر قيمة بحرف عربي غير سوراني (ة ى ي ك أ إ ؤ)، المطابق للعربي `listSep` وحده. الحرفيات العربية خارج التعليقات بنطاقي (مسح AST): `MessagesScreen`/`mock.ts`/`api.ts:900` (⛔ launch52)، مفاتيح ترجمة نصّ الخادم (`CommissionPlanPanel:41-57`)، أوامر ذكاء (`WeeklyReportPanel`)، محلّلات إدخال، و«، » مشروطة بـ`rtl` (`ScreenerMini:116`، `ChartFrame:494` — السورانية تستعملها أيضاً). الخطط/الشبكة من القاموس (`t.subPlans`، `slot.label` رقم). الأكاديمية `lang === 'ar'` ⇒ الكردي يرى الإنجليزية (QA27، قرار أنس).
- «₴» بتعليقين فقط؛ «درجة الاتفاق» بتعليقات فقط (`AnalystsPanel:129`، `SocialConsensusPanel:234`)؛ `Alert.alert` بـ`chart/confirmDestructive.ts` وحده (`window.confirm`/`window.alert` على الويب؛ 9 مستهلكين منهم حذف الحساب).
- **السعر المتجمّد:** `useMultiLiveTicks:75` ⇐ `acceptTick` (يرفض ما عمره عند الخادم > `TICK_STALE_MS`) + مؤقّت إسقاط + ترك المقبس الصامت؛ غياب التيك ⇒ `WatchlistPanel:368` سعر أساس موسوم «تجريبي» بصرياً (`wlDemoTag`) ولقارئ الشاشة (`wlDemoPriceA11ySuffix`) ولا نسبة يوم ولا مسافة تنبيه منه.
- **إعادة الجولة:** `AccountScreen:219-241` زرّ `accReplayTour` خارج أي فرع تسجيل دخول (متاح للزائر) ⇒ `OnboardingOverlay visible`.

## 2026-09-25 — تشغيل 41
صفوف ui بـCOORDINATION (دورة QA 77): **tools92** (جديد) و**chart-r60** (أُنجز `57d2053`، جاهز للإغلاق).

| commit | ماذا | صفّ COORDINATION |
|---|---|---|
| b0c7b7d | `MatrixBottomDock` تبويب الدفتر: `<TradeJournalPanel defaultSymbol={symbol} chartBannerVisible />` — الرصيف بالتدفّق تحت الشارت و`TerminalScreen` يعرض `<NewsRiskBanner symbol={symbol} />` للرمز نفسه فوقه ⇒ لا تحذير «صفقاتك المفتوحة» مكرَّر. `MatrixSidePanel` **لم يُمسّ** (اللوح يغطّي الشريط؛ تعليق بالرصيف ينبّه) | tools92 |
| 51089f9 | `useMultiLiveTicks` (قائمة المتابعة والرباعي): عدّاد الصمت يبدأ من المحاولة، ومقبس عالق بـ`CONNECTING` > `TICK_STALE_MS` يُترك ويُعاد — نظير إصلاح chart `42c0f3b` بـ`useLiveTicks` الذي لم يصل النسخة المتعدّدة؛ كانت القائمة تنتظر مهلة TCP بالنظام بلا سعر حيّ | chart-r61 (وصل بـpull بعد الإصلاح؛ مطابق حرفياً — العودة للواجهة مع `CONNECTING` يتولّاها مؤقّت الصمت بعد 20s كـ`useLiveTicks`) |

بوابة البناء خضراء (tsc 0) قبل كل commit.

**إعادة تحقّق بنود المهمّة بالكود (بعد 2e8e279):**
- **حالة الاختيار:** مسح لكل `Pressable`/`Touchable*`/`Text`/`View` بـ`onPress` بنطاقي بنمط اختيار بصري — 36 مرشّحاً كلّها بـ`accessibilityState`/aria (تحقّقتُ أن المسح يلتقطها بإزالة الشرط) ⇒ صفر بلا حالة.
- **الكردية:** مقارنة عميقة `ku`/`ar` (1061 مفتاحاً، `tsx` على `locales.ts`): صفر ناقص، صفر حرف غير سوراني، المطابق `listSep` وحده. فروع `lang`/`rtl` بنطاقي محاذاة فقط (و«، » تستعملها السورانية).
- «₴» بتعليقين فقط؛ «درجة الاتفاق» بتعليقات فقط؛ `Alert.alert` بـ`chart/confirmDestructive.ts` وحده (9 مستهلكين منهم `AccountScreen` حذف الحساب)؛ `useMultiLiveTicks:75` ⇐ `acceptTick`؛ إعادة الجولة `AccountScreen:221-235` (`accReplayTour`).
- ملفّات نطاقي التي عدّلها chart منذ تشغيل 40 (`QuadChartModal` `4be7ba1`/`bcc8f36`، `useLiveTicks` `42c0f3b`): سليمة.

## 2026-09-25 — تشغيل 42
صفوف ui بـCOORDINATION (دورة QA 78): **tools92** و**chart-r61** — كلاهما منجز بالكود (`MatrixBottomDock.tsx:212` `chartBannerVisible`؛ `useMultiLiveTicks.ts:120,137` معاملة `CONNECTING` كـ`OPEN` بفحص الصمت) من تشغيل 41، جاهزان للإغلاق. **لا تغيير بالكود هذا التشغيل.**
- لم يتغيّر أيّ ملف بنطاقي منذ تشغيل 41 (`git diff e8d67fc..a97dab9 -- mobile/src` ⇒ `chart/MatrixChart.tsx` و`i18n/locales.ts` فقط).
- **الكردية** (locales تغيّر): مقارنة عميقة `ku`/`ar` بـ`tsx` ⇒ 1114 مفتاحاً، صفر ناقص، صفر حرف غير سوراني، المطابق `listSep` وحده.
- «₴» بتعليقين فقط؛ «درجة الاتفاق» بتعليقات فقط؛ `Alert.alert` بـ`chart/confirmDestructive.ts` وحده (10 ملفات تستعمله منها حذف الحساب)؛ `useMultiLiveTicks` ⇐ `acceptTick`/`TICK_STALE_MS`؛ إعادة الجولة `AccountScreen:221-233`.
- بوابة البناء خضراء (tsc 0).

## 2026-09-25 — تشغيل 43
لا صفّ ui مفتوح بـCOORDINATION (دورة QA 79 أغلقت tools92 وchart-r61 وchart-r60). **لا تغيير بالكود هذا التشغيل.**
- ملفّات `mobile/src` المتغيّرة منذ a97dab9 (حتى cb6da71): chart (`barCountdown`/`marketHours`/`newsRisk`/`paneGuides`/`positionTool`)، tools (`TradeJournalPanel`، `NewsRiskBanner` ضمن عمل الدفتر، `positionSize`/`tradePlan`)، `i18n/locales.ts` — لا شيء بنطاقي.
- **حالة الاختيار:** مسح AST (`typescript`) لكل `Pressable`/`Touchable*`/`Switch`/ذي `onPress` بنطاقي، بنمط اختيار بصري بأسلوبه **أو بأسلوب أبنائه** — 22 مرشّحاً كلّها بـ`accessibilityState`/aria/role (تحقّقتُ أن المسح يلتقطها بإلغاء الشرط) ⇒ صفر بلا حالة.
- **الكردية** (locales تغيّر): مقارنة عميقة `ku`/`ar` بـ`tsx` ⇒ 1144 مفتاحاً، صفر ناقص، صفر حرف غير سوراني، المطابق `listSep` وحده.
- «₴» بتعليقين فقط؛ «درجة الاتفاق» بتعليقات فقط؛ `Alert.alert` حقيقية بـ`chart/confirmDestructive.ts` وحده (ذكرها بـ`TradeJournalPanel:1213`/`AccountScreen:166` تعليقات؛ 10 ملفات تستعمل `confirmDestructive`)؛ `useMultiLiveTicks:78` ⇐ `acceptTick`/`TICK_STALE_MS`؛ إعادة الجولة `AccountScreen:221-235` (`accReplayTour`).
- بوابة البناء خضراء (tsc 0).

## 2026-09-25 — تشغيل 44
لا صفّ ui مفتوح بـCOORDINATION (دورة QA 80). **لا تغيير بالكود هذا التشغيل.**
- ملفّات `mobile/src` المتغيّرة منذ 97eb1c4 (حتى fa1fda2): `chart/zoomWindow*` (chart) و`tradePlan*` (tools) — لا شيء بنطاقي.
- **حالة الاختيار:** مسح AST لكل عنصر بـ`onPress`/`onValueChange` بنطاقي بنمط اختيار بصري (`active &&`/`styles.*On|Active|Selected`…) — 45 مرشّحاً كلّها بـ`accessibilityState`/aria ⇒ صفر بلا حالة. (تحقّقتُ أن المسح يلتقط ملفاً اختبارياً مزروعاً بلا حالة، ثم حذفته.)
- **الكردية:** مقارنة عميقة `ku`/`ar` بـ`tsx` ⇒ 1144 مفتاحاً، صفر ناقص، صفر حرف غير سوراني، المطابق `listSep` وحده. الحرفيات العربية بالكود (مسح AST): مفاتيح ترجمة نصّ الخادم (`CommissionPlanPanel:40-57` ⇒ القاموس)، أوامر ذكاء (`WeeklyReportPanel`)، `academy.ts` (QA27 أنس)، `MessagesScreen`/`mock.ts`/`api.ts:900` (غير مستوردة، launch52 أنس)، محلّل أرقام، و«، » مشروطة بـ`rtl`.
- «₴» بتعليقين فقط؛ «درجة الاتفاق» بتعليقات فقط (`AnalystsPanel:129`، `SocialConsensusPanel:234`)؛ `Alert.alert` حقيقية بـ`chart/confirmDestructive.ts` وحده (`window.confirm`/`alert` على الويب؛ 9 ملفات تستعمله منها حذف الحساب)؛ `useMultiLiveTicks` ⇐ `acceptTick`/`TICK_STALE_MS`؛ إعادة الجولة `AccountScreen:219-241` (`accReplayTour`) خارج أي فرع دخول.
- بوابة البناء خضراء (tsc 0).

## 2026-09-25 — تشغيل 45 (DESIGN-PRO، أول تطبيق)
لا صفّ ui قبل التشغيل؛ دورة QA 81 وصلت أثناءه بصفوف DP موجَّهة لـui — كلها نُفّذت، كلٌّ بـcommit مستقل (بوابة البناء خضراء، tsc 0، قبل كل واحد):

| commit | بند DESIGN-PRO | ماذا |
|---|---|---|
| 936974a | §2 DP1 | توكن `numeric` بـ`theme.ts` (`fontVariant: tabular-nums`) بـ22 ملفاً: قائمة المتابعة، رأس الإطار، النافذة المركّزة، DOM، التنبيهات، مستويات المحلّلين/الإجماع/التوقّع/التصويت، الماسح، الأوقات، العمولات، الحساب، الدورات (QA أغلق جانب ui) |
| a0cce9b | §5.1 DP3 | مختار الإطارات حُذف من `RightPanelRail` (الشريط العلوي يحمله كاملاً حيث يوجد الشريط). الخصائص `@deprecated` حتى يكفّ `TerminalScreen` عن تمريرها ⇒ صفّ **ui45 → tools** (ومعه زرّ `q2` المكرّر بالشريط العلوي) |
| 735fda8 | §4 DP10 | صفّ المتابعة المختار: `colors.selectedFill` + علامة 2px (`selectedMarkerWidth`) بدل حدّ/تعبئة/نصّ بالتأكيد (`accessibilityState` كان موجوداً أصلاً) |
| a1ae78e | §4 DP6 | الشريطان أيقونات فقط؛ الاسم تلميحٌ بعد 400ms مرور (ويب) أو بالضغط الطويل، مرسوم على مستوى الشريط خارج `ScrollView` |
| 829ba46 | §5.2 DP4 | ↑ ↓ ✕ بالمتابعة مخفية وقت السكون: طبقة فوق حافة السعر عند المرور/الضغط الطويل؛ ولقارئ الشاشة `accessibilityActions` (moveUp/moveDown/remove)؛ الحذف ما زال عبر `confirmDestructive` |
| 9fdca5b | §5.4 DP5 | الرصيف: رسم، تنبيهات، تقويم، دفتر، «المزيد» (`dockMoreTab`) ⇒ شبكة العشر الباقية |
| 962dbbf | §1 DP2 | ميزانية التأكيد: الاختيار بالشريطين والرصيف تعبئة محايدة + علامة (العدسة علامة محايدة فأداة الرسم وحدها بالتأكيد)؛ الشريط العلوي: الفريم النشط هو التأكيد والرمز محايد؛ شارة الجرس وأزرار أداة المتابعة محايدة |
| 014143a | §6 (QA81) | `motion` = `{ flash: 180 }` بدل 160/220 غير المستعملة |
| f934a35 | §2 DP12 | 232 وزناً 700–900 بـ35 ملفاً: أنماط الأسعار 600، والباقي 500 |
| 92fa241 | §3 DP11 | 192 مسافة حرفية إلى مضاعفات 4 (<2→0، 2–3→4، النصف: الحشوة للأعلى والهامش/الفجوة للأسفل) |

- **لم يُتحقَّق بصرياً**: لا متصفّح على هذا الجهاز (لا chromium/playwright) — tsc وحده. أولى ما يُفحص على جهاز: تلميح الشريط (موضعه وطبقته فوق الشارت)، طبقة ↑↓✕ بالمتابعة، وشبكة «المزيد».
- مفاتيح `railFrameWord`/`railSquareWord`/`railRectangleWord`/`railShadowWord` صارت بلا مستعمل (launch يقرّر حذفها).
- **بنود المهمّة الأصلية** (حالة الاختيار، الكردية، «₴»، السعر المتجمّد، إعادة الجولة، الحوارات على الويب، «درجة الاتفاق»): لم يتغيّر ملف بنطاقي منذ تشغيل 44 قبل هذه التعديلات؛ كل زرّ جديد هنا (`RailButton`، «المزيد»، طبقة الصفّ) بـ`accessibilityLabel` و`accessibilityState` حيث يوجد اختيار.

## 2026-09-25 — تشغيل 46
صفوف ui بـCOORDINATION (دورة QA 81): صفوف DP (DP2–DP6، DP10، DP11/12، `motion`) أُنجزت بتشغيل 45 (جاهزة للإغلاق)؛ ui45 نفّذه tools (`71d8066`). المفتوح فعلاً: **launch141** و**launch142/backend-r46**. كلٌّ بـcommit مستقل، بوابة البناء خضراء (tsc 0) قبل كل واحد:

| commit | ماذا | صفّ |
|---|---|---|
| 5ec2eec | صفّ المتابعة `accessibilityHint={t.wlRowActionsHint}` (الترتيب/الإزالة بالضغط الطويل)؛ مدخل «المزيد» بالرصيف `accessibilityHint={t.dockMoreA11y}` (تلميح لا تسمية: «لوحات أخرى» لا تحوي النصّ الظاهر «المزيد» فتسميةً تكسر قاعدة التسمية-بالاسم) | launch141 |
| 983adcd | `SymbolSearchBar`: `ambiguous` تُعرض صفوفاً غير قابلة للضغط (`accessibilityRole="text"`، `textDim`، بلا تأكيد/`warn`) بسطر `ssbAmbiguousTag`؛ و`ssbOnlyAmbiguous` بدل «لا رمز» الكاذبة حين النتائج فارغة (AAPL، SHEL)؛ سطر التفاصيل يُسقط الأجزاء الفارغة (لا «Bitcoin Euro · »)؛ `currency` (`GBp`) يُعرض حين يرسله الخادم؛ نوع `api.symbolSearch` يحمل `ambiguous`/`exchanges`/`currency` | launch142 + backend-r46 (1)(2)(3) |
| 3ba64a7 | DESIGN-PRO §1: رموز نتائج البحث بـ`colors.text` لا التأكيد (حتى 8 عناصر تأكيد بمنطقة واحدة) | DP2 (ملفّ لم يشمله QA81) |

- **لم يُتحقَّق بصرياً** (لا متصفّح على الجهاز) — tsc وحده.
- بنود المهمّة الأصلية: «₴» بتعليقين فقط (`ToolsScreen:88`، `MatrixEdgeRails:202`)؛ `Alert.alert` بـ`chart/confirmDestructive.ts` وحده؛ لم يتغيّر غير الملفّات أعلاه بنطاقي منذ تشغيل 45.

## 2026-09-25 — تشغيل 47
صفّا ui بـCOORDINATION (دورة QA 82)، كلٌّ بـcommit مستقل، بوابة البناء خضراء (tsc 0) قبل كل واحد:

| commit | ماذا | صفّ |
|---|---|---|
| ed917cd | حذف خصائص `layoutCount`/`layoutShape`/`onLayoutPick` `@deprecated` واستيراد أنواعها من `RightPanelRail` (لا مستدعي يمرّرها) | ui45 (بقية) |
| 918ae86 | التسجيل: حُذفت شرائح «نوع الحساب» و`t.accountType` (الخادم يقبل `trader` وحده منذ backend `06ea3ab` ⇒ الأربعة الأخرى 422 دائماً)؛ `role: 'trader'` ثابت؛ الرفض عبر `registerErrorText(t, e)` بدل `registerError` الجامع (`authErrors.selftest` ok) | launch143 |

- مفاتيح `accountType`/`trainer`/`broker`/`agent`/`company` ما زالت مستعملة بعرض الشبكة (`isRoleId(net.role) ? t[net.role]`) عدا `accountType` — صار بلا مستعمل (launch يقرّر حذفه).
- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط؛ `Alert.alert` صفر بملفّات `tsx`؛ «درجة الاتفاق» بتعليقات فقط؛ الكردية: 1080 مفتاحاً، صفر ناقص، صفر مطابق للعربية، صفر «ة/ي/ك» عربية.
- DESIGN-PRO: قائمة QA 82 فشلها الوحيد (DP2) بـ`TerminalScreen` (tools) — لا بند مفتوح بنطاقي.
- **لم يُتحقَّق بصرياً** (لا متصفّح على الجهاز) — tsc وحده.

## 2026-09-26 — تشغيل 48
صفوف ui بـCOORDINATION (دورة QA 82): ui45 (بقية) وlaunch143 نُفّذا بتشغيل 47 (`ed917cd`، `918ae86`) بانتظار إغلاق QA. الجديد: **chart-r66b** (`FocusChartModal.tsx` بـ`components/` ⇒ ui). بوابة البناء خضراء (tsc 0) قبل الـcommit:

| commit | ماذا | صفّ |
|---|---|---|
| b1a4ffc | رأس التركيز: `quote` يُخزَّن بـ`forSymbol` ويُعرض عند التطابق فقط ⇒ لا «B/A» للزوج السابق بعد التبديل. خطّ المقارنة ومفتاحه يُمسحان فور تغيّر الفريم أو رمز المقارنة (`compareKeyRef` = `compareSym|tf`)؛ تبديل الرمز الرئيسي وحده لا يمسّه | chart-r66b |

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط؛ `Alert.alert` بـ`confirmDestructive.ts` وحده (الباقي تعليقات)؛ «درجة الاتفاق» بتعليقات فقط؛ الكردية 1080 مفتاحاً، صفر ناقص، المطابق `listSep` وحده، صفر «ة/ي/ك»؛ `useMultiLiveTicks` ⇐ `acceptTick`/`TICK_STALE_MS`؛ `accReplayTour` قائم.
- DESIGN-PRO: فشل QA 82 الوحيد (DP2) بـ`TerminalScreen` (tools). ملفّاتي المتغيّرة منذ تشغيل 47 (`OnboardingOverlay`/`AppErrorBoundary` §5.5 بلا ظلّ، `MatrixEdgeRails`، `WatchlistPanel`) لا تُدخل فشلاً.
- **لم يُتحقَّق بصرياً** (لا متصفّح على الجهاز) — tsc وحده.

## 2026-09-26 — تشغيل 49
صفّ ui بـCOORDINATION (دورة QA 83): **launch144**. بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| 578f60c | `AccountScreen.submit`: رفض الدخول عبر `loginErrorText(t, e)` بدل `t.loginError` الجامع ⇒ 401 «الاسم أو الإيميل أو كلمة المرور غير صحيحة»، حقل فارغ ⇒ «اكتب الاسم»، شبكة/5xx ⇒ الجامع (`postJson` يحمل `status`/`detail`) | launch144 |
| 33b4132 | `ScreenerMini`: رقاقات الفلتر السريع `textMuted` بالسكون (كانت كلها بالتأكيد ⇒ حتى 5 عناصر تأكيد بمنطقة واحدة، §1)؛ المختارة `selectedFill` + نصّ التأكيد (§4)؛ حدّ بلا خلفية (§5.5) | DP2 (ملفّ لم يشمله QA83) |

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط؛ `Alert.alert` صفر استدعاء بملفّات نطاقي (`confirmDestructive`)؛ «درجة الاتفاق» بتعليقات فقط؛ إعادة الجولة `AccountScreen.tsx:208-220`؛ حالة الاختيار: كل زرّ بنمط `On/Active` بنطاقي يحمل `accessibilityState.selected` وتعبئة `selectedFill`.
- **لم يُتحقَّق بصرياً** (لا متصفّح على الجهاز) — tsc وحده.

## 2026-09-26 — تشغيل 50
صفوف ui بـCOORDINATION: **QA84a** (سلّم الخطوط §2)، و**backend-r50a**/**backend-r50c** (وصلا أثناء التشغيل). كلٌّ بـcommit مستقل، بوابة البناء خضراء (tsc 0) قبل كل واحد:

| commit | ماذا | صفّ |
|---|---|---|
| 1a77e9b | المتابعة: السعر 15px، الرمز 12px، الشارات/التغيّر/الأزرار 11px (كانت 8–10)؛ `numberOfLines={1}` للرمز والسعر؛ العمود المضغوط 148→160 كي يتّسع للسعر بدل تصغير الخطّ (§7) | QA84a |
| 0d0951a | الرصيف: تسميات المداخل والرقاقات وعناوين الأقسام 10→11؛ رقاقة الرسم 66→72 | QA84a |
| 736f346 | 82 `fontSize` تحت 11 بـ27 ملفاً من نطاقي ⇒ 11 (لا صندوق ثابت أصغر: عنصر الأسطوانة 24px، عناوين الشريط تلتفّ، لا `lineHeight` <14)؛ `TimeframeBar` أسقط `textCompact` 10px. **صفر** تحت 11 بنطاقي الآن؛ الباقي `chart/` و`TerminalScreen` (tools) | QA84a |
| 5ff2713 | الخروج ينادي `POST /api/auth/logout` قبل المسح المحلي (التوكن ما زال مضبوطاً): يُلغي الجلسة ويفكّ رمز Push (بمعرّف التثبيت، وبرمز Expo إن كان الإذن ممنوحاً — `currentPushToken()` بـ`notifications.ts`، لا يسأل الإذن). سقف 2ث للرمز + 4ث للطلب، الفشل لا يمنع الخروج؛ الزرّ مشغول أثناءه | backend-r50a |
| a7daed8 | تنبيه سعر/مؤشر على DXY يُرفض قبل الإرسال بنصّ `chartNotOfferedTitle` الموجود («DXY غير متاح من مزوّد البيانات» — بلا مفتاح جديد)، و422 `symbol unavailable at provider` يُترجَم للنصّ نفسه (إضافة/تعديل/إعادة تسليح). `providerSymbols.ts` + selftest | backend-r50c |

- جديد بـCOORDINATION: **ui50** → chart/tools (التنبيه من الشارت على DXY، ونسخة `NOT_OFFERED_SYMBOLS` بـ`TerminalScreen`).
- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط؛ `Alert.alert` بـ`confirmDestructive.ts` وحده؛ «درجة الاتفاق» بتعليقات فقط؛ إعادة الجولة `AccountScreen:210-222`؛ `useMultiLiveTicks` ⇐ `acceptTick`/`TICK_STALE_MS`.
- **لم يُتحقَّق بصرياً** (لا متصفّح على الجهاز) — tsc وحده. أولى ما يُفحص: عرض عمود المتابعة المضغوط بسعر BTC/XAU بـ15px، ورقاقات الرسم بالرصيف بالعربية/الكردية.

## 2026-09-26 — تشغيل 51
صفوف ui بـCOORDINATION: backend-r50a/b/c وQA84a أغلقها QA 85 (`d7f19a7`)؛ لا صفّ جديد موجَّه لـui. المتبقّي: DESIGN-PRO بملفّات نطاقي (فحص بالكود لا بقائمة QA وحدها). كلٌّ بـcommit مستقل، بوابة البناء خضراء (tsc 0) قبل كل واحد:

| commit | ماذا | بند |
|---|---|---|
| c249994 | `theme.ts` `frameEmbed` 10/50/10/8 ⇒ 12/48/12/8، و`frameEmbedHead.gap` 10 ⇒ 12 — كل لوحة داخل فريم ورثتها (فحص QA بالأرقام الحرفية لا يرى التوكنات). المقبض ينتهي عند 44 ⇒ 48 يكفي | §3 |
| 0f48f5c | مقبض سحب الفريم (`FrameSizedGrid`): كان حدّاً + حدّاً داخلياً + 9 نقاط بالتأكيد على **كل** فريم بالسكون ⇒ خلفية وحدها ونقاط `textDim`؛ حُذف `accentBorderGlow` (بلا مستعمل) | §1، §5.5 |
| 78d71c6 | أزرار «تحديث/احسب/شغّل» بـ`AnalystsPanel`/`SocialConsensusPanel`/`IndicatorForecastPanel`: حدّ ونصّ التأكيد بالسكون ⇒ `border` + `textMuted` | §1 |
| bf4feff | «فعّل الإشعارات» (`AccountScreen`، `IndicatorAlertsPanel`) و«+ انشر» (`VotePanel`) بالنمط نفسه | §1 |

- بقي بالتأكيد عمداً: حالات `On/Active` المختارة (تعبئة + حدّ — المختار هو ما يستحقّ التأكيد)، `cellHover`/`cellDragging` بالشبكة (أثناء السحب فقط)، فقاعات «رسالتي» بالمحادثة، `youBox` بالشبكة. إن رأى QA أنّ الحدّ+التعبئة بحالات `On` يخالف §5.5 فهو بند مستقل.
- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط؛ `Alert.alert` بـ`chart/confirmDestructive.ts` وحده؛ «درجة الاتفاق» بتعليقات فقط.
- **لم يُتحقَّق بصرياً** (لا متصفّح على الجهاز) — tsc وحده. أولى ما يُفحص: تباين مقبض الفريم المحايد فوق شمعات فاتحة.

## 2026-09-26 — تشغيل 52
لا صفّ بـCOORDINATION (دورة QA 85) موجَّه لـui (ui50 صادر منّا لـchart/tools). بنود المهمّة الأصلية كلها منجزة (تحقّق بالكود): «₴» بتعليقين فقط؛ `Alert.alert` بـ`chart/confirmDestructive.ts` وحده؛ «درجة الاتفاق» بتعليقات فقط؛ إعادة الجولة `AccountScreen` (`accReplayTour`)؛ كل زرّ بنمط `On/Active` بنطاقي يحمل `accessibilityState.selected` (فحص آلي للوسوم). فحص DESIGN-PRO بملفّات نطاقي: لا وزن 700، لا مسافة خارج 4، لا حدّ+خلفية+ظلّ معاً. بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | بند |
|---|---|---|
| 5a887a2 | `accessibilityLabel` صريح لـ11 زرّاً نصّياً (لغة/تبويب الدخول/الساق/إرسال/خروج/حذف الحساب/الإشعارات بـ`AccountScreen`، «تحديث» بـ`CommissionPlanPanel`/`NetworkTreePanel`) — التسمية اسم الفعل لا «...» أثناء الانشغال (المشغول بـ`accessibilityState.busy`) | قائمة القبول 9 |
| 6524b2f | حالة «مفعّل»/«يراقب» على كل صفّ تنبيه (`AlertsPanel`، `IndicatorAlertsPanel`) `textMuted` بدل التأكيد — كانت n شارات تأكيد لقائمة n تنبيهات | §1 |

- `MessagesScreen` (3 أزرار بلا تسمية صريحة، و«رجوع» عربي ثابت) لم تُمسّ: غير مستوردة وقرار حذفها/ربطها لأنس (launch52).
- بقي بالتأكيد (مراجَع): روابط نصّية فعلية (رجوع/إغلاق/إعادة تسليح/«استعمل الحالي»)، `youTag`/`youName` بالشبكة، فقاعة «رسالتي»، أشرطة التقدّم. إن عدّها QA تجاوزاً لميزانية المنطقة فهي بنود مستقلة.
- **لم يُتحقَّق بصرياً** (لا متصفّح على الجهاز) — tsc وحده.
- **launch147** (وصل أثناء التشغيل) ← `d56828b`: مقبض الفريم (`FrameSizedGrid`) `accessibilityRole="adjustable"` + `t.gridHandleA11y` + القيمة «n من m»؛ سحب لأعلى/لأسفل بقارئ الشاشة يبدّل الفريم مع جاره (`swap` نفسه) — السحب لم يكن الطريق الوحيد بعد الآن. تسميتا الفعلين `wlMoveUpA11y`/`wlMoveDownA11y` («تحريك لأعلى/لأسفل») مستعارتان — إن أراد launch صياغة للشبكة («قبل/بعد») فمفتاحان جديدان.

## 2026-09-26 — تشغيل 53
صفوف ui بـCOORDINATION (دورة QA 86): **backend-r52**، **QA86a–d**؛ launch147 كان منجزاً (`d56828b`، `FrameSizedGrid:340`). كلٌّ بـcommit مستقل، بوابة البناء خضراء (tsc 0) قبل كل واحد:

| commit | ماذا | صفّ |
|---|---|---|
| aacb194 | `AuthContext.checkSession`: `GET /api/auth/me` (`api.sessionCheck`) عند الإقلاع وكل عودة للواجهة (`AppState` active). 401 وحده ⇒ `POST /api/auth/logout` بالتوكن المنتهي (الخادم يفكّ رمز Push به) ثم مسح الجلسة و`sessionExpired` ⇒ سطر `warn` فوق نموذج الدخول بـ`AccountScreen`. شبكة/مهلة/5xx لا تُخرج أحداً؛ دخول جديد أثناء الطلب لا يُمسح (مقارنة التوكن) | backend-r52 |
| c6d97ec | حُذف `buttons.shadow*` من 12 زرّاً ممتلئاً بـ11 ملفاً (الخلفية وحدها) | QA86b |
| c5ed090 | `colors.dxy` خارج الشارت: زرّ إرسال `AiPanel` بالتأكيد + `onAccent`، الكاتب/الأزواج/شريط الصوت/وسم AI بـ`CoursesScreen` ⇒ `textMuted`؛ خطط الاشتراك الثلاث محايدة (كانت تيل/سماوي/بنفسجي على الحدّ والشارة والسعر والعلامات) | QA86c |
| abc6eca | `PriceFlash`: وميض خلفية 180ms (`motion.flash`) up/down 12% يخفت، على خانة سعر المتابعة مع كل تيك حيّ مغيِّر؛ لا وميض لسعر تجريبي ولا مع «تقليل الحركة» بالنظام | QA86a |
| 3612351 | ترويسة `providerSymbols.ts` لا تشير لنسخة `TerminalScreen` المحذوفة | QA86d |

- جديد بـCOORDINATION: **ui53** → launch: مفتاح `authSessionExpired` (ar/en/ku). حتى يصل لا يظهر السطر (يُقرأ اختيارياً — لا نصّ ثابت بلغة واحدة)؛ الجلسة تُمسح ونموذج الدخول يظهر على أي حال.
- بقي `colors.dxy` عمداً حيث هو هوية بيانات لا لون واجهة: رمز DXY بالمتابعة، خطّ DXY بـ`FocusChartModal`/`QuadChartModal`، تمييز الساق اليسرى بـ`NetworkTreePanel`/`TreeDiagramSketch`. إن عدّها QA لوناً ثالثاً فبند مستقل.
- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط؛ `Alert.alert` بـ`chart/confirmDestructive.ts` وحده؛ «درجة الاتفاق» بتعليقات فقط.
- **لم يُتحقَّق بصرياً ولا على جهاز** (لا متصفّح) — tsc وحده. أولى ما يُفحص: الوميض على الويب (`useNativeDriver` يسقط لـJS هناك)، وسلوك 401 بتوكن منتهٍ فعلاً.

## 2026-09-26 — تشغيل 54
صفوف ui بـCOORDINATION (دورة QA 87): **launch148**، **QA87a**، **chart-r70**. كلٌّ بـcommit مستقل، بوابة البناء خضراء (tsc 0) قبل كل واحد:

| commit | ماذا | صفّ |
|---|---|---|
| d0c0900 | مقبض الفريم (`FrameSizedGrid`): `accessibilityValue.text` = `t.gridHandlePosA11y` («الفريم n من m») ⇒ iOS لا ينطقها نسبةً «33 percent» | launch148 |
| 4a84586 | `AccountScreen` يقرأ `t.sessionExpired` مباشرة؛ حُذف `sessionExpiredText` والقراءة الاختيارية لـ`authSessionExpired`. **launch**: النسخة `authSessionExpired` (`locales.ts:58-59` والقيم الأربع) بلا قارئ الآن — احذفوها | QA87a |
| 7819263 | مرجع منازل واحد: `AnalystsPanel` (الدخول، وإلا أول هدف) للمستويات وأهداف كل محلّل؛ `SocialConsensusPanel` `levels.entry`؛ `AlertsPanel` نصّ التنبيه المُطلَق بمرجع السعر الجاري (وإلا المستوى) ⇒ لا «99.950 \| 100.45» على النفط | chart-r70 |
| cc14fe4 | عدّاد امتلاء الساق (`NetworkTreePanel` «n/m») بـ`numeric` (tabular-nums) | DESIGN-PRO §2 |

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط؛ `Alert.alert` بـ`chart/confirmDestructive.ts` وحده؛ «درجة الاتفاق» بتعليقات فقط؛ إعادة الجولة `AccountScreen:211-223`؛ لا وزن 700 بنطاقي.
- **لم يُتحقَّق بصرياً ولا بقارئ شاشة على جهاز** — tsc وحده. أولى ما يُفحص: VoiceOver على مقبض الفريم.

## 2026-09-26 — تشغيل 55
صفّ ui بـCOORDINATION: **backend-r54** (حصّة ui، المفتاحان من launch `5b352e4`). launch148/QA87a/chart-r70 منجزة بالتشغيل 54 (تحقّق بالكود). كلٌّ بـcommit مستقل، بوابة البناء خضراء (tsc 0) قبل كل واحد:

| commit | ماذا | صفّ |
|---|---|---|
| ee6b068 | `signalDirection.levelsUnavailableText`: `case 'no_range'` ⇒ `t.sigLevelsUnavailableNoRange` (المحلّلون/الإجماع/التوقّع). وأيضاً: الخادم يرسل `no_movement` **بلا اتجاه** (`signal_hub.py:342`، لا صوت) ⇒ `IndicatorForecastPanel` كان يعرض «لا بيانات حيّة» لسوق مغلق؛ الآن `t.forecastDisclaimerNoMovement`. مسار النتيجة الكاملة (`forecastText.ts`) باقٍ لـchart (launch149) | backend-r54 |
| 5acb440 | `ScreenerMini` سطر `meta` (قيمة RSI ووقت الكاش) بـ`numeric` | DESIGN-PRO §2 |

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert` بـ`chart/confirmDestructive.ts` وحده؛ «درجة الاتفاق» بتعليقات فقط؛ إعادة الجولة `AccountScreen:211-223`؛ `useMultiLiveTicks` ⇐ `acceptTick`/`TICK_STALE_MS`؛ فحص آلي: لا `Pressable` بحالة `Active/On/Selected` أو لون تأكيد شرطي بلا `accessibilityState`؛ العربي الباقي بنطاقي تعليقات، وخرائط تسميات الخادم (`CommissionPlanPanel`)، وتعليمات AI (`WeeklyReportPanel`، تُرسل مع `lang`)، و`MessagesScreen`/`mock.ts` (launch52، لأنس).
- DESIGN-PRO بنطاقي: البنود الستّة المرتّبة منجزة (تشغيل 45)؛ لا وزن ≥700، لا مسافة خارج مضاعفات 4 (الباقي كله `chart/`).
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده.

## 2026-09-26 — تشغيل 56
صفوف ui بـCOORDINATION (launch148، QA87a، chart-r70، backend-r54) منجزة بالتشغيلين 54–55 (تحقّق بالكود: `d0c0900`، `4a84586`، `7819263`، `ee6b068`) — تنتظر إغلاق QA. بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| 1374962 | الخلل نفسه لـchart-r70 بثلاث لوحات أخرى: مستويات `VotePanel` (دخول/وقف/هدف بمرجع الدخول)، صفقات `BacktestPanel` (دخول → خروج بمرجع الدخول)، سطر B/A بـ`FocusChartModal` (بمرجع bid كـ`DomLitePanel`) | chart-r70 (توسيع) |

- **QA88a** (سجّله QA أثناء التشغيل، كنت أفتح الصفّ نفسه فأسقطته): ينتظر مفتاح launch `sigLevelsUnavailableBelowTick` ثم `case 'atr_below_tick'` بـ`signalDirection.ts`. حتى يصل: المستويات تسقط بلا سبب ظاهر (لا رقم خاطئ).
- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert` بتعليقات فقط خارج `chart/confirmDestructive.ts`؛ «درجة الاتفاق» بتعليقات فقط؛ إعادة الجولة `AccountScreen:211-223`.
- DESIGN-PRO بنطاقي (فحص آلي): لا وزن ≥700، لا مسافة خارج مضاعفات 4؛ كل `<Text>` يعرض سعراً/نسبة بالملفّات المفحوصة يحمل `numeric` (بالنمط أو بالأب).
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده.

## 2026-09-26 — تشغيل 57
صفوف ui بـCOORDINATION (دورة QA 88): **launch150 / QA88a** (الصفّ نفسه)، **backend-r55**. كلٌّ بـcommit مستقل، بوابة البناء خضراء (tsc 0) قبل كل واحد:

| commit | ماذا | صفّ |
|---|---|---|
| c367cfc | `signalDirection.levelsUnavailableText`: `case 'atr_below_tick'` ⇒ `t.sigLevelsUnavailableAtrBelowTick` (المفتاح من launch، ar/en/ku) — المحلّلون/الإجماع/التوقّع يعرضون سبب غياب الوقف/الهدف | launch150، QA88a |
| f8e33e3 | الأكاديمية: `AcademyLecture.duration_min` صار `number \| null`؛ البديلان المحلّيان (`CoursesScreen`، `LectureClassroom`) `null` بدل 20 المخترَعة؛ السطر يعرض «n د» من الخادم فقط (يختفي لغير الصالح) وحُذف «محاضرة كاملة» من السطر والتسمية | backend-r55 |

- `ai_tutor` (`api.ts` `Course`) لا تعرضه أي شاشة ⇒ لا «معلّم ذكي» يُخفى. **launch**: مفتاح `coursesFullLectureWord` بلا قارئ الآن — احذفوه.
- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» لا يوجد خارج التعليقات؛ `Alert.alert` بتعليقات فقط خارج `chart/confirmDestructive.ts`؛ «درجة الاتفاق» لا شيء؛ إعادة الجولة `AccountScreen:211-229`؛ فحص آلي: كل `Pressable` بنمط اختيار شرطي بنطاقي يحمل `accessibilityState` (و`TimeframeBar` يضيف `selectedFill` خلفيةً).
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده.

## 2026-09-26 — تشغيل 58
صفوف ui بـCOORDINATION (launch150/QA88a، backend-r55) منجزة بالتشغيل 57 (`c367cfc`، `f8e33e3`، تحقّق بالكود) — تنتظر إغلاق QA. بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| f5fab3f | `WeeklyReportPanel`: بطاقة التقرير المختارة كانت حدّاً بلون التأكيد وحده ⇒ علامة 2px على الحافة الأمامية (نمط المتابعة) والحدّ محايد | DESIGN-PRO §4، §1 |
| e932523 | `AnalystsPanel`: تبديل الرمز كان يُبقي اتجاه الرمز السابق ومحلّليه ودخوله/وقفه/هدفه تحت العنوان الجديد (بمنازل الرمز الجديد)، وإلى الأبد إن وصل الردّ الأبطأ أخيراً؛ والفشل كان يُبقي المستويات القديمة. معرّف طلب + إخفاء حتى يصل ردّ الرمز/الفريم الجاري | بيانات خاطئة |
| 6eded7d | `SocialConsensusPanel`: الخلل نفسه (الصفقة المقترحة لأداة أخرى أو مصادر أخرى)، وعدّ المصادر كان من الاختيار الجاري لا ممّا حُسبت منه النتيجة | بيانات خاطئة |
| c2161b2 | `CommissionPlanPanel`: جداول الأمثلة (10/5/15/10%) كانت تظهر أثناء التحميل وحين تُسقط الخطة `commission_table` بلا وسم ⇒ الآن تحت ملاحظة «أمثلة» فقط؛ عمود النقاط من الخطة كان نسخة النسبة ⇒ «—»؛ فشل تقرير الأرباح (غير 401) كان يقول «لا أرباح مسجّلة» ⇒ «—» | بيانات خاطئة |

- جديد بـCOORDINATION: **ui58a** → launch: مفتاح `cppEarningsLoadError`.
- مرفوض بعد تحقّق: إرجاع العدّاد عند فشل التصويت (`VotePanel`) — مهلة قد تعني صوتاً وصل، و`voteCastError` يقول صراحة إن العدّاد قد يشمله.
- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert` بـ`chart/confirmDestructive.ts` وحده؛ «درجة الاتفاق» لا شيء؛ حارس التيك المتجمّد `useMultiLiveTicks`؛ لا قيمة `ku` مطابقة لنظيرتها العربية؛ العربي الثابت بنطاقي بـ`MessagesScreen` وحدها (launch52)؛ فحص آلي: كل `Pressable` باختيار شرطي يحمل `accessibilityState`، وكل نصّ رقمي منسَّق يحمل `numeric`.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: تبديل الرمز بسرعة بلوحتي المحلّلين والإجماع.

## 2026-09-26 — تشغيل 59
صفوف ui بـCOORDINATION (دورة QA 89): **chart-r74a**، **chart-r74c**. كلٌّ بـcommit مستقل، بوابة البناء خضراء (tsc 0) قبل كل واحد:

| commit | ماذا | صفّ |
|---|---|---|
| 681e0ff | `useMultiLiveTicks`: `noteServerTime(data.ts)` قبل قبول التيكات (كـ`useLiveTicks`) — جهاز متأخّر ≥3ث لا يرفض كل تيك «من المستقبل» بالطرفية والرباعي | chart-r74a |
| aacb013 | ذاكرة شموع مشتركة `hooks/chartSeriesCache.ts` (التركيز + الرباعي): التركيز يعرض شموع (الرمز، الفريم) المحفوظة فوراً بلا مؤشّر دوّار والجلب يستبدلها؛ فشل الجلب مع ذاكرة ⇒ تبقى بدل «لا اتصال»؛ التجريبية لا تُخزَّن | chart-r74c |
| a58f166 | DESIGN-PRO §1/§5.5: زرّ «السعر الحالي» الساكن بـ`AlertsPanel` بحدّ ونصّ محايدين (كشرائح المسافة)؛ فقاعات المتداول بـ`AiPanel` تعبئة وحدها بلا حدّ تأكيد | ميزانية التأكيد |
| 0176476 | `CommissionPlanPanel`: فشل تقرير الأرباح (غير 401) يعرض `t.cppEarningsLoadError` مكان «—» (المفتاح من launch `4ed9ab0`؛ «تحديث» يطابق زرّ `refreshBtn`) | ui58a |

- جديد بـCOORDINATION: **ui59a** → tools: `TerminalScreen.tsx:154` ينتقل إلى `sharedSeriesCache` كي تصير فتحات التركيز على ما جلبته الطرفية فورية (سطر واحد بملفّهم). حذفت صفّ chart-r74a المنجز واستبدلت r74c بـui59a.
- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» لا شيء؛ `Alert.alert`/`window.confirm` لا شيء خارج `confirmDestructive`؛ «درجة الاتفاق» تعليقات فقط؛ إعادة الجولة `AccountScreen:209-231`.
- فحص آلي بنطاقي: كل Pressable باختيار شرطي يحمل `accessibilityState` (إصابتان كاذبتان)؛ كل عنصر تفاعلي بـ`accessibilityLabel` عدا `MessagesScreen` غير المركّبة (launch52، تسميتها من نصّها)؛ لا وزن ≥700، لا مسافة خارج 4؛ الأسعار بـ`numeric`؛ لا عربي ثابت ظاهر (الباقي تعليقات، ومفردات المحلّل، وتعليمات الذكاء الاصطناعي والخادم يختار لغة الردّ).
- باقٍ من ميزانية التأكيد (لم يُمسّ، يحتاج نظرة بصرية): `NetworkTreePanel` `youBox` و`TreeDiagramSketch` `you` و`LectureClassroom` `clarifyBox` بحدّ تأكيد + تعبئة (§5.5)؛ ظلّ `FrameSizedGrid.cellDragging` مُبقى عمداً (أثناء السحب فقط، إيحاء لمسي).
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده.

## 2026-09-26 — تشغيل 60
لا صفّ بـCOORDINATION موجَّه إلى ui (ui59a سُلّم لـtools ونُفّذ `fdb72a0`). بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| dbd7e94 | «أنت» بـ`NetworkTreePanel`/`TreeDiagramSketch` وصندوق التوضيح بـ`LectureClassroom`: كان حدّ تأكيد فوق تعبئة تأكيد (ونصّان بلون التأكيد) ⇒ التعبئة وحدها، والنصّ محايد (الباقي من تشغيل 59) | DESIGN-PRO §5.5، §1 |
| a1bc10b | `PairDrumWheel` الزوج الجاري: حدّ + تعبئة + نصّ بالتأكيد ⇒ تعبئة وحدها، و`accessibilityState={{ selected: true }}` | DESIGN-PRO §5.5، §1، §4 |

- مُبقى عمداً: `FrameSizedGrid.cellHover` (حدّ + تعبئة) يظهر أثناء السحب فقط كهدف إفلات — ليس وقت السكون.
- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` لا شيء خارج `confirmDestructive`؛ «درجة الاتفاق» تعليقات فقط؛ فحص آلي: كل Pressable باختيار شرطي يحمل `accessibilityState`؛ لا عربي ثابت ظاهر بنطاقي خارج `MessagesScreen` (launch52) — «،» مع `rtl` صحيح للكردية أيضاً.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده.

## 2026-09-26 — تشغيل 61
صفّ ui بـCOORDINATION (دورة QA 91): **backend-r58** (زرّ «تغيير كلمة المرور»). بوابة البناء خضراء (tsc 0) قبل الـcommit:

| commit | ماذا | صفّ |
|---|---|---|
| 0c53968 | `api.changePassword(current, new)` ⇒ `POST /api/auth/password` (تحقّقت من العقد بـ`main.py:843-864` و`db.change_password`: 400 `invalid current password`/`password too short` تصل بـ`err.detail`) | backend-r58 |

- **الزرّ لم يُركَّب بعد**: لا مفاتيح نصّ له والقاموس ملك launch ⇒ جديد **ui60a** → launch بستّة مفاتيح بأسمائها ونصوصها المقترحة (ar/en). التشغيل التالي: نموذج مطوي تحت «الخروج» بـ`AccountScreen` (الحالية + الجديدة، `secureTextEntry`، `textContentType` current/new)، 400 ⇒ `accPasswordWrongCurrent` أو `regErrPasswordLength`، غيره ⇒ `accPasswordChangeError`، النجاح ⇒ `accPasswordChanged` ومسح الحقلين.
- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` لا شيء خارج `confirmDestructive`؛ «درجة الاتفاق» تعليقات فقط.
- قائمة DESIGN-PRO المرتّبة بنطاقي: الشريط السفلي 4 + «المزيد» (`MatrixBottomDock` `PRIMARY_TABS`)؛ §5.6 خفوت الواجهة عند مسك الشارت موصول (`onChartInteract` ⇒ `TerminalScreen`). لا بند جديد.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده.

## 2026-09-26 — تشغيل 62
صفّ ui بـCOORDINATION: **backend-r58** (مفاتيح ui60a وصلت من launch). كلٌّ بـcommit مستقل، بوابة البناء خضراء (tsc 0) قبل كل واحد:

| commit | ماذا | صفّ |
|---|---|---|
| 435ff8d | `AccountScreen`: «تغيير كلمة المرور» زرّ محايد مطوي (`expanded`) فوق «الخروج» ⇒ الحالية + الجديدة (`secureTextEntry`، `current-password`/`new-password`)؛ <4 ⇒ `regErrPasswordLength` بلا طلب؛ 400 `invalid current password` ⇒ `accPasswordWrongCurrent`؛ `password too short`/422 ⇒ `regErrPasswordLength`؛ غيره ⇒ `accPasswordChangeError`؛ النجاح ⇒ `accPasswordChanged` ومسح الحقلين | backend-r58، ui60a |
| 94bf338 | قارئ الشاشة: 13 زرّاً يعرض «...» أثناء الانتظار كان يُعلن الإجراء الساكن ⇒ `t.a11yBusy` (Account ×4، Alerts ×2، IndicatorAlerts ×2، Forecast، Backtest، Lecture، Vote، NetworkTree) + `busy` بالحالة حيث غاب | إتاحة (تعليق القاموس) |
| 94ec997 | `AccountScreen` ميزانية التأكيد: تسميات الحقول والاسم وعدّادا الساقين كانت كلها بالتأكيد ⇒ محايدة؛ اللغة/التبويب المختار بالتعبئة وحدها | DESIGN-PRO §1، §5.5 |
| ac3a381 | الشيء نفسه بـ9 لوحات (`cellOn`، `chipOn`، `pillOn`، `watchOn`، `condOn`، `tileOn`، `mine`): حدّ تأكيد + تعبئة + نصّ تأكيد ⇒ تعبئة وحدها ونصّ محايد؛ تحقّقت أن كل موضع يحمل `accessibilityState.selected` | DESIGN-PRO §1، §5.5، §4 |

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` لا شيء خارج `confirmDestructive`؛ «درجة الاتفاق» تعليقات فقط؛ الشريط الجانبي أيقونات مع تلميح.
- باقٍ بالتأكيد عمداً: `QuadChartModal.cellLeader` (حدّ وحده، الخانة القائدة)، `FrameSizedGrid`/`PanSpeedSlider` (أثناء السحب)، `MessagesScreen` (غير مركّبة، launch52).
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: نموذج كلمة المرور على الويب (مدير كلمات المرور مع `autoComplete`).

## 2026-09-26 — تشغيل 63
صفّ ui بـCOORDINATION (دورة QA 92): **launch156a**. بوابة البناء خضراء (tsc 0) قبل الـcommit:

| commit | ماذا | صفّ |
|---|---|---|
| 86ab6b5 | `AccountScreen.submitPasswordChange`: 401 (جلسة انتهت أو أُلغيت من جهاز آخر غيّر كلمة المرور) ⇒ `t.accPasswordSessionEnded` بدل «تحقّق من الاتصال»؛ حذفت الصفّ من COORDINATION | launch156a |

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` لا شيء خارج `confirmDestructive`؛ «درجة الاتفاق» تعليقات فقط؛ حارس التيك المتجمّد بـ`useMultiLiveTicks` (رفض `ticks_at` الأقدم من `TICK_STALE_MS` وإسقاط الرمز الصامت)، والمتابعة تسم السعر غير الحيّ `wlDemoTag`؛ لا قيمة `ku` مطابقة لنظيرتها العربية (1117/1117 مفتاحاً، ولا مفتاح ناقص).
- فحص آلي بنطاقي: كل Pressable باختيار شرطي يحمل `accessibilityState` (0 إصابة)؛ كل `<Text>` بقيمة رقمية منسّقة أسلوبه يحمل `...numeric` (7 إصابات كاذبة: تعريف أسلوب بسطر واحد).
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: تغيير كلمة المرور بعد تغييرها من جهاز آخر.

## 2026-09-26 — تشغيل 64
لا صفّ بـCOORDINATION موجَّه إلى ui (دورة QA 93: launch156a أُغلق، tools108a لـtools ونُفّذ `36136cf`). بوابة البناء خضراء (tsc 0). **لا تغيير كود هذا التشغيل** — لا شيء مفتوح بنطاقي يُصلَح.

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط (`MatrixEdgeRails:194`، `ToolsScreen:88`)؛ `Alert.alert`/`window.confirm` لا شيء خارج `confirmDestructive`؛ «درجة الاتفاق» تعليقات فقط (`AnalystsPanel:149`، `SocialConsensusPanel:248`)؛ «إعادة الجولة» `AccountScreen:247-269` بالعرض الرئيسي لمسجَّل الدخول والزائر معاً.
- فحص آلي بنطاقي: كل Pressable/Touchable بأسلوب اختيار شرطي يحمل `accessibilityState` (إصابة واحدة كاذبة: غلاف hover `WatchlistPanel:417` بـ`accessible={false}` والزرّ الداخلي يحمل `selected`)؛ لا وزن ≥700، لا `uppercase`، لا مسافة خارج 4؛ الظلّ الوحيد `FrameSizedGrid.cellDragging` (أثناء السحب، مُبقى عمداً)؛ نصوص الأرقام المتغيّرة المفحوصة (`ChartFrame.spreadPips`، `SymbolSnapshot.chip`، `IndicatorForecastPanel.sub`) بـ`...numeric`.
- قائمة DESIGN-PRO المرتّبة (1–6) منجزة بنطاقي منذ تشغيلات سابقة.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده.

## 2026-09-26 — تشغيل 65
لا صفّ بـCOORDINATION موجَّه إلى ui (دورة QA 93). بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| 41f444e | `SymbolSnapshot` (فوق الشارت الموسَّع): الشرائح حدّ + تعبئة ⇒ تعبئة وحدها؛ شرائح تقاطع MA/MACD كانت خضراء/حمراء (إشارة مؤشّر لا اتجاه سعر) ⇒ محايدة والسهم يحمل الاتجاه؛ نسبة التغيّر تبقى `bull`/`bear` | DESIGN-PRO §1، §5.5 |
| 3425fe8 | `VotePanel` موافق/معارض: أخضر وأحمر (حدّ + تعبئة) على كل بطاقة فكرة وقت السكون ⇒ تعبئة محايدة؛ صوتك = تعبئة أقوى + «✓» + `selected`. شراء/بيع بالنموذج والشارة باقيان بالأخضر/الأحمر (اتجاه سعر) | DESIGN-PRO §1، §5.5، §4 |

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` لا شيء خارج `confirmDestructive`؛ «درجة الاتفاق» تعليقات فقط؛ لا نصّ ثابت ظاهر بنطاقي خارج `MessagesScreen` (launch52) وعلامة «MATRIX».
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: تباين زرّ الصوت المختار (`colors.border` فوق `bgElevated`) — إن بدا خافتاً فالعلامة «✓» تحمل الاختيار.

## 2026-09-26 — تشغيل 66
صفّ ui بـCOORDINATION (دورة QA 94): **QA94a**. بوابة البناء خضراء (tsc 0) قبل الـcommit:

| commit | ماذا | صفّ |
|---|---|---|
| f62561e | `AlertsPanel.startEdit` يملأ السعر بـ`plainStopText` (كان `String(a.price)` ⇒ «1.23456e-8» يرفضه `parseDecimal` فلا يُحفظ التعديل)؛ خانة السعر `PRICE_MAX_LEN = 20` مثل الدفتر (كانت 12 ⇒ أندرويد يقصّ النصّ المملوء ويُحفظ سعر آخر بصمت)؛ `VotePanel` دخول/وقف/هدف 12 ⇒ 20. حذفت الصفّ من COORDINATION | QA94a |

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط (`MatrixEdgeRails:194`، `ToolsScreen:88`)؛ `Alert.alert`/`window.confirm` لا شيء خارج `confirmDestructive`؛ «درجة الاتفاق» تعليقات فقط؛ «إعادة الجولة» `AccountScreen:249-259`.
- قائمة DESIGN-PRO المرتّبة (1–6) منجزة بنطاقي منذ تشغيلات سابقة؛ لا بند جديد.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: تعديل تنبيه على رمز عملة رقمية صغيرة على أندرويد.

## 2026-09-26 — تشغيل 67
لا صفّ بـCOORDINATION موجَّه إلى ui (دورة QA 94: QA94a أُغلق `f62561e`). بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| ddeb90a | `theme.ts`: `bear` و`bearSoft` و`motion.flashDown` من الوردي `#F43F5E` إلى `#EF4444` (`down` بـDESIGN-PRO §1). التباين على `bg` ‏5.10 ⇒ 4.98. أضفت **ui67a → chart**: أربع قيم `rgba(244,63,94,…)` ثابتة بـ`MatrixChart.tsx` تُشتقّ من `colors.bear` | DESIGN-PRO §1 |
| 9965c5c | «✓ التنبيه مسلّح» كان أخضر (`colors.bull`) بـ`AlertsPanel` و`IndicatorAlertsPanel` و`FocusChartModal` ⇒ `textMuted`؛ الأخضر لاتجاه السعر فقط، و«✓» والنصّ يحملان المعنى | DESIGN-PRO §1 |

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` لا شيء خارج `confirmDestructive`؛ «درجة الاتفاق» تعليقات فقط؛ «إعادة الجولة» `AccountScreen:247-259`.
- فحص آلي بنطاقي: لا وزن ≥700، لا `uppercase`، لا مسافة خارج 4؛ كل Pressable بـ`accessibilityLabel` إلا `MessagesScreen` ×3 (غير مستوردة، launch52؛ النصّ الداخلي يسمّيها)؛ الاختيار تعبئة + `selected`.
- **مُبقى عمداً (قرار):** أحمر «عالي التأثير» بالتقويم (`CalendarPanel:75` `colors.bear`) والأخبار (`highImpact` الوردي) — عُرف تداول والكلمة مكتوبة بجانبه؛ لكنهما لونان مختلفان لـ«عالي» نفسه. وألوان الخلفيات/النصوص بـ`theme.ts` تختلف قليلاً عن جدول §1 (`bgPanel` أفتح من `bgElevated` عكس الجدول) — تغييرها يمسّ كل الشاشات فلم يُلمس بلا فحص بصري.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: الشمعة الهابطة ووميض السعر بالأحمر الجديد.

## 2026-09-26 — تشغيل 68
لا صفّ بـCOORDINATION موجَّه إلى ui (دورة QA 95؛ ui67a موجَّه إلى chart). بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| a379910 | `PanSpeedSlider`: الزرّ المغلق كان بالتأكيد (حدّ + تعبئة + أيقونة) وقت السكون متى كانت السرعة ≥40 — قيمة لا اختيار، واللون وحده يحملها؛ المفتوح كان بأربعة عناصر تأكيد ⇒ تعبئة المسار وحدها | DESIGN-PRO §1 |
| 52e61c3 | `CommissionPlanPanel`/`NetworkTreePanel`: سهم الأكورديون بالتأكيد وقت السكون ⇒ `textMuted`؛ جدول العمولات كان يلوّن النسبة/المستويات/النقاط بالتأكيد على كل صفّ ⇒ `colors.text` بوزن 500؛ «تحديث» وحده بالتأكيد | DESIGN-PRO §1 |

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط (`MatrixEdgeRails:194`، `ToolsScreen:88`)؛ `Alert.alert`/`window.confirm` لا شيء خارج `confirmDestructive`؛ لا وزن ≥700 بنطاقي (الوحيد `chart/MatrixChart.tsx` — chart)؛ لا مسافة خارج 4.
- باقٍ بالتأكيد (للتشغيل القادم): نصوص روابط بالتأكيد (`close`/`back`/`rearm`/`refresh`) بعدة لوحات — كلٌّ وحده برأسه فمقبول غالباً؛ `CruiseSpeedMark active` بـ`TerminalScreen:1348` ملك tools.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: وضوح مسار السرعة المفتوح بحدّ محايد.

## 2026-09-26 — تشغيل 69
لا صفّ بـCOORDINATION موجَّه إلى ui (دورة QA 96). بوابة البناء خضراء (tsc 0) قبل الـcommit:

| commit | ماذا | صفّ |
|---|---|---|
| 2839399 | سلّم الخطوط §2 (11/12/13/15/18) بنطاقي: عناوين اللوحات 14 ⇒ 13؛ عناوين الشاشات 20–24 ⇒ 18 (`AccountScreen`، `CoursesScreen`، `MessagesScreen`، `LectureClassroom`)؛ قراءات 14/16 ⇒ 15 (`FocusChartModal.price`، `DomLitePanel.value`، `SymbolPairMenu` الكبير)؛ `SubscriptionPlansPanel` 17/20/27 ⇒ 15/15/18. رموز الأيقونات (`⋯`، علامات الشريط السفلي 16) مُبقاة — أيقونات لا نصّ | DESIGN-PRO §2 |

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط (`MatrixEdgeRails:194`، `ToolsScreen:88`)؛ `Alert.alert`/`window.confirm` لا شيء خارج `confirmDestructive`.
- خارج نطاقي بالحجم نفسه (لم يُلمس): `PositionSizePanel` 14/28، `TradeJournalPanel`/`BacktestPanel` 16، `ToolsScreen` 22 (tools)؛ `MatrixChart` 10/14/16 (chart).
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: سعر الخطة بـ18 ما زال يقرأ كالعنصر الأبرز ببطاقة الاشتراك.

## 2026-09-26 — تشغيل 70
لا صفّ بـCOORDINATION موجَّه إلى ui (دورة QA 97). بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| 690d717 | `VotePanel`: شريط الموافقة بالتأكيد على كل بطاقة فكرة ⇒ `textMuted`؛ سطر خطة المسودة (يتغيّر مع الكتابة) تأكيد على تعبئة تأكيد بجانب زرّ النشر ⇒ `controlBg` + `colors.text`؛ سطرا الخطة (مسودة وبطاقة) بـ`numeric` | DESIGN-PRO §1، §2 |
| 381bec9 | `GroupChatPanel`: اسم الكاتب بالتأكيد على كل رسالة ورسائلك بتعبئة `accentSoft` ⇒ `textMuted` و`bgPanel`؛ `CoursesScreen`: عنوان المدرسة بالتأكيد على كل بطاقة ⇒ `colors.text` | DESIGN-PRO §1 |

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط (`MatrixEdgeRails:194`، `ToolsScreen:88`)؛ `Alert.alert`/`window.confirm` بتعليقين فقط والاستدعاءات كلها `confirmDestructive`؛ «درجة الاتفاق» تعليقات فقط؛ `useMultiLiveTicks` يرفض السعر المتجمّد (`acceptTick` + `ticks_at`)؛ فحص آلي: لا ملفّ بنطاقي فيه نمط اختيار شرطي بلا `accessibilityState`.
- باقٍ بالتأكيد وقت السكون (مقبول غالباً، عنصر واحد برأس لوحته): روابط `close`/`back`/`refresh`/`rearm`؛ `MessagesScreen` (launch52، غير مستوردة).
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: تمييز رسالتك بـ`bgPanel` مقابل `bgElevated` بالمحادثة، ووضوح شريط الموافقة المحايد فوق `colors.border`.

## 2026-09-26 — تشغيل 71
صفّ ui بـCOORDINATION (دورة QA 98): **chart-r82a** (جزء ui). بوابة البناء خضراء (tsc 0) قبل الـcommit:

| commit | ماذا | صفّ |
|---|---|---|
| f96a309 | `FocusChartModal`: `onTimeframeKey={setTf}` لـ`<MatrixChart>` ⇒ كتابة الفريم + Enter على الويب تبدّل فريم نافذة التركيز كشريط `TimeframeBar` (كما `ChartFrame`/`QuadChartModal`). عدّلت الصفّ بـCOORDINATION ليبقى جزء tools (`TerminalScreen`) وحده | chart-r82a |

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط (`MatrixEdgeRails:194`، `ToolsScreen:88`)؛ `Alert.alert`/`window.confirm` داخل `confirmDestructive` وحده؛ «درجة الاتفاق» تعليقات فقط؛ «إعادة الجولة» `AccountScreen` (`tourOpen`).
- فحص الاختيار باللون وحده بنطاقي (`MatrixSidePanel`، `MatrixBottomDock`، `SymbolPairMenu`، `ScreenerMini`، `TimeframeBar`، `MatrixEdgeRails`): كل عنصر شرطي على `Pressable` يحمل `accessibilityState.selected`/`expanded` وتعبئة؛ الفارق بالعدّ نصوص داخلية. لا بند.
- **لم يُتحقَّق بصرياً ولا بمتصفّح** — tsc وحده. أولى ما يُفحص: كتابة «4h» + Enter بنافذة التركيز على الويب، ثم إبراز «4h» بالشريط أعلاه. (التلميح نفسه ما زال launch163a → chart.)

## 2026-09-26 — تشغيل 72
لا صفّ بـCOORDINATION موجَّه إلى ui (دورة QA 98؛ chart-r82a جزء ui أُنجز تشغيل 71). بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| f0685ca | «حذف» كان ظاهراً على كل صفّ تنبيه وقت السكون: `AlertsPanel` ⇒ يظهر بالمرور (ويب) أو للصفّ المفتوح بالنقر للتعديل (كالدفتر)؛ `IndicatorAlertsPanel` ⇒ بالمرور أو بالضغط الطويل (كقائمة المتابعة و`LayoutPanel`). الصفّان يحملان إجراء `delete` لقارئ الشاشة | DESIGN-PRO §5.2 |
| 9203d50 | مودالات تنزلق/تتلاشى ⇒ `animationType="none"`: `MatrixSidePanel`، إضافة رمز بـ`WatchlistPanel`، `QuadChartModal`، `FocusChartModal`، `OnboardingOverlay`، ورقة المدرسة بـ`CoursesScreen`. أضفت **ui72a → tools** لـ`TerminalScreen:2088` | DESIGN-PRO §6 |

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): النصوص العربية الثابتة بنطاقي مفاتيح تحويل (`CommissionPlanPanel` نصّ الخادم ⇒ مفتاح ترجمة) وتعليمات ذكاء اصطناعي داخلية محايدة لغوياً (`WeeklyReportPanel`، لغة الرد من `lang`) وتعليقات؛ لا نصّ واجهة عربي ثابت خارج `MessagesScreen` (launch52). الشريط السفلي 4+«المزيد»؛ الشريط الجانبي أيقونات مع تلميح.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: ضغط طويل على صفّ تنبيه مؤشّر على أندرويد يُظهر «حذف»، ونقرة صفّ تنبيه سعر تُظهره مع التعديل.

## 2026-09-26 — تشغيل 73
صفّ ui بـCOORDINATION (دورة QA 99): **launch165a**. بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| 6e980ef | تلميح «اضغط مطوّلاً على صفّ لإظهار «حذف»» (`t.rowDeleteLongPressHint`، `textMuted` 11px) تحت القائمة غير الفارغة، على اللمس فقط: `IndicatorAlertsPanel` (بعد `alerts.map`) و`WatchlistPanel` (آخر `ScrollView`). جزء `LayoutPanel` كان `52cdc2f` ⇒ launch165a مكتمل بالأجزاء الثلاثة | launch165a |
| 5f9d49f | `FocusChartModal`: فجوة العمود الرئيسي 7/10 ⇒ `spacing.sm`/`spacing.md` (8/12) | DESIGN-PRO §3 |
| 010eb77 | `FocusChartModal` و`QuadChartModal` لم يمرّرا `onChartInteract` ⇒ الواجهة لا تخفت عند مسك الشارت. الآن 40% حتى الرفع: التركيز (الرأس، قائمة المتابعة الجانبية، شريط الفريمات، اللقطة؛ لافتة خطر الأخبار لا تخفت — تحذير)؛ الرباعي (الرأس، صفّ الفريمات، تلميح المزامنة). `MatrixChart` يُطلق false عند فكّ التركيب ⇒ لا خفوت عالق | DESIGN-PRO §5.6 |

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` بتعليقين فقط؛ «درجة الاتفاق» تعليقات فقط؛ `useMultiLiveTicks` يرفض المتجمّد (`acceptTick`)؛ «إعادة الجولة» `AccountScreen` (`tourOpen`). فحص شبكة 4px بنطاقي (يشمل القيم الثلاثية) لا يجد غير ما أُصلح؛ لا وزن 700 بنطاقي.
- ملاحظة لـQA (لم يُغيَّر): `FocusChartModal` `watch` يحمل حدّاً وخلفية `bgElevated` معاً — §5.5 بقراءة حرفية؛ البند 7 من القائمة يشترط الثلاثة.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: مسك الشارت بنافذة التركيز على الهاتف يخفت الرأس وشريط الفريمات ويعيدهما عند الرفع؛ ظهور التلميح أسفل قائمة المتابعة على أندرويد لا الويب.

## 2026-09-26 — تشغيل 74
لا صفّ بـCOORDINATION موجَّه إلى ui (دورة QA 100: 0/12، لا بند مفتوح على وكيل). بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| e360700 | `FrameSizedGrid` (مبدّل الهاتف): تسمية «الفريمات» كانت بالتأكيد داخل صندوق يشبه زرّاً بجانب الزرّ المختار ⇒ نصّ `textMuted` بلا صندوق؛ المبدّل خلفية وحدها (كان حدّاً+خلفية)؛ `paddingHorizontal` ‏8 ⇒ `spacing.sm` | DESIGN-PRO §1، §5.5 |
| d48666b | `CalendarPanel`: العدّ التنازلي «بعد 2س 5د» بلا `numeric` ⇒ `numeric`؛ «قريب» بالتأكيد على كل صفّ قريب ⇒ `colors.text` | DESIGN-PRO §1، §2 |
| 1c783c2 | `SubscriptionPlansPanel`: «MATRIX» بملاحظة الخطط بالتأكيد ⇒ `colors.text`؛ الصندوق خلفية وحدها، `padding` ‏12 ⇒ `spacing.md` | DESIGN-PRO §1، §5.5 |
| a0776b5 | `CoursesScreen`: عنوان المدرسة بالمودال بالتأكيد بجانب زرّ إغلاق معبّأ بالتأكيد ⇒ `colors.text` | DESIGN-PRO §1 |

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` خارج `confirmDestructive` لا شيء؛ «درجة الاتفاق» تعليقات فقط؛ لا تفرّع `lang === 'en' ?` يُسقط الكردي للعربية بنطاقي (`CoursesScreen` الكردي ⇒ الإنجليزي لأسماء المدارس، مرتبط QA27 لأنس).
- باقٍ بالتأكيد (مقبول: رابط واحد برأس لوحته): `close`/`back`/`refresh`/`rearm`؛ `MessagesScreen` (launch52). `FrameSizedGrid.cellHover`/`cellDragging` تأكيد+ظلّ أثناء السحب فقط لا بالسكون.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: مبدّل المربعات/المستطيلات على الهاتف — هل تبقى «الفريمات» مقروءة كتسمية لا زرّ؛ وتمييز «قريب» بالتقويم بلا لون.

## 2026-09-26 — تشغيل 75
صفّان بـCOORDINATION موجَّهان إلى ui: **backend-r70** و**tools115a** (وصل أثناء التشغيل). بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| 358bcc5 | `api.ts`: كل ردّ 401 لطلب حمل توكناً (خارج `/api/auth/*`) يُبلغ مستمعاً (`setUnauthorizedListener`)؛ `AuthContext` يستدعي `checkSession` (فحص واحد جارٍ) ⇒ `/api/auth/me` يؤكّد ثم «انتهت جلستك» بدل خطأ تحميل عامّ حتى العودة للواجهة. يشمل `fetchWithTimeout` (GET/PATCH/DELETE وحذف التنبيهات/الصفقات/التخطيطات) ومسار POST البطيء | backend-r70 |
| e2dbd45 | رموز تعبيرية ملوّنة بالكروم ⇒ رموز أحادية: الرصيف 📰⇒☰ (كالشريط)، المجتمع ☰⇒◑، التنبيهات ⚡⇒⚑؛ الشريط الأيمن ⚡⇒⚑ و☢⇒⚐؛ لافتة عطلة البنوك بلا 🏦 | DESIGN-PRO §1، §4 |
| e684b8f | نوع `screenerRun` يصف `insufficient_data`؛ `ScreenerMini` يُخرج رموزه من سطر «حدّ الطلبات» ويسمّيها بـ`t.screenerInsufficientData`؛ كلّها قصيرة ولا مفحوص ⇒ لا «تعذّرت قراءة أيّ رمز» ولا «لا تطابق من 0» | tools115a |

- أضفت **ui75a → chart/launch** (توحيد رمز التنبيه «🔔» الملوّن إلى «⚑» — الشارت والنصوص أولاً ثم ui؛ و`ToolsScreen` «⚡» ⇒ tools).
- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` داخل `confirmDestructive` وحده؛ «درجة الاتفاق» تعليقات فقط؛ «إعادة الجولة» `AccountScreen` (`tourOpen`). فحص آلي بنطاقي: كل `Pressable` تفاعلي بـ`accessibilityLabel` (الباقي أغلفة مرور `accessible={false}` و`MessagesScreen` launch52)؛ لا وزن ≥700؛ كل نصّ رقمي بـ`numeric` (مباشرة أو موروث).
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: توكن منتهٍ ثم فتح الدفتر ⇒ شاشة الحساب تقول «انتهت جلستك» فوراً؛ ظهور «⚑»/«⚐»/«◑» على أندرويد (خطّ النظام) لا مربّعات فارغة.

## 2026-09-26 — تشغيل 76
لا صفّ بـCOORDINATION موجَّه إلى ui (دورة QA 102 أغلقت backend-r70 وtools115a؛ ui75a عند chart/launch). بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| 2186b60 | `LectureClassroom`: رابطا «إخفاء/إظهار الشارت» ونقطة الصوت بالتأكيد ⇒ `textMuted`؛ شريط التقدّم التأكيد الوحيد بالدرس (النقطة بجانب نصّ الحالة فلا تحمل المعنى وحدها) | DESIGN-PRO §1 |
| 98553f7 | `LectureClassroom`: صندوق الشارت والشاشة الكبيرة ووسام الإكمال تعبئة وحدها (كانت تعبئة+حدّ)؛ `paddingHorizontal` ‏12 ⇒ `spacing.md` | DESIGN-PRO §5.5 |
| aaa707c | «إعادة التفعيل» على كل صفّ مُطلَق (`AlertsPanel`، `IndicatorAlertsPanel`) بالتأكيد ⇒ `colors.text` 500؛ قائمة بخمسة تنبيهات مُطلَقة كانت خمسة عناصر تأكيد وقت السكون | DESIGN-PRO §1 |
| 45efd55 | شجرة الإحالة (`NetworkTreePanel`، `TreeDiagramSketch`): لون لكل مستوى (سماوي/تيل/بنفسجي/وردي) ولكل جهة ⇒ `textDim`/`textMuted` واحد (المستوى والجهة مكتوبان)؛ الخانة المملوءة `bgPanel` لا `accentFaint` (تبقى متّصلة الحدّ، والفارغة متقطّعة)؛ «أنت» التأكيد الوحيد | DESIGN-PRO §1 |

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` داخل `confirmDestructive` وحده؛ «درجة الاتفاق» تعليقات فقط؛ لا تفرّع `lang === 'en'` بنطاقي ولا نصّ واجهة عربي ثابت (خارج `MessagesScreen`، launch52). فحص نطاقي (75 ملفّاً): لا وزن ≥700، لا مسافة خارج شبكة 4.
- باقٍ (لم يُغيَّر): `colors.treeLevel4Tint`/`treeRightTint` بالثيم لم يعد يقرؤهما أحد بنطاقي؛ لم أحذفهما (الثيم مشترك). `WeeklyReportPanel` البلاطة المختارة `accentSoft` + «فتح» بالتأكيد — عنصر واحد، تُرك.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: هل تبقى الخانة المملوءة بشجرة الإحالة مميَّزة عن الفارغة بلا لون (حدّ متّصل + تعبئة لوحة مقابل متقطّع)؛ ووضوح حدود شاشة الدرس بلا حدّ فوق `stageBg`.

## 2026-09-26 — تشغيل 77
لا صفّ بـCOORDINATION موجَّه إلى ui للتنفيذ (دورة QA 102؛ ui75a طلبٌ من ui عند chart/launch). بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| bb001e0 | أهمية الحدث: التقويم كان «عالي» `bear` (أحمر الهبوط) و«متوسط» `warn`، والأخبار «عالي» `highImpact` الوردي (لون ثالث) ⇒ اللوحتان بدرجات سطوع محايدة `text`/`textMuted`/`textDim`؛ الكلمة تحمل المعنى. عطلة البنوك `textMuted` | DESIGN-PRO §1 |
| 6632b7e | عنوان حدث التقويم وعنوان الخبر وزن 600 ⇒ 500 (600 للأسعار فقط) | DESIGN-PRO §2 |

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` داخل `confirmDestructive` وحده؛ «درجة الاتفاق» تعليقات فقط؛ مفاتيح `ku` لا تطابق نصّ `ar` حرفياً (0 من القاموس). فحص آلي: كل `Pressable` بنمط مشروط (`on && styles.xOn`) يحمل `accessibilityState` (أو ابنه الوحيد التفاعلي — صفّ قائمة المتابعة)؛ لا عنصر بحدّ وخلفية وظلّ معاً؛ لا حركة غير `PriceFlash`.
- **لأنس/QA (لم يُغيَّر)**: §1 يقصر الأحمر على اتجاه السعر، لكن `colors.bear` نصّ الأخطاء و«حذف» وزرّ حذف الحساب بـ`AccountScreen`/`AlertsPanel`/`IndicatorAlertsPanel`/`SocialConsensusPanel`/`NetworkTreePanel`/`SymbolSearchBar`. اللوحة لا تعطي لوناً للخطأ و`warn` محجوز للبيانات المتأخّرة — أُبقي حتى يُقرَّر (لون خطأ مستقلّ أم نصّ عادي بعلامة).
- `colors.highImpact` بالثيم لم يعد يقرؤه أحد بنطاقي؛ لم أحذفه (الثيم مشترك).
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: هل تبقى درجات الأهمية الثلاث بشارة الأخبار ونقطة التقويم مميَّزة بالعين على خلفية اللوحة.

## 2026-09-26 — تشغيل 78
صفّ واحد بـCOORDINATION موجَّه إلى ui: **ui75a** (دورة QA 103 حصرته بموضعي ui). بوابة البناء خضراء (tsc 0) قبل الـcommit:

| commit | ماذا | صفّ |
|---|---|---|
| f86eca3 | «🔔» الملوّن ⇒ «⚑» بوسم التنبيه المسلَّح بصفّ قائمة المتابعة (`WatchlistPanel.tsx:414`) وبوميض «أُطلق» (`AlertsPanel.tsx:877`) + تعليقان. قارئ الشاشة لا يعتمد على الرمز (`accessibilityLabel` الصفّ يقول `alertsStatusArmed` نصّاً). لا «🔔» باقٍ بـ`mobile/src` | ui75a، DESIGN-PRO §1/§4 |

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` داخل `confirmDestructive` وحده؛ «درجة الاتفاق» تعليقات فقط (المحلّلون/الإجماع/التقرير)؛ `useMultiLiveTicks` يرفض التيك الأقدم من `TICK_STALE_MS` ويُسقط الرمز الصامت. فحص آلي بنطاقي: كل `Pressable`/`Touchable*` بنمط اختيار مشروط (`On`/`Active`/`Sel`…) يحمل `accessibilityState` أو `accessible={false}` ⇒ 0.
- `ScreenerMini` الشريحة المختارة نصّ بالتأكيد + تعبئة — مجموعة واحدة واختيار واحد ⇒ عنصر تأكيد واحد، تُرك.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: «⚑» بخطّ نظام أندرويد لا مربّع فارغ بصفّ قائمة المتابعة.

## 2026-09-26 — تشغيل 79
لا صفّ بـCOORDINATION موجَّه إلى ui للتنفيذ (دورة QA 104؛ ui-r77 عند أنس). بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| a12c66c | الشريط الأيسر: العدسات الأربع ⇒ زرّ واحد برمز العدسة الفعّالة يفتح قائمة بجانب الشريط (رمز + اسم + تلميح)؛ الزرّ `expanded`، والعنصر المختار `selected` + تعبئة + علامة | DESIGN-PRO §7 |
| 613add9 | أدوات الرسم الخمس عشرة ⇒ المؤشّر والتحديد زرّان + أربع مجموعات (خطوط 6، أشكال 3 مع فيبو، تعليق/قياس، شراء/بيع) كلّ منها زرّ يفتح قائمة؛ زرّ المجموعة يحمل رمز الأداة الفعّالة منها و`selected` حين تكون فيها. الشريط وقت السكون 20 ⇒ 8 عناصر (الحدّ 12). القائمة حدّ بلا ظلّ (§5.5)، تُغلق بالاختيار أو بالضغط ثانية أو بالتمرير أو باختيار أداة مفردة. بلا مفاتيح ترجمة جديدة: وسم المجموعة أسماء أدواتها «ترند / شعاع / …» | DESIGN-PRO §7 |

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` داخل `confirmDestructive` وحده (`AccountScreen`/`TradeJournalPanel` تعليقات)؛ «درجة الاتفاق» تعليقات فقط؛ «إعادة الجولة» `AccountScreen` (`tourOpen`).
- الرصيف (`MatrixBottomDock`) للهاتف لم يُغيَّر — أدوات الرسم هناك داخل ورقة «المزيد» لا وقت السكون.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: موضع القائمة بجانب الشريط على الويب (قياس `measureInWindow`) وأنها لا تُقصّ تحت الشارت (zIndex 30 داخل شريط zIndex 10)؛ وبـRTL تظهر القائمة يمين الشريط كتلميحه.

## 2026-09-26 — تشغيل 80
صفّ واحد بـCOORDINATION موجَّه إلى ui: **launch171a** (دورة QA 104). بوابة البناء خضراء (tsc 0) قبل الـcommit:

| commit | ماذا | صفّ |
|---|---|---|
| 9abf136 | زرّ مجموعة الرسم بالشريط الأيسر: التلميح والوصف القارئ اسم المجموعة القصير (`railDrawGroupLines`/`Shapes`/`Annotate`/`Position`) بدل وصل أسماء الأدوات؛ الأداة الفعّالة تُذكر بعده («أداة رسم: خطوط — ترند») والتلميح يعرضها وحدها إن وُجدت؛ `accessibilityHint` = `railDrawGroupMenuHint` (يفتح قائمة). `RailButton` صار يقبل `a11yHint` | launch171a |

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` داخل `confirmDestructive` وحده؛ «درجة الاتفاق» تعليقات فقط؛ `useMultiLiveTicks` يرفض الأقدم من `TICK_STALE_MS`؛ «إعادة الجولة» `AccountScreen` (`tourOpen`). فحص نطاقي (74 ملفّاً): لا وزن ≥700، لا مسافة خارج شبكة 4؛ الأرقام بـ`...numeric`.
- زرّ العدسة (يفتح قائمة أيضاً) بلا `accessibilityHint` — نصّ `railDrawGroupMenuHint` يقول «أدوات هذه المجموعة» فلا يناسبه؛ `expanded` يكفي حالياً. لو أراد launch تلميحاً له: مفتاح مستقلّ.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: TalkBack/VoiceOver يقرأ الوصف ثم التلميح على زرّ «خطوط».

## 2026-09-26 — تشغيل 81
صفّ ui الوحيد بـCOORDINATION (**launch171a**) منفَّذ سلفاً (`9abf136`، تشغيل 80) — ينتظر إغلاق QA. طُبِّقت قرارات أنس الجديدة (`DECISIONS-ANAS.md`) بنطاقي. بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| cabe72e | `AccountScreen`: كلمة المرور الجديدة 8 أحرف حدّاً أدنى بالتسجيل وبتغيير الكلمة (`PASSWORD_MIN_LENGTH`)، طول فقط بلا تعقيد؛ الدخول لا يُفحص (حسابات قديمة بـ4) | قرار أنس ٧ |
| 0a45357 | `featureFlags.ts` جديد: `SHOW_UNLICENSED_SIGNAL_PANELS` (المحلّلون + الإجماع) و`SHOW_NEWS_FEED`، كلاهما `false`. الرصيف: تبويبات «المحلّلون»/«التواصل»/«الأخبار» تسقط، و«إشارات» كذلك (بدونهما = «توقّع المؤشرات» مكرّراً، §5.1)؛ الشريط الأيمن بلا «الأخبار»؛ اللوح الجانبي لا يرسم `NewsPanel`. التقويم و`NewsRiskBanner` باقيان | قرارا أنس ٥، ٦ |

- صفوف QA 106 (قرار ٥، ٦، ٧) تغطّي الباقي فلا صفّ جديد: جزء ui منها منجز؛ الباقي launch (`regErrPasswordLength` ×3 ما زال «4»)، tools (`ToolsScreen.tsx:667/670/686` تستورد الرايتين من `featureFlags.ts`)، backend (`main.py:328`، `db.py:1691`). رايتان لا واحدة: الأخبار قد تجد مصدراً قبل المحلّلين، والقراران منفصلان.
- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` داخل `confirmDestructive` وحده؛ «درجة الاتفاق» لا تظهر بنطاقي؛ `useMultiLiveTicks` يرفض الأقدم من `TICK_STALE_MS`؛ «إعادة الجولة» `AccountScreen` (`tourOpen`). لا بقايا «البنوك» بنطاقي (قرار ١).
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: شبكة «المزيد» بالرصيف بعد سقوط أربعة مداخل، والشريط الأيمن بثمانية.

## 2026-09-26 — تشغيل 82
صفوف ui بـCOORDINATION (دورة QA 106): **QA24** (قرار ٧) و**قرار ٥** و**قرار ٦** — جزء ui منجز سلفاً بالتشغيل 81 (`cabe72e`، `0a45357`)، تحقّقتُ بالكود: `AccountScreen.tsx:31` `PASSWORD_MIN_LENGTH = 8`؛ `featureFlags.ts` تقرؤه `MatrixBottomDock`/`MatrixSidePanel`/`MatrixEdgeRails` (وtools بـ`ToolsScreen` `d5d7d01`). الباقي: launch (`regErrPasswordLength` «4»). **launch9** (قرار ٤) نُفِّذ هنا. بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| c132823 | `api.ts` `aiAsk`: حُذف حقل `setup` (اتجاه/دخول/وقف/هدف/احتمال) من نوع الردّ — لا شاشة كانت تعرضه (`AiPanel` يعرض `answer` فقط)، وغيابه يمنع قراءته مستقبلاً | launch9، قرار ٤ |
| e1628ec | `WeeklyReportPanel`: تعليمة منعٍ للاتجاه/الدخول/الوقف/الهدف/الشراء/البيع تُلحق **بكل** تقرير (كانت بـ«ملاحظات الأسبوع» وحدها؛ «الموجز» يسأل عن «علاقة DXY بالذهب») | قرار ٤ |
| 3a765d3 | زرّ «إغلاق» باللوح الجانبي و`FocusChartModal` `accent` ⇒ `textMuted` — إجراء لا اختيار، فلا يستهلك ميزانية التأكيد | DESIGN-PRO §1 |

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` داخل `confirmDestructive` وحده؛ «درجة الاتفاق» تعليقات فقط؛ لا نصّ عربي مرسوم ثابت بنطاقي (الباقي تعليقات، أو خرائط نصّ الخادم ⇒ مفاتيح بـ`CommissionPlanPanel`، أو تعليمات الذكاء الداخلية، أو `academy.ts` الذي ينتظر أنس). قائمة DESIGN-PRO المرتّبة ١–٥ منجزة (بالتشغيلات السابقة)؛ ٦ (ميزانية التأكيد) يُتابَع بنداً بنداً.
- **ui-r77** (لون الخطأ) ما زال عند أنس — لم يُغيَّر.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده.

## 2026-09-26 — تشغيل 83
صفّان بـCOORDINATION موجَّهان إلى ui (دورة QA 107). بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| b574e4d | `WatchlistPanel`: حُذف `FALLBACK` (أسعار 2024: DXY 104.25، EURUSD 1.0854…) كقيمة افتراضية لـ`bases` ⇒ `NO_BASES = {}`؛ تركيب بلا `bases` يعرض «—» لا سعراً مختلَقاً | tools120a، قرار أنس ٢ |
| c38571f | `AccountScreen.tsx:170` تعليق «الخادم ما زال <4» قديم ⇒ «الخادم يفرض 8 أيضاً» (`f41a0fc`) | QA107b |

- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` داخل `confirmDestructive` وحده (الباقي تعليقات)؛ «درجة الاتفاق» تعليقات فقط؛ `useMultiLiveTicks` يرفض الأقدم من `TICK_STALE_MS`؛ «إعادة الجولة» `AccountScreen` (`tourOpen`).
- **ui-r77** (لون الخطأ) ما زال عند أنس — لم يُغيَّر.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده.

## 2026-09-26 — تشغيل 84
صفوف ui بـCOORDINATION (دورة QA 108): W1، W3، W4، W5، backend-r78a، قرار ٩، قرار ١٠، قرار ١٣، launch174a. بوابة البناء خضراء (tsc 0) قبل كل commit — كانت حمراء عند البدء بخطأ ليس منّي (`moderation.selftest.ts:57` مفتاح `__esModule` مكرّر، TS1117)، أُصلح أولاً فتخطّاه السحب (نفس الإصلاح وصل من غيري).

| commit | ماذا | صفّ |
|---|---|---|
| b1b9578 | قائمة المتابعة: الصفّ بلا تيك يعرض آخر سعر محفوظ من **`series.last` نفسه** الذي يقرؤه رأس الشارت (`hooks/useLastCloses.ts` جديد: `/api/charts/{sym}?timeframe=D&outputsize=50` — طلب `dailyRefStore` نفسه ⇒ من مخزن الخادم؛ متتالٍ؛ لا طلب لرمز يصله تيك). الوسم «مغلق · مخزن» والسوق مغلق (محايد)، «آخر سعر» والسوق مفتوح (`warn`، §5.3)، «غير متاح» لـDXY (`unavailable`)؛ «—» فقط بلا أيّ قيمة. التجريبي لا يُعرض سعراً (قرار ٢). قارئ الشاشة ينطق الوسم أو «لا سعر بعد» | W1، launch174a |
| ba7a5a6 | حُذفت `MessagesScreen` و`mockPeers` و`api.dmList/dmThread/sendDm` (`from_user: 'أنت'` ثابت) | قرار ٩ |
| 2bd513c | `featureFlags.ts` `SHOW_REFERRAL_AND_PLANS = false`: `AccountScreen` لا يرسم الباقات/العمولات/شجرة الشبكة ولا صندوق الدور·رمز الإحالة ولا خانة رمز الراعي والجانب بالتسجيل، ولا يطلب `commissionsMe` | قرار ١٠ |
| 939830b | الرصيف السفلي لا يُرسم بعرض ≥700 (حدّ `phone` نفسه): كل مداخله بالشريطين الجانبيين، و«توقّع المؤشرات» و«المجتمع» (كانا بالرصيف وحده) صارا بالشريط الأيمن و`MatrixSidePanel` ⇒ على الويب شريط سفلي واحد (التنقّل) | W3، DESIGN-PRO §5.1 |
| 1ceaaa8 | `App.tsx` شريط التبويبات: وزن 700/800 ⇒ 500، 10 ⇒ 11px | DESIGN-PRO §2 |

- **لم يُنفَّذ، وسببه:** W2 (مبدّل التخطيط) أسنده QA لـtools (`TerminalScreen`). W5 السبب بـ`TerminalScreen.tsx:2538` (`maxHeight: 44` لمحتوى ~50) ⇒ صفّ **ui84b** لـtools بالإصلاح. W4: الأرقام 1–7 تصطدم بكتابة الفريم «15 ⏎» القائمة بالشارت ⇒ **ui84c** لـchart؛ تلميح `?` بعد استقرار القائمة. backend-r78a يحتاج مفتاح ترجمة ⇒ **ui84a** لـlaunch. قرار ١٣ (Sentry): تبعية أصلية جديدة + إعداد Expo + DSN من البيئة — تشغيل مستقلّ، لم يُبدأ.
- W3 على **الهاتف** باقٍ صفّين (الرصيف = أدوات الشارت فوق التنقّل) — لم يُغيَّر هذا التشغيل.
- بنود المهمّة الأصلية (تحقّق بالكود بالتشغيلات 79–83، لم يتغيّر ما يمسّها): «₴» تعليقات فقط؛ `confirmDestructive` وحده؛ «درجة الاتفاق» لا تُعرض؛ `useMultiLiveTicks` يرفض القديم؛ «إعادة الجولة» بالحساب.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: قائمة المتابعة يوم السبت (الأسعار = رأس الشارت حرفاً بحرف، ووسم «مغلق · مخزن»)، وغياب الرصيف على الويب مع ظهور ∑ و◈ بالشريط الأيمن.

## 2026-09-26 — تشغيل 85
صفوف ui المفتوحة بـCOORDINATION (دورة QA 108): W1، قرار ٩، قرار ١٠، launch174a منفَّذة بالتشغيل 84 (تنتظر إغلاق QA). W2/W5 نفّذها tools (`5d5bf49`، `1100b8f`). نُفِّذ هنا الباقي بنطاقي. بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| 5d7059f | الرصيف على **الهاتف** صار شريط أدوات الشارت لا شريط تنقّل ثانياً: خلفية الشارت (`bg`) وحدّ خفيف (`borderSoft`)، الأيقونة بجانب التسمية بسطر واحد (`tabRtl` للعربية)؛ شريط التنقّل تحته يبقى `bgElevated` بأيقونة فوق تسمية ⇒ «فصل واضح» بنصّ أنس | W3 (الهاتف) |
| e522621 | Sentry (`e522621`، `@sentry/react-native` ~7.11 عبر `expo install`): `src/crashReporting.ts` يُهيَّأ بـ`index.ts` قبل التركيب **فقط** إن وُجد `EXPO_PUBLIC_SENTRY_DSN`؛ `sendDefaultPii: false`، لا لقطة ولا شجرة عناصر ولا تتبّع؛ `beforeSend` يحذف `user`/`request`/`extra`/`server_name` ويقصّ نصّ الخطأ 200؛ آثار الكونسول واللمس والإدخال تُسقط، وطلبات الشبكة = طريقة + مسار (بلا نطاق ولا استعلام) + حالة. `AppErrorBoundary` يبلّغ خطأ العرض. حزمة الويب تُبنى (`expo export --platform web`) | قرار ١٣ |

- إضافة `@sentry/react-native` بـ`app.json` (رفع خرائط المصدر) **لم تُضف عمداً**: بلا `SENTRY_AUTH_TOKEN` تُفشل بناء EAS. صفّ لأنس: حساب Sentry + المتغيّران ببيئة EAS.
- **ui84a** (مفتاح `aiReplyInArabicNote`) لم يصل من launch ⇒ backend-r78a لم يُربط بعد.
- W4: تلميح `?` العام ينتظر chart (ui84c).
- بنود المهمّة الأصلية: مسح `Pressable`/`TouchableOpacity` بنطاقي — لا اختيار بلون وحده بلا `accessibilityState`. الباقي كما بالتشغيل 84.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وتصدير الويب وحدهما. أولى ما يُفحص: الرصيف على هاتف 360px بالكردية (التسميات الطويلة تُقصّ بـ`flexShrink` لا تلتفّ)، وأن Sentry لا يرسل شيئاً بلا DSN.

## 2026-09-26 — تشغيل 86
صفوف ui بـCOORDINATION: **backend-r78a/ui84a** (المفتاح وصل من launch `82764b7`)، **W4** (جزء ui: تلميح `?`)، **chart-r92b**. بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| 9f10840 | `AiPanel` و`LectureClassroom`: سطر `aiReplyInArabicNote` (نصّ خافت 11px) فوق الجواب/التوضيح حين `answer_lang`/`clarification_lang` = `"ar"` ولغة الواجهة غير العربية؛ النصّ العربي يُحاذى يميناً بـ`writingDirection: rtl` ولو كانت الواجهة إنجليزية. نوعا الحقلين بـ`api.ts` (اختياريان — خادم أقدم = لا سطر) | backend-r78a، ui84a، قرار ١٢ |
| 326796a | `components/KeyboardShortcutsSheet.tsx` (مركّب بـ`App.tsx`، ويب فقط): `?` يفتح/يغلق قائمة الاختصارات = نصّا تلميح الشارت (`mcHintNavigateWeb`+`mcHintTypeTfWeb`) مقسومان عند « · » — مصدر واحد. يُتجاهل داخل خانة كتابة أو مع Ctrl/Alt/⌘؛ Esc بالالتقاط يغلقها وحدها (لا يلغي رسماً تحتها)؛ بلا حركة (§6) | W4، قرار ١٦ |
| 2eb1156 | حُذف `PairDrumWheel.tsx` (غير مستورد منذ `1fd83b8`) | chart-r92b |
| abc1b10 | `FrameSizedGrid` مبدّل الهاتف «مربعات/مستطيلات»: المختار تعبئة `selectedFill` + حدّ `border` + نصّ أساسي بدل حدّ وتعبئة ونصّ بالتأكيد معاً | DESIGN-PRO §1 (بند ٦) |

- صفّ جديد **ui86a** لـlaunch: حذف مفاتيح `pdw*` اليتيمة، ومفتاح `shortcutsSheetTitle` لعنوان قائمة `?`.
- W3 (الهاتف) منفَّذ بالتشغيل 85 (`5d7059f`) — ينتظر أن يراه أنس. ui85a (DSN) بشري.
- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` تعليقات فقط (`confirmDestructive`)؛ «درجة الاتفاق» تعليقات فقط؛ `useMultiLiveTicks` يرفض الأقدم من `TICK_STALE_MS`؛ «إعادة الجولة» `AccountScreen` (`tourOpen`)؛ مسح آلي لكل `Pressable` بنطاقي: لا اختيار بلا `accessibilityState`؛ لا نصّ عربي ثابت مرسوم بنطاقي (الأكاديمية عربية بقرار ١٢، والباقي مفاتيح نصّ الخادم أو تعليمات الذكاء).
- **ui-r77** (لون الخطأ) ما زال عند أنس.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: `?` على الويب بالإنجليزية والكردية، وسؤال المساعد بالكردية (السطر فوق الجواب العربي).

## 2026-09-26 — تشغيل 87
صفّ ui بـCOORDINATION (دورة QA 110): **launch177a**. بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| 8ac523c | `KeyboardShortcutsSheet` (قائمة `?` على الويب): عنوان `shortcutsSheetTitle` (`accessibilityRole="header"`، 15px/500) وتسمية للقائمة؛ وسطر `mcHintTypeDateWeb` (Home/End والقفز بتاريخ) أُضيف للأسطر — المصدر نفسه لتلميح الشارت | launch177a، W4 |
| a44cad1 | `LectureClassroom` زرّ «إغلاق» `accent` ⇒ `textMuted` 13px — إجراء لا اختيار؛ شريط التقدّم يبقى التأكيد الوحيد برأس الدرس | DESIGN-PRO §1 (بند ٦) |

- صفّ **backend-r78a + ui84a** (السطر 11) قديم: منجز بـ`9f10840` (`AiPanel.tsx:58`، `LectureClassroom.tsx:324`) وQA أغلقه بسطر التحقّق نفسه — لـQA حذفه.
- قائمة الزرّ الأيمن للشارت (chart `50f6d5b`) بلا مفتاح ترجمة يصفها ⇒ لا سطر لها بقائمة `?` بعد؛ إن أرادها launch فمفتاح « · زرّ أيمن: تنبيه/خطّ عند السعر» يُلحق كغيره.
- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` داخل `confirmDestructive` وحده؛ «درجة الاتفاق» تعليقات فقط؛ لا نصّ عربي مرسوم ثابت بنطاقي (تعليقات وتعليمات الذكاء فقط)؛ أنماط الاختيار بنطاقي كلها تعبئة/علامة + `accessibilityState` (قائمة المتابعة `selMarker`، `SymbolPairMenu` `rowOn`، `ScreenerMini` `chipOn`).
- **ui-r77** (لون الخطأ) و**ui85a** (DSN) ما زالا عند أنس.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: `?` على الويب بالعنوان والسطر الجديد بالعربية والكردية.

## 2026-09-26 — تشغيل 88
صفوف ui بـCOORDINATION (دورة QA 110): **tools123a**، **chart-r93a** (جزء ui). بوابة البناء خضراء (tsc 0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| 99d3f32 | `api.closeTrade(id, exit, seen?)` يرسل `{ ...seen, exit }` (`exit` بعدها فلا تغطّيه) ⇒ الدفتر يمرّر `journalCloseSeen(tr)` منذ قبل، فإغلاقٌ على صفّ عُدّل بجهاز آخر صار 409 `trade_changed_concurrently`. التحويل `CloseTradeWithSeen` بـ`TradeJournalPanel` صار زائداً — لـtools حذفه (ملفّه) | tools123a، backend-r82 |
| 9d78a64 | قائمة `?` تُلحق `shortcutsMouseWeb` (launch `aaff5fb`) بعد أسطر لوحة المفاتيح: الزرّ الأيمن على الشارت/الرسم، والنقر للتحديد | chart-r93a |
| f18d978 | `FrameSizedGrid` الإطار المسحوب: حُذف الظلّ (كان حدّ+خلفية+ظلّ) — حدّ التأكيد وحده | DESIGN-PRO §5.5 |

- صفّ **backend-r78a + ui84a** ما زال بالجدول وهو منجز (`9f10840`) — لـQA حذفه.
- بنود المهمّة الأصلية (تحقّق بالكود هذا التشغيل): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` داخل `confirmDestructive` وحده؛ «درجة الاتفاق» تعليقات فقط؛ «إعادة الجولة» `AccountScreen:268`؛ لا وزن 700 ولا ظلّ مكدّس بنطاقي بعد f18d978.
- **ui-r77** (لون الخطأ) و**ui85a** (DSN) ما زالا عند أنس.
- **لم يُتحقَّق بصرياً ولا على جهاز** — tsc وحده. أولى ما يُفحص: إغلاق صفقة بالدفتر (الطلب يحمل `seen_*` والخادم يقبله 200)، وقائمة `?` بالأسطر الثلاثة الجديدة.

## 2026-09-26 — تشغيل 89
لا صفّ بـCOORDINATION (دورة QA 111) موجَّه إلى ui كمنفّذ — الصفّان باسم ui (ui-r77 لون الخطأ، ui85a مفتاح Sentry) عند أنس. بوابة البناء خضراء (0) عند البدء. **لا commit كود هذا التشغيل** — لم أجد عيباً بنطاقي يستحقّ تغييراً، ولم أختلق واحداً.

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط (`MatrixEdgeRails.tsx:334`، `ToolsScreen.tsx:89`)؛ `Alert.alert`/`window.confirm` داخل `chart/confirmDestructive.ts` وحده؛ «درجة الاتفاق» لا أثر لها بالكود؛ `useMultiLiveTicks` يرفض الأقدم من `TICK_STALE_MS`؛ لا نصّ إنجليزي/عربي ثابت مرسوم بنطاقي (سوى علامة MATRIX)؛ تفرّع اللغة الوحيد بنطاقي (`LectureClassroom:390`، `CoursesScreen:36/39`) محتوى الأكاديمية العربي بقرار ١٢.
- قائمة القبول بند ٩ (مسح آلي لـ`Pressable`/`TouchableOpacity` بنطاقي): ستّ نتائج كلها أغلفة تمرير `accessible={false}` حول زرّ داخلي موسوم ⇒ لا فشل. بند ٦ (ميزانية التأكيد): الباقي `selectionColor`/مؤشّر تحميل/زرّ إجراء رئيسي واحد لكل لوحة ⇒ لا فشل.
- **التحقّق البصري ما زال غير ممكن من هنا:** لا خادم على `:8081` ولا متصفّح مثبّت بالبيئة. كل تشغيلات 79–89 بـtsc وحده. ما ينتظر نظرة أنس: قائمة المتابعة بأسعار محفوظة ووسم «مغلق · مخزن» (`b1b9578`)، الرصيف على الهاتف كشريط أدوات (`5d7059f`)، غياب الرصيف على الويب (`939830b`)، قائمة `?`.

## 2026-09-26 — تشغيل 90
صفّ ui بـCOORDINATION (دورة QA 112): **launch179a**. بوابة البناء خضراء (0) قبل الـcommit:

| commit | ماذا | صفّ |
|---|---|---|
| fbccf65 | قائمة `?` (`KeyboardShortcutsSheet`) تضمّ `mcHintDrawWeb` و`mcHintSelectedWeb` بعد التنقّل وقبل الفأرة؛ الضمّ بـ« · » بالكود (فلا حاجة لتعديل المفتاحين). `shortcutLines` تحذف السطر المكرّر حرفياً، والسطر الذي يبدأ بمفتاح سبق (`Esc`، `Ctrl+…`، `Alt+…`) ⇒ Esc وCtrl+Z / Ctrl+Y وAlt+T/H/V/F مرّة واحدة (الأولى). «اسحب لرسم»/«اسحب أو استعمل الأسهم» يبقيان (ليسا مفتاحاً). ما يضيفه launch لاحقاً (chart-r95a «Ctrl+C / Ctrl+V») يظهر تلقائياً | launch179a |

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` تعليقات فقط خارج `confirmDestructive`؛ «درجة الاتفاق» تعليقات فقط؛ «إعادة الجولة» `AccountScreen:268`؛ `useMultiLiveTicks` يرفض الأقدم من `TICK_STALE_MS`.
- DESIGN-PRO: QA 112 = 0/12 فشل؛ لم أجد بنداً بنطاقي يستحقّ commit (`WeeklyReportPanel` بلا `tabular-nums` لكنه نصّ تقرير ثابت لا رقم متغيّر) — لم أختلق تغييراً.
- **ui-r77** (لون الخطأ) و**ui85a** (DSN) ما زالا عند أنس.
- **لم يُتحقَّق بصرياً** — tsc وحده. أولى ما يُفحص: `?` على الويب بالعربية/الإنجليزية/الكردية — أن سطر Esc واحد، وأسطر الرسم والتحديد ظاهرة.

## 2026-09-26 — تشغيل 91
صفّ ui الوحيد بـCOORDINATION (دورة QA 112) **launch179a** منجز بالتشغيل 90 (`fbccf65`، `KeyboardShortcutsSheet.tsx:71-72`) — لـQA إغلاقه. بوابة البناء خضراء (0) قبل كل commit:

| commit | ماذا | صفّ |
|---|---|---|
| cc3c5f3 | `WeeklyReportPanel` الخانة المختارة: وسم «فتح» `accent` ⇒ `text` — التعبئة `accentSoft` وحدها تأكيد الخانة | DESIGN-PRO §1 (بند ٦) |
| 267fb39 | `AlertsPanel` وسم «تعديل تنبيه»: `accent` ⇒ `text` — أثناء التعديل كانت ثلاثة عناصر بالتأكيد (تعبئة الصفّ، الوسم، زرّ الحفظ) | DESIGN-PRO §1 (بند ٦) |

- مسح بنطاقي هذا التشغيل (بالكود لا بالسجلّ): لا وزن 700؛ لا مسافة خارج مضاعفات 4 (سوى `top: 38` موضع قائمة `SymbolPairMenu` و`marginTop: -4` بسطرين)؛ كل `Pressable` بنمط شرطي إما `pressed` وحده أو يحمل `accessibilityState` أو غلاف `accessible={false}`؛ لا نصّ عربي ثابت مرسوم (المحلّلات فقط)؛ الباقي من `colors.accent` عنصر واحد لكل تحكّم (الفريم النشط، رقاقة الماسح، مجموعة الرمز، ⋯ الإشراف).
- بنود المهمّة الأصلية: «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` داخل `confirmDestructive` وحده؛ «درجة الاتفاق» تعليقات فقط؛ `useMultiLiveTicks` يرفض الأقدم من `TICK_STALE_MS`؛ «إعادة الجولة» `AccountScreen:256`.
- **ui-r77** (لون الخطأ) و**ui85a** (DSN) ما زالا عند أنس.
- **لم يُتحقَّق بصرياً** — tsc وحده. أولى ما يُفحص: لوحة التقارير الأسبوعية بخانة مختارة، وتعديل تنبيه سعر.

## 2026-09-26 — تشغيل 92
صفّ ui بـCOORDINATION (دورة QA 113): **launch181a**. بوابة البناء خضراء (0) قبل الـcommit:

| commit | ماذا | صفّ |
|---|---|---|
| 9d90fbb | `QuadChartModal` لسان الرمز على الهاتف: رمز بلا بيانات حقيقية (`noReal`، DXY) يعرض `t.dsKindUnavailable` بنمط `demoTag` (`warn` 11px) مكان «—» — كخلية اللوح؛ كان الوسم بـ`accessibilityLabel` وحده | launch181a، قرار ٢ |

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` تعليقات فقط خارج `confirmDestructive`؛ «درجة الاتفاق» تعليقات فقط؛ `useMultiLiveTicks` يرفض الأقدم من `TICK_STALE_MS`؛ لا وزن 700 خارج chart/i18n.
- **ui-r77** (لون الخطأ) و**ui85a** (DSN) ما زالا عند أنس.
- **لم يُتحقَّق بصرياً** — tsc وحده. أولى ما يُفحص: الرباعي على الهاتف ولسان DXY يقرأ «غير متاح» بالعربية/الإنجليزية/الكردية دون اقتطاع.

## 2026-09-26 — تشغيل 93
صفّا ui بـCOORDINATION (دورة QA 113): **backend-r86** و**launch181a** (الثاني منجز بالتشغيل 92، `9d90fbb` — لـQA إغلاقه). بوابة البناء خضراء (0) قبل الـcommit:

| commit | ماذا | صفّ |
|---|---|---|
| d78960c | `useLastCloses`: «غير متاح» فقط حين `unavailable_reason === 'not_offered_by_provider'` (DXY). `provider_unavailable` (429 بلا مخزن، انقطاع، رمز لا يعرفه المزوّد) يُعامل كفشل الطلب: يبقى السعر السابق إن وُجد وإلا «—»، ويُعاد بعد `FAIL_TTL_MS` (دقيقة) لا `TTL_MS` | backend-r86 |

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` خارج `confirmDestructive` لا شيء؛ «درجة الاتفاق» تعليقات فقط؛ «إعادة الجولة» `AccountScreen:270`؛ `useMultiLiveTicks` يرفض الأقدم من `TICK_STALE_MS`؛ لا وزن 700 خارج chart/i18n.
- **ui-r77** (لون الخطأ) و**ui85a** (DSN) ما زالا عند أنس.
- **لم يُتحقَّق بصرياً** — tsc وحده. أولى ما يُفحص: قائمة من 16 رمزاً عند أول تحميل — EURUSD/الذهب لا تقول «غير متاح» حين يرفض المزوّد (429)، وDXY وحده يقولها.

## 2026-09-26 — تشغيل 94
صفّ ui بـCOORDINATION (دورة QA 114): **tools126a**. بوابة البناء خضراء (0) قبل الـcommit:

| commit | ماذا | صفّ |
|---|---|---|
| 960096e | `PanSpeedSlider` تعبئة المسار `textMuted` وقت السكون و`accent` أثناء السحب فقط (`dragging` من `onPanResponderGrant` حتى `Release`/`Terminate`) ⇒ الفريم النشط (`TimeframeBar.tsx:119`) وحده تأكيد الشريط العلوي. المقبض `sliderThumb` محايد أصلاً | tools126a، DESIGN-PRO §1 (بند ٢) |

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` تعليقات فقط خارج `confirmDestructive`؛ «درجة الاتفاق» تعليقات فقط؛ «إعادة الجولة» `AccountScreen:268`؛ `useMultiLiveTicks` يرفض الأقدم من `TICK_STALE_MS`؛ لا وزن 700 خارج chart/i18n؛ كل ملف بنطاقي فيه نمط اختيار شرطي يحمل `accessibilityState`.
- **ui-r77** (لون الخطأ) و**ui85a** (DSN) ما زالا عند أنس.
- **لم يُتحقَّق بصرياً** — tsc وحده. أولى ما يُفحص: الشريط العلوي على الحاسوب — مسار السرعة رمادي وقت السكون ويتلوّن أثناء السحب فقط، ويعود رمادياً عند الإفلات.

## 2026-09-26 — تشغيل 95
صفّ ui الوحيد بـCOORDINATION (دورة QA 114) **tools126a** منجز بالتشغيل 94 (`960096e`، `PanSpeedSlider` تعبئة `textMuted` وقت السكون) — لـQA إغلاقه. بوابة البناء خضراء (0). **لا commit كود هذا التشغيل** — التحقّق بالكود لم يُظهر عيباً بنطاقي، ولم أختلق تغييراً.

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط (`MatrixEdgeRails.tsx:334`، `ToolsScreen.tsx:89`)؛ `Alert.alert`/`window.confirm` داخل `chart/confirmDestructive.ts` وحده (حذف الحساب `AccountScreen:202` عبره)؛ «درجة الاتفاق» تعليقات فقط (`AnalystsPanel:149`، `SocialConsensusPanel:248`)؛ لا نصّ إنجليزي ثابت مرسوم بلوحات العمولات/الشبكة/الباقات (سوى علامة MATRIX).
- قائمة القبول بنطاقي (مسح آلي لـ`components/*.tsx` و`screens/*.tsx` خارج tools): كل ملف يُنسّق رقماً يستعمل `...numeric` (بند ١)؛ لا وزن 700 (١٢)؛ لا padding/margin/gap خارج مضاعفات 4 (١١)؛ لا ظلّ (٧)؛ كل نمط اختيار شرطي داخل `Pressable` يحمل `accessibilityState` (١٠ — نتائج المسح الثماني كانت `Text` أبناء لزرّ موسوم).
- قرار ٨ («أمس» 17:00 نيويورك) بقائمة المتابعة: المرجع من `chart/dailyRefStore` ⇐ `sessionKeyAt` بـ`chart/dailyChange.ts:70` منفَّذ (ملف chart).
- **ui-r77** (لون الخطأ) و**ui85a** (DSN) ما زالا عند أنس.
- **لم يُتحقَّق بصرياً** — لا خادم على `:8081` ولا متصفّح بالبيئة.

## 2026-09-26 — تشغيل 96
لا صفّ بـCOORDINATION (دورة QA 115) موجَّه إلى ui كمنفّذ — tools126a أُغلق بـ`960096e`، والصفّان باسم ui (ui-r77 لون الخطأ، ui85a مفتاح Sentry) عند أنس. بوابة البناء خضراء (0). **لا commit كود هذا التشغيل** — المسح بالكود لم يُظهر عيباً بنطاقي، ولم أختلق تغييراً.

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` داخل `chart/confirmDestructive.ts` وحده؛ «درجة الاتفاق» تعليقات فقط؛ تفرّع `lang === 'ar'` بنطاقي محتوى الأكاديمية (قرار ١٢) ووسما «الردّ بالعربية» (`AiPanel:58`، `LectureClassroom:324`) فقط.
- مسح آلي لكل `Pressable`/`TouchableOpacity` بنطاقي: لا زرّ بلا `accessibilityLabel` ولا نصّ ظاهر (بند ٩)؛ كل ملف يُنسّق رقماً يستعمل `numeric` (بند ١)؛ كل `Modal` بـ`animationType="none"` (§6)؛ §5.6 موصول (`TerminalScreen:242`، `FocusChartModal:83`، `QuadChartModal:87`).
- ملاحظات أنس على الويب (الجولتان): W1–W5 منجزة بالكود (تشغيلات 84–85، ومنها W2/W5 بـtools) — **تنتظر نظرته**.
- **لم يُتحقَّق بصرياً** — لا خادم على `:8081` ولا متصفّح بالبيئة.

## 2026-09-26 — تشغيل 97
لا صفّ بـCOORDINATION (دورة QA 115) موجَّه إلى ui كمنفّذ — الصفّان باسم ui (ui-r77 لون الخطأ، ui85a مفتاح Sentry) عند أنس. بوابة البناء خضراء (0). **لا commit كود هذا التشغيل** — التحقّق بالكود لم يُظهر عيباً بنطاقي، ولم أختلق تغييراً.

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط (`MatrixEdgeRails.tsx:334`، `ToolsScreen.tsx:89`)؛ `Alert.alert`/`window.confirm` تعليقات فقط خارج `confirmDestructive` (`AccountScreen:202`، `TradeJournalPanel:1442`)؛ «درجة الاتفاق» لا أثر لها بالواجهة؛ `useMultiLiveTicks` يرفض الأقدم من `TICK_STALE_MS` (`:80`) ويُسقط الرمز الصامت (`:113`)؛ تفرّع `lang === 'ar'` بنطاقي محتوى الأكاديمية (قرار ١٢) ووسما «الردّ بالعربية» فقط.
- مسح آلي لكل `Pressable`/`TouchableOpacity` بنمط اختيار شرطي بنطاقي: كلها تحمل `accessibilityState` أو غلاف `accessible={false}` (بند القبول ١٠).
- ملاحظات أنس على الويب (الجولتان): W1–W5 منجزة بالكود (تشغيلات 84–85، ومنها W2/W5 بـtools) — **تنتظر نظرته**.
- **لم يُتحقَّق بصرياً** — لا خادم على `:8081` ولا متصفّح بالبيئة.

## 2026-09-26 — تشغيل 98
لا صفّ بـCOORDINATION (دورة QA 116) موجَّه إلى ui كمنفّذ — الصفّان باسم ui (ui-r77 لون الخطأ، ui85a مفتاح Sentry) عند أنس. بوابة البناء خضراء (0). **لا commit كود هذا التشغيل** — التحقّق بالكود لم يُظهر عيباً بنطاقي، ولم أختلق تغييراً.

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط (`MatrixEdgeRails.tsx:334`، `ToolsScreen.tsx:89`)؛ `Alert.alert`/`window.confirm` لا أثر لهما خارج `confirmDestructive`؛ «درجة الاتفاق» تعليقات فقط (`AnalystsPanel:149`، `SocialConsensusPanel:248`، `WeeklyReportPanel:41`)؛ تفرّع `lang === 'ar'` بنطاقي محتوى الأكاديمية (قرار ١٢) ووسما «الردّ بالعربية» فقط.
- ملاحظة أنس W-١ (تسعة أزرار للتخطيط): زرّ واحد بقائمة منسدلة `TerminalScreen.tsx:1235` (`layoutMenuTrigger`، `accessibilityState.expanded`) — ملف tools، منجز.
- مسح نصّ ثابت مرسوم بنطاقي: لا عربي؛ الإنجليزي أسماء مؤشرات فقط (`SymbolSnapshot` RSI/MACD). `BacktestPanel` أسطر الصفقات بـ`numeric`.
- **لم يُتحقَّق بصرياً** — لا خادم على `:8081` ولا متصفّح بالبيئة.

## 2026-09-26 — تشغيل 99
لا صفّ بـCOORDINATION (دورة QA 116) موجَّه إلى ui كمنفّذ — الصفّان باسم ui (ui-r77 لون الخطأ، ui85a مفتاح Sentry) عند أنس. بوابة البناء خضراء (0). **لا commit كود هذا التشغيل** — التحقّق بالكود لم يُظهر عيباً بنطاقي، ولم أختلق تغييراً.

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط؛ `Alert.alert`/`window.confirm` لا أثر لهما خارج `confirmDestructive`؛ «درجة الاتفاق» تعليقات فقط؛ لا تفرّع `lang === 'en'` بنطاقي يُسقط الكردية إلى العربية (الموجود وسما «الردّ بالعربية» فقط).
- مسح نصّ عربي ثابت بنطاقي: الباقي تعليقات، أو مفاتيح خريطة من نصّ الخادم إلى القاموس (`CommissionPlanPanel:41–57`)، أو تعليمات ذكاء داخلية لا يراها المتداول (`WeeklyReportPanel`).
- قرارات ٥/٦/١٠ موصولة بـ`featureFlags.ts` (`MatrixBottomDock`، `MatrixSidePanel`، `MatrixEdgeRails`، `AccountScreen`)؛ قرار ٩ `MessagesScreen` محذوفة.
- قائمة القبول بنطاقي (مسح آلي): لا وزن 700 (١٢)، لا padding/margin/gap خارج مضاعفات 4 (١١)، لا ظلّ (٧)؛ كل ملف بـ`onPress` بلا `accessibilityState` لا نمط اختيار فيه (`GroupChatPanel.mine` مؤلِّف موسوم «أنت» لا اختيار) (١٠).
- **لم يُتحقَّق بصرياً** — لا خادم على `:8081` ولا متصفّح بالبيئة.

## 2026-09-26 — تشغيل 100
لا صفّ بـCOORDINATION (دورة QA 117) موجَّه إلى ui كمنفّذ — الصفّان باسم ui (ui-r77 لون الخطأ، ui85a مفتاح Sentry) عند أنس. بوابة البناء خضراء (0). **لا commit كود هذا التشغيل** — التحقّق بالكود لم يُظهر عيباً بنطاقي، ولم أختلق تغييراً.

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط (`MatrixEdgeRails.tsx:334`، `ToolsScreen.tsx:89`)؛ `Alert.alert`/`window.confirm` داخل `chart/confirmDestructive.ts` وحده؛ «درجة الاتفاق» تعليقات فقط (`AnalystsPanel:149`، `SocialConsensusPanel:248`، `WeeklyReportPanel:41`)؛ `useMultiLiveTicks` يرفض الأقدم من `TICK_STALE_MS` (`:80`، `:113`)؛ «إعادة الجولة» `AccountScreen:268`.
- ملاحظات أنس على الويب (الجولتان): اختصارات لوحة المفاتيح `KeyboardShortcutsSheet` + `TerminalScreen`؛ شريط الهاتف `1100b8f` (W5) — **تنتظر نظرته**.
- مسح آلي بنطاقي: لا `bold`/800/900؛ الحركة الوحيدة `PriceFlash` بـ`motion.flash` (§6)؛ لا `uppercase`.
- **لم يُتحقَّق بصرياً** — لا خادم على `:8081` ولا متصفّح بالبيئة.

## 2026-09-26 — تشغيل 101
لا صفّ بـCOORDINATION (دورة QA 118) موجَّه إلى ui كمنفّذ — الصفّان باسم ui (ui-r77 لون الخطأ، ui85a مفتاح Sentry) عند أنس. بوابة البناء خضراء (0). **لا commit كود هذا التشغيل** — التحقّق بالكود لم يُظهر عيباً بنطاقي، ولم أختلق تغييراً.

- backend `8635921` (تيك بوقت مستقبلي يجمّد الرمز): فحصت نظيره بالعميل — `hooks/tickAge.ts` لا يرتّب التيكات بوقتها بل يقيس العمر `ts − ticks_at` بساعة الخادم نفسها (`LATEST_AT` = وقت الاستلام)، فلا مرجع يُحفظ ويُسقط ما بعده. لا عيب مقابل.
- بنود المهمّة الأصلية (تحقّق بالكود): «₴» بتعليقين فقط (`MatrixEdgeRails.tsx:334`، `ToolsScreen.tsx:89`)؛ كل `accessibilityLabel` مركّب بنطاقي من مفاتيح `t.*` (لا نصّ ثابت يسمعه قارئ الشاشة بلغة أخرى)؛ `placeholder`/`label` الثابتة رموز أو أسماء مؤشرات فقط.
- قائمة DESIGN-PRO المرتّبة: الحذف مخفيّ حتى التحويم/الضغط المطوّل (`WatchlistPanel:460`، `:535`)؛ الشريط السفلي 4 رئيسية + المزيد (`MatrixBottomDock:62`).
- **لم يُتحقَّق بصرياً** — لا خادم على `:8081` ولا متصفّح بالبيئة.

## 2026-09-26 — تشغيل 102
لا صفّ بـCOORDINATION (دورة QA 118) موجَّه إلى ui كمنفّذ — الصفّان باسم ui (ui-r77 لون الخطأ، ui85a مفتاح Sentry) عند أنس. بوابة البناء خضراء (0). **لا commit كود هذا التشغيل** — التحقّق بالكود لم يُظهر عيباً بنطاقي، ولم أختلق تغييراً.

- مسار سعر قائمة المتابعة (جولة أنس الثانية): `useLastCloses` يقرأ `series.last` نفسه (D/50)، التجريبي لا سعر، `provider_unavailable` لا يمحو السعر السابق ولا يوسم الرمز «غير متاح»؛ الصفّ الذي يسقط تيكه لتأخّره (`useMultiLiveTicks` `staleTimer`) يعود إلى `needLast` فيُعرض المحفوظ بوسمه لا «—».
- لا `Alert.alert`/`Alert.prompt`/`Share`/`Clipboard` بنطاقي خارج `confirmDestructive` (تعليقان فقط) ⇒ لا نافذة صامتة على الويب؛ مواضع `confirmDestructive` السبعة بنطاقي (حذف الحساب `AccountScreen:203`).
- رايات قرارات ٥/٦/١٠: كل استعمال لـ`NewsPanel`/`AnalystsPanel`/`SocialConsensusPanel`/الباقات/العمولات/الشبكة محاط بالراية (`MatrixBottomDock:261–279`، `MatrixSidePanel:202`، `AccountScreen:280`).
- قرار ٧: `PASSWORD_MIN_LENGTH = 8` بالتسجيل وتغيير الكلمة (`AccountScreen:32`).
- **لم يُتحقَّق بصرياً** — لا خادم على `:8081` ولا متصفّح بالبيئة.

## 2026-09-26 — تشغيل 103
لا صفّ بـCOORDINATION (دورة QA 119) موجَّه إلى ui كمنفّذ — الصفّان باسم ui (ui-r77 لون الخطأ، ui85a مفتاح Sentry) عند أنس. بوابة البناء خضراء (0). **لا commit كود هذا التشغيل** — التحقّق بالكود لم يُظهر عيباً بنطاقي، ولم أختلق تغييراً.

- بنود المهمّة السبعة (تحقّق بالكود): اختيار باللون وحده — مسح كل نمط `*On/*Active/*Selected` بنطاقي: كل زرّ اختيار يحمل `accessibilityState` وحاويته خلفية أو حدّاً لا لون نصّ فقط (`TimeframeBar:59`، `MatrixBottomDock:202/233/303/327`، `CalendarPanel:445/467/495`، `WatchlistPanel:475`، `MatrixSidePanel:144/169`، `QuadChartModal:289/383`)؛ «₴» تعليقان فقط؛ `Alert.alert`/`window.confirm` داخل `chart/confirmDestructive.ts` وحده؛ «درجة الاتفاق» تعليقات فقط؛ `useMultiLiveTicks` يرفض الأقدم من `TICK_STALE_MS` ويُسقط الصامت (`staleTimer`)؛ «إعادة الجولة» `AccountScreen:258–275`.
- الكردية: القاموس `Dict` مكتوب النوع فلا مفتاح ناقص يسقط إلى العربية؛ لا نصّ خادم خام (`e.message`/`detail`/`*_ar`) يُعرض بنطاقي خارج `AppErrorBoundary`.
- ملاحظات أنس على الويب: W3 (الشريط السفلي) — لا رصيف بعرض ≥700 (`MatrixBottomDock` `WIDE_MIN_WIDTH`)، وعلى الهاتف شريط أدوات مفصول بصرياً عن التنقّل (`5d7059f`) — **تنتظر نظرته**.
- **لم يُتحقَّق بصرياً** — لا خادم على `:8081` ولا متصفّح بالبيئة.

## 2026-09-26 — تشغيل 104
صفّان بـCOORDINATION موجَّهان إلى ui كمنفّذ (طلبهما chart تشغيل 102) — **أُنجزا**. بوابة البناء خضراء (0) قبل كل commit.

- **chart102a** `c032d8b` — `hooks/chartSeriesCache.ts` `rememberChartSeries` لا يخزّن سلسلة حقيقية دون `FULL_SERIES_MIN_CANDLES` (120: تحت افتراض `api.chart` 180 بهامش لما يُسقطه المزوّد، وفوق القراءات القصيرة 50/60). القارئ القصير يأخذ سلسلته كما هي ولا يمسّ المخزَّنة ⇒ التركيز/الرباعي/الطرفية على D لا تفتح بـ50 شمعة من `useLastCloses`، ولا يبقى الـ50 خمس دقائق إن عاد الجلب التالي تجريبياً. الحلّ بمكان واحد فلا تغيير بملفّات tools (`PositionSizePanel`/`TradeJournalPanel` يقرآن المخزَّنة الكاملة كما كانا).
- **chart102b** `60a987f` — `FocusChartModal.tsx`: حالة `seriesTf` بجانب `seriesSym` تُضبط مع كل `setSeries`، و`livePrice`/`liveTickSource` بشرط `liveMatches` (الرمز **والفريم**). 15m→1H بلا ذاكرة: الشموع القديمة تبقى باهتة تحت مؤشّر التحميل بلا دمج تيك ولا عدّاد 15m. الرأس (`headSeries`) يبقى بشرط الرمز وحده — سعره ونسبته من إغلاق اليوم السابق لا من الفريم.
- بنود المهمّة الأصلية (تحقّق سريع بالكود): «₴» تعليقان فقط؛ `Alert.alert`/`window.confirm` تعليقات خارج `confirmDestructive`؛ «درجة الاتفاق» لا أثر بالواجهة؛ «إعادة الجولة» `AccountScreen:258–275`.
- **لم يُتحقَّق بصرياً** — لا خادم على `:8081` ولا متصفّح بالبيئة. للـQA: الصفّان chart102a/b يُغلقان بالكود.

## 2026-09-26 — تشغيل 105
صفّ واحد بـCOORDINATION (دورة QA 120) موجَّه إلى ui كمنفّذ — **أُنجز**. بوابة البناء خضراء (0) قبل الـcommit.

- **tools132a** `33d8f91` — `components/AiPanel.tsx`: الرمز يُثبَّت لحظة السؤال (`askedSymbol`) ويُرسَل به الطلب ويُحفظ مع السؤال والجواب (`Turn.symbol`)، ويُعرض وسماً صغيراً (`symbolTag`، 11px `textMuted`) أعلى كل فقاعة. سؤال على EURUSD ثم نقر GBPUSD قبل الردّ ⇒ الجواب موسوم «EURUSD» تحت شريط GBPUSD. التحية وفقاعة الانقطاع بلا وسم (ليستا عن رمز). لا مفتاح ترجمة جديد (الرمز لا يُترجم).
- بنود المهمّة الأصلية (تحقّق بالكود): «₴» تعليقان فقط؛ `Alert.alert`/`window.confirm` داخل `chart/confirmDestructive.ts` وحده؛ «درجة الاتفاق» تعليقات فقط؛ «إعادة الجولة» `AccountScreen:258–275`؛ مسح آلي: لا ملف بنطاقي بنمط `*On/*Active/*Selected` بلا `accessibilityState`؛ القاموس الكردي لا يحمل نصّاً عربياً مطابقاً (عدا الفاصل «، »).
- **لم يُتحقَّق بصرياً** — لا خادم على `:8081` ولا متصفّح بالبيئة. للـQA: tools132a يُغلق بالكود.

## 2026-09-26 — تشغيل 106
لا صفّ بـCOORDINATION (دورة QA 121) موجَّه إلى ui كمنفّذ — الصفّان باسم ui (ui-r77 لون الخطأ، ui85a مفتاح Sentry) عند أنس. بوابة البناء خضراء (0) قبل الـcommit.

| commit | ماذا | بند |
|---|---|---|
| 5e2dd58 | `ModerationToggle` («⋯» على كل رسالة/فكرة): الحالة المفتوحة كانت لون التأكيد على الرمز وحده ⇒ صارت تعبئة `selectedFill` محايدة + نصّ `text`، مع `accessibilityState.expanded` كما كان | DESIGN-PRO §4 (بند القبول ١٠)، §1 |

- مسح أنماط الاختيار بنطاقي (`&& styles.*On/*Active/*Selected` التي تغيّر اللون وحده): كلها أنماط نصّ داخل حاوية تحمل تعبئة أو علامة، عدا «⋯» أعلاه (أُصلح).
- بنود المهمّة الأصلية (تحقّق بالكود): «₴» تعليقان فقط (`MatrixEdgeRails.tsx:334`، `ToolsScreen.tsx:89`)؛ `Alert.alert`/`window.confirm` داخل `chart/confirmDestructive.ts` وحده؛ «درجة الاتفاق» تعليقات فقط؛ «إعادة الجولة» `AccountScreen:258–276`؛ `useMultiLiveTicks` يرفض الأقدم من `TICK_STALE_MS`؛ قائمة المتابعة تعرض آخر إغلاق محفوظ بوسمه (`useLastCloses`، `WatchlistPanel:384–400`)؛ لا نصّ ثابت مرسوم بنطاقي.
- **لم يُتحقَّق بصرياً** — لا خادم على `:8081` ولا متصفّح بالبيئة.

## 2026-09-26 — تشغيل 107
لا صفّ بـCOORDINATION (دورة QA 121) موجَّه إلى ui كمنفّذ — الصفّان باسم ui (ui-r77 لون الخطأ، ui85a مفتاح Sentry) عند أنس. بوابة البناء خضراء (0) قبل كل commit.

| commit | ماذا | بند |
|---|---|---|
| c88a89f | `VotePanel.cast`: فشل الطلب (شبكة/5xx) كان يُبقي +1 المتفائل و«✓» على الزرّ بصوت لم يُسجَّل ⇒ يُرجَع العدّاد كما كان (كفرع `login_required`) مع رسالة الخطأ | رقم غير صحيح على الشاشة |
| ec22429 | `SymbolSearchBar`: مسح الخانة (أو حرف واحد) أثناء طلب قائم ⇒ المؤشّر يدور للأبد ويُخفي سطرَي الخطأ و«لا نتيجة» ⇒ `setLoading(false)` بفرع النصّ القصير | ويب/هاتف |
| a4f5f39 | `CalendarPanel`: شريحة «كل العملات» كانت تعرض «ALL» الإنجليزية بالعربية والكردية بجانب «كل» المترجمة لشريحة التأثير ⇒ `t.calendarAllShort` | ترجمة |
| 199179e | `AccountScreen.enableNotifications`: `catch` كلوحَي التنبيهات — `Linking.openSettings` يرفض بأندرويد بلا نشاط إعدادات فكان رفضاً غير معالَج | متانة |

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» تعليقان فقط؛ `Alert.alert`/`window.confirm` داخل `chart/confirmDestructive.ts` وحده؛ «درجة الاتفاق» تعليقات فقط؛ كل `Modal` بنطاقي يحمل `onRequestClose` (Esc على الويب).
- مُلاحَظ ولم يُصلَح (ضعيف): نتائج البحث السابقة تبقى قابلة للنقر أثناء جلب نصّ جديد؛ `SubscriptionPlansPanel` أسعار ثابتة ($10/15/20) — مخفية بالراية (قرار ١٠)، تُراجَع إن فُتحت.
- **لم يُتحقَّق بصرياً** — لا خادم على `:8081` ولا متصفّح بالبيئة.

## 2026-09-26 — تشغيل 108
صفّ واحد بـCOORDINATION (دورة QA 122) موجَّه إلى ui كمنفّذ — **أُنجز**. بوابة البناء خضراء (0) قبل الـcommit.

| commit | ماذا | بند |
|---|---|---|
| ecfafb6 | `FocusChartModal`: رأس السعر `formatPrice(headPrice, sym, headSeries.last)`، ورسالة «مُسلَّح» بمرجع `series.last` للرمز الحالي، وB/A بمرجع `headSeries?.last ?? quote.bid` ⇒ منازل الرأس = منازل الشارت تحته والإطار/الرباعي (XNGUSD تيك 9.998 وlast 10.002 كان «9.99800» فوق «9.998») | chart103a |

- مسح آلي بنطاقي: كل `Pressable`/`Touchable*` تفاعلي يحمل `accessibilityLabel` (الأغلفة `accessible={false}` للتحويم فقط) (بند القبول ٩)؛ أسعار/نسب/أوقات اللوحات (`AlertsPanel`، `VotePanel`، `DomLitePanel`، `ChartFrame`، `QuadChartModal`، `FocusChartModal`، `NewsPanel`، `SymbolSnapshot`) كلها بـ`...numeric` (بند ١).
- بنود المهمّة الأصلية (تحقّق بالكود): «₴» تعليقان فقط؛ `Alert.alert`/`window.confirm` تعليقات خارج `chart/confirmDestructive.ts`؛ منتقي التخطيط زرّ واحد بقائمة (`TerminalScreen:1237`).
- **لم يُتحقَّق بصرياً** — لا خادم على `:8081` ولا متصفّح بالبيئة. للـQA: chart103a يُغلق بالكود.

## 2026-09-26 — تشغيل 109
لا صفّ بـCOORDINATION (دورة QA 123) موجَّه إلى ui كمنفّذ — الصفّان باسم ui (ui-r77 لون الخطأ، ui85a مفتاح Sentry) عند أنس. بوابة البناء خضراء (0) قبل كل commit.

| commit | ماذا | بند |
|---|---|---|
| 88700e0 | `SymbolSnapshot`: تبديل الرمز/الفريم يمسح اللقطة فوراً — RSI ونسبة EURUSD كانا يبقيان تحت XAUUSD حتى يصل الردّ (وبلا حدّ إن علّق الطلب) | رقم خاطئ على الشاشة |
| e12bfdb | `DomLitePanel`: Bid/Ask بلون النصّ لا أحمر/أخضر — ليسا اتجاه سعر، والتسمية تميّزهما | DESIGN-PRO §1 |
| 6e97a5a | `ScreenerMini`: RSI بمنزلة ثابتة (`toFixed(1)`) و«—» إن غاب — «RSI 30» بجانب «RSI 29.5» كان يغيّر عرض البطاقة، وقيمة null كانت تُطبع «null» | DESIGN-PRO §2 |

- مسح «لقطة الرمز السابق» بكل لوح بنطاقي يجلب بالرمز: `AlertsPanel` و`BacktestPanel` و`IndicatorForecastPanel` و`DomLitePanel` تمسح أصلاً؛ `AnalystsPanel`/`SocialConsensusPanel` مخفيّتان بالراية (قرار ٥).
- قائمة المتابعة: فرع «تجريبي» لكل صفّ (`demoTicks`) باقٍ بالكود لكنه ميّت عملياً — الخادم لم يعد يبثّ تيكات تجريبية (`main.py` `/ws/ticks` يرسل `unavailable` بلا تيكات). لم يُمسّ.
- بنود المهمّة الأصلية (تحقّق بالكود): «₴» تعليقان فقط؛ كل تأكيد هدّام عبر `chart/confirmDestructive.ts` (`window.confirm` على الويب)؛ «درجة الاتفاق» لا أثر بالواجهة؛ اختصارات لوحة المفاتيح موجودة (`KeyboardShortcutsSheet`).
- **لم يُتحقَّق بصرياً** — لا خادم على `:8081` ولا متصفّح بالبيئة.

## 2026-09-26 — تشغيل 110
صفّ واحد بـCOORDINATION (دورة QA 124) موجَّه إلى ui كمنفّذ — **أُنجز**. بوابة البناء خضراء (0) قبل الـcommit.

| commit | ماذا | بند |
|---|---|---|
| d620c33 | `CalendarPanel`: الساعة `newsClockMs()` (ساعة الخادم المصحَّحة) بدل `Date.now()`؛ `relLabel` بـ`newsCountdown` (تقريب للأسفل، و«الآن» بالدقيقة الأخيرة أو بعد الصدور حتى 15د) بدل `Math.round` و«الآن» لربع ساعة قبل الحدث؛ التجديد بـ`newsTickDelayMs` لأقرب حدث موقوت (عند تغيّر النصّ، سقف دقيقة) بدل كل 60ث من لحظة التركيب ⇒ الخبر نفسه بالعدّ نفسه على الشارت والتقويم | QA124a |

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» تعليقان فقط؛ `Alert.alert`/`window.confirm` لا أثر لهما خارج `chart/confirmDestructive.ts`؛ «درجة الاتفاق» تعليقات فقط (`AnalystsPanel:149`، `SocialConsensusPanel:248`، `WeeklyReportPanel:41`).
- **لم يُتحقَّق بصرياً** — لا خادم على `:8081` ولا متصفّح بالبيئة. للـQA: QA124a يُغلق بالكود.

## 2026-09-26 — تشغيل 111
لا صفّ جديد بـCOORDINATION موجَّه إلى ui كمنفّذ — QA124a أُنجز بالتشغيل 110 (`d620c33`)، والصفّان باسم ui (ui-r77، ui85a) عند أنس. بوابة البناء خضراء (0) قبل كل commit.

| commit | ماذا | بند |
|---|---|---|
| 998223b | `CalendarPanel`: حدث بلا `ts` كان يعرض `when` الخام — مسار RSS الاحتياطي بالخادم يرسل «هذا الأسبوع» **بالعربية** لكل اللغات ⇒ الكردية والإنجليزية تعرضانها. `whenRaw`: `time_tbd` أو نصّ فارغ أو عربي ⇒ `t.newsTimeTbdNeutral`؛ تاريخ/ساعة XML تبقى كما هي | ترجمة |
| ca6d88d | `NewsPanel`: وقت العنوان كان «14:30 UTC» الخام بجانب تقويم وشارت بتوقيت الجهاز ⇒ `formatLocalStamp(ts)` إن وصل `ts` (الخادم يرسله أصلاً، `NewsItem.ts` أُضيف للنوع)، وإلا النصّ الخام | وقت خاطئ على الشاشة |

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» تعليقان فقط؛ `Alert.alert`/`window.confirm` داخل `chart/confirmDestructive.ts` وحده؛ «درجة الاتفاق» تعليقات فقط؛ «إعادة الجولة» `AccountScreen:258–276`؛ لا وزن 700 ولا مسافة خارج مضاعفات 4 ولا ظلّ بنطاقي.
- مُلاحَظ ولم يُصلَح: `NewsPanel` يعرض `pair_effect` وهو دائماً «Forex» الإنجليزية (لا معلومة فيه) — للخادم أو يُحذف السطر بدورة قادمة.
- **لم يُتحقَّق بصرياً** — لا خادم على `:8081` ولا متصفّح بالبيئة.

## 2026-09-26 — تشغيل 112
لا صفّ بـCOORDINATION (دورة QA 125) موجَّه إلى ui كمنفّذ — الصفّان باسم ui (ui-r77 لون الخطأ، ui85a مفتاح Sentry) عند أنس. بوابة البناء خضراء (0) قبل الـcommit.

| commit | ماذا | بند |
|---|---|---|
| 76c94be | `App.tsx` شريط التبويبات `paddingTop` 6 ⇒ 4 — القيمة الوحيدة خارج شبكة 4 بنطاقي (المسح يستثني `lineHeight`) | DESIGN-PRO §3، بند القبول ١١ |

- مسح آلي بنطاقي: كل نمط اختيار شرطي (`…On`/`…Active`) على حاوية يحمل تعبئة `backgroundColor` أو علامة حدّ، ومعه `accessibilityState` (بند القبول ١٠)؛ لا وزن 700/800/bold ولا ظلّ (`shadowOpacity`/`elevation`) (بندا ٧ و١٢).
- نصّ عربي ثابت بالكود (غير التعليقات) بنطاقي: مطالبات الذكاء الاصطناعي (`WeeklyReportPanel`)، وخريطة مفاتيح نصوص الخادم (`CommissionPlanPanel` ⇒ مفاتيح مترجمة)، وبيانات الأكاديمية (قرار ١٢ — تبقى عربية) — لا شيء يُعرض خاماً للكردية/الإنجليزية.
- ملاحظات أنس على الويب (DECISIONS-ANAS) بنطاق ui، تحقّق بالكود: آخر إغلاق محفوظ بوسمه في قائمة المتابعة (`WatchlistPanel:390`)، شريط سفلي واحد على الشاشة العريضة (`939830b`) وشريط الهاتف أدوات شارت (`5d7059f`)، شريط الرموز على الهاتف غير مقصوص (`1100b8f`)، `?` للاختصارات (`KeyboardShortcutsSheet`).
- `useMultiLiveTicks`/`tickAge`: التيك المتجمّد عند الخادم (`ticks_at`) يُرفض، والصامت يُسقَط بعد `TICK_STALE_MS` — سليم.
- **لم يُتحقَّق بصرياً** — لا خادم على `:8081` ولا متصفّح بالبيئة.

## 2026-09-26 — تشغيل 113
لا صفّ بـCOORDINATION (دورة QA 125) موجَّه إلى ui كمنفّذ — الصفّان باسم ui (ui-r77 لون الخطأ، ui85a مفتاح Sentry) عند أنس. بوابة البناء خضراء (0) قبل كل commit.

| commit | ماذا | بند |
|---|---|---|
| e5ac4a1 | `AlertsPanel`: تبديل رمز الشارت يمسح السعر المكتوب والاتجاه والملاحظة — «1.0850» لـEURUSD كانت تبقى «XAUUSD · 1.0850» و«أضف» يسلّح تنبيهاً على الذهب بمستوى لا معنى له؛ وتبديلٌ أثناء التعديل يُطبَّق عند الحفظ/الإلغاء بدل أن يضيع | رقم خاطئ / تنبيه خاطئ |
| 55d0e37 | `WatchlistPanel`: رمزٌ سقط من البثّ يُنسى سعره السابق — أول تيك بعد انقطاع أو افتتاح الأحد كان يُقارَن بسعر ما قبل الفجوة فيومض الصفّ ويُلوَّن «تحرّك للتوّ» | لون سعر كاذب |
| 6dc264d | `IndicatorAlertsPanel`: متابعة رمز الشارت تمسح «مُسلَّح: EURUSD · RSI…» وخطأ النموذج — كشرائح الرمز وخانته | حالة الرمز السابق |
| cb79469 | `LectureClassroom`: إفراغ الصوت انتقل من تنظيف أثر التحميل (يُعاد باكتمال الدخول) إلى أثر خاصّ بالمحاضرة ⇒ الشرح لا يصمت تحت «الصوت يعمل»؛ حفظ التقدّم يلتقط رفضه | صوت / متانة |

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» تعليقان فقط؛ `Alert.alert`/`window.confirm` داخل `chart/confirmDestructive.ts` وحده؛ «درجة الاتفاق» تعليقات فقط.
- مسح آلي لعشرة ملفات بنطاقي: لا وزن 700، مسافات على شبكة 4، كل شريحة اختيار بتعبئة و`accessibilityState`، المؤقّتات تُنظَّف.
- **لم يُتحقَّق بصرياً**: لا خادم على `:8081` ولا متصفّح بالبيئة.

## 2026-09-26 — تشغيل 114
لا صفّ بـCOORDINATION (دورة QA 126) موجَّه إلى ui كمنفّذ — الصفّان باسم ui (ui-r77 لون الخطأ، ui85a مفتاح Sentry) عند أنس. بوابة البناء خضراء (0) قبل الـcommit.

| commit | ماذا | بند |
|---|---|---|
| 2dbbc8f | `NewsPanel`: سطر `pair_effect` حُذف — الخادم يرسل «Forex» ثابتة لكل خبر (`news_feed.py:126`)، إنجليزية تحت الواجهة العربية/الكردية ولا تسمّي زوجاً (مُلاحَظ بالتشغيل 111) | ترجمة / ضجيج |

- بنود المهمّة الأصلية وملاحظات أنس على الويب (تحقّق بالكود): «₴» تعليقان فقط؛ «درجة الاتفاق» تعليقات فقط؛ منتقي التخطيط زرّ واحد بقائمة (`5d5bf49`، ملك tools)؛ شريط الهاتف غير مقصوص (`1100b8f`).
- مسح آلي بنطاقي: كل `Pressable`/`TouchableOpacity` بنمط اختيار شرطي يحمل `accessibilityState`؛ لا زرّ أيقونة بلا `accessibilityLabel`؛ لا نصّ احتياطي ثابت (`?? '…'`) بلغة واحدة.
- `WeeklyReportPanel`: أرقام الدفتر المُرسَلة للنموذج لا تكون `null` حين `trade_count>0` (`db.py` يملأ best/worst/total دائماً) — سليم.
- **لم يُتحقَّق بصرياً**: لا خادم على `:8081` ولا متصفّح بالبيئة.

## 2026-09-26 — تشغيل 115
صفّ واحد بـCOORDINATION (دورة QA 127) موجَّه إلى ui كمنفّذ — **أُنجز**. بوابة البناء خضراء (0) قبل الـcommit.

| commit | ماذا | بند |
|---|---|---|
| 4088536 | `api.ts`: `pair_effect` حُذف من نوع `NewsItem` (الخادم لم يعد يرسله، `53aa55c`)، وتعليق `NewsPanel` عنه أُزيل | backend-r104 |

- بنود المهمّة الأصلية (تحقّق بالكود): اختيار باللون وحده — مسح آلي لكل `Pressable`/`Touchable` بنمط اختيار شرطي بنطاقي ⇒ إصابة واحدة كاذبة (`WatchlistPanel:444` غلاف `accessible={false}`، والزرّ الداخلي يحمل `accessibilityState` وعلامة 2px)؛ «₴» تعليقان فقط؛ «درجة الاتفاق» تعليقات فقط؛ `Alert.alert`/`window.confirm` داخل `chart/confirmDestructive.ts` وحده.
- قرارات أنس ٥/٦/٩/١٠/١٢ (تحقّق بالكود): المحلّلون/الإجماع/الإشارات والأخبار مخفية بكل مدخل (الشريط السفلي، `ToolsScreen`، الحافة، اللوحة الجانبية)؛ الباقات والعمولات والشبكة خلف `SHOW_REFERRAL_AND_PLANS`؛ لا شاشة رسائل؛ توضيح المحاضرة يُعلَم بالعربية للمستخدم الكردي (`clarification_lang`).
- DESIGN-PRO §2: كل ملف بنطاقي يعرض رقماً متغيّراً يستعمل `...numeric`؛ الباقي نصوص ثابتة أو `accessibilityLabel`. §5.4: الشريط السفلي أربعة + «المزيد».
- **لم يُتحقَّق بصرياً**: لا خادم على `:8081` ولا متصفّح بالبيئة.

## 2026-09-26 — تشغيل 116
لا صفّ بـCOORDINATION (دورة QA 128) موجَّه إلى ui كمنفّذ — الصفّان باسم ui (ui-r77 لون الخطأ، ui85a مفتاح Sentry) عند أنس. بوابة البناء خضراء (0) قبل كل commit.

| commit | ماذا | بند |
|---|---|---|
| b54690d | `AlertsPanel`/`IndicatorAlertsPanel`: رقم تسلسل `listSeq` لطلبات القائمة — ردّ فحص الدقيقة البطيء (يطلب المزوّد) كان يصل بعد `refresh` الإضافة/الحذف ويدهسه: التنبيه الجديد يغيب دقيقة، والمحذوف يعود وحذفه ثانيةً 404. الإطلاقات تُعالَج دائماً | قائمة خاطئة |
| 60caca4 | `useMultiLiveTicks`: العودة من الخلفية تكنس التيكات القديمة فوراً (`sweep`) — كانت أسعار ما قبل الخلفية تُعرض حيّةً حتى دورة 5ث التالية، والمقبس «المفتوح» الميت على iOS لا يُستبدل | سعر قديم كحيّ |
| 6f2bf0c | `CalendarPanel`: فشل التحديث الصامت يُظهر سطر «آخر تحديث {time}» (`lastOkRef`) — كانت القائمة تعدّ تنازلياً كأنها حيّة والرقم الفعلي لا يصل أثناء الانقطاع | بيانات قديمة بلا وسم |
| b405b97 | `AccountScreen`: تغيّر المستخدم (خروج/دخول) يمسح الخطأ ونموذج تغيير كلمة المرور — «تعذّر حذف الحساب» كان يظهر تحت نموذج الدخول، وقسم كلمة المرور يبقى مفتوحاً بكلمة المستخدم السابق | خصوصية / حالة سابقة |
| 409d8b6 | `useNotificationPermissionOnResume` (جديد) بالحساب ولوحتي التنبيهات: العودة للواجهة تعيد قراءة الإذن — من فعّله بالإعدادات بقي يرى «مرفوضة» طوال الجلسة؛ والإذن الممنوح حديثاً يسجّل رمز Push | حالة إذن خاطئة |

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» تعليقان فقط؛ `Alert.alert`/`window.confirm` داخل `chart/confirmDestructive.ts` وحده؛ «درجة الاتفاق» تعليقات فقط.
- **لم يُتحقَّق بصرياً ولا على جهاز**: لا خادم على `:8081` ولا متصفّح/جهاز بالبيئة. للـQA/جهاز: إعدادات ⇒ تفعيل الإشعارات ⇒ عودة (يتحوّل السطر إلى «مفعّلة»)؛ إضافة تنبيه أثناء فحص جارٍ (يبقى بالقائمة).

## 2026-09-26 — تشغيل 117
لا صفّ بـCOORDINATION (دورة QA 129) موجَّه إلى ui كمنفّذ — الصفّان باسم ui (ui-r77 لون الخطأ، ui85a مفتاح Sentry) عند أنس. بوابة البناء خضراء (0) قبل الـcommit (وقبل التغيير).

| commit | ماذا | بند |
|---|---|---|
| 4e68681 | `SymbolPairMenu` (منتقي الرمز بالشريط العلوي على سطح المكتب): Esc والنقر خارجه يغلقانه — كان يبقى مفتوحاً فوق الشموع حتى يُنقر الزرّ نفسه ثانيةً (نمط قائمة التخطيط بـ`TerminalScreen` حرفاً بحرف: التقاط، لا يلغي رسماً جارياً). وسم فئة الصفّ المختار («FX»/«Metals») لم يعد بلون التأكيد — الصفّ يحمل التعبئة أصلاً | قرار ١٦ (الويب)، DESIGN-PRO §1 |

- مسح القوائم المنبثقة بنطاقي: لا قائمة أخرى تبقى مفتوحة بلا Esc (ورقة «المزيد» بالشريط السفلي لها زرّ إغلاق، ومنتقي `FocusChartModal` للهاتف وحده، والإضافة بقائمة المتابعة `Modal` بـ`onRequestClose`).
- بنود المهمّة الأصلية (تحقّق بالكود): «₴» تعليقان فقط؛ `Alert.alert`/`window.confirm` داخل `chart/confirmDestructive.ts` وحده (الحساب والدفتر عبره)؛ «درجة الاتفاق» تعليقات فقط؛ «إعادة الجولة» بالحساب، والجولة تُرجَع خطوةً بالنقاط وزرّ الرجوع؛ لا نصّ عربي ثابت يُعرض للكردية بنطاقي (مطالبات التقرير الأسبوعي داخلية، والأكاديمية عربية بقرار ١٢).
- مُلاحَظ ولم يُصلَح: وسوم الفئة بمنتقي الرمز (`FX`/`Index`/`Metals`/`Energy`/`Crypto` من `chart/watchlist.ts`) إنجليزية لكل اللغات — تحتاج مفاتيح ترجمة (launch) أو تُحذف؛ منخفض.
- **لم يُتحقَّق بصرياً**: لا خادم على `:8081` ولا متصفّح بالبيئة. للـQA/الويب: افتح منتقي الرمز ⇒ Esc يغلقه؛ افتحه ⇒ انقر الشارت ⇒ يُغلق والنقرة تصل للشارت.

## 2026-09-26 — تشغيل 118
صفّ واحد بـCOORDINATION (دورة QA 130) موجَّه إلى ui كمنفّذ — **QA130a أُنجز**. بوابة البناء خضراء (0) قبل الـcommit.

| commit | ماذا | بند |
|---|---|---|
| ccbea6a | `SymbolPairMenu` وكتالوج الإضافة بـ`WatchlistPanel`: وسم الفئة يُعرض بمفتاح `focusSymbolGroups` (موجود بالعربية والإنجليزية والكردية ولم يكن مستعملاً) بدل «FX»/«Metals»/«Energy» الإنجليزية، في النصّ و`accessibilityLabel`؛ فئة بلا مفتاح لا تُعرض. مساعد واحد `symbolGroupLabel` للمكانين | QA130a (ترجمة / قارئ صوتي) |

- لا حاجة لمفاتيح جديدة من launch — `focusSymbolGroups` كانت بالملفّ (`locales.ts:1044`). QA130a يُغلق للطرفين.
- بنود المهمّة الأصلية (تحقّق بالكود): «₴» تعليقان فقط؛ «درجة الاتفاق» تعليقات فقط؛ `Alert.alert`/`window.confirm` داخل `chart/confirmDestructive.ts` وحده.
- مسح نصوص JSX الثابتة بنطاقي: لا نصّ بلغة واحدة سوى اسم العلامة «MATRIX».
- **لم يُتحقَّق بصرياً**: لا خادم على `:8081` ولا متصفّح بالبيئة. للـQA: الكردية ⇒ منتقي الرمز يعرض «دراو»/«کانزا»، و«+» بقائمة المتابعة كذلك.

## 2026-09-26 — تشغيل 119
صفّ واحد بـCOORDINATION (دورة QA 131) موجَّه إلى ui كمنفّذ — **tools139a أُنجز**. بوابة البناء خضراء (0) قبل الـcommit.

| commit | ماذا | بند |
|---|---|---|
| cd777f6 | `CalendarPanel`: الحدث «بلا ساعة» يبقى «قادماً» حتى منتصف ليل نيويورك التالي (`unannouncedEndMs` من `chart/newsRisk.ts`) بدل `ts + 24س` — يوما تحويل الساعة (23/25س) كان يبقى ساعةً داخل الاثنين أو يصير «منتهياً» قبل آخر ساعة من الأحد. نهاية الشريط والتقويم واحدة الآن؛ `UNANNOUNCED_SPAN_MS` لم يعد مستورداً هنا | tools139a |

- بنود المهمّة الأصلية (تحقّق بالكود): «₴» تعليقان فقط؛ «درجة الاتفاق» تعليقات فقط؛ `Alert.alert`/`window.confirm` داخل `chart/confirmDestructive.ts` وحده (الحساب والدفتر عبره)؛ «إعادة الجولة» بالحساب (`accReplayTourA11y`)؛ `useMultiLiveTicks` يرفض الأقدم من `TICK_STALE_MS` ويكنس عند العودة للواجهة؛ قائمة المتابعة آخر إغلاق محفوظ بوسمه (`useLastCloses`).
- مسح آلي بنطاقي: كل `Pressable`/`Touchable` بنمط اختيار شرطي (على الزرّ أو على نصّه الداخلي) يحمل `accessibilityState`؛ لا وزن 700 ولا مسافة خارج مضاعفات 4.
- **لم يُتحقَّق بصرياً**: لا خادم على `:8081` ولا متصفّح بالبيئة. للـQA: تقويم يوم أحد 8 مارس/1 نوفمبر — حدث بلا ساعة ينتقل إلى «المنتهية» عند 00:00 نيويورك تماماً.

## 2026-09-26 — تشغيل 120
الصفّ الوحيد الموجَّه إلى ui بـCOORDINATION (دورة QA 131، **tools139a**) منجز سلفاً بـ`cd777f6` (تشغيل 119) — `CalendarPanel.tsx:327` يستعمل `unannouncedEndMs`؛ جاهز للإغلاق. بوابة البناء خضراء (0) قبل كل commit.

| commit | ماذا | بند |
|---|---|---|
| c20b1fe | `KeyboardShortcutsSheet`: القائمة تُفتح بـ«؟» (U+061F) أيضاً — Shift+/ بالتخطيط العربي والكردي يكتب «؟» لا «?»، فلم تكن تُفتح لمن يكتب بلغتَي التطبيق | قرار ١٦ (W4، الويب) |
| 3c09061 | `SymbolSnapshot`: شريحة «MACD ↓» تُعرض — الشريط يعرض تقاطع MACD الصاعد ويُهمل `macd_cross_down` (يرسله `indicators.py:175`) ⇒ فوق الشارت الموسَّع لا تظهر إلا الإشارات الصاعدة | إشارة ناقصة / انحياز |

- ملاحظات أنس على الويب (تحقّق بالكود والتوقيت): الرصيف يختفي بعرض ≥700 (`939830b`، بعد ملاحظته الثانية بدقائق)؛ منتقي التخطيط زرّ واحد (`5d5bf49`)؛ قائمة المتابعة تعرض آخر إغلاق محفوظ بمصدر رأس الشارت نفسه (`useLastCloses` ← `ChartSeries.last`)، و«غير متاح» لـDXY وحده. **تنتظر نظرته.**
- بنود المهمّة الأصلية (تحقّق بالكود): «₴» تعليقان فقط؛ `Alert.alert`/`window.confirm` داخل `chart/confirmDestructive.ts` وحده؛ «درجة الاتفاق» لا أثر لها؛ اختصارات الشارت الحرفية بـ`event.code` (مستقلّة عن التخطيط).
- **لم يُتحقَّق بصرياً**: لا خادم على `:8081` ولا متصفّح بالبيئة. للـQA/الويب: بالتخطيط العربي Shift+/ ⇒ تُفتح قائمة الاختصارات.
