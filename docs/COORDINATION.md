# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 55، بعد b9711c9) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور (تشغيل n للطالب). ★ = عالق (≥3 دورات QA بلا إصلاح). **ui** (LOG-UI) = المالك الافتراضي لكل `mobile/src` خارج chart/tools/i18n
(و`TerminalScreen` ملك tools). **backend** (LOG-BACKEND) = `backend/**`. «أنس» = قرار بشري.

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
| QA | backend (`backtest.py:154-157`) | **QA55 (e) «BB Bounce» ينعكس عند الخط الأوسط**: خروج الشراء عند `mid` يُطلق `signal = "sell"` فيفتح المحرّك (:175-190، إيقاف-وعكس) **بيعاً عند الخط الأوسط** بلا لمس النطاق العلوي، يبقى بلا وقف حتى يعود السعر تحته. متداول يعرف الاستراتيجية يرى صفقات بيع لم تقلها قواعدها. خروج الوسط = إغلاق فقط (`position = None`) | QA55 |
| tools | **launch** (`i18n/I18nContext.tsx:59` `setLang`) | **tools73 — لغة إشعارات التنبيه**: الخادم يختار لغة الإشعار من اللغة المسجَّلة مع توكن الجهاز (`_push_lang`)، والتوكن يُسجَّل بالإقلاع فقط (`App.tsx`) ⇒ تبديل العربية إلى الإنجليزية داخل التطبيق يُبقي إشعارات الأسعار بالعربية حتى إعادة التشغيل. **الإصلاح**: بعد `AsyncStorage.setItem(KEY, id)` نادِ `registerPushToken()` من `../notifications` (لا يسأل الإذن — بلا إذن ممنوح لا يفعل شيئاً، ويقرأ اللغة المحفوظة للتوّ). tools لا يملك `I18nContext` | tools73 |
| launch | ui (`notifications.ts:39-40`، تعليق فقط) | **launch110**: تعليق `ensureAlertChannel` يقول «تغيير اللغة يظهر بإعدادات النظام عند الإقلاع التالي» — منذ `6d28f47` يستدعي `setLang` (`I18nContext.tsx`) `ensureAlertChannel(true)` و`registerPushToken()` فوراً. صحّح الجملة كي لا يُزال الاستدعاء ظنّاً أنه زائد | launch110 |
| QA | chart | **جهاز**: سحب جسم الرسم المحدَّد، وسحب خطّ التنبيه (`AlertDragHandle`) على iOS/Android والويب — RELEASE §5 | QA1 |
| QA | الجميع | **(a)** تصديرات بلا مستخدم خارج ملفها (أُعيد فحصها QA53 بـgrep — `openCurrencyExposure` حُذف `b0c2d87` ✔؛ الباقي 10): `deleteTemplate`، `subscribeTemplatesSaveError`، `getDrawingsSaveError`، `getLayoutsSaveError`، `ensureSeriesProvenance`، `computeDomLite`، `PINE_PRESETS`، `getToolPanel`، `__setWatchlistStorageForTests`، `motion` (ui: مُبقى عمداً) | QA1 ★ |
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
| backend | ui (`BacktestPanel.tsx:307`) | **backend-r10 (أ)** `84980ee`: المركز المفتوح بآخر شمعة لم يعد يدخل `stats` (كان يُقوَّم بآخر إغلاق ويُحسب بنسبة الفوز والعائد كأنه أُغلق). الصفّ باقٍ بـ`trades` موسوماً `open: true` ⇒ اعرض «مفتوحة» بدل `→ {exit}` كخروج، و`stats.open_pnl_pct` (null = لا مركز) سطراً «ربح/خسارة مفتوحة» | backend-r10 |
| backend | chart (`pineLite.ts:16 :23`، `momentum.ts:22 :29 :981 :988 :1133`) | **backend-r10 (ب)** `b911485`: RSI لنافذة بلا ربح ولا خسارة = **50** كـMT5 (كان 100 = «تشبّع شراء» من لا حركة). التطبيق ما يزال `avgLoss === 0 ? 100` ⇒ خطّ RSI بالشارت 100 وتنبيه الخادم يرى 50. وحّدوا: `avgLoss === 0 ? (avgGain === 0 ? 50 : 100) : …` | backend-r10 |
| backend | ui (اختياري، `ScreenerMini`) | **backend-r10 (ج)** `c7c2d0a`: كل نتيجة ماسح تحمل `data_kind` (`provider`/`cache`) و`as_of` — عند حدّ المزوّد قد تكون السلسلة مخزَّنة حتى 15د. و`/api/market/quote` (`10d94ad`) فرع `ohlc_fallback`: `as_of` = إغلاق آخر شمعة 15د (كان لحظة الجلب) + `fetched_at` — `quoteAsOfMs` يقرؤه كما هو، لا تغيير مطلوب | backend-r10 |

**تحقّق الدورة 55 (بالكود) — أُغلق 3 صفوف:** launch109 ← ui (فُتح وأُغلق أثناء الدورة؛ `ChartFrame.tsx:438`، `QuadChartModal.tsx:346`، `FocusChartModal.tsx:340` `cfDayChange(None)A11y`)؛ launch108 ← chart (`def61c3`، `MatrixChart.tsx:8162` `accessibilityHint={tr.mcArmedAlertAdjustHint}`)؛
QA54 (d) ← backend (`b7c2357`، `screener.py:37-54` ثوابت `RSI_OVERSOLD`/`RSI_OVERBOUGHT` مشتركة بين الفحص والمسار + `test_screener_backtest_routes.py:119`).
**المراجعة (e) ما يُحرج أمام متداول:** سليم — pip (JPY 0.01، ذهب 0.1، فضة 0.01)، العقود 100k/100oz/5000oz، قيمة pip وتقريب اللوت للأسفل، نقاط MT4/5 ÷10،
DST نيويورك/لندن/سيدني، إغلاق الجمعة وفتح الأحد 17:00 نيويورك، RSI/ATR بتنعيم Wilder، MACD 12/26/9، بولنجر بانحراف المجتمع، ستوكاستك، المحاور (كلاسيك/فيبو/وودي/كاماريلا/ديمارك)،
مستويات فيبوناتشي، اتجاه bid/ask بالنصوص. المُحرج: QA55 bb_bounce أعلاه، والصفقة المفتوحة داخل الإحصاء — أصلحه backend بالتوازي (`84980ee`، `backtest.py:61-62`)؛ نصف الواجهة = backend-r10 (أ) ⇒ لم أُدرج صفّاً مكرّراً.
