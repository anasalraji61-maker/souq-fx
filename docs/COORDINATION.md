# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 69، بعد 9f7be25) · كل بند تحقّق منه في الكود لا في السجل وحده.
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
| tools | launch | **tools85** (أ) مفتاح جديد `riskCalcStopInsideTypicalSpread` (ar/en/ku) بـ`{sl}` `{spread}` `{symbol}`، مقترح: «الوقف ({sl} pip) ليس أبعد من السبريد المعتاد لـ{symbol} (~{spread} pip) — قد يُضرب فور فتح الصفقة. اكتب سبريد وسيطك بخانته، أو وسّع الوقف وقلّل اللوت.» — الكود جاهز (`PositionSizePanel.tsx` يقرأه اختيارياً، `9f7be25`). (ب) `riskCalcSpreadTooWide`: بدّل «(مثل 1.5)» بـ`{example}` — الكود يملؤه بحسب الأداة (`2684fb8`؛ USDZAR 100، الذهب 3) | tools85 |
| launch | chart/أنس | DeMarker 0..100 والمنصات 0..1 | launch48 |
| launch | أنس | `MessagesScreen` غير مستوردة (وحدها تستعمل `mockPeers`؛ `api.ts` `from_user: 'أنت'` ثابت؛ و`accessibilityLabel="رسالة خاصة"` ثابت :142) — حذف أم ربط؟ | launch52 |
| launch | أنس | ترخيص مصادر البيانات (ForexFactory/DailyFX/Twelve Data) قبل الرفع (`RELEASE-MOBILE.md` §0) | launch73 |
| backend | أنس | **قرارات اتخذها backend (لأنس عكسها)**: التعادل مستثنى من نسبة الفوز؛ DXY «غير متاح» بدل حسابه من السلّة؛ حذف ميزة «البنوك» | backend-r1 |
| backend | أنس | **backend-r6 (6) العمولات** (لم يُغيَّر): `db.py` يدفع مكافأة التوازن 5% عند **أي** تساوٍ (1=1، 3=3) بينما نصّ الخطة (`commissions.py:84`) «عند مستوى مؤهل» (2،4،8…) — أيّهما القاعدة؟ والتسجيل بإحالة يزيد العدّاد بلا سطر عمولة؛ والشهر بتوقيت الخادم المحلي لا UTC  **backend-r25 إضافة (لم يُغيَّر، قاعدة مال)**: التسجيل بـ`sponsor_code` لا يفحص إن كانت الساق مشغولة (`place` يفحص) ⇒ عضوان مباشران يساراً ثم `place` يساراً يُرفض؛ والراعي يمنح من يضعه أي دور حتى `company` (`PlaceMemberBody.role`). التسجيل الذاتي بدور غير `trader` صار 422 (`06ea3ab`). وسؤال للإشارات: تنبيه تقاطع MA/MACD والماسح يُطلقان على الشمعة **غير المغلقة** (تنبيه لمرة واحدة قد يُطلق على تقاطع يزول بالإغلاق) — عند الإغلاق فقط كـ«Once per bar close» أم كما هو؟ | backend-r6 |
| launch | tools | خانة العمولة placeholder `'7'` ثابت (`PositionSizePanel.tsx:1553`، `'0.07'` للـmicro) لكل عملات الحساب: بحساب JPY الـ7 = 7 ين/لوت (العمولة الحقيقية ~1000) ⇒ تكاليف أقلّ ×100. النصّ `riskCalcCommissionNote` صار يقول «7 بحساب دولار؛ بحساب ين نحو 1000». المطلوب placeholder بعملة الحساب (JPY ⇒ `'1000'`) | launch127 |
| tools | launch | مفتاح `riskCalcStopInsideTypicalSpread` (ar/en/ku) بـ`{sl}` `{spread}` `{symbol}`: «وقف {sl} pip داخل السبريد المعتاد لـ{symbol} (~{spread} pip) — يُضرب لحظة الفتح؛ اكتب سبريد وسيطك». الكود جاهز يقرأه اختيارياً (`PositionSizePanel.tsx:896 :1707-1713`، `9f7be25`)؛ grep بـ`locales.ts` صفر ⇒ التحذير لا يظهر اليوم | tools85 |
| launch | ui | **launch128** حدث التقويم بعملة `ALL` (G20، منذ `b5c0fe8` يطابق كل الأزواج بـ`newsCurrencyMatches`): (أ) الشريط `NewsRiskBanner.tsx:235-236` يطبع «ALL» حرفياً ⇒ استعمل `t.newsAllCurrencies` («كل العملات»، جاهز ar/en/ku) لـ`event.currency === 'ALL'` (وداخل تسمية «USD/ALL» من `sameMinuteCurrencyLabel`)؛ وشارة الصفّ `CalendarPanel.tsx:378` `{e.currency}` كذلك. (ب) فلتر «الزوج» `CalendarPanel.tsx:265` `pairCcys.includes(e.currency)` يُخفي حدث `ALL` بينما الشريط يحذّر منه للزوج نفسه ⇒ أضف `|| e.currency === 'ALL'` | launch128 |
| chart | أنس | **chart-r41 TTM Squeeze** (`volatility.ts:562`): كلتنر EMA20+ATR Wilder، ونسخة LazyBear الشائعة SMA20+SMA(TR) ⇒ ~15% من النقاط بحالة معاكسة. نضيف خيار «LazyBear» أم نُبقي؟ | chart-r41 |

**تحقّق الدورة 69 (بالكود، بعد 9f7be25):** لا صفّ أُغلق. launch127 مفتوح (`PositionSizePanel.tsx:1553` `'7'`/`'0.07'` لا يتبع `moneyCcy`). جديد tools85 → launch (أعلاه).
«تصحيح لا تحريك» بسجلّ tools فكرة بقائمته لا طلب بعد. لا طلبات جديدة بسجلات chart 52 / ui 26 / backend.
**المراجعة (d — أرقام متناقضة):** `MAX_SPREAD_PIPS` 500/3000 ↔ نصّ الخطأ (بلا رقم بعد `aa640ed`)؛ `MAX_LEVERAGE` 3000 ↔ `{max}`؛ `RISK_HIGH_PCT` 2 ↔ «أكثر من 2%» ↔ «1–2%» بالنصوص الثلاثة؛
`ORDER_WARN_LOTS` 50 / `MAX_SMALL_LOTS` 200 ↔ «50–100 lot»؛ أمثلة الوقف/السبريد ↔ `stopInsideTypicalSpread`؛ RSI 14/30/70 بالماسح. **لا بند** (تعليق مطوّر قديم فقط `locales.ts:473` يذكر 100 والحدّ 50).
