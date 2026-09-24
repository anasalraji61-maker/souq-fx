# LOG-QA — سجل وكيل الجودة

## 2026-09-24 — الدورة 1
**البناء:** كان أحمر بـ66 خطأ tsc (60 منها ملفات selftest بلا @types/node) ⇒ **أخضر 0**.
- b484754 `candleTimeSec` مستورد من dataSource ومعرّف محلياً بـMatrixChart (تعارض ربط) — حُذفت النسخة المحلية المتطابقة.
- 4315956 **خلل سلوكي حقيقي**: `hitDrawing()` يعيد id نصاً والكود قارن `?.id` ⇒ undefined دائماً ⇒ سحب جسم الرسم المحدَّد لم يبدأ أبداً. صار `!== d.id`.
- نوعيّات بلا أثر تشغيلي: sourceRef.plot بلا time، تضييق d.b داخل map، اتحاد side، و`mv.r` unknown بـTradeJournalPanel.
- @types/node ~20.19 (Node الخادم 20) في devDependencies + `"types": ["node"]` في tsconfig (TS 6 لم يعد يضمّ @types تلقائياً). مقايضة: عموميات Node صارت مرئية بكود التطبيق أيضاً. package-lock أُعيد تزامنه مع package.json (كان متأخراً: 1.0.0، expo-splash-screen). qa-build-check.sh صار متتبَّعاً.
**Selftests:** 57/57 ناجح (`npx tsx`).
**المراجعة (a — تكرار/كود ميت/تصديرات بلا مستورد):** 7 مجموعات تكرار، 17 تصديراً بلا أي مستخدم، 82 `export` زائداً (مستخدم محلياً فقط)، 3 متغيرات ميتة (أبرزها `dxyPrice` بـTerminalScreen:868)، 18 استيراداً ميتاً بملفات indicators. أُرسلت لأصحابها في COORDINATION.md.
**اكتشاف أثناء التحقق:** `backend/twelve_data.py:148-153` يرسل volume=0 لا null ⇒ مؤشرات الحجم على الفوركس تعمل على أصفار.
**التنسيق:** 33 بنداً مفتوحاً مُتحقَّقاً منه بالكود؛ 4 مجموعات أُسقطت لأنها منجزة فعلاً.
**الدورة القادمة:** المراجعة (b) — نصوص ثابتة خارج locales.ts.

## 2026-09-24 — الدورة 2
**البناء:** أخضر 0 قبل وبعد سحب 9 commits جديدة (a0197cc) — لا إصلاح لازم.
**Selftests:** 59/59 ناجح (أُضيف `withVolume.selftest.ts`).
**المراجعة (b — نصوص ثابتة خارج locales.ts)، مُتحقَّق منها بالكود:**
- launch: `CommissionPlanPanel`/`NetworkTreePanel`/`TreeDiagramSketch` بلا `useI18n` (~55 نصاً عربياً فقط)، `AccountScreen.tsx:248`، `MessagesScreen` (غير مركّبة)، قاموس `SubscriptionPlansPanel` داخلي.
- **خلل مؤكّد**: `TimeframeBar arabic={rtl}` + `isRtl('ku')`=true ⇒ الكردي يرى أطراً عربية.
- chart: زر «Log» (:5173) بلا a11y، `'MATRIX Chart'`، جلسات Tokyo/London/New York.
- tools: `planJournalNote()` إنجليزية دائماً وتُحفظ بالدفتر.
- لا اسم منافس في نص معروض.
**اكتشاف (d):** `instrumentSpec('GOLDm')`=null مقابل `chartPipSpec('GOLDm')`=XAUUSD.
**التنسيق:** 10 بنود أُسقطت بعد التحقق (AUTO a11y، Bar Replay، mcHint*/MeasureDur/BarOne، EURUSD.c، diOf، حجم الفوركس الصفري…). 28 بنداً مفتوحاً؛ بنود `backend/` بلا مالك رُفعت لأنس.
**ملاحظة:** وكيل الأدوات (run 33) لم يرَ COORDINATION.md — نسخته كانت قبل d2d6d63.
**الدورة القادمة:** المراجعة (c) — عناصر تفاعلية بلا accessibilityLabel.

