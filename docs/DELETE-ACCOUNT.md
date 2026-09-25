# MATRIX — صفحة طلب حذف الحساب / Account deletion (مسودة للنشر)

> **لمن يراجع (أنس)**: Google Play يطلب **رابطاً عاماً** لطلب حذف الحساب إضافةً للحذف داخل التطبيق
> (`STORE-PRIVACY.md` §5 بند 2 — حاجز نشر مستقلّ بـPlay Console ← App content ← Data deletion). هذا نصّ تلك الصفحة.
> الحذف داخل التطبيق موجود فعلاً (`deleteAccount` بشاشة الحساب ← `DELETE /api/auth/account` ← `db.delete_user_account`)،
> أمّا الطلب بالبريد فيُنفَّذ **يدوياً** — لا نموذج ويب ولا مسار خادم له. قبل النشر:
> 1. املأ **[بريد الخصوصية]** — نفس بريد `PRIVACY-POLICY.md`.
> 2. انشرها https (يمكن قسماً بصفحة سياسة الخصوصية نفسها برابط `#delete`) وضع الرابط بخانة Play Console.
> 3. اعتمد مدّة الردّ (مقترحة 30 يوماً). للتنفيذ اليدوي: `db.delete_user_account(<user_id>)` على الخادم لصاحب البريد —
>    تحقّق أنّ الطلب من البريد المسجَّل بالحساب نفسه.
> 4. **على نسخة الويب لا يعمل الحذف داخل التطبيق** (تحقّقتُ 2026-09-25): زرّ «حذف الحساب» يفتح التأكيد بـ`Alert.alert`
>    (`AccountScreen.tsx` `confirmDeleteAccount`)، وهو بلا أثر على react-native-web ⇒ الضغط لا يفعل شيئاً ولا يقول شيئاً. على iOS
>    وAndroid يعمل. إن نُشرت نسخة ويب قبل الإصلاح (صفّ `Alert.alert` بـ`COORDINATION.md`) فالبريد طريقها الوحيد، وجملة «الطريقة
>    الأسرع — من داخل التطبيق» أدناه لا تصحّ لها.

---

## العربية

**حذف حسابك في MATRIX وبياناتك**

**الطريقة الأسرع — من داخل التطبيق:** افتح التطبيق ← تبويب «حساب» ← **حذف الحساب** ← أكّد. يتمّ فوراً.

**إن لم تعد تملك التطبيق:** أرسل من البريد المسجَّل بحسابك رسالة إلى [بريد الخصوصية] بعنوان «حذف حساب MATRIX»،
واذكر اسم المستخدم. نحذف الحساب خلال 30 يوماً ونؤكّد لك بالبريد.

**ما يُحذف:** بريدك وكلمة مرورك واسم المستخدم (يُستبدل بمعرّف مجهول لا يمكن الدخول به)، جلسات الدخول، تنبيهات
الأسعار والمؤشرات، دفتر الصفقات، التخطيطات وقائمة المتابعة، تقدّم الأكاديمية، رمز الإشعارات، رسائلك بالدردشة العامة،
محادثاتك الخاصة (بطرفيها)، أصواتك على أفكار الصفقات، وبلاغاتك.

**ما يبقى بلا اسمك:** أفكار الصفقات التي نشرتها تبقى بلا اسم ناشر (عليها أصوات مستخدمين آخرين)، وسجلّات العمولات
التي تخصّ أعضاء آخرين في شجرة الإحالة تبقى بلا اسمك لأنها سجلّهم المالي.

**ما على جهازك** (الرسومات والإعدادات وقائمة الحظر) يُمحى بحذف التطبيق.

---

## English

**Delete your MATRIX account and data**

**Fastest — in the app:** open the app → Account → **Delete account** → confirm. It takes effect immediately.

**If you no longer have the app:** email [privacy email] from the address registered to your account, with the subject
"Delete MATRIX account", and include your username. We delete the account within 30 days and confirm by email.

**What is deleted:** your email, password and username (replaced with an anonymous ID that cannot sign in), sign-in sessions,
price and indicator alerts, trade journal, layouts and watchlist, Academy progress, notification token, your public chat
messages, your private conversations (both sides), your votes on trade ideas, and your reports.

**What stays, without your name:** trade ideas you posted remain with no author (other users have voted on them), and
commission records belonging to other members of the referral tree remain without your name, because they are those
members' financial record.

**What is on your device** (drawings, settings, block list) is erased when you uninstall the app.
