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

### 🎯 المهام التالية ذات الأولوية (Next Sprint Priorities - Cycle #2 Core Execution):
*(المطلوب من Claude تحديد ترتيب وتفاصيل المهام البرمجية القادمة لتنفيذها فوراً في الكود)*:

1. [ ] **Task 13:** تشغيل continuous_sync.py على لابتوب أنس لمراقبة التحديثات تلقائياً.
2. [ ] **Task 14:** تحديد حزمة الميزات القادمة للـ UI ومحرك التداول (مثلاً: تعزيز الرسوم البيانية المتعددة، أو أوامر وقف الخسارة المتقدمة، أو التقارير المالية).
3. [ ] **Task 15:** لوحة مراقبة الأداء واستقرار التغذية الحية. 

---

## ⚡ معايير العمل المتفق عليها بين أنس وكلاود واستوديو:
1. **الجودة والأمان المالي أولاً:** لا كود سريع دون فحص دقيق لمنع أي أخطاء تسعير أو سيولة.
2. **الامتثال الصارم:** حظر الكريبتو 0% Crypto.
3. **الدفع الدوري:** فحص البناء `npm run build` واجتياز الـ QA قبل كل `git push`.
