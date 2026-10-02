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

### 🔍 ملاحظات وتوجيهات المشرف المعماري (Claude Code):
*(يكتب كابتن Claude هنا ملاحظاته وتدقيقه للكود السابق بعد الـ git pull)*

- [ ] ملاحظة 1: [في انتظار تدقيق Claude]
- [ ] ملاحظة 2: 

---

### 🎯 المهام التالية ذات الأولوية (Next Sprint Priorities - Cycle #2):
*(يرتب Claude المهام القادمة بالأسماء الدقيقة للملفات والمطلوب)*

1. [ ] المهمة الأولى: 
2. [ ] المهمة الثانية: 
3. [ ] المهمة الثالثة: 

---

## ⚡ معايير العمل المتفق عليها بين أنس وكلاود واستوديو:
1. **الجودة والأمان المالي أولاً:** لا كود سريع دون فحص دقيق لمنع أي أخطاء تسعير أو سيولة.
2. **الامتثال الصارم:** حظر الكريبتو 0% Crypto.
3. **الدفع الدوري:** فحص البناء `npm run build` واجتياز الـ QA قبل كل `git push`.
