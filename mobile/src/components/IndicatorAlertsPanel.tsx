import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { api } from '../api';
import { confirmDestructive, notify } from '../chart/confirmDestructive';
import {
  ensureAlertNotifications,
  getNotificationPermissionState,
  pushPriceAlert,
  registerPushToken,
  type NotificationPermissionState,
} from '../notifications';
import { playSoftClick } from '../audio/playSoftClick';
import { useI18n } from '../i18n/I18nContext';
import { parseDecimal } from '../parseDecimal';
import { isNotOfferedSymbol, isSymbolUnavailableError } from '../providerSymbols';
import type { Dict } from '../i18n/locales';
import { QUICK_SYMBOLS } from '../tradePlan';

/** «EURUSD · RSI · تحت 30» / «GBPUSD · تقاطع المتوسطات · تقاطع صاعد ▲» بلغة الواجهة — القائمة وتأكيد
 * الحذف والإشعار كانت تعرض المعرّفات الخام (rsi · below / ma_cross · cross_up) بكل اللغات. */
function describeIndAlert(
  a: {
    symbol: string;
    timeframe?: string | null;
    alert_type: string;
    condition: string;
    value?: number | null;
  },
  t: Dict
): string {
  const typeLabel: Record<string, string> = {
    rsi: t.indAlertsTypeRsi,
    ma_cross: t.indAlertsTypeMaCross,
    macd_cross: t.indAlertsTypeMacdCross,
  };
  const val = a.value != null ? ` ${a.value}` : '';
  const cond =
    a.condition === 'above'
      ? `${t.aboveWord}${val}`
      : a.condition === 'below'
        ? `${t.belowWord}${val}`
        : a.condition === 'cross_up'
          ? t.indAlertsCrossUpChip
          : a.condition === 'cross_down'
            ? t.indAlertsCrossDownChip
            : `${a.condition}${val}`;
  // الفريم جزء من المعنى: «RSI تحت 30» على 15 دقيقة غير نفسه على اليومي — كان مخفياً (15m ثابت).
  const tf = a.timeframe ? ` · ${a.timeframe}` : '';
  return `${a.symbol}${tf} · ${typeLabel[a.alert_type] ?? a.alert_type} · ${cond}`;
}

/** نفس قائمة الحاسبة والدفتر والباك-تست — اختيار الزوج بنقرة بيد واحدة، والخانة تبقى للرموز الأخرى. */
/** فريمات التنبيه الشائعة للمتداول الفردي (معرّفات الخادم TF_SECONDS). كان 15m ثابتاً وغير ظاهر. */
const ALERT_TFS = ['15m', '1H', '4H', 'D'] as const;
type AlertTf = (typeof ALERT_TFS)[number];
type IndType = 'rsi' | 'ma_cross' | 'macd_cross';
type IndCond = 'above' | 'below' | 'cross_up' | 'cross_down';

type IndAlert = {
  id: string;
  symbol: string;
  timeframe: string;
  alert_type: string;
  condition: string;
  value?: number;
  note: string;
  triggered: boolean;
};

