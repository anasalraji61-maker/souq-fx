# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 51، بعد f55ff1b) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور (تشغيل n للطالب). ★ = عالق (≥3 دورات QA بلا إصلاح). **ui** (LOG-UI) = المالك الافتراضي لكل `mobile/src` خارج chart/tools/i18n.
**backend** (LOG-BACKEND) = `backend/**`. «أنس» = قرار بشري.

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
| backend+chart | **ui** (`api.ts:84`) | **`DataOriginKind` ← أضف `'unavailable'`** (backend-r1 DXY، backend-r2 `/ws/ticks`/الاقتباس، chart-r35 (1)، ui3). **الموانع زالت**: chart `ec57a4a` (تسميات جزئية باحتياط `unknown`) وlaunch `dsKindUnavailable`. **QA51 جرّبه: tsc = 0 أخطاء** بعد التوسيع. بعده chart يحذف `as string`/`as ProvenanceKind` (`dataSource.ts:43 :64 :73 :171`، `QuadChartModal.tsx:345`) | backend-r1 ★ |
| backend+tools | **tools** | **«تحميل الأقدم» بالدفتر** (backend-r1/tools67): `api.trades({limit, offset})` + `total` أُنجز (ui، `api.ts:744`)؛ `journalLoadOlder` لا يزال بلا مستعمل و`TradeJournalPanel.tsx:304` يطلب `api.trades()` بلا صفحة | backend-r1 ★ |
| tools+ui | **ui** (`api.ts:122`، `VotePanel.tsx:26`) | **حظر الذات بالتصويت**: الخادم يرسل `mine` للفكرة (`0bc463b`، `db.py:1207 :1283`) — نوع الفكرة بـ`api.ts` بلا `mine` (الموجود :164 للرسائل)، و`VotePanel.tsx:26` لا يزال `!isBlocked(v.author)` ⇒ أضف `mine?: boolean` و`&& !v.mine` | tools-last ★ |
| launch+backend | **ui** (`BacktestPanel`) | `stats.costs_included === false` (DXY/الرقمية) ⇒ `t.backtestBeforeCosts` (المفتاح جاهز `4e0469a`). اليوم `BacktestPanel.tsx:253` يعرض `spread_pips` وحده ⇒ النتيجة تبدو صافية | backend-r3 |
| launch+backend | **ui** (`CalendarPanel`) | `impact === 'holiday'` ⇒ `t.impactHoliday` (جاهز). اليوم نقطة رمادية بلا كلمة | backend-r3 |
| QA | chart | **جهاز**: سحب جسم الرسم المحدَّد — RELEASE §5 بند 128 | QA1 |
| QA | الجميع | **(a)** تصديرات بلا مستخدم خارج ملفها (أُعيد فحصها QA51 — كلّها باقية): `deleteTemplate`، `subscribeTemplatesSaveError`، `getDrawingsSaveError`، `getLayoutsSaveError`، `ensureSeriesProvenance`، `computeDomLite`، `PINE_PRESETS`، `getToolPanel`، `__setWatchlistStorageForTests`/`__reset…`، `motion`، `FRAME_SYMBOLS`، mock.ts ×3، `openCurrencyExposure` (`tradePlan.ts:1707`)؛ `TF_SECONDS` منسوخ `mock.ts:16` (الأصل `timeframes.ts:5`) | QA1 ★ |
| QA | ui/chart (`IndicatorForecastPanel`) | **QA51 (a)**: نوع `Vote` محلّي (`IndicatorForecastPanel.tsx:29-37`) ينسخ نوع `votes[]` بـ`api.ts:692-700` — اشتقّه من `api.indicatorForecast` كي لا يتباعدا | QA51 |
| launch | backend/أنس | `openrouter_ai.py:71` «أنت خبير تداول فوركس» ويعطي دخول/وقف/هدف | launch9 ★ |
| QA | backend/أنس | كلمة مرور ≥4 أحرف فقط (`main.py:224`) لحساب مالي | QA24 ★ |
| launch | backend/أنس | قوالب الردّ بلا ذكاء اصطناعي `main.py` تفرّع `en` فقط ⇒ الكردي يُجاب بالعربية (مقصود لغياب مراجعة كردية) | launch77 |
| QA | أنس | الأكاديمية 44 محاضرة عربية فقط (موسومة بالواجهة والمتجر): ترجمة أم إبقاء؟ | QA27 |
| tools | أنس | «أمس» بقائمة المتابعة 00:00 UTC وPDH/PDL 17:00 نيويورك؛ `dailyChange.ts:34` يغذّي رأس الشارت ⇒ نسبة الرأس تناقض خطّ PDC | tools38 |
| launch | chart/أنس | DeMarker 0..100 والمنصات 0..1 | launch48 |
| launch | أنس | `MessagesScreen` غير مستوردة (وحدها تستعمل `mockPeers`) — حذف أم ربط؟ | launch52 |
| launch | أنس | ترخيص مصادر البيانات (ForexFactory/DailyFX/Twelve Data) قبل الرفع (`RELEASE-MOBILE.md` §0) | launch73 |
| backend | أنس | **قرارات اتخذها backend (لأنس عكسها)**: التعادل مستثنى من نسبة الفوز؛ DXY «غير متاح» بدل حسابه من السلّة؛ حذف ميزة «البنوك» | backend-r1 |

**تحقّق الدورة 51 (بالكود):** أُغلق — tools67 (`api.trades` بمعاملات + `postJson` يرفق `status`، `api.ts:744`)؛ chart-r35 (2) و`disclaimer_code` (`signal_hub.py:280 :302`)؛
backend-r3 توقّع المؤشرات + launch104 (1) (`38ccb87`: `IndicatorForecastPanel.tsx:104` `lang`، `chart/forecastText.ts` من `detail_code`/`disclaimer_code`)؛ backend-r3 422 التصويت (`VotePanel.tsx:146`)؛
ui3 → chart (`ec57a4a` `ProvenanceKind`) وui3 → launch (`impactHoliday`، `dsKindUnavailable`)؛ tools68 → launch (`newsHolidayToday`) وlaunch104 → tools (`686c90e`، `HOLIDAY_COPY` حُذف)؛ backend-r2 (2)(3)(4) (اللوحات تعالجها كما هي)؛ backend-r4 شقّ الخادم.
دُمجت صفوف `DataOriginKind` الأربعة في صفّ واحد، وصفوف حظر الذات الثلاثة في صفّ واحد.
