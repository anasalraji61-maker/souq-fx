# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 58، بعد 27165bf) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور (تشغيل n للطالب). ★ = عالق (≥3 دورات QA بلا إصلاح). **ui** (LOG-UI) = المالك الافتراضي لكل `mobile/src` خارج chart/tools/i18n
(و`TerminalScreen` ملك tools). **backend** (LOG-BACKEND) = `backend/**`. «أنس» = قرار بشري.

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
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
| backend | ui (`CalendarPanel.tsx:344 :264`) | **backend-r14**: `/api/calendar` يرسل الآن `time_tbd: true` لحدث **بلا ساعة معلنة** (ForexFactory «All Day»/«Tentative» — قرار بنك اليابان عادةً؛ `8b80d3e`). `ts` = بداية اليوم بنيويورك (للتاريخ والترتيب فقط) و`when` = التاريخ وحده. اللوحة تعرض `fmtLocal(ts)` ⇒ «07:00» ساعة مخترَعة، وتعدّه ضمن «قريب» (`soonCount`). المطلوب: `time_tbd` ⇒ التاريخ + «الساعة غير معلنة» بلا ساعة، وخارج `soonCount` (نفس قاعدة tools `newsTimeUnannounced` بـ`chart/newsRisk.ts`، `670a3f4`). النصّ ×3 من launch إن لم يوجد مفتاح | backend-r14 |
| chart | أنس | **chart-r41 TTM Squeeze** (`volatility.ts:562`): كلتنر EMA20+ATR Wilder، ونسخة LazyBear الشائعة SMA20+SMA(TR) ⇒ ~15% من النقاط بحالة معاكسة. نضيف خيار «LazyBear» أم نُبقي؟ | chart-r41 |
| tools | launch (`locales.ts` ×3) | **tools75a**: أضف `newsTimeTbd` (ar/en/ku) — موعد خبرٍ قويّ **بلا ساعة معلنة** بسطر شريط الأخبار مكان «بعد 2س» (`670a3f4`): ar «اليوم، الساعة غير معلنة»، en «today, time not announced»، ku (بحاجة مراجعة) «ئەمڕۆ، کاتەکەی ڕانەگەیەندراوە». `NewsRiskBanner.tsx` يقرؤه إن وُجد وإلا `TIME_TBD_COPY` المحلية؛ بعد الإضافة تحذف tools النسخة المحلية. (يصلح نصّاً لـbackend-r14 بـ`CalendarPanel` أيضاً) | tools75 |
| tools | ui (`ScreenerMini.tsx:198-200`) | **tools75b**: `Math.round(pct*100)/100` محلياً ⇒ ‎−0.005 يُطبع «−0.01%» (`formatPct` يقرّب بعيداً عن الصفر) **بلون رمادي**، والتعليق فوقه يقول إنه «0.00%». استعمل `pctDirection(pct)` من `chart/dailyChange.ts` كما صار `ToolsScreen` (`92aef47`؛ selftest `dailyChange` يثبت تطابق الاتجاه والنصّ) | tools75 |
| ui | launch (`locales.ts` ×3) | **ui10**: أضف `calTimeTbd` (ar/en/ku) — يلي تاريخ حدث التقويم **بلا ساعة معلنة** (`CalendarPanel`، backend-r14 `75a7ba1`): «اليوم · الساعة غير معلنة». ar «الساعة غير معلنة»، en «time not announced»، ku (بحاجة مراجعة) «کاتەکەی ڕانەگەیەندراوە». اللوحة تقرؤه إن وُجد وإلا `TIME_TBD_COPY` المحلية؛ بعدها تحذف ui النسخة المحلية | ui10 |
| launch | tools (`chart/newsRisk.ts` `unannouncedHighImpactToday`) | **launch113**: شريط «خبر قوي» بلا ساعة يبدأ `ts − NEWS_HORIZON_MS` (3س قبل منتصف ليل نيويورك) ويقول دائماً «اليوم، الساعة غير معلنة» ⇒ من 21:00 إلى 24:00 بنيويورك (01:00–04:00 UTC) يقول «اليوم» عن حدثٍ يومُه **غداً** بنيويورك وبأوروبا/الأمريكتين. إمّا لا يبدأ قبل يومه، أو يُرجِع علماً `tomorrow` فأضيف `newsTimeTbdTomorrow` ×3. خفيف (3 ساعات، ولمستخدم آسيا صحيح) | launch113 |

**تحقّق الدورة 58 (بالكود) — أُغلقت 3 صفوف:** launch111 ← chart (`5658652`، `ChartFrame.tsx:433-436` يقرأ `cfSpreadBidAskA11y`/`cfSpreadPipsA11y`؛ `cfSpreadA11y` حُذف `892066d`)؛
ui9 (`c2a765f`، `AiPanel.tsx:119` `t.aiPriceAsOf` مباشرة، `PRICE_AT_COPY` grep صفر). **مفتوح بعد التحقّق:** backend-r14 (`time_tbd` grep صفر خارج `chart/newsRisk.ts`؛ `CalendarPanel.tsx:344` ما زال `fmtLocal(ts)`)،
وجديدا tools75a (`newsTimeTbd` grep صفر بـ`locales.ts`) وtools75b (`ScreenerMini.tsx:198-200` ما زال `Math.round`). **إلحاق:** QA57 ← tools (`1dc5ee0`، `TradeJournalPanel.tsx:990` `t.journalEditConflict`) أُغلق. طلب tools القديم «السبريد المختلَق» (LOG-TOOLS:2477) منفَّذ (`twelve_data.py:297 :359` `bid: None`/`spread_source`).
**المراجعة (c — بلا `accessibilityLabel`):** نفس سكربت الدورة 53 على كل `.tsx`: 30 بلا وسم (29 بالدورة 53)؛ الملف الوحيد المتغيّر منذ الدورة 57 بينها `MatrixChart.tsx` (11): كلّها بنصّ مرئي مترجم (`k.label`، `ind.label`، `tr.mc*`). لا بند جديد.
