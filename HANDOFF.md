# HANDOFF — MATRIX (سجل تنفيذ Claude)

آخر تحديث: 2026-09-12 (Claude — تسليم رسمي: Claude مخطّط ومنفّذ مباشر لكود MATRIX، بروتوكول
"Cursor ينفّذ" متوقف. المهمة 25 (دفعة 13 ملف — لمسة ضغط/ظل) هي آخر تنفيذ مباشر، أول تشغيل
بوتيرة "عشرات الخطوات بكل تشغيل" بطلب أنس الصريح 2026-09-12.)

## المسار الصحيح

```
C:\Users\AkarTech\Downloads\souq-fx
```

---

## بروتوكول العمل (محدَّث 2026-09-12 — تسليم الأدوار)

**قرار المالك (أنس، بمحادثة مباشرة 2026-09-12):** إلغاء بروتوكول "Claude يوجّه بـHANDOFF.md
وCursor ينفّذ الكود". من الآن Claude هو المخطّط والمنفّذ المباشر لكود mobile/src (وبقية
المستودع). Cursor يتحوّل لدور ثانوي لاحق فقط: رفع/مشاركة، رأي بالتصميم، مساعدة عند طلب مباشر
من أنس — **ليس تنفيذ تلقائي لأي شيء بعد الآن**. لا حاجة لكتابة "مهمة" بصيغة توجيه لطرف آخر؛
Claude يقرر ويعدّل الكود مباشرة بنفس الجلسة (تفاعلية أو مجدولة).

### حذر قانوني (دائم)
محاور: **أمريكا · بريطانيا · طوكيو · سدني**. تنفيذ مستقل ومختلف بهوية MATRIX. لا نسخ علامات/واجهات حرفياً.
قاعدة: `.cursor/rules/ip-legal-caution.mdc`

### لمسة MATRIX (دائم — محدَّثة 2026-09-10)
سلاسة iOS/macOS بدون تقليد واجهاتهم؛ خلفية داكنة بحرية + تيل `#2DD4BF` يبقى الأساسي. جديد:
لوحة ثانوية دافئة متناسقة (2–3 ألوان بمعنى ثابت)، أزرار رئيسية بإيحاء لمسي iPhone، لمسات
تشجيعية مرتبطة بالتعلّم لا بحجم/تكرار التداول. اقرأ القاعدة كاملة قبل التنفيذ:
قاعدة: `.cursor/rules/matrix-tactile-feel.mdc`

### أمان الملفات عند الكتابة (إلزامي — دائم، محدَّث للنمط الجديد)
هذا الملف وROADMAP.md وملفات الكود بمستودع مشترك مع أحداث تنسيق غير مفسَّرة بالكامل تلمس مجموعة
ملفات دفعة واحدة أحياناً (نمط ملاحظ عدة مرات). لذلك قبل أي كتابة: `device_list_dir` أولاً للحصول
على mtime الحالي، ثم `device_stage_files` + قراءة فعلية، ثم مرّر نفس mtime كـ`expectedMtimeMs`
عند `device_commit_files`. لو رُفض الكتابة (mtime تغيّر): أعد القراءة وحاول مرة ثانية قبل التسليم.

### قيد التحقق الحالي (جديد ومهم — 2026-09-12)
صلاحية التحكم بجهاز أنس تسمح برؤية تطبيقات Terminal/IDE والضغط عليها بالماوس فقط، **بدون كتابة
أوامر فيها** (قيد أمان من منصة الجلسة نفسها). لذلك حالياً: **لا تشغيل تلقائي لـ`tsc --noEmit`،
ولا لقطات شاشة تلقائية من Expo web.** التحقق = مراجعة يدوية دقيقة للكود المعدَّل فقط (تطابق
أنماط TypeScript/React Native المستخدمة فعلياً بالملفات المجاورة، صحة الاستيراد، عدم لمس ملفات
خارج النطاق). أنس وافق صراحة على هذا الهامش المؤقت. إذا توفّر لاحقاً وصول فعلي لتشغيل أوامر
(device_bash أو ما شابه) على جهازه، يُستأنف تشغيل tsc/لقطات كخطوة تحقق إضافية فوق المراجعة اليدوية.

