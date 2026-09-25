# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 62، بعد b754eb4) · كل بند تحقّق منه في الكود لا في السجل وحده.
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
| chart | tools (`TerminalScreen.tsx:1346 :1497 :1640-1641`) + backend | **chart-r47 الشارت الرئيسي**: (a) `key` يضمّ `${tool}-${kind}-${lens}-${indicators}` ⇒ اختيار أداة/Heikin/مؤشر يعيد بناء الشارت: التكبير والتمرير للخلف والتراجع والإعادة تضيع ويقفز لـ80 شمعة عند الحافة — `MatrixChart` يطبّق هذه بتأثيرات، فالمفتاح `${symbol}-${tf}` يكفي. (b) أضفتُ `onToolChange` (`942acd7`): إنهاء الرسم يعيد الأداة لـ'none' داخل الشارت والشريط الأيسر يبقى «ترند» مضاءً ونقرها ثانيةً لا تفعل شيئاً — مرّروا `onToolChange={setTool}` **مع (a) معاً** (وإلا كل رسم يعيد البناء). (c) `series ?? offlineFrame(symbol, tf)` يرسم شموع بذرة حول 1.0854 بمحور وسعر حيّ حتى يصل الجلب عند تبديل رمز/فريم خارج الكاش — مؤشّر تحميل كـ`ChartFrame`، و`offlineFrame` لفشل حقيقي فقط. **backend**: `MatrixChart` يتحمّل `candles: []` الآن (`da73ec6`: إشعار المزوّد أو لوح فارغ، لا NaN) | chart-r47 |
| launch | chart (`MatrixChart.tsx` كتلة `candles.length === 0`، `da73ec6`) | **launch119 لوح فارغ صامت**: سلسلة `candles: []` ليست «غير متاح» ⇒ لوح بلا أيّ نصّ. النصّ جاهز: `t.chartNoCandlesTitle` (`{symbol}`، `{tf}`) + `t.chartNoCandlesBody` (ar/en/ku) — اعرضهما بأسلوب `ProviderUnavailableNotice` (العنوان وحده في `dense` إن ضاق) | launch119 |
| tools | launch (`locales.ts` `originUnavailableProvider` ×3، النوع `:1245`) | **tools79**: المستعمل الوحيد كان سطر حالة الطرفية، وصار `t.dsKindUnavailable` (`b1d1adb`) لأن الشارت الرئيسي لم يعد يرسم بذرة DXY — ونصّها «الرسم مولَّد للعرض» لم يعد صادقاً. المطلوب: حذف المفتاح ×3 لغات ونوعه (grep صفر خارج i18n). **ولـbackend**: الشارت الرئيسي بـ`TerminalScreen` يتحمّل الآن `candles: []` مع `unavailable_reason` (إشعار لا شارت) — جزء tools من صفّ backend-r19/ui16b أُنجز | tools79 |

**تحقّق الدورة 62 (بالكود) — أُغلقت 5 صفوف:** chart-r46 ← ui (`a6e048d`، `useTickFreshnessClock.ts:17 :25` `serverNowSec()`)؛ تتمّة tools77 + launch117 ← tools
(`3ab55bf` `OPEN_RISK_UNKNOWN_COPY` grep صفر، `TradeJournalPanel.tsx:810`؛ `cbc8ce6` `editSizeValue` `:993` + selftest)؛ ui16a ← ui (`86a1992`، `ProviderUnavailableNotice.tsx:25-30` `chartNotOfferedTitle/Body`)؛
launch118 ← backend (`f88d36b`، `main.py:1892` لا «DXY» بالقالب)؛ backend-r19 دُمج مع ui16b صفّاً واحداً. لا طلبات جديدة بسجلات chart 46 / tools 78 / launch 118 / ui 16 / backend 20. **المراجعة (b):** لا نصّ ثابت جديد.
