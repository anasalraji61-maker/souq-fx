import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  I18nManager,
  ActivityIndicator,
} from 'react-native';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedHeadTail, frameEmbedTitleBlock, frameEmbedTitle, buttons, numeric } from '../theme';
import { api, type ChatMsg } from '../api';
import { useI18n } from '../i18n/I18nContext';
import { formatLocalStamp } from '../localStamp';
import { useBlockedUsers } from '../moderation';
import { ModerationActions, ModerationToggle } from './ModerationActions';

// اتجاه الواجهة يتبع لغة المستخدم المختارة عبر useI18n().rtl — لا نفرض RTL على النظام بالكامل هنا
void I18nManager;

export function GroupChatPanel({ embedded }: { embedded?: boolean }) {
  const { t, rtl, lang } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  /** تبدأ فارغة: كانت تُبذَر بـ`mockChat` («أحمد/سارة/كريم») فتظهر كمحادثة مجتمع حقيقية قبل التحميل
   * وتبقى عند فشله. الآن مؤشر تحميل ← رسائل الخادم أو «لا رسائل» أو خطأ صريح. */
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  /** وضوح الحالة: يعلم المستخدم إذا فشل تحميل/إرسال رسائل الدردشة بدل صمت كامل
   * (لا تُفعَّل قبل أول محاولة فعلية — لا ادّعاء فشل قبل حدوثه). */
  const [notice, setNotice] = useState<string | null>(null);
  /** شرط أبل 1.2: صف «إبلاغ/حظر» مفتوح لرسالة واحدة (زر ⋯)، والمحظورون محلياً يُخفَون */
  const [actionFor, setActionFor] = useState<string | null>(null);
  const { blocked, isBlocked, unblockAll } = useBlockedUsers();

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
          setLoaded(true);
        }
      })
      .catch(() => {
        if (alive) {
          setNotice(t.chatLoadError);
          setLoaded(true);
        }
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
      ts: '',
      created_at: Date.now() / 1000,
    };
    setMessages((m) => [...m, local]);
    try {
      const r = await api.postGroup(msg);
      if (r && r.ok === false && r.error === 'login_required') {
        // غير مسجّل: الرسالة لم تُنشر — أزلها وأعد النص للحقل واشرح السبب (لا اختفاء صامت)
        setMessages((m) => m.filter((x) => x.id !== local.id));
        setText(msg);
        setNotice(t.chatLoginRequired);
        return;
      }
      if (r && r.ok === false && r.error === 'links_not_allowed') {
        setMessages((m) => m.filter((x) => x.id !== local.id));
        setText(msg);
        setNotice(t.chatLinksNotAllowed);
        return;
      }
      if (r && r.message) {
        const saved: ChatMsg = { ...r.message, mine: true };
        setMessages((m) => m.map((x) => (x.id === local.id ? saved : x)));
      }
      setNotice(null);
    } catch {
      setNotice(t.chatSendError);
    }
  };

  /** رسالتي: من الخادم (`mine`) أو المحلية قبل وصول الرد. لا مقارنة بالاسم «أنت» — كان كل
   * الرسائل القديمة محفوظة بـ«أنت» فتظهر كلها كأنها رسائلك. */
  const isMine = (m: ChatMsg) => m.mine === true || m.id.startsWith('local-');

  const visible = messages.filter((m) => isMine(m) || !isBlocked(m.user));

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
      {!loaded ? <ActivityIndicator color={colors.accent} style={{ paddingVertical: spacing.lg }} /> : null}
      {loaded && !notice && visible.length === 0 ? (
        <Text style={styles.empty}>{t.chatEmpty}</Text>
      ) : null}
      <ScrollView style={styles.scroll} contentContainerStyle={{ gap: spacing.sm }}>
        {visible.map((m) => (
          <View
            key={m.id}
            style={[styles.bubble, isMine(m) && styles.mine]}
          >
            <View style={[styles.head, rtl && styles.headRtl]}>
              <Text style={[styles.user, styles.userFlex, { textAlign: align }]}>
                {isMine(m) ? t.chatYou : (m.user ?? t.chatAnonTrader)}
              </Text>
              {!isMine(m) ? (
                <ModerationToggle
                  open={actionFor === m.id}
                  onPress={() => setActionFor((cur) => (cur === m.id ? null : m.id))}
                  label={t.modMessageOptionsA11y}
                />
              ) : null}
            </View>
            <Text style={[styles.msg, { textAlign: align }]}>{m.text}</Text>
            {/* backend-r15: `ts` كان «HH:MM» بساعة الخادم (برلين) يُقرأ كتوقيت المتداول — متأخّر ساعة/ساعتين
                ببغداد، ورسالة الأمس 22:00 تبدو من اليوم. الآن `created_at` بتوقيت الجهاز (مع اليوم إن لم يكن
                اليوم)؛ رسالة قديمة بلا `created_at` بلا طابع — لا ساعة بمنطقة مجهولة. */}
            {typeof m.created_at === 'number' && Number.isFinite(m.created_at) ? (
              <Text style={styles.ts}>{formatLocalStamp(m.created_at, lang)}</Text>
            ) : null}
            {actionFor === m.id ? (
              <ModerationActions
                kind="group_message"
                targetId={m.id}
                author={m.user}
                onClose={() => setActionFor(null)}
                onResult={(n, hide) => {
                  setActionFor(null);
                  setNotice(n);
                  if (hide) setMessages((list) => list.filter((x) => x.id !== m.id));
                }}
              />
            ) : null}
          </View>
        ))}
      </ScrollView>
      {blocked.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.modUnblockA11y}
          onPress={unblockAll}
          hitSlop={6}
        >
          <Text style={[styles.blockedLine, { textAlign: align }]}>
            {t.modBlockedCount.replace('{n}', String(blocked.length))}
          </Text>
        </Pressable>
      ) : null}
      <View style={[styles.row, rtl && styles.rowRtl]}>
        <TextInput
          style={[styles.input, { textAlign: align }]}
          value={text}
          onChangeText={setText}
          placeholder={t.chatInputPlaceholder}
          maxLength={1000}
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
    fontWeight: '500',
    fontSize: 13,
  },
  titleInHead: { marginBottom: 0 },
  notice: {
    color: colors.warn,
    fontSize: 11,
    fontWeight: '500',
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
  mine: { borderColor: 'transparent', backgroundColor: colors.accentSoft },
  user: { color: colors.accent, fontSize: 11, fontWeight: '500' },
  userFlex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headRtl: { flexDirection: 'row-reverse' },
  blockedLine: { ...numeric, color: colors.textDim, fontSize: 11, fontWeight: '500', marginTop: spacing.xs },
  msg: { color: colors.text, fontSize: 12, marginTop: 4, lineHeight: 18 },
  ts: { ...numeric, color: colors.textDim, fontSize: 11, marginTop: spacing.xs, textAlign: 'left' },
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
});
