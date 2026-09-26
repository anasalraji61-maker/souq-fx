# MATRIX — صفحة طلب حذف الحساب / Account deletion (مسودة للنشر)

> **لمن يراجع (أنس)**: Google Play يطلب **رابطاً عاماً** لطلب حذف الحساب إضافةً للحذف داخل التطبيق
> (`STORE-PRIVACY.md` §5 بند 2 — حاجز نشر مستقلّ بـPlay Console ← App content ← Data deletion). هذا نصّ تلك الصفحة.
> الحذف داخل التطبيق موجود فعلاً (`deleteAccount` بشاشة الحساب ← `DELETE /api/auth/account` ← `db.delete_user_account`)،
> أمّا الطلب بالبريد فيُنفَّذ **يدوياً** — لا نموذج ويب ولا مسار خادم له. قبل النشر:
> 1. املأ **[بريد الخصوصية]** — نفس بريد `PRIVACY-POLICY.md`.
> 2. انشرها https (يمكن قسماً بصفحة سياسة الخصوصية نفسها برابط `#delete`) وضع الرابط بخانة Play Console.
> 3. اعتمد مدّة الردّ (مقترحة 30 يوماً). للتنفيذ اليدوي: `db.delete_user_account(<user_id>)` على الخادم لصاحب البريد —
>    تحقّق أنّ الطلب من البريد المسجَّل بالحساب نفسه.
> 4. **على نسخة الويب يعمل الحذف داخل التطبيق** (أُعيد التحقّق 2026-09-26): التأكيد صار `confirmDestructive`
>    (`AccountScreen.tsx` `confirmDeleteAccount` ← `window.confirm` على الويب، ui `eb8b265`) بدل `Alert.alert` التي كانت بلا أثر هناك.
> 5. **ما يبقى** (أُعيد التحقّق بالكود 2026-09-26، `backend/db.py:1200` `delete_user_account`): البلاغات لا تُحذف، و`commission_ledger`
>    لا يُحذف منه صفّ (عمولات الآخرين **وعمولات الحساب نفسه** `earner_id` — يُمحى `source_username` وحده). إن أراد أنس حذف
>    عمولات الحساب نفسه فهو تغيير بالخادم (backend) ثم بالنصّ أدناه.

---

## العربية

**حذف حسابك في MATRIX وبياناتك**

**الطريقة الأسرع — من داخل التطبيق:** افتح التطبيق ← تبويب «حساب» ← **حذف الحساب** ← أكّد. يتمّ فوراً.

**إن لم تعد تملك التطبيق:** أرسل من البريد المسجَّل بحسابك رسالة إلى [بريد الخصوصية] بعنوان «حذف حساب MATRIX»،
واذكر اسم المستخدم. نحذف الحساب خلال 30 يوماً ونؤكّد لك بالبريد.

**ما يُحذف:** بريدك وكلمة مرورك واسم المستخدم (يُستبدل بمعرّف مجهول لا يمكن الدخول به)، جلسات الدخول، تنبيهات
الأسعار والمؤشرات، دفتر الصفقات، التخطيطات وقائمة المتابعة، تقدّم الأكاديمية، رمز الإشعارات، رسائلك بالدردشة العامة،
محادثاتك الخاصة (بطرفيها)، وأصواتك على أفكار الصفقات. وإن حذفته من التطبيق على جهاز ما، يُحذف معه ما حفظه ذلك الجهاز
بلا حساب (تنبيهات وصفقات وتخطيطات وقائمة متابعة).

**ما يبقى بلا اسمك:** أفكار الصفقات التي نشرتها تبقى بلا اسم ناشر (عليها أصوات مستخدمين آخرين)، وبلاغاتك عن محتوى مسيء
تبقى (سببها من قائمة ثابتة) كي لا يعود ما أُخفي بالبلاغات ظاهراً، وسجلّات العمولات — ما يخصّ أعضاء آخرين في شجرة الإحالة
وما سُجّل لحسابك أنت — تبقى بلا اسمك لأنها سجلّ مالي، وموضعك بشجرة الإحالة برمز جديد لا يحمل اسمك ولا يُسجَّل به أحد بعدها.

**ما على جهازك** (الرسومات والإعدادات وقائمة الحظر) يُمحى بحذف التطبيق.

---

## English

**Delete your MATRIX account and data**

**Fastest — in the app:** open the app → Account → **Delete account** → confirm. It takes effect immediately.

**If you no longer have the app:** email [privacy email] from the address registered to your account, with the subject
"Delete MATRIX account", and include your username. We delete the account within 30 days and confirm by email.

**What is deleted:** your email, password and username (replaced with an anonymous ID that cannot sign in), sign-in sessions,
price and indicator alerts, trade journal, layouts and watchlist, Academy progress, notification token, your public chat
messages, your private conversations (both sides), and your votes on trade ideas. When you delete it in the app on a device, what that
device saved without an account (alerts, trades, layouts, watchlist) is deleted with it.

**What stays, without your name:** trade ideas you posted remain with no author (other users have voted on them); reports
you filed about abusive content remain (their reason is from a fixed list) so content hidden by reports does not reappear; and
commission records — those of other members of the referral tree and those recorded for your own account — remain without
your name, because they are a financial record, and your place in the tree under a new referral code that no longer carries your name and accepts no new sign-ups.

**What is on your device** (drawings, settings, block list) is erased when you uninstall the app.
