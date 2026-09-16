export type LangId = 'ar' | 'en-US' | 'en-GB' | 'ku';

export type Dict = {
  langName: string;
  accountTitle: string;
  accountSub: string;
  tabHome: string;
  tabTools: string;
  tabAcademy: string;
  tabMessages: string;
  tabAccount: string;
  login: string;
  register: string;
  name: string;
  namePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  enter: string;
  createAccount: string;
  logout: string;
  hello: string;
  accountType: string;
  sponsorCode: string;
  underSponsor: string;
  left: string;
  right: string;
  trader: string;
  trainer: string;
  broker: string;
  agent: string;
  company: string;
  loginError: string;
  registerError: string;
  language: string;
  commissionsReport: string;
  networkTree: string;
  deleteAccount: string;
  deleteAccountConfirmTitle: string;
  deleteAccountConfirmBody: string;
  deleteAccountConfirmBtn: string;
  deleteAccountError: string;
  cancel: string;
  notifications: string;
  notifStatusGranted: string;
  notifStatusDenied: string;
  notifStatusUndetermined: string;
  notifStatusUnsupported: string;
  notifEnableBtn: string;
  notifOpenSettingsBtn: string;
  restartRequiredTitle: string;
  restartRequiredBody: string;
  restartRequiredBtn: string;
  onboardStep1Title: string;
  onboardStep1Body: string;
  onboardStep2Title: string;
  onboardStep2Body: string;
  onboardStep3Title: string;
  onboardStep3Body: string;
  onboardStep4Title: string;
  onboardStep4Body: string;
  onboardSkip: string;
  onboardNext: string;
  onboardStart: string;
};

export const LANGS: { id: LangId; label: string; rtl: boolean }[] = [
  { id: 'ar', label: 'العربية', rtl: true },
  { id: 'en-US', label: 'English (US)', rtl: false },
  { id: 'en-GB', label: 'English (UK)', rtl: false },
  { id: 'ku', label: 'کوردی', rtl: true },
];

const ar: Dict = {
  langName: 'العربية',
  accountTitle: 'حساب MATRIX',
  accountSub: 'مزامنة · أكاديمية · عمولات الشبكة الثنائية',
  tabHome: 'الرئيسية',
  tabTools: 'أدوات',
  tabAcademy: 'أكاديمية',
  tabMessages: 'رسائل',
  tabAccount: 'حساب',
  login: 'دخول',
  register: 'تسجيل',
  name: 'الاسم',
  namePlaceholder: 'اسم المستخدم',
  email: 'الإيميل',
  emailPlaceholder: 'name@example.com',
  password: 'باسوورد',
  passwordPlaceholder: 'باسوورد',
  enter: 'دخول',
  createAccount: 'إنشاء حساب',
  logout: 'تسجيل خروج',
  hello: 'مرحباً',
  accountType: 'نوع الحساب',
  sponsorCode: 'رمز الكفيل (اختياري)',
  underSponsor: 'الطرف تحت الكفيل',
  left: 'يسار',
  right: 'يمين',
  trader: 'متداول',
  trainer: 'مدرب',
  broker: 'بروكر',
  agent: 'وكيل',
  company: 'شركة',
  loginError: 'تعذر الدخول — تحقق من الاسم/الإيميل والباسوورد',
  registerError: 'تعذر التسجيل — تحقق من الإيميل والبيانات ورمز الكفيل',
  language: 'اللغة',
  commissionsReport: 'تقرير العمولات',
  networkTree: 'شجرة الشبكة',
  deleteAccount: 'حذف الحساب',
  deleteAccountConfirmTitle: 'حذف الحساب نهائياً؟',
  deleteAccountConfirmBody:
    'سيُحذف اسم المستخدم والإيميل وكلمة المرور نهائياً ولن تقدر تسجّل الدخول بهذا الحساب مرة أخرى. هذا الإجراء لا يمكن التراجع عنه.',
  deleteAccountConfirmBtn: 'حذف نهائياً',
  deleteAccountError: 'تعذر حذف الحساب — حاول لاحقاً',
  cancel: 'إلغاء',
  notifications: 'الإشعارات',
  notifStatusGranted: 'مفعّلة',
  notifStatusDenied: 'مرفوضة من إعدادات الجهاز',
  notifStatusUndetermined: 'تحتاج إذن',
  notifStatusUnsupported: 'غير مدعومة على الويب',
  notifEnableBtn: 'تفعيل الإشعارات',
  notifOpenSettingsBtn: 'فتح إعدادات الجهاز',
  restartRequiredTitle: 'يلزم إعادة تشغيل التطبيق',
  restartRequiredBody:
    'تم تغيير اللغة. أغلق التطبيق وأعد فتحه لتطبيق اتجاه الواجهة (يمين/يسار) بالكامل على كل الشاشات.',
  restartRequiredBtn: 'حسناً',
  onboardStep1Title: 'فريمات متعددة',
  onboardStep1Body:
    'افتح حتى أربع شارتات معاً وقارن بين الأزواج والأطر الزمنية بلمسة واحدة، مع تخطيط 2×2 وفريم بملء الشاشة.',
  onboardStep2Title: 'أدوات الرسم',
  onboardStep2Body:
    'تبويب «رسم» بالشريط السفلي يفتح لك خطوط الترند وفيبوناتشي والمستطيلات وباقي أدوات التحليل الفني مباشرة على الشارت.',
  onboardStep3Title: 'المؤشرات والعدسات',
  onboardStep3Body:
    'اختر من عشرات المؤشرات الجاهزة (RSI, MACD, بولنجر وغيرها)، أو فعّل عدسة جاهزة تلخّص حالة السوق بنظرة واحدة.',
  onboardStep4Title: 'التنبيهات',
  onboardStep4Body:
    'أنشئ تنبيه سعر أو مؤشر وسيصلك إشعار فوري على جهازك أينما كنت — لا حاجة لمراقبة الشارت طوال الوقت.',
  onboardSkip: 'تخطي',
  onboardNext: 'التالي',
  onboardStart: 'ابدأ',
};

