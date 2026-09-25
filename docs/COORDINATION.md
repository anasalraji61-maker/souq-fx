# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 59، بعد 0dd9456) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور (تشغيل n للطالب). ★ = عالق (≥3 دورات QA بلا إصلاح). **ui** (LOG-UI) = المالك الافتراضي لكل `mobile/src` خارج chart/tools/i18n
(و`TerminalScreen` ملك tools). **backend** (LOG-BACKEND) = `backend/**`. «أنس» = قرار بشري.

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
| QA | chart | **جهاز**: سحب جسم الرسم المحدَّد، وسحب خطّ التنبيه (`AlertDragHandle`) على iOS/Android والويب — RELEASE §5 | QA1 |
| QA | tools / ui | **(a)** تصديرات بلا أي مستعمل (سكربت QA56؛ `9909b91` حذف 10 من 12 — تحقّقتُ grep صفر): باقٍ `getToolPanel` (tools، `tools-panels/registry.ts:53`، لا مستدعٍ حتى بملفه)، و`motion` (`theme.ts:119`، ui: مُبقى عمداً) | QA1 ★ |
| launch | backend/أنس | `openrouter_ai.py:71` «أنت خبير تداول فوركس» ويعطي دخول/وقف/هدف | launch9 ★ |
| QA | backend/أنس | كلمة مرور ≥4 أحرف فقط (`main.py:224`) لحساب مالي | QA24 ★ |
| launch | backend/أنس | قوالب الردّ بلا ذكاء اصطناعي `main.py` تفرّع `en` فقط ⇒ الكردي يُجاب بالعربية (مقصود لغياب مراجعة كردية) | launch77 |
| QA | أنس | الأكاديمية 44 محاضرة عربية فقط (`academy.ts` `name_ar`/`summary`، موسومة بالواجهة والمتجر): ترجمة أم إبقاء؟ | QA27 |
| tools | أنس | «أمس» بقائمة المتابعة 00:00 UTC وPDH/PDL 17:00 نيويورك؛ `dailyChange.ts:34` يغذّي رأس الشارت ⇒ نسبة الرأس تناقض خطّ PDC | tools38 |
| launch | chart/أنس | DeMarker 0..100 والمنصات 0..1 | launch48 |
| launch | أنس | `MessagesScreen` غير مستوردة (وحدها تستعمل `mockPeers`؛ `api.ts` `from_user: 'أنت'` ثابت؛ و`accessibilityLabel="رسالة خاصة"` ثابت :142) — حذف أم ربط؟ | launch52 |
| launch | أنس | ترخيص مصادر البيانات (ForexFactory/DailyFX/Twelve Data) قبل الرفع (`RELEASE-MOBILE.md` §0) | launch73 |
| backend | ui (`BacktestPanel.tsx:276-281`) | **backend-r15a**: `/api/backtest` `stats.avg_win_pct`/`avg_loss_pct` صارا **null** حين لا رابحة/لا خاسرة (كانا 0 ⇒ «متوسّط الربح 0%» لاستراتيجية لم تربح؛ `2b0d3ee`). اللوحة تُخفي السطر كلّه إن `avg_win_pct` null، وتطبع `String(null)` = «null» إن `avg_loss_pct` null مع رابحات. المطلوب: كلّ طرف يُعرض وحده أو «—» | backend-r15 (QA59 وجده مستقلاً: كل الصفقات رابحة ⇒ «/ null%») |
| backend | أنس | **قرارات اتخذها backend (لأنس عكسها)**: التعادل مستثنى من نسبة الفوز؛ DXY «غير متاح» بدل حسابه من السلّة؛ حذف ميزة «البنوك» | backend-r1 |
| backend | أنس | **backend-r6 (6) العمولات** (لم يُغيَّر): `db.py` يدفع مكافأة التوازن 5% عند **أي** تساوٍ (1=1، 3=3) بينما نصّ الخطة (`commissions.py:84`) «عند مستوى مؤهل» (2،4،8…) — أيّهما القاعدة؟ والتسجيل بإحالة يزيد العدّاد بلا سطر عمولة؛ والشهر بتوقيت الخادم المحلي لا UTC | backend-r6 |
| chart | أنس | **chart-r41 TTM Squeeze** (`volatility.ts:562`): كلتنر EMA20+ATR Wilder، ونسخة LazyBear الشائعة SMA20+SMA(TR) ⇒ ~15% من النقاط بحالة معاكسة. نضيف خيار «LazyBear» أم نُبقي؟ | chart-r41 |
| launch | ui (`BacktestPanel.tsx:276-282`) | **launch114** (لـQA59 (d)/backend-r15a): المفتاحان `backtestStatAvgWin` «متوسط الربح: {win}% — لا صفقة خاسرة» و`backtestStatAvgLoss` «متوسط الخسارة: {loss}% — لا صفقة رابحة» جاهزان ×3 (`b001551`). كلاهما رقم ⇒ `backtestStatAvgWinLoss` كما هو؛ أحدهما null ⇒ مفتاح الطرف الآخر وحده (بدل «—%»)؛ كلاهما null ⇒ لا سطر | launch114 |
| tools | tools (`NewsRiskBanner.tsx:30 :166`) | **tools76a تتمّة**: launch أضاف `newsTimeTbdTomorrow` ×3 (`1f619da`) ⇒ احذف `TIME_TBD_TOMORROW_COPY` المحلية واقرأ `t.newsTimeTbdTomorrow` مباشرة. تنظيف | tools76 |

**تحقّق الدورة 59 (بالكود) — أُغلقت 5 صفوف:** backend-r14 ← ui (`75a7ba1`، `CalendarPanel.tsx:285` `soonCount` يستثني `tbd`، `:310` «اليوم · الساعة غير معلنة»)؛ tools75a ← launch (`2c68c59`، `locales.ts:1714/2875/4064`؛
`NewsRiskBanner.tsx:167` `t.newsTimeTbd` والنسخة المحلية حُذفت)؛ tools75b ← ui (`6a58a2b`، `ScreenerMini.tsx:195` `pctDirection`)؛ ui10 ← launch (`65700ad`، `locales.ts:1717`)؛ launch113 ← tools (`4bc21ec`، `newsRisk.ts:365-387` `tomorrow`).
**مفتوح بعد التحقّق:** tools76a (`newsTimeTbdTomorrow` grep صفر بـ`locales.ts`؛ `NewsRiskBanner.tsx:166` يسقط للنسخة المحلية). طلب chart القديم `mcEstimatedTag` (LOG-CHART:3618) منفَّذ.
**المراجعة (d — أرقام متناقضة):** `NEWS_HORIZON_MS` 3س = `ROW_SOON_MS` بالتقويم؛ `SOON_MS`/`UNANNOUNCED_SPAN_MS` 24س متّسقان؛ `volume: None` بالخادم (`main.py:113`، `twelve_data.py:171`) يطابق backend-r15. جديد: QA59 (null%).
**إلحاق (وصل أثناء الدفع):** ui10 تتمّة ← ui (`c24c7aa`، `CalendarPanel.tsx:276` `t.calTimeTbd`)؛ backend-r15b ← ui (`6b1875a`، `GroupChatPanel.tsx:145` `created_at`؛ `VotePanel` لا يعرض وقتاً أصلاً)؛
tools76a ← launch (`1f619da`، 4 إصابات بـ`locales.ts`) فبقي تنظيف tools. صفّ QA59 مكرّر لـbackend-r15a (نفس الخلل، ما زال مفتوحاً `BacktestPanel.tsx:276-280`) ⇒ دُمج فيه.
