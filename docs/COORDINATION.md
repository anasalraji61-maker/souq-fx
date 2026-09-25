# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 64، بعد 74482af) · كل بند تحقّق منه في الكود لا في السجل وحده.
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
| launch | tools (`TerminalScreen.tsx:964`) / chart (`MatrixChart.tsx:5992-5994`) | **launch120 اسم الفريم الخام** — جزء ui أُنجز (`b8f1569`، `QuadChartModal.tsx:398 :402` تحقّقتُ). باقٍ: `chartFirstLoad`/`chartNoCandlesTitle` تُملأ بـ`{tf}` = `'15m'`/`'D'` ⇒ «على فريم D». النصّ الظاهر `.replace('{tf}', t.tfLabels[tf])`، والـ`accessibilityLabel` بـ`t.tfLabelsA11y[tf]`. في `MatrixChart` `series.timeframe` نصّ ⇒ `isTimeframe(...) ? tr.tfLabels[...] : series.timeframe` | launch120 |
| tools | launch (`i18n/locales.ts`) | **tools80 نصّ تجاوز «نقاطٌ بخانة سعر» بالدفتر**: الحفظ صار يقبل السعر كما كُتب **بضغطة حفظ ثانية** على القيم نفسها (`TradeJournalPanel.tsx` `pipsOverrideRef`) — فضة بيعٌ من 110 بهدف «85» سعرٌ حقيقي بعد هبوط يناير 2026 وكان الحفظ ممنوعاً بلا مخرج. النصّ لا يقول ذلك: أضف `levelLooksLikePipsSaveAgain` (ar/en/ku) مثل «أو اضغط حفظ ثانيةً لإبقاء {value} سعراً» وسأُلحقه بـ`pipsLevel.msg` عند الحفظ | tools80 |
| ui / backend | chart (`MatrixChart.tsx:5998`) / tools (`TerminalScreen.tsx:1510 :1668`) | **ui19 (تتمّة launch120 — عاجل: backend-r22 شُحن `8ff0a7c`)**: `ProviderUnavailableNotice` صار يفرّع `provider_unavailable` ⇒ `chartProviderDown*` (`20e7b46`) لكن عبر prop اختياري `dataSource` — مرّروا `dataSource={series.data_source}` بمواضعكم الثلاثة وإلا يبقى الآن نصّ «غير متاح من المزوّد» الكاذب وقت 429. ui: `api.ts` قُلب (`8025a34`، ui18 مغلق من جهتي، tsc 0)؛ `ChartFrame`/`FocusChartModal`/`QuadChartModal` تمرّره؛ `{tf}` بالرباعي = `tfLabels`/`tfLabelsA11y` (`b8f1569`) | ui19 |
| chart | ui (`DomLitePanel.tsx:68`) | **chart-r48 منازل السبريد**: لرمز بلا مواصفة pip `formatPrice(ask - bid, symbol)` بلا مرجع ⇒ المنازل من حجم السبريد لا السعر: BTCUSD «12.500» بجانب سعر «67420.50»، ETHUSD «1.20000»، USOIL «0.03000». الإصلاح سطر: `formatPriceDiff(quote!.ask! - quote!.bid!, quote!.bid!, symbol)` (`chart/indicators/utils.ts:56`) | chart-r48 |

**تحقّق الدورة 64 (بالكود) — أُغلق 6 صفوف:** chart-r47 ← tools (`093e1b5`، `TerminalScreen.tsx:964 :1516-1521` نصّ `chartFirstLoad` ظاهر)؛ ملاحظة launch119 ← tools (`e86abca`، `offlineFrame` ⇒ `candles: []`)؛
ui18 + backend-r19/ui16 ← chart `4874d20` + ui `8025a34` (`api.ts:98-99` = `number \| null`، tsc 0)؛ backend-r22 ← backend (`8ff0a7c`)؛ launch120 الإشعار ← ui (`20e7b46`، `ProviderUnavailableNotice.tsx:30`) — باقيه صار ui19.
**مفتوح بعد التحقّق:** ui19 **عاجل** (`TerminalScreen.tsx:1510 :1668` و`MatrixChart.tsx:5998` بلا `dataSource` ⇒ EURUSD وقت 429 «غير متاح من المزوّد»)؛ launch120 الفريم (tools/chart)؛ tools80 (grep `levelLooksLikePipsSaveAgain` صفر).
**المراجعة (d — أرقام متناقضة):** حدود الإدخال بالتطبيق = الخادم (1000/2000/500/12/32)؛ الفريمات الثمانية متطابقة (`timeframes.ts` ↔ `twelve_data.py:59-66` ↔ `alert_worker.py:111`)؛
`LIVE_ENTRY_MAX_AGE_MS` 3 د = `LIVE_MAX_AGE` 180 ث. **لا بند جديد.**
