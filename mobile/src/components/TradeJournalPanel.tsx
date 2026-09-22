import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { api } from '../api';
import { playSoftClick } from '../audio/playSoftClick';
import { useI18n } from '../i18n/I18nContext';
import { parseDecimal } from '../parseDecimal';
import { formatPrice } from '../chart/math';
import { isRealQuote } from '../chart/dataSource';
import {
  analyzePlan,
  formatPips,
  formatR,
  formatRR,
  levelSideIssue,
  realizedMove,
  realizedR,
  type PlanIssue,
  type TradePlan,
} from '../tradePlan';

/** نفس أزواج الاختيار السريع بحاسبة المخاطرة — تسجيل صفقة بنقرة بدل كتابة الرمز بلوحة مفاتيح بيد واحدة. */
const QUICK_SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'GBPJPY', 'EURGBP'];

/** +80 / −12.5 pip — نفس علامة الناقص المطبعية لـformatR. */
const formatSignedPips = (p: number): string => {
  const abs = formatPips(Math.abs(p)) ?? '0';
  return `${p > 0 ? '+' : p < 0 ? '−' : ''}${abs}`;
};

type Trade = {
  id: string;
  symbol: string;
  side: string;
  entry: number;
  exit?: number | null;
  size: number;
  pnl?: number | null;
  /** وقف/هدف اختياريان (غائبان بسجلات قديمة أو باك-إند قديم). */
  sl?: number | null;
  tp?: number | null;
  note: string;
  status: string;
  opened_at: string;
};

type Stats = {
  trade_count: number;
  win_rate: number;
  total_pnl_pct: number;
  avg_win: number;
  avg_loss: number;
  best: number;
  worst: number;
};

type Props = {
  /** رمز الشارت/الإشارة المفتوح — التسجيل يبدأ به بدل EURUSD ثابت (كالحاسبة والباك-تست). */
  defaultSymbol?: string;
};