type Props = {
  defaultSymbol?: string;
  /** فريم الشارت المفتوح (إن كان من فريمات التنبيه) — التنبيه من الشارت يبدأ بنفس فريمه. */
  defaultTimeframe?: string;
  /**
   * اللوحة تملك الصفحة وحدها (تبويب «تنبيهات+» بشاشة الأدوات): التنبيهات تُسرَد متدفّقة بلا نافذة
   * تمرير داخلية، فالصفحة هي التي تُمرَّر. بغيره تبقى النافذة المحدودة كما هي بمواضع المشاركة.
   */
  flow?: boolean;
  /**
   * **هل اللوحة معروضة الآن؟** الافتراضي `true` فكل موضع لا يمرّرها — الشريط الجانبي والرصيف
   * وشارت التركيز — يبقى كما كان حرفياً.
   *
   * `checkIndicatorAlerts` **أثقل استطلاع بالتطبيق**: الخادم يجلب سلسلة شموع لكل (رمز، فريم)
   * بكل تنبيه مُسلَّح ثم يحسب المؤشّر عليها. وشاشات التبويبات السفلية تبقى مركَّبة بعد الانتقال
   * عنها، فمن فتح تبويب «تنبيهات+» ثم عاد للشارت كان يترك هذا يعمل **كل دقيقة بقيّة الجلسة**
   * على لوحة لا يراها أحد.
   *
   * ولا يُفقَد تنبيه واحد: `alert_worker.run_alert_loop(60.0)` بالخادم يفحص تنبيهات المؤشرات
   * لكل المستخدمين كل دقيقة ويرسل الإشعار بنفسه (`backend/alert_worker.py` — `list_indicator_alerts
   * (all_users=True)`). فحص اللوحة تعجيلٌ لمن يجلس أمامها، لا مصدر الإطلاق.
   */
  active?: boolean;
};

function asAlertTf(v: string | undefined): AlertTf | null {
  return v && (ALERT_TFS as readonly string[]).includes(v) ? (v as AlertTf) : null;
}

