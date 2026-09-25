# MATRIX — نصوص صفحتَي المتجر (App Store + Google Play) — مسودة للاعتماد

> **الحالة**: مسودة كتبها Claude (2026-09-21، تشغيل مجدول على سيرفر الـVPS) — تنفيذ البند (ب).4 بـ`docs/ROADMAP.md`.
> تحتاج **اعتماد أنس النهائي** قبل لصقها بـApp Store Connect وGoogle Play Console. اللقطات (screenshots) غير مشمولة —
> تحتاج جهازاً/محاكياً.
>
> **قواعد كتابة هذه النصوص (لا تُكسَر عند التعديل)**:
> 1. لا اسم منافس ولا علامة تجارية لطرف آخر بأي حقل (Apple ترفض أسماء تطبيقات أخرى بالكلمات المفتاحية، و`ip-legal-caution.mdc`).
> 2. لا وعد بربح ولا «إشارات مضمونة» ولا كلمة «توصيات» — تطبيق تحليل وتعليم فقط؛ لا تنفيذ صفقات ولا ربط وسيط.
> 3. لا ادعاء «بيانات لحظية/حية» مطلق — مصدر البيانات يعتمد على المزوّد وقد يظهر كتجريبي (`data_source`).
> 4. لا نذكر ميزات بيانات تجريبية (الإجماع الاجتماعي، توقعات المحللين) كميزة حقيقية.
> 5. حدود الأحرف أدناه **مُتحقَّق منها بسكربت** (عدّ أحرف Unicode). أي تعديل → أعد العدّ.
>
> حدود المتاجر: Apple — الاسم 30، العنوان الفرعي 30، النص الترويجي 170، الكلمات المفتاحية 100 (مفصولة بفواصل بلا
> مسافات)، الوصف 4000. Google — العنوان 30، الوصف القصير 80، الوصف الكامل 4000.
> الفئة المقترحة: **Finance** (أساسية) / **Education** (ثانوية بـApple). المعرّف: `com.matrix.charts`.
> **التسعير (تحقّقتُ بالكود 2026-09-24)**: لا شراء داخل التطبيق ولا ميزة مقفلة — فالنصوص أدناه لا تذكر سعراً ولا
> «Premium»، والتطبيق يُعلَن مجانياً بلا مشتريات داخلية. لوحة «باقات MATRIX» بتبويب الحساب تعرض أسعاراً بلا طريق شراء —
> مانع بـ`docs/RELEASE-MOBILE.md` §0. إن رُبط شراء حقيقي فأضِف سطر التسعير هنا واعكس جواب «In-app purchases».
> ولا يُذكر هنا «تقرير العمولات» ولا «شجرة الشبكة» عمداً (المانع نفسه).
> لغات المتجر: العربية + English (U.S.) + English (U.K.). الكردية مدعومة داخل التطبيق لكن App Store لا يوفّر لغة
> صفحة كردية — تُذكَر بالوصف فقط. **تنبيه صادق (2026-09-24)**: الكردي ما زال يرى بالعربية شرائح الإطار الزمني بالشاشة الرئيسية
> (`TIMEFRAME_LABELS`) ولوحتي العمولات والشبكة، حتى تُوصَل مفاتيح `tfLabels`/`cpp*`/`ntp*` الجاهزة بـ`locales.ts`.
> **حقل «اللغات» بصفحة App Store غير لغات الصفحة أعلاه**: أبل تملؤه من التوطينات داخل حزمة البناء لا من App Store Connect.
> بلا `expo.locales` كانت الحزمة تُعلن الإنجليزية وحدها، فتقول الصفحة «English» لتطبيق عربي أولاً. أُضيف (2026-09-25) `ar`/`en`/`ckb`
> بـ`app.json` — **لم يُتحقَّق بعد من بناء فعلي**؛ افحص الحقل بعد أول رفع لـTestFlight (`RELEASE-MOBILE.md` الخطوة 139).

---

## العربية (ar)

**الاسم (App Store / Google Play)**
MATRIX Charts

**العنوان الفرعي (App Store)**
شارتات وتحليل فني للمتداولين

**الوصف القصير (Google Play)**
شارتات احترافية، مؤشرات، تنبيهات أسعار، تقويم اقتصادي وأكاديمية تداول بالعربية

