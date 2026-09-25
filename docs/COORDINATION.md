# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-25 (دورة QA 74، بعد de91b88) · كل بند تحقّق منه في الكود لا في السجل وحده.
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
| backend | أنس | **backend-r6 (6) العمولات** (لم يُغيَّر): `db.py` يدفع مكافأة التوازن 5% عند **أي** تساوٍ (1=1، 3=3) بينما نصّ الخطة (`commissions.py:84`) «عند مستوى مؤهل» (2،4،8…) — أيّهما القاعدة؟ والتسجيل بإحالة يزيد العدّاد بلا سطر عمولة؛ والشهر بتوقيت الخادم المحلي لا UTC  **backend-r25 إضافة (لم يُغيَّر، قاعدة مال)**: التسجيل بـ`sponsor_code` لا يفحص إن كانت الساق مشغولة (`place` يفحص) ⇒ عضوان مباشران يساراً ثم `place` يساراً يُرفض؛ والراعي يمنح من يضعه أي دور حتى `company` (`PlaceMemberBody.role`). التسجيل الذاتي بدور غير `trader` صار 422 (`06ea3ab`). وسؤال للإشارات: تنبيه تقاطع MA/MACD والماسح يُطلقان على الشمعة **غير المغلقة** (تنبيه لمرة واحدة قد يُطلق على تقاطع يزول بالإغلاق) — عند الإغلاق فقط كـ«Once per bar close» أم كما هو؟ (backend `95c7ad0` أسقط التقاطع الأقدم من التسليح فقط؛ سؤال الشمعة الجارية باقٍ) | backend-r6 |
| backend | أنس | **backend-r33** مصدرا الأخبار ميّتان (`news_feed.py` `FEEDS`: ForexFactory XML ‏403 وليس RSS أصلاً، DailyFX feedburner ‏404) ⇒ لوحة الأخبار فارغة دائماً (الآن موسومة «غير متاح» بصدق). مصدر بديل مرخَّص أم إخفاء اللوحة؟ (مرتبط بـlaunch73؛ التطبيق يعرض «غير متاح» بصدق منذ ui `77e39f2`) | backend-r33 |
| chart | ui | **chart-r56 (3) — باقٍ لوح العمق وحده** (Alerts/Watchlist أُنجزا `7023c51`، رأس الطرفية `327a73d`): `DomLitePanel.tsx:68` `quoteSpreadPips(symbol, bid, ask)` بلا `chartPipSpec` رابعاً ⇒ USDJPYc «0.015» بدل «1.5 pip»؛ `:71` `' pip'` ثابتة بدل `pipUnit(lang)`؛ `formatPrice(bid, symbol)` بلا مرجع (نفط 99.950/100.05). كـ`TerminalScreen.tsx:1731` | chart-r56 |
| chart | أنس | **chart-r56 Mass Index**: طولنا الافتراضي 25 (Dorsey، مع خطّي «انتفاخ الانعكاس» 27/26.5)؛ TradingView المدمج طوله 10 ⇒ خطّنا ~2.5× خطّ TV (25.6 مقابل 10.3 على البيانات نفسها). نتحوّل إلى 10 كـTV (ويسقط الخطّان أو يُعاد قياسهما) أم نبقى على Dorsey؟ | chart-r56 |
| backend | أنس | **backend-r35** `POST /api/academy/tts` (`main.py:1632`) بلا مصادقة ولا حدّ معدّل، ويقبل 5000 حرف أيّ نصّ ⇒ أيّ أحد يستهلك رصيد ElevenLabs. التطبيق يستدعيه مجهولاً (`LectureClassroom.tsx:255`) فاشتراط الدخول يكسر الأكاديمية للزائر. الخيار: تسجيل دخول، أو حدّ لكل IP/جهاز، أو قصر النصّ على نصوص المحاضرات بالخادم؟ | backend-r35 |
| chart | أنس | **chart-r41 TTM Squeeze** (`volatility.ts:562`): كلتنر EMA20+ATR Wilder، ونسخة LazyBear الشائعة SMA20+SMA(TR) ⇒ ~15% من النقاط بحالة معاكسة. نضيف خيار «LazyBear» أم نُبقي؟ | chart-r41 |
| QA | tools | **QA74** (منخفض، لا أثر مرئي اليوم): `tradePlan.ts:862-913` `journalStats` «بمعادلة الخادم نفسها» انحرف عن `db.trade_stats`: الخادم منذ `de91b88` يرسل `avg_win`/`avg_loss` `null` بلا رابحة/خاسرة و`best`/`worst` `null` بدفتر فارغ، و`win_rate` `null` حين كلّها تعادل؛ المحلّي يعيد `0` للأربعة و`win_rate: 0`، والنوع `JournalStats` `number` (تعليق :865 «يرسل 0 اليوم» قديم). المطلوب: `number \| null` كالخادم + selftest. المستهلكون الحاليون يحرسون بـ`trade_count > 0` (`TradeJournalPanel.tsx:1486`، `WeeklyReportPanel.tsx:117`) | QA74 |

| backend | ui | **backend-r37** سبب جديد لغياب المستويات `levels_basis.unavailable: "atr_exceeds_price"` (`signal_hub._trade_levels`، `b86493d`): الوقف أو الهدف سيكون سعراً ≤ 0 (ATR أوسع من السعر، عملة منهارة على W). `IndicatorForecastPanel.tsx:276-280` و`signalDirection.ts:levelsUnavailableText` لا يعرفانه ⇒ «لا اتجاه غالب» تحت «بيع». المطلوب: نصّ مثل «التذبذب أوسع من السعر — لا مستويات» (ar/en/ku) | backend-r37 |
| ui | launch | **backend-r37 (نصّ)**: مفتاح `sigLevelsUnavailableAtrWide` (ar/en/ku) بجوار `sigLevelsUnavailableFewCandles` — مثلاً «لا مستويات دخول ووقف وهدف — التذبذب (ATR) أوسع من السعر نفسه». ui يربطه بـ`signalDirection.ts:levelsUnavailableText` (`case 'atr_exceeds_price'`) فور وجوده؛ حتى ذلك الحين اللوحات الثلاث لا تعرض سطراً مناقضاً (ui `c0d198e`) | ui35 |

**تحقّق الدورة 74 (بالكود، بعد de91b88):** أُغلق launch133 ← tools `43176e5` (`TerminalScreen.tsx:210` `online: boolean \| null` من `slotResults.some`، `:1051` بلا وسم عند null).
chart-r56 (3): Alerts/Watchlist ← ui `7023c51` (`AlertsPanel.tsx:297` `chartPipSpec`، `WatchlistPanel.tsx:387`)؛ الباقي `DomLitePanel` وحده (ضُيّق الصفّ). سجلات chart 57 / launch 132 / ui 33 / backend 35: بلا طلب جديد.
**المراجعة (d — أرقام متناقضة):** حدود الطول تطابق الخادم (`JOURNAL_NOTE_MAX` 500، الدردشة 1000، AI/المعلّم 2000، الرمز 12، التخطيط 64، المستخدم 32)؛ جديد QA74 أعلاه.
