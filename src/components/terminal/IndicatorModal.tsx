import React from 'react';
import { IndicatorSettings } from '../../types/market';
import { X, Check } from 'lucide-react';

interface IndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicators: IndicatorSettings;
  onChange: (updated: IndicatorSettings) => void;
}

export const IndicatorModal: React.FC<IndicatorModalProps> = ({
  isOpen,
  onClose,
  indicators,
  onChange,
}) => {
  if (!isOpen) return null;

  const toggle = (key: keyof IndicatorSettings) => {
    onChange({
      ...indicators,
      [key]: !indicators[key],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="w-[420px] bg-[#121A2B] border border-[#243049] rounded-xl shadow-2xl overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#243049] bg-[#0E1728]">
          <h3 className="font-bold text-sm text-[#E8EEF9]">إعدادات المؤشرات الفنية (Indicators)</h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#7B8DA8] hover:text-[#E8EEF9] hover:bg-[#1C2740]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3 max-h-[440px] overflow-y-auto">
          {/* Overlays */}
          <div className="text-[11px] font-semibold text-[#7B8DA8] uppercase tracking-wider">
            المؤشرات المتراكبة على السعر (Overlays)
          </div>

          <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#162033] hover:bg-[#1E293B] cursor-pointer transition-colors border border-[#243049]/50">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#2DD4BF]" />
              <span className="font-medium text-[#E8EEF9]">متوسط متحرك 20 (SMA 20)</span>
            </div>
            <input
              type="checkbox"
              checked={indicators.showSma20}
              onChange={() => toggle('showSma20')}
              className="accent-[#2DD4BF] w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#162033] hover:bg-[#1E293B] cursor-pointer transition-colors border border-[#243049]/50">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
              <span className="font-medium text-[#E8EEF9]">متوسط متحرك 50 (SMA 50)</span>
            </div>
            <input
              type="checkbox"
              checked={indicators.showSma50}
              onChange={() => toggle('showSma50')}
              className="accent-[#2DD4BF] w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#162033] hover:bg-[#1E293B] cursor-pointer transition-colors border border-[#243049]/50">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#A78BFA]" />
              <span className="font-medium text-[#E8EEF9]">متوسط متحرك 200 (SMA 200)</span>
            </div>
            <input
              type="checkbox"
              checked={indicators.showSma200}
              onChange={() => toggle('showSma200')}
              className="accent-[#2DD4BF] w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#162033] hover:bg-[#1E293B] cursor-pointer transition-colors border border-[#243049]/50">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#38BDF8]" />
              <span className="font-medium text-[#E8EEF9]">بولينجر باندز (Bollinger Bands 20, 2)</span>
            </div>
            <input
              type="checkbox"
              checked={indicators.showBollinger}
              onChange={() => toggle('showBollinger')}
              className="accent-[#2DD4BF] w-4 h-4 cursor-pointer"
            />
          </label>

          {/* Sub-pane Oscillators */}
          <div className="text-[11px] font-semibold text-[#7B8DA8] uppercase tracking-wider pt-2">
            المذبذبات واللوحات السفلية (Oscillators)
          </div>

          <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#162033] hover:bg-[#1E293B] cursor-pointer transition-colors border border-[#243049]/50">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#A78BFA]" />
              <div>
                <div className="font-medium text-[#E8EEF9]">مؤشر القوة النسبية (RSI 14)</div>
                <div className="text-[10px] text-[#7B8DA8]">مستويات التشبع 70 و 30</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={indicators.showRsi}
              onChange={() => toggle('showRsi')}
              className="accent-[#2DD4BF] w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#162033] hover:bg-[#1E293B] cursor-pointer transition-colors border border-[#243049]/50">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#38BDF8]" />
              <div>
                <div className="font-medium text-[#E8EEF9]">مؤشر الماكد (MACD 12, 26, 9)</div>
                <div className="text-[10px] text-[#7B8DA8]">الهيستوجرام وخط الإشارة</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={indicators.showMacd}
              onChange={() => toggle('showMacd')}
              className="accent-[#2DD4BF] w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#162033] hover:bg-[#1E293B] cursor-pointer transition-colors border border-[#243049]/50">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#22C55E]" />
              <span className="font-medium text-[#E8EEF9]">أعمدة حجم التداول (Volume)</span>
            </div>
            <input
              type="checkbox"
              checked={indicators.showVolume}
              onChange={() => toggle('showVolume')}
              className="accent-[#2DD4BF] w-4 h-4 cursor-pointer"
            />
          </label>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#243049] bg-[#0E1728] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold transition-colors"
          >
            تطبيق وحفظ
          </button>
        </div>
      </div>
    </div>
  );
};