### دور Cursor الجديد (ثانوي، عند الطلب فقط)
رفع/مشاركة الكود، رأي/نقاش بالتصميم، مساعدة عند طلب مباشر من أنس بمحادثة. ليس منفّذاً تلقائياً
لأي مهمة بعد الآن — لا حاجة لملف تنسيق موجَّه له.

---

## سجل التنفيذ (يكتبه Claude، تراكمي — أحدث إدخال أولاً)

```
2026-09-12 — المهمة 25: دفعة كبيرة (13 ملف) — لمسة ضغط/ظل على أزرار لم تُعالَج بعد، بعد استنفاد
كل الملفات المفردة المتبقية من قائمة المهمة الأصلية (طلب أنس الصريح بوتيرة أعلى — عشرات الخطوات
بكل تشغيل بدل خطوة واحدة).

السياق: راجعت كل ملف من قائمة الملفات المتبقية (AiPanel, AnalystsPanel, CalendarPanel,
ChartFrame, CommissionPlanPanel, DomLitePanel, FocusChartModal, GroupChatPanel,
IndicatorForecastPanel, MatrixBottomDock, NetworkTreePanel, NewsPanel, PanSpeedSlider,
QuadChartModal, ScreenerMini, SocialConsensusPanel, SubscriptionPlansPanel, SymbolSearchBar,
VotePanel, WeeklyReportPanel, AccountScreen, CoursesScreen, MessagesScreen, TerminalScreen،
وبقية ToolsScreen) لتحديد أي زر فعلي يطابق النمط. النتيجة: بعضها بلا أي زر أساسي (DomLitePanel،
NewsPanel، PanSpeedSlider، QuadChartModal، SubscriptionPlansPanel، SymbolSearchBar،
ChartFrame، FocusChartModal، MatrixBottomDock، WeeklyReportPanel، TerminalScreen) — تُركت
كما هي (لا فجوة حقيقية لتطبيق النمط عليها بشكل ميكانيكي)، وToolsScreen مكتمل فعلاً من مهمة 18.
13 ملفاً فيها فجوة فعلية طُبِّق عليها التالي:

**أزرار رئيسية ممتلئة (ظل + ضغط — نفس نمط buttons.* المتحقَّق منه بالملفات السابقة):**
- GroupChatPanel.tsx — زر "إرسال" (send، خلفية colors.accent)
- AiPanel.tsx — زر "اسأل" (send، خلفية colors.dxy — نفس معاملة CTA الوحيد بالبطاقة)
- NetworkTreePanel.tsx — زر "✓" تأكيد وضع اسم بخانة الشجرة (slotGo، خلفية colors.accent)
- AccountScreen.tsx — styles.btn المشترك بين زر "تسجيل الخروج" وزر "دخول/إنشاء حساب" (كلاهما
  Pressable مستقل طُبِّق عليه النمط بشكل منفصل، والـdisabled={busy} بزر الإرسال كما هو)
- CoursesScreen.tsx — زر "رجوع" بمودال تفاصيل المدرسة (close، خلفية colors.accent)
- MessagesScreen.tsx — زر "إرسال" برسائل الخاص (send، خلفية colors.accent)

**أزرار/شرائح ثانوية (ضغط فقط بلا ظل — نفس معاملة أزرار WatchlistPanel الثانوية بمهمة 19):**
- AnalystsPanel.tsx, IndicatorForecastPanel.tsx, SocialConsensusPanel.tsx,
  CommissionPlanPanel.tsx, NetworkTreePanel.tsx (نفس الملف أعلاه) — زر "تحديث/توقّع/احسب"
  (نص بحدود فقط بلا تعبئة، أو Pressable بلا style أصلاً بحالة CommissionPlanPanel/NetworkTreePanel
  — أُضيف style={({pressed}) => ...} له مباشرة)
- ScreenerMini.tsx — شرائح الفحص السريع الثلاث (MA↑/RSI↓/زخم+)
- CalendarPanel.tsx — شرائح فلتر العملة وفلتر التأثير (نفس styles.chip المشترك، تطبيق واحد يغطي
  كلا الاستخدامين)
- VotePanel.tsx — زرا "موافق"/"رافض" (ألوان دلالية شبه شفافة وليست colors.accent الممتلئ، فاختير
  ضغط بلا ظل احتراماً لتصميمها القائم بدل فرض ظل أسود على ألوان غير الأساسية)

التنفيذ: import { buttons } من theme أُضيف لكل ملف من الـ13 (بجانب الاستيرادات القائمة)، بلا لمس
أي شيء آخر بكل ملف — لا منطق، لا أنماط أخرى، لا ملفات خارج هذه القائمة.

مراجعة يدوية: أعدت قراءة كل ملف من الـ13 كاملاً بعد التعديل (13 قراءة كاملة منفصلة) — تأكدت من:
صحة الاستيراد بكل ملف، تطابق بنية pressed/opacity/scale مع النمط المتحقَّق منه بالملفات السابقة
(AlertsPanel/IndicatorAlertsPanel/BacktestPanel/TradeJournalPanel/LayoutPanel/WatchlistPanel)،
عدم تغيير أي منطق أو JSX غير متعلق بالزر المستهدف، وعدم لمس أي ملف خارج القائمة أعلاه.
mtime-guard: device_list_dir قبل وبعد القراءة الأولية لكل مجلد (components/screens) — لا تغييرات
خارجية، فاستُخدمت نفس mtime الأصلية بكل device_commit_files (13/13 نجح، صفر رفض).
- **لم يُشغَّل tsc ولم تُؤخذ لقطة شاشة** (القيد التقني الموضّح أدناه، ساري منذ 2026-09-12).

ROADMAP.md: مهمة 25 [x] — 13 ملفاً بدفعة واحدة.

---
2026-09-12 — المهمة 24: ظل + ضغط لزر "حفظ التخطيط الحالي" (زر رئيسي ممتلئ بـLayoutPanel.tsx)

السياق: نفس نمط الأزرار الرئيسية الممتلئة المطبَّق فعلياً 5 مرات (ToolsScreen مهمة 18،
AlertsPanel مهمة 20، IndicatorAlertsPanel مهمة 21، BacktestPanel مهمة 22، TradeJournalPanel
مهمة 23). styles.btn (backgroundColor: colors.accent) بزر "حفظ التخطيط الحالي" بـLayoutPanel.tsx
لم يكن فيه ظل ولا حالة ضغط — نفس الفجوة المتكررة. هذا زر رئيسي بعرض كامل داخل بطاقة تخطيطات
محفوظة (يحفظ التخطيط الحالي للفريمات/الأزواج/الأطر الزمنية محلياً + عبر API عند توفره).

التنفيذ (مباشر من Claude، بدون توجيه لطرف آخر):
- mobile/src/components/LayoutPanel.tsx (ملف وحيد)
  · import buttons أُضيفت لسطر theme (بجانب colors/radii/spacing الموجودة)
  · styles.btn: ظل/elevation من توكنات buttons (نفس قيم runBtn/addBtn/btn السابقة بالضبط)
  · Pressable "حفظ التخطيط الحالي": pressed → opacity/scale من buttons (لا حالة disabled بهذا
    الزر أصلاً بالكود السابق — لم تُضَف، فقط لمسة الظل/الضغط المطلوبة)
  · لم يُمس حقل اسم التخطيط، ولا صفوف التخطيطات المحفوظة (Pressable "apply" للتطبيق، ولا زر
    "حذف")
- مراجعة يدوية: أعدت قراءة الملف كاملاً بعد التعديل — البنية مطابقة حرفياً لنفس النمط المُتحقَّق
  منه 5 مرات سابقاً (قارنته مباشرة مع IndicatorAlertsPanel.tsx)؛ import صحيح؛ لا أخطاء type
  ظاهرة؛ لا لمس لأي ملف آخر.
- **لم يُشغَّل tsc ولم تُؤخذ لقطة شاشة** (القيد التقني الموضّح أدناه، ساري منذ 2026-09-12).

ROADMAP.md: مهمة 24 [x].

---
2026-09-12 — المهمة 23: ظل + ضغط لزر "إضافة صفقة" (زر رئيسي ممتلئ بـTradeJournalPanel.tsx)

السياق: نفس نمط الأزرار الرئيسية الممتلئة المطبَّق فعلياً 4 مرات (ToolsScreen مهمة 18،
AlertsPanel مهمة 20، IndicatorAlertsPanel مهمة 21، BacktestPanel مهمة 22). btn
(backgroundColor: colors.accent) بزر "إضافة صفقة" بدفتر الصفقات لم يكن فيه ظل ولا حالة ضغط —
نفس الفجوة المتكررة، والملف يستخدم أصلاً disabled={busy} بنفس نمط الملفات السابقة.

التنفيذ (مباشر من Claude، بدون توجيه لطرف آخر):
- mobile/src/components/TradeJournalPanel.tsx (ملف وحيد)
  · import buttons أُضيفت لسطر theme (بجانب colors/radii/spacing الموجودة)
  · styles.btn: ظل/elevation من توكنات buttons (نفس قيم runBtn/addBtn/btn السابقة بالضبط)
  · Pressable "إضافة صفقة": pressed → opacity/scale من buttons؛ disabled={busy} كما هو
  · لم تُمس chips Buy/Sell، حقول الإدخال (الرمز/دخول/خروج/ملاحظة)، قائمة الصفقات، ولا رابط
    "إغلاق بسعر خانة الخروج"
- مراجعة يدوية: أعدت قراءة الملف كاملاً بعد التعديل — البنية مطابقة حرفياً لنفس النمط المُتحقَّق
  منه 4 مرات سابقاً (قارنته مباشرة مع IndicatorAlertsPanel.tsx)؛ import صحيح؛ لا أخطاء type
  ظاهرة؛ لا لمس لأي ملف آخر.
- **لم يُشغَّل tsc ولم تُؤخذ لقطة شاشة** (القيد التقني الموضّح أدناه، ساري منذ 2026-09-12).

ROADMAP.md: مهمة 23 [x].

---
2026-09-12 — المهمة 22: ظل + ضغط لزر "تشغيل Backtest" (زر رئيسي ممتلئ بـBacktestPanel.tsx)

السياق: نفس نمط الأزرار الرئيسية الممتلئة المطبَّق فعلياً 4 مرات (ToolsScreen مهمة 18،
AlertsPanel مهمة 20، IndicatorAlertsPanel مهمة 21). btn (backgroundColor: colors.accent) بزر
"تشغيل Backtest" لم يكن فيه ظل ولا حالة ضغط — نفس الفجوة المتكررة بالملفات الأخرى.

التنفيذ (مباشر من Claude، بدون توجيه لطرف آخر):
- mobile/src/components/BacktestPanel.tsx (ملف وحيد)
  · import buttons أُضيفت لسطر theme (بجانب colors/radii/spacing الموجودة)
  · styles.btn: ظل/elevation من توكنات buttons (نفس قيم runBtn/addBtn/btn السابقة بالضبط)
  · Pressable "تشغيل Backtest": pressed → opacity/scale من buttons؛ disabled={loading} كما هو
  · لم تُمس chips الاستراتيجيات (MA Cross/RSI/MACD/BB Bounce)، TimeframeBar، ولا أي جزء آخر
- مراجعة يدوية: أعدت قراءة الملف كاملاً بعد التعديل — البنية مطابقة حرفياً لنفس النمط المُتحقَّق
  منه 4 مرات سابقاً؛ import صحيح؛ لا أخطاء type ظاهرة؛ لا لمس لأي ملف آخر.
- **لم يُشغَّل tsc ولم تُؤخذ لقطة شاشة** (القيد التقني الموضّح أدناه، ساري منذ 2026-09-12).

ROADMAP.md: مهمة 22 [x] + صف Backtest بجدول التكافؤ محدَّث.

---
2026-09-12 — المهمة 21: ظل + ضغط لزر "إضافة تنبيه" (زر رئيسي ممتلئ بـIndicatorAlertsPanel.tsx)

السياق: نفس نمط الأزرار الرئيسية الممتلئة المطبَّق فعلياً 3 مرات (ToolsScreen مهمة 18،
AlertsPanel مهمة 20). btn (كان سطر ~180) زر ممتلئ (backgroundColor: colors.accent) بدون ظل
ولا حالة ضغط.

التنفيذ (مباشر من Claude، بدون توجيه لطرف آخر):
- mobile/src/components/IndicatorAlertsPanel.tsx (ملف وحيد)
  · import buttons أُضيفت لسطر theme
  · btn: ظل/elevation من توكنات buttons (نفس قيم runBtn/addBtn السابقة بالضبط)
  · Pressable "إضافة تنبيه": pressed → opacity/scale من buttons؛ disabled={busy} كما هو
  · لم تُمس chips (rsi/ma_cross/macd_cross، RSI فوق/تحت، Cross Up/Down) ولا زر "حذف"
- مراجعة يدوية: بنية الكود مطابقة حرفياً لنفس النمط المُتحقَّق منه 3 مرات سابقاً (تحقّق حقيقي
  من الكود الفعلي بكل مرة)؛ لا أخطاء type ظاهرة؛ لا لمس لأي ملف آخر.
- **لم يُشغَّل tsc ولم تُؤخذ لقطة شاشة** (القيد التقني أعلاه) — هذا أول تنفيذ تحت النمط الجديد.

ROADMAP.md: مهمة 21 [x] (مراجعة يدوية فقط)، سيُختار التالي بنفس الأسلوب.
```

