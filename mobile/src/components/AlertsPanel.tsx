import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedHeadTail, frameEmbedTitleBlock, frameEmbedTitle, frameEmbedSub, buttons, numeric } from '../theme';
import { api, type PriceAlert } from '../api';
import {
  ensureAlertNotifications,
  getNotificationPermissionState,
  pushPriceAlert,
  registerPushToken,
  type NotificationPermissionState,
} from '../notifications';
import { playSoftClick } from '../audio/playSoftClick';
import { hasCelebratedFirstAlert, markFirstAlertCelebrated } from '../achievements';
import { useI18n } from '../i18n/I18nContext';
import { parseDecimal } from '../parseDecimal';
import { isNotOfferedSymbol, isSymbolUnavailableError } from '../providerSymbols';
import { isRealQuote } from '../chart/dataSource';
import { formatPrice } from '../chart/math';
import { confirmDestructive, notify } from '../chart/confirmDestructive';
import { instrumentSpec, pipsBetween, priceAtPipOffset } from '../positionSize';
import { chartPipSpec } from '../chart/pipSpec';
import { pipUnit } from '../chart/measureReadout';
import { formatPips } from '../tradePlan';

/** إيقاع تحديث «السعر الآن» بالنموذج — نفس إيقاع فحص التنبيهات بهذه اللوحة (60 ثانية). */
const QUOTE_REFRESH_MS = 60_000;

/**
 * ارتفاع نافذة قائمة التنبيهات حين تكون اللوحة داخل صفحة تُمرَّر (اللوح الجانبي/الرصيف/شارت التركيز):
 * هناك ارتفاع اللوحة يتبع محتواها، فلا «مساحة متبقية» تُملأ — والسقف يمنع قائمةً طويلة من دفع ما بعدها
 * خارج الشاشة. وهو نفسه **الحدّ الأدنى** بالوضع المضمَّن أدناه، فلا تصير القائمة أصغر مما كانت بأي حال.
 */
const LIST_WINDOW_H = 160;

/**
 * مسافات جاهزة بالنقاط حول السعر الحالي. المتداول يضع تنبيهه عند «عشرين نقطة فوق السوق» لا عند رقم
 * يحفظه — وكتابة «1.08703» بخمس منازل على لوحة مفاتيح هاتف بيد واحدة أكثر خطوة يخطئ فيها بهذه اللوحة
 * (رقم ناقص = تنبيه عند مستوى آخر تماماً). المسافة تُحوَّل لسعر بحجم pip **الأداة** (الين 0.01،
 * الذهب 0.1، الفضة 0.01) فالرقم صحيح لكل رمز، والاتجاه يُستنتج من إشارتها كما يُستنتج من أي سعر يُكتب.
 */
const PIP_OFFSETS = [-50, -25, -10, 10, 25, 50] as const;

type Props = {
  defaultSymbol?: string;
  embedded?: boolean;
  /**
   * اللوحة تملك الصفحة وحدها (تبويب «تنبيهات السعر» بشاشة الأدوات): التنبيهات تُسرَد متدفّقة بلا
   * نافذة تمرير داخلية، فالصفحة هي التي تُمرَّر. بغيره تبقى النافذة كما هي بمواضع المشاركة.
   */
  flow?: boolean;
  /** يزيده الأب بعد إنشاء تنبيه من خارج اللوحة (من الشارت) لتحديث القائمة فوراً بدل انتظار الاستطلاع. */
  refreshKey?: number;
  /**
   * أسعار حيّة جاهزة من مقبس التيكات بالشاشة الحاضنة — **مفتاحها رمزُ الأداة بحروف كبيرة**.
   * بها تُعرض مسافة النقاط **لكل صفّ** لا لصفوف رمز النموذج وحدها. الحاضنة هي التي تضمن أن ما
   * يصل هنا سعرٌ يصحّ البناء عليه (لا بثّ تجريبي عشوائي، ولا سعر مجمَّد فات عمره)؛ فالغياب هنا
   * يعني «لا سعر حيّ موثوق» وتعود اللوحة لسلوكها السابق حرفياً.
   */
  ticks?: Record<string, number>;
  /**
   * **هل اللوحة معروضة الآن؟** الافتراضي `true` فكل موضع لا يمرّرها يبقى كما كان حرفياً.
   *
   * اللوحة تُشغّل مؤقّتَين كلٌّ منهما دقيقة: فحص التنبيهات (`checkAlerts`) واستطلاع «السعر الآن»
   * (`/api/market/quote`) — وكلاهما **نداءٌ عند مزوّد الأسعار** لا قراءةُ ذاكرة. وشاشات التبويبات
   * السفلية تبقى مركَّبة بعد الانتقال عنها: فمن فتح تبويب «تنبيهات السعر» ثم عاد للشارت كان يترك
   * **طلبين بالدقيقة** يعملان بقيّة الجلسة على لوحة لا يراها أحد — بطاريةً وحدّ مزوّد يُستهلكان
   * لرقمٍ لا يُقرأ. الإشعار نفسه لا يتأثّر: الـworker الخلفي بالخادم هو الذي يُطلق التنبيه ويرسل
   * الإشعار، وفحص اللوحة تعجيلٌ لمن يجلس أمامها.
   *
   * وبالعودة يُعاد الفحص والاستطلاع **فوراً** (لا انتظار دورة)، فأول ما يراه المتداول أحدث مما
   * كان يراه سابقاً لا أقدم.
   */
  active?: boolean;
};