**النص الترويجي (App Store)**
حلّل الفوركس والأسواق بشارتات سريعة وواضحة، وتعلّم التحليل الفني خطوة بخطوة في الأكاديمية الصوتية — واجهة عربية كاملة مصممة للمتداول الفردي، وبالإنجليزية والكردية أيضاً.

**الكلمات المفتاحية (App Store)**
فوركس,شارت,تحليل فني,مؤشرات,تداول,شموع,تنبيهات,تقويم اقتصادي,ذهب,عملات,RSI,MACD,فيبوناتشي,تعليم

**الوصف الكامل**
MATRIX مساحة تحليل فني مصممة للمتداول الفردي: شارتات سريعة، أدوات رسم دقيقة، تنبيهات أسعار، وأكاديمية تعلّمك التحليل من الصفر — بواجهة عربية كاملة، وتدعم الإنجليزية والكردية أيضاً.

الشارت
• 11 نوعاً للشارت: شموع يابانية ومجوّفة، أعمدة، هايكن آشي، خط، مساحة، خط أساس، رينكو، كاجي، نقطة ورقم، ونطاق (Range).
• حتى أربعة شارتات في شاشة واحدة، مع مزامنة الزمن بينها عند الحاجة — فتقرأ الشمعة نفسها على الأربعة معاً.
• قارن زوجين على شارت واحد: في الشارت المكبَّر اضغط مطوّلاً على رمز من قائمتك فيُرسم فوق الأول بخطّ بنفسجي، كل شمعة مقابل نظيرتها في الوقت نفسه.
• المس أي شمعة لترى افتتاحها وأعلاها وأدناها وإغلاقها ومداها بالـpip وتغيّرها عن إغلاق السابقة، وكم pip يبعد المستوى عن السعر الحالي، ثم المس 🔔 لتضع تنبيه سعر عنده.
• كبّر وصغّر بإصبعين، والشمعة الجارية تبقى أمامك. واسحب محور السعر لتطول الشموع أو تقصر. ارجع للخلف تدرس نموذجاً قديماً فتبقى الشموع ثابتة تحت إصبعك، ولمسة واحدة تعيدك لآخر شمعة دون أن تفقد التكبير.
• عدّاد تحت السعر الحيّ يخبرك كم بقي على إغلاق الشمعة.
• سعر أعلى قمّة وأدنى قاع على الشاشة مكتوب عند ذيليهما ويتحدّث وأنت تسحب، وخطّ خافت يفصل كل يوم تداول عن الذي يليه على الفريمات الصغيرة.
• المؤشرات التي يستخدمها المتداول فعلاً: المتوسطات المتحركة SMA وEMA، بولنجر، RSI، MACD، إيشيموكو، الفوليوم وغيرها وقيمة كل خطّ مكتوبة بجانب اسمه، ومستويات الارتكاز (Pivot وCamarilla وفيبوناتشي وWoodie) وأعلى الأمس وأدناه وبجانب كل مستوى سعره، وتظليل جلسات طوكيو ولندن ونيويورك.
• «عدسات» تضع مجموعة مؤشرات جاهزة بلمسة: هيكل (المتوسطات)، زخم (RSI وMACD)، سيولة (الفوليوم وبولنجر وCVD؛ فوليوم الفوركس وCVD تقدير من الشموع).
• أدوات رسم: خط اتجاه، شعاع، قناة موازية، خطوط أفقية ورأسية، مستطيل، فيبوناتشي، مناطق وملاحظات تكتب نصّها، مع زرّ تراجع وزرّ «نسخة» يكرّر الرسم بلمسة — حتى في المساحة الفارغة يمين آخر شمعة. أزرار ▲▼◀▶ تُزيح الرسم المحدَّد pip واحداً أو شمعة بكل لمسة. الخط الأفقي يكتب بُعده عن السعر بالـpip، والمنطقة ارتفاعها. وما ترسمه على فريم يظهر على بقية فريمات الرمز نفسه.
• خطّط صفقة شراء أو بيع على الشارت: اسحب من الدخول إلى الوقف فيظهر الهدف، والمسافتان بالـpip، ونسبة العائد إلى المخاطرة — واسحب الهدف لتغيّر النسبة. وعلى الشموع السابقة ترى هل بلغ السعر الهدف أم الوقف.
• أداة قياس تكتب المسافة بالـpip والنسبة وعدد الشموع وكم استغرقت الحركة من وقت، وأنت تسحب.
• إعادة تشغيل الشموع لتدريب عينك على قراءة الحركة.

