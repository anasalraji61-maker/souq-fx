# COORDINATION — طلبات مفتوحة بين الوكلاء
يملكه: وكيل QA · آخر تحقق من الكود: 2026-09-24 (دورة QA 1) · كل بند تحقّق منه في الكود لا في السجل وحده.
"منذ" = أول ظهور بالسجلات (تشغيل رقم n للوكيل). ★ = عالق (أقدم من 3 دورات للمنفّذ).

| من يطلب | من ينفّذ | ماذا بالضبط | منذ متى |
|---|---|---|---|
| QA | chart | **تحقق على جهاز**: سحب جسم الرسم المحدَّد لم يكن يعمل إطلاقاً (`hitDrawing()?.id` على نص) — أصلحه QA في 4315956، راجِع السلوك | 09-24 QA1 |
| QA | chart/data | **حجم التيك = 0 لا null** (`backend/twelve_data.py:148-153`) ⇒ fallback في `indicators/volume.ts:32` لا يعمل؛ OBV/MFI/CMF/VWAP تُحسب على حجم صفري بالفوركس | 09-24 QA1 |
| QA | chart | `candleTimeSec` نسخة محلية ثانية في `components/ChartFrame.tsx:70` (الأولى بـMatrixChart حذفها QA) — استورد من `dataSource` | 09-24 QA1 |
| QA | chart | `diOf` معرّفة مرتين في `indicators/trend.ts:87,1059`؛ منطق saveError منسوخ 4 مرات (template/drawing/layout/watchlist Store) | 09-24 QA1 |
| QA | launch | `TerminalScreen.tsx:868` يحسب `dxyPrice` الحيّ ثم يرميه — هل عرض DXY مفقود؟ | 09-24 QA1 |
| QA | tools | `dirColor/dirLabel` متطابقة في Analysts/IndicatorForecast/SocialConsensus Panel؛ `planSummary` في TradeJournal+VotePanel؛ استيراد `sizeLooksLikeUnits` ميت بـTradeJournalPanel:19 | 09-24 QA1 |
| QA | الجميع | 17 تصديراً بلا أي مستخدم (mock.ts ×3، `computeDomLite`، `PINE_PRESETS`، `deleteTemplate`، `motion`، `FRAME_SYMBOLS`…) — احذف أو استخدم | 09-24 QA1 |
| launch | chart | زر AUTO بلا `accessibilityLabel` (`MatrixChart.tsx:7260`) — المفاتيح `mcAutoA11y` جاهزة | launch27 ★ |
| launch | chart | النص الحرفي «Bar Replay · n/total» اسم ميزة منافس (خطر قانوني) ⇒ `tr.mcReplayReadout` (`MatrixChart.tsx:4884`) | launch7 ★ |
| chart/launch | chart | إنهاء `chartExtraLabels` المؤقت ⇒ `tr.mcClearAllBody` / `tr.mcToLatestA11y` (ما زال في 4781،7270،10028) | chart15 ★ |
| launch | chart | مفاتيح بلا مستخدم: `mcMeasureBarOne/Two`، `mcReplayEndedOnSwitch`، `cfReplayPriceA11y`، `mcHintSelect/Selected`، `mcHint*Web` | launch5 ★ |
| launch | chart | DeMarker على 0..100 والمنصات 0..1 (قرار — انظر STATUS) | launch48 |
| launch | tools | ربط `riskCalcCommissionNoteMicro/Cent` بالحاسبة | launch46 |
| launch | tools | ربط `journalSizeFromSmallFix` (سنت⇒قياسي يبقى الحجم ×100) | launch48 |
| tools | launch | مفتاح عملة مال صفقات السنت/المايكرو في الدفتر | tools30 |
| tools+launch | backend | حذف spread وهمي (السعر × 0.00008) في `backend/twelve_data.py:315-318` | tools13 ★ |
| tools | backend | الخادم يخزّن الحجم 1 حين لا يُرسل (`backend/db.py:1704`) | 09-22 ★ |
| tools | backend | كاش 30–60ث لـ`/api/market/quote` (`main.py:1347`) | 09-23 ★ |
| tools | chart | إيقاف سوكت التيكات حين TerminalScreen غير مركّزة (`TerminalScreen.tsx:211`) | 09-23 ★ |
| tools | chart | التغيّر اليومي يبقى على إغلاق الجلسة السابقة ≤10د بعد التدوير (`dailyRefStore.ts:27-31`) | tools25 |
| tools | chart | `chartPipSpec('EURUSD.c')` = null (لواحق بنقطة) | tools28 |
| tools | ScreenerMini | استخدام `pctDirection` المشترك (`ScreenerMini.tsx:198`) | tools≈14:00 |
| tools | AccountScreen | `catch` حول `getNotificationPermissionState` (`AccountScreen.tsx:129`) — الزر قد يعلق على «…» | tools≈14:00 |
| chart | TerminalScreen | عرض الشموع المخزّنة فوراً عند تبديل الفريم (`seriesCache` غير مستخدم) | chart17 |
| chart | useMultiLiveTicks | إسقاط التيك بعد 20ث بلا بثّ + حارس `isFinite && >0` (`useMultiLiveTicks.ts:50`) | chart2 ★ |
| chart | FocusChartModal | الرأس يطبع تيك الرمز الجديد فوق شموع القديم؛ «+0.00%» أخضر؛ يتجاهل سعر الإعادة (`:279,284-288`) | chart3 ★ |
| chart | الجميع | تأكيدات الحذف لا تعمل على الويب (`Alert.alert`) — مساعد `confirmDestructive` مشترك | chart29 |
| chart | MatrixEdgeRails | علامات أدوات long/short (تسقط إلى «·») `MatrixEdgeRails.tsx:28-40` | chart20 |
| chart | launch | مفتاح `ctlToolHray` + علامة `hray` | chart23 |
| chart | launch | وحدات الزمن بالكردية لأداة القياس (`mcDurMin/Hour/Day`) | chart16 ★ |
| chart | positionSize | EURUSDpro / GOLDm ⇒ null | chart33 |
| launch | UI | أيقونة «₴» (الهريفنيا الأوكرانية) لتبويب الدفتر (`ToolsScreen.tsx:85`، `MatrixEdgeRails.tsx:142`) | launch4 ★ |
| launch | backend/أنس | موجّه `openrouter_ai.py:71` «أنت خبير تداول» ويطلب دخول/وقف/هدف | launch9 ★ |

منجز ومُتحقَّق منه (أُسقط): مفاتيح `mcUndo*`، تحويل cent/micro للحاسبة، `riskCalcOverOrderMax*`، وصف VWAP بالأكاديمية.
