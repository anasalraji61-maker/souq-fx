import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  I18nManager,
} from 'react-native';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedHeadTail, frameEmbedTitleBlock, frameEmbedTitle, buttons } from '../theme';
import { api, type ChatMsg } from '../api';
import { mockChat } from '../mock';
import { useI18n } from '../i18n/I18nContext';

// اتجاه الواجهة يتبع لغة المستخدم المختارة عبر useI18n().rtl — لا نفرض RTL على النظام بالكامل هنا
void I18nManager;

export function GroupChatPanel({ embedded }: { embedded?: boolean }) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [messages, setMessages] = useState<ChatMsg[]>(mockChat);
  const [text, setText] = useState('');
  /** وضوح الحالة: يعلم المستخدم إذا فشل تحميل/إرسال رسائل الدردشة بدل صمت كامل
   * (لا تُفعَّل قبل أول محاولة فعلية — لا ادّعاء فشل قبل حدوثه). */
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    // حارس "alive" يمنع تحديث الحالة بعد إلغاء تركيب اللوحة (مثلاً تبديل قسم hub قبل اكتمال
    // الطلب) — نفس نمط ChartFrame/SymbolSnapshot/FocusChartModal المؤسَّس بالكود.
    let alive = true;
    api
      .groupChat()
      .then((r) => {
        if (alive) {
          setMessages(r.messages);
          setNotice(null);
        }
      })
      .catch(() => {
        if (alive) setNotice(t.chatLoadError);
      });
    return () => {
      alive = false;
    };
  }, [t.chatLoadError]);

  const send = async () => {
    const msg = text.trim();
    if (!msg) return;
    setText('');
    const local: ChatMsg = {
      id: `local-${Date.now()}`,
      user: t.chatYou,
      text: msg,
      // 'ar-u-nu-latn': تنسيق عربي بأرقام غربية صراحة — 'ar' وحدها قد تُنتج أرقاماً هندية شرقية
      // (١٢:٣٠) بدل غربية على بعض أجهزة ICU، غير متوقَّع لتاجر يقرأ طابع وقت رسالة بسرعة.
      ts: new Date().toLocaleTimeString('ar-u-nu-latn', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((m) => [...m, local]);
    try {
      await api.postGroup(msg);
      setNotice(null);
    } catch {
      setNotice(t.chatSendError);
    }
  };

  return (
    <View style={[styles.panel, embedded && styles.panelInFrame]}>
      {embedded ? (
        <View style={frameEmbedHead}>
          <View style={frameEmbedHeadTail} />
          <View style={frameEmbedTitleBlock}>
            <Text style={[styles.title, styles.titleInHead, frameEmbedTitle, { textAlign: align }]}>
              {t.chatTitle}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={[styles.title, { textAlign: align }]}>{t.chatTitle}</Text>
      )}
      {notice ? <Text style={[styles.notice, { textAlign: align }]}>{notice}</Text> : null}
      {!notice && messages.length === 0 ? (
        <Text style={styles.empty}>{t.chatEmpty}</Text>
      ) : null}
      <ScrollView style={styles.scroll} contentContainerStyle={{ gap: spacing.sm }}>
        {messages.map((m) => (
          <View
            key={m.id}
            style={[styles.bubble, m.user === t.chatYou && styles.mine]}
          >
            <Text style={[styles.user, { textAlign: align }]}>{m.user}</Text>
            <Text style={[styles.msg, { textAlign: align }]}>{m.text}</Text>
            <Text style={styles.ts}>{m.ts}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={[styles.row, rtl && styles.rowRtl]}>
        <TextInput
          style={[styles.input, { textAlign: align }]}
          value={text}
          onChangeText={setText}
          placeholder={t.chatInputPlaceholder}
          placeholderTextColor={colors.textDim}
          onSubmitEditing={send}
          returnKeyType="send"
          underlineColorAndroid="transparent"
          clearButtonMode="while-editing"
          keyboardAppearance="dark"
          selectionColor={colors.accent}
          accessibilityLabel={t.chatInputA11y}
        />
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.send,
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          onPress={send}
          accessibilityLabel={t.chatSendA11y}
          hitSlop={8}
        >
          <Text style={styles.sendText}>{t.sendBtn}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.bgPanel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    overflow: 'hidden',
  },
  panelInFrame: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingTop: frameEmbed.padTop,
    paddingLeft: frameEmbed.padLeft,
    paddingRight: frameEmbed.padRight,
    paddingBottom: frameEmbed.padBottom,
  },
  title: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  titleInHead: { marginBottom: 0 },
  notice: {
    color: colors.warn,
    fontSize: 10,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  empty: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  scroll: { flex: 1 },
  bubble: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  mine: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  user: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  msg: { color: colors.text, fontSize: 12, marginTop: 2, lineHeight: 18 },
  ts: { color: colors.textDim, fontSize: 10, marginTop: spacing.xs, textAlign: 'left' },
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
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  sendText: { color: colors.onAccent, fontWeight: '800', fontSize: 12 },
});
