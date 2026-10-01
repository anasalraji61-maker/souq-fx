import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { buttons, colors, radii } from '../theme';
import { useI18n } from '../i18n/I18nContext';
import { reportError } from '../crashReporting';

type Props = { children: React.ReactNode };
type InnerProps = Props & { title: string; body: string; repeatBody: string; retry: string; detailLabel: string };
type State = { error: Error | null; repeated: boolean };

/** خطأ يعود خلال هذه المدة بعد «إعادة المحاولة» يُعدّ تكراراً لا خطأً جديداً. */
const REPEAT_WINDOW_MS = 10_000;

/** رسالة الخطأ المعروضة تُقصّ هنا: سطر يُصوَّر لا تتبّع مكدّس. */
const DETAIL_MAX = 160;

/** «TypeError: x is undefined» مقصوصة — بلا مكدّس ولا بيانات المتداول، اسم الخطأ ونصّه فقط. */
function errorDetail(error: Error): string {
  const text = `${error?.name || 'Error'}: ${error?.message || '—'}`.replace(/\s+/g, ' ').trim();
  return text.length > DETAIL_MAX ? `${text.slice(0, DETAIL_MAX - 1)}…` : text;
}

/**
 * شبكة أمان للإقلاع والتنقّل: أي استثناء أثناء العرض كان يُسقط التطبيق كاملاً (شاشة بيضاء/إغلاق
 * على الإصدار النهائي). الآن تظهر شاشة ودّية بألوان MATRIX مع زر «إعادة المحاولة» يعيد تركيب الشجرة.
 */
class ErrorBoundaryInner extends React.Component<InnerProps, State> {
  state: State = { error: null, repeated: false };
  private retriedAt = 0;
  private retryRef = React.createRef<View>();

  componentDidUpdate(_: InnerProps, prev: State) {
    // الويب (قرار ١٦): الشجرة التي كان فيها التركيز فُكّت فيسقط إلى <body>، ويحتاج المتداول Tab قبل Enter أو الفأرة.
    // التركيز على الزرّ الوحيد هنا ⇒ Enter أو المسافة يعيدان المحاولة مباشرة. الهاتف بلا تغيير.
    if (Platform.OS === 'web' && this.state.error && !prev.error) {
      (this.retryRef.current as unknown as { focus?: () => void } | null)?.focus?.();
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.warn('[MATRIX] render error caught by AppErrorBoundary:', error?.message);
    reportError(error);
    // خطأ حتميّ (يقع عند كل تركيب) كان يعيد الشاشة نفسها بعد كل «إعادة المحاولة» بلا أي تغيير —
    // يضغط المتداول مرّةً بعد مرّة ولا يعرف أنّ المخرج إغلاق التطبيق كلياً. الآن يتبدّل النصّ.
    this.setState({ repeated: Date.now() - this.retriedAt < REPEAT_WINDOW_MS });
  }

  private reset = () => {
    this.retriedAt = Date.now();
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.wrap} accessibilityRole="alert">
        <Text style={styles.brand}>MATRIX</Text>
        {/* عنوان للقارئ: بشاشة لا شيء غيرها، التنقّل بالعناوين (دوّار VoiceOver) يقفز إليه مباشرة. */}
        <Text accessibilityRole="header" style={styles.title}>
          {this.props.title}
        </Text>
        <Text style={styles.body}>{this.state.repeated ? this.props.repeatBody : this.props.body}</Text>
        {/* خطأ متكرّر لا يُصلحه إلا تحديث: كانت الشاشة لا تقول شيئاً يفرّق عطلاً عن آخر، فبلاغ المتداول
            «الشاشة تقول حدث خطأ» لا يدلّ المطوّر على شيء. سطر صغير خافت قابل للنسخ، بالتكرار وحده كي لا
            يُخيف من تعثّر مرّة واحدة. */}
        {this.state.repeated ? (
          <Text selectable style={styles.detail}>
            {this.props.detailLabel} {errorDetail(this.state.error)}
          </Text>
        ) : null}
        <Pressable
          ref={this.retryRef}
          accessibilityRole="button"
          accessibilityLabel={this.props.retry}
          onPress={this.reset}
          style={({ pressed }) => [
            styles.btn,
            pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
          ]}
        >
          <Text style={styles.btnText}>{this.props.retry}</Text>
        </Pressable>
      </View>
    );
  }
}

export function AppErrorBoundary({ children }: Props) {
  const { t } = useI18n();
  return (
    <ErrorBoundaryInner
      title={t.appCrashTitle}
      body={t.appCrashBody}
      repeatBody={Platform.OS === 'web' ? t.appCrashRepeatBodyWeb : t.appCrashRepeatBody}
      retry={t.appCrashRetry}
      detailLabel={t.appCrashDetailLabel}
    >
      {children}
    </ErrorBoundaryInner>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  // `docs/DESIGN-PRO.md`: تأكيد واحد بالشاشة (الزرّ — طريق الخروج الوحيد) فالعلامة بلون ثانوي؛ أوزان 400/500 لا 800؛
  // المقاسات من السلّم 11/13/15/18 والمسافات على شبكة 4.
  brand: { color: colors.textMuted, fontSize: 13, fontWeight: '500', letterSpacing: 3 },
  title: { color: colors.text, fontSize: 18, fontWeight: '500', textAlign: 'center' },
  body: { color: colors.textMuted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  detail: { color: colors.textDim, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  // الزر الوحيد بهذه الشاشة هو طريق الخروج منها: حبّة تيل ممتلئة وضغطة تصغير، كزرّ «التالي» بالجولة الترحيبية.
  // بلا ظلّ (DESIGN-PRO §5.5 — فاصل واحد: التعبئة وحدها).
  btn: {
    marginTop: 8,
    minWidth: 180,
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  btnText: { color: colors.onAccent, fontSize: 15, fontWeight: '500' },
});