المتابعة والتنبيهات
• قائمة متابعة شخصية لأزواج العملات والرموز التي تهمّك.
• تنبيهات سعر وتنبيهات مؤشرات (RSI، المتوسطات، MACD) تصلك كإشعار.
• تقويم اقتصادي وأخبار السوق في مكان واحد.

أدوات المتداول
• حاسبة حجم المركز: أدخل رصيدك والمخاطرة (نسبةً أو مبلغاً بعملة حسابك) ووقف الخسارة (بالـpip أو بسعرَي الدخول والوقف) لتعرف حجم اللوت — لحساب عادي أو حساب سنت أو micro — مع أهداف جاهزة بنسبة 1:1 حتى 1:3، وتقدير للهامش الذي يحجزه الوسيط حسب رافعتك، وخانتا سبريد وعمولة اختياريتان تُريانك مخاطرتك وربحك الصافي شاملَين التكاليف — وتنبّهك حين يكون وقفك أضيق من السبريد نفسه.
• دفتر صفقات تسجّل فيه صفقاتك بنفسك: الربح المحتمل بالمال قبل الدخول، ونتيجة كل صفقة بالـpip والمال تراها قبل أن تحفظها — ولمسة واحدة تغلقها على وقفها أو نقطة التعادل أو هدفها بالضبط — ثم نسبة النجاح والصافي لكل أداة ومتوسط النتيجة بوحدة المخاطرة (R) مقيسةً من الوقف الذي دخلت به ولو حرّكته بعدها.
• تنبيه بخبر اقتصادي قوي قريب على عملة الزوج أو المؤشر أو المعدن — قبل الصفقة وعلى صفقاتك المفتوحة، بأسماء الرموز كما يكتبها وسيطك. وإن تعذّر تحميل التقويم يقول لك ذلك صراحةً، فلا تظنّ أن لا خبر.
• «فحص السوق»: فلترة الأزواج بشروط المؤشرات الشائعة.
• اختبار استراتيجيات بسيطة على البيانات التاريخية — لأغراض تعليمية.
• مساعد ذكاء اصطناعي يجيب عن أسئلتك في التحليل الفني بلغتك، وتقرير أسبوعي مختصر.
• مشاركة صورة الشارت بضغطة.

الأكاديمية
• دروس صوتية منظّمة بمستويات متدرّجة تبدأ من الأساسيات.
• اسأل المدرّس أثناء الدرس واحصل على شرح فوري.

مصمّم ليبقى واضحاً: ألوان هادئة مريحة للعين في الجلسات الطويلة، ولمسات تفاعلية حيث تلمس فقط.

تنبيه مهم: MATRIX تطبيق تحليل وتعليم فقط. لا ينفّذ صفقات، ولا يرتبط بأي وسيط، ولا يقدّم نصيحة استثمارية. التداول بالعملات والأسواق المالية ينطوي على مخاطر عالية وقد يؤدي إلى خسارة رأس المال. البيانات المعروضة قد تكون متأخرة أو تجريبية حسب المصدر.

**ما الجديد (الإصدار الأول)**
الإصدار الأول من MATRIX بالعربية والإنجليزية والكردية: شارتات متعددة، مؤشرات وأدوات رسم، تنبيهات أسعار ومؤشرات، حاسبة حجم المركز ودفتر صفقات، تقويم اقتصادي، وأكاديمية صوتية للتحليل الفني.

---

## English (en-US / en-GB)

**Name (App Store / Google Play)**
MATRIX Charts

**Subtitle (App Store)**
Charts & Technical Analysis

**Short description (Google Play)**
Clean charts, indicators, price alerts, economic calendar and a trading academy

**Promotional text (App Store)**
Analyze forex and markets on fast, clean charts and learn chart reading step by step in the Arabic audio academy. For individual traders, in English, Arabic and Kurdish.

**Keywords (App Store)**
forex,charts,technical analysis,indicators,candlestick,alerts,economic calendar,gold,fx,rsi,macd

**Full description**
MATRIX is a technical-analysis workspace built for individual traders: fast charts, precise drawing tools, price alerts, and an academy that teaches you chart reading from the ground up. Available in English, Arabic and Kurdish.

