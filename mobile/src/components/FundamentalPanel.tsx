import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { api } from '../api';
import { useI18n } from '../i18n/I18nContext';

type Ev = { id: string; title: string; currency: string; impact: string; ts?: number | null; forecast_value?: string; previous?: string; actual?: string };
type L3 = { ar: string; en: string; ku: string };

/** What moves each currency, in plain words (our own text — not news headlines). */
const DRIVERS: Record<string, L3> = {
  USD: {
    ar: 'يتحرك الدولار بقرارات الفيدرالي الأمريكي للفائدة، وبتقرير الوظائف NFP، وبالتضخم CPI. بيانات أقوى من المتوقع تدعم الدولار عادةً.',
    en: 'The dollar moves with Federal Reserve rate decisions, the NFP jobs report and CPI inflation. Data stronger than expected usually supports it.',
    ku: 'دۆلار بە بڕیاری ڕێژەی سوودی فیدراڵ، ڕاپۆرتی NFP و ڕێژەی هەڵاوسان CPI دەجووڵێت. داتای بەهێزتر لە چاوەڕوان زۆرجار پشتگیری دەکات.',
  },
  EUR: {
    ar: 'اليورو يتأثر بقرارات البنك المركزي الأوروبي وبتضخم منطقة اليورو وبمؤشرات PMI الألمانية والأوروبية.',
    en: 'The euro reacts to European Central Bank decisions, eurozone inflation and the German and eurozone PMI surveys.',
    ku: 'یۆرۆ کاریگەر دەبێت بە بڕیارەکانی بانکی ناوەندی ئەورووپا، هەڵاوسانی ناوچەی یۆرۆ و PMI.',
  },
  GBP: {
    ar: 'الجنيه يتحرك ببنك إنجلترا وبيانات التضخم والوظائف البريطانية وقراءات الناتج المحلي.',
    en: 'The pound moves with the Bank of England, UK inflation, jobs data and GDP readings.',
    ku: 'پاوەند بە بانکی ئینگلتەرا، هەڵاوسان، داتای کار و GDP دەجووڵێت.',
  },
  JPY: {
    ar: 'الين يتأثر بسياسة بنك اليابان (الفائدة المنخفضة جداً) وبفروق العائد مع أمريكا، ويرتفع غالباً حين تخاف الأسواق.',
    en: "The yen follows Bank of Japan policy (very low rates), the yield gap with the US, and often rises when markets are fearful.",
    ku: 'یەن بە سیاسەتی بانکی یابان و جیاوازی سوود لەگەڵ ئەمریکا دەجووڵێت و لە کاتی ترسی بازاڕ زۆرجار بەرز دەبێتەوە.',
  },
  AUD: { ar: 'الأسترالي يتأثر ببنك أستراليا الاحتياطي وبأسعار السلع وبيانات الصين.', en: 'The Australian dollar follows the RBA, commodity prices and Chinese data.', ku: 'دۆلاری ئوسترالی بە بانکی ئوسترالیا، نرخی کەرەستە و داتای چین دەجووڵێت.' },
  CAD: { ar: 'الكندي يتأثر ببنك كندا وبسعر النفط.', en: 'The Canadian dollar follows the Bank of Canada and oil prices.', ku: 'دۆلاری کەنەدی بە بانکی کەنەدا و نرخی نەوت دەجووڵێت.' },
  CHF: { ar: 'الفرنك ملاذ آمن يتأثر بالبنك الوطني السويسري ويقوى وقت الذعر.', en: 'The franc is a safe haven, driven by the Swiss National Bank and strong in times of panic.', ku: 'فرەنک پەناگەیەکی ئارامە و بە بانکی نیشتمانی سویسرا دەجووڵێت.' },
  NZD: { ar: 'النيوزلندي يتأثر ببنك نيوزلندا الاحتياطي وأسعار الألبان.', en: 'The New Zealand dollar follows the RBNZ and dairy prices.', ku: 'دۆلاری نیوزلەندی بە بانکی نیوزلەندا و نرخی شیر دەجووڵێت.' },
  XAU: {
    ar: 'الذهب يتحرك عكس الدولار غالباً، ويتأثر بعوائد السندات الأمريكية والفائدة والتضخم والتوتر الجيوسياسي.',
    en: 'Gold usually moves against the dollar and reacts to US bond yields, interest rates, inflation and geopolitical tension.',
    ku: 'زێڕ زۆرجار پێچەوانەی دۆلار دەجووڵێت و بە سوودی بەندەکانی ئەمریکا، هەڵاوسان و گرژی جیۆپۆلەتیکی کاریگەر دەبێت.',
  },
};

