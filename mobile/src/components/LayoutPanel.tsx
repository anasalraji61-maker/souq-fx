import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { colors, radii, spacing, buttons } from '../theme';
import {
  loadLayouts,
  saveLayout,
  deleteLayout,
  mergeServerLayouts,
  subscribeLayoutsSaveError,
  DEFAULT_LAYOUT,
  type TerminalLayout,
  type LayoutsSaveErrorCode,
} from '../chart/layoutStore';
import { api } from '../api';
import { playSoftClick } from '../audio/playSoftClick';
import { useI18n } from '../i18n/I18nContext';
import { confirmDestructive } from '../chart/confirmDestructive';

/** حدّ الخادم (`LayoutSave.name` max_length=64) — اسم أطول كان يُحفظ محلياً «✓ حُفظ» ويُرفض بالخادم بصمت. */
const LAYOUT_NAME_MAX = 64;

type Props = {
  frameTfs: [string, string, string] | string[];
  frameSymbols: [string, string, string];
  onApply: (layout: TerminalLayout) => void;
};

export function LayoutPanel({ frameTfs, frameSymbols, onApply }: Props) {
  const { t, rtl } = useI18n();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [layouts, setLayouts] = useState<TerminalLayout[]>([DEFAULT_LAYOUT]);
  const [name, setName] = useState(t.layoutDefaultName);
  // اللوحة تبقى محمَّلة بالتبويب: تبديل اللغة كان يُبقي الاسم الافتراضي بلغته الأولى («تخطيطي» بواجهة
  // إنجليزية) فيُحفظ بها. يتبع اللغة ما لم يكتب المتداول اسماً.
  const nameEdited = useRef(false);
  useEffect(() => {
    if (!nameEdited.current) setName(t.layoutDefaultName);
  }, [t.layoutDefaultName]);
  const [saveError, setSaveError] = useState<LayoutsSaveErrorCode | null>(null);
  /** تأكيد الحفظ — كان الحفظ صامتاً (نقرة صوتية فقط). */
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  /** ما حذفه المتداول بهذه اللوحة — تحميلٌ قُرئ قبل الحذف لا يُعيده للقائمة. */
  const deletedRef = useRef(new Set<string>());
  /** حفظ جارٍ — نقرتان سريعتان كانتا تحفظان نسختين بالاسم نفسه (القائمة لم تتحدّث بعد فلا «existing»). */
  const savingRef = useRef(false);

  /** «EURUSD 15m · GBPUSD 1H · XAUUSD 4H» — كان السطر يعرض الأزواج فقط، والفريم نصف التخطيط. */
  const describe = (l: TerminalLayout) =>
    l.frameSymbols.map((sym, i) => `${sym} ${l.frameTfs[i] ?? ''}`.trim()).join(' · ');
  /** الاسم المعروض: الافتراضي مخزَّن باسم عربي ثابت («افتراضي») فيُترجم عند العرض. */
  const displayName = (l: TerminalLayout) => (l.id === 'default' ? t.layoutBuiltinName : l.name);
  /** يطابق ما على الشاشة الرئيسية الآن؟ (يُعلَّم «الحالي» كي يعرف المتداول ما المطبَّق) */
  const isCurrent = (l: TerminalLayout) =>
    l.frameSymbols.every((sym, i) => sym === frameSymbols[i]) &&
    l.frameTfs.every((x, i) => x === frameTfs[i]);

  useEffect(() => {
    // حارس "alive" يمنع تحديث الحالة بعد إلغاء تركيب اللوحة قبل اكتمال الطلب — نفس نمط
    // ChartFrame/SymbolSnapshot/FocusChartModal المؤسَّس بالكود.
    let alive = true;
    // إضافة ما ينقص بالمعرّف لا استبدال القائمة: تحميلٌ يصل بعد حفظ/حذف لا يُخفي أثرهما.
    const addMissing = (l: TerminalLayout[]) =>
      setLayouts((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        const added = l.filter((x) => !seen.has(x.id) && !deletedRef.current.has(x.id));
        return added.length ? [...prev, ...added] : prev;
      });
    loadLayouts().then((l) => {
      if (alive) addMissing(l);
    });
    // تخطيطات الحساب من الخادم (جهاز آخر/إعادة تثبيت) — كانت تُرسَل للخادم ولا تُقرأ منه أبداً.
    api
      .layouts()
      .then((res) => mergeServerLayouts((res.layouts ?? []).map((x) => x.payload)))
      .then((l) => {
        // المخزن يسلسل الكتابات فالقائمة المدمجة تحمل ما حُفظ قبلها؛ وما حُفظ/حُذف بعدها
        // بالحالة يبقى كما هو — لا استبدال أعمى يُخفي تخطيطاً حُفظ للتوّ.
        if (alive) addMissing(l);
      })
      .catch(() => {
        /* بلا خادم: القائمة المحلية كافية */
      });
    const unsubErr = subscribeLayoutsSaveError(setSaveError);
    return () => {
      alive = false;
      unsubErr();
    };
  }, []);

  const save = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      await saveNow();
    } finally {
      savingRef.current = false;
    }
  };

  const saveNow = async () => {
    const layoutName = name.trim().slice(0, LAYOUT_NAME_MAX).trim() || t.layoutFallbackName;
    // نفس الاسم = تحديث ذلك التخطيط لا نسخة مكرّرة (الاسم الافتراضي «تخطيطي» كان يُكدّس نسخاً متطابقة الاسم).
    const existing = layouts.find((x) => x.id !== 'default' && x.name === layoutName);
    const layout: TerminalLayout = {
      id: existing?.id ?? `l${Date.now()}`,
      name: layoutName,
      dxyTf: '15m',
      frameSymbols,
      frameTfs: [frameTfs[0], frameTfs[1], frameTfs[2]],
      frameSizes: ['small', 'medium', 'large'],
    };
    await saveLayout(layout);
    try {
      // نفس المعرّف المحلي = نفس صف الخادم (كان كل حفظ يُنشئ صفاً جديداً بلا id)
      await api.saveLayout({ id: layout.id, name: layout.name, payload: layout });
    } catch {
      /* local ok */
    }
    playSoftClick();
    setLayouts((prev) => [
      DEFAULT_LAYOUT,
      layout,
      ...prev.filter((x) => x.id !== layout.id && x.id !== 'default'),
    ]);
    setSavedMsg(`${t.layoutSavedMsg} ${layout.name} — ${describe(layout)}`);
  };

  const removeLayout = async (l: TerminalLayout) => {
    deletedRef.current.add(l.id);
    await deleteLayout(l.id);
    setLayouts((prev) => prev.filter((x) => x.id !== l.id));
    // وإلا عاد التخطيط المحذوف من الخادم عند فتح اللوحة التالي
    api.deleteLayout(l.id).catch(() => {
      /* بلا خادم: الحذف المحلي تمّ */
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { textAlign: align }]}>{t.layoutsTitle}</Text>
      <Text style={[styles.hint, { textAlign: align }]}>{t.layoutsHint}</Text>
      {saveError ? (
        <Text style={[styles.saveError, { textAlign: align }]}>{t[saveError]}</Text>
      ) : null}
      <TextInput
        style={[styles.input, { textAlign: align }]}
        value={name}
        onChangeText={(v) => {
          nameEdited.current = true;
          setName(v);
          setSavedMsg(null);
        }}
        placeholder={t.layoutNamePlaceholder}
        placeholderTextColor={colors.textDim}
        returnKeyType="done"
        maxLength={LAYOUT_NAME_MAX}
        underlineColorAndroid="transparent"
        clearButtonMode="while-editing"
        keyboardAppearance="dark"
        selectionColor={colors.accent}
        accessibilityLabel={t.layoutNameA11y}
      />
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.btn,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={save}
        accessibilityLabel={t.layoutSaveA11y}
        hitSlop={8}
      >
        <Text style={styles.btnText}>{t.layoutSaveBtn}</Text>
      </Pressable>
      {savedMsg && !saveError ? (
        <Text style={[styles.saved, { textAlign: align }]} accessibilityLiveRegion="polite">
          {savedMsg}
        </Text>
      ) : null}
      {layouts.map((l) => (
        <View key={l.id} style={[styles.row, rtl && styles.rowRtl]}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.apply,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => {
              playSoftClick();
              onApply(l);
            }}
            accessibilityState={{ selected: isCurrent(l) }}
            accessibilityLabel={`${t.layoutApplyA11yPrefix}: ${displayName(l)} — ${describe(l)}`}
          >
            <Text style={[styles.rowName, { textAlign: align }]}>
              {displayName(l)}
              {isCurrent(l) ? <Text style={styles.currentTag}>{` · ${t.layoutCurrentTag}`}</Text> : null}
            </Text>
            <Text style={[styles.rowSub, { textAlign: align }]}>{describe(l)}</Text>
          </Pressable>
          {l.id !== 'default' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                confirmDestructive({
                  title: t.layoutDeleteConfirmTitle,
                  body: `${l.name} — ${describe(l)}`,
                  cancelText: t.cancel,
                  confirmText: t.deleteWord,
                  onConfirm: () => void removeLayout(l),
                });
              }}
              style={({ pressed }) =>
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                }
              }
              accessibilityLabel={`${t.layoutDeleteA11yPrefix}: ${l.name}`}
            >
              <Text style={styles.del}>{t.deleteWord}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
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
    gap: spacing.sm,
  },
  title: { color: colors.text, fontWeight: '800', textAlign: 'right' },
  hint: { color: colors.textDim, fontSize: 11, lineHeight: 16 },
  saved: { color: colors.bull, fontSize: 11, fontWeight: '800' },
  currentTag: { color: colors.accent, fontWeight: '800', fontSize: 11 },
  input: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: spacing.sm,
    textAlign: 'right',
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  btnText: { color: colors.onAccent, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
    paddingTop: spacing.sm,
  },
  rowRtl: { flexDirection: 'row-reverse' },
  apply: { flex: 1 },
  rowName: { color: colors.text, fontWeight: '700', textAlign: 'right' },
  rowSub: { color: colors.textDim, fontSize: 10, textAlign: 'right' },
  del: { color: colors.bear, fontWeight: '700' },
  saveError: {
    color: colors.bear,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
  },
});