CHARTS
• 11 chart types: solid/hollow candles, bars, Heikin-Ashi, line, area, baseline, Renko, Kagi, Point & Figure, Range.
• Up to four charts on one screen with optional time sync — or overlay a second symbol on one chart, aligned in time.
• Tap any candle for its OHLC, range and change from the previous close, plus that level's distance from price in pips, then 🔔 sets an alert there.
• Pinch to zoom — the live candle stays in view. Drag the price axis to stretch candles. Scroll back; one tap returns to the live candle, zoom intact.
• A countdown under the live price to the candle's close.
• The on-screen high and low carry their price and update as you scroll, and a faint line marks each new trading day on intraday charts.
• Indicators traders use: SMA, EMA, Bollinger Bands, RSI, MACD, Ichimoku, Volume and more, each line's value in the legend, plus pivots (classic, Camarilla, Fibonacci, Woodie) and yesterday's high and low, and Tokyo, London and New York session shading.
• One-tap "lenses" that add a ready set of indicators: Structure (moving averages), Momentum (RSI and MACD), Liquidity (volume, Bollinger, CVD; forex volume and CVD are estimated from candles).
• Drawing tools: trend line, ray, parallel channel, horizontal and vertical lines, rectangle, Fibonacci, zones and typed notes, with undo and one-tap cloning — also past the live candle. ▲▼◀▶ buttons move a selected drawing one pip or one candle per tap. A horizontal line shows its distance from price in pips; a zone, its height. Drawings follow the symbol across timeframes.
• Plan a buy or sell on the chart: drag from entry to stop to see the target, both distances in pips and the reward-to-risk ratio — drag the target to change it. On past candles it shows whether price hit the target or the stop.
• A measure tool showing pips, percent, bar count and how long the move took as you drag.
• Candle replay to train your eye.

WATCHLIST & ALERTS
• A watchlist of the symbols you follow.
• Price and indicator alerts (RSI, moving averages, MACD) as notifications.
• Economic calendar and market news.

TRADER TOOLS
• Position size calculator: enter your balance, risk (percent or amount) and stop loss (in pips, or entry and stop prices) to get your lot size — standard, cent or micro accounts — with one-tap targets from 1:1 to 1:3, an estimate of the margin your broker holds at your leverage, and optional spread and commission so your risk and net profit include costs — and warns when your stop sits inside the spread.
• A trade journal you fill in yourself: the potential profit in money before you enter, each trade's result in pips and money before you save it — one tap closes it at its stop, breakeven or target — then win rate, net result per instrument and average R, from your entry stop even after trailing it.
• Heads-up when high-impact news nears the pair's, index's or metal's currency — before a trade and on open ones, in your broker's symbol names. If the calendar can't load, it says so.
• A screener on common indicator conditions.
• Simple strategy backtests on past data, for learning.
• An AI assistant for chart questions, in your language, plus a short weekly report.
• Share a chart image in one tap.

ACADEMY
• Audio lessons in Arabic, in graded levels from the basics.
• Ask the teacher mid-lesson and get an instant explanation.

Calm colors for long sessions, with tactile feedback only where you touch.

Important: MATRIX is an analysis and education app only. It does not execute trades, does not connect to any broker, and does not provide investment advice. Trading currencies and financial markets involves a high level of risk and may result in the loss of capital. Market data shown may be delayed or demo data depending on the source.

**What's New (first release)**
The first release of MATRIX, in English, Arabic and Kurdish: multi-chart layouts, indicators and drawing tools, price and indicator alerts, a position size calculator and trade journal, an economic calendar, and an audio academy for technical analysis.

> **en-GB**: النص نفسه صالح بتعديلين للتهجئة البريطانية: «Analyze» بالنص الترويجي ← «Analyse»، و«colors» بالسطر قبل
> الأخير من الوصف ← «colours». لا تغيير في حدود الأحرف (نفس العدد).

> **2026-09-25 (launch 57)**: أُضيفت «المقارنة» (ar سطر مستقل؛ en مدموجة بسطر الشارتات الأربعة) — `FocusChartModal` ضغطة مطوّلة على رمز
> بالقائمة، مطابقة بالزمن (`compareOverlay`، `3ac665b`). الإنجليزي كان 3979 حرفاً فاختُصرت أربع عبارات (الارتكاز، الرجوع للخلف، القمّة/القاع،
> أداة القياس) بلا حذف ميزة. العدّ بسكربت: **ar 3649 / en 3993** من 4000.

> **2026-09-25 (launch 58)**: سطر الرسم يذكر الملاحظة المكتوبة (`92a3a87`) والرسم يمين الشمعة الحيّة (`80f4235`)؛ لإفساح الإنجليزي اختُصر سطرا
> الإعادة والباكتست بلا حذف ميزة. العدّ: **ar 3699 / en 3995** من 4000.

