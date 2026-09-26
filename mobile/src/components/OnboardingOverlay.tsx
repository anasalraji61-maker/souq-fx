import React, { useState } from 'react';
import { AccessibilityInfo, Modal, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing, buttons } from '../theme';
import { useI18n } from '../i18n/I18nContext';

type Props = {
  visible: boolean;
  onDone: () => void;
};

/** جولة ترحيبية قصيرة (5 خطوات) تُعرض مرة واحدة فقط لأول متداول يفتح التطبيق —
 * تبديل الزوج/أدوات الرسم/المؤشرات/التنبيهات/حاسبة المخاطرة، ثم تنبيه مخاطرة صريح بالخطوة الأخيرة. */
export function OnboardingOverlay({ visible, onDone }: Props) {
  const { t, rtl } = useI18n();
  const [step, setStep] = useState(0);

  const steps = [
    { title: t.onboardStep1Title, body: t.onboardStep1Body },
    { title: t.onboardStep2Title, body: t.onboardStep2Body },
    { title: t.onboardStep3Title, body: t.onboardStep3Body },
    { title: t.onboardStep4Title, body: t.onboardStep4Body },
    { title: t.onboardStep5Title, body: t.onboardStep5Body },
  ];
  const last = step === steps.length - 1;
  const align = rtl ? 'right' : 'left';

  const finish = () => {
    setStep(0);
    onDone();
  };

  // قارئ الشاشة كان لا يقرأ الخطوة الجديدة: بعد «التالي» يبقى تركيز VoiceOver/TalkBack على الزرّ
  // نفسه، والعنوان والنصّ يتبدّلان فوقه بصمت — فيسمع «التالي، زر» خمس مرّات ثم «ابدأ» ولا يعرف
  // ما قالته الجولة إلا إن مسح الشاشة بإصبعه بعد كل ضغطة. الآن يُعلَن رقم الخطوة وعنوانها ونصّها
  // مع كل انتقال (التالي، النقاط، رجوع أندرويد). على الويب الدالة بلا أثر.
  const go = (i: number) => {
    setStep(i);
    const s = steps[i]!;
    AccessibilityInfo.announceForAccessibility(
      `${t.onboardStepCounterA11y.replace('{n}', String(i + 1)).replace('{total}', String(steps.length))}. ${s.title}. ${s.body}`,
    );
  };

  // زرّ الرجوع بأندرويد يرجع خطوةً لا يُنهي الجولة: كان `onRequestClose={back}`، فضغطةٌ واحدة
  // لمن اعتاد «الرجوع» لتصحيح نقرة «التالي» الزائدة تُغلق جولةً لا تُعرض إلا مرّة بالعمر
  // (`matrix.onboarding.v1`). من الخطوة الأولى يبقى الرجوع خروجاً كما يتوقّع المتداول.
  const back = () => (step > 0 ? go(step - 1) : finish());

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={back}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.card}>
            {/**
              * **النقاط صارت الطريق للخلف.** الجولة خمس خطوات بزرَّين لا غير: «التالي» و«تخطي» —
              * فمن ضغط «التالي» مرّةً زائدة (أو لمس الشاشة وهو يقرأ) **لا سبيل له للرجوع** إلا أن
              * يُنهي الجولة كلّها، وهي تُعرض **مرّة واحدة بالعمر** (`matrix.onboarding.v1`): أي أن
              * الخطوة التي فاتته فاتته للأبد. وأوّل من يقع له هذا هو بالضبط من كُتبت الجولة له.
              *
              * ولا مفتاح نصّ جديد: النقاط لغةٌ عالمية، والاسم المنطوق يُبنى من `onboardStepCounterA11y`
              * القائم بالثلاث لغات («الخطوة {n} من {total}»).
              *
              * **وقد رُفع الإخفاء عن النقاط عمداً**: كانت مخفيّةً عن قارئ الشاشة لأنها **عناصر
              * فارغة زخرفية**، والتقدّم يُنطق مرّة من الحاوية. وقد بطل السبب — صارت أزراراً تفعل
              * شيئاً، فإخفاؤها يحجب الطريق الوحيد للرجوع عمّن يستعمل قارئ الشاشة. وكلٌّ منها يحمل
              * موضعه و`selected`، فالتقدّم ما زال منطوقاً وزيادةً.
              */}
            {/**
              * **وصفُّ النقاط لا ينقلب بالعربية.** كان `flexDirection: 'row'` بلا شرط `rtl` —
              * وهو الصفّ الوحيد بهذه اللوحة الذي بقي كذلك (صفّ الأزرار تحته يقلب بـ`actionsRtl`).
              * وقد كان مقبولاً حين كانت النقاط **زخرفةً** تقول «أنت بالثالثة من خمس»: شريطُ تقدّمٍ
              * يُقرأ بامتلائه لا بجهته. ثم صارت النقاط **أزراراً للتنقّل** (الطريق الوحيد للرجوع
              * بجولةٍ تُعرض مرّة واحدة بالعمر)، فصارت جهتها تعني شيئاً: قارئ العربية يمدّ يده إلى
              * أقصى اليمين قاصداً **الخطوة الأولى** فيقع على الخامسة — أي أنّ الزرّ الموضوع ليُرجعه
              * يقفز به إلى النهاية، والجولة تُختم قبل أن يقرأها. والنقطة الحالية ممدودة (عرض 18)
              * فيقرأ معها تقدّمه معكوساً كذلك.
              *
              * ونفس علاج بقية التطبيق حرفاً بحرف (`ScreenerMini`/`CalendarPanel`/`WatchlistPanel`):
              * شرطٌ يضيف حالة RTL ولا يمسّ الإنجليزية بشيء. والاسم المنطوق يحمل رقم الخطوة أصلاً
              * (`onboardStepCounterA11y`) فلا يعتمد قارئ الشاشة على الترتيب البصري بحال.
              */}
            <View style={[styles.dots, rtl && styles.dotsRtl]}>
              {steps.map((_, i) => (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityState={{ selected: i === step }}
                  accessibilityLabel={t.onboardStepCounterA11y
                    .replace('{n}', String(i + 1))
                    .replace('{total}', String(steps.length))}
                  // مساحة اللمس لا الشكل: النقطة ستّ بكسلات، والهدف حولها ~18×46 بعد الحشو
                  // وhitSlop الرأسي. وhitSlop أفقي معدوم عمداً كي لا تتداخل أهداف النقاط المتجاورة.
                  hitSlop={{ top: 10, bottom: 10 }}
                  style={({ pressed }) => [styles.dotHit, pressed && { opacity: buttons.pressedOpacity }]}
                  onPress={() => go(i)}
                >
                  <View style={[styles.dot, i <= step && styles.dotOn, i < step && styles.dotDone]} />
                </Pressable>
              ))}
            </View>
            {/* العنوان والنصّ وحدهما يتمرّران: البطاقة بلا حدّ ارتفاع، فنصٌّ طويل (الخطوة 1 بالكردية ~470
                حرفاً) مع خطّ كبير كان يمدّها فوق أعلى الشاشة. النقاط وتنبيه المخاطرة والزرّان ثابتة دائماً
                بالمشهد. `key` يعيد التمرير لأعلى مع كل خطوة. */}
            <ScrollView
              key={step}
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text accessibilityRole="header" style={[styles.title, { textAlign: align }]}>
                {steps[step]!.title}
              </Text>
              <Text style={[styles.body, { textAlign: align }]}>{steps[step]!.body}</Text>
            </ScrollView>
            {/* تنبيه المخاطرة بكل خطوة لا بالأخيرة وحدها: زرّ «تخطي» ظاهر من الخطوة الأولى، فمن يضغطه
                كان يغلق الجولة بلا أن يرى «تحليل وتعليم فقط، لا نصيحة مالية» إطلاقاً — وهو موضع
                التطبيق المعلَن بالمتجر (`app.json` وdocs/STORE-LISTING.md). سطران صغيران لا يزاحمان. */}
            <Text style={[styles.riskNote, { textAlign: align }]}>{t.onboardRiskNote}</Text>
            {/* بالبطاقة الأخيرة «تخطي» و«ابدأ» يفعلان الشيء نفسه — زرّان لخيار واحد، ولا طريق ظاهر للخلف
                على iOS غير نقاط بستّ بكسلات. هناك يصير الزرّ الصغير «السابق». */}
            <View style={[styles.actions, rtl && styles.actionsRtl]}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.skipBtn,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={last ? back : finish}
                accessibilityLabel={last ? t.onboardBack : t.onboardSkip}
              >
                <Text style={styles.skipText}>{last ? t.onboardBack : t.onboardSkip}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.nextBtn,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => (last ? finish() : go(step + 1))}
                accessibilityLabel={last ? t.onboardStart : t.onboardNext}
              >
                <Text style={styles.nextText}>{last ? t.onboardStart : t.onboardNext}</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 14, 22, 0.72)',
    justifyContent: 'flex-end',
  },
  safe: { width: '100%', maxHeight: '100%' },
  card: {
    flexShrink: 1,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.bgElevated,
    gap: spacing.sm,
    // `docs/DESIGN-PRO.md` §5.5: فاصل واحد — التعبئة وحدها (تحجب الشارت خلف البطاقة فلا يُقرأ النصّ فوق الشموع)؛
    // الحدّ حُذف كما حُذف الظلّ قبله، والبطاقة الأفتح فوق الستارة الداكنة تكفي حافّةً.
  },
  // بلا `gap`: التباعد صار من حشو هدف اللمس نفسه (`spacing.xs` ×2 = ثماني بكسلات بين نقطتين).
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.xs },
  dotsRtl: { flexDirection: 'row-reverse' },
  dotHit: { paddingHorizontal: spacing.xs, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  // النقطة الحالية بلون النصّ لا التيل: تأكيد واحد بالبطاقة (زرّ «التالي»، DESIGN-PRO §1)، والعرض 18 يميّزها بغير اللون.
  dotOn: { backgroundColor: colors.text, width: 18 },
  dotDone: { width: 6, opacity: 0.55 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollContent: { gap: spacing.sm },
  // DESIGN-PRO §2: 18px لآخر سعر وقيمة التقاطع وحدهما — البطاقة فوق الشارت الخافت، فعنوانها بمقاس قراءات السعر 15.
  title: { color: colors.text, fontWeight: '500', fontSize: 15 },
  body: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  riskNote: {
    color: colors.textDim,
    fontSize: 11,
    lineHeight: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  actionsRtl: { flexDirection: 'row-reverse' },
  skipBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  skipText: { color: colors.textDim, fontWeight: '500', fontSize: 13 },
  nextBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    // §5.5: فاصل واحد — التعبئة وحدها (الظلّ كان ثانياً)، كزرّ الحفظ بالدفتر والماسح بالأدوات.
  },
  nextText: { color: colors.onAccent, fontWeight: '500', fontSize: 15 },
});
