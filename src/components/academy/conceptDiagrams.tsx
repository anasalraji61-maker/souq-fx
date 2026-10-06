import React from 'react';

/** Concept illustrations used in lectures (labels are part of the Arabic course content). */
export function ConceptDiagram({ concept }: { concept?: string }) {
  switch (concept) {
    case 'support_resistance':
      return (
        <div className="bg-[#0B1220] p-4 rounded-xl border border-[#243049] flex flex-col items-center">
          <span className="text-[11px] text-[#7B8DA8] mb-2 font-mono">مخطط ارتداد وتبادل أدوار الدعم والمقاومة</span>
          <svg viewBox="0 0 400 160" className="w-full h-36">
            {/* Resistance line */}
            <line x1="20" y1="40" x2="380" y2="40" stroke="#EF4444" strokeWidth="2" strokeDasharray="4 4" />
            <text x="320" y="32" fill="#EF4444" fontSize="10" fontFamily="sans-serif">مقاومة (Resistance)</text>

            {/* Support line */}
            <line x1="20" y1="120" x2="380" y2="120" stroke="#22C55E" strokeWidth="2" strokeDasharray="4 4" />
            <text x="320" y="140" fill="#22C55E" fontSize="10" fontFamily="sans-serif">دعم (Support)</text>

            {/* Price Wave bouncing between */}
            <path
              d="M 30 115 Q 70 45 110 115 T 190 115 T 250 45 L 290 20 L 330 40 L 370 15"
              fill="none"
              stroke="#2DD4BF"
              strokeWidth="2.5"
            />
            <circle cx="110" cy="118" r="4" fill="#22C55E" />
            <circle cx="190" cy="118" r="4" fill="#22C55E" />
            <circle cx="250" cy="42" r="4" fill="#EF4444" />
            <circle cx="330" cy="40" r="4" fill="#22C55E" />
          </svg>
        </div>
      );

    case 'order_block':
      return (
        <div className="bg-[#0B1220] p-4 rounded-xl border border-[#243049] flex flex-col items-center">
          <span className="text-[11px] text-[#7B8DA8] mb-2 font-mono">مخطط كتلة الأوامر (Order Block) و FVG</span>
          <svg viewBox="0 0 400 160" className="w-full h-36">
            {/* Order block rectangle */}
            <rect x="120" y="70" width="70" height="40" fill="rgba(45, 212, 191, 0.2)" stroke="#2DD4BF" strokeWidth="1.5" />
            <text x="125" y="94" fill="#2DD4BF" fontSize="10" fontWeight="bold">Bullish OB</text>

            {/* FVG rectangle */}
            <rect x="220" y="45" width="55" height="30" fill="rgba(245, 158, 11, 0.2)" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="2 2" />
            <text x="230" y="64" fill="#F59E0B" fontSize="10" fontWeight="bold">FVG Gap</text>

            {/* Candle sticks sketch */}
            <line x1="80" y1="50" x2="80" y2="120" stroke="#EF4444" strokeWidth="3" />
            <line x1="140" y1="65" x2="140" y2="115" stroke="#EF4444" strokeWidth="5" />
            <line x1="200" y1="20" x2="200" y2="90" stroke="#22C55E" strokeWidth="5" />
            <line x1="260" y1="10" x2="260" y2="60" stroke="#22C55E" strokeWidth="4" />
            
            {/* Retest arrow */}
            <path d="M 280 40 Q 230 80 180 85" fill="none" stroke="#E8EEF9" strokeWidth="1.5" markerEnd="url(#arrow)" />
          </svg>
        </div>
      );

    case 'elliott_wave':
      return (
        <div className="bg-[#0B1220] p-4 rounded-xl border border-[#243049] flex flex-col items-center">
          <span className="text-[11px] text-[#7B8DA8] mb-2 font-mono">مخطط دورة موجات إليوت الكاملة (1-2-3-4-5 و A-B-C)</span>
          <svg viewBox="0 0 400 160" className="w-full h-36">
            <polyline
              points="30,130 80,80 120,110 200,30 250,70 300,20 340,65 370,50 390,95"
              fill="none"
              stroke="#2DD4BF"
              strokeWidth="2.5"
            />
            <text x="75" y="70" fill="#2DD4BF" fontWeight="bold" fontSize="12">(1)</text>
            <text x="115" y="125" fill="#EF4444" fontWeight="bold" fontSize="12">(2)</text>
            <text x="195" y="20" fill="#2DD4BF" fontWeight="bold" fontSize="12">(3)</text>
            <text x="245" y="85" fill="#EF4444" fontWeight="bold" fontSize="12">(4)</text>
            <text x="305" y="15" fill="#2DD4BF" fontWeight="bold" fontSize="12">(5)</text>

            <text x="340" y="80" fill="#F59E0B" fontWeight="bold" fontSize="12">A</text>
            <text x="365" y="40" fill="#F59E0B" fontWeight="bold" fontSize="12">B</text>
            <text x="385" y="110" fill="#F59E0B" fontWeight="bold" fontSize="12">C</text>
          </svg>
        </div>
      );

    default:
      // no illustration for this concept yet: show nothing rather than a placeholder
      return null;
  }
}
