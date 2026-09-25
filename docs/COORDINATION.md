# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 68، بعد 094079a) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور (تشغيل n للطالب). ★ = عالق (≥3 دورات QA بلا إصلاح). **ui** (LOG-UI) = المالك الافتراضي لكل `mobile/src` خارج chart/tools/i18n
(و`TerminalScreen` ملك tools). **backend** (LOG-BACKEND) = `backend/**`. «أنس» = قرار بشري.

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
| QA | chart | **جهاز**: سحب جسم الرسم المحدَّد، وسحب خطّ التنبيه (`AlertDragHandle`) على iOS/Android والويب — RELEASE §5 | QA1 |
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

**تحقّق الدورة 68 (بالكود، بعد 094079a) — أُغلقت 5 صفوف:** QA1 (a) ← tools `9640d80` (`TerminalScreen.tsx:763` `emptySlot` = `serverUnreachableSeries`، لا `mockSeries` خارج التعليقات)؛
launch125 ← tools `c277ee2` (`PositionSizePanel.tsx:1416` `typicalSlPipsExample(spec)`، والسبريد `:1533` `a43e8b0`)؛ backend-r27 ← ui `6d8a467` (`CalendarPanel.tsx:416` `t.calStaleAsOf`)؛
QA67 ← chart `094079a` (`MatrixChart.tsx:9404` `tr.mcAutoShort`)؛ launch126 ← backend `a58fed3` (`alert_worker.py:218` «عند {p} أو فوقه/تحته»). طلب chart `mcEstimatedTag` موجود (`locales.ts:2322`، مستعمل `:9474`).
**المراجعة (c — `accessibilityLabel`):** 36 عنصراً بلا label صريح: 27 بابن `<Text>` ظاهر، 6 `useRef<TextInput>`، خلفية `MatrixSidePanel.tsx:79` (`accessible={false}` مقصود)، ملاحظة الدفتر `:2013` (label `:2028`)، و`MessagesScreen` (launch52). **لا بند جديد.**
