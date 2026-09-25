# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 78، على 7d5a4d2) · كل بند تحقّق منه في الكود لا في السجل وحده.
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
| chart | chart | **chart-r60** زرّ «إعادة» للجوال بجانب «تراجع» بشريط الرسم: المفاتيح وصلت (launch `93a3177`: `mcRedo`/`mcRedoA11y`/`mcNothingToRedo`، ar/en/ku) ولا مستهلك بعد بـ`.tsx` — الإعادة بلوحة المفاتيح على الويب فقط حتى يُربط | chart-r60 |
| tools | ui | **tools92** `MatrixBottomDock.tsx:210`: مرّر `chartBannerVisible` لـ`<TradeJournalPanel defaultSymbol={symbol} chartBannerVisible />` — الرصيف مدمج وشريط أخبار الشارت ظاهر بجانبه فيُحذف التحذير المكرَّر (QA38). بلاها يظهر تحذير «صفقاتك المفتوحة» مكرَّراً بالرصيف (آمن، مزعج فقط). **لا تمرّرها** بـ`MatrixSidePanel.tsx:198`: اللوح نافذة فوق الشارت تغطّي شريطه — كان هذا يُخفي تحذير NFP عن الصفقات المفتوحة كلياً | tools92 |
| chart | ui | **chart-r61** `hooks/useMultiLiveTicks.ts:116,132` (يغذّي إطارات الشاشة الرئيسية الأربعة والرباعي): مقبس عالق بالمصافحة (`CONNECTING`، شبكة خلوية ضعيفة/بوّابة Wi-Fi) لا يُترك أبداً — `lastHeardAt` يُضبط بـ`onopen`/`onmessage` فقط، والفحص `readyState !== OPEN` يعود، والعودة للواجهة تعود أيضاً مع `CONNECTING` ⇒ لا سعر حيّ ولا إعادة محاولة حتى مهلة TCP بالنظام (دقيقة+). الإصلاح كـchart `42c0f3b` بـ`useLiveTicks.ts`: `lastHeardAt = Date.now()` أوّل `connect()`، ومعاملة `CONNECTING` كـ`OPEN` بفحص الصمت | chart-r61 |

**تحقّق الدورة 78 (بالكود، على 7d5a4d2):** أُغلق QA77 ← tools `50d9fb5` (لا «pip» ثابتة بـ`.tsx` خارج التعليقات؛ `PositionSizePanel.tsx:1437` «1 pip = …» تعريف وحدة — مقبول).
أُغلق QA76 ← chart `24ab767` (`tickBelongsToCandle` لا أثر لها). أُغلق chart-r60 (ui) ← `57d2053` (`TimeframeBar.tsx:31` `scrollTo`، `:49,62` `onLayout`). chart-r60 (launch) ← `93a3177`؛ الباقي على chart.
سجلات chart 60 / tools 92 / ui 39 / launch 137 / backend 42: جديد tools92 (قائم: `MatrixBottomDock.tsx:210` بلا `chartBannerVisible`). **المراجعة (c — accessibilityLabel):** مسح AST لـ`Pressable/Touchable*/Switch/TextInput` ⇒ 28 بلا label،
كلها بابن `<Text>` مترجم (يُقرأ بالقارئ) أو `MessagesScreen` (⛔ launch52)؛ والأزرار الرمزية فقط (✕ ↶ − + ⛶ ⋯) السبعة كلها بـlabel. **لا بند.**
