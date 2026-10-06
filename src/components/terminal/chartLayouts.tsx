import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Multi-chart layouts (TradingView style) + draggable splitters.
 * Grid lines are 1-based; every layout is drawn left-to-right (the grid container is dir="ltr").
 */
export type LayoutType =
  | '1'
  | '2-side'
  | '2-stack'
  | '3' // legacy (old 2x2 with 3 cells) – rendered as 1+2
  | '3H'
  | '3V'
  | '4H'
  | '4V'
  | '4'
  | '1+2'
  | '1+3'
  | '2+1';

interface CellArea {
  c0: number; // column start line
  c1: number; // column end line
  r0: number; // row start line
  r1: number; // row end line
}

export interface LayoutSpec {
  id: LayoutType;
  label: string;
  title: string;
  cols: number;
  rows: number;
  areas: CellArea[];
}

const a = (c0: number, c1: number, r0: number, r1: number): CellArea => ({ c0, c1, r0, r1 });

const ONE_PLUS_TWO: Omit<LayoutSpec, 'id' | 'label' | 'title'> = {
  cols: 2,
  rows: 2,
  areas: [a(1, 2, 1, 3), a(2, 3, 1, 2), a(2, 3, 2, 3)],
};

export const LAYOUT_SPECS: LayoutSpec[] = [
  { id: '1', label: '1', title: 'شارت واحد', cols: 1, rows: 1, areas: [a(1, 2, 1, 2)] },
  { id: '2-side', label: '2H', title: 'شارتان جنباً إلى جنب', cols: 2, rows: 1, areas: [a(1, 2, 1, 2), a(2, 3, 1, 2)] },
  { id: '2-stack', label: '2V', title: 'شارتان فوق بعض', cols: 1, rows: 2, areas: [a(1, 2, 1, 2), a(1, 2, 2, 3)] },
  {
    id: '3H',
    label: '3H',
    title: '3 أعمدة',
    cols: 3,
    rows: 1,
    areas: [a(1, 2, 1, 2), a(2, 3, 1, 2), a(3, 4, 1, 2)],
  },
  {
    id: '3V',
    label: '3V',
    title: '3 صفوف',
    cols: 1,
    rows: 3,
    areas: [a(1, 2, 1, 2), a(1, 2, 2, 3), a(1, 2, 3, 4)],
  },
  { id: '1+2', label: '1+2', title: 'شارت كبير يسار + 2 يمين', ...ONE_PLUS_TWO },
  {
    id: '2+1',
    label: '2+1',
    title: '2 في الأعلى + 1 عريض في الأسفل',
    cols: 2,
    rows: 2,
    areas: [a(1, 2, 1, 2), a(2, 3, 1, 2), a(1, 3, 2, 3)],
  },
  {
    id: '4',
    label: '4G',
    title: 'شبكة 2×2',
    cols: 2,
    rows: 2,
    areas: [a(1, 2, 1, 2), a(2, 3, 1, 2), a(1, 2, 2, 3), a(2, 3, 2, 3)],
  },
  {
    id: '4H',
    label: '4H',
    title: '4 أعمدة',
    cols: 4,
    rows: 1,
    areas: [a(1, 2, 1, 2), a(2, 3, 1, 2), a(3, 4, 1, 2), a(4, 5, 1, 2)],
  },
  {
    id: '4V',
    label: '4V',
    title: '4 صفوف',
    cols: 1,
    rows: 4,
    areas: [a(1, 2, 1, 2), a(1, 2, 2, 3), a(1, 2, 3, 4), a(1, 2, 4, 5)],
  },
  {
    id: '1+3',
    label: '1+3',
    title: 'شارت كبير يسار + 3 يمين',
    cols: 2,
    rows: 3,
    areas: [a(1, 2, 1, 4), a(2, 3, 1, 2), a(2, 3, 2, 3), a(2, 3, 3, 4)],
  },
];

const LEGACY_3: LayoutSpec = { id: '3', label: '1+2', title: 'شارت كبير + 2', ...ONE_PLUS_TWO };

