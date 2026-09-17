import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedHeadTail, frameEmbedTitleBlock, frameEmbedTitle, buttons } from '../theme';
import { api, type Vote } from '../api';
import { mockVotes } from '../mock';
import { playSoftClick } from '../audio/playSoftClick';

export function VotePanel({ embedded }: { embedded?: boolean }) {
  const [votes, setVotes] = useState<Vote[]>(mockVotes);
  /** وضوح الحالة: يعلم المستخدم إذا فشل تحديث/إرسال التصويت بدل صمت كامل
   * (لا تُفعَّل قبل أول محاولة فعلية — لا ادّعاء فشل قبل حدوثه). */
  const [notice, setNotice] = useState<string | null>(null);

  /** نشر فكرة جديدة: نموذج قابل للطي — يستخدم POST /api/votes الموجود أصلاً بالباك-إند
   * (VoteCreate/db.create_vote) لكنه لم يكن مستخدَماً من أي واجهة — أكبر فجوة نمو موثَّقة
   * بتدقيق أنس المباشر (تصويت فقط، لا نشر). */
  const [showPublish, setShowPublish] = useState(false);
  const [pSymbol, setPSymbol] = useState('');
  const [pDirection, setPDirection] = useState<'buy' | 'sell'>('buy');
  const [pEntry, setPEntry] = useState('');
  const [pSl, setPSl] = useState('');
  const [pTp, setPTp] = useState('');
  const [pNote, setPNote] = useState('');
  const [pBusy, setPBusy] = useState(false);
  const [pError, setPError] = useState<string | null>(null);

  const load = () => {
    api
      .votes()
      .then((r) => {
        setVotes(r.votes);
        setNotice(null);
      })
      .catch(() => setNotice('تعذر تحديث التصويتات — تُعرض بيانات محفوظة'));
  };

  useEffect(() => {
    load();
  }, []);

  const publish = async () => {
    const entry = parseFloat(pEntry.replace(',', '.'));
    const sl = parseFloat(pSl.replace(',', '.'));
    const tp = parseFloat(pTp.replace(',', '.'));
    if (!pSymbol.trim() || Number.isNaN(entry) || Number.isNaN(sl) || Number.isNaN(tp)) {
      setPError('أدخل الرمز والدخول والوقف والهدف بشكل صحيح');
      return;
    }
    setPBusy(true);
    setPError(null);
    try {
      await api.createVote({
        symbol: pSymbol.trim().toUpperCase(),
        direction: pDirection,
        entry,
        sl,
        tp,
        note: pNote,
      });
      playSoftClick();
      setPSymbol('');
      setPEntry('');
      setPSl('');
      setPTp('');
      setPNote('');
      setShowPublish(false);
      load();
    } catch {
      setPError('تعذر نشر الفكرة — تحقق من الاتصال وحاول مرة أخرى');
    } finally {
      setPBusy(false);
    }
  };

  const cast = async (id: string, choice: 'agree' | 'disagree') => {
    setVotes((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              agree: choice === 'agree' ? v.agree + 1 : v.agree,
              disagree: choice === 'disagree' ? v.disagree + 1 : v.disagree,
            }
          : v
      )
    );
    try {
      await api.ballot(id, choice);
      load();
    } catch {
      setNotice('تعذر إرسال صوتك للخادم — قد لا يُحتسب، حاول لاحقاً');
    }
  };

  return (
    <View style={[styles.panel, embedded && styles.panelInFrame]}>
      {embedded ? (
        <View style={frameEmbedHead}>
          <View style={frameEmbedHeadTail} />
          <View style={frameEmbedTitleBlock}>
            <Text style={[styles.title, styles.titleInHead, frameEmbedTitle]}>تصويت على صفقة</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.title}>تصويت على صفقة</Text>
      )}

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.publishToggle,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={() => setShowPublish((s) => !s)}
        accessibilityLabel={showPublish ? 'إغلاق نموذج نشر الفكرة' : 'نشر فكرة تداول جديدة'}
      >
        <Text style={styles.publishToggleText}>{showPublish ? '✕ إغلاق' : '+ انشر فكرتك'}</Text>
      </Pressable>

      {showPublish ? (
        <View style={styles.form}>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={pSymbol}
              onChangeText={setPSymbol}
              placeholder="الرمز (مثال EURUSD)"
              placeholderTextColor={colors.textDim}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              underlineColorAndroid="transparent"
              clearButtonMode="while-editing"
              keyboardAppearance="dark"
              selectionColor={colors.accent}
              accessibilityLabel="رمز الأداة لفكرتك"
            />
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.dirBtn,
                pDirection === 'buy' && styles.dirBuyOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => setPDirection('buy')}
              accessibilityLabel="اتجاه الفكرة: شراء"
            >
              <Text style={[styles.dirText, pDirection === 'buy' && styles.dirTextOn]}>شراء</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.dirBtn,
                pDirection === 'sell' && styles.dirSellOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => setPDirection('sell')}
              accessibilityLabel="اتجاه الفكرة: بيع"
            >
              <Text style={[styles.dirText, pDirection === 'sell' && styles.dirTextOn]}>بيع</Text>
            </Pressable>
          </View>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={pEntry}
              onChangeText={setPEntry}
              placeholder="دخول"
              placeholderTextColor={colors.textDim}
              keyboardType="decimal-pad"
              returnKeyType="done"
              underlineColorAndroid="transparent"
              clearButtonMode="while-editing"
              keyboardAppearance="dark"
              selectionColor={colors.accent}
              accessibilityLabel="سعر الدخول"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={pSl}
              onChangeText={setPSl}
              placeholder="وقف"
              placeholderTextColor={colors.textDim}
              keyboardType="decimal-pad"
              returnKeyType="done"
              underlineColorAndroid="transparent"
              clearButtonMode="while-editing"
              keyboardAppearance="dark"
              selectionColor={colors.accent}
              accessibilityLabel="سعر وقف الخسارة"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={pTp}
              onChangeText={setPTp}
              placeholder="هدف"
              placeholderTextColor={colors.textDim}
              keyboardType="decimal-pad"
              returnKeyType="done"
              underlineColorAndroid="transparent"
              clearButtonMode="while-editing"
              keyboardAppearance="dark"
              selectionColor={colors.accent}
              accessibilityLabel="سعر الهدف"
            />
          </View>
          <TextInput
            style={styles.input}
            value={pNote}
            onChangeText={setPNote}
            placeholder="ملاحظة (اختياري) — لماذا هذه الفكرة؟"
            placeholderTextColor={colors.textDim}
            returnKeyType="done"
            underlineColorAndroid="transparent"
            clearButtonMode="while-editing"
            keyboardAppearance="dark"
            selectionColor={colors.accent}
            accessibilityLabel="ملاحظة الفكرة (اختياري)"
          />
          {pError ? <Text style={styles.formError}>{pError}</Text> : null}
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.publishBtn,
              pBusy && styles.publishBtnDisabled,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={publish}
            disabled={pBusy}
            accessibilityState={{ disabled: pBusy }}
            accessibilityLabel="نشر الفكرة"
          >
            <Text style={styles.publishBtnText}>{pBusy ? '...' : 'نشر الفكرة'}</Text>
          </Pressable>
        </View>
      ) : null}

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {!notice && votes.length === 0 ? (
        <Text style={styles.empty}>لا توجد تصويتات نشطة حالياً</Text>
      ) : null}
      <ScrollView contentContainerStyle={{ gap: 10 }} keyboardShouldPersistTaps="handled">
        {votes.map((v) => {
          const total = v.agree + v.disagree || 1;
          const pct = Math.round((v.agree / total) * 100);
          const buy = v.direction === 'buy';
          return (
            <View key={v.id} style={styles.card}>
              <View style={styles.head}>
                <Text style={styles.symbol}>{v.symbol}</Text>
                <View style={[styles.badge, { backgroundColor: buy ? colors.bull : colors.bear }]}>
                  <Text style={styles.badgeText}>{buy ? 'شراء' : 'بيع'}</Text>
                </View>
              </View>
              {v.author ? <Text style={styles.author}>بواسطة {v.author}</Text> : null}
              <Text style={styles.meta}>
                دخول {v.entry} · وقف {v.sl} · هدف {v.tp}
              </Text>
              <Text style={styles.note}>{v.note}</Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.pct}>
                موافقة {pct}% · {v.agree} موافق / {v.disagree} رافض
              </Text>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.btn,
                    styles.yes,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() => cast(v.id, 'agree')}
                  accessibilityLabel={`موافقة على فكرة ${v.symbol}`}
                >
                  <Text style={styles.btnText}>موافق</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.btn,
                    styles.no,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() => cast(v.id, 'disagree')}
                  accessibilityLabel={`رفض فكرة ${v.symbol}`}
                >
                  <Text style={styles.btnText}>رافض</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
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
  notice: {
    color: colors.warn,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 4,
  },
  empty: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 16,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  head: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  symbol: { color: colors.text, fontWeight: '800', fontSize: 14 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: colors.white, fontWeight: '800', fontSize: 11 },
  meta: { color: colors.textMuted, fontSize: 11, marginTop: 6, textAlign: 'right' },
  note: { color: colors.text, fontSize: 12, marginTop: 4, textAlign: 'right', lineHeight: 18 },
  barBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  barFill: { height: 6, backgroundColor: colors.accent },
  pct: { color: colors.textDim, fontSize: 11, marginTop: 4, textAlign: 'right' },
  actions: { flexDirection: 'row-reverse', gap: 8, marginTop: 8 },
  btn: {
    flex: 1,
    borderRadius: radii.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  yes: { backgroundColor: 'rgba(34,197,94,0.2)', borderWidth: 1, borderColor: colors.bull },
  no: { backgroundColor: colors.bearSoft, borderWidth: 1, borderColor: colors.bear },
  btnText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  author: { color: colors.dxy, fontSize: 10, fontWeight: '700', textAlign: 'right', marginTop: 2 },
  publishToggle: {
    alignSelf: 'flex-end',
    marginTop: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  publishToggleText: { color: colors.accent, fontWeight: '800', fontSize: 11 },
  form: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    gap: 6,
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.sm,
  },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: 'right',
    fontSize: 13,
  },
  row: { flexDirection: 'row-reverse', gap: 6 },
  dirBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirBuyOn: { borderColor: colors.bull, backgroundColor: colors.bullSoft },
  dirSellOn: { borderColor: colors.bear, backgroundColor: colors.bearSoft },
  dirText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  dirTextOn: { color: colors.text },
  formError: {
    color: colors.bear,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
  },
  publishBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  publishBtnText: { color: colors.onAccent, fontWeight: '800', fontSize: 12 },
  publishBtnDisabled: { opacity: 0.4 },
});
