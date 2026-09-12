import { Platform, Vibration } from 'react-native';

type WebAudioWindow = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

let webCtx: AudioContext | null = null;
let lastPlay = 0;

function getWebCtx(): AudioContext | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const w = window as WebAudioWindow;
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  if (!webCtx) webCtx = new Ctor();
  return webCtx;
}

/** يفتح سياق الصوت بعد أول ضغطة حتى تعمل النقرة في المتصفح */
export function unlockSoftClick(): void {
  const ctx = getWebCtx();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume();
  }
}

/** نقرة خشبية قصيرة مثل عجلة السنوات/المواليد */
export function playSoftClick(): void {
  const now = Date.now();
  if (now - lastPlay < 28) return;
  lastPlay = now;

  const ctx = getWebCtx();
  if (!ctx) {
    if (Platform.OS !== 'web') Vibration.vibrate(8);
    return;
  }
  if (ctx.state === 'suspended') void ctx.resume();

  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const click = ctx.createOscillator();
  const gain = ctx.createGain();
  const clickGain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(980, t);
  osc.frequency.exponentialRampToValueAtTime(420, t + 0.028);

  click.type = 'square';
  click.frequency.setValueAtTime(2100, t);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.055, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

  clickGain.gain.setValueAtTime(0.0001, t);
  clickGain.gain.exponentialRampToValueAtTime(0.018, t + 0.002);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.016);

  osc.connect(gain);
  click.connect(clickGain);
  gain.connect(ctx.destination);
  clickGain.connect(ctx.destination);

  osc.start(t);
  click.start(t);
  osc.stop(t + 0.05);
  click.stop(t + 0.02);
}
