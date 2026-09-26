# MATRIX — سياسة الخصوصية / Privacy Policy (مسودة للنشر)

> **لمن يراجع (أنس)**: هذا نصّ الصفحة التي يطلب المتجران رابطها (`STORE-PRIVACY.md` §5 بند 1). كل جملة فيه
> مأخوذة من الكود بتاريخ 2026-09-25 (المراجع بالجدول آخر الملف) لا من وصف الميزات. قبل النشر:
> 1. املأ الخانات بين معقوفين: **[اسم الناشر]**، **[بريد الخصوصية]**، **[تاريخ السريان]**.
> 2. انشر القسمين (العربي والإنجليزي) كصفحة عامة **https** (GitHub Pages أو صفحة على نطاق الخادم) — والرابط نفسه
>    يوضع بخانة Privacy Policy URL بالمتجرَين.
> 3. قرّر تصنيف OpenRouter (`STORE-PRIVACY.md` §2) — النصّ أدناه يذكره صراحةً بالاسم، وهو الخيار المحافظ.
> 4. سطر سجلّات الخادم (القسم 3) مكتوب بصيغة احتياط: لم أتحقّق من إعداد السجلّات على خادم الإنتاج — صحّحه إن عرفت.
> 5. **Sentry (قرار ١٣)**: فقرتا «تقارير الأعطال» صحيحتان **فقط** إن بُنيت نسخة المتجر بـ`EXPO_PUBLIC_SENTRY_DSN` (بلا المفتاح لا يُهيَّأ
>    Sentry ولا يخرج أي طلب — `mobile/src/crashReporting.ts`). بلا مفتاح ⇒ احذفهما وأعِد جملة «ولا تقارير أعطال من أطراف ثالثة».
>    وبإعدادات مشروع Sentry فعّل **Prevent Storing of IP Addresses** وراجع مدّة الاحتفاظ بخطّتك (30 يوماً بالمجانية وقت الكتابة — تحقّق).
>
> أي تغيير بالكود يضيف حقلاً يُخزَّن أو طرفاً ثالثاً ⇒ يُحدَّث هذا الملف و`STORE-PRIVACY.md` معاً.

---

## العربية

**سياسة الخصوصية لتطبيق MATRIX**
تاريخ السريان: [تاريخ السريان] · الناشر: [اسم الناشر] · للتواصل: [بريد الخصوصية]

MATRIX تطبيق شارتات وتحليل فني وتعليم للمتداول الفردي. لا ينفّذ صفقات، ولا يتصل بحسابك لدى أي وسيط، ولا يقبل مدفوعات.

### 1. ما نجمعه
**إن أنشأت حساباً:** بريدك الإلكتروني واسم المستخدم الذي تختاره، وكلمة مرورك **مُجزّأة** (لا نخزّنها نصّاً ولا نستطيع قراءتها).

**ما تكتبه أنت داخل التطبيق** — ويُحفظ على خادمنا ليعمل التطبيق:
- تنبيهات الأسعار والمؤشرات.
- دفتر الصفقات: الأرقام والملاحظات التي تسجّلها بيدك عن صفقاتك. لا نربطه بأي حساب تداول.
- قائمة المتابعة وتخطيطات الشارت المحفوظة، وتقدّمك في الأكاديمية.
- رسائل الدردشة العامة، وأفكار الصفقات وتصويتك عليها، وبلاغاتك عن محتوى مسيء.
- إن انضممت لبرنامج الإحالة: موقعك في شجرة الإحالة وسجلّ العمولات المرتبط به.

**عن جهازك:** رمز إشعارات الجهاز مع رمز لغة الواجهة (لإيصال تنبيهاتك بلغتك)، ومعرّف تثبيت عشوائي يولّده التطبيق عند أول تشغيل. المعرّف ليس
رقم الجهاز ولا المعرّف الإعلاني؛ وظيفته الوحيدة أن تبقى تنبيهاتك ودفترك منفصلة عن غيرك إن استعملت التطبيق بلا حساب.
حين تسجّل الخروج وجهازك متصل ننهي جلسة هذا الجهاز ونفكّ رمز إشعاراته عن حسابك، فلا تصل تنبيهات حسابك إلى من يستعمل الهاتف بعدك.

