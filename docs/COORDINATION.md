# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 67، بعد 4b37c0e) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور (تشغيل n للطالب). ★ = عالق (≥3 دورات QA بلا إصلاح). **ui** (LOG-UI) = المالك الافتراضي لكل `mobile/src` خارج chart/tools/i18n
(و`TerminalScreen` ملك tools). **backend** (LOG-BACKEND) = `backend/**`. «أنس» = قرار بشري.

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
| QA | chart | **جهاز**: سحب جسم الرسم المحدَّد، وسحب خطّ التنبيه (`AlertDragHandle`) على iOS/Android والويب — RELEASE §5 | QA1 |
| QA | tools | **(a)** بقيّة الميت: `TerminalScreen.tsx:758-759` `emptySlot` ما زال يبني من `mockSeries(...)` ثم يفرّغ `candles` ⇒ آخر استيراد لـ`mock` بالطرفية (`:21`) يحمل `last`/`change_pct` 2024 بسلسلة فارغة (غير معروض، الفارغ يُسقَط) — البديل `serverUnreachableSeries(symbol, secTf)`. (`registry.ts` حذفه ui `845546a`؛ `motion` مُبقى عمداً؛ `MessagesScreen` = launch52) | QA1 ★ |
| launch | backend/أنس | `openrouter_ai.py:71` «أنت خبير تداول فوركس» — **الصياغة فقط** باقية (المستويات صارت من الخادم أو لا شيء، `866737b`؛ تعليق :74 «قرار أنس») | launch9 ★ |
| QA | backend/أنس | كلمة مرور ≥4 أحرف فقط (`main.py:224`) لحساب مالي | QA24 ★ |
| launch | backend/أنس | قوالب الردّ بلا ذكاء اصطناعي `main.py` تفرّع `en` فقط ⇒ الكردي يُجاب بالعربية (مقصود لغياب مراجعة كردية) | launch77 |
| QA | أنس | الأكاديمية 44 محاضرة عربية فقط (`academy.ts` `name_ar`/`summary`، موسومة بالواجهة والمتجر): ترجمة أم إبقاء؟ | QA27 |
| tools | أنس | «أمس» بقائمة المتابعة 00:00 UTC وPDH/PDL 17:00 نيويورك؛ `dailyChange.ts:34` يغذّي رأس الشارت ⇒ نسبة الرأس تناقض خطّ PDC | tools38 |
| launch | chart/أنس | DeMarker 0..100 والمنصات 0..1 | launch48 |
| launch | أنس | `MessagesScreen` غير مستوردة (وحدها تستعمل `mockPeers`؛ `api.ts` `from_user: 'أنت'` ثابت؛ و`accessibilityLabel="رسالة خاصة"` ثابت :142) — حذف أم ربط؟ | launch52 |
| launch | أنس | ترخيص مصادر البيانات (ForexFactory/DailyFX/Twelve Data) قبل الرفع (`RELEASE-MOBILE.md` §0) | launch73 |
| backend | أنس | **قرارات اتخذها backend (لأنس عكسها)**: التعادل مستثنى من نسبة الفوز؛ DXY «غير متاح» بدل حسابه من السلّة؛ حذف ميزة «البنوك» | backend-r1 |
| backend | أنس | **backend-r6 (6) العمولات** (لم يُغيَّر): `db.py` يدفع مكافأة التوازن 5% عند **أي** تساوٍ (1=1، 3=3) بينما نصّ الخطة (`commissions.py:84`) «عند مستوى مؤهل» (2،4،8…) — أيّهما القاعدة؟ والتسجيل بإحالة يزيد العدّاد بلا سطر عمولة؛ والشهر بتوقيت الخادم المحلي لا UTC  **backend-r25 إضافة (لم يُغيَّر، قاعدة مال)**: التسجيل بـ`sponsor_code` لا يفحص إن كانت الساق مشغولة (`place` يفحص) ⇒ عضوان مباشران يساراً ثم `place` يساراً يُرفض؛ والراعي يمنح من يضعه أي دور حتى `company` (`PlaceMemberBody.role`). التسجيل الذاتي بدور غير `trader` صار 422 (`06ea3ab`). وسؤال للإشارات: تنبيه تقاطع MA/MACD والماسح يُطلقان على الشمعة **غير المغلقة** (تنبيه لمرة واحدة قد يُطلق على تقاطع يزول بالإغلاق) — عند الإغلاق فقط كـ«Once per bar close» أم كما هو؟ | backend-r6 |
| chart | أنس | **chart-r41 TTM Squeeze** (`volatility.ts:562`): كلتنر EMA20+ATR Wilder، ونسخة LazyBear الشائعة SMA20+SMA(TR) ⇒ ~15% من النقاط بحالة معاكسة. نضيف خيار «LazyBear» أم نُبقي؟ | chart-r41 |

