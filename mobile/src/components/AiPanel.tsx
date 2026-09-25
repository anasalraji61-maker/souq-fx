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
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedHeadTail, frameEmbedTitleBlock, frameEmbedTitle, buttons } from '../theme';
import { api } from '../api';
import { useI18n } from '../i18n/I18nContext';

/** لا «احتمال نجاح» بالفقاعة: كان رقماً مختلَقاً (hash بالخادم، 62 ثابت عند الانقطاع) يُعرض كتقدير.
 * وبالمبدأ نفسه: `offline` تميّز نصّ الانقطاع العام عن جواب فعليّ للمساعد — كان يُعرض بفقاعة المساعد
 * ذاتها فيبدو كتحليل لسؤال المتداول (نفس ما يفعله `reportAiFallbackNote` بالتقرير الأسبوعي). */
type Turn = { role: 'user' | 'ai'; text: string; offline?: boolean; priceAt?: string };

/** وقت السعر الذي بُني عليه الجواب (`price_as_of`، backend-r12): الدخول بنصّ النموذج كان يُقرأ سعراً حيّاً
 * وهو إغلاق شمعة قد يكون مخزَّناً 15د أو إغلاق الجمعة يوم السبت. النصّ محلّي حتى يضيف الإطلاق مفتاحاً
 * بـ`locales.ts` (سابقة `REPLAY_TOUR_COPY`) — الكردي بحاجة مراجعة. */
const PRICE_AT_COPY: Record<string, string> = {
  ar: 'السعر بالجواب: إغلاق {time} بتوقيتك — ليس سعراً حيّاً',
  en: 'Price in this answer: candle close at {time} your time — not a live price',
  ku: 'نرخی ئەم وەڵامە: داخستنی مۆم لە {time} بە کاتی تۆ — نرخی ڕاستەوخۆ نییە',
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/** «21:45» لليوم نفسه، وإلا يوم الأسبوع قبل الوقت («Fri, Sep 25 21:45»/«الجمعة، 25 سبتمبر 21:45») — عطلة الأسبوع هي الحالة
 * الأخطر. الكردي بلا أسماء أيام موثوقة بـ`Intl` ⇒ «26/09 21:45». أرقام لاتينية كبقية الأسعار. */
function formatPriceAt(sec: number, lang: string, now: Date = new Date()): string {
  const d = new Date(sec * 1000);
  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) return hm;
  if (lang !== 'ku') {
    try {
      return `${d.toLocaleDateString(`${lang}-u-nu-latn`, { weekday: 'short', day: 'numeric', month: 'short' })} ${hm}`;
    } catch {
      /* بلا Intl ⇒ الصيغة الرقمية أدناه */
    }
  }
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${hm}`;
}

type Props = { symbol?: string; embedded?: boolean };

export function AiPanel({ symbol = 'EURUSD', embedded }: Props) {
  const { t, rtl, lang } = useI18n();
  const priceAtCopy =
    (t as Partial<Record<'aiPriceAsOf', string>>).aiPriceAsOf ??
    PRICE_AT_COPY[lang.startsWith('en') ? 'en' : lang] ??
    PRICE_AT_COPY.ar;
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
    setQ('');
    setTurns((prev) => [...prev, { role: 'user', text: question }]);
    setLoading(true);
    try {
      const res = await api.aiAsk(question, symbol, lang);
      setTurns((prev) => [
        ...prev,
        {
          role: 'ai',
          text: res.answer.replace(/\*\*/g, ''),
          priceAt:
            typeof res.price_as_of === 'number' && Number.isFinite(res.price_as_of)
              ? formatPriceAt(res.price_as_of, lang)
              : undefined,
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
            <Text style={[styles.text, turn.offline && styles.textOffline, { textAlign: align }]}>
              {turn.text}
            </Text>
            {turn.priceAt ? (
              <Text style={[styles.priceAt, { textAlign: align }]}>
                {priceAtCopy.replace('{time}', turn.priceAt)}
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
    fontWeight: '700',
    fontSize: 13,
  },
  titleInHead: { marginBottom: 0 },
  bubble: { borderRadius: radii.sm, padding: spacing.sm, borderWidth: 1 },
  user: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
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
  priceAt: { color: colors.textDim, fontSize: 11, marginTop: 6 },
  text: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 19,
  },
  row: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  rowRtl: { flexDirection: 'row-reverse' },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: spacing.sm,
    fontSize: 13,
  },
  send: {
    backgroundColor: colors.dxy,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  sendText: { color: colors.bg, fontWeight: '800', fontSize: 12 },
  sendDisabled: { opacity: 0.4 },
});
