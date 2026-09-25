# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 52، بعد 2781d6f) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور (تشغيل n للطالب). ★ = عالق (≥3 دورات QA بلا إصلاح). **ui** (LOG-UI) = المالك الافتراضي لكل `mobile/src` خارج chart/tools/i18n.
**backend** (LOG-BACKEND) = `backend/**`. «أنس» = قرار بشري.

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
| QA | **chart** | **QA52**: `DataOriginKind` صار يضمّ `'unavailable'` (`5968660`، `api.ts:84`) ⇒ احذف التحويلات المؤقّتة `as string`/`as ProvenanceKind` (`dataSource.ts:43 :64 :73 :171`، `QuadChartModal.tsx:345`) — طلبتَه أنت (LOG-CHART «يبدأ التشغيل القادم» 1) | chart-r35 |
| QA | **ui** (`TerminalScreen`) | **QA52**: `dsKindLabels` (`TerminalScreen.tsx:934`) بلا `unavailable: t.dsKindUnavailable` ⇒ رأس الطرفية يقول «مصدر غير محدد» لسلسلة غير متاحة (عدا DXY المعالَج بسطر :945). `FocusChartModal.tsx:331` يضيفه — افعل مثله | QA52 |
| ui | **tools** (`TerminalScreen`) | **ui4**: قائمة المتابعة تَسِم «تجريبي» فقط حين `tick.source.kind === 'demo'` (`TerminalScreen.tsx:910` — تحقّقتُ)؛ `'unknown'` (خادم أقدم) يُعرض كسعر حيّ. اقتراح: `isSyntheticProvenance` من `chart/dataSource.ts` | ui4 |
| chart | **launch** (`locales.ts`) | **chart-r37 — مفتاح `mcArrowHeadA11y`** (ar/en/ku) لزرّ «➚» على خطّ الترند المحدَّد (`4e53e39`). اليوم قارئ الشاشة يقرأ `ctlToolTrend` + «➚» (`MatrixChart.tsx:3678`)؛ بعده يبدّله chart | chart-r37 |
| QA | **ui** أو **launch** | **QA52 (b)**: `BacktestPanel.tsx:244` يستعمل `t.journalStatBreakeven` ⇒ مفتاح launch `backtestStatBreakeven` (`86680e0`، النصّ نفسه حرفياً ×3 لغات) بلا مستعمل. إمّا ui يبدّل إليه، أو launch يحذفه — لا تبقيا الاثنين | QA52 |
| QA | chart | **جهاز**: سحب جسم الرسم المحدَّد — RELEASE §5 بند 128 | QA1 |
| QA | الجميع | **(a)** تصديرات بلا مستخدم خارج ملفها (أُعيد فحصها QA52 — `1eb6075` حذف `FRAME_SYMBOLS` ونسخة `TF_SECONDS` ومعظم mock.ts ✔؛ الباقي): `deleteTemplate`، `subscribeTemplatesSaveError`، `getDrawingsSaveError`، `getLayoutsSaveError`، `ensureSeriesProvenance`، `computeDomLite`، `PINE_PRESETS`، `getToolPanel`، `__setWatchlistStorageForTests`/`__reset…`، `motion`؛ `openCurrencyExposure` (`tradePlan.ts`) لا يستعمله إلا selftest | QA1 ★ |
| launch | backend/أنس | `openrouter_ai.py:71` «أنت خبير تداول فوركس» ويعطي دخول/وقف/هدف | launch9 ★ |
| QA | backend/أنس | كلمة مرور ≥4 أحرف فقط (`main.py:224`) لحساب مالي | QA24 ★ |
| launch | backend/أنس | قوالب الردّ بلا ذكاء اصطناعي `main.py` تفرّع `en` فقط ⇒ الكردي يُجاب بالعربية (مقصود لغياب مراجعة كردية) | launch77 |
| QA | أنس | الأكاديمية 44 محاضرة عربية فقط (`academy.ts` `name_ar`/`summary`، موسومة بالواجهة والمتجر): ترجمة أم إبقاء؟ | QA27 |
| tools | أنس | «أمس» بقائمة المتابعة 00:00 UTC وPDH/PDL 17:00 نيويورك؛ `dailyChange.ts:34` يغذّي رأس الشارت ⇒ نسبة الرأس تناقض خطّ PDC | tools38 |
| launch | chart/أنس | DeMarker 0..100 والمنصات 0..1 | launch48 |
| launch | أنس | `MessagesScreen` غير مستوردة (وحدها تستعمل `mockPeers`؛ و`api.ts:871` يرسل `from_user: 'أنت'` ثابتاً) — حذف أم ربط؟ | launch52 |
| launch | أنس | ترخيص مصادر البيانات (ForexFactory/DailyFX/Twelve Data) قبل الرفع (`RELEASE-MOBILE.md` §0) | launch73 |
| backend | أنس | **قرارات اتخذها backend (لأنس عكسها)**: التعادل مستثنى من نسبة الفوز؛ DXY «غير متاح» بدل حسابه من السلّة؛ حذف ميزة «البنوك» | backend-r1 |

**تحقّق الدورة 52 (بالكود) — أُغلق 9 صفوف، منها 3 عالقة ★:**
`DataOriginKind` + `'unavailable'` ★ (`5968660`، `api.ts:84`)؛ «تحميل الأقدم» ★ (`94f71e6`، `loadOlder` + زرّ `t.journalLoadOlder`)؛ حظر الذات ★ (`7b56e40`، `api.ts:124` `mine`، `VotePanel.tsx:27 :401`)؛
`costs_included` (`7fd8748`، `BacktestPanel.tsx:232`)؛ عطلة التقويم (`1bdd381`، `CalendarPanel.tsx:253`)؛ backend-r5 التعادل (`d663079`، `BacktestPanel.tsx:242` — لكن انظر QA52 (b))؛
QA51 نوع `Vote` (`bf0ac4b`، مشتقّ)؛ tools69 المفتاح (`4849372`) والوصل (`2781d6f`، `OLDER_ERROR_COPY` حُذف — grep صفر).
**المراجعة (b) نصوص ثابتة:** لا نصّ عربي/إنجليزي ثابت يُعرض خارج `locales.ts` إلا: `academy.ts` (QA27)، `MessagesScreen` الميّتة (launch52)، واحتياطات عربية لا تُستدعى بلا ترجمة
(`marketHours.ts:180`، `dataSource.ts:13` `KIND_LABEL_AR`، `types.ts:262` `CHART_KINDS` تُترجم عبر `typeLabels.ts`)، و`DEFAULT_TEMPLATE.name` «افتراضي نظيف» (`chartTemplateStore.ts:67` — لا يظهر بالواجهة اليوم).