export function AlertsPanel({
  defaultSymbol = 'EURUSD',
  embedded,
  refreshKey,
  flow = false,
  ticks,
  active = true,
}: Props) {
  const { t, rtl, lang } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [symbol, setSymbol] = useState(defaultSymbol);
  /** مواصفات الأداة المكتوبة — لحجم الـpip بشرائح المسافات. null لرمز ناقص أو غير قابل للحساب (DXY،
   * العملات الرقمية) فلا تُعرض الشرائح هناك: مسافة بالنقاط بلا حجم pip معروف رقمٌ مختلَق. */
  const spec = useMemo(() => instrumentSpec(symbol), [symbol]);
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  /** وضوح الحالة: يميّز "لا تنبيهات بعد" الفعلية عن فشل تحميل القائمة */
  const [listError, setListError] = useState(false);
  /** وضوح الحالة: يعلم المستخدم إذا فشلت إضافة تنبيه بدل صمت كامل */
  const [formError, setFormError] = useState<string | null>(null);
  /** احتفال بصري خفيف لمرة واحدة فقط عند أول تنبيه سعر (matrix-tactile-feel.mdc) */
  const [showFirstBadge, setShowFirstBadge] = useState(false);
  const firstBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // حارس "alive" منفصل عن مؤقت الشارة أعلاه — يمنع تحديث الحالة بعد إلغاء تركيب اللوحة، يشمل
  // نتيجة الاستطلاع الدوري (setInterval) التي قد تصل بعد إلغاء التركيب رغم إيقاف المؤقت نفسه —
  // نفس مبدأ ChartFrame/SymbolSnapshot المؤسَّس بالكود.
  const mountedRef = useRef(true);
  /** السعر الحالي للرمز المكتوب — يُعرض بجانب النموذج ويُستخدم لاختيار الاتجاه تلقائياً (فوق/تحت)
   * وللتحذير من تنبيه سيُطلق فوراً. null = غير معروف (لا اتصال/مزوّد غير مهيأ) فيعمل النموذج كما كان. */
  const [current, setCurrent] = useState<number | null>(null);
  const quoteGen = useRef(0);
  /**
   * تحذير «مزوّد الأسعار لا يعرف هذا الرمز»: تنبيه على خطأ كتابة («EURSUD») يجلس بالقائمة
   * مُسلَّحاً ولن يُطلق أبداً، والمتداول ينتظره. لكن `data_kind: 'demo'` وحده **لا يكفي دليلاً**:
   * الباك-إند يُرجعه للرمز المجهول **وللمزوّد غير المهيّأ معاً** (تعليق `main.py:1126` صراحةً) —
   * وهو حال كل مستخدم حتى يُنشَر الخادم، فالتحذير على مجرّد `demo` كان سيتّهم كل رمز صحيح.
   * لذلك لا نتّهم الرمز إلا بدليل موجب: `providerRealRef` يصير true متى عاد **أي** اقتباس حقيقي
   * بهذه اللوحة — أي ثبت أن المزوّد يعمل — وعندها فقط يعني رجوع `demo` أن الرمز نفسه مجهول.
   * بلا هذا الدليل لا يُعرض شيء، كما كان.
   */
  const providerRealRef = useRef(false);
  /** هل وقع أول تحميل للقائمة؟ — يضمن أن لوحةً رُكِّبت مخفيّة لا تبقى على «جارٍ التحميل» (انظر أثر الفحص). */
  const loadedOnceRef = useRef(false);
  /**
   * هل يغطّي التيك الحيّ **رمز النموذج** الآن، ولأيّ رمز؟ — شرطه مطابقٌ حرفياً لشرط `currentPx`
   * أدناه (`spec ? ticks[spec.symbol] : undefined`) لا لمجرّد وجود المفتاح بالتيكات: رمزٌ بلا
   * مواصفة (DXY، العملات الرقمية) لا يقرأ `currentPx` تيكَه أصلاً، فلو عُدَّ «مغطّى» لتوقّف
   * استطلاعه وبقي رقمه جامداً بلا بديل.
   */
  const tickCoverRef = useRef<{ sym: string; covered: boolean }>({ sym: '', covered: false });
  /** آخر دالّة جلب اقتباس (تابعة للرمز الحالي) — لتُنادى فور سقوط التيك، انظر الأثر بعد أثر الاقتباس. */
  const fetchQuoteRef = useRef<(() => void) | null>(null);
  const [unknownSymbol, setUnknownSymbol] = useState(false);
  /** تأكيد صريح بعد كل حفظ ناجح ("مُفعَّل: EURUSD ≥ 1.0850") — كان التأكيد الوحيد شارة أول تنبيه. */
  const [armed, setArmed] = useState<string | null>(null);
  const armedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * **هل سيصلك الإشعار أصلاً؟** اللوحة تقول «✓ مُفعَّل: EURUSD ≥ 1.0850» ثم تصمت — وهي تقولها
   * بالضبط نفسها سواء أكان إذن الإشعارات ممنوحاً أم مرفوضاً من إعدادات الجهاز. والفرق بينهما هو
   * كلّ شيء: بالرفض لا يصل إشعار إطلاقاً، ويبقى التنبيه محصوراً بفحص اللوحة **وهي مفتوحة** — أي
   * أن المتداول الذي أغلق التطبيق واثقاً أنه سيُنادى لن يُنادى، وسيعلم ذلك بعد أن يمرّ السوق
   * بمستواه. وعنوان اللوحة نفسه يَعِد بـ«إشعار عند الإطلاق» (`alertsSub`).
   *
   * يُقرأ الإذن بعد محاولة الطلب عند الفتح، ولا يُعرض شيء إذا كان ممنوحاً (لا ضجيج حيث يعمل كل
   * شيء). الأزرار والنصوص كلها مفاتيح قائمة بالثلاث لغات (`notif*`) بنفس منطق شاشة الحساب.
   */
  const [notifState, setNotifState] = useState<NotificationPermissionState | null>(null);
  const [notifBusy, setNotifBusy] = useState(false);
  /** تعديل تنبيه قائم: الضغط على سطره يحمّل قيمه بالنموذج؛ الحفظ = إنشاء الجديد ثم حذف القديم
   * (لا يوجد مسار تحديث بالباك-إند، وهذا الترتيب لا يُفقد التنبيه القديم إن فشل الإنشاء). */
  const [editingId, setEditingId] = useState<string | null>(null);
  /** نص السعر المكتوب + هل اختار المتداول الاتجاه بنفسه — ليُستنتج الاتجاه أيضاً حين يصل السعر الحالي
   * **بعد** كتابة الرقم (تأخير 600ms + الشبكة): كان يبقى «فوق» الافتراضي فيُطلق تنبيه «1.0800» فوراً. */
  const priceTextRef = useRef('');
  const condManualRef = useRef(false);

  useEffect(() => {
    return () => {
      if (firstBadgeTimerRef.current) clearTimeout(firstBadgeTimerRef.current);
      if (armedTimerRef.current) clearTimeout(armedTimerRef.current);
      mountedRef.current = false;
    };
  }, []);

  /** فتح اللوحة من شارت آخر (FocusChartModal/الشريط الجانبي) يغيّر defaultSymbol — نزامن الرمز
   * ما لم يكن المستخدم في منتصف تعديل تنبيه. */
  useEffect(() => {
    if (!editingId) setSymbol(defaultSymbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSymbol]);

  /**
   * «السعر الآن» كان يُجلب **مرة واحدة لكل رمز ثم يتجمّد ما بقيت اللوحة مركَّبة** — واللوحة مركَّبة
   * طوال الجلسة داخل شبكة شاشة الأدوات. فبعد ساعة يقرأ المتداول رقماً من ساعة مضت، وثلاثة أشياء
   * تُبنى عليه كلها: الاتجاه المستنتج (فوق/تحت)، وتحذير «سيُطلق فوراً»، وزرّ «استخدمه» الذي يكتب ذلك
   * السعر القديم بخانة التنبيه. النتيجة تنبيه يُطلق لحظةَ تسليحه أو لا يُطلق أبداً، والرقم المعروض
   * أمامه يقول إنه صحيح. يُحدَّث الآن كل `QUOTE_REFRESH_MS` — نفس إيقاع فحص التنبيهات بهذه اللوحة.
   *
   * **الاتجاه لا يُستنتج إلا من أول اقتباس ناجح للرمز**: استنتاجه من كل تحديث كان سيقلب اختيار
   * المتداول تحت يده كل دقيقة بينما يكتب (سعر يعبره السوق بين تحديثين = «فوق» تصير «تحت» بلا لمسة
   * منه). التحديثات اللاحقة تحرّك الرقم المعروض وحده. وفشل تحديث لاحق لا يمسح آخر سعر معروف
   * (لا catch يكتب الحالة)، بينما اقتباس بذري تجريبي يمسحه عمداً — لا سعر مختلَق بصندوق قرار.
   */
  useEffect(() => {
    const sym = symbol.trim().toUpperCase();
    const gen = ++quoteGen.current;
    setCurrent(null);
    setUnknownSymbol(false);
    // اللوحة خارج الشاشة: لا استطلاع. والمسح أعلاه يقع **قبل** الخروج عمداً — فبالعودة لا يُعرض
    // رقمٌ عمره جلسةٌ كاملة ولو للحظة، وعليه تُبنى شرائح «±20 نقطة» وتحذير «سيُطلق فوراً».
    if (!active) return;
    if (sym.length < 3) return;
    // أول اقتباس **ناجح** لهذا الرمز (الفشل لا يستهلكها) هو وحده الذي يستنتج الاتجاه
    let firstQuote = true;
    const fetchQuote = () => {
      api
        .marketQuote(sym)
        .then((q) => {
          if (!mountedRef.current || gen !== quoteGen.current) return;
          // سعر بذري تجريبي (المزوّد متعذّر/رمز مجهول) ليس «السعر الحالي»: كان يحدّد اتجاه فوق/تحت ويحذّر
          // «سيُطلق فوراً» بناءً على رقم مختلَق — الباك-إند يفحص التنبيه بأسعار المزوّد الحقيقية فقط.
          const real = isRealQuote(q);
          const cur = real ? q.price : null;
          setCurrent(cur);
          if (real) providerRealRef.current = true;
          setUnknownSymbol(!real && providerRealRef.current);
          const typed = parseDecimal(priceTextRef.current);
          if (firstQuote && cur != null && !condManualRef.current && typed != null && typed > 0 && typed !== cur) {
            setCondition(typed > cur ? 'above' : 'below');
          }
          if (cur != null) firstQuote = false;
        })
        .catch(() => {
          /* السعر الحالي تحسين اختياري — فشله لا يمنع إضافة التنبيه ولا يمسح آخر سعر معروف */
        });
    };
    fetchQuoteRef.current = fetchQuote;
    // **الجلب الأول يقع دائماً** ولو كان التيك يغطّي الرمز: منه وحده يُستنتج الاتجاه لسعرٍ كُتب
    // قبل وصول الاقتباس، ومنه يأتي الدليل الموجب الذي يبني عليه `unknownSymbol` حكمه
    // (`providerRealRef`) — والتيك لا يحمل أيّاً منهما. طلبٌ واحد عند الفتح، لا ستّون بالساعة.
    const id = setTimeout(fetchQuote, 600);
    const poll = setInterval(() => {
      // التيك الحيّ يغطّي هذا الرمز ⇒ `currentPx` يقرؤه لا يقرأ `current`، فطلب REST بالدقيقة
      // إنفاقٌ عند المزوّد لرقمٍ لا يُقرأ. وسقوطُ التغطية يُنادي الجلب فوراً (الأثر التالي)، فلا
      // يُترك `current` بائتاً احتياطاً.
      if (tickCoverRef.current.covered) return;
      fetchQuote();
    }, QUOTE_REFRESH_MS);
    return () => {
      clearTimeout(id);
      clearInterval(poll);
      if (fetchQuoteRef.current === fetchQuote) fetchQuoteRef.current = null;
    };
  }, [symbol, active]);

  /**
   * تتبّع تغطية التيك لرمز النموذج، **وجلبٌ فوري عند سقوطها**.
   *
   * بلا هذا الجلب كان الاحتياط يتعفّن بصمت: طوال فترة التغطية لا يُستطلَع `current`، فإن انقطع
   * البثّ (إغلاق السوق، سقوط المزوّد) عاد `currentPx` إلى `current` — رقمٍ عمره طولُ التغطية
   * كلّها، لا دقيقة. وهو الرقم الذي تُحسب منه شرائح «±20 نقطة» ويُقال به «سيُطلق فوراً».
   *
   * الحارس `prev.sym === sym` يمنع جلباً مكرَّراً عند **تبديل الرمز**: هناك يكون أثر الاقتباس قد
   * أعاد التركيب وجدول جلبه الخاص أصلاً، فسقوط التغطية أثرٌ جانبي للتبديل لا حدثٌ بذاته.
   */
  useEffect(() => {
    const sym = spec?.symbol ?? '';
    const covered = sym ? ticks?.[sym] != null : false;
    const prev = tickCoverRef.current;
    tickCoverRef.current = { sym, covered };
    if (prev.sym === sym && prev.covered && !covered) fetchQuoteRef.current?.();
  }, [ticks, spec]);

  /**
   * منازل السعر حسب **الأداة** لا حجم الرقم، وبلا قصّ أصفار: كانت اللوحة آخر موضع بالتطبيق يقدّر
   * المنازل من الحجم ثم يمرّرها بـ`String(Number(...))` فتُقصّ الأصفار الأخيرة — والمتداول يقرأ
   * «157.4» ولا يعرف أهو 157.400 أم 157.04، ويقرأ «1.085» حيث يضع وقفه على 1.08500. وسطر التنبيه
   * هو بالضبط السطر الذي يُبنى عليه القرار.
   */
  const fmtPrice = (v: number, sym?: string) => formatPrice(v, (sym ?? symbol).trim().toUpperCase());
  const condMark = (c: 'above' | 'below') => (c === 'above' ? '≥' : '≤');

  /**
   * **كم يبعد التنبيه عن السوق الآن، بالنقاط.** سطر التنبيه كان يقول «EURUSD ≥ 1.0850 · مُسلَّح»
   * وحسب: رقمٌ بخمس منازل لا يُقارَن بالسعر الحالي ذهنياً وهو ليس أمامه بالسطر نفسه. فقائمةٌ فيها
   * ستّة تنبيهات مُسلَّحة لا تقول أيّها على بُعد خمس نقاط وأيّها على بُعد ثلاثمئة — وهذا بالضبط ما
   * يُقرأ من «قائمة واضحة بالتنبيهات النشطة». والمسافة بحجم pip **الأداة** (الين 0.01، الذهب 0.1)
   * كبقية أرقام النقاط بالتطبيق، فهي الوحدة نفسها التي يكتب بها وقفه بحاسبة المخاطرة.
   *
   * لا تظهر إلا حيث تكون **صادقة**، وهذا هو القيد الذي انحلّ: كان رمز النموذج وحده يُجلب سعره
   * (`current` — طلب REST لرمزٍ واحد)، فمتداولٌ عليه تنبيهات بالذهب واليورو والمجنون يرى المسافة
   * على صفوف واحدٍ منها ويقرأ الباقي أرقاماً مجرّدة — **وهو الأغلب: القائمة تُفتح لتُقرأ كلّها، لا
   * لرمزٍ واحد**. تيكات المقبس تصل الشاشة الحاضنة أصلاً لكل ما اشترك به الخادم، بلا طلب ولا حدٍّ
   * يُستهلك، فصار لكل صفّ مسافته — **وتتحرّك مع السوق** بدل لقطةٍ تتجمّد.
   *
   * التيك يُقدَّم على `current` لرمز النموذج نفسه: كلاهما موثوق (الحاضنة ترشّح التجريبي والمجمَّد،
   * و`isRealQuote` ترشّح الاقتباس)، والتيك أحدث — ثانيةً مقابل دورة استطلاع. وما لا سعر له يبقى
   * بلا رقم كما كان تماماً: لا رقم من سعرٍ لا نملكه. والمُطلَق لا مسافة له — مستوىً بلغه السوق ومضى.
   */
  const alertDistancePips = (a: PriceAlert): number | null => {
    if (a.triggered) return null;
    const sym = (a.symbol || '').trim().toUpperCase();
    // سعر رمز **هذا الصفّ** لا رمز النموذج؛ و`current` احتياطٌ لرمز النموذج وحده كما كان
    const px = ticks?.[sym] ?? (spec && sym === spec.symbol ? current : null);
    if (px == null) return null;
    // مواصفة رمز الصفّ — `chartPipSpec` كالشارت (يقبل «USDJPYc»/«XAUUSDm»/«EURUSD.pro» التي يرفضها
    // `instrumentSpec` عمداً للحاسبة، فكانت تنبيهاتها بلا مسافة — chart-r56 (3))، و`null` لما لا حجم pip
    // له (DXY، العملات الرقمية) فلا رقم مختلَق. مواصفة النموذج تُعاد استعمالاً حين يتطابق الرمز.
    const rowSpec = spec && sym === spec.symbol ? spec : chartPipSpec(sym);
    if (!rowSpec) return null;
    // الحساب بـ`positionSize.ts` حيث تعيش كل رياضيات الـpip ومغطّى بحالات selftest دائمة
    return pipsBetween(rowSpec, a.price, px);
  };
  /** «24 pip» / «24 pips» — `pipUnit(lang)` كالشارت والدفتر (الإنجليزية «pips»). */
  const distText = (a: PriceAlert): string | null => {
    const d = formatPips(alertDistancePips(a));
    return d == null ? null : `${d} ${pipUnit(lang)}`;
  };

  /**
   * **«السعر الحالي» صار حالياً فعلاً.** `current` اقتباسُ REST يُستطلَع كل `QUOTE_REFRESH_MS`
   * (دقيقة) — وهو مكتوبٌ أمام المتداول بكلمة «الحالي»، **ويُبنى عليه أكثر من عرض**: زرّ «استعمل
   * الحالي» يكتب رقمه بخانة السعر، وشرائح «±20 pip» تُحسب منه مستوياتٍ تُسلَّح بنقرة، والاتجاه
   * (فوق/تحت) يُستنتج بمقارنته، والتحذير «سيُطلق فوراً» يُقال أو يُكتم به. ودقيقةٌ على الذهب حركةٌ
   * تُقاس بعشرات النقاط: فالمتداول كان يضع مستوىً «عشرين نقطة فوق السوق» فوق سوقٍ مضى، ويُطمأن
   * إلى أن تنبيهه لن يُطلق فوراً وقد جاوزه السعر أصلاً.
   *
   * التيك الحيّ (ثانية) يتقدّم حيث وُجد، و`current` يبقى الاحتياط كما كان — وكلاهما مرشَّح من
   * السعر المختلَق: الحاضنة ترشّح البثّ التجريبي والمجمَّد، و`isRealQuote` ترشّح الاقتباس.
   * **ولا يمسّ هذا استنتاج `unknownSymbol`**: غياب رمزٍ عن البثّ يعني أن الخادم لا يشترك به، لا
   * أنه رمز مجهول — وذلك الحكم يبقى على REST وحده حيث كان.
   */
  const currentPx = (spec ? ticks?.[spec.symbol] : undefined) ?? current;

  /** الاتجاه يُستنتج من موقع السعر المدخل بالنسبة للسعر الحالي — المستخدم يكتب الرقم فقط،
   * ويبقى قادراً على قلب الاتجاه يدوياً بعدها (مع تحذير إن صار التنبيه سيُطلق فوراً). */
  const onPriceChange = (txt: string) => {
    setPrice(txt);
    priceTextRef.current = txt;
    condManualRef.current = false;
    setFormError(null);
    const p = parseDecimal(txt) ?? NaN;
    if (currentPx != null && Number.isFinite(p) && p > 0 && p !== currentPx) {
      setCondition(p > currentPx ? 'above' : 'below');
    }
  };

  const parsedPrice = parseDecimal(price) ?? NaN;
  const firesNow =
    currentPx != null &&
    Number.isFinite(parsedPrice) &&
    parsedPrice > 0 &&
    ((condition === 'above' && currentPx >= parsedPrice) ||
      (condition === 'below' && currentPx <= parsedPrice));

  const showArmed = (msg: string) => {
    setArmed(msg);
    if (armedTimerRef.current) clearTimeout(armedTimerRef.current);
    armedTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setArmed(null);
    }, 4000);
  };

  const startEdit = (a: PriceAlert) => {
    setEditingId(a.id);
    setSymbol(a.symbol);
    setPrice(String(a.price));
    priceTextRef.current = String(a.price);
    setCondition(a.condition);
    condManualRef.current = true;
    setNote(a.note || '');
    setFormError(null);
    setArmed(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setPrice('');
    priceTextRef.current = '';
    condManualRef.current = false;
    setNote('');
    setFormError(null);
  };

  const refresh = useCallback(async () => {
    try {
      const res = await api.alerts();
      if (mountedRef.current) {
        setAlerts(res.alerts);
        setListError(false);
      }
    } catch {
      if (mountedRef.current) {
        setAlerts([]);
        setListError(true);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const check = useCallback(async () => {
    try {
      const res = await api.checkAlerts();
      if (mountedRef.current) setAlerts(res.alerts);
      if (res.triggered.length) {
        /**
         * وصف الإطلاق — **مصدر واحد للسطرين**. «EURUSD فوق 1.0850 (1.0853)» بلغة الواجهة
         * (كان يعرض above/below الإنجليزية الخام بكل اللغات).
         *
         * كان يُبنى مرّتين بصيغتين مختلفتين: سطر اللوحة يحمل **السعر الذي طُبع فعلاً** بين
         * قوسين، والإشعار — وهو الوحيد الذي يصل المتداول وهاتفه مقفل، أي باللحظة التي يعني
         * فيها التنبيه شيئاً — يقول المستوى وحده. والسعران ليسا واحداً: المستوى هو ما طلبه
         * المتداول، والمطبوع هو **أين السوق الآن**، وبينهما بالذهب عشرات النقاط حين يُطلق
         * التنبيه على قفزة. فمن قرأ الإشعار وحده كان عليه فتح التطبيق ليعرف ما إن كان المستوى
         * لُمس ومضى أم ما زال عنده. وهو رقمٌ **بيد اللوحة أصلاً** (`trig.current`) لا طلبَ له.
         *
         * وبالبناء الواحد لا يفترق ما يُقرأ بالإشعار عمّا يُقرأ باللوحة أبداً. والحارس على
         * `current` باقٍ كما كان: باك-إند أقدم لا يُرسله ⇒ المستوى وحده، بلا قوسين فارغين.
         */
        const describe = (trig: (typeof res.triggered)[number]) => {
          const word = trig.condition === 'above' ? t.aboveWord : t.belowWord;
          const cur =
            typeof trig.current === 'number' && Number.isFinite(trig.current)
              ? ` (${formatPrice(trig.current, trig.symbol)})`
              : '';
          return `${trig.symbol} ${word} ${formatPrice(trig.price, trig.symbol)}${cur}`;
        };
        if (mountedRef.current) setFlash(res.triggered.map(describe).join(' · '));
        for (const trig of res.triggered) {
          await pushPriceAlert(t.alertsPushTitle, describe(trig));
        }
      }
    } catch {
      /* ignore */
    }
  }, [t.alertsPushTitle, t.aboveWord, t.belowWord]);

  /**
   * طلب إذن الإشعارات وقراءة حالته — **أثرٌ مستقلّ بلا تبعيات، مرّةً عند التركيب**. كان مطويّاً
   * داخل أثر الاستطلاع (`[refresh, check]`) وهو يُعاد بناؤه مع كل تغيّر لغة (`check` تابعة لـ`t`):
   * أي أن تبديل اللغة كان يعيد طلب الإذن ويعيد تسجيل رمز الدفع بلا داعٍ. الطلب لا علاقة له بإيقاع
   * الفحص ولا بلغة الواجهة، فموضعه أثرٌ وحده.
   */
  useEffect(() => {
    // رفض `getPermissionsAsync` (حالات أندرويد/Expo Go) كان يخرج كـunhandled rejection:
    // `registerPushToken` يحمي داخله فقط، والانتظار هنا كان بلا catch.
    void ensureAlertNotifications()
      .then(() => registerPushToken())
      .catch(() => {
        /* الإشعارات تحسين اختياري — فشل الإذن لا يمنع التنبيهات داخل التطبيق */
      })
      // القراءة بعد المحاولة **بكل المسارات** (نجحت أم رُفضت أم رمت) — هي ما يُعرض للمتداول
      .then(() => getNotificationPermissionState())
      .then((st) => {
        if (mountedRef.current) setNotifState(st);
      })
      .catch(() => {
        /* تعذّرت قراءة الحالة: لا نعرض ادّعاءً عنها (تبقى null فلا سطر) */
      });
  }, []);

  useEffect(() => {
    /**
     * فحص فوري عند فتح اللوحة، لا بعد دقيقة. `setInterval` وحده كان يعني أن أول فحص داخل
     * التطبيق يقع بعد 60 ثانية من الفتح — ومن يفتح اللوحة بالذات يفتحها ليرى إن كان مستواه قد
     * تحقّق، ومن يفتحها ويغلقها خلال الدقيقة لا يقع له فحص إطلاقاً. `checkAlerts` يعيد أيضاً
     * القائمة المحدَّثة، فالحالة المعروضة («مُسلَّح»/«أُطلق») تصير الأدقّ فوراً بدل قائمة
     * `/api/alerts` وحدها. لا إشعار مكرَّر: الخادم يُرجع التنبيه بـ`triggered` لمن يقلبه أولاً
     * فقط (`db.mark_alert_triggered` ذرّي)، والـworker الخلفي يخضع للقاعدة نفسها.
     * الفحص **بعد** `refresh` لا بالتوازي معه: كلاهما يكتب `setAlerts`، ولو سبق ردّ الفحص ردَّ
     * القائمة لَدهَس الأقدمُ الأحدثَ فتبقى اللوحة على حالة ما قبل الفحص دقيقة كاملة.
     */
    /**
     * `active` يوقف **الدورة** لا التحميل الأول: لوحةٌ رُكِّبت وهي مخفيّة تبقى على «جارٍ التحميل»
     * إلى الأبد لو مُنع عنها أول `refresh` — فالحارس يستثنيه مرّةً واحدة، ثم لا شيء يعمل وهي مخفيّة.
     */
    if (active || !loadedOnceRef.current) {
      loadedOnceRef.current = true;
      void refresh().then(check);
    }
    if (!active) return;
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [active, refresh, check]);

  useEffect(() => {
    if (refreshKey) void refresh();
  }, [refreshKey, refresh]);

  /** نفس مسار شاشة الحساب: الرفض ⇒ إعدادات النظام (لا سبيل لإعادة السؤال بiOS)، وما عداه ⇒ طلب الإذن. */
  const enableNotifications = async () => {
    if (notifBusy) return;
    setNotifBusy(true);
    try {
      if (notifState === 'denied') {
        await Linking.openSettings();
      } else {
        const ok = await ensureAlertNotifications();
        if (ok) await registerPushToken();
      }
    } catch {
      /* رفض النظام/بيئة بلا إعدادات — الحالة تُعاد قراءتها أدناه فيبقى المعروض صادقاً */
    } finally {
      try {
        const st = await getNotificationPermissionState();
        if (mountedRef.current) setNotifState(st);
      } catch {
        /* تُترك الحالة كما هي */
      }
      if (mountedRef.current) setNotifBusy(false);
    }
  };

  const add = async () => {
    const p = parseDecimal(price) ?? NaN;
    const sym = symbol.trim().toUpperCase();
    if (!sym || !Number.isFinite(p) || p <= 0) {
      setFormError(t.alertsInvalidInput);
      return;
    }
    // الخادم يطلب 3–12 حرفاً (`main.py` PriceAlert): «EU» كانت تصل 422 فتظهر رسالة «تعذّر الإضافة» العامة.
    // القاعدة نفسها بمؤشر التنبيه والدفتر.
    if (!/^[A-Z0-9./]{3,12}$/.test(sym)) {
      setFormError(t.indAlertsSymbolInvalid);
      return;
    }
    // backend-r50c: الخادم يرفض (422) التنبيه على رمز لا يقدّمه المزوّد — كان يُحفظ «يراقب» ولا يُطلق أبداً.
    if (isNotOfferedSymbol(sym)) {
      setFormError(t.chartNotOfferedTitle.replace('{symbol}', sym));
      return;
    }
    setBusy(true);
    setFormError(null);
    const replacing = editingId;
    const body = { symbol: sym, condition, price: p, note };
    try {
      /** تعديل ذرّي أولاً (PATCH — نفس المعرّف، يُعاد تفعيله، لا نافذة يوجد فيها تنبيهان). باك-إند
       * أقدم (405) أو تنبيه لم يعد موجوداً/لا نملكه (404) → الطريق القديم: إنشاء جديد ثم حذف القديم
       * (لا يُفقد القديم إن فشل الإنشاء). أي خطأ آخر (شبكة/500) يظهر كخطأ عادي دون إنشاء مكرر. */
      let fallbackDelete: string | null = null;
      if (replacing) {
        try {
          await api.updateAlert(replacing, body);
        } catch (e) {
          const status = (e as { status?: number }).status;
          if (status !== 404 && status !== 405) throw e;
          await api.createAlert(body);
          fallbackDelete = replacing;
        }
      } else {
        await api.createAlert(body);
      }
      playSoftClick();
      setPrice('');
      priceTextRef.current = '';
      condManualRef.current = false;
      setNote('');
      setEditingId(null);
      if (fallbackDelete) {
        try {
          await api.deleteAlert(fallbackDelete);
        } catch {
          setFormError(t.alertsEditOldRemains);
        }
      }
      showArmed(
        `${replacing ? t.alertsUpdatedPrefix : t.alertsArmedPrefix}: ${sym} ${condMark(condition)} ${formatPrice(
          p,
          sym
        )}`
      );
      await refresh();
      /** لحظة إنجاز/تشجيع محدَّدة (matrix-tactile-feel.mdc: "ضبط أول تنبيه") — تُحتفَل بها مرة
       * واحدة فقط عبر عمر التطبيق على الجهاز عبر `achievements.ts`، لا في كل مرة تُضاف تنبيهاً،
       * حتى لو حُذفت كل التنبيهات لاحقاً وأُضيف تنبيه جديد. */
      if (!(await hasCelebratedFirstAlert())) {
        await markFirstAlertCelebrated();
        setShowFirstBadge(true);
        if (firstBadgeTimerRef.current) clearTimeout(firstBadgeTimerRef.current);
        firstBadgeTimerRef.current = setTimeout(() => setShowFirstBadge(false), 2600);
      }
    } catch (e) {
      setFormError(isSymbolUnavailableError(e, sym) ? t.chartNotOfferedTitle.replace('{symbol}', sym) : t.alertsAddError);
    } finally {
      setBusy(false);
    }
  };

  /**
   * تنبيه السعر لمرة واحدة: بعد «أُطلق» كان الطريق الوحيد لإعادته **حذفه ثم كتابة الرمز والسعر من
   * جديد بخمس منازل** — والمستوى الذي لمسه السوق مرة هو بالضبط ما يعود إليه المتداول (إعادة اختبار
   * دعم/مقاومة)، أي أن أكثر التنبيهات جدارةً بالبقاء كان أكثرها كلفةً بإعادة الكتابة، بالخطوة نفسها
   * التي عولجت مراراً بهذه اللوحة (رقم ناقص = تنبيه عند مستوى آخر). `PATCH /api/alerts/{id}` يُعيد
   * التسليح **أصلاً** (`db.update_alert`: `triggered=0, active=1`) فلا حاجة لأي تغيير بالباك-إند،
   * ولوح تنبيهات المؤشرات يحمل الزر نفسه منذ مدّة (`rearmIndicatorAlert`) — هذه اللوحة وحدها بلا.
   * باك-إند أقدم بلا PATCH (405) أو تنبيه لم يعد موجوداً (404) → الطريق القديم نفسه المتّبع بـ`add`:
   * إنشاء نسخة ثم حذف القديم (بهذا الترتيب لا يُفقد القديم إن فشل الإنشاء).
   */
  const rearm = async (a: PriceAlert) => {
    setBusy(true);
    setFormError(null);
    const body = { symbol: a.symbol, condition: a.condition, price: a.price, note: a.note || '' };
    try {
      let stale: string | null = null;
      try {
        await api.updateAlert(a.id, body);
      } catch (e) {
        const status = (e as { status?: number }).status;
        if (status !== 404 && status !== 405) throw e;
        await api.createAlert(body);
        stale = a.id;
      }
      if (stale) {
        try {
          await api.deleteAlert(stale);
        } catch {
          if (mountedRef.current) setFormError(t.alertsEditOldRemains);
        }
      }
      if (!mountedRef.current) return;
      playSoftClick();
      // التنبيه المُعاد تسليحه لم يعد «مُطلَقاً»: تعديل مفتوح عليه بالنموذج يصير على حالة قديمة.
      if (editingId === a.id) cancelEdit();
      showArmed(
        t.alertsRearmedMsg.replace(
          '{desc}',
          `${a.symbol} ${condMark(a.condition)} ${fmtPrice(a.price, a.symbol)}`
        )
      );
      await refresh();
    } catch (e) {
      if (mountedRef.current)
        setFormError(
          isSymbolUnavailableError(e, a.symbol)
            ? t.chartNotOfferedTitle.replace('{symbol}', a.symbol)
            : t.alertsRearmFailed
        );
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.deleteAlert(id);
      if (editingId === id) cancelEdit();
      await refresh();
    } catch {
      notify(t.alertsDeleteFailedTitle, t.alertsDeleteFailedBody);
    }
  };

  /** التنبيهات المُطلقة تتراكم أسفل القائمة (لمرة واحدة) وكان حذفها واحداً واحداً بتأكيد لكلٍّ منها. */
  const firedCount = alerts.filter((a) => a.triggered).length;

  /**
   * سطر «🔔 أُطلق …» **لم يكن يزول أبداً**: يُكتب مرة عند الإطلاق ولا مؤقّت له ولا زرّ إخفاء
   * (خلافاً لـ`armed` وشارة أول تنبيه، ولكلٍّ منهما مؤقّت). واللوحة مركَّبة طوال الجلسة داخل شبكة
   * شاشة الأدوات، فيبقى السطر معلّقاً فوق النموذج ساعاتٍ يعلن سعراً تجاوزه السوق من زمن — بل يبقى
   * بعد أن يمسح المتداول التنبيهات المُطلَقة نفسها، فيعلن إطلاقاً لم يعد له أثر بالقائمة. السجلّ
   * الدائم للإطلاق هو صفّ التنبيه بحالته «أُطلق»، وهذا السطر إشعار لحظي: يزول بزوال ما يصفه، أو
   * بنقرة من المتداول.
   */
  useEffect(() => {
    if (firedCount === 0) setFlash(null);
  }, [firedCount]);
  const clearFired = async () => {
    const fired = alerts.filter((a) => a.triggered);
    setBusy(true);
    let failed = false;
    for (const a of fired) {
      try {
        await api.deleteAlert(a.id);
        if (editingId === a.id) cancelEdit();
      } catch {
        failed = true;
      }
    }
    try {
      await refresh();
    } finally {
      if (mountedRef.current) setBusy(false);
    }
    if (failed && mountedRef.current) notify(t.alertsDeleteFailedTitle, t.alertsDeleteFailedBody);
  };

  /**
   * ترتيب القائمة. الباك-إند يُرجع الأحدث فالأقدم (`db.list_alerts`: ORDER BY ts DESC)، وكان هذا
   * هو الترتيب المعروض كما هو (عدا المُطلَقة للأسفل). وهو ترتيبٌ كان مقبولاً حين كانت القائمة نافذةَ
   * ثلاثة صفوف بخليّة شبكة — لا يُرى منها ما يكفي ليكون للترتيب معنى. أما وقد صارت اللوحة تملك
   * تبويبها وتُعرض التنبيهات كلها دفعةً واحدة، فالترتيب صار هو ما يُقرأ به اللوح:
   *
   * تنبيهات المتداول ليست أحداثاً متفرّقة بل **مستويات على أدوات** — «عندي ثلاثة مستويات على الذهب
   * واثنان على اليورو». بالترتيب الزمني كانت مستويات الأداة الواحدة **متفرّقة** بطول القائمة بحسب
   * لحظة كتابة كلٍّ منها، فمن أراد أن يرى خريطة مستوياته على الذهب يجمعها بعينه من صفوف متباعدة.
   *
   * ثلاثة مفاتيح، بهذا الترتيب:
   * 1. المُطلَقة للأسفل — كما كان بالضبط (سجلّ، لا شيء ينتظره المتداول).
   * 2. تجميع بالأداة، وترتيب الأدوات بينها = **ترتيب أول ظهور بقائمة الباك-إند** — أي الأداة التي
   *    كُتب عليها أحدث تنبيه تبقى أولاً. فترتيب «الأحدث فالأقدم» محفوظ **بين** الأدوات، ولا يُفقد
   *    شيء من السلوك السابق سوى تبعثر الأداة الواحدة.
   * 3. داخل الأداة: السعر **تنازلياً** — سلّم أسعار يُقرأ كما يُقرأ الشارت (الأعلى فوق)، لا ترتيب
   *    كتابةٍ لا يعني شيئاً لمستويات على أداة واحدة.
   *
   * الفرز مستقرّ بمواصفة ES2019، فتنبيهان بالأداة والسعر نفسيهما يبقيان بترتيبهما الأصلي.
   */
  const symbolFirstSeen = new Map<string, number>();
  alerts.forEach((a, i) => {
    if (!symbolFirstSeen.has(a.symbol)) symbolFirstSeen.set(a.symbol, i);
  });
  const orderedAlerts = [...alerts].sort(
    (x, y) =>
      Number(x.triggered) - Number(y.triggered) ||
      (symbolFirstSeen.get(x.symbol) ?? 0) - (symbolFirstSeen.get(y.symbol) ?? 0) ||
      y.price - x.price
  );

  /**
   * صفوف قائمة التنبيهات — تُركَّب مرّة واحدة وتُعرض بثلاثة صناديق بحسب من يستضيف اللوحة:
   * نافذة تملأ خليّة الشبكة (`embedded`)، أو نافذة بسقف ثابت بالمواضع الضيّقة، أو سرد متدفّق
   * حين تملك اللوحة الصفحة وحدها (`flow`). الكتلة منقولة كما هي حرفياً من داخل `ScrollView`.
   */
  const rows = (
    <>
          {alerts.length > 0 ? (
            <Text style={[styles.listHead, { textAlign: align }]}>
              {t.alertsActiveCount}: {alerts.filter((a) => a.active && !a.triggered).length} · {t.alertsTapToEdit}
            </Text>
          ) : null}
          {firedCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              style={({ pressed }) => [
                styles.clearFired,
                rtl ? styles.clearFiredRtl : null,
                busy && { opacity: 0.4 },
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() =>
                confirmDestructive({
                  title: t.alertsDeleteConfirmTitle,
                  body: t.alertsClearFiredConfirm.replace('{n}', String(firedCount)),
                  cancelText: t.cancel,
                  confirmText: t.deleteWord,
                  onConfirm: () => void clearFired(),
                })
              }
              accessibilityLabel={t.alertsClearFiredBtn.replace('{n}', String(firedCount))}
              hitSlop={8}
            >
              <Text style={styles.clearFiredText}>
                {t.alertsClearFiredBtn.replace('{n}', String(firedCount))}
              </Text>
            </Pressable>
          ) : null}
          {alerts.length === 0 ? (
            <Text style={[styles.empty, { textAlign: align }]}>
              {listError ? t.alertsLoadError : t.alertsEmpty}
            </Text>
          ) : (
            orderedAlerts.map((a) => (
              <View
                key={a.id}
                style={[styles.item, rtl && styles.itemRtl, editingId === a.id && styles.itemEditing]}
              >
                <Pressable
                  style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: buttons.pressedOpacity }]}
                  onPress={() => startEdit(a)}
                  accessibilityRole="button"
                  // الوسم يحلّ محلّ نصّ الأبناء عند قارئ الشاشة: الحالة (مُطلق/مُفعّل) والملاحظة كانتا تُقرآن
                  // باللون وحده، والصفّ قيد التعديل بإطار ملوّن وحده ⇒ الحالة + `selected`
                  accessibilityState={{ selected: editingId === a.id }}
                  accessibilityLabel={`${t.alertsEditA11yPrefix}: ${a.symbol} ${condMark(a.condition)} ${fmtPrice(
                    a.price,
                    a.symbol
                  )} — ${a.triggered ? t.alertsStatusTriggered : t.alertsStatusArmed}${
                    distText(a) ? ` — ${distText(a)}` : ''
                  }${a.note ? ` — ${a.note}` : ''}`}
                >
                  <Text style={[styles.itemSym, a.triggered && styles.itemSymDone, { textAlign: align }]}>
                    {a.symbol} {condMark(a.condition)} {fmtPrice(a.price, a.symbol)}
                  </Text>
                  <Text
                    style={[styles.itemStatus, a.triggered ? styles.itemStatusDone : styles.itemStatusLive, { textAlign: align }]}
                  >
                    {a.triggered ? t.alertsStatusTriggered : t.alertsStatusArmed}
                    {distText(a) ? ` · ${distText(a)}` : ''}
                    {a.note ? ` · ${a.note}` : ''}
                  </Text>
                </Pressable>
                {a.triggered ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: busy }}
                    disabled={busy}
                    style={({ pressed }) => [
                      busy && { opacity: 0.4 },
                      pressed && {
                        opacity: buttons.pressedOpacity,
                        transform: [{ scale: buttons.pressedScale }],
                      },
                    ]}
                    onPress={() => void rearm(a)}
                    accessibilityLabel={`${t.alertsRearmA11yPrefix}: ${a.symbol} ${condMark(
                      a.condition
                    )} ${fmtPrice(a.price, a.symbol)}`}
                    hitSlop={8}
                  >
                    <Text style={styles.rearm}>{t.alertsRearmBtn}</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() =>
                    confirmDestructive({
                      title: t.alertsDeleteConfirmTitle,
                      body: `${a.symbol} ${condMark(a.condition)} ${fmtPrice(a.price, a.symbol)}`,
                      cancelText: t.cancel,
                      confirmText: t.deleteWord,
                      onConfirm: () => void remove(a.id),
                    })
                  }
                  accessibilityLabel={`${t.alertsDeleteA11yPrefix}: ${a.symbol} ${condMark(a.condition)} ${fmtPrice(
                    a.price,
                    a.symbol
                  )}`}
                  hitSlop={8}
                >
                  <Text style={styles.del}>{t.deleteWord}</Text>
                </Pressable>
              </View>
            ))
          )}
    </>
  );

  return (
    <View style={[styles.wrap, embedded && styles.wrapInFrame]}>
      {embedded ? (
        <View style={frameEmbedHead}>
          <View style={frameEmbedHeadTail} />
          <View style={frameEmbedTitleBlock}>
            <Text style={[styles.title, frameEmbedTitle, { textAlign: align }]}>{t.alertsTitle}</Text>
            <Text style={[styles.sub, frameEmbedSub, { textAlign: align }]}>{t.alertsSub}</Text>
          </View>
        </View>
      ) : (
        <>
          <Text style={[styles.title, { textAlign: align }]}>{t.alertsTitle}</Text>
          <Text style={[styles.sub, { textAlign: align }]}>{t.alertsSub}</Text>
        </>
      )}
      {flash ? (
        <View style={[styles.flashRow, rtl && styles.rowRtl]}>
          <Text style={[styles.flash, styles.flashText, { textAlign: align }]}>🔔 {flash}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setFlash(null)}
            accessibilityLabel={t.closeWord}
            hitSlop={8}
            style={({ pressed }) => [pressed && { opacity: buttons.pressedOpacity }]}
          >
            <Text style={styles.flashClose}>✕</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.form}>
        <TextInput
          style={[styles.input, { textAlign: align }]}
          value={symbol}
          onChangeText={setSymbol}
          placeholder="EURUSD"
          placeholderTextColor={colors.textDim}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          underlineColorAndroid="transparent"
          clearButtonMode="while-editing"
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          accessibilityLabel={t.alertsSymbolA11y}
        />
        <TextInput
          style={[styles.input, { textAlign: align }]}
          value={price}
          onChangeText={onPriceChange}
          placeholder={t.priceWord}
          placeholderTextColor={colors.textDim}
          keyboardType="decimal-pad"
          maxLength={12}
          returnKeyType="done"
          underlineColorAndroid="transparent"
          clearButtonMode="while-editing"
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          accessibilityLabel={t.alertsPriceA11y}
        />
        {currentPx != null ? (
          <View style={[styles.currentRow, rtl && styles.rowRtl]}>
            <Text style={[styles.currentText, { textAlign: align }]}>
              {t.alertsCurrentPrefix}: <Text style={styles.currentVal}>{fmtPrice(currentPx)}</Text>
            </Text>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.useCurrent,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => onPriceChange(fmtPrice(currentPx))}
              accessibilityLabel={`${t.alertsUseCurrentA11y}: ${fmtPrice(currentPx)}`}
              hitSlop={6}
            >
              <Text style={styles.useCurrentText}>{t.alertsUseCurrent}</Text>
            </Pressable>
          </View>
        ) : null}
        {/* مسافات جاهزة بالنقاط حول السعر الحالي — «عشرون نقطة فوق السوق» بنقرة بدل كتابة خمس منازل
            على لوحة مفاتيح هاتف. تظهر فقط بسعر حقيقي معروف وأداة معلومة حجم الـpip. */}
        {currentPx != null && spec ? (
          <View style={[styles.offsets, rtl && styles.rowRtl]}>
            <Text style={styles.offsetUnit}>{pipUnit(lang)}</Text>
            {PIP_OFFSETS.map((off) => {
              // الحساب بـ`positionSize.ts` حيث تعيش كل رياضيات الـpip ومغطّى بحالات selftest دائمة —
              // null لمسافة تتجاوز السعر نفسه (أداة سعرها أصغر من المسافة) فلا تُعرض الشريحة
              const px = priceAtPipOffset(spec, currentPx, off);
              if (px == null) return null;
              const text = fmtPrice(px, spec.symbol);
              return (
                <Pressable
                  key={off}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.offsetChip,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() => onPriceChange(text)}
                  accessibilityLabel={`${t.alertsPriceA11y}: ${text}`}
                  hitSlop={6}
                >
                  <Text style={styles.offsetChipText}>{off > 0 ? `+${off}` : `−${-off}`}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <View style={[styles.row, rtl && styles.rowRtl]}>
          <Pressable
            accessibilityState={{ selected: condition === 'above' }}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cond,
              condition === 'above' && styles.condOn,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => {
              condManualRef.current = true;
              setCondition('above');
            }}
            accessibilityLabel={t.alertsAboveConditionA11y}
          >
            <Text style={[styles.condText, condition === 'above' && styles.condTextOn]}>{t.aboveWord}</Text>
          </Pressable>
          <Pressable
            accessibilityState={{ selected: condition === 'below' }}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cond,
              condition === 'below' && styles.condOn,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => {
              condManualRef.current = true;
              setCondition('below');
            }}
            accessibilityLabel={t.alertsBelowConditionA11y}
          >
            <Text style={[styles.condText, condition === 'below' && styles.condTextOn]}>{t.belowWord}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.addBtn,
              busy && styles.addBtnDisabled,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={add}
            disabled={busy}
            accessibilityState={{ disabled: busy, busy }}
            accessibilityLabel={editingId ? t.alertsSaveEdit : t.alertsAddA11y}
          >
            <Text style={styles.addText}>{busy ? '...' : editingId ? t.alertsSaveEdit : t.addBtn}</Text>
          </Pressable>
        </View>
        <TextInput
          style={[styles.input, { textAlign: align }]}
          value={note}
          onChangeText={setNote}
          maxLength={500}
          placeholder={t.alertsNotePlaceholder}
          placeholderTextColor={colors.textDim}
          returnKeyType="done"
          underlineColorAndroid="transparent"
          clearButtonMode="while-editing"
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          accessibilityLabel={t.alertsNoteA11y}
        />
      </View>

      {editingId ? (
        <View style={[styles.currentRow, rtl && styles.rowRtl]}>
          <Text style={[styles.editingText, { textAlign: align }]}>{t.alertsEditingHint}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={cancelEdit}
            accessibilityLabel={t.alertsCancelEdit}
            hitSlop={6}
            style={({ pressed }) => [
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
          >
            <Text style={styles.cancelEditText}>{t.alertsCancelEdit}</Text>
          </Pressable>
        </View>
      ) : null}
      {unknownSymbol ? (
        <Text style={[styles.firesNow, { textAlign: align }]} accessibilityLiveRegion="polite">
          {t.alertsUnknownSymbolWarn}
        </Text>
      ) : null}
      {firesNow ? <Text style={[styles.firesNow, { textAlign: align }]}>{t.alertsFiresNowWarn}</Text> : null}
      {formError ? <Text style={[styles.formError, { textAlign: align }]}>{formError}</Text> : null}
      {armed ? (
        <Text style={[styles.armed, { textAlign: align }]} accessibilityLiveRegion="polite">
          ✓ {armed}
        </Text>
      ) : null}
      {/* لا يظهر شيء حين يكون الإذن ممنوحاً — السطر لا يُقال إلا حين يغيّر ما سيحدث فعلاً. */}
      {notifState != null && notifState !== 'granted' ? (
        <View style={[styles.currentRow, rtl && styles.rowRtl]}>
          <Text style={[styles.notifWarn, { textAlign: align }]}>
            {t.notifications}:{' '}
            {notifState === 'denied'
              ? t.notifStatusDenied
              : notifState === 'unsupported'
                ? t.notifStatusUnsupported
                : t.notifStatusUndetermined}
          </Text>
          {notifState !== 'unsupported' ? (
            <Pressable
              accessibilityRole="button"
              disabled={notifBusy}
              accessibilityState={{ disabled: notifBusy, busy: notifBusy }}
              style={({ pressed }) => [
                styles.useCurrent,
                notifBusy && { opacity: 0.5 },
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => void enableNotifications()}
              accessibilityLabel={notifState === 'denied' ? t.notifOpenSettingsBtn : t.notifEnableBtn}
              hitSlop={6}
            >
              <Text style={styles.useCurrentText}>
                {notifBusy ? '...' : notifState === 'denied' ? t.notifOpenSettingsBtn : t.notifEnableBtn}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {showFirstBadge ? (
        <View style={styles.firstAlertBadge}>
          <Text style={styles.firstAlertBadgeText}>{t.alertsFirstBadge}</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.md }} />
      ) : flow ? (
        <View>{rows}</View>
      ) : (
        <ScrollView style={embedded ? styles.listFill : styles.listCapped} keyboardShouldPersistTaps="handled">
          {rows}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * القائمة كانت محبوسة على `maxHeight: 160` بكل مواضع الاستعمال — ومنها خليةُ شبكة شاشة الأدوات،
   * وهي **محدَّدة الارتفاع** (`FrameSizedGrid` يعطي كل خلية ارتفاعاً ثابتاً: 420 سطح مكتب / 340 هاتف /
   * 260 بوضع شبكة الهاتف) واللوحة تملؤها (`wrap` بـ`flex: 1`). فمن له ثمانية تنبيهات كان يتصفّحها
   * بنافذة أربعة صفوف بينما بقية الخلية فارغة تحتها — و«قائمة واضحة بالتنبيهات النشطة» أول ما يُطلب
   * من لوح تنبيهات. الآن تأخذ ما تبقّى من الخلية.
   *
   * الثلاثة معاً مقصودة، وكلٌّ منها يمنع عطباً ثبت بمحاكاة Yoga (محرّك تخطيط RN نفسه):
   * - `flexBasis: 0` + `flexGrow: 1`: القائمة **نافذة** بحجم ما تبقّى من الخلية، لا صندوقٌ يكبر بمحتواه.
   *   بـ`flexShrink: 0` وأساسٍ تلقائي كانت تكبر إلى ارتفاع كل التنبيهات فتتجاوز الخلية، والزائد يُقصّ
   *   بـ`overflow: hidden` **بلا تمرير يصله** (الـScrollView يظن أن المساحة تكفيه): صفوف تختفي نهائياً.
   * - `minHeight`: بالخلية القصيرة (260) قد يشغل ما فوق القائمة الخليةَ كلها فتصير المساحة المتبقية
   *   صفراً — والنافذة المرنة وحدها كانت ستُخفي القائمة تماماً. بالحدّ الأدنى تبقى 160 كما هي اليوم.
   * فالنتيجة: لا أصغر من الحالي بأي مقاس، ولا أكبر من المساحة المتاحة، وقابلة للتمرير دائماً.
   */
  listFill: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: LIST_WINDOW_H },
  listCapped: { maxHeight: LIST_WINDOW_H },
  /** تحذيرٌ لا خطأ: بلون التحذير المؤسَّس (كـ`firesNow`) لا بالأحمر — التنبيه مُسلَّح فعلاً بالخادم،
   * والناقص هو طريق وصول الخبر للجهاز. */
  notifWarn: { color: colors.warn, fontSize: 11, fontWeight: '500', flex: 1 },
  wrap: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    overflow: 'hidden',
  },
  wrapInFrame: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingTop: frameEmbed.padTop,
    paddingLeft: frameEmbed.padLeft,
    paddingRight: frameEmbed.padRight,
    paddingBottom: frameEmbed.padBottom,
  },
  title: { color: colors.text, fontWeight: '500', fontSize: 14 },
  sub: { color: colors.textDim, fontSize: 11, marginTop: 4 },
  flash: {
    color: colors.warn,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  flashRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flashText: { flex: 1 },
  flashClose: { color: colors.textDim, fontSize: 13, fontWeight: '500', marginTop: 4 },
  formError: {
    color: colors.bear,
    fontSize: 11,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  firstAlertBadge: {
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(232,184,109,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,184,109,0.4)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: spacing.xs,
  },
  firstAlertBadgeText: { color: colors.warmAccent, fontSize: 11, fontWeight: '500' },
  form: { marginTop: spacing.sm, gap: 4 },
  input: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: spacing.sm,
    fontSize: 13,
  },
  row: { flexDirection: 'row', gap: 4 },
  rowRtl: { flexDirection: 'row-reverse' },
  cond: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  condOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  condText: { color: colors.textMuted, fontWeight: '500', fontSize: 12 },
  condTextOn: { color: colors.accent },
  addBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  addText: { color: colors.onAccent, fontWeight: '500', fontSize: 12 },
  addBtnDisabled: { opacity: 0.4 },
  empty: { color: colors.textDim, marginTop: spacing.sm, fontSize: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  itemRtl: { flexDirection: 'row-reverse' },
  itemSym: { ...numeric, color: colors.text, fontWeight: '600', fontSize: 13 },
  itemSymDone: { color: colors.textMuted },
  itemStatus: { ...numeric, fontSize: 11, marginTop: 0 },
  // DESIGN-PRO §1: حالة «مفعّل» على كل صفّ كانت بالتأكيد ⇒ n عناصر تأكيد بالقائمة. الحالة نصّ مسمّى، فاللون لا يضيف معلومة.
  itemStatusLive: { color: colors.textMuted, fontWeight: '500' },
  itemStatusDone: { color: colors.textDim },
  itemEditing: { backgroundColor: colors.accentSoft, borderRadius: radii.sm },
  listHead: { ...numeric, color: colors.textDim, fontSize: 11, marginTop: spacing.sm, fontWeight: '500' },
  clearFired: { alignSelf: 'flex-start', marginTop: spacing.xs, paddingVertical: 4 },
  clearFiredRtl: { alignSelf: 'flex-end' },
  clearFiredText: { color: colors.bear, fontSize: 11, fontWeight: '500' },
  currentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  currentText: { color: colors.textDim, fontSize: 11, flex: 1 },
  currentVal: { ...numeric, color: colors.text, fontWeight: '600' },
  useCurrent: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  useCurrentText: { color: colors.accent, fontSize: 11, fontWeight: '500' },
  offsets: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  offsetUnit: { color: colors.textDim, fontSize: 11, fontWeight: '500' },
  offsetChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.bgPanel,
  },
  offsetChipText: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  editingText: { color: colors.accent, fontSize: 11, fontWeight: '500', flex: 1, marginTop: spacing.xs },
  cancelEditText: { color: colors.textMuted, fontSize: 11, fontWeight: '500', marginTop: spacing.xs },
  firesNow: { color: colors.warn, fontSize: 11, fontWeight: '500', marginTop: spacing.xs },
  armed: { color: colors.bull, fontSize: 11, fontWeight: '500', marginTop: spacing.xs },
  rearm: { color: colors.accent, fontWeight: '500', fontSize: 12 },
  del: { color: colors.bear, fontWeight: '500', fontSize: 12 },
});