export function TradeJournalPanel({ defaultSymbol }: Props = {}) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState(defaultSymbol || 'EURUSD');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [entry, setEntry] = useState('');
  const [exit, setExit] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  /** جلب «السعر الحالي» لخانة الدخول جارٍ */
  const [quoteBusy, setQuoteBusy] = useState(false);
  /** وضوح الحالة: يميّز "لا صفقات بعد" فعلياً عن فشل تحميل السجل */
  const [listError, setListError] = useState(false);
  /** وضوح الحالة: يعلم المستخدم إذا فشلت إضافة صفقة بدل صمت كامل (لم يكن هناك حتى catch) */
  const [formError, setFormError] = useState<string | null>(null);
  /** صفقة قيد التعديل — النموذج نفسه يُملأ بها و«إضافة» يصبح «حفظ التعديل» (خطأ كتابة بالدخول كان يُفسد
   * الإحصاءات، والحلّ الوحيد كان الحذف وإعادة الكتابة). */
  const [editing, setEditing] = useState<Trade | null>(null);

  // حارس "alive" مبني على ref يمنع تحديث الحالة بعد إلغاء تركيب اللوحة (تبديل تبويب
  // ToolsScreen قبل اكتمال الطلب) — نفس مبدأ ChartFrame/SymbolSnapshot المؤسَّس بالكود.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await api.trades();
      if (!mountedRef.current) return;
      setTrades(res.trades as Trade[]);
      setStats(res.stats as Stats);
      setListError(false);
    } catch {
      if (mountedRef.current) {
        setTrades([]);
        setStats(null);
        setListError(true);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // تبديل زوج الشارت يُبدّل رمز التسجيل — لكن ليس وسط تسجيل صفقة مكتوبة (سعر دخول مكتوب لرمز آخر
  // كان سيُسجَّل تحت الرمز الجديد).
  const entryRef = useRef(entry);
  entryRef.current = entry;
  useEffect(() => {
    if (defaultSymbol && entryRef.current.trim() === '') setSymbol(defaultSymbol);
  }, [defaultSymbol]);

  /** سعر الدخول بنقرة: المتداول يسجّل الصفقة لحظة فتحها غالباً. Ask للشراء وBid للبيع إن توفّرا (ما ينفَّذ
   * عليه فعلاً)، وإلا السعر. اقتباس بذري تجريبي لا يُستخدم أبداً (isRealQuote) — لا دخول مختلَق. */
  const fillLivePrice = async () => {
    const sym = symbol.trim().toUpperCase();
    if (sym.length < 3 || quoteBusy) return;
    setQuoteBusy(true);
    setFormError(null);
    try {
      const q = await api.marketQuote(sym);
      if (!mountedRef.current) return;
      if (!isRealQuote(q)) {
        setFormError(t.journalNoLiveQuote);
        return;
      }
      const sidePx = side === 'buy' ? q.ask : q.bid;
      const px = typeof sidePx === 'number' && Number.isFinite(sidePx) && sidePx > 0 ? sidePx : q.price;
      setEntry(formatPrice(px, sym));
      playSoftClick();
    } catch {
      if (mountedRef.current) setFormError(t.journalNoLiveQuote);
    } finally {
      if (mountedRef.current) setQuoteBusy(false);
    }
  };

  /** "1,0850" / «١٫٠٨٥٠» / «2,350.50» → رقم (راجع parseDecimal.ts)؛ خانة فارغة أو غير رقمية → null. */
  const num = (v: string): number | null => {
    const n = parseDecimal(v);
    return n != null && n > 0 ? n : null;
  };
  /** نص مكتوب لكنه غير مفهوم — كان الوقف/الهدف/الخروج يُحفظ فارغاً بصمت (صفقة مغلقة تُسجَّل مفتوحة). */
  const unreadable = (v: string) => v.trim() !== '' && num(v) == null;

  /** رسالة واضحة لوقف/هدف بالجهة الخطأ — نفس نصوص خطة الصفقة بلوحة الأفكار. */
  const planIssueText = (issue: PlanIssue | null): string | null => {
    if (issue === 'slWrongSide') return side === 'buy' ? t.planSlWrongBuy : t.planSlWrongSell;
    if (issue === 'tpWrongSide') return side === 'buy' ? t.planTpWrongBuy : t.planTpWrongSell;
    return null;
  };

  /** "المخاطرة 25 pip · الربح المحتمل 50 pip · R:R 1:2.0" */
  const planSummary = (plan: TradePlan): string => {
    const dist = (pips: number | null, d: number) => {
      const p = formatPips(pips);
      return p != null ? `${p} pip` : String(Math.round(d * 1e5) / 1e5);
    };
    return `${t.planRiskWord} ${dist(plan.riskPips, plan.riskDist)} · ${t.planRewardWord} ${dist(plan.rewardPips, plan.rewardDist)} · R:R ${formatRR(plan.rr)}`;
  };

  // معاينة حيّة أثناء الكتابة: خطأ جهة فوراً (حتى بوقف وحده)، والملخّص حين تكتمل الأرقام الثلاثة.
  const draft = useMemo(() => {
    const e = num(entry);
    if (e == null) return null;
    const s = num(sl);
    const p = num(tp);
    const issue = levelSideIssue({ side, entry: e, sl: s, tp: p });
    if (issue) return { issue, plan: null as TradePlan | null };
    if (s == null || p == null) return null;
    return { issue: null, plan: analyzePlan({ symbol: symbol.trim(), side, entry: e, sl: s, tp: p }) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, side, entry, sl, tp]);

  /**
   * ما يقيس به متداول التجزئة أداءه فعلاً: صافي النقاط (pip) ومتوسط النتيجة بالـR (التوقّع لكل صفقة) —
   * من الصفقات المغلقة المعروضة، لا من `pnl` المخزَّن. الـR فقط للصفقات التي سُجِّل لها وقف.
   */
  const extraStats = useMemo(() => {
    /**
     * النقاط تُجمع **لكل أداة على حدة**: الـpip وحدةُ قياسٍ تخصّ الأداة لا رقماً عاماً —
     * pip الذهب 0.1 من الدولار، وpip EURUSD 0.0001، وpip الين 0.01 (`instrumentSpec`). فجمعها
     * بمجموع واحد كان يطرح نقاط الذهب من نقاط اليورو كأنها الشيء نفسه: صفقة ذهب +50 وصفقة
     * EURUSD −50 كانتا تُقرآن «صفر» بينما هما بالمال شيئان مختلفان تماماً — وهذا سطرٌ يقيس به
     * متداول التجزئة أداءه. متوسط الـR بجانبه سليم كما هو: نسبة بلا وحدة تقارن الأدوات بحق.
     */
    const byPips = new Map<string, { pips: number; n: number }>();
    let rSum = 0;
    let rN = 0;
    for (const tr of trades) {
      if (tr.status !== 'closed') continue;
      const side = tr.side === 'sell' ? 'sell' : 'buy';
      const mv = realizedMove({ symbol: tr.symbol, side, entry: tr.entry, exit: tr.exit });
      if (mv?.pips != null) {
        const key = (tr.symbol || '').trim().toUpperCase() || '—';
        const cur = byPips.get(key) ?? { pips: 0, n: 0 };
        cur.pips += mv.pips;
        cur.n += 1;
        byPips.set(key, cur);
      }
      const r = realizedR({ side, entry: tr.entry, sl: tr.sl, exit: tr.exit });
      if (r != null) {
        rSum += r;
        rN += 1;
      }
    }
    /** الأكثر تداولاً أولاً — ثلاث أدوات بالسطر وما بعدها «+N» كي لا يطول سطر الإحصاءات. */
    const ranked = [...byPips.entries()].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]));
    const shown = ranked.slice(0, 3);
    const rest = ranked.length - shown.length;
    const parts = shown.map(
      ([sym, v]) => `${sym} ${formatSignedPips(Math.round(v.pips * 10) / 10)}`
    );
    return {
      /** أداة واحدة → السطر كما كان بالضبط؛ أكثر من أداة → مفصَّل لكل أداة. */
      pips: ranked.length === 1 ? formatSignedPips(Math.round(ranked[0]![1].pips * 10) / 10) : null,
      pipsBySymbol: ranked.length > 1 ? parts.join(' · ') + (rest > 0 ? ` +${rest}` : '') : null,
      avgR: rN ? formatR(Math.round((rSum / rN) * 10) / 10) : null,
      rN,
    };
  }, [trades]);

  const resetForm = () => {
    setEntry('');
    setExit('');
    setSl('');
    setTp('');
    setNote('');
  };

  const startEdit = (tr: Trade) => {
    setEditing(tr);
    setSymbol(tr.symbol);
    setSide(tr.side === 'sell' ? 'sell' : 'buy');
    // String لا formatPrice: لا تقريب يغيّر السعر المسجَّل بمجرد فتح التعديل
    setEntry(String(tr.entry));
    setExit(tr.exit != null ? String(tr.exit) : '');
    setSl(tr.sl != null ? String(tr.sl) : '');
    setTp(tr.tp != null ? String(tr.tp) : '');
    setNote(tr.note || '');
    setFormError(null);
    playSoftClick();
  };

  const cancelEdit = () => {
    setEditing(null);
    resetForm();
    setFormError(null);
  };

  const add = async () => {
    const e = num(entry);
    if (!symbol.trim() || e == null) {
      setFormError(t.journalInvalidEntry);
      return;
    }
    if ([sl, tp, exit].some(unreadable)) {
      setFormError(t.invalidNumberHint);
      return;
    }
    const s = num(sl);
    const p = num(tp);
    const issue = levelSideIssue({ side, entry: e, sl: s, tp: p });
    if (issue) {
      setFormError(planIssueText(issue));
      return;
    }
    setBusy(true);
    setFormError(null);
    if (editing) {
      try {
        // تعديل: خانة فارغة = مسح (وقف/هدف بلا قيمة، وخروج فارغ يعيد الصفقة مفتوحة) — لا «بلا تغيير» صامت
        await api.updateTrade(editing.id, {
          symbol: symbol.trim().toUpperCase(),
          side,
          entry: e,
          exit: num(exit),
          sl: s,
          tp: p,
          note,
        });
        if (!mountedRef.current) return;
        playSoftClick();
        setEditing(null);
        resetForm();
        await refresh();
      } catch {
        if (mountedRef.current) setFormError(t.journalEditError);
      } finally {
        if (mountedRef.current) setBusy(false);
      }
      return;
    }
    try {
      const x = num(exit);
      await api.createTrade({
        symbol: symbol.trim().toUpperCase(),
        side,
        entry: e,
        exit: x ?? undefined,
        sl: s ?? undefined,
        tp: p ?? undefined,
        note,
      });
      playSoftClick();
      resetForm();
      await refresh();
    } catch {
      setFormError(t.journalAddError);
    } finally {
      setBusy(false);
    }
  };

  const closeOpen = async (id: string) => {
    const x = num(exit);
    // خانة الخروج فارغة/غير مفهومة: كان الضغط لا يفعل شيئاً بصمت تام (المبتدئ لا يعرف أن الإغلاق يقرأ خانة
    // «خروج» بأعلى النموذج).
    if (x == null) {
      Alert.alert(t.journalCloseFailedTitle, unreadable(exit) ? t.invalidNumberHint : t.journalCloseNeedsExit);
      return;
    }
    setBusy(true);
    try {
      await api.closeTrade(id, x);
      playSoftClick();
      await refresh();
    } catch {
      Alert.alert(t.journalCloseFailedTitle, t.journalCloseFailedBody);
    } finally {
      setBusy(false);
    }
  };

  /**
   * إغلاق صفقة مفتوحة بالسعر الحالي بنقرة — كان الإغلاق يقرأ خانة «خروج» العامة بأعلى النموذج فقط (المتداول
   * يغلق من الوسيط ثم يريد تسجيل ذلك فوراً بلا كتابة سعر). يُغلق عند السعر الذي يُنفَّذ عليه الإغلاق فعلاً: Bid
   * للشراء وAsk للبيع إن توفّرا، وإلا السعر. اقتباس بذري تجريبي لا يُستخدم أبداً (isRealQuote) — لا خروج مختلَق.
   * تأكيد يعرض سعر الخروج والنتيجة قبل الحفظ (سعر المزوّد قد يختلف قليلاً عن وسيطك — يمكن تعديله بعدها).
   */
  const closeAtMarket = async (tr: Trade) => {
    if (busy) return;
    setBusy(true);
    let px: number | null = null;
    try {
      const q = await api.marketQuote(tr.symbol);
      if (!mountedRef.current) return;
      if (isRealQuote(q)) {
        const sidePx = tr.side === 'sell' ? q.ask : q.bid;
        px = typeof sidePx === 'number' && Number.isFinite(sidePx) && sidePx > 0 ? sidePx : q.price;
      }
    } catch {
      px = null;
    } finally {
      if (mountedRef.current) setBusy(false);
    }
    if (!mountedRef.current) return;
    if (px == null) {
      Alert.alert(t.journalCloseFailedTitle, t.journalCloseMarketNoQuote);
      return;
    }
    const exitPx = px;
    const trSide = tr.side === 'sell' ? 'sell' : 'buy';
    const mv = realizedMove({ symbol: tr.symbol, side: trSide, entry: tr.entry, exit: exitPx });
    const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '');
    const result = mv
      ? `${mv.pips != null ? `${formatSignedPips(mv.pips)} pip · ` : ''}${sign(mv.pct)}${Math.abs(mv.pct).toFixed(2)}%`
      : '';
    Alert.alert(
      t.journalCloseMarketConfirmTitle,
      t.journalCloseMarketConfirmBody
        .replace('{side}', trSide === 'sell' ? t.dirSell : t.dirBuy)
        .replace('{symbol}', tr.symbol)
        .replace('{entry}', formatPrice(tr.entry, tr.symbol))
        .replace('{exit}', formatPrice(exitPx, tr.symbol))
        .replace('{result}', result),
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.journalCloseMarketConfirmBtn,
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                await api.closeTrade(tr.id, exitPx);
                if (!mountedRef.current) return;
                playSoftClick();
                await refresh();
              } catch {
                if (mountedRef.current) Alert.alert(t.journalCloseFailedTitle, t.journalCloseFailedBody);
              } finally {
                if (mountedRef.current) setBusy(false);
              }
            })();
          },
        },
      ]
    );
  };

  /** حذف صفقة سُجِّلت خطأً — بلا حذف كانت صفقة خاطئة واحدة تُفسد الإحصاءات للأبد (api.deleteTrade كان غير مستخدم). */
  const removeTrade = async (id: string) => {
    setBusy(true);
    try {
      await api.deleteTrade(id);
      playSoftClick();
      if (editing?.id === id) cancelEdit();
      await refresh();
    } catch {
      Alert.alert(t.alertsDeleteFailedTitle, t.journalDeleteFailedBody);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const confirmRemove = (tr: Trade) =>
    Alert.alert(
      t.journalDeleteConfirmTitle,
      `${tr.side === 'sell' ? t.dirSell : t.dirBuy} ${tr.symbol} · ${formatPrice(tr.entry, tr.symbol)}`,
      [
        { text: t.cancel, style: 'cancel' },
        { text: t.deleteWord, style: 'destructive', onPress: () => void removeTrade(tr.id) },
      ]
    );

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { textAlign: align }]}>{t.journalTitle}</Text>
      <Text style={[styles.sub, { textAlign: align }]}>{t.journalSub}</Text>

      {/* صفر صفقات مغلقة: «نسبة نجاح 0% · PnL 0% · أفضل/أسوأ 0%/0%» تُقرأ لمبتدئ كأداء سيئ وهي غياب
          بيانات — تُعرض الإحصاءات من أول صفقة مغلقة، وقبلها سطر يشرح متى تظهر. */}
      {stats && stats.trade_count === 0 && trades.length > 0 ? (
        <Text style={[styles.sub, { textAlign: align }]}>{t.journalStatsPending}</Text>
      ) : null}
      {stats && stats.trade_count > 0 ? (
        <View style={styles.stats}>
          <Text style={[styles.stat, { textAlign: align }]}>
            {t.journalStatClosed.replace('{n}', String(stats.trade_count))}
          </Text>
          <Text style={[styles.stat, { textAlign: align }]}>
            {t.journalStatWinRate.replace('{pct}', String(stats.win_rate))}
          </Text>
          <Text style={[styles.stat, { textAlign: align }]}>
            {t.journalStatTotalPnl.replace('{pct}', String(stats.total_pnl_pct))}
          </Text>
          {extraStats.pips != null ? (
            <Text style={[styles.stat, { textAlign: align }]}>
              {t.journalStatNetPips.replace('{pips}', extraStats.pips)}
            </Text>
          ) : null}
          {extraStats.pipsBySymbol != null ? (
            <Text style={[styles.stat, { textAlign: align }]}>
              {t.journalStatNetPipsBySymbol.replace('{parts}', extraStats.pipsBySymbol)}
            </Text>
          ) : null}
          {extraStats.avgR != null ? (
            <Text style={[styles.stat, { textAlign: align }]}>
              {t.journalStatAvgR.replace('{r}', extraStats.avgR).replace('{n}', String(extraStats.rN))}
            </Text>
          ) : null}
          <Text style={[styles.stat, { textAlign: align }]}>
            {t.journalStatBestWorst
              .replace('{best}', String(stats.best))
              .replace('{worst}', String(stats.worst))}
          </Text>
        </View>
      ) : null}

      {editing ? (
        <View style={styles.editBanner}>
          <Text style={[styles.editBannerText, { textAlign: align }]}>
            {t.journalEditingBanner.replace('{symbol}', editing.symbol)}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={cancelEdit}
            accessibilityLabel={t.journalCancelEdit}
            hitSlop={8}
          >
            <Text style={[styles.closeLink, { textAlign: align }]}>{t.journalCancelEdit}</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={[styles.row, rtl && styles.rowRtl]}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.chip,
            side === 'buy' && styles.chipOn,
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          onPress={() => setSide('buy')}
          accessibilityLabel={`${t.journalSideA11yPrefix}: ${t.dirBuy}`}
        >
          <Text style={[styles.chipText, side === 'buy' && styles.chipTextOn]}>{t.dirBuy}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.chip,
            side === 'sell' && styles.chipOn,
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          onPress={() => setSide('sell')}
          accessibilityLabel={`${t.journalSideA11yPrefix}: ${t.dirSell}`}
        >
          <Text style={[styles.chipText, side === 'sell' && styles.chipTextOn]}>{t.dirSell}</Text>
        </Pressable>
      </View>
      <View style={[styles.qChips, rtl && styles.rowRtl]}>
        {QUICK_SYMBOLS.map((q) => {
          const on = symbol.trim().toUpperCase() === q;
          return (
            <Pressable
              key={q}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [
                styles.qChip,
                on && styles.chipOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => {
                setSymbol(q);
                setFormError(null);
              }}
              accessibilityLabel={`${t.journalSymbolA11y}: ${q}`}
            >
              <Text style={[styles.qChipText, on && styles.chipTextOn]}>{q}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        style={[styles.input, { textAlign: align }]}
        value={symbol}
        onChangeText={setSymbol}
        placeholder={t.journalSymbolPlaceholder}
        placeholderTextColor={colors.textDim}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
        underlineColorAndroid="transparent"
        clearButtonMode="while-editing"
        keyboardAppearance="dark"
        selectionColor={colors.accent}
        accessibilityLabel={t.journalSymbolA11y}
      />
      <TextInput
        style={[styles.input, { textAlign: align }]}
        value={entry}
        onChangeText={setEntry}
        placeholder={t.journalEntryPlaceholder}
        keyboardType="decimal-pad"
        maxLength={12}
        placeholderTextColor={colors.textDim}
        returnKeyType="done"
        underlineColorAndroid="transparent"
        clearButtonMode="while-editing"
        keyboardAppearance="dark"
        selectionColor={colors.accent}
        accessibilityLabel={t.journalEntryA11y}
      />
      <View style={[styles.qChips, rtl && styles.rowRtl]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: quoteBusy, busy: quoteBusy }}
          disabled={quoteBusy}
          style={({ pressed }) => [
            styles.qChip,
            quoteBusy && { opacity: 0.5 },
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          onPress={() => void fillLivePrice()}
          accessibilityLabel={t.journalUseLivePriceA11y}
        >
          <Text style={styles.qChipText}>{quoteBusy ? '...' : t.journalUseLivePrice}</Text>
        </Pressable>
      </View>
      <TextInput
        style={[styles.input, { textAlign: align }]}
        value={exit}
        onChangeText={setExit}
        placeholder={t.journalExitPlaceholder}
        keyboardType="decimal-pad"
        maxLength={12}
        placeholderTextColor={colors.textDim}
        returnKeyType="done"
        underlineColorAndroid="transparent"
        clearButtonMode="while-editing"
        keyboardAppearance="dark"
        selectionColor={colors.accent}
        accessibilityLabel={t.journalExitA11y}
      />
      <View style={[styles.row, rtl && styles.rowRtl]}>
        <TextInput
          style={[styles.input, styles.inputHalf, { textAlign: align }]}
          value={sl}
          onChangeText={(v) => {
            setSl(v);
            setFormError(null);
          }}
          placeholder={t.journalSlPlaceholder}
          keyboardType="decimal-pad"
          maxLength={12}
          placeholderTextColor={colors.textDim}
          returnKeyType="done"
          underlineColorAndroid="transparent"
          keyboardAppearance="dark"
          selectionColor={colors.bear}
          accessibilityLabel={t.journalSlPlaceholder}
        />
        <TextInput
          style={[styles.input, styles.inputHalf, { textAlign: align }]}
          value={tp}
          onChangeText={(v) => {
            setTp(v);
            setFormError(null);
          }}
          placeholder={t.journalTpPlaceholder}
          keyboardType="decimal-pad"
          maxLength={12}
          placeholderTextColor={colors.textDim}
          returnKeyType="done"
          underlineColorAndroid="transparent"
          keyboardAppearance="dark"
          selectionColor={colors.bull}
          accessibilityLabel={t.journalTpPlaceholder}
        />
      </View>
      {draft?.issue ? (
        <Text style={[styles.formError, { textAlign: align }]}>{planIssueText(draft.issue)}</Text>
      ) : draft?.plan?.ok ? (
        <>
          <Text style={[styles.planLine, { textAlign: align }]}>{planSummary(draft.plan)}</Text>
          {draft.plan.rr != null && draft.plan.rr < 1 ? (
            <Text style={[styles.planWarn, { textAlign: align }]}>{t.planLowRR}</Text>
          ) : null}
        </>
      ) : draft?.plan?.issue === 'slTooClose' ? (
        // تحذير لا يمنع الحفظ: اليومية تسجّل ما حدث فعلاً
        <Text style={[styles.planWarn, { textAlign: align }]}>⚠ {t.planSlTooClose}</Text>
      ) : null}
      <TextInput
        style={[styles.input, { textAlign: align }]}
        value={note}
        onChangeText={setNote}
        placeholder={t.journalNotePlaceholder}
        placeholderTextColor={colors.textDim}
        returnKeyType="done"
        underlineColorAndroid="transparent"
        clearButtonMode="while-editing"
        keyboardAppearance="dark"
        selectionColor={colors.accent}
        accessibilityLabel={t.journalNoteA11y}
      />
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.btn,
          busy && styles.btnDisabled,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={() => void add()}
        disabled={busy}
        accessibilityState={{ disabled: busy }}
        accessibilityLabel={editing ? t.journalSaveEditBtn : t.journalAddA11y}
        hitSlop={8}
      >
        <Text style={styles.btnText}>{busy ? '...' : editing ? t.journalSaveEditBtn : t.journalAddBtn}</Text>
      </Pressable>
      {formError ? <Text style={[styles.formError, { textAlign: align }]}>{formError}</Text> : null}

      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {!loading && trades.length === 0 ? (
        <Text style={[styles.empty, { textAlign: align }]}>
          {listError ? t.journalLoadError : t.journalEmpty}
        </Text>
      ) : null}
      <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
        {trades.map((tr) => (
          <View key={tr.id} style={styles.trade}>
            <Text style={[styles.tradeMain, { textAlign: align }]}>
              {/* الاتجاه بلا لبس: سهم ولون وكلمة مترجمة بدل "BUY"/"SELL" اللاتينية */}
              <Text style={{ color: tr.side === 'sell' ? colors.bear : colors.bull }}>
                {tr.side === 'sell' ? `▼ ${t.dirSell}` : `▲ ${t.dirBuy}`}
              </Text>{' '}
              {tr.symbol} · {formatPrice(tr.entry, tr.symbol)}
              {tr.exit != null ? ` → ${formatPrice(tr.exit, tr.symbol)}` : ` ${t.journalOpenSuffix}`}
            </Text>
            {tr.sl != null || tr.tp != null ? (
              <Text style={[styles.tradeMeta, { textAlign: align }]}>
                {tr.sl != null ? <Text style={{ color: colors.bear }}>SL {formatPrice(tr.sl, tr.symbol)}</Text> : null}
                {tr.sl != null && tr.tp != null ? ' · ' : ''}
                {tr.tp != null ? <Text style={{ color: colors.bull }}>TP {formatPrice(tr.tp, tr.symbol)}</Text> : null}
                {(() => {
                  if (tr.sl == null || tr.tp == null) return '';
                  const plan = analyzePlan({
                    symbol: tr.symbol,
                    side: tr.side === 'sell' ? 'sell' : 'buy',
                    entry: tr.entry,
                    sl: tr.sl,
                    tp: tr.tp,
                  });
                  return plan.ok ? ` · R:R ${formatRR(plan.rr)}` : '';
                })()}
                {(() => {
                  const r = formatR(
                    realizedR({ side: tr.side === 'sell' ? 'sell' : 'buy', entry: tr.entry, sl: tr.sl, exit: tr.exit })
                  );
                  return r ? ` · ${t.journalResultR.replace('{r}', r)}` : '';
                })()}
              </Text>
            ) : null}
            {/* الحالة كانت كلمة إنجليزية خام («closed»/«open») والنتيجة «PnL x%» بلا لون — وكانت «% × الحجم»
                من الباك-إند. الآن: «مغلقة · +25 pip · +0.23%» بلون الربح/الخسارة من الدخول/الخروج مباشرة؛
                المفتوحة لا تكرّر الحالة (السطر الأول يقول «(مفتوحة)»). */}
            {(() => {
              const mv =
                tr.status === 'closed'
                  ? realizedMove({
                      symbol: tr.symbol,
                      side: tr.side === 'sell' ? 'sell' : 'buy',
                      entry: tr.entry,
                      exit: tr.exit,
                    })
                  : null;
              const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '');
              const pips = mv ? formatPips(mv.pips == null ? null : Math.abs(mv.pips)) : null;
              const result = mv
                ? `${pips != null ? `${sign(mv.pips ?? 0)}${pips} pip · ` : ''}${sign(mv.pct)}${Math.abs(mv.pct).toFixed(2)}%`
                : '';
              if (tr.status !== 'closed' && !tr.note) return null;
              return (
                <Text style={[styles.tradeMeta, { textAlign: align }]}>
                  {tr.status === 'closed' ? t.journalClosedWord : ''}
                  {result ? (
                    <Text style={{ color: mv && mv.pct < 0 ? colors.bear : mv && mv.pct > 0 ? colors.bull : colors.textDim, fontWeight: '700' }}>
                      {` · ${result}`}
                    </Text>
                  ) : null}
                  {tr.note ? `${tr.status === 'closed' ? ' · ' : ''}${tr.note}` : ''}
                </Text>
              );
            })()}
            <View style={[styles.tradeActions, rtl && styles.rowRtl]}>
              {tr.status === 'open' ? (
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    busy && styles.closeLinkDisabled,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() => void closeAtMarket(tr)}
                  disabled={busy}
                  accessibilityState={{ disabled: busy }}
                  accessibilityLabel={t.journalCloseMarketA11y.replace('{symbol}', tr.symbol)}
                  hitSlop={8}
                >
                  <Text style={[styles.closeLink, { textAlign: align }]}>{t.journalCloseMarketBtn}</Text>
                </Pressable>
              ) : null}
              {tr.status === 'open' ? (
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    (busy || editing != null) && styles.closeLinkDisabled,
                    pressed && {
                      opacity: buttons.pressedOpacity,
                      transform: [{ scale: buttons.pressedScale }],
                    },
                  ]}
                  onPress={() => void closeOpen(tr.id)}
                  // أثناء التعديل خانة الخروج تخصّ الصفقة المعدَّلة — الإغلاق منها كان سيغلق صفقة أخرى بسعرها
                  disabled={busy || editing != null}
                  accessibilityState={{ disabled: busy || editing != null }}
                  accessibilityLabel={t.journalCloseLinkA11y.replace('{symbol}', tr.symbol)}
                  hitSlop={8}
                >
                  <Text style={[styles.closeLink, { textAlign: align }]}>{t.journalCloseLinkBtn}</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy, selected: editing?.id === tr.id }}
                style={({ pressed }) => [
                  busy && styles.closeLinkDisabled,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => startEdit(tr)}
                disabled={busy}
                accessibilityLabel={t.journalEditA11y.replace('{symbol}', tr.symbol)}
                hitSlop={8}
              >
                <Text style={styles.closeLink}>{t.journalEditBtn}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  busy && styles.closeLinkDisabled,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => confirmRemove(tr)}
                disabled={busy}
                accessibilityState={{ disabled: busy }}
                accessibilityLabel={t.journalDeleteA11y.replace('{symbol}', tr.symbol)}
                hitSlop={8}
              >
                <Text style={styles.delLink}>{t.deleteWord}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { color: colors.text, fontWeight: '900', fontSize: 16, textAlign: 'right' },
  sub: { color: colors.textDim, fontSize: 11, textAlign: 'right' },
  stats: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 3,
  },
  stat: { color: colors.text, textAlign: 'right', fontWeight: '600', fontSize: 12 },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowRtl: { flexDirection: 'row-reverse' },
  chip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { color: colors.textMuted, fontWeight: '700' },
  chipTextOn: { color: colors.accent },
  qChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  qChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qChipText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  input: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 10,
    textAlign: 'right',
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  btnText: { color: colors.onAccent, fontWeight: '800' },
  btnDisabled: { opacity: 0.4 },
  formError: {
    color: colors.bear,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  empty: { color: colors.textDim, textAlign: 'right', marginTop: spacing.sm, fontSize: 12 },
  trade: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    gap: 2,
  },
  tradeMain: { color: colors.text, textAlign: 'right', fontWeight: '700', fontSize: 12 },
  tradeMeta: { color: colors.textDim, textAlign: 'right', fontSize: 11 },
  inputHalf: { flex: 1 },
  planLine: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  planWarn: { color: colors.warn, fontSize: 11, fontWeight: '700' },
  closeLink: { color: colors.accent, textAlign: 'right', fontSize: 11, fontWeight: '700' },
  closeLinkDisabled: { opacity: 0.4 },
  tradeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  delLink: { color: colors.bear, fontSize: 11, fontWeight: '700' },
  editBanner: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: 8,
    gap: 4,
  },
  editBannerText: { color: colors.text, fontSize: 11, fontWeight: '700' },
});