**على جهازك فقط (لا يصل خادمنا):** رسوماتك على الشارت، إعدادات العرض، إعدادات حاسبة المخاطرة، وقائمة
المستخدمين الذين حظرتهم. (اختيار اللغة نفسه محفوظ على جهازك؛ يصلنا رمزها فقط مع رمز الإشعارات ومع كل سؤال للمساعد كي
نردّ بلغتك.)

### 2. ما لا نجمعه
لا موقع جغرافي، لا جهات اتصال، لا صور ولا كاميرا ولا ميكروفون، لا بيانات دفع، لا بيانات حسابك لدى الوسيط.
لا إعلانات، ولا أدوات تحليلات أو تتبّع من أطراف ثالثة، ولا نبيع بياناتك ولا نشاركها لأغراض إعلانية. (تقارير الأعطال وحدها تذهب إلى Sentry — القسم 3.)

### 3. من يرى بياناتك
- **المستخدمون الآخرون** يرون ما تنشره علناً: رسائل الدردشة العامة وأفكار الصفقات، باسم المستخدم الذي اخترته.
  لا توجد رسائل خاصة بين المستخدمين في هذا الإصدار.
- **مزوّدو خدمة** يعالجون جزءاً محدّداً نيابةً عنّا:
  - **Expo** (خدمة الإشعارات): رمز جهازك ونصّ التنبيه (الرمز ومستوى السعر) — بلا بريدك أو اسمك.
  - **OpenRouter** (المساعد الذكي): نصّ سؤالك ورمز الأداة وسياق السوق — بلا بريدك أو اسمك أو معرّفك. خادمنا يمرّر السؤال
    ولا يحفظه ولا يسجّله؛ ولا تكتب في سؤالك معلومات شخصية.
  - **Sentry** (Functional Software, Inc. — تقارير الأعطال): حين يتعطّل التطبيق يرسل جهازك إليه مباشرةً تقريراً تقنياً: نوع الخطأ
    ومكانه بالكود، وسطراً قصيراً من نصّه، وطراز الجهاز ونظام التشغيل وإصدار التطبيق، وطلبات الشبكة الأخيرة (نوعها
    ومسارها ونتيجتها فقط). **لا يحمل التقرير** بريدك ولا اسمك ولا معرّف حسابك، ولا لقطة شاشة، ولا ما كتبته أو
    لمسته، ولا محتوى دفترك أو أسئلتك. التقرير غير مرتبط بحسابك، ويحتفظ به Sentry مدّةً محدودة ثم يُحذف.
- بيانات الأسعار والأخبار والتقويم يجلبها خادمنا من مزوّديها **دون أن يرسل إليهم أي شيء عنك**.
- كأي خادم ويب، قد يسجّل خادمنا عنوان IP وتوقيت الطلبات في سجلّات تقنية لتشغيله وحمايته.
- قد نكشف بيانات إن ألزمنا القانون بذلك.

### 4. الحماية
الاتصال بين التطبيق وخادمنا مشفّر (https). كلمات المرور مُجزّأة بملح لكل حساب.

### 5. حذف بياناتك
**من داخل التطبيق:** تبويب «حساب» ← «حذف الحساب». يحدث فوراً ويشمل: بريدك وكلمة مرورك واسمك (يُستبدل بمعرّف مجهول لا يمكن
الدخول به)، جلساتك، تنبيهاتك، دفترك، تخطيطاتك وقائمة متابعتك، تقدّمك بالأكاديمية، رمز إشعاراتك، رسائلك العامة،
محادثاتك الخاصة (بطرفيها)، وأصواتك. وإن حذفته من هذا الجهاز يُحذف معه ما حفظه الجهاز بلا حساب (تنبيهات وصفقات وتخطيطات وقائمة متابعة).
**ما يبقى بلا اسمك:** أفكار الصفقات التي نشرتها (يصوّت عليها آخرون) تبقى بلا اسم ناشر، وبلاغاتك عن محتوى مسيء تبقى
(سببها من قائمة ثابتة) كي لا يعود محتوى أُخفي بالبلاغات ظاهراً، وسجلّات العمولات — ما يخصّ أعضاء آخرين في شجرة الإحالة
وما سُجّل لحسابك أنت — تبقى بلا اسمك لأنها سجلّ مالي، وموضعك بشجرة الإحالة برمز جديد لا يحمل اسمك ولا يُسجَّل به أحد بعدها.
**بلا حساب:** احذف تنبيهاتك وصفقاتك من التطبيق مباشرة؛ ولحذف كل ما ارتبط بمعرّف تثبيتك راسلنا على [بريد الخصوصية].
حذف التطبيق يمحو ما على جهازك فقط.
لا نحذف البيانات تلقائياً بعد مدّة؛ تبقى ما دام حسابك قائماً أو حتى تحذفها.

