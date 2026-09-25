/**
 * طابع وقت بتوقيت الجهاز من ثوانٍ UTC: «21:45» لليوم نفسه، وإلا يوم الأسبوع والتاريخ قبل الوقت
 * («Fri, Sep 25 21:45»/«الجمعة، 25 سبتمبر 21:45»). الكردي بلا أسماء أيام موثوقة بـ`Intl` ⇒ «26/09 21:45».
 * أرقام لاتينية كبقية الأسعار. مستعمَل لوقت سعر جواب المساعد (`AiPanel`) ولرسائل المجموعة (`GroupChatPanel`).
 */
const pad2 = (n: number) => String(n).padStart(2, '0');

export function formatLocalStamp(sec: number, lang: string, now: Date = new Date()): string {
  const d = new Date(sec * 1000);
  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) return hm;
  if (lang !== 'ku') {
    try {
      return `${d.toLocaleDateString(`${lang}-u-nu-latn`, { weekday: 'short', day: 'numeric', month: 'short' })} ${hm}`;
    } catch {
      /* بلا Intl ⇒ الصيغة الرقمية أدناه */
    }
  }
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${hm}`;
}