const COPY = {
  title: { ar: 'التحليل الأساسي', en: 'Fundamental analysis', ku: 'شیکاری بنەڕەتی' },
  sub: { ar: 'ما الذي يحرّك عملات هذا الرمز، وما أقرب خبر اقتصادي مهم', en: 'What moves this symbol’s currencies, and the next important economic release', ku: 'چی دراوەکانی ئەم هێمایە دەجوڵێنێت و نزیکترین ڕووداوی ئابووری' },
  next: { ar: 'أقرب خبر مهم', en: 'Next important release', ku: 'نزیکترین ڕووداوی گرنگ' },
  none: { ar: 'لا خبر مهم قريب خلال 48 ساعة', en: 'No important release in the next 48 hours', ku: 'هیچ ڕووداوی گرنگ لە 48 کاتژمێری داهاتوودا نییە' },
  loading: { ar: 'جارٍ تحميل التقويم…', en: 'Loading the calendar…', ku: 'تەقویم بار دەکرێت…' },
  unavailable: { ar: 'التقويم غير متاح الآن', en: 'Calendar unavailable right now', ku: 'تەقویم ئێستا بەردەست نییە' },
  forecast: { ar: 'المتوقع', en: 'Forecast', ku: 'چاوەڕوان' },
  previous: { ar: 'السابق', en: 'Previous', ku: 'پێشوو' },
  inWord: { ar: 'بعد', en: 'in', ku: 'دوای' },
  nowWord: { ar: 'الآن', en: 'now', ku: 'ئێستا' },
  how: { ar: 'كيف تقرأ الخبر', en: 'How to read a release', ku: 'چۆن ڕووداوەکە بخوێنیتەوە' },
  rules: {
    ar: '١) الرقم الفعلي مقابل المتوقع هو ما يحرّك السعر، لا الرقم وحده. ٢) الخبر القوي يوسّع السبريد ويقفز بالسعر: لا تفتح صفقة قبله بدقائق. ٣) انتظر إغلاق شمعة بعد الخبر ثم اقرأ الاتجاه. هذا شرح تعليمي وليس نصيحة استثمارية.',
    en: '1) Actual versus forecast moves price, not the number alone. 2) A strong release widens spreads and spikes price: do not open a trade minutes before it. 3) Wait for a closed candle after the release, then read direction. Educational only — not investment advice.',
    ku: '١) ژمارەی ڕاستەقینە بەراورد بە چاوەڕوان نرخ دەجوڵێنێت. ٢) ڕووداوی بەهێز سپرێد فراوان دەکات: چەند خولەکێک پێش ئەوە مامەڵە مەکەوە. ٣) چاوەڕێی داخرانی مۆمێک بکە پاشان ئاراستە بخوێنەوە. تەنها فێرکارییە.',
  },
} satisfies Record<string, L3>;

function currenciesOf(symbol: string): string[] {
  const s = symbol.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.startsWith('XAU') || s.startsWith('XAG')) return ['XAU', 'USD'];
  if (s.length >= 6) return [s.slice(0, 3), s.slice(3, 6)];
  return ['USD'];
}

