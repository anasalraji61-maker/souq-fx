import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radii, spacing, numeric } from '../theme';
import { formatPrice } from '../chart/math';
import { formatPriceDiff } from '../chart/indicators/utils';
import { isRealQuote } from '../chart/dataSource';
import { quoteBookValid, quoteSpreadPips } from '../positionSize';
import { chartPipSpec } from '../chart/pipSpec';
import { pipUnit } from '../chart/measureReadout';
import { useStickyPriceRef } from '../chart/useStickyPriceRef';
import { api } from '../api';
import { formatLocalStamp } from '../localStamp';
import { useI18n } from '../i18n/I18nContext';

type Props = {
  symbol?: string;
};

type Quote = { price: number; bid: number | null; ask: number | null; asOf: number | null; marketOpen: boolean | null };

/** تحديث الاقتباس — كان يُطلب مع كل تيك (`last`)؛ 15ث كافية لسبريد يتغيّر ببطء. */
const REFRESH_MS = 15_000;

/**
 * Bid/Ask والسبريد الحقيقيان للرمز. كانت هذه اللوحة «DOM · عمق السوق» تعرض 12 مستوى بأحجام مولَّدة
 * بمعادلة (`1800/المسافة × نمط شبه عشوائي`) — حتى تحت وسم «من Quote» — فيقرؤها المتداول كأوامر
 * حقيقية. الفوركس سوق لا مركزي (OTC): لا عمق موحَّد يمكن عرضه، والمفيد فعلاً للمتداول الفردي هو
 * السعر الحي والسبريد بالـpip. لا أرقام إن لم يكن الاقتباس حقيقياً (`isRealQuote`).
 */
export function DomLitePanel({ symbol = 'EURUSD' }: Props) {
  const { t, rtl, lang } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'none'>('loading');

  useEffect(() => {
    let alive = true;
    setQuote(null);
    setState('loading');
    const load = () => {
      api
        .marketQuote(symbol)
        .then((q) => {
          if (!alive) return;
          if (isRealQuote(q)) {
            setQuote({
              price: q.price,
              bid: q.bid ?? null,
              ask: q.ask ?? null,
              asOf: typeof q.as_of === 'number' && Number.isFinite(q.as_of) ? q.as_of : null,
              marketOpen: typeof q.market_open === 'boolean' ? q.market_open : null,
            });
            setState('ok');
          } else {
            setQuote(null);
            setState('none');
          }
        })
        .catch(() => {
          if (!alive) return;
          setQuote(null);
          setState('none');
        });
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [symbol]);

  // chart-r116a: مرجع منازل واحد ثابت للّوحة كلّها (Bid/Ask وسطر السعر بلا دفتر) — كان سطر السعر بلا مرجع
  // فيطبع لرمز بلا مواصفة قرب 1/10/100 منازل غير منازل Bid/Ask، ويقفز عند عبور الحدّ.
  const priceRef = useStickyPriceRef(symbol, quote ? (quote.bid ?? quote.price) : null);
  // `quoteBookValid` كرأس الطرفية: يرفض أيضاً bid/ask غير المنتهيين (NaN كان يمرّ بلا مقارنة صريحة).
  const hasBook = quote != null && quoteBookValid(quote.bid, quote.ask);
  let spreadText: string | null = null;
  if (hasBook) {
    // الحساب نفسه برأس الطرفية (`quoteSpreadPips`) — كان منسوخاً هنا فيتباعد التقريب بين اللوحين.
    // chart-r56: `chartPipSpec` — «USDJPYc»/«XAUUSDm»/«EURUSD.pro» كانت بلا مواصفة فتطبع الفرق خاماً «0.015».
    const pips = quoteSpreadPips(symbol, quote!.bid, quote!.ask, chartPipSpec);
    // chart-r48: بلا مواصفة pip ⇒ منازل **السعر** لا حجم السبريد (BTCUSD كان «12.500» بجانب «67420.50»).
    spreadText =
      pips != null ? `${pips.toFixed(1)} ${pipUnit(lang)}` : formatPriceDiff(quote!.ask! - quote!.bid!, quote!.bid!, symbol, priceRef);
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { textAlign: align }]}>{t.domTitle}</Text>
      {state === 'loading' ? <ActivityIndicator color={colors.accent} style={{ paddingVertical: spacing.md }} /> : null}
      {state === 'none' ? (
        <Text style={[styles.warn, { textAlign: align }]}>{t.domNoLiveQuote}</Text>
      ) : null}
      {state === 'ok' && hasBook ? (
        <>
          {/* المرجع نفسه للطرفين (`priceRef`) كرأس الطرفية: نفط حول 100 كان «99.950» بجانب «100.05» */}
          <View style={[styles.row, rtl && styles.rowRtl]}>
            <View style={styles.cell}>
              <Text style={styles.label}>{t.domBidLabel}</Text>
              <Text style={[styles.value, styles.bid]}>{formatPrice(quote!.bid!, symbol, priceRef)}</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.label}>{t.domSpreadLabel}</Text>
              <Text style={[styles.value, styles.spread]}>{spreadText}</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.label}>{t.domAskLabel}</Text>
              <Text style={[styles.value, styles.ask]}>{formatPrice(quote!.ask!, symbol, priceRef)}</Text>
            </View>
          </View>
          <Text style={[styles.sub, { textAlign: align }]}>{t.domBidAskHint}</Text>
        </>
      ) : null}
      {state === 'ok' && !hasBook ? (
        <>
          <Text style={[styles.value, styles.spread, { textAlign: align }]}>
            {formatPrice(quote!.price, symbol, priceRef)}
          </Text>
          {/* بلا Bid/Ask يردّ الخادم إغلاق آخر شمعة (حتى 15د كاشاً، أو إغلاق الجمعة بالعطلة) — كان يُطبع بلا
              وقت فيُقرأ سعراً حالياً. وقته دائماً، و«السوق مغلق» حين يقولها الخادم. */}
          {quote!.asOf != null || quote!.marketOpen === false ? (
            <Text style={[styles.sub, styles.asOf, { textAlign: align }]}>
              {[
                quote!.marketOpen === false ? t.dsMarketClosed : null,
                quote!.asOf != null ? t.screenerPriceAsOf.replace('{time}', formatLocalStamp(quote!.asOf, lang)) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : null}
          <Text style={[styles.sub, { textAlign: align }]}>{t.domNoBidAsk}</Text>
        </>
      ) : null}
      <Text style={[styles.sub, { textAlign: align }]}>{t.domOtcNote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: { color: colors.text, fontWeight: '500', fontSize: 13 },
  sub: { color: colors.textDim, fontSize: 11 },
  asOf: { ...numeric, color: colors.warn },
  warn: { color: colors.warn, fontSize: 12, fontWeight: '500', paddingVertical: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  rowRtl: { flexDirection: 'row-reverse' },
  cell: { flex: 1, alignItems: 'center', gap: 4 },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  value: { ...numeric, fontSize: 15, fontWeight: '600' },
  // DESIGN-PRO §1: الأخضر/الأحمر لاتجاه السعر وحده — Bid/Ask طرفا الاقتباس لا حركة، فالتسمية تميّزهما لا اللون.
  bid: { color: colors.text },
  ask: { color: colors.text },
  spread: { color: colors.text },
});