export function getLayoutSpec(id: LayoutType): LayoutSpec {
  if (id === '3') return LEGACY_3;
  return LAYOUT_SPECS.find((s) => s.id === id) || LAYOUT_SPECS[0];
}

export function isLayoutType(v: unknown): v is LayoutType {
  return typeof v === 'string' && (v === '3' || LAYOUT_SPECS.some((s) => s.id === v));
}

/** Tablet: at most 2 cells. Falls back to the closest 2-cell shape. */
export function effectiveLayout(id: LayoutType, maxCells: number): LayoutSpec {
  const spec = getLayoutSpec(id);
  if (spec.areas.length <= maxCells) return spec;
  if (maxCells <= 1) return LAYOUT_SPECS[0];
  return getLayoutSpec(spec.rows > spec.cols ? '2-stack' : '2-side');
}

export interface LayoutSizes {
  cols: number[];
  rows: number[];
}

export function defaultSizes(spec: LayoutSpec): LayoutSizes {
  const cols = Array.from({ length: spec.cols }, () => 1);
  const rows = Array.from({ length: spec.rows }, () => 1);
  // "1 + N" layouts: the big chart gets more width by default
  if ((spec.id === '1+2' || spec.id === '1+3' || spec.id === '3') && cols.length === 2) cols[0] = 1.6;
  if (spec.id === '2+1' && rows.length === 2) rows[1] = 1.2;
  return { cols, rows };
}

function validSizes(v: unknown, spec: LayoutSpec): v is LayoutSizes {
  if (!v || typeof v !== 'object') return false;
  const s = v as LayoutSizes;
  const ok = (arr: unknown, n: number) =>
    Array.isArray(arr) && arr.length === n && arr.every((x) => typeof x === 'number' && isFinite(x) && x > 0);
  return ok(s.cols, spec.cols) && ok(s.rows, spec.rows);
}

const SIZES_KEY = 'matrix.layout.sizes.v1';

