# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 57، بعد 59bb26b) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور (تشغيل n للطالب). ★ = عالق (≥3 دورات QA بلا إصلاح). **ui** (LOG-UI) = المالك الافتراضي لكل `mobile/src` خارج chart/tools/i18n
(و`TerminalScreen` ملك tools). **backend** (LOG-BACKEND) = `backend/**`. «أنس» = قرار بشري.

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
| launch | ui (`ChartFrame.tsx:427`) | **launch111**: وسم السبريد برأس الإطار `accessibilityLabel={t.cfSpreadA11y}` ثابت يحلّ محلّ النصّ ⇒ VoiceOver يقول «سبريد البيع والشراء» **بلا أي رقم** (منذ `8aeaf13` يُقرأ منفرداً؛ وبعد `7697f96` الهاتف يعرض الـpip وحده). المفاتيح جاهزة: `cfSpreadBidAskA11y` (`{bid}` `{ask}`، حين يظهر B/A) + `cfSpreadPipsA11y` (`{pips}` = `spreadPips.toFixed(1)`) تُضمّ بـ«، » أو يُستعمل ما يظهر منهما | launch111 |
| QA | chart | **جهاز**: سحب جسم الرسم المحدَّد، وسحب خطّ التنبيه (`AlertDragHandle`) على iOS/Android والويب — RELEASE §5 | QA1 |
| QA | tools / ui | **(a)** تصديرات بلا أي مستعمل (سكربت QA56؛ `9909b91` حذف 10 من 12 — تحقّقتُ grep صفر): باقٍ `getToolPanel` (tools، `tools-panels/registry.ts:53`، لا مستدعٍ حتى بملفه)، و`motion` (`theme.ts:119`، ui: مُبقى عمداً) | QA1 ★ |
| launch | backend/أنس | `openrouter_ai.py:71` «أنت خبير تداول فوركس» ويعطي دخول/وقف/هدف | launch9 ★ |
| QA | backend/أنس | كلمة مرور ≥4 أحرف فقط (`main.py:224`) لحساب مالي | QA24 ★ |
| launch | backend/أنس | قوالب الردّ بلا ذكاء اصطناعي `main.py` تفرّع `en` فقط ⇒ الكردي يُجاب بالعربية (مقصود لغياب مراجعة كردية) | launch77 |
| QA | أنس | الأكاديمية 44 محاضرة عربية فقط (`academy.ts` `name_ar`/`summary`، موسومة بالواجهة والمتجر): ترجمة أم إبقاء؟ | QA27 |
| tools | أنس | «أمس» بقائمة المتابعة 00:00 UTC وPDH/PDL 17:00 نيويورك؛ `dailyChange.ts:34` يغذّي رأس الشارت ⇒ نسبة الرأس تناقض خطّ PDC | tools38 |
| launch | chart/أنس | DeMarker 0..100 والمنصات 0..1 | launch48 |
| launch | أنس | `MessagesScreen` غير مستوردة (وحدها تستعمل `mockPeers`؛ `api.ts` `from_user: 'أنت'` ثابت؛ و`accessibilityLabel="رسالة خاصة"` ثابت :142) — حذف أم ربط؟ | launch52 |
| launch | أنس | ترخيص مصادر البيانات (ForexFactory/DailyFX/Twelve Data) قبل الرفع (`RELEASE-MOBILE.md` §0) | launch73 |
| backend | أنس | **قرارات اتخذها backend (لأنس عكسها)**: التعادل مستثنى من نسبة الفوز؛ DXY «غير متاح» بدل حسابه من السلّة؛ حذف ميزة «البنوك» | backend-r1 |
| backend | أنس | **backend-r6 (6) العمولات** (لم يُغيَّر): `db.py` يدفع مكافأة التوازن 5% عند **أي** تساوٍ (1=1، 3=3) بينما نصّ الخطة (`commissions.py:84`) «عند مستوى مؤهل» (2،4،8…) — أيّهما القاعدة؟ والتسجيل بإحالة يزيد العدّاد بلا سطر عمولة؛ والشهر بتوقيت الخادم المحلي لا UTC | backend-r6 |
| ui | ui (`AiPanel.tsx:23 :54-56`) | **ui9**: `aiPriceAsOf` أُضيف ×3 (`2109fdc`، launch) و`AiPanel.tsx:54` يقرؤه ⇒ يعمل. باقٍ على ui: حذف النسخة المحلية `PRICE_AT_COPY` (:23) وتحويل `(t as Partial<…>).aiPriceAsOf ??` إلى `t.aiPriceAsOf` مباشرة | ui9 |
| backend | ui (`CalendarPanel.tsx:324 :344 :264`) | **backend-r14**: `/api/calendar` يرسل الآن `time_tbd: true` لحدث **بلا ساعة معلنة** (ForexFactory «All Day»/«Tentative» — قرار بنك اليابان عادةً؛ `8b80d3e`). `ts` = بداية اليوم بنيويورك (للتاريخ والترتيب فقط) و`when` = التاريخ وحده. اللوحة تعرض `fmtLocal(ts)` ⇒ «07:00» ساعة مخترَعة، وتعدّه ضمن «قريب» (`soonCount`). المطلوب: `time_tbd` ⇒ التاريخ + «الساعة غير معلنة» بلا ساعة، وخارج `soonCount` (نفس قاعدة tools `newsTimeUnannounced` بـ`chart/newsRisk.ts`، `670a3f4`). النصّ ×3 من launch إن لم يوجد مفتاح | backend-r14 |