const enUS: Dict = {
  langName: 'English (US)',
  accountTitle: 'MATRIX Account',
  accountSub: 'Sync · Academy · Binary network commissions',
  tabHome: 'Home',
  tabTools: 'Tools',
  tabAcademy: 'Academy',
  tabMessages: 'Messages',
  tabAccount: 'Account',
  login: 'Log in',
  register: 'Sign up',
  name: 'Name',
  namePlaceholder: 'Username',
  email: 'Email',
  emailPlaceholder: 'name@example.com',
  password: 'Password',
  passwordPlaceholder: 'Password',
  enter: 'Log in',
  createAccount: 'Create account',
  logout: 'Log out',
  hello: 'Welcome',
  accountType: 'Account type',
  sponsorCode: 'Sponsor code (optional)',
  underSponsor: 'Side under sponsor',
  left: 'Left',
  right: 'Right',
  trader: 'Trader',
  trainer: 'Trainer',
  broker: 'Broker',
  agent: 'Agent',
  company: 'Company',
  loginError: 'Login failed — check name/email and password',
  registerError: 'Sign-up failed — check email, details, and sponsor code',
  language: 'Language',
  commissionsReport: 'Commissions report',
  networkTree: 'Network tree',
  deleteAccount: 'Delete account',
  deleteAccountConfirmTitle: 'Delete account permanently?',
  deleteAccountConfirmBody:
    'Your username, email, and password will be permanently erased and you will not be able to sign back into this account. This cannot be undone.',
  deleteAccountConfirmBtn: 'Delete permanently',
  deleteAccountError: 'Could not delete account — try again later',
  cancel: 'Cancel',
  notifications: 'Notifications',
  notifStatusGranted: 'Enabled',
  notifStatusDenied: 'Blocked in device settings',
  notifStatusUndetermined: 'Needs permission',
  notifStatusUnsupported: 'Not supported on web',
  notifEnableBtn: 'Enable notifications',
  notifOpenSettingsBtn: 'Open device settings',
  restartRequiredTitle: 'Restart required',
  restartRequiredBody:
    'Language changed. Close and reopen the app to fully apply the new layout direction across all screens.',
  restartRequiredBtn: 'OK',
  onboardStep1Title: 'Multiple frames',
  onboardStep1Body:
    'Open up to four charts at once and compare pairs and timeframes in one tap, with a 2x2 layout and a full-screen frame.',
  onboardStep2Title: 'Drawing tools',
  onboardStep2Body:
    'The Draw tab in the bottom bar opens trend lines, Fibonacci, rectangles, and more analysis tools right on the chart.',
  onboardStep3Title: 'Indicators & lenses',
  onboardStep3Body:
    'Choose from dozens of ready indicators (RSI, MACD, Bollinger, and more), or turn on a lens that summarizes market state at a glance.',
  onboardStep4Title: 'Alerts',
  onboardStep4Body:
    'Create a price or indicator alert and get an instant notification on your device — no need to watch the chart all day.',
  onboardSkip: 'Skip',
  onboardNext: 'Next',
  onboardStart: 'Start',
};

const enGB: Dict = {
  ...enUS,
  langName: 'English (UK)',
  login: 'Sign in',
  register: 'Register',
  enter: 'Sign in',
  createAccount: 'Create an account',
  logout: 'Sign out',
  hello: 'Hello',
  email: 'E-mail',
  sponsorCode: 'Sponsor code (optional)',
  loginError: 'Sign-in failed — check name/e-mail and password',
  registerError: 'Registration failed — check e-mail, details, and sponsor code',
  language: 'Language',
  commissionsReport: 'Commission report',
  networkTree: 'Network tree',
};