function readAllSizes(): Record<string, LayoutSizes> {
  try {
    const raw = localStorage.getItem(SIZES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Splitter sizes for the current layout; remembered per layout on this device. */
export function useLayoutSizes(spec: LayoutSpec) {
  const [sizes, setSizesState] = useState<LayoutSizes>(() => {
    const saved = readAllSizes()[spec.id];
    return validSizes(saved, spec) ? saved : defaultSizes(spec);
  });

  useEffect(() => {
    const saved = readAllSizes()[spec.id];
    setSizesState(validSizes(saved, spec) ? saved : defaultSizes(spec));
  }, [spec]);

  const setSizes = useCallback(
    (next: LayoutSizes) => {
      if (!validSizes(next, spec)) return;
      setSizesState(next);
      try {
        const all = readAllSizes();
        all[spec.id] = next;
        localStorage.setItem(SIZES_KEY, JSON.stringify(all));
      } catch {
        // ignore
      }
    },
    [spec]
  );

  const resetSizes = useCallback(() => setSizes(defaultSizes(spec)), [setSizes, spec]);
  return { sizes, setSizes, resetSizes };
}

const frac = (arr: number[], upto: number) => {
  const total = arr.reduce((s, x) => s + x, 0) || 1;
  return arr.slice(0, upto).reduce((s, x) => s + x, 0) / total;
};

interface SplitterProps {
  orientation: 'col' | 'row';
  index: number; // boundary between track index and index+1 (0-based)
  sizes: LayoutSizes;
  spec: LayoutSpec;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onChange: (next: LayoutSizes) => void;
  onReset: () => void;
}

/** Thin draggable handle on a grid boundary. Only covers the part of the boundary that really separates cells. */
const Splitter: React.FC<SplitterProps> = ({ orientation, index, sizes, spec, containerRef, onChange, onReset }) => {
  const dragRef = useRef<{ start: number; tracks: number[]; total: number; px: number } | null>(null);
  const [active, setActive] = useState(false);
  const isCol = orientation === 'col';
  const tracks = isCol ? sizes.cols : sizes.rows;
  const line = index + 2; // grid line between track index and index+1

  // Extent along the other axis: union of cells that touch this line from either side.
  const touching = spec.areas.filter((ar) => (isCol ? ar.c1 === line || ar.c0 === line : ar.r1 === line || ar.r0 === line));
  if (touching.length === 0) return null;
  const otherTracks = isCol ? sizes.rows : sizes.cols;
  const from = Math.min(...touching.map((ar) => (isCol ? ar.r0 : ar.c0))) - 1;
  const to = Math.max(...touching.map((ar) => (isCol ? ar.r1 : ar.c1))) - 1;
  // A boundary that a spanning cell crosses (e.g. under the wide bottom chart of 2+1) is not draggable there.
  const crossed = spec.areas.some((ar) =>
    isCol ? ar.c0 < line && ar.c1 > line && ar.r0 - 1 < to && ar.r1 - 1 > from : ar.r0 < line && ar.r1 > line && ar.c0 - 1 < to && ar.c1 - 1 > from
  );
  if (crossed) return null;

  const pos = frac(tracks, index + 1) * 100;
  const startPct = frac(otherTracks, from) * 100;
  const endPct = frac(otherTracks, to) * 100;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      start: isCol ? e.clientX : e.clientY,
      tracks: [...tracks],
      total: tracks.reduce((s, x) => s + x, 0),
      px: isCol ? box.width : box.height,
    };
    setActive(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.px <= 0) return;
    const deltaPx = (isCol ? e.clientX : e.clientY) - d.start;
    const delta = (deltaPx / d.px) * d.total;
    const pair = d.tracks[index] + d.tracks[index + 1];
    const min = pair * 0.15;
    const left = Math.max(min, Math.min(pair - min, d.tracks[index] + delta));
    const next = [...d.tracks];
    next[index] = left;
    next[index + 1] = pair - left;
    onChange(isCol ? { cols: next, rows: sizes.rows } : { cols: sizes.cols, rows: next });
  };

  const end = () => {
    dragRef.current = null;
    setActive(false);
  };

  const style: React.CSSProperties = isCol
    ? { left: `${pos}%`, top: `${startPct}%`, height: `${endPct - startPct}%`, width: 9, transform: 'translateX(-50%)' }
    : { top: `${pos}%`, left: `${startPct}%`, width: `${endPct - startPct}%`, height: 9, transform: 'translateY(-50%)' };

  return (
    <div
      role="separator"
      aria-orientation={isCol ? 'vertical' : 'horizontal'}
      title="اسحب لتغيير الحجم • نقرتان لإعادة الضبط"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={onReset}
      style={{ ...style, touchAction: 'none' }}
      className={`absolute z-30 group/split ${isCol ? 'cursor-col-resize' : 'cursor-row-resize'}`}
    >
      <div
        className={`absolute rounded-full transition-colors ${
          active ? 'bg-[#2DD4BF]' : 'bg-transparent group-hover/split:bg-[#2DD4BF]/60'
        } ${isCol ? 'left-1/2 -translate-x-1/2 top-0 bottom-0 w-[3px]' : 'top-1/2 -translate-y-1/2 left-0 right-0 h-[3px]'}`}
      />
    </div>
  );
};

interface LayoutGridProps {
  spec: LayoutSpec;
  sizes: LayoutSizes;
  onSizesChange: (next: LayoutSizes) => void;
  onResetSizes: () => void;
  children: React.ReactNode[];
}

/** Grid container: places each child in its area and draws the splitters. */
export const LayoutGrid: React.FC<LayoutGridProps> = ({ spec, sizes, onSizesChange, onResetSizes, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const single = children.length <= 1;
  return (
    <div
      ref={ref}
      dir="ltr"
      className="flex-1 relative grid gap-[3px] p-[2px] h-full w-full overflow-hidden bg-[#050B14]"
      style={
        single
          ? { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' }
          : {
              gridTemplateColumns: sizes.cols.map((f) => `minmax(0, ${f}fr)`).join(' '),
              gridTemplateRows: sizes.rows.map((f) => `minmax(0, ${f}fr)`).join(' '),
            }
      }
    >
      {children.map((child, i) => {
        const ar = spec.areas[i];
        return (
          <div
            key={i}
            dir="rtl"
            className="min-w-0 min-h-0 h-full w-full"
            style={single || !ar ? undefined : { gridColumn: `${ar.c0} / ${ar.c1}`, gridRow: `${ar.r0} / ${ar.r1}` }}
          >
            {child}
          </div>
        );
      })}
      {!single &&
        sizes.cols.slice(0, -1).map((_, i) => (
          <Splitter
            key={`c${i}`}
            orientation="col"
            index={i}
            sizes={sizes}
            spec={spec}
            containerRef={ref}
            onChange={onSizesChange}
            onReset={onResetSizes}
          />
        ))}
      {!single &&
        sizes.rows.slice(0, -1).map((_, i) => (
          <Splitter
            key={`r${i}`}
            orientation="row"
            index={i}
            sizes={sizes}
            spec={spec}
            containerRef={ref}
            onChange={onSizesChange}
            onReset={onResetSizes}
          />
        ))}
    </div>
  );
};

/** Small icon of a layout (drawn with divs), used in the picker. */
export const LayoutIcon: React.FC<{ spec: LayoutSpec; active?: boolean }> = ({ spec, active }) => (
  <div
    dir="ltr"
    className="grid gap-[2px] w-7 h-5"
    style={{
      gridTemplateColumns: `repeat(${spec.cols}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${spec.rows}, minmax(0, 1fr))`,
    }}
  >
    {spec.areas.map((ar, i) => (
      <div
        key={i}
        className={`rounded-[2px] border ${active ? 'bg-[#2DD4BF]/40 border-[#2DD4BF]' : 'bg-[#1C2740] border-[#3A4A66]'}`}
        style={{ gridColumn: `${ar.c0} / ${ar.c1}`, gridRow: `${ar.r0} / ${ar.r1}` }}
      />
    ))}
  </div>
);

interface LayoutPickerProps {
  value: LayoutType;
  onChange: (id: LayoutType) => void;
  maxCells: number;
}

/** One button + dropdown with all layout icons (Arabic tooltips). */
export const LayoutPicker: React.FC<LayoutPickerProps> = ({ value, onChange, maxCells }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const current = getLayoutSpec(value);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={`التخطيط: ${current.title}`}
        className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-[#1C2740] transition-colors"
      >
        <LayoutIcon spec={current} active />
        <span className="text-[10px] font-mono font-bold text-[#A3B4D0]">{current.label}</span>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-[236px] p-2 rounded-lg bg-[#0E1626] border border-[#24344E] shadow-2xl">
          <div className="text-[10px] text-[#7B8DA8] mb-1.5 px-0.5">تخطيط الشارتات</div>
          <div className="grid grid-cols-4 gap-1.5">
            {LAYOUT_SPECS.map((spec) => {
              const disabled = spec.areas.length > maxCells;
              const isActive = spec.id === value || (value === '3' && spec.id === '1+2');
              return (
                <button
                  key={spec.id}
                  disabled={disabled}
                  onClick={() => {
                    onChange(spec.id);
                    setOpen(false);
                  }}
                  title={disabled ? `${spec.title} (غير متاح على هذه الشاشة)` : spec.title}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-md border transition-colors ${
                    isActive ? 'border-[#2DD4BF]/70 bg-[#12263A]' : 'border-transparent hover:bg-[#16233B]'
                  } ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <LayoutIcon spec={spec} active={isActive} />
                  <span className="text-[9px] font-mono text-[#A3B4D0]">{spec.label}</span>
                </button>
              );
            })}
          </div>
          <div className="text-[9px] text-[#64748B] mt-1.5 px-0.5">اسحب الفواصل بين الشارتات لتغيير الحجم</div>
        </div>
      )}
    </div>
  );
};
