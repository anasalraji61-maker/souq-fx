# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 49، بعد 449c12f) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور (تشغيل n للطالب). ★ = عالق (≥3 دورات للمنفّذ). **ui** (LOG-UI) = المالك الافتراضي لكل `mobile/src` خارج chart/tools/i18n ⇒ لا «بلا مالك» بعد الآن.
**backend** (LOG-BACKEND) = `backend/**`. «أنس» = قرار بشري.

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
| launch | ui | **launch102**: شقّ chart أُنجز (`449c12f` `newsRisk.ts:515` `status: "unavailable"` = فشل، تحقّقتُ). **باقٍ ui**: `CalendarPanel` يعرض «لا أحداث بهذا الفلتر» ← `t.calendarUnavailable` (جاهز)؛ `isSample`/`calSampleBanner` :352 ميّت | launch102 |
| backend | ui (`AnalystsPanel`/`SocialConsensusPanel`) + launch | **backend-r2 (عقد جديد)**: **لا مصدر مرخَّص للمحلّلين ولا لقنوات التواصل** — كانت اتجاهاتهم وأهدافهم SHA-256 بأسماء بنوك حقيقية (HSBC، Citi، UBS…) و«TradingCentral-like» ⇒ أُزيلت (`9b26459`). الآن `/api/signals/analysts/*` و`/social/consensus`: `status: "unavailable"`، `unavailable_reason: "no_licensed_feed"`، `data_kind: "unavailable"`، `direction`/`avg_score`/`levels` = **null**، `analysts`/`votes` = `[]`، **بلا `confidence`**؛ و`/social/sources` ⇒ `sources: []`. ⇒ اعرض «لا مصدر مرخَّص لهذه البيانات بعد» بدل القائمة/الاتجاه/«الثقة %» (لا «null»، لا «NaN%»)؛ و`api.ts:616 :634 :659` `confidence` يُحذف و`direction` ⇒ `string \| null`. launch: مفتاح النصّ بثلاث لغات. يُغلق من جهة الخادم صفوف QA5 (بنوك/منافس) وQA20 («الثقة») **QA49 (d)**: بلا ذلك `AnalystsPanel.tsx:59` `setDirection(null)` يُعرض «محايد» (dirLabel :28) كأنه رأي؛ و`api.ts:643` `target: number` يكذب — لو عاد صفّ بـ`target: null` فـ`formatPrice(null)` :149 = **TypeError** (جرّبتُه) ⇒ `number \| null` + حارس | backend-r2 |
| backend | chart + ui | **backend-r2**: (1) `/ws/ticks` بلا مزوّد لم يعد يبثّ أسعاراً عشوائية حول قواعد مكتوبة باليد — `ticks: {}` + `source: "unavailable"` + `data_source.kind: "unavailable"` (`68788a8`) ⇒ `parseWsDataSource` يمرّر `'unavailable'` (أضفه لـ`DataOriginKind` كما بصفّ DXY). (2) الاقتباس حين يتعذّر المزوّد: `price: null, data_kind: "unavailable", unavailable_reason` بدل إغلاق السلسلة البذرية موسوماً demo (`f00081b`) — `isRealQuote` يرفضه أصلاً. (3) الاختبار الخلفي وتوقّع المؤشّرات على demo: `data_kind: "demo"` باقٍ لكن بلا نتائج (`trades`/`stats`/`votes` فارغة، `direction` null) — `BacktestPanel:101`/`IndicatorForecastPanel:119` يعالجانه كما هما. (4) `confidence` أُزيل من `/api/signals/indicators/forecast` أيضاً | backend-r2 |
| backend | tools | **backend-r1 عقود الدفتر**: أُنجز (تحقّقتُ) 409 «أُغلقت بجهاز آخر» (`46d3a9f`)، `size: number \| null` (`TradeJournalPanel.tsx:120`)، التعادل ليس خسارة (`52b15bd` `tradePlan.ts:857-866`)، `bid`/`ask` null ⇒ السعر. **باقٍ**: «تحميل الأقدم» — `api` بلا `limit`/`offset` (`TradeJournalPanel.tsx:1974` يقولها)؛ `journalLoadOlder` بلا مستعمل | backend-r1 |
| backend | chart + ui | **backend-r1**: DXY `data_kind: "unavailable"` ⇒ `DataOriginKind` (`api.ts:84`) بلا `'unavailable'`؛ المفتاح `originUnavailableProvider` جاهز. الإشارات: `levels: null` + `levels_basis.unavailable` ⇒ `sigLevelsUnavailableNoPrice`/`FewCandles`/`Neutral` جاهزة (اللوحات الثلاث تُخفي المستويات الآن بلا سبب) | backend-r1 |
| ui | ui | **ui1**: `AccountScreen.tsx:36` `REPLAY_TOUR_COPY` محلّي ← `t.accReplayTour`/`accReplayTourA11y` (أضافها launch `b48ff08` بثلاث لغات) | ui1 |
| chart | chart | **chart-r34**: مفاتيح قفل الرسم جاهزة (`b48ff08`: `mcLockDrawing`/`mcUnlockDrawing`/`mcLockDrawingA11y`/`mcDrawingLockedHint`) ⇒ الوصل | chart-r34 |
| QA | chart | **جهاز**: سحب جسم الرسم المحدَّد — RELEASE §5 بند 128 | QA1 |
| chart+QA | ui | `FocusChartModal`: الرأس أُصلح (`b70a23e`). باقٍ: بلا تحديث صامت 90ث كالرباعي؛ `loading ? spinner : MatrixChart` يفكّ الشارت بكل تبديل فيضيع النوع/المؤشرات/اللوغاريتمي | chart3 ★ |
| QA+tools | ui | **(a)** `dirColor`/`dirLabel` ×3 (Analysts/IndicatorForecast/SocialConsensus)؛ `VotePanel.tsx:82` نسخة `planSummaryText` | QA1 ★ |
| QA | ui | **(a)** `DomLitePanel.tsx:67-73` سبريد pip محلّي = نسخة `quoteSpreadPips` (`positionSize.ts:360`)؛ الخاصية `last` ميتة (`void last` :75) | QA11 ★ |
| QA | الجميع | **(a)** تصديرات بلا مستخدم خارج ملفها: `deleteTemplate`، `subscribeTemplatesSaveError`، `getDrawingsSaveError`، `getLayoutsSaveError`، `ensureSeriesProvenance`، `computeDomLite`، `PINE_PRESETS`، `getToolPanel`، `__setWatchlistStorageForTests`/`__reset…`، `motion`، `FRAME_SYMBOLS`، mock.ts ×3، `openCurrencyExposure` (`tradePlan.ts:1707`) (+ `TF_SECONDS` منسوخ `mock.ts:16`) | QA1 ★ |
| tools+QA | ui | `VotePanel.tsx:26` `isBlocked(v.author)` يُخفي تصويت المتداول نفسه إن حظر اسماً مطابقاً ← استثناء `v.my_choice`/`mine` (الشقّ الخادمي NOCASE أُنجز `9e3c2bc`) | tools-last |
| QA | backend | **(b)** نصوص `signal_hub` عربية (تفاصيل تصويت المؤشرات :164 :174 `:.5f` خام) تصل الواجهة الإنجليزية/الكردية؛ USDJPY «157.42312» | QA5 ★ |
| launch | backend/أنس | `openrouter_ai.py:71` «أنت خبير تداول فوركس» ويعطي دخول/وقف/هدف | launch9 ★ |
| QA | backend | **(d)** التصويت `main.py:141` رمز 1–20 وكل رمز آخر 3–12 (:198 …) ⇒ تصويت على رمز لا يُتابَع ولا يُنبَّه عليه | QA29 ★ |
| QA | backend/أنس | كلمة مرور ≥4 أحرف فقط (`main.py:207`) لحساب مالي | QA24 ★ |
| QA | backend | منخفض: `backtest.py:21` «GOLD»/«USOIL» بلا سبريد والنتيجة تقول «بعد السبريد»؛ `econ_calendar.py:42` `_impact` لـ«Holiday» | QA30 |
| launch | backend/أنس | قوالب الردّ بلا ذكاء اصطناعي `main.py` تفرّع `en` فقط ⇒ الكردي يُجاب بالعربية (مقصود لغياب مراجعة كردية) | launch77 |
| QA | أنس | الأكاديمية 44 محاضرة عربية فقط (موسومة بالواجهة والمتجر): ترجمة أم إبقاء؟ | QA27 |
| tools | أنس | «أمس» بقائمة المتابعة 00:00 UTC وPDH/PDL 17:00 نيويورك؛ `dailyChange.ts:34` يغذّي رأس الشارت ⇒ نسبة الرأس تناقض خطّ PDC | tools38 |
| launch | chart/أنس | DeMarker 0..100 والمنصات 0..1 | launch48 |
| launch | أنس | `MessagesScreen` غير مستوردة (وحدها تستعمل `mockPeers`) — حذف أم ربط؟ | launch52 |
| launch | أنس | ترخيص مصادر البيانات (ForexFactory/DailyFX/Twelve Data) قبل الرفع (`RELEASE-MOBILE.md` §0) | launch73 |
| backend | أنس | **قراران اتخذهما backend (لأنس عكسهما)**: التعادل مستثنى من نسبة الفوز (كان QA15)؛ DXY «غير متاح» بدل حسابه من السلّة (كان QA30) | backend-r1 |

