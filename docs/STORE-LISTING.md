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
> صفحة كردية — تُذكَر بالوصف فقط.

---

## العربية (ar)

**الاسم (App Store / Google Play)**
MATRIX Charts

**العنوان الفرعي (App Store)**
شارتات وتحليل فني للمتداولين

**الوصف القصير (Google Play)**
شارتات احترافية، مؤشرات، تنبيهات أسعار، تقويم اقتصادي وأكاديمية تداول بالعربية

**النص الترويجي (App Store)**
حلّل الفوركس والأسواق بشارتات سريعة وواضحة، وتعلّم التحليل الفني خطوة بخطوة في الأكاديمية الصوتية — واجهة عربية كاملة مصممة للمتداول الفردي.

**الكلمات المفتاحية (App Store)**
فوركس,شارت,تحليل فني,مؤشرات,تداول,شموع,تنبيهات,تقويم اقتصادي,ذهب,عملات,RSI,MACD,فيبوناتشي,تعليم

**الوصف الكامل**
MATRIX مساحة تحليل فني مصممة للمتداول الفردي: شارتات سريعة، أدوات رسم دقيقة، تنبيهات أسعار، وأكاديمية تعلّمك التحليل من الصفر — بواجهة عربية كاملة، وتدعم الإنجليزية والكردية أيضاً.

الشارت
• شموع يابانية، هايكن آشي، رينكو، كاجي، ونقطة ورقم.
• حتى أربعة شارتات في شاشة واحدة، مع مزامنة الزمن بينها عند الحاجة — فتقرأ الشمعة نفسها على الأربعة معاً.
• المس أي شمعة لترى افتتاحها وأعلاها وأدناها وإغلاقها ومداها بالنقاط، وكم نقطة يبعد المستوى عن السعر الحالي، ثم المس 🔔 لتضع تنبيه سعر عنده.
• عدّاد تحت السعر الحيّ يخبرك كم بقي على إغلاق الشمعة الجارية.
• المؤشرات التي يستخدمها المتداول فعلاً: المتوسطات المتحركة SMA وEMA، بولنجر، RSI، MACD، الفوليوم وغيرها.
• «عدسات» تضع مجموعة مؤشرات جاهزة بلمسة: هيكل (المتوسطات)، زخم (RSI وMACD)، سيولة (الفوليوم وبولنجر).
• أدوات رسم: خط اتجاه، شعاع، خطوط أفقية ورأسية، مستطيل، فيبوناتشي، مناطق وملاحظات، مع زرّ تراجع.
• أداة قياس تكتب المسافة بالنقاط والنسبة وعدد الشموع وأنت تسحب.
• إعادة تشغيل الشموع لتدريب عينك على قراءة الحركة.

المتابعة والتنبيهات
• قائمة متابعة شخصية لأزواج العملات والرموز التي تهمّك.
• تنبيهات سعر وتنبيهات مؤشرات (RSI، المتوسطات، MACD) تصلك كإشعار.
• تقويم اقتصادي وأخبار السوق في مكان واحد.

أدوات المتداول
• حاسبة حجم المركز: أدخل رصيدك ونسبة المخاطرة ووقف الخسارة (بالنقاط أو بسعرَي الدخول والوقف) لتعرف حجم اللوت، مع أهداف جاهزة بنسبة 1:1 حتى 1:3، وتقدير للهامش الذي يحجزه الوسيط حسب رافعتك، وخانتا سبريد وعمولة اختياريتان تُريانك مخاطرتك شاملةً التكاليف.
• دفتر صفقات تسجّل فيه صفقاتك بنفسك: الربح المحتمل بالمال قبل الدخول، ونتيجة كل صفقة بالنقاط والمال بعد الخروج، ثم نسبة النجاح والصافي لكل أداة ومتوسط النتيجة بوحدة المخاطرة (R).
• تنبيه قبل الصفقة إن اقترب خبر اقتصادي قوي على عملة الزوج أو المؤشر.
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
الإصدار الأول من MATRIX: شارتات متعددة، مؤشرات وأدوات رسم، تنبيهات أسعار ومؤشرات، تقويم اقتصادي، وأكاديمية صوتية للتحليل الفني.

---

## English (en-US / en-GB)

**Name (App Store / Google Play)**
MATRIX Charts

**Subtitle (App Store)**
Charts & Technical Analysis

**Short description (Google Play)**
Clean charts, indicators, price alerts, economic calendar and a trading academy

**Promotional text (App Store)**
Analyze forex and markets on fast, clean charts — and learn technical analysis step by step in the audio academy. Built for individual traders, in English and Arabic.

**Keywords (App Store)**
forex,charts,technical analysis,indicators,candlestick,alerts,economic calendar,gold,fx,rsi,macd

**Full description**
MATRIX is a technical-analysis workspace built for individual traders: fast charts, precise drawing tools, price alerts, and an academy that teaches you chart reading from the ground up. Available in English, Arabic and Kurdish.

CHARTS
• Candlesticks, Heikin-Ashi, Renko, Kagi and Point & Figure.
• Up to four charts on one screen, with optional time sync between them — read the same candle on all four at once.
• Tap any candle to see its open, high, low, close and range in pips, plus how many pips that level is from the current price, then tap 🔔 to set a price alert there.
• A countdown under the live price shows how long until the current candle closes.
• The indicators traders actually use: SMA and EMA moving averages, Bollinger Bands, RSI, MACD, Volume and more.
• One-tap "lenses" that add a ready set of indicators: Structure (moving averages), Momentum (RSI and MACD), Liquidity (volume and Bollinger).
• Drawing tools: trend line, ray, horizontal and vertical lines, rectangle, Fibonacci, zones and notes, with undo.
• A measure tool that shows pips, percent and bar count as you drag.
• Candle replay to train your eye on price action.

WATCHLIST & ALERTS
• A personal watchlist for the currency pairs and symbols you follow.
• Price alerts and indicator alerts (RSI, moving averages, MACD) delivered as notifications.
• Economic calendar and market news in one place.

TRADER TOOLS
• Position size calculator: enter your balance, risk % and stop loss (in pips, or as entry and stop prices) to get your lot size, with one-tap targets from 1:1 to 1:3, an estimate of the margin your broker holds at your leverage, and optional spread and commission fields that show your risk with costs included.
• A trade journal you fill in yourself: the potential profit in money before you enter, each trade's result in pips and money after you exit, then win rate, net result per instrument and average result in units of risk (R).
• A heads-up before a trade when high-impact economic news is close for the pair's or index's currency.
• Market screener using common indicator conditions.
• Simple strategy backtesting on historical data — for learning purposes.
• An AI assistant that answers your technical-analysis questions in your language, plus a short weekly report.
• Share a chart image in one tap.

ACADEMY
• Structured audio lessons in graded levels, starting from the basics.
• Ask the teacher mid-lesson and get an instant explanation.

Designed to stay readable: calm colors that are easy on the eyes in long sessions, with tactile feedback only where you touch.

Important: MATRIX is an analysis and education app only. It does not execute trades, does not connect to any broker, and does not provide investment advice. Trading currencies and financial markets involves a high level of risk and may result in the loss of capital. Market data shown may be delayed or demo data depending on the source.

**What's New (first release)**
The first release of MATRIX: multi-chart layouts, indicators and drawing tools, price and indicator alerts, an economic calendar, and an audio academy for technical analysis.

> **en-GB**: النص نفسه صالح بتعديلين للتهجئة البريطانية: «Analyze» بالنص الترويجي ← «Analyse»، و«colors» بالسطر قبل
> الأخير من الوصف ← «colours». لا تغيير في حدود الأحرف (نفس العدد).
