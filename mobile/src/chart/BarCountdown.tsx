import React, { useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { barCloseCountdown } from './barCountdown';

/**
 * عدّاد إغلاق الشمعة بمؤقّته الخاصّ: يعيد رسم نصّه وحده كل ثانية لا `MatrixChart` كلّه.
 * المؤقّت يُضبط على حدّ الثانية فلا يقفز الرقم ثانيتين بانجراف `setInterval`.
 */
export function BarCountdown({
  lastBarTime,
  stepSec,
  symbol,
  style,
  onEnd,
}: {
  lastBarTime: number;
  stepSec: number;
  /** يحدّ العدّ بساعات السوق — `barCloseCountdown`. */
  symbol?: string;
  style?: StyleProp<TextStyle>;
  /**
   * يُستدعى مرّة حين ينتهي العدّ (أُغلقت الشمعة بلا تيك جديد، أو أُغلق السوق) — فتُقصّر الأمّ
   * الوسم ولا يبقى سطرٌ فارغ تحت السعر حتى رسمٍ تالٍ.
   */
  onEnd?: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(Date.now());
      id = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    id = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    return () => clearTimeout(id);
  }, []);
  const text = barCloseCountdown(lastBarTime, stepSec, now, symbol);
  const ended = text == null;
  useEffect(() => {
    if (ended) onEnd?.();
    // `onEnd` دالّة جديدة بكل رسم للأمّ — الاستدعاء عند تغيّر الحالة وحده.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended]);
  return text ? <Text style={style}>{text}</Text> : null;
}
