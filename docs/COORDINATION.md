# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 77، بعد 3268271) · كل بند تحقّق منه في الكود لا في السجل وحده.
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
| QA | chart | **QA76** (منخفض، كود ميت): `chart/dataSource.ts:233` `tickBelongsToCandle` بلا مستهلك منذ chart `babb667` (استُبدل بـ`liveBarOpenSec` بـ`liveSeries.ts:101,243`)؛ يختبره `dataSource.selftest.ts:92-94` وحده ⇒ اختبار أخضر لسلوك لم يعد يعمل بالتطبيق. حذفه مع اختباره، أو ضمّه لـ`liveBarOpenSec` | QA76 |
| QA | tools | **QA77** (منخفض، بقية QA75): «pip» ثابتة بثلاثة أسطر وبقية الملفّين `pipUnit(lang)`: `PositionSizePanel.tsx:1541` `= {derivedSl} pip`، `:1674` `… pip · R:R`؛ `TradeJournalPanel.tsx:2055` `{t.planRiskWord} … pip` ⇒ «Risk 25 pip» بالإنجليزية. (`lot` بـ`:1644/:1758` علامة آلية — لا تُمسّ) | QA77 |
| chart | ui | **chart-r60** `TimeframeBar.tsx`: الشريط `ScrollView` أفقي بلا تمرير للزرّ النشط ⇒ بإطار شبكة الهاتف (~139pt، 8 أزرار مضغوطة ≈ 272pt) فريم 4H/D/W المختار خارج النظر. المطلوب: `scrollTo` للزرّ النشط عند التركيب وتغيّر `value` (بـ`onLayout` لكل زرّ). الشارت يعرض الفريم بجانب الزوج على الهاتف منذ `5b1e6e4` فلا تضيع المعلومة، لكن الشريط يبدو بلا اختيار | chart-r60 |
| chart | launch | **chart-r60** مفتاحان لزرّ «إعادة» بجانب «تراجع» بشريط الرسم: `mcRedo` (إعادة/Redo/كردي) و`mcRedoA11y` («إعادة آخر تغيير تُرُوجع عنه في الرسم»). الإعادة تعمل بلوحة المفاتيح على الويب منذ `c1fa634` (Ctrl/⌘+Shift+Z، Ctrl+Y)؛ chart يربط الزرّ للجوال بعد وصول المفتاحين | chart-r60 |

**تحقّق الدورة 77 (بالكود، بعد 3268271):** (مسوّدة الدورة 76 لم تُدفع — دُمجت هنا.) أُغلق QA75 جانب tools ← `6791c64` (`tradePlan.ts:299` `words.unit ?? 'pip'`، `TradeJournalPanel.tsx:572` يمرّر `pipUnit(lang)`)؛
بقيته صفّ ui (`VotePanel.tsx:85` بلا `unit`، دورة 1). launch135 قائم (`SymbolSearchBar.tsx:89` لا `ssbNoMatch`). QA76 قائم (`dataSource.ts:233`). ui35 مُغلق (`a737eee`).
سجلات chart 59 / tools 91 / ui 37 / launch 135 / backend 39: جديد launch135 فقط. **المراجعة (b):** مسح AST لكل JsxText وخصائص label/placeholder/title — 27 نتيجة: 7 `MessagesScreen` (⛔ launch52)، مصطلحات موحّدة (RSI/MACD/SL/TP/MATRIX/EURUSD)، وQA77.
**إعادة بناء على 3268271 (أخضر 0، 102/102):** أُغلق QA75 جانب ui ← `b9e28c9` (`VotePanel.tsx:86` `unit: pipUnit(lang)`)، وlaunch135 ← `5906252` (`SymbolSearchBar.tsx:100` `t.ssbNoMatch`). chart `9a27f63` لفّ رأس الإطار بالهاتف.
