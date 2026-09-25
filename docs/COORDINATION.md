# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 60، بعد 9c8e741) · كل بند تحقّق منه في الكود لا في السجل وحده.
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
| chart | أنس | **chart-r41 TTM Squeeze** (`volatility.ts:562`): كلتنر EMA20+ATR Wilder، ونسخة LazyBear الشائعة SMA20+SMA(TR) ⇒ ~15% من النقاط بحالة معاكسة. نضيف خيار «LazyBear» أم نُبقي؟ | chart-r41 |
| backend | tools (`ToolsScreen.tsx:479`، `TradeJournalPanel.tsx:986`) | **backend-r17**: **(a)** كل نتيجة `/api/screener/run` تحمل `price_as_of` (`6075f9d`). `ScreenerMini` أُنجز (`dd93383`)؛ **الماسح الكامل بـ`ToolsScreen` (ملك tools) لا يقرؤه** (grep صفر) ⇒ نتيجة السبت من إغلاق الجمعة بلا وقت. المفتاح جاهز `t.screenerPriceAsOf` «إغلاق {time}» (`9e9ad12`). **(b)** PATCH بـ`size: null` يمسح الحجم (`4f6356a`)؛ تعليق `:986` «الحقل إلزامي» لم يعد صحيحاً ولا خيار «حجم غير معروف» | backend-r17 |
| ui | ui (`ScreenerMini.tsx:17 :213`) | **ui11**: launch أضاف `screenerPriceAsOf` ×3 (`9e9ad12`؛ ar «إغلاق {time}» لأن «حتى» تُقرأ «إلى أن») ⇒ احذفوا `AS_OF_COPY` المحلية (ما زالت «حتى {time}») واقرؤوا `t.screenerPriceAsOf` | ui14 |
| QA | launch/أنس | **QA60 (e)**: عنوان لوحة الإجماع `socialTitle` «المعدل التقريبي **للتوصيات** والصفقات» / «…of **tips** & trades» (`locales.ts:1475/2642/3834`) يظهر بالشريط السفلي والأدوات (`SocialConsensusPanel.tsx:183`)، وقاعدة `STORE-LISTING.md:9` تمنع كلمة «توصيات». المقترح: «متوسّط آراء القنوات» — واللوحة كلّها فارغة (قرار ⛔ 3 لأنس) | QA60 |
| tools | launch (`locales.ts`) | **tools77a**: مفتاح `journalOpenRiskUnknown` (ar/en/ku، `{n}`) — سبب غياب «المخاطرة (مفتوحة)» حين بين المفتوحة صفقة بحجم مجهول أو أداة بلا عقد (BTCUSD، US30). الشاشة تقرؤه إن وُجد، وإلا نسخة محلية `OPEN_RISK_UNKNOWN_COPY` (`TradeJournalPanel.tsx`) — انسخها كما هي والكردي بحاجة مراجعة | tools77 |

**تحقّق الدورة 60 (بالكود) — أُغلقت 3 صفوف:** backend-r15a + launch114 ← ui (`22715cb`، `BacktestPanel.tsx:146-155`: كل طرف وحده، كلاهما null ⇒ لا سطر)؛
backend-r16 ← ui (`4f1ea41`، `IndicatorForecastPanel.tsx:126 :171` `t.forecastPriceAsOf` حين >5د). ui11: جزء launch منفَّذ (`9e9ad12`) ⇒ الصفّ انتقل لـui.
لا طلبات تنسيق جديدة بسجلات chart 44 / tools 76 / launch 115 / ui 14 / backend 17 غير backend-r17 وui11. **المراجعة (e):** QA60 (كلمة «توصيات»). حجم الـpip موحّد (`positionSize.ts` وحده)، والاختبار الخلفي يخصم السبريد.
