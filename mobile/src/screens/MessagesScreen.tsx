import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing, buttons } from '../theme';
import { api, type ChatMsg } from '../api';
import { mockPeers } from '../mock';

type Peer = { user: string; last: string; ts: string };

export function MessagesScreen() {
  const [peers, setPeers] = useState<Peer[]>(mockPeers);
  const [peer, setPeer] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  /** وضوح الحالة: يعلم المستخدم إذا فشل تحميل/إرسال المحادثات الخاصة بدل صمت كامل
   * (لا تُفعَّل قبل أول محاولة فعلية — لا ادّعاء فشل قبل حدوثه). */
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    // حارس "alive" يمنع تحديث الحالة بعد إلغاء تركيب الشاشة قبل اكتمال الطلب — نفس نمط
    // ChartFrame/SymbolSnapshot/FocusChartModal المؤسَّس بالكود.
    let alive = true;
    api
      .dmList()
      .then((r) => {
        if (alive) {
          setPeers(r.peers);
          setNotice(null);
        }
      })
      .catch(() => {
        if (alive) setNotice('تعذر تحميل المحادثات — تُعرض بيانات محفوظة');
      });
    return () => {
      alive = false;
    };
  }, []);

  const open = async (name: string) => {
    setPeer(name);
    try {
      const r = await api.dmThread(name);
      setThread(r.messages);
      setNotice(null);
    } catch {
      setThread([
        {
          id: '1',
          user: name,
          text: peers.find((p) => p.user === name)?.last || 'مرحبا',
          ts: '20:00',
        },
      ]);
      setNotice('تعذر تحميل الرسائل — يُعرض آخر معروف فقط');
    }
  };

  const send = async () => {
    if (!peer || !text.trim()) return;
    const body = text.trim();
    setText('');
    const local: ChatMsg = {
      id: `local-${Date.now()}`,
      user: 'أنت',
      text: body,
      // 'ar-u-nu-latn': تنسيق عربي بأرقام غربية صراحة — 'ar' وحدها قد تُنتج أرقاماً هندية شرقية
      // (١٢:٣٠) بدل غربية على بعض أجهزة ICU، غير متوقَّع لتاجر يقرأ طابع وقت رسالة بسرعة.
      ts: new Date().toLocaleTimeString('ar-u-nu-latn', { hour: '2-digit', minute: '2-digit' }),
    };
    setThread((t) => [...t, local]);
    try {
      await api.sendDm(peer, body);
    } catch {
      setNotice('تعذر إرسال رسالتك — قد لا تصل، حاول لاحقاً');
    }
  };

  if (peer) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <View style={styles.chatHeader}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPeer(null)}
            style={({ pressed }) =>
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              }
            }
            hitSlop={8}
          >
            <Text style={styles.back}>رجوع</Text>
          </Pressable>
          <Text style={styles.peerName}>{peer}</Text>
        </View>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <FlatList
            data={thread}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.thread}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.bubble,
                  item.user === 'أنت' ? styles.mine : styles.theirs,
                ]}
              >
                <Text style={styles.msg}>{item.text}</Text>
                <Text style={styles.ts}>{item.ts}</Text>
              </View>
            )}
          />
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="رسالة خاصة..."
              placeholderTextColor={colors.textDim}
              onSubmitEditing={send}
              returnKeyType="send"
              underlineColorAndroid="transparent"
              clearButtonMode="while-editing"
              keyboardAppearance="dark"
              selectionColor={colors.accent}
              accessibilityLabel="رسالة خاصة"
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.brand}>الرسائل الخاصة</Text>
        <Text style={styles.sub}>محادثات فردية مثل الماسنجر</Text>
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <FlatList
        data={peers}
        keyExtractor={(p) => p.user}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, flexGrow: 1 }}
        ListEmptyComponent={
          !notice ? <Text style={styles.empty}>لا توجد محادثات بعد</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.peerCard,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => open(item.user)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.user.slice(0, 1)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.peerTitle}>{item.user}</Text>
              <Text style={styles.preview} numberOfLines={1}>
                {item.last}
              </Text>
            </View>
            <Text style={styles.time}>{item.ts}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  brand: { color: colors.text, fontSize: 18, fontWeight: '500', textAlign: 'right' },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs, textAlign: 'right' },
  notice: {
    color: colors.warn,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'right',
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
  },
  empty: {
    color: colors.textDim,
    fontSize: 12,
    textAlign: 'center',
    alignSelf: 'center',
    marginTop: 40,
  },
  peerCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  avatarText: { color: colors.accent, fontWeight: '500', fontSize: 18 },
  peerTitle: { color: colors.text, fontWeight: '500', fontSize: 15, textAlign: 'right' },
  preview: { color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'right' },
  time: { color: colors.textDim, fontSize: 11 },
  chatHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  back: { color: colors.accent, fontWeight: '500' },
  peerName: { color: colors.text, fontWeight: '500', fontSize: 18 },
  thread: { padding: spacing.md, gap: spacing.sm },
  bubble: {
    maxWidth: '80%',
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
  },
  mine: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  theirs: {
    alignSelf: 'flex-end',
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
  },
  msg: { color: colors.text, fontSize: 13, textAlign: 'right', lineHeight: 20 },
  ts: { color: colors.textDim, fontSize: 11, marginTop: spacing.xs },
  composer: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    textAlign: 'right',
  },
  send: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  sendText: { color: colors.onAccent, fontWeight: '500' },
});