export function FundamentalPanel({ symbol }: { symbol: string }) {
  const { rtl, lang } = useI18n();
  const k: keyof L3 = lang === 'ar' ? 'ar' : lang === 'ku' ? 'ku' : 'en';
  const align = rtl ? ('right' as const) : ('left' as const);
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [bad, setBad] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .calendar()
        .then((r) => {
          if (!alive) return;
          if (r.status === 'unavailable') setBad(true);
          else {
            setBad(false);
            setEvents(r.events);
          }
        })
        .catch(() => alive && setBad(true));
    load();
    const a = setInterval(load, 5 * 60 * 1000);
    const b = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => {
      alive = false;
      clearInterval(a);
      clearInterval(b);
    };
  }, []);

  const ccys = useMemo(() => currenciesOf(symbol), [symbol]);

  const nextFor = (ccy: string): Ev | null => {
    const code = ccy === 'XAU' ? 'USD' : ccy;
    const list = (events ?? [])
      .filter((e) => e.currency === code && (e.impact === 'high' || e.impact === 'medium') && typeof e.ts === 'number' && (e.ts as number) * 1000 > now - 15 * 60 * 1000 && (e.ts as number) * 1000 < now + 48 * 3600 * 1000)
      .sort((a, b) => (a.ts as number) - (b.ts as number));
    return list[0] ?? null;
  };

  const count = (ts: number) => {
    const d = ts * 1000 - now;
    if (d <= 60_000) return COPY.nowWord[k];
    const m = Math.floor(d / 60_000);
    const h = Math.floor(m / 60);
    return `${COPY.inWord[k]} ${h > 0 ? `${h}h ` : ''}${m % 60}m`;
  };

  return (
    <View style={styles.box}>
      <Text style={[styles.title, { textAlign: align }]}>{COPY.title[k]}</Text>
      <Text style={[styles.sub, { textAlign: align }]}>{COPY.sub[k]}</Text>
      {ccys.map((c) => {
        const ev = nextFor(c);
        return (
          <View key={c} style={styles.card}>
            <Text style={[styles.ccy, { textAlign: align }]}>{c === 'XAU' ? 'XAU · Gold' : c}</Text>
            <Text style={[styles.body, { textAlign: align }]}>{(DRIVERS[c] ?? DRIVERS.USD)[k]}</Text>
            <Text style={[styles.label, { textAlign: align }]}>{COPY.next[k]}</Text>
            {events === null && !bad ? (
              <Text style={[styles.dim, { textAlign: align }]}>{COPY.loading[k]}</Text>
            ) : bad && events === null ? (
              <Text style={[styles.dim, { textAlign: align }]}>{COPY.unavailable[k]}</Text>
            ) : ev ? (
              <View>
                <Text style={[styles.evTitle, { textAlign: align }]}>
                  {ev.title} · {ev.impact === 'high' ? '●●●' : '●●'} · {count(ev.ts as number)}
                </Text>
                {ev.forecast_value || ev.previous ? (
                  <Text style={[styles.dim, { textAlign: align }]}>
                    {ev.forecast_value ? `${COPY.forecast[k]}: ${ev.forecast_value}   ` : ''}
                    {ev.previous ? `${COPY.previous[k]}: ${ev.previous}` : ''}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={[styles.dim, { textAlign: align }]}>{COPY.none[k]}</Text>
            )}
          </View>
        );
      })}
      <View style={styles.card}>
        <Text style={[styles.ccy, { textAlign: align }]}>{COPY.how[k]}</Text>
        <Text style={[styles.body, { textAlign: align }]}>{COPY.rules[k]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm, backgroundColor: colors.bgElevated, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
  sub: { color: colors.textDim, fontSize: 11.5 },
  card: { backgroundColor: colors.bgPanel, borderRadius: radii.sm ?? 8, padding: spacing.sm, gap: 4, borderWidth: 1, borderColor: colors.borderSoft },
  ccy: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  body: { color: colors.textMuted, fontSize: 12.5, lineHeight: 19 },
  label: { color: colors.warmAccent, fontSize: 11.5, fontWeight: '600', marginTop: 4 },
  evTitle: { color: colors.text, fontSize: 12.5, fontWeight: '600' },
  dim: { color: colors.textDim, fontSize: 12 },
});