export function IndicatorAlertsPanel({
  defaultSymbol = 'EURUSD',
  defaultTimeframe,
  flow = false,
  active = true,
}: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [alerts, setAlerts] = useState<IndAlert[]>([]);
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [type, setType] = useState<IndType>('rsi');
  const [condition, setCondition] = useState<IndCond>('below');
  const [value, setValue] = useState('30');
  const [tf, setTf] = useState<AlertTf>(asAlertTf(defaultTimeframe) ?? '1H');
  /** تأكيد «مفعَّل» بعد الإضافة الناجحة — كانت الإضافة تنجح بصمت (نقرة صوتية فقط). */
  const [armed, setArmed] = useState<string | null>(null);
  /** DESIGN-PRO §5.2: «حذف» مخفيّ وقت السكون — يظهر بالمرور (ويب) أو بالضغط الطويل على الصفّ (لمس)؛
   *  ولقارئ الشاشة إجراء «حذف» على الصفّ نفسه بلا حاجة لإظهاره (كقائمة المتابعة و`LayoutPanel`). */
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [revealId, setRevealId] = useState<string | null>(null);
  /**
   * **وعدٌ بإشعارٍ لن يصل — باللوحة الأخرى عولج، وهذه أخته.** هذه اللوحة تنادي `pushPriceAlert`
   * عند كل تقاطع/بلوغ (`check`) ولم تكن **تطلب الإذن أصلاً ولا تقرأ حالته**: فمن دخل التطبيق
   * وذهب لتنبيهات المؤشرات مباشرةً لا يُسأل الإذن قطّ، ومن رفضه مرّةً يبقى يُسلّح تقاطعاتٍ
   * ويغلق التطبيق واثقاً أنه سيُنادى. والفارق هو كلّ شيء: بلا إذن لا يصل إشعار إطلاقاً ويبقى
   * التنبيه محصوراً بفحص اللوحة **وهي مفتوحة** (`setInterval` داخلها)، أي أن أكثر ما يُنتظر من
   * تنبيه مؤشّر — أن يُنادى المتداول وهو خارج التطبيق — لا يقع.
   *
   * `null` = تعذّرت قراءة الحالة ⇒ لا سطر (لا ادّعاء عن حالة نجهلها)، و`granted` ⇒ لا سطر أيضاً:
   * لا يُقال إلا حين يغيّر ما سيحدث فعلاً. نفس نصوص شاشة الحساب ولوح تنبيهات السعر حرفياً.
   */
  const [notifState, setNotifState] = useState<NotificationPermissionState | null>(null);
  const [notifBusy, setNotifBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  /** هل وقع أول تحميل للقائمة؟ — يضمن أن لوحةً رُكِّبت مخفيّة لا تبقى على «جارٍ التحميل» (انظر أثر الفحص). */
  const loadedOnceRef = useRef(false);
  const [busy, setBusy] = useState(false);
  /** وضوح الحالة: يميّز فشل تحميل القائمة عن عدم وجود تنبيهات فعلاً */
  const [listError, setListError] = useState(false);
  /** وضوح الحالة: يعلم المستخدم إذا فشلت إضافة تنبيه مؤشر بدل صمت كامل */
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setSymbol(defaultSymbol);
  }, [defaultSymbol]);

  useEffect(() => {
    const d = asAlertTf(defaultTimeframe);
    if (d) setTf(d);
  }, [defaultTimeframe]);

  // حارس "alive" مبني على ref يمنع تحديث الحالة بعد إلغاء تركيب اللوحة — يشمل نتيجة الاستطلاع
  // الدوري (setInterval) التي قد تصل بعد إلغاء التركيب رغم إيقاف المؤقت نفسه — نفس مبدأ
  // ChartFrame/SymbolSnapshot المؤسَّس بالكود.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await api.indicatorAlerts();
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
      const res = await api.checkIndicatorAlerts();
      if (mountedRef.current) setAlerts(res.alerts);
      for (const trig of res.triggered) {
        await pushPriceAlert(t.indAlertsPushTitle, describeIndAlert(trig, t));
      }
    } catch {
      /* ignore */
    }
  }, [t]);

  useEffect(() => {
    /**
     * فحص فوري عند فتح اللوحة، لا بعد دقيقة — نفس ما عولج بـ`AlertsPanel`: `setInterval` وحده كان
     * يعني أن أول فحص داخل التطبيق يقع بعد 60 ثانية من الفتح، ومن يفتح اللوحة ويغلقها خلال الدقيقة
     * لا يقع له فحص إطلاقاً. وفتح هذه اللوحة سؤال واحد: هل تقاطع المتوسط/بلغ الـRSI حدّي؟
     * الفحص **بعد** `refresh` لا بالتوازي: كلاهما يكتب `setAlerts`، ولو سبق ردّ الفحص ردَّ القائمة
     * لَدهَس الأقدمُ الأحدثَ فتبقى اللوحة على حالة ما قبل الفحص دقيقة كاملة.
     * لا إشعار مكرَّر ولو أُعيد الفحص (تبديل اللغة يعيد بناء `check`): `db.mark_indicator_alert_triggered`
     * ذرّي فلا يُرجَع التنبيه إلا لمن قلبه أولاً، والسلسلة البذرية (demo) لا تُطلق شيئاً أصلاً.
     */
    /**
     * `active` يوقف **الدورة** لا التحميل الأول: لوحةٌ رُكِّبت وهي مخفيّة تبقى على «جارٍ التحميل»
     * إلى الأبد لو مُنع عنها أول `refresh`. وبالعودة يقع الفحص **فوراً** لا بانتظار دورة، فأول ما
     * يراه المتداول أحدث ممّا كان يراه سابقاً لا أقدم.
     */
    if (active || !loadedOnceRef.current) {
      loadedOnceRef.current = true;
      void refresh().then(check);
    }
    if (!active) return;
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [active, refresh, check]);

  /**
   * طلب إذن الإشعارات وقراءة حالته — **أثرٌ مستقلّ بلا تبعيات، مرّةً عند التركيب**. كان مطويّاً
   * داخل أثر الاستطلاع (`[refresh, check]`) وهو يُعاد بناؤه مع كل تغيّر لغة (`check` تابعة لـ`t`):
   * أي أن تبديل اللغة كان يعيد طلب الإذن ويعيد تسجيل رمز الدفع بلا داعٍ. الطلب لا علاقة له بإيقاع
   * الفحص ولا بلغة الواجهة، فموضعه أثرٌ وحده.
   */
  useEffect(() => {
    // القراءة بعد المحاولة **بكل المسارات** (نجحت أم رُفضت أم رمت) — هي ما يُعرض للمتداول
    void ensureAlertNotifications()
      .then(() => registerPushToken())
      .catch(() => {
        /* الإشعارات تحسين اختياري — فشل الإذن لا يمنع فحص اللوحة داخل التطبيق */
      })
      .then(() => getNotificationPermissionState())
      .then((st) => {
        if (mountedRef.current) setNotifState(st);
      })
      .catch(() => {
        /* تعذّرت قراءة الحالة: تبقى null فلا سطر */
      });
  }, []);

  /** نفس مسار شاشة الحساب ولوح تنبيهات السعر: الرفض ⇒ إعدادات النظام (لا سبيل لإعادة السؤال
   * بiOS — يُسأل مرّة بالعمر)، وما عداه ⇒ طلب الإذن. والحالة تُعاد قراءتها بعد كل ضغطة. */
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

  /** تغيير النوع يضبط شرطاً صالحاً له: كان الشرط «تحت» يبقى عند التحويل لتقاطع MA/MACD فلا زر مختار،
   * ويُرسَل ma_cross + below للخادم → تنبيه لا يُطلق أبداً (لا فرع له بـ_check_indicator_alert). */
  const pickType = (ty: IndType) => {
    setType(ty);
    setArmed(null);
    setFormError(null);
    if (ty === 'rsi') {
      if (condition !== 'above' && condition !== 'below') {
        setCondition('below');
        setValue('30');
      }
    } else if (condition !== 'cross_up' && condition !== 'cross_down') {
      setCondition('cross_up');
    }
  };

  /** «RSI فوق» بعتبة 30 المتروكة من «تحت» = تنبيه يُطلق فوراً تقريباً؛ نقلب العتبة الافتراضية 30↔70 فقط
   * إن لم يغيّرها المتداول بنفسه. */
  const pickRsiSide = (c: 'above' | 'below') => {
    setCondition(c);
    setArmed(null);
    const cur = value.trim();
    if (c === 'above' && (cur === '30' || cur === '')) setValue('70');
    if (c === 'below' && (cur === '70' || cur === '')) setValue('30');
  };

  /** التنبيه لمرة واحدة: بعد «أُطلق» كان الحلّ الوحيد حذفه وإعادة كتابته بكل حقوله. */
  const rearm = async (a: IndAlert) => {
    setBusy(true);
    setFormError(null);
    setArmed(null);
    try {
      await api.rearmIndicatorAlert(a.id);
      if (!mountedRef.current) return;
      playSoftClick();
      setArmed(t.indAlertsRearmedMsg.replace('{desc}', describeIndAlert(a, t)));
      await refresh();
    } catch {
      if (mountedRef.current) setFormError(t.indAlertsRearmFailed);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const add = async () => {
    setFormError(null);
    setArmed(null);
    const sym = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9./]{3,12}$/.test(sym)) {
      setFormError(t.indAlertsSymbolInvalid);
      return;
    }
    // backend-r50c: الخادم يرفض (422) التنبيه على رمز لا يقدّمه المزوّد — كان يُحفظ «يراقب» ولا يُطلق أبداً.
    if (isNotOfferedSymbol(sym)) {
      setFormError(t.chartNotOfferedTitle.replace('{symbol}', sym));
      return;
    }
    let rsiValue: number | undefined;
    if (type === 'rsi') {
      // كان رقم غير مفهوم يُرسَل NaN → JSON null → تنبيه RSI بلا عتبة لا يُطلق أبداً، بصمت.
      const v = parseDecimal(value);
      if (v == null || !Number.isFinite(v) || v < 1 || v > 99) {
        setFormError(t.indAlertsRsiRange);
        return;
      }
      rsiValue = v;
    }
    const cond: IndCond =
      type === 'rsi'
        ? condition === 'above'
          ? 'above'
          : 'below'
        : condition === 'cross_down'
          ? 'cross_down'
          : 'cross_up';
    setBusy(true);
    try {
      await api.createIndicatorAlert({
        symbol: sym,
        timeframe: tf,
        alert_type: type,
        condition: cond,
        value: rsiValue,
      });
      playSoftClick();
      if (mountedRef.current) {
        setArmed(
          `${t.indAlertsArmed} ${describeIndAlert(
            { symbol: sym, timeframe: tf, alert_type: type, condition: cond, value: rsiValue },
            t
          )}`
        );
      }
      await refresh();
    } catch (e) {
      if (mountedRef.current) setFormError(isSymbolUnavailableError(e, sym) ? t.chartNotOfferedTitle.replace('{symbol}', sym) : t.indAlertsAddError);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const TYPE_LABEL: Record<IndType, string> = {
    rsi: t.indAlertsTypeRsi,
    ma_cross: t.indAlertsTypeMaCross,
    macd_cross: t.indAlertsTypeMacdCross,
  };

  /** زر اختيار واحد بنفس نمط أزرار الحاسبة/الباك-تست (حالة «مختار» ظاهرة ومقروءة لقارئ الشاشة). */
  const chip = (key: string, label: string, on: boolean, onPress: () => void, a11y: string) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [
        styles.chip,
        on && styles.chipOn,
        pressed && {
          opacity: buttons.pressedOpacity,
          transform: [{ scale: buttons.pressedScale }],
        },
      ]}
      onPress={onPress}
      accessibilityLabel={a11y}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );

  /**
   * صفوف قائمة التنبيهات — تُركَّب مرّة واحدة وتُعرض بصندوقين مختلفين بحسب من يستضيف اللوحة
   * (انظر `flow` بالخصائص أعلاه). الكتلة منقولة كما هي حرفياً من داخل `ScrollView` السابق.
   */
  const askDelete = (a: IndAlert) =>
    confirmDestructive({
      title: t.indAlertsDeleteConfirmTitle,
      body: describeIndAlert(a, t),
      cancelText: t.cancel,
      confirmText: t.deleteWord,
      onConfirm: () => {
        setRevealId(null);
        void api
          .deleteIndicatorAlert(a.id)
          .then(refresh)
          .catch(() => notify(t.indAlertsDeleteFailedTitle, t.indAlertsDeleteFailedBody));
      },
    });

  const rows = (
    <>
          {alerts.length === 0 ? (
            <Text style={[styles.empty, { textAlign: align }]}>
              {listError ? t.indAlertsLoadError : t.indAlertsEmpty}
            </Text>
          ) : (
            alerts.map((a) => (
              <Pressable
                key={a.id}
                accessible={false}
                onHoverIn={() => setHoverId(a.id)}
                onHoverOut={() => setHoverId((h) => (h === a.id ? null : h))}
                style={[styles.item, rtl && styles.itemRtl]}
              >
                <Pressable
                  style={styles.itemTextHit}
                  onLongPress={() => setRevealId((r) => (r === a.id ? null : a.id))}
                  accessibilityActions={[{ name: 'delete', label: t.deleteWord }]}
                  onAccessibilityAction={(e) => {
                    if (e.nativeEvent.actionName === 'delete') askDelete(a);
                  }}
                  accessibilityLabel={`${describeIndAlert(a, t)} · ${a.triggered ? t.indAlertsFiredTag : t.indAlertsWatchingTag}`}
                >
                  <Text style={[styles.itemText, { textAlign: align }]}>
                    {describeIndAlert(a, t)}
                    {/* كان «✓» غامضاً (مفعَّل؟ تحقّق؟) — الآن حالة مسمّاة: يراقب / أُطلق (لا يُعاد إطلاقه) */}
                    <Text style={a.triggered ? styles.tagFired : styles.tagWatching}>
                      {` · ${a.triggered ? t.indAlertsFiredTag : t.indAlertsWatchingTag}`}
                    </Text>
                  </Text>
                </Pressable>
                <View style={[styles.itemActions, rtl && styles.itemRtl]}>
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
                      accessibilityLabel={`${t.indAlertsRearmA11yPrefix}: ${describeIndAlert(a, t)}`}
                      hitSlop={8}
                    >
                      <Text style={styles.rearm}>{t.indAlertsRearmBtn}</Text>
                    </Pressable>
                  ) : null}
                  {hoverId === a.id || revealId === a.id ? (
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        pressed && {
                          opacity: buttons.pressedOpacity,
                          transform: [{ scale: buttons.pressedScale }],
                        },
                      ]}
                      onPress={() => askDelete(a)}
                      accessibilityLabel={`${t.indAlertsDeleteA11yPrefix}: ${describeIndAlert(a, t)}`}
                      hitSlop={8}
                    >
                      <Text style={styles.del}>{t.deleteWord}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Pressable>
            ))
          )}
    </>
  );

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { textAlign: align }]}>{t.indAlertsTitle}</Text>
      <Text style={[styles.sub, { textAlign: align }]}>{t.indAlertsSub}</Text>
      <View style={[styles.row, rtl && styles.rowRtl]}>
        {QUICK_SYMBOLS.map((q) =>
          chip(
            q,
            q,
            symbol.trim().toUpperCase() === q,
            () => {
              setSymbol(q);
              setArmed(null);
            },
            `${t.indAlertsSymbolA11y}: ${q}`
          )
        )}
      </View>
      <TextInput style={[styles.input, { textAlign: align }]} value={symbol} onChangeText={(v) => { setSymbol(v); setArmed(null); }} placeholder="EURUSD" placeholderTextColor={colors.textDim} autoCapitalize="characters" autoCorrect={false} returnKeyType="done" underlineColorAndroid="transparent" clearButtonMode="while-editing" keyboardAppearance="dark" selectionColor={colors.accent} accessibilityLabel={t.indAlertsSymbolA11y} />
      <View style={[styles.row, styles.rowCenter, rtl && styles.rowRtl]}>
        <Text style={styles.rowLabel}>{t.indAlertsTfLabel}</Text>
        {ALERT_TFS.map((x) =>
          chip(
            x,
            x,
            tf === x,
            () => {
              setTf(x);
              setArmed(null);
            },
            `${t.indAlertsTfLabel} ${x}`
          )
        )}
      </View>
      <View style={[styles.row, rtl && styles.rowRtl]}>
        {(['rsi', 'ma_cross', 'macd_cross'] as const).map((ty) =>
          chip(
            ty,
            TYPE_LABEL[ty],
            type === ty,
            () => pickType(ty),
            `${t.indAlertsTypeA11yPrefix}: ${TYPE_LABEL[ty]}`
          )
        )}
      </View>
      <Text style={[styles.hint, { textAlign: align }]}>
        {type === 'rsi' ? t.indAlertsHintRsi : type === 'ma_cross' ? t.indAlertsHintMa : t.indAlertsHintMacd}
      </Text>
      {type === 'rsi' ? (
        <>
          <View style={[styles.row, rtl && styles.rowRtl]}>
            {chip('below', t.indAlertsBelowChip, condition === 'below', () => pickRsiSide('below'), t.indAlertsBelowA11y)}
            {chip('above', t.indAlertsAboveChip, condition === 'above', () => pickRsiSide('above'), t.indAlertsAboveA11y)}
          </View>
          <TextInput style={[styles.input, { textAlign: align }]} value={value} onChangeText={(v) => { setValue(v); setArmed(null); }} keyboardType="decimal-pad" maxLength={12} placeholder={condition === 'above' ? '70' : '30'} placeholderTextColor={colors.textDim} returnKeyType="done" underlineColorAndroid="transparent" clearButtonMode="while-editing" keyboardAppearance="dark" selectionColor={colors.accent} accessibilityLabel={t.indAlertsThresholdA11y} />
        </>
      ) : (
        <View style={[styles.row, rtl && styles.rowRtl]}>
          {chip('cross_up', t.indAlertsCrossUpChip, condition === 'cross_up', () => { setCondition('cross_up'); setArmed(null); }, t.indAlertsCrossUpA11y)}
          {chip('cross_down', t.indAlertsCrossDownChip, condition === 'cross_down', () => { setCondition('cross_down'); setArmed(null); }, t.indAlertsCrossDownA11y)}
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.btn,
          busy && styles.btnDisabled,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={add}
        disabled={busy}
        accessibilityState={{ disabled: busy, busy }}
        accessibilityLabel={busy ? t.a11yBusy : t.indAlertsAddA11y}
        hitSlop={8}
      >
        <Text style={styles.btnText}>{busy ? '...' : t.indAlertsAddBtn}</Text>
      </Pressable>
      {formError ? <Text style={[styles.formError, { textAlign: align }]}>{formError}</Text> : null}
      {armed ? (
        <Text style={[styles.armed, { textAlign: align }]} accessibilityLiveRegion="polite">
          {armed}
        </Text>
      ) : null}
      {/* لا يظهر شيء حين يكون الإذن ممنوحاً — السطر لا يُقال إلا حين يغيّر ما سيحدث فعلاً. */}
      {notifState != null && notifState !== 'granted' ? (
        <View style={[styles.notifRow, rtl && styles.rowRtl]}>
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
                styles.notifBtn,
                notifBusy && { opacity: 0.5 },
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => void enableNotifications()}
              accessibilityLabel={
                notifBusy ? t.a11yBusy : notifState === 'denied' ? t.notifOpenSettingsBtn : t.notifEnableBtn
              }
              hitSlop={6}
            >
              <Text style={styles.notifBtnText}>
                {notifBusy ? '...' : notifState === 'denied' ? t.notifOpenSettingsBtn : t.notifEnableBtn}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : flow ? (
        <View>{rows}</View>
      ) : (
        <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
          {rows}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: { color: colors.text, fontWeight: '500', textAlign: 'right' },
  sub: { color: colors.textDim, fontSize: 11, textAlign: 'right' },
  formError: { color: colors.bear, fontSize: 11, fontWeight: '500', textAlign: 'right' },
  input: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 12,
    textAlign: 'right',
  },
  row: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  rowRtl: { flexDirection: 'row-reverse' },
  rowCenter: { alignItems: 'center' },
  rowLabel: { color: colors.textDim, fontSize: 11, fontWeight: '500' },
  hint: { color: colors.textDim, fontSize: 11, lineHeight: 15 },
  armed: { color: colors.textMuted, fontSize: 11, fontWeight: '500', marginTop: spacing.xs },
  notifRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  notifWarn: { color: colors.warn, fontSize: 11, fontWeight: '500', flex: 1 },
  notifBtn: {
    borderWidth: 1,
    // DESIGN-PRO §1: زرّ غير نشِط بلا تأكيد بالسكون.
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  notifBtnText: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  // DESIGN-PRO §1: «يراقب» على كل صفّ بالتأكيد كانت شارة ملوّنة مكرّرة — الحالة مسمّاة نصّاً.
  tagWatching: { color: colors.textMuted, fontWeight: '500' },
  tagFired: { color: colors.textDim, fontWeight: '500' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { borderColor: 'transparent', backgroundColor: colors.accentSoft },
  chipText: { color: colors.textMuted, fontWeight: '500', fontSize: 11 },
  chipTextOn: { color: colors.text },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  btnText: { color: colors.onAccent, fontWeight: '500' },
  btnDisabled: { opacity: 0.4 },
  empty: { color: colors.textDim, textAlign: 'right', marginTop: spacing.sm, fontSize: 12 },
  item: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSoft },
  itemRtl: { flexDirection: 'row-reverse' },
  itemTextHit: { flex: 1 },
  itemText: { color: colors.text, flex: 1, textAlign: 'right', fontSize: 12 },
  del: { color: colors.bear, fontWeight: '500' },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rearm: { color: colors.accent, fontWeight: '500' },
});
