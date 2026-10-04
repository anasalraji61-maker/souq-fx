import React, { useState } from 'react';
import { IndicatorInstance, DrawingItem } from '../../../types/market';
import { X, Layers, Eye, EyeOff, Lock, Unlock, Trash2, Settings, PenTool, Hash } from 'lucide-react';

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
            <h3 className="font-bold text-sm text-[#E8EEF9]">شجرة الكائنات (Object Tree)</h3>
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
              الكل ({indicators.length + drawings.length})
            </button>
            <button
              onClick={() => setTab('indicators')}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                tab === 'indicators'
                  ? 'bg-[#1C2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                  : 'text-[#7B8DA8] hover:text-white'
              }`}
            >
              المؤشرات ({indicators.length})
            </button>
            <button
              onClick={() => setTab('drawings')}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                tab === 'drawings'
                  ? 'bg-[#1C2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                  : 'text-[#7B8DA8] hover:text-white'
              }`}
            >
              الرسومات ({drawings.length})
            </button>
          </div>

          {drawings.length > 0 && (
            <button
              onClick={onClearAllDrawings}
              className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              مسح الرسومات
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
                المؤشرات الفنية النشطة ({indicators.length})
              </div>
              {indicators.length === 0 ? (
                <div className="text-[#64748B] text-center py-4 bg-[#141E30] rounded-lg">
                  لا توجد مؤشرات نشطة على هذا الشارت.
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
                          {ind.nameAr || ind.name}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          {ind.pane === 'main' ? 'لوحة الشارت الرئيسي' : 'لوحة فرعية منفصلة'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateIndicator({ ...ind, visible: !ind.visible })}
                        title={ind.visible ? 'إخفاء' : 'إظهار'}
                        className="p-1.5 rounded hover:bg-[#1E293B] text-[#7B8DA8] hover:text-white transition-colors"
                      >
                        {ind.visible ? <Eye className="w-3.5 h-3.5 text-[#2DD4BF]" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => onOpenIndicatorSettings(ind)}
                        title="إعدادات"
                        className="p-1.5 rounded hover:bg-[#1E293B] text-[#7B8DA8] hover:text-white transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteIndicator(ind.id)}
                        title="حذف المؤشر"
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
                الرسومات والأشكال الهندسية ({drawings.length})
              </div>
              {drawings.length === 0 ? (
                <div className="text-[#64748B] text-center py-4 bg-[#141E30] rounded-lg">
                  لا توجد رسومات على هذا الشارت حالياً.
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
                          {draw.points.length > 0 ? `السعر: ${draw.points[0].price.toFixed(4)}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateDrawing({ ...draw, locked: !draw.locked })}
                        title={draw.locked ? 'إلغاء القفل' : 'قفل'}
                        className={`p-1.5 rounded hover:bg-[#1E293B] transition-colors ${
                          draw.locked ? 'text-amber-400' : 'text-[#7B8DA8] hover:text-white'
                        }`}
                      >
                        {draw.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => onUpdateDrawing({ ...draw, hidden: !draw.hidden })}
                        title={draw.hidden ? 'إظهار' : 'إخفاء'}
                        className="p-1.5 rounded hover:bg-[#1E293B] text-[#7B8DA8] hover:text-white transition-colors"
                      >
                        {draw.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-[#2DD4BF]" />}
                      </button>
                      <button
                        onClick={() => onDeleteDrawing(draw.id)}
                        title="حذف الرسم"
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
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

function getDrawingTypeName(type: string): string {
  switch (type) {
    case 'trendline': return 'خط اتجاه Trendline';
    case 'horizontal': return 'خط أفقي Horizontal';
    case 'vertical': return 'خط عمودي Vertical';
    case 'ray': return 'شعاع Ray';
    case 'extended': return 'خط ممتد Extended';
    case 'channel': return 'قناة سعرية Channel';
    case 'arrow': return 'سهم Arrow';
    case 'text': return 'نص Text';
    case 'box': return 'مستطيل Box';
    case 'fibonacci': return 'فيبوناتشي Fibonacci';
    case 'measure': return 'أداة القياس Measure';
    case 'price_range': return 'نطاق سعري Price Range';
    case 'date_range': return 'نطاق زمني Date Range';
    case 'position_long': return 'مركز شراء Long';
    case 'position_short': return 'مركز بيع Short';
    default: return type;
  }
}
