# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 56، بعد 3116ec9) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور (تشغيل n للطالب). ★ = عالق (≥3 دورات QA بلا إصلاح). **ui** (LOG-UI) = المالك الافتراضي لكل `mobile/src` خارج chart/tools/i18n
(و`TerminalScreen` ملك tools). **backend** (LOG-BACKEND) = `backend/**`. «أنس» = قرار بشري.

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
| launch | ui (`notifications.ts:39-40`، تعليق فقط) | **launch110**: تعليق `ensureAlertChannel` يقول «تغيير اللغة يظهر بإعدادات النظام عند الإقلاع التالي» — منذ `6d28f47` يستدعي `setLang` (`I18nContext.tsx`) `ensureAlertChannel(true)` و`registerPushToken()` فوراً. صحّح الجملة كي لا يُزال الاستدعاء ظنّاً أنه زائد | launch110 |
| QA | chart | **جهاز**: سحب جسم الرسم المحدَّد، وسحب خطّ التنبيه (`AlertDragHandle`) على iOS/Android والويب — RELEASE §5 | QA1 |
| QA | الجميع | **(a)** تصديرات بلا أي مستعمل حتى في ملفها (سكربت QA56 على كل `export` — لا تكرار تعريفات؛ 12): جديدان (chart) `WatchSymbol` (`watchlist.ts:26`)، `__resetWatchlistMemoryForTests` (`watchlistStore.ts:62`، ولا selftest يستدعيها)؛ والقديمة `deleteTemplate`، `subscribeTemplatesSaveError`، `getDrawingsSaveError`، `getLayoutsSaveError`، `ensureSeriesProvenance`، `computeDomLite`، `PINE_PRESETS`، `getToolPanel`، `__setWatchlistStorageForTests`، `motion` (ui: مُبقى عمداً) | QA1 ★ |
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
| backend | ui (اختياري، `api.ts:872` وشاشة المساعد) | **backend-r12** `ee90f7d`: ردّ `/api/ai/ask` يحمل `price_as_of` (ثوانٍ UTC، إغلاق آخر شمعة؛ null بلا سعر حقيقي) — قد يسبق «الآن» بـ15د عند حدّ المزوّد أو أيام بعطلة الأسبوع. اعرضه بجانب «دخول» السيناريو (مثلاً «السعر عند 21:45 الجمعة») كي لا يُقرأ الدخول سعراً حيّاً. و`556c4bb`: `/quote` لم يعد يرسل `as_of` = الآن لسعر بلا وقت — لا تغيير مطلوب | backend-r12 |

**تحقّق الدورة 56 (بالكود) — أُغلق صفّان:** QA55 (e) ← backend (`bea2bb1`، `backtest.py:162-165` خروج الوسط `signal = "flat"` إغلاق فقط + `tests/test_backtest.py:103`)؛
backend-r10 (ب) ← chart (`4cb92bf`، `pineLite.ts:16 :23` و`momentum.ts:22 :29 :981 :988 :1133` كلها `avgGain === 0 ? 50 : 100`). **إلحاق (وصل أثناء الدورة) — أُغلقت 4 أخرى:** tools73 ← launch (`6d28f47`، `I18nContext.tsx:71` `registerPushToken()` + `ensureAlertChannel(true)`)؛ backend-r10 (أ) ← ui (`6afb33b`، `BacktestPanel.tsx:137-141` `x.open` و`open_pnl_pct`)؛
backend-r10 (ج) ← ui (`0350136`، وسم «مخزَّن»)؛ launch110 ← ui (فُتح وأُغلق: `3f7ea80`، `notifications.ts:39-40`). البناء بعده أخضر 0، 93/93.
طلب chart القديم `mcEstimatedTag` منفَّذ (`locales.ts` ×4). **المراجعة (a):** 0 تعريفات مكرّرة بين الملفات؛ 120 تصديراً لا يستورده ملف آخر، 108 منها مستعملة داخل ملفها (تصدير زائد، غير ضارّ) ⇒ 12 ميتة فعلاً بالصفّ أعلاه.
