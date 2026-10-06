import React, { useState } from 'react';
import { IndicatorInstance, DrawingItem } from '../../../types/market';
import { X, Layers, Eye, EyeOff, Lock, Unlock, Trash2, Settings, PenTool, Hash } from 'lucide-react';
import { tl, fmt, getActiveLang } from '../../../i18n/locales';

interface ObjectTreePanelProps {
  isOpen: boolean;
  onClose: () => void;
  indicators: IndicatorInstance[];
  drawings: DrawingItem[];
  onUpdateIndicator: (ind: IndicatorInstance) => void;
  onDeleteIndicator: (id: string) => void;
  onUpdateDrawing: (draw: DrawingItem) => void;
  onDeleteDrawing: (id: string) => void;
  onClearAllDrawings: () => void;
  onOpenIndicatorSettings: (ind: IndicatorInstance) => void;
}

export const ObjectTreePanel: React.FC<ObjectTreePanelProps> = ({
  isOpen,
  onClose,
  indicators,
  drawings,
  onUpdateIndicator,
  onDeleteIndicator,
  onUpdateDrawing,
  onDeleteDrawing,
  onClearAllDrawings,
  onOpenIndicatorSettings,
}) => {
  const [tab, setTab] = useState<'all' | 'indicators' | 'drawings'>('all');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="w-[460px] max-w-[95vw] bg-[#0E1626] border border-[#243049] rounded-xl shadow-2xl overflow-hidden flex flex-col text-xs max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E283D] bg-[#0A101D]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2DD4BF]" />
            <h3 className="font-bold text-sm text-[#E8EEF9]">{tl().tm2_218}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#7B8DA8] hover:text-white hover:bg-[#1C2740] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 py-2 border-b border-[#1E283D] bg-[#0B1322] flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTab('all')}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                tab === 'all'
                  ? 'bg-[#1C2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                  : 'text-[#7B8DA8] hover:text-white'
              }`}
            >
              {tl().mx_all} ({indicators.length + drawings.length})
            </button>
            <button
              onClick={() => setTab('indicators')}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                tab === 'indicators'
                  ? 'bg-[#1C2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                  : 'text-[#7B8DA8] hover:text-white'
              }`}
            >
              {tl().mx_indicators} ({indicators.length})
            </button>
            <button
              onClick={() => setTab('drawings')}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                tab === 'drawings'
                  ? 'bg-[#1C2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                  : 'text-[#7B8DA8] hover:text-white'
              }`}
            >
              {tl().mx_drawings} ({drawings.length})
            </button>
          </div>

          {drawings.length > 0 && (
            <button
              onClick={onClearAllDrawings}
              className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              {tl().tm2_219}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 max-h-[460px]">
          {/* Indicators Section */}
          {(tab === 'all' || tab === 'indicators') && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-[#7B8DA8] uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-[#2DD4BF]" />
                {tl().mx_activeInd} ({indicators.length})
              </div>
              {indicators.length === 0 ? (
                <div className="text-[#64748B] text-center py-4 bg-[#141E30] rounded-lg">
                  {tl().tm2_220}
                </div>
              ) : (
                indicators.map((ind) => (
                  <div
                    key={ind.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#141E30] border border-[#243049] hover:border-[#334155] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ind.color }} />
                      <div>
                        <div className="font-bold text-[#E8EEF9] text-xs">
                          {getActiveLang() === 'ar' ? ind.nameAr || ind.name : ind.name}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          {ind.pane === 'main' ? tl().tm2_221 : tl().tm2_222}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateIndicator({ ...ind, visible: !ind.visible })}
                        title={ind.visible ? tl().tm2_223 : tl().tm2_224}
                        className="p-1.5 rounded hover:bg-[#1E293B] text-[#7B8DA8] hover:text-white transition-colors"
                      >
                        {ind.visible ? <Eye className="w-3.5 h-3.5 text-[#2DD4BF]" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => onOpenIndicatorSettings(ind)}
                        title={tl().tm2_225}
                        className="p-1.5 rounded hover:bg-[#1E293B] text-[#7B8DA8] hover:text-white transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteIndicator(ind.id)}
                        title={tl().tm2_226}
                        className="p-1.5 rounded hover:bg-[#1E293B] text-[#7B8DA8] hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Drawings Section */}
          {(tab === 'all' || tab === 'drawings') && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-[#7B8DA8] uppercase tracking-wider flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-[#38BDF8]" />
                {tl().mx_drawShapes} ({drawings.length})
              </div>
              {drawings.length === 0 ? (
                <div className="text-[#64748B] text-center py-4 bg-[#141E30] rounded-lg">
                  {tl().tm2_227}
                </div>
              ) : (
                drawings.map((draw, idx) => (
                  <div
                    key={draw.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#141E30] border border-[#243049] hover:border-[#334155] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: draw.color || '#2DD4BF' }} />
                      <div>
                        <div className="font-bold text-[#E8EEF9] text-xs">
                          {getDrawingTypeName(draw.type)} #{idx + 1}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          {draw.points.length > 0 ? fmt(tl().tm2_228, { price: draw.points[0].price.toFixed(4) }) : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateDrawing({ ...draw, locked: !draw.locked })}
                        title={draw.locked ? tl().tm2_229 : tl().tm2_230}
                        className={`p-1.5 rounded hover:bg-[#1E293B] transition-colors ${
                          draw.locked ? 'text-amber-400' : 'text-[#7B8DA8] hover:text-white'
                        }`}
                      >
                        {draw.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => onUpdateDrawing({ ...draw, hidden: !draw.hidden })}
                        title={draw.hidden ? tl().tm2_224 : tl().tm2_223}
                        className="p-1.5 rounded hover:bg-[#1E293B] text-[#7B8DA8] hover:text-white transition-colors"
                      >
                        {draw.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-[#2DD4BF]" />}
                      </button>
                      <button
                        onClick={() => onDeleteDrawing(draw.id)}
                        title={tl().tm2_231}
                        className="p-1.5 rounded hover:bg-[#1E293B] text-[#7B8DA8] hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1E283D] bg-[#0A101D] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold text-xs transition-colors"
          >
            {tl().tm2_232}
          </button>
        </div>
      </div>
    </div>
  );
};

function getDrawingTypeName(type: string): string {
  switch (type) {
    case 'trendline': return tl().tm2_233;
    case 'horizontal': return tl().tm2_234;
    case 'vertical': return tl().tm2_235;
    case 'ray': return tl().tm2_236;
    case 'extended': return tl().tm2_237;
    case 'channel': return tl().tm2_238;
    case 'arrow': return tl().tm2_239;
    case 'text': return tl().tm2_240;
    case 'box': return tl().tm2_241;
    case 'fibonacci': return tl().tm2_242;
    case 'measure': return tl().tm2_243;
    case 'price_range': return tl().tm2_244;
    case 'date_range': return tl().tm2_245;
    case 'position_long': return tl().tm2_246;
    case 'position_short': return tl().tm2_247;
    default: return type;
  }
}
