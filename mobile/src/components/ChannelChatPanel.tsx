import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedHeadTail, frameEmbedTitleBlock, frameEmbedTitle, buttons, numeric } from '../theme';
import { api, type ChannelMsg } from '../api';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../context/AuthContext';
import { formatLocalStamp } from '../localStamp';
import { useBlockedUsers } from '../moderation';
import { ModerationActions, ModerationToggle } from './ModerationActions';

/**
 * Community channels — the same rooms as the web app (general, forex, metals, indices, energy, technical analysis).
 * Account required to read and post (server rule), sender name set by the server, no links (server filter),
 * report / block on every message of another member (Apple 1.2). No invented messages: empty / error states only.
 */

const CHANNEL_IDS = ['general', 'forex', 'metals', 'indices', 'energy', 'signals'] as const;
const INVISIBLE_FORMAT = /[­؀-؅؜۝܏᠎​-‏‪-‮⁠-⁤⁦-⁯﻿￹-￻]/g;
const LINK_RE =
  /(https?:\/\/|www\.|\bt\.me\/|\bwa\.me\/|\btelegram\.me\/|\bchat\.whatsapp\.com\/|\b[a-z0-9-]+\.(?:com|net|org|io|me|xyz|link|site|online|top|info|biz|co|app|ly|ru|vip|cc|tk|club|pro|gg|ws|su|shop|store|live|icu)\b)/i;
const POLL_MS = 15000;
const MAX_CHARS = 1000;

function chronological(list: ChannelMsg[]): ChannelMsg[] {
  return [...list].sort((a, b) => Number(a.id) - Number(b.id));
}

