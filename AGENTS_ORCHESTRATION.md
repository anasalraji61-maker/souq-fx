# 🚀 SOUQ-FX / MATRIX: Multi-Agent Swarm Orchestration Guide
## دليل تشغيل وإطلاق فريق وكلاء التطوير الـ 8 لبناء مئات الآلاف من الأسطر البرمجية بالتوازي

لتطوير مشروع ضخم كهذا (ويب + موبايل iOS/Android + ديسكتوب + باك إند Python) في وقت قياسي وبدون تداخل أو تعارض في الكود (Merge Conflicts)، تم تقسيم المشروع إلى **8 مناطق نفوذ برمجية مستقلة**:

---

## 👥 خريطة توزيع الوكلاء الـ 8 (Specialized Agent Swarm)

| الوكيل | النطاق (Directory) | التخصص البرمجي | الهدف الرئيسي |
|---|---|---|---|
| **Agent 1: Canvas & Chart** | `/src/components/terminal/` | HTML5 Canvas + High-FPS Math | رسم الشموع، الزووم والتصغير السلس، والمؤشرات بدون تقليد تجاري لـ TradingView |
| **Agent 2: Mobile App** | `/mobile/` | React Native + Expo (v57) | تطبيق الهاتف لـ iOS و Android (شاشات لمس، تفاعل أصابع Pinch-to-zoom) |
| **Agent 3: Desktop App** | `/desktop/` | Electron + Node.js | تطبيق سطح المكتب لنظام Windows و macOS وتنبيهات النظام |
| **Agent 4: Python Backend** | `/backend/` | FastAPI + TwelveData + WebSockets | سيرفر الأسعار اللحظية، التقويم الاقتصادي، ومحرك التنبيهات |
| **Agent 5: Academy & Content** | `/src/components/academy/` | Interactive Pedagogical Engine | المدارس الـ 7 للتحليل الفني (وايكوف، SMC، إليوت) مع الشرح والاختبارات |
| **Agent 6: Quant & Risk** | `/src/components/tools/` | Quantitative Risk Calculations | حاسبة اللوت، محاكي الاستراتيجيات (Backtester)، وإدارة المخاطر |
| **Agent 7: Community & Social** | `/src/components/community/` | Real-time Chat & Sentiment | غرف النقاش الحية بين المتداولين مع فلترة المشاعر (Bullish/Bearish) |
| **Agent 8: Swarm Orchestrator** | Root & Scripts | QA, Verification & Git Sync | فحص البناء `npm run build` والامتثال لقوانين العراق ودمج الأكواد ودفعها لـ GitHub |

---

## 🛠️ كيف تشغل هؤلاء الوكلاء عملياً على جهازك؟

### الخيار 1: باستخدام نوافذ PowerShell متعددة مع (Claude Code أو Cursor CLI أو Aider)
افتح 3 أو 4 نوافذ PowerShell في لابتوبك:

1. **النافذة 1 (مخصصة للويب والشارت):**
   ```powershell
   cd souq-fx
   # وجه الوكيل لقراءة: .agents/agent-1-canvas.md
   ```
2. **النافذة 2 (مخصصة لتطبيق الموبايل):**
   ```powershell
   cd souq-fx\mobile
   # وجه الوكيل لقراءة: ..\.agents\agent-2-mobile.md
   ```
3. **النافذة 3 (مخصصة لسيرفر الباك إند):**
   ```powershell
   cd souq-fx\backend
   # وجه الوكيل لقراءة: ..\.agents\agent-4-backend.md
   ```
4. **النافذة 4 (مخصصة للديسكتوب والأدوات):**
   ```powershell
   cd souq-fx\desktop
   # وجه الوكيل لقراءة: ..\.agents\agent-3-desktop.md
   ```

بهذه الطريقة، يعمل 4 أو 8 وكلاء في نفس الدقيقة على أجزاء مختلفة دون أن يمس أحد كود الآخر!

---

## ⚖️ ميثاق الأمان والملكية الفكرية الصارم:
1. **ممنوع الكريبتو بتاتاً:** أي وكيل يحاول كتابة أي كود يتعلق بالعملات المشفرة سيتم رفض عمله فوراً وفقاً لقوانين العراق.
2. **عدم التقليد الحرفي لـ TradingView:** محرك الشارت يحمل هوية خاصة (MATRIX FX)، وألوان داكنة مبتكرة، وكود Canvas ذاتي التطوير.
