import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { colors, radii, spacing, frameEmbed, frameEmbedHead, frameEmbedHeadTail, frameEmbedTitleBlock, frameEmbedTitle, buttons } from '../theme';
import { api, type Vote } from '../api';
import { playSoftClick } from '../audio/playSoftClick';
import { useI18n } from '../i18n/I18nContext';
import { parseDecimal } from '../parseDecimal';
import { formatPrice } from '../chart/math';
import { analyzePlan, formatPips, formatRR, type PlanIssue, type TradePlan } from '../tradePlan';
import { useBlockedUsers } from '../moderation';
import { ModerationActions, ModerationToggle } from './ModerationActions';

export function VotePanel({ embedded }: { embedded?: boolean }) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  /** تبدأ فارغة: كانت تُبذَر بـ`mockVotes` — أفكار صفقات «أحمد/سارة» بأصوات مختلَقة (18/5) وأسعار قديمة
   * (ذهب 2348.5) تظهر كتوصيات مجتمع حقيقية قبل التحميل وتبقى عند فشله. */
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loaded, setLoaded] = useState(false);
  /** وضوح الحالة: يعلم المستخدم إذا فشل تحديث/إرسال التصويت بدل صمت كامل
   * (لا تُفعَّل قبل أول محاولة فعلية — لا ادّعاء فشل قبل حدوثه). */
  const [notice, setNotice] = useState<string | null>(null);
  /** شرط أبل 1.2: صف «إبلاغ/حظر» مفتوح لفكرة واحدة (زر ⋯)، وأفكار المحظورين محلياً تُخفى */
  const [actionFor, setActionFor] = useState<string | null>(null);
  const { blocked, isBlocked, unblockAll } = useBlockedUsers();
  const visible = votes.filter((v) => !isBlocked(v.author));

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
          setLoaded(true);
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setNotice(t.voteLoadError);
          setLoaded(true);
        }
      });
  };

  useEffect(() => {
    load();
  }, []);

  /** رسالة واضحة لخطة معكوسة (وقف/هدف بالجهة الخطأ من الدخول) — أشيع خطأ لدى المبتدئ. */
  const planIssueText = (issue: PlanIssue | null, side: 'buy' | 'sell'): string | null => {
    if (issue === 'slWrongSide') return side === 'buy' ? t.planSlWrongBuy : t.planSlWrongSell;
    if (issue === 'tpWrongSide') return side === 'buy' ? t.planTpWrongBuy : t.planTpWrongSell;
    if (issue === 'slTooClose') return t.planSlTooClose;
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
    const entry = parseDecimal(pEntry) ?? NaN;
    const sl = parseDecimal(pSl) ?? NaN;
    const tp = parseDecimal(pTp) ?? NaN;
    if (Number.isNaN(entry) || Number.isNaN(sl) || Number.isNaN(tp)) return null;
    return analyzePlan({ symbol: pSymbol, side: pDirection, entry, sl, tp });
  }, [pSymbol, pDirection, pEntry, pSl, pTp]);

  const publish = async () => {
    const entry = parseDecimal(pEntry) ?? NaN;
    const sl = parseDecimal(pSl) ?? NaN;
    const tp = parseDecimal(pTp) ?? NaN;
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
      const r = await api.createVote({
        symbol: pSymbol.trim().toUpperCase(),
        direction: pDirection,
        entry,
        sl,
        tp,
        note: pNote,
      });
      // النشر للمسجّل فقط والروابط مرفوضة — النموذج يبقى مفتوحاً بقيمه مع الشرح (لا مسح صامت)
      if (r && r.ok === false) {
        setPError(
          r.error === 'login_required'
            ? t.votePublishLoginRequired
            : r.error === 'links_not_allowed'
              ? t.voteLinksNotAllowed
              : t.votePublishError
        );
        return;
      }
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

  /** حارس ضد ضغط مزدوج/متكرّر سريع على "موافق"/"غير موافق" أثناء طلب قائم لنفس الفكرة (مجموعة
   * `castingIds` لا `busy` عام، لأن القائمة تعرض عدة أفكار معاً). الباك-إند صار يحتسب صوتاً واحداً
   * لكل حساب (`vote_ballots`): نفس الخيار مجدداً لا يُحتسب، وتغيير الرأي ينقل الصوت، والمجهول
   * يُرفض بـ`login_required` — فالتحديث المتفائل هنا يطابق تلك القاعدة، ويُرجَع عند الرفض. */
  const [castingIds, setCastingIds] = useState<Set<string>>(new Set());

  const applyChoice = (v: Vote, choice: 'agree' | 'disagree'): Vote => {
    const prev = v.my_choice ?? null;
    if (prev === choice) return v;
    return {
      ...v,
      agree: v.agree + (choice === 'agree' ? 1 : 0) - (prev === 'agree' ? 1 : 0),
      disagree: v.disagree + (choice === 'disagree' ? 1 : 0) - (prev === 'disagree' ? 1 : 0),
      my_choice: choice,
    };
  };

  const cast = async (id: string, choice: 'agree' | 'disagree') => {
    if (castingIds.has(id)) return;
    const before = votes.find((v) => v.id === id);
    // صوتك محتسب أصلاً بهذا الخيار — لا طلب ولا تغيير عدّاد
    if (before && before.my_choice === choice) return;
    setCastingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setVotes((prev) => prev.map((v) => (v.id === id ? applyChoice(v, choice) : v)));
    try {
      const r = await api.ballot(id, choice);
      if (!mountedRef.current) return;
      if (r && r.ok === false && r.error === 'login_required') {
        // غير مسجّل: أرجع العدّاد كما كان واشرح السبب (لا `load()` هنا لأنه يمسح الرسالة)
        if (before) setVotes((prev) => prev.map((v) => (v.id === id ? before : v)));
        setNotice(t.voteLoginRequired);
      } else {
        load();
      }
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
            maxLength={500}
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
      {!loaded ? <ActivityIndicator color={colors.accent} style={{ paddingVertical: spacing.lg }} /> : null}
      {loaded && !notice && visible.length === 0 ? (
        <Text style={styles.empty}>{t.voteEmpty}</Text>
      ) : null}
      <ScrollView contentContainerStyle={{ gap: 10 }} keyboardShouldPersistTaps="handled">
        {visible.map((v) => {
          const total = v.agree + v.disagree || 1;
          const pct = Math.round((v.agree / total) * 100);
          const buy = v.direction === 'buy';
          const plan = analyzePlan({ symbol: v.symbol, side: v.direction, entry: v.entry, sl: v.sl, tp: v.tp });
          return (
            <View key={v.id} style={styles.card}>
              <View style={[styles.head, rtl && styles.headRtl]}>
                <Text style={styles.symbol}>{v.symbol}</Text>
                <View style={[styles.headEnd, rtl && styles.headRtl]}>
                  <View style={[styles.badge, { backgroundColor: buy ? colors.bull : colors.bear }]}>
                    <Text style={styles.badgeText}>{buy ? t.dirBuy : t.dirSell}</Text>
                  </View>
                  <ModerationToggle
                    open={actionFor === v.id}
                    onPress={() => setActionFor((cur) => (cur === v.id ? null : v.id))}
                    label={t.modIdeaOptionsA11y}
                  />
                </View>
              </View>
              {actionFor === v.id ? (
                <ModerationActions
                  kind="vote"
                  targetId={v.id}
                  author={v.author}
                  onClose={() => setActionFor(null)}
                  onResult={(n, hide) => {
                    setActionFor(null);
                    setNotice(n);
                    if (hide) setVotes((list) => list.filter((x) => x.id !== v.id));
                  }}
                />
              ) : null}
              {v.author ? (
                <Text style={[styles.author, { textAlign: align }]}>
                  {t.voteByAuthor.replace('{author}', v.author)}
                </Text>
              ) : null}
              <View style={[styles.levels, rtl && styles.levelsRtl]}>
                <View style={styles.level}>
                  <Text style={styles.levelLabel}>{t.entryLabel}</Text>
                  <Text style={styles.levelVal}>{formatPrice(v.entry, v.symbol)}</Text>
                </View>
                <View style={styles.level}>
                  <Text style={styles.levelLabel}>{t.slLabel}</Text>
                  <Text style={[styles.levelVal, styles.levelSl]}>{formatPrice(v.sl, v.symbol)}</Text>
                </View>
                <View style={styles.level}>
                  <Text style={styles.levelLabel}>{t.tpLabel}</Text>
                  <Text style={[styles.levelVal, styles.levelTp]}>{formatPrice(v.tp, v.symbol)}</Text>
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
                  accessibilityState={{ disabled: castingIds.has(v.id), selected: v.my_choice === 'agree' }}
                  accessibilityLabel={`${t.voteAgreeA11yPrefix} ${v.symbol}`}
                >
                  <Text style={styles.btnText}>
                    {v.my_choice === 'agree' ? '✓ ' : ''}
                    {t.voteAgreeWord}
                  </Text>
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
                  accessibilityState={{ disabled: castingIds.has(v.id), selected: v.my_choice === 'disagree' }}
                  accessibilityLabel={`${t.voteDisagreeA11yPrefix} ${v.symbol}`}
                >
                  <Text style={styles.btnText}>
                    {v.my_choice === 'disagree' ? '✓ ' : ''}
                    {t.voteDisagreeWord}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
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
  headEnd: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  blockedLine: { color: colors.textDim, fontSize: 10, fontWeight: '700', marginTop: spacing.xs },
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
