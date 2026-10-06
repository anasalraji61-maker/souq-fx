import React, { useState, useEffect } from 'react';
import { IndicatorInstance } from '../../types/market';
import { INDICATOR_CATALOG, IndicatorDefinition } from '../../data/indicators';
import { X, Check } from 'lucide-react';
import { tl, fmt, getActiveLang } from '../../i18n/locales';

interface IndicatorSettingsModalProps {
  isOpen: boolean;
  indicator: IndicatorInstance | null;
  onClose: () => void;
  onSave: (updated: IndicatorInstance) => void;
}

const PRESET_COLORS = [
  '#2DD4BF', // Teal
  '#38BDF8', // Cyan
  '#F59E0B', // Amber
  '#818CF8', // Indigo
  '#A78BFA', // Purple
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F43F5E', // Rose
  '#EAB308', // Yellow
  '#6366F1', // Violet
];

export const IndicatorSettingsModal: React.FC<IndicatorSettingsModalProps> = ({
  isOpen,
  indicator,
  onClose,
  onSave,
}) => {
  const [params, setParams] = useState<Record<string, number>>({});
  const [color, setColor] = useState<string>('#2DD4BF');

  useEffect(() => {
    if (indicator) {
      setParams({ ...indicator.params });
      setColor(indicator.color);
    }
  }, [indicator]);

  if (!isOpen || !indicator) return null;

  const def: IndicatorDefinition | undefined = INDICATOR_CATALOG.find((d) => d.type === indicator.type);

  const handleParamChange = (key: string, val: number, min = 1, max = 500) => {
    const clamped = Math.min(max, Math.max(min, isNaN(val) ? min : val));
    const next = { ...params, [key]: clamped };
    setParams(next);
    onSave({
      ...indicator,
      params: next,
      color,
    });
  };

  const handleColorChange = (c: string) => {
    setColor(c);
    onSave({
      ...indicator,
      params,
      color: c,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="w-[380px] bg-[#101827] border border-[#243049] rounded-xl shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E283D] bg-[#0B1220]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <h3 className="font-bold text-sm text-[#E8EEF9]">
              {tl().mx_settingsOf} {getActiveLang() === 'ar' ? indicator.nameAr || indicator.name : indicator.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#7B8DA8] hover:text-white hover:bg-[#1C2740] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
          {/* Parameter Inputs */}
          {def && Object.keys(def.paramLabels).length > 0 ? (
            <div className="space-y-3">
              <div className="text-[11px] font-semibold text-[#7B8DA8] uppercase tracking-wider">
                {tl().mx_inputs}
              </div>
              {Object.entries(def.paramLabels).map(([key, meta]) => {
                const currentVal = params[key] ?? def.defaultParams[key] ?? meta.min;
                return (
                  <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-[#162033] border border-[#243049]/60">
                    <div>
                      <div className="font-medium text-[#E8EEF9]">{meta.labelAr}</div>
                      <div className="text-[10px] text-[#7B8DA8]">{meta.labelEn} ({meta.min} - {meta.max})</div>
                    </div>
                    <input
                      type="number"
                      min={meta.min}
                      max={meta.max}
                      step={meta.step || 1}
                      value={currentVal}
                      onChange={(e) => handleParamChange(key, parseFloat(e.target.value), meta.min, meta.max)}
                      className="w-20 px-2 py-1 text-center font-mono font-bold bg-[#0A101D] border border-[#243049] rounded text-[#2DD4BF] focus:outline-none focus:border-[#2DD4BF]"
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-[#7B8DA8] p-2 text-center bg-[#162033] rounded-lg">
              {tl().tm_63}
            </div>
          )}

          {/* Color Selector */}
          <div className="space-y-2 pt-2 border-t border-[#1E283D]">
            <div className="text-[11px] font-semibold text-[#7B8DA8] uppercase tracking-wider">
              {tl().mx_lineStyle}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleColorChange(c)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                    color === c ? 'scale-110 ring-2 ring-white shadow-lg' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1E283D] bg-[#0B1220] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold text-xs transition-colors"
          >
            {tl().tm_64}
          </button>
        </div>
      </div>
    </div>
  );
};
