# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 80، على 97eb1c4) · كل بند تحقّق منه في الكود لا في السجل وحده.
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
| backend | أنس | **backend-r33** مصدرا الأخبار ميّتان (`news_feed.py` `FEEDS`: ForexFactory XML ‏403 وليس RSS أصلاً، DailyFX feedburner ‏404) ⇒ لوحة الأخبار فارغة دائماً (الآن موسومة «غير متاح» بصدق). مصدر بديل مرخَّص أم إخفاء اللوحة؟ (مرتبط بـlaunch73؛ التطبيق يعرض «غير متاح» بصدق منذ ui `77e39f2`) | backend-r33 |
| chart | أنس | **chart-r56 Mass Index**: طولنا الافتراضي 25 (Dorsey، مع خطّي «انتفاخ الانعكاس» 27/26.5)؛ TradingView المدمج طوله 10 ⇒ خطّنا ~2.5× خطّ TV (25.6 مقابل 10.3 على البيانات نفسها). نتحوّل إلى 10 كـTV (ويسقط الخطّان أو يُعاد قياسهما) أم نبقى على Dorsey؟ | chart-r56 |
| backend | أنس | **backend-r35** `POST /api/academy/tts` (`main.py:1632`) بلا مصادقة ولا حدّ معدّل، ويقبل 5000 حرف أيّ نصّ ⇒ أيّ أحد يستهلك رصيد ElevenLabs. التطبيق يستدعيه مجهولاً (`LectureClassroom.tsx:255`) فاشتراط الدخول يكسر الأكاديمية للزائر. الخيار: تسجيل دخول، أو حدّ لكل IP/جهاز، أو قصر النصّ على نصوص المحاضرات بالخادم؟ | backend-r35 |
| chart | أنس | **chart-r41 TTM Squeeze** (`volatility.ts:562`): كلتنر EMA20+ATR Wilder، ونسخة LazyBear الشائعة SMA20+SMA(TR) ⇒ ~15% من النقاط بحالة معاكسة. نضيف خيار «LazyBear» أم نُبقي؟ | chart-r41 |
| launch | tools | **launch140** الدفتر بلا زرّ إعادة: فشل التحميل الأول يعرض `journalLoadError` «غادر الدفتر وارجع» (`TradeJournalPanel.tsx:2182`؛ `refresh()` يُستدعى عند التركيب فقط :362). المفاتيح جاهزة ar/en/ku (`218552c`): زرّ `journalRetryBtn` يستدعي `refresh()`، ومعه النصّ `journalLoadErrorRetry` («…ثم اضغط «إعادة المحاولة»») بدل `journalLoadError` | launch140 |
| launch | tools | **launch140b** «pip» على مؤشر/عملة رقمية: منذ `fa1fda2` يُطلق `levelLooksLikePips` لرمز بلا `journalSpec` (US30 وقف «50»)، والدفتر يعرضه بـ`levelLooksLikePipsHint`/`levelLooksLikePipsSaveBlocked` ⇒ «50 pips is 41,950» — المؤشرات بالنقاط. المفاتيح جاهزة ar/en/ku: `levelLooksLikePointsHint`/`levelLooksLikePointsSaveBlocked` (المواضع نفسها) — اخترها حين `journalSpec(sym)` = null (`TradeJournalPanel.tsx` `pipsLevel`، ورسالة منع الحفظ :1062) | launch140 |

**تحقّق الدورة 80 (بالكود، على 97eb1c4):** أُغلق QA79 ← backend `fa0cf42` (`backtest.py:57-68` `closed_candles` بـ`bar_end(symbol, …)`، والكريبتو بلا قصّ؛ اختبار خادم جديد).
سجلات chart 62 / tools 93 / ui 43 / launch 139 / backend 44: بلا طلب تنسيق جديد (tools 93 «تحذير سعرٍ بخانة السبريد على ZARJPY/USDMXN يحتاج مفتاحاً» مرشّح غير مطلوب بعد).
**المراجعة (e — ما يُحرج أمام متداول):** نقاط الارتكاز الخمسة من جلسة 17:00 نيويورك السابقة (`pivotBase.ts`، `period=1`) بصيغها القياسية (كاماريلا 1.1/12…1.1/2، Woodie بافتتاح الجارية،
DeMark الشرطية، فيبو 0.382/0.618/1.0)؛ امتدادات فيبو 127.2%/161.8%؛ اللوت يُقرَّب للأسفل (`positionSize.ts:852`) فلا يتجاوز الخطر المطلوب. **لا بند جديد.**
