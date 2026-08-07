import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { colors, radii, spacing } from '../theme';
import { api } from '../api';

type Turn = { role: 'user' | 'ai'; text: string; win?: number };

export function AiPanel() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: 'ai',
      text: 'أنا خبير تداول MATRIX. اسأل عن تحليل، سيناريو صفقة، إدارة مخاطر، أو علاقة الزوج بـ DXY.',
    },
  ]);

  const ask = async () => {
    const question = q.trim();
    if (!question || loading) return;
    setQ('');
    setTurns((t) => [...t, { role: 'user', text: question }]);
    setLoading(true);
    try {
      const res = await api.aiAsk(question, 'EURUSD');
      setTurns((t) => [
        ...t,
        {
          role: 'ai',
          text: res.answer.replace(/\*\*/g, ''),
          win: res.setup.win_probability,
        },
      ]);
    } catch {
      setTurns((t) => [
        ...t,
        {
          role: 'ai',
          text:
            'تعذر الاتصال بالخادم. تأكد أن Backend يعمل على المنفذ 8100.\n\n' +
            'تحليل محلي سريع: راقب DXY قبل أي دخول على أزواج الدولار، واستخدم وقف واضح بنسبة مخاطرة ≤ 1%.',
          win: 62,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>مساعد ذكاء اصطناعي</Text>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8 }}>
        {turns.map((t, i) => (
          <View
            key={i}
            style={[styles.bubble, t.role === 'user' ? styles.user : styles.ai]}
          >
            <Text style={styles.text}>{t.text}</Text>
            {typeof t.win === 'number' && (
              <View style={styles.winBox}>
                <Text style={styles.win}>توقع نجاح تقديري: {t.win}%</Text>
              </View>
            )}
          </View>
        ))}
        {loading && <ActivityIndicator color={colors.accent} />}
      </ScrollView>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={q}
          onChangeText={setQ}
          placeholder="مثال: تحليل EURUSD اليوم؟"
          placeholderTextColor={colors.textDim}
          onSubmitEditing={ask}
        />
        <Pressable style={styles.send} onPress={ask}>
          <Text style={styles.sendText}>اسأل</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: colors.bgPanel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    minHeight: 220,
  },
  title: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: spacing.sm,
    textAlign: 'right',
  },
  bubble: { borderRadius: radii.sm, padding: spacing.sm, borderWidth: 1 },
  user: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  ai: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.borderSoft,
  },
  text: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'right',
  },
  winBox: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  win: { color: colors.bull, fontWeight: '800', fontSize: 11 },
  row: { flexDirection: 'row-reverse', gap: 6, marginTop: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    textAlign: 'right',
  },
  send: {
    backgroundColor: colors.dxy,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  sendText: { color: '#0B1220', fontWeight: '800', fontSize: 12 },
});
