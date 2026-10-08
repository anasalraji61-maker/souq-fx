import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { drawOps, frameAt, type Op, type Scene } from './scenes';

type Props = {
  scene: Scene;
  /** 0 → 1: how far the narration of this part has played */
  getProgress: () => number;
  title?: string;
  playing: boolean;
  onPlay?: () => void;
  playLabel?: string;
  rtl?: boolean;
};

/** The lesson "screen recording": chart, moving mouse pointer and drawings, in step with the narration. */
export const LessonStage: React.FC<Props> = ({ scene, getProgress, title, playing, onPlay, playLabel, rtl }) => {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [p, setP] = useState(0);
  const getRef = useRef(getProgress);
  getRef.current = getProgress;
  const h = w > 640 ? 330 : w > 420 ? 280 : 240;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.round(el.clientWidth)));
    ro.observe(el);
    setW(Math.round(el.clientWidth));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      if (t - last > 40) {
        last = t;
        const next = getRef.current();
        setP((cur) => (Math.abs(cur - next) > 0.001 ? next : cur));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scene]);

  const frame = useMemo(() => frameAt(scene, p), [scene, p]);
  const ops = useMemo(() => (w > 0 ? drawOps(scene, frame, w, h) : []), [scene, frame, w, h]);

  return (
    <div className="rounded-2xl border border-[#243049] bg-[#0B1220] overflow-hidden" data-testid="lesson-stage">
      <div className="flex items-center gap-2 px-3 pt-2 pb-1 text-[11px] text-[#7B8DA8]" dir={rtl ? 'rtl' : 'ltr'}>
        <span className={`w-2 h-2 rounded-full ${playing ? 'bg-[#EF4444] animate-pulse' : 'bg-[#475569]'}`} />
        <span className="truncate flex-1" dir="auto">
          {scene.symbol}
          {title ? ` · ${title}` : ''}
        </span>
        {!playing && onPlay && (
          <button
            onClick={onPlay}
            className="shrink-0 flex items-center gap-1 min-h-[30px] px-2.5 rounded-full bg-[#2DD4BF] text-[#042F2E] text-[11px] font-bold cursor-pointer"
            data-testid="stage-play"
          >
            <Play className="w-3 h-3 fill-current" /> {playLabel}
          </button>
        )}
      </div>
      <div ref={box} className="relative" style={{ height: h }}>
        {w > 0 && (
          <svg width={w} height={h} role="img" aria-label={frame.caption}>
            {ops.map((o, k) => renderOp(o, k))}
          </svg>
        )}
      </div>
      <div className="px-3 pb-2 pt-1 text-[13px] font-semibold text-[#2DD4BF] min-h-[26px]" dir={rtl ? 'rtl' : 'ltr'} data-testid="stage-caption">
        {frame.caption}
      </div>
    </div>
  );
};

function renderOp(o: Op, k: number) {
  const op = o.o ?? 1;
  switch (o.t) {
    case 'rect':
      return (
        <rect
          key={k}
          x={o.x}
          y={o.y}
          width={Math.max(0, o.w)}
          height={Math.max(0, o.h)}
          rx={o.r ?? 0}
          fill={o.fill ?? 'none'}
          fillOpacity={o.fo ?? 1}
          stroke={o.stroke ?? 'none'}
          strokeWidth={o.sw ?? 0}
          strokeDasharray={o.dash ? '4 3' : undefined}
          opacity={op}
        />
      );
    case 'line':
      return <line key={k} x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} stroke={o.stroke} strokeWidth={o.sw} strokeDasharray={o.dash ? '4 3' : undefined} opacity={op} />;
    case 'poly': {
      const pts = o.pts.map((q) => `${q[0]},${q[1]}`).join(' ');
      return o.closed ? (
        <polygon key={k} points={pts} fill={o.fill ?? 'none'} stroke={o.stroke ?? 'none'} strokeWidth={o.sw ?? 0} opacity={op} />
      ) : (
        <polyline key={k} points={pts} fill="none" stroke={o.stroke ?? 'none'} strokeWidth={o.sw ?? 0} strokeDasharray={o.dash ? '5 4' : undefined} strokeLinejoin="round" opacity={op} />
      );
    }
    case 'text':
      return (
        <text key={k} x={o.x} y={o.y} fill={o.fill} fontSize={o.size} textAnchor={o.anchor} fontWeight={o.bold ? 700 : 400} opacity={op} fontFamily="inherit">
          {o.text}
        </text>
      );
    case 'circle':
      return <circle key={k} cx={o.cx} cy={o.cy} r={Math.max(0, o.r)} fill={o.fill ?? 'none'} stroke={o.stroke ?? 'none'} strokeWidth={o.sw ?? 0} opacity={op} />;
  }
}