| launch | tools (`PositionSizePanel.tsx:1414`) | **launch125 مثال خانة النقاط على الأزواج الناشئة**: `input(slPips, …, '20', …)` ثابت ⇒ على USDZAR/USDTRY/USDMXN (وقفها بالمئات، `EXOTIC_PIP_QUOTES` من `7caf5c5`) يوحي الـplaceholder بوقف 20 pip = 0.0020 داخل السبريد ⇒ لوت أكبر ×50–75. المقترح: مثال بحسب `spec.quote` (مثلاً '20' للرئيسيات والين والذهب، '1500' حين `EXOTIC_PIP_QUOTES.has(spec.quote)` — يحتاج تصدير المجموعة أو دالة `typicalSlPipsExample(spec)`). نصّ التحذير `riskCalcSlLooksLikePrice` صار بلا رقم من جهتي | launch125 |
| backend | ui (`CalendarPanel.tsx:184`) | **backend-r27 (اختياري) وقت التقويم المحفوظ**: ui `755670f` يعرض `newsStale` حين `stale` (تحقّقتُ)؛ الباقي سطر «آخر تحديث HH:MM» — **النصّ جاهز**: `t.calStaleAsOf` بـ`{time}` (launch `2bad9e0`، ar/en/ku) ولا مستعمل له (grep صفر خارج `locales.ts`). `as_of` ثوانٍ UTC رقماً | backend-r27 |

tools81 RSS ← backend `eb8435e` (`econ_calendar.py:103-112` `ts: None`، `time_tbd`)؛ launch123 ← tools `a9aa402` (`TradeJournalPanel.tsx:980`) + launch `a1277b5` (grep `levelLooksLikePipsSaveAgain` صفر)؛
| launch | backend (`alert_worker.py:216-217`) | **launch126 (صياغة، صغير)**: إشعار السعر العربي «EURUSD ▲ عند أو فوق 1.1000» تركيب مترجَم (حرفا جرّ على اسم واحد). الأصحّ «EURUSD ▲ عند 1.1000 أو فوقه» / «▼ عند 1.1000 أو تحته» — المعنى نفسه (≥/≤). الإنجليزي سليم. واجهة التنبيهات صارت تقول الشيء نفسه (`alertsSub`، launch `199d703`) | launch126 |
| QA | chart (+launch للنصّ) | **QA67 (b، صغير)**: زرّ ركن محور السعر `MatrixChart.tsx:9303` نصّه `AUTO` إنجليزي ثابت بالواجهة العربية والكردية (الـlabel مترجم `mcAutoA11y`). مفتاح `mcAutoShort` أو إبقاؤه عمداً كرمز منصّات — قرار chart · **النصّ جاهز** (launch125): `t.mcAutoShort` = «تلقائي» / `AUTO` / «خۆکار» — يكفي استبدال الحرفية؛ انتبه أن الخطّ 8 صغير للعربية | QA67 |

**تحقّق الدورة 67 (بالكود، بعد 4b37c0e) — أُغلق صفّان وجزء:** chart-r50 ← ui `962aced` (`FocusChartModal.tsx:22 :569 :572-573` `COMPARE_COLOR`)؛ launch124 ← ui `db4c51f`
(`LectureClassroom.tsx:223` يعود حين `lectureFallback`، وهو بالاعتماديات `:234`)؛ QA1 جزء ui ← `845546a` (`modules/tools-panels/` غير موجود). launch125 مفتوح (`:1414` `'20'`).
**المراجعة (b — نصوص ثابتة):** grep لكل حرفية عربية/إنجليزية بـ`mobile/src` خارج `locales.ts`: الظاهر فعلاً `MessagesScreen` (launch52) و`AUTO` (QA67) فقط.
الباقي احتياطيّ خلف القاموس (`chart/types.ts` ⇐ `typeLabels.ts`؛ `dataSource.ts`/`marketHours.ts`/`measureReadout.ts` تسميات بديلة؛ `DEFAULT_LAYOUT.name` ⇐ `layoutBuiltinName`)، أو مفاتيح مطابقة لنصّ الخادم (`CommissionPlanPanel.tsx:41-57`)، أو موجّهات AI (`WeeklyReportPanel`، اللغة بـ`lang`).