## 2026-09-24 — الدورة 3
**البناء:** أخضر 0 (بعد 732a7d4) — لا إصلاح لازم.
**Selftests:** 59/59 ناجح (`npx tsx`).
**التحقّق من إغلاقات الوكلاء بالكود:** مُغلق فعلاً — `instrumentSpec('GOLDm')`⇒XAUUSD (شُغِّل)، `chartExtraLabels`/`EXTRA_TOOL_LABELS` محذوفتان، زرّ Log موصوف بحالة،
`mcDeleteDrawing*` محذوفان، مال السنت موصول. **غير مُغلق رغم رسائل الـcommit**: 8dfdaff/541dcfb/b8ec2f7 أضافت مفاتيح لـ`locales.ts` فقط —
`TimeframeBar`/`CommissionPlanPanel`/`NetworkTreePanel`/`TreeDiagramSketch`/`SubscriptionPlansPanel`/`AccountScreen` لم تتغيّر. تاريخ git لهذه الملفات: أنس وحده ⇒ **فجوة ملكية** رُفعت لأنس.
732a7d4 أصلح «₴» بـToolsScreen وحده ⇒ أيقونتان مختلفتان للدفتر الآن (EdgeRails/BottomDock ما زالتا «₴»).
**المراجعة (c — a11y)، بسكربت ثم قراءة:** 235 عنصراً/49 ملفاً؛ 33 بلا وصف (5 حقيقية: أزرار الرسم المدمجة تُقرأ بالرمز، ضغط الشارت، خلفيتان)؛ ~55 تبديلاً بلا
`accessibilityState`؛ AccountScreen أسوأ ملف (10 بلا وصف). كل الـTextInput موصوفة. صفوف QA3 بـCOORDINATION.md.
**الدورة القادمة:** المراجعة (d) — أرقام وحدود متناقضة بين الملفات.

## 2026-09-24 — الدورة 4
**البناء:** أخضر 0 (بعد dcb738e) — لا إصلاح لازم.
**Selftests:** 59/59 ناجح (`npx tsx`).
**التحقّق من الإغلاقات بالكود:** (أُعيد البناء+selftests بعد 7 commits وصلت أثناء الدورة: أخضر 0، 59/59) مُغلق فعلاً — a11y QA3 للشارت (6d50f09 عدا MatrixSidePanel:83) والأدوات (72cf43e)، Terminal (f66ce07)، chart41 (`chartLocalLabels` محذوفة، `tr.mcShareDialogTitle`/`tr.mcLogScaleA11y` موصولة)، saveError ×4 ⇒
`createSaveErrorSignal` (cdaceca)، التغيّر اليومي ≤1د بعد التدوير (3665071، `sessionKeyAt`)، `newsUnavailable`/`riskCalcStopInsideSpread` موصولان.
جزئي: `planJournalNote` بلغة الواجهة (d0da6fc) وينتظر `planNoteCommission`/`planNoteNetRR`؛ `confirmDestructive` موجود بالشارت وبقي 21 `Alert.alert` بـ7 ملفات.
**غير مُغلق:** `a11yBusy` (0 استعمال)، `TimeframeBar`، لوحات العمولات/الشبكة، «₴»، `DRAW_MARK`، `dxyPrice`. `journalCentNoMoney`/`journalMicroNoMoney` بلا قارئ (تعليقات فقط).
**المراجعة (d — أرقام متناقضة)، وكيل بحث ثم تحقّق يدوي للأهم:**
- spread الخادم المختلَق (×0.00008، `data_kind:"provider"`) يناقض `backtest.py` (1.0/3.0 pip) وتعليق `main.py:1352`، ويُزيح أسعار الدفتر — دُمج بصف tools13 ★.
- `useMultiLiveTicks` بلا حدّ تقادم/رفض ≤0 مقابل `useLiveTicks` 20ث؛ مرجع تنبيه الشارت بـTerminalScreen:855 — دُمج بصف chart2 ★.
- المخاطرة: 1% (نصائح) / 1–2% (أكاديمية) / تحذير >2% (الحاسبة) ⇒ أنس ⛔10. «50–100 lot» نصاً مقابل تحذير >100 كوداً.
- STORE-LISTING: عدسة Liquidity بلا CVD. الخادم يقرّب الوقف/الهدف لخانتين للين/DXY (لا شاشة تعرضه).
- متّسق: pip/عقد/لوت، سنت/مايكرو، رافعة، باقات، عمولات، أطر، جلسات/DST، فترات مؤشرات، حدود الشموع.
**الدورة القادمة:** المراجعة (e) — ما يُحرجنا أمام متداول فوركس حقيقي.
