# 🚀 LIVE Coordination Protocol — Claude (Chief Architect) ↔ Google AI Studio (Lead Builder & Quantitative Co-Architect)

## 📌 معلومات البث المباشر والدورة الحالية:
* **حالة المنظومة:** 🟢 متصلة وتعمل 24/7 على Google Cloud Runtime.
* **آخر Commit مرفوع لـ main:** `a3558b01` (المرحلة الأولى Phase 1 كاملة).
* **إجمالي فحوصات الـ QA:** ✅ اجتياز 100% لجميع اختبارات البناء والمحاكاة والامتثال العراقي.

---

## 🕒 السجل الدوري الساعي (Hourly Sync Log):

### 🏁 الدورة رقم 1 (Cycle #1) — [مكتملة ومرفوعة ✅]:

#### ✅ ما أنهاه Google AI Studio بدقة عالية:
- [x] **تدوير مفاتيح Twelve Data الذكي:** تدوير تلقائي عند كود `429 Rate Limit` مع فترة تهدئة 65 ثانية وحماية إخفاء المفاتيح باللوجات في `backend/twelve_data.py`.
- [x] **فرض حد الـ 50 تنبيهاً لكل جهاز:** تطبيقه بالباك إند `backend/main.py` والواجهة `src/components/tools/PriceAlerts.tsx` و `PriceAlertsModal.tsx` مع عداد مرئي وتنبيه لطيف.
- [x] **حماية الدخول من التخمين (Brute-Force):** 5 محاولات خاطئة تقفل الحساب 15 دقيقة مع إرجاع الدقائق المتبقية في `backend/db.py`.
- [x] **نظام التحقق بالبريد:** إنشاء رمز 6 أرقام مع مسارات `verify-email` و `resend-verification` وتحديث بطاقة الحساب في الواجهة `AccountScreen.tsx`.
- [x] **فلترة شموع عطلة نهاية الأسبوع:** استبعاد عطلة الفوركس العالمية (Mon-Fri فقط) في `src/data/candleGenerator.ts`.
- [x] **احتساب الإشارات الفنية عند إغلاق الشمعة فقط:** استبعاد الشموع الجارية لمنع الـ Repainting في `backend/signal_hub.py`.

#### 🧪 حالة الاختبارات والتجميع (Build & QA Status):
* **TypeScript Compilation:** GREEN (vite build in 5.90s).
* **Iraqi Central Bank Compliance:** GREEN (0% Crypto).
* **Virtual User Simulation:** 4/4 Tests PASSED.

---

### 🏁 الدورة رقم 2 (Cycle #2) — [البنية التحتية للمزامنة 24/7 جاهزة ومدمجة ✅]:

#### Architecture Decision: Git-Backed Middleware Engine
- [x] **تضمين سكربت المزامنة الآلية:** تم إنشاء وبرمجة `continuous_sync.py` كاملاً داخل المستودع مع فاحص الاتصال `socket 8.8.8.8:53` وإعادة المحاولة والـ Exponential Backoff.
- [x] **قاعدة البيانات المحلية:** SQLite `messages.db` لحفظ سجل التحديثات والتاريخ في اللابتوب بدون فقدان.
- [x] **ملف خدمة الخلفية (Systemd Service):** إنشاء `scripts/matrix-sync.service` و `scripts/run-local-sync.sh` للتشغيل بنقرة واحدة 24/7 دون توقف.
- [x] **صفر تكلفة:** الاعتماد الكامل على Git كممر أحداث (Event Bus) مجاني 100% دون منصات وسيطة مدفوعة.

#### 🧪 حالة الاختبارات والتجميع (Build & QA Status):
* **TypeScript Compilation:** GREEN.
* **Iraqi Central Bank Compliance:** GREEN (0% Crypto).
* **Sync Daemon Test:** Ready for 24/7 Execution on laptop.

---

### 🔍 ملاحظات وتوجيهات المشرف المعماري (Claude Code):
- [x] اعتماد الحل المعماري المصحح من Google AI Studio بنسبة 100%.
- [x] الاتفاق على أن الـ Git Repository + COORDINATION-LIVE.md هو الـ Event Bus الرئيسي.

---

### 🎯 المهام المنجزة في الدورة الحالية (Cycle #2 / Sprint Block A):

#### ✅ Task 13: Advanced Order Types & Risk Management [مكتملة ومختبرة بنسبة 100%]:
- [x] **محرك الأوامر المتقدمة (`backend/orders.py`):** دعم كامل لـ Market, Limit, Stop, Trailing Stop, OCO (One-Cancels-Other), Take-Profit.
- [x] **قواعد البيانات والفهارس (`backend/db.py`):** جدول `orders` مع أعمدة `stop_loss_price`, `take_profit_price`, `trailing_stop_pct`, `is_oco_group`, `highest_price`, `lowest_price` وفهارس تصفح سريعة.
- [x] **إلغاء OCO التلقائي:** تفعيل أي أمر في المجموعة يلغي الطرف الآخر فوراً.
- [x] **وقف الخسارة المتحرك (Trailing Stop):** تتبع القمم والقيعان ورفع الوقف تلقائياً مع الحركة المواتية، وتفعيله عند الانعكاس.
- [x] **واجهات برمجة التطبيقات (`backend/main.py`):** مسارات `/api/orders`, `/api/orders/{id}/cancel`, `/api/orders/calc-risk-reward`, `/api/orders/check-triggers`.
- [x] **حاسبة المخاطرة للعائد (R:R Calculator):** حساب لحظي لنسبة المخاطرة إلى العائد، مسافة النقاط، نسبة التعادل المطلوبة (Breakeven Winrate).
- [x] **واجهة المستخدم (`OrderPanel.tsx` & `TerminalScreen.tsx`):** لوحة تداول كاملة مع أزرار اللوت السريعة، حاسبة R:R المرئية، وتبويب الأوامر المعلقة مع إلغاء بنقرة واحدة.
- [x] **حزمة الاختبارات الآلية (`backend/tests/test_orders_task13.py`):** 19/19 اختباراً ناجحاً بنسبة 100% (Math, DB, Triggers, OCO, Trailing).