| chart | أنس | **chart-r41 TTM Squeeze** (`volatility.ts:562`): كلتنر EMA20+ATR Wilder، ونسخة LazyBear الشائعة SMA20+SMA(TR) ⇒ ~15% من النقاط بحالة معاكسة. نضيف خيار «LazyBear» أم نُبقي؟ | chart-r41 |
| QA | tools (اختياري، `TradeJournalPanel.tsx:983`) | **QA57** (من backend run 13 `14d6474`): PATCH صفقة يسابق إغلاقاً يعيد الآن 409 `trade_changed_concurrently` — التطبيق يعرض `journalEditError` العامّ («تعذّر الحفظ») بلا سبب. البيانات سليمة (الخروج لا يُمحى)؛ الأوضح: `refresh()` + رسالة «أُغلقت بجهاز آخر» كمسار الإغلاق (:1121). **launch112: المفتاح جاهز** `t.journalEditConflict` (ar/en/ku، خطأ الخانة `setFormError`) — يُعرض حين `detail.error === 'trade_changed_concurrently'` بعد `refresh()` | QA57 |
| tools | launch (`locales.ts` ×3) | **tools75a**: أضف `newsTimeTbd` (ar/en/ku) — موعد خبرٍ قويّ **بلا ساعة معلنة** بسطر شريط الأخبار مكان «بعد 2س» (`670a3f4`): ar «اليوم، الساعة غير معلنة»، en «today, time not announced»، ku (بحاجة مراجعة) «ئەمڕۆ، کاتەکەی ڕانەگەیەندراوە». `NewsRiskBanner.tsx` يقرؤه إن وُجد وإلا `TIME_TBD_COPY` المحلية؛ بعد الإضافة تحذف tools النسخة المحلية. (يصلح نصّاً لـbackend-r14 بـ`CalendarPanel` أيضاً) | tools75 |
| tools | ui (`ScreenerMini.tsx:198-200`) | **tools75b**: `Math.round(pct*100)/100` محلياً ⇒ ‎−0.005 يُطبع «−0.01%» (`formatPct` يقرّب بعيداً عن الصفر) **بلون رمادي**، والتعليق فوقه يقول إنه «0.00%». استعمل `pctDirection(pct)` من `chart/dailyChange.ts` كما صار `ToolsScreen` (`92aef47`؛ selftest `dailyChange` يثبت تطابق الاتجاه والنصّ) | tools75 |

**تحقّق الدورة 57 (بالكود) — أُغلق صفّان:** launch110 ← ui (`notifications.ts:40` التعليق يقول «فوراً» عبر `setLang` ⇒ `ensureAlertChannel(true)`)؛
backend-r12 ← ui (`095954f`، `AiPanel.tsx:82-83` يقرأ `res.price_as_of`، `api.ts:875`). QA1 (a) ضُيِّق من 12 إلى 2 (`9909b91`، grep لكل اسم: صفر). باقٍ: launch111 (`ChartFrame.tsx:427` ما زال `t.cfSpreadA11y`).
**المراجعة (b — نصوص ثابتة):** grep للعربي خارج التعليقات و`locales.ts`/selftests، ولـ`label/placeholder/title="…"` و`>Text<`: لا جديد يُعرض. المعروف: `academy.ts` (QA27)، `MessagesScreen`/`mock.ts`/`api.ts:882` (launch52)،
`PRICE_AT_COPY` (ui9، مؤقّت). احتياطات `chart/types.ts` (`CHART_KINDS` إلخ) كل مستدعٍ يمرّر الترجمة؛ «Log» بزرّ المقياس و`placeholder="EURUSD"` مصطلحات عالمية؛ الـregex بـ`positionSize`/`parseDecimal` مدخلات لا عرض.
