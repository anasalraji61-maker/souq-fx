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
