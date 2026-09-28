import React, { useState, useEffect } from 'react';
import { LangId, DICTS } from '../../i18n/locales';
import { MarketSymbol } from '../../types/market';
import {
  TrendingUp,
  Sliders,
  GraduationCap,
  User,
  Clock,
  Sparkles,
  ChevronDown,
  Globe,
} from 'lucide-react';

interface HeaderProps {
  currentTab: 'home' | 'tools' | 'academy' | 'account';
  onTabChange: (tab: 'home' | 'tools' | 'academy' | 'account') => void;
  currentLang: LangId;
  onLanguageChange: (lang: LangId) => void;
  symbols: MarketSymbol[];
  activeSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  currentLang,
  onLanguageChange,
  symbols,
  activeSymbol,
  onSelectSymbol,
}) => {
  const dict = DICTS[currentLang];
  const [timeStr, setTimeStr] = useState('');
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = now.getUTCHours().toString().padStart(2, '0');
      const m = now.getUTCMinutes().toString().padStart(2, '0');
      const s = now.getUTCSeconds().toString().padStart(2, '0');
      setTimeStr(`${h}:${m}:${s} GMT`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeSymbolObj = symbols.find((s) => s.symbol === activeSymbol) || symbols[0];

  return (
    <header className="h-12 bg-[#0E1728] border-b border-[#243049] px-4 flex items-center justify-between select-none text-xs z-30">
      {/* Left: Brand & Symbol Quick Switcher */}
      <div className="flex items-center gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#2DD4BF] to-[#38BDF8] flex items-center justify-center text-[#042F2E] font-black text-xs shadow-md">
            M
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-wider text-[#E8EEF9]">MATRIX</span>
            <span className="text-[10px] text-[#2DD4BF] font-mono mr-1.5 px-1 py-0.2 bg-[#2DD4BF]/10 rounded">
              TERMINAL
            </span>
          </div>
        </div>

        <div className="w-[1px] h-5 bg-[#243049] hidden sm:block" />

        {/* Quick Symbol Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsSymbolDropdownOpen(!isSymbolDropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#162033] hover:bg-[#1E293B] border border-[#243049] text-[#E8EEF9] font-mono transition-colors"
          >
            <span className="font-bold text-[#2DD4BF]">{activeSymbolObj?.symbol}</span>
            <span className="text-[#A3B4D0]">{activeSymbolObj?.price.toFixed(activeSymbolObj?.precision)}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#7B8DA8]" />
          </button>

          {isSymbolDropdownOpen && (
            <div className="absolute top-8 right-0 w-48 bg-[#121A2B] border border-[#243049] rounded-lg shadow-xl py-1 z-50 max-h-60 overflow-y-auto font-mono">
              {symbols.map((s) => (
                <div
                  key={s.symbol}
                  onClick={() => {
                    onSelectSymbol(s.symbol);
                    setIsSymbolDropdownOpen(false);
                  }}
                  className={`px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-[#1C2740] ${
                    s.symbol === activeSymbol ? 'bg-[#162033] text-[#2DD4BF] font-bold' : 'text-[#E8EEF9]'
                  }`}
                >
                  <span>{s.symbol}</span>
                  <span className="text-xs text-[#A3B4D0]">{s.price.toFixed(s.precision)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center: Main Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-[#0B1220] p-1 rounded-lg border border-[#243049]">
        <button
          onClick={() => onTabChange('home')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
            currentTab === 'home'
              ? 'bg-[#2DD4BF] text-[#042F2E] font-bold shadow-xs'
              : 'text-[#A3B4D0] hover:text-[#E8EEF9]'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{dict.tabHome}</span>
        </button>

        <button
          onClick={() => onTabChange('tools')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
            currentTab === 'tools'
              ? 'bg-[#2DD4BF] text-[#042F2E] font-bold shadow-xs'
              : 'text-[#A3B4D0] hover:text-[#E8EEF9]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{dict.tabTools}</span>
        </button>

        <button
          onClick={() => onTabChange('academy')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
            currentTab === 'academy'
              ? 'bg-[#2DD4BF] text-[#042F2E] font-bold shadow-xs'
              : 'text-[#A3B4D0] hover:text-[#E8EEF9]'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>{dict.tabAcademy}</span>
        </button>

        <button
          onClick={() => onTabChange('account')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
            currentTab === 'account'
              ? 'bg-[#2DD4BF] text-[#042F2E] font-bold shadow-xs'
              : 'text-[#A3B4D0] hover:text-[#E8EEF9]'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>{dict.tabAccount}</span>
        </button>
      </nav>

      {/* Right: Clock & Quick Lang Switcher */}
      <div className="flex items-center gap-3">
        {/* Market GMT Clock */}
        <div className="hidden md:flex items-center gap-1.5 font-mono text-[#7B8DA8] text-[11px] bg-[#162033] px-2.5 py-1 rounded border border-[#243049]/60">
          <Clock className="w-3.5 h-3.5 text-[#2DD4BF]" />
          <span>{timeStr}</span>
        </div>

        {/* Language Pill */}
        <button
          onClick={() => {
            const nextLang = currentLang === 'ar' ? 'en-US' : currentLang === 'en-US' ? 'ku' : 'ar';
            onLanguageChange(nextLang);
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#162033] hover:bg-[#1E293B] border border-[#243049] text-[#A3B4D0] hover:text-[#E8EEF9] font-medium"
        >
          <Globe className="w-3.5 h-3.5 text-[#2DD4BF]" />
          <span>{currentLang === 'ar' ? 'العربية' : currentLang === 'en-US' ? 'EN' : 'کوردی'}</span>
        </button>
      </div>
    </header>
  );
};