| tools | **ui** (`api.ts`) | **tools67 — «تحميل الأقدم» بالدفتر**: `api.trades()` بلا معاملات ⇒ `api.trades(opts?: { limit?: number; offset?: number })` يمرّر `?limit=&offset=` وتُضاف `total`/`limit`/`offset` لنوع الردّ (الخادم يرسلها، backend-r1). ومعه (اختياري): `postJson` يرفق `status` بالخطأ كـ`patchJson` (الدفتر يكشف 409 الآن بنصّ «HTTP 409»). tools يصل `journalLoadOlder` بالتشغيل التالي | tools67 |
| tools | **launch** | **tools67 — مفتاح `riskCalcConvInverted`** بثلاث لغات، نصّه الآن محلّي `CONV_INVERTED_COPY` (`PositionSizePanel.tsx:~121`): ««{typed}» لا يصلح سعراً لـ{pair} — يبدو مقلوباً (1 ÷ السعر). على الأرجح {pair} = {likely}؛ اكتبه كما تراه بمنصّتك.» / en بالملف؛ **الكردي بحاجة مراجعة**. tools يستبدل النسخة المحلية حين يصل المفتاح | tools67 |
**تحقّق الدورة 49 (بالكود):** أُغلق — backend-r2: البنوك/«TradingCentral-like»/SHA-256 (`9b26459`، QA5)، «الثقة» (QA20)، ملاحظة التنبيه 500 (`65a24a4`، QA14)؛ `Alert.alert` ×10 (`eb8b265`، grep: صفر خارج `confirmDestructive`)؛ «₴» (`464fa48`، تعليقات فقط)؛ `DRAW_MARK`؛ `TimeframeBar` (`tfLabels` + `selected`)؛
`accessibilityState` بـ Rails/Dock/SidePanel/SymbolPairMenu/Backtest/FrameSizedGrid/PanSpeed/Alerts/Vote/Account (`fb1899d`)؛ ترجمة العمولات/الشبكة/الباقات و`accNetLoadError` و`busy` و`maxLength={32}`؛
`useMultiLiveTicks` (تقادم 20ث، ≤0، `RECONNECT_*` مستوردة)؛ رأس `FocusChartModal` و`mockBase`؛ `QUICK_SYMBOLS` و`CalendarPanel` يستوردان؛ `WeeklyReportPanel` تعليمة بلا اتجاه؛
`AiPanel`/`LectureClassroom` `maxLength={2000}`؛ رمز التنبيه `maxLength={12}`؛ «درجة الاتفاق» ودخول=وقف=هدف و`VotePanel` `formatPrice`؛ «أعد الجولة». الخادم: السبريد المختلَق، 409، `size` null،
MACD، ATR للإشارات، تقريب الين (`main.py` لم يعد يقصّ لخانتين)، برنت `XBR/USD`، كاش `as_of`، تقويم العيّنة، إحصاء كل الصفقات + ترقيم، NOCASE.
