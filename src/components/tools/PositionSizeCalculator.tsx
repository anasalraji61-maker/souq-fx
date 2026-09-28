import React, { useState } from 'react';
import { MarketSymbol } from '../../types/market';
import { Calculator, ShieldCheck, AlertCircle, DollarSign, Percent } from 'lucide-react';

interface PositionSizeCalculatorProps {
  symbols: MarketSymbol[];
  activeSymbol: string;
}

export const PositionSizeCalculator: React.FC<PositionSizeCalculatorProps> = ({
  symbols,
  activeSymbol,
}) => {
  const [selectedSymbolStr, setSelectedSymbolStr] = useState(activeSymbol);
  const [balance, setBalance] = useState('10000');
  const [riskPct, setRiskPct] = useState('1');
  const [stopLossPips, setStopLossPips] = useState('25');
  const [leverage, setLeverage] = useState('100');

  const selectedSymbol = symbols.find((s) => s.symbol === selectedSymbolStr) || symbols[0];

  // Mathematical Calculation
  const parsedBalance = parseFloat(balance) || 0;
  const parsedRiskPct = parseFloat(riskPct) || 0;
  const parsedPips = parseFloat(stopLossPips) || 1;
  const parsedLeverage = parseFloat(leverage) || 100;

  const cashRisk = (parsedBalance * parsedRiskPct) / 100;

  // Standard lot pip value calculation
  // For EURUSD: standard lot 1 pip = $10
  // For USDJPY: standard lot 1 pip ≈ 1000 JPY / 152 ≈ $6.55
  // For XAUUSD: 1 standard lot (100 oz) $1 move = $100 => 1 pip (0.01) = $1
  let standardLotPipValue = 10;
  if (selectedSymbol.symbol.endsWith('JPY')) {
    standardLotPipValue = 1000 / (selectedSymbol.price || 150);
  } else if (selectedSymbol.symbol === 'XAUUSD') {
    standardLotPipValue = 10;
  } else if (selectedSymbol.symbol === 'BTCUSD') {
    standardLotPipValue = 1;
  } else if (selectedSymbol.symbol === 'US30' || selectedSymbol.symbol === 'NAS100') {
    standardLotPipValue = 1;
  }

  // Recommended Lot = CashRisk / (StopLossPips * PipValuePerStandardLot)
  const calculatedLot = parsedPips > 0 && standardLotPipValue > 0 
    ? cashRisk / (parsedPips * standardLotPipValue) 
    : 0;

  const contractSize = selectedSymbol.symbol === 'XAUUSD' ? 100 : 100000;
  const notionalValue = calculatedLot * contractSize * selectedSymbol.price;
  const requiredMargin = parsedLeverage > 0 ? notionalValue / parsedLeverage : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 select-none text-xs">
      {/* Title */}
      <div className="flex items-center justify-between pb-4 border-b border-[#243049]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#E8EEF9]">حاسبة حجم اللوت وإدارة المخاطر (Position Sizer)</h2>
            <p className="text-[#7B8DA8]">احسب حجم العقد الآمن بدقة بالغة وفق قواعد الحفاظ على رأس المال.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#162033] border border-[#243049] text-xs">
          <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
          <span className="text-[#A3B4D0]">حماية من نداء الهامش</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Input Form */}
        <div className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] space-y-4">
          <h3 className="font-bold text-sm text-[#E8EEF9] mb-3">بيانات الحساب والصفقة</h3>

          {/* Symbol Selector */}
          <div>
            <label className="block text-[#A3B4D0] mb-1 font-medium">الزوج أو الأداة المالية</label>
            <select
              value={selectedSymbolStr}
              onChange={(e) => setSelectedSymbolStr(e.target.value)}
              className="w-full bg-[#0B1220] border border-[#243049] rounded-lg px-3 py-2 text-[#E8EEF9] font-mono focus:outline-none focus:border-[#2DD4BF]"
            >
              {symbols.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.name} ({s.symbol}) - السعر: {s.price.toFixed(s.precision)}
                </option>
              ))}
            </select>
          </div>

          {/* Account Balance */}
          <div>
            <label className="block text-[#A3B4D0] mb-1 font-medium">رأس مال الحساب ($ USD)</label>
            <div className="relative">
              <DollarSign className="w-4 h-4 absolute top-2.5 right-2.5 text-[#7B8DA8]" />
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full bg-[#0B1220] border border-[#243049] rounded-lg py-2 pr-9 pl-3 text-[#E8EEF9] font-mono focus:outline-none focus:border-[#2DD4BF]"
              />
            </div>
          </div>

          {/* Risk Percentage */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[#A3B4D0] font-medium">نسبة المخاطرة لكل صفقة (%)</label>
              <span className="font-mono font-bold text-[#2DD4BF]">{riskPct}%</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.25"
                max="5"
                step="0.25"
                value={riskPct}
                onChange={(e) => setRiskPct(e.target.value)}
                className="flex-1 accent-[#2DD4BF] cursor-pointer"
              />
              <div className="flex gap-1">
                {['0.5', '1', '2', '3'].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setRiskPct(pct)}
                    className={`px-2 py-1 rounded text-[11px] font-mono ${
                      riskPct === pct ? 'bg-[#2DD4BF] text-[#042F2E] font-bold' : 'bg-[#162033] text-[#A3B4D0]'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stop Loss Pips */}
          <div>
            <label className="block text-[#A3B4D0] mb-1 font-medium">مسافة وقف الخسارة بالنقاط (Stop Loss Pips)</label>
            <input
              type="number"
              value={stopLossPips}
              onChange={(e) => setStopLossPips(e.target.value)}
              className="w-full bg-[#0B1220] border border-[#243049] rounded-lg px-3 py-2 text-[#E8EEF9] font-mono focus:outline-none focus:border-[#2DD4BF]"
            />
          </div>

          {/* Account Leverage */}
          <div>
            <label className="block text-[#A3B4D0] mb-1 font-medium">الرافعة المالية للحساب (Leverage)</label>
            <select
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              className="w-full bg-[#0B1220] border border-[#243049] rounded-lg px-3 py-2 text-[#E8EEF9] font-mono focus:outline-none focus:border-[#2DD4BF]"
            >
              <option value="30">1:30 (المعايير الأوروبية ESMA)</option>
              <option value="50">1:50</option>
              <option value="100">1:100 (القياسي)</option>
              <option value="200">1:200</option>
              <option value="500">1:500</option>
            </select>
          </div>
        </div>

        {/* Right: Results Card */}
        <div className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-sm text-[#E8EEF9] mb-3">نتائج الحساب والتوصية</h3>

            {/* Big Lot Size Display */}
            <div className="p-4 rounded-xl bg-[#0B1220] border border-[#2DD4BF]/30 text-center space-y-1">
              <span className="text-[#7B8DA8] text-[11px] font-semibold">حجم العقد الموصى به (Lot Size)</span>
              <div className="text-3xl font-extrabold font-mono text-[#2DD4BF] tracking-tight">
                {calculatedLot.toFixed(2)} <span className="text-sm font-normal text-[#A3B4D0]">لوت قياسي</span>
              </div>
              <div className="text-[11px] text-[#A3B4D0] font-mono">
                يعادل: {(calculatedLot * 10).toFixed(1)} لوت مصغر (Mini) / {(calculatedLot * 100).toFixed(0)} لوت ميكرو
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="mt-4 space-y-2.5 divide-y divide-[#243049]/40">
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#A3B4D0]">المبلغ المعرّض للمخاطرة:</span>
                <span className="font-mono font-bold text-[#EF4444]">${cashRisk.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#A3B4D0]">قيمة النقطة لحجم اللوت المحسوب:</span>
                <span className="font-mono font-bold text-[#E8EEF9]">
                  ${(calculatedLot * standardLotPipValue).toFixed(2)} / نقطة
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#A3B4D0]">الهامش المحجوز المطلوب (Margin):</span>
                <span className="font-mono font-bold text-[#38BDF8]">
                  ${requiredMargin > 0 ? requiredMargin.toFixed(2) : '0.00'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#A3B4D0]">نسبة الهامش إلى رأس المال:</span>
                <span className="font-mono font-medium text-[#E8EEF9]">
                  {parsedBalance > 0 ? ((requiredMargin / parsedBalance) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Advice Alert Box */}
          <div className="p-3 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-start gap-2.5 text-[#F59E0B]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>قاعدة الأمان:</strong> التزم دائماً بنسبة مخاطرة لا تتجاوز 1% أو 2%. الالتزام باللوت المحسوب يضمن بقاءك في السوق حتى عند توالي الصفقات الخاسرة.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
