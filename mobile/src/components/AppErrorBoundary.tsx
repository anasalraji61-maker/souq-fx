import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { buttons, colors, radii } from '../theme';
import { useI18n } from '../i18n/I18nContext';

type Props = { children: React.ReactNode };
type InnerProps = Props & { title: string; body: string; repeatBody: string; retry: string };
type State = { error: Error | null; repeated: boolean };

/** خطأ يعود خلال هذه المدة بعد «إعادة المحاولة» يُعدّ تكراراً لا خطأً جديداً. */
const REPEAT_WINDOW_MS = 10_000;

/**
 * شبكة أمان للإقلاع والتنقّل: أي استثناء أثناء العرض كان يُسقط التطبيق كاملاً (شاشة بيضاء/إغلاق
 * على الإصدار النهائي). الآن تظهر شاشة ودّية بألوان MATRIX مع زر «إعادة المحاولة» يعيد تركيب الشجرة.
 */
class ErrorBoundaryInner extends React.Component<InnerProps, State> {
  state: State = { error: null, repeated: false };
  private retriedAt = 0;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.warn('[MATRIX] render error caught by AppErrorBoundary:', error?.message);
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
        <Text style={styles.title}>{this.props.title}</Text>
        <Text style={styles.body}>{this.state.repeated ? this.props.repeatBody : this.props.body}</Text>
        <Pressable
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
      repeatBody={t.appCrashRepeatBody}
      retry={t.appCrashRetry}
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
  brand: { color: colors.accent, fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  title: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  body: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  // الزر الوحيد بهذه الشاشة هو طريق الخروج منها: حبّة تيل ممتلئة بظل خفيف وضغطة تصغير، كزرّ
  // «التالي» بالجولة الترحيبية — لا لوح مسطّح بزوايا 10 يبدو معطّلاً بشاشة خطأ أصلاً.
  btn: {
    marginTop: 8,
    minWidth: 180,
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: 26,
    paddingVertical: 13,
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  btnText: { color: colors.onAccent, fontSize: 15, fontWeight: '800' },
});
