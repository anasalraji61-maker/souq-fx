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
import { colors, radii, spacing } from '../theme';
import { api, type ChatMsg } from '../api';
import { mockPeers } from '../mock';

type Peer = { user: string; last: string; ts: string };

export function MessagesScreen() {
  const [peers, setPeers] = useState<Peer[]>(mockPeers);
  const [peer, setPeer] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    api
      .dmList()
      .then((r) => setPeers(r.peers))
      .catch(() => undefined);
  }, []);

  const open = async (name: string) => {
    setPeer(name);
    try {
      const r = await api.dmThread(name);
      setThread(r.messages);
    } catch {
      setThread([
        {
          id: '1',
          user: name,
          text: peers.find((p) => p.user === name)?.last || 'مرحبا',
          ts: '20:00',
        },
      ]);
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
      ts: new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
    };
    setThread((t) => [...t, local]);
    try {
      await api.sendDm(peer, body);
    } catch {
      /* offline */
    }
  };

  if (peer) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <View style={styles.chatHeader}>
          <Pressable onPress={() => setPeer(null)}>
            <Text style={styles.back}>رجوع</Text>
          </Pressable>
          <Text style={styles.peerName}>{peer}</Text>
        </View>
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
            />
            <Pressable style={styles.send} onPress={send}>
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
      <FlatList
        data={peers}
        keyExtractor={(p) => p.user}
        contentContainerStyle={{ padding: spacing.md, gap: 8 }}
        renderItem={({ item }) => (
          <Pressable style={styles.peerCard} onPress={() => open(item.user)}>
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
  brand: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'right' },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'right' },
  peerCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
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
  avatarText: { color: colors.accent, fontWeight: '800', fontSize: 18 },
  peerTitle: { color: colors.text, fontWeight: '700', fontSize: 15, textAlign: 'right' },
  preview: { color: colors.textMuted, fontSize: 12, marginTop: 3, textAlign: 'right' },
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
  back: { color: colors.accent, fontWeight: '700' },
  peerName: { color: colors.text, fontWeight: '800', fontSize: 18 },
  thread: { padding: spacing.md, gap: 8 },
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
  msg: { color: colors.text, fontSize: 14, textAlign: 'right', lineHeight: 20 },
  ts: { color: colors.textDim, fontSize: 10, marginTop: 4 },
  composer: {
    flexDirection: 'row-reverse',
    gap: 8,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: 'right',
  },
  send: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendText: { color: '#042F2E', fontWeight: '800' },
});
