# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 61، بعد 99e365e) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور (تشغيل n للطالب). ★ = عالق (≥3 دورات QA بلا إصلاح). **ui** (LOG-UI) = المالك الافتراضي لكل `mobile/src` خارج chart/tools/i18n
(و`TerminalScreen` ملك tools). **backend** (LOG-BACKEND) = `backend/**`. «أنس» = قرار بشري.

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
| QA | chart | **جهاز**: سحب جسم الرسم المحدَّد، وسحب خطّ التنبيه (`AlertDragHandle`) على iOS/Android والويب — RELEASE §5 | QA1 |
| QA | tools / ui | **(a)** تصديرات بلا أي مستعمل (سكربت QA56؛ `9909b91` حذف 10 من 12 — تحقّقتُ grep صفر): باقٍ `getToolPanel` (tools، `tools-panels/registry.ts:53`، لا مستدعٍ حتى بملفه)، و`motion` (`theme.ts:119`، ui: مُبقى عمداً) | QA1 ★ |
| launch | backend/أنس | `openrouter_ai.py:71` «أنت خبير تداول فوركس» — **الصياغة فقط** باقية (المستويات صارت من الخادم أو لا شيء، `866737b`؛ تعليق :74 «قرار أنس») | launch9 ★ |
| QA | backend/أنس | كلمة مرور ≥4 أحرف فقط (`main.py:224`) لحساب مالي | QA24 ★ |
| launch | backend/أنس | قوالب الردّ بلا ذكاء اصطناعي `main.py` تفرّع `en` فقط ⇒ الكردي يُجاب بالعربية (مقصود لغياب مراجعة كردية) | launch77 |
| QA | أنس | الأكاديمية 44 محاضرة عربية فقط (`academy.ts` `name_ar`/`summary`، موسومة بالواجهة والمتجر): ترجمة أم إبقاء؟ | QA27 |
| tools | أنس | «أمس» بقائمة المتابعة 00:00 UTC وPDH/PDL 17:00 نيويورك؛ `dailyChange.ts:34` يغذّي رأس الشارت ⇒ نسبة الرأس تناقض خطّ PDC | tools38 |
| launch | chart/أنس | DeMarker 0..100 والمنصات 0..1 | launch48 |
| launch | أنس | `MessagesScreen` غير مستوردة (وحدها تستعمل `mockPeers`؛ `api.ts` `from_user: 'أنت'` ثابت؛ و`accessibilityLabel="رسالة خاصة"` ثابت :142) — حذف أم ربط؟ | launch52 |
| launch | أنس | ترخيص مصادر البيانات (ForexFactory/DailyFX/Twelve Data) قبل الرفع (`RELEASE-MOBILE.md` §0) | launch73 |
| backend | أنس | **قرارات اتخذها backend (لأنس عكسها)**: التعادل مستثنى من نسبة الفوز؛ DXY «غير متاح» بدل حسابه من السلّة؛ حذف ميزة «البنوك» | backend-r1 |
| backend | أنس | **backend-r6 (6) العمولات** (لم يُغيَّر): `db.py` يدفع مكافأة التوازن 5% عند **أي** تساوٍ (1=1، 3=3) بينما نصّ الخطة (`commissions.py:84`) «عند مستوى مؤهل» (2،4،8…) — أيّهما القاعدة؟ والتسجيل بإحالة يزيد العدّاد بلا سطر عمولة؛ والشهر بتوقيت الخادم المحلي لا UTC | backend-r6 |
| chart | ui (`hooks/useTickFreshnessClock.ts:15 :23`) | **chart-r46 ساعة الخادم**: أضفتُ `serverNowSec()` بـ`chart/dataSource.ts` (يقدّر فرق ساعة الجهاز من `ts` بكل دفعة `/ws/ticks`) وصارت قرارات التيك بالشارت عليه. الخطّاف ما زال يعيد `Date.now()` ويحسب `remainMs` بساعة الجهاز ⇒ شارة «حي» برأس `TerminalScreen` و`FocusChartModal` تغيب على جهاز متقدّم >15ث وتبقى أطول على متأخّر. المطلوب: `Date.now() / 1000` ⇒ `serverNowSec()` بالسطرين (والإرجاع `serverNowSec() * 1000`) | chart-r46 |
| chart | أنس | **chart-r41 TTM Squeeze** (`volatility.ts:562`): كلتنر EMA20+ATR Wilder، ونسخة LazyBear الشائعة SMA20+SMA(TR) ⇒ ~15% من النقاط بحالة معاكسة. نضيف خيار «LazyBear» أم نُبقي؟ | chart-r41 |
| tools + launch | tools (`TradeJournalPanel.tsx:141 :820 :1003-1004`) | **تتمّة tools77 (a)(b)**: الطرفان الآخران أُنجزا — `journalOpenRiskUnknown` ×3 (`5fda82c`، `locales.ts:1818/2986/4185`) و`api.updateTrade` `size?: number \| null` (`d918a7f`، `api.ts:810`). باقٍ لـtools: حذف `OPEN_RISK_UNKNOWN_COPY` والقراءة المشروطة `:820`، وإرسال `size: null` لخانة حجم مُسحت بالتعديل (التعليق `:1003-1004` ما زال «ملك ui… طلب tools77b») | tools77 / launch117 |
| backend | chart / ui (`TerminalScreen.tsx:1698-1712`، `ChartFrame`) | **backend-r19 خانة DXY**: `/api/terminal` `dxy` (و`/api/charts/DXY`) = سلسلة البذرة `demo` حول 104.25 دائماً — المزوّد لا يقدّم DXY أبداً (`unavailable_reason: not_offered_by_provider`). السطر يقول «غير متاح» (`:956-959`) لكن الخانة ما تزال ترسم شموعاً وسعراً مولَّدين. المطلوب: لا شموع ولا سعر لهذا السبب (رسالة «غير متاح لدى المزوّد» مكان الشارت). حين يتحمّل `ChartFrame`/`MatrixChart` سلسلة فارغة أخبروا backend فيرسل `candles: []` لهذه الرموز. **النصّ جاهز** (launch118): `t.chartNotOfferedTitle` (`{symbol}`) + `t.chartNotOfferedBody` بالثلاث | backend-r19 |

**تحقّق الدورة 61 (بالكود) — أُغلقت 6 صفوف:** backend-r17 (a) ← tools (`9ad2dfb`، `ToolsScreen.tsx:794-797` `t.screenerPriceAsOf`)؛ backend-r18 ← ui (`c90822c`، `NewsPanel.tsx:22 :95`، `api.ts:132`)؛
ui11 ← ui (`a0f67d1`، `AS_OF_COPY` grep صفر)؛ QA60 ← launch (`99e365e`، `socialTitle` «متوسّط آراء القنوات» `locales.ts:1481/2650/3844`)؛ tools77a ← launch؛ tools77b ← ui ⇒ الباقي صفّ «تتمّة tools77».
launch9 ضُيّق للصياغة (اقتراح launch 116، تحقّقتُ `openrouter_ai.py:71-74`). لا طلبات تنسيق جديدة بسجلات chart 45 / tools 77 / launch 116 / ui 15 / backend 18. **المراجعة (a):** 0 تكرار، الميتان نفسهما (QA1 (a)).