### 6. العمر
MATRIX موجّه للبالغين المهتمّين بالأسواق المالية، وليس موجّهاً لمن هم دون 18 عاماً.

### 7. التغييرات والتواصل
إن غيّرنا هذه السياسة ننشر النصّ الجديد على هذه الصفحة ونحدّث تاريخ السريان أعلاه.
أسئلة أو طلبات تخصّ بياناتك: [بريد الخصوصية].

---

## English

**MATRIX Privacy Policy**
Effective date: [effective date] · Publisher: [publisher name] · Contact: [privacy email]

MATRIX is a charting, technical-analysis and learning app for individual traders. It does not place trades, does not connect to
your account at any broker, and does not take payments.

### 1. What we collect
**If you create an account:** your email address, the username you choose, and your password in **hashed** form (never stored as
text; we cannot read it).

**What you enter in the app** — stored on our server so the app works:
- Price and indicator alerts.
- Your trade journal: the figures and notes you record yourself. It is not linked to any trading account.
- Your watchlist, saved chart layouts, and your progress in the Academy.
- Public chat messages, trade ideas and your votes on them, and reports you file about abusive content.
- If you join the referral program: your place in the referral tree and the related commission record.

**About your device:** a push-notification token together with your app-language code (to deliver your alerts in your language) and a random install ID the app creates on first launch.
The install ID is not your device's hardware ID or advertising ID; its only job is to keep your alerts and journal separate from
other people's if you use the app without an account.
When you log out while online, we end that device's session and unlink its notification token from your account, so your account's alerts
stop reaching whoever uses the phone after you.

**On your device only (never sent to us):** your chart drawings, display settings, risk-calculator settings, and the
list of users you have blocked. (Your language choice itself is stored on your device; only its code reaches us, with the push
token and with each question to the assistant, so we can reply in your language.)

### 2. What we don't collect
No location, contacts, photos, camera, microphone, payment details, or broker account data.
No ads, no third-party analytics or tracking tools, and we do not sell your data or share it for advertising. (Crash reports alone go to Sentry — section 3.)

### 3. Who sees your data
- **Other users** see what you post publicly — public chat messages and trade ideas — under your chosen username. There are
  no private messages between users in this version.
- **Service providers** that process a specific part on our behalf:
  - **Expo** (notifications): your device token and the alert text (symbol and price level) — not your email or name.
  - **OpenRouter** (AI assistant): the text of your question, the symbol and market context — not your email, name or ID.
    Our server passes the question on and neither stores nor logs it. Don't put personal information in your questions.
  - **Sentry** (Functional Software, Inc. — crash reporting): when the app crashes, your device sends Sentry a technical report
    directly: the error type and where in the code it happened, a short line of its message, your device model, operating system and
    app version, and recent network requests (their method, path and result only). **The report does
    not contain** your email, username or account ID, a screenshot, anything you typed or tapped, or your journal or assistant
    questions. It is not linked to your account, and Sentry keeps it for a limited period before deleting it.
- Our server fetches prices, news and calendar data from their providers **without sending them anything about you**.
- Like any web server, ours may record IP addresses and request times in technical logs to run and protect the service.
- We may disclose data where the law requires us to.

### 4. Security
Traffic between the app and our server is encrypted (https). Passwords are hashed with a unique salt per account.

### 5. Deleting your data
**In the app:** Account → Delete account. It takes effect immediately and removes your email, password and username (replaced
with an anonymous ID that cannot sign in), your sessions, alerts, journal, layouts and watchlist, Academy progress, notification
token, public messages, private conversations (both sides), and votes. If you delete it from this device, what this device saved without an account
(alerts, trades, layouts, watchlist) is deleted with it.
**What stays, without your name:** trade ideas you posted (others have voted on them) remain with no author; reports you filed
about abusive content remain (their reason is from a fixed list) so content hidden by reports does not reappear; and commission
records — those of other members of the referral tree and those recorded for your own account — remain without your name, because they are a financial record, and your place in the tree under a new referral code that no longer carries your name and accepts no new sign-ups.
**Without an account:** delete your alerts and trades in the app directly; to remove everything tied to your install ID, email
[privacy email]. Uninstalling the app erases only what is on your device.
We do not delete data automatically after a set period; it stays while your account exists or until you delete it.

