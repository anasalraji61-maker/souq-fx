import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import { api, type ReportKind, type ReportReason } from '../api';
import { canBlockAuthor, useBlockedUsers } from '../moderation';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';

/**
 * صف «إبلاغ / حظر» تحت رسالة مجموعة أو فكرة صفقة — شرط أبل 1.2 للمحتوى الذي ينشئه المستخدمون.
 * يُفتح من زر «⋯» في اللوحة الأم. البلاغ يصل للخادم (يختفي العنصر عند المُبلِّغ فوراً)، والحظر محلي
 * (`moderation.ts`) ويعمل للمجهول أيضاً. اللوحة الأم تعرض الرسالة الناتجة وتُخفي العنصر.
 */
export function ModerationActions({
  kind,
  targetId,
  author,
  onResult,
  onClose,
}: {
  kind: ReportKind;
  targetId: string;
  /** اسم الناشر؛ null لعنصر مجهول (لا زر حظر — لا اسم نحظره) */
  author: string | null;
  /** `hide`: أخفِ هذا العنصر محلياً (بعد بلاغ ناجح) */
  onResult: (notice: string, hide: boolean) => void;
  onClose: () => void;
}) {
  const { t, rtl } = useI18n();
  const { block } = useBlockedUsers();
  const { user } = useAuth();
  const showBlock = canBlockAuthor(author, user?.username);
  const [busy, setBusy] = useState(false);
  /** متزامن: `busy` حالةٌ لا تصل لضغطة ثانية قبل إعادة الرسم ⇒ نقرٌ مزدوج كان يمرّ الحارس فيُظهر الإشعار مرّتين */
  const busyRef = useRef(false);
  const align = rtl ? ('right' as const) : ('left' as const);

  /**
   * الصفّ **يُفكَّك بنجاح البلاغ نفسه**: `onResult(…, true)` يُخفي العنصر باللوحة الأم، فهذه
   * الحاوية تختفي معه — ثم يصل `setBusy(false)` بـ`finally` إلى مكوِّن لم يعد موجوداً. حارس
   * `mounted` هو نمط `ChartFrame`/`SymbolSnapshot` المؤسَّس بالكود.
   */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const report = async (reason: ReportReason) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const r = await api.report(kind, targetId, reason);
      if (r && r.ok === false && r.error === 'login_required') {
        onResult(t.modReportLoginRequired, false);
      } else {
        // ok أو not_found (حُذف/أُخفي أصلاً، أو عنصر تجريبي محلي) — بالحالتين يختفي عندك
        onResult(t.modReported, true);
      }
    } catch {
      onResult(t.modReportError, false);
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  };

  /**
   * **الحظر كان بلا حارس ضغطٍ مكرَّر** خلافاً لرقاقات البلاغ. `block` يقرأ التخزين قبل أن يكتب
   * (`loadBlocked` بـ`moderation.ts`) فبينه وبين النتيجة انتظار: ضغطتان متتاليتان — وهما مألوفتان
   * على زرّ لا يتغيّر شكله لحظة الضغط — كانتا تُنتجان **إشعارَي «حُظر فلان»** باللوحة الأم. الحظر
   * نفسه سليم (`list.includes(n)` يمنع التكرار بالقائمة)، والمكرَّر هو ما يراه المتداول وحده.
   * والزرّ يُعطَّل الآن كرقاقات البلاغ حرفياً، فالحالة تصل قارئ الشاشة أيضاً.
   */
  const doBlock = async () => {
    if (!author || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await block(author);
      onResult(t.modBlocked.replace('{user}', () => author), false);
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  };

  const pressed = ({ pressed: p }: { pressed: boolean }) =>
    p ? { opacity: buttons.pressedOpacity, transform: [{ scale: buttons.pressedScale }] } : null;

  const reasons: { id: ReportReason; label: string }[] = [
    { id: 'spam', label: t.modReasonSpam },
    { id: 'abuse', label: t.modReasonAbuse },
    { id: 'scam', label: t.modReasonScam },
  ];

  return (
    <View style={styles.box}>
      <View style={[styles.row, rtl && styles.rowRtl]}>
        <Text style={[styles.label, { textAlign: align }]}>{t.modReportLabel}</Text>
        {reasons.map((r) => (
          <Pressable
            key={r.id}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            accessibilityLabel={`${t.modReportLabel} ${r.label}`}
            disabled={busy}
            onPress={() => report(r.id)}
            style={(s) => [styles.chip, busy && styles.chipDisabled, pressed(s)]}
          >
            <Text style={styles.chipText}>{r.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.row, rtl && styles.rowRtl]}>
        {author && showBlock ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            accessibilityLabel={t.modBlockUser.replace('{user}', () => author)}
            disabled={busy}
            onPress={doBlock}
            style={(s) => [styles.chip, styles.blockChip, busy && styles.chipDisabled, pressed(s)]}
          >
            <Text style={[styles.chipText, styles.blockText]} numberOfLines={1}>
              {t.modBlockUser.replace('{user}', () => author)}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.cancel}
          onPress={onClose}
          style={(s) => [styles.chip, pressed(s)]}
        >
          <Text style={[styles.chipText, styles.cancelText]}>{t.cancel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** زر «⋯» الصغير الذي يفتح صف الإبلاغ/الحظر — مشترك بين الرسائل والأفكار. */
export function ModerationToggle({ open, onPress, label }: { open: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed: p }) => [styles.toggle, open && styles.toggleOn, p && { opacity: buttons.pressedOpacity }]}
    >
      <Text style={[styles.toggleText, open && styles.toggleTextOn]}>⋯</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: spacing.xs,
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: spacing.xs,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  rowRtl: { flexDirection: 'row-reverse' },
  label: { color: colors.textDim, fontSize: 11, fontWeight: '500' },
  chip: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.controlBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipDisabled: { opacity: 0.4 },
  chipText: { color: colors.text, fontSize: 11, fontWeight: '500' },
  // DESIGN-PRO §1/§5.5: الحظر ليس اتجاه سعر — حدّ أقوى فقط بلا تعبئة حمراء (يظهر بعد فتح القائمة، §5.2)
  blockChip: { borderColor: colors.textDim, maxWidth: 200 },
  blockText: { color: colors.text },
  cancelText: { color: colors.textMuted },
  toggle: { paddingHorizontal: 4, borderRadius: radii.sm },
  // DESIGN-PRO §4/§1: «مفتوح» تعبئة محايدة لا لون التأكيد وحده — «⋯» على كل رسالة/فكرة، فلا تأكيد بقائمة
  toggleOn: { backgroundColor: colors.selectedFill },
  toggleText: { color: colors.textDim, fontSize: 16, fontWeight: '500', lineHeight: 16 },
  toggleTextOn: { color: colors.text },
});