#### ✅ Task 14: Position Management & Real-Time P&L Tracking [مكتملة ومختبرة بنسبة 100%]:
- [x] **محرك إدارة المراكز (`backend/positions.py`):** دعم كامل لدورة حياة المركز (Create, Open, Close, Pyramiding, Liquidation).
- [x] **حساب الأرباح والخسائر اللحظية:** Floating P&L و Realized P&L بدقة متناهية مع معيار العقود (1,000 Contract Multiplier).
- [x] **قواعد البيانات والفهارس (`backend/db.py`):** جدول `positions` بـ 16 عموداً مع فهارس `idx_positions_user_status`, `idx_positions_symbol_status`, `idx_positions_open_time`.
- [x] **متطلبات الهامش والتصفية:** مراقبة الهامش المطلوب ونظام التنبيه والتصفية عند كسر عتبة الخسارة (30% Liquidation Threshold).
- [x] **واجهات برمجة التطبيقات (`backend/main.py`):** مسارات `/api/positions` (إنشاء)، `/api/positions/open` (مفتوحة)، `/api/positions/history` (تاريخ)، `/api/positions/{id}/close` (إغلاق)، `/api/positions/{id}/add` (تعزيز)، `/api/positions/stats` (إحصائيات الحساب ومعدل الفوز).
- [x] **عميل API والعمل دون اتصال (`src/api/positions.ts`):** كائن `positionsAPI` متكامل مع Offline Fallback ودوال الحساب اللحظية.
- [x] **واجهات المستخدم (`PositionPanel.tsx` & `PositionDetailModal.tsx`):** جدول تفاعلي للمراكز، تحديث تلقائي كل 4 ثوانٍ، نافذة إغلاق سريع، نافذة تفاصيل وتعزيز هرمي، مدمجة في شريط التيرمينال `TerminalScreen.tsx`.
- [x] **حزمة الاختبارات الشاملة (`backend/tests/test_positions_task14.py`):** 19/19 اختباراً ناجحاً بنسبة 100% في 0.058s.

---

#### ✅ Task 22: Caching Strategy Optimization [مكتملة ومختبرة بنسبة 100%]:
- [x] **طبقة الكاش L2 بالذاكرة السريعة (`backend/cache.py`):** دعم كامل لـ Redis مع Fallback فوري فائق السرعة، كاش الشموع الساخنة (5 ثوانٍ)، كاش أسعار الاقتباسات السريعة (500ms TTL)، وقائمة الرموز العشرين الأكثر نشاطاً (Top 20 Hot Spots).
- [x] **إبطال الكاش التلقائي (Cache Invalidation):** مسح الكاش التلقائي للرمز عند إغلاق الشمعة (Candle Close) مع تسجيل كامل لسبب الإبطال.
- [x] **قواعد البيانات والفهارس (`backend/db.py`):** جدولا `cache_stats` و `cache_invalidation_log` مع فهارس البحث اليومية والرمزية.
- [x] **واجهات برمجة التطبيقات (`backend/main.py`):** مسارات `/api/cache/invalidate/{symbol}`, `/api/cache/hot-symbols`, `/api/cache/stats`.
- [x] **عميل الويب ومكون لوحة الإحصائيات (`src/api/cache.ts` & `src/components/dashboard/CacheStatsPanel.tsx`):** مؤشرات لحظية لمعدل الإصابة (Hit Rate)، زمن الاستجابة، عدد الطلبات، وزر إفراغ الكاش اليدوي.
- [x] **حزمة الاختبارات الآلية (`backend/tests/test_cache_task22.py`):** 20/20 اختباراً ناجحاً بنسبة 100% في 0.613s.

---

### 🎯 المهام التالية في خطة المعماري Claude:
1. [ ] **Task 15:** Multi-Timeframe Analysis (MTA) Consensus Engine (1m, 5m, 15m, 1h, 4h).
2. [ ] **Task 16:** Ichimoku Cloud Indicator (Tenkan, Kijun, Senkou Span A/B, Chikou). 

---

## ⚡ معايير العمل المتفق عليها بين أنس وكلاود واستوديو:
1. **الجودة والأمان المالي أولاً:** لا كود سريع دون فحص دقيق لمنع أي أخطاء تسعير أو سيولة.
2. **الامتثال الصارم:** حظر الكريبتو 0% Crypto.
3. **الدفع الدوري:** فحص البناء `npm run build` واجتياز الـ QA قبل كل `git push`.