### 6. Age
MATRIX is intended for adults interested in financial markets and is not directed at anyone under 18.

### 7. Changes and contact
If we change this policy we will publish the new text on this page and update the effective date above.
Questions or requests about your data: [privacy email].

---

## مراجع التحقّق (لا تُنشر)

| الادّعاء | المرجع بالكود |
|---|---|
| الجداول المخزَّنة | `backend/db.py` — `CREATE TABLE` (users, sessions, alerts, indicator_alerts, trades, layouts, watchlist, academy_progress, group_messages, dm_messages, votes, vote_ballots, content_reports, push_tokens, network_members, commission_ledger) |
| كلمة المرور مُجزّأة | `backend/db.py` `_encode_password` (pbkdf2_sha256، ملح لكل حساب) |
| الحذف وما يبقى | `backend/db.py:1200` `delete_user_account` (البلاغات تبقى ولا تُحذف؛ `commission_ledger` لا يُحذف منه شيء، يُمحى `source_username` فقط)؛ المسار `DELETE /api/auth/account` (`backend/main.py:928` `auth_delete_account` — ينقل صفوف الجهاز المجهولة `claim_device_rows` ثم يحذف) |
| الخروج يُنهي الجلسة ويفكّ رمز الإشعارات | `backend/db.py` `logout_session` (DELETE من `sessions`، و`push_tokens.user_id=NULL` بمعرّف التثبيت أو الرمز)؛ `POST /api/auth/logout`؛ التطبيق يستدعيه قبل المسح المحلي (`mobile/src/context/AuthContext.tsx` `logout`، `5ff2713`) — بلا شبكة يكتمل الخروج محلياً والجلسة تبقى حتى انتهائها |
| معرّف التثبيت العشوائي | `mobile/src/api.ts:30-70` (`matrix.install.v1`، ترويسة `X-Install-Id`) |
| ما يبقى على الجهاز | مفاتيح AsyncStorage `matrix.drawings.v2`، `matrix.lang.v1`، `matrix.tools.riskCalc.v1`، `matrix.moderation.blockedUsers.v1` … |
| Expo وOpenRouter وما يصلهما | `backend/expo_push.py` (المستدعي الوحيد `alert_worker.py:295`: عنوان ونصّ و`data` فارغة)، `backend/openrouter_ai.py` (رسالتا system/user وترويستا HTTP-Referer/X-Title — لا حقل مستخدم) (تفصيل بـ`STORE-PRIVACY.md` §2) |
| Sentry وما يصله | `mobile/src/crashReporting.ts` (`e522621`): بلا `EXPO_PUBLIC_SENTRY_DSN` لا تهيئة؛ `sendDefaultPii: false`، `attachScreenshot`/`attachViewHierarchy: false`، `tracesSampleRate: 0`؛ `beforeSend` يحذف `user`/`request`/`extra`/`server_name` ويقصّ النصّ إلى 200 حرف؛ `beforeBreadcrumb` يُسقط console/touch/ui.input/ui.click ويُبقي من الشبكة الطريقة والمسار (بلا نطاق ولا استعلام) والحالة؛ `AppErrorBoundary` يبلّغ أخطاء العرض؛ `mobile/index.ts:7` |
| لا SDK تحليلات/إعلانات، لا ميكروفون | `mobile/package.json`؛ `mobile/app.json` (`microphonePermission: false`، `RECORD_AUDIO` محظور) |
| لا حذف تلقائي بمدّة | لا `DELETE` زمني بـ`backend/db.py` |
| https | شرط النشر بـ`docs/DEPLOYMENT.md` — **اليوم لا خادم عام؛ عنوان التطوير http محلي**؛ لا تُنشر السياسة قبل تحقّقه |

> **أُعيد التحقّق 2026-09-25 (launch 129)**: الجداول الستّة عشر بـ`db.py` كما بالجدول (أعمدة `ALTER TABLE` المضافة: owner_key، user_id، created_at، lang، email، sl/tp — كلّها مغطّاة بنصّ القسم 1)، و`delete_user_account` يحذف/يُجهّل ما يقوله القسم 5 بالحرف، وزرّ «حذف الحساب» بـ`AccountScreen.tsx:168`. لا تغيير بالنصّ المنشور.
