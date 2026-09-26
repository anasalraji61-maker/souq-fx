import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedHeadTail, frameEmbedTitleBlock, frameEmbedTitle, buttons, numeric } from '../theme';
import { api } from '../api';
import { useI18n } from '../i18n/I18nContext';
import { formatLocalStamp } from '../localStamp';

/** لا «احتمال نجاح» بالفقاعة: كان رقماً مختلَقاً (hash بالخادم، 62 ثابت عند الانقطاع) يُعرض كتقدير.
 * وبالمبدأ نفسه: `offline` تميّز نصّ الانقطاع العام عن جواب فعليّ للمساعد — كان يُعرض بفقاعة المساعد
 * ذاتها فيبدو كتحليل لسؤال المتداول (نفس ما يفعله `reportAiFallbackNote` بالتقرير الأسبوعي). */
type Turn = { role: 'user' | 'ai'; text: string; offline?: boolean; priceAt?: string; arabicReply?: boolean; symbol?: string };

/** وقت السعر الذي بُني عليه الجواب (`price_as_of`، backend-r12): الدخول بنصّ النموذج كان يُقرأ سعراً حيّاً
 * وهو إغلاق شمعة قد يكون مخزَّناً 15د أو إغلاق الجمعة يوم السبت — يُعرض تحت الجواب بـ`t.aiPriceAsOf`. */
const formatPriceAt = formatLocalStamp;

type Props = { symbol?: string; embedded?: boolean };

export function AiPanel({ symbol = 'EURUSD', embedded }: Props) {
  const { t, rtl, lang } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: 'ai',
      text: t.aiGreeting,
    },
  ]);

  const ask = async () => {
    const question = q.trim();
    // الخادم يطلب 2–2000 حرف (`AiAsk`): حرف واحد كان يُرسَل فيُرفض 422 ويُمسح السؤال ويظهر «الذكاء غير متاح».
    if (question.length < 2 || loading) return;
    // tools132a: الرمز يُثبَّت لحظة السؤال ويوسَم به السؤال والجواب — تبديل الشريحة قبل الردّ كان يُظهر جواب
    // EURUSD بلا وسم تحت شريط يقول GBPUSD.
    const askedSymbol = symbol;
    setQ('');
    setTurns((prev) => [...prev, { role: 'user', text: question, symbol: askedSymbol }]);
    setLoading(true);
    try {
      const res = await api.aiAsk(question, askedSymbol, lang);
      setTurns((prev) => [
        ...prev,
        {
          role: 'ai',
          text: res.answer.replace(/\*\*/g, ''),
          symbol: askedSymbol,
          priceAt:
            typeof res.price_as_of === 'number' && Number.isFinite(res.price_as_of)
              ? formatPriceAt(res.price_as_of, lang)
              : undefined,
          // قرار ١٢ (backend-r78a): الخادم بلا قالب كردي بعد ⇒ `answer_lang: "ar"` لمستخدم غير عربي.
          arabicReply: res.answer_lang === 'ar' && lang !== 'ar',
        },
      ]);
    } catch {
      setTurns((prev) => [
        ...prev,
        {
          role: 'ai',
          text: t.aiOfflineFallback,
          offline: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.panel, embedded && styles.panelInFrame]}>
      {embedded ? (
        <View style={frameEmbedHead}>
          <View style={frameEmbedHeadTail} />
          <View style={frameEmbedTitleBlock}>
            <Text style={[styles.title, styles.titleInHead, frameEmbedTitle, { textAlign: align }]}>
              {t.aiPanelTitle}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={[styles.title, { textAlign: align }]}>{t.aiPanelTitle}</Text>
      )}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: spacing.sm }}>
        {turns.map((turn, i) => (
          <View
            key={i}
            style={[
              styles.bubble,
              turn.role === 'user' ? styles.user : styles.ai,
              turn.offline && styles.aiOffline,
            ]}
          >
            {turn.symbol ? (
              <Text style={[styles.symbolTag, { textAlign: align }]}>{turn.symbol}</Text>
            ) : null}
            {turn.arabicReply ? (
              <Text style={[styles.langNote, { textAlign: align }]}>{t.aiReplyInArabicNote}</Text>
            ) : null}
            <Text
              style={[
                styles.text,
                turn.offline && styles.textOffline,
                // النصّ العربي يُحاذى يميناً ولو كانت الواجهة إنجليزية.
                { textAlign: turn.arabicReply ? 'right' : align },
                turn.arabicReply && styles.textRtl,
              ]}
            >
              {turn.text}
            </Text>
            {turn.priceAt ? (
              <Text style={[styles.priceAt, { textAlign: align }]}>
                {t.aiPriceAsOf.replace('{time}', turn.priceAt)}
              </Text>
            ) : null}
          </View>
        ))}
        {loading && <ActivityIndicator color={colors.accent} />}
      </ScrollView>
      <View style={[styles.row, rtl && styles.rowRtl]}>
        <TextInput
          style={[styles.input, { textAlign: align }]}
          value={q}
          onChangeText={setQ}
          maxLength={2000}
          placeholder={t.aiInputPlaceholder.replace('{symbol}', symbol)}
          placeholderTextColor={colors.textDim}
          onSubmitEditing={ask}
          returnKeyType="send"
          underlineColorAndroid="transparent"
          clearButtonMode="while-editing"
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          accessibilityLabel={t.aiInputA11y}
        />
        <Pressable
          accessibilityRole="button"
          disabled={loading}
          accessibilityState={{ disabled: loading }}
          style={({ pressed }) => [
            styles.send,
            loading && styles.sendDisabled,
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          onPress={ask}
          accessibilityLabel={t.aiSendA11y}
          hitSlop={8}
        >
          <Text style={styles.sendText}>{t.aiAskBtn}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: colors.bgPanel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    minHeight: 220,
  },
  panelInFrame: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingTop: frameEmbed.padTop,
    paddingLeft: frameEmbed.padLeft,
    paddingRight: frameEmbed.padRight,
    paddingBottom: frameEmbed.padBottom,
    minHeight: 0,
  },
  title: {
    color: colors.text,
    fontWeight: '500',
    fontSize: 13,
  },
  titleInHead: { marginBottom: 0 },
  bubble: { borderRadius: radii.sm, padding: spacing.sm, borderWidth: 1 },
  // DESIGN-PRO §1/§5.5: تعبئة خفيفة وحدها تميّز رسالة المتداول — كانت حدّاً بلون التأكيد فوق التعبئة بكل فقاعة.
  user: {
    backgroundColor: colors.accentSoft,
    borderColor: 'transparent',
  },
  ai: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.borderSoft,
  },
  /** فقاعة انقطاع، لا جواب مساعد: حدّ وخلفية تحذير كما بقيّة حالات التعذّر بالتطبيق */
  aiOffline: {
    backgroundColor: colors.warnSoft,
    borderColor: colors.warn,
  },
  textOffline: { color: colors.textMuted },
  priceAt: { ...numeric, color: colors.textDim, fontSize: 11, marginTop: 4 },
  symbolTag: { color: colors.textMuted, fontSize: 11, fontWeight: '500', marginBottom: 4 },
  langNote: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
  textRtl: { writingDirection: 'rtl' },
  text: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 19,
  },
  row: { flexDirection: 'row', gap: 4, marginTop: spacing.sm },
  rowRtl: { flexDirection: 'row-reverse' },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: spacing.sm,
    fontSize: 13,
  },
  send: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  sendText: { color: colors.onAccent, fontWeight: '500', fontSize: 12 },
  sendDisabled: { opacity: 0.4 },
});