export function ChannelChatPanel({ embedded }: { embedded?: boolean }) {
  const { t, rtl, lang } = useI18n();
  const { user } = useAuth();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [channel, setChannel] = useState<string>('general');
  const [messages, setMessages] = useState<ChannelMsg[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error' | 'login'>('idle');
  const [hasMore, setHasMore] = useState(false);
  const [olderBusy, setOlderBusy] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionFor, setActionFor] = useState<string | null>(null);
  const { blocked, isBlocked, unblockAll } = useBlockedUsers();
  const scrollRef = useRef<ScrollView>(null);
  const channelRef = useRef(channel);
  channelRef.current = channel;

  const names: Record<string, string> = {
    general: t.chanGeneral,
    forex: t.chanForex,
    metals: t.chanMetals,
    indices: t.chanIndices,
    energy: t.chanEnergy,
    signals: t.chanSignals,
  };

  const load = useCallback(async () => {
    if (!user) {
      setState('login');
      return;
    }
    const ch = channel;
    setState('loading');
    setMessages([]);
    try {
      const page = await api.channelMessages(ch);
      if (channelRef.current !== ch) return;
      setMessages(chronological(page));
      setHasMore(page.length >= 40);
      setState('ready');
      setNotice(null);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
    } catch (e) {
      if (channelRef.current !== ch) return;
      setState(String((e as Error).message).includes('401') ? 'login' : 'error');
    }
  }, [channel, user]);

  useEffect(() => {
    void load();
  }, [load]);

  // light polling for new messages
  useEffect(() => {
    if (state !== 'ready') return;
    const ch = channel;
    const timer = setInterval(async () => {
      try {
        const page = await api.channelMessages(ch);
        if (channelRef.current !== ch) return;
        setMessages((prev) => {
          const known = new Set(prev.map((m) => m.id));
          const fresh = page.filter((m) => !known.has(m.id));
          return fresh.length ? chronological([...prev, ...fresh]) : prev;
        });
      } catch {
        /* keep what is shown */
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [state, channel]);

  const loadOlder = async () => {
    if (olderBusy || messages.length === 0) return;
    setOlderBusy(true);
    try {
      const page = await api.channelMessages(channel, messages[0].id);
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m.id));
        return chronological([...page.filter((m) => !known.has(m.id)), ...prev]);
      });
      setHasMore(page.length >= 40);
    } catch {
      setNotice(t.chatLoadError);
    } finally {
      setOlderBusy(false);
    }
  };

  const linkWarn = LINK_RE.test(text.normalize('NFKC').replace(/[。．｡]/g, '.').replace(INVISIBLE_FORMAT, ''));
  const blank = text.replace(INVISIBLE_FORMAT, '').trim() === '';

  const send = async () => {
    const msg = text.trim();
    if (blank || sending || linkWarn) return;
    setSending(true);
    try {
      const saved = await api.postChannel(channel, msg);
      setMessages((m) => (m.some((x) => x.id === saved.id) ? m : [...m, { ...saved, mine: true }]));
      setText('');
      setNotice(null);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    } catch (e) {
      const err = e as Error & { status?: number; detail?: unknown };
      if (err.status === 401) setState('login');
      else if (err.status === 429) setNotice(t.chanRateLimited);
      else if (err.detail === 'links_not_allowed') setNotice(t.chatLinksNotAllowed);
      else if (err.status === 400) setNotice(t.chanRejected);
      else setNotice(t.chatSendError);
    } finally {
      setSending(false);
    }
  };

  const visible = messages.filter((m) => m.mine || !isBlocked(m.sender_name));

  return (
    <View style={[styles.panel, embedded && styles.panelInFrame]} testID="channel-chat">
      {embedded ? (
        <View style={frameEmbedHead}>
          <View style={frameEmbedHeadTail} />
          <View style={frameEmbedTitleBlock}>
            <Text style={[styles.title, styles.titleInHead, frameEmbedTitle, { textAlign: align }]}>{t.chanTitle}</Text>
          </View>
        </View>
      ) : (
        <Text style={[styles.title, { textAlign: align }]}>{t.chanTitle}</Text>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={[styles.chipsRow, rtl && styles.rowRtl]}>
        {CHANNEL_IDS.map((id) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected: channel === id }}
            onPress={() => setChannel(id)}
            style={[styles.chip, channel === id && styles.chipOn]}
            hitSlop={4}
          >
            <Text style={[styles.chipText, channel === id && styles.chipTextOn]}># {names[id]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {notice ? <Text style={[styles.notice, { textAlign: align }]}>{notice}</Text> : null}

      {state === 'login' ? (
        <View style={styles.center}>
          <Text style={[styles.empty, { textAlign: 'center' }]}>{t.chanLoginToRead}</Text>
        </View>
      ) : state === 'loading' || state === 'idle' ? (
        <ActivityIndicator color={colors.accent} style={{ paddingVertical: spacing.lg }} />
      ) : state === 'error' ? (
        <View style={styles.center}>
          <Text style={styles.empty}>{t.chatLoadError}</Text>
          <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.retry} hitSlop={6}>
            <Text style={styles.retryText}>{t.chanRetry}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={{ gap: spacing.sm }}>
          {hasMore ? (
            <Pressable accessibilityRole="button" onPress={() => void loadOlder()} style={styles.older} hitSlop={6}>
              {olderBusy ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.olderText}>{t.chanLoadOlder}</Text>}
            </Pressable>
          ) : null}
          {visible.length === 0 ? <Text style={styles.empty}>{t.chanEmpty}</Text> : null}
          {visible.map((m) => {
            const sec = Date.parse(m.created_at) / 1000;
            return (
              <View key={m.id} style={[styles.bubble, m.mine && styles.mine]}>
                <View style={[styles.head, rtl && styles.headRtl]}>
                  <Text style={[styles.user, styles.userFlex, { textAlign: align }]}>{m.mine ? t.chatYou : m.sender_name}</Text>
                  {!m.mine ? (
                    <ModerationToggle
                      open={actionFor === m.id}
                      onPress={() => setActionFor((cur) => (cur === m.id ? null : m.id))}
                      label={t.modMessageOptionsA11y}
                    />
                  ) : null}
                </View>
                <Text style={[styles.msg, { textAlign: align }]}>{m.content}</Text>
                <View style={[styles.meta, rtl && styles.headRtl]}>
                  {Number.isFinite(sec) ? <Text style={styles.ts}>{formatLocalStamp(sec, lang)}</Text> : null}
                  {m.symbol_tag ? <Text style={styles.tag}>#{m.symbol_tag}</Text> : null}
                  {m.is_flagged ? <Text style={styles.flag}>{t.chanFlagged}</Text> : null}
                </View>
                {actionFor === m.id ? (
                  <ModerationActions
                    kind="channel_message"
                    targetId={m.id}
                    author={m.sender_name}
                    onClose={() => setActionFor(null)}
                    onResult={(n, hide) => {
                      setActionFor(null);
                      setNotice(n);
                      if (hide) setMessages((list) => list.filter((x) => x.id !== m.id));
                    }}
                  />
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}

      {blocked.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t.modUnblockA11y} onPress={unblockAll} hitSlop={6}>
          <Text style={[styles.blockedLine, { textAlign: align }]}>{t.modBlockedCount.replace('{n}', String(blocked.length))}</Text>
        </Pressable>
      ) : null}

      {state === 'ready' ? (
        <>
          {linkWarn ? <Text style={[styles.notice, { textAlign: align }]}>{t.chatLinksNotAllowed}</Text> : null}
          <View style={[styles.row, rtl && styles.rowRtl]}>
            <TextInput
              style={[styles.input, { textAlign: align }]}
              value={text}
              onChangeText={setText}
              placeholder={t.chanPlaceholder.replace('{ch}', names[channel] || channel)}
              maxLength={MAX_CHARS}
              placeholderTextColor={colors.textDim}
              onSubmitEditing={send}
              returnKeyType="send"
              underlineColorAndroid="transparent"
              keyboardAppearance="dark"
              selectionColor={colors.accent}
              accessibilityLabel={t.chatInputA11y}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: blank || sending || linkWarn }}
              style={({ pressed }) => [
                styles.send,
                (blank || sending || linkWarn) && { opacity: 0.45 },
                pressed && { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] },
              ]}
              onPress={send}
              accessibilityLabel={t.chatSendA11y}
              hitSlop={8}
            >
              {sending ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.sendText}>{t.sendBtn}</Text>}
            </Pressable>
          </View>
          <Text style={[styles.counter, { textAlign: rtl ? 'left' : 'right' }]}>
            {text.length}/{MAX_CHARS}
          </Text>
        </>
      ) : null}
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
  title: { color: colors.text, fontWeight: '500', fontSize: 13 },
  titleInHead: { marginBottom: 0 },
  chips: { flexGrow: 0, marginTop: spacing.xs },
  chipsRow: { gap: spacing.xs, paddingVertical: 2, flexDirection: 'row' },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  chipTextOn: { color: colors.onAccent },
  notice: { color: colors.warn, fontSize: 11, fontWeight: '500', marginTop: spacing.xs },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  empty: { color: colors.textDim, fontSize: 11, textAlign: 'center', paddingVertical: spacing.lg },
  retry: { borderWidth: 1, borderColor: colors.accent, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  retryText: { color: colors.accent, fontSize: 12, fontWeight: '500' },
  scroll: { flex: 1, marginTop: spacing.xs },
  older: { alignSelf: 'center', paddingHorizontal: spacing.md, paddingVertical: 6 },
  olderText: { color: colors.accent, fontSize: 11, fontWeight: '500' },
  bubble: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  mine: { borderColor: 'transparent', backgroundColor: colors.bgPanel },
  user: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  userFlex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headRtl: { flexDirection: 'row-reverse' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  msg: { color: colors.text, fontSize: 12, marginTop: 4, lineHeight: 18 },
  ts: { ...numeric, color: colors.textDim, fontSize: 11 },
  tag: { ...numeric, color: colors.textMuted, fontSize: 11 },
  flag: { color: colors.warn, fontSize: 10 },
  blockedLine: { ...numeric, color: colors.textDim, fontSize: 11, fontWeight: '500', marginTop: spacing.xs },
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
  send: { backgroundColor: colors.accent, borderRadius: radii.sm, paddingHorizontal: spacing.md, justifyContent: 'center', minWidth: 56, alignItems: 'center' },
  sendText: { color: colors.onAccent, fontWeight: '500', fontSize: 12 },
  counter: { ...numeric, color: colors.textDim, fontSize: 10, marginTop: 2 },
});
