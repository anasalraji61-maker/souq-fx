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

// واجهة عربية — لا نفرض RTL على النظام بالكامل هنا
void I18nManager;

export function GroupChatPanel({ embedded }: { embedded?: boolean }) {
  const [messages, setMessages] = useState<ChatMsg[]>(mockChat);
  const [text, setText] = useState('');

  useEffect(() => {
    api
      .groupChat()
      .then((r) => setMessages(r.messages))
      .catch(() => undefined);
  }, []);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    const local: ChatMsg = {
      id: `local-${Date.now()}`,
      user: 'أنت',
      text: t,
      ts: new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((m) => [...m, local]);
    try {
      await api.postGroup(t);
    } catch {
      /* offline ok */
    }
  };

  return (
    <View style={[styles.panel, embedded && styles.panelInFrame]}>
      {embedded ? (
        <View style={frameEmbedHead}>
          <View style={frameEmbedHeadTail} />
          <View style={frameEmbedTitleBlock}>
            <Text style={[styles.title, styles.titleInHead, frameEmbedTitle]}>دردشة جماعية</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.title}>دردشة جماعية</Text>
      )}
      <ScrollView style={styles.scroll} contentContainerStyle={{ gap: 8 }}>
        {messages.map((m) => (
          <View
            key={m.id}
            style={[styles.bubble, m.user === 'أنت' && styles.mine]}
          >
            <Text style={styles.user}>{m.user}</Text>
            <Text style={styles.msg}>{m.text}</Text>
            <Text style={styles.ts}>{m.ts}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="اكتب رسالة..."
          placeholderTextColor={colors.textDim}
          onSubmitEditing={send}
          accessibilityLabel="رسالة الدردشة الجماعية"
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
        >
          <Text style={styles.sendText}>إرسال</Text>
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
    textAlign: 'right',
  },
  titleInHead: { marginBottom: 0 },
  scroll: { flex: 1 },
  bubble: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  mine: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  user: { color: colors.accent, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  msg: { color: colors.text, fontSize: 12, marginTop: 2, textAlign: 'right', lineHeight: 18 },
  ts: { color: colors.textDim, fontSize: 10, marginTop: 4, textAlign: 'left' },
  row: { flexDirection: 'row-reverse', gap: 6, marginTop: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    textAlign: 'right',
  },
  send: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    justifyContent: 'center',
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  sendText: { color: '#042F2E', fontWeight: '800', fontSize: 12 },
});
