# جرد ميزات MATRIX (Feature Inventory)

> تطبيق التحليل الفني والشارتات فقط — معزول عن روبوت التداول / MT5.  
> تاريخ المسح: 2026-09-05 · المصدر: `mobile/src/**` + `backend/*.py`  
> حالات: **implemented** | **UI-only** | **mock/demo data** | **connected to provider**

---

## مفاتيح المزودين

| مزود | أين | الشرط |
|------|-----|--------|
| Twelve Data REST | `backend/twelve_data.py` | `TWELVE_DATA_API_KEY` |
| Twelve Data WS | `backend/twelve_data_ws.py` | نفس المفتاح أو `TWELVE_DATA_WS_KEY` |
| OpenRouter | `backend/openrouter_ai.py` | `OPENROUTER_API_KEY` |
| ElevenLabs TTS | `backend/elevenlabs_tts.py` | `ELEVENLABS_API_KEY` |
| ForexFactory / DailyFX RSS | `news_feed.py`, `econ_calendar.py` | شبكة عامة |
| Expo Push | `backend/expo_push.py` | توكن عبر `/api/push/register`؛ حذف DeviceNotRegistered تلقائياً (مهمة 16) |

عند غياب Twelve Data: شموع/تيكات **seed** في `backend/main.py`. الموبايل: `mobile/src/mock.ts` كاحتياطي offline.

---

## 1. Charts / frames / sync

| العنصر | الحالة | مسارات | ملاحظة |
|--------|--------|--------|--------|
| محرك `MatrixChart` | implemented | `mobile/src/chart/MatrixChart.tsx` | شموع/هيكن/Renko/Kagi/P&F + عدسات + زوم/بان |
| تغذية الشموع | connected (+ mock fallback) | `backend/main.py`, `twelve_data.py`, `api.ts` | `data_source.kind`: مزود/مخزن/تجريبي؛ seed وmockSeries = تجريبي |
| قائمة متابعة شخصية | **implemented** (مهام 10–13، 19) | `watchlistStoreCore.ts`, `watchlistParse.ts`, `WatchlistPanel.tsx`, `TerminalScreen.tsx` | حفظ v2 موثوق؛ طابور؛ فشل حفظ/تحميل+إعادة؛ إدارة هاتف؛ قبول بصري (مهمة 13)؛ لمسة ضغط على إضافة/افتراضي/إضافة رمز (مهمة 19) |
| فريمات 1–4 + بطل | implemented | `TerminalScreen.tsx`, `ChartFrame.tsx`, `FrameSizedGrid.tsx` | مربع/مستطيل؛ تعبئة سطح المكتب لـ 2×2+ |
| فريم الظل | implemented | `TerminalScreen.tsx`, `shadowOverlay.ts` | مسارات عمودية s/m/b |
| 2×2 / Focus | implemented | `QuadChartModal.tsx`, `FocusChartModal.tsx` | |
| مقارنة رمز | implemented | `compare.ts`, `FocusChartModal.tsx` | |
| مزامنة نافذة بين شارتات | **implemented** (مُتحقق سلوكياً — مهمة 7) | `MatrixChart.tsx`, `ChartFrame.tsx`, `TerminalScreen.tsx` | OFF افتراضياً؛ سكون بلا حلقة نشر؛ OFF→ON يعيد النشر؛ بان/زوم يزيد النشر عند تغيّر النطاق؛ 2/4 فريمات؛ يختفي عند 1 فريم؛ زمن فقط؛ معطل في الظل |
| DOM lite | جزئي / تقديري | `DomLitePanel.tsx`, `orderflow.ts` | ليس L2 حقيقي |

## 2. Indicators

| العنصر | الحالة | مسارات | ملاحظة |
|--------|--------|--------|--------|
| مؤشرات العميل | implemented | `MatrixChart.tsx`, `types.ts` | SMA/EMA/BB/RSI/MACD/… |
| عدسات | implemented | `LENS_PRESETS` | clean/structure/momentum/liquidity |
| Pine-lite | implemented (محدود) | `pineLite.ts` | ليست Pine كاملة |
| snapshot خادم | connected/seed | `indicators.py` | |
| توقعات مؤشرات | implemented على OHLC | `signal_hub.py`, `IndicatorForecastPanel.tsx` | |
| CVD/Footprint/VP | تقريبي محلي | `orderflow.ts`, `volumeProfile.ts` | من OHLC |

## 3. Drawing

| العنصر | الحالة | مسارات | ملاحظة |
|--------|--------|--------|--------|
| أدوات الرسم | implemented | `MatrixChart.tsx`, `DRAW_TOOLS` | trend/ray/hline/vline/rect/fib/zone/note/measure |
| تنبيه من خط أفقي | implemented | `FocusChartModal.tsx` | عبر API تنبيهات |

## 4. Saving / persistence

| العنصر | الحالة | مسارات | ملاحظة |
|--------|--------|--------|--------|
| رسومات | محلي | `drawingStore.ts` | AsyncStorage — بلا مزامنة خادم |
| قوالب شارت | محلي | `chartTemplateStore.ts` | |
| تخطيطات | محلي + API اختياري | `layoutStore.ts`, `/api/layouts` | |
| تنبيهات / دفتر / DM / تصويت | SQLite | `backend/db.py` | |

## 5. Monitoring / live

| العنصر | الحالة | مسارات | ملاحظة |
|--------|--------|--------|--------|
| WS ticks | connected (+ demo) | `/ws/ticks`, `useLiveTicks.ts` | |
| بحث رموز | connected | `/api/symbols/search` | 503 بلا مفتاح |
| alert worker | implemented | `alert_worker.py` | ~60s + push |

