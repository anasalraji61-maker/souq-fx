import React, { useEffect, useState } from 'react';
import { View, TextInput, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { api } from '../api';
import { addCustomSymbol } from '../chart/watchlistStore';
import { useI18n } from '../i18n/I18nContext';

type Result = {
  symbol: string;
  td_symbol: string;
  name: string;
  exchange: string;
  type: string;
};

type Props = {
  onPick: (symbol: string) => void;
  placeholder?: string;
};

export function SymbolSearchBar({ onPick, placeholder }: Props) {
  /**
   * `rtl` لم تكن تُقرأ بهذا الملف أصلاً: خانة البحث ونتائجها ورسالة الخطأ كلها `textAlign: 'right'`
   * ثابتة بالأنماط. فمتداول الإنجليزية يكتب «XAU» بخانة محاذاة نصّها لليمين، ويقرأ رمز كل نتيجة
   * واسمها ملتصقَين بالحافة المقابلة لقراءته — وهذا أول ما يفعله ليبدّل الزوج. نفس صنف علّة
   * `SymbolSnapshot` (069fd0d) و`ScreenerMini` (46d45e4)؛ سلوك العربية لا يتغيّر بحرف.
   */
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const ph = placeholder ?? t.ssbPlaceholder;
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  /** وضوح الحالة: يميّز فشل البحث فعلياً عن "لا نتائج مطابقة" حتى لا يظن المستخدم أن الرمز غير موجود */
  const [error, setError] = useState(false);
  /**
   * النصّ الذي عادت له `results` فعلاً — «لا نتيجة» تُعرض فقط حين يكون البحث عن النصّ الحالي قد اكتمل
   * فارغاً، لا أثناء مهلة الكتابة (350ms) ولا بنتائج نصّ سابق. بلاه كان البحث الناجح بلا نتيجة لا يعرض
   * شيئاً فيُظنّ أن البحث لم يعمل (launch135).
   */
  const [searchedQ, setSearchedQ] = useState('');

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setError(false);
      setSearchedQ('');
      return;
    }
    // حارس "alive" يمنع تحديث الحالة بعد إلغاء تركيب الشريط أو تغيّر نص البحث لاحقاً — يشمل
    // حالة إطلاق المؤقت قبل الإلغاء (clearTimeout لا يوقف طلباً بدأ فعلياً) — نفس مبدأ
    // ChartFrame/SymbolSnapshot المؤسَّس بالكود.
    let alive = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.symbolSearch(query);
        if (alive) {
          setResults(res.results);
          setError(false);
          setSearchedQ(query);
        }
      } catch {
        if (alive) {
          setResults([]);
          setError(true);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }, 350);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q]);

  return (
    <View style={styles.wrap}>
      <TextInput
        style={[styles.input, { textAlign: align }]}
        value={q}
        onChangeText={setQ}
        placeholder={ph}
        placeholderTextColor={colors.textDim}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="search"
        underlineColorAndroid="transparent"
        clearButtonMode="while-editing"
        keyboardAppearance="dark"
        selectionColor={colors.accent}
        accessibilityLabel={ph}
      />
      {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 4 }} /> : null}
      {!loading && error ? <Text style={[styles.error, { textAlign: align }]}>{t.ssbError}</Text> : null}
      {!loading && !error && results.length === 0 && searchedQ !== '' && searchedQ === q.trim() ? (
        <Text style={[styles.noMatch, { textAlign: align }]} accessibilityLiveRegion="polite">
          {t.ssbNoMatch.replace('{q}', searchedQ)}
        </Text>
      ) : null}
      {results.slice(0, 8).map((r) => (
        <Pressable
          accessibilityRole="button"
          key={`${r.symbol}-${r.exchange}`}
          style={({ pressed }) => [
            styles.row,
            pressed && {
              opacity: buttons.pressedOpacity,
              transform: [{ scale: buttons.pressedScale }],
            },
          ]}
          onPress={() => {
            void addCustomSymbol(r.symbol);
            onPick(r.symbol);
          }}
          accessibilityLabel={`${t.ssbPickA11yPrefix}${r.symbol} · ${r.name}`}
        >
          <Text style={[styles.sym, { textAlign: align }]}>{r.symbol}</Text>
          <Text style={[styles.name, { textAlign: align }]} numberOfLines={1}>
            {r.name} · {r.exchange}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: spacing.sm,
    fontSize: 13,
  },
  row: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  sym: { color: colors.accent, fontWeight: '500' },
  name: { color: colors.textDim, fontSize: 11 },
  error: {
    color: colors.bear,
    fontSize: 10,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  /** كسطر الخطأ لكن بلون هادئ — «لا نتيجة» ليست فشلاً. */
  noMatch: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
});
