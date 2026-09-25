# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 72، بعد deecbe9) · كل بند تحقّق منه في الكود لا في السجل وحده.
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
| backend | أنس | **backend-r6 (6) العمولات** (لم يُغيَّر): `db.py` يدفع مكافأة التوازن 5% عند **أي** تساوٍ (1=1، 3=3) بينما نصّ الخطة (`commissions.py:84`) «عند مستوى مؤهل» (2،4،8…) — أيّهما القاعدة؟ والتسجيل بإحالة يزيد العدّاد بلا سطر عمولة؛ والشهر بتوقيت الخادم المحلي لا UTC  **backend-r25 إضافة (لم يُغيَّر، قاعدة مال)**: التسجيل بـ`sponsor_code` لا يفحص إن كانت الساق مشغولة (`place` يفحص) ⇒ عضوان مباشران يساراً ثم `place` يساراً يُرفض؛ والراعي يمنح من يضعه أي دور حتى `company` (`PlaceMemberBody.role`). التسجيل الذاتي بدور غير `trader` صار 422 (`06ea3ab`). وسؤال للإشارات: تنبيه تقاطع MA/MACD والماسح يُطلقان على الشمعة **غير المغلقة** (تنبيه لمرة واحدة قد يُطلق على تقاطع يزول بالإغلاق) — عند الإغلاق فقط كـ«Once per bar close» أم كما هو؟ (backend `95c7ad0` أسقط التقاطع الأقدم من التسليح فقط؛ سؤال الشمعة الجارية باقٍ) | backend-r6 |
| backend+launch | ui | **backend-r33 + launch132** `/api/news` يحمل `status: "ok"\|"unavailable"` و`as_of` و`stale` (`acace1d`)؛ المصدران ميّتان اليوم ⇒ `NewsPanel.tsx:43-48` يعرض «لا توجد أخبار حالياً» (`t.newsEmpty`) — كذب على المتداول. المفتاحان جاهزان ar/en/ku (`deecbe9`، `locales.ts:1536-1537`): `t.newsSourceUnavailable` لـ`status === 'unavailable'`، و`t.newsStaleAsOf` (`{time}` = `formatLocalStamp(as_of, lang)`) لـ`stale: true` فوق العناوين. المطلوب: `NewsPanel.tsx` + نوع `api.news()` (الحقول اختيارية؛ خادم أقدم = السلوك الحالي). تحقّقتُ: grep `status`/`stale` بـ`NewsPanel.tsx` صفر | backend-r33 |
| backend | أنس | **backend-r33** مصدرا الأخبار ميّتان (`news_feed.py` `FEEDS`: ForexFactory XML ‏403 وليس RSS أصلاً، DailyFX feedburner ‏404) ⇒ لوحة الأخبار فارغة دائماً (الآن موسومة «غير متاح» بصدق). مصدر بديل مرخَّص؟ (مرتبط بـlaunch73) | backend-r33 |
| chart | أنس | **chart-r41 TTM Squeeze** (`volatility.ts:562`): كلتنر EMA20+ATR Wilder، ونسخة LazyBear الشائعة SMA20+SMA(TR) ⇒ ~15% من النقاط بحالة معاكسة. نضيف خيار «LazyBear» أم نُبقي؟ | chart-r41 |

**تحقّق الدورة 72 (بالكود، بعد deecbe9):** أُغلق launch131 ← ui `76b2256` (`api.ts:148`، `academy.ts:14` `progress: number | null`).
دُمج backend-r33 وlaunch132 بصفّ واحد (الطلب نفسه لـui). سجلات chart 55 / tools 87 / ui 30: بلا طلب جديد. backend 33: صفّ الأخبار فقط.
**المراجعة (b — نصوص ثابتة):** مسح `mobile/src` (JSX، `placeholder`/`accessibilityLabel`، حرفيات عربية خارج التعليقات، `throw new Error`): لا جديد —
`MessagesScreen` (launch52)، `mock.ts` (launch52)، `academy.ts` (QA27)، مرادفات العملات بـ`positionSize.ts:925-934` (محلّل إدخال لا نصّ عرض)؛ رسائل `Error` لا تُعرض (تُستبدل بنصّ مترجم).