> **2026-09-25 (launch 59)**: سطر الدفتر: متوسط R «من الوقف الذي دخلت به ولو حرّكته» — `noteWithInitialStop`/`initialStop` (`9798121`، مختبَر،
> بلا جهاز). لإفساح الإنجليزي اختُصرت خمس عبارات (الدفتر، الحاسبة، الرجوع للخلف، تنبيه الخبر، سطر الألوان) بلا حذف ميزة. العدّ: **ar 3747 / en 3996** من 4000.

> **2026-09-25 (launch 63)**: الوصف العربي كان يقول «بالنقاط» / «كم نقطة» للمسافات والمدى والوقف ونتيجة الصفقة (6 مواضع)، والتطبيق نفسه صار
> يقول «pip» بالعربية (`570cb08`، `afbb0c2`، `5c66653`) لأنّ متداول MT4/5 يقرأ «النقاط» points = عُشر pip — فيظنّ الوقف عُشر ما هو. استُبدلت
> بـ«بالـpip» كنصوص الواجهة؛ «نقطة التعادل» باقية (breakeven، لا مسافة). الإنجليزي كان «pips» أصلاً. العدّ بسكربت (نصّ الوصف بين عنوانه و«ما
> الجديد»): **ar 3746 / en 3996** من 4000.


> **2026-09-25 (launch 65)**: سطر التقاطع يذكر التغيّر عن إغلاق الشمعة السابقة (`b70f388`، `5cdd75f`)، وسطر المؤشرات قيمة كل خطّ
> بالمفتاح (`f0b7a43`). لإفساح الإنجليزي اختُصر سطرا العدّاد والماسح وعبارة محور السعر بلا حذف ميزة، و«open, high, low, close» ⇒ «OHLC».
> العدّ: **ar 3803 / en 4000** من 4000 (بلا هامش — أي إضافة تحتاج اختصاراً).

> **2026-09-25 (launch 73)**: سطر الرسم يذكر القناة الموازية (`DRAW_TOOLS` `channel`، `fitChannelWidth` مختبَر) وزرّ «نسخة» للرسم المحدَّد (`39e26a2`)
> — كلاهما بلا تجربة على جهاز. لإفساح الإنجليزي اختُصرت أربع عبارات (قائمة المتابعة، التقويم، المساعد، الأكاديمية) بلا حذف ميزة.
> العدّ بسكربت: **ar 3846 / en 3996** من 4000.

> **2026-09-25 (launch 77)**: محتوى الأكاديمية (44 محاضرة بعناوينها وسردها الصوتي، `backend/academy_data.py`) **عربي فقط** — تحقّقتُ: لا حقل
> إنجليزي/كردي، و`CoursesScreen.tsx:269` يطبع `lec.title` كما هو. الوصف الإنجليزي كان يعد بـ«Audio lessons» بلا لغة فيجد المستخدم الإنجليزي دروساً
> عربية. الآن «Audio lessons in Arabic» والنص الترويجي «the Arabic audio academy» (اختُصر «Built for» ⇒ «For» ليبقى ≤170). شرح المدرّس أثناء
> الدرس يُطلب بلغة الواجهة (`lang` بـ`LectureClassroom.tsx:304`) فلم أوسمه. إن تُرجم المحتوى (QA27 ← أنس) تُحذف «in Arabic».
> العدّ بسكربت: **en 3997** من 4000، الترويجي **166** من 170.

> **2026-09-25 (launch 79)**: سطر الرسم (ar/en) يذكر أزرار ▲▼◀▶ للرسم المحدَّد (`51777fd`؛ تحقّقتُ `MatrixChart.tsx` `nudgeButtons`، تظهر ما دام
> رسمٌ محدَّداً بالهاتف والشاشة العريضة) — على الهاتف هي ما يجعل «أدوات رسم دقيقة» صادقة. «pip» دقيق للأزواج والمعادن؛ للمؤشرات والكريبتو
> الخطوة بكسل من المحور (`nudgeSelectedDrawing`) — لم أفصّل ذلك بالوصف. لإفساح الإنجليزي اختُصرت ست عبارات بلا حذف ميزة (الرجوع للخلف،
> خطّ بداية اليوم، التنبيهات، قائمة المتابعة، 🔔، المساعد). العدّ بسكربت: **ar 3907 / en 3993** من 4000.