---

## الأرشيف: التعاون مع Cursor كمنفّذ (مهام 17–20، البروتوكول القديم — متوقف 2026-09-12)

<details>
هذا القسم تاريخي فقط، محفوظ للسياق. لا يُكتب إليه أي شيء جديد.

### توجيهات كانت تُكتب لـCursor (آخر واحدة، مهمة 20)

```
المهمة 20 — ظل + حالة ضغط لزر "إضافة" التنبيه (زر رئيسي ممتلئ بـAlertsPanel.tsx)
[نُفِّذت وتحقَّقت من الكود؛ دليل اللقطات كان غير صالح — أُلغي الحاجة لهذا الشرط بالبروتوكول الجديد]
```

### ردود Cursor السابقة (تراكمي، تاريخي)

```
2026-09-11 — Cursor أكمل المهمة 17 (توكنات تصميم: لوحة دافئة + زر iPhone).
الملف الوحيد: mobile/src/theme.ts — warmAccent/infoAccent/buttons(shadow*/elevation/pressed*).
tsc --noEmit → 0

---
2026-09-11 — Cursor أكمل المهمة 18 (أول تطبيق توكنات الزر على «تشغيل Screener»).
الملف الوحيد: mobile/src/screens/ToolsScreen.tsx — import buttons، runBtn ظل، Pressable pressed.
tsc --noEmit → 0. لقطات: t18-screener-btn-normal.png / t18-screener-btn-pressed.png

---
2026-09-11 — Cursor أكمل المهمة 19 (لمسة ضغط لأزرار قائمة المتابعة).
الملف الوحيد: mobile/src/components/WatchlistPanel.tsx — إضافة/افتراضي/إضافة رمز → pressed فقط
(بلا ظل). tsc --noEmit → 0. لقطة: t19-watchlist-add-pressed.png

---
2026-09-11 — Cursor أكمل المهمة 20 (ظل + ضغط لزر «إضافة» التنبيه).
الملف الوحيد: mobile/src/components/AlertsPanel.tsx — import buttons، addBtn ظل، Pressable
pressed، disabled={busy} كما هو. tsc --noEmit → 0.
لقطات: t20-alert-add-normal.png + t20-alert-add-pressed.png — **لاحقاً تبيّن أنهما متطابقتان
بايت-لبايت (60885 بايت لكل منهما) أي دليل ضغط غير صالح** — لكن الكود نفسه تحقّق منه Claude
وصحيح 100%. تحت البروتوكول الجديد، صحة الكود بالمراجعة اليدوية كافية؛ لا حاجة لإعادة اللقطة.

---
2026-09-12 — Cursor: تسليم الأدوار لأنس/Claude (بطلب صريح من أنس، مذكور بالمحادثة المباشرة
لاحقاً أيضاً وأُكِّد رسمياً هناك). أوقف Cursor محلياً scripts/matrix-handoff-watchdog.ps1.
```

</details>
