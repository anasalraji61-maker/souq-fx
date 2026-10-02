import React from 'react';
import { LangId, DICTS } from '../../i18n/locales';
import { MarketSymbol, Timeframe } from '../../types/market';
import { User, Globe, Sliders, ShieldAlert, Sparkles, Check, Volume2, Grid } from 'lucide-react';

interface AccountScreenProps {
  currentLang: LangId;
  onLanguageChange: (lang: LangId) => void;
  symbols: MarketSymbol[];
  defaultSymbol: string;
  onDefaultSymbolChange: (sym: string) => void;
  defaultTimeframe: Timeframe;
  onDefaultTimeframeChange: (tf: Timeframe) => void;
  soundEnabled: boolean;
  onSoundEnabledToggle: () => void;
  showGrid: boolean;
  onShowGridToggle: () => void;
  onRestartOnboarding: () => void;
}

export const AccountScreen: React.FC<AccountScreenProps> = ({
  currentLang,
  onLanguageChange,
  symbols,
  defaultSymbol,
  onDefaultSymbolChange,
  defaultTimeframe,
  onDefaultTimeframeChange,
  soundEnabled,
  onSoundEnabledToggle,
  showGrid,
  onShowGridToggle,
  onRestartOnboarding,
}) => {
  const dict = DICTS[currentLang];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 select-none text-xs">
      {/* Profile Card */}
      <div className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#2DD4BF] to-[#38BDF8] flex items-center justify-center text-[#042F2E] font-bold text-lg shadow-lg">
            FX
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#E8EEF9]">متداول MATRIX</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2DD4BF]/15 text-[#2DD4BF] border border-[#2DD4BF]/30">
                PRO ACTIVE
              </span>
            </div>
            <p className="text-[#7B8DA8] text-xs font-mono mt-0.5">ID: MTX-9482104 • ترخيص تحليلي شخصي</p>
          </div>
        </div>

        <button
          onClick={onRestartOnboarding}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#162033] hover:bg-[#1E293B] border border-[#243049] text-[#A3B4D0] hover:text-[#E8EEF9] transition-colors"
        >
          <Sparkles className="w-4 h-4 text-[#2DD4BF]" />
          <span>{dict.onboardingReplay}</span>
        </button>
      </div>

      {/* Email Verification Card */}
      <div className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-[#E8EEF9]">
            <Check className="w-4 h-4 text-[#2DD4BF]" />
            <h3>التحقق من البريد الإلكتروني (Email Verification)</h3>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <Check className="w-3 h-3" />
            مفعّل وآمن
          </span>
        </div>
        <p className="text-[#7B8DA8]">
          البريد المسجل: <span className="font-mono text-[#E8EEF9]">anasalraji61@gmail.com</span> (تم التحقق وتأمين استعادة الحساب وتنبيهات الأسعار).
        </p>
      </div>

      {/* Language Selector Card */}
      <div className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[#E8EEF9]">
          <Globe className="w-4 h-4 text-[#2DD4BF]" />
          <h3>{dict.language}</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onLanguageChange('ar')}
            className={`p-3 rounded-lg border text-right transition-colors flex items-center justify-between ${
              currentLang === 'ar'
                ? 'bg-[#2DD4BF]/15 border-[#2DD4BF] text-[#2DD4BF] font-bold'
                : 'bg-[#0B1220] border-[#243049] text-[#A3B4D0] hover:text-[#E8EEF9]'
            }`}
          >
            <div>
              <div className="text-sm">العربية (Arabic)</div>
              <div className="text-[10px] text-[#7B8DA8]">واجهة كاملة من اليمين لليسار</div>
            </div>
            {currentLang === 'ar' && <Check className="w-4 h-4" />}
          </button>

          <button
            onClick={() => onLanguageChange('en-US')}
            className={`p-3 rounded-lg border text-left transition-colors flex items-center justify-between ${
              currentLang === 'en-US'
                ? 'bg-[#2DD4BF]/15 border-[#2DD4BF] text-[#2DD4BF] font-bold'
                : 'bg-[#0B1220] border-[#243049] text-[#A3B4D0] hover:text-[#E8EEF9]'
            }`}
          >
            <div>
              <div className="text-sm">English (US)</div>
              <div className="text-[10px] text-[#7B8DA8]">Left to Right Terminal Layout</div>
            </div>
            {currentLang === 'en-US' && <Check className="w-4 h-4" />}
          </button>

          <button
            onClick={() => onLanguageChange('ku')}
            className={`p-3 rounded-lg border text-right transition-colors flex items-center justify-between ${
              currentLang === 'ku'
                ? 'bg-[#2DD4BF]/15 border-[#2DD4BF] text-[#2DD4BF] font-bold'
                : 'bg-[#0B1220] border-[#243049] text-[#A3B4D0] hover:text-[#E8EEF9]'
            }`}
          >
            <div>
              <div className="text-sm">کوردی (Kurdish)</div>
              <div className="text-[10px] text-[#7B8DA8]">ڕووکاری چارت بە کوردی</div>
            </div>
            {currentLang === 'ku' && <Check className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Terminal Preferences Card */}
      <div className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#E8EEF9]">
          <Sliders className="w-4 h-4 text-[#2DD4BF]" />
          <h3>{dict.terminalPreferences}</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[#A3B4D0] mb-1 font-medium">{dict.defaultSymbol}</label>
            <select
              value={defaultSymbol}
              onChange={(e) => onDefaultSymbolChange(e.target.value)}
              className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2.5 text-[#E8EEF9] font-mono"
            >
              {symbols.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.name} ({s.symbol})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#A3B4D0] mb-1 font-medium">{dict.defaultTimeframe}</label>
            <select
              value={defaultTimeframe}
              onChange={(e) => onDefaultTimeframeChange(e.target.value as Timeframe)}
              className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2.5 text-[#E8EEF9] font-mono"
            >
              <option value="1m">1 دقيقة (1m)</option>
              <option value="5m">5 دقائق (5m)</option>
              <option value="15m">15 دقيقة (15m)</option>
              <option value="1h">1 ساعة (1h)</option>
              <option value="4h">4 ساعات (4h)</option>
              <option value="1D">1 يوم (1D)</option>
            </select>
          </div>

          {/* Sound toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#0B1220] border border-[#243049]">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#2DD4BF]" />
              <span className="text-[#E8EEF9]">{dict.soundEffects}</span>
            </div>
            <button
              onClick={onSoundEnabledToggle}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                soundEnabled ? 'bg-[#2DD4BF]' : 'bg-[#243049]'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-[#042F2E] absolute top-0.5 transition-transform ${
                  soundEnabled ? 'right-5' : 'right-1'
                }`}
              />
            </button>
          </div>

          {/* Grid toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#0B1220] border border-[#243049]">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-[#2DD4BF]" />
              <span className="text-[#E8EEF9]">{dict.chartGrid}</span>
            </div>
            <button
              onClick={onShowGridToggle}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                showGrid ? 'bg-[#2DD4BF]' : 'bg-[#243049]'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-[#042F2E] absolute top-0.5 transition-transform ${
                  showGrid ? 'right-5' : 'right-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Regulatory & Risk Disclaimer Box */}
      <div className="p-5 bg-[#0E1728] rounded-xl border border-[#243049] space-y-2 text-[#7B8DA8]">
        <div className="flex items-center gap-2 text-[#F59E0B] font-bold text-xs">
          <ShieldAlert className="w-4 h-4" />
          <h4>{dict.disclaimerTitle}</h4>
        </div>
        <p className="leading-relaxed text-[11px] text-[#A3B4D0]">{dict.disclaimerText}</p>
        <div className="text-[10px] text-[#7B8DA8] pt-2 border-t border-[#243049]/40 font-mono">
          MATRIX Core Technical Engine v1.0 • Isolated Sandbox
        </div>
      </div>
    </div>
  );
};
