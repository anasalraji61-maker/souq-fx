import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CertificateItem, getCertificateName, setCertificateName } from '../../api/academy';
import { getSessionUser } from '../../api/session';
import { Award, Printer, X } from 'lucide-react';
import { LangId, gx } from '../../i18n/locales';

interface CertificateCardProps {
  certificate: CertificateItem;
  courseTitle: string;
  dateText: string;
  currentLang?: LangId;
  onClose: () => void;
}

/**
 * Completion certificate: printable (A4 landscape, light background), with the learner's name, the course and
 * the date. Deliberately no signatures, seals or accreditation logos: it is an in-app completion record.
 */
const PRINT_CSS = `
@media print {
  @page { size: A4 landscape; margin: 12mm; }
  html, body { background: #ffffff !important; height: auto !important; overflow: visible !important; }
  body > *:not(.matrix-print-root) { display: none !important; }
  .matrix-print-root { position: static !important; inset: auto !important; background: #ffffff !important; padding: 0 !important; display: block !important; }
  .matrix-print-root [role=dialog] { position: static !important; background: #ffffff !important; backdrop-filter: none !important; padding: 0 !important; overflow: visible !important; display: block !important; }
  .matrix-print-root .cert-wrap { max-width: none !important; width: 100% !important; margin: 0 !important; }
  .matrix-print-root .no-print { display: none !important; }
  .matrix-print-root .cert-sheet { box-shadow: none !important; border: 3px double #0F766E !important; background: #ffffff !important; color: #0B1220 !important; max-width: none !important; width: 100% !important; min-height: 170mm; }
  .matrix-print-root .cert-sheet * { color: #0B1220 !important; }
  .matrix-print-root .cert-sheet .cert-accent { color: #0F766E !important; }
  .matrix-print-root .cert-sheet .cert-muted { color: #475569 !important; }
}
`;

export const CertificateCard: React.FC<CertificateCardProps> = ({ certificate, courseTitle, dateText, currentLang = 'ar', onClose }) => {
  const x = gx(currentLang);
  const rtl = currentLang !== 'en-US';
  const initialName = useMemo(() => getCertificateName() || getSessionUser()?.username || '', []);
  const [name, setName] = useState(initialName);
  const host = useMemo(() => {
    const el = document.createElement('div');
    el.className = 'matrix-print-root';
    return el;
  }, []);

  useEffect(() => {
    document.body.appendChild(host);
    const style = document.createElement('style');
    style.setAttribute('data-matrix-print', 'certificate');
    style.textContent = PRINT_CSS;
    document.head.appendChild(style);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('keydown', esc);
      style.remove();
      host.remove();
    };
  }, [host, onClose]);

  const shownName = name.trim() || x.a_certNamePh;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={x.a_certKind}
      dir={rtl ? 'rtl' : 'ltr'}
      data-testid="certificate"
    >
      <div className="cert-wrap w-full max-w-3xl space-y-3">
        <div className="no-print flex flex-col sm:flex-row sm:items-end gap-2 bg-[#0F1828] border border-[#24344E] rounded-xl p-3">
          <label className="flex-1 text-[12px] text-[#A3B4D0] space-y-1">
            <span className="block">{x.a_certNameLabel}</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value.slice(0, 60));
                setCertificateName(e.target.value);
              }}
              placeholder={x.a_certNamePh}
              className="w-full min-h-[42px] rounded-lg bg-[#0B1220] border border-[#24344E] px-3 text-sm text-[#E8EEF9] outline-none focus:border-[#2DD4BF]"
              data-testid="cert-name"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="min-h-[42px] px-4 rounded-lg bg-gradient-to-r from-[#E8B86D] to-[#F59E0B] text-[#0B1220] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              data-testid="cert-print"
            >
              <Printer className="w-4 h-4" /> {x.a_print}
            </button>
            <button onClick={onClose} aria-label={x.g_close} className="min-h-[42px] px-3 rounded-lg bg-[#1C2740] text-[#CBD5E1] cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="cert-sheet relative rounded-2xl border-2 border-[#E8B86D]/60 bg-gradient-to-br from-[#0F1A2E] to-[#0B1220] px-6 sm:px-12 py-10 text-center text-[#E8EEF9] shadow-2xl">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full border-2 border-[#E8B86D]/60 flex items-center justify-center cert-accent text-[#E8B86D]">
              <Award className="w-8 h-8" />
            </div>
            <div className="text-[11px] tracking-[0.25em] uppercase cert-muted text-[#94A3B8]" dir="ltr">
              MATRIX · Trading Academy
            </div>
            <h2 className="text-3xl sm:text-4xl font-black cert-accent text-[#E8B86D] mt-1">{x.a_certHeading}</h2>
          </div>

          <p className="mt-8 text-[14px] cert-muted text-[#94A3B8]">{x.a_certPresented}</p>
          <div className="mt-2 text-3xl sm:text-4xl font-bold text-white" data-testid="cert-shown-name" dir="auto">
            {shownName}
          </div>
          <div className="mx-auto mt-3 h-px w-2/3 bg-[#E8B86D]/40" />

          <p className="mt-6 text-[14px] cert-muted text-[#94A3B8]">{x.a_certFor}</p>
          <div className="mt-1 text-xl sm:text-2xl font-bold cert-accent text-[#2DD4BF]" dir="auto">
            {courseTitle}
          </div>

          <div className="mt-10 grid grid-cols-2 gap-6 text-[13px]">
            <div>
              <div className="cert-muted text-[#94A3B8] text-[11px]">{x.a_certDate}</div>
              <div className="font-semibold">{dateText}</div>
            </div>
            <div>
              <div className="cert-muted text-[#94A3B8] text-[11px]">{x.a_certNo}</div>
              <div className="font-mono font-semibold" dir="ltr">
                {certificate.id}
              </div>
            </div>
          </div>

          <p className="mt-10 text-[11px] leading-relaxed cert-muted text-[#64748B] max-w-xl mx-auto">{x.a_certDisclaimer}</p>
        </div>
      </div>
    </div>,
    host
  );
};