> **2026-09-25 (launch 82)**: النص الترويجي ar/en يذكر الكردية — مدعومة بالتطبيق (`locales.ts` `ku`، 970 مفتاحاً كالعربي) وبالوصف الكامل،
> وكان الترويجي الإنجليزي يقول «English and Arabic» وحدهما. لإفساحه «technical analysis» ⇒ «chart reading» (النص الترويجي لا يدخل بحث App Store،
> والعبارة باقية بالعنوان الفرعي والكلمات المفتاحية). العدّ بسكربت: **ar 169 / en 169** من 170. تنبيه الكردية بالأعلى (شرائح الإطار) ما زال قائماً.

> **2026-09-25 (launch 83)**: سطر أنواع الشارت (ar/en) كان يذكر خمسة من **11** بـ`CHART_KINDS` (`chart/types.ts:245`) — أُضيفت المجوّفة والأعمدة والخط
> والمنطقة وخط الأساس والنطاق (Range). وسطر المؤشرات يذكر Ichimoku (`types.ts:340`؛ السحابة تمتدّ لمنطقة المستقبل منذ `96c33e9`، بلا تجربة على جهاز).
> لإفساح الإنجليزي اختُصرت خمس عبارات بلا حذف ميزة («average result in units of risk (R)» ⇒ «average R»، «bar by bar in time» ⇒ «in time»،
> «technical-analysis questions» ⇒ «chart questions»، «exactly»، «backtesting» ⇒ «backtests»). العدّ بسكربت: **ar 3983 / en 3999** من 4000.

> **2026-09-25 (launch 84، QA32)**: سطر أنواع الشارت العربي «منطقة» ⇒ «مساحة» كما التطبيق منذ `290e166` (الطول نفسه، 5 أحرف ⇒ العدّ 3983 بلا تغيير).
> ونصوص «رينكو/كاجي/نقطة ورقم» صارت مفاتيح بالقاموس (`ctlKindRenko/Kagi/Pnf`) — **ربطها chart** بـ`KIND_KEYS` (`44d0096`) ⇒ التطبيق والمتجر بالأسماء نفسها (بلا تجربة على جهاز، الخطوة 306).

> **2026-09-25 (launch 87، QA35)**: عدسة «سيولة» كانت تقول إن CVD وحده تقديري، والفوليوم للفوركس نفسه مختلَق من أجسام الشموع (`withVolume`،
> `chart/types.ts` — المزوّد يرسل 0) ⇒ «فوليوم الفوركس وCVD تقدير من الشموع» / «forex volume and CVD are estimated from candles». لإفساح الإنجليزي:
> «SMA and EMA» ⇒ «SMA, EMA» و«The indicators» ⇒ «Indicators». العدّ: **ar 3978 / en 3997** من 4000.

> **2026-09-25 (launch 85)**: «ما الجديد» يذكر اللغات الثلاث وحاسبة حجم المركز ودفتر الصفقات (أداتا المتداول الأساسيتان، كلتاهما بالوصف الكامل).
> العدّ: **ar 187 / en 252** حرفاً — تحت حدّ Google Play لـ«ما الجديد» (500).

> **2026-09-25 (launch 89)**: سطر تنبيه الخبر كان «قبل الصفقة» فقط؛ منذ `a318e43` يظهر أيضاً فوق صفقات الدفتر **المفتوحة** ويسمّي الرموز التي
> يمسّها ⇒ «قبل الصفقة وعلى صفقاتك المفتوحة» / «before a trade and on open ones». للإنجليزي: «A heads-up» ← «Heads-up»، «with» ← «in»، «fails to load»
> ← «can't load». العدّ بسكربت: **ar 3997 / en 4000** من 4000 — الإنجليزي على الحدّ بالضبط، فأي إضافة قادمة تحتاج اختصاراً مقابلاً.
> **2026-09-25 (launch 98)**: الارتكاز يذكر **Woodie** (`woodiePivots` بقائمة `INDICATORS`، `types.ts:370`) — صار بصيغة TradingView (افتتاح الجلسة الجارية،
> `98e25a3` داخل اليوم و`2ff057f` على D/W، مختبَر). DeMark وCPR موجودان أيضاً ولم يُذكرا لضيق الحدّ. للإفساح: «pivot levels» ← «pivots»، «the current
> candle's close» ← «the candle's close»، و«الشمعة الجارية» ← «الشمعة». العدّ بسكربت: **ar 3997 / en 3994** من 4000.
