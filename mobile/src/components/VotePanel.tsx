import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedHeadTail, frameEmbedTitleBlock, frameEmbedTitle, buttons } from '../theme';
import { api, type Vote } from '../api';
import { mockVotes } from '../mock';
import { playSoftClick } from '../audio/playSoftClick';
import { useI18n } from '../i18n/I18nContext';
import { analyzePlan, formatPips, formatRR, type PlanIssue, type TradePlan } from '../tradePlan';

export function VotePanel({ embedded }: { embedded?: boolean }) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
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

  // حارس "alive" مبني على ref (لا `let` محلي بالـeffect) لأن `load` تُستدعى أيضاً من `publish`/
  // `cast` بعد نجاح إجراء المستخدم، لا من مؤثّر التركيب فقط — يمنع تحديث الحالة بعد إلغاء تركيب
  // اللوحة (مثلاً تبديل قسم hub) بغض النظر عن أي نداء تسبَّب بالطلب، نفس مبدأ ChartFrame/
  // SymbolSnapshot المؤسَّس بالكود لكن بصيغة ref لأنها مُشترَكة بين أكثر من مستدعٍ.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = () => {
    api
      .votes()
      .then((r) => {
        if (mountedRef.current) {
          setVotes(r.votes);
          setNotice(null);
        }
      })
      .catch(() => {
        if (mountedRef.current) setNotice(t.voteLoadError);
      });
  };

  useEffect(() => {
    load();
  }, []);

  /** رسالة واضحة لخطة معكوسة (وقف/هدف بالجهة الخطأ من الدخول) — أشيع خطأ لدى المبتدئ. */
  const planIssueText = (issue: PlanIssue | null, side: 'buy' | 'sell'): string | null => {
    if (issue === 'slWrongSide') return side === 'buy' ? t.planSlWrongBuy : t.planSlWrongSell;
    if (issue === 'tpWrongSide') return side === 'buy' ? t.planTpWrongBuy : t.planTpWrongSell;
    return null;
  };

  /** "المخاطرة 25 pip · الربح المحتمل 50 pip · R:R 1:2.0" — بفرق السعر حين لا يُعرف الـpip. */
  const planSummary = (plan: TradePlan): string => {
    const dist = (pips: number | null, d: number) => {
      const p = formatPips(pips);
      return p != null ? `${p} pip` : String(Math.round(d * 1e5) / 1e5);
    };
    return `${t.planRiskWord} ${dist(plan.riskPips, plan.riskDist)} · ${t.planRewardWord} ${dist(plan.rewardPips, plan.rewardDist)} · R:R ${formatRR(plan.rr)}`;
  };

  // معاينة حيّة للخطة أثناء الكتابة (لا تُعرض قبل اكتمال الأرقام الثلاثة).
  const draftPlan = useMemo(() => {
    const entry = parseFloat(pEntry.replace(',', '.'));
    const sl = parseFloat(pSl.replace(',', '.'));
    const tp = parseFloat(pTp.replace(',', '.'));
    if (Number.isNaN(entry) || Number.isNaN(sl) || Number.isNaN(tp)) return null;
    return analyzePlan({ symbol: pSymbol, side: pDirection, entry, sl, tp });
  }, [pSymbol, pDirection, pEntry, pSl, pTp]);

  const publish = async () => {
    const entry = parseFloat(pEntry.replace(',', '.'));
    const sl = parseFloat(pSl.replace(',', '.'));
    const tp = parseFloat(pTp.replace(',', '.'));
    if (!pSymbol.trim() || Number.isNaN(entry) || Number.isNaN(sl) || Number.isNaN(tp)) {
      setPError(t.voteFormError);
      return;
    }
    const plan = analyzePlan({ symbol: pSymbol, side: pDirection, entry, sl, tp });
    if (!plan.ok) {
      setPError(planIssueText(plan.issue, pDirection) ?? t.voteFormError);
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
      setPError(t.votePublishError);
    } finally {
      setPBusy(false);
    }
  };

  /** حارس ضد ضغط مزدوج/متكرّر سريع على "موافق"/"غير موافق": `db.ballot` بالباك-إند يزيد العدّاد
   * مباشرة (`UPDATE votes SET agree=agree+1 ...`) بلا أي فحص "صوّت من قبل؟" — فبلا حارس هنا،
   * ضغطتان سريعتان (قصديتان أو بالخطأ) على نفس الزر تُسجِّلان صوتين فعليين بدل واحد بلا أي رسالة
   * تنبّه المستخدم. مجموعة `castingIds` (لا حارس `busy` عام واحد، لأن القائمة تعرض عدة تصويتات
   * معاً) تمنع إعادة استدعاء `cast` لنفس التصويت أثناء طلب قائم فعلاً له، بنفس مبدأ `busy`/
   * `disabled` المؤسَّس بـ`AlertsPanel.add`/`TradeJournalPanel.add`. */
  const [castingIds, setCastingIds] = useState<Set<string>>(new Set());

  const cast = async (id: string, choice: 'agree' | 'disagree') => {
    if (castingIds.has(id)) return;
    setCastingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
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
      if (mountedRef.current) setNotice(t.voteCastError);
    } finally {
      if (mountedRef.current) {
        setCastingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    }
  };

  return (
    <View style={[styles.panel, embedded && styles.panelInFrame]}>
      {embedded ? (
        <View style={frameEmbedHead}>
          <View style={frameEmbedHeadTail} />
          <View style={frameEmbedTitleBlock}>
            <Text style={[styles.title, styles.titleInHead, frameEmbedTitle, { textAlign: align }]}>
              {t.voteTitle}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={[styles.title, { textAlign: align }]}>{t.voteTitle}</Text>
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
        accessibilityLabel={showPublish ? t.voteCloseFormA11y : t.votePublishNewA11y}
      >
        <Text style={styles.publishToggleText}>
          {showPublish ? `✕ ${t.closeWord}` : `+ ${t.votePublishToggleBtn}`}
        </Text>
      </Pressable>

      {showPublish ? (
        <View style={styles.form}>
          <View style={[styles.row, rtl && styles.rowRtl]}>
            <TextInput
              style={[styles.input, { flex: 1, textAlign: align }]}
              value={pSymbol}
              onChangeText={setPSymbol}
              placeholder={t.voteSymbolPlaceholder}
              placeholderTextColor={colors.textDim}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              underlineColorAndroid="transparent"
              clearButtonMode="while-editing"
              keyboardAppearance="dark"
              selectionColor={colors.accent}
              accessibilityLabel={t.voteSymbolA11y}
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
              accessibilityLabel={`${t.voteDirA11yPrefix}: ${t.dirBuy}`}
            >
              <Text style={[styles.dirText, pDirection === 'buy' && styles.dirTextOn]}>{t.dirBuy}</Text>
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
              accessibilityLabel={`${t.voteDirA11yPrefix}: ${t.dirSell}`}
            >
              <Text style={[styles.dirText, pDirection === 'sell' && styles.dirTextOn]}>{t.dirSell}</Text>
            </Pressable>
          </View>
          <View style={[styles.row, rtl && styles.rowRtl]}>
            <TextInput
              style={[styles.input, { flex: 1, textAlign: align }]}
              value={pEntry}
              onChangeText={setPEntry}
              placeholder={t.entryLabel}
              placeholderTextColor={colors.textDim}
              keyboardType="decimal-pad"
              maxLength={12}
              returnKeyType="done"
              underlineColorAndroid="transparent"
              clearButtonMode="while-editing"
              keyboardAppearance="dark"
              selectionColor={colors.accent}
              accessibilityLabel={t.voteEntryPriceA11y}
            />
            <TextInput
              style={[styles.input, { flex: 1, textAlign: align }]}
              value={pSl}
              onChangeText={setPSl}
              placeholder={t.slLabel}
              placeholderTextColor={colors.textDim}
              keyboardType="decimal-pad"
              maxLength={12}
              returnKeyType="done"
              underlineColorAndroid="transparent"
              clearButtonMode="while-editing"
              keyboardAppearance="dark"
              selectionColor={colors.accent}
              accessibilityLabel={t.voteSlPriceA11y}
            />
            <TextInput
              style={[styles.input, { flex: 1, textAlign: align }]}
              value={pTp}
              onChangeText={setPTp}
              placeholder={t.tpLabel}
              placeholderTextColor={colors.textDim}
              keyboardType="decimal-pad"
              maxLength={12}
              returnKeyType="done"
              underlineColorAndroid="transparent"
              clearButtonMode="while-editing"
              keyboardAppearance="dark"
              selectionColor={colors.accent}
              accessibilityLabel={t.voteTpPriceA11y}
            />
          </View>
          <TextInput
            style={[styles.input, { textAlign: align }]}
            value={pNote}
            onChangeText={setPNote}
            placeholder={t.voteNotePlaceholder}
            placeholderTextColor={colors.textDim}
            returnKeyType="done"
            underlineColorAndroid="transparent"
            clearButtonMode="while-editing"
            keyboardAppearance="dark"
            selectionColor={colors.accent}
            accessibilityLabel={t.voteNoteA11y}
          />
          {draftPlan && draftPlan.ok ? (
            <View style={styles.planBox}>
              <Text style={[styles.planText, { textAlign: align }]}>{planSummary(draftPlan)}</Text>
              {draftPlan.rr != null && draftPlan.rr < 1 ? (
                <Text style={[styles.planWarn, { textAlign: align }]}>{t.planLowRR}</Text>
              ) : null}
            </View>
          ) : draftPlan && draftPlan.issue !== 'invalid' ? (
            <Text style={[styles.formError, { textAlign: align }]}>
              {planIssueText(draftPlan.issue, pDirection)}
            </Text>
          ) : null}
          {pError ? <Text style={[styles.formError, { textAlign: align }]}>{pError}</Text> : null}
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
            accessibilityLabel={t.votePublishBtn}
          >
            <Text style={styles.publishBtnText}>{pBusy ? '...' : t.votePublishBtn}</Text>
          </Pressable>
        </View>
      ) : null}

      {notice ? <Text style={[styles.notice, { textAlign: align }]}>{notice}</Text> : null}
      {!notice && votes.length === 0 ? (
        <Text style={styles.empty}>{t.voteEmpty}</Text>
      ) : null}
      <ScrollView contentContainerStyle={{ gap: 10 }} keyboardShouldPersistTaps="handled">
        {votes.map((v) => {
          const total = v.agree + v.disagree || 1;
          const pct = Math.round((v.agree / total) * 100);
          const buy = v.direction === 'buy';
          const plan = analyzePlan({ symbol: v.symbol, side: v.direction, entry: v.entry, sl: v.sl, tp: v.tp });
          return (
            <View key={v.id} style={styles.card}>
              <View style={[styles.head, rtl && styles.headRtl]}>
                <Text style={styles.symbol}>{v.symbol}</Text>
                <View style={[styles.badge, { backgroundColor: buy ? colors.bull : colors.bear }]}>
                  <Text style={styles.badgeText}>{buy ? t.dirBuy : t.dirSell}</Text>
                </View>
              </View>
              {v.author ? (
                <Text style={[styles.author, { textAlign: align }]}>
                  {t.voteByAuthor.replace('{author}', v.author)}
                </Text>
              ) : null}
              <View style={[styles.levels, rtl && styles.levelsRtl]}>
                <View style={styles.level}>
                  <Text style={styles.levelLabel}>{t.entryLabel}</Text>
                  <Text style={styles.levelVal}>{v.entry}</Text>
                </View>
                <View style={styles.level}>
                  <Text style={styles.levelLabel}>{t.slLabel}</Text>
                  <Text style={[styles.levelVal, styles.levelSl]}>{v.sl}</Text>
                </View>
                <View style={styles.level}>
                  <Text style={styles.levelLabel}>{t.tpLabel}</Text>
                  <Text style={[styles.levelVal, styles.levelTp]}>{v.tp}</Text>
                </View>
              </View>
              {plan.ok ? (
                <Text style={[styles.meta, { textAlign: align }]}>{planSummary(plan)}</Text>
              ) : planIssueText(plan.issue, v.direction) ? (
                <Text style={[styles.planWarn, { textAlign: align }]}>
                  ⚠ {planIssueText(plan.issue, v.direction)}
                </Text>
              ) : null}
              <Text style={[styles.note, { textAlign: align }]}>{v.note}</Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${pct}%` }]} />
              </View>
              <Text style={[styles.pct, { textAlign: align }]}>
                {t.voteApprovalLabel} {pct}% · {v.agree} {t.voteAgreeWord} / {v.disagree} {t.voteDisagreeWord}
              </Text>
              <View style={[styles.actions, rtl && styles.actionsRtl]}>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.btn,
                    styles.yes,
                    castingIds.has(v.id) && styles.btnDisabled,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() => cast(v.id, 'agree')}
                  disabled={castingIds.has(v.id)}
                  accessibilityState={{ disabled: castingIds.has(v.id) }}
                  accessibilityLabel={`${t.voteAgreeA11yPrefix} ${v.symbol}`}
                >
                  <Text style={styles.btnText}>{t.voteAgreeWord}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.btn,
                    styles.no,
                    castingIds.has(v.id) && styles.btnDisabled,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() => cast(v.id, 'disagree')}
                  disabled={castingIds.has(v.id)}
                  accessibilityState={{ disabled: castingIds.has(v.id) }}
                  accessibilityLabel={`${t.voteDisagreeA11yPrefix} ${v.symbol}`}
                >
                  <Text style={styles.btnText}>{t.voteDisagreeWord}</Text>
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
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headRtl: { flexDirection: 'row-reverse' },
  symbol: { color: colors.text, fontWeight: '800', fontSize: 14 },
  badge: { borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { color: colors.white, fontWeight: '800', fontSize: 11 },
  meta: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  levels: { flexDirection: 'row', gap: spacing.sm, marginTop: 6 },
  levelsRtl: { flexDirection: 'row-reverse' },
  level: {
    flex: 1,
    backgroundColor: colors.controlBg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  levelLabel: { color: colors.textDim, fontSize: 9, fontWeight: '700' },
  levelVal: { color: colors.text, fontSize: 12, fontWeight: '800', marginTop: 1 },
  levelSl: { color: colors.bear },
  levelTp: { color: colors.bull },
  planBox: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  planText: { color: colors.accent, fontSize: 11, fontWeight: '800' },
  planWarn: { color: colors.warn, fontSize: 10, fontWeight: '700', marginTop: 2 },
  note: { color: colors.text, fontSize: 12, marginTop: spacing.xs, lineHeight: 18 },
  barBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  barFill: { height: 6, backgroundColor: colors.accent },
  pct: { color: colors.textDim, fontSize: 11, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionsRtl: { flexDirection: 'row-reverse' },
  btn: {
    flex: 1,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  yes: { backgroundColor: 'rgba(34,197,94,0.2)', borderWidth: 1, borderColor: colors.bull },
  no: { backgroundColor: colors.bearSoft, borderWidth: 1, borderColor: colors.bear },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  author: { color: colors.dxy, fontSize: 10, fontWeight: '700', marginTop: 2 },
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
    paddingVertical: spacing.sm,
    fontSize: 13,
  },
  row: { flexDirection: 'row', gap: 6 },
  rowRtl: { flexDirection: 'row-reverse' },
  dirBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
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
