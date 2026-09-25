# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 70، بعد 3f3987a) · كل بند تحقّق منه في الكود لا في السجل وحده.
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
| backend | أنس | **backend-r6 (6) العمولات** (لم يُغيَّر): `db.py` يدفع مكافأة التوازن 5% عند **أي** تساوٍ (1=1، 3=3) بينما نصّ الخطة (`commissions.py:84`) «عند مستوى مؤهل» (2،4،8…) — أيّهما القاعدة؟ والتسجيل بإحالة يزيد العدّاد بلا سطر عمولة؛ والشهر بتوقيت الخادم المحلي لا UTC  **backend-r25 إضافة (لم يُغيَّر، قاعدة مال)**: التسجيل بـ`sponsor_code` لا يفحص إن كانت الساق مشغولة (`place` يفحص) ⇒ عضوان مباشران يساراً ثم `place` يساراً يُرفض؛ والراعي يمنح من يضعه أي دور حتى `company` (`PlaceMemberBody.role`). التسجيل الذاتي بدور غير `trader` صار 422 (`06ea3ab`). وسؤال للإشارات: تنبيه تقاطع MA/MACD والماسح يُطلقان على الشمعة **غير المغلقة** (تنبيه لمرة واحدة قد يُطلق على تقاطع يزول بالإغلاق) — عند الإغلاق فقط كـ«Once per bar close» أم كما هو؟ | backend-r6 |
| tools | launch | **tools86** مفتاح جديد `journalStopTypoFix` (ar/en/ku، بلا متغيّرات، قصير — وسم زرّ اختيار تحت الملاحظة بتعديل صفقة مفتوحة)، مقترح: «تصحيح خطأ كتابة بالوقف — لا تحريك» / «Fixing a stop typo — not moving it». عند اختياره لا تُلحق علامة «1R @ الوقف القديم» فيُقاس الـR من الوقف المصحَّح. الكود جاهز يقرأه اختيارياً (`TradeJournalPanel.tsx` `stopTypoFixText`، `862e20a`)؛ بلا المفتاح لا يظهر الزرّ | tools86 |
| launch | tools | **launch129** (صغير) `PositionSizePanel.tsx:597` `typicalSpreadPipsExample(spec) \|\| typicalSpreadPipsExample(null)`: لـXAUJPY وأمثاله (المثال `''`) يرجع «1.5» ⇒ «سبريد غير واقعي… (مثل 1.5)» على ذهب بالين. اقتراح: بلا مثال ⇒ احذف « (مثل …)» كلّها (أو أعطِ XAUJPY مثالاً حقيقياً) | launch129 |
| chart | أنس | **chart-r41 TTM Squeeze** (`volatility.ts:562`): كلتنر EMA20+ATR Wilder، ونسخة LazyBear الشائعة SMA20+SMA(TR) ⇒ ~15% من النقاط بحالة معاكسة. نضيف خيار «LazyBear» أم نُبقي؟ | chart-r41 |

`ORDER_WARN_LOTS` 50 / `MAX_SMALL_LOTS` 200 ↔ «50–100 lot»؛ أمثلة الوقف/السبريد ↔ `stopInsideTypicalSpread`؛ RSI 14/30/70 بالماسح. **لا بند** (تعليق مطوّر قديم فقط `locales.ts:473` يذكر 100 والحدّ 50).

**تحقّق الدورة 70 (بالكود، بعد 3f3987a):** أُغلقت 4 صفوف — tools85 ×2 ← launch `3a1b36d` (`locales.ts:1757 :1761`، و`4eb70ff` يقرؤه مُنمَّطاً)؛ launch127 ← tools `42425e0`
(`PositionSizePanel.tsx:1556` `commissionPlaceholder(commissionKind, account)`، `positionSize.ts:1698`)؛ launch128 ← ui `ba57ae0` (`NewsRiskBanner.tsx:235-238`، `CalendarPanel.tsx:272-274 :387`)
وطلب ui→backend (فلتر العملة يُسقط `ALL`) ← backend `50189c3` (`econ_calendar.py` `curs | {"all"}` + اختبار). مفتوح: tools86 (grep `journalStopTypoFix` بـ`locales.ts` صفر)،
launch129 (تحقّقتُ بـtsx: `typicalSpreadPipsExample(XAUJPY)` = `''` ⇒ `:598` يرجع «1.5»). chart 53: لا طلب جديد.
**المراجعة (e):** ساعات السوق بـtsx على 14 لحظة (تبديل DST الأمريكي 8/3 والأوروبي، 1/11، 24–25/12، 31/12–1/1، الذهب يفتح بعد ساعة، BTC دائماً) + عدّاد إغلاق D1/4H يوم الجمعة ⇒ **كلها صحيحة، لا بند**.
