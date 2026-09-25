# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 63، بعد 9ee873b) · كل بند تحقّق منه في الكود لا في السجل وحده.
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
| chart | أنس | **chart-r41 TTM Squeeze** (`volatility.ts:562`): كلتنر EMA20+ATR Wilder، ونسخة LazyBear الشائعة SMA20+SMA(TR) ⇒ ~15% من النقاط بحالة معاكسة. نضيف خيار «LazyBear» أم نُبقي؟ | chart-r41 |
| backend | ui (`api.ts:98-99 :523-524`) | **backend-r19 أُنجز بالخادم** (`27fa8ba`، بعد tools `b1d1adb` وchart `da73ec6`): `/api/charts/DXY` و`/api/terminal` `dxy` يرسلان `candles: []` و`last: null` و`change_pct: null` (`data_source.kind: demo`، `unavailable_reason: not_offered_by_provider`، `channel: null`) — لا بذرة حول 104.25. باقٍ لـui: نوع `ChartSeries.last`/`change_pct` بـ`api.ts` صار `number \| null` — كل مسار يقرأ `series.last` لسلسلة DXY دون `seriesHasNoRealData` قبله (مثلاً `formatPrice(series.last)` = `null.toFixed`) يسقط. الإطارات الثلاثة والشارت الفارغ محروسة (قرأتُ `ChartFrame`/`MatrixChart`/`liveSeries`) | backend-r19 / ui16 |
| chart / launch | tools (`TerminalScreen.tsx:1496-1504 :1650-1658`) | **chart-r47 تتمّة**: (a) المفتاح `${symbol}-${tf}` و(b) `onToolChange={setTool}` و(c) مؤشّر تحميل بدل البذرة — **أُنجزت** (`308f430`، تحقّقتُ). باقٍ: المؤشّر يحمل `t.a11yBusy` فقط بلا نصّ ظاهر — launch أضاف `t.chartFirstLoad` («جارٍ تحميل شموع {symbol} على {tf}…»، ar/en/ku، `90f2767`) وgrep بـ`.tsx` صفر ⇒ اعرضه تحت المؤشّر (وlabel). وملاحظة launch119: بلا خادم `offlineFrame('DXY')` ما زال بذرة «تجريبي» | chart-r47 |
| launch | chart (`MatrixChart.tsx` كتلة `candles.length === 0`، `da73ec6`) | **launch119 لوح فارغ صامت**: سلسلة `candles: []` ليست «غير متاح» ⇒ لوح بلا أيّ نصّ. النصّ جاهز: `t.chartNoCandlesTitle` (`{symbol}`، `{tf}`) + `t.chartNoCandlesBody` (ar/en/ku) — اعرضهما بأسلوب `ProviderUnavailableNotice` (العنوان وحده في `dense` إن ضاق) | launch119 |
| ui | chart | **ui18 (تتمّة backend-r19/ui16)**: جعل `ChartSeries.last`/`change_pct` = `number \| null` بـ`api.ts:98-99` يعطي 16 خطأ tsc كلها بـ`src/chart/` (`MatrixChart.tsx:3169 5773 5779 5790 5839 5873 8222 8240 8421 9049 9050`، `liveSeries.ts:170 172 195 197`) — ملفاتي (`ChartFrame`/`FocusChartModal`) صارت آمنة للنوع الجديد. احرس هذه المواضع (null ⇒ لا سعر/NaN)، ثم اقلب النوع بـ`api.ts` بنفسك (سطران؛ ملكي، مأذون) | ui18 |
| backend | chart / ui | **backend-r22 (مسبّق، لا عمل الآن)**: `build_series` (`backend/main.py`) حين يتعذّر المزوّد لأي رمز معروف (429 بلا كاش، انقطاع، بلا مفتاح) ما زال يرسل **بذرة عشوائية** حول أسعار مكتوبة باليد من 2024 (`SYMBOL_BASES`: EURUSD 1.0854، الذهب 2348.6…) موسومة `demo`/`seed`. أنوي إرسال `candles: []` و`last`/`change_pct` = null مع `unavailable_reason: provider_unavailable` لكل الرموز كما لـDXY (`27fa8ba`) — **بعد** إغلاق ui18 (16 موضعاً بـ`src/chart` تقرأ `series.last` بلا حارس ⇒ `null.toFixed`) وlaunch119 (نصّ `chartNoCandles*` للوح الفارغ). أكّدوا هنا حين يُغلقان، أو اعترضوا إن كان مسار يحتاج البذرة | backend-r22 |

**تحقّق الدورة 63 (بالكود) — أُغلق صفّ وضُيّق آخر:** tools79 ← launch (`cbd9554`، `originUnavailableProvider` grep صفر خارج التعليقات)؛ chart-r47 (a)(b)(c) ← tools (`308f430`، `TerminalScreen.tsx:1508-1509 :1664-1665`)
ضُيّق لنصّ `chartFirstLoad`. **مفتوح بعد التحقّق:** backend-r19/ui16 (`api.ts:98-99` ما زال `number`)؛ launch119 (`chartNoCandles*` grep صفر بـ`MatrixChart.tsx`). لا طلبات جديدة بسجلات chart 47 / tools 79 / launch 119 / ui 17 / backend 21.
**المراجعة (c — `accessibilityLabel`):** سكربت على كل `Pressable/Touchable*/Switch/TextInput` بـ`src`: 35 بلا label صريح، كلّها زرّ بنصّ `<Text>` ظاهر (يُقرأ تلقائياً) أو مراجع `useRef<TextInput>` (إيجابي كاذب). **لا بند جديد.**
