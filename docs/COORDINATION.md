# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 53، بعد 3d42eef) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور (تشغيل n للطالب). ★ = عالق (≥3 دورات QA بلا إصلاح). **ui** (LOG-UI) = المالك الافتراضي لكل `mobile/src` خارج chart/tools/i18n
(و`TerminalScreen` ملك tools). **backend** (LOG-BACKEND) = `backend/**`. «أنس» = قرار بشري.

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
| launch | **chart** (`MatrixChart.tsx:5708` `dropAlert`) | **launch107 — سحب خطّ التنبيه يفشل بصمت**: `void moveArmedAlert(…)` يتجاهل `false` (خادم أقدم بلا PATCH، تنبيه محذوف، انقطاع) ⇒ الخطّ يقفز لمكانه القديم بلا كلمة. **المفتاح جاهز**: `t.mcAlertMoveFailed` (`{price}` = `fmtPrice(al.price)` الأصلي) ⇒ `.then(ok => { if (!ok) notify(…) })` كـ`mcSnapshotFailed` | launch107 |
| launch | **ui** (`NewsPanel.tsx:90-98`، `8ca1226`) | **launch107 — «≈» على شارة التأثير لقارئ الشاشة**: الشارة `Text` بلا اسم ⇒ TalkBack يقرأ «يساوي تقريباً عالي». **المفتاح جاهز**: `t.newsImpactEstimatedA11y` (`{impact}` = `impactHigh/Medium/Low`) ⇒ `accessibilityLabel` على `View` الشارة حين `impact_basis === 'headline_keywords'` | launch107 |
| tools | **ui** (`BacktestPanel.tsx:240`) | **tools71**: باك-تست كل صفقاته خرجت عند الدخول ⇒ «نسبة نجاح: 0%» تُقرأ «خسر كل صفقاته» (العيب الذي أُصلح بالدفتر `fcffc1f`). جاهز: `journalWinRateLine(t.backtestStatWinRate, { win_rate, win_count: trade_count − (breakeven_count ?? 0), loss_count: 0 })` من `tradePlan.ts` | tools71 |
| backend | **ui** (`BacktestPanel.tsx:22`) ثم backend | **backend-r7**: بعد tools71 اجعل النوع `win_rate: number \| null` واكتب هنا ⇒ الخادم يرسل `null` للباك-تست بلا صفقة حاسمة (كالدفتر `2d0fb58`). تحقّقتُ: `:22` ما زال `number` و`:240` `String(stats.win_rate)` | backend-r7 |
| backend | **chart** (`MatrixChart.tsx:837`) | **backend-r6 (1)** — ضُيِّق بعد التحقّق: بعد `149c711` (فوليوم الفوركس `null`) كل لوحات الحجم تُحسب من التقدير، ومعظمها يُوسم «≈» (`volName`، :2459) وCVD «تقديري». **الباقي**: ملفّ الحجم (`volumeProfile`/TPO) والـfootprint غير مدرجة بـ`VOLUME_PRICE_OVERLAYS` ⇒ تُرسم من فوليوم مركَّب بلا «≈». أضفها للمجموعة أو أخفِها حين `volEstimated` | backend-r6 |
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

**تحقّق الدورة 53 (بالكود) — أُغلق 11 صفّاً:**
QA52 التحويلات (`37bb393` — grep `as ProvenanceKind|as DataOriginKind` صفر)؛ QA52 `dsKindLabels` (`cb5f753`، `TerminalScreen.tsx:943`)؛ ui4 (`6c1aa59`، `isVerifiedTickKind` :914)؛
chart-r37 (`d41af90`، `MatrixChart.tsx:3731`)؛ launch106 ← chart (`MatrixChart.tsx:8105`)؛ launch106 ← tools (`cbf5266`، `positionSize.ts:1699` `market_open`)؛ launch106 ← ui
و backend-r6 (2)(3) (`9c3a532` `SymbolSnapshot.tsx:77`، `8ca1226` `NewsPanel.tsx:83 :97`)؛ backend-r6 (4) (`95093aa`، `ticks_at` بـ`useLiveTicks`/`useMultiLiveTicks`/`tickAge.ts`)؛
backend-r6 (5) الطرفان (`fcffc1f` `TradeJournalPanel.tsx:1423`، `6544dd7`، الخادم `2d0fb58`).
**المراجعة (c) أزرار بلا اسم مقروء:** مسح آلي لكل `Pressable`/`Touchable*`/`Switch`/`TextInput` بـ`mobile/src`: 29 بلا `accessibilityLabel`، وكلّها (عدا إنذار كاذب
بـ`TradeJournalPanel.tsx:1947` له `placeholder`) زرّ بنصّ مرئي مترجم يقرؤه قارئ الشاشة. لا `<Text onPress>`. `accessibilityLabel` ثابت غير مترجم: `MessagesScreen.tsx:142` وحده (ميّتة، launch52). **لا صفّ جديد.**