const ku: Dict = {
  langName: 'کوردی',
  accountTitle: 'هەژماری MATRIX',
  accountSub: 'هاوکاتکردن · ئەکادیمی · کۆمیسیۆنی تۆڕی دووقۆڵی',
  tabHome: 'سەرەکی',
  tabTools: 'ئامرازەکان',
  tabAcademy: 'ئەکادیمی',
  tabMessages: 'نامەکان',
  tabAccount: 'هەژمار',
  login: 'چوونەژوورەوە',
  register: 'تۆمارکردن',
  name: 'ناو',
  namePlaceholder: 'ناوی بەکارهێنەر',
  email: 'ئیمەیڵ',
  emailPlaceholder: 'name@example.com',
  password: 'پاسوۆرد',
  passwordPlaceholder: 'پاسوۆرد',
  enter: 'چوونەژوورەوە',
  createAccount: 'دروستکردنی هەژمار',
  logout: 'دەرچوون',
  hello: 'سڵاو',
  accountType: 'جۆری هەژمار',
  sponsorCode: 'کۆدی سپۆنسەر (ئیختیاری)',
  underSponsor: 'لایەن لەژێر سپۆنسەر',
  left: 'چەپ',
  right: 'ڕاست',
  trader: 'بازرگان',
  trainer: 'ڕاهێنەر',
  broker: 'برۆکەر',
  agent: 'بریکار',
  company: 'کۆمپانیا',
  loginError: 'چوونەژوورەوە سەرکەوتوو نەبوو — ناو/ئیمەیڵ و پاسوۆرد بپشکنە',
  registerError: 'تۆمارکردن سەرکەوتوو نەبوو — ئیمەیڵ و زانیاری و کۆدی سپۆنسەر بپشکنە',
  language: 'زمان',
  commissionsReport: 'ڕاپۆرتی کۆمیسیۆن',
  networkTree: 'دارەکەی تۆڕ',
  deleteAccount: 'سڕینەوەی هەژمار',
  deleteAccountConfirmTitle: 'هەژمار بە تەواوی بسڕدرێتەوە؟',
  deleteAccountConfirmBody:
    'ناوی بەکارهێنەر و ئیمەیڵ و پاسوۆرد بە تەواوی دەسڕدرێنەوە و ئیتر ناتوانیت بچیتەژوورەوەی ئەم هەژمارە. ئەم کردارە ناگەڕێتەوە.',
  deleteAccountConfirmBtn: 'بە تەواوی بسڕەوە',
  deleteAccountError: 'سڕینەوەی هەژمار سەرکەوتوو نەبوو — دواتر هەوڵبدەرەوە',
  cancel: 'پاشگەزبوونەوە',
  notifications: 'ئاگادارکردنەوەکان',
  notifStatusGranted: 'چالاکە',
  notifStatusDenied: 'ڕەتکراوەتەوە لە ڕێکخستنی ئامێر',
  notifStatusUndetermined: 'پێویستی بە مۆڵەتە',
  notifStatusUnsupported: 'پشتگیری ناکرێت لەسەر وێب',
  notifEnableBtn: 'چالاککردنی ئاگادارکردنەوەکان',
  notifOpenSettingsBtn: 'کردنەوەی ڕێکخستنی ئامێر',
  restartRequiredTitle: 'پێویستە ئەپەکە دووبارە بکرێتەوە',
  restartRequiredBody:
    'زمان گۆڕدرا. ئەپەکە دابخە و دووبارە بیکەرەوە بۆ ئەوەی ئاراستەی ڕووکار (ڕاست/چەپ) بە تەواوی لەسەر هەموو پەیجەکان جێبەجێ بێت.',
  restartRequiredBtn: 'باشە',
  onboardStep1Title: 'چەند چوارچێوەیەک بەیەکەوە',
  onboardStep1Body:
    'هەتا چوار شێوەنیگار بەیەکەوە بکەرەوە و جووت و کاتەکان بە یەک دەستدان بەراورد بکە، لەگەڵ نەخشەی 2×2 و چوارچێوەی پڕ شاشە.',
  onboardStep2Title: 'ئامرازەکانی وێنەکێشان',
  onboardStep2Body:
    'تابی «وێنەکێشان» لە شریتی خوارەوە هێڵی ترێند و فیبۆناتچی و لاکێشەکان و ئامرازەکانی تری شیکردنەوەی تەکنیکی دەکاتەوە ڕاستەوخۆ لەسەر شێوەنیگار.',
  onboardStep3Title: 'پێوەرەکان و لینزەکان',
  onboardStep3Body:
    'لە دەیان پێوەری ئامادە هەڵبژێرە (RSI، MACD، بۆلینگەر و زیاتر)، یان لینزێک چالاک بکە کە بارودۆخی بازاڕ بە یەک تەماشاکردن کورت دەکاتەوە.',
  onboardStep4Title: 'ئاگادارکردنەوەکان',
  onboardStep4Body:
    'ئاگادارکردنەوەیەکی نرخ یان پێوەر دروست بکە و ئاگاداری خێرا لەسەر ئامێرەکەت وەربگرە — پێویست ناکات بە درێژایی ڕۆژ چاودێری شێوەنیگار بکەیت.',
  onboardSkip: 'تێپەڕاندن',
  onboardNext: 'دواتر',
  onboardStart: 'دەستپێبکە',
};

export const DICTS: Record<LangId, Dict> = {
  ar,
  'en-US': enUS,
  'en-GB': enGB,
  ku,
};

export function isRtl(lang: LangId): boolean {
  return LANGS.find((l) => l.id === lang)?.rtl ?? true;
}
