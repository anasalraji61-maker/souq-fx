import React, { useEffect, useState } from 'react';
import { View, TextInput, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { api } from '../api';
import { addCustomSymbol } from '../chart/watchlistStore';

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

export function SymbolSearchBar({ onPick, placeholder = 'بحث رمز... EUR, XAU, BTC' }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  /** وضوح الحالة: يميّز فشل البحث فعلياً عن "لا نتائج مطابقة" حتى لا يظن المستخدم أن الرمز غير موجود */
  const [error, setError] = useState(false);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setError(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.symbolSearch(query);
        setResults(res.results);
        setError(false);
      } catch {
        setResults([]);
        setError(true);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        value={q}
        onChangeText={setQ}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="search"
        underlineColorAndroid="transparent"
        clearButtonMode="while-editing"
        keyboardAppearance="dark"
        selectionColor={colors.accent}
        accessibilityLabel={placeholder}
      />
      {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 6 }} /> : null}
      {!loading && error ? <Text style={styles.error}>تعذر البحث — تحقق من الاتصال وحاول مرة أخرى</Text> : null}
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
        >
          <Text style={styles.sym}>{r.symbol}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {r.name} · {r.exchange}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: 'right',
    fontSize: 13,
  },
  row: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  sym: { color: colors.accent, fontWeight: '800', textAlign: 'right' },
  name: { color: colors.textDim, fontSize: 11, textAlign: 'right' },
  error: {
    color: colors.bear,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 4,
  },
});
