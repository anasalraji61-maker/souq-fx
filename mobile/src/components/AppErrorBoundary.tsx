import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { useI18n } from '../i18n/I18nContext';

type Props = { children: React.ReactNode };
type InnerProps = Props & { title: string; body: string; retry: string };
type State = { error: Error | null };

/**
 * شبكة أمان للإقلاع والتنقّل: أي استثناء أثناء العرض كان يُسقط التطبيق كاملاً (شاشة بيضاء/إغلاق
 * على الإصدار النهائي). الآن تظهر شاشة ودّية بألوان MATRIX مع زر «إعادة المحاولة» يعيد تركيب الشجرة.
 */
class ErrorBoundaryInner extends React.Component<InnerProps, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.warn('[MATRIX] render error caught by AppErrorBoundary:', error?.message);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.wrap} accessibilityRole="alert">
        <Text style={styles.brand}>MATRIX</Text>
        <Text style={styles.title}>{this.props.title}</Text>
        <Text style={styles.body}>{this.props.body}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={this.props.retry}
          onPress={this.reset}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
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
    <ErrorBoundaryInner title={t.appCrashTitle} body={t.appCrashBody} retry={t.appCrashRetry}>
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
  btn: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  btnPressed: { opacity: 0.85 },
  btnText: { color: colors.onAccent, fontSize: 15, fontWeight: '800' },
});
