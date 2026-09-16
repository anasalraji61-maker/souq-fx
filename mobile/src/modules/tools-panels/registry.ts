/**
 * سجل الألواح ذاتي التسجيل (self-registering tool panels) — الخطوة الأولى من خطة توحيد
 * MatrixBottomDock.tsx / ToolsScreen.tsx (راجع docs/ARCHITECTURE.md، قسم "خطة الهجرة الفورية
 * الآمنة"، بند 4).
 *
 * كود إضافي **ميت حالياً بالكامل** (dead code) — لا MatrixBottomDock.tsx ولا ToolsScreen.tsx
 * يستوردان من هذا الملف بعد، وصفر تأثير على أي سلوك حالي. الهدف: بدل أن يُعرِّف كل من
 * الملفين مصفوفة TABS ثابتة منفصلة يدوياً (تكرار مؤكَّد بالقراءة المباشرة — قائمتا الألواح
 * متقاربتان لكن غير متطابقتين: MatrixBottomDock.tsx يملك 14 لوحاً مسطّحاً بينما
 * ToolsScreen.tsx يجمّع ثمانية منها داخل تبويب "hub" شبكي واحد؛ كل تعديل بلوح واحد يحتاج
 * تحديث نقطتين منفصلتين اليوم)، كل لوح يسجّل نفسه هنا مرة واحدة عبر registerToolPanel(...)،
 * والملفان المضيفان يقرآن من getToolPanels() بدل تعريف TABS يدوياً بكل منهما.
 *
 * **نقل الألواح الثمانية+ الفعلي لاستخدام هذا السجل مؤجَّل عمداً** لما بعد استقرار الإطلاق
 * (يحتاج تحديث نقاط استيراد بعدة ملفات مستهلِكة — خطر غير مبرَّر بالأسبوعين الحرجين المتبقيين،
 * راجع ARCHITECTURE.md قسم "الخطوات المؤجَّلة لما بعد الإطلاق"). هذا الملف تمهيد فقط.
 */
import type { ComponentType } from 'react';

/** معرّف لوح فريد — يوحّد مستقبلاً بين DockTabId (MatrixBottomDock.tsx) وTabId (ToolsScreen.tsx). */
export type ToolPanelId = string;

export type ToolPanelEntry = {
  id: ToolPanelId;
  /** نص التبويب العربي المعروض — نفس نمط `label` الحالي بكلا الملفين. */
  label: string;
  /** رمز/أيقونة نصية مصغَّرة — نفس نمط `mark` الحالي (✦/⌕/⚡ إلخ). */
  mark: string;
  /** المكوّن الفعلي المعروض عند اختيار اللوح. `props` تبقى عامة حتى تثبيت واجهة موحَّدة
   * فعلية عند النقل الحقيقي — هذا سجل تعريفي فقط، لا يفرض شكل props بعد. */
  component: ComponentType<any>;
  /** أين يظهر هذا اللوح فعلياً اليوم — يوثّق الوضع الراهن (دوك اللابتوب/الهاتف مقابل شبكة
   * "hub" بشاشة الأدوات) تمهيداً للتوحيد، لا يُستخدَم بمنطق فعلي بعد. */
  surfaces: ('dock' | 'toolsHub')[];
};

const registry = new Map<ToolPanelId, ToolPanelEntry>();

/**
 * يسجّل لوحاً بالسجل. استدعاء بنفس `id` مرتين يستبدل التسجيل السابق (يسمح بإعادة تحميل أثناء
 * التطوير بلا تكرار) — لا `throw`، توحيداً مع أسلوب معالجة الأخطاء الصامتة المتَّبع بباقي الكود.
 */
export function registerToolPanel(entry: ToolPanelEntry): void {
  registry.set(entry.id, entry);
}

/** يرجع كل الألواح المسجَّلة بترتيب التسجيل. */
export function getToolPanels(): ToolPanelEntry[] {
  return Array.from(registry.values());
}

/** يرجع لوحاً واحداً بمعرّفه، أو `undefined` إن لم يُسجَّل بعد. */
export function getToolPanel(id: ToolPanelId): ToolPanelEntry | undefined {
  return registry.get(id);
}
