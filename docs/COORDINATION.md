# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 54، بعد 3e69fe9) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور (تشغيل n للطالب). ★ = عالق (≥3 دورات QA بلا إصلاح). **ui** (LOG-UI) = المالك الافتراضي لكل `mobile/src` خارج chart/tools/i18n
(و`TerminalScreen` ملك tools). **backend** (LOG-BACKEND) = `backend/**`. «أنس» = قرار بشري.

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
| launch | **chart** (`MatrixChart.tsx:8156` خطّ التنبيه `adjustable`) | **launch108 — تلميح التمرير**: بعد `76a0834` يسمع قارئ الشاشة «قابل للتعديل» فقط — لا يعرف أنّ التمرير **ينقل التنبيه على الخادم** ولا حجم الخطوة ولا متى يُحفظ. **المفتاح جاهز**: `accessibilityHint={tr.mcArmedAlertAdjustHint}` (تحقّق QA54: غير موصول، grep بـ`.tsx` صفر). (اختياري: `{price}` يُقرأ مرّتين — بالوسم و`accessibilityValue`) | launch108 |
| launch | **ui** (`ChartFrame.tsx:429`، `QuadChartModal.tsx:343`، `FocusChartModal.tsx:315` نصّ النسبة) | **launch109 — نسبة الرأس لقارئ الشاشة**: منذ `8aeaf13` لم يعد الإطار زرّاً واحداً فيصل VoiceOver لنصّ النسبة منفرداً — يسمع «+0.12%» بلا «تغيّر اليوم»، و«—» (بعد `63c38f8` صارت تظهر أكثر) كعلامة ترقيم أو صمت. **المفاتيح جاهزة**: `accessibilityLabel={chgPct == null ? tr.cfDayChangeNoneA11y : tr.cfDayChangeA11y.replace('{pct}', formatPct(chgPct))}` بالثلاثة | launch109 |
| QA | backend (`main.py:1154`) | **QA54 (d)** `/api/screener/filters` يقول «RSI oversold (<30)»/«(>70)» والفحص `screener.py:94 :96` `<=`/`>=` (والتطبيق «30 أو أقل»)، والتسميات نصف عربية نصف إنجليزية. لا عميل يستدعيه (grep صفر) ⇒ صحّح «≤30/≥70» أو احذف المسار | QA54 |
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

**تحقّق الدورة 54 (بالكود) — أُغلق 3 صفوف:** launch107 ← chart (`40b15f9`، `MatrixChart.tsx:5715` `if (!ok) notify(… mcAlertMoveFailed …)`)؛
backend-r7 (`e4fe10d`، `backtest.py:75` `win_rate … if decided else None` + `tests/test_backtest.py:65`)؛ backend-r6 (1) (`e9df083`، `MatrixChart.tsx:8091` `volName('POC')`؛
TPO يُحسب من عدد الشموع لا الحجم، الـfootprint موسوم «≈» — قبلتُ تعليل chart بعدم إضافتها لـ`VOLUME_PRICE_OVERLAYS`).
**المراجعة (d) أرقام متناقضة:** متّسقة — حدود الخانات مقابل `main.py` (ملاحظة 500، اسم تخطيط 64، رمز 12، دردشة 1000، سؤال 2000، اسم 3–32، كلمة مرور 4 = نصّ `registerError`)؛
`JOURNAL_PAGE_MAX` = `TRADES_PAGE_MAX` = 500؛ حجم pip (`positionSize.ts:36 :127` = `backtest.py:31-37`)؛ `MAX_SANE_LOTS`/`MAX_SMALL_LOTS` = نصّ «50–100»/«200»؛
عيّنة الاختبار الخلفي 30 = النصّ؛ `CHANGE_WINDOW` 80 = «آخر 80 شمعة»؛ `SOON_MS` 24س = «خلال 24 ساعة»؛ عتبة RSI 1–99 ضمن 0–100 الخادم؛ جلسات `sessions.ts` و17:00 نيويورك موحّدة.
المتناقض الوحيد QA54 أعلاه (مسار بلا مستعمل). `TICK_STALE_MS` 20ث مقابل `LIVE_MAX_AGE` 180ث مقصود (عرض حيّ مقابل نافذة التنبيهات) — ليس بنداً.