## 6. Alerts

| العنصر | الحالة | مسارات | ملاحظة |
|--------|--------|--------|--------|
| سعر | implemented + provider | `AlertsPanel.tsx`, `/api/alerts`, `alert_worker.py` | دورة العامل: تسجيل فشل + عزل push (مهمة 14)؛ زر «إضافة» ظل+ضغط عبر توكنات `buttons` (مهمة 20) |
| مؤشرات | implemented | `IndicatorAlertsPanel.tsx` | RSI/MA/MACD |

## 7. Screener / filters

| العنصر | الحالة | مسارات | ملاحظة |
|--------|--------|--------|--------|
| Screener | connected | `screener.py`, `ToolsScreen.tsx`, `main.py` | `provider_configured` + رسائل عربية (مهمة 15)؛ زر «تشغيل Screener» يستخدم توكنات `buttons` ظل+ضغط (مهمة 18) |
| فلاتر | implemented | rsi/ma/macd/bullish/bearish | |

## 8. Replay

| العنصر | الحالة | مسارات | ملاحظة |
|--------|--------|--------|--------|
| Replay على الشموع المحمّلة | implemented محلي | `MatrixChart.tsx` | ليس محرك تاريخي منفصل |

## 9. Backtesting

| العنصر | الحالة | مسارات | ملاحظة |
|--------|--------|--------|--------|
| استراتيجيات بسيطة | implemented على OHLC | `backtest.py`, `BacktestPanel.tsx` | تعليمي — بلا تنفيذ صفقات |

## 10. News / calendar / social / AI / academy / DM

| العنصر | الحالة | مسارات | ملاحظة |
|--------|--------|--------|--------|
| أخبار | connected (+ fallback) | `news_feed.py`, `NewsPanel.tsx` | RSS |
| تقويم | connected (+ fallback) | `econ_calendar.py` | ForexFactory XML |
| مشاركة صورة شارت | implemented | `exportChart` + expo-sharing | محلي |
| إجماع اجتماعي | **mock/demo** | `signal_hub.social_consensus` | hash زمني — لا scraping |
| محللون | **mock/demo** | `signal_hub.analysts_forecast` | |
| تصويت / دردشة / DM | SQLite + seed | panels + `db.py` | |
| AI | OpenRouter أو قالب محلي | `AiPanel.tsx`, `openrouter_ai.py` | |
| أكاديمية | محتوى ثابت + TTS اختياري | `academy_data.py`, `CoursesScreen.tsx` | |

## 11. Risk / trade journal (أُضيف 2026-09-24 — تحقّق بالقراءة، لم يُشغَّل)

| العنصر | الحالة | مسارات | ملاحظة |
|--------|--------|--------|--------|
| حاسبة حجم المركز | implemented (حساب محلي) | `positionSize.ts`, `tradePlan.ts`, `PositionSizePanel.tsx` (أدوات ← المخاطرة) | وقف بالـpip أو من سعرَي الدخول والوقف؛ شرائح هدف `QUICK_RR` = 1:1 · 1:1.5 · 1:2 · 1:3؛ المخاطرة الفعلية % بعد تقريب اللوت؛ تحذير أصغر لوت 0.01؛ سعر التحويل من API مع إدخال يدوي عند الفشل؛ اختبارات ذاتية `*.selftest.ts` |
| دفتر الصفقات | implemented (SQLite) | `TradeJournalPanel.tsx` (أدوات ← الدفتر), `db.py` (`add_trade`/`close_trade`) | إدخال يدوي فقط — لا ربط وسيط؛ إحصاءات: نسبة النجاح، صافي النقاط، متوسط R للصفقات بوقف مسجَّل؛ المال المعرَّض بعملة التسعير حين يُكتب الحجم |
| تسجيل الخطة من الحاسبة بالدفتر | implemented | `PositionSizePanel.tsx` (`riskCalcLogToJournal`) | تُسجَّل صفقة مفتوحة |

---

## خلاصة المزودين

1. **Twelve Data**: شموع، quote، بحث، screener، backtest، تنبيهات، WS — حقيقي مع المفتاح وإلا seed.  
2. **OpenRouter**: AI — حقيقي مع المفتاح وإلا نص محلي.  
3. **RSS**: أخبار/تقويم — حقيقي مع fallback.  
4. **اجتماعي/محللون**: عرض حتمي — ليس مزود خارجي.  
5. **مزامنة multi-chart الزمنية**: مُتحقق سلوكياً (مهمة 7) — سكون بلا حلقة؛ OFF→ON؛ بان/زوم؛ 2/4 فريمات.  
6. **شارات حي / مصدر البيانات** (مهمة 8):
   - حقل `data_source` على الشموع من API (`provider`/`cache`/`demo`) و`mockSeries`/`seed` = تجريبي.
   - التيكات عبر WS تحمل `data_source`؛ «حي» فقط لمزود حديث؛ وإلا «تيك تجريبي» / «آخر سعر».
   - لا دمج تيك مزود في شموع تجريبية؛ شارات مستقلة لكل فريم.
   - شريط الحالة: «خادم متصل» ≠ بيانات سوق (مصدر الشموع/التيك منفصلان).
7. **لا** تنفيذ صفقات / وسطاء في هذا التطبيق.

*المقارنة الموثقة مع TradingView يتولاها Codex لاحقاً.*
