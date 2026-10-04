import React from 'react';
import { DrawingItem } from '../../../types/market';
import { Lock, Unlock, Eye, EyeOff, Trash2 } from 'lucide-react';

interface DrawingStyleBarProps {
  drawing: DrawingItem | null;
  onUpdate: (updated: DrawingItem) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const COLORS = ['#2DD4BF', '#38BDF8', '#F59E0B', '#EF4444', '#10B981', '#A78BFA', '#FFFFFF'];

export const DrawingStyleBar: React.FC<DrawingStyleBarProps> = ({
  drawing,
  onUpdate,
  onDelete,
  onClose,
}) => {
  if (!drawing) return null;

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-[#0F172A]/95 backdrop-blur border border-[#334155] px-3 py-1.5 rounded-lg shadow-2xl text-xs select-none animate-in fade-in zoom-in-95">
      {/* Color options */}
      <div className="flex items-center gap-1 pl-2 border-l border-[#334155]">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onUpdate({ ...drawing, color: c })}
            className={`w-4 h-4 rounded-full transition-transform ${
              drawing.color === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110 opacity-80'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* Line Width */}
      <div className="flex items-center gap-1 pl-2 border-l border-[#334155]">
        {[1, 2, 3].map((w) => (
          <button
            key={w}
            onClick={() => onUpdate({ ...drawing, lineWidth: w })}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
              (drawing.lineWidth || 1) === w
                ? 'bg-[#1E293B] text-[#2DD4BF] font-bold'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            {w}px
          </button>
        ))}
      </div>

      {/* Line Style */}
      <div className="flex items-center gap-1 pl-2 border-l border-[#334155]">
        {(['solid', 'dashed', 'dotted'] as const).map((style) => (
          <button
            key={style}
            onClick={() => onUpdate({ ...drawing, lineStyle: style })}
            className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
              (drawing.lineStyle || 'solid') === style
                ? 'bg-[#1E293B] text-[#2DD4BF] font-bold'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            {style === 'solid' ? 'متصل' : style === 'dashed' ? 'متقطع' : 'منقط'}
          </button>
        ))}
      </div>

      {/* Lock / Unlock */}
      <button
        onClick={() => onUpdate({ ...drawing, locked: !drawing.locked })}
        title={drawing.locked ? 'إلغاء القفل' : 'قفل الرسم'}
        className={`p-1 rounded transition-colors ${
          drawing.locked ? 'bg-amber-500/20 text-amber-400' : 'text-[#94A3B8] hover:text-white'
        }`}
      >
        {drawing.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
      </button>

      {/* Hide / Show */}
      <button
        onClick={() => onUpdate({ ...drawing, hidden: !drawing.hidden })}
        title={drawing.hidden ? 'إظهار' : 'إخفاء'}
        className="p-1 rounded text-[#94A3B8] hover:text-white transition-colors"
      >
        {drawing.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>

      {/* Delete */}
      <button
        onClick={() => {
          onDelete(drawing.id);
          onClose();
        }}
        title="حذف الرسم"
        className="p-1 rounded text-[#94A3B8] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Close stylebar */}
      <button
        onClick={onClose}
        className="text-[#94A3B8] hover:text-white text-xs px-1"
        title="إغلاق"
      >
        ✕
      </button>
    </div>
  );
};
